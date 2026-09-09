// video-builder: slash-command guide + custom-adapter runtime (v2.11.1)
// Slash command `/build-video-tool` injects a skill-like guide once per
// invocation. Custom adapters are JS object expressions stored on the card
// (adapterCode) and evaluated at execution time.

export const VIDEO_BUILDER_CMD = 'build-video-tool'
export const CUSTOM_ADAPTER_PROTOCOL = 'custom-adapter'
export const VIDEO_CARD_HARD_MAX = 10

export function clampVideoCardLimit(raw) {
  const n = Math.floor(Number(raw))
  if (!Number.isFinite(n) || n < 1) return 10
  return Math.min(n, VIDEO_CARD_HARD_MAX)
}

/** Load adapter object from source. Throws a readable error on failure. */
export function loadCustomAdapter(code) {
  const src = typeof code === 'string' ? code.trim() : ''
  if (!src) throw new Error('custom-adapter: adapterCode 为空')
  let obj
  try {
    // eslint-disable-next-line no-new-func
    obj = new Function('"use strict"; return (' + src + ');')()
  } catch (e) {
    throw new Error('custom-adapter: adapterCode 不是合法的 JS 对象表达式：' + String(e && e.message || e).slice(0, 200))
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new Error('custom-adapter: adapterCode 必须求值为对象')
  }
  for (const fn of ['buildSubmit', 'parseTaskId', 'pollUrl', 'parseStatus']) {
    if (typeof obj[fn] !== 'function') {
      throw new Error('custom-adapter: adapter 缺少必需方法 ' + fn + '()')
    }
  }
  return obj
}

/** Validate adapter by loading it; returns {ok, error, adapter?}. */
export function validateCustomAdapter(code) {
  try {
    const adapter = loadCustomAdapter(code)
    return { ok: true, adapter }
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) }
  }
}

/**
 * Run a custom-adapter video generation.
 * cfg: card.config (protocol === 'custom-adapter', endpoint/apiKey/model/adapterCode)
 * args: { prompt, seconds, aspectRatio, resolution, output_dir }
 * deps: { httpJson, fetchImageBuffer, sessionCwd, clampTimeout, join, mkdirSync, writeFileSync }
 */
