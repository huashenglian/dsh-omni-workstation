// dsh-her-eyes — application-level Vision-Language-Model analyzer.
// Host half: registers the `analyze_image` tool on the global tools registry
// (shared by every session of this deployment) and serves the settings web
// routes used by the client-half settings page. Config is stored at
// $DSH_HOME/vlm-vision.json (beside the settings document when available).
//
// v1.3: multi-card API list (`apis`), multi-protocol requests
// (openai-completions / openai-responses / anthropic-messages / google-gemini),
// Ollama provider support, single-request failover (each call restarts from the
// top card), and dynamic tool registration (analyze_image hidden when no valid
// card is configured).
import { defineTool } from '@deepseek-ai/dsh-tools'
import z from '@deepseek-ai/schemastery'
import { copyFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import jpegJs from './vendor/jpeg-js/index.cjs'
import { encodePng } from './vendor/png.js'
import { buildVisionToolDefs } from './vision-tools.js'

const name = 'dsh-her-eyes'
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
  'qwen-token-plan':   { protocol: 'openai-completions', endpoint: 'https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1', keyRequired: true, fixedUrl: true },
  'qwen-token-plan-cn':{ protocol: 'openai-completions', endpoint: 'https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1', keyRequired: true, fixedUrl: true },
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
  timeoutMs: 300000,
  retryCount: 2,
  responseFormat: 'auto', // 'auto' | 'b64_json' | 'url'
  filterImageModels: true,
  comfyWorkflows: [], // v2.7: multi-workflow list [{id,name,workflow,mapping,steps,cfg,scheduler,seed}]
  activeComfyWorkflow: '' // v2.7: id of active workflow, '' = none
})

const COMFY_MAPPING_KEYS = ['sampler', 'checkpoint', 'latent', 'positive', 'negative']

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
  contextWindow: 262144,
  maxOutput: 32768,
  ...(overrides || {})
})

const defaultConfig = () => ({ retryCount: 3, apis: [newCard()] })

// v1.9: mirror model config — controls twin routes in /model picker.
// autoVisionEnabled: register the single `auto-vision` twin (v1.8 behavior).
// mirrorAllEnabled: register `<provider>-her-eyes` per live provider (v1.7
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
// `her-eyes-m-` avoids collision with real provider routes and is filtered by
// the agent/request + syncTwins self-recursion guards.
const mirrorRouteId = (mirrorName) => {
  const base = String(mirrorName || '').replace(/[^a-zA-Z0-9_-]/g, '-')
  return 'her-eyes-m-' + (base.length > 0 ? base : 'mirror')
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
        contextWindow: Number.isFinite(Number(a.contextWindow)) && Number(a.contextWindow) > 0 ? Math.floor(Number(a.contextWindow)) : 262144,
        maxOutput: Number.isFinite(Number(a.maxOutput)) && Number(a.maxOutput) > 0 ? Math.floor(Number(a.maxOutput)) : 32768
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
  return { retryCount, vlmEnabled, imggenEnabled, visionToolsEnabled, visionToolToggles, mirrorConfig, apis, imggenConfig: runtimeImggenConfig, imggenPresets, activeImggenPreset, fallbackConfig, globalConfig, comfyWorkflows, activeComfyWorkflow }
}

