#!/usr/bin/env node
// Lightweight Codex bridge for dsh-crew. It deliberately avoids MCP so the
// parent Codex session does not carry dsh-crew tool schemas in its context.

import { resolve } from 'node:path';
import { hubAvailable, hub } from '../hub-client.mjs';
import { GLOBAL_CONFIG_DEFAULTS, readGlobalConfig, writeGlobalConfig } from '../install/install.mjs';
import { readMergedStatus } from '../status-shard.mjs';
import { TIER_IDS, presetKey } from '../tiers.mjs';

const VALID_TIERS = new Set(TIER_IDS);
const VALID_EFFORTS = new Set(['off', 'high', 'max']);
const VALID_MODES = new Set(['auto', 'hub', 'standalone']);
const VALID_POLICIES = new Set(['auto', ...TIER_IDS.map((t) => `${t}-only`)]);

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) { out._.push(arg); continue; }
    const key = arg.slice(2).replace(/-/g, '_');
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else { out[key] = next; i += 1; }
  }
  return out;
}

function emit(value, code = 0) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
  process.exitCode = code;
}

async function readStdin() {
  let text = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) text += chunk;
  return text;
}

function resolvedTier(requested, config) {
  for (const t of TIER_IDS) if (config.tier_policy === `${t}-only`) return t;
  return requested ?? config.default_tier;
}

function presetForTier(tier, config) {
  const preset = config[presetKey(tier)] ?? config.preset_pro;
  return !preset || preset === 'default' ? undefined : preset;
}

async function resolveMode(config) {
  if (config.mode === 'standalone') return 'standalone';
  const available = await hubAvailable();
  if (config.mode === 'hub' && !available) throw new Error('mode is "hub" but the DSH workers hub is not reachable');
  return available ? 'hub' : 'standalone';
}

async function waitForHubJob(id, timeoutSeconds) {
  const deadline = Date.now() + timeoutSeconds * 1000;
  let job;
  do {
    const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    if (remaining <= 0) break;
    job = await hub.get(id, Math.min(remaining, 600));
  } while (job.status === 'running');
  return job ?? await hub.get(id, 0);
}

async function runOnce({ task, tier, effort, cwd, timeoutSeconds, config }) {
  if ((await resolveMode(config)) === 'hub') {
    const job = await hub.spawn({
      task, tier, effort, cwd, source: 'codex-cli', preset: presetForTier(tier, config),
    });
    let cancelling = false;
    const cancel = async () => {
      if (cancelling) return;
      cancelling = true;
      try { await hub.cancel(job.id); } catch {}
      process.exit(130);
    };
    process.once('SIGINT', cancel);
    process.once('SIGTERM', cancel);
    try { return await waitForHubJob(job.id, timeoutSeconds); }
    finally { process.off('SIGINT', cancel); process.off('SIGTERM', cancel); }
  }

  const { startJob, waitJob, jobView, cancelJob } = await import('../jobs.mjs');
  const job = startJob({ task, tier, effort, cwd, timeoutMs: timeoutSeconds * 1000, source: 'codex-cli' });
  const cancel = async () => { try { await cancelJob(job.id); } finally { process.exit(130); } };
  process.once('SIGINT', cancel);
  process.once('SIGTERM', cancel);
  try {
    await waitJob(job.id, timeoutSeconds * 1000);
    return jobView(job, { withResult: true });
  } finally {
    process.off('SIGINT', cancel);
    process.off('SIGTERM', cancel);
  }
}

async function runCommand(args) {
  const config = readGlobalConfig();
  const task = args.task_base64
    ? Buffer.from(String(args.task_base64), 'base64').toString('utf8')
    : await readStdin();
  if (!task.trim()) throw new Error('task is required via --task-base64 or stdin');
  const requestedTier = args.tier ?? config.default_tier;
  const effort = args.effort ?? config.default_effort;
  const timeoutSeconds = Number(args.timeout ?? config.default_timeout_seconds);
  if (!VALID_TIERS.has(requestedTier)) throw new Error(`invalid tier: ${requestedTier}`);
  if (!VALID_EFFORTS.has(effort)) throw new Error(`invalid effort: ${effort}`);
  if (!Number.isInteger(timeoutSeconds) || timeoutSeconds < 1 || timeoutSeconds > 7200) throw new Error('timeout must be an integer from 1 to 7200');
  const cwd = resolve(args.cwd ?? process.cwd());
  const firstTier = resolvedTier(requestedTier, config);
  let job = await runOnce({ task, tier: firstTier, effort, cwd, timeoutSeconds, config });
  if (job.status === 'failed' && config.escalate_on_failure && firstTier === 'flash' && config.tier_policy !== 'flash-only') {
    const flashFailure = String(job.error ?? job.stopReason ?? 'unknown failure').slice(0, 200);
    job = await runOnce({ task, tier: 'pro', effort, cwd, timeoutSeconds, config });
    job = { ...job, escalated: true, flash_failure: flashFailure };
  }
  emit(job, job.status === 'done' ? 0 : 1);
}

function parseBoolean(value, name) {
  if (value === true || value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${name} must be true or false`);
}

async function configCommand(args) {
  if (args.reset) {
    emit(writeGlobalConfig(GLOBAL_CONFIG_DEFAULTS));
    return;
  }
  const patch = {};
  if (args.tier !== undefined) { if (!VALID_TIERS.has(args.tier)) throw new Error(`invalid tier: ${args.tier}`); patch.default_tier = args.tier; }
  if (args.effort !== undefined) { if (!VALID_EFFORTS.has(args.effort)) throw new Error(`invalid effort: ${args.effort}`); patch.default_effort = args.effort; }
  if (args.mode !== undefined) { if (!VALID_MODES.has(args.mode)) throw new Error(`invalid mode: ${args.mode}`); patch.mode = args.mode; }
  if (args.timeout !== undefined) {
    const timeout = Number(args.timeout);
    if (!Number.isInteger(timeout) || timeout < 1 || timeout > 7200) throw new Error('timeout must be an integer from 1 to 7200');
    patch.default_timeout_seconds = timeout;
  }
  if (args.policy !== undefined) { if (!VALID_POLICIES.has(args.policy)) throw new Error(`invalid policy: ${args.policy}`); patch.tier_policy = args.policy; }
  if (args.escalate !== undefined) patch.escalate_on_failure = parseBoolean(args.escalate, 'escalate');
  emit(Object.keys(patch).length ? writeGlobalConfig(patch) : readGlobalConfig());
}

async function statusCommand() {
  const remote = await hubAvailable() ? await hub.list().catch(() => []) : [];
  const remoteIds = new Set(remote.map((job) => job.id));
  emit({ jobs: [...remote, ...readMergedStatus().filter((job) => !remoteIds.has(job.id))] });
}

const args = parseArgs(process.argv.slice(2));
const command = args._[0] ?? 'run';
try {
  if (command === 'run') await runCommand(args);
  else if (command === 'config') await configCommand(args);
  else if (command === 'status') await statusCommand();
  else throw new Error(`unknown command: ${command} (expected run, config, or status)`);
} catch (error) {
  emit({ status: 'failed', error: error?.message ?? String(error), stopReason: 'bridge_error' }, 1);
}