export async function runCustomAdapterVideo(cfg, args, deps) {
  const adapter = loadCustomAdapter(cfg.adapterCode)
  const prompt = String(args.prompt || '').trim()
  if (!prompt) throw new Error('custom-adapter: 缺少参数 prompt')
  const seconds = Math.max(1, Math.min(Math.floor(Number(args.seconds) || cfg.seconds || 5), 30))
  const aspectRatio = String(args.aspectRatio || cfg.aspectRatio || '16:9')
  const resolution = String(args.resolution || cfg.resolution || '720p').toLowerCase()
  const ctx = {
    cfg: {
      endpoint: String(cfg.endpoint || '').replace(/\/+$/, ''),
      apiKey: String(cfg.apiKey || ''),
      model: String(cfg.model || ''),
      protocol: CUSTOM_ADAPTER_PROTOCOL
    },
    prompt,
    imageUrl: args._imageUrl || null,
    seconds,
    aspectRatio,
    resolution
  }
  const built = adapter.buildSubmit(ctx)
  if (!built || typeof built !== 'object' || typeof built.url !== 'string' || !built.url) {
    throw new Error('custom-adapter: buildSubmit 必须返回 { url, method?, headers?, body? }')
  }
  const method = String(built.method || 'POST').toUpperCase()
  const headers = Object.assign({ 'Content-Type': 'application/json', Accept: 'application/json' }, built.headers || {})
  const timeoutMs = deps.clampTimeout(cfg.timeoutMs, 600000)
  const attempts0 = Math.max(1, Math.min(cfg.retryCount || 1, 5))
  let taskId = ''
  let lastErr = null
  for (let attempt = 1; attempt <= attempts0; attempt++) {
    const res = await deps.httpJson(built.url, method, headers, method === 'GET' ? null : (built.body ?? null), timeoutMs)
    if (res.ok && res.body) {
      try { taskId = String(adapter.parseTaskId(res.body) || '') } catch (e) {
        lastErr = 'parseTaskId 抛错：' + String(e && e.message || e).slice(0, 200)
      }
      if (taskId) break
      if (!lastErr) lastErr = '提交成功但 parseTaskId 未返回任务 ID：' + String(res.message || '').slice(0, 200)
    } else {
      lastErr = 'HTTP ' + res.status + ': ' + String(res.message || '').slice(0, 200)
    }
    if (res.status === 'TIMEOUT') break
    if (attempt < attempts0) await new Promise((r) => setTimeout(r, Math.min(800 * attempt, 4000)))
  }
  if (!taskId) throw new Error('custom-adapter: 视频任务提交失败' + (lastErr ? '（' + lastErr + '）' : ''))
  const pollIntervalMs = Math.max(1000, Math.floor(Number(cfg.pollIntervalMs) || 5000))
  const pollBudgetMs = timeoutMs
  const maxPolls = Math.max(1, Math.ceil(pollBudgetMs / pollIntervalMs))
  let consecErr = 0
  let lastStatus = ''
  let lastPollErr = ''
  for (let poll = 0; poll < maxPolls; poll++) {
    await new Promise((r) => setTimeout(r, pollIntervalMs))
    let st
    try {
      const pollCtx = { cfg: ctx.cfg, taskId }
      const pollUrl = String(adapter.pollUrl(pollCtx) || '')
      if (!pollUrl) throw new Error('pollUrl 返回空')
      const pollHeaders = typeof adapter.pollHeaders === 'function'
        ? Object.assign({ Accept: 'application/json', ...(ctx.cfg.apiKey ? { Authorization: 'Bearer ' + ctx.cfg.apiKey } : {}) }, adapter.pollHeaders(pollCtx) || {})
        : { Accept: 'application/json', ...(ctx.cfg.apiKey ? { Authorization: 'Bearer ' + ctx.cfg.apiKey } : {}) }
      const pr = await deps.httpJson(pollUrl, 'GET', pollHeaders, null, 60000)
      if (!pr.ok || !pr.body) throw new Error('HTTP ' + pr.status + ': ' + String(pr.message || '').slice(0, 200))
      const parsed = adapter.parseStatus(pr.body)
      if (!parsed || typeof parsed !== 'object') throw new Error('parseStatus 必须返回对象')
      const rawStatus = String(parsed.status || '').toLowerCase()
      if (rawStatus === 'completed' || rawStatus === 'done' || rawStatus === 'success' || rawStatus === 'succeeded') {
        st = { status: 'done', url: parsed.videoUrl || parsed.url || '' }
      } else if (rawStatus === 'failed' || rawStatus === 'error' || rawStatus === 'cancelled') {
        st = { status: 'failed', message: parsed.message || rawStatus }
      } else {
        st = { status: rawStatus || 'running', message: parsed.message || '' }
      }
    } catch (e) {
      st = { status: 'error', message: String(e && e.message || e) }
    }
    if (st.status === 'error') {
      consecErr++
      lastPollErr = st.message
      if (consecErr >= 5) throw new Error('custom-adapter: 任务轮询连续失败（' + consecErr + ' 次）: ' + lastPollErr)
      continue
    }
    consecErr = 0
    if (st.status === 'done') {
      const url = st.url || ''
      if (!url) throw new Error('custom-adapter: 任务完成但无法解析视频 URL（parseStatus 需返回 videoUrl）')
      const buf = await deps.fetchImageBuffer(url, timeoutMs)
      if (!buf || buf.length === 0) throw new Error('custom-adapter: 视频下载为空')
      const agentCwd = deps.sessionCwd(deps.exec)
      const rawOut = args.output_dir && String(args.output_dir).trim() ? String(args.output_dir).trim() : ''
      let vDir
      if (rawOut) vDir = /^[A-Za-z]:[\\/]/.test(rawOut) || rawOut.startsWith('\\\\') || rawOut.startsWith('/') ? rawOut : (agentCwd ? deps.join(agentCwd, rawOut) : rawOut)
      else if (agentCwd) vDir = deps.join(agentCwd, '.omni-workstation', 'videos')
      else throw new Error('custom-adapter: 无法确定输出目录（未提供 output_dir 且当前会话无工作区路径）。请显式传入 output_dir。')
      deps.mkdirSync(vDir, { recursive: true })
      const fileName = 'video_' + Date.now().toString(36) + '.mp4'
      const full = deps.join(vDir, fileName)
      deps.writeFileSync(full, buf)
      return { ok: true, path: full, url, model: cfg.model || '', protocol: CUSTOM_ADAPTER_PROTOCOL, seconds, attempts: attempts0 }
    }
    if (st.status === 'failed') throw new Error('custom-adapter: 视频任务失败：' + (st.message || '未知原因'))
    lastStatus = st.status
  }
  throw new Error('custom-adapter: 视频任务轮询超时（' + Math.round(maxPolls * pollIntervalMs / 1000) + ' 秒未完成，最后状态: ' + lastStatus + '）')
}