const masked = (cfg) => ({
  retryCount: cfg.retryCount,
  vlmEnabled: cfg.vlmEnabled !== false,
  imggenEnabled: cfg.imggenEnabled === true,
  visionToolsEnabled: cfg.visionToolsEnabled !== false,
    visionToolToggles: cfg.visionToolToggles || {},
  mirrorConfig: maskedMirror(cfg.mirrorConfig || defaultMirrorConfig()),
  imggenConfig: maskedImggen(cfg.imggenConfig || defaultImggenConfig()),
  comfyWorkflows: cfg.comfyWorkflows || [],
  activeComfyWorkflow: cfg.activeComfyWorkflow || '',
  imggenPresets: (Array.isArray(cfg.imggenPresets) ? cfg.imggenPresets : []).map((p) => ({ id: p.id, name: p.name, config: maskedImggen(p.config || defaultImggenConfig()) })),
  activeImggenPreset: cfg.activeImggenPreset || (Array.isArray(cfg.imggenPresets) && cfg.imggenPresets.length > 0 ? cfg.imggenPresets[0].id : ''),
  fallbackConfig: cfg.fallbackConfig ? { provider: cfg.fallbackConfig.provider, models: cfg.fallbackConfig.models, timeoutMs: cfg.fallbackConfig.timeoutMs } : null,
  globalConfig: cfg.globalConfig ? Object.assign({}, cfg.globalConfig, { verifyReminder: cfg.globalConfig.verifyReminder !== false }) : defaultGlobalConfig(),
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
// ~/.dsh/profiles/web/node_modules/dsh-her-eyes/lib/index.js -> <...>/dsh-her-eyes.
// The old $DSH_HOME/homedir location is probed only once for first-run migration.
const PLUGIN_DIR = dirname(dirname(fileURLToPath(import.meta.url)))
function configFile() {
  // Test override: unit tests that import this file directly (not via a copied
  // plugin dir) point the config at their own temp DSH_HOME via this env.
  const override = process.env.DSH_HER_EYES_CONFIG_DIR
  if (override && override.length > 0) return join(override, 'vlm-vision.json')
  return join(PLUGIN_DIR, 'vlm-vision.json')
}

function backupFile() {
  const dir = process.env.DSH_HOME || homedir()
  return join(dir, 'vlm-vision.json.bak')
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
  return join(dir, 'vlm-vision.json')
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
          console.error('[dsh-her-eyes] config migrated: ' + legacy + ' -> ' + file)
        }
      } catch (e) {
        console.error('[dsh-her-eyes] config migration skipped:', String(e && e.message || e))
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
    console.error('[dsh-her-eyes] config read failed:', String(e && e.message || e))
    const bak = backupFile()
    if (existsSync(bak)) {
      try {
        const file = configFile()
        copyFileSync(bak, file)
        return normalizeConfig(JSON.parse(readFileSync(file, 'utf8')))
      } catch (e2) {
        console.error('[dsh-her-eyes] backup fallback also failed:', String(e2 && e2.message || e2))
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
    console.error('[dsh-her-eyes] backup write failed:', String(e && e.message || e))
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
    if (dsImage) console.log('[dsh-her-eyes] Image downscaled for fallback provider')
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
      console.error('[dsh-her-eyes] JPEG 解码失败（重编码兜底不可用）：', String(e && e.message || e))
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
    text: '[工具结果中包含图片「' + name + '」，附件 id「' + id + '」。该图片未随本次请求发送以节省 token；如需查看其内容，请调用 analyze_image（传入该附件 id 或对应图片路径）。]'
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
      logger?.info?.('her-eyes: sanitized a tool-result image block out of the model surface (event seq %s)', seq)
    } catch (error) {
      // A failed shadow leaves the original event on the surface: the session
      // stays usable instead of crashing the step.
      logger?.warn?.('her-eyes: could not sanitize tool-result image at event seq %s (%s)', seq, String(error && error.message || error))
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
            console.error('[dsh-her-eyes] JPG→PNG re-encode failed:', String(e && e.message || e))
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
// provider -> { handle } disposer handles of registered `<provider>-her-eyes`
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
  const latent = Object.keys(api).find((k) => api[k] && (api[k].class_type === 'EmptyLatentImage' || api[k].class_type === 'EmptySD3LatentImage'))
  const missing = []
  if (!sampler) missing.push('采样器(KSampler)')
  if (!checkpoint) missing.push('Checkpoint加载器')
  if (!latent) missing.push('空Latent(EmptyLatentImage)')
  if (missing.length > 0) throw new Error('工作流缺少必需节点：' + missing.join('、'))
  let positive = sampler
  let negative = sampler
  if (api[sampler] && api[sampler].inputs) {
    if (Array.isArray(api[sampler].inputs.positive)) positive = String(api[sampler].inputs.positive[0])
    if (Array.isArray(api[sampler].inputs.negative)) negative = String(api[sampler].inputs.negative[0])
  }
  return { sampler, checkpoint, latent, positive, negative }
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
  description: '生成图片并保存到指定目录，返回文件路径。prompt 描述图片内容，output_dir 指定保存目录（不指定则保存到工作区根目录）。生成后必须立即调用 analyze_image 验证图片质量。' + (comfy ? COMFY_TOOL_HINT : ''),
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
        if (mp.checkpoint && inj(mp.checkpoint)) { inj(mp.checkpoint).ckpt_name = igc.model; injected = true }
        if (mp.latent && inj(mp.latent)) { inj(mp.latent).width = cfSize.width; inj(mp.latent).height = cfSize.height; inj(mp.latent).batch_size = n; injected = true }
        if (mp.positive && inj(mp.positive)) { inj(mp.positive).text = prompt; injected = true }
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
    return { ok: true, paths, model: (last.bodyModel || igc.model || ''), attempts: attempts0, verifyReminder: gc.verifyReminder !== false && cfg.vlmEnabled !== false }
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
  return {
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
            text: '[图片「' + name + '」已上传，附件 id 为「' + id + '」。当前对话模型无法直接查看图片；需要看图时调用 analyze_image 工具，传入 attachment_id: "' + id + '" 和具体问题（如"这张图反映了什么？"）。]'
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
}

// v1.9: per-provider twin (mirrorAllEnabled mode). Mirrors EVERY model under
// the source provider, declaring inputModalities:['text','image']. Route id
// `<provider>-her-eyes` is already filtered by the agent/request + syncTwins
// self-recursion guards.
function makePerProviderTwinAdapter(ctx, provider) {
  const twinRoute = provider + '-her-eyes'
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
      return [{ type: 'text', text: '[图片「' + name + '」已上传，附件 id 为「' + id + '」。当前对话模型无法直接查看图片；需要看图时调用 analyze_image 工具，传入 attachment_id: "' + id + '" 和具体问题。]' }]
    })
    return result.changed ? { ...message, content: result.content } : message
  })
  return {
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
      if (original === undefined || typeof original.resolveModel !== 'function') throw new Error('her-eyes: per-provider twin source not registered: ' + provider)
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
}

// v1.9: per-mapping twin (custom list mode). ONE model with the mirrorName,
// declaring image input. stream() delegates to the FIXED
// originalProvider/originalModel (not lastSource) so the mapping is stable
// across agent turns. Route id `her-eyes-m-<sanitized>` is filtered by the
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
      return [{ type: 'text', text: '[图片「' + name + '」已上传，附件 id 为「' + id + '」。当前对话模型无法直接查看图片；需要看图时调用 analyze_image 工具，传入 attachment_id: "' + id + '" 和具体问题。]' }]
    })
    return result.changed ? { ...message, content: result.content } : message
  })
  return {
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
}

