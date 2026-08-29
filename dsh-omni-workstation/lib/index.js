// dsh-omni-workstation — application-level Vision-Language-Model analyzer.
// Host half: registers the `analyze_image` tool on the global tools registry
// (shared by every session of this deployment) and serves the settings web
// routes used by the client-half settings page. Config is stored at
// $DSH_HOME/omni-vision.json (beside the settings document when available).
//
// v1.3: multi-card API list (`apis`), multi-protocol requests
// (openai-completions / openai-responses / anthropic-messages / google-gemini),
// Ollama provider support, single-request failover (each call restarts from the
// top card), and dynamic tool registration (analyze_image hidden when no valid
// card is configured).
import { defineTool } from '@deepseek-ai/dsh-tools'
import z from '@deepseek-ai/schemastery'
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { createHmac } from 'node:crypto'
import jpegJs from './vendor/jpeg-js/index.cjs'
import { encodePng } from './vendor/png.js'
import { buildVisionToolDefs } from './vision-tools.js'

const name = 'dsh-omni-workstation'
const inject = ['tools', 'webServer', 'llm']

const Config = z.object({})

const MAX_IMAGE_BYTES = 20 * 1024 * 1024
const pkgVersion = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version

// ---------- config model: list of API cards ----------
const PROTOCOLS = ['openai-completions', 'openai-responses', 'anthropic-messages', 'google-gemini']

