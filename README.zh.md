<p align="center">
  <img src="./docs/images/dsh-crew-logo.png" alt="DSH Crew" width="120" />
</p>

<h1 align="center">DSH Crew</h1>

<p align="center">
  <strong><a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness</a> 插件：在 Claude Code / Codex 里把活派给 DSH agent，同时保留宿主原生的子代理界面。</strong><br />
  <sub>原生进度 UI &bull; 档位策略与失败升档 &bull; DSH 会话进宿主 &bull; 一键安装</sub>
</p>

<p align="center">
  <sub>npm: <code>@zseven-w/dsh-crew</code> &middot; 当前插件版本: <code>0.1.0-rc.1</code> &middot; 已在 DSH <code>0.1.0-rc.6</code> 验证</sub>
</p>

<p align="center">
  <a href="./README.md">English</a> &middot; <a href="./README.zh.md"><b>简体中文</b></a> &middot; <a href="./README.zh-TW.md">繁體中文</a> &middot; <a href="./README.ja.md">日本語</a> &middot; <a href="./README.ko.md">한국어</a> &middot; <a href="./README.fr.md">Français</a> &middot; <a href="./README.es.md">Español</a> &middot; <a href="./README.de.md">Deutsch</a> &middot; <a href="./README.pt.md">Português</a> &middot; <a href="./README.ru.md">Русский</a> &middot; <a href="./README.hi.md">हिन्दी</a> &middot; <a href="./README.tr.md">Türkçe</a> &middot; <a href="./README.th.md">ไทย</a> &middot; <a href="./README.vi.md">Tiếng Việt</a> &middot; <a href="./README.id.md">Bahasa Indonesia</a>
</p>

<p align="center">
  <a href="https://github.com/ZSeven-W/dsh-crew/blob/main/LICENSE"><img src="https://img.shields.io/github/license/ZSeven-W/dsh-crew?color=64748b" alt="License" /></a>
</p>

<br />

<p align="center">
  <img src="./docs/images/dsh-crew-overview.png" alt="DSH Crew 设置页" width="100%" />
</p>
<p align="center"><sub>DSH Crew 设置页 —— 宿主集成、派发策略与执行方式</sub></p>

## 为什么用 DSH Crew

DSH Crew 是 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH，开源 agent harness）的插件，它让 DSH agent 可以从 Claude Code 与 Codex 里被派活：orchestrator 的模型不变，活由真正的 DSH agent 去干——用的是这套 harness 的工具、沙箱、预设与会话历史——而在宿主里它仍然是一个带实时进度的原生子代理。

干活的是 DSH agent，不是一次裸的模型调用。档位（`flash` / `pro` / `vision`）决定这个 agent 从 harness 已配置的模型阵容里拿到多强的能力（目前是 DeepSeek V4 Flash、V4 Pro 与 V4 Flash Vision）——DSH 那边换模型，这边不用改。`vision` 是多模态档：`deepseek-v4-flash-vision-exp` 同时读文本与图片。

<table>
<tr>
<td width="50%">

### 🧵 原生进度 UI

worker 在 Claude Code / Codex 里就是普通子代理——派了几个、跑到第几步、调了多少工具、花了多少 token，都显示在宿主自己的任务面板里；claude-hud 还有一行状态栏段：`⚙dsh 1▶pro 2m14s 21.7k/606 ✓3`。

</td>
<td width="50%">

### 🎚️ 档位策略与失败升档

机械活走 `flash`，要推理走 `pro`，要看图走 `vision`，`effort` 从 `off` 到 `max`。`tier_policy` 可在工具层把所有派发收敛到某一档；`escalate_on_failure` 让失败的 flash 任务自动用 pro 重试一次——依据结果，而不是事前猜难度。

</td>
</tr>
<tr>
<td width="50%">

### 🏛️ DSH 会话跑在宿主里

把 bundle 装进 DSH profile 后，每个 worker 都是一等公民的 DSH 会话：出现在 Web UI 列表、按工作目录归组、按档位挂上你指定的 Agent 预设。DSH 没在跑时，派发自动回落到独立的 DSH runtime，CI 与无界面环境照样可用。

</td>
<td width="50%">

### 📦 一键安装

设置页替你安装和更新 Claude Code 插件与 Codex 角色文件——marketplace 注册、权限白名单、HUD 接线、按本机渲染绝对路径——也同样一键还原。所有配置文件改动前都会先备份。

</td>
</tr>
</table>

## 工作方式

