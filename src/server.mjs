// MCP stdio server exposing the DSH worker pool to Claude Code / Codex.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { hubAvailable, hub } from './hub-client.mjs';
import { createShardWriter } from './status-shard.mjs';
import { TIER_IDS, tierModel, presetKey } from './tiers.mjs';

// The standalone job manager depends on @deepseek-ai/* peer dependencies that
// are available inside the DSH host module realm, but not necessarily to this
// external MCP process. Hub mode does not need those dependencies, so load the
// standalone path only if a request actually resolves to it.
let standaloneJobsPromise;
function standaloneJobs() {
  standaloneJobsPromise ??= import('./jobs.mjs');
  return standaloneJobsPromise;
}

const server = new McpServer({ name: 'dsh-crew', version: '0.1.0' });

const tierSchema = z.enum(TIER_IDS).optional().describe(
  'Worker model tier. flash = deepseek-v4-flash (simple tasks), pro = deepseek-v4-pro (harder tasks), vision = deepseek-v4-flash-vision-exp (multimodal: text + images). Omit to use the session default.');
const effortSchema = z.enum(['off', 'high', 'max']).optional().describe('Reasoning effort for the worker. Omit to use the session default.');

// Session-level configuration. This MCP server process lives exactly as long
// as one Claude Code / Codex session, so plain memory IS session scope.
// Initial values come from the global config (~/.config/dsh-crew/config.json,
// edited on the DSH settings page); dsh_worker_config overrides per session.
import { readGlobalConfig } from './install/install.mjs';
const globalDefaults = readGlobalConfig();
const sessionConfig = {
  enabled: true,
  default_tier: globalDefaults.default_tier,
  default_effort: globalDefaults.default_effort,
  mode: globalDefaults.mode, // auto | hub | standalone
  default_timeout_seconds: globalDefaults.default_timeout_seconds,
  tier_policy: globalDefaults.tier_policy, // auto | <tier>-only clamps every dispatch
  escalate_on_failure: globalDefaults.escalate_on_failure,
  preset_flash: globalDefaults.preset_flash ?? 'default',
  preset_pro: globalDefaults.preset_pro ?? 'default',
  preset_vision: globalDefaults.preset_vision ?? 'default',
};

function presetForTier(tier) {
  const p = sessionConfig[presetKey(tier)] ?? sessionConfig.preset_pro;
  return !p || p === 'default' ? undefined : p;
}

/** Tool-layer tier enforcement: the policy overrides whatever was requested. */
function applyTierPolicy(tier) {
  // "<tier>-only" clamps every dispatch to one tier regardless of the request.
  for (const t of TIER_IDS) if (sessionConfig.tier_policy === `${t}-only`) return t;
  return tier ?? sessionConfig.default_tier;
}

function text(obj) {
  return { content: [{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2) }] };
}

// Which orchestrator spawned this MCP server — stamped on every job so the
// panel can show where a dispatch came from.
function detectOrchestrator() {
  if (process.env.DSH_CREW_ORCHESTRATOR) return process.env.DSH_CREW_ORCHESTRATOR;
  if (process.env.CLAUDECODE || process.env.CLAUDE_CODE_ENTRYPOINT) return 'claude-code';
  try {
    const { execSync } = require('node:child_process');
    const comm = execSync(`ps -o comm= -p ${process.ppid}`, { encoding: 'utf8' }).trim().toLowerCase();
    if (comm.includes('claude')) return 'claude-code';
    if (comm.includes('codex')) return 'codex';
    return comm.split('/').pop() || 'unknown';
  } catch { return 'unknown'; }
}
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ORCHESTRATOR = detectOrchestrator();