// v1.5 provider presets. fixedUrl: true = built-in fixed provider (URL and
// protocol are baked in and NOT user-editable via the UI; uses the apiKey
// stored in the config file). false = user-configurable URL. Entries with
// keyRequired must carry an apiKey in the config file to be valid.
// Excluded from the built-in list on purpose: github-copilot (OAuth-only),
// amazon-bedrock / azure-openai-responses / google-vertex (credential model is
// not key+URL), cloudflare-* / opencode* (no provider-level base URL), mistral
// (proprietary conversations protocol), deepseek (no multimodal models).
const PROVIDERS = {
  custom:            { protocol: 'openai-completions', endpoint: '', keyRequired: true, fixedUrl: false },
  ollama:            { protocol: 'openai-completions', endpoint: '', keyRequired: false, fixedUrl: false },
  comfyui:           { protocol: 'comfyui-image', endpoint: '', keyRequired: false, fixedUrl: false },
  // ---- built-in fixed providers (pi-ai catalog; multi-protocol entries use their primary protocol) ----
  agnes:             { protocol: 'anthropic-messages', endpoint: 'https://apihub.agnes-ai.com', keyRequired: true, fixedUrl: true },
  'agnes-cn':          { protocol: 'anthropic-messages', endpoint: 'https://api.agnes-ai.cn', keyRequired: true, fixedUrl: true },
  anthropic:         { protocol: 'anthropic-messages', endpoint: 'https://api.anthropic.com', keyRequired: true, fixedUrl: true },
  'ant-ling':          { protocol: 'openai-completions', endpoint: 'https://api.ant-ling.com/v1', keyRequired: true, fixedUrl: true },
  cerebras:          { protocol: 'openai-completions', endpoint: 'https://api.cerebras.ai/v1', keyRequired: true, fixedUrl: true },
  fireworks:         { protocol: 'openai-completions', endpoint: 'https://api.fireworks.ai/inference', keyRequired: true, fixedUrl: true },
  google:            { protocol: 'google-gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta', keyRequired: true, fixedUrl: true },
  groq:              { protocol: 'openai-completions', endpoint: 'https://api.groq.com/openai/v1', keyRequired: true, fixedUrl: true },
  huggingface:       { protocol: 'openai-completions', endpoint: 'https://router.huggingface.co/v1', keyRequired: true, fixedUrl: true },
  'kimi-coding':       { protocol: 'anthropic-messages', endpoint: 'https://api.kimi.com/coding', keyRequired: true, fixedUrl: true },
  minimax:           { protocol: 'anthropic-messages', endpoint: 'https://api.minimax.io/anthropic', keyRequired: true, fixedUrl: true },
  'minimax-cn':        { protocol: 'anthropic-messages', endpoint: 'https://api.minimaxi.com/anthropic', keyRequired: true, fixedUrl: true },
  moonshotai:        { protocol: 'openai-completions', endpoint: 'https://api.moonshot.ai/v1', keyRequired: true, fixedUrl: true },
  'moonshotai-cn':     { protocol: 'openai-completions', endpoint: 'https://api.moonshot.cn/v1', keyRequired: true, fixedUrl: true },
  nvidia:            { protocol: 'openai-completions', endpoint: 'https://integrate.api.nvidia.com/v1', keyRequired: true, fixedUrl: true },
  openai:            { protocol: 'openai-responses', endpoint: 'https://api.openai.com/v1', keyRequired: true, fixedUrl: true },
  openrouter:        { protocol: 'openai-completions', endpoint: 'https://openrouter.ai/api/v1', keyRequired: true, fixedUrl: true },
  // 通义千问（Qwen）平台即百炼（DashScope），API Key = DASHSCOPE_API_KEY。
  // 走 DashScope OpenAI 兼容通道（compatible-mode/v1），非 token-plan.*.maas 网关。
  'qwen-token-plan':   { protocol: 'openai-completions', endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1', keyRequired: true, fixedUrl: true },
  'qwen-token-plan-cn':{ protocol: 'openai-completions', endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1', keyRequired: true, fixedUrl: true },
  together:          { protocol: 'openai-completions', endpoint: 'https://api.together.ai/v1', keyRequired: true, fixedUrl: true },
  'vercel-ai-gateway': { protocol: 'anthropic-messages', endpoint: 'https://ai-gateway.vercel.sh', keyRequired: true, fixedUrl: true },
  xai:               { protocol: 'openai-completions', endpoint: 'https://api.x.ai/v1', keyRequired: true, fixedUrl: true },
  xiaomi:            { protocol: 'openai-completions', endpoint: 'https://api.xiaomimimo.com/v1', keyRequired: true, fixedUrl: true },
  'xiaomi-token-plan-ams': { protocol: 'openai-completions', endpoint: 'https://token-plan-ams.xiaomimimo.com/v1', keyRequired: true, fixedUrl: true },
  'xiaomi-token-plan-cn':  { protocol: 'openai-completions', endpoint: 'https://token-plan-cn.xiaomimimo.com/v1', keyRequired: true, fixedUrl: true },
  'xiaomi-token-plan-sgp': { protocol: 'openai-completions', endpoint: 'https://token-plan-sgp.xiaomimimo.com/v1', keyRequired: true, fixedUrl: true },
  zai:               { protocol: 'openai-completions', endpoint: 'https://api.z.ai/api/coding/paas/v4', keyRequired: true, fixedUrl: true },
  bailian:           { protocol: 'dashscope-image', endpoint: '', keyRequired: true, fixedUrl: false },
  'zai-coding-cn':     { protocol: 'openai-completions', endpoint: 'https://open.bigmodel.cn/api/coding/paas/v4', keyRequired: true, fixedUrl: true }
}
const PROVIDER_IDS = Object.keys(PROVIDERS)

const FALLBACK_PROVIDERS = {
  ovhcloud: { endpoint: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1', protocol: 'openai-completions', keyRequired: false }
}
const OVHCLOUD_DEFAULT_MODELS = ['Qwen3.5-397B-A17B', 'Qwen2.5-VL-72B-Instruct', 'Qwen3.6-27B', 'Mistral-Small-3.2-24B-Instruct-2506', 'Qwen3.5-9B']
const defaultFallbackConfig = () => ({
  provider: 'ovhcloud',
  models: [...OVHCLOUD_DEFAULT_MODELS],
  timeoutMs: 120000
})

const defaultGlobalConfig = () => ({
  backoffBase: 800,
  backoffMax: 5000,
  backoff429Base: 2000,
  backoff429Max: 10000,
  retryStatusCodes: '402,408,429,500,502,503,504,NET',
  verifyReminder: true
})

const clampTimeout = (v, def = 120000) => {
  const n = Number(v)
  return Number.isFinite(n) && n >= 1000 && n <= 3600000 ? Math.floor(n) : def
}

// ---------- imggen (image generation) config model ----------
const IMGGEN_PROTOCOLS = ['openai-images', 'openai-completions', 'dashscope-image', 'comfyui-image']
const VISION_TOOL_NAMES = ['zoom_image', 'sample_colors', 'image_diff', 'ocr_image', 'detect_elements', 'show_image']

const defaultImggenConfig = () => ({
  provider: 'custom',
  protocol: 'openai-images',
  endpoint: '',
  apiPath: '',
  apiKey: '',
  model: '',
  vae: '', // v2.8: VAELoader file (empty = not injected, use workflow/integrated VAE)
  clip: '', // v2.8: CLIPLoader file (empty = not injected)
  timeoutMs: 300000,
  retryCount: 2,
  responseFormat: 'auto', // 'auto' | 'b64_json' | 'url'
  filterImageModels: true,
  comfyWorkflows: [], // v2.7: multi-workflow list [{id,name,workflow,mapping,steps,cfg,scheduler,seed}]
  activeComfyWorkflow: '' // v2.7: id of active workflow, '' = none
})

const COMFY_MAPPING_KEYS = ['sampler', 'checkpoint', 'unet', 'vae', 'clip', 'latent', 'positive', 'negative']

function normalizeImggenConfig(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaultImggenConfig()
  const provider = PROVIDER_IDS.includes(raw.provider) ? raw.provider : 'custom'
  // bailian（阿里云百炼）始终走 DashScope 原生协议；comfyui 固定走 ComfyUI 协议（UI 隐藏 protocol 字段）
  const protocol = provider === 'bailian' ? 'dashscope-image' : provider === 'comfyui' ? 'comfyui-image' : (IMGGEN_PROTOCOLS.includes(raw.protocol) ? raw.protocol : 'openai-images')
  const retryRaw = Math.floor(Number(raw.retryCount))
  return {
    provider,
    protocol,
    endpoint: typeof raw.endpoint === 'string' ? raw.endpoint : '',
    apiPath: typeof raw.apiPath === 'string' ? raw.apiPath : '',
    apiKey: typeof raw.apiKey === 'string' ? raw.apiKey : '',
    model: typeof raw.model === 'string' ? raw.model : '',
    vae: typeof raw.vae === 'string' ? raw.vae : '',
    clip: typeof raw.clip === 'string' ? raw.clip : '',
    timeoutMs: clampTimeout(raw.timeoutMs, 300000),
    retryCount: Number.isFinite(retryRaw) && retryRaw > 0 ? Math.min(retryRaw, 10) : 2,
    responseFormat: ['auto', 'b64_json', 'url'].includes(raw.responseFormat) ? raw.responseFormat : 'auto',
    filterImageModels: raw.filterImageModels !== false,
    comfyWorkflows: Array.isArray(raw.comfyWorkflows) ? raw.comfyWorkflows : [],
    activeComfyWorkflow: typeof raw.activeComfyWorkflow === 'string' ? raw.activeComfyWorkflow : ''
  }
}

const maskedImggen = (c) => ({
  provider: c.provider,
  protocol: c.protocol,
  endpoint: c.endpoint,
  apiPath: c.apiPath,
  model: c.model,
  vae: c.vae,
  clip: c.clip,
  timeoutMs: c.timeoutMs,
  retryCount: c.retryCount,
  responseFormat: c.responseFormat,
  filterImageModels: c.filterImageModels,
  comfyWorkflows: c.comfyWorkflows || [],
  activeComfyWorkflow: c.activeComfyWorkflow || '',
  apiKeySet: c.apiKey !== ''
})

function isImggenConfigValid(c) {
  if (!c) return false
  const meta = PROVIDERS[c.provider]
  // 固定供应商的 endpoint 始终是内置的（非空），不看存储值
  const endpoint = (meta && meta.fixedUrl) ? meta.endpoint : c.endpoint
  if (typeof endpoint !== 'string' || endpoint.trim() === '') return false
  if (typeof c.model !== 'string' || c.model.trim() === '') return false
  if (meta && !meta.keyRequired) return true // 仅 Ollama 等免 Key 供应商
  return typeof c.apiKey === 'string' && c.apiKey !== ''
}

// ---------- video (video generation) config model (v2.8) ----------
// Video generation is ALWAYS an async task protocol (submit -> poll task ->
// fetch result URL), unlike image generation. The tool is registered ONLY
// when videoEnabled === true AND the config is valid — turning the switch off
// (or an invalid config) means the tool schema is never injected into the
// model prompt (0 token cost), exactly like generate_image.
const VIDEO_PROVIDERS = {
  custom:    { protocol: 'openai-videos', endpoint: '', keyRequired: true, fixedUrl: false, fixedProtocol: false },
  agnes:     { protocol: 'openai-videos', endpoint: 'https://apihub.agnes-ai.com/v1', keyRequired: true, fixedUrl: true, fixedProtocol: true },
  'agnes-cn':{ protocol: 'openai-videos', endpoint: 'https://api.agnes-ai.cn/v1', keyRequired: true, fixedUrl: true, fixedProtocol: true },
  // 阿里云百炼：endpoint 可编辑（支持 workspace 专属域名），协议固定 DashScope 原生
  dashscope: { protocol: 'dashscope-video', endpoint: 'https://dashscope.aliyuncs.com', keyRequired: true, fixedUrl: false, fixedProtocol: true },
  // 可灵：apiKey 格式 AccessKey|SecretKey（JWT HS256 鉴权）
  kling:     { protocol: 'kling-video', endpoint: 'https://api.klingai.com', keyRequired: true, fixedUrl: true, fixedProtocol: true },
  volc:      { protocol: 'volc-video', endpoint: 'https://ark.cn-beijing.volces.com', keyRequired: true, fixedUrl: true, fixedProtocol: true },
  minimax:   { protocol: 'minimax-video', endpoint: 'https://api.minimaxi.com', keyRequired: true, fixedUrl: true, fixedProtocol: true },
  // 通义千问（Qwen）Token Plan：走百炼（DashScope）通道，同 dashscope 供应商规则。
  // 协议固定 dashscope-video（原生异步任务），endpoint 可编辑（支持 workspace 专属域名）。
  'qwen-token-plan':   { protocol: 'dashscope-video', endpoint: 'https://dashscope.aliyuncs.com', keyRequired: true, fixedUrl: false, fixedProtocol: true },
  'qwen-token-plan-cn':{ protocol: 'dashscope-video', endpoint: 'https://dashscope.aliyuncs.com', keyRequired: true, fixedUrl: false, fixedProtocol: true }
}
const VIDEO_PROVIDER_IDS = Object.keys(VIDEO_PROVIDERS)
const VIDEO_PROTOCOLS = ['openai-videos', 'dashscope-video', 'kling-video', 'volc-video', 'minimax-video', 'async-task']
const VIDEO_ASPECT_RATIOS = {
  '16:9': { width: 1280, height: 720 },
  '9:16': { width: 720, height: 1280 },
  '1:1': { width: 768, height: 768 },
  '4:3': { width: 1024, height: 768 },
  '3:4': { width: 768, height: 1024 }
}

const defaultVideoConfig = () => ({
  provider: 'custom',
  protocol: 'openai-videos',
  endpoint: '',
  apiKey: '',
  model: '',
  timeoutMs: 600000,
  pollIntervalMs: 5000,
  retryCount: 1,
  filterVideoModels: true,
  seconds: 5,
  aspectRatio: '16:9',
  resolution: '720p',
  // async-task 专属字段（openai-videos 的 base 已含 /v1，故路径用 /videos）
  submitPath: '/videos',
  pollPath: '/videos',
  taskIdField: '',
  statusField: 'status',
  resultField: 'metadata.url',
  doneStatus: 'completed'
})

function normalizeVideoConfig(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaultVideoConfig()
  const provider = VIDEO_PROVIDER_IDS.includes(raw.provider) ? raw.provider : 'custom'
  const meta = VIDEO_PROVIDERS[provider]
  // 内置供应商协议锁定；custom 允许用户选择任何协议
  const protocol = meta && meta.fixedProtocol
    ? meta.protocol
    : (VIDEO_PROTOCOLS.includes(raw.protocol) ? raw.protocol : 'openai-videos')
  const piRaw = Math.floor(Number(raw.pollIntervalMs))
  const secRaw = Math.floor(Number(raw.seconds))
  return {
    provider,
    protocol,
    endpoint: typeof raw.endpoint === 'string' ? raw.endpoint : '',
    apiKey: typeof raw.apiKey === 'string' ? raw.apiKey : '',
    model: typeof raw.model === 'string' ? raw.model : '',
    timeoutMs: clampTimeout(raw.timeoutMs, 600000),
    pollIntervalMs: Number.isFinite(piRaw) && piRaw >= 1000 ? Math.min(piRaw, 60000) : 5000,
    retryCount: Number.isFinite(Number(raw.retryCount)) && Number(raw.retryCount) > 0 ? Math.min(Math.floor(Number(raw.retryCount)), 5) : 1,
    filterVideoModels: raw.filterVideoModels !== false,
    seconds: Number.isFinite(secRaw) && secRaw > 0 ? Math.min(secRaw, 30) : 5,
    aspectRatio: VIDEO_ASPECT_RATIOS[raw.aspectRatio] ? raw.aspectRatio : '16:9',
    resolution: /^(720p|1080p|768p)$/i.test(String(raw.resolution)) ? String(raw.resolution).toLowerCase() : '720p',
    submitPath: typeof raw.submitPath === 'string' ? raw.submitPath : '/videos',
    pollPath: typeof raw.pollPath === 'string' ? raw.pollPath : '/videos',
    taskIdField: typeof raw.taskIdField === 'string' ? raw.taskIdField : '',
    statusField: typeof raw.statusField === 'string' && raw.statusField.trim() ? raw.statusField : 'status',
    resultField: typeof raw.resultField === 'string' && raw.resultField.trim() ? raw.resultField : 'metadata.url',
    doneStatus: typeof raw.doneStatus === 'string' && raw.doneStatus.trim() ? raw.doneStatus : 'completed'
  }
}

const maskedVideo = (c) => ({
  provider: c.provider,
  protocol: c.protocol,
  endpoint: c.endpoint,
  model: c.model,
  timeoutMs: c.timeoutMs,
  pollIntervalMs: c.pollIntervalMs,
  retryCount: c.retryCount,
  filterVideoModels: c.filterVideoModels,
  seconds: c.seconds,
  aspectRatio: c.aspectRatio,
  resolution: c.resolution,
  submitPath: c.submitPath,
  pollPath: c.pollPath,
  taskIdField: c.taskIdField,
  statusField: c.statusField,
  resultField: c.resultField,
  doneStatus: c.doneStatus,
  apiKeySet: c.apiKey !== ''
})

function isVideoConfigValid(c) {
  if (!c) return false
  const meta = VIDEO_PROVIDERS[c.provider]
  const endpoint = (meta && meta.fixedUrl) ? meta.endpoint : c.endpoint
  if (typeof endpoint !== 'string' || endpoint.trim() === '') return false
  if (typeof c.model !== 'string' || c.model.trim() === '') return false
  if (typeof c.apiKey !== 'string' || c.apiKey === '') return false
  // 可灵用 AccessKey|SecretKey 双段 JWT 鉴权
  if (c.provider === 'kling' && !String(c.apiKey).includes('|')) return false
  return true
}

// ---------- voice (TTS) config model (v2.9) ----------
// Voice synthesis mirrors the video module's pattern: provider preset table,
// normalize/validate/mask helpers, registered only when voiceEnabled === true
// and config is valid — turning the switch off means zero token cost.
const VOICE_PROVIDERS = {
  mimo:      { protocol: 'mimo-tts', endpoint: 'https://api.xiaomimimo.com/v1', keyRequired: true, fixedUrl: true, fixedProtocol: true },
  minimax:   { protocol: 'minimax-tts', endpoint: 'https://api.minimaxi.com', keyRequired: true, fixedUrl: true, fixedProtocol: true },
  doubao:    { protocol: 'doubao-tts', endpoint: 'https://openspeech.bytedance.com', keyRequired: true, fixedUrl: true, fixedProtocol: true },
  indextts:  { protocol: 'indextts-tts', endpoint: 'http://127.0.0.1:7880', keyRequired: false, fixedUrl: true, fixedProtocol: true },
  gptsovits: { protocol: 'gptsovits-tts', endpoint: 'http://127.0.0.1:9880', keyRequired: false, fixedUrl: true, fixedProtocol: true },
  voxcpm:    { protocol: 'voxcpm-tts', endpoint: 'http://127.0.0.1:8000', keyRequired: false, fixedUrl: true, fixedProtocol: true },
  'tts-webui':{ protocol: 'openai-speech', endpoint: '', keyRequired: false, fixedUrl: false, fixedProtocol: false }
}
const VOICE_PROVIDER_IDS = Object.keys(VOICE_PROVIDERS)
const VOICE_PROTOCOLS = ['mimo-tts', 'minimax-tts', 'doubao-tts', 'indextts-tts', 'gptsovits-tts', 'voxcpm-tts', 'openai-speech']
const MIMO_PRESET_VOICES = ['mimo_default', '冰糖', '茉莉', '苏打', '白桦', 'Mia', 'Chloe', 'Milo', 'Dean']
const MINIMAX_PRESET_VOICES_FALLBACK = [
  'English_Graceful_Lady', 'English_Insightful_Speaker', 'English_radiant_girl',
  'English_Persuasive_Man', 'English_Lucky_Robot', 'Wise_Woman',
  'cute_boy', 'lovely_girl', 'Friendly_Person', 'Inspirational_girl',
  'Deep_Voice_Man', 'sweet_girl'
]

const defaultVoiceConfig = () => ({
  provider: 'mimo',
  protocol: 'mimo-tts',
  endpoint: 'https://api.xiaomimimo.com/v1',
  apiKey: '',
  model: '',
  voiceId: 'mimo_default',
  timeoutMs: 120000,
  styleInstruction: '',
  singMode: false,
  optimizeText: false,
  voiceSamplePath: '',
  outputFormat: 'wav',
  streamOutput: false,
  filterVoiceModels: true,
  retryCount: 1,
  appId: '',
  accessKey: '',
  emoStrategy: '',
  emoWeight: '',
  mode: 'clone',
  region: 'cn'
})

function normalizeVoiceConfig(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaultVoiceConfig()
  const provider = VOICE_PROVIDER_IDS.includes(raw.provider) ? raw.provider : 'mimo'
  const meta = VOICE_PROVIDERS[provider]
  const protocol = meta && meta.fixedProtocol
    ? meta.protocol
    : (VOICE_PROTOCOLS.includes(raw.protocol) ? raw.protocol : 'mimo-tts')
  return {
    provider,
    protocol,
    endpoint: typeof raw.endpoint === 'string' ? raw.endpoint : '',
    apiKey: typeof raw.apiKey === 'string' ? raw.apiKey : '',
    model: typeof raw.model === 'string' ? raw.model : '',
    voiceId: typeof raw.voiceId === 'string' ? raw.voiceId : 'mimo_default',
    timeoutMs: clampTimeout(raw.timeoutMs, 120000),
    styleInstruction: typeof raw.styleInstruction === 'string' ? raw.styleInstruction : '',
    singMode: raw.singMode === true,
    optimizeText: raw.optimizeText === true,
    voiceSamplePath: typeof raw.voiceSamplePath === 'string' ? raw.voiceSamplePath : '',
    outputFormat: typeof raw.outputFormat === 'string' ? raw.outputFormat : 'wav',
    streamOutput: raw.streamOutput === true,
    filterVoiceModels: raw.filterVoiceModels === false ? false : true,
    retryCount: Number.isFinite(Number(raw.retryCount)) && Number(raw.retryCount) >= 1 ? Math.floor(Number(raw.retryCount)) : 1,
    appId: typeof raw.appId === 'string' ? raw.appId : '',
    accessKey: typeof raw.accessKey === 'string' ? raw.accessKey : '',
    emoStrategy: typeof raw.emoStrategy === 'string' ? raw.emoStrategy : '',
    emoWeight: typeof raw.emoWeight === 'string' ? raw.emoWeight : '',
    mode: typeof raw.mode === 'string' ? raw.mode : 'clone',
    region: typeof raw.region === 'string' ? raw.region : 'cn'
  }
}

const maskedVoice = (c) => ({
  provider: c.provider,
  protocol: c.protocol,
  endpoint: c.endpoint,
  model: c.model,
  voiceId: c.voiceId,
  timeoutMs: c.timeoutMs,
  styleInstruction: c.styleInstruction,
  singMode: c.singMode,
  optimizeText: c.optimizeText,
  voiceSamplePath: c.voiceSamplePath,
  outputFormat: c.outputFormat,
  streamOutput: c.streamOutput === true,
  filterVoiceModels: c.filterVoiceModels === false ? false : true,
  retryCount: c.retryCount,
  appId: c.appId,
  accessKey: c.accessKey,
  emoStrategy: c.emoStrategy,
  emoWeight: c.emoWeight,
  mode: c.mode,
  region: c.region,
  apiKeySet: c.apiKey !== ''
})

function isVoiceConfigValid(c) {
  if (!c) return false
  const meta = VOICE_PROVIDERS[c.provider]
  const endpoint = (meta && meta.fixedUrl) ? meta.endpoint : c.endpoint
  if (typeof endpoint !== 'string' || endpoint.trim() === '') return false
  if (typeof c.model !== 'string' || c.model.trim() === '') return false
  if (meta && meta.keyRequired !== false) {
    // v2.9.8: doubao needs appId+accessKey OR apiKey
    if (c.provider === 'doubao') {
      const hasLegacy = c.appId && c.accessKey
      const hasNew = c.apiKey && c.apiKey.length > 0
      if (!hasLegacy && !hasNew) return false
    } else {
      if (typeof c.apiKey !== 'string' || c.apiKey === '') return false
    }
  }
  return true
}

// ---------- video engine: pure helpers (exported for unit tests) ----------
// Resolve dotted paths like "metadata.url" from a poll response body.
function pathGet(obj, path) {
  if (!obj || typeof obj !== 'object' || !path) return undefined
  let cur = obj
  for (const seg of String(path).split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = cur[seg]
  }
  return cur
}

// Agnes Video: seconds -> num_frames (8n+1, 24fps, capped at 441)
function agnesNumFrames(seconds) {
  const fps = 24
  const target = Math.max(1, Math.floor(Number(seconds) || 5)) * fps
  const frames = Math.min(441, Math.max(9, Math.ceil((target - 1) / 8) * 8 + 1))
  return frames
}

// Kling: HS256 JWT (AccessKey | SecretKey), no external dependency.
function klingJwt(ak, sk) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload = { iss: ak, exp: now + 1800, nbf: now - 5 }
  const b64url = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const data = b64url(header) + '.' + b64url(payload)
  const sig = createHmac('sha256', String(sk)).update(data).digest('base64url')
  return data + '.' + sig
}

// Effective video base URL: fixed providers use their baked-in endpoint.
function videoBase(cfg) {
  const meta = VIDEO_PROVIDERS[cfg.provider]
  const ep = (meta && meta.fixedUrl) ? meta.endpoint : cfg.endpoint
  const base = String(ep || '').trim().replace(/\/+$/, '')
  // openai 族协议要求 /v1 前缀（如 agnes-ai.cn 无 /v1 路径会被 Cloudflare 403）
  if (cfg.protocol === 'openai-videos' && !/\/v[0-9]+$/.test(base)) return base + '/v1'
  return base
}

// DashScope native base for video: 必须使用 /api/v1 原生路径。workspace 专属域名
// (ws-*.maas.aliyuncs.com) 与公网域名 (dashscope.aliyuncs.com) 均支持该路径；
// 切勿把 workspace 域名改写成 dashscope.aliyuncs.com（那是无 workspace 的公网域名，
// 会拒绝 workspace 级 key，导致"非法 URL / url error"）。仅做 /api/v1 后缀归一。
function dashscopeVideoBase(cfg) {
  const meta = VIDEO_PROVIDERS[cfg.provider]
  const ep = (meta && meta.fixedUrl) ? meta.endpoint : cfg.endpoint
  const base = String(ep || '').trim().replace(/\/+$/, '')
  if (/\/api\/v[0-9]+$/.test(base)) return base
  if (/\/compatible-mode\/v[0-9]+$/.test(base)) return base.replace(/\/compatible-mode\/v[0-9]+$/, '/api/v1')
  if (/\/v[0-9]+$/.test(base)) return base.replace(/\/v[0-9]+$/, '/api/v1')
  return base + '/api/v1'
}

// 百炼原生模型列表 URL（文档第6章）：必须用 /api/v1/models，并按 capabilities=VG
// 过滤出视频生成模型。依赖 dashscopeVideoBase 完成 URL 后缀归一/替换——它会把用户链接里
// 不适配视频接口的兼容后缀（如 /compatible-mode/v1）在程序内部替换为原生 /api/v1 路径。
function dashscopeModelsUrl(cfg) {
  return dashscopeVideoBase(cfg) + '/models?capabilities=VG&page_size=100'
}

// 解析百炼原生 /api/v1/models 响应（文档第6.4章：body.output.models[].model），
// 提取模型 ID 列表。每个元素可能是字符串，或 { model, id, name } 对象。
function parseDashscopeModelList(body) {
  const out = (body && body.output && Array.isArray(body.output.models)) ? body.output.models : []
  return out.map((m) => (typeof m === 'string' ? m : (m && (m.model || m.id || m.name)) || '')).filter(Boolean)
}

// Video model list filter: keep video-family names (i2v/t2v/wan/sora/etc.),
// explicitly exclude image-generation markers so wan2.2-t2i / wanx 系 / seedream
// / cogview etc. never leak into the video model dropdown.
function filterVideoModelIds(ids) {
  if (!Array.isArray(ids)) return []
  return ids.filter((id) => {
    if (/t2i|wanx|image|img|seedream|dall|flux|cogview/i.test(id)) return false
    return /t2v|i2v|video|sora|wan|kling|hailuo|seedance|cogvideo|veo|vidu/i.test(id)
  })
}

// Build the submit request for a protocol. `image` is {kind:'url'|'b64'|'dataUrl', value}
// or null for t2v. args: {prompt, seconds, aspectRatio, resolution}.
function buildVideoSubmit(cfg, args, image) {
  const prompt = String(args.prompt || '').trim()
  const seconds = Math.max(1, Math.min(Math.floor(Number(args.seconds) || cfg.seconds || 5), 30))
  const aspectRatio = VIDEO_ASPECT_RATIOS[args.aspectRatio] ? args.aspectRatio
    : (VIDEO_ASPECT_RATIOS[cfg.aspectRatio] ? cfg.aspectRatio : '16:9')
  const res = String(args.resolution || cfg.resolution || '720p').toLowerCase()
  const protocol = cfg.protocol
  const base = videoBase(cfg)
  const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' }
  const isAgnes = cfg.provider === 'agnes' || cfg.provider === 'agnes-cn'
  const size = VIDEO_ASPECT_RATIOS[aspectRatio] || { width: 1280, height: 720 }
  const imageDataUrl = image ? (image.kind === 'dataUrl' ? image.value : (image.kind === 'url' ? image.value : 'data:' + (image.mime || 'image/png') + ';base64,' + image.value)) : ''
  switch (protocol) {
    case 'openai-videos': {
      if (cfg.apiKey) headers.Authorization = 'Bearer ' + cfg.apiKey
      const body = { model: cfg.model, prompt }
      if (image) body.image_url = image.kind === 'url' ? image.value : imageDataUrl
      if (isAgnes) {
        // Agnes Video V2.0 原生参数：num_frames(8n+1) + frame_rate + width/height
        body.num_frames = agnesNumFrames(seconds)
        body.frame_rate = 24
        body.width = size.width
        body.height = size.height
      } else {
        // 中转站通用 Sora 风格：size 字段
        body.size = size.width + 'x' + size.height
      }
      const sp = String(cfg.submitPath || '/videos').trim()
      const url = base + (sp.startsWith('/') ? sp : '/' + sp)
      return { url, method: 'POST', headers, body, i2v: !!image }
    }
    case 'dashscope-video': {
      if (cfg.apiKey) headers.Authorization = 'Bearer ' + cfg.apiKey
      headers['X-DashScope-Async'] = 'enable'
      const input = { prompt }
      // wan i2v：media[].url 支持公网 URL 或 data:{mime};base64,...（DashScope 原生口径）
      if (image) input.media = [{
        type: 'first_frame',
        url: image.kind === 'url' ? image.value
          : (image.kind === 'dataUrl' ? image.value
            : 'data:' + (image.mime || 'image/png') + ';base64,' + image.value)
      }]
      const resDash = res === '1080p' ? '1080P' : '720P'
      const dur = Math.max(2, Math.min(Number(seconds) || 5, 15))
      const body = {
        model: cfg.model,
        input,
        parameters: {
          resolution: resDash,
          duration: dur,
          prompt_extend: true,
          watermark: false
        }
      }
      const url = dashscopeVideoBase(cfg) + '/services/aigc/video-generation/video-synthesis'
      return { url, method: 'POST', headers, body, i2v: !!image }
    }
    case 'kling-video': {
      const [ak, sk] = String(cfg.apiKey || '').split('|')
      if (!ak || !sk) throw new Error('kling-video: apiKey 必须是 AccessKey|SecretKey 格式')
      headers.Authorization = 'Bearer ' + klingJwt(ak, sk)
      const path = image ? 'image2video' : 'text2video'
      const body = { model: cfg.model, prompt, duration: String(seconds), aspect_ratio: aspectRatio, mode: 'std' }
      if (image) body.image = image.kind === 'url' ? image.value : (image.kind === 'dataUrl' ? image.value : image.value)
      const url = base + '/v1/videos/' + path
      return { url, method: 'POST', headers, body, i2v: !!image }
    }
    case 'volc-video': {
      if (cfg.apiKey) headers.Authorization = 'Bearer ' + cfg.apiKey
      const content = [{ type: 'text', text: prompt }]
      if (image) content.push({ type: 'image_url', image_url: { url: imageDataUrl }, role: 'first_frame' })
      const body = { model: cfg.model, content, resolution: res === '1080p' ? '1080p' : '720p', ratio: aspectRatio, duration: seconds }
      const url = base + '/api/v3/contents/generations/tasks'
      return { url, method: 'POST', headers, body, i2v: !!image }
    }
    case 'minimax-video': {
      if (cfg.apiKey) headers.Authorization = 'Bearer ' + cfg.apiKey
      const body = { model: cfg.model, prompt, duration: seconds, resolution: res === '1080p' ? '1080P' : '720P' }
      const url = base + '/v1/video_generation'
      return { url, method: 'POST', headers, body, i2v: !!image }
    }
    case 'async-task': {
      if (cfg.apiKey) headers.Authorization = 'Bearer ' + cfg.apiKey
      const body = { model: cfg.model, prompt }
      if (image) body.image = image.kind === 'url' ? image.value : imageDataUrl
      const sp = String(cfg.submitPath || '/videos').trim()
      const url = base + (sp.startsWith('/') ? sp : '/' + sp)
      return { url, method: 'POST', headers, body, i2v: !!image }
    }
    default:
      throw new Error('generate_video: 未知协议 ' + protocol)
  }
}

// Poll URL for a protocol. `i2v` only matters for kling (image2video vs text2video).
function videoPollUrl(protocol, cfg, taskId, i2v) {
  const base = videoBase(cfg)
  switch (protocol) {
    case 'openai-videos': {
      const p = String(cfg.pollPath || '/videos').trim()
      return base + (p.startsWith('/') ? p : '/' + p) + '/' + encodeURIComponent(taskId)
    }
    case 'dashscope-video':
      return dashscopeVideoBase(cfg) + '/tasks/' + encodeURIComponent(taskId)
    case 'kling-video': {
      const kind = i2v ? 'image2video' : 'text2video'
      return base + '/v1/videos/' + kind + '/' + encodeURIComponent(taskId)
    }
    case 'volc-video':
      return base + '/api/v3/contents/generations/tasks/' + encodeURIComponent(taskId)
    case 'minimax-video':
      return base + '/v1/query/video_generation?task_id=' + encodeURIComponent(taskId)
    case 'async-task': {
      const p = String(cfg.pollPath || '').trim()
      if (!p) return base + '/' + encodeURIComponent(taskId)
      if (p.includes('{id}')) return base + (p.startsWith('/') ? p : '/' + p).replace('{id}', encodeURIComponent(taskId))
      return base + (p.startsWith('/') ? p : '/' + p) + '/' + encodeURIComponent(taskId)
    }
    default:
      return ''
  }
}

// Normalize a poll response body into {status, url?, fileId?, message?}.
// status: 'pending' | 'running' | 'done' | 'failed' | 'error'
function normalizeVideoStatus(protocol, cfg, body) {
  if (!body || typeof body !== 'object') return { status: 'error', message: '响应非 JSON 对象' }
  switch (protocol) {
    case 'openai-videos': {
      const st = String(body.status || '').toLowerCase()
      const isDone = st === 'completed' || st === 'succeeded' || (cfg.doneStatus && st === String(cfg.doneStatus).toLowerCase())
      if (isDone) {
        const url = pathGet(body, cfg.resultField || 'metadata.url') || body.url || (body.output && body.output.url) || ''
        // Agnes/Sora：轮询完成通常不含结果 URL，仅返回 video_id —— 由执行器走
        // /agnesapi?video_id= 解析（agnes 供应商）或 /content 端点（Sora 中转站）。
        return { status: 'done', url, videoId: body.video_id || '' }
      }
      if (/fail|error|cancelled|cancel/.test(st)) return { status: 'failed', message: st }
      return { status: /queued|pending/.test(st) ? 'pending' : 'running' }
    }
    case 'dashscope-video': {
      const out = body.output || {}
      const st = String(out.task_status || body.status || '').toUpperCase()
      if (st === 'SUCCEEDED') return { status: 'done', url: out.video_url || '' }
      if (st === 'FAILED' || st === 'CANCELED') return { status: 'failed', message: out.message || st }
      return { status: st === 'PENDING' ? 'pending' : 'running' }
    }
    case 'kling-video': {
      const d = body.data || {}
      const st = String(d.task_status || '').toLowerCase()
      if (st === 'succeed') {
        const vs = d.task_result && Array.isArray(d.task_result.videos) ? d.task_result.videos : []
        return { status: 'done', url: (vs[0] && vs[0].url) || '' }
      }
      if (st === 'failed') return { status: 'failed', message: String(d.task_status_msg || d.task_status || '') }
      return { status: st === 'submitted' ? 'pending' : 'running' }
    }
    case 'volc-video': {
      const st = String(body.status || '').toLowerCase()
      if (st === 'succeeded') {
        const cs = Array.isArray(body.content) ? body.content : []
        const vu = cs.find((c) => c && c.type === 'video_url') || {}
        return { status: 'done', url: (vu.video_url && vu.video_url.url) || '' }
      }
      if (st === 'failed' || st === 'cancelled') return { status: 'failed', message: String(body.error || '') }
      return { status: 'running' }
    }
    case 'minimax-video': {
      const st = String(body.status || '').toLowerCase()
      if (st === 'success') return { status: 'done', fileId: body.file_id || '' }
      if (st === 'failed') return { status: 'failed', message: String((body.base_resp && body.base_resp.status_msg) || '') }
      return { status: 'running' }
    }
    case 'async-task': {
      const st = String(body[cfg.statusField] || body.status || '').toLowerCase()
      if (cfg.doneStatus && st === String(cfg.doneStatus).toLowerCase()) {
        return { status: 'done', url: pathGet(body, cfg.resultField || '') || '' }
      }
      if (/fail|error|cancel/.test(st)) return { status: 'failed', message: st }
      return { status: /pending|queued/.test(st) ? 'pending' : 'running' }
    }
    default:
      return { status: 'running' }
  }
}

// Extract task id from a submit response (protocol-aware).
function extractVideoTaskId(protocol, cfg, body) {
  if (!body || typeof body !== 'object') return ''
  const b = body.data && typeof body.data === 'object' ? body.data : body
  const cands = []
  if (protocol === 'async-task' && cfg.taskIdField) cands.push(pathGet(body, cfg.taskIdField))
  if (protocol === 'dashscope-video') cands.push(body.output && body.output.task_id)
  cands.push(b.task_id, b.taskId, b.id, b.taskID)
  for (const c of cands) if (c && String(c).length > 0) return String(c)
  return ''
}

// One poll iteration: fetch + normalize. fetchImpl injectable for unit tests.
async function pollVideoOnce(protocol, cfg, taskId, i2v, fetchImpl) {
  const f = fetchImpl || httpJson
  const url = videoPollUrl(protocol, cfg, taskId, i2v)
  if (!url) return { status: 'error', message: '无法构造轮询 URL（protocol=' + protocol + '）' }
  const headers = { Accept: 'application/json' }
  if (protocol === 'kling-video') {
    const [ak, sk] = String(cfg.apiKey || '').split('|')
    if (ak && sk) headers.Authorization = 'Bearer ' + klingJwt(ak, sk)
  } else if (cfg.apiKey) {
    headers.Authorization = 'Bearer ' + cfg.apiKey
  }
  const res = await f(url, 'GET', headers, null, 60000)
  if (!res.ok || !res.body || typeof res.body !== 'object') {
    return { status: 'error', message: 'HTTP ' + res.status + ': ' + String(res.message || '').slice(0, 200) }
  }
  return normalizeVideoStatus(protocol, cfg, res.body)
}

// MiniMax: after success, resolve the download URL via /v1/files/retrieve.
async function minimaxResolveUrl(cfg, fileId, fetchImpl) {
  const f = fetchImpl || httpJson
  const base = videoBase(cfg)
  const url = base + '/v1/files/retrieve?file_id=' + encodeURIComponent(fileId) + '&purpose=video'
  const headers = { Accept: 'application/json', ...(cfg.apiKey ? { Authorization: 'Bearer ' + cfg.apiKey } : {}) }
  const r = await f(url, 'GET', headers, null, 60000)
  if (!r.ok || !r.body) return ''
  const fobj = r.body.file || {}
  return fobj.download_url || ''
}

let idCounter = 0
const genId = () => 'c_' + Date.now().toString(36) + '_' + (idCounter++).toString(36)

let presetIdCounter = 0
const genPresetId = () => 'p_' + Date.now().toString(36) + '_' + (presetIdCounter++).toString(36)

const newCard = (overrides) => ({
  id: genId(),
  name: 'VLM API',
  provider: 'custom',
  protocol: 'openai-completions',
  endpoint: '',
  apiKey: '',
  model: '',
  collapsed: false,
  timeoutMs: 120000,
  // contextWindow/maxOutput 留空：UI 显示占位符，留空时运行时回退默认值（262144/32768）
  ...(overrides || {})
})

const defaultConfig = () => {
  const voicePresets = [{ id: genPresetId(), name: '默认', config: defaultVoiceConfig() }]
  const voicePresetsStt = [{ id: genPresetId(), name: '默认', config: defaultVoiceConfig() }]
  return {
    retryCount: 3,
    apis: [newCard()],
    voiceEnabled: false,
    ttsEnabled: true,
    sttEnabled: false,
    voiceConfig: defaultVoiceConfig(),
    voicePresets,
    activeVoicePreset: voicePresets[0].id,
    voiceConfigStt: defaultVoiceConfig(),
    voicePresetsStt,
    activeVoicePresetStt: voicePresetsStt[0].id,
    voiceLibrary: []
  }
}

// v1.9: mirror model config — controls twin routes in /model picker.
// autoVisionEnabled: register the single `auto-vision` twin (v1.8 behavior).
// mirrorAllEnabled: register `<provider>-omni-workstation` per live provider (v1.7
// behavior; masks the mappings list since per-provider twins already cover
// every model). mappings: custom per-model twins that delegate to a specific
// originalProvider/originalModel, each with an optional mirrorName (default
// `<originalModel>-vision`).
const defaultMirrorConfig = () => ({
  autoVisionEnabled: true,   // preserve current v1.8 behavior (auto-vision always on)
  mirrorAllEnabled: false,
  mappings: []
})

function normalizeMirrorConfig(raw) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const mappings = Array.isArray(src.mappings) ? src.mappings
    .filter((m) => m && typeof m === 'object')
    .map((m) => ({
      id: typeof m.id === 'string' && m.id.length > 0 ? m.id : genId(),
      originalProvider: typeof m.originalProvider === 'string' ? m.originalProvider : '',
      originalModel: typeof m.originalModel === 'string' ? m.originalModel : '',
      mirrorName: typeof m.mirrorName === 'string' ? m.mirrorName.trim() : ''
    })) : []
  return {
    autoVisionEnabled: src.autoVisionEnabled !== false,
    mirrorAllEnabled: src.mirrorAllEnabled === true,
    mappings
  }
}

const maskedMirror = (c) => ({
  autoVisionEnabled: c.autoVisionEnabled !== false,
  mirrorAllEnabled: c.mirrorAllEnabled === true,
  mappings: (c.mappings || []).map((m) => ({
    id: m.id,
    originalProvider: m.originalProvider,
    originalModel: m.originalModel,
    mirrorName: m.mirrorName
  }))
})

// Sanitize a mirror name into a route id safe for registerAdapter. Prefix
// `omni-workstation-m-` avoids collision with real provider routes and is filtered by
// the agent/request + syncTwins self-recursion guards.
const mirrorRouteId = (mirrorName) => {
  const base = String(mirrorName || '').replace(/[^a-zA-Z0-9_-]/g, '-')
  return 'omni-workstation-m-' + (base.length > 0 ? base : 'mirror')
}
// Default display name when mirrorName is empty: `<originalModel>-vision`.
const mirrorDisplayName = (mapping) => {
  const name = String(mapping.mirrorName || '').trim()
  return name.length > 0 ? name : String(mapping.originalModel) + '-vision'
}

function normalizeConfig(raw) {
  const fallback = defaultConfig()
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const retryRaw = Number(src.retryCount)
  const retryCount = Number.isFinite(retryRaw) && retryRaw > 0 ? Math.min(Math.floor(retryRaw), 20) : fallback.retryCount
  const vlmEnabled = src.vlmEnabled !== false
  const imggenEnabled = src.imggenEnabled === true
  // v2.8: video generation defaults OFF — the tool is registered (and its
  // schema injected into the model prompt) only when the user flips it on.
  const videoEnabled = src.videoEnabled === true
  const videoConfigRaw = normalizeVideoConfig(src.videoConfig)
  // ---- video presets (v2.8): preset is source of truth; videoConfig = active preset's config ----
  let videoPresets = []
  if (Array.isArray(src.videoPresets)) {
    videoPresets = src.videoPresets
      .filter((p) => p && typeof p === 'object' && !Array.isArray(p))
      .map((p) => ({
        id: typeof p.id === 'string' && p.id.length > 0 ? p.id : genPresetId(),
        name: typeof p.name === 'string' && p.name.length > 0 ? String(p.name).slice(0, 60) : '默认',
        config: normalizeVideoConfig(p.config)
      }))
  }
  if (videoPresets.length === 0) {
    // 无预设 → 从 videoConfig 创建 '默认' 预设（含清空所有预设后自动重建）
    videoPresets = [{ id: genPresetId(), name: '默认', config: videoConfigRaw }]
  }
  let activeVideoPreset = typeof src.activeVideoPreset === 'string' && src.activeVideoPreset.length > 0 && videoPresets.some((p) => p.id === src.activeVideoPreset) ? src.activeVideoPreset : videoPresets[0].id
  // sync: runtime videoConfig = active preset's config (source of truth)
  const activeVPreset = videoPresets.find((p) => p.id === activeVideoPreset) || videoPresets[0]
  const videoConfig = normalizeVideoConfig(activeVPreset.config)
  const rawToggles = src.visionToolToggles && typeof src.visionToolToggles === 'object' && !Array.isArray(src.visionToolToggles) ? src.visionToolToggles : {}
  const visionToolToggles = {}
  for (const name of VISION_TOOL_NAMES) { visionToolToggles[name] = rawToggles[name] !== false }
  const visionToolsEnabled = src.visionToolsEnabled !== false
  let apis
  if (Array.isArray(src.apis)) {
    apis = src.apis.map((a) => {
      if (!a || typeof a !== 'object') return newCard()
      const provider = PROVIDER_IDS.includes(a.provider) ? a.provider : 'custom'
      const protocol = PROTOCOLS.includes(a.protocol) ? a.protocol : 'openai-completions'
      return {
        id: typeof a.id === 'string' && a.id.length > 0 ? a.id : genId(),
        name: typeof a.name === 'string' && a.name.length > 0 ? String(a.name).slice(0, 60) : 'VLM API',
        provider,
        protocol,
        endpoint: typeof a.endpoint === 'string' ? a.endpoint : '',
        apiKey: typeof a.apiKey === 'string' ? a.apiKey : '',
        model: typeof a.model === 'string' ? a.model : '',
        collapsed: a.collapsed === true,
        timeoutMs: clampTimeout(a.timeoutMs),
        contextWindow: Number.isFinite(Number(a.contextWindow)) && Number(a.contextWindow) > 0 ? Math.floor(Number(a.contextWindow)) : null,
        maxOutput: Number.isFinite(Number(a.maxOutput)) && Number(a.maxOutput) > 0 ? Math.floor(Number(a.maxOutput)) : null
      }
    })
  } else {
    // 旧 primary/backup 结构不再迁移：清空重置为默认单卡
    apis = fallback.apis
  }
  // 允许 apis 为空数组（批量删除全部 → 真正空列表，UI 已有 noCards 分支）
  const imggenConfig = normalizeImggenConfig(src.imggenConfig)
  const fbSrc = src.fallbackConfig && typeof src.fallbackConfig === 'object' && !Array.isArray(src.fallbackConfig) ? src.fallbackConfig : {}
  const fbProvider = Object.keys(FALLBACK_PROVIDERS).includes(fbSrc.provider) ? fbSrc.provider : 'ovhcloud'
  const fbProviderChanged = fbSrc.provider !== fbProvider
  const fallbackConfig = {
    provider: fbProvider,
    models: (Array.isArray(fbSrc.models) && !fbProviderChanged) ? fbSrc.models.filter(m => typeof m === 'string' && m.length > 0) : [...OVHCLOUD_DEFAULT_MODELS],
    timeoutMs: clampTimeout(fbSrc.timeoutMs, 120000)
  }
  const globalConfig = src.globalConfig && typeof src.globalConfig === 'object' && !Array.isArray(src.globalConfig) ? {
    backoffBase: Number.isFinite(Number(src.globalConfig.backoffBase)) && Number(src.globalConfig.backoffBase) > 0 ? Math.floor(Number(src.globalConfig.backoffBase)) : 800,
    backoffMax: Number.isFinite(Number(src.globalConfig.backoffMax)) && Number(src.globalConfig.backoffMax) > 0 ? Math.floor(Number(src.globalConfig.backoffMax)) : 5000,
    backoff429Base: Number.isFinite(Number(src.globalConfig.backoff429Base)) && Number(src.globalConfig.backoff429Base) > 0 ? Math.floor(Number(src.globalConfig.backoff429Base)) : 2000,
    backoff429Max: Number.isFinite(Number(src.globalConfig.backoff429Max)) && Number(src.globalConfig.backoff429Max) > 0 ? Math.floor(Number(src.globalConfig.backoff429Max)) : 10000,
    retryStatusCodes: typeof src.globalConfig.retryStatusCodes === 'string' && src.globalConfig.retryStatusCodes.length > 0 ? src.globalConfig.retryStatusCodes : '402,408,429,500,502,503,504,NET',
    verifyReminder: src.globalConfig.verifyReminder !== false
  } : defaultGlobalConfig()
 const mirrorConfig = normalizeMirrorConfig(src.mirrorConfig)
  // ---- imggen presets (v2.1): preset is source of truth; imggenConfig = active preset's config ----
  let imggenPresets = []
  if (Array.isArray(src.imggenPresets)) {
    imggenPresets = src.imggenPresets
      .filter((p) => p && typeof p === 'object' && !Array.isArray(p))
      .map((p) => ({
        id: typeof p.id === 'string' && p.id.length > 0 ? p.id : genPresetId(),
        name: typeof p.name === 'string' && p.name.length > 0 ? String(p.name).slice(0, 60) : '默认',
        config: normalizeImggenConfig(p.config)
      }))
  }
  if (imggenPresets.length === 0) {
    // 无预设 → 从 imggenConfig 创建 '默认' 预设（含清空所有预设后自动重建）
    imggenPresets = [{ id: genPresetId(), name: '默认', config: normalizeImggenConfig(src.imggenConfig) }]
  }
  let activeImggenPreset = typeof src.activeImggenPreset === 'string' && src.activeImggenPreset.length > 0 && imggenPresets.some((p) => p.id === src.activeImggenPreset) ? src.activeImggenPreset : imggenPresets[0].id
  // sync: runtime imggenConfig = active preset's config (source of truth)
  const activePreset = imggenPresets.find((p) => p.id === activeImggenPreset) || imggenPresets[0]
  const runtimeImggenConfig = normalizeImggenConfig(activePreset.config)
  // ---- comfy workflows (top-level, independent of imggenConfig/presets) ----
  let comfyWorkflows = []
  if (Array.isArray(src.comfyWorkflows)) {
    comfyWorkflows = src.comfyWorkflows
      .filter((w) => w && typeof w === 'object')
      .map((w) => ({
        id: typeof w.id === 'string' ? w.id : 'wf_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
        name: typeof w.name === 'string' ? w.name : '工作流',
        workflow: typeof w.workflow === 'string' ? w.workflow : '',
        mapping: w.mapping && typeof w.mapping === 'object' ? w.mapping : null,
        steps: w.steps === '' || w.steps == null ? '' : Number(w.steps),
        cfg: w.cfg === '' || w.cfg == null ? '' : Number(w.cfg),
        scheduler: typeof w.scheduler === 'string' ? w.scheduler : '',
        seed: w.seed === '' || w.seed == null ? '' : Number(w.seed)
      }))
  }
  // Migration: legacy single comfyWorkflow/comfyMapping → first list entry (idempotent)
  if (comfyWorkflows.length === 0 && src.imggenConfig && typeof src.imggenConfig.comfyWorkflow === 'string' && src.imggenConfig.comfyWorkflow.trim() !== '') {
    try {
      const parsed = JSON.parse(src.imggenConfig.comfyWorkflow)
      const wfId = 'wf_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5)
      comfyWorkflows.push({
        id: wfId,
        name: '导入的工作流',
        workflow: JSON.stringify(parsed),
        mapping: src.imggenConfig.comfyMapping || null,
        steps: '',
        cfg: '',
        scheduler: '',
        seed: ''
      })
    } catch (e) { /* invalid JSON → skip migration silently */ }
  }
  const activeComfyWorkflow = typeof src.activeComfyWorkflow === 'string' && comfyWorkflows.some((w) => w.id === src.activeComfyWorkflow) ? src.activeComfyWorkflow : (comfyWorkflows.length > 0 ? comfyWorkflows[0].id : '')
  // ---- voice module (v2.8.1): preset is source of truth; voiceConfig = active preset's config ----
  const voiceEnabled = src.voiceEnabled === true
  const ttsEnabled = src.ttsEnabled === true
  const sttEnabled = src.sttEnabled === true
  const voiceConfigRaw = normalizeVoiceConfig(src.voiceConfig)
  let voicePresets = []
  if (Array.isArray(src.voicePresets)) {
    voicePresets = src.voicePresets
      .filter((p) => p && typeof p === 'object' && !Array.isArray(p))
      .map((p) => ({
        id: typeof p.id === 'string' && p.id.length > 0 ? p.id : genPresetId(),
        name: typeof p.name === 'string' && p.name.length > 0 ? String(p.name).slice(0, 60) : '默认',
        config: normalizeVoiceConfig(p.config)
      }))
  }
  if (voicePresets.length === 0) {
    // 无预设 → 从 voiceConfig 创建 '默认' 预设（含清空所有预设后自动重建）
    voicePresets = [{ id: genPresetId(), name: '默认', config: voiceConfigRaw }]
  }
  let activeVoicePreset = typeof src.activeVoicePreset === 'string' && src.activeVoicePreset.length > 0 && voicePresets.some((p) => p.id === src.activeVoicePreset) ? src.activeVoicePreset : voicePresets[0].id
  const activeVoiceP = voicePresets.find((p) => p.id === activeVoicePreset) || voicePresets[0]
  const voiceConfig = normalizeVoiceConfig(activeVoiceP.config)
  // ---- voice STT namespace (v2.9.1): placeholders; independent presets from TTS ----
  const voiceConfigSttRaw = normalizeVoiceConfig(src.voiceConfigStt)
  let voicePresetsStt = []
  if (Array.isArray(src.voicePresetsStt)) {
    voicePresetsStt = src.voicePresetsStt
      .filter((p) => p && typeof p === 'object' && !Array.isArray(p))
      .map((p) => ({
        id: typeof p.id === 'string' && p.id.length > 0 ? p.id : genPresetId(),
        name: typeof p.name === 'string' && p.name.length > 0 ? String(p.name).slice(0, 60) : '默认',
        config: normalizeVoiceConfig(p.config)
      }))
  }
  if (voicePresetsStt.length === 0) {
    voicePresetsStt = [{ id: genPresetId(), name: '默认', config: voiceConfigSttRaw }]
  }
  let activeVoicePresetStt = typeof src.activeVoicePresetStt === 'string' && src.activeVoicePresetStt.length > 0 && voicePresetsStt.some((p) => p.id === src.activeVoicePresetStt) ? src.activeVoicePresetStt : voicePresetsStt[0].id
  const activeVoicePStt = voicePresetsStt.find((p) => p.id === activeVoicePresetStt) || voicePresetsStt[0]
  const voiceConfigStt = normalizeVoiceConfig(activeVoicePStt.config)
  const voiceLibrary = Array.isArray(src.voiceLibrary) ? src.voiceLibrary
    .filter((e) => e && typeof e === 'object')
    .map((e) => ({
      id: typeof e.id === 'string' ? e.id : 'vl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
      name: typeof e.name === 'string' ? e.name : '未命名',
      path: typeof e.path === 'string' ? e.path : (typeof e.samplePath === 'string' ? e.samplePath : ''),
      ext: typeof e.ext === 'string' ? e.ext : '',
      size: typeof e.size === 'number' ? e.size : 0,
      mime: typeof e.mime === 'string' ? e.mime : '',
      createdAt: typeof e.createdAt === 'number' ? e.createdAt : Date.now()
    })) : []
  // v2.9.9: doubao clone presets (shared across voice config presets)
  let doubaoClonePresets = Array.isArray(src.doubaoClonePresets) && src.doubaoClonePresets.length > 0
    ? src.doubaoClonePresets.filter((p) => p && typeof p === 'object').map((p) => ({
        id: typeof p.id === 'string' ? p.id : 'dcp_' + Date.now().toString(36),
        name: typeof p.name === 'string' ? p.name : '未命名',
        speakerId: typeof p.speakerId === 'string' ? p.speakerId : '',
        refAudioPath: typeof p.refAudioPath === 'string' ? p.refAudioPath : ''
      }))
    : [{ id: 'dcp_' + Date.now().toString(36), name: '默认', speakerId: '', refAudioPath: '' }]
  let activeDoubaoClonePreset = typeof src.activeDoubaoClonePreset === 'string' && doubaoClonePresets.some((p) => p.id === src.activeDoubaoClonePreset) ? src.activeDoubaoClonePreset : doubaoClonePresets[0].id
  return { retryCount, vlmEnabled, imggenEnabled, videoEnabled, videoConfig, videoPresets, activeVideoPreset, voiceEnabled, ttsEnabled, sttEnabled, voiceConfig, voicePresets, activeVoicePreset, voiceConfigStt, voicePresetsStt, activeVoicePresetStt, voiceLibrary, doubaoClonePresets, activeDoubaoClonePreset, visionToolsEnabled, visionToolToggles, mirrorConfig, apis, imggenConfig: runtimeImggenConfig, imggenPresets, activeImggenPreset, fallbackConfig, globalConfig, comfyWorkflows, activeComfyWorkflow }
}

const masked = (cfg) => ({
  retryCount: cfg.retryCount,
  vlmEnabled: cfg.vlmEnabled !== false,
  imggenEnabled: cfg.imggenEnabled === true,
  videoEnabled: cfg.videoEnabled === true,
  videoConfig: maskedVideo(cfg.videoConfig || defaultVideoConfig()),
  videoPresets: (Array.isArray(cfg.videoPresets) ? cfg.videoPresets : []).map((p) => ({ id: p.id, name: p.name, config: maskedVideo(p.config || defaultVideoConfig()) })),
  activeVideoPreset: cfg.activeVideoPreset || (Array.isArray(cfg.videoPresets) && cfg.videoPresets.length > 0 ? cfg.videoPresets[0].id : ''),
  voiceEnabled: cfg.voiceEnabled === true,
  ttsEnabled: cfg.ttsEnabled === true,
  sttEnabled: cfg.sttEnabled === true,
  voiceConfig: maskedVoice(cfg.voiceConfig || defaultVoiceConfig()),
  voicePresets: (Array.isArray(cfg.voicePresets) ? cfg.voicePresets : []).map((p) => ({ id: p.id, name: p.name, config: maskedVoice(p.config || defaultVoiceConfig()) })),
  activeVoicePreset: cfg.activeVoicePreset || (Array.isArray(cfg.voicePresets) && cfg.voicePresets.length > 0 ? cfg.voicePresets[0].id : ''),
  voiceConfigStt: maskedVoice(cfg.voiceConfigStt || defaultVoiceConfig()),
  voicePresetsStt: (Array.isArray(cfg.voicePresetsStt) ? cfg.voicePresetsStt : []).map((p) => ({ id: p.id, name: p.name, config: maskedVoice(p.config || defaultVoiceConfig()) })),
  activeVoicePresetStt: cfg.activeVoicePresetStt || (Array.isArray(cfg.voicePresetsStt) && cfg.voicePresetsStt.length > 0 ? cfg.voicePresetsStt[0].id : ''),
  voiceLibrary: cfg.voiceLibrary || [],
  doubaoClonePresets: Array.isArray(cfg.doubaoClonePresets) ? cfg.doubaoClonePresets : [],
  activeDoubaoClonePreset: cfg.activeDoubaoClonePreset || (Array.isArray(cfg.doubaoClonePresets) && cfg.doubaoClonePresets.length > 0 ? cfg.doubaoClonePresets[0].id : ''),
  visionToolsEnabled: cfg.visionToolsEnabled !== false,
    visionToolToggles: cfg.visionToolToggles || {},
  mirrorConfig: maskedMirror(cfg.mirrorConfig || defaultMirrorConfig()),
  imggenConfig: maskedImggen(cfg.imggenConfig || defaultImggenConfig()),
  comfyWorkflows: cfg.comfyWorkflows || [],
  activeComfyWorkflow: cfg.activeComfyWorkflow || '',
  imggenPresets: (Array.isArray(cfg.imggenPresets) ? cfg.imggenPresets : []).map((p) => ({ id: p.id, name: p.name, config: maskedImggen(p.config || defaultImggenConfig()) })),
  activeImggenPreset: cfg.activeImggenPreset || (Array.isArray(cfg.imggenPresets) && cfg.imggenPresets.length > 0 ? cfg.imggenPresets[0].id : ''),
  fallbackConfig: cfg.fallbackConfig ? { provider: cfg.fallbackConfig.provider, models: cfg.fallbackConfig.models, timeoutMs: cfg.fallbackConfig.timeoutMs } : null,
  globalConfig: cfg.globalConfig ? Object.assign({}, cfg.globalConfig) : defaultGlobalConfig(),
  apis: cfg.apis.map((a) => ({
    id: a.id,
    name: a.name,
    provider: a.provider,
    protocol: a.protocol,
    endpoint: a.endpoint,
    model: a.model,
    collapsed: a.collapsed,
    timeoutMs: a.timeoutMs,
    contextWindow: a.contextWindow,
    maxOutput: a.maxOutput,
    apiKeySet: a.apiKey !== ''
  }))
})

function isCardValid(c) {
  if (!c) return false
  const meta = PROVIDERS[c.provider]
  // 固定供应商的 endpoint 始终是内置的（非空），不看存储值
  const endpoint = (meta && meta.fixedUrl) ? meta.endpoint : c.endpoint
  if (typeof endpoint !== 'string' || endpoint.trim() === '') return false
  if (typeof c.model !== 'string' || c.model.trim() === '') return false
  if (meta && !meta.keyRequired) return true // 仅 Ollama 等免 Key 供应商
  return typeof c.apiKey === 'string' && c.apiKey !== ''
}

const validCards = (cfg) => (cfg && Array.isArray(cfg.apis) ? cfg.apis : []).filter(isCardValid)

// For fixed providers, endpoint & protocol are baked in — use them at request
// time instead of the stored values (which may be stale from a prior custom
// config). The stored values are preserved so switching back to custom restores
// the original endpoint.
function effectiveCard(c) {
  const meta = PROVIDERS[c.provider]
  if (meta && meta.fixedUrl) return Object.assign({}, c, { endpoint: meta.endpoint, protocol: meta.protocol })
  return c
}

// v2.5: config lives INSIDE the plugin install dir (never in the user home root).
// Plugin dir is derived from import.meta.url — installed copy
// ~/.dsh/profiles/web/node_modules/dsh-omni-workstation/lib/index.js -> <...>/dsh-omni-workstation.
// The old $DSH_HOME/homedir location is probed only once for first-run migration.
const PLUGIN_DIR = dirname(dirname(fileURLToPath(import.meta.url)))
function configFile() {
  // Test override: unit tests that import this file directly (not via a copied
  // plugin dir) point the config at their own temp DSH_HOME via this env.
  const override = process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR
  if (override && override.length > 0) return join(override, 'omni-vision.json')
  return join(PLUGIN_DIR, 'omni-vision.json')
}

function backupFile() {
  const dir = process.env.DSH_HOME || homedir()
  return join(dir, 'omni-vision.json.bak')
}

async function legacyConfigDir(ctx) {
  // old chain: settings doc dirname -> DSH_HOME -> homedir (migration probe only)
  const settings = ctx.get('settings')
  if (settings !== undefined) {
    try {
      const doc = await settings.prepareDocument()
      if (typeof doc === 'string' && doc.length > 0) return dirname(doc)
    } catch {
      // not file-backed; fall through
    }
  }
  const envHome = process.env.DSH_HOME
  if (envHome && envHome.length > 0) return envHome
  return homedir()
}

async function legacyConfigFile(ctx) {
  const dir = await legacyConfigDir(ctx)
  return join(dir, 'omni-vision.json')
}

async function loadConfig(ctx) {
  try {
    const file = configFile()
    if (!existsSync(file)) {
      // first-run migration: move an existing legacy config into the plugin dir
      try {
        const legacy = await legacyConfigFile(ctx)
        if (legacy !== file && existsSync(legacy)) {
          copyFileSync(legacy, file)
          unlinkSync(legacy)
          console.error('[dsh-omni-workstation] config migrated: ' + legacy + ' -> ' + file)
        }
      } catch (e) {
        console.error('[dsh-omni-workstation] config migration skipped:', String(e && e.message || e))
      }
    }
    if (!existsSync(file)) {
      const bak = backupFile()
      if (existsSync(bak)) {
        copyFileSync(bak, file)
        return normalizeConfig(JSON.parse(readFileSync(file, 'utf8')))
      }
      return defaultConfig()
    }
    return normalizeConfig(JSON.parse(readFileSync(file, 'utf8')))
  } catch (e) {
    console.error('[dsh-omni-workstation] config read failed:', String(e && e.message || e))
    const bak = backupFile()
    if (existsSync(bak)) {
      try {
        const file = configFile()
        copyFileSync(bak, file)
        return normalizeConfig(JSON.parse(readFileSync(file, 'utf8')))
      } catch (e2) {
        console.error('[dsh-omni-workstation] backup fallback also failed:', String(e2 && e2.message || e2))
      }
    }
    return defaultConfig()
  }
}

async function storeConfig(ctx, cfg) {
  const file = configFile()
  const data = JSON.stringify(normalizeConfig(cfg), null, 2)
  writeFileSync(file, data, 'utf8')
  try {
    writeFileSync(backupFile(), data, 'utf8')
  } catch (e) {
    console.error('[dsh-omni-workstation] backup write failed:', String(e && e.message || e))
  }
}

// ---------- HTTP (native fetch, UTF-8 throughout) ----------
// v2.5: normalize any WxH / W*H / W×H size string to {width,height} so each
// protocol can re-emit its own required separator (DashScope wants W*H, OpenAI
// family WxH, ComfyUI split width/height). Returns null when unparseable.
function parseSizePair(s) {
  const m = /^(\d{2,5})\s*[xX*×]\s*(\d{2,5})$/.exec(String(s || '').trim())
  if (!m) return null
  const w = Number(m[1])
  const h = Number(m[2])
  return (w >= 64 && w <= 8192 && h >= 64 && h <= 8192) ? { width: w, height: h } : null
}

async function httpJson(url, method, headers, body, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    let res
    try {
      // Browser-like UA avoids Cloudflare bot detection on some endpoints (e.g. agnes-ai.cn)
      const h = Object.assign({}, headers, {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
      })
      res = await fetch(url, {
        method,
        headers: h,
        body: (body !== undefined && method !== 'GET' && method !== 'HEAD') ? JSON.stringify(body) : undefined,
        signal: controller.signal
      })
    } catch (e) {
      if (e && e.name === 'AbortError') {
        return { ok: false, status: 'TIMEOUT', body: null, message: '请求超时（' + timeoutMs + 'ms）' }
      }
      return { ok: false, status: 'NET', body: null, message: String(e && e.message || e) }
    }
    const text = await res.text()
    let parsed = null
    try {
      parsed = text ? JSON.parse(text) : null
    } catch {
      parsed = text
    }
    return { ok: res.ok, status: res.status, body: parsed, message: text.slice(0, 2000) }
  } finally {
    clearTimeout(timer)
  }
}