```
Claude Code / Codex（orchestrator，模型不变）
  └─ ds-flash / ds-pro / ds-vision  ← 原生子代理壳（进度出现在宿主任务 UI）
       ├─ Claude Code → MCP: dsh_run_worker(tier, effort, cwd)
       └─ Codex       → CLI bridge（父级上下文不加载 MCP schema）
            ├─ hub 可达 → DSH 内的会话（Web UI 可见，按 cwd 归组）
            └─ 否则     → dsh-jsonrpc-agent 独立 runtime（worker.cordis.yml）
                 └─ DeepSeek V4 Flash / Pro / Flash Vision（DSH SDK，事件流 → 进度与 token 统计）
```

## 一次派发，两个视角

派发是可以铺开的。下面这次，18 个 worker 并行翻译这份 README：宿主把它们算作自己的子代理，harness 则把它们当作真实会话来跑。

<p align="center">
  <img src="./docs/images/dsh-crew-host.png" alt="Claude Code" width="100%" />
</p>
<p align="center"><sub>Claude Code 里，dsh-crew worker 就是原生子代理；状态栏段实时显示在跑的档位、耗时与 token。</sub></p>

<p align="center">
  <img src="./docs/images/dsh-crew-jobs.png" alt="DSH Crew" width="100%" />
</p>
<p align="center"><sub>DSH Crew 面板从 harness 一侧看同一次运行：每个任务由哪个宿主派出、档位与推理强度、实时进度与 token 消耗。</sub></p>

## 安装

从 npm 装进 DSH profile：

```bash
dsh plugin --profile web add @zseven-w/dsh-crew@latest
dsh web
```

或者从源码树本地开发：

```bash
dsh plugin --profile web add link:/path/to/dsh-crew
dsh web
```

`link:` 协议把 profile 依赖软链到本仓库，改完重新构建即时可见。

### 配置 DeepSeek 凭据（standalone 模式专用）

在 hub 模式下 — 即上面的安装方式 — worker 运行在 DSH 实例内部，使用 DSH 实例已配置的 DeepSeek 凭据。无需额外设置。