/** Scaffold adapter template injected into the builder guide. */
export const ADAPTER_SCAFFOLD = `{
  // 平台标识（可选，便于调试）
  name: 'my-platform',

  // 必需：构造提交请求
  // ctx = { cfg:{endpoint,apiKey,model}, prompt, imageUrl, seconds, aspectRatio, resolution }
  // 返回 { url, method?, headers?, body? }；抛错则提交失败并显示错误信息
  buildSubmit(ctx) {
    return {
      url: ctx.cfg.endpoint + '/YOUR_SUBMIT_PATH',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + ctx.cfg.apiKey
      },
      body: {
        model: ctx.cfg.model,
        prompt: ctx.prompt
        // 按文档补充时长/画幅等字段；有图时用 ctx.imageUrl
      }
    }
  },

  // 必需：从提交响应 JSON 提取任务 ID（字符串）
  parseTaskId(res) {
    return res.task_id || res.data?.task_id || res.id || ''
  },

  // 必需：构造轮询 URL
  // ctx = { cfg:{endpoint,apiKey,model}, taskId }
  pollUrl(ctx) {
    return ctx.cfg.endpoint + '/YOUR_POLL_PATH/' + encodeURIComponent(ctx.taskId)
  },

  // 可选：轮询请求额外 header（默认已带 Authorization: Bearer <apiKey>）
  pollHeaders(ctx) {
    return {}
  },

  // 必需：解析轮询响应
  // 返回 { status: 'running'|'completed'|'failed', videoUrl?, message? }
  // completed 时必须给出 videoUrl（可直接下载的 mp4 地址）
  parseStatus(res) {
    const s = res.status || res.data?.status || ''
    if (s === 'success' || s === 'completed' || s === 'succeeded') {
      return { status: 'completed', videoUrl: res.video_url || res.data?.video_url || res.output?.url || '' }
    }
    if (s === 'failed' || s === 'error') {
      return { status: 'failed', message: res.message || res.error || '' }
    }
    return { status: 'running' }
  }
}`

/**
 * Build the full guide text injected when the slash command fires.
 * userPrompt: raw input after the command (may be empty).
 * cfg: normalized runtime config (for listing existing suppliers / card count).
 * limit: effective card limit.
 */
