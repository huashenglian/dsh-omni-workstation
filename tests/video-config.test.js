// video-config.test.js — v2.8: videoConfig normalize/mask/patch + gate +
// video engine pure helpers (buildVideoSubmit / poll / status / task id)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

process.env.DSH_HOME = mkdtempSync(join(tmpdir(), 'omni-workstation-video-'))
process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR = mkdtempSync(join(tmpdir(), 'omni-workstation-vcfg-'))

const {
  defaultVideoConfig, normalizeVideoConfig, maskedVideo, isVideoConfigValid,
  applyPatch,
  VIDEO_PROVIDERS, VIDEO_PROTOCOLS, VIDEO_ASPECT_RATIOS,
  buildVideoSubmit, videoPollUrl, normalizeVideoStatus, extractVideoTaskId,
  klingJwt, agnesNumFrames, pathGet, pollVideoOnce, minimaxResolveUrl,
  filterVideoModelIds, buildVideoToolDef,
  dashscopeVideoBase, dashscopeModelsUrl, parseDashscopeModelList
} = await import('../lib/index.js')

const agnes = () => normalizeVideoConfig({
  provider: 'agnes-cn', endpoint: '', apiKey: 'sk-test', model: 'agnes-video-v2.0'
})
const custom = (over = {}) => normalizeVideoConfig(Object.assign({
  provider: 'custom', endpoint: 'https://relay.example.com', apiKey: 'sk-test', model: 'vid-model'
}, over))
const kling = () => normalizeVideoConfig({
  provider: 'kling', apiKey: 'AK123|SK456', model: 'kling-v1-6'
})
const dash = () => normalizeVideoConfig({
  provider: 'dashscope', endpoint: 'https://dashscope.aliyuncs.com', apiKey: 'sk-ds', model: 'wan2.7-i2v'
})
const volc = () => normalizeVideoConfig({
  provider: 'volc', apiKey: 'sk-volc', model: 'doubao-seedance-2-5'
})
const minimax = () => normalizeVideoConfig({
  provider: 'minimax', apiKey: 'sk-mm', model: 'MiniMax-Hailuo-2.3'
})
const qwen = () => normalizeVideoConfig({
  provider: 'qwen-token-plan', endpoint: 'https://dashscope.aliyuncs.com', apiKey: 'sk-qw', model: 'qwen-video'
})
const qwenCn = () => normalizeVideoConfig({
  provider: 'qwen-token-plan-cn', endpoint: 'https://dashscope.aliyuncs.com', apiKey: 'sk-qw-cn', model: 'qwen-video'
})

// ---- normalize / mask ----

test('defaultVideoConfig has sane async defaults', () => {
  const d = defaultVideoConfig()
  assert.equal(d.provider, 'custom')
  assert.equal(d.protocol, 'openai-videos')
  assert.equal(d.timeoutMs, 600000)
  assert.equal(d.pollIntervalMs, 5000)
  assert.equal(d.retryCount, 1)
  assert.equal(d.seconds, 5)
  assert.equal(d.aspectRatio, '16:9')
  assert.equal(d.resolution, '720p')
  assert.equal(d.resultField, 'metadata.url')
  assert.equal(d.doneStatus, 'completed')
})

test('normalizeVideoConfig clamps numeric fields and sanitizes enums', () => {
  const c = normalizeVideoConfig({
    provider: 'custom', endpoint: 'x', apiKey: 'k', model: 'm',
    timeoutMs: 99, pollIntervalMs: 50, retryCount: 999, seconds: 999,
    aspectRatio: 'bogus', resolution: '4k', statusField: '', resultField: ''
  })
  assert.equal(c.timeoutMs, 600000) // below clamp -> default
  assert.equal(c.pollIntervalMs, 5000)
  assert.equal(c.retryCount, 5)     // capped
  assert.equal(c.seconds, 30)       // capped
  assert.equal(c.aspectRatio, '16:9')
  assert.equal(c.resolution, '720p')
  assert.equal(c.statusField, 'status')
  assert.equal(c.resultField, 'metadata.url')
})

test('normalizeVideoConfig locks protocol for built-in providers, allows custom', () => {
  assert.equal(agnes().protocol, 'openai-videos')
  assert.equal(kling().protocol, 'kling-video')
  assert.equal(dash().protocol, 'dashscope-video')
  assert.equal(volc().protocol, 'volc-video')
  assert.equal(minimax().protocol, 'minimax-video')
  assert.equal(qwen().protocol, 'dashscope-video')
  assert.equal(qwenCn().protocol, 'dashscope-video')
  // custom 可以切协议
  assert.equal(custom({ protocol: 'async-task' }).protocol, 'async-task')
  // 未知协议回退 openai-videos
  assert.equal(custom({ protocol: 'nope' }).protocol, 'openai-videos')
  // 未知供应商回退 custom
  assert.equal(normalizeVideoConfig({ provider: 'nope' }).provider, 'custom')
})

test('maskedVideo hides apiKey but reports apiKeySet', () => {
  const m = maskedVideo(agnes())
  assert.equal(m.apiKey, undefined)
  assert.equal(m.apiKeySet, true)
  const m2 = maskedVideo(defaultVideoConfig())
  assert.equal(m2.apiKeySet, false)
})

// ---- validity ----

test('isVideoConfigValid: fixed providers ignore empty stored endpoint; custom needs all', () => {
  assert.equal(isVideoConfigValid(agnes()), true)      // fixedUrl -> endpoint 来自内置
  assert.equal(isVideoConfigValid(kling()), true)
  assert.equal(isVideoConfigValid(qwen()), true)
  assert.equal(isVideoConfigValid(qwenCn()), true)
  assert.equal(isVideoConfigValid(custom()), true)
  assert.equal(isVideoConfigValid(custom({ endpoint: '' })), false)
  assert.equal(isVideoConfigValid(custom({ apiKey: '' })), false)
  assert.equal(isVideoConfigValid(custom({ model: '' })), false)
  assert.equal(isVideoConfigValid(null), false)
})

test('isVideoConfigValid: kling apiKey must contain |', () => {
  const bad = normalizeVideoConfig({ provider: 'kling', apiKey: 'AKONLY', model: 'x' })
  assert.equal(isVideoConfigValid(bad), false)
})