// ---------- binary-safe base64 (native, avoids any custom-encoder doubt) ----------
const bytesToBase64 = (bytes) => Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('base64')

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp'
}
const mimeFor = (filePath) => {
  const lower = String(filePath || '').toLowerCase()
  for (const ext of Object.keys(MIME_BY_EXT)) if (lower.endsWith(ext)) return MIME_BY_EXT[ext]
  return 'image/png'
}

// ---------- image-block rewrite + attachment helpers (vendored from dsh-vision-router) ----------
// Recursively rewrite every image block in a content tree, descending into
// nested `tool-result` content exactly like the harness's own image walk. The
// native text-only adapters reject ANY image block — including one nested
// inside a tool result — so a top-level-only rewrite still leaks images into
// the UNSUPPORTED_CONTENT rejection on every subsequent turn.
// `replace(block)` returns the replacement block(s) — a single block or an
// array — or `undefined` to drop the block. Returns the rewritten array plus
// a changed flag; an untouched input array is returned as-is so callers can
// keep object identity for unchanged messages.
function rewriteImagesDeep(content, replace) {
  if (!Array.isArray(content)) return { content, changed: false }
  let changed = false
  const next = []
  for (const block of content) {
    if (block && block.type === 'image') {
      changed = true
      const out = replace(block)
      if (out !== undefined && out !== null) {
        if (Array.isArray(out)) next.push(...out)
        else next.push(out)
      }
      continue
    }
    if (block && Array.isArray(block.content)) {
      const inner = rewriteImagesDeep(block.content, replace)
      if (inner.changed) {
        changed = true
        next.push({ ...block, content: inner.content })
        continue
      }
    }
    next.push(block)
  }
  return { content: changed ? next : content, changed }
}

// Detect the image format from magic bytes instead of the file extension.
// Attachments are stored as content-addressed files WITHOUT an extension,
// so extension-based detection rejects them; analyze_image must sniff.
function sniffMediaType(bytes) {
  if (!bytes || bytes.length < 12) return undefined
  const head = (offset, count) => {
    const parts = []
    for (let i = offset; i < offset + count; i++) parts.push(bytes[i].toString(16).padStart(2, '0'))
    return parts.join('')
  }
  if (head(0, 8) === '89504e470d0a1a0a') return 'image/png'
  if (head(0, 3) === 'ffd8ff') return 'image/jpeg'
  const riff = head(0, 4)
  const webp = head(8, 4)
  if (riff === '52494646' && webp === '57454250') return 'image/webp'
  if (riff === '47494638') return 'image/gif' // GIF87a / GIF89a
  return undefined
}

// Collect distinct durable attachment refs from a session event log. The event
// log is the only place that sees every image that entered the conversation.
// Handles the message-producing event types (`user/message` carries the
// message directly; `assistant/message` and `tool/result` nest it under
// `data.message`) and descends into nested `tool-result` content.
function collectAttachmentRefs(events) {
  const refs = []
  const seen = new Set()
  for (const event of events ?? []) {
    if (!event || !event.data) continue
    let message
    if (event.type === 'user/message') {
      message = event.data
    } else if (event.type === 'assistant/message' || event.type === 'tool/result') {
      message = event.data.message
    } else {
      continue
    }
    if (!message || !Array.isArray(message.content)) continue
    rewriteImagesDeep(message.content, (block) => {
      const attachment = block && block.attachment
      if (attachment && attachment.attachmentId && !seen.has(String(attachment.attachmentId))) {
        seen.add(String(attachment.attachmentId))
        refs.push(attachment)
      }
      return block
    })
  }
  return refs
}

// ---------- session cwd resolution ----------
// The harness does NOT populate `exec.agent.meta.cwd` (verified empty in web
// sessions); the opened workspace path lives on the session's durable header
// (`exec.agent.session.header.cwd`). Fall back across both so generated images
// and artifacts land in the program's opened workspace, not process.cwd().
function sessionCwd(exec) {
  const meta = exec && exec.agent && exec.agent.meta && exec.agent.meta.cwd ? exec.agent.meta.cwd : ''
  if (meta) return meta
  const s = exec && exec.agent && exec.agent.session
  if (s) {
    if (s.header && s.header.cwd) return s.header.cwd
    if (s.cwd) return s.cwd
  }
  return ''
}

// ---------- shared image resolution (analyze_image + vision toolkit) ----------
// Resolve `image_path` / `attachment_id` from tool args into image bytes + mime.
// Shared by analyze_image and the vision toolkit tools. Error messages are
// matched by the analyze-image-attachment tests (keep them stable).
async function resolveImage(exec, args) {
  const ctx = appCtx
  const attachmentId = String(args && args.attachment_id || '').trim()
  const imagePath = String(args && args.image_path || '').trim()
  if (!attachmentId && !imagePath) {
    throw new Error('必须提供 image_path（图片文件路径）或 attachment_id（上传图片的附件 id）之一')
  }
  let buffer
  let mime
  if (attachmentId) {
    const session = exec && exec.agent && exec.agent.session
    if (!session || !Array.isArray(session.events)) {
      throw new Error('当前执行上下文无会话事件日志，无法解析 attachment_id')
    }
    const ref = collectAttachmentRefs(session.events).find((r) => String(r.attachmentId) === String(attachmentId))
    if (!ref) throw new Error('未知附件 id "' + attachmentId + '"（必须来自本次对话中上传的图片）')
    const attachments = ctx.get('attachments')
    if (!attachments) throw new Error('附件服务不可用')
    const stored = await attachments.readImage(ref)
    buffer = stored && stored.data
    if (!buffer || buffer.length === 0) throw new Error('附件读取失败（无数据）')
    if (buffer.length > MAX_IMAGE_BYTES) throw new Error('附件超过 ' + Math.round(MAX_IMAGE_BYTES / 1024 / 1024) + 'MB')
    // 附件按内容寻址存储、无扩展名，必须嗅探魔数而非按扩展名判断。
    mime = sniffMediaType(new Uint8Array(buffer)) || 'image/png'
  } else {
    let resolved = imagePath
    const cwd = sessionCwd(exec) || undefined
    if (cwd && !/^[A-Za-z]:[\\/]/.test(imagePath) && !imagePath.startsWith('/') && !imagePath.startsWith('\\\\')) {
      resolved = join(cwd, imagePath)
    }
    try {
      buffer = readFileSync(resolved)
      if (buffer.length > MAX_IMAGE_BYTES) throw new Error('文件超过 ' + Math.round(MAX_IMAGE_BYTES / 1024 / 1024) + 'MB')
    } catch (e) {
      throw new Error('无法读取图片 "' + imagePath + '"：' + String(e && e.message || e))
    }
    mime = mimeFor(resolved)
  }
  return { buffer, mime }
}

// ---------- shared VLM ask (analyze_image + vision toolkit) ----------
// Run one image+question through the configured card failover chain and return
// the parsed answer plus metadata. Extracted from analyze_image's execute so
// ocr_image / detect_elements reuse the exact same request path. The image
// bytes may be Buffer or Uint8Array; downscale/re-encode fallbacks are lazy.
async function askVlm(ctx, buffer, mime, question, exec, opts = {}) {
  const cfg = await loadConfig(ctx)
  const signal = opts && opts.signal
  const bytes = Buffer.isBuffer(buffer)
    ? buffer
    : (buffer instanceof Uint8Array ? Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength) : Buffer.from(buffer))
  const isJpeg = mime === 'image/jpeg'
  const base64 = bytesToBase64(bytes)
  const dataUrl = 'data:' + mime + ';base64,' + base64
  const baseImage = { mime, base64, dataUrl }
  // Lazy downscale for keyless fallback providers: only computed when a
  // fallback card is tried, cached for the rest of this call.
  let dsImage = null
  let dsDone = false
  const getDs = () => {
    if (dsDone) return dsImage
    dsDone = true
    dsImage = downscaleImage(bytes)
    if (dsImage) console.log('[dsh-omni-workstation] Image downscaled for fallback provider')
    return dsImage
  }
  // Lazy JPEG→PNG re-encode: only computed on a 400/415 response, cached.
  let altImage = null
  let altDone = false
  const getAlt = () => {
    if (altDone) return altImage
    altDone = true
    try {
      altImage = reencodeJpegToPng(bytes)
    } catch (e) {
      console.error('[dsh-omni-workstation] JPEG 解码失败（重编码兜底不可用）：', String(e && e.message || e))
      altImage = null
    }
    return altImage
  }
  const outcome = await callWithFailover(ctx, cfg, (card, alt) => {
    var img = alt || baseImage
    // For keyless fallback providers (no apiKey), use downscaled image to avoid 413
    if (!card.apiKey && !alt) {
      var ds = getDs()
      if (ds) img = ds
    }
    const ec = effectiveCard(card)
    return {
      url: chatUrl(ec),
      headers: protocolHeaders(ec, true),
      body: protocolBody(ec, question, img.dataUrl, img.mime, img.base64)
    }
  }, signal, { isJpeg, getAlt })
  const body = outcome.res.body && typeof outcome.res.body === 'object' ? outcome.res.body : {}
  const answer = extractAnswer(outcome.card.protocol, body)
  // usage must be an object when present; omit the key otherwise (the output
  // schema marks it optional, and `null` fails the harness "must be an object"
  // validation).
  const usage = (body.usage && typeof body.usage === 'object' && !Array.isArray(body.usage)) ? body.usage : undefined
  return {
    text: answer,
    body,
    model: String(body.model || outcome.card.model || ''),
    api: String(outcome.card.name || 'unknown'),
    attempts: Number(outcome.attempts) || 1,
    usage
  }
}

// ---------- tool-result image stripping (token optimization) ----------
// A tool result that renders an image block (show_image) is persisted as a
// durable `tool/result` event and then flows into EVERY later request through
// `Session.deriveMessages()` — including compaction, which reads the session
// directly and bypasses agent/request. A text-only main model (pi-ai text
// routes) rejects such nested images with UNSUPPORTED_CONTENT and the session
// can stall forever. The fix has two layers, both run from an agent/pre-step
// listener:
//   1. shadow-sanitize historical `tool/result` events on the session surface
//      (`surfaceOp: {op:'replace'}`, the same mechanism the host compaction
//      pruner uses) so ANY later deriveMessages sees markers instead of images;
//   2. sanitize tool-result messages in the pre-step claimed messages.
// The Web UI transcript renders append-origin events, so the user still sees
// the image; only the model-visible surface is sanitized. User-message images
// are NOT touched (they are the admission-gated ones the harness allows).

function toolImageMarker(block) {
  const attachment = block && block.attachment ? block.attachment : {}
  const id = attachment.attachmentId || attachment.id || 'unknown'
  const name = attachment.name || 'tool image'
  return {
    type: 'text',
    text: '[工具结果中包含图片「' + name + '」，附件 id「' + id + '」。该图片未随本次请求发送以节省 token；如需查看其内容，请' + viewImageToolHint() + '（传入该附件 id 或对应图片路径）。]'
  }
}

// Recursively detect an image block anywhere in a content tree.
function blocksHaveImage(content) {
  if (!Array.isArray(content)) return false
  return content.some((b) => (b && b.type === 'image') || (Array.isArray(b && b.content) && blocksHaveImage(b.content)))
}

// Recursively freeze a plain structured-clone tree (the session log keeps its
// messages deep-frozen; replacements must match).
function deepFreezeLocal(value) {
  if (value !== null && typeof value === 'object') {
    for (const key of Object.keys(value)) deepFreezeLocal(value[key])
    Object.freeze(value)
  }
  return value
}

// Build the sanitized, deep-frozen copy of a tool-result message: identical to
// the original except that every image block (top-level or nested) is replaced
// with a text marker. Returns the original object when it has no image.
function sanitizeToolResultMessage(message) {
  if (!message || !Array.isArray(message.content)) return message
  const result = rewriteImagesDeep(message.content, toolImageMarker)
  if (!result.changed) return message
  const clone = structuredClone(message)
  clone.content = result.content
  return deepFreezeLocal(clone)
}

// Incrementally scan a session's surface for `tool/result` events whose message
// contains an image block, and shadow them with a sanitized replacement event
// so `Session.deriveMessages()` (normal requests AND compaction) yields markers.
// `session -> { count, done }` keeps the scan cheap across many turns.
const sessionSurfaceScans = new WeakMap()
function sanitizeSessionToolResults(session, logger) {
  if (!session) return
  let events
  let nodes
  try {
    events = session.events
    nodes = session.surface && session.surface.nodes
  } catch {
    return // not a host Session: nothing to sanitize
  }
  if (!Array.isArray(events) || !Array.isArray(nodes) || nodes.length === 0) return
  let scan = sessionSurfaceScans.get(session)
  if (!scan) {
    scan = { count: 0, done: new Set() }
    sessionSurfaceScans.set(session, scan)
  }
  // Compaction replaces the surface wholesale; a shrunk node list means the
  // positional cursor is stale, so restart from the head. Kept decisions are
  // memoized in `done`, so a restart is a cheap no-op for examined events.
  if (nodes.length < scan.count) {
    scan.count = 0
    scan.done = new Set()
  }
  if (nodes.length === scan.count) return
  const newSeqs = nodes.slice(scan.count)
  for (const seq of newSeqs) {
    const event = events[seq]
    if (!event || event.type !== 'tool/result' || scan.done.has(seq)) continue
    const message = event.data && event.data.message
    if (!message || !Array.isArray(message.content) || !blocksHaveImage(message.content)) {
      scan.done.add(seq)
      continue
    }
    const sanitized = sanitizeToolResultMessage(message)
    if (sanitized === message) {
      scan.done.add(seq)
      continue
    }
    try {
      session.append(
        'tool/result',
        { ...event.data, message: sanitized },
        {
          surfaceOp: { op: 'replace', start: seq, end: seq },
          sourceEventSeqs: [seq],
        },
      )
      scan.done.add(seq)
      logger?.info?.('omni-workstation: sanitized a tool-result image block out of the model surface (event seq %s)', seq)
    } catch (error) {
      // A failed shadow leaves the original event on the surface: the session
      // stays usable instead of crashing the step.
      logger?.warn?.('omni-workstation: could not sanitize tool-result image at event seq %s (%s)', seq, String(error && error.message || error))
    }
  }
  scan.count += newSeqs.length
}

// ---------- JPEG→PNG re-encode fallback ----------
// Some local servers (llama.cpp / stb_image) reject certain JPEG encodings
// with a 400 "Failed to load image or audio file" while PNG always decodes.
// Decode with the vendored jpeg-js decoder, re-encode as PNG with node:zlib.
function reencodeJpegToPng(buffer) {
  const img = jpegJs.decode(buffer, { useTArray: true, formatAsRGBA: true })
  const png = encodePng(img.data, img.width, img.height)
  const b64 = png.toString('base64')
  return { mime: 'image/png', base64: b64, dataUrl: 'data:image/png;base64,' + b64 }
}

// Downscale an image to fit within maxPixels (default 4MP) using nearest-neighbor
// sampling. Decodes any format jpeg-js can read (JPEG/PNG/etc), downscales, and
// re-encodes as PNG. Returns null if the image cannot be decoded or is already small.
const DOWNSCALE_MAX_PIXELS = 4000000
function downscaleImage(buffer) {
  try {
    const img = jpegJs.decode(buffer, { useTArray: true, formatAsRGBA: true })
    if (!img || !img.width || !img.height) return null
    var pixels = img.width * img.height
    if (pixels <= DOWNSCALE_MAX_PIXELS) return null // already small enough
    var scale = Math.sqrt(DOWNSCALE_MAX_PIXELS / pixels)
    var newW = Math.max(1, Math.round(img.width * scale))
    var newH = Math.max(1, Math.round(img.height * scale))
    var out = new Uint8Array(newW * newH * 4)
    for (var y = 0; y < newH; y++) {
      var srcY = Math.min(img.height - 1, Math.floor(y / scale))
      for (var x = 0; x < newW; x++) {
        var srcX = Math.min(img.width - 1, Math.floor(x / scale))
        var srcIdx = (srcY * img.width + srcX) * 4
        var dstIdx = (y * newW + x) * 4
        out[dstIdx] = img.data[srcIdx]
        out[dstIdx + 1] = img.data[srcIdx + 1]
        out[dstIdx + 2] = img.data[srcIdx + 2]
        out[dstIdx + 3] = img.data[srcIdx + 3]
      }
    }
    var png = encodePng(out, newW, newH)
    var b64 = png.toString('base64')
    return { mime: 'image/png', base64: b64, dataUrl: 'data:image/png;base64,' + b64, width: newW, height: newH }
  } catch (e) {
    return null
  }
}

// ---------- protocol-aware request building ----------
const trimBase = (s) => String(s || '').trim().replace(/\/+$/, '')

function chatUrl(card) {
  const base = trimBase(card.endpoint)
  if (!base) return ''
  switch (card.protocol) {
    case 'openai-completions':
      return /\/chat\/completions$/.test(base) ? base : base + '/chat/completions'
    case 'openai-responses':
      return /\/responses$/.test(base) ? base : base + '/responses'
    case 'anthropic-messages':
      if (/\/v1\/messages$/.test(base)) return base
      return /\/v1$/.test(base) ? base + '/messages' : base + '/v1/messages'
    case 'google-gemini':
      if (/\/models\/[^/]+:generateContent$/.test(base)) return base
      return base + '/models/' + encodeURIComponent(card.model || '') + ':generateContent'
    default:
      return base + '/chat/completions'
  }
}

function modelsUrl(card) {
  const base = trimBase(card.endpoint)
  if (!base) return ''
  if (card.provider === 'ollama') {
    // Ollama 的 OpenAI 兼容模型列表挂在 /v1/models
    if (/\/models$/.test(base)) return base
    return /\/v1$/.test(base) ? base + '/models' : base + '/v1/models'
  }
  if (/\/models$/.test(base)) return base
  if (/\/chat\/completions$/.test(base)) return base.replace(/\/chat\/completions$/, '/models')
  if (/\/responses$/.test(base)) return base.replace(/\/responses$/, '/models')
  if (/\/v1\/messages$/.test(base)) return base.replace(/\/v1\/messages$/, '/v1/models')
  if (card.protocol === 'anthropic-messages') {
    return /\/v1$/.test(base) ? base + '/models' : base + '/v1/models'
  }
  if (card.protocol === 'google-gemini') {
    return (/\/v1$/.test(base) || /\/v1beta$/.test(base)) ? base + '/models' : base + '/v1beta/models'
  }
  return base + '/models'
}

function protocolHeaders(card, withJson) {
  const h = { Accept: 'application/json' }
  if (withJson) h['Content-Type'] = 'application/json'
  switch (card.protocol) {
    case 'anthropic-messages':
      h['x-api-key'] = card.apiKey
      h['anthropic-version'] = '2023-06-01'
      break
    case 'google-gemini':
      h['x-goog-api-key'] = card.apiKey
      break
    default:
      if (card.apiKey) h.Authorization = 'Bearer ' + card.apiKey
  }
  return h
}

function protocolBody(card, question, dataUrl, mime, base64) {
  switch (card.protocol) {
    case 'openai-completions': {
      return {
        model: card.model,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: question },
            { type: 'image_url', image_url: { url: dataUrl } }
          ]
        }],
        max_tokens: card.maxOutput || 32768,
        stream: false
      }
    }
    case 'openai-responses':
      return {
        model: card.model,
        input: [{
          role: 'user',
          content: [
            { type: 'input_text', text: question },
            { type: 'input_image', image_url: dataUrl }
          ]
        }],
        max_output_tokens: card.maxOutput || 32768,
        store: false,
        stream: false
      }
    case 'anthropic-messages':
      return {
        model: card.model,
        max_tokens: card.maxOutput || 32768,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: question },
            { type: 'image', source: { type: 'base64', media_type: mime, data: base64 } }
          ]
        }]
      }
    case 'google-gemini':
      return {
        contents: [{
          role: 'user',
          parts: [
            { text: question },
            { inline_data: { mime_type: mime, data: base64 } }
          ]
        }],
        generationConfig: { maxOutputTokens: card.maxOutput || 32768 }
      }
    default:
      return null
  }
}

// ---------- protocol-aware response parsing ----------
function extractAnswer(protocol, body) {
  if (!body || typeof body !== 'object') return ''
  const textParts = (arr) => {
    if (!Array.isArray(arr)) return []
    return arr.filter((p) => p && typeof p.text === 'string' && p.text.length > 0).map((p) => p.text)
  }
  switch (protocol) {
    case 'anthropic-messages':
      return textParts(body.content).join('\n')
    case 'google-gemini':
      if (body.candidates && Array.isArray(body.candidates) && body.candidates[0] &&
          body.candidates[0].content && Array.isArray(body.candidates[0].content.parts)) {
        return textParts(body.candidates[0].content.parts).join('\n')
      }
      return ''
    case 'openai-responses': {
      if (typeof body.output_text === 'string' && body.output_text.length > 0) return body.output_text
      if (Array.isArray(body.output)) {
        const parts = []
        for (const item of body.output) {
          if (item && item.type === 'message' && Array.isArray(item.content)) {
            for (const c of item.content) {
              if (c && c.type === 'output_text' && typeof c.text === 'string' && c.text.length > 0) parts.push(c.text)
            }
          }
        }
        return parts.join('\n')
      }
      return ''
    }
    case 'openai-completions':
    default: {
      if (body.choices && Array.isArray(body.choices) && body.choices[0]) {
        const first = body.choices[0]
        const msg = first.message
        if (msg) {
          if (typeof msg.content === 'string' && msg.content.length > 0) return msg.content
          if (Array.isArray(msg.content)) {
            const parts = msg.content
              .filter((p) => p && p.type === 'text' && typeof p.text === 'string')
              .map((p) => p.text)
            if (parts.length > 0) return parts.join('\n')
          }
        }
        if (typeof first.text === 'string' && first.text.length > 0) return first.text
      }
      return ''
    }
  }
}

// ---------- failover (single-request, no sticky state) ----------
const RETRYABLE = new Set(['402', '408', '429', '500', '502', '503', '504', 'NET'])
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function callWithFailover(ctx, cfg, buildReq, signal, opts) {
  const cards = validCards(cfg)
  if (cards.length === 0 && !fallbackHasModels(cfg)) {
    throw new Error('analyze_image: 无可用 VLM 配置。请在 Web 设置页"多模态"中至少配置一张完整的 API 卡片（endpoint + model，自定义供应商还需 apiKey），或确保兜底模型列表不为空。')
  }
  const retryCount = cfg.retryCount
  const gc = cfg.globalConfig || defaultGlobalConfig()
  const retrySet = new Set(gc.retryStatusCodes.split(',').map(function (s) { return s.trim() }).filter(Boolean))
  let last = null
  // JPG→PNG re-encode fallback is attempted once per whole call (not per card).
  // `altImage` is shared across cards so the same image is never re-encoded twice.
  let altImage = null
  let altTried = false
  for (const card of cards) { // 每次调用都从列表顶部开始，无持久状态
    let attempts = 0
    while (true) {
      if (signal && signal.aborted) {
        const e = new Error('analyze_image: 请求已取消')
        e.name = 'AbortError'
        throw e
      }
      attempts += 1
      const req = buildReq(card, altImage)
      let res
      if (!req.url) {
        res = { ok: false, status: 'CFG', message: 'endpoint 未配置' }
      } else {
        try {
          res = await httpJson(req.url, 'POST', req.headers, req.body, clampTimeout(card.timeoutMs))
        } catch (e) {
          res = { ok: false, status: 'NET', message: String(e && e.message || e) }
        }
      }
      if (signal && signal.aborted) {
        const e = new Error('analyze_image: 请求已取消')
        e.name = 'AbortError'
        throw e
      }
      if (res.ok) {
        return { card, attempts, res, altImage }
      }
      last = { cardName: card.name, status: res.status, message: res.message, attempts }
      // JPG fallback: a 400/415 on a JPEG payload may be a server-side decode
      // failure (e.g. llama.cpp stb_image rejecting a specific JPG encoding).
      // Re-encode once to PNG and retry the same card immediately.
      if (!altTried && opts && opts.isJpeg && (res.status === 400 || res.status === 415)) {
        altTried = true
        if (opts.getAlt) {
          try {
            altImage = await opts.getAlt()
          } catch (e) {
            console.error('[dsh-omni-workstation] JPG→PNG re-encode failed:', String(e && e.message || e))
            altImage = null
          }
        }
        if (altImage) {
          last.fallback = true
          continue // 同卡立即用 PNG 重试一次（不计入退避）
        }
      }
      if (String(res.status) === 'TIMEOUT') break // 超时说明该卡太慢：直接回退下一张，不重试
      if (!retrySet.has(String(res.status))) break // 不可重试错误：直接回退下一张
      if (attempts >= retryCount) break // 单卡达到重试上限：回退下一张（或最后一张则报错中止）
      var is429 = String(res.status) === '429'
      await sleep(Math.min((is429 ? gc.backoff429Base : gc.backoffBase) * attempts, is429 ? gc.backoff429Max : gc.backoffMax))
    }
  }
  // --- Fallback models (keyless providers, used when all user cards fail) ---
  const fbCfg = cfg.fallbackConfig || defaultFallbackConfig()
  const fbMeta = FALLBACK_PROVIDERS[fbCfg.provider]
  if (fbMeta && Array.isArray(fbCfg.models) && fbCfg.models.length > 0) {
    for (const modelId of fbCfg.models) {
      let attempts = 0
      while (true) {
        if (signal && signal.aborted) { const e = new Error('analyze_image: 请求已取消'); e.name = 'AbortError'; throw e }
        attempts += 1
        const fbCard = { name: '兜底:' + modelId, provider: fbCfg.provider, protocol: fbMeta.protocol, endpoint: fbMeta.endpoint, apiKey: '', model: modelId, timeoutMs: fbCfg.timeoutMs, maxOutput: 32768 }
        const ec = effectiveCard(fbCard)
        const req = buildReq(ec, altImage)
        let res
        if (!req.url) {
          res = { ok: false, status: 'CFG', message: 'endpoint 未配置' }
        } else {
          try {
            res = await httpJson(req.url, 'POST', req.headers, req.body, clampTimeout(fbCard.timeoutMs, 120000))
          } catch (e) {
            res = { ok: false, status: 'NET', message: String(e && e.message || e) }
          }
        }
        if (signal && signal.aborted) { const e = new Error('analyze_image: 请求已取消'); e.name = 'AbortError'; throw e }
        if (res.ok) {
          return { card: fbCard, attempts, res, altImage, isFallback: true }
        }
        last = { cardName: '兜底:' + modelId, status: res.status, message: res.message, attempts }
        if (String(res.status) === 'TIMEOUT') break
        if (!retrySet.has(String(res.status))) break
        if (attempts >= retryCount) break
        var is429 = String(res.status) === '429'
        await sleep(Math.min((is429 ? gc.backoff429Base : gc.backoffBase) * attempts, is429 ? gc.backoff429Max : gc.backoffMax))
      }
    }
  }
  const suffix = altTried && altImage ? '（已尝试 JPG→PNG 重编码）' : ''
  const d = last
    ? '(' + (last.cardName || '未命名') + ' · ' + last.status + ' · ' + String(last.message).slice(0, 200) + '，尝试 ' + last.attempts + ' 次' + suffix + ')'
    : '(未知错误)'
  throw new Error('analyze_image: 所有 VLM API 均失败，单次请求内已按列表依次重试并回退：' + d)
}

// ---------- dynamic tool registration (hide when no valid card) ----------
let appCtx = null
let toolDisposer = null
let toolVisible = false
let imggenDisposer = null
let imggenVisible = false
let imggenComfyMode = false
// v2.8: video tool gate (registered only when videoEnabled && valid config)
let videoDisposer = null
let videoVisible = false
// v2.9: voice tools (speak + clone_voice) gate — registered only when voiceEnabled + ttsEnabled + valid voice config
let voiceDisposer = null, voiceVisible = false, voiceSigSeen = ''
let cloneDisposer = null, cloneVisible = false
// v2.8.x: track the panel-default signature injected into the tool description;
// changing seconds/aspectRatio/retryCount re-registers so the model sees fresh
// initial defaults (user prompt overrides always win).
let videoSigSeen = ''
// v2.7.2: analyze_image is gated on the VLM module switch; when unregistered,
// image markers must point at the vision toolkit (whose local tools and
// card-backed ocr/detect both work with the VLM module off) instead of a dead
// tool reference.
const viewImageToolHint = () => toolVisible
  ? '调用 analyze_image 工具'
  : '调用视觉工具箱工具（zoom_image 局部放大 / sample_colors 取色 / image_diff 对比 / ocr_image 文字识别 / detect_elements 元素检测，均不依赖 VLM 开关）'
// vision toolkit tools (zoom/sample_colors/image_diff/ocr/detect/show).
// Registered via buildVisionToolDefs when visionToolsEnabled is on; gated
// independently of vlmEnabled because the local-only tools need no cards.
let visionToolDisposers = []
let visionToolsVisible = false
let visionToolDefNames = ''
// test-only: reset vision toolkit registration state so tests start clean
function _resetVisionTools() {
  for (const dispose of visionToolDisposers) {
    try { dispose() } catch { /* best-effort */ }
  }
  visionToolDisposers = []
  visionToolDefNames = ''
  visionToolsVisible = false
}
// provider -> { handle } disposer handles of registered `<provider>-omni-workstation`
// twin routes (the "+ Auto Vision" picker entries gated on the VLM switch).
const twinHandles = new Map()
// v1.8: the last source provider/model used by the agent (tracked via
// agent/request). syncTwins wraps ONLY this provider (one twin, not one
// per provider) so the picker grows by +1 entry instead of doubling.
let lastSourceProvider = null
let lastSourceModel = null
// test-only: reset v1.8 module state so tests start from a clean default
function _resetLastSource() { lastSourceProvider = null; lastSourceModel = null }
// test-only: set v1.8 module state so wrapper tests can drive stream delegation
function _setLastSource(provider, model) { lastSourceProvider = provider; lastSourceModel = model }

const toolDef = defineTool({
  name: 'analyze_image',
  description: '分析本地图片并回答问题。传入图片路径和分析需求即可。',
  parameters: {
    image_path: { type: 'string', description: '要分析的图片文件的本地路径（绝对路径，或相对当前工作目录的路径）。与 attachment_id 二选一。' },
    attachment_id: { type: 'string', description: '上传图片的附件 id（形如 "sha256:..."，用户在对话中上传图片后获得）。与 image_path 二选一；同时给出时以 attachment_id 为准。' },
    question: { type: 'string', required: true, description: '你想从图片中了解什么（分析需求）。例如"这张图表反映了什么趋势？"、"这个页面上有哪些元素？"' }
  },
  output: {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        ok: { type: 'boolean', required: true },
        answer: { type: 'string' },
        model: { type: 'string' },
        api: { type: 'string' },
        attempts: { type: 'number' },
        usage: { type: 'object', additionalProperties: true }
      }
    },
    render: (args, value) => [{
      type: 'text',
      text: value && value.ok
        ? '## 图像分析结果\n\n' + (value.answer || '') + '\n\n— 模型: ' + (value.model || '未知') + ' · 卡片: ' + (value.api || '未知') + ' · 尝试: ' + value.attempts + ' 次'
        : '图像分析失败：' + (value ? (value.detail || JSON.stringify(value)) : '未知错误')
    }]
  },
  async execute(args, exec) {
    const ctx = appCtx
    const question = String(args && args.question || '').trim()
    if (!question) throw new Error('analyze_image: 缺少参数 question（你想从图片中了解什么）')
    const signal = exec && exec.signal ? exec.signal : undefined
    // 图片来源与请求管线已提取为共享 resolveImage / askVlm（vision toolkit 复用）。
    const { buffer, mime } = await resolveImage(exec, args)
    const result = await askVlm(ctx, buffer, mime, question, exec, { signal })
    const ret = {
      ok: true,
      answer: result.text || '(VLM 未返回文本内容。原始响应：' + String(JSON.stringify(result.body || {})).slice(0, 1500) + ')',
      model: result.model,
      api: result.api,
      attempts: result.attempts
    }
    if (result.usage !== undefined) {
      try { ret.usage = JSON.parse(JSON.stringify(result.usage)) } catch { /* skip non-serializable usage */ }
    }
    return ret
  }
})