// A native Codex ds-flash/ds-pro is useful live state before it calls a worker
// tool. Once calls begin, publish one placeholder per invocation instead of one
// process-wide bit: Codex can run several subagents through the same MCP server,
// and each task must remain independently visible while mode selection / worker
// creation is in flight. A call hands off only after the real hub/standalone job
// has been registered, so the sidebar never has a dispatcher-to-worker gap.
const dispatcherShard = createShardWriter('dispatcher');
const dispatcherStartedAt = new Date().toISOString();
const activeDispatches = new Map();
let nextDispatchId = 1;
function idleDispatcher() {
  const tier = process.env.DSH_CREW_ROLE_TIER ?? 'flash';
  return {
    id: `dispatcher-${process.pid}`,
    tier,
    model: tierModel(tier) ?? 'deepseek-v4-flash',
    effort: sessionConfig.default_effort,
    status: 'idle',
    source: ORCHESTRATOR,
    task: process.env.DSH_CREW_ROLE_NAME ?? (ORCHESTRATOR === 'codex' ? 'Codex ds subagent' : 'DSH worker dispatcher'),
    turn: 0, step: 0, currentTool: null, toolCalls: 0,
    tokens: { input: 0, output: 0, reasoning: 0 },
    startedAt: dispatcherStartedAt, endedAt: null,
    dispatcher: true,
  };
}
function publishDispatcher() {
  dispatcherShard.publish([idleDispatcher(), ...activeDispatches.values()]);
}
async function withActiveDispatch({ task, tier, effort, tool }, run) {
  const id = `dispatch-${process.pid}-${nextDispatchId++}`;
  const resolvedTier = applyTierPolicy(tier);
  activeDispatches.set(id, {
    id,
    dispatchId: id,
    phase: 'dispatching',
    tier: resolvedTier,
    model: tierModel(resolvedTier) ?? 'deepseek-v4-flash',
    effort: effort ?? sessionConfig.default_effort,
    status: 'running',
    source: ORCHESTRATOR,
    task: task.slice(0, 300),
    turn: 0, step: 0, currentTool: tool, toolCalls: 0,
    tokens: { input: 0, output: 0, reasoning: 0 },
    startedAt: new Date().toISOString(), endedAt: null,
    dispatch: true,
  });
  publishDispatcher();
  let handedOff = false;
  const handoff = () => {
    if (handedOff) return;
    handedOff = true;
    activeDispatches.delete(id);
    publishDispatcher();
  };
  try { return await run(handoff, id); } finally { handoff(); }
}
publishDispatcher();
const dispatcherHeartbeat = setInterval(publishDispatcher, 10_000);
dispatcherHeartbeat.unref?.();

function dispatchDisabled() {
  return text({
    error: 'worker dispatch is disabled for this session (set via dsh_worker_config). Report this to the user instead of doing the task yourself.',
  });
}

async function resolveMode() {
  if (sessionConfig.mode === 'standalone') return 'standalone';
  const up = await hubAvailable();
  if (sessionConfig.mode === 'hub' && !up) throw new Error('session mode is "hub" but the DSH workers hub is not reachable');
  return up ? 'hub' : 'standalone';
}

server.registerTool('dsh_run_worker', {
  title: 'Run DSH worker (blocking)',
  description: 'Delegate a task to a DSH (DeepSeek Harness) coding agent and wait for its final result. The worker is a full DSH agent with its own tools and sandbox. Use tier=flash for simple tasks, tier=pro for harder ones, tier=vision when the task involves images. Blocks until the worker finishes.',
  inputSchema: {
    task: z.string().describe('Full task description for the worker, self-contained'),
    tier: tierSchema,
    effort: effortSchema,
    cwd: z.string().optional().describe('Workspace directory for the worker (defaults to current project)'),
    timeout_seconds: z.number().int().positive().max(7200).optional(),
  },
}, async ({ task, tier, effort, cwd, timeout_seconds }) => withActiveDispatch({
  task, tier, effort, tool: 'dsh_run_worker',
}, async (handoff, dispatchId) => {
  if (!sessionConfig.enabled) return dispatchDisabled();
  const workDir = cwd ?? process.cwd();
  const e = effort ?? sessionConfig.default_effort;
  const timeout = timeout_seconds ?? sessionConfig.default_timeout_seconds;

  const runOnce = async (t) => {
    if ((await resolveMode()) === 'hub') {
      const spawned = await hub.spawn({ task, tier: t, effort: e, cwd: workDir, source: ORCHESTRATOR, preset: presetForTier(t), dispatchId });
      handoff();
      return await hub.get(spawned.id, timeout);
    }
    const { startJob, waitJob, jobView } = await standaloneJobs();
    const job = startJob({ task, tier: t, effort: e, cwd: workDir, timeoutMs: timeout * 1000, source: ORCHESTRATOR, dispatchId });
    handoff();
    await waitJob(job.id, timeout * 1000);
    return jobView(job, { withResult: true });
  };

  const firstTier = applyTierPolicy(tier);
  let job = await runOnce(firstTier);
  if (job.status === 'running') return text({ ...job, note: `still running after ${timeout}s; poll with dsh_worker_result` });

  // Escalate on evidence, not prediction: a failed flash run retries once on
  // pro — unless the policy pins the tier to flash.
  if (job.status === 'failed' && sessionConfig.escalate_on_failure
      && firstTier === 'flash' && sessionConfig.tier_policy !== 'flash-only') {
    const firstError = job.error ?? job.stopReason ?? 'unknown failure';
    job = await runOnce('pro');
    if (job.status === 'running') return text({ ...job, escalated: true, note: `escalated to pro, still running after ${timeout}s; poll with dsh_worker_result` });
    return text({ ...job, escalated: true, flash_failure: String(firstError).slice(0, 200) });
  }
  return text(job);
}));