test('buildVideoSubmit qwen-token-plan: dashscope-video at DashScope endpoint (百炼通道)', () => {
  const r = buildVideoSubmit(qwen(), { prompt: 'a cat', seconds: 5, aspectRatio: '16:9' }, null)
  assert.equal(r.url, 'https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis')
  assert.equal(r.body.model, 'qwen-video')
  assert.equal(r.body.input.prompt, 'a cat')
  assert.equal(r.method, 'POST')
  assert.equal(r.headers['X-DashScope-Async'], 'enable')
  const poll = videoPollUrl('dashscope-video', qwen(), 'VID1', false)
  assert.equal(poll, 'https://dashscope.aliyuncs.com/api/v1/tasks/VID1')
})

// ---- applyPatch ----

test('applyPatch handles videoEnabled + videoCardPatch + saveVideoCardPreset + videoReset', () => {
  let cfg = applyPatch({}, {}) // normalizeConfig({}) equivalent
  assert.equal(cfg.videoEnabled, false) // default OFF
  cfg = applyPatch(cfg, { videoEnabled: true })
  assert.equal(cfg.videoEnabled, true)

  const cid = cfg.videoCards[0].id

  // Card-level field (no saveVideoCardPreset needed)
  cfg = applyPatch(cfg, { videoCardPatch: { id: cid, field: 'name', value: 'My Video' } })
  assert.equal(cfg.videoCards[0].name, 'My Video')

  // Config fields (saveVideoCardPreset to persist)
  cfg = applyPatch(cfg, { videoCardPatch: { id: cid, field: 'provider', value: 'agnes-cn' }, saveVideoCardPreset: { cardId: cid } })
  assert.equal(cfg.videoCards[0].config.provider, 'agnes-cn')
  assert.equal(cfg.videoCards[0].config.protocol, 'openai-videos')
  assert.equal(cfg.videoCards[0].config.endpoint, 'https://api.agnes-ai.cn/v1') // fixedUrl 自动填入

  cfg = applyPatch(cfg, { videoCardPatch: { id: cid, field: 'apiKey', value: 'sk-x' }, saveVideoCardPreset: { cardId: cid } })
  assert.equal(cfg.videoCards[0].config.apiKey, 'sk-x')
  cfg = applyPatch(cfg, { videoCardPatch: { id: cid, field: 'apiKey', value: null }, saveVideoCardPreset: { cardId: cid } })
  assert.equal(cfg.videoCards[0].config.apiKey, '')

  cfg = applyPatch(cfg, { videoCardPatch: { id: cid, field: 'model', value: 'agnes-video-v2.0' }, saveVideoCardPreset: { cardId: cid } })
  assert.equal(cfg.videoCards[0].config.model, 'agnes-video-v2.0')

  cfg = applyPatch(cfg, { videoCardPatch: { id: cid, field: 'seconds', value: 10 }, saveVideoCardPreset: { cardId: cid } })
  assert.equal(cfg.videoCards[0].config.seconds, 10)
  cfg = applyPatch(cfg, { videoCardPatch: { id: cid, field: 'aspectRatio', value: '9:16' }, saveVideoCardPreset: { cardId: cid } })
  assert.equal(cfg.videoCards[0].config.aspectRatio, '9:16')
  cfg = applyPatch(cfg, { videoCardPatch: { id: cid, field: 'pollIntervalMs', value: 8000 }, saveVideoCardPreset: { cardId: cid } })
  assert.equal(cfg.videoCards[0].config.pollIntervalMs, 8000)

  // Reset via deleting all presets (auto-recreates with defaults)
  const presetId = cfg.videoCards[0].activePreset
  cfg = applyPatch(cfg, { videoCardPresetDelete: { cardId: cid, presetId } })
  assert.equal(cfg.videoCards[0].config.provider, 'custom')
  assert.equal(cfg.videoCards[0].config.apiKey, '')
})

test('applyPatch: dashscope provider seeds editable default endpoint', () => {
  let cfg = applyPatch({}, {})
  cfg = applyPatch(cfg, { videoCardPatch: { id: cfg.videoCards[0].id, field: 'provider', value: 'dashscope' }, saveVideoCardPreset: { cardId: cfg.videoCards[0].id } })
  assert.equal(cfg.videoCards[0].config.endpoint, 'https://dashscope.aliyuncs.com')
  assert.equal(cfg.videoCards[0].config.protocol, 'dashscope-video')
})

test('applyPatch: qwen-token-plan seeds DashScope endpoint (百炼通道)', () => {
  let cfg = applyPatch({}, {})
  cfg = applyPatch(cfg, { videoCardPatch: { id: cfg.videoCards[0].id, field: 'provider', value: 'qwen-token-plan' }, saveVideoCardPreset: { cardId: cfg.videoCards[0].id } })
  assert.equal(cfg.videoCards[0].config.endpoint, 'https://dashscope.aliyuncs.com')
  assert.equal(cfg.videoCards[0].config.protocol, 'dashscope-video')
})

test('videoVisible gate = videoEnabled && any valid enabled card', () => {
  let cfg = applyPatch({}, {})
  assert.equal(cfg.videoEnabled === true && cfg.videoCards.some(c => c.enabled !== false && isVideoConfigValid(c.config)), false)
  cfg = applyPatch(cfg, { videoEnabled: true })
  const cid = cfg.videoCards[0].id
  cfg = applyPatch(cfg, { videoCardPatch: { id: cid, field: 'provider', value: 'agnes-cn' }, saveVideoCardPreset: { cardId: cid } })
  cfg = applyPatch(cfg, { videoCardPatch: { id: cid, field: 'apiKey', value: 'sk' }, saveVideoCardPreset: { cardId: cid } })
  cfg = applyPatch(cfg, { videoCardPatch: { id: cid, field: 'model', value: 'm' }, saveVideoCardPreset: { cardId: cid } })
  assert.equal(cfg.videoEnabled === true && cfg.videoCards.some(c => c.enabled !== false && isVideoConfigValid(c.config)), true)
})

// ---- agnes helpers ----

