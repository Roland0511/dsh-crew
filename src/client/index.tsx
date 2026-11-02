// Browser half of dsh-crew: integrations (install/update/restore),
// global worker configuration, and the live jobs table.
// Talks only to the plugin's own loopback routes.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

export const inject = ['slots', 'locale', 'sessions'];

const API = '/_dsh/dsh-crew';

const COPY = {
  zh: {
    label: 'Subagent 工作区',
    title: 'Subagent 工作区',
    intro: '把 Claude Code / Codex 的子任务派给本实例的 DSH agent，在宿主里显示为原生子代理、进度可见。配置派发默认值、执行方式，一键装进宿主。',
    integrations: '集成',
    installed: '已安装', notInstalled: '未安装', hud: 'HUD 段',
    install: '安装', update: '更新', restore: '还原',
    confirmRestore: (name: string) => `确定从 ${name} 移除 dsh-crew 集成？（settings 会先备份）`,
    globalConfig: '全局配置',
    globalHint: '修改即时保存到 ~/.config/dsh-crew/config.json；CC / Codex 的新会话自动读取为默认值（会话内可用 /dsh-crew:config 临时覆盖）。',
    tier: '默认档位', effort: '默认推理', mode: '执行模式', timeout: '默认超时(秒)', hubUrl: 'Hub 地址',
    tierPolicy: '档位策略', escalate: '失败升档',
    tierLabel: { flash: 'flash', pro: 'pro', vision: 'flash vision · 多模态' },
    tierPolicyDesc: { auto: 'auto · orchestrator 自选', 'flash-only': '只用 flash', 'pro-only': '只用 pro', 'vision-only': '只用 vision' },
    escalateHint: 'flash 失败自动用 pro 重试一次',
    presetFlash: 'flash 模式', presetPro: 'pro 模式', presetVision: 'vision 模式',
    staleHub: '本 DSH 实例还在跑旧版插件，缺少该接口 —— 重启 DSH 后再试',
    emptyResponse: (path: string, status: number) => `${path} → HTTP ${status}，响应为空`,
    badJson: (path: string, body: string) => `${path} → 非 JSON 响应: ${body}`,
    presetDefault: (id?: string) => `default · 跟随 DSH${id ? ` (${id})` : ''}`,
    progressTip: (t: string, turn: number, step: number, calls: number | string) => `耗时 ${t} · 第${turn}轮第${step}步 · ${calls} 次工具调用`,
    groupDispatch: '派发', groupRuntime: '运行',
    cardDispatch: { t: '派发策略', d: 'orchestrator 未指定时的档位与推理强度，以及档位约束、失败升档与各档位各自挂载的 Agent 预设。' },
    cardRuntime: { t: '执行与连接', d: 'worker 会话跑在本实例内还是独立进程，单个任务的超时上限，以及 CC / Codex 探测本实例的地址。' },
    modeDesc: { auto: 'auto · 优先 hub', hub: 'hub · 必须 hub', standalone: 'standalone · 独立进程' },
    save: '保存', saved: '已保存', jobs: 'Worker 任务', empty: '当前没有外部 Subagent 会话。',
    crewTab: 'Subagent 工作区', runningSessions: (n: number) => `${n} 个运行中`,
    openSession: '打开会话', remoteSession: '来自其他实例，无法在此打开',
    col: { id: '任务', source: '来源', tier: '档位', status: '状态', progress: '进度', tokens: 'tokens ⇅', task: '内容' },
    working: '处理中…',
    tips: {
      claude: {
        install: '一键装进 Claude Code：注册本地 marketplace、claude plugin install、写入工具权限白名单、接线 claude-hud worker 段；修改 settings.json 前自动备份',
        update: '重跑安装流程：刷新注册与权限、迁移旧格式配置、更新 HUD 接线；幂等，可放心点',
        restore: '从 Claude Code 移除集成：清除 marketplace 注册、插件启用项与权限规则（settings 先备份）；不删除插件源码与已跑任务',
      },
      codex: {
        install: '通过 config_file 注册 ds-flash / ds-pro / ds-vision（默认 gpt-5.6-luna），渲染零 MCP 上下文的 CLI bridge 路径，同时复制 /dsh-config、/dsh-status',
        update: '重新渲染 agent 的 CLI bridge、更新 config_file 注册与命令；修改前自动备份，幂等可重跑',
        restore: '删除 ds-flash / ds-pro / ds-vision 配置与命令，并从 Codex config.toml 清除插件维护的 agent 注册（修改前备份）',
      },
    },
  },
  en: {
    label: 'Subagent Workspace',
    title: 'Subagent Workspace',
    intro: 'Dispatch Claude Code / Codex subtasks to DSH agents within this instance, displayed as native subagents in the host with live progress. Configure dispatch defaults and execution mode, then one-click install into the host.',
    integrations: 'Integrations',
    installed: 'installed', notInstalled: 'not installed', hud: 'HUD segment',
    install: 'Install', update: 'Update', restore: 'Restore',
    confirmRestore: (name: string) => `Remove the dsh-crew integration from ${name}? (settings are backed up first)`,
    globalConfig: 'Global configuration',
    globalHint: 'Changes save instantly to ~/.config/dsh-crew/config.json; new CC / Codex sessions pick them up as defaults (override per session with /dsh-crew:config).',
    tier: 'Default tier', effort: 'Default effort', mode: 'Mode', timeout: 'Timeout (s)', hubUrl: 'Hub URL',
    tierPolicy: 'Tier policy', escalate: 'Escalate on failure',
    tierLabel: { flash: 'flash', pro: 'pro', vision: 'flash vision · multimodal' },
    tierPolicyDesc: { auto: 'auto · orchestrator picks', 'flash-only': 'flash only', 'pro-only': 'pro only', 'vision-only': 'vision only' },
    escalateHint: 'retry a failed flash run once on pro',
    presetFlash: 'flash preset', presetPro: 'pro preset', presetVision: 'vision preset',
    staleHub: 'This DSH instance is still running an older build of the plugin and lacks this route — restart DSH and retry',
    emptyResponse: (path: string, status: number) => `${path} → HTTP ${status}, empty response`,
    badJson: (path: string, body: string) => `${path} → non-JSON response: ${body}`,
    presetDefault: (id?: string) => `default · follow DSH${id ? ` (${id})` : ''}`,
    progressTip: (t: string, turn: number, step: number, calls: number | string) => `${t} elapsed · turn ${turn}, step ${step} · ${calls} tool calls`,
    groupDispatch: 'Dispatch', groupRuntime: 'Runtime',
    cardDispatch: { t: 'Dispatch policy', d: 'Tier and effort used when the orchestrator names none, plus tier clamping, failure escalation and the Agent preset mounted per tier.' },
    cardRuntime: { t: 'Execution & connection', d: 'Whether worker sessions run inside this instance or a separate process, the per-job timeout, and the address CC / Codex probes.' },
    modeDesc: { auto: 'auto · prefer hub', hub: 'hub · require hub', standalone: 'standalone' },
    save: 'Save', saved: 'Saved', jobs: 'Worker jobs', empty: 'No external subagent sessions yet.',
    crewTab: 'Subagent Workspace', runningSessions: (n: number) => `${n} running`,
    openSession: 'Open session', remoteSession: 'Owned by another instance; cannot open here',
    col: { id: 'job', source: 'source', tier: 'tier', status: 'status', progress: 'progress', tokens: 'tokens ⇅', task: 'task' },
    working: 'Working…',
    tips: {
      claude: {
        install: 'One-click install into Claude Code: register local marketplace, claude plugin install, permission allowlist, claude-hud segment wiring; settings.json backed up first',
        update: 'Re-run the installer: refresh registration & permissions, migrate legacy config, update HUD wiring; idempotent',
        restore: 'Remove the integration from Claude Code: marketplace registration, plugin enablement and permission rules (settings backed up); plugin source and past jobs untouched',
      },
      codex: {
        install: 'Register ds-flash / ds-pro / ds-vision through config_file (default gpt-5.6-luna), render a zero-MCP-context CLI bridge, and copy /dsh-config + /dsh-status',
        update: 'Re-render the agent CLI bridge, refresh config_file registrations and prompts; backups are created and reruns are idempotent',
        restore: 'Remove ds-flash / ds-pro / ds-vision configs and prompts, then clear the managed agent registrations from Codex config.toml (backed up first)',
      },
    },
  },
};