server.registerTool('dsh_worker_config', {
  title: 'Session worker configuration',
  description: 'Read or update session-level worker settings: enable/disable dispatch, default tier/effort/timeout, and execution mode (auto = prefer hub, hub = require the DSH hub, standalone = never use it). Call with no arguments to read the current configuration. Settings last for this session only.',
  inputSchema: {
    enabled: z.boolean().optional().describe('false = refuse all worker dispatch this session'),
    default_tier: z.enum(TIER_IDS).optional(),
    default_effort: z.enum(['off', 'high', 'max']).optional(),
    mode: z.enum(['auto', 'hub', 'standalone']).optional(),
    default_timeout_seconds: z.number().int().positive().max(7200).optional(),
    tier_policy: z.enum(['auto', ...TIER_IDS.map((t) => `${t}-only`)]).optional().describe('<tier>-only clamps every dispatch to one tier (flash-only / pro-only / vision-only)'),
    escalate_on_failure: z.boolean().optional().describe('retry a failed blocking flash run once on pro'),
    preset_flash: z.string().optional().describe('hub-mode agent preset for flash workers (preset id, or "default")'),
    preset_pro: z.string().optional().describe('hub-mode agent preset for pro workers (preset id, or "default")'),
    preset_vision: z.string().optional().describe('hub-mode agent preset for vision workers (preset id, or "default")'),
    reset: z.boolean().optional().describe('true = restore all defaults first'),
  },
}, async ({ reset, ...patch }) => {
  if (reset) Object.assign(sessionConfig, { enabled: true, ...globalDefaults });
  for (const [k, v] of Object.entries(patch)) if (v !== undefined) sessionConfig[k] = v;
  return text({ ...sessionConfig, hub_reachable: await hubAvailable() });
});

server.registerTool('dsh_spawn_worker', {
  title: 'Spawn DSH worker (async)',
  description: 'Start a DSH (DeepSeek Harness) coding agent in the background and return immediately with a job id. Use dsh_worker_status / dsh_worker_result to follow up. Good for fanning out several workers in parallel.',
  inputSchema: {
    task: z.string(),
    tier: tierSchema,
    effort: effortSchema,
    cwd: z.string().optional(),
  },
}, async ({ task, tier, effort, cwd }) => withActiveDispatch({
  task, tier, effort, tool: 'dsh_spawn_worker',
}, async (handoff, dispatchId) => {
  if (!sessionConfig.enabled) return dispatchDisabled();
  const workDir = cwd ?? process.cwd();
  const t = applyTierPolicy(tier);
  const e = effort ?? sessionConfig.default_effort;
  if ((await resolveMode()) === 'hub') {
    const job = await hub.spawn({ task, tier: t, effort: e, cwd: workDir, source: ORCHESTRATOR, preset: presetForTier(t), dispatchId });
    handoff();
    return text(job);
  }
  const { startJob, jobView } = await standaloneJobs();
  const job = startJob({ task, tier: t, effort: e, cwd: workDir, source: ORCHESTRATOR, dispatchId });
  handoff();
  return text(jobView(job));
}));

server.registerTool('dsh_worker_status', {
  title: 'DSH worker status',
  description: 'List all DSH worker jobs in this session with live progress (turn/step, current tool, token usage).',
  inputSchema: {},
}, async () => {
  const jobs = standaloneJobsPromise ? await standaloneJobsPromise : null;
  const local = jobs ? jobs.listJobs().map((j) => jobs.jobView(j)) : [];
  const remote = (await hubAvailable()) ? await hub.list().catch(() => []) : [];
  return text([...remote, ...local]);
});

server.registerTool('dsh_worker_result', {
  title: 'DSH worker result',
  description: 'Fetch the result of a worker job, optionally waiting for it to finish.',
  inputSchema: {
    job_id: z.string(),
    wait_seconds: z.number().int().min(0).max(7200).default(0).describe('0 = return current state immediately'),
  },
}, async ({ job_id, wait_seconds }) => {
  if (job_id.startsWith('hub-')) {
    if (!(await hubAvailable())) return text({ error: 'hub not reachable' });
    return text(await hub.get(job_id, wait_seconds).catch((e) => ({ error: e.message })));
  }
  const { getJob, waitJob, jobView } = await standaloneJobs();
  if (!getJob(job_id)) return text({ error: `no such job: ${job_id}` });
  const job = await waitJob(job_id, wait_seconds > 0 ? wait_seconds * 1000 : 1);
  return text(jobView(job, { withResult: true }));
});

server.registerTool('dsh_worker_cancel', {
  title: 'Cancel DSH worker',
  description: 'Cancel a running worker job (terminates its runtime process).',
  inputSchema: { job_id: z.string() },
}, async ({ job_id }) => {
  if (job_id.startsWith('hub-')) {
    if (!(await hubAvailable())) return text({ error: 'hub not reachable' });
    return text(await hub.cancel(job_id).catch((e) => ({ error: e.message })));
  }
  const { getJob, cancelJob, jobView } = await standaloneJobs();
  if (!getJob(job_id)) return text({ error: `no such job: ${job_id}` });
  return text(jobView(await cancelJob(job_id), { withResult: true }));
});

await server.connect(new StdioServerTransport());