test('agnesNumFrames: seconds -> 8n+1 @24fps capped at 441', () => {
  assert.equal(agnesNumFrames(5), 121)  // 5*24=120 -> 121
  assert.equal(agnesNumFrames(10), 241) // 10*24=240 -> 241
  assert.equal(agnesNumFrames(60), 441) // capped
})

test('klingJwt produces a decodable HS256 JWT with iss/exp/nbf', () => {
  const jwt = klingJwt('AK123', 'SK456')
  const parts = jwt.split('.')
  assert.equal(parts.length, 3)
  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'))
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
  assert.equal(header.alg, 'HS256')
  assert.equal(payload.iss, 'AK123')
  assert.equal(payload.nbf, payload.exp - 1805)
  // 签名是 32 字节 HS256
  assert.equal(Buffer.from(parts[2], 'base64url').length, 32)
})

// ---- buildVideoSubmit snapshots ----

test('buildVideoSubmit openai-videos (agnes): num_frames + frame_rate + width/height', () => {
  const s = buildVideoSubmit(agnes(), { prompt: 'a cat', seconds: 5, aspectRatio: '16:9' }, null)
  assert.equal(s.url, 'https://api.agnes-ai.cn/v1/videos')
  assert.equal(s.method, 'POST')
  assert.equal(s.headers.Authorization, 'Bearer sk-test')
  assert.equal(s.body.model, 'agnes-video-v2.0')
  assert.equal(s.body.num_frames, 121)
  assert.equal(s.body.frame_rate, 24)
  assert.equal(s.body.width, 1280)
  assert.equal(s.body.height, 720)
  assert.equal(s.body.size, undefined)
})

test('buildVideoSubmit openai-videos (custom relay): size instead of num_frames', () => {
  const s = buildVideoSubmit(custom(), { prompt: 'p', seconds: 5 }, null)
  assert.equal(s.url, 'https://relay.example.com/v1/videos') // 自动补 /v1
  assert.equal(s.body.size, '1280x720')
  assert.equal(s.body.num_frames, undefined)
})

test('buildVideoSubmit openai-videos i2v passes image_url', () => {
  const s = buildVideoSubmit(agnes(), { prompt: 'p' }, { kind: 'url', value: 'https://img/x.png' })
  assert.equal(s.body.image_url, 'https://img/x.png')
  assert.equal(s.i2v, true)
})

test('buildVideoSubmit dashscope-video: X-DashScope-Async + native path + media[].url', () => {
  const s = buildVideoSubmit(dash(), { prompt: 'p' }, { kind: 'b64', value: 'AAAA' })
  assert.equal(s.url, 'https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis')
  assert.equal(s.headers['X-DashScope-Async'], 'enable')
  assert.equal(s.headers.Authorization, 'Bearer sk-ds')
  assert.equal(s.body.input.prompt, 'p')
  assert.deepEqual(s.body.input.media, [{ type: 'first_frame', url: 'data:image/png;base64,AAAA' }])
  assert.equal(s.body.parameters.resolution, '720P')
  assert.equal(s.body.parameters.duration, 5)
  // t2v 无 media
  const t = buildVideoSubmit(dash(), { prompt: 'p' }, null)
  assert.equal(t.body.input.media, undefined)
})

test('buildVideoSubmit dashscope-video: workspace endpoint host preserved', () => {
  const wsCfg = normalizeVideoConfig({
    provider: 'dashscope',
    endpoint: 'https://ws-w3rsho7z9lnqjk8p.cn-beijing.maas.aliyuncs.com/compatible-mode/v1',
    apiKey: 'sk', model: 'wan2.7-i2v'
  })
  const s = buildVideoSubmit(wsCfg, { prompt: 'p' }, null)
  assert.equal(s.url, 'https://ws-w3rsho7z9lnqjk8p.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis')
})

// ---- v2.8.7: 百炼视频模型列表拉取（文档第6章）+ URL 后缀替换 ----

test('dashscopeVideoBase: URL 替换逻辑——把不适配视频接口的兼容后缀替换为原生 /api/v1', () => {
  // 用户链接带 /compatible-mode/v1（OpenAI 兼容，不含视频模型）
  const ws = normalizeVideoConfig({
    provider: 'dashscope',
    endpoint: 'https://ws-w3rsho7z9lnqjk8p.cn-beijing.maas.aliyuncs.com/compatible-mode/v1',
    apiKey: 'sk', model: 'wan2.7-i2v'
  })
  assert.equal(dashscopeVideoBase(ws), 'https://ws-w3rsho7z9lnqjk8p.cn-beijing.maas.aliyuncs.com/api/v1')
  // 已带 /api/v1 原样保留
  assert.equal(dashscopeVideoBase({ provider: 'dashscope', endpoint: 'https://ws-x.maas.aliyuncs.com/api/v1' }), 'https://ws-x.maas.aliyuncs.com/api/v1')
  // 仅 /v1 也归一到 /api/v1
  assert.equal(dashscopeVideoBase({ provider: 'dashscope', endpoint: 'https://ws-x.maas.aliyuncs.com/v1' }), 'https://ws-x.maas.aliyuncs.com/api/v1')
  // 无后缀补 /api/v1
  assert.equal(dashscopeVideoBase({ provider: 'dashscope', endpoint: 'https://ws-x.maas.aliyuncs.com' }), 'https://ws-x.maas.aliyuncs.com/api/v1')
})

test('dashscopeModelsUrl: 使用原生 /api/v1/models?capabilities=VG（文档第6章）', () => {
  const ws = normalizeVideoConfig({
    provider: 'dashscope',
    endpoint: 'https://ws-w3rsho7z9lnqjk8p.cn-beijing.maas.aliyuncs.com/compatible-mode/v1',
    apiKey: 'sk', model: 'wan2.7-i2v'
  })
  // URL 替换逻辑已生效：/compatible-mode/v1 → /api/v1，并拼接原生模型列表路径
  assert.equal(dashscopeModelsUrl(ws), 'https://ws-w3rsho7z9lnqjk8p.cn-beijing.maas.aliyuncs.com/api/v1/models?capabilities=VG&page_size=100')
})