// v1.9: Reconcile twin routes against the live llm registry, gated on the SAME
// `shouldVlm` flag as analyze_image. Three independent modes:
//  1. autoVisionEnabled → single `auto-vision` twin (v1.8)
//  2. mirrorAllEnabled → per-provider `<provider>-her-eyes` twins (v1.7)
//  3. !mirrorAllEnabled + mappings → per-mapping `her-eyes-m-*` twins
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
        if (provider === 'auto-vision' || provider.endsWith('-her-eyes') || provider.endsWith('-vision') || provider.startsWith('her-eyes-m-')) continue
        wanted.set(provider + '-her-eyes', { type: 'per-provider', provider })
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
      if (provider === 'auto-vision' || provider.endsWith('-her-eyes') || provider.endsWith('-vision') || provider.startsWith('her-eyes-m-')) continue
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
        ctx.effect(() => handle, 'her-eyes: twin ' + routeId)
        twinHandles.set(routeId, { handle })
      }
    } catch (e) {
      ctx.logger?.warn('her-eyes: twin %s failed: %s', routeId, e && e.message ? e.message : String(e))
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
    appCtx.logger?.warn('her-eyes: syncTwins failed: %s', e && e.message ? e.message : String(e))
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
        appCtx.logger?.warn('her-eyes: vision toolkit registration failed: %s', e && e.message ? e.message : String(e))
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
  if (p.visionToolsEnabled !== undefined) c.visionToolsEnabled = p.visionToolsEnabled === true
    if (p.visionToolToggle && p.visionToolToggle.tool && VISION_TOOL_NAMES.includes(p.visionToolToggle.tool)) {
      if (!c.visionToolToggles) c.visionToolToggles = {}
      c.visionToolToggles[p.visionToolToggle.tool] = p.visionToolToggle.value === true
    }
  if (p.imggenReset === true) c.imggenConfig = defaultImggenConfig()
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
  // 重新对账 twin 路由。幂等：自身注册触发的重入会被 `-her-eyes` 后缀排除。
  ctx.on('llm/adapters-updated', () => {
    void (async () => {
      const cfg = await loadConfig(ctx)
      const should = cfg.vlmEnabled !== false && (validCards(cfg).length > 0 || fallbackHasModels(cfg))
      await syncTwins(ctx, cfg, should)
    })().catch((e) => ctx.logger?.warn('her-eyes: adapters-updated sync failed: %s', e && e.message ? e.message : String(e)))
  })

  // v1.8: track the last source provider/model the agent used so twin
  // routes wrap only that one provider. `agent/request` is a cordis
  // waterfall: each listener gets (payload, next); it MUST call next() and
  // RETURN the config (the waterfall's return value is the outermost
  // listener's return — returning undefined breaks the agent). The twin
  // reconcile runs fire-and-forget in the background; the request is never
  // blocked or modified. Filter out twin routes (auto-vision / *-her-eyes /
  // *-vision) so the twin's own requests don't overwrite lastSource (that
  // would freeze it to the twin route and recurse).
  ctx.on('agent/request', async (payload, next) => {
    const config = await next()
    if (!config || typeof config.provider !== 'string') return config
    const provider = config.provider
    if (provider === 'auto-vision' || provider.endsWith('-her-eyes') || provider.endsWith('-vision') || provider.startsWith('her-eyes-m-')) return config
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
        ctx.logger?.warn('her-eyes: agent/request sync failed: %s', e && e.message ? e.message : String(e))
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
        ctx.logger?.warn?.('her-eyes: session-surface sanitization failed (%s)', String(e && e.message || e))
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
    path: '/vlm/config',
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
          jsonOut(res, 200, { ok: true, config: masked(next), path: await configFile(ctx), visible: next.vlmEnabled !== false && (validCards(next).length > 0 || fallbackHasModels(next)), twinVisible: next.vlmEnabled !== false && (validCards(next).length > 0 || fallbackHasModels(next)), imggenVisible: next.imggenEnabled !== false && isImggenConfigValid(next.imggenConfig), fallbackConfig: masked(next).fallbackConfig, fallbackVisible: fallbackHasModels(next), globalConfig: masked(next).globalConfig })
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
    path: '/vlm/models',
    handler: async (req, res) => {
      if (req.method !== 'POST') return jsonOut(res, 405, { ok: false, error: 'method not allowed' })
      try {
        const raw = await readBody(req)
        const args = raw ? JSON.parse(raw) : {}
        const cfg = await loadConfig(ctx)
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
            const r = await httpJson(base + '/object_info/CheckpointLoaderSimple', 'GET', h, undefined, 30000)
            if (!r.ok) return jsonOut(res, 200, { ok: false, error: 'HTTP ' + r.status + ': ' + r.message })
            const oi = r.body && typeof r.body === 'object' ? r.body : {}
            const def = oi.CheckpointLoaderSimple
            const req = def && def.input && def.input.required
            const list = req && Array.isArray(req.ckpt_name) && Array.isArray(req.ckpt_name[0]) ? req.ckpt_name[0] : []
            const ids = list.map((x) => (Array.isArray(x) ? x[0] : x)).filter((s) => typeof s === 'string' && s.length > 0)
            return jsonOut(res, 200, { ok: true, models: ids.slice(0, 200) })
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
    path: '/vlm/key',
    handler: async (req, res) => {
      if (req.method !== 'POST') return jsonOut(res, 405, { ok: false, error: 'method not allowed' })
      try {
        const raw = await readBody(req)
        const args = raw ? JSON.parse(raw) : {}
        const cfg = await loadConfig(ctx)
        if (args.imggen === true) {
          const igc = cfg.imggenConfig || defaultImggenConfig()
          return jsonOut(res, 200, { ok: true, apiKey: igc.apiKey || '' })
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
    path: '/vlm/reset',
    handler: async (req, res) => {
      if (req.method !== 'POST') return jsonOut(res, 405, { ok: false, error: 'method not allowed' })
      // v1.3 无持久活动状态，保留为 no-op 兼容
      const cfg = await loadConfig(ctx)
      jsonOut(res, 200, { ok: true, visible: cfg.vlmEnabled !== false && (validCards(cfg).length > 0 || fallbackHasModels(cfg)) })
    }
  })

  // v1.9: returns all live models grouped by provider, for the mirror-card
  // dropdown. Excludes twin routes (auto-vision / *-her-eyes / *-vision /
  // her-eyes-m-*) so the dropdown only shows original models.
  webServer.register({
    kind: 'exact',
    path: '/vlm/all-models',
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
          if (provider === 'auto-vision' || provider.endsWith('-her-eyes') || provider.endsWith('-vision') || provider.startsWith('her-eyes-m-')) continue
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

export { Config, apply, inject, name, toolDef, rewriteImagesDeep, toolImageMarker, blocksHaveImage, sanitizeToolResultMessage, sanitizeSessionToolResults, resolveImage, askVlm, sniffMediaType, collectAttachmentRefs, makeTwinAdapter, makePerProviderTwinAdapter, makeMappingTwinAdapter, syncTwins, mirrorRouteId, mirrorDisplayName, defaultMirrorConfig, normalizeMirrorConfig, _resetLastSource, _setLastSource, _resetVisionTools, backupFile, storeConfig, loadConfig }
