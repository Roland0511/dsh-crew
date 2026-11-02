// One-click installers: register the Claude Code plugin persistently and
// render Codex agent roles with real paths. Called from the CLI entry or the
// DSH settings page. All edits are backed up and idempotent.

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MARKETPLACE_NAME = 'dsh-crew';
const PLUGIN_KEY = `dsh-crew@${MARKETPLACE_NAME}`;
const MCP_TOOLS = ['dsh_run_worker', 'dsh_spawn_worker', 'dsh_worker_status', 'dsh_worker_result', 'dsh_worker_cancel'];
const CODEX_AGENT_FILES = ['ds-flash.toml', 'ds-pro.toml', 'ds-vision.toml'];
const CODEX_CONFIG_BEGIN = '# BEGIN dsh-crew managed agents';
const CODEX_CONFIG_END = '# END dsh-crew managed agents';

function codexAgentBlock() {
  return `${CODEX_CONFIG_BEGIN}\n`
    + `[agents."ds-flash"]\n`
    + `description = "DeepSeek V4 Flash worker (runs inside DSH). Spawn for simple, well-scoped subtasks: mechanical edits, small scripts, lookups, straightforward fixes."\n`
    + `config_file = "./agents/ds-flash.toml"\n\n`
    + `[agents."ds-pro"]\n`
    + `description = "DeepSeek V4 Pro worker (runs inside DSH). Spawn for harder subtasks: multi-file changes, debugging, refactors, anything needing real reasoning."\n`
    + `config_file = "./agents/ds-pro.toml"\n\n`
    + `[agents."ds-vision"]\n`
    + `description = "DeepSeek V4 Flash Vision worker (runs inside DSH). Spawn for subtasks that need to look at images: screenshots, diagrams, UI mockups, scanned pages, photos."\n`
    + `config_file = "./agents/ds-vision.toml"\n`
    + `${CODEX_CONFIG_END}`;
}

function replaceManagedCodexBlock(content, block = '') {
  const start = content.indexOf(CODEX_CONFIG_BEGIN);
  const end = content.indexOf(CODEX_CONFIG_END);
  let base = content;
  if (start >= 0 && end >= start) {
    base = content.slice(0, start) + content.slice(end + CODEX_CONFIG_END.length);
  }
  base = base.trimEnd();
  return block ? `${base}${base ? '\n\n' : ''}${block}\n` : `${base}${base ? '\n' : ''}`;
}

function backup(file) {
  if (existsSync(file)) {
    const bak = `${file}.dsh-crew-backup-${Date.now()}`;
    copyFileSync(file, bak);
    return bak;
  }
  return null;
}

function readJson(file, fallback) {
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return fallback; }
}

// One-time migration from the pre-rename config dir (dsh-workers → dsh-crew).
try {
  const oldDir = join(homedir(), '.config', 'dsh-workers');
  const newDir = join(homedir(), '.config', 'dsh-crew');
  if (existsSync(oldDir) && !existsSync(newDir)) {
    const { renameSync } = await import('node:fs');
    renameSync(oldDir, newDir);
  }
} catch {}

const GLOBAL_CONFIG_FILE = join(CONFIG_DIR_HOME(), 'config.json');
function CONFIG_DIR_HOME() { return join(homedir(), '.config', 'dsh-crew'); }

export const GLOBAL_CONFIG_DEFAULTS = {
  default_tier: 'flash',
  default_effort: 'max',
  mode: 'auto',
  default_timeout_seconds: 1800,
  hub_url: 'http://127.0.0.1:3080',
  // auto = orchestrator picks the tier; <tier>-only (flash-only / pro-only /
  // vision-only) clamps every dispatch to one tier at the tool layer.
  tier_policy: 'auto',
  // When a blocking flash run fails, retry the same task once on pro.
  escalate_on_failure: false,
  // Hub-mode agent preset per tier: 'default' follows the DSH roster default.
  preset_flash: 'minimal',
  preset_pro: 'default',
  preset_vision: 'default',
};

export function readGlobalConfig() {
  return { ...GLOBAL_CONFIG_DEFAULTS, ...readJson(GLOBAL_CONFIG_FILE, {}) };
}

export function writeGlobalConfig(patch) {
  mkdirSync(CONFIG_DIR_HOME(), { recursive: true });
  const next = { ...readGlobalConfig() };
  for (const [k, v] of Object.entries(patch ?? {})) {
    if (v !== undefined && k in GLOBAL_CONFIG_DEFAULTS) next[k] = v;
  }
  writeFileSync(GLOBAL_CONFIG_FILE, JSON.stringify(next, null, 2) + '\n');
  return next;
}