test('parseDashscopeModelList: 解析百炼原生 body.output.models（文档第6.4章）', () => {
  const body = {
    success: true,
    output: {
      total: 88,
      models: [
        { model: 'wan2.7-i2v', name: 'Wan2.7-I2V', capabilities: ['VG'] },
        { model: 'wan2.7-t2v', name: 'Wan2.7-T2V' },
        { model: 'wan3.0-video', name: 'Wan3.0-Video' }
      ]
    }
  }
  assert.deepEqual(parseDashscopeModelList(body), ['wan2.7-i2v', 'wan2.7-t2v', 'wan3.0-video'])
  // 缺 output.models 时返回空数组
  assert.deepEqual(parseDashscopeModelList({ output: {} }), [])
  assert.deepEqual(parseDashscopeModelList(null), [])
})

test('buildVideoSubmit kling-video: JWT auth + text2video/image2video + duration/aspect', () => {
  const s = buildVideoSubmit(kling(), { prompt: 'p', seconds: 6 }, null)
  assert.equal(s.url, 'https://api.klingai.com/v1/videos/text2video')
  assert.ok(s.headers.Authorization.startsWith('Bearer eyJ'))
  assert.equal(s.body.duration, '6')
  assert.equal(s.body.aspect_ratio, '16:9')
  assert.equal(s.body.mode, 'std')
  const s2 = buildVideoSubmit(kling(), { prompt: 'p' }, { kind: 'b64', value: 'BBBB' })
  assert.equal(s2.url, 'https://api.klingai.com/v1/videos/image2video')
  assert.equal(s2.body.image, 'BBBB')
  assert.equal(s2.i2v, true)
})

