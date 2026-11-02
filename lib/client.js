window.__ModuleLoader__.load({ id: "@zseven-w/dsh-crew", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
let react = require("react");
let react_dom = require("react-dom");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/client/index.tsx
const inject = [
	"slots",
	"locale",
	"sessions"
];
const API = "/_dsh/dsh-crew";
const COPY = {
	zh: {
		label: "Subagent 工作区",
		title: "Subagent 工作区",
		intro: "把 Claude Code / Codex 的子任务派给本实例的 DSH agent，在宿主里显示为原生子代理、进度可见。配置派发默认值、执行方式，一键装进宿主。",
		integrations: "集成",
		installed: "已安装",
		notInstalled: "未安装",
		hud: "HUD 段",
		install: "安装",
		update: "更新",
		restore: "还原",
		confirmRestore: (name) => `确定从 ${name} 移除 dsh-crew 集成？（settings 会先备份）`,
		globalConfig: "全局配置",
		globalHint: "修改即时保存到 ~/.config/dsh-crew/config.json；CC / Codex 的新会话自动读取为默认值（会话内可用 /dsh-crew:config 临时覆盖）。",
		tier: "默认档位",
		effort: "默认推理",
		mode: "执行模式",
		timeout: "默认超时(秒)",
		hubUrl: "Hub 地址",
		tierPolicy: "档位策略",
		escalate: "失败升档",
		tierLabel: {
			flash: "flash",
			pro: "pro",
			vision: "flash vision · 多模态"
		},
		tierPolicyDesc: {
			auto: "auto · orchestrator 自选",
			"flash-only": "只用 flash",
			"pro-only": "只用 pro",
			"vision-only": "只用 vision"
		},
		escalateHint: "flash 失败自动用 pro 重试一次",
		presetFlash: "flash 模式",
		presetPro: "pro 模式",
		presetVision: "vision 模式",
		staleHub: "本 DSH 实例还在跑旧版插件，缺少该接口 —— 重启 DSH 后再试",
		emptyResponse: (path, status) => `${path} → HTTP ${status}，响应为空`,
		badJson: (path, body) => `${path} → 非 JSON 响应: ${body}`,
		presetDefault: (id) => `default · 跟随 DSH${id ? ` (${id})` : ""}`,
		progressTip: (t, turn, step, calls) => `耗时 ${t} · 第${turn}轮第${step}步 · ${calls} 次工具调用`,
		groupDispatch: "派发",
		groupRuntime: "运行",
		cardDispatch: {
			t: "派发策略",
			d: "orchestrator 未指定时的档位与推理强度，以及档位约束、失败升档与各档位各自挂载的 Agent 预设。"
		},
		cardRuntime: {
			t: "执行与连接",
			d: "worker 会话跑在本实例内还是独立进程，单个任务的超时上限，以及 CC / Codex 探测本实例的地址。"
		},
		modeDesc: {
			auto: "auto · 优先 hub",
			hub: "hub · 必须 hub",
			standalone: "standalone · 独立进程"
		},
		save: "保存",
		saved: "已保存",
		jobs: "Worker 任务",
		empty: "当前没有外部 Subagent 会话。",
		crewTab: "Subagent 工作区",
		runningSessions: (n) => `${n} 个运行中`,
		openSession: "打开会话",
		remoteSession: "来自其他实例，无法在此打开",
		col: {
			id: "任务",
			source: "来源",
			tier: "档位",
			status: "状态",
			progress: "进度",
			tokens: "tokens ⇅",
			task: "内容"
		},
		working: "处理中…",
		tips: {
			claude: {
				install: "一键装进 Claude Code：注册本地 marketplace、claude plugin install、写入工具权限白名单、接线 claude-hud worker 段；修改 settings.json 前自动备份",
				update: "重跑安装流程：刷新注册与权限、迁移旧格式配置、更新 HUD 接线；幂等，可放心点",
				restore: "从 Claude Code 移除集成：清除 marketplace 注册、插件启用项与权限规则（settings 先备份）；不删除插件源码与已跑任务"
			},
			codex: {
				install: "通过 config_file 注册 ds-flash / ds-pro / ds-vision（默认 gpt-5.6-luna），渲染零 MCP 上下文的 CLI bridge 路径，同时复制 /dsh-config、/dsh-status",
				update: "重新渲染 agent 的 CLI bridge、更新 config_file 注册与命令；修改前自动备份，幂等可重跑",
				restore: "删除 ds-flash / ds-pro / ds-vision 配置与命令，并从 Codex config.toml 清除插件维护的 agent 注册（修改前备份）"
			}
		}
	},
	en: {
		label: "Subagent Workspace",
		title: "Subagent Workspace",
		intro: "Dispatch Claude Code / Codex subtasks to DSH agents within this instance, displayed as native subagents in the host with live progress. Configure dispatch defaults and execution mode, then one-click install into the host.",
		integrations: "Integrations",
		installed: "installed",
		notInstalled: "not installed",
		hud: "HUD segment",
		install: "Install",
		update: "Update",
		restore: "Restore",
		confirmRestore: (name) => `Remove the dsh-crew integration from ${name}? (settings are backed up first)`,
		globalConfig: "Global configuration",
		globalHint: "Changes save instantly to ~/.config/dsh-crew/config.json; new CC / Codex sessions pick them up as defaults (override per session with /dsh-crew:config).",
		tier: "Default tier",
		effort: "Default effort",
		mode: "Mode",
		timeout: "Timeout (s)",
		hubUrl: "Hub URL",
		tierPolicy: "Tier policy",
		escalate: "Escalate on failure",
		tierLabel: {
			flash: "flash",
			pro: "pro",
			vision: "flash vision · multimodal"
		},
		tierPolicyDesc: {
			auto: "auto · orchestrator picks",
			"flash-only": "flash only",
			"pro-only": "pro only",
			"vision-only": "vision only"
		},
		escalateHint: "retry a failed flash run once on pro",
		presetFlash: "flash preset",
		presetPro: "pro preset",
		presetVision: "vision preset",
		staleHub: "This DSH instance is still running an older build of the plugin and lacks this route — restart DSH and retry",
		emptyResponse: (path, status) => `${path} → HTTP ${status}, empty response`,
		badJson: (path, body) => `${path} → non-JSON response: ${body}`,
		presetDefault: (id) => `default · follow DSH${id ? ` (${id})` : ""}`,
		progressTip: (t, turn, step, calls) => `${t} elapsed · turn ${turn}, step ${step} · ${calls} tool calls`,
		groupDispatch: "Dispatch",
		groupRuntime: "Runtime",
		cardDispatch: {
			t: "Dispatch policy",
			d: "Tier and effort used when the orchestrator names none, plus tier clamping, failure escalation and the Agent preset mounted per tier."
		},
		cardRuntime: {
			t: "Execution & connection",
			d: "Whether worker sessions run inside this instance or a separate process, the per-job timeout, and the address CC / Codex probes."
		},
		modeDesc: {
			auto: "auto · prefer hub",
			hub: "hub · require hub",
			standalone: "standalone"
		},
		save: "Save",
		saved: "Saved",
		jobs: "Worker jobs",
		empty: "No external subagent sessions yet.",
		crewTab: "Subagent Workspace",
		runningSessions: (n) => `${n} running`,
		openSession: "Open session",
		remoteSession: "Owned by another instance; cannot open here",
		col: {
			id: "job",
			source: "source",
			tier: "tier",
			status: "status",
			progress: "progress",
			tokens: "tokens ⇅",
			task: "task"
		},
		working: "Working…",
		tips: {
			claude: {
				install: "One-click install into Claude Code: register local marketplace, claude plugin install, permission allowlist, claude-hud segment wiring; settings.json backed up first",
				update: "Re-run the installer: refresh registration & permissions, migrate legacy config, update HUD wiring; idempotent",
				restore: "Remove the integration from Claude Code: marketplace registration, plugin enablement and permission rules (settings backed up); plugin source and past jobs untouched"
			},
			codex: {
				install: "Register ds-flash / ds-pro / ds-vision through config_file (default gpt-5.6-luna), render a zero-MCP-context CLI bridge, and copy /dsh-config + /dsh-status",
				update: "Re-render the agent CLI bridge, refresh config_file registrations and prompts; backups are created and reruns are idempotent",
				restore: "Remove ds-flash / ds-pro / ds-vision configs and prompts, then clear the managed agent registrations from Codex config.toml (backed up first)"
			}
		}
	}
};
const S = {
	section: {
		margin: "8px 0 -2px",
		fontSize: 13,
		fontWeight: 600,
		opacity: .9
	},
	group: {
		margin: "4px 0 -3px",
		fontSize: 12,
		opacity: .55
	},
	block: {
		border: "1px solid rgba(128,128,128,0.22)",
		borderRadius: 10,
		padding: "11px 14px 13px",
		display: "flex",
		flexDirection: "column",
		gap: 10
	},
	blockGrid: {
		display: "grid",
		gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
		gap: "12px 14px",
		alignItems: "end"
	},
	settingTitle: {
		fontWeight: 600,
		fontSize: 13
	},
	settingDesc: {
		fontSize: 11.5,
		opacity: .6,
		marginTop: 2,
		lineHeight: 1.5
	},
	card: {
		border: "1px solid rgba(128,128,128,0.22)",
		borderRadius: 8,
		padding: "10px 14px",
		display: "flex",
		alignItems: "center",
		gap: 10,
		flexWrap: "wrap"
	},
	grid: {
		border: "1px solid rgba(128,128,128,0.22)",
		borderRadius: 8,
		padding: "12px 14px",
		display: "grid",
		gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
		gap: "12px 14px",
		alignItems: "end"
	},
	btn: {
		padding: "4px 12px",
		borderRadius: 6,
		border: "1px solid rgba(128,128,128,0.35)",
		background: "transparent",
		color: "inherit",
		cursor: "pointer",
		fontSize: 12.5
	},
	chip: (on) => ({
		fontSize: 11.5,
		padding: "1px 8px",
		borderRadius: 99,
		border: "1px solid",
		borderColor: on ? "rgba(63,185,80,0.5)" : "rgba(128,128,128,0.35)",
		color: on ? "#3fb950" : "inherit",
		opacity: on ? 1 : .55
	}),
	field: {
		display: "flex",
		flexDirection: "column",
		gap: 3
	},
	fieldLabel: {
		fontSize: 11,
		opacity: .6
	},
	input: {
		padding: "3px 8px",
		borderRadius: 5,
		border: "1px solid rgba(128,128,128,0.35)",
		background: "transparent",
		color: "inherit",
		fontSize: 12.5
	},
	cell: {
		padding: "5px 10px 5px 0",
		borderBottom: "1px solid rgba(128,128,128,0.16)",
		textAlign: "left",
		verticalAlign: "top"
	},
	tight: {
		padding: "5px 8px 5px 0",
		borderBottom: "1px solid rgba(128,128,128,0.16)",
		textAlign: "left",
		verticalAlign: "top",
		whiteSpace: "nowrap",
		overflow: "hidden",
		textOverflow: "ellipsis"
	},
	mono: {
		fontFamily: "ui-monospace, Menlo, monospace",
		fontSize: 12,
		fontVariantNumeric: "tabular-nums"
	}
};
function CustomSelect({ value, options, onChange, minWidth }) {
	const [open, setOpen] = (0, react.useState)(null);
	(0, react.useEffect)(() => {
		if (!open) return;
		const close = () => setOpen(null);
		const onKey = (e) => {
			if (e.key === "Escape") close();
		};
		const t = setTimeout(() => document.addEventListener("mousedown", close), 0);
		document.addEventListener("keydown", onKey);
		return () => {
			clearTimeout(t);
			document.removeEventListener("mousedown", close);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);
	const current = options.find((o) => o.value === value);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
		type: "button",
		style: {
			...S.input,
			display: "flex",
			alignItems: "center",
			gap: 6,
			cursor: "pointer",
			minWidth: minWidth ?? 92,
			width: "100%",
			boxSizing: "border-box",
			justifyContent: "space-between"
		},
		onClick: (e) => {
			const r = e.currentTarget.getBoundingClientRect();
			const up = window.innerHeight - r.bottom < 240;
			setOpen({
				left: r.left,
				top: r.bottom + 4,
				bottom: window.innerHeight - r.top + 4,
				width: Math.max(r.width, 130),
				up
			});
		},
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
			style: {
				overflow: "hidden",
				textOverflow: "ellipsis",
				whiteSpace: "nowrap"
			},
			children: current?.label ?? value
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
			style: {
				opacity: .5,
				fontSize: 10
			},
			children: "▾"
		})]
	}), open && (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		style: {
			position: "fixed",
			left: open.left,
			...open.up ? { bottom: open.bottom } : { top: open.top },
			minWidth: open.width,
			zIndex: 9999,
			background: "Canvas",
			color: "CanvasText",
			border: "1px solid rgba(128,128,128,0.3)",
			borderRadius: 8,
			boxShadow: "0 8px 28px rgba(0,0,0,0.22)",
			padding: 4,
			maxHeight: 240,
			overflowY: "auto"
		},
		onMouseDown: (e) => e.stopPropagation(),
		children: options.map((o) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			onClick: () => {
				onChange(o.value);
				setOpen(null);
			},
			style: {
				padding: "5px 10px",
				borderRadius: 5,
				cursor: "pointer",
				fontSize: 12.5,
				whiteSpace: "nowrap",
				background: o.value === value ? "rgba(128,128,128,0.16)" : "transparent",
				display: "flex",
				justifyContent: "space-between",
				gap: 12,
				alignItems: "center"
			},
			onMouseEnter: (e) => {
				e.currentTarget.style.background = "rgba(128,128,128,0.24)";
			},
			onMouseLeave: (e) => {
				e.currentTarget.style.background = o.value === value ? "rgba(128,128,128,0.16)" : "transparent";
			},
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: o.label ?? o.value }), o.value === value && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				style: {
					opacity: .6,
					fontSize: 11
				},
				children: "✓"
			})]
		}, o.value))
	}), document.body)] });
}
function sourceLabel(source) {
	if (source === "claude-code") return "CC";
	if (source === "codex") return "Codex";
	if (source === "api" || source === void 0) return "API";
	return source;
}
function elapsed(startedAt, endedAt) {
	const s = Math.max(0, Math.round(((endedAt ? +new Date(endedAt) : Date.now()) - +new Date(startedAt)) / 1e3));
	return s >= 60 ? `${Math.floor(s / 60)}m${s % 60}s` : `${s}s`;
}
function useCrewJobs() {
	const [jobs, setJobs] = (0, react.useState)([]);
	const refresh = (0, react.useCallback)(async () => {
		try {
			const r = await (await fetch(`${API}/jobs`, { cache: "no-store" })).json();
			if (r.ok) setJobs(r.jobs ?? []);
		} catch {}
	}, []);
	(0, react.useEffect)(() => {
		refresh();
		const timer = setInterval(() => {
			if (document.visibilityState === "visible") refresh();
		}, 3e3);
		return () => clearInterval(timer);
	}, [refresh]);
	return jobs;
}
function CrewSidebarSplit({ ctx, wide }) {
	const [expanded, setExpanded] = (0, react.useState)(true);
	const [tick, setTick] = (0, react.useState)(0);
	const rootRef = (0, react.useRef)(null);
	const jobs = useCrewJobs();
	const locale = (0, react.useSyncExternalStore)((notify) => ctx.on("locale/change", notify), () => ctx.locale.getLocale().active, () => ctx.locale.getLocale().active);
	const copy = COPY[locale === "zh" ? "zh" : "en"];
	(0, react.useEffect)(() => {
		if (!expanded || !wide) return;
		const timer = setInterval(() => setTick((value) => value + 1), 1e3);
		return () => clearInterval(timer);
	}, [expanded, wide]);
	(0, react.useEffect)(() => {
		const host = rootRef.current?.parentElement?.parentElement;
		if (!host) return;
		const previous = {
			wrap: host.style.flexWrap,
			width: host.style.width
		};
		host.style.flexWrap = "wrap";
		host.style.width = "100%";
		return () => {
			host.style.flexWrap = previous.wrap;
			host.style.width = previous.width;
		};
	}, []);
	const running = jobs.filter((job) => job.status === "running").length;
	const statusColor = (status) => status === "running" ? "#4a9eff" : status === "idle" ? "#8b949e" : status === "done" ? "#3fb950" : "#f85149";
	if (!wide) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
		type: "button",
		title: copy.crewTab,
		"aria-label": copy.crewTab,
		style: {
			width: 40,
			height: 40,
			padding: 0,
			border: 0,
			borderRadius: 10,
			color: "inherit",
			background: "transparent",
			cursor: "default"
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
			style: {
				position: "relative",
				fontSize: 17
			},
			children: ["♟", running > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				style: {
					position: "absolute",
					right: -8,
					top: -8,
					minWidth: 14,
					height: 14,
					padding: "0 3px",
					borderRadius: 8,
					background: "#4a9eff",
					color: "#fff",
					fontSize: 9,
					lineHeight: "14px"
				},
				children: running
			})]
		})
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
		ref: rootRef,
		"data-dsh-crew-sidebar": "split",
		style: {
			flex: "0 0 100%",
			width: "100%",
			minWidth: 0,
			boxSizing: "border-box",
			borderTop: "1px solid rgba(128,128,128,.22)",
			marginTop: 4
		},
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
			type: "button",
			"aria-expanded": expanded,
			onClick: () => setExpanded((value) => !value),
			style: {
				width: "100%",
				height: 38,
				padding: "0 8px",
				border: 0,
				borderRadius: 8,
				color: "inherit",
				background: "transparent",
				cursor: "pointer",
				display: "flex",
				alignItems: "center",
				gap: 8,
				textAlign: "left"
			},
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: {
						fontSize: 11,
						opacity: .6,
						transform: expanded ? "rotate(90deg)" : "none",
						transition: "transform .15s"
					},
					children: "▶"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
					style: {
						flex: 1,
						fontSize: 12.5
					},
					children: copy.crewTab
				}),
				running > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: {
						fontSize: 10.5,
						color: "#4a9eff"
					},
					children: copy.runningSessions(running)
				})
			]
		}), expanded && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			style: {
				height: "min(38vh, 360px)",
				minHeight: 150,
				overflowY: "auto",
				padding: "0 4px 8px"
			},
			children: jobs.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					padding: "7px 8px",
					opacity: .5,
					fontSize: 11.5
				},
				children: copy.empty
			}) : jobs.map((job) => {
				const local = job.local === true && typeof job.sessionId === "string";
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					disabled: !local,
					title: local ? copy.openSession : copy.remoteSession,
					onClick: () => {
						if (local) ctx.sessions.open(job.sessionId);
					},
					style: {
						width: "100%",
						padding: "7px 8px",
						border: 0,
						borderRadius: 7,
						background: "transparent",
						color: "inherit",
						cursor: local ? "pointer" : "default",
						textAlign: "left",
						opacity: local ? 1 : .65
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 6
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									color: statusColor(job.status),
									fontSize: 9
								},
								children: "●"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									fontSize: 10.5,
									opacity: .65
								},
								children: sourceLabel(job.source)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: {
									flex: 1,
									fontSize: 10.5,
									opacity: .5
								},
								children: [
									job.tier,
									"/",
									job.effort
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									fontSize: 10,
									opacity: .5
								},
								children: elapsed(job.startedAt, job.endedAt)
							})
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							marginTop: 3,
							fontSize: 11.5,
							overflow: "hidden",
							whiteSpace: "nowrap",
							textOverflow: "ellipsis"
						},
						children: job.task
					})]
				}, `${job.origin ?? ""}:${job.id}`);
			})
		})]
	});
}
function WorkersPanel({ ctx }) {
	const locale = (0, react.useSyncExternalStore)((notify) => ctx.on("locale/change", notify), () => ctx.locale.getLocale().active, () => ctx.locale.getLocale().active);
	const copy = COPY[locale === "zh" ? "zh" : "en"];
	const [status, setStatus] = (0, react.useState)(null);
	const [config, setConfig] = (0, react.useState)(null);
	const [presetOptions, setPresetOptions] = (0, react.useState)([{ value: "default" }]);
	const [notice, setNotice] = (0, react.useState)("");
	const [busy, setBusy] = (0, react.useState)(false);
	/**
	* The panel is served from disk on every load, but the hub's routes are
	* registered at instance boot — after an upgrade the new UI can call a route
	* the running instance does not have yet, which answers 404/405 with an empty
	* body. Report that as "restart DSH" instead of a JSON parse error.
	*/
	const readJson = (0, react.useCallback)(async (res, path) => {
		const text = await res.text();
		if (text === "") throw new Error(res.status === 404 || res.status === 405 ? `${copy.staleHub}（${path} → HTTP ${res.status}）` : copy.emptyResponse(path, res.status));
		try {
			return JSON.parse(text);
		} catch {
			throw new Error(copy.badJson(path, text.slice(0, 160)));
		}
	}, [copy]);
	/** Every request carries the active locale: the panel is the authority on it
	* (DSH's setting may be unset), and the hub localizes its own strings from it. */
	const withLang = (0, react.useCallback)((path) => `${API}${path}${path.includes("?") ? "&" : "?"}lang=${locale === "zh" ? "zh" : "en"}`, [locale]);
	const get = (0, react.useCallback)(async (path) => readJson(await fetch(withLang(path), { cache: "no-store" }), path), [readJson, withLang]);
	const post = (0, react.useCallback)(async (path, body) => readJson(await fetch(withLang(path), {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			...body,
			lang: locale === "zh" ? "zh" : "en"
		})
	}), path), [
		readJson,
		withLang,
		locale
	]);
	const refreshAll = (0, react.useCallback)(async () => {
		try {
			const [s, c, pr] = await Promise.all([
				get("/install/status"),
				get("/config"),
				get("/presets")
			]);
			if (s.ok) setStatus(s.status);
			if (c.ok) setConfig((prev) => prev ?? c.config);
			if (pr.ok) setPresetOptions([{
				value: "default",
				label: copy.presetDefault(pr.defaultId)
			}, ...(pr.presets ?? []).map((x) => ({
				value: x.id,
				label: x.name ?? x.id
			}))]);
		} catch {}
	}, [get]);
	(0, react.useEffect)(() => {
		refreshAll();
	}, [refreshAll]);
	const act = (0, react.useCallback)(async (target, confirmName) => {
		if (confirmName && !window.confirm(copy.confirmRestore(confirmName))) return;
		setBusy(true);
		setNotice(copy.working);
		try {
			const r = await post("/install", { target });
			if (r.ok === false) throw new Error(r.error);
			setNotice((r.actions ?? []).join("；"));
			const s = await get("/install/status");
			if (s.ok) setStatus(s.status);
		} catch (e) {
			setNotice(String(e?.message ?? e));
		} finally {
			setBusy(false);
		}
	}, [
		post,
		get,
		copy
	]);
	const applyPatch = (0, react.useCallback)((patch) => {
		post("/config", patch).then((r) => {
			if (r.ok) {
				setConfig(r.config);
				setNotice(copy.saved);
				setTimeout(() => setNotice(""), 1500);
			}
		}).catch(() => {});
	}, [post, copy]);
	/** Selects & checkboxes: apply immediately. */
	const field = (key, value) => {
		setConfig((c) => ({
			...c,
			[key]: value
		}));
		applyPatch({ [key]: value });
	};
	/** Text/number inputs: track locally, apply on blur. */
	const fieldLocal = (key, value) => setConfig((c) => ({
		...c,
		[key]: value
	}));
	/** Card: title + one-line description header, then its fields. */
	const block = (text, fields, gridded = true) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		style: S.block,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			style: S.settingTitle,
			children: text.t
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			style: S.settingDesc,
			children: text.d
		})] }), gridded ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			style: S.blockGrid,
			children: fields
		}) : fields]
	});
	const integrationRow = (name, installed, extra, installTarget, uninstallTarget, tips) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		style: S.card,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				style: {
					fontWeight: 600,
					fontSize: 13,
					minWidth: 92
				},
				children: name
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				style: S.chip(installed),
				children: installed ? `● ${copy.installed}` : `○ ${copy.notInstalled}`
			}),
			extra,
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: { flex: 1 } }),
			!installed && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				style: S.btn,
				title: tips.install,
				disabled: busy,
				onClick: () => {
					act(installTarget);
				},
				children: copy.install
			}),
			installed && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				style: S.btn,
				title: tips.update,
				disabled: busy,
				onClick: () => {
					act(installTarget);
				},
				children: copy.update
			}),
			installed && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				style: {
					...S.btn,
					opacity: .75
				},
				title: tips.restore,
				disabled: busy,
				onClick: () => {
					act(uninstallTarget, name);
				},
				children: copy.restore
			})
		]
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		style: {
			display: "flex",
			flexDirection: "column",
			gap: 8,
			fontSize: 13,
			lineHeight: 1.55
		},
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					fontSize: 19,
					fontWeight: 600,
					marginBottom: -2
				},
				children: copy.title
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: { opacity: .75 },
				children: copy.intro
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: S.section,
				children: copy.integrations
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					flexDirection: "column",
					gap: 8
				},
				children: [integrationRow("Claude Code", !!status?.claude?.installed, status?.claude?.installed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: S.chip(!!status?.claude?.hud),
					children: copy.hud
				}) : null, "claude", "claude-uninstall", copy.tips.claude), integrationRow("Codex", !!status?.codex?.installed, null, "codex", "codex-uninstall", copy.tips.codex)]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: S.section,
				children: copy.globalConfig
			}),
			config && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: S.group,
					children: copy.groupDispatch
				}),
				block(copy.cardDispatch, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						style: S.field,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: S.fieldLabel,
							children: copy.tier
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CustomSelect, {
							value: config.default_tier,
							onChange: (v) => field("default_tier", v),
							options: [
								"flash",
								"pro",
								"vision"
							].map((t) => ({
								value: t,
								label: copy.tierLabel[t]
							}))
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						style: S.field,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: S.fieldLabel,
							children: copy.effort
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CustomSelect, {
							value: config.default_effort,
							onChange: (v) => field("default_effort", v),
							options: [
								{ value: "off" },
								{ value: "high" },
								{ value: "max" }
							]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						style: S.field,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: S.fieldLabel,
							children: copy.tierPolicy
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CustomSelect, {
							value: config.tier_policy,
							onChange: (v) => field("tier_policy", v),
							options: [
								"auto",
								"flash-only",
								"pro-only",
								"vision-only"
							].map((p) => ({
								value: p,
								label: copy.tierPolicyDesc[p]
							}))
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						style: {
							...S.field,
							flexDirection: "row",
							alignItems: "center",
							gap: 6,
							paddingBottom: 5
						},
						title: copy.escalateHint,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: !!config.escalate_on_failure,
							onChange: (e) => field("escalate_on_failure", e.target.checked)
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: { fontSize: 12 },
							children: copy.escalate
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						style: S.field,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: S.fieldLabel,
							children: copy.presetFlash
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CustomSelect, {
							value: config.preset_flash ?? "default",
							onChange: (v) => field("preset_flash", v),
							options: presetOptions
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						style: S.field,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: S.fieldLabel,
							children: copy.presetPro
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CustomSelect, {
							value: config.preset_pro ?? "default",
							onChange: (v) => field("preset_pro", v),
							options: presetOptions
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						style: S.field,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: S.fieldLabel,
							children: copy.presetVision
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CustomSelect, {
							value: config.preset_vision ?? "default",
							onChange: (v) => field("preset_vision", v),
							options: presetOptions
						})]
					})
				] })),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: S.group,
					children: copy.groupRuntime
				}),
				block(copy.cardRuntime, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						style: S.field,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: S.fieldLabel,
							children: copy.mode
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CustomSelect, {
							value: config.mode,
							onChange: (v) => field("mode", v),
							options: [
								"auto",
								"hub",
								"standalone"
							].map((m) => ({
								value: m,
								label: copy.modeDesc[m]
							}))
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						style: S.field,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: S.fieldLabel,
							children: copy.timeout
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							style: {
								...S.input,
								width: "100%",
								boxSizing: "border-box"
							},
							type: "number",
							min: 60,
							max: 7200,
							value: config.default_timeout_seconds,
							onChange: (e) => fieldLocal("default_timeout_seconds", Number(e.target.value)),
							onBlur: () => applyPatch({ default_timeout_seconds: config.default_timeout_seconds })
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						style: S.field,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: S.fieldLabel,
							children: copy.hubUrl
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							style: {
								...S.input,
								width: "100%",
								boxSizing: "border-box"
							},
							value: config.hub_url,
							onChange: (e) => fieldLocal("hub_url", e.target.value),
							onBlur: () => applyPatch({ hub_url: config.hub_url }),
							onKeyDown: (e) => {
								if (e.key === "Enter") e.currentTarget.blur();
							}
						})]
					})
				] }))
			] }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					fontSize: 11.5,
					opacity: .55,
					marginTop: 2
				},
				children: copy.globalHint
			}),
			notice !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					fontSize: 12,
					opacity: .8,
					whiteSpace: "pre-wrap"
				},
				children: notice
			})
		]
	});
}
function apply(ctx) {
	let runningCount = 0;
	ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
		name: "sidebar.footer.action",
		id: "dsh-crew",
		order: 40,
		label: () => COPY[ctx.locale.getLocale().active === "zh" ? "zh" : "en"].crewTab
	}, ({ wide }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CrewSidebarSplit, {
		ctx,
		wide
	})));
	ctx.slots.inject("settings.section", () => {
		let dispose = register();
		function register() {
			return ctx.slots.register({
				name: "settings.section",
				id: "dsh-crew",
				order: 65,
				label: () => {
					const base = COPY[ctx.locale.getLocale().active === "zh" ? "zh" : "en"].label;
					if (runningCount <= 0) return base;
					return `${base} ${[
						"❶",
						"❷",
						"❸",
						"❹",
						"❺",
						"❻",
						"❼",
						"❽",
						"❾",
						"❿"
					][runningCount - 1] ?? `(${runningCount})`}`;
				}
			}, () => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WorkersPanel, { ctx }));
		}
		const poll = async () => {
			if (document.visibilityState !== "visible") return;
			try {
				const r = await (await fetch(`${API}/jobs`, { cache: "no-store" })).json();
				const n = r.ok ? (r.jobs ?? []).filter((j) => j.status === "running").length : 0;
				if (n !== runningCount) {
					runningCount = n;
					dispose();
					dispose = register();
				}
			} catch {}
		};
		poll();
		const timer = setInterval(() => {
			poll();
		}, 1e4);
		return () => {
			clearInterval(timer);
			dispose();
		};
	});
}
//#endregion
exports.apply = apply;
exports.inject = inject;

return module.exports; } });