/** What is currently installed where — drives the settings-page buttons. */
export function installStatus({ home = homedir() } = {}) {
  const settings = readJson(join(home, '.claude', 'settings.json'), {});
  const enabled = settings.enabledPlugins;
  const claudeInstalled = !!(enabled && !Array.isArray(enabled) && enabled[PLUGIN_KEY]);
  const hudWired = typeof settings.statusLine?.command === 'string'
    && settings.statusLine.command.includes('worker-segment.sh');
  const codexDir = join(home, '.codex');
  const codexConfig = existsSync(join(codexDir, 'config.toml')) ? readFileSync(join(codexDir, 'config.toml'), 'utf8') : '';
  const codexAgentsPresent = CODEX_AGENT_FILES.every((file) => existsSync(join(codexDir, 'agents', file)));
  const codexRegistered = codexConfig.includes(CODEX_CONFIG_BEGIN) && codexConfig.includes(CODEX_CONFIG_END);
  const codexInstalled = codexAgentsPresent && codexRegistered;
  return { claude: { installed: claudeInstalled, hud: hudWired }, codex: { installed: codexInstalled, agents: codexAgentsPresent, registered: codexRegistered } };
}

export function uninstallCodex({ home = homedir(), scope } = {}) {
  const actions = [];
  const codexDir = scope === 'project' ? join(process.cwd(), '.codex') : join(home, '.codex');
  for (const f of CODEX_AGENT_FILES) {
    const p = join(codexDir, 'agents', f);
    if (existsSync(p)) { backup(p); rmSync(p); actions.push(`removed: ${p} (backup kept)`); }
  }
  const configFile = join(codexDir, 'config.toml');
  if (existsSync(configFile)) {
    const current = readFileSync(configFile, 'utf8');
    const next = replaceManagedCodexBlock(current);
    if (next !== current) {
      backup(configFile);
      writeFileSync(configFile, next);
      actions.push(`config: removed managed ds-flash / ds-pro / ds-vision registrations from ${configFile} (backup kept)`);
    }
  }
  for (const f of ['dsh-config.md', 'dsh-status.md']) {
    const p = join(codexDir, 'prompts', f);
    if (existsSync(p)) { rmSync(p); actions.push(`removed: ${p}`); }
  }
  return { ok: true, actions: actions.length ? actions : ['nothing to remove'] };
}