仅 standalone 回落方案需要自己的 key：从 Claude Code / Codex 派发任务而没有 DSH 实例运行时，会启动一个独立的 worker runtime 进程。从 [platform.deepseek.com](https://platform.deepseek.com) 取 API key，写入 `~/.config/dsh-crew/.env`：

```
DEEPSEEK_API_KEY=sk-...
```

### 自检

```bash
node scripts/smoke.mjs
```

smoke 测试会挑一条可用的路径派一个廉价任务——DSH 实例在跑就走 hub，否则走 standalone——并打印实际用的是哪条。十几秒内看到 `smoke test passed — configuration OK` 即配置成功。失败会打印具体原因，且只针对实际测的那条路径。

然后打开 设置 → DSH Crew，一键装好 Claude Code / Codex 集成。

## 背景与术语

- **DSH**（DeepSeek Harness）：DeepSeek 的开源 agent harness，Web UI 形态的编码代理，类似 Claude Code 但驱动 DeepSeek 模型。
- **MCP**（Model Context Protocol）：Anthropic 的 AI 工具接入协议，让 LLM 安全调用外部工具与数据源。
- **Cordis bundle**：DSH 的插件格式，本项目既可作独立 MCP 服务，也可装进 DSH Web 成为 hub 模式。
- **tier**：能力档位，决定 worker 从 DSH 已配置的模型阵容里拿到哪一档——`flash` 快而省（适合简单任务），`pro` 推理强（适合复杂问题），`vision` 能看图（多模态，`deepseek-v4-flash-vision-exp`）。当前对应 DeepSeek V4 Flash、V4 Pro 与 V4 Flash Vision；DSH 换模型，这边不用改。
- **worker**：被派去干活的 DSH agent —— 一个完整的会话，自带工具、沙箱与预设，不是一次裸的模型调用。
- **effort**：推理强度，`off` = 不用推理，`high` = 高投入推理，`max` = 最大推理投入。

## Claude Code

### 安装

一键安装（二选一）：

- **DSH 设置页**（已装 hub 模式时）：设置 → DSH Crew → "安装到 Claude Code"
- **命令行**：`node src/install/cli.mjs all`

两者做同样的事：注册本地 marketplace（父目录 `dsh-plugins/` 为 marketplace 根） + `claude plugin install` + MCP 工具权限白名单 + claude-hud worker 状态段配置（改动前自动备份 settings.json，幂等）。**安装后重启会话生效**。

### 使用

- 直接在对话中说 "把 X 派给 ds-flash"、"ds-pro" 或 "ds-vision"，子代理会执行任务
- 派发数量与实时进度显示在 Claude Code 的任务 UI
- **HUD 状态栏段**：`⚙dsh 1▶pro 2m14s 21.7k/606 ✓3`（当前档位 / 耗时 / token 占用 / 完成计数）
  - 本地开发用 `statusline/statusline.sh` 或 `statusline/worker-segment.sh` 可独立集成
- **超长任务**：CC 对 MCP 调用有超时限制（`MCP_TOOL_TIMEOUT` 可调），长任务可让 orchestrator 用 `dsh_spawn_worker` + `dsh_worker_result(wait_seconds)` 轮询
- **本地开发调试**：`claude --plugin-dir /path/to/dsh-crew` 临时加载


### 会话命令

只覆盖当前会话的全局默认值，且在工具层执法，不靠提示词自觉：

| 命令 | 作用 |
|---|---|
| `/dsh-crew:config` | 查看或设置本会话默认值：`tier=flash\|pro\|vision`、`effort=off\|high\|max`、`mode=auto\|hub\|standalone`、`timeout=<秒>`、`policy=auto\|flash-only\|pro-only\|vision-only`、`escalate=true\|false`、`reset` |
| `/dsh-crew:on` · `/dsh-crew:off` | 开关本会话的派发（关闭是硬开关，工具层直接拒绝） |
| `/dsh-crew:status` | worker 任务实时状态：档位、进度、tokens、当前工具 |

## Codex

### 安装

推荐用安装器：它会安装独立的 custom-agent 配置，通过 `[agents.*].config_file` 注册角色，按本机路径渲染 CLI bridge，并复制 `/dsh-config`、`/dsh-status` 命令。它不会为 Codex 注册任何 MCP server：

```bash
node src/install/cli.mjs codex
```

手工安装时，需要复制完整的 custom-agent 配置，并在相邻的 Codex 配置中注册：

```bash
mkdir -p ~/.codex/agents ~/.codex/prompts
cp codex/agents/*.toml ~/.codex/agents/
cp codex/prompts/*.md ~/.codex/prompts/
# 将复制后的 TOML/Markdown 中 __DSH_CREW_CLI__ 替换为
# src/cli/run-worker.mjs 的绝对路径，然后注册 agent：
cat >> ~/.codex/config.toml <<'EOF'
[agents."ds-flash"]
description = "DeepSeek V4 Flash worker dispatcher running inside DSH."
config_file = "./agents/ds-flash.toml"

[agents."ds-pro"]
description = "DeepSeek V4 Pro worker dispatcher running inside DSH."
config_file = "./agents/ds-pro.toml"

[agents."ds-vision"]
description = "DeepSeek V4 Flash Vision worker dispatcher running inside DSH."
config_file = "./agents/ds-vision.toml"
EOF
```

每个独立 agent 配置默认使用 `gpt-5.6-luna`，并调用 `src/cli/run-worker.mjs`。任务以 base64 传递，不会插值成 shell 代码；bridge 自动选择 hub 或 standalone、等待真实 DSH job，并输出单行 JSON。只有结果包含可验证的 `hub-` 或 `job-` id 时 dispatcher 才接受，否则以 `DSH_DISPATCH_UNAVAILABLE` 失败关闭。

**注意**：手工安装时，需要把复制后的所有 agent TOML 与 Codex prompt 文件中的 `__DSH_CREW_CLI__` 替换为 `src/cli/run-worker.mjs` 的绝对路径。相对 `config_file` 路径以 `config.toml` 所在目录为基准；安装器会自动渲染全部 bridge 路径并维护 agent 注册。

### 使用

- 交互 TUI 里选 "spawn ds-pro to ..." 派发任务，Active/Done 面板显示进度
- Codex 不加载 dsh-crew MCP 工具；agent 与 `/dsh-*` prompt 都通过一次 shell 命令调用 CLI bridge


### 会话命令

Codex 侧装的是同样两条 prompt：

| 命令 | 作用 |
|---|---|
| `/dsh-config` | 查看或设置 `~/.config/dsh-crew/config.json` 中的 CLI bridge 默认值：`tier=flash\|pro\|vision`、`effort=off\|high\|max`、`mode=auto\|hub\|standalone`、`timeout=<秒>`、`policy=auto\|flash-only\|pro-only\|vision-only`、`escalate=true\|false`、`reset` |
| `/dsh-status` | worker 任务实时状态：档位、进度、tokens、当前工具 |

## Claude Code MCP 工具

Codex 使用上面的 CLI bridge；以下 MCP 工具继续提供给 Claude Code。

| 工具 | 说明 |
|---|---|
| `dsh_run_worker` | 阻塞式派任务（`tier`: flash/pro/vision，`effort`: off/high/max，`cwd`），等返回结果 |
| `dsh_spawn_worker` | 异步派发任务，返回 job id（用于并行 fan-out） |
| `dsh_worker_status` | 查询全部 job 的实时进度（turn/step/当前工具/token） |
| `dsh_worker_result` | 取结果，可指定 `wait_seconds` 等待 |
| `dsh_worker_cancel` | 取消指定 job，终止其 runtime 进程 |

进度同时镜像到 `~/.config/dsh-crew/status.d/`（每个写入方一个分片文件，statusline / 外部监控可读）。

## Hub 模式

本包同时是合法的 DSH bundle（`dsh.bundle` + `cordis.patch.yml`）。执行 `dsh plugin add dsh-crew` 装进 DSH Web profile 后：

- **Worker 会话一等公民化**：以 first-class session 运行在 DSH host 里（`agents.create` + per-session model/effort waterfall + 默认 preset），出现在 Web UI 会话列表，随时可点开围观完整执行过程
- **按工作目录归类**：Web UI 中按 cwd 管理 worker 会话
- **Loopback API**：
  - `POST/GET /_dsh/dsh-crew/jobs`：spawn 任务、列表、长轮询结果、cancel
  - `GET /_dsh/dsh-crew/ping`：健康探测（MCP shim 靠它判断 hub 是否在跑）
  - `POST /_dsh/dsh-crew/install`：一键安装 Claude Code / Codex 集成（即 `src/install/` 的后端）
- **自动探测**：CC/Codex 的 MCP shim 自动探测 hub（`DSH_CREW_HUB` 环境变量，默认 `http://127.0.0.1:3080`）
  - DSH Web 在跑 → job 进 hub 模式（`mode: "hub"`）
  - 没跑 → 回落 standalone runtime

## 方案选择与限制

### 日常订阅用户 → 壳 subagent 方案（推荐）

- **现状**：Claude Code 壳子代理用 haiku 中转，每次派发多花几百~几千 token
- **权衡**：用少量 Anthropic token 换取原生任务 UI、进度实时显示、无需额外配置
- **建议**：如果你已订阅 Claude Pro 或用 Claude Code，用这套——省事且透明

### 按量付费 / CI 环境 → Router 直连方案

- **现状**：Claude Code 子代理的 frontmatter 不支持直连第三方模型；本仓库 scratchpad 里的 router 实验方案需要 API-key 凭据的 Claude Code，但订阅 OAuth 会被 Anthropic 上游 403
- **建议**：
  - 如果用 API-key 凭据（非 OAuth）且想省 Anthropic token，可在本地跑 router 直连 DeepSeek
  - CI 环境通常也是 API-key，该方案更经济（全部用 DeepSeek token）
  - 需要自行测试 router 集成（非官方支持）

### 跑着 DSH Web → Hub 模式自动启用

- **现状**：若 `dsh plugin add dsh-crew` 装进 DSH Web profile，job 以一等公民会话跑在 host 里，出现在 Web UI 会话列表
- **建议**：本地开发迭代时推荐启用 hub 模式，worker 进度可在 Web UI 完整围观；跨机器协作或无 Web UI 环境用 Claude Code / Codex 壳方案

### 已知事项

- Codex 角色理论上可试 `model_provider` 直指 DeepSeek（未验证）；本桥不依赖它
- **运行时依赖**：仅 `@modelcontextprotocol/sdk` 与 `zod`；`@deepseek-ai/*` 为 peerDependencies（由 DSH 宿主提供）
- **Codex agent 配置**：`ds-flash` / `ds-pro` 通过 `[agents.*].config_file` 注册、默认使用 `gpt-5.6-luna`，并通过 CLI bridge 派发；Codex 不注册或继承 dsh-crew MCP 工具

## 开发

```bash
pnpm install
node_modules/.bin/tsdown src/client/index.tsx --format cjs --platform browser \
  --target es2022 --tsconfig tsconfig.client.json --out-dir .client-build --clean
node scripts/build-client.mjs   # 把 bundle 包装成 DSH 模块加载器格式
node scripts/smoke.mjs          # 真实派发一个 flash 任务做端到端自检
```

运行时依赖只有 `@modelcontextprotocol/sdk` 与 `zod`；所有 `@deepseek-ai/*` 都是 peerDependencies，由 DSH 宿主提供——这样插件才留在宿主的单一模块 realm 里。

## 生态

- [DSH Noema](https://github.com/ZSeven-W/dsh-noema) —— DSH 的长期记忆
- [DSH OpenPencil](https://github.com/ZSeven-W/dsh-openpencil) —— 在对话里预览与编辑 `.op` 设计文档

## 许可

MIT