test('buildVideoSubmit volc-video i2v: content array with first_frame image_url', () => {
  const s = buildVideoSubmit(volc(), { prompt: 'p', seconds: 5 }, { kind: 'b64', value: 'CCCC' })
  assert.equal(s.url, 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks')
  assert.equal(s.body.model, 'doubao-seedance-2-5')
  assert.equal(s.body.content[0].type, 'text')
  assert.deepEqual(s.body.content[1], { type: 'image_url', image_url: { url: 'data:image/png;base64,CCCC' }, role: 'first_frame' })
  assert.equal(s.body.resolution, '720p')
  assert.equal(s.body.ratio, '16:9')
  assert.equal(s.body.duration, 5)
})

test('buildVideoSubmit minimax-video: duration + resolution 720P', () => {
  const s = buildVideoSubmit(minimax(), { prompt: 'p', seconds: 6, resolution: '1080p' }, null)
  assert.equal(s.url, 'https://api.minimaxi.com/v1/video_generation')
  assert.equal(s.body.duration, 6)
  assert.equal(s.body.resolution, '1080P')
})

test('buildVideoSubmit async-task: custom submitPath + taskIdField not in body', () => {
  const c = custom({ protocol: 'async-task', submitPath: '/api/v1/gens', pollPath: '/tasks/{id}', statusField: 'state', resultField: 'data.url', doneStatus: 'ok' })
  const s = buildVideoSubmit(c, { prompt: 'p' }, { kind: 'url', value: 'https://img/u.png' })
  assert.equal(s.url, 'https://relay.example.com/api/v1/gens')
  assert.equal(s.body.image, 'https://img/u.png')
})

test('buildVideoSubmit dashscope-video i2v: media[].url is data URL with mime', () => {
  const r = buildVideoSubmit(dash(), { prompt: 'p' }, { kind: 'b64', value: 'AAAA', mime: 'image/png' })
  assert.deepEqual(r.body.input.media, [{ type: 'first_frame', url: 'data:image/png;base64,AAAA' }])
})

test('buildVideoSubmit dashscope-video i2v: url image passes through', () => {
  const r = buildVideoSubmit(dash(), { prompt: 'p' }, { kind: 'url', value: 'https://example.com/a.png' })
  assert.deepEqual(r.body.input.media, [{ type: 'first_frame', url: 'https://example.com/a.png' }])
})

test('buildVideoSubmit kling-video i2v: raw base64 (no prefix)', () => {
  const r = buildVideoSubmit(kling(), { prompt: 'p' }, { kind: 'b64', value: 'AAAA', mime: 'image/png' })
  assert.equal(r.body.image, 'AAAA') // Kling 发裸 Base64（无 data: 前缀）
})

test('buildVideoSubmit openai-videos i2v: data URL uses actual mime', () => {
  const r = buildVideoSubmit(agnes(), { prompt: 'p' }, { kind: 'b64', value: 'AAAA', mime: 'image/jpeg' })
  assert.equal(r.body.image_url, 'data:image/jpeg;base64,AAAA')
})

// ---- poll URLs ----

test('videoPollUrl per protocol', () => {
  assert.equal(videoPollUrl('openai-videos', agnes(), 'T1', false), 'https://api.agnes-ai.cn/v1/videos/T1')
  assert.equal(videoPollUrl('dashscope-video', dash(), 'T1', false), 'https://dashscope.aliyuncs.com/api/v1/tasks/T1')
  assert.equal(videoPollUrl('kling-video', kling(), 'T1', false), 'https://api.klingai.com/v1/videos/text2video/T1')
  assert.equal(videoPollUrl('kling-video', kling(), 'T1', true), 'https://api.klingai.com/v1/videos/image2video/T1')
  assert.equal(videoPollUrl('volc-video', volc(), 'T1', false), 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/T1')
  assert.equal(videoPollUrl('minimax-video', minimax(), 'T1', false), 'https://api.minimaxi.com/v1/query/video_generation?task_id=T1')
  const ac = custom({ protocol: 'async-task', pollPath: '/tasks/{id}' })
  assert.equal(videoPollUrl('async-task', ac, 'T1', false), 'https://relay.example.com/tasks/T1')
})

// ---- status normalization ----

test('normalizeVideoStatus openai-videos: completed -> done with metadata.url', () => {
  const r = normalizeVideoStatus('openai-videos', agnes(), { status: 'completed', metadata: { url: 'https://cdn/v.mp4' } })
  assert.deepEqual(r, { status: 'done', url: 'https://cdn/v.mp4', videoId: '' })
  assert.equal(normalizeVideoStatus('openai-videos', agnes(), { status: 'processing' }).status, 'running')
  assert.equal(normalizeVideoStatus('openai-videos', agnes(), { status: 'queued' }).status, 'pending')
  assert.equal(normalizeVideoStatus('openai-videos', agnes(), { status: 'failed' }).status, 'failed')
  // Agnes/Sora 实测：完成但响应无 url（仅 video_id）——done + 空 url + videoId，执行器走 /agnesapi
  const noUrl = normalizeVideoStatus('openai-videos', agnes(), { status: 'completed', video_id: 'video_xxx' })
  assert.deepEqual(noUrl, { status: 'done', url: '', videoId: 'video_xxx' })
})

test('normalizeVideoStatus dashscope: SUCCEEDED -> done video_url', () => {
  const r = normalizeVideoStatus('dashscope-video', dash(), { output: { task_status: 'SUCCEEDED', video_url: 'https://v.m3u8' } })
  assert.deepEqual(r, { status: 'done', url: 'https://v.m3u8' })
  assert.equal(normalizeVideoStatus('dashscope-video', dash(), { output: { task_status: 'RUNNING' } }).status, 'running')
  assert.equal(normalizeVideoStatus('dashscope-video', dash(), { output: { task_status: 'FAILED', message: 'bad' } }).status, 'failed')
})

test('normalizeVideoStatus kling: succeed -> task_result.videos[0].url', () => {
  const r = normalizeVideoStatus('kling-video', kling(), { data: { task_status: 'succeed', task_result: { videos: [{ url: 'https://k/v.mp4' }] } } })
  assert.deepEqual(r, { status: 'done', url: 'https://k/v.mp4' })
  assert.equal(normalizeVideoStatus('kling-video', kling(), { data: { task_status: 'processing' } }).status, 'running')
})

test('normalizeVideoStatus volc: succeeded -> content video_url', () => {
  const r = normalizeVideoStatus('volc-video', volc(), { status: 'succeeded', content: [{ type: 'video_url', video_url: { url: 'https://volc/v.mp4' } }] })
  assert.deepEqual(r, { status: 'done', url: 'https://volc/v.mp4' })
  assert.equal(normalizeVideoStatus('volc-video', volc(), { status: 'running' }).status, 'running')
})

test('normalizeVideoStatus minimax: success -> fileId for second-step', () => {
  const r = normalizeVideoStatus('minimax-video', minimax(), { status: 'success', file_id: 'F1' })
  assert.deepEqual(r, { status: 'done', fileId: 'F1' })
  assert.equal(normalizeVideoStatus('minimax-video', minimax(), { status: 'processing' }).status, 'running')
})

test('normalizeVideoStatus async-task: custom statusField/resultField/doneStatus', () => {
  const c = custom({ protocol: 'async-task', statusField: 'state', resultField: 'data.url', doneStatus: 'ok' })
  const r = normalizeVideoStatus('async-task', c, { state: 'ok', data: { url: 'https://a/v.mp4' } })
  assert.deepEqual(r, { status: 'done', url: 'https://a/v.mp4' })
  assert.equal(normalizeVideoStatus('async-task', c, { state: 'run' }).status, 'running')
})

// ---- task id extraction ----

test('extractVideoTaskId per protocol', () => {
  assert.equal(extractVideoTaskId('openai-videos', agnes(), { id: 'T-OPENAI' }), 'T-OPENAI')
  assert.equal(extractVideoTaskId('dashscope-video', dash(), { output: { task_id: 'T-DS' } }), 'T-DS')
  assert.equal(extractVideoTaskId('kling-video', kling(), { data: { task_id: 'T-KL' } }), 'T-KL')
  assert.equal(extractVideoTaskId('volc-video', volc(), { id: 'T-VOLC' }), 'T-VOLC')
  assert.equal(extractVideoTaskId('minimax-video', minimax(), { task_id: 'T-MM' }), 'T-MM')
  const ac = custom({ protocol: 'async-task', taskIdField: 'payload.task.id' })
  assert.equal(extractVideoTaskId('async-task', ac, { payload: { task: { id: 'T-AC' } } }), 'T-AC')
  assert.equal(extractVideoTaskId('async-task', ac, {}), '')
})

// ---- poll once (injected fetch) ----

test('pollVideoOnce uses fetchImpl and returns done url', async () => {
  const calls = []
  const fetchImpl = async (url, method, headers) => {
    calls.push({ url, method, headers })
    return { ok: true, status: 200, body: { status: 'completed', metadata: { url: 'https://cdn/v.mp4' } }, message: '' }
  }
  const r = await pollVideoOnce('openai-videos', agnes(), 'T1', false, fetchImpl)
  assert.deepEqual(r, { status: 'done', url: 'https://cdn/v.mp4', videoId: '' })
  assert.equal(calls[0].url, 'https://api.agnes-ai.cn/v1/videos/T1')
  assert.equal(calls[0].headers.Authorization, 'Bearer sk-test')
})

test('pollVideoOnce non-object body -> error (anti-bot page)', async () => {
  const fetchImpl = async () => ({ ok: true, status: 200, body: '<html>cloudflare</html>', message: '<html>' })
  const r = await pollVideoOnce('openai-videos', agnes(), 'T1', false, fetchImpl)
  assert.equal(r.status, 'error')
})

// ---- minimax two-step ----

test('minimaxResolveUrl resolves download_url via files/retrieve', async () => {
  const fetchImpl = async (url) => {
    assert.ok(url.includes('/v1/files/retrieve?file_id=F1&purpose=video'))
    return { ok: true, status: 200, body: { file: { download_url: 'https://mm/v.mp4' } }, message: '' }
  }
  const url = await minimaxResolveUrl(minimax(), 'F1', fetchImpl)
  assert.equal(url, 'https://mm/v.mp4')
})

// ---- misc pure helpers ----

test('pathGet walks dotted paths and tolerates missing', () => {
  assert.equal(pathGet({ a: { b: { c: 1 } } }, 'a.b.c'), 1)
  assert.equal(pathGet({ a: 1 }, 'a.b.c'), undefined)
  assert.equal(pathGet(null, 'a.b'), undefined)
  assert.equal(pathGet({}, ''), undefined)
})

test('VIDEO_PROTOCOLS / VIDEO_PROVIDERS integrity', () => {
  assert.deepEqual(VIDEO_PROTOCOLS, ['openai-videos', 'dashscope-video', 'kling-video', 'volc-video', 'minimax-video', 'async-task'])
  for (const id of Object.keys(VIDEO_PROVIDERS)) {
    const p = VIDEO_PROVIDERS[id].protocol
    assert.ok(VIDEO_PROTOCOLS.includes(p), id + ' protocol ' + p + ' in list')
  }
  assert.ok(VIDEO_ASPECT_RATIOS['16:9'])
  assert.ok(VIDEO_ASPECT_RATIOS['9:16'])
})

// ---- video cards + presets (v2.11) ----

test('video card: default preset auto-created (shared pool) and runtime config follows active preset', () => {
  let cfg = applyPatch({}, {})
  assert.ok(Array.isArray(cfg.videoCards))
  assert.equal(cfg.videoCards.length, 1)
  const card = cfg.videoCards[0]
  const cid = card.id
  assert.ok(Array.isArray(cfg.videoPresets))
  assert.equal(cfg.videoPresets.length, 1)
  assert.equal(cfg.videoPresets[0].name, '默认')
  assert.equal(card.activePreset, cfg.videoPresets[0].id)
  // Runtime config = active preset config
  assert.equal(card.config.provider, cfg.videoPresets[0].config.provider)

  // Patch config + save to preset → both update
  cfg = applyPatch(cfg, { videoCardPatch: { id: cid, field: 'provider', value: 'agnes-cn' }, saveVideoCardPreset: { cardId: cid } })
  assert.equal(cfg.videoCards[0].config.provider, 'agnes-cn')
  assert.equal(cfg.videoPresets[0].config.provider, 'agnes-cn')
})

test('video card: videoCardPatch does NOT sync config to preset (manual-save)', () => {
  let cfg = applyPatch({}, {})
  const cid = cfg.videoCards[0].id
  const presetModel = cfg.videoPresets[0].config.model

  cfg = applyPatch(cfg, { videoCardPatch: { id: cid, field: 'model', value: 'agnes-video-v2.0' } })
  // Config IS updated (runtime config is source of truth — v2.11 fix)
  assert.equal(cfg.videoCards[0].config.model, 'agnes-video-v2.0')
  // Preset is NOT synced (manual-save only)
  assert.equal(cfg.videoPresets[0].config.model, presetModel) // preset unchanged
})

test('video card: preset add / switch / rename / delete (shared pool)', () => {
  let cfg = applyPatch({}, {})
  const cid = cfg.videoCards[0].id
  const p0 = cfg.videoPresets[0].id

  // add preset (shared pool grows)
  cfg = applyPatch(cfg, { videoCardPresetAdd: { cardId: cid } })
  assert.equal(cfg.videoPresets.length, 2)
  assert.equal(cfg.videoPresets[1].name, '新预设 1')
  assert.equal(cfg.videoCards[0].activePreset, cfg.videoPresets[1].id)
  assert.equal(cfg.videoCards[0].config.provider, 'custom') // 新预设默认配置

  // switch back to first
  cfg = applyPatch(cfg, { videoCardPresetSwitch: { cardId: cid, presetId: p0 } })
  assert.equal(cfg.videoCards[0].activePreset, p0)
  assert.equal(cfg.videoCards[0].config.provider, cfg.videoPresets[0].config.provider)

  // rename active
  cfg = applyPatch(cfg, { videoCardPresetRename: { cardId: cid, name: 'Agnes 生产' } })
  assert.equal(cfg.videoPresets.find((p) => p.id === p0).name, 'Agnes 生产')

  // delete the second preset (not active)
  const p1 = cfg.videoPresets.find((p) => p.id !== p0).id
  cfg = applyPatch(cfg, { videoCardPresetDelete: { cardId: cid, presetId: p1 } })
  assert.equal(cfg.videoPresets.length, 1)
  assert.equal(cfg.videoCards[0].activePreset, p0)

  // delete the last one -> auto-recreate 默认
  cfg = applyPatch(cfg, { videoCardPresetDelete: { cardId: cid, presetId: p0 } })
  assert.equal(cfg.videoPresets.length, 1)
  assert.equal(cfg.videoPresets[0].name, '默认')
})

test('video presets shared across cards: card A save visible to card B', () => {
  let cfg = applyPatch({}, {})
  cfg = applyPatch(cfg, { videoCardAdd: { name: 'Card B', type: 'general', toolName: 'generate_video_b', description: '' } })
  const cidA = cfg.videoCards[0].id
  const cidB = cfg.videoCards[1].id
  // shared pool starts at 1
  assert.equal(cfg.videoPresets.length, 1)
  // card A adds a preset to the shared pool → card B sees it
  cfg = applyPatch(cfg, { videoCardPresetAdd: { cardId: cidA } })
  assert.equal(cfg.videoPresets.length, 2)
  const newPid = cfg.videoPresets[1].id
  // card B switches to the preset created by card A
  cfg = applyPatch(cfg, { videoCardPresetSwitch: { cardId: cidB, presetId: newPid } })
  assert.equal(cfg.videoCards[1].activePreset, newPid)
  // card A saves config into that shared preset
  cfg = applyPatch(cfg, { videoCardPatch: { id: cidA, field: 'provider', value: 'agnes-cn' }, saveVideoCardPreset: { cardId: cidA } })
  assert.equal(cfg.videoPresets[1].config.provider, 'agnes-cn')
  // card B switching to that preset reflects card A's saved snapshot
  cfg = applyPatch(cfg, { videoCardPresetSwitch: { cardId: cidB, presetId: newPid } })
  assert.equal(cfg.videoCards[1].config.provider, 'agnes-cn')
})

test('delete shared preset repairs activePreset of every card', () => {
  let cfg = applyPatch({}, {})
  cfg = applyPatch(cfg, { videoCardAdd: { name: 'B', type: 'general', toolName: 'generate_video_b' } })
  const cidA = cfg.videoCards[0].id
  const cidB = cfg.videoCards[1].id
  cfg = applyPatch(cfg, { videoCardPresetAdd: { cardId: cidA } })
  const p1 = cfg.videoPresets[1].id
  // B activates the preset that A created
  cfg = applyPatch(cfg, { videoCardPresetSwitch: { cardId: cidB, presetId: p1 } })
  assert.equal(cfg.videoCards[1].activePreset, p1)
  // A deletes p1 (shared) → both cards repaired to the remaining default
  cfg = applyPatch(cfg, { videoCardPresetDelete: { cardId: cidA, presetId: p1 } })
  assert.equal(cfg.videoPresets.length, 1)
  assert.equal(cfg.videoCards[0].activePreset, cfg.videoPresets[0].id)
  assert.equal(cfg.videoCards[1].activePreset, cfg.videoPresets[0].id)
})

// ---- v2.8.x: video model list filter + tool description defaults ----

test('filterVideoModelIds keeps video-family names and excludes image models', () => {
  const keep = [
    'wan2.7-i2v', 'wan2.5-t2v', 'agnes-video-2.5', 'sora-2', 'doubao-seedance-2-5',
    'kling-v1-6', 'MiniMax-Hailuo-2.3', 'cogvideox-5b', 'veo-3', 'vidu-1'
  ]
  const drop = [
    'wan2.2-t2i-flash', 'wanx2.1-t2i-turbo', 'gpt-image-1', 'seedream-4.5',
    'dall-e-3', 'flux-schnell', 'cogview-4', 'stable-diffusion-3', 'qwen-max',
    'text-embedding-v3'
  ]
  const out = filterVideoModelIds(keep.concat(drop))
  for (const id of keep) assert.ok(out.includes(id), 'keep ' + id)
  for (const id of drop) assert.ok(!out.includes(id), 'drop ' + id)
  assert.deepEqual(filterVideoModelIds(null), [])
  assert.deepEqual(filterVideoModelIds('nope'), [])
})

test('buildVideoSubmit: args.resolution / args.aspectRatio override panel defaults', () => {
  const b1 = buildVideoSubmit(volc(), { prompt: 'p', aspectRatio: '1:1', resolution: '1080p' }, null)
  assert.equal(b1.body.resolution, '1080p')
  assert.equal(b1.body.ratio, '1:1')
  const b2 = buildVideoSubmit(volc(), { prompt: 'p' }, null)
  assert.equal(b2.body.resolution, '720p')
  assert.equal(b2.body.ratio, '16:9')
})

test('buildVideoToolDef injects panel defaults and user-priority guidance', () => {
  const def = buildVideoToolDef({ seconds: 10, aspectRatio: '1:1', retryCount: 3 }, 'generate_video', '', 'general')
  assert.ok(def.description.includes('10s'))
  assert.ok(def.description.includes('1:1'))
  assert.ok(def.description.includes('3 次'))
  assert.ok(def.description.includes('以用户要求为最高优先级'))
  const props = def.parameters.properties
  assert.ok(props.resolution, 'resolution param present')
  assert.ok(props.aspect_ratio.description.includes('用户要求为准'))
})

// ---- v2.11: videoCards normalize/mask/CRUD/migration tests ----

test('normalizeConfig fresh install: empty → one default 通用 card', () => {
  const cfg = applyPatch({}, {})
  assert.ok(Array.isArray(cfg.videoCards))
  assert.equal(cfg.videoCards.length, 1)
  const card = cfg.videoCards[0]
  assert.equal(card.type, 'general')
  assert.equal(card.toolName, 'generate_video')
  assert.equal(card.enabled, true)
  assert.ok(Array.isArray(cfg.videoPresets))
  assert.equal(cfg.videoPresets.length, 1)
  assert.equal(cfg.videoPresets[0].name, '默认')
  assert.equal(card.activePreset, cfg.videoPresets[0].id)
})

test('normalizeConfig migration: legacy videoPresets → shared videoPresets pool', () => {
  const legacy = {
    videoConfig: { provider: 'agnes-cn', apiKey: 'sk', model: 'agnes-video-v2.0' },
    videoPresets: [
      { id: 'p1', name: 'Agnes', config: { provider: 'agnes-cn', apiKey: 'sk', model: 'agnes-video-v2.0' } },
      { id: 'p2', name: 'Custom', config: { provider: 'custom', endpoint: 'https://relay.example.com', apiKey: 'sk', model: 'vid' } }
    ],
    activeVideoPreset: 'p1'
  }
  const cfg = applyPatch(legacy, {})
  assert.ok(Array.isArray(cfg.videoCards))
  assert.equal(cfg.videoCards.length, 1)
  assert.equal(cfg.videoPresets.length, 2)
  assert.equal(cfg.videoPresets[0].name, 'Agnes')
  assert.equal(cfg.videoCards[0].activePreset, 'p1')
  assert.equal(cfg.videoCards[0].config.provider, 'agnes-cn')
})

test('masked(): videoCards have masked config + masked presets', () => {
  let cfg = applyPatch({}, {})
  const cid = cfg.videoCards[0].id
  cfg = applyPatch(cfg, { videoCardPatch: { id: cid, field: 'apiKey', value: 'secret-key' }, saveVideoCardPreset: { cardId: cid } })
  const card = cfg.videoCards[0]
  // Verify card structure
  assert.equal(typeof card.id, 'string')
  assert.equal(typeof card.name, 'string')
  assert.equal(typeof card.type, 'string')
  assert.equal(typeof card.toolName, 'string')
  assert.equal(typeof card.description, 'string')
  assert.equal(typeof card.enabled, 'boolean')
  assert.equal(typeof card.collapsed, 'boolean')
  // Masked config (using maskedVideo on the real config)
  const maskedConfig = maskedVideo(card.config)
  assert.equal(maskedConfig.apiKey, undefined)
  assert.equal(maskedConfig.apiKeySet, true)
  // Masked shared presets
  assert.ok(Array.isArray(cfg.videoPresets))
  const maskedPreset = maskedVideo(cfg.videoPresets[0].config)
  assert.equal(maskedPreset.apiKey, undefined)
  assert.equal(maskedPreset.apiKeySet, true)
})

test('applyPatch videoCardAdd/Delete/Patch', () => {
  let cfg = applyPatch({}, {})
  assert.equal(cfg.videoCards.length, 1)

  // Add a card (type determines toolName for non-general types via normalizeConfig)
  cfg = applyPatch(cfg, { videoCardAdd: { name: 'Text to Video', type: 'text2video', toolName: 'generate_video_text2video', description: 'Text to video' } })
  assert.equal(cfg.videoCards.length, 2)
  assert.equal(cfg.videoCards[1].name, 'Text to Video')
  assert.equal(cfg.videoCards[1].type, 'text2video')
  assert.equal(cfg.videoCards[1].toolName, 'generate_video_text2video')

  // Patch card-level fields
  cfg = applyPatch(cfg, { videoCardPatch: { id: cfg.videoCards[1].id, field: 'name', value: 'T2V Card' } })
  assert.equal(cfg.videoCards[1].name, 'T2V Card')

  // Delete the card
  const cardId = cfg.videoCards[1].id
  cfg = applyPatch(cfg, { videoCardDelete: cardId })
  assert.equal(cfg.videoCards.length, 1)
})

test('applyPatch videoCardPatch with field=provider triggers cascade (provider→protocol/endpoint)', () => {
  let cfg = applyPatch({}, {})
  const cid = cfg.videoCards[0].id
  cfg = applyPatch(cfg, { videoCardPatch: { id: cid, field: 'provider', value: 'agnes-cn' }, saveVideoCardPreset: { cardId: cid } })
  assert.equal(cfg.videoCards[0].config.provider, 'agnes-cn')
  assert.equal(cfg.videoCards[0].config.protocol, 'openai-videos')
  assert.equal(cfg.videoCards[0].config.endpoint, 'https://api.agnes-ai.cn/v1')
})

test('applyPatch videoCardPatch with field=enabled sets card.enabled (card-level)', () => {
  let cfg = applyPatch({}, {})
  const cid = cfg.videoCards[0].id
  assert.equal(cfg.videoCards[0].enabled, true)
  cfg = applyPatch(cfg, { videoCardPatch: { id: cid, field: 'enabled', value: false } })
  assert.equal(cfg.videoCards[0].enabled, false)
  cfg = applyPatch(cfg, { videoCardPatch: { id: cid, field: 'enabled', value: true } })
  assert.equal(cfg.videoCards[0].enabled, true)
})

test('applyPatch saveVideoCardPreset copies config → preset', () => {
  let cfg = applyPatch({}, {})
  const cid = cfg.videoCards[0].id
  cfg = applyPatch(cfg, { videoCardPatch: { id: cid, field: 'model', value: 'agnes-video-v2.0' }, saveVideoCardPreset: { cardId: cid } })
  assert.equal(cfg.videoCards[0].config.model, 'agnes-video-v2.0')
  assert.equal(cfg.videoPresets[0].config.model, 'agnes-video-v2.0')
})

test('buildVideoToolDef(vc, toolName, desc, cardType) closure-captures vc defaults', () => {
  const def = buildVideoToolDef({ seconds: 10, aspectRatio: '1:1', retryCount: 3, model: 'my-model' }, 'generate_video', '', 'general')
  assert.equal(def.name, 'generate_video')
  assert.ok(def.description.includes('10s'))
  assert.ok(def.description.includes('1:1'))
  assert.ok(def.description.includes('3 次'))
  assert.ok(def.description.includes('my-model'))
  assert.ok(def.description.includes('以用户要求为最高优先级'))
})

// ---- v2.12.1: empty type + edit-modal full-card patch + custom type snapshot ----

test('videoCardAdd without type stores empty type (no general fallback)', () => {
  let cfg = applyPatch({}, {})
  cfg = applyPatch(cfg, { videoCardAdd: { name: 'No Type Card', toolName: 'generate_video_nt', description: '' } })
  const card = cfg.videoCards[1]
  assert.equal(card.type, '')
  assert.equal(card.toolName, 'generate_video_nt')
  // edit-modal patch keeps empty type empty
  cfg = applyPatch(cfg, { videoCardPatch: { id: card.id, field: 'name', value: card.name }, videoCardPatchName: card.name, videoCardPatchType: '', videoCardPatchToolName: 'generate_video_nt2', videoCardPatchDesc: 'updated desc' })
  assert.equal(cfg.videoCards[1].type, '')
  assert.equal(cfg.videoCards[1].toolName, 'generate_video_nt2')
  assert.equal(cfg.videoCards[1].description, 'updated desc')
  // patching type to a real value works too
  cfg = applyPatch(cfg, { videoCardPatch: { id: card.id, field: 'name', value: card.name }, videoCardPatchType: 't2v' })
  assert.equal(cfg.videoCards[1].type, 't2v')
})

test('videoCardPatchToolName duplicate throws', () => {
  let cfg = applyPatch({}, {})
  cfg = applyPatch(cfg, { videoCardAdd: { name: 'B', type: '', toolName: 'generate_video_b' } })
  const cidA = cfg.videoCards[0].id
  assert.throws(function () {
    applyPatch(cfg, { videoCardPatch: { id: cidA, field: 'name', value: cfg.videoCards[0].name }, videoCardPatchToolName: 'generate_video_b' })
  }, /工具名称已存在/)
})

test('videoCustomTypeAdd/Delete persists custom type snapshot with dedupe', () => {
  let cfg = applyPatch({}, {})
  assert.deepEqual(cfg.videoCustomTypes, [])
  cfg = applyPatch(cfg, { videoCustomTypeAdd: '自定义 1' })
  assert.deepEqual(cfg.videoCustomTypes, ['自定义 1'])
  // duplicate add is a no-op
  cfg = applyPatch(cfg, { videoCustomTypeAdd: '自定义 1' })
  assert.deepEqual(cfg.videoCustomTypes, ['自定义 1'])
  cfg = applyPatch(cfg, { videoCustomTypeAdd: '自定义 2' })
  assert.deepEqual(cfg.videoCustomTypes, ['自定义 1', '自定义 2'])
  // persisted through normalize (re-apply round trip)
  cfg = applyPatch(cfg, {})
  assert.deepEqual(cfg.videoCustomTypes, ['自定义 1', '自定义 2'])
  cfg = applyPatch(cfg, { videoCustomTypeDelete: '自定义 1' })
  assert.deepEqual(cfg.videoCustomTypes, ['自定义 2'])
})