// ---------- imggen (image generation) tool ----------
function extractImggenImages(protocol, body) {
  if (!body || typeof body !== 'object') return []
  if (protocol === 'openai-completions') {
    const out = []
    const content = body.choices && body.choices[0] && body.choices[0].message && body.choices[0].message.content
    if (Array.isArray(content)) {
      for (const item of content) {
        if (item && item.type === 'image_url' && item.image_url && typeof item.image_url.url === 'string') {
          const url = item.image_url.url
          if (url.startsWith('data:')) {
            const m = url.match(/^data:[^;]+;base64,(.+)$/)
            if (m) out.push({ b64_json: m[1] })
          } else {
            out.push({ url })
          }
        }
      }
    }
    return out
  }
    if (protocol === 'dashscope-image') {
      const out = []
      // async task response: { output: { choices: [{ message: { content: [{ image: 'url' }] } }] } }
      const choices = body && body.output && Array.isArray(body.output.choices) ? body.output.choices : []
      for (const ch of choices) {
        const content = ch && ch.message && Array.isArray(ch.message.content) ? ch.message.content : []
        for (const item of content) {
          if (item && typeof item.image === 'string' && item.image) out.push({ url: item.image })
          if (item && typeof item.b64_json === 'string') out.push({ b64_json: item.b64_json })
        }
      }
      // fallback: { output: { results: [{ url: '...' }] } }
      const results = body && body.output && Array.isArray(body.output.results) ? body.output.results : []
      for (const r of results) {
        if (r && typeof r.url === 'string') out.push({ url: r.url })
      }
      return out
    }
  // openai-images
  if (!Array.isArray(body.data)) return []
  return body.data
    .filter((d) => d && typeof d === 'object')
    .map((d) => ({ b64_json: typeof d.b64_json === 'string' ? d.b64_json : undefined, url: typeof d.url === 'string' ? d.url : undefined }))
    .filter((d) => d.b64_json !== undefined || d.url !== undefined)
}

async function fetchImageBuffer(url, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    return Buffer.from(await res.arrayBuffer())
  } finally {
    clearTimeout(timer)
  }
}

// ---------- ComfyUI (v2.5) : default workflow + helpers ----------
// Built-in ComfyUI default workflow in API format (node ids match the webui
// template: 3 KSampler, 4 CheckpointLoaderSimple, 5 EmptyLatentImage,
// 6/7 CLIPTextEncode positive/negative, 8 VAEDecode, 9 SaveImage).
// v2.6: custom workflows are also supported — API format (paste) or standard
// UI format (file import, converted via the server's /object_info).
const comfyDefaultWorkflow = () => ({
  '3': { class_type: 'KSampler', inputs: { seed: Math.floor(Math.random() * 1125899906842624), steps: 20, cfg: 8, sampler_name: 'euler', scheduler: 'normal', denoise: 1, model: ['4', 0], positive: ['6', 0], negative: ['7', 0], latent_image: ['5', 0] } },
  '4': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: '' } },
  '5': { class_type: 'EmptyLatentImage', inputs: { width: 1024, height: 1024, batch_size: 1 } },
  '6': { class_type: 'CLIPTextEncode', inputs: { text: '', clip: ['4', 1] } },
  '7': { class_type: 'CLIPTextEncode', inputs: { text: 'text, watermark', clip: ['4', 1] } },
  '8': { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['4', 2] } },
  '9': { class_type: 'SaveImage', inputs: { filename_prefix: 'ComfyUI', images: ['8', 0] } }
})

// Convert a standard ComfyUI UI-format workflow ({nodes, links}) into API
// format using the server's /object_info for widget name ordering. Ported from
// the reference ComfyUI_Web_App comfyToApiFormat core (MVP: no combo coercion,
// no UI-only-node set — objectInfo existence covers custom UI-only nodes).
function comfyUiToApi(ui, objectInfo) {
  const links = Array.isArray(ui.links) ? ui.links : []
  const prompt = {}
  const findLink = (id) => links.find((l) => l && l[0] === id)
  for (const node of Array.isArray(ui.nodes) ? ui.nodes : []) {
    if (!node || typeof node !== 'object' || node.mode === 4 || node.mode === 2) continue
    if (objectInfo && !objectInfo[node.type]) continue
    const inputs = {}
    if (Array.isArray(node.inputs)) {
      for (let i = 0; i < node.inputs.length; i++) {
        const input = node.inputs[i]
        if (!input) continue
        let link = null
        if (typeof input.link === 'number') link = findLink(input.link)
        if (!link && node.id != null) link = links.find((l) => String(l[3]) === String(node.id) && l[4] === i)
        if (link && link[1] != null && link[2] != null) {
          inputs[input.name] = [String(link[1]), link[2]]
        }
      }
    }
    // Map widgets_values onto input names using object_info order.
    if (Array.isArray(node.widgets_values) && node.widgets_values.length > 0) {
      let names = []
      const def = objectInfo && objectInfo[node.type]
      if (def && def.input) {
        const all = Object.assign({}, def.input.required || {}, def.input.optional || {})
        names = Object.keys(all)
      } else {
        // fallback: names carried on the input entries (input.widget.name)
        for (const input of Array.isArray(node.inputs) ? node.inputs : []) {
          if (input && input.widget && typeof input.widget.name === 'string') {
            names.push(input.widget.name)
            if (input.widget.name === 'seed' || input.widget.name === 'noise_seed') names.push(null)
          }
        }
      }
      let wi = 0
      for (const name of names) {
        if (wi >= node.widgets_values.length) break
        if (name === null) { wi++; continue } // control_after_generate placeholder
        // linked inputs are NOT widgets: they don't consume a widgets_values slot
        if (name in inputs) continue
        let value = node.widgets_values[wi]
        // normalize 'randomize' seed placeholder to a numeric seed
        if (name === 'seed' && value === 'randomize') value = Math.floor(Math.random() * 1125899906842624)
        inputs[name] = value
        wi++
        // seed/noise_seed are immediately followed by a frontend-only
        // control_after_generate widget value that is NOT in object_info
        if (name === 'seed' || name === 'noise_seed') wi++
      }
    }
    prompt[String(node.id)] = { class_type: node.type, inputs }
  }
  const hasImageOutput = Object.values(prompt).some((n) => n && (n.class_type === 'SaveImage' || n.class_type === 'PreviewImage'))
  if (!hasImageOutput) throw new Error('工作流缺少 SaveImage / PreviewImage 输出节点，无法取回图像')
  return prompt
}

// Detect the standard node mapping from an API-format prompt.
function detectComfyMapping(api) {
  const sampler = Object.keys(api).find((k) => api[k] && (api[k].class_type === 'KSampler' || api[k].class_type === 'KSamplerAdvanced'))
  const checkpoint = Object.keys(api).find((k) => api[k] && (api[k].class_type === 'CheckpointLoaderSimple' || api[k].class_type === 'CheckpointLoader'))
  // v2.8: UNETLoader (standalone diffusion model, e.g. ANIMA) is an alternative model loader
  const unet = Object.keys(api).find((k) => api[k] && (api[k].class_type === 'UNETLoader' || api[k].class_type === 'UNETLoaderGGUF'))
  const vae = Object.keys(api).find((k) => api[k] && api[k].class_type === 'VAELoader')
  const clip = Object.keys(api).find((k) => api[k] && api[k].class_type === 'CLIPLoader')
  const latent = Object.keys(api).find((k) => api[k] && (api[k].class_type === 'EmptyLatentImage' || api[k].class_type === 'EmptySD3LatentImage'))
  const missing = []
  if (!sampler) missing.push('采样器(KSampler)')
  // v2.8: a workflow needs a model loader — either Checkpoint OR UNET counts.
  if (!checkpoint && !unet) missing.push('模型加载器(Checkpoint 或 UNETLoader)')
  if (!latent) missing.push('空Latent(EmptyLatentImage)')
  if (missing.length > 0) throw new Error('工作流缺少必需节点：' + missing.join('、'))
  let positive = sampler
  let negative = sampler
  if (api[sampler] && api[sampler].inputs) {
    if (Array.isArray(api[sampler].inputs.positive)) positive = String(api[sampler].inputs.positive[0])
    if (Array.isArray(api[sampler].inputs.negative)) negative = String(api[sampler].inputs.negative[0])
  }
  // v2.8: return all detected loader ids (may be undefined). checkpoint stays as the
  // canonical key for CheckpointLoaderSimple; unet/vae/clip are new.
  return { sampler, checkpoint, unet, vae, clip, latent, positive, negative }
}

// Extract steps/cfg/scheduler/seed from the KSampler node's widget inputs.
// Linked inputs (arrays like ["6", 0]) → '' — can't override a linked value.
function extractComfyBasicConfig(api, mapping) {
  const empty = { steps: '', cfg: '', scheduler: '', seed: '' }
  if (!api || !mapping || !mapping.sampler || !api[mapping.sampler] || !api[mapping.sampler].inputs) return empty
  const inputs = api[mapping.sampler].inputs
  const num = (v) => typeof v === 'number' ? v : ''
  const str = (v) => typeof v === 'string' ? v : ''
  return {
    steps: num(inputs.steps),
    cfg: num(inputs.cfg),
    scheduler: str(inputs.scheduler),
    seed: num(inputs.seed)
  }
}

// Parse raw pasted/imported workflow text -> { api, mapping, format }.
async function prepareComfyWorkflow(raw, endpoint) {
  let obj = null
  try { obj = JSON.parse(raw) } catch (e) { throw new Error('工作流不是合法 JSON：' + String(e && e.message || e).slice(0, 120)) }
  if (!obj || typeof obj !== 'object') throw new Error('工作流 JSON 必须是对象')
  if (Array.isArray(obj.nodes)) {
    // standard UI format: needs /object_info from the server
    const base = String(endpoint || '').trim().replace(/\/+$/, '')
    if (!base) throw new Error('标准格式工作流需要先填写 ComfyUI 端点 URL（用于获取节点定义）')
    const r = await httpJson(base + '/object_info', 'GET', { Accept: 'application/json' }, undefined, 30000)
    if (!r.ok || !r.body || typeof r.body !== 'object') throw new Error('获取 /object_info 失败（HTTP ' + r.status + '），无法解析标准工作流')
    const api = comfyUiToApi(obj, r.body)
    return { api, mapping: detectComfyMapping(api), format: 'ui' }
  }
  // API format: { nodeId: { class_type, inputs } }
  const api = {}
  for (const [id, n] of Object.entries(obj)) {
    if (n && typeof n === 'object' && typeof n.class_type === 'string') api[id] = n
  }
  if (Object.keys(api).length === 0) throw new Error('既不是 API 格式（缺少 class_type），也不是标准格式（缺少 nodes 数组）')
  return { api, mapping: detectComfyMapping(api), format: 'api' }
}

function comfyWsUrl(base) {
  const b = String(base || '').trim()
  if (!/^https?:\/\//i.test(b)) return ''
  const ws = /^https:/i.test(b) ? 'wss' : 'ws'
  return ws + '://' + b.replace(/^https?:\/\//i, '')
}

// Read one history entry: { ok:true, images:[{filename,subfolder,type}] } when
// done; { ok:false, status:'PENDING' } while still queued/running; or
// { ok:false, status:'COMFY_ERROR', message } on execution_error.
async function comfyHistoryImages(base, headers, promptId, timeoutMs) {
  const res = await httpJson(base + '/history/' + encodeURIComponent(promptId), 'GET', headers, undefined, timeoutMs)
  if (!res.ok || !res.body || typeof res.body !== 'object') {
    return { ok: false, status: 'PENDING', message: res.message }
  }
  const entry = res.body[promptId]
  if (!entry || !entry.outputs) return { ok: false, status: 'PENDING' }
  if (entry.status && entry.status.status_str === 'error') {
    const msgs = Array.isArray(entry.status.messages) ? entry.status.messages : []
    const err = msgs.find((m) => Array.isArray(m) && m[0] === 'execution_error')
    const emsg = err && err[1] ? (err[1].exception_message || err[1].message || '') : ''
    return { ok: false, status: 'COMFY_ERROR', message: emsg || 'ComfyUI 执行错误' }
  }
  const images = []
  for (const out of Object.values(entry.outputs)) {
    if (out && Array.isArray(out.images)) {
      for (const img of out.images) {
        if (img && typeof img.filename === 'string') {
          images.push({ filename: img.filename, subfolder: img.subfolder || '', type: img.type || 'output' })
        }
      }
    }
  }
  // entry exists but produced no images yet → still queued/running
  if (images.length === 0) return { ok: false, status: 'PENDING' }
  return { ok: true, images }
}

// Wait for a prompt to finish: WebSocket acts only as a "wake up" signal (the
// single source of truth is always /history), so any WS failure silently
// degrades to pure HTTP polling. On timeout, fire-and-forget POST /interrupt.
async function comfyWaitResult(base, headers, promptId, clientId, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  let ws = null
  let wake = false
  let wsOk = false
  if (typeof WebSocket !== 'undefined') {
    try {
      ws = new WebSocket(comfyWsUrl(base) + '/ws?clientId=' + encodeURIComponent(clientId))
      wsOk = await new Promise((resolve) => {
        const t = setTimeout(() => { try { ws.close() } catch { /* ignore */ }; resolve(false) }, 2500)
        ws.onopen = () => { clearTimeout(t); resolve(true) }
        ws.onerror = () => { clearTimeout(t); resolve(false) }
        ws.onmessage = (ev) => {
          let msg = null
          try { msg = JSON.parse(typeof ev.data === 'string' ? ev.data : '') } catch { return } // binary frame
          if (!msg || typeof msg !== 'object') return
          if (msg.type === 'execution_complete' || msg.type === 'execution_error' || msg.type === 'execution_interrupted') wake = true
          if (msg.type === 'executing' && msg.data && msg.data.node === null) wake = true
        }
      })
    } catch {
      wsOk = false
    }
  }
  try {
    const interval = 1500
    let nextPoll = Date.now()
    for (;;) {
      if (wake || Date.now() >= nextPoll) {
        const r = await comfyHistoryImages(base, headers, promptId, 15000)
        if (r.ok) return r
        if (r.status === 'COMFY_ERROR') return r
        wake = false
        nextPoll = Date.now() + interval
      }
      if (Date.now() >= deadline) {
        // fire-and-forget interrupt so the server doesn't keep rendering
        try { await httpJson(base + '/interrupt', 'POST', headers, {}, 5000) } catch { /* best-effort */ }
        return { ok: false, status: 'COMFY_TIMEOUT', message: 'ComfyUI 队列+渲染超时（' + Math.round(timeoutMs / 1000) + 's，已发送 /interrupt）' }
      }
      await sleep(200)
    }
  } finally {
    try { if (ws) ws.close() } catch { /* ignore */ }
  }
}

// Compose a readable submit error from the /prompt 4xx body (error + node_errors).
function comfySubmitError(res) {
  const body = res && res.body && typeof res.body === 'object' ? res.body : {}
  const parts = []
  if (body.error) {
    parts.push(body.error.message || body.error.type || 'ComfyUI 工作流验证失败')
  }
  if (body.node_errors && typeof body.node_errors === 'object') {
    for (const [nodeId, ne] of Object.entries(body.node_errors)) {
      const details = Array.isArray(ne && ne.errors) ? ne.errors.map((e) => e.details || e.message).filter(Boolean).join('; ') : ''
      parts.push('节点 ' + nodeId + ' (' + (ne.class_type || '') + '): ' + details)
    }
  }
  return parts.join('；') || String(res.message || '').slice(0, 300)
}

// v2.6: the generate_image tool description is built dynamically — ComfyUI gets
// backend-specific guidance only when it is the active provider.
const COMFY_TOOL_HINT = '\n\n【ComfyUI 专用指引】当前生图后端为 ComfyUI：① prompt 必须用英文关键词短语、逗号分隔（SD 风格），如 "a orange cat, sitting on windowsill, sunny, detailed"，不要写长句；② size 用 8 的倍数，SDXL 推荐 1024x1024（竖图 832x1216，横图 1216x832）；③ 参数 n 映射为 batch_size；④ 模型已在配置面板选定（服务器 checkpoint），无需也不能在 prompt 中指定模型。'
const buildImggenToolDef = (comfy) => defineTool({
  name: 'generate_image',
  description: '生成图片并保存到指定目录，返回文件路径。prompt 描述图片内容，output_dir 指定保存目录（不指定则保存到工作区根目录）。' + (comfy ? COMFY_TOOL_HINT : ''),
  parameters: {
    prompt: { type: 'string', required: true, description: '图像生成提示词：详细描述想生成的图片内容、风格、构图、色调等' },
    size: { type: 'string', description: '图片尺寸，如 1024x1024 / 1792x1024；留空用模型默认' },
    n: { type: 'number', description: '生成图片数量，默认 1' },
      reference_image: { type: 'string', description: '参考图路径（可选）。传入后以图生图模式生成。' },
    output_dir: { type: 'string', description: '保存目录，绝对路径或相对当前工作区的相对路径。不指定则保存到当前工作区根目录。根据项目情况选择合适位置，如游戏引擎资产目录、项目素材目录等。' }
  },
  output: {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        ok: { type: 'boolean', required: true },
        paths: { type: 'array', items: { type: 'string' } },
        model: { type: 'string' },
        attempts: { type: 'number' },
        detail: { type: 'string' },
        verifyReminder: { type: 'boolean' }
      }
    },
    render: (args, value) => {
      if (!value || !value.ok) {
        return [{ type: 'text', text: '图像生成失败：' + (value && value.detail ? value.detail : JSON.stringify(value || {})) }]
      }
      var paths = value.paths || []
      var imgs = paths.map(function (p) { return '![Generated Image](file:///' + String(p).replace(/\\/g, '/') + ')' })
      var text = '## 图像生成结果\n\n' + imgs.join('\n\n') + '\n\n— 模型: ' + (value.model || '未知') + ' · 尝试: ' + value.attempts + ' 次\n保存位置: ' + paths.join(', ')
      if (value.verifyReminder) {
        text += '\n\n⚠️ 必须立即使用 analyze_image 工具验证此图片：传入图片路径 "' + (paths[0] || '') + '" 和验证问题，检查是否符合用户需求。不符合则调整 prompt 重新生成。'
      }
      return [{ type: 'text', text: text }]
    }
  },
  async execute(args, exec) {
    const prompt = String(args && args.prompt || '').trim()
    if (!prompt) throw new Error('generate_image: 缺少参数 prompt（图像描述）')
    const size = args && args.size ? String(args.size).trim() : undefined
    const n = Math.max(1, Math.min(Math.floor(Number(args && args.n) || 1), 4))
    const refImage = args && args.reference_image ? String(args.reference_image).trim() : ''
    const ctx = appCtx
    const cfg = await loadConfig(ctx)
    const igc = cfg.imggenConfig || defaultImggenConfig()
    if (!isImggenConfigValid(igc)) {
      throw new Error('generate_image: 生图配置无效。请在设置页「生图」面板配置完整的 API（供应商 + 端点 + Key + 模型）。')
    }
    // v2.5: resolve output dir BEFORE any API call — never fall back to
    // process.cwd(); output must land in the program's opened workspace.
    // v2.6.1: harness leaves agent.meta.cwd empty; read the session header cwd.
    const agentCwd = sessionCwd(exec)
    const rawOut = args && args.output_dir && String(args.output_dir).trim() ? String(args.output_dir).trim() : ''
    let imgDir
    if (rawOut) {
      imgDir = /^[A-Za-z]:[\\/]/.test(rawOut) || rawOut.startsWith('\\\\') || rawOut.startsWith('/') ? rawOut : (agentCwd ? join(agentCwd, rawOut) : rawOut)
    } else if (agentCwd) {
      imgDir = agentCwd
    } else {
      throw new Error('generate_image: 无法确定输出目录（未提供 output_dir 且当前会话无工作区路径）。请显式传入 output_dir。')
    }
    const meta = PROVIDERS[igc.provider]
    let endpoint = meta && meta.fixedUrl ? meta.endpoint : igc.endpoint
    // ComfyUI base (also used by the /view download step below); empty for other protocols
    let cfBase = ''
    const protocol = igc.protocol
    // openai 族协议要求 /v1 前缀（如 agnes-ai.cn 无 /v1 路径会被 Cloudflare 403）
    if ((protocol === 'openai-images' || protocol === 'openai-completions') && !/\/v[0-9]+$/.test(String(endpoint || ''))) {
      endpoint = endpoint + '/v1'
    }
    // default path per protocol
    const defaultPath = protocol === 'openai-completions' ? '/chat/completions' : '/images/generations'
    const apiPath = (igc.apiPath || '').trim() || defaultPath
    const url = String(endpoint || '').trim().replace(/\/+$/, '') + (apiPath.startsWith('/') ? apiPath : '/' + apiPath)
    const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' }
    if (igc.apiKey) headers.Authorization = 'Bearer ' + igc.apiKey
    let body
    const attempts0 = Math.max(1, Math.min(igc.retryCount || 2, 10))
    let last = null
    if (protocol === 'dashscope-image') {
      // DashScope native API: convert URL from /compatible-mode/v1 to /api/v1/services/aigc/image-generation/generation
      const dsBaseRaw = String(endpoint || '').trim().replace(/\/+$/, '')
      // ws-*.maas.aliyuncs.com workspace 专属端点拒绝所有 /api/v1/* 原生路径（403 Endpoint.AccessDenied "Workspace endpoint access denied."）；
      // 同一 workspace key 在标准域名 dashscope.aliyuncs.com 上可用，故将 host 重写为标准域名（2026-08 实测验证）。
      const dsWsHost = /^(https?:\/\/)[^/]+\.maas\.aliyuncs\.com(?:[/?#]|$)/i.exec(dsBaseRaw)
      let dsBase = dsWsHost
        ? dsWsHost[1] + 'dashscope.aliyuncs.com/api/v1'
        : /\/compatible-mode\/v[0-9]+$/.test(dsBaseRaw)
          ? dsBaseRaw.replace(/\/compatible-mode\/v[0-9]+$/, '/api/v1')
          : /\/api\/v[0-9]+$/.test(dsBaseRaw)
            ? dsBaseRaw
            : /\/v[0-9]+$/.test(dsBaseRaw)
              ? dsBaseRaw.replace(/\/v[0-9]+$/, '/api/v1')
              : dsBaseRaw + '/api/v1'
      const dsUrl = dsBase + '/services/aigc/image-generation/generation'
      const dsHeaders = Object.assign({}, headers, { 'X-DashScope-Async': 'enable' })
      const contentParts = []
      // reference image (optional): read file -> base64 data URL, placed BEFORE the text prompt (interleave)
      if (refImage) {
        try {
          let refPath = refImage
          const cwd = sessionCwd(exec) || undefined
          if (cwd && !/^[A-Za-z]:[\\/]/.test(refPath) && !refPath.startsWith('/') && !refPath.startsWith('\\\\')) {
            refPath = join(cwd, refPath)
          }
          const rb = readFileSync(refPath)
          contentParts.push({ image: 'data:' + mimeFor(refPath) + ';base64,' + rb.toString('base64') })
        } catch (e) { /* best-effort: skip invalid reference image */ }
      }
      contentParts.push({ text: prompt })
      const isWan = String(igc.model || '').toLowerCase().startsWith('wan2.')
      // DashScope requires W*H separator; normalize any WxH/W*H/W×H from the AI
      const dsSize = parseSizePair(size)
      const dsBody = { model: igc.model, input: { messages: [{ role: 'user', content: contentParts }] }, parameters: { n: n, size: dsSize ? dsSize.width + '*' + dsSize.height : '1280*1280' } }
      // wan2.x 文生图需 enable_interleave；参考图模式亦无条件开启（与百炼参考协议一致）
      if (isWan || refImage) dsBody.parameters.enable_interleave = true
      // async task: submit, then poll /api/v1/tasks/{task_id} — budget follows user timeoutMs (default 300s≈100 polls; 600s→200 polls)
      const pollIntervalMs = 3000
      const pollBudgetMs = clampTimeout(igc.timeoutMs, 300000)
      const maxPolls = Math.max(1, Math.ceil(pollBudgetMs / pollIntervalMs))
      const pollReqTimeout = Math.min(pollBudgetMs, 60000)
      for (let attempt = 1; attempt <= attempts0; attempt++) {
        const submitRes = await httpJson(dsUrl, 'POST', dsHeaders, dsBody, clampTimeout(igc.timeoutMs, 300000))
        const taskId = submitRes.ok && submitRes.body && submitRes.body.output && submitRes.body.output.task_id
          ? submitRes.body.output.task_id
          : null
        if (!taskId) {
          last = { data: [], status: submitRes.status, message: submitRes.message }
          if (submitRes.status === 'TIMEOUT') break
          if (attempt < attempts0) await sleep(Math.min(800 * attempt, 4000))
          continue
        }
        const taskUrl = dsBase + '/tasks/' + taskId
        let pollSuccess = false, lastStatus = 'PENDING', lastErr = null, consecErr = 0
        for (let poll = 0; poll < maxPolls; poll++) {
          await sleep(pollIntervalMs)
          const pollRes = await httpJson(taskUrl, 'GET', { Accept: 'application/json', Authorization: 'Bearer ' + (igc.apiKey || '') }, null, pollReqTimeout)
          const pollBody = pollRes.body
          if (!pollRes.ok || !pollBody || typeof pollBody !== 'object') {
            // poll channel failure (HTTP error / 200 + non-JSON anti-bot page): record and fail fast after 5 consecutive
            lastErr = 'HTTP ' + pollRes.status + ': ' + String(pollRes.message || '').slice(0, 200)
            if (++consecErr >= 5) break
            continue
          }
          consecErr = 0
          const pollOutput = pollBody.output || null
          const st = pollOutput && pollOutput.task_status ? pollOutput.task_status : 'UNKNOWN'
          lastStatus = st
          if (st === 'SUCCEEDED') {
            last = { data: extractImggenImages('dashscope-image', pollRes.body), bodyModel: (pollOutput.model || igc.model) }
            pollSuccess = true
            break
          }
          if (st === 'FAILED' || st === 'CANCELED') {
            last = { data: [], status: 200, message: 'DashScope 任务 ' + st + ': ' + (pollOutput.message || '') }
            pollSuccess = true
            break
          }
        }
        if (pollSuccess) break
        if (lastErr && consecErr >= 5) {
          last = { data: [], status: 'POLL_ERROR', message: 'DashScope 任务轮询连续失败（' + consecErr + ' 次）: ' + lastErr }
        } else {
          last = { data: [], status: 'POLL_TIMEOUT', message: 'DashScope 任务轮询超时（' + Math.round(maxPolls * pollIntervalMs / 1000) + ' 秒未完成，最后状态: ' + lastStatus + '）' }
        }
        break
      }
    } else if (protocol === 'comfyui-image') {
      // ComfyUI: submit API-format workflow -> WebSocket-wake / HTTP-poll /history -> /view bytes.
      // Auth MVP: empty key = no auth; non-empty key = Bearer (proxy-level). Custom headers later.
      // A prompt is submitted at most once: retry only waits again on the SAME
      // prompt (de-dup), so a slow-but-finished task is never re-queued.
      cfBase = String(igc.endpoint || '').trim().replace(/\/+$/, '')
      const cfHeaders = { 'Content-Type': 'application/json', Accept: 'application/json', ...(igc.apiKey ? { Authorization: 'Bearer ' + igc.apiKey } : {}) }
      const cfSize = parseSizePair(size) || { width: 1024, height: 1024 }
      let lastPromptId = null
      let lastClientId = null
      let cfDetail = ''
      for (let attempt = 1; attempt <= attempts0; attempt++) {
        if (lastPromptId) {
          // already submitted: wait again on the SAME prompt, never re-POST
          const result = await comfyWaitResult(cfBase, cfHeaders, lastPromptId, lastClientId, clampTimeout(igc.timeoutMs, 600000))
          if (result.ok) {
            last = { data: result.images.map((i) => ({ comfy: i })), bodyModel: igc.model }
            cfDetail = refImage ? '（ComfyUI 默认工作流暂不支持参考图，已忽略）' : ''
          } else {
            last = { data: [], status: result.status, message: result.message }
          }
          break // wait outcome is final — do not re-submit the same prompt
        }
        // v2.7: read active workflow from comfyWorkflows[] list, inject prompt/size/seed
        // + steps/cfg/scheduler from basic config. Empty seed = random.
        let wf = comfyDefaultWorkflow()
        const awf = (cfg.comfyWorkflows || []).find((w) => w.id === cfg.activeComfyWorkflow)
        const rawWf = awf && typeof awf.workflow === 'string' && awf.workflow.trim() ? awf.workflow.trim() : ''
        if (rawWf) {
          try { wf = JSON.parse(rawWf) } catch { wf = comfyDefaultWorkflow(); cfDetail = '（自定义工作流 JSON 解析失败，已回退默认工作流）' }
        }
        const mp = (awf && awf.mapping && typeof awf.mapping === 'object')
          ? awf.mapping
          : { sampler: '3', checkpoint: '4', latent: '5', positive: '6', negative: '7' }
        const inj = (id) => wf[id] && wf[id].inputs ? wf[id].inputs : null
        let injected = false
        // v2.8: model name (igc.model) is injected into whichever loader node the
        // mapping points at — CheckpointLoaderSimple OR UNETLoader (independent, not if/else).
        if (mp.checkpoint && inj(mp.checkpoint)) { inj(mp.checkpoint).ckpt_name = igc.model; injected = true }
        if (mp.unet && inj(mp.unet)) { inj(mp.unet).unet_name = igc.model; injected = true }
        if (mp.latent && inj(mp.latent)) { inj(mp.latent).width = cfSize.width; inj(mp.latent).height = cfSize.height; inj(mp.latent).batch_size = n; injected = true }
        if (mp.positive && inj(mp.positive)) { inj(mp.positive).text = prompt; injected = true }
        // v2.8: VAE/CLIP only injected when the user picked a file (empty = leave workflow's own).
        if (mp.vae && inj(mp.vae) && igc.vae) { inj(mp.vae).vae_name = igc.vae; injected = true }
        if (mp.clip && inj(mp.clip) && igc.clip) { inj(mp.clip).clip_name = igc.clip; injected = true }
        if (mp.sampler && inj(mp.sampler)) {
          if (awf && awf.seed !== '' && awf.seed != null) inj(mp.sampler).seed = awf.seed
          else inj(mp.sampler).seed = Math.floor(Math.random() * 1125899906842624)
          if (awf) {
            if (awf.steps !== '' && awf.steps != null) inj(mp.sampler).steps = awf.steps
            if (awf.cfg !== '' && awf.cfg != null) inj(mp.sampler).cfg = awf.cfg
            if (awf.scheduler) inj(mp.sampler).scheduler = awf.scheduler
          }
        }
        if (!injected && !cfDetail) cfDetail = '（映射节点未命中，使用工作流原样参数）'
        const clientId = (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'dsh-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)
        const submitRes = await httpJson(cfBase + '/prompt', 'POST', cfHeaders, { prompt: wf, client_id: clientId }, clampTimeout(igc.timeoutMs, 300000))
        const promptId = submitRes.ok && submitRes.body && submitRes.body.prompt_id ? submitRes.body.prompt_id : null
        if (!promptId) {
          last = { data: [], status: submitRes.status, message: comfySubmitError(submitRes) }
          if (submitRes.status === 'TIMEOUT') break
          // retry only transient submit failures (network / 5xx); 4xx (validation,
          // auth, missing workflow node) is permanent — fail fast without re-submitting
          const transient = submitRes.status === 'NET' || (typeof submitRes.status === 'number' && submitRes.status >= 500)
          if (!transient) break
          if (attempt < attempts0) await sleep(Math.min(800 * attempt, 4000))
          continue
        }
        lastPromptId = promptId
        lastClientId = clientId
        const result = await comfyWaitResult(cfBase, cfHeaders, promptId, clientId, clampTimeout(igc.timeoutMs, 600000))
        if (result.ok) {
          last = { data: result.images.map((i) => ({ comfy: i })), bodyModel: igc.model }
          cfDetail = refImage ? '（ComfyUI 默认工作流暂不支持参考图，已忽略）' : ''
        } else {
          last = { data: [], status: result.status, message: result.message }
        }
        break
      }
      if (cfDetail) last = Object.assign({}, last, { message: (last.message || '') + cfDetail })
    } else if (protocol === 'openai-completions') {
      body = { model: igc.model, messages: [{ role: 'user', content: prompt }], modalities: ['text', 'image'], stream: false }
      for (let attempt = 1; attempt <= attempts0; attempt++) {
        const res = await httpJson(url, 'POST', headers, body, clampTimeout(igc.timeoutMs, 300000))
        if (res.ok && res.body) { last = { data: extractImggenImages(protocol, res.body), bodyModel: res.body.model }; break }
        last = { data: [], status: res.status, message: res.message }
        if (res.status === 'TIMEOUT') break
        if (attempt < attempts0) await sleep(Math.min(800 * attempt, 4000))
      }
    } else {
      body = { model: igc.model, prompt, n }
      // OpenAI family wants WxH separator; normalize any WxH/W*H/W×H from the AI
      if (size) { const osz = parseSizePair(size); body.size = osz ? osz.width + 'x' + osz.height : size }
      if (igc.responseFormat === 'b64_json' || igc.responseFormat === 'url') body.response_format = igc.responseFormat
      for (let attempt = 1; attempt <= attempts0; attempt++) {
        const res = await httpJson(url, 'POST', headers, body, clampTimeout(igc.timeoutMs, 300000))
        if (res.ok && res.body) { last = { data: extractImggenImages(protocol, res.body), bodyModel: res.body.model }; break }
        last = { data: [], status: res.status, message: res.message }
        if (res.status === 'TIMEOUT') break
        if (attempt < attempts0) await sleep(Math.min(800 * attempt, 4000))
      }
    }
    if (!last || !last.data || last.data.length === 0) {
      throw new Error('generate_image: 生图请求失败' + (last && last.status ? '（HTTP ' + last.status + ': ' + String(last.message).slice(0, 200) + '）' : ''))
    }
    // resolve raw image buffers: b64_json → base64; url → download; comfy → /view
    // imgDir was resolved before the API call (v2.5: workspace enforcement).
    mkdirSync(imgDir, { recursive: true })
    const paths = []
    for (let i = 0; i < last.data.length; i++) {
      const item = last.data[i]
      let buf = null
      let fileName = 'img_' + Date.now().toString(36) + '_' + i + '.png'
      if (item.b64_json) {
        buf = Buffer.from(item.b64_json, 'base64')
      } else if (item.url) {
        buf = await fetchImageBuffer(item.url, clampTimeout(igc.timeoutMs, 300000))
      } else if (item.comfy) {
        // ComfyUI: fetch bytes via /view?filename=&subfolder=&type=
        const c = item.comfy
        const vurl = cfBase + '/view?filename=' + encodeURIComponent(c.filename) + '&subfolder=' + encodeURIComponent(c.subfolder || '') + '&type=' + encodeURIComponent(c.type || 'output')
        buf = await fetchImageBuffer(vurl, clampTimeout(igc.timeoutMs, 300000))
        const dot = String(c.filename || '').lastIndexOf('.')
        fileName = 'img_' + Date.now().toString(36) + '_' + i + (dot >= 0 ? String(c.filename).slice(dot) : '.png')
      }
      if (!buf || buf.length === 0) continue
      writeFileSync(join(imgDir, fileName), buf)
      paths.push(join(imgDir, fileName))
    }
    if (paths.length === 0) throw new Error('generate_image: 未能从响应中解析出图像数据')
    var gc = cfg.globalConfig || defaultGlobalConfig()
    return { ok: true, paths, model: (last.bodyModel || igc.model || ''), attempts: attempts0, verifyReminder: gc.verifyReminder !== false && toolVisible }
  }
})

// ---------- video generation (v2.8): submit -> poll -> download ----------
async function runVideoGeneration(cfg, args, exec) {
  const protocol = cfg.protocol
  // resolve optional first-frame image (i2v): http(s) URL passes through;
  // local path is read into base64. t2v passes null.
  let image = null
  const rawImage = args.image ? String(args.image).trim() : ''
  if (rawImage) {
    if (/^https?:\/\//i.test(rawImage)) {
      image = { kind: 'url', value: rawImage }
    } else {
      let p = rawImage
      const cwd = sessionCwd(exec)
      if (cwd && !/^[A-Za-z]:[\\/]/.test(p) && !p.startsWith('/') && !p.startsWith('\\\\')) p = join(cwd, p)
      try {
        const buf = readFileSync(p)
        const mime = sniffMediaType(new Uint8Array(buf)) || mimeFor(p)
        image = { kind: 'b64', value: buf.toString('base64'), mime }
      } catch (e) {
        throw new Error('generate_video: 无法读取首帧图片 ' + rawImage + '：' + (e && e.message || e))
      }
    }
  }
  const built = buildVideoSubmit(cfg, args, image)
  const i2v = built.i2v === true
  const attempts0 = Math.max(1, Math.min(cfg.retryCount || 1, 5))
  let taskId = ''
  let lastErr = null
  for (let attempt = 1; attempt <= attempts0; attempt++) {
    const res = await httpJson(built.url, 'POST', built.headers, built.body, clampTimeout(cfg.timeoutMs, 600000))
    if (res.ok && res.body) {
      taskId = extractVideoTaskId(protocol, cfg, res.body)
      if (taskId) break
      lastErr = '提交成功但未返回任务 ID：' + String(res.message || '').slice(0, 200)
    } else {
      lastErr = 'HTTP ' + res.status + ': ' + String(res.message || '').slice(0, 200)
    }
    if (res.status === 'TIMEOUT') break
    if (attempt < attempts0) await sleep(Math.min(800 * attempt, 4000))
  }
  if (!taskId) throw new Error('generate_video: 视频任务提交失败' + (lastErr ? '（' + lastErr + '）' : ''))
  // poll until done (budget = user timeoutMs), fail fast after 5 consecutive errors
  const pollIntervalMs = Math.max(1000, Math.floor(Number(cfg.pollIntervalMs) || 5000))
  const pollBudgetMs = clampTimeout(cfg.timeoutMs, 600000)
  const maxPolls = Math.max(1, Math.ceil(pollBudgetMs / pollIntervalMs))
  let consecErr = 0
  let lastStatus = ''
  let lastPollErr = ''
  for (let poll = 0; poll < maxPolls; poll++) {
    await sleep(pollIntervalMs)
    let st
    try {
      st = await pollVideoOnce(protocol, cfg, taskId, i2v)
    } catch (e) {
      st = { status: 'error', message: String(e && e.message || e) }
    }
    if (st.status === 'error') {
      consecErr++
      lastPollErr = st.message
      if (consecErr >= 5) throw new Error('generate_video: 任务轮询连续失败（' + consecErr + ' 次）: ' + lastPollErr)
      continue
    }
    consecErr = 0
    if (st.status === 'done') {
      let url = st.url || ''
      if (protocol === 'minimax-video' && st.fileId) url = await minimaxResolveUrl(cfg, st.fileId)
      // Agnes V2.0（实测）：轮询完成后仅返回 video_id，需再查 /agnesapi?video_id=
      // 拿真实 mp4 下载地址；Sora 兼容中转站走 {pollPath}/{taskId}/content。
      if (!url && protocol === 'openai-videos') {
        const isAgnes = cfg.provider === 'agnes' || cfg.provider === 'agnes-cn'
        if (isAgnes && st.videoId) {
          const agnesBase = String(videoBase(cfg)).replace(/\/v[0-9]+$/, '')
          const agnesHeaders = { Accept: 'application/json', ...(cfg.apiKey ? { Authorization: 'Bearer ' + cfg.apiKey } : {}) }
          const metaRes = await httpJson(agnesBase + '/agnesapi?video_id=' + encodeURIComponent(st.videoId), 'GET', agnesHeaders, null, 60000)
          url = (metaRes && metaRes.body && metaRes.body.url) || ''
          if (!url) throw new Error('generate_video: Agnes 任务完成但无法从 /agnesapi 解析视频 URL')
        } else {
          const p = String(cfg.pollPath || '/videos').trim()
          url = videoBase(cfg) + (p.startsWith('/') ? p : '/' + p) + '/' + encodeURIComponent(taskId) + '/content'
        }
      }
      if (!url) throw new Error('generate_video: 任务完成但无法解析视频 URL')
      const buf = await fetchImageBuffer(url, clampTimeout(cfg.timeoutMs, 600000))
      if (!buf || buf.length === 0) throw new Error('generate_video: 视频下载为空')
      const agentCwd = sessionCwd(exec)
      const rawOut = args.output_dir && String(args.output_dir).trim() ? String(args.output_dir).trim() : ''
      let vDir
      if (rawOut) vDir = /^[A-Za-z]:[\\/]/.test(rawOut) || rawOut.startsWith('\\\\') || rawOut.startsWith('/') ? rawOut : (agentCwd ? join(agentCwd, rawOut) : rawOut)
      else if (agentCwd) vDir = agentCwd
      else throw new Error('generate_video: 无法确定输出目录（未提供 output_dir 且当前会话无工作区路径）。请显式传入 output_dir。')
      mkdirSync(vDir, { recursive: true })
      const fileName = 'video_' + Date.now().toString(36) + '.mp4'
      const full = join(vDir, fileName)
      writeFileSync(full, buf)
      return { ok: true, path: full, url, model: cfg.model || '', protocol, seconds: Math.max(1, Math.min(Math.floor(Number(args.seconds) || cfg.seconds || 5), 30)), attempts: attempts0 }
    }
    if (st.status === 'failed') throw new Error('generate_video: 视频任务失败：' + (st.message || '未知原因'))
    lastStatus = st.status
  }
  throw new Error('generate_video: 视频任务轮询超时（' + Math.round(maxPolls * pollIntervalMs / 1000) + ' 秒未完成，最后状态: ' + lastStatus + '）')
}

async function runMimoTts(vc, args, exec) {
  const text = String(args && args.text || '').trim()
  if (!text) throw new Error('runMimoTts: 缺少参数 text（要合成的文本）')
  const model = vc.model || 'mimo-v2.5-tts'
  const style = String(args && args.style || vc.styleInstruction || '').trim()
  const messages = []
  if (model === 'mimo-v2.5-tts-voicedesign') {
    const desc = String(args && args.voice || style || '').trim()
    if (!desc) throw new Error('runMimoTts: voicedesign 模型需要音色描述（通过 voice 参数或 styleInstruction 配置）')
    messages.push({ role: 'user', content: desc })
  } else {
    messages.push({ role: 'user', content: style })
  }
  messages.push({ role: 'assistant', content: text })
  const audio = { format: 'wav' }
  if (model === 'mimo-v2.5-tts') {
    audio.voice = vc.voiceId || 'mimo_default'
  } else if (model === 'mimo-v2.5-tts-voicedesign') {
    audio.optimize_text_preview = vc.optimizeText === true
  } else if (model === 'mimo-v2.5-tts-voiceclone') {
    const samplePath = String(args && args.voice_sample_path || vc.voiceSamplePath || '').trim()
    if (!samplePath) throw new Error('runMimoTts: voiceclone 模型需要参考音频文件路径（voice_sample_path 参数）')
    const { readFileSync } = await import('node:fs')
    const { extname } = await import('node:path')
    const buf = readFileSync(samplePath)
    const ext = extname(samplePath).toLowerCase()
    const mime = ext === '.mp3' ? 'audio/mpeg' : ext === '.wav' ? 'audio/wav' : 'audio/mpeg'
    const b64 = buf.toString('base64')
    if (b64.length > 10 * 1024 * 1024) throw new Error('runMimoTts: 参考音频文件过大（base64 后超过 10MB 限制）')
    audio.voice = 'data:' + mime + ';base64,' + b64
  }
  const endpoint = (vc.endpoint || 'https://api.xiaomimimo.com/v1').replace(/\/+$/, '')
  const url = endpoint + '/chat/completions'
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), vc.timeoutMs || 120000)
  let resp
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + vc.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model, messages, audio, stream: false }),
      signal: controller.signal
    })
  } catch (e) {
    clearTimeout(timeout)
    throw new Error('runMimoTts: 请求失败 — ' + String(e && e.message || e))
  }
  clearTimeout(timeout)
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '')
    throw new Error('runMimoTts: HTTP ' + resp.status + ' — ' + errText.slice(0, 200))
  }
  const body = await resp.json()
  const audioData = body && body.choices && body.choices[0] && body.choices[0].message && body.choices[0].message.audio && body.choices[0].message.audio.data
  if (!audioData) throw new Error('runMimoTts: MiMo API 未返回音频数据')
  const wavBuffer = Buffer.from(audioData, 'base64')
  if (!wavBuffer || wavBuffer.length === 0) throw new Error('runMimoTts: base64 解码后为空')
  const ts = Date.now().toString(36)
  const fileName = 'voice_' + ts + '.wav'
  const cwd = sessionCwd(exec)
  const base = cwd || process.cwd()
  const dir = join(base, '.omni-workstation', 'artifacts')
  mkdirSync(dir, { recursive: true })
  const path = join(dir, fileName)
  writeFileSync(path, wavBuffer)
  return { ok: true, path, model, format: 'wav' }
}

