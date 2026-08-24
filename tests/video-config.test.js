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
  filterVideoModelIds, buildVideoToolDef
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
  provider: 'qwen-token-plan', apiKey: 'sk-qw', model: 'qwen-video'
})
const qwenCn = () => normalizeVideoConfig({
  provider: 'qwen-token-plan-cn', apiKey: 'sk-qw-cn', model: 'qwen-video'
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
  assert.equal(qwen().protocol, 'openai-videos')
  assert.equal(qwenCn().protocol, 'openai-videos')
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

test('buildVideoSubmit qwen-token-plan: openai-videos at token-plan endpoint (Sora style)', () => {
  const r = buildVideoSubmit(qwen(), { prompt: 'a cat', seconds: 5, aspectRatio: '16:9' }, null)
  assert.equal(r.url, 'https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/videos')
  assert.equal(r.body.model, 'qwen-video')
  assert.equal(r.body.size, '1280x720')
  assert.equal(r.method, 'POST')
  const poll = videoPollUrl('openai-videos', qwen(), 'VID1', false)
  assert.equal(poll, 'https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/videos/VID1')
})

// ---- applyPatch ----

test('applyPatch handles videoEnabled + videoConfig fields + videoReset', () => {
  let cfg = applyPatch({}, {}) // normalizeConfig({}) equivalent
  assert.equal(cfg.videoEnabled, false) // default OFF
  cfg = applyPatch(cfg, { videoEnabled: true })
  assert.equal(cfg.videoEnabled, true)

  cfg = applyPatch(cfg, { videoConfig: { field: 'provider', value: 'agnes-cn' } })
  assert.equal(cfg.videoConfig.provider, 'agnes-cn')
  assert.equal(cfg.videoConfig.protocol, 'openai-videos')
  assert.equal(cfg.videoConfig.endpoint, 'https://api.agnes-ai.cn/v1') // fixedUrl 自动填入

  cfg = applyPatch(cfg, { videoConfig: { field: 'apiKey', value: 'sk-x' } })
  assert.equal(cfg.videoConfig.apiKey, 'sk-x')
  cfg = applyPatch(cfg, { videoConfig: { field: 'apiKey', value: null } })
  assert.equal(cfg.videoConfig.apiKey, '')

  cfg = applyPatch(cfg, { videoConfig: { field: 'model', value: 'agnes-video-v2.0' } })
  assert.equal(cfg.videoConfig.model, 'agnes-video-v2.0')

  cfg = applyPatch(cfg, { videoConfig: { field: 'seconds', value: 10 } })
  assert.equal(cfg.videoConfig.seconds, 10)
  cfg = applyPatch(cfg, { videoConfig: { field: 'aspectRatio', value: '9:16' } })
  assert.equal(cfg.videoConfig.aspectRatio, '9:16')
  cfg = applyPatch(cfg, { videoConfig: { field: 'pollIntervalMs', value: 8000 } })
  assert.equal(cfg.videoConfig.pollIntervalMs, 8000)

  cfg = applyPatch(cfg, { videoReset: true })
  assert.equal(cfg.videoConfig.provider, 'custom')
  assert.equal(cfg.videoConfig.apiKey, '')
})

test('applyPatch: dashscope provider seeds editable default endpoint', () => {
  const cfg = applyPatch(applyPatch({}, {}), { videoConfig: { field: 'provider', value: 'dashscope' } })
  assert.equal(cfg.videoConfig.endpoint, 'https://dashscope.aliyuncs.com')
  assert.equal(cfg.videoConfig.protocol, 'dashscope-video')
})

test('videoVisible gate = videoEnabled && isVideoConfigValid', () => {
  let cfg = applyPatch({}, {})
  assert.equal(cfg.videoEnabled === true && isVideoConfigValid(cfg.videoConfig), false)
  cfg = applyPatch(cfg, { videoEnabled: true })
  cfg = applyPatch(cfg, { videoConfig: { field: 'provider', value: 'agnes-cn' } })
  cfg = applyPatch(cfg, { videoConfig: { field: 'apiKey', value: 'sk' } })
  cfg = applyPatch(cfg, { videoConfig: { field: 'model', value: 'm' } })
  assert.equal(cfg.videoEnabled === true && isVideoConfigValid(cfg.videoConfig), true)
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

test('buildVideoSubmit dashscope-video: X-DashScope-Async + native path + img_url', () => {
  const s = buildVideoSubmit(dash(), { prompt: 'p' }, { kind: 'b64', value: 'AAAA' })
  assert.equal(s.url, 'https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/generation')
  assert.equal(s.headers['X-DashScope-Async'], 'enable')
  assert.equal(s.headers.Authorization, 'Bearer sk-ds')
  assert.equal(s.body.input.prompt, 'p')
  assert.equal(s.body.input.img_url, 'AAAA')
  // t2v 无 img_url
  const t = buildVideoSubmit(dash(), { prompt: 'p' }, null)
  assert.equal(t.body.input.img_url, undefined)
})

test('buildVideoSubmit dashscope-video rewrites ws-*.maas.aliyuncs.com workspace endpoint', () => {
  const wsCfg = normalizeVideoConfig({
    provider: 'dashscope',
    endpoint: 'https://ws-w3rsho7z9lnqjk8p.cn-beijing.maas.aliyuncs.com/compatible-mode/v1',
    apiKey: 'sk', model: 'wan2.7-i2v'
  })
  const s = buildVideoSubmit(wsCfg, { prompt: 'p' }, null)
  assert.equal(s.url, 'https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/generation')
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

// ---- video presets (v2.8) ----

test('video presets: default 预设 auto-created and runtime config follows it', () => {
  let cfg = applyPatch({}, { videoConfig: { field: 'provider', value: 'agnes-cn' } })
  assert.equal(cfg.videoConfig.provider, 'agnes-cn')
  assert.ok(Array.isArray(cfg.videoPresets))
  assert.equal(cfg.videoPresets.length, 1)
  assert.equal(cfg.videoPresets[0].name, '默认')
  assert.equal(cfg.activeVideoPreset, cfg.videoPresets[0].id)
  assert.equal(cfg.videoConfig.provider, cfg.videoPresets[0].config.provider)
})

test('video presets: videoConfig patches sync into active preset', () => {
  let cfg = applyPatch({}, { videoConfig: { field: 'provider', value: 'agnes-cn' } })
  cfg = applyPatch(cfg, { videoConfig: { field: 'model', value: 'agnes-video-v2.0' } })
  assert.equal(cfg.videoConfig.model, 'agnes-video-v2.0')
  assert.equal(cfg.videoPresets[0].config.model, 'agnes-video-v2.0')
})

test('video presets: add / switch / rename / delete', () => {
  let cfg = applyPatch({}, { videoConfig: { field: 'provider', value: 'agnes-cn' } })
  const p0 = cfg.videoPresets[0].id
  // add
  cfg = applyPatch(cfg, { videoPresetAdd: true })
  assert.equal(cfg.videoPresets.length, 2)
  assert.equal(cfg.videoPresets[1].name, '新预设 1')
  assert.equal(cfg.activeVideoPreset, cfg.videoPresets[1].id)
  assert.equal(cfg.videoConfig.provider, 'custom') // 新预设默认配置
  // switch back to first
  cfg = applyPatch(cfg, { videoPresetSwitch: p0 })
  assert.equal(cfg.activeVideoPreset, p0)
  assert.equal(cfg.videoConfig.provider, 'agnes-cn')
  // rename active
  cfg = applyPatch(cfg, { videoPresetRename: 'Agnes 生产' })
  assert.equal(cfg.videoPresets.find((p) => p.id === p0).name, 'Agnes 生产')
  // delete the second preset (not active)
  const p1 = cfg.videoPresets.find((p) => p.id !== p0).id
  cfg = applyPatch(cfg, { videoPresetDelete: p1 })
  assert.equal(cfg.videoPresets.length, 1)
  assert.equal(cfg.activeVideoPreset, p0)
  // delete the last one -> auto-recreate 默认
  cfg = applyPatch(cfg, { videoPresetDelete: p0 })
  assert.equal(cfg.videoPresets.length, 1)
  assert.equal(cfg.videoPresets[0].name, '默认')
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
  const def = buildVideoToolDef({ seconds: 10, aspectRatio: '1:1', retryCount: 3 })
  assert.ok(def.description.includes('10s'))
  assert.ok(def.description.includes('1:1'))
  assert.ok(def.description.includes('3 次'))
  assert.ok(def.description.includes('以用户要求为最高优先级'))
  const props = def.parameters.properties
  assert.ok(props.resolution, 'resolution param present')
  assert.ok(props.aspect_ratio.description.includes('用户要求为准'))
})