export function buildVideoBuilderGuide(userPrompt, cfg, limit) {
  const cards = Array.isArray(cfg.videoCards) ? cfg.videoCards : []
  const remaining = Math.max(0, limit - cards.length)
  const existing = cards.map((c) => '- ' + (c.toolName || '?') + ' · ' + (c.name || '') + (c.source === 'ai' ? ' [AI]' : '')).join('\n') || '（暂无）'
  const promptBlock = userPrompt && userPrompt.trim()
    ? '## 用户输入（务必优先满足）\n' + userPrompt.trim()
    : '## 用户输入为空\n用户只发送了 `/build-video-tool`，没有附带平台/密钥/模型等信息。**你必须先向用户询问**下列必要信息，不要擅自编造：\n1. 平台官方文档链接，或文档中的提交/轮询 API 说明（路径、请求体、响应字段）\n2. API Base URL（若平台每个用户独立域名，必须用户提供；若公共端点可从文档读取）\n3. API Key（若平台需要；不需要则说明）\n4. 模型 ID（若平台需要；文生视频/图生视频请说明）\n5. 期望工具用途：文生视频 t2v / 图生视频 i2v / 两者\n\n收到信息后再按本指南继续构建。'

  return `# 自定义视频工具构建指南（skill）

你是 dsh-omni-workstation 插件的自定义视频工具构建助手。任务：根据用户提供的平台信息，创建一张 **AI 自定义视频模型卡片**（前端可见 + 可调用工具），用于覆盖内置供应商/协议未覆盖的新 AI 视频平台。

## 硬性约束（程序已强制，违反会被拒绝）

1. **卡片上限**：当前 ${cards.length}/${limit}，还可新建 **${remaining}** 张。达到上限后 \`/omni/config\` 会直接报错，无法注入新工具。
2. **只统计「视频模型卡片」**：VLM/生图/语音卡片不占名额。
3. **必须同时完成前端卡片 + 工具注册**：二者绑定，不可拆开只做一半。
4. **禁止擅自调用生成视频工具做实测**：构建完成后自检代码即可；是否进行真实生成测试，**在回复末尾询问用户**（会消耗额度）。

## 现有视频卡片

${existing}

## 构建流程（按顺序执行）

### 1. 收集信息
- 若用户输入为空：先询问（见上）。
- 若用户给了文档 URL：用 web 工具读取文档，弄清：
  - 提交端点（method + path + body 字段）
  - 鉴权方式（Header 名与格式）
  - 任务 ID 字段路径
  - 轮询端点与状态字段、视频 URL 字段
- 若用户直接给了 URL/Key/Model：写入卡片配置，协议逻辑按文档或合理推断。

### 2. 选择协议策略
优先级：
1. **能用内置协议就不要写 adapter**：若平台是 DashScope/OpenAI-videos/Kling/Volc/MiniMax 兼容，直接用内置供应商创建普通卡片（不走 custom-adapter），更稳。
2. **否则使用 \`custom-adapter\` 协议**：编写 adapterCode（见脚手架）。

### 3. 注册卡片（唯一入口：POST /omni/config）

请求体 JSON：

\`\`\`json
{
  "videoCardAddAi": {
    "name": "显示名称（≤60字）",
    "type": "t2v",
    "toolName": "generate_video_xxx",
    "description": "工具描述：说明用途、是否文生/图生、特殊限制",
    "config": {
      "provider": "custom",
      "protocol": "custom-adapter",
      "endpoint": "https://...",
      "apiKey": "sk-...",
      "model": "model-id-or-empty",
      "timeoutMs": 600000,
      "pollIntervalMs": 5000,
      "retryCount": 1,
      "seconds": 5,
      "aspectRatio": "16:9",
      "resolution": "720p",
      "adapterCode": "<adapter JS 对象表达式，见脚手架>"
    }
  }
}
\`\`\`

字段说明：
| 字段 | 必填 | 说明 |
|---|---|---|
| name | 是 | 前端卡片显示名 |
| type | 是 | \`t2v\` / \`i2v\` / \`edit\` / \`ref\` / \`general\` |
| toolName | 是 | 全局唯一，建议 \`generate_video_<platform>\`，只允许 \`[a-zA-Z0-9_]\` |
| description | 建议 | 会注入到工具 schema，写清能力边界 |
| config.endpoint | 是 | 平台 Base URL（去掉末尾多余 \`/\`） |
| config.apiKey | 视平台 | 需要鉴权则必填；不需要可空字符串 |
| config.model | 视平台 | 绝大多数平台需要；确实无模型概念才可空 |
| config.adapterCode | custom-adapter 必填 | 见脚手架；内置协议卡片不要传 |
| config.protocol | 是 | 内置：openai-videos / dashscope-video / kling-video / volc-video / minimax-video / async-task；自定义：custom-adapter |

**校验失败会返回 400**，按 error 信息修正后重试。成功后卡片立即出现在设置 → 模型 → 视频面板，并带有 **AI** 标签。

### 4. 内置协议卡片（可选路径）
若走内置协议，把 \`protocol\` 设为对应值，**不要**传 adapterCode，其余字段相同（仍用 \`videoCardAddAi\` 以标记 AI 来源）。

### 5. custom-adapter 脚手架（完整模板）

adapterCode 是**一个 JS 对象表达式**（不是 import 模块），运行在插件宿主内：

\`\`\`javascript
${ADAPTER_SCAFFOLD}
\`\`\`

契约：
- \`buildSubmit(ctx)\` → \`{url, method?, headers?, body?}\`；ctx.cfg 已含 endpoint/apiKey/model
- \`parseTaskId(res)\` → 任务 ID 字符串（提交响应的已解析 JSON）
- \`pollUrl(ctx)\` → 轮询完整 URL
- \`parseStatus(res)\` → \`{status:'running'|'completed'|'failed', videoUrl?, message?}\`
- completed 时 **必须** 返回可直接 GET 下载的 videoUrl
- 可选 \`pollHeaders(ctx)\` 追加轮询 Header

错误接口：任意方法抛 \`Error('说明')\`，用户会在工具结果里看到该说明。

### 6. 自检清单（构建完成后必须逐项核对）

- [ ] \`toolName\` 与现有卡片不冲突
- [ ] endpoint 末尾无多余斜杠；路径以 \`/\` 开头
- [ ] 鉴权 Header 与文档一致（Bearer / X-Api-Key / 其他）
- [ ] parseTaskId 能从真实响应结构取到 ID
- [ ] parseStatus 的 completed 分支能取到 videoUrl
- [ ] 文生视频：body 含 prompt；图生视频：body 含图片字段（若支持）
- [ ] 已通过 POST /omni/config 注册成功（HTTP 200 + ok:true）
- [ ] 未调用生成视频工具做实测

### 7. 收尾回复模板

构建完成后，用简短中文回复：
1. 工具名称、卡片名称、协议类型
2. 配置了哪些字段（不要回显完整 Key）
3. 自检结果
4. **询问用户**：是否需要进行一次真实视频生成测试？（将消耗该平台额度）

## 详细度

- 默认：**中等强度**——覆盖正常文生视频（或用户指定类型）主路径 + 超时/轮询/重试合理默认，不堆砌冷门参数。
- 用户要求「详细 / 完整 / 多场景」时：增加分辨率、时长、负向提示词、图生视频等配置与 body 映射。
- 用户要求「精简」时：只保留 URL/KEY/model + 主路径。

## 常见错误

- 直接把 adapter 写成 \`import/export\` 模块 → 会语法错误，必须是对象表达式
- parseStatus 返回 \`status:'done'\` 而不是 \`completed\` → 已兼容 done/success/succeeded，但推荐 completed
- 达到上限仍继续 POST → 物理拒绝，先删卡
- 只写说明不调 /omni/config → 卡片不会出现
- 构建后立刻 generate_video 实测 → 违反指南，改为询问用户

${promptBlock}
`
}