// v2.9.3: minimax synthesis engine — POST /v1/t2a_v2, hex→mp3. Region-aware.
// t2a_v2 is mp3-only; the panel outputFormat selector is silently ignored under minimax.
function minimaxBase(region) {
  return region === 'global' ? 'https://api.minimax.io' : 'https://api.minimaxi.com'
}
async function runMinimaxTts(vc, args, exec) {
  const text = String(args && args.text || '').trim()
  if (!text) throw new Error('runMinimaxTts: 缺少参数 text（要合成的文本）')
  const model = vc.model || 'speech-2.8-hd'
  const voiceId = String(args && args.voice || vc.voiceId || '').trim()
  if (!voiceId) throw new Error('runMinimaxTts: 缺少 voice_id（预置或克隆音色 id）')
  const region = vc.region === 'global' ? 'global' : 'cn'
  const url = minimaxBase(region).replace(/\/+$/, '') + '/v1/t2a_v2'
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), vc.timeoutMs || 120000)
  const voiceSetting = { voice_id: voiceId }
  const audioSetting = { sample_rate: 32000, bitrate: 128000, format: 'mp3', channel: 1 }
  let resp
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + vc.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, text, stream: false, output_format: 'hex', language_boost: 'auto', voice_setting: voiceSetting, audio_setting: audioSetting }),
      signal: controller.signal
    })
  } catch (e) {
    clearTimeout(timeout)
    throw new Error('runMinimaxTts: 请求失败 — ' + String(e && e.message || e))
  }
  clearTimeout(timeout)
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '')
    throw new Error('runMinimaxTts: HTTP ' + resp.status + ' — ' + errText.slice(0, 200))
  }
  const body = await resp.json()
  const audioHex = body && body.data && body.data.audio
  if (!audioHex || typeof audioHex !== 'string') throw new Error('runMinimaxTts: MiniMax t2a_v2 未返回音频数据')
  let mp3Buffer
  try { mp3Buffer = Buffer.from(audioHex, 'hex') } catch (e) { throw new Error('runMinimaxTts: hex 解码失败 — ' + String(e && e.message || e)) }
  if (!mp3Buffer || mp3Buffer.length === 0) throw new Error('runMinimaxTts: hex 解码后为空')
  const cwd = sessionCwd(exec)
  if (!cwd) throw new Error('runMinimaxTts: 无法确定输出目录（会话工作区未打开）')
  const dir = join(cwd, '.omni-workstation', 'artifacts')
  mkdirSync(dir, { recursive: true })
  const ts = Date.now().toString(36)
  const fileName = 'voice_' + ts + '.mp3'
  const path = join(dir, fileName)
  writeFileSync(path, mp3Buffer)
  return { ok: true, path, model, format: 'mp3' }
}

// v2.9.3: minimax two-step clone — multipart /v1/files/upload → file_id → /v1/voice_clone.
// Reused by the /omni/minimax/clone route (panel) and the clone_voice tool.
// Uses native fetch+FormData+Blob (httpJson is JSON-only and cannot do multipart).
async function doMinimaxClone(vc, refPath, voiceId, text, model) {
  const region = vc.region === 'global' ? 'global' : 'cn'
  const base = minimaxBase(region).replace(/\/+$/, '')
  const auth = 'Bearer ' + vc.apiKey
  const buf = readFileSync(refPath)
  const fname = String(refPath.replace(/^.*[\\/]/, '') || 'clone_input.wav')
  const fd = new FormData()
  fd.append('purpose', 'voice_clone')
  fd.append('file', new Blob([buf]), fname)
  let up
  try {
    up = await fetch(base + '/v1/files/upload', { method: 'POST', headers: { 'Authorization': auth }, body: fd })
  } catch (e) {
    throw new Error('doMinimaxClone: 上传请求失败 — ' + String(e && e.message || e))
  }
  if (!up.ok) {
    const t = await up.text().catch(() => '')
    throw new Error('doMinimaxClone: 上传 HTTP ' + up.status + ' — ' + t.slice(0, 200))
  }
  const upBody = await up.json()
  const fileId = upBody && upBody.file && upBody.file.file_id
  if (!fileId) throw new Error('doMinimaxClone: 上传未返回 file_id')
  const cloneBody = {
    file_id: fileId,
    voice_id: voiceId,
    model: model || vc.model || 'speech-2.8-hd',
    need_noise_reduction: false,
    need_volume_normalization: true,
    aigc_watermark: false
  }
  if (text) cloneBody.text = text
  let cl
  try {
    cl = await fetch(base + '/v1/voice_clone', { method: 'POST', headers: { 'Authorization': auth, 'Content-Type': 'application/json' }, body: JSON.stringify(cloneBody) })
  } catch (e) {
    throw new Error('doMinimaxClone: 克隆请求失败 — ' + String(e && e.message || e))
  }
  if (!cl.ok) {
    const t = await cl.text().catch(() => '')
    throw new Error('doMinimaxClone: 克隆 HTTP ' + cl.status + ' — ' + t.slice(0, 200))
  }
  const clBody = await cl.json()
  return { voice_id: voiceId, file_id: fileId, demo_audio: (clBody && clBody.demo_audio) || null, raw: clBody }
}

// v2.9.8: doubao TTS — POST /api/v3/tts/unidirectional, chunked JSON → base64 → mp3.
// Auth: X-Api-App-Key(appId) + X-Api-Access-Key(accessKey) or X-Api-Key(apiKey).
// Response is chunked: each line is JSON with base64 audio segment in .data.
async function runDoubaoTts(vc, args, exec) {
  const text = String(args && args.text || '').trim()
  if (!text) throw new Error('runDoubaoTts: 缺少参数 text')
  const speaker = String(args && args.voice || vc.voiceId || '').trim()
  if (!speaker) throw new Error('runDoubaoTts: 缺少 speaker（预置或克隆音色 id）')
  const model = vc.model || 'seed-tts-2.0'
  const appId = vc.appId || ''
  const accessKey = vc.accessKey || ''
  const apiKey = vc.accessKey || vc.apiKey || ''
  const headers = { 'Content-Type': 'application/json' }
  if (appId) headers['X-Api-App-Key'] = appId
  if (accessKey) headers['X-Api-Access-Key'] = accessKey
  else if (apiKey) headers['X-Api-Key'] = apiKey
  headers['X-Api-Resource-Id'] = model
  const additionsObj = {}
  if (args.style) {
    if (model.startsWith('seed-icl-2')) additionsObj.use_tag_parser = true
    else if (model.startsWith('seed-tts-2')) additionsObj.context_texts = [args.style]
  }
  const body = JSON.stringify({
    user: { uid: 'omni_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8) },
    req_params: { text, speaker, audio_params: { format: 'mp3', sample_rate: 24000 }, additions: JSON.stringify(additionsObj) }
  })
  const url = 'https://openspeech.bytedance.com/api/v3/tts/unidirectional'
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), vc.timeoutMs || 120000)
  let resp
  try {
    resp = await fetch(url, { method: 'POST', headers, body, signal: controller.signal })
  } catch (e) {
    clearTimeout(timeout)
    throw new Error('runDoubaoTts: 请求失败 — ' + String(e && e.message || e))
  }
  clearTimeout(timeout)
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '')
    throw new Error('runDoubaoTts: HTTP ' + resp.status + ' — ' + errText.slice(0, 200))
  }
  const reader = resp.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let base64AudioData = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()
    for (const line of lines) {
      let lineData = line.trim()
      if (lineData.startsWith('data:')) lineData = lineData.slice(5).trim()
      if (!lineData) continue
      try {
        const jsonObj = JSON.parse(lineData)
        if (jsonObj.code && jsonObj.code !== 0 && jsonObj.code !== 20000000)
          throw new Error('runDoubaoTts: API error code ' + jsonObj.code + ' — ' + (jsonObj.message || ''))
        if (jsonObj.data) base64AudioData += jsonObj.data
      } catch (e) {
        if (e.message && e.message.startsWith('runDoubaoTts:')) throw e
      }
    }
  }
  if (buffer.trim()) {
    let lineData = buffer.trim()
    if (lineData.startsWith('data:')) lineData = lineData.slice(5).trim()
    try { const jsonObj = JSON.parse(lineData); if (jsonObj.data) base64AudioData += jsonObj.data } catch { /* skip */ }
  }
  if (!base64AudioData) throw new Error('runDoubaoTts: 未收到音频数据')
  const audioBuffer = Buffer.from(base64AudioData, 'base64')
  if (!audioBuffer || audioBuffer.length === 0) throw new Error('runDoubaoTts: base64 解码后为空')
  const cwd = sessionCwd(exec)
  if (!cwd) throw new Error('runDoubaoTts: 无法确定输出目录（会话工作区未打开）')
  const dir = join(cwd, '.omni-workstation', 'artifacts')
  mkdirSync(dir, { recursive: true })
  const path = join(dir, 'voice_' + Date.now().toString(36) + '.mp3')
  writeFileSync(path, audioBuffer)
  return { ok: true, path, model, format: 'mp3' }
}

// v2.9.8: doubao voice clone — base64 upload → async training → poll status.
// Postpaid: speaker_id='custom_speaker_id', custom_speaker_id=user-defined.
// Training is async: poll get_voice until status=2(Success) or 4(Active).
async function doDoubaoClone(vc, refPath, speakerId, text) {
  const appId = vc.appId || ''
  const accessKey = vc.accessKey || ''
  const apiKey = vc.accessKey || vc.apiKey || ''
  const headers = { 'Content-Type': 'application/json' }
  if (appId) headers['X-Api-App-Key'] = appId
  if (accessKey) headers['X-Api-Access-Key'] = accessKey
  else if (apiKey) headers['X-Api-Key'] = apiKey
  // v2.9.9: voice_clone endpoint requires X-Api-Request-Id (TTS endpoint doesn't)
  headers['X-Api-Request-Id'] = 'omni_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10)
  const buf = readFileSync(refPath)
  const ext = String(refPath.replace(/^.*\./, '') || '').toLowerCase()
  const format = ext === 'mp3' ? 'mp3' : ext === 'wav' ? 'wav' : ext === 'ogg' ? 'ogg_opus' : 'mp3'
  const b64 = buf.toString('base64')
  const cloneBody = { speaker_id: 'custom_speaker_id', custom_speaker_id: speakerId, audio: { data: b64, format } }
  if (text) cloneBody.text = text
  let resp
  try {
    resp = await fetch('https://openspeech.bytedance.com/api/v3/tts/voice_clone', { method: 'POST', headers, body: JSON.stringify(cloneBody) })
  } catch (e) {
    throw new Error('doDoubaoClone: 上传请求失败 — ' + String(e && e.message || e))
  }
  if (!resp.ok) {
    const t = await resp.text().catch(() => '')
    throw new Error('doDoubaoClone: HTTP ' + resp.status + ' — ' + t.slice(0, 200))
  }
  // Poll training status (sync, up to 120s, 3s interval)
  const maxIter = 40
  const intervalMs = 3000
  for (let i = 0; i < maxIter; i++) {
    await new Promise(r => setTimeout(r, intervalMs))
    let statusResp
    try {
      statusResp = await fetch('https://openspeech.bytedance.com/api/v3/tts/get_voice', {
        method: 'POST', headers, body: JSON.stringify({ speaker_id: 'custom_speaker_id', custom_speaker_id: speakerId })
      })
    } catch { continue }
    if (!statusResp.ok) continue
    const statusResult = await statusResp.json()
    const status = statusResult.status
    if (status === 2 || status === 4)
      return { speaker_id: speakerId, status, demo_audio: statusResult.demo_audio || null, raw: statusResult }
    if (status === 3) throw new Error('doDoubaoClone: 训练失败（status=3）')
  }
  return { speaker_id: speakerId, status: 1, demo_audio: null, raw: { note: 'training timeout, poll again later' } }
}

const buildVideoToolDef = (vc) => defineTool({
  name: 'generate_video',
  description: '生成视频并保存到指定目录，返回文件路径。prompt 描述视频内容；image 可选——传入图片路径或公网图片 URL 时以图生视频（i2v），否则文生视频（t2v）。output_dir 指定保存目录（不指定则保存到工作区根目录）。视频生成是异步任务，可能耗时数分钟。当前面板初始默认：时长 ' + (vc && vc.seconds ? vc.seconds : 5) + 's、画幅 ' + (vc && vc.aspectRatio ? vc.aspectRatio : '16:9') + '、重试 ' + (vc && vc.retryCount ? vc.retryCount : 1) + ' 次——这些仅为初始默认值；若用户在对话中明确要求其他值（如"改为1:1""生成10秒""1080p"），必须以用户要求为最高优先级，通过 seconds / aspect_ratio / resolution 参数覆盖面板默认。',
  parameters: {
    prompt: { type: 'string', required: true, description: '视频内容提示词：详细描述画面主体、动作、运镜、风格、光线、环境等' },
    image: { type: 'string', description: '首帧图片路径（本地文件）或公网图片 URL（可选）。传入后以图生视频（i2v）模式生成。' },
    seconds: { type: 'number', description: '视频时长（秒）。默认取面板初始值；用户提示词明确指定的时长优先' },
    aspect_ratio: { type: 'string', description: '画幅，如 16:9 / 9:16 / 1:1 / 4:3 / 3:4。默认取面板初始值；用户提示词明确指定（如"改为1:1"）时必须以用户要求为准' },
    resolution: { type: 'string', description: '分辨率（720p/1080p/768p，部分协议支持），由 AI 按需自行决定；不传用面板默认 720p' },
    output_dir: { type: 'string', description: '保存目录，绝对路径或相对当前工作区的相对路径。不指定则保存到当前工作区根目录。根据项目情况选择合适位置。' }
  },
  output: {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        ok: { type: 'boolean', required: true },
        path: { type: 'string' },
        url: { type: 'string' },
        model: { type: 'string' },
        protocol: { type: 'string' },
        seconds: { type: 'number' },
        attempts: { type: 'number' },
        detail: { type: 'string' }
      }
    },
    render: (args, value) => {
      if (!value || !value.ok) {
        return [{ type: 'text', text: '视频生成失败：' + (value && value.detail ? value.detail : JSON.stringify(value || {})) }]
      }
      return [{ type: 'text', text: '## 视频生成结果\n\n文件: ' + (value.path || '') + '\n\n— 模型: ' + (value.model || '未知') + ' · 协议: ' + (value.protocol || '') + ' · 时长: ' + (value.seconds || '') + 's · 尝试: ' + (value.attempts || 1) + ' 次' }]
    }
  },
  async execute(args, exec) {
    const prompt = String(args && args.prompt || '').trim()
    if (!prompt) throw new Error('generate_video: 缺少参数 prompt（视频描述）')
    const ctx = appCtx
    const cfg = await loadConfig(ctx)
    const vc = cfg.videoConfig || defaultVideoConfig()
    if (!isVideoConfigValid(vc)) {
      throw new Error('generate_video: 视频配置无效。请在设置页「视频」面板配置完整的 API（供应商 + 端点 + Key + 模型）。')
    }
    return runVideoGeneration(vc, args, exec)
  }
})

const buildSpeakToolDef = (vc) => defineTool({
  name: 'speak',
  description: '将文本转为语音并保存为音频文件，返回文件路径。text 是要朗读的文本；'
    + 'voice 可选——预置音色 ID 或音色描述文本；'
    + (vc.provider === 'mimo' ? 'voice_sample_path 可选——参考音频文件路径（由 clone_voice 工具返回，传入后使用克隆音色合成）；' : '')
    + 'style 可选——自然语言风格指令（如"温柔但疲惫，语速偏慢"），也可用音频标签如(唱歌)前缀。'
    + (vc.provider === 'minimax'
      ? 'minimax 下 voice 为 voice_id（可用 clone_voice 工具克隆得到的音色 id 复用）。当前 voice_id: ' + (vc.voiceId || '') + '。'
      : vc.provider === 'doubao'
      ? 'doubao 下 voice 为 speaker_id（可用 clone_voice 工具克隆得到的音色 id 复用）。当前 speaker_id: ' + (vc.voiceId || '') + '。'
      : 'mimo 下可用 clone_voice 工具克隆音色，克隆后在 speak 中传入 voice_sample_path 参数复用。当前音色: ' + (vc.voiceId || 'mimo_default') + '。')
    + '正常情况下不传 voice/voice_sample_path，使用面板配置的默认音色。当前模型: ' + (vc && vc.model ? vc.model : 'mimo-v2.5-tts') + '。',
  parameters: {
    text: { type: 'string', required: true, description: '要转为语音的文本' },
    voice: { type: 'string', description: '音色：预置音色 ID（如 mimo_default/冰糖/Chloe）或音色描述文本（voicedesign 模型下用）' },
    ...(vc.provider === 'mimo' ? { voice_sample_path: { type: 'string', description: '参考音频文件路径（mimo 克隆复用——由 clone_voice 工具返回，传入后使用克隆音色合成）' } } : {}),
    style: { type: 'string', description: '自然语言风格指令，如"温柔但疲惫，语速偏慢"。也可用 (风格) 标签和 [细粒度标签] 嵌入文本' },
    output_dir: { type: 'string', description: '保存目录，不指定则保存到工作区 artifacts 目录' }
  },
  output: {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        ok: { type: 'boolean', required: true },
        path: { type: 'string' },
        model: { type: 'string' },
        format: { type: 'string' },
        detail: { type: 'string' }
      }
    },
    render: (args, value) => {
      if (!value || !value.ok) {
        return [{ type: 'text', text: '语音合成失败：' + (value && value.detail ? value.detail : JSON.stringify(value || {})) }]
      }
      var p = String(value.path || '').replace(/\\/g, '/')
      return [{ type: 'text', text: '## 语音合成结果\n\n文件: ' + p + '\n\n— 模型: ' + (value.model || '未知') + ' · 格式: ' + (value.format || 'wav') + '\n\n<audio controls src="file:///' + p + '">语音播放器</audio>' }]
    }
  },
  async execute(args, exec) {
    const text = String(args && args.text || '').trim()
    if (!text) throw new Error('speak: 缺少参数 text（要合成的文本）')
    const ctx = appCtx
    const cfg = await loadConfig(ctx)
    const vc = cfg.voiceConfig || defaultVoiceConfig()
    if (!isVoiceConfigValid(vc)) {
      throw new Error('speak: 语音配置无效。请在设置页「语音」面板配置完整的 API（供应商 + 端点 + Key + 模型）。')
    }
    // MiMo inline clone: AI passes voice_sample_path from clone_voice tool result.
    // Override model to voiceclone so runMimoTts (line 2721) reads the sample
    // as base64 into audio.voice. Normal speak (no voice_sample_path) is unaffected.
    // Guard is === 'mimo' (not !== 'minimax') because execute reads live config
    // and provider could have switched to doubao/indextts/etc. between registration
    // and call — only mimo has synthesis wired.
    if (args.voice_sample_path && vc.provider === 'mimo') {
      const { existsSync } = await import('node:fs')
      if (!existsSync(args.voice_sample_path)) throw new Error('speak: 参考音频文件不存在: ' + args.voice_sample_path)
      const cloneVc = Object.assign({}, vc, { model: 'mimo-v2.5-tts-voiceclone' })
      return runMimoTts(cloneVc, args, exec)
    }
    return vc.provider === 'minimax' ? runMinimaxTts(vc, args, exec)
      : vc.provider === 'doubao' ? runDoubaoTts(vc, args, exec)
      : runMimoTts(vc, args, exec)
  }
})

// v2.9.7: unified clone_voice — clone-only (no synthesis). Replaces the old
// mimo clone+synthesize tool and the old minimax_clone_voice tool. The AI
// clones once, then reuses the result in subsequent speak calls:
//   minimax → speak(voice=<voice_id>)   (persistent voice_id on MiniMax servers)
//   mimo    → speak(voice_sample_path=<path>)  (inline base64 clone per call)
// Normal case: AI calls speak without voice/voice_sample_path → uses user's
// configured voiceId (no conflict — AI clone never writes to config).
const buildCloneVoiceToolDef = (vc) => defineTool({
  name: 'clone_voice',
  description: '克隆音色（仅当用户明确要求时调用）。'
    + (vc.provider === 'minimax'
      ? 'minimax 供应商：上传参考音频 → 注册持久 voice_id → 后续 speak 调用传入 voice 参数 = 返回的 voice_id 即可复用克隆音色。voice_id 可选（不填自动生成 clone_<ts>）；text 可选（传了返回试听 demo_audio）。'
      : vc.provider === 'doubao'
      ? 'doubao 供应商：上传参考音频 → 异步训练 → 拿到 speaker_id → 后续 speak 传 voice 参数 = speaker_id 复用。不填 voice_sample_path 时使用面板音色预设中配置的参考音频路径；不填 voice_id 时使用预设的 speaker_id。用户可提供 app_id 和 access_key 覆盖面板凭据。训练可能需数秒。'
      : 'mimo 供应商：确认采样音频路径 → 后续 speak 调用传入 voice_sample_path 参数 = 返回的路径即可复用克隆音色（每次合成内联克隆）。')
    + '正常情况下直接使用 speak 工具（使用面板配置的默认音色），不需要克隆。'
    + 'voice_sample_path 可选（doubao 不填时用面板预设路径；mimo/minimax 必填）。',
  parameters: {
    voice_sample_path: { type: 'string', description: '参考音频文件本地路径（doubao 不填时用面板预设路径）' },
    voice_id: { type: 'string', description: '自定义音色 id（doubao 不填时用预设的 speaker_id）' },
    app_id: { type: 'string', description: '覆盖面板 App ID（仅 doubao，仅当用户提供新凭据时）' },
    access_key: { type: 'string', description: '覆盖面板 Access Key（仅 doubao，仅当用户提供新凭据时）' },
    text: { type: 'string', description: '试听文本（可选）' }
  },
  output: {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        ok: { type: 'boolean', required: true },
        voice_id: { type: 'string' },
        voice_sample_path: { type: 'string' },
        demo_audio: { type: 'string' },
        detail: { type: 'string' }
      }
    },
    render: (args, value) => {
      if (!value || !value.ok) {
        return [{ type: 'text', text: '音色克隆失败：' + (value && value.detail ? value.detail : JSON.stringify(value || {})) }]
      }
      if (value.voice_id) {
        return [{ type: 'text', text: '## 音色克隆成功\n\nvoice_id: ' + value.voice_id + (value.demo_audio ? '\n\n试听: ' + value.demo_audio : '') + '\n\n— 后续调用 speak 时传入 voice="' + value.voice_id + '" 即可使用此克隆音色。' }]
      }
      return [{ type: 'text', text: '## 音色克隆确认\n\nvoice_sample_path: ' + (value.voice_sample_path || '') + '\n\n— 后续调用 speak 时传入 voice_sample_path="' + (value.voice_sample_path || '') + '" 即可使用此克隆音色（每次合成内联克隆）。' }]
    }
  },
  async execute(args, exec) {
    const ctx = appCtx
    const cfg = await loadConfig(ctx)
    const vc = cfg.voiceConfig || defaultVoiceConfig()
    if (!isVoiceConfigValid(vc)) {
      throw new Error('clone_voice: 语音配置无效。请在设置页「语音」面板配置完整的 API。')
    }
    // v2.9.9: for doubao, use active preset's refAudioPath/speakerId as defaults
    const dcp = vc.provider === 'doubao'
      ? (cfg.doubaoClonePresets || []).find((p) => p.id === cfg.activeDoubaoClonePreset) || {}
      : {}
    let samplePath = String(args && args.voice_sample_path || '').trim()
    if (!samplePath && vc.provider === 'doubao' && dcp.refAudioPath) samplePath = dcp.refAudioPath
    if (!samplePath) throw new Error('clone_voice: 缺少参考音频路径（voice_sample_path 或面板预设配置）')
    const { existsSync } = await import('node:fs')
    if (!existsSync(samplePath)) throw new Error('clone_voice: 参考音频文件不存在: ' + samplePath)
    if (vc.provider === 'minimax') {
      const voiceId = String(args && args.voice_id || '').trim() || ('clone_' + Date.now().toString(36))
      // guard: reject voice_id that collides with the user's configured voiceId
      // (server-side overwrite would silently change the user's panel-selected voice)
      if (voiceId === vc.voiceId) throw new Error('clone_voice: voice_id 与面板配置的当前音色相同，请换一个 id')
      const r = await doMinimaxClone(vc, samplePath, voiceId, args.text || '', vc.model)
      // build return conditionally — demo_audio may be null (text not passed);
      // output.schema declares type:'string' so null would fail harness validation
      const ret = { ok: true, voice_id: r.voice_id }
      if (r.demo_audio) ret.demo_audio = r.demo_audio
      return ret
    } else if (vc.provider === 'doubao') {
      // v2.9.9: use preset's speakerId as default; allow AI override
      const voiceId = String(args && args.voice_id || '').trim() || dcp.speakerId || ('clone_' + Date.now().toString(36))
      if (voiceId === vc.voiceId) throw new Error('clone_voice: voice_id 与面板配置的当前音色相同，请换一个 id')
      // Allow AI to override appId/accessKey
      const cloneVc = Object.assign({}, vc)
      if (args.app_id) cloneVc.appId = args.app_id
      if (args.access_key) cloneVc.accessKey = args.access_key
      const r = await doDoubaoClone(cloneVc, samplePath, voiceId, args.text || '')
      const ret = { ok: true, voice_id: r.speaker_id }
      if (r.status === 2 || r.status === 4) {
        if (r.demo_audio) ret.demo_audio = r.demo_audio
      } else {
        ret.detail = '训练仍在进行中（status=' + r.status + '），稍后可重试'
      }
      return ret
    } else if (vc.provider === 'mimo') {
      return { ok: true, voice_sample_path: samplePath }
    } else {
      throw new Error('clone_voice: 当前供应商不支持克隆（仅 mimo/minimax/doubao）')
    }
  }
})