export async function installClaudeCode({ home = homedir(), statusline = false } = {}) {
  const actions = [];

  // The marketplace root is the PARENT directory (dsh-plugins/): marketplace
  // plugin sources must be './<subdir>' paths inside the marketplace root, so
  // the plugin repo itself cannot be its own marketplace and a wrapper
  // directory elsewhere cannot reference it either.
  const mpDir = dirname(ROOT);
  actions.push(`marketplace: ${mpDir} (parent-dir marketplace, source ./dsh-crew)`);

  // 2. settings.json: marketplace + enabledPlugins + permissions allowlist.
  const settingsFile = join(home, '.claude', 'settings.json');
  mkdirSync(dirname(settingsFile), { recursive: true });
  const bak = backup(settingsFile);
  if (bak) actions.push(`backup: ${bak}`);
  const settings = readJson(settingsFile, {});

  // Both fields are records (see json.schemastore.org/claude-code-settings.json).
  // Older versions of this installer wrote arrays, which Claude Code ignores
  // with a warning — migrate those in place.
  const markets = (settings.extraKnownMarketplaces && !Array.isArray(settings.extraKnownMarketplaces)
    && typeof settings.extraKnownMarketplaces === 'object') ? settings.extraKnownMarketplaces : {};
  if (Array.isArray(settings.extraKnownMarketplaces)) actions.push('migrated legacy extraKnownMarketplaces array');
  markets[MARKETPLACE_NAME] = { source: { source: 'directory', path: mpDir } };
  if (markets['dsh-workers']) {
    delete markets['dsh-workers'];
    actions.push('removed pre-rename dsh-workers marketplace entry');
  }
  settings.extraKnownMarketplaces = markets;

  const enabled = (settings.enabledPlugins && !Array.isArray(settings.enabledPlugins)
    && typeof settings.enabledPlugins === 'object') ? settings.enabledPlugins : {};
  if (Array.isArray(settings.enabledPlugins)) {
    for (const key of settings.enabledPlugins) if (typeof key === 'string') enabled[key] = true;
    actions.push('migrated legacy enabledPlugins array');
  }
  enabled[PLUGIN_KEY] = true;
  if (enabled['dsh-workers@dsh-workers']) {
    delete enabled['dsh-workers@dsh-workers'];
    actions.push('removed pre-rename dsh-workers plugin entry');
  }
  settings.enabledPlugins = enabled;

  settings.permissions = settings.permissions ?? {};
  let allow = Array.isArray(settings.permissions.allow) ? settings.permissions.allow : [];
  const preRename = allow.filter((r) => typeof r === 'string' && r.startsWith('mcp__plugin_dsh-workers_'));
  if (preRename.length) {
    allow = allow.filter((r) => !preRename.includes(r));
    actions.push(`removed ${preRename.length} pre-rename permission rules`);
  }
  for (const tool of MCP_TOOLS) {
    const rule = `mcp__plugin_dsh-crew_dsh-crew__${tool}`;
    if (!allow.includes(rule)) allow.push(rule);
  }
  settings.permissions.allow = allow;

  if (statusline && !settings.statusLine) {
    settings.statusLine = { type: 'command', command: `bash ${join(ROOT, 'statusline', 'statusline.sh')}` };
    actions.push('statusline: installed');
  } else if (statusline) {
    actions.push('statusline: skipped (one already configured)');
  }

  writeFileSync(settingsFile, JSON.stringify(settings, null, 2) + '\n');
  actions.push(`settings: registered ${PLUGIN_KEY} + ${MCP_TOOLS.length} permission rules`);

  // Materialize the install through the claude CLI: registers the marketplace
  // in the plugin cache (settings alone leave a stale/absent cache entry) and
  // pulls the plugin so the next session loads it. Best-effort: settings are
  // already correct, so a missing CLI just means one manual `plugin install`.
  if (home !== homedir()) {
    actions.push('cli: skipped (non-default home; test mode)');
    return { ok: true, actions };
  }
  try {
    const { execSync } = await import('node:child_process');
    const run = (cmd) => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120_000 });
    try { run(`claude plugin marketplace add ${JSON.stringify(mpDir)}`); actions.push('cli: marketplace registered'); }
    catch { actions.push('cli: marketplace add skipped (already registered)'); }
    // `plugin install` on an already-installed plugin is a no-op and leaves a
    // stale snapshot in ~/.claude/plugins/cache — uninstall first so an update
    // always re-copies the current code.
    try { run(`claude plugin uninstall ${PLUGIN_KEY}`); } catch {}
    run(`claude plugin install ${PLUGIN_KEY} --scope user -y`);
    actions.push(`cli: plugin snapshot refreshed (${PLUGIN_KEY})`);
  } catch (err) {
    actions.push(`cli: plugin install failed — run manually: claude plugin install ${PLUGIN_KEY} -y (${String(err?.message ?? err).slice(0, 120)})`);
  }
  return { ok: true, actions };
}

export function installCodex({ home = homedir(), scope } = {}) {
  const actions = [];
  const codexDir = scope === 'project' ? join(process.cwd(), '.codex') : join(home, '.codex');
  const agentsDir = join(codexDir, 'agents');
  mkdirSync(agentsDir, { recursive: true });
  const srcDir = join(ROOT, 'codex', 'agents');
  for (const f of CODEX_AGENT_FILES) {
    const dest = join(agentsDir, f);
    const bak = backup(dest);
    if (bak) actions.push(`backup: ${bak}`);
    const rendered = readFileSync(join(srcDir, f), 'utf8')
      .replaceAll('__DSH_CREW_CLI__', join(ROOT, 'src', 'cli', 'run-worker.mjs'));
    writeFileSync(dest, rendered);
    actions.push(`agent config: ${dest}`);
  }
  const configFile = join(codexDir, 'config.toml');
  const currentConfig = existsSync(configFile) ? readFileSync(configFile, 'utf8') : '';
  const configBackup = backup(configFile);
  if (configBackup) actions.push(`backup: ${configBackup}`);
  writeFileSync(configFile, replaceManagedCodexBlock(currentConfig, codexAgentBlock()));
  actions.push(`config: registered ds-flash / ds-pro / ds-vision via config_file in ${configFile} (CLI bridge; no Codex MCP)`);

  const promptsDir = join(codexDir, 'prompts');
  mkdirSync(promptsDir, { recursive: true });
  const promptsSrc = join(ROOT, 'codex', 'prompts');
  for (const f of readdirSync(promptsSrc).filter((f) => f.endsWith('.md'))) {
    const rendered = readFileSync(join(promptsSrc, f), 'utf8')
      .replaceAll('__DSH_CREW_CLI__', join(ROOT, 'src', 'cli', 'run-worker.mjs'));
    writeFileSync(join(promptsDir, f), rendered);
    actions.push(`prompt: ${join(promptsDir, f)}`);
  }
  return { ok: true, actions };
}