const S = {
  // Margins are tuned against the page container's 8px flex gap: the gap alone
  // sits below each heading, the margin only adds separation above it.
  section: { margin: '8px 0 -2px', fontSize: 13, fontWeight: 600 as const, opacity: 0.9 },
  // Small muted group label, matching the host's Agent-preset page (内置 / 自定义).
  group: { margin: '4px 0 -3px', fontSize: 12, opacity: 0.55 },
  // Card with a title + description header above its fields.
  block: { border: '1px solid rgba(128,128,128,0.22)', borderRadius: 10, padding: '11px 14px 13px', display: 'flex', flexDirection: 'column' as const, gap: 10 },
  blockGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px 14px', alignItems: 'end' as const },
  settingTitle: { fontWeight: 600 as const, fontSize: 13 },
  settingDesc: { fontSize: 11.5, opacity: 0.6, marginTop: 2, lineHeight: 1.5 },
  card: { border: '1px solid rgba(128,128,128,0.22)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const },
  grid: {
    border: '1px solid rgba(128,128,128,0.22)', borderRadius: 8, padding: '12px 14px',
    display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px 14px', alignItems: 'end' as const,
  },
  btn: { padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(128,128,128,0.35)', background: 'transparent', color: 'inherit', cursor: 'pointer', fontSize: 12.5 },
  chip: (on: boolean) => ({ fontSize: 11.5, padding: '1px 8px', borderRadius: 99, border: '1px solid', borderColor: on ? 'rgba(63,185,80,0.5)' : 'rgba(128,128,128,0.35)', color: on ? '#3fb950' : 'inherit', opacity: on ? 1 : 0.55 }),
  field: { display: 'flex', flexDirection: 'column' as const, gap: 3 },
  fieldLabel: { fontSize: 11, opacity: 0.6 },
  input: { padding: '3px 8px', borderRadius: 5, border: '1px solid rgba(128,128,128,0.35)', background: 'transparent', color: 'inherit', fontSize: 12.5 },
  cell: { padding: '5px 10px 5px 0', borderBottom: '1px solid rgba(128,128,128,0.16)', textAlign: 'left' as const, verticalAlign: 'top' as const },
  tight: {
    padding: '5px 8px 5px 0', borderBottom: '1px solid rgba(128,128,128,0.16)', textAlign: 'left' as const,
    verticalAlign: 'top' as const, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis',
  },
  mono: { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, fontVariantNumeric: 'tabular-nums' as const },
};

function CustomSelect({ value, options, onChange, minWidth }: {
  value: string; options: Array<{ value: string; label?: string }>;
  onChange: (v: string) => void; minWidth?: number;
}) {
  const [open, setOpen] = useState<{ left: number; top: number; bottom: number; width: number; up: boolean } | null>(null);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    const t = setTimeout(() => document.addEventListener('mousedown', close), 0);
    document.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', close); document.removeEventListener('keydown', onKey); };
  }, [open]);
  const current = options.find((o) => o.value === value);
  return (<>
    <button type="button"
      style={{ ...S.input, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', minWidth: minWidth ?? 92, width: '100%', boxSizing: 'border-box' as const, justifyContent: 'space-between' }}
      onClick={(e: any) => {
        const r = e.currentTarget.getBoundingClientRect();
        const up = window.innerHeight - r.bottom < 240;
        setOpen({ left: r.left, top: r.bottom + 4, bottom: window.innerHeight - r.top + 4, width: Math.max(r.width, 130), up });
      }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{current?.label ?? value}</span>
      <span style={{ opacity: 0.5, fontSize: 10 }}>▾</span>
    </button>
    {open && createPortal(
      <div
        style={{
          position: 'fixed', left: open.left, ...(open.up ? { bottom: open.bottom } : { top: open.top }),
          minWidth: open.width, zIndex: 9999, background: 'Canvas', color: 'CanvasText',
          border: '1px solid rgba(128,128,128,0.3)', borderRadius: 8,
          boxShadow: '0 8px 28px rgba(0,0,0,0.22)', padding: 4, maxHeight: 240, overflowY: 'auto',
        }}
        onMouseDown={(e: any) => e.stopPropagation()}>
        {options.map((o) => (
          <div key={o.value}
            onClick={() => { onChange(o.value); setOpen(null); }}
            style={{
              padding: '5px 10px', borderRadius: 5, cursor: 'pointer', fontSize: 12.5, whiteSpace: 'nowrap',
              background: o.value === value ? 'rgba(128,128,128,0.16)' : 'transparent',
              display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center',
            }}
            onMouseEnter={(e: any) => { e.currentTarget.style.background = 'rgba(128,128,128,0.24)'; }}
            onMouseLeave={(e: any) => { e.currentTarget.style.background = o.value === value ? 'rgba(128,128,128,0.16)' : 'transparent'; }}>
            <span>{o.label ?? o.value}</span>{o.value === value && <span style={{ opacity: 0.6, fontSize: 11 }}>✓</span>}
          </div>
        ))}
      </div>, document.body)}
  </>);
}

function sourceLabel(source?: string) {
  if (source === 'claude-code') return 'CC';
  if (source === 'codex') return 'Codex';
  if (source === 'api' || source === undefined) return 'API';
  return source;
}

function elapsed(startedAt: string, endedAt?: string | null) {
  const s = Math.max(0, Math.round(((endedAt ? +new Date(endedAt) : Date.now()) - +new Date(startedAt)) / 1000));
  return s >= 60 ? `${Math.floor(s / 60)}m${s % 60}s` : `${s}s`;
}
function useCrewJobs() {
  const [jobs, setJobs] = useState<any[]>([]);
  const refresh = useCallback(async () => {
    try {
      const r = await (await fetch(`${API}/jobs`, { cache: 'no-store' })).json();
      if (r.ok) setJobs(r.jobs ?? []);
    } catch { /* hub restarting */ }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 3000);
    return () => clearInterval(timer);
  }, [refresh]);
  return jobs;
}

function CrewSidebarSplit({ ctx, wide }: { ctx: any; wide: boolean }) {
  const [expanded, setExpanded] = useState(true);
  const [tick, setTick] = useState(0);
  const rootRef = useRef<HTMLElement | null>(null);
  const jobs = useCrewJobs();
  const locale = useSyncExternalStore(
    (notify: () => void) => ctx.on('locale/change', notify),
    () => ctx.locale.getLocale().active,
    () => ctx.locale.getLocale().active,
  );
  const copy = COPY[locale === 'zh' ? 'zh' : 'en'];
  useEffect(() => {
    if (!expanded || !wide) return;
    const timer = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [expanded, wide]);
  // footer actions are a horizontal flex row in the host. This entry is a
  // vertical split, so claim one full row without assuming whether newer host
  // actions (for example Plugin Market) render before or after us.
  useEffect(() => {
    const host = rootRef.current?.parentElement?.parentElement;
    if (!host) return;
    const previous = { wrap: host.style.flexWrap, width: host.style.width };
    host.style.flexWrap = 'wrap';
    host.style.width = '100%';
    return () => { host.style.flexWrap = previous.wrap; host.style.width = previous.width; };
  }, []);

  void tick;
  const running = jobs.filter((job) => job.status === 'running').length;
  const statusColor = (status: string) => status === 'running' ? '#4a9eff' : status === 'idle' ? '#8b949e' : status === 'done' ? '#3fb950' : '#f85149';

  if (!wide) return (
    <button type="button" title={copy.crewTab} aria-label={copy.crewTab}
      style={{ width: 40, height: 40, padding: 0, border: 0, borderRadius: 10, color: 'inherit', background: 'transparent', cursor: 'default' }}>
      <span style={{ position: 'relative', fontSize: 17 }}>♟{running > 0 && <span style={{ position: 'absolute', right: -8, top: -8,
        minWidth: 14, height: 14, padding: '0 3px', borderRadius: 8, background: '#4a9eff', color: '#fff', fontSize: 9, lineHeight: '14px' }}>{running}</span>}</span>
    </button>
  );

  return <section ref={rootRef} data-dsh-crew-sidebar="split" style={{ flex: '0 0 100%', width: '100%', minWidth: 0,
    boxSizing: 'border-box', borderTop: '1px solid rgba(128,128,128,.22)', marginTop: 4 }}>
    <button type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}
      style={{ width: '100%', height: 38, padding: '0 8px', border: 0, borderRadius: 8, color: 'inherit', background: 'transparent',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}>
      <span style={{ fontSize: 11, opacity: .6, transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>▶</span>
      <strong style={{ flex: 1, fontSize: 12.5 }}>{copy.crewTab}</strong>
      {running > 0 && <span style={{ fontSize: 10.5, color: '#4a9eff' }}>{copy.runningSessions(running)}</span>}
    </button>
    {expanded && <div style={{ height: 'min(38vh, 360px)', minHeight: 150, overflowY: 'auto', padding: '0 4px 8px' }}>
      {jobs.length === 0 ? <div style={{ padding: '7px 8px', opacity: .5, fontSize: 11.5 }}>{copy.empty}</div> : jobs.map((job) => {
        const local = job.local === true && typeof job.sessionId === 'string';
        return <button key={`${job.origin ?? ''}:${job.id}`} disabled={!local} title={local ? copy.openSession : copy.remoteSession}
          onClick={() => { if (local) ctx.sessions.open(job.sessionId); }}
          style={{ width: '100%', padding: '7px 8px', border: 0, borderRadius: 7, background: 'transparent', color: 'inherit',
            cursor: local ? 'pointer' : 'default', textAlign: 'left', opacity: local ? 1 : .65 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: statusColor(job.status), fontSize: 9 }}>●</span>
            <span style={{ fontSize: 10.5, opacity: .65 }}>{sourceLabel(job.source)}</span>
            <span style={{ flex: 1, fontSize: 10.5, opacity: .5 }}>{job.tier}/{job.effort}</span>
            <span style={{ fontSize: 10, opacity: .5 }}>{elapsed(job.startedAt, job.endedAt)}</span>
          </div>
          <div style={{ marginTop: 3, fontSize: 11.5, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{job.task}</div>
        </button>;
      })}
    </div>}
  </section>;
}

function WorkersPanel({ ctx }: { ctx: any }) {
  const locale = useSyncExternalStore(
    (notify: () => void) => ctx.on('locale/change', notify),
    () => ctx.locale.getLocale().active,
    () => ctx.locale.getLocale().active,
  );
  const copy = COPY[locale === 'zh' ? 'zh' : 'en'];

  const [status, setStatus] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [presetOptions, setPresetOptions] = useState<Array<{ value: string; label?: string }>>([{ value: 'default' }]);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  /**
   * The panel is served from disk on every load, but the hub's routes are
   * registered at instance boot — after an upgrade the new UI can call a route
   * the running instance does not have yet, which answers 404/405 with an empty
   * body. Report that as "restart DSH" instead of a JSON parse error.
   */
  const readJson = useCallback(async (res: Response, path: string) => {
    const text = await res.text();
    if (text === '') {
      throw new Error(res.status === 404 || res.status === 405
        ? `${copy.staleHub}（${path} → HTTP ${res.status}）`
        : copy.emptyResponse(path, res.status));
    }
    try { return JSON.parse(text); } catch { throw new Error(copy.badJson(path, text.slice(0, 160))); }
  }, [copy]);
  /** Every request carries the active locale: the panel is the authority on it
   * (DSH's setting may be unset), and the hub localizes its own strings from it. */
  const withLang = useCallback((path: string) => `${API}${path}${path.includes('?') ? '&' : '?'}lang=${locale === 'zh' ? 'zh' : 'en'}`, [locale]);
  const get = useCallback(async (path: string) => readJson(await fetch(withLang(path), { cache: 'no-store' }), path), [readJson, withLang]);
  const post = useCallback(async (path: string, body: any) => readJson(await fetch(withLang(path), {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...body, lang: locale === 'zh' ? 'zh' : 'en' }),
  }), path), [readJson, withLang, locale]);

  const refreshAll = useCallback(async () => {
    try {
      const [s, c, pr] = await Promise.all([get('/install/status'), get('/config'), get('/presets')]);
      if (s.ok) setStatus(s.status);
      if (c.ok) setConfig((prev: any) => prev ?? c.config);
      if (pr.ok) setPresetOptions([
        { value: 'default', label: copy.presetDefault(pr.defaultId) },
        ...(pr.presets ?? []).map((x: any) => ({ value: x.id, label: x.name ?? x.id })),
      ]);
    } catch { /* instance restarting */ }
  }, [get]);

  useEffect(() => { void refreshAll(); }, [refreshAll]);

  const act = useCallback(async (target: string, confirmName?: string) => {
    if (confirmName && !window.confirm(copy.confirmRestore(confirmName))) return;
    setBusy(true); setNotice(copy.working);
    try {
      const r = await post('/install', { target });
      if (r.ok === false) throw new Error(r.error);
      setNotice((r.actions ?? []).join('；'));
      const s = await get('/install/status'); if (s.ok) setStatus(s.status);
    } catch (e: any) { setNotice(String(e?.message ?? e)); } finally { setBusy(false); }
  }, [post, get, copy]);

  const applyPatch = useCallback((patch: Record<string, any>) => {
    void post('/config', patch).then((r) => {
      if (r.ok) { setConfig(r.config); setNotice(copy.saved); setTimeout(() => setNotice(''), 1500); }
    }).catch(() => {});
  }, [post, copy]);
  /** Selects & checkboxes: apply immediately. */
  const field = (key: string, value: any) => {
    setConfig((c: any) => ({ ...c, [key]: value }));
    applyPatch({ [key]: value });
  };
  /** Text/number inputs: track locally, apply on blur. */
  const fieldLocal = (key: string, value: any) => setConfig((c: any) => ({ ...c, [key]: value }));

  /** Card: title + one-line description header, then its fields. */
  const block = (text: { t: string; d: string }, fields: any, gridded = true) => (
    <div style={S.block}>
      <div>
        <div style={S.settingTitle}>{text.t}</div>
        <div style={S.settingDesc}>{text.d}</div>
      </div>
      {gridded ? <div style={S.blockGrid}>{fields}</div> : fields}
    </div>
  );

  const integrationRow = (name: string, installed: boolean, extra: any, installTarget: string, uninstallTarget: string, tips: any) => (
    <div style={S.card}>
      <span style={{ fontWeight: 600, fontSize: 13, minWidth: 92 }}>{name}</span>
      <span style={S.chip(installed)}>{installed ? `● ${copy.installed}` : `○ ${copy.notInstalled}`}</span>
      {extra}
      <span style={{ flex: 1 }} />
      {!installed && <button style={S.btn} title={tips.install} disabled={busy} onClick={() => { void act(installTarget); }}>{copy.install}</button>}
      {installed && <button style={S.btn} title={tips.update} disabled={busy} onClick={() => { void act(installTarget); }}>{copy.update}</button>}
      {installed && <button style={{ ...S.btn, opacity: 0.75 }} title={tips.restore} disabled={busy} onClick={() => { void act(uninstallTarget, name); }}>{copy.restore}</button>}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, lineHeight: 1.55 }}>
      <div style={{ fontSize: 19, fontWeight: 600, marginBottom: -2 }}>{copy.title}</div>
      <div style={{ opacity: 0.75 }}>{copy.intro}</div>

      <div style={S.section}>{copy.integrations}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {integrationRow('Claude Code', !!status?.claude?.installed,
          status?.claude?.installed ? <span style={S.chip(!!status?.claude?.hud)}>{copy.hud}</span> : null,
          'claude', 'claude-uninstall', (copy as any).tips.claude)}
        {integrationRow('Codex', !!status?.codex?.installed, null, 'codex', 'codex-uninstall', (copy as any).tips.codex)}
      </div>

      <div style={S.section}>{copy.globalConfig}</div>
      {config && (<>
        <div style={S.group}>{copy.groupDispatch}</div>
        {block(copy.cardDispatch, (<>
          <label style={S.field}><span style={S.fieldLabel}>{copy.tier}</span>
            <CustomSelect value={config.default_tier} onChange={(v) => field('default_tier', v)}
              options={(['flash', 'pro', 'vision'] as const).map((t) => ({ value: t, label: copy.tierLabel[t] }))} /></label>
          <label style={S.field}><span style={S.fieldLabel}>{copy.effort}</span>
            <CustomSelect value={config.default_effort} onChange={(v) => field('default_effort', v)}
              options={[{ value: 'off' }, { value: 'high' }, { value: 'max' }]} /></label>
          <label style={S.field}><span style={S.fieldLabel}>{copy.tierPolicy}</span>
            <CustomSelect value={config.tier_policy} onChange={(v) => field('tier_policy', v)}
              options={(['auto', 'flash-only', 'pro-only', 'vision-only'] as const).map((p) => ({ value: p, label: copy.tierPolicyDesc[p] }))} /></label>
          <label style={{ ...S.field, flexDirection: 'row' as const, alignItems: 'center', gap: 6, paddingBottom: 5 }} title={copy.escalateHint}>
            <input type="checkbox" checked={!!config.escalate_on_failure} onChange={(e) => field('escalate_on_failure', e.target.checked)} />
            <span style={{ fontSize: 12 }}>{copy.escalate}</span></label>
          <label style={S.field}><span style={S.fieldLabel}>{copy.presetFlash}</span>
            <CustomSelect value={config.preset_flash ?? 'default'} onChange={(v) => field('preset_flash', v)} options={presetOptions} /></label>
          <label style={S.field}><span style={S.fieldLabel}>{copy.presetPro}</span>
            <CustomSelect value={config.preset_pro ?? 'default'} onChange={(v) => field('preset_pro', v)} options={presetOptions} /></label>
          <label style={S.field}><span style={S.fieldLabel}>{copy.presetVision}</span>
            <CustomSelect value={config.preset_vision ?? 'default'} onChange={(v) => field('preset_vision', v)} options={presetOptions} /></label>
        </>))}

        <div style={S.group}>{copy.groupRuntime}</div>
        {block(copy.cardRuntime, (<>
          <label style={S.field}><span style={S.fieldLabel}>{copy.mode}</span>
            <CustomSelect value={config.mode} onChange={(v) => field('mode', v)}
              options={(['auto', 'hub', 'standalone'] as const).map((m) => ({ value: m, label: copy.modeDesc[m] }))} /></label>
          <label style={S.field}><span style={S.fieldLabel}>{copy.timeout}</span>
            <input style={{ ...S.input, width: '100%', boxSizing: 'border-box' as const }} type="number" min={60} max={7200} value={config.default_timeout_seconds}
              onChange={(e) => fieldLocal('default_timeout_seconds', Number(e.target.value))}
              onBlur={() => applyPatch({ default_timeout_seconds: config.default_timeout_seconds })} /></label>
          <label style={S.field}><span style={S.fieldLabel}>{copy.hubUrl}</span>
            <input style={{ ...S.input, width: '100%', boxSizing: 'border-box' as const }} value={config.hub_url}
              onChange={(e) => fieldLocal('hub_url', e.target.value)}
              onBlur={() => applyPatch({ hub_url: config.hub_url })}
              onKeyDown={(e: any) => { if (e.key === 'Enter') e.currentTarget.blur(); }} /></label>
        </>))}
      </>)}
      <div style={{ fontSize: 11.5, opacity: 0.55, marginTop: 2 }}>{copy.globalHint}</div>

      {notice !== '' && <div style={{ fontSize: 12, opacity: 0.8, whiteSpace: 'pre-wrap' }}>{notice}</div>}


    </div>
  );
}

export function apply(ctx: any): void {
  let runningCount = 0;
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register(
    { name: 'sidebar.footer.action', id: 'dsh-crew', order: 40, label: () => COPY[ctx.locale.getLocale().active === 'zh' ? 'zh' : 'en'].crewTab },
    ({ wide }: { wide: boolean }) => <CrewSidebarSplit ctx={ctx} wide={wide} />,
  ));
  ctx.slots.inject('settings.section', () => {
    let dispose = register();
    function register() {
      return ctx.slots.register(
        {
          name: 'settings.section',
          id: 'dsh-crew',
          order: 65,
          label: () => {
            const base = COPY[ctx.locale.getLocale().active === 'zh' ? 'zh' : 'en'].label;
            if (runningCount <= 0) return base;
            // String-only slot labels: filled circled digits are the closest
            // thing to a badge the contract allows.
            const CIRCLED = ['❶', '❷', '❸', '❹', '❺', '❻', '❼', '❽', '❾', '❿'];
            return `${base} ${CIRCLED[runningCount - 1] ?? `(${runningCount})`}`;
          },
        },
        () => <WorkersPanel ctx={ctx} />,
      );
    }
    const poll = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const r = await (await fetch(`${API}/jobs`, { cache: 'no-store' })).json();
        const n = r.ok ? (r.jobs ?? []).filter((j: any) => j.status === 'running').length : 0;
        if (n !== runningCount) {
          runningCount = n;
          dispose(); dispose = register(); // slots/changed → nav re-renders the label
        }
      } catch { /* hub restarting */ }
    };
    void poll();
    const timer = setInterval(() => { void poll(); }, 10_000);
    return () => { clearInterval(timer); dispose(); };
  });
}