function fallbackHasModels(cfg) {
  return !!(cfg.fallbackConfig && Array.isArray(cfg.fallbackConfig.models) && cfg.fallbackConfig.models.length > 0)
}

// ---------- auto-vision twin route (ONE image-capable picker entry) ----------
// v1.8: a single fixed twin route `auto-vision` (display "+ Auto Vision")
// declares `inputModalities: ['text','image']` — the ONLY lever the harness
// prompt admission uses to allow image upload. listModels/resolveModel return
// exactly ONE model `auto-vision` so the picker grows by +1 entry (not a
// full catalog mirror). The twin's stream() delegates to the LAST source
// provider+model the agent used (tracked via agent/request, module-level),
// rewriting image blocks to an analyze_image marker before delegating to the
// (text-only) source; native-multimodal source models keep the image
// (preserveImageInput). The original provider group is never modified.
function makeTwinAdapter(ctx, provider) {
  const twinRoute = 'auto-vision'
  // The source adapter must NOT be resolved eagerly: providers backed by user
  // settings register their routes LIVE once the settings document loads,
  // i.e. AFTER this plugin's apply. Resolve lazily per call. v1.8 reads the
  // module-level lastSourceProvider (set by agent/request) so the twin
  // delegates to the most-recently-used source — the `provider` arg is only a
  // fallback used before any agent/request has been tracked.
  const sourceProvider = () => lastSourceProvider || provider
  const originalAdapter = () => {
    try {
      return ctx.llm.registration(sourceProvider()).adapter
    } catch {
      return undefined
    }
  }
  const sourceAcceptsImages = async () => {
    const original = originalAdapter()
    if (original === undefined || typeof original.resolveModel !== 'function') return false
    try {
      const info = await original.resolveModel(sourceProvider(), lastSourceModel)
      return Array.isArray(info && info.inputModalities) && info.inputModalities.includes('image')
    } catch {
      return false
    }
  }
  const preserveImageInput = () => sourceAcceptsImages()
  const adapter = {
    providerInfo() {
      // v1.9: generic name — no provider/model suffix, since auto-vision
      // delegates to the LAST source (not a fixed provider). Showing a
      // specific model name misled users into thinking routing was fixed.
      return { id: twinRoute, name: 'Auto Vision' }
    },
    providerRetryPolicy() {
      const original = originalAdapter()
      try {
        return original && typeof original.providerRetryPolicy === 'function'
          ? original.providerRetryPolicy(sourceProvider())
          : undefined
      } catch {
        return undefined
      }
    },
    async listModels() {
      // v1.8: exactly ONE model so the picker shows a single "+ Auto Vision"
      // entry instead of mirroring the whole source catalog.
      return [{ id: 'auto-vision', name: 'Auto Vision', provider: twinRoute, inputModalities: ['text', 'image'] }]
    },
    async resolveModel(_provider, _model) {
      // v1.8: always resolve to the single twin model. The harness admission
      // gate calls resolveModelInfo(provider, model); returning id !== the
      // requested model would raise INVALID_MODEL_INFO at boot.
      return { id: 'auto-vision', provider: twinRoute, name: 'Auto Vision', inputModalities: ['text', 'image'] }
    },
    async *stream(options) {
      const messages = options.messages ?? []
      let keepOriginalImages = false
      if (typeof preserveImageInput === 'function') {
        try {
          keepOriginalImages = (await preserveImageInput()) === true
        } catch {
          // Capability probing is best-effort. If metadata cannot be resolved,
          // fall back to the safe text-only bridge instead of leaking an image
          // into an adapter that may reject it.
          keepOriginalImages = false
        }
      }
      // Rewrite image blocks ANYWHERE in the model input — including inside
      // tool-result blocks — before delegating to the text-only source. The
      // session log keeps the original blocks, so the Web UI still shows the
      // uploaded image.
      const rewritten = keepOriginalImages ? messages : messages.map((message) => {
        if (!message || !Array.isArray(message.content)) return message
        const result = rewriteImagesDeep(message.content, (block) => {
          const attachment = block.attachment || {}
          const id = attachment.attachmentId ?? attachment.id ?? 'unknown'
          const name = attachment.name ?? '图片'
          return [{
            type: 'text',
            text: '[图片「' + name + '」已上传，附件 id 为「' + id + '」。当前对话模型无法直接查看图片；需要看图时' + viewImageToolHint() + '，传入 attachment_id: "' + id + '" 和具体问题（如"这张图反映了什么？"）。]'
          }]
        })
        return result.changed ? { ...message, content: result.content } : message
      })
      // Delegate to the LAST source provider+model (NOT the twin route) so
      // the text brain answers while analyze_image acts as the eyes. Passing
      // the twin route here would recurse into this very stream.
      yield* ctx.llm.stream({ ...options, provider: sourceProvider(), model: lastSourceModel, messages: rewritten })
    }
  }
  // v2.7.4: newer dsh agent-loop resolves EVERY request through llm.prepareCall →
  // adapter.prepareCall; adapters lacking the method crash mirror routes with
  // "registration.adapter.prepareCall is not a function". Inherit source model
  // capability metadata when resolvable, then re-brand provider/id to THIS route
  // (dsh-llm normalizeModelInfo requires provider===route.id && id===requested).
  adapter.prepareCall = async function (_provider, model, signal) {
    const original = originalAdapter()
    let base = undefined
    if (original && typeof original.prepareCall === 'function') {
      try { base = (await original.prepareCall(sourceProvider(), lastSourceModel, signal)).model } catch { base = undefined }
    }
    const info = Object.assign({}, base || {}, {
      provider: twinRoute,
      id: model,
      name: base && typeof base.name === 'string' && base.name.length > 0 ? base.name : 'Auto Vision',
      inputModalities: ['text', 'image']
    })
    return { model: info, stream: (options) => adapter.stream(options) }
  }
  return adapter
}

// v1.9: per-provider twin (mirrorAllEnabled mode). Mirrors EVERY model under
// the source provider, declaring inputModalities:['text','image']. Route id
// `<provider>-omni-workstation` is already filtered by the agent/request + syncTwins
// self-recursion guards.
function makePerProviderTwinAdapter(ctx, provider) {
  const twinRoute = provider + '-omni-workstation'
  const originalAdapter = () => {
    try { return ctx.llm.registration(provider).adapter } catch { return undefined }
  }
  const sourceAcceptsImages = async (model) => {
    const original = originalAdapter()
    if (original === undefined || typeof original.resolveModel !== 'function') return false
    try {
      const info = await original.resolveModel(provider, model)
      return Array.isArray(info && info.inputModalities) && info.inputModalities.includes('image')
    } catch { return false }
  }
  const rewriteImagesToMarkers = (messages) => messages.map((message) => {
    if (!message || !Array.isArray(message.content)) return message
    const result = rewriteImagesDeep(message.content, (block) => {
      const attachment = block.attachment || {}
      const id = attachment.attachmentId ?? attachment.id ?? 'unknown'
      const name = attachment.name ?? '图片'
      return [{ type: 'text', text: '[图片「' + name + '」已上传，附件 id 为「' + id + '」。当前对话模型无法直接查看图片；需要看图时' + viewImageToolHint() + '，传入 attachment_id: "' + id + '" 和具体问题。]' }]
    })
    return result.changed ? { ...message, content: result.content } : message
  })
  const adapter = {
    providerInfo() {
      const original = originalAdapter()
      let info
      try { info = original && typeof original.providerInfo === 'function' ? original.providerInfo(provider) : undefined } catch { info = undefined }
      return { id: twinRoute, name: (info && info.name ? info.name : provider) + ' + Auto Vision' }
    },
    providerRetryPolicy() {
      const original = originalAdapter()
      try { return original && typeof original.providerRetryPolicy === 'function' ? original.providerRetryPolicy(provider) : undefined } catch { return undefined }
    },
    async listModels() {
      const original = originalAdapter()
      if (original === undefined || typeof original.listModels !== 'function') return []
      try {
        const listed = await original.listModels(provider)
        return (Array.isArray(listed) ? listed : []).map((model) => ({ ...model, provider: twinRoute, inputModalities: ['text', 'image'] }))
      } catch { return [] }
    },
    async resolveModel(_provider, model) {
      const original = originalAdapter()
      if (original === undefined || typeof original.resolveModel !== 'function') throw new Error('omni-workstation: per-provider twin source not registered: ' + provider)
      const base = await original.resolveModel(provider, model)
      return { ...base, provider: twinRoute, inputModalities: ['text', 'image'] }
    },
    async *stream(options) {
      const messages = options.messages ?? []
      const model = typeof options.model === 'string' ? options.model : null
      let keepOriginalImages = false
      if (model) { try { keepOriginalImages = (await sourceAcceptsImages(model)) === true } catch { keepOriginalImages = false } }
      const rewritten = keepOriginalImages ? messages : rewriteImagesToMarkers(messages)
      yield* ctx.llm.stream({ ...options, provider, model: model || options.model, messages: rewritten })
    }
  }
  // v2.7.4: see makeTwinAdapter — agent-loop requires adapter.prepareCall.
  // Same-name metadata lookup on the source provider (per-provider twins
  // mirror every model 1:1 under identical ids).
  adapter.prepareCall = async function (_provider, model, signal) {
    const original = originalAdapter()
    let base = undefined
    if (original && typeof original.prepareCall === 'function') {
      try { base = (await original.prepareCall(provider, model, signal)).model } catch { base = undefined }
    }
    const info = Object.assign({}, base || {}, {
      provider: twinRoute,
      id: model,
      name: base && typeof base.name === 'string' && base.name.length > 0 ? base.name : String(model),
      inputModalities: ['text', 'image']
    })
    return { model: info, stream: (options) => adapter.stream(options) }
  }
  return adapter
}

// v1.9: per-mapping twin (custom list mode). ONE model with the mirrorName,
// declaring image input. stream() delegates to the FIXED
// originalProvider/originalModel (not lastSource) so the mapping is stable
// across agent turns. Route id `omni-workstation-m-<sanitized>` is filtered by the
// self-recursion guards.
function makeMappingTwinAdapter(ctx, mapping) {
  const routeId = mirrorRouteId(mirrorDisplayName(mapping))
  const displayName = mirrorDisplayName(mapping)
  const { originalProvider, originalModel } = mapping
  const originalAdapter = () => {
    try { return ctx.llm.registration(originalProvider).adapter } catch { return undefined }
  }
  const sourceAcceptsImages = async () => {
    const original = originalAdapter()
    if (original === undefined || typeof original.resolveModel !== 'function') return false
    try {
      const info = await original.resolveModel(originalProvider, originalModel)
      return Array.isArray(info && info.inputModalities) && info.inputModalities.includes('image')
    } catch { return false }
  }
  const rewriteImagesToMarkers = (messages) => messages.map((message) => {
    if (!message || !Array.isArray(message.content)) return message
    const result = rewriteImagesDeep(message.content, (block) => {
      const attachment = block.attachment || {}
      const id = attachment.attachmentId ?? attachment.id ?? 'unknown'
      const name = attachment.name ?? '图片'
      return [{ type: 'text', text: '[图片「' + name + '」已上传，附件 id 为「' + id + '」。当前对话模型无法直接查看图片；需要看图时' + viewImageToolHint() + '，传入 attachment_id: "' + id + '" 和具体问题。]' }]
    })
    return result.changed ? { ...message, content: result.content } : message
  })
  const adapter = {
    providerInfo() {
      const original = originalAdapter()
      let info
      try { info = original && typeof original.providerInfo === 'function' ? original.providerInfo(originalProvider) : undefined } catch { info = undefined }
      const base = info && info.name ? info.name : originalProvider
      return { id: routeId, name: base + ' · ' + displayName }
    },
    providerRetryPolicy() {
      const original = originalAdapter()
      try { return original && typeof original.providerRetryPolicy === 'function' ? original.providerRetryPolicy(originalProvider) : undefined } catch { return undefined }
    },
    async listModels() {
      return [{ id: displayName, name: displayName, provider: routeId, inputModalities: ['text', 'image'] }]
    },
    async resolveModel(_provider, _model) {
      return { id: displayName, provider: routeId, name: displayName, inputModalities: ['text', 'image'] }
    },
    async *stream(options) {
      const messages = options.messages ?? []
      let keepOriginalImages = false
      try { keepOriginalImages = (await sourceAcceptsImages()) === true } catch { keepOriginalImages = false }
      const rewritten = keepOriginalImages ? messages : rewriteImagesToMarkers(messages)
      yield* ctx.llm.stream({ ...options, provider: originalProvider, model: originalModel, messages: rewritten })
    }
  }
  // v2.7.4: see makeTwinAdapter — agent-loop requires adapter.prepareCall.
  // Metadata lookup targets the mapping's fixed original provider/model.
  adapter.prepareCall = async function (_provider, model, signal) {
    const original = originalAdapter()
    let base = undefined
    if (original && typeof original.prepareCall === 'function') {
      try { base = (await original.prepareCall(originalProvider, originalModel, signal)).model } catch { base = undefined }
    }
    const info = Object.assign({}, base || {}, {
      provider: routeId,
      id: model,
      name: base && typeof base.name === 'string' && base.name.length > 0 ? base.name : displayName,
      inputModalities: ['text', 'image']
    })
    return { model: info, stream: (options) => adapter.stream(options) }
  }
  return adapter
}

// v1.9: Reconcile twin routes against the live llm registry, gated on the SAME
// `shouldVlm` flag as analyze_image. Three independent modes:
//  1. autoVisionEnabled → single `auto-vision` twin (v1.8)
//  2. mirrorAllEnabled → per-provider `<provider>-omni-workstation` twins (v1.7)
//  3. !mirrorAllEnabled + mappings → per-mapping `omni-workstation-m-*` twins
// Mode 2 masks mode 3 (per-provider twins already cover every model).
async function syncTwins(ctx, cfg, shouldVlm) {
  const mc = cfg.mirrorConfig || defaultMirrorConfig()
  // Build the wanted set: routeId → spec
  const wanted = new Map()
  if (shouldVlm) {
    if (mc.autoVisionEnabled) wanted.set('auto-vision', { type: 'auto-vision' })
    if (mc.mirrorAllEnabled) {
      let providers = []
      try {
        providers = ctx.llm.listProviders()
          .map((entry) => (entry && typeof entry.id === 'string' ? entry.id : ''))
          .filter(Boolean)
      } catch { providers = [] }
      for (const provider of providers) {
        if (provider === 'auto-vision' || provider.endsWith('-omni-workstation') || provider.endsWith('-vision') || provider.startsWith('omni-workstation-m-')) continue
        wanted.set(provider + '-omni-workstation', { type: 'per-provider', provider })
      }
    }
    if (!mc.mirrorAllEnabled && Array.isArray(mc.mappings)) {
      for (const mapping of mc.mappings) {
        if (!mapping.originalModel || mapping.originalModel.length === 0) continue
        if (!mapping.originalProvider || mapping.originalProvider.length === 0) continue
        wanted.set(mirrorRouteId(mirrorDisplayName(mapping)), { type: 'mapping', mapping })
      }
    }
  }
  // v1.8: initialize lastSourceProvider if null (needed for auto-vision)
  if (mc.autoVisionEnabled && shouldVlm && lastSourceProvider === null) {
    let providers = []
    try {
      providers = ctx.llm.listProviders()
        .map((entry) => (entry && typeof entry.id === 'string' ? entry.id : ''))
        .filter(Boolean)
    } catch { providers = [] }
    for (const provider of providers) {
      if (provider === 'auto-vision' || provider.endsWith('-omni-workstation') || provider.endsWith('-vision') || provider.startsWith('omni-workstation-m-')) continue
      lastSourceProvider = provider
      break
    }
    if (lastSourceProvider !== null) {
      try {
        const adapter = ctx.llm.registration(lastSourceProvider).adapter
        const models = await adapter.listModels(lastSourceProvider)
        const first = Array.isArray(models) && models.length > 0 ? models[0] : null
        lastSourceModel = first && (first.id || first.name) ? (first.id || first.name) : null
      } catch { lastSourceModel = null }
    }
  }
  // Dispose twins no longer wanted
  for (const [routeId, held] of [...twinHandles.entries()]) {
    if (!wanted.has(routeId)) {
      try { held.handle() } catch { /* dispose best-effort */ }
      twinHandles.delete(routeId)
    }
  }
  // Register wanted twins not yet registered
  for (const [routeId, spec] of wanted) {
    if (twinHandles.has(routeId)) continue
    try {
      let handle = null
      if (spec.type === 'auto-vision') {
        if (lastSourceProvider === null) continue // can't register yet
        handle = ctx.llm.registerAdapter(['auto-vision'], makeTwinAdapter(ctx, lastSourceProvider))
      } else if (spec.type === 'per-provider') {
        handle = ctx.llm.registerAdapter([routeId], makePerProviderTwinAdapter(ctx, spec.provider))
      } else if (spec.type === 'mapping') {
        handle = ctx.llm.registerAdapter([routeId], makeMappingTwinAdapter(ctx, spec.mapping))
      }
      if (handle) {
        ctx.effect(() => handle, 'omni-workstation: twin ' + routeId)
        twinHandles.set(routeId, { handle })
      }
    } catch (e) {
      ctx.logger?.warn('omni-workstation: twin %s failed: %s', routeId, e && e.message ? e.message : String(e))
    }
  }
}

async function syncToolRegistration() {
  if (!appCtx) return
  const cfg = await loadConfig(appCtx)
  // VLM tool (existing logic, unchanged)
  const shouldVlm = cfg.vlmEnabled !== false && (validCards(cfg).length > 0 || fallbackHasModels(cfg))
  // Auto-vision twin routes follow the same gate as analyze_image. A failure
  // here must NOT break the tool registration below.
  try {
    await syncTwins(appCtx, cfg, shouldVlm)
  } catch (e) {
    appCtx.logger?.warn('omni-workstation: syncTwins failed: %s', e && e.message ? e.message : String(e))
  }
  if (shouldVlm && !toolVisible) {
    toolDisposer = appCtx.tools.register(toolDef)
    toolVisible = true
  } else if (!shouldVlm && toolVisible) {
    if (toolDisposer) {
      toolDisposer()
      toolDisposer = null
    }
    toolVisible = false
  }
  // imggen tool (v2.6: description is provider-dependent — re-register when
  // the comfy mode flips so the ComfyUI-only guidance is injected only for it)
  const shouldImggen = cfg.imggenEnabled !== false && isImggenConfigValid(cfg.imggenConfig)
  const comfyMode = shouldImggen && (cfg.imggenConfig || {}).provider === 'comfyui'
  if (shouldImggen && (!imggenVisible || imggenComfyMode !== comfyMode)) {
    if (imggenDisposer) { try { imggenDisposer() } catch { /* best-effort */ } }
    imggenDisposer = appCtx.tools.register(buildImggenToolDef(comfyMode))
    imggenVisible = true
    imggenComfyMode = comfyMode
  } else if (!shouldImggen && imggenVisible) {
    if (imggenDisposer) {
      imggenDisposer()
      imggenDisposer = null
    }
    imggenVisible = false
    imggenComfyMode = false
  }
  // video tool (v2.8): registered ONLY when the module switch is ON and the
  // video config is valid — switch OFF / invalid config => the tool schema is
  // never injected into the model prompt (0 token cost).
  const shouldVideo = cfg.videoEnabled === true && isVideoConfigValid(cfg.videoConfig)
  // v2.8.x: the tool description injects the panel defaults (seconds/aspect/
  // retry) as initial values the model can override per user prompt; re-register
  // when that signature changes so the model always sees current defaults.
  const videoSig = shouldVideo ? [cfg.videoConfig.seconds, cfg.videoConfig.aspectRatio, cfg.videoConfig.retryCount].join('|') : ''
  if (shouldVideo && (!videoVisible || videoSig !== videoSigSeen)) {
    if (videoDisposer) { try { videoDisposer() } catch { /* best-effort */ } }
    videoDisposer = appCtx.tools.register(buildVideoToolDef(cfg.videoConfig))
    videoVisible = true
    videoSigSeen = videoSig
  } else if (!shouldVideo && videoVisible) {
    if (videoDisposer) {
      try { videoDisposer() } catch { /* best-effort */ }
      videoDisposer = null
    }
    videoVisible = false
    videoSigSeen = ''
  }
  // voice tools (v2.9): speak + clone_voice registered ONLY when the module
  // switch is ON, TTS sub-switch is ON, and the voice config is valid.
  // Switch OFF / sub-switch OFF / invalid config => 0 token cost.
  const shouldVoice = cfg.voiceEnabled === true && cfg.ttsEnabled === true && isVoiceConfigValid(cfg.voiceConfig)
  // v2.9.7: include provider in the sig so mimo↔minimax flips re-register.
  const voiceSig = shouldVoice ? [cfg.voiceConfig.provider, cfg.voiceConfig.model, cfg.voiceConfig.voiceId, cfg.voiceConfig.voiceSamplePath].join('|') : ''
  if (shouldVoice && (!voiceVisible || voiceSig !== voiceSigSeen)) {
    if (voiceDisposer) { try { voiceDisposer() } catch { /* best-effort */ } }
    if (cloneDisposer) { try { cloneDisposer() } catch { /* best-effort */ } }
    const vp = cfg.voiceConfig.provider
    // v2.9.7: provider-gated registration — speak + clone_voice both registered for
    // mimo + minimax (the only providers with synthesis wired). clone_voice replaces
    // the old mimo clone+synthesize tool and the old minimax_clone_voice tool.
    //   speak       -> mimo (runMimoTts) | minimax (runMinimaxTts)
    //   clone_voice -> mimo (validate sample path) | minimax (doMinimaxClone → voice_id)
    // doubao/indextts/voxcpm/gptsovits/tts-webui: no voice tools registered.
    voiceDisposer = (vp === 'mimo' || vp === 'minimax' || vp === 'doubao') ? appCtx.tools.register(buildSpeakToolDef(cfg.voiceConfig)) : null
    cloneDisposer = (vp === 'mimo' || vp === 'minimax' || vp === 'doubao') ? appCtx.tools.register(buildCloneVoiceToolDef(cfg.voiceConfig)) : null
    voiceVisible = true
    cloneVisible = true
    voiceSigSeen = voiceSig
  } else if (!shouldVoice && voiceVisible) {
    if (voiceDisposer) { try { voiceDisposer() } catch { /* best-effort */ } voiceDisposer = null }
    if (cloneDisposer) { try { cloneDisposer() } catch { /* best-effort */ } cloneDisposer = null }
    voiceVisible = false
    cloneVisible = false
    voiceSigSeen = ''
  }
  // vision toolkit tools (independent of vlmEnabled: local-only tools work
  // with no cards; ocr/detect degrade to NO_VLM_CARDS without cards).
  // v2.2: master switch on → each tool registered only when its individual
  // toggle is on; changing an individual toggle re-registers immediately.
  const shouldVisionTools = cfg.visionToolsEnabled !== false
  if (shouldVisionTools) {
    const expectedNames = VISION_TOOL_NAMES.filter((n) => (cfg.visionToolToggles || {})[n] !== false)
    const names = expectedNames.slice().sort().join(',')
    if (!visionToolsVisible || names !== visionToolDefNames) {
      for (const dispose of visionToolDisposers) {
        try { dispose() } catch { /* best-effort */ }
      }
      visionToolDisposers = []
      try {
        visionToolDisposers = buildVisionToolDefs({
          getCtx: () => appCtx,
          loadConfig,
          resolveImage,
          askVlm
        }).filter((def) => (cfg.visionToolToggles || {})[def.name] !== false)
          .map((def) => appCtx.tools.register(def))
        visionToolDefNames = names
        visionToolsVisible = true
      } catch (e) {
        appCtx.logger?.warn('omni-workstation: vision toolkit registration failed: %s', e && e.message ? e.message : String(e))
        visionToolDisposers = []
        visionToolDefNames = ''
        visionToolsVisible = false
      }
    }
  } else if (visionToolsVisible) {
    for (const dispose of visionToolDisposers) {
      try { dispose() } catch { /* best-effort */ }
    }
    visionToolDisposers = []
    visionToolDefNames = ''
    visionToolsVisible = false
  }
}