/**
 * Wire the DSH worker segment into an existing claude-hud statusline via its
 * --extra-cmd hook (requires CLAUDE_HUD_ALLOW_EXTRA_CMD=1). Idempotent.
 */
export function installHudSegment({ home = homedir() } = {}) {
  const settingsFile = join(home, '.claude', 'settings.json');
  const settings = readJson(settingsFile, null);
  if (!settings) return { ok: false, actions: ['settings.json not found'] };
  const cmd = settings.statusLine?.command;
  if (typeof cmd !== 'string' || !cmd.includes('claude-hud')) {
    return { ok: false, actions: ['statusLine is not claude-hud; use statusline/statusline.sh directly instead'] };
  }
  const segment = join(ROOT, 'statusline', 'worker-segment.sh');
  if (cmd.includes(segment)) return { ok: true, actions: ['already wired'] };
  if (cmd.includes('worker-segment.sh')) {
    // Wired to a stale copy (e.g. pre-rename path) — repoint the --extra-cmd at the current segment.
    const next = cmd.replace(/--extra-cmd "bash [^"]*worker-segment\.sh"/, `--extra-cmd "bash ${segment}"`);
    if (next === cmd) return { ok: false, actions: ['worker-segment.sh present but path not replaceable; rewire manually'] };
    const bak = backup(settingsFile);
    settings.statusLine.command = next;
    writeFileSync(settingsFile, JSON.stringify(settings, null, 2) + '\n');
    return { ok: true, actions: [...(bak ? [`backup: ${bak}`] : []), `statusLine: repointed worker-segment.sh to ${segment}`] };
  }
  let next = cmd;
  if (!next.includes('CLAUDE_HUD_ALLOW_EXTRA_CMD')) {
    next = next.replace(/exec\s+/, 'exec env CLAUDE_HUD_ALLOW_EXTRA_CMD=1 ');
    if (!next.includes('CLAUDE_HUD_ALLOW_EXTRA_CMD')) return { ok: false, actions: ['could not find exec in statusLine command; wire manually'] };
  }
  const extra = ` --extra-cmd "bash ${segment}"`;
  if (next.endsWith("'")) next = next.slice(0, -1) + extra + "'";
  else next += extra;
  const bak = backup(settingsFile);
  settings.statusLine.command = next;
  writeFileSync(settingsFile, JSON.stringify(settings, null, 2) + '\n');
  return { ok: true, actions: [...(bak ? [`backup: ${bak}`] : []), 'statusLine: claude-hud now runs worker-segment.sh via --extra-cmd'] };
}

export function uninstallClaudeCode({ home = homedir() } = {}) {
  const settingsFile = join(home, '.claude', 'settings.json');
  const settings = readJson(settingsFile, null);
  if (!settings) return { ok: true, actions: ['settings.json not found'] };
  backup(settingsFile);
  const mpDir = join(home, '.config', 'dsh-crew', 'marketplace');
  if (Array.isArray(settings.extraKnownMarketplaces)) {
    settings.extraKnownMarketplaces = settings.extraKnownMarketplaces.filter((m) => m?.path !== mpDir);
  } else if (settings.extraKnownMarketplaces) {
    delete settings.extraKnownMarketplaces[MARKETPLACE_NAME];
  }
  if (Array.isArray(settings.enabledPlugins)) {
    settings.enabledPlugins = settings.enabledPlugins.filter((p) => p !== PLUGIN_KEY);
  } else if (settings.enabledPlugins) {
    delete settings.enabledPlugins[PLUGIN_KEY];
  }
  if (settings.permissions?.allow) {
    settings.permissions.allow = settings.permissions.allow.filter((r) => !r.startsWith('mcp__plugin_dsh-crew_'));
  }
  writeFileSync(settingsFile, JSON.stringify(settings, null, 2) + '\n');
  return { ok: true, actions: ['unregistered from settings.json (backup kept)'] };
}