// ---------- config patching ----------
function applyPatch(cfg, patch) {
  const c = normalizeConfig(cfg)
  const p = patch && typeof patch === 'object' && !Array.isArray(patch) ? patch : {}
  if (p.retryCount !== undefined) c.retryCount = Number(p.retryCount)
  if (p.vlmEnabled !== undefined) c.vlmEnabled = p.vlmEnabled === true
  if (p.imggenEnabled !== undefined) c.imggenEnabled = p.imggenEnabled === true
  // v2.8: video module switch (default OFF — tool/schema injected only when ON)
  if (p.videoEnabled !== undefined) c.videoEnabled = p.videoEnabled === true
  if (p.visionToolsEnabled !== undefined) c.visionToolsEnabled = p.visionToolsEnabled === true
    if (p.visionToolToggle && p.visionToolToggle.tool && VISION_TOOL_NAMES.includes(p.visionToolToggle.tool)) {
      if (!c.visionToolToggles) c.visionToolToggles = {}
      c.visionToolToggles[p.visionToolToggle.tool] = p.visionToolToggle.value === true
    }
  if (p.imggenReset === true) c.imggenConfig = defaultImggenConfig()
  // v2.8: video config patch
  if (p.videoReset === true) c.videoConfig = defaultVideoConfig()
  if (p.videoConfig) {
    if (p.videoConfig === 'reset' || p.videoConfig.reset === true) {
      c.videoConfig = defaultVideoConfig()
    } else if (p.videoConfig.field && p.videoConfig.value !== undefined) {
      const { field, value } = p.videoConfig
      if (field === 'provider' && VIDEO_PROVIDER_IDS.includes(value)) {
        c.videoConfig.provider = value
        const vmeta = VIDEO_PROVIDERS[value]
        if (vmeta) {
          c.videoConfig.protocol = vmeta.protocol
          if (vmeta.fixedUrl) c.videoConfig.endpoint = vmeta.endpoint
          else if (!vmeta.fixedUrl && !String(c.videoConfig.endpoint || '').trim()) c.videoConfig.endpoint = vmeta.endpoint
        }
      } else if (field === 'protocol' && VIDEO_PROTOCOLS.includes(value)) c.videoConfig.protocol = value
      else if (field === 'endpoint') c.videoConfig.endpoint = String(value || '').trim()
      else if (field === 'model') c.videoConfig.model = String(value || '').trim()
      else if (field === 'apiKey') {
        if (typeof value === 'string' && value.length > 0) c.videoConfig.apiKey = value
        else if (value === null) c.videoConfig.apiKey = ''
      } else if (field === 'timeoutMs') c.videoConfig.timeoutMs = clampTimeout(value, 600000)
      else if (field === 'pollIntervalMs') c.videoConfig.pollIntervalMs = Number.isFinite(Number(value)) && Number(value) > 0 ? Math.max(1000, Math.min(Math.floor(Number(value)), 60000)) : 5000
      else if (field === 'retryCount') c.videoConfig.retryCount = Math.max(1, Math.min(Math.floor(Number(value) || 1), 5))
      else if (field === 'filterVideoModels') c.videoConfig.filterVideoModels = value === true
      else if (field === 'seconds') c.videoConfig.seconds = Math.max(1, Math.min(Math.floor(Number(value) || 5), 30))
      else if (field === 'aspectRatio' && VIDEO_ASPECT_RATIOS[value]) c.videoConfig.aspectRatio = value
      else if (field === 'resolution' && /^(720p|1080p|768p)$/i.test(String(value))) c.videoConfig.resolution = String(value).toLowerCase()
      else if (field === 'submitPath') c.videoConfig.submitPath = String(value || '').trim()
      else if (field === 'pollPath') c.videoConfig.pollPath = String(value || '').trim()
      else if (field === 'taskIdField') c.videoConfig.taskIdField = String(value || '').trim()
      else if (field === 'statusField') c.videoConfig.statusField = String(value || 'status').trim()
      else if (field === 'resultField') c.videoConfig.resultField = String(value || 'metadata.url').trim()
      else if (field === 'doneStatus') c.videoConfig.doneStatus = String(value || 'completed').trim()
    }
  }
  // sync videoConfig patches to active preset (preset is source of truth)
  if (p.videoConfig || p.videoReset === true) {
    const vp = (c.videoPresets || []).find((pr) => pr.id === c.activeVideoPreset)
    if (vp) vp.config = Object.assign({}, c.videoConfig)
  }
  // ---- video preset management (v2.8) ----
  if (p.videoPresetSwitch && typeof p.videoPresetSwitch === 'string') {
    const target = (c.videoPresets || []).find((pr) => pr.id === p.videoPresetSwitch)
    if (target) {
      c.activeVideoPreset = target.id
      c.videoConfig = Object.assign({}, target.config)
    }
  }
  if (p.videoPresetAdd === true) {
    let max = 0
    for (const pr of (c.videoPresets || [])) {
      const m = /^新预设(?:\s(\d+))?$/.exec(pr.name || '')
      if (m) max = Math.max(max, m[1] ? Number(m[1]) : 1)
    }
    const np = { id: genPresetId(), name: '新预设 ' + (max + 1), config: defaultVideoConfig() }
    c.videoPresets = (c.videoPresets || []).concat([np])
    c.activeVideoPreset = np.id
    c.videoConfig = Object.assign({}, np.config)
  }
  if (p.videoPresetDelete && typeof p.videoPresetDelete === 'string') {
    c.videoPresets = (c.videoPresets || []).filter((pr) => pr.id !== p.videoPresetDelete)
    if (c.videoPresets.length === 0) {
      const dp = { id: genPresetId(), name: '默认', config: defaultVideoConfig() }
      c.videoPresets = [dp]
      c.activeVideoPreset = dp.id
      c.videoConfig = Object.assign({}, dp.config)
    } else {
      if (c.activeVideoPreset === p.videoPresetDelete || !c.videoPresets.some((pr) => pr.id === c.activeVideoPreset)) {
        c.activeVideoPreset = c.videoPresets[0].id
      }
      const active = c.videoPresets.find((pr) => pr.id === c.activeVideoPreset)
      if (active) c.videoConfig = Object.assign({}, active.config)
    }
  }
  if (p.videoPresetRename && typeof p.videoPresetRename === 'string') {
    const vp = (c.videoPresets || []).find((pr) => pr.id === c.activeVideoPreset)
    if (vp) vp.name = String(p.videoPresetRename).slice(0, 60)
  }
  // v2.8.1: voice toggles
  if (p.voiceEnabled !== undefined) c.voiceEnabled = p.voiceEnabled === true
  if (p.ttsEnabled !== undefined) c.ttsEnabled = p.ttsEnabled === true
  if (p.sttEnabled !== undefined) c.sttEnabled = p.sttEnabled === true
  // v2.9.1: voice config patch — namespaced by active subtab (TTS/STT presets independent)
  const vst = p.voiceSubtab === 'stt' ? 'Stt' : ''
  const vcKey = 'voiceConfig' + vst
  const vpKey = 'voicePresets' + vst
  const vaKey = 'activeVoicePreset' + vst
  if (p.voiceReset === true) c[vcKey] = defaultVoiceConfig()
  if (p.voiceConfig) {
    if (p.voiceConfig === 'reset' || p.voiceConfig.reset === true) {
      c[vcKey] = defaultVoiceConfig()
    } else if (p.voiceConfig.field && p.voiceConfig.value !== undefined) {
      const { field, value } = p.voiceConfig
      if (field === 'provider' && VOICE_PROVIDER_IDS.includes(value)) {
        c[vcKey].provider = value
        const vmeta = VOICE_PROVIDERS[value]
        if (vmeta) {
          c[vcKey].protocol = vmeta.protocol
          if (vmeta.fixedUrl) c[vcKey].endpoint = vmeta.endpoint
          else if (!vmeta.fixedUrl && !String(c[vcKey].endpoint || '').trim()) c[vcKey].endpoint = vmeta.endpoint
        }
        // v2.9.7: reset voiceId to provider-appropriate default on provider switch.
        // minimax is EXCLUDED — its voiceId may be a user-cloned voice_id
        // (from clone_voice / panel clone), and runMinimaxTts throws on empty voiceId.
        if (value === 'mimo') c[vcKey].voiceId = 'mimo_default'
        else if (value === 'doubao') c[vcKey].voiceId = 'zh_female_vv_uranus_bigtts'
        else if (value !== 'minimax') c[vcKey].voiceId = ''
        // minimax: voiceId untouched (preserve cloned voice_id)
        // v2.9.8: also reset model to provider-appropriate default — prevents
        // stale mimo model (mimo-v2.5-tts-voiceclone) leaking into doubao (needs
        // seed-tts-2.0) or minimax (needs speech-2.8-hd) on provider switch.
        if (value === 'mimo') c[vcKey].model = 'mimo-v2.5-tts'
        else if (value === 'minimax') c[vcKey].model = 'speech-2.8-hd'
        else if (value === 'doubao') c[vcKey].model = 'seed-tts-2.0'
        else c[vcKey].model = ''
      } else if (field === 'protocol' && VOICE_PROTOCOLS.includes(value)) c[vcKey].protocol = value
      else if (field === 'endpoint') c[vcKey].endpoint = String(value || '').trim()
      else if (field === 'model') c[vcKey].model = String(value || '').trim()
      else if (field === 'voiceId') c[vcKey].voiceId = String(value || '').trim()
      else if (field === 'apiKey') {
        if (typeof value === 'string' && value.length > 0) c[vcKey].apiKey = value
        else if (value === null) c[vcKey].apiKey = ''
      } else if (field === 'timeoutMs') c[vcKey].timeoutMs = clampTimeout(value, 120000)
      else if (field === 'styleInstruction') c[vcKey].styleInstruction = String(value || '').trim()
      else if (field === 'singMode') c[vcKey].singMode = value === true
      else if (field === 'optimizeText') c[vcKey].optimizeText = value === true
      else if (field === 'voiceSamplePath') c[vcKey].voiceSamplePath = String(value || '').trim()
      else if (field === 'outputFormat' && typeof value === 'string') c[vcKey].outputFormat = value.trim()
      else if (field === 'streamOutput') c[vcKey].streamOutput = value === true
      else if (field === 'filterVoiceModels') c[vcKey].filterVoiceModels = value === true
      else if (field === 'retryCount') c[vcKey].retryCount = Math.max(1, Math.min(Math.floor(Number(value) || 1), 10))
      else if (field === 'appId') c[vcKey].appId = String(value || '').trim()
      else if (field === 'accessKey') c[vcKey].accessKey = String(value || '').trim()
      else if (field === 'emoStrategy') c[vcKey].emoStrategy = String(value || '').trim()
      else if (field === 'emoWeight') c[vcKey].emoWeight = String(value || '').trim()
      else if (field === 'mode' && (value === 'clone' || value === 'design')) c[vcKey].mode = value
      else if (field === 'region' && (value === 'cn' || value === 'global')) c[vcKey].region = value
    }
  }
  // sync voiceConfig patches to active preset (preset is source of truth)
  if (p.voiceConfig || p.voiceReset === true) {
    const vp = (c[vpKey] || []).find((pr) => pr.id === c[vaKey])
    if (vp) vp.config = Object.assign({}, c[vcKey])
  }
  // ---- voice preset management (v2.8.1, namespaced by subtab) ----
  if (p.voicePresetSwitch && typeof p.voicePresetSwitch === 'string') {
    const target = (c[vpKey] || []).find((pr) => pr.id === p.voicePresetSwitch)
    if (target) {
      c[vaKey] = target.id
      c[vcKey] = Object.assign({}, target.config)
    }
  }
  if (p.voicePresetAdd === true) {
    let max = 0
    for (const pr of (c[vpKey] || [])) {
      const m = /^新预设(?:\s(\d+))?$/.exec(pr.name || '')
      if (m) max = Math.max(max, m[1] ? Number(m[1]) : 1)
    }
    const np = { id: genPresetId(), name: '新预设 ' + (max + 1), config: defaultVoiceConfig() }
    c[vpKey] = (c[vpKey] || []).concat([np])
    c[vaKey] = np.id
    c[vcKey] = Object.assign({}, np.config)
  }
  if (p.voicePresetDelete && typeof p.voicePresetDelete === 'string') {
    c[vpKey] = (c[vpKey] || []).filter((pr) => pr.id !== p.voicePresetDelete)
    if (c[vpKey].length === 0) {
      const dp = { id: genPresetId(), name: '默认', config: defaultVoiceConfig() }
      c[vpKey] = [dp]
      c[vaKey] = dp.id
      c[vcKey] = Object.assign({}, dp.config)
    } else {
      if (c[vaKey] === p.voicePresetDelete || !c[vpKey].some((pr) => pr.id === c[vaKey])) {
        c[vaKey] = c[vpKey][0].id
      }
      const active = c[vpKey].find((pr) => pr.id === c[vaKey])
      if (active) c[vcKey] = Object.assign({}, active.config)
    }
  }
  if (p.voicePresetRename && typeof p.voicePresetRename === 'string') {
    const vp = (c[vpKey] || []).find((pr) => pr.id === c[vaKey])
    if (vp) vp.name = String(p.voicePresetRename).slice(0, 60)
  }
  // ---- voice library management (v2.8.1) ----
  if (p.voiceLibraryAdd) {
    const entry = {
      id: typeof p.voiceLibraryAdd.id === 'string' ? p.voiceLibraryAdd.id : 'vl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
      name: typeof p.voiceLibraryAdd.name === 'string' ? p.voiceLibraryAdd.name : '未命名',
      provider: typeof p.voiceLibraryAdd.provider === 'string' ? p.voiceLibraryAdd.provider : 'mimo',
      type: typeof p.voiceLibraryAdd.type === 'string' ? p.voiceLibraryAdd.type : 'clone',
      samplePath: typeof p.voiceLibraryAdd.samplePath === 'string' ? p.voiceLibraryAdd.samplePath : '',
      createdAt: typeof p.voiceLibraryAdd.createdAt === 'number' ? p.voiceLibraryAdd.createdAt : Date.now()
    }
    c.voiceLibrary = (c.voiceLibrary || []).concat([entry])
  }
  if (p.voiceLibraryRemove && typeof p.voiceLibraryRemove === 'string') {
    c.voiceLibrary = (c.voiceLibrary || []).filter((e) => e.id !== p.voiceLibraryRemove)
  }
  // ---- doubao clone preset management (v2.9.9, shared across voice config presets) ----
  if (typeof c.doubaoClonePresets !== 'object' || !Array.isArray(c.doubaoClonePresets)) c.doubaoClonePresets = [{ id: 'dcp_' + Date.now().toString(36), name: '默认', speakerId: '', refAudioPath: '' }]
  if (typeof c.activeDoubaoClonePreset !== 'string' || !c.doubaoClonePresets.some((pr) => pr.id === c.activeDoubaoClonePreset)) c.activeDoubaoClonePreset = c.doubaoClonePresets[0].id
  if (p.doubaoClonePresetSwitch && typeof p.doubaoClonePresetSwitch === 'string') {
    if (c.doubaoClonePresets.some((pr) => pr.id === p.doubaoClonePresetSwitch)) c.activeDoubaoClonePreset = p.doubaoClonePresetSwitch
  }
  if (p.doubaoClonePresetAdd === true) {
    const np = { id: 'dcp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4), name: '新预设 ' + ((c.doubaoClonePresets || []).length + 1), speakerId: '', refAudioPath: '' }
    c.doubaoClonePresets = (c.doubaoClonePresets || []).concat([np])
    c.activeDoubaoClonePreset = np.id
  }
  if (p.doubaoClonePresetDelete && typeof p.doubaoClonePresetDelete === 'string') {
    c.doubaoClonePresets = (c.doubaoClonePresets || []).filter((pr) => pr.id !== p.doubaoClonePresetDelete)
    if (c.doubaoClonePresets.length === 0) { const dp = { id: 'dcp_' + Date.now().toString(36), name: '默认', speakerId: '', refAudioPath: '' }; c.doubaoClonePresets = [dp]; c.activeDoubaoClonePreset = dp.id }
    else if (!c.doubaoClonePresets.some((pr) => pr.id === c.activeDoubaoClonePreset)) c.activeDoubaoClonePreset = c.doubaoClonePresets[0].id
  }
  if (p.doubaoClonePresetRename && typeof p.doubaoClonePresetRename === 'string') {
    const dcp = c.doubaoClonePresets.find((pr) => pr.id === c.activeDoubaoClonePreset)
    if (dcp) dcp.name = String(p.doubaoClonePresetRename).slice(0, 60)
  }
  if (p.doubaoClonePresetPatch && typeof p.doubaoClonePresetPatch === 'object') {
    const dcp = c.doubaoClonePresets.find((pr) => pr.id === c.activeDoubaoClonePreset)
    if (dcp) {
      if (typeof p.doubaoClonePresetPatch.speakerId === 'string') dcp.speakerId = p.doubaoClonePresetPatch.speakerId
      if (typeof p.doubaoClonePresetPatch.refAudioPath === 'string') dcp.refAudioPath = p.doubaoClonePresetPatch.refAudioPath
    }
  }
  if (p.imggenConfig) {
    // reset (full or flag)
    if (p.imggenConfig === 'reset' || p.imggenConfig.reset === true) {
      c.imggenConfig = defaultImggenConfig()
    } else if (p.imggenConfig.field && p.imggenConfig.value !== undefined) {
      const { field, value } = p.imggenConfig
      if (field === 'provider' && PROVIDER_IDS.includes(value)) {
        c.imggenConfig.provider = value
        const meta = PROVIDERS[value]
        if (value === 'bailian') { c.imggenConfig.protocol = 'dashscope-image'; c.imggenConfig.apiPath = '' }
        else if (value === 'comfyui') {
          c.imggenConfig.protocol = 'comfyui-image'; c.imggenConfig.apiPath = ''
          // ComfyUI render can take minutes (queue + render): bump the default
          // timeout to 600000 unless the user already changed it from 300000.
          if (c.imggenConfig.timeoutMs == null || c.imggenConfig.timeoutMs === 300000) c.imggenConfig.timeoutMs = 600000
        }
        else if (meta && meta.fixedUrl) { c.imggenConfig.protocol = 'openai-images'; c.imggenConfig.endpoint = meta.endpoint; c.imggenConfig.apiPath = '' }
      } else if (field === 'protocol' && IMGGEN_PROTOCOLS.includes(value)) c.imggenConfig.protocol = value
      else if (field === 'endpoint') c.imggenConfig.endpoint = String(value || '').trim()
      else if (field === 'apiPath') c.imggenConfig.apiPath = String(value || '').trim()
      else if (field === 'model') c.imggenConfig.model = String(value || '').trim()
      else if (field === 'vae') c.imggenConfig.vae = String(value || '').trim()
      else if (field === 'clip') c.imggenConfig.clip = String(value || '').trim()
      else if (field === 'timeoutMs') c.imggenConfig.timeoutMs = clampTimeout(value, 300000)
      else if (field === 'retryCount') c.imggenConfig.retryCount = Math.max(1, Math.min(Math.floor(Number(value) || 2), 10))
      else if (field === 'responseFormat' && ['auto', 'b64_json', 'url'].includes(value)) c.imggenConfig.responseFormat = value
      else if (field === 'filterImageModels') c.imggenConfig.filterImageModels = value === true
      else if (field === 'apiKey') {
       if (typeof value === 'string' && value.length > 0) c.imggenConfig.apiKey = value
       else if (value === null) c.imggenConfig.apiKey = ''
     }
   }
 }
  // sync imggenConfig patches to active preset (preset is source of truth)
  if (p.imggenConfig || p.imggenReset === true) {
    const ap = (c.imggenPresets || []).find((pr) => pr.id === c.activeImggenPreset)
    if (ap) ap.config = Object.assign({}, c.imggenConfig)
  }
  // ---- imggen preset management (v2.1) ----
  if (p.imggenPresetSwitch && typeof p.imggenPresetSwitch === 'string') {
    const target = (c.imggenPresets || []).find((pr) => pr.id === p.imggenPresetSwitch)
    if (target) {
      c.activeImggenPreset = target.id
      c.imggenConfig = Object.assign({}, target.config)
    }
  }
  if (p.imggenPresetAdd === true) {
    // v2.6: new presets are numbered so multiple unnamed presets are distinguishable
    let max = 0
    for (const pr of (c.imggenPresets || [])) {
      const m = /^新预设(?:\s(\d+))?$/.exec(pr.name || '')
      if (m) max = Math.max(max, m[1] ? Number(m[1]) : 1)
    }
    const np = { id: genPresetId(), name: '新预设 ' + (max + 1), config: defaultImggenConfig() }
    c.imggenPresets = (c.imggenPresets || []).concat([np])
    c.activeImggenPreset = np.id
    c.imggenConfig = Object.assign({}, np.config)
  }
  if (p.imggenPresetDelete && typeof p.imggenPresetDelete === 'string') {
    c.imggenPresets = (c.imggenPresets || []).filter((pr) => pr.id !== p.imggenPresetDelete)
    if (c.imggenPresets.length === 0) {
      // 清空所有预设 → 自动新建 '默认' 预设（所有配置为初始状态）
      const dp = { id: genPresetId(), name: '默认', config: defaultImggenConfig() }
      c.imggenPresets = [dp]
      c.activeImggenPreset = dp.id
      c.imggenConfig = Object.assign({}, dp.config)
    } else {
      if (c.activeImggenPreset === p.imggenPresetDelete || !c.imggenPresets.some((pr) => pr.id === c.activeImggenPreset)) {
        c.activeImggenPreset = c.imggenPresets[0].id
      }
      const active = c.imggenPresets.find((pr) => pr.id === c.activeImggenPreset)
      if (active) c.imggenConfig = Object.assign({}, active.config)
    }
  }
  if (p.imggenPresetRename && typeof p.imggenPresetRename === 'string') {
    const ap = (c.imggenPresets || []).find((pr) => pr.id === c.activeImggenPreset)
    if (ap) ap.name = String(p.imggenPresetRename).slice(0, 60)
  }
  // NOTE: activeComfyWorkflow/comfyWorkflows are TOP-LEVEL, NOT inside imggenConfig.
  // When imggenPresetSwitch overwrites c.imggenConfig above, they are untouched.
  // ---- comfy workflow CRUD (v2.7) ----
  if (p.comfyWfImport && typeof p.comfyWfImport === 'object') {
    // comfyWfImport is pre-parsed by the POST handler (async prepareComfyWorkflow)
    const entry = {
      id: typeof p.comfyWfImport.id === 'string' ? p.comfyWfImport.id : 'wf_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
      name: typeof p.comfyWfImport.name === 'string' ? p.comfyWfImport.name : '工作流',
      workflow: typeof p.comfyWfImport.workflow === 'string' ? p.comfyWfImport.workflow : '',
      mapping: p.comfyWfImport.mapping && typeof p.comfyWfImport.mapping === 'object' ? p.comfyWfImport.mapping : null,
      steps: p.comfyWfImport.steps !== undefined ? p.comfyWfImport.steps : '',
      cfg: p.comfyWfImport.cfg !== undefined ? p.comfyWfImport.cfg : '',
      scheduler: p.comfyWfImport.scheduler !== undefined ? p.comfyWfImport.scheduler : '',
      seed: p.comfyWfImport.seed !== undefined ? p.comfyWfImport.seed : ''
    }
    const wasEmpty = (c.comfyWorkflows || []).length === 0
    c.comfyWorkflows = (c.comfyWorkflows || []).concat([entry])
    if (wasEmpty) c.activeComfyWorkflow = entry.id
  }
  if (p.comfyWfDelete && typeof p.comfyWfDelete === 'object' && typeof p.comfyWfDelete.id === 'string') {
    c.comfyWorkflows = (c.comfyWorkflows || []).filter((w) => w.id !== p.comfyWfDelete.id)
    if (c.activeComfyWorkflow === p.comfyWfDelete.id) {
      c.activeComfyWorkflow = c.comfyWorkflows.length > 0 ? c.comfyWorkflows[0].id : ''
    }
  }
  if (p.comfyWfRename && typeof p.comfyWfRename === 'object' && typeof p.comfyWfRename.id === 'string' && typeof p.comfyWfRename.name === 'string') {
    const wf = (c.comfyWorkflows || []).find((w) => w.id === p.comfyWfRename.id)
    if (wf) wf.name = p.comfyWfRename.name
  }
  if (p.comfyWfToggle && typeof p.comfyWfToggle === 'object' && typeof p.comfyWfToggle.id === 'string') {
    c.activeComfyWorkflow = p.comfyWfToggle.id
  }
  if (p.comfyWfUpdateConfig && typeof p.comfyWfUpdateConfig === 'object' && typeof p.comfyWfUpdateConfig.id === 'string') {
    const wf = (c.comfyWorkflows || []).find((w) => w.id === p.comfyWfUpdateConfig.id)
    if (wf) {
      if (p.comfyWfUpdateConfig.steps !== undefined) wf.steps = p.comfyWfUpdateConfig.steps === '' || p.comfyWfUpdateConfig.steps == null ? '' : Number(p.comfyWfUpdateConfig.steps)
      if (p.comfyWfUpdateConfig.cfg !== undefined) wf.cfg = p.comfyWfUpdateConfig.cfg === '' || p.comfyWfUpdateConfig.cfg == null ? '' : Number(p.comfyWfUpdateConfig.cfg)
      if (p.comfyWfUpdateConfig.scheduler !== undefined) wf.scheduler = typeof p.comfyWfUpdateConfig.scheduler === 'string' ? p.comfyWfUpdateConfig.scheduler : ''
      if (p.comfyWfUpdateConfig.seed !== undefined) wf.seed = p.comfyWfUpdateConfig.seed === '' || p.comfyWfUpdateConfig.seed == null ? '' : Number(p.comfyWfUpdateConfig.seed)
    }
  }
  if (p.comfyWfAutoMap && typeof p.comfyWfAutoMap === 'object' && typeof p.comfyWfAutoMap.id === 'string') {
    // comfyWfAutoMap is pre-parsed by the POST handler (async detectComfyMapping)
    const wf = (c.comfyWorkflows || []).find((w) => w.id === p.comfyWfAutoMap.id)
    if (wf && p.comfyWfAutoMap.mapping && typeof p.comfyWfAutoMap.mapping === 'object') {
      wf.mapping = p.comfyWfAutoMap.mapping
    }
  }
  if (p.comfyWfUpdateMapping && typeof p.comfyWfUpdateMapping === 'object' && typeof p.comfyWfUpdateMapping.id === 'string') {
    const wf = (c.comfyWorkflows || []).find((w) => w.id === p.comfyWfUpdateMapping.id)
    if (wf) {
      if (!wf.mapping || typeof wf.mapping !== 'object') wf.mapping = {}
      if (typeof p.comfyWfUpdateMapping.key === 'string' && typeof p.comfyWfUpdateMapping.value === 'string') {
        wf.mapping[p.comfyWfUpdateMapping.key] = p.comfyWfUpdateMapping.value
      }
    }
  }
  if (p.comfyWfUpdateJson && typeof p.comfyWfUpdateJson === 'object' && typeof p.comfyWfUpdateJson.id === 'string') {
    // comfyWfUpdateJson is pre-parsed by the POST handler (async prepareComfyWorkflow)
    const wf = (c.comfyWorkflows || []).find((w) => w.id === p.comfyWfUpdateJson.id)
    if (wf && typeof p.comfyWfUpdateJson.workflow === 'string') {
      wf.workflow = p.comfyWfUpdateJson.workflow
    }
  }
  if (p.fallbackConfig) {
    if (p.fallbackConfig === 'reset' || p.fallbackConfig.reset === true) {
      c.fallbackConfig = defaultFallbackConfig()
    } else if (p.fallbackConfig.field && p.fallbackConfig.value !== undefined) {
      const { field, value } = p.fallbackConfig
      if (field === 'provider' && Object.keys(FALLBACK_PROVIDERS).includes(value)) {
        c.fallbackConfig.provider = value
        var curModels = c.fallbackConfig.models || []
        var isOvhDefaults = curModels.length > 0 && curModels.every(function (m) { return OVHCLOUD_DEFAULT_MODELS.indexOf(m) >= 0 })
        if (curModels.length === 0 || isOvhDefaults) {
          c.fallbackConfig.models = [...OVHCLOUD_DEFAULT_MODELS]
        }
      } else if (field === 'timeoutMs') c.fallbackConfig.timeoutMs = clampTimeout(value, 120000)
      else if (field === 'resetModels') { c.fallbackConfig.models = [...OVHCLOUD_DEFAULT_MODELS] }
      else if (field === 'addModel' && typeof value === 'string' && value.length > 0) {
        if (!c.fallbackConfig.models.includes(value)) c.fallbackConfig.models.push(value)
      } else if (field === 'removeModel' && typeof value === 'string') {
        c.fallbackConfig.models = c.fallbackConfig.models.filter(m => m !== value)
      } else if (field === 'reorder' && value && typeof value === 'object' && Number.isInteger(value.from) && Number.isInteger(value.to)) {
        var arr = c.fallbackConfig.models.slice()
        var from = Math.max(0, Math.min(arr.length - 1, value.from))
        var to = Math.max(0, Math.min(arr.length - 1, value.to))
        if (from !== to) { var moved = arr.splice(from, 1)[0]; arr.splice(to, 0, moved); c.fallbackConfig.models = arr }
      }
    }
  }
  if (p.globalConfig) {
    if (p.globalConfig === 'reset' || p.globalConfig.reset === true) {
      c.globalConfig = defaultGlobalConfig()
    } else if (p.globalConfig.field && p.globalConfig.value !== undefined) {
      const { field, value } = p.globalConfig
      if (field === 'backoffBase') c.globalConfig.backoffBase = Math.max(100, Math.floor(Number(value) || 800))
      else if (field === 'backoffMax') c.globalConfig.backoffMax = Math.max(500, Math.floor(Number(value) || 5000))
      else if (field === 'backoff429Base') c.globalConfig.backoff429Base = Math.max(100, Math.floor(Number(value) || 2000))
      else if (field === 'backoff429Max') c.globalConfig.backoff429Max = Math.max(500, Math.floor(Number(value) || 10000))
      else if (field === 'retryStatusCodes') c.globalConfig.retryStatusCodes = String(value || '402,408,429,500,502,503,504,NET')
      else if (field === 'verifyReminder') c.globalConfig.verifyReminder = value === true
    }
  }
  if (p.mirrorConfig) {
    if (p.mirrorConfig === 'reset' || p.mirrorConfig.reset === true) {
      c.mirrorConfig = defaultMirrorConfig()
    } else if (p.mirrorConfig.field && p.mirrorConfig.value !== undefined) {
      const { field, value } = p.mirrorConfig
      const mc = c.mirrorConfig
      if (field === 'autoVisionEnabled') mc.autoVisionEnabled = value === true
      else if (field === 'mirrorAllEnabled') mc.mirrorAllEnabled = value === true
      else if (field === 'addMapping' && value && typeof value === 'object') {
        mc.mappings = (mc.mappings || []).concat([{
          id: typeof value.id === 'string' && value.id.length > 0 ? value.id : genId(),
          originalProvider: typeof value.originalProvider === 'string' ? value.originalProvider : '',
          originalModel: typeof value.originalModel === 'string' ? value.originalModel : '',
          mirrorName: typeof value.mirrorName === 'string' ? value.mirrorName.trim() : ''
        }])
      } else if (field === 'removeMapping' && typeof value === 'string') {
        mc.mappings = (mc.mappings || []).filter((m) => m.id !== value)
      } else if (field === 'updateMapping' && value && typeof value === 'object' && typeof value.id === 'string') {
        mc.mappings = (mc.mappings || []).map((m) => {
          if (m.id !== value.id) return m
          const next = { ...m }
          if (typeof value.originalProvider === 'string') next.originalProvider = value.originalProvider
          if (typeof value.originalModel === 'string' && value.originalModel.length > 0) next.originalModel = value.originalModel
          if (typeof value.mirrorName === 'string') next.mirrorName = value.mirrorName.trim()
          return next
        })
      } else if (field === 'reorder' && value && typeof value === 'object' && Number.isInteger(value.from) && Number.isInteger(value.to)) {
        var mArr = (mc.mappings || []).slice()
        var mFrom = Math.max(0, Math.min(mArr.length - 1, value.from))
        var mTo = Math.max(0, Math.min(mArr.length - 1, value.to))
        if (mFrom !== mTo) { var mMoved = mArr.splice(mFrom, 1)[0]; mArr.splice(mTo, 0, mMoved); mc.mappings = mArr }
      }
    } else if (Array.isArray(p.mirrorConfig.mappings)) {
      // Full mirrorConfig replacement
      c.mirrorConfig = normalizeMirrorConfig(p.mirrorConfig)
    }
  }
  // 全量 apis 替换（供拖拽重排等）
  if (Array.isArray(p.apis)) {
    c.apis = p.apis.map((a) => {
      if (!a || typeof a !== 'object') return newCard()
      const target = c.apis.find((x) => x.id === a.id) || newCard()
      const patch = Object.assign({}, target, {
        id: target.id,
        name: typeof a.name === 'string' && a.name.length > 0 ? a.name.slice(0, 60) : target.name,
        provider: PROVIDER_IDS.includes(a.provider) ? a.provider : target.provider,
        protocol: PROTOCOLS.includes(a.protocol) ? a.protocol : target.protocol,
        endpoint: typeof a.endpoint === 'string' ? a.endpoint : target.endpoint,
        model: typeof a.model === 'string' ? a.model : target.model,
        collapsed: a.collapsed === true,
        contextWindow: typeof a.contextWindow === 'number' ? a.contextWindow : target.contextWindow,
        maxOutput: typeof a.maxOutput === 'number' ? a.maxOutput : target.maxOutput
      })
      // timeoutMs：补丁里有合法数值才覆盖，否则保留 target 现值
      if (a.timeoutMs !== undefined && a.timeoutMs !== null && a.timeoutMs !== '') {
        patch.timeoutMs = clampTimeout(a.timeoutMs)
      }
      // apiKey：显式传入字符串则覆盖；传入 null 则清空；未传（masked 结构）保留 target 现值
      if (a.apiKey !== undefined) {
        if (typeof a.apiKey === 'string' && a.apiKey.length > 0) patch.apiKey = a.apiKey
        else if (a.apiKey === null) patch.apiKey = ''
      }
      return patch
    })
  }
  // 单卡片单字段补丁
  if (p.patchCard && p.patchCard.id) {
    const target = c.apis.find((x) => x.id === p.patchCard.id)
    if (target) {
      const { field, value } = p.patchCard
      if (field === 'name') target.name = String(value || '').slice(0, 60)
      else if (field === 'endpoint') target.endpoint = String(value || '').trim()
      else if (field === 'model') target.model = String(value || '').trim()
      else if (field === 'timeoutMs') {
        if (value !== undefined && value !== null && String(value).trim() !== '') target.timeoutMs = clampTimeout(value)
      } else if (field === 'apiKey') {
        if (typeof value === 'string' && value.length > 0) target.apiKey = value
        else if (value === null) target.apiKey = ''
      } else if (field === 'provider' && PROVIDER_IDS.includes(value)) target.provider = value
      else if (field === 'protocol' && PROTOCOLS.includes(value)) target.protocol = value
      else if (field === 'collapsed') target.collapsed = value === true
      else if (field === 'contextWindow') { if (value !== undefined && value !== null && String(value).trim() !== '') target.contextWindow = Math.max(1, Math.floor(Number(value) || 262144)) }
      else if (field === 'maxOutput') { if (value !== undefined && value !== null && String(value).trim() !== '') target.maxOutput = Math.max(1, Math.floor(Number(value) || 32768)) }
    }
  }
  // 新增卡片
  if (p.addCard) {
    const at = Number.isInteger(p.addCard.at) ? Math.max(0, Math.min(c.apis.length, p.addCard.at)) : c.apis.length
    c.apis.splice(at, 0, newCard())
  }
  // 删除卡片
  if (p.deleteCard && p.deleteCard.id) {
    c.apis = c.apis.filter((x) => x.id !== p.deleteCard.id)
  }
  // 重排
  if (p.reorderCard && p.reorderCard.id && Number.isInteger(p.reorderCard.to)) {
    const from = c.apis.findIndex((x) => x.id === p.reorderCard.id)
    const to = Math.max(0, Math.min(c.apis.length - 1, p.reorderCard.to))
    if (from >= 0 && from !== to) {
      const [moved] = c.apis.splice(from, 1)
      c.apis.splice(to, 0, moved)
    }
  }
  // 置顶 / 沉底
  if (p.moveCardTo && p.moveCardTo.id) {
    const from = c.apis.findIndex((x) => x.id === p.moveCardTo.id)
    if (from >= 0) {
      const [moved] = c.apis.splice(from, 1)
      if (p.moveCardTo.position === 'top') c.apis.unshift(moved)
      else c.apis.push(moved)
    }
  }
  return normalizeConfig(c)
}

// ---------- web settings routes (browser <-> host over HTTP) ----------
const readBody = (req) => new Promise((resolve) => {
  let data = ''
  req.on('data', (chunk) => { data += chunk })
  req.on('end', () => resolve(data || null))
  req.on('error', () => resolve(null))
})
const jsonOut = (res, status, obj) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  })
  res.end(JSON.stringify(obj))
}

function apply(ctx) {
  appCtx = ctx
  const webServer = ctx.get('webServer')

  // 首次启动：按当前配置决定工具是否可见
  syncToolRegistration()

  // 供应商适配器注册/卸载（如用户配置的供应商在设置文档加载后上线）时，
  // 重新对账 twin 路由。幂等：自身注册触发的重入会被 `-omni-workstation` 后缀排除。
  ctx.on('llm/adapters-updated', () => {
    void (async () => {
      const cfg = await loadConfig(ctx)
      const should = cfg.vlmEnabled !== false && (validCards(cfg).length > 0 || fallbackHasModels(cfg))
      await syncTwins(ctx, cfg, should)
    })().catch((e) => ctx.logger?.warn('omni-workstation: adapters-updated sync failed: %s', e && e.message ? e.message : String(e)))
  })

  // v1.8: track the last source provider/model the agent used so twin
  // routes wrap only that one provider. `agent/request` is a cordis
  // waterfall: each listener gets (payload, next); it MUST call next() and
  // RETURN the config (the waterfall's return value is the outermost
  // listener's return — returning undefined breaks the agent). The twin
  // reconcile runs fire-and-forget in the background; the request is never
  // blocked or modified. Filter out twin routes (auto-vision / *-omni-workstation /
  // *-vision) so the twin's own requests don't overwrite lastSource (that
  // would freeze it to the twin route and recurse).
  ctx.on('agent/request', async (payload, next) => {
    const config = await next()
    if (!config || typeof config.provider !== 'string') return config
    const provider = config.provider
    if (provider === 'auto-vision' || provider.endsWith('-omni-workstation') || provider.endsWith('-vision') || provider.startsWith('omni-workstation-m-')) return config
    const model = typeof config.model === 'string' ? config.model : null
    if (provider === lastSourceProvider && model === lastSourceModel) return config
    lastSourceProvider = provider
    lastSourceModel = model
    void (async () => {
      try {
        const cfg = await loadConfig(ctx)
        const should = cfg.vlmEnabled !== false && (validCards(cfg).length > 0 || fallbackHasModels(cfg))
        await syncTwins(ctx, cfg, should)
      } catch (e) {
        ctx.logger?.warn('omni-workstation: agent/request sync failed: %s', e && e.message ? e.message : String(e))
      }
    })()
    return config
  })

  // v2.0: token optimization — keep tool-result image blocks (e.g. show_image
  // output) out of the model surface. agent/request cannot do this (the
  // messages are built after the waterfall), so sanitize at agent/pre-step:
  // (1) shadow historical tool/result events on the session surface so
  //     deriveMessages() — including compaction — yields text markers, and
  // (2) sanitize tool-result images in this step's claimed messages. User
  //     message images are preserved. `agent/pre-step` is a cordis waterfall:
  //     the listener MUST await next() and return the decision.
  ctx.on('agent/pre-step', async (payload, next) => {
    const decision = await next()
    if (!decision || decision.kind === 'reject') return decision
    const session = payload && payload.agent && payload.agent.session
    if (session) {
      // Layer 1: shadow historical tool/result events on the session surface so
      // deriveMessages() — including compaction — yields markers instead of images.
      try {
        await sanitizeSessionToolResults(session, ctx.logger)
      } catch (e) {
        ctx.logger?.warn?.('omni-workstation: session-surface sanitization failed (%s)', String(e && e.message || e))
      }
    }
    // Layer 2: sanitize tool-result messages in the claimed messages (works
    // regardless of session availability).
    const messages = Array.isArray(decision.messages) ? decision.messages : (Array.isArray(payload.messages) ? payload.messages : [])
    let anyChanged = false
    const rewritten = messages.map((message) => {
      if (!message || !Array.isArray(message.content)) return message
      const isTool = message.role === 'tool'
        || message.content.some((b) => b && (b.type === 'tool-result' || b.type === 'toolResult' || b.type === 'tool'))
      if (!isTool) return message
      const result = rewriteImagesDeep(message.content, toolImageMarker)
      if (result.changed) anyChanged = true
      return result.changed ? { ...message, content: result.content } : message
    })
    if (anyChanged) return { ...decision, messages: rewritten }
    return decision
  })

  if (webServer === undefined) return

  webServer.register({
    kind: 'exact',
    path: '/omni/config',
    handler: async (req, res) => {
      if (req.method === 'GET') {
        const cfg = await loadConfig(ctx)
        jsonOut(res, 200, {
          ok: true,
          version: pkgVersion,
          config: masked(cfg),
          path: await configFile(ctx),
          visible: cfg.vlmEnabled !== false && (validCards(cfg).length > 0 || fallbackHasModels(cfg)),
          twinVisible: cfg.vlmEnabled !== false && (validCards(cfg).length > 0 || fallbackHasModels(cfg)),
          imggenVisible: cfg.imggenEnabled !== false && isImggenConfigValid(cfg.imggenConfig),
          videoVisible: cfg.videoEnabled === true && isVideoConfigValid(cfg.videoConfig),
          voiceVisible: cfg.voiceEnabled === true && cfg.ttsEnabled === true && isVoiceConfigValid(cfg.voiceConfig),
          ttsVisible: cfg.voiceEnabled === true && cfg.ttsEnabled === true && isVoiceConfigValid(cfg.voiceConfig),
          sttVisible: false,
          fallbackConfig: masked(cfg).fallbackConfig,
          fallbackVisible: !!(cfg.fallbackConfig && cfg.fallbackConfig.models && cfg.fallbackConfig.models.length > 0),
          globalConfig: masked(cfg).globalConfig
        })
        return
      }
      if (req.method === 'POST') {
        try {
          const raw = await readBody(req)
          const patch = raw ? JSON.parse(raw) : {}
          // v2.7: pre-parse comfy workflow CRUD patches (async work needing
          // /object_info from the endpoint, or config lookups) BEFORE applyPatch.
          if (patch.comfyWfImport && typeof patch.comfyWfImport === 'object' && typeof patch.comfyWfImport.workflow === 'string') {
            const cfg0 = await loadConfig(ctx)
            const endpoint = (cfg0.imggenConfig && cfg0.imggenConfig.endpoint) || ''
            const prep = await prepareComfyWorkflow(patch.comfyWfImport.workflow, endpoint)
            const basic = extractComfyBasicConfig(prep.api, prep.mapping)
            patch.comfyWfImport.id = 'wf_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5)
            patch.comfyWfImport.workflow = JSON.stringify(prep.api)
            patch.comfyWfImport.mapping = prep.mapping
            patch.comfyWfImport.steps = basic.steps
            patch.comfyWfImport.cfg = basic.cfg
            patch.comfyWfImport.scheduler = basic.scheduler
            patch.comfyWfImport.seed = basic.seed
          }
          if (patch.comfyWfAutoMap && typeof patch.comfyWfAutoMap === 'object' && typeof patch.comfyWfAutoMap.id === 'string') {
            const cfg0 = await loadConfig(ctx)
            const wf = (cfg0.comfyWorkflows || []).find(w => w.id === patch.comfyWfAutoMap.id)
            if (wf && typeof wf.workflow === 'string' && wf.workflow !== '') {
              const api = JSON.parse(wf.workflow)
              patch.comfyWfAutoMap.mapping = detectComfyMapping(api)
            }
          }
          if (patch.comfyWfUpdateJson && typeof patch.comfyWfUpdateJson === 'object' && typeof patch.comfyWfUpdateJson.id === 'string' && typeof patch.comfyWfUpdateJson.workflow === 'string') {
            const cfg0 = await loadConfig(ctx)
            const endpoint = (cfg0.imggenConfig && cfg0.imggenConfig.endpoint) || ''
            const prep = await prepareComfyWorkflow(patch.comfyWfUpdateJson.workflow, endpoint)
            patch.comfyWfUpdateJson.workflow = JSON.stringify(prep.api)
          }
          const cfg = await loadConfig(ctx)
          const next = applyPatch(cfg, patch)
          await storeConfig(ctx, next)
          await syncToolRegistration()
          jsonOut(res, 200, { ok: true, config: masked(next), path: await configFile(ctx), visible: next.vlmEnabled !== false && (validCards(next).length > 0 || fallbackHasModels(next)), twinVisible: next.vlmEnabled !== false && (validCards(next).length > 0 || fallbackHasModels(next)), imggenVisible: next.imggenEnabled !== false && isImggenConfigValid(next.imggenConfig), videoVisible: next.videoEnabled === true && isVideoConfigValid(next.videoConfig), fallbackConfig: masked(next).fallbackConfig, fallbackVisible: fallbackHasModels(next), globalConfig: masked(next).globalConfig })
        } catch (e) {
          jsonOut(res, 400, { ok: false, error: String(e && e.message || e) })
        }
        return
      }
      jsonOut(res, 405, { ok: false, error: 'method not allowed' })
    }
  })

  webServer.register({
    kind: 'exact',
    path: '/omni/models',
    handler: async (req, res) => {
      if (req.method !== 'POST') return jsonOut(res, 405, { ok: false, error: 'method not allowed' })
      try {
        const raw = await readBody(req)
        const args = raw ? JSON.parse(raw) : {}
        const cfg = await loadConfig(ctx)
        // v2.8: video model list (async protocols expose /models on the OpenAI
        // compatible layer or DashScope /api/v1/services/aigc/video-generation)
        if (args.video === true) {
          const vc = cfg.videoConfig || defaultVideoConfig()
          const vmeta = VIDEO_PROVIDERS[vc.provider]
          let endpoint = (vmeta && vmeta.fixedUrl) ? vmeta.endpoint : (args.endpoint && typeof args.endpoint === 'string' && args.endpoint.trim() ? args.endpoint.trim() : vc.endpoint)
          const protocol = vc.protocol
          const apiKey = args.apiKey && typeof args.apiKey === 'string' && args.apiKey.length ? args.apiKey : vc.apiKey
          if (!endpoint) return jsonOut(res, 400, { ok: false, error: '未配置 endpoint，请先在上方填入端点 URL' })
          let url = ''
          const h = { Accept: 'application/json' }
          if (protocol === 'kling-video') {
            const [ak, sk] = String(apiKey || '').split('|')
            if (ak && sk) h.Authorization = 'Bearer ' + klingJwt(ak, sk)
            // 可灵无模型列表接口：走 text2video 只返回模型参数校验（列表为空由 UI 兜底）
            url = String(endpoint).trim().replace(/\/+$/, '') + '/v1/videos/text2video'
          } else if (protocol === 'dashscope-video') {
            // 百炼原生模型列表：必须用 /api/v1/models（文档第6章）。
            // OpenAI 兼容端点 /compatible-mode/v1/models 仅含对话类模型、不含视频模型。
            // dashscopeVideoBase 会把用户链接里不适配视频接口的兼容后缀
            // （如 /compatible-mode/v1）在程序内部替换为原生 /api/v1 路径。
            if (apiKey) h.Authorization = 'Bearer ' + apiKey
            url = dashscopeModelsUrl({ provider: vc.provider, endpoint })
          } else {
            if (apiKey) h.Authorization = 'Bearer ' + apiKey
            let base = String(endpoint).trim().replace(/\/+$/, '')
            if (!/\/v[0-9]+$/.test(base)) base = base + '/v1'
            url = base + '/models'
          }
          const r = await httpJson(url, 'GET', h, undefined, 30000)
          if (!r.ok) return jsonOut(res, 200, { ok: false, error: 'HTTP ' + r.status + ': ' + r.message })
          const body = r.body && typeof r.body === 'object' ? r.body : {}
          let ids = []
          if (body.output && Array.isArray(body.output.models)) {
            // 百炼原生 /api/v1/models 响应（文档第6章）
            ids = parseDashscopeModelList(body)
          } else if (Array.isArray(body.data)) {
            ids = body.data.map((d) => (d && (d.id || d.name)) || '').filter((s) => typeof s === 'string' && s.length > 0)
          } else if (Array.isArray(body.models)) {
            ids = body.models.map((m) => (typeof m === 'string' ? m : (m && (m.id || m.name)) || '')).filter(Boolean)
          } else if (Array.isArray(body.ids)) {
            ids = body.ids.filter((s) => typeof s === 'string')
          }
          if (vc.filterVideoModels !== false) {
            ids = filterVideoModelIds(ids)
          }
          return jsonOut(res, 200, { ok: true, models: ids.slice(0, 100) })
        }
        if (args.imggen === true) {
          const igc = cfg.imggenConfig || defaultImggenConfig()
          const meta = PROVIDERS[igc.provider]
          let endpoint = (meta && meta.fixedUrl) ? meta.endpoint : (args.endpoint && typeof args.endpoint === 'string' && args.endpoint.trim() ? args.endpoint.trim() : igc.endpoint)
          const protocol = (meta && meta.fixedUrl) ? 'openai-images' : (args.protocol || igc.protocol || 'openai-images')
          // ComfyUI: model list comes from /object_info/CheckpointLoaderSimple (checkpoint filenames,
          // which never contain the literal "image" — so the /image/i filter below must be skipped).
          if (protocol === 'comfyui-image') {
            if (!endpoint) return jsonOut(res, 400, { ok: false, error: '未配置 endpoint，请先在上方填入端点 URL' })
            const base = String(endpoint).trim().replace(/\/+$/, '')
            const h = { Accept: 'application/json', ...(igc.apiKey ? { Authorization: 'Bearer ' + igc.apiKey } : {}) }
            // v2.8: pull checkpoint + unet + vae + clip lists in one shot. Each node
            // is fetched independently; a 404/error degrades gracefully to an empty list
            // (the UI just hides that dropdown) instead of failing the whole request.
            const oiFetch = async (className) => {
              try {
                const r = await httpJson(base + '/object_info/' + className, 'GET', h, undefined, 30000)
                if (!r.ok || !r.body || typeof r.body !== 'object') return []
                const def = r.body[className]
                const reqd = def && def.input && def.input.required
                const fieldName = className === 'CheckpointLoaderSimple' ? 'ckpt_name'
                  : className === 'UNETLoader' ? 'unet_name'
                  : className === 'VAELoader' ? 'vae_name'
                  : 'clip_name'
                const list = reqd && Array.isArray(reqd[fieldName]) && Array.isArray(reqd[fieldName][0]) ? reqd[fieldName][0] : []
                return list.map((x) => (Array.isArray(x) ? x[0] : x)).filter((s) => typeof s === 'string' && s.length > 0)
              } catch { return [] }
            }
            const [checkpoints, unets, vaeList, clipList] = await Promise.all([
              oiFetch('CheckpointLoaderSimple'),
              oiFetch('UNETLoader'),
              oiFetch('VAELoader'),
              oiFetch('CLIPLoader')
            ])
            return jsonOut(res, 200, {
              ok: true,
              models: checkpoints.slice(0, 200),
              unet: unets.slice(0, 200),
              vae: vaeList.slice(0, 200),
              clip: clipList.slice(0, 200)
            })
          }
          // openai 族协议要求 /v1 前缀（如 agnes-ai.cn 无 /v1 路径会被 Cloudflare 403）
          if ((protocol === 'openai-images' || protocol === 'openai-completions') && !/\/v[0-9]+$/.test(String(endpoint || ''))) {
            endpoint = endpoint + '/v1'
          }
          const apiKey = args.apiKey && typeof args.apiKey === 'string' && args.apiKey.length ? args.apiKey : igc.apiKey
          const card = { endpoint, apiKey, model: igc.model, provider: igc.provider, protocol }
          if (!card.endpoint) return jsonOut(res, 400, { ok: false, error: '未配置 endpoint，请先在上方填入端点 URL' })
          const url = modelsUrl(card)
          if (!url) return jsonOut(res, 400, { ok: false, error: '无法根据 endpoint 推断模型列表地址' })
          const headers = protocolHeaders(card, false)
          const r = await httpJson(url, 'GET', headers, undefined, 30000)
          if (!r.ok) return jsonOut(res, 200, { ok: false, error: 'HTTP ' + r.status + ': ' + r.message })
          const body = r.body && typeof r.body === 'object' ? r.body : {}
          let ids = []
          if (Array.isArray(body.data)) {
            ids = body.data.map((d) => (d && (d.id || d.name)) || '').filter((s) => typeof s === 'string' && s.length > 0)
          } else if (Array.isArray(body.models)) {
            ids = body.models.map((m) => (typeof m === 'string' ? m : (m && (m.id || m.name)) || '')).filter(Boolean)
          } else if (Array.isArray(body.ids)) {
            ids = body.ids.filter((s) => typeof s === 'string')
          }
          if (igc.filterImageModels !== false) {
            ids = ids.filter((id) => /image/i.test(id))
          }
          return jsonOut(res, 200, { ok: true, models: ids.slice(0, 100) })
        }
        if (args.fallback === true) {
          const fbCfg = cfg.fallbackConfig || defaultFallbackConfig()
          const fbMeta = FALLBACK_PROVIDERS[fbCfg.provider]
          if (!fbMeta) return jsonOut(res, 400, { ok: false, error: '未知兜底供应商' })
          const fbCard = { endpoint: fbMeta.endpoint, apiKey: '', model: '', provider: fbCfg.provider, protocol: fbMeta.protocol }
          const url = modelsUrl(fbCard)
          if (!url) return jsonOut(res, 400, { ok: false, error: '无法推断模型列表地址' })
          const headers = protocolHeaders(fbCard, false)
          const r = await httpJson(url, 'GET', headers, undefined, 30000)
          if (!r.ok) return jsonOut(res, 200, { ok: false, error: 'HTTP ' + r.status + ': ' + r.message })
          const body = r.body && typeof r.body === 'object' ? r.body : {}
          let ids = []
          if (Array.isArray(body.data)) ids = body.data.map(d => (d && (d.id || d.name)) || '').filter(s => typeof s === 'string' && s.length > 0)
          else if (Array.isArray(body.models)) ids = body.models.map(m => (typeof m === 'string' ? m : (m && (m.id || m.name)) || '')).filter(Boolean)
          jsonOut(res, 200, { ok: true, models: ids.slice(0, 100) })
          return
        }
        if (args.voice === true) {
          const vc = cfg.voiceConfig || defaultVoiceConfig()
          const vmeta = VOICE_PROVIDERS[vc.provider]
          const endpoint = (vmeta && vmeta.fixedUrl) ? vmeta.endpoint : (args.endpoint && typeof args.endpoint === 'string' && args.endpoint.trim() ? args.endpoint.trim() : vc.endpoint)
          const apiKey = args.apiKey && typeof args.apiKey === 'string' && args.apiKey.length ? args.apiKey : vc.apiKey
          const provider = vc.provider
          if (!endpoint) return jsonOut(res, 400, { ok: false, error: '未配置 endpoint' })
          if (provider === 'minimax') {
            const base = String(endpoint).trim().replace(/\/+$/, '')
            const h = { 'Content-Type': 'application/json', Accept: 'application/json' }
            if (apiKey) h.Authorization = 'Bearer ' + apiKey
            const r = await httpJson(base + '/v1/get_voice', 'POST', h, JSON.stringify({ voice_type: 'all' }), 30000)
            if (!r.ok) {
              return jsonOut(res, 200, { ok: true, voices: MINIMAX_PRESET_VOICES_FALLBACK.map(function (v) { return { id: v, name: v } }), note: 'fallback' })
            }
            const body = r.body && typeof r.body === 'object' ? r.body : {}
            if (body.base_resp && body.base_resp.status_code !== 0) {
              return jsonOut(res, 200, { ok: true, voices: MINIMAX_PRESET_VOICES_FALLBACK.map(function (v) { return { id: v, name: v } }), note: 'fallback: ' + (body.base_resp.status_msg || '') })
            }
            const voices = []
            if (Array.isArray(body.system_voice)) body.system_voice.forEach(function (v) { voices.push({ id: v.voice_id, name: '[系统] ' + (v.voice_name || v.voice_id) }) })
            if (Array.isArray(body.voice_generation)) body.voice_generation.forEach(function (v) { voices.push({ id: v.voice_id, name: '[生成] ' + v.voice_id }) })
            if (Array.isArray(body.voice_cloning)) body.voice_cloning.forEach(function (v) { voices.push({ id: v.voice_id, name: '[复刻] ' + v.voice_id }) })
            return jsonOut(res, 200, { ok: true, voices: voices.length > 0 ? voices : MINIMAX_PRESET_VOICES_FALLBACK.map(function (v) { return { id: v, name: v } }) })
          }
          if (provider === 'indextts') {
            const base = String(endpoint).trim().replace(/\/+$/, '')
            const h = { Accept: 'application/json' }
            if (apiKey) h.Authorization = 'Bearer ' + apiKey
            const r = await httpJson(base + '/api/v1/voices', 'GET', h, undefined, 30000)
            if (!r.ok) return jsonOut(res, 200, { ok: false, error: 'HTTP ' + r.status + ': ' + r.message })
            const body = r.body
            let voices = []
            if (Array.isArray(body)) {
              voices = body.map(function (v) { return typeof v === 'string' ? { id: v, name: v } : (v && typeof v === 'object' ? { id: v.id || v.name || v.voice_id || String(v), name: v.name || v.id || v.voice_id || String(v) } : { id: String(v), name: String(v) }) })
            } else if (body && typeof body === 'object') {
              voices = Object.keys(body).map(function (k) { return { id: k, name: k } })
            }
            return jsonOut(res, 200, { ok: true, voices: voices })
          }
          if (provider === 'voxcpm') {
            const base = String(endpoint).trim().replace(/\/+$/, '')
            const h = { Accept: 'application/json' }
            if (apiKey) h['X-API-Key'] = apiKey
            const r = await httpJson(base + '/v1/audio/list', 'GET', h, undefined, 30000)
            if (!r.ok) return jsonOut(res, 200, { ok: false, error: 'HTTP ' + r.status + ': ' + r.message })
            const body = r.body && typeof r.body === 'object' ? r.body : {}
            const files = Array.isArray(body.files) ? body.files : (Array.isArray(body) ? body : [])
            const voices = files.map(function (f) { return typeof f === 'string' ? { id: f, name: f } : (f && typeof f === 'object' ? { id: f.id || f.name || f.path || String(f), name: f.name || f.id || f.path || String(f) } : { id: String(f), name: String(f) }) })
            return jsonOut(res, 200, { ok: true, voices: voices })
          }
          if (provider === 'tts-webui') {
            let base = String(endpoint).trim().replace(/\/+$/, '')
            if (!/\/v[0-9]+$/.test(base)) base = base + '/v1'
            const r = await httpJson(base + '/models', 'GET', { Accept: 'application/json' }, undefined, 30000)
            if (!r.ok) return jsonOut(res, 200, { ok: false, error: 'HTTP ' + r.status + ': ' + r.message })
            const body = r.body && typeof r.body === 'object' ? r.body : {}
            const voices = Array.isArray(body.data) ? body.data.map(function (d) { return { id: d.id || d.name, name: d.id || d.name } }) : (Array.isArray(body.models) ? body.models.map(function (m) { return typeof m === 'string' ? { id: m, name: m } : { id: m.id || m.name, name: m.id || m.name } }) : [])
            return jsonOut(res, 200, { ok: true, voices: voices })
          }
          return jsonOut(res, 200, { ok: true, voices: [], note: 'no fetch API for ' + provider })
        }
        const saved = (Array.isArray(cfg.apis) ? cfg.apis : []).find((a) => a.id === args.cardId) || null
        let provider = args.provider || (saved && saved.provider) || 'custom'
        if (!PROVIDER_IDS.includes(provider)) provider = 'custom'
        const meta = PROVIDERS[provider]
        // 固定供应商：endpoint/protocol 用内置值（不看存储值或前端传值，避免切换供应商后残留旧值）
        let protocol = (meta && meta.fixedUrl) ? meta.protocol : (args.protocol || (saved && saved.protocol) || 'openai-completions')
        if (!PROTOCOLS.includes(protocol)) protocol = 'openai-completions'
        let endpoint = (meta && meta.fixedUrl) ? meta.endpoint : (args.endpoint && typeof args.endpoint === 'string' && args.endpoint.trim() ? args.endpoint.trim() : (saved ? saved.endpoint : ''))
        let apiKey = args.apiKey && typeof args.apiKey === 'string' && args.apiKey.length ? args.apiKey : (saved ? saved.apiKey : '')
        const card = { endpoint, apiKey, model: (saved ? saved.model : ''), provider, protocol }
        if (!card.endpoint) return jsonOut(res, 400, { ok: false, error: '未配置 endpoint，请先在上方填入端点 URL' })
        const url = modelsUrl(card)
        if (!url) return jsonOut(res, 400, { ok: false, error: '无法根据 endpoint 推断模型列表地址' })
        const headers = protocolHeaders(card, false)
        const r = await httpJson(url, 'GET', headers, undefined, 30000)
        if (!r.ok) return jsonOut(res, 200, { ok: false, error: 'HTTP ' + r.status + ': ' + r.message })
        const body = r.body && typeof r.body === 'object' ? r.body : {}
        let ids = []
        if (Array.isArray(body.data)) {
          ids = body.data.map((d) => (d && (d.id || d.name)) || '').filter((s) => typeof s === 'string' && s.length > 0)
        } else if (Array.isArray(body.models)) {
          ids = body.models.map((m) => (typeof m === 'string' ? m : (m && (m.id || m.name)) || '')).filter(Boolean)
        } else if (Array.isArray(body.ids)) {
          ids = body.ids.filter((s) => typeof s === 'string')
        }
        jsonOut(res, 200, { ok: true, models: ids.slice(0, 100) })
      } catch (e) {
        jsonOut(res, 400, { ok: false, error: String(e && e.message || e) })
      }
    }
  })

  webServer.register({
    kind: 'exact',
    path: '/omni/key',
    handler: async (req, res) => {
      if (req.method !== 'POST') return jsonOut(res, 405, { ok: false, error: 'method not allowed' })
      try {
        const raw = await readBody(req)
        const args = raw ? JSON.parse(raw) : {}
        const cfg = await loadConfig(ctx)
        if (args.video === true) {
          const vc = cfg.videoConfig || defaultVideoConfig()
          return jsonOut(res, 200, { ok: true, apiKey: vc.apiKey || '' })
        }
        if (args.imggen === true) {
          const igc = cfg.imggenConfig || defaultImggenConfig()
          return jsonOut(res, 200, { ok: true, apiKey: igc.apiKey || '' })
        }
        if (args.voice === true) {
          const vc = cfg.voiceConfig || defaultVoiceConfig()
          return jsonOut(res, 200, { ok: true, apiKey: vc.apiKey || '' })
        }
        const card = (Array.isArray(cfg.apis) ? cfg.apis : []).find((a) => a.id === args.cardId)
        if (!card) return jsonOut(res, 404, { ok: false, error: 'card not found' })
        jsonOut(res, 200, { ok: true, apiKey: card.apiKey || '' })
      } catch (e) {
        jsonOut(res, 400, { ok: false, error: String(e && e.message || e) })
      }
    }
  })

  webServer.register({
    kind: 'exact',
    path: '/omni/reset',
    handler: async (req, res) => {
      if (req.method !== 'POST') return jsonOut(res, 405, { ok: false, error: 'method not allowed' })
      // v1.3 无持久活动状态，保留为 no-op 兼容
      const cfg = await loadConfig(ctx)
      jsonOut(res, 200, { ok: true,       visible: cfg.vlmEnabled !== false && (validCards(cfg).length > 0 || fallbackHasModels(cfg)) })
    }
  })

  // v2.9.2: local voice library — unified reference-audio storage for the
  // 参考音频 row. Stores uploaded samples as files under <configDir>/voice-library/
  // and a manifest in cfg.voiceLibrary (persisted via storeConfig). No cloud
  // clone API: mimo voiceclone reads the local sample path → base64 inline
  // (runMimoTts). ponytail: per-provider cloud clone is a follow-up.
  function voiceLibraryDir() { return join(dirname(configFile()), 'voice-library') }
  function sanitizeRefName(name) {
    return String(name == null ? '' : name).replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 64) || 'reference'
  }
  function dedupRefName(base, existing) {
    const taken = Array.isArray(existing) ? existing : []
    if (taken.indexOf(base) < 0) return base
    let n = 1
    while (taken.indexOf(base + '（' + n + '）') >= 0) n++
    return base + '（' + n + '）'
  }
  function refExtForMime(mime) {
    const m = String(mime || '').toLowerCase()
    if (m.indexOf('mpeg') >= 0 || m.indexOf('mp3') >= 0) return '.mp3'
    if (m.indexOf('wav') >= 0) return '.wav'
    if (m.indexOf('ogg') >= 0) return '.ogg'
    if (m.indexOf('flac') >= 0) return '.flac'
    if (m.indexOf('m4a') >= 0) return '.m4a'
    return '.wav'
  }
  webServer.register({
    kind: 'exact',
    path: '/omni/voice-library',
    handler: async (req, res) => {
      try {
        const cfg = await loadConfig(ctx)
        let lib = Array.isArray(cfg.voiceLibrary) ? cfg.voiceLibrary.filter(e => e && typeof e === 'object') : []
        if (req.method === 'GET') return jsonOut(res, 200, { ok: true, library: lib })
        if (req.method !== 'POST') return jsonOut(res, 405, { ok: false, error: 'method not allowed' })
        const raw = await readBody(req)
        const args = raw ? JSON.parse(raw) : {}
        const dir = voiceLibraryDir()
        mkdirSync(dir, { recursive: true })
        // list query
        if (args.list === true) return jsonOut(res, 200, { ok: true, library: lib })
        // delete by name
        if (args.delete) {
          const name = String(args.delete)
          const entry = lib.find(e => e.name === name)
          if (entry && entry.path) { try { unlinkSync(entry.path) } catch (e2) { /* best-effort */ } }
          cfg.voiceLibrary = lib.filter(e => e.name !== name)
          await storeConfig(ctx, cfg)
          return jsonOut(res, 200, { ok: true, library: cfg.voiceLibrary })
        }
        // rename by name
        if (args.rename && args.rename.from) {
          const from = String(args.rename.from)
          const entry = lib.find(e => e.name === from)
          if (!entry) return jsonOut(res, 404, { ok: false, error: 'entry not found' })
          const to = dedupRefName(sanitizeRefName(args.rename.to), lib.filter(e => e.name !== from).map(e => e.name))
          const ext = entry.ext || refExtForMime(entry.mime)
          const newPath = join(dir, to + ext)
          try { renameSync(entry.path, newPath) } catch (e2) { /* fall through */ }
          entry.name = to; entry.path = newPath; entry.ext = ext
          cfg.voiceLibrary = lib
          await storeConfig(ctx, cfg)
          return jsonOut(res, 200, { ok: true, entry: entry, library: cfg.voiceLibrary })
        }
        // upload (base64 + name + mime)
        const base64 = String(args.base64 || '')
        if (!base64) return jsonOut(res, 400, { ok: false, error: 'missing base64 audio data' })
        const mime = String(args.mime || 'audio/wav')
        const ext = refExtForMime(mime)
        const name = dedupRefName(sanitizeRefName(args.name || 'reference'), lib.map(e => e.name))
        let buf
        try { buf = Buffer.from(base64, 'base64') } catch (e) { return jsonOut(res, 400, { ok: false, error: 'base64 decode failed' }) }
        if (!buf || buf.length === 0) return jsonOut(res, 400, { ok: false, error: 'decoded audio is empty' })
        const path = join(dir, name + ext)
        writeFileSync(path, buf)
        const entry = { id: 'vl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: name, path: path, ext: ext, size: buf.length, mime: mime, createdAt: Date.now() }
        cfg.voiceLibrary = lib.concat([entry])
        await storeConfig(ctx, cfg)
        return jsonOut(res, 200, { ok: true, entry: entry, library: cfg.voiceLibrary })
      } catch (e) {
        jsonOut(res, 400, { ok: false, error: String(e && e.message || e) })
      }
    }
  })

  // v2.9.3: minimax voice clone — two-step (upload + voice_clone). Clone-only: the
  // panel calls this to register a voice_id; the AI tool (clone_voice) also
  // calls doMinimaxClone then synthesizes separately. Region-aware (cn/global).
  webServer.register({
    kind: 'exact',
    path: '/omni/minimax/clone',
    handler: async (req, res) => {
      if (req.method !== 'POST') return jsonOut(res, 405, { ok: false, error: 'method not allowed' })
      try {
        const raw = await readBody(req)
        const args = raw ? JSON.parse(raw) : {}
        const cfg = await loadConfig(ctx)
        const vc = cfg.voiceConfig || defaultVoiceConfig()
        if (!isVoiceConfigValid(vc) || vc.provider !== 'minimax') return jsonOut(res, 400, { ok: false, error: '语音配置无效或非 minimax 供应商' })
        const refPath = String(args.ref_audio_path || '').trim()
        const voiceId = String(args.voice_id || '').trim()
        if (!voiceId) return jsonOut(res, 400, { ok: false, error: '缺少 voice_id（自定义音色 id）' })
        let finalRefPath = refPath
        if (!finalRefPath && args.base64) {
          // panel file-picker path: write the base64 to a temp file under the voice-library dir
          const dir = voiceLibraryDir()
          mkdirSync(dir, { recursive: true })
          const ext = refExtForMime(args.mime || 'audio/wav')
          const tmpName = 'mmclone_' + Date.now().toString(36) + ext
          finalRefPath = join(dir, tmpName)
          let buf
          try { buf = Buffer.from(args.base64, 'base64') } catch (e) { return jsonOut(res, 400, { ok: false, error: 'base64 解码失败' }) }
          if (!buf || buf.length === 0) return jsonOut(res, 400, { ok: false, error: '解码后音频为空' })
          writeFileSync(finalRefPath, buf)
        }
        if (!finalRefPath) return jsonOut(res, 400, { ok: false, error: '缺少 ref_audio_path 或 base64（参考音频）' })
        if (!existsSync(finalRefPath)) return jsonOut(res, 400, { ok: false, error: '参考音频文件不存在: ' + finalRefPath })
        const r = await doMinimaxClone(vc, finalRefPath, voiceId, args.text || '', args.model || '')
        jsonOut(res, 200, { ok: true, voice_id: r.voice_id, file_id: r.file_id, demo_audio: r.demo_audio })
      } catch (e) {
        jsonOut(res, 400, { ok: false, error: String(e && e.message || e) })
      }
    }
  })

  // v2.9.9: doubao voice clone — uses active doubao clone preset defaults + AI overrides
  webServer.register({
    kind: 'exact', path: '/omni/doubao/clone',
    handler: async (req, res) => {
      if (req.method !== 'POST') return jsonOut(res, 405, { ok: false, error: 'method not allowed' })
      try {
        const raw = await readBody(req)
        const args = raw ? JSON.parse(raw) : {}
        const cfg = await loadConfig(ctx)
        const vc = cfg.voiceConfig || defaultVoiceConfig()
        if (!isVoiceConfigValid(vc) || vc.provider !== 'doubao') return jsonOut(res, 400, { ok: false, error: '语音配置无效或非 doubao 供应商' })
        // v2.9.9: use active doubao clone preset as defaults
        const dcp = (cfg.doubaoClonePresets || []).find((p) => p.id === cfg.activeDoubaoClonePreset) || {}
        const voiceId = String(args.voice_id || args.custom_speaker_id || dcp.speakerId || '').trim()
        if (!voiceId) return jsonOut(res, 400, { ok: false, error: '缺少 voice_id（请在音色预设中配置 speaker_id 或在请求中提供）' })
        let finalRefPath = String(args.ref_audio_path || dcp.refAudioPath || '').trim()
        if (!finalRefPath && args.base64) {
          const dir = voiceLibraryDir()
          mkdirSync(dir, { recursive: true })
          const ext = refExtForMime(args.mime || 'audio/wav')
          finalRefPath = join(dir, 'dbclone_' + Date.now().toString(36) + ext)
          const buf = Buffer.from(args.base64, 'base64')
          if (!buf || buf.length === 0) return jsonOut(res, 400, { ok: false, error: 'base64 解码失败' })
          writeFileSync(finalRefPath, buf)
        }
        if (!finalRefPath) return jsonOut(res, 400, { ok: false, error: '缺少 ref_audio_path（请在音色预设中配置参考音频路径）' })
        if (!existsSync(finalRefPath)) return jsonOut(res, 400, { ok: false, error: '参考音频文件不存在: ' + finalRefPath })
        // Allow AI to override appId/accessKey
        const cloneVc = Object.assign({}, vc)
        if (args.app_id) cloneVc.appId = args.app_id
        if (args.access_key) cloneVc.accessKey = args.access_key
        const r = await doDoubaoClone(cloneVc, finalRefPath, voiceId, args.text || '')
        // v2.9.9: update the active preset with the speakerId if it changed
        if (dcp.speakerId !== voiceId && dcp.id) {
          const dcp2 = (cfg.doubaoClonePresets || []).find((p) => p.id === cfg.activeDoubaoClonePreset)
          if (dcp2) { dcp2.speakerId = voiceId; dcp2.refAudioPath = finalRefPath; await storeConfig(ctx, cfg) }
        }
        jsonOut(res, 200, { ok: true, speaker_id: r.speaker_id, status: r.status, demo_audio: r.demo_audio })
      } catch (e) {
        jsonOut(res, 400, { ok: false, error: String(e && e.message || e) })
      }
    }
  })

  // v1.9: returns all live models grouped by provider, for the mirror-card
  // dropdown. Excludes twin routes (auto-vision / *-omni-workstation / *-vision /
  // omni-workstation-m-*) so the dropdown only shows original models.
  webServer.register({
    kind: 'exact',
    path: '/omni/all-models',
    handler: async (req, res) => {
      if (req.method !== 'POST') return jsonOut(res, 405, { ok: false, error: 'method not allowed' })
      try {
        const groups = []
        let providers = []
        try {
          providers = ctx.llm.listProviders()
            .map((e) => (e && typeof e.id === 'string' ? e.id : ''))
            .filter(Boolean)
        } catch { providers = [] }
        for (const provider of providers) {
          if (provider === 'auto-vision' || provider.endsWith('-omni-workstation') || provider.endsWith('-vision') || provider.startsWith('omni-workstation-m-')) continue
          let providerName = provider
          try {
            const ai = ctx.llm.registration(provider).adapter
            const info = ai && typeof ai.providerInfo === 'function' ? ai.providerInfo(provider) : undefined
            if (info && info.name) providerName = info.name
          } catch { /* keep id as name */ }
          let models = []
          try {
            const adapter = ctx.llm.registration(provider).adapter
            const listed = await adapter.listModels(provider)
            models = (Array.isArray(listed) ? listed : [])
              .map((m) => ({ id: m.id || m.name || '', name: m.name || m.id || '' }))
              .filter((m) => m.id.length > 0)
          } catch { models = [] }
          if (models.length > 0) groups.push({ provider, providerName, models })
        }
        jsonOut(res, 200, { ok: true, groups })
      } catch (e) {
        jsonOut(res, 400, { ok: false, error: String(e && e.message || e) })
      }
    }
  })
}

export { Config, apply, inject, name, toolDef, rewriteImagesDeep, toolImageMarker, blocksHaveImage, sanitizeToolResultMessage, sanitizeSessionToolResults, resolveImage, askVlm, sniffMediaType, collectAttachmentRefs, makeTwinAdapter, makePerProviderTwinAdapter, makeMappingTwinAdapter, syncTwins, mirrorRouteId, mirrorDisplayName, defaultMirrorConfig, normalizeMirrorConfig, detectComfyMapping, applyPatch, _resetLastSource, _setLastSource, _resetVisionTools, backupFile, storeConfig, loadConfig, VIDEO_PROVIDERS, VIDEO_PROVIDER_IDS, VIDEO_PROTOCOLS, VIDEO_ASPECT_RATIOS, defaultVideoConfig, normalizeVideoConfig, maskedVideo, isVideoConfigValid, pathGet, agnesNumFrames, klingJwt, filterVideoModelIds, buildVideoSubmit, videoPollUrl, normalizeVideoStatus, extractVideoTaskId, pollVideoOnce, minimaxResolveUrl, buildVideoToolDef, dashscopeVideoBase, dashscopeModelsUrl, parseDashscopeModelList, buildCloneVoiceToolDef, buildSpeakToolDef, runDoubaoTts, doDoubaoClone }
