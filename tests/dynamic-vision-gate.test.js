// dynamic-vision-gate.test.js — v2.13.2 dynamic multimodal adaptation hard gate
// Pure function `nativeVisionDenyReason` (acceptance cases) + the registered
// `tools/pre-execute` listener driven through a fakeCtx (mirror of
// tests/stt-conflict.test.js): the agent/pre-step listener is fired first to
// set the production module state (lastDynamicAdapt / lastSourceAcceptsImages),
// then analyze_image dispatch is asserted deny/allow.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dshHome = mkdtempSync(join(tmpdir(), 'omni-workstation-dvgate-'))
process.env.DSH_HOME = dshHome
process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR = dshHome

const { apply, nativeVisionDenyReason, toolImageMarker, syncToolRegistration, _setLastSource, _resetLastSource, _setLastSourceAcceptsImages } = await import('../lib/index.js')

const writeCfg = (obj) => writeFileSync(join(dshHome, 'omni-vision.json'), JSON.stringify(obj))

function makeFakeCtx() {
  const registered = []
  const listeners = new Map()
  const routes = []
  return {
    registered,
    listeners,
    routes,
    get: (name) => {
      if (name === 'webServer') return { register: (route) => { routes.push(route); return () => {} } }
      return undefined
    },
    tools: {
      register: (def) => {
        registered.push(def)
        return () => { const i = registered.indexOf(def); if (i >= 0) registered.splice(i, 1) }
      }
    },
    llm: {
      listProviders: () => [],
      registerAdapter: () => () => {},
      // vision-capable resolveModel stub — drives sourceModelAcceptsImages(ctx)
      registration: () => ({
        adapter: {
          async resolveModel() { return { id: 'vision-x', inputModalities: ['text', 'image'] } }
        }
      }),
      stream: async function* () {},
      on: () => {},
      effect: () => {}
    },
    logger: { warn: () => {} },
    on: (event, fn) => listeners.set(event, fn),
    effect: (fn) => fn()
  }
}

const BASE_CFG = (extra) => Object.assign({
  retryCount: 1,
  apis: [],
  fallbackConfig: { provider: 'ovhcloud', models: [], timeoutMs: 1000 },
  globalConfig: { retryStatusCodes: '429', backoffBase: 1, backoff429Base: 1, backoffMax: 1, backoff429Max: 1 }
}, extra || {})

// Fire the production agent/pre-step listener once so module state
// (lastDynamicAdapt + lastSourceAcceptsImages) matches a live request.
async function primePreStep(ctx) {
  const fn = ctx.listeners.get('agent/pre-step')
  assert.equal(typeof fn, 'function', 'agent/pre-step listener must be registered')
  return fn(
    { agent: { session: { id: 's1', events: [] } } },
    async () => ({ kind: 'proceed', messages: [] })
  )
}

const nextOk = async () => ({ kind: 'proceed', messages: [] })

// ---------- pure: nativeVisionDenyReason (gate, adapt, acceptsImages, tool, args) ----------

test('nativeVisionDenyReason: gate off → never denies (v2.17 default)', () => {
  assert.equal(nativeVisionDenyReason(false, true, true, 'analyze_image', {}), '')
})

test('nativeVisionDenyReason: adapt off → no denial', () => {
  assert.equal(nativeVisionDenyReason(true, false, true, 'analyze_image', {}), '')
})

test('nativeVisionDenyReason: text-only model → no denial', () => {
  assert.equal(nativeVisionDenyReason(true, true, false, 'analyze_image', {}), '')
})

test('nativeVisionDenyReason: other tools unaffected', () => {
  assert.equal(nativeVisionDenyReason(true, true, true, 'analyze_media', {}), '')
  assert.equal(nativeVisionDenyReason(true, true, true, 'zoom_image', {}), '')
  assert.equal(nativeVisionDenyReason(true, true, true, 'transcribe', {}), '')
})

test('nativeVisionDenyReason: gate + adapt on + vision model → denied with concise escape hint', () => {
  const r = nativeVisionDenyReason(true, true, true, 'analyze_image', { image_path: 'a.png' })
  assert.ok(r.length > 0, 'must deny')
  assert.ok(r.includes('native_vision_failed'), 'deny reason must name the escape hatch')
  assert.ok(r.includes('read_image'), 'deny reason must point at native vision')
  // v2.17: no plugin-internal jargon in a model-facing denial
  assert.ok(!r.includes('动态多模态适应'), 'deny reason must not expose plugin internals')
})

test('nativeVisionDenyReason: native_vision_failed:true → allowed (escape hatch)', () => {
  assert.equal(nativeVisionDenyReason(true, true, true, 'analyze_image', { native_vision_failed: true }), '')
})

test('nativeVisionDenyReason: native_vision_failed falsy/missing → still denied', () => {
  assert.ok(nativeVisionDenyReason(true, true, true, 'analyze_image', { native_vision_failed: false }).length > 0)
  assert.ok(nativeVisionDenyReason(true, true, true, 'analyze_image', null).length > 0)
})

// ---------- listener: tools/pre-execute deny / allow ----------

test('listener: gate on + adapt on + vision model → analyze_image denied; flag call allowed', async () => {
  _resetLastSource()
  writeCfg(BASE_CFG({ globalConfig: { nativeVisionGate: true, retryStatusCodes: '429', backoffBase: 1, backoff429Base: 1, backoffMax: 1, backoff429Max: 1 } }))
  const ctx = makeFakeCtx()
  apply(ctx)
  _setLastSource('proxyz', 'vision-x')
  await primePreStep(ctx) // sets lastDynamicAdapt=true + lastSourceAcceptsImages=true + gate
  const fn = ctx.listeners.get('tools/pre-execute')
  assert.equal(typeof fn, 'function', 'tools/pre-execute listener must be registered')

  const denied = await fn({ name: 'analyze_image', arguments: { image_path: 'a.png' }, agent: { session: { events: [] } } }, nextOk)
  assert.equal(denied.kind, 'deny', 'analyze_image must be denied while native vision is declared')
  assert.ok(String(denied.reason).includes('native_vision_failed'))

  const allowed = await fn({ name: 'analyze_image', arguments: { image_path: 'a.png', native_vision_failed: true }, agent: { session: { events: [] } } }, nextOk)
  assert.equal(allowed.kind, 'proceed', 'escape-hatch call must pass through')

  // unrelated tools always pass
  const other = await fn({ name: 'zoom_image', arguments: {}, agent: { session: { events: [] } } }, nextOk)
  assert.equal(other.kind, 'proceed')
})

test('listener: gate off (default) → analyze_image allowed on a vision model', async () => {
  _resetLastSource()
  writeCfg(BASE_CFG())
  const ctx = makeFakeCtx()
  apply(ctx)
  _setLastSource('proxyz', 'vision-x')
  await primePreStep(ctx)
  const fn = ctx.listeners.get('tools/pre-execute')
  const r = await fn({ name: 'analyze_image', arguments: { image_path: 'a.png' }, agent: { session: { events: [] } } }, nextOk)
  assert.equal(r.kind, 'proceed', 'v2.17: gate is opt-in')
})

test('listener: gate on but adapt off → analyze_image allowed', async () => {
  _resetLastSource()
  writeCfg(BASE_CFG({ globalConfig: { nativeVisionGate: true, dynamicMultimodalAdapt: false, retryStatusCodes: '429', backoffBase: 1, backoff429Base: 1, backoffMax: 1, backoff429Max: 1 } }))
  const ctx = makeFakeCtx()
  apply(ctx)
  _setLastSource('proxyz', 'vision-x')
  await primePreStep(ctx) // sets lastDynamicAdapt=false
  const fn = ctx.listeners.get('tools/pre-execute')
  const r = await fn({ name: 'analyze_image', arguments: { image_path: 'a.png' }, agent: { session: { events: [] } } }, nextOk)
  assert.equal(r.kind, 'proceed', 'adapt off → gate disarmed')
})

test('listener: text-only model → analyze_image allowed', async () => {
  _resetLastSource()
  writeCfg(BASE_CFG())
  const ctx = makeFakeCtx()
  apply(ctx)
  // acceptsImages stays false (never primed with a vision model) → gate inert
  _setLastSourceAcceptsImages(false)
  const fn = ctx.listeners.get('tools/pre-execute')
  const r = await fn({ name: 'analyze_image', arguments: { image_path: 'a.png' }, agent: { session: { events: [] } } }, nextOk)
  assert.equal(r.kind, 'proceed')
  _resetLastSource()
})

// ---------- v2.19.1: only IMAGE_UNSUPPORTED_MODEL gets the analyze_image hint ----------

const nextAccept = async () => ({ kind: 'accept' })
const VLM_CARD = {
  id: 'c1', name: 'T', provider: 'custom', protocol: 'openai-completions',
  endpoint: 'https://example.invalid/v1', apiKey: 'sk-x', model: 'vlm', enabled: true
}
const readImageResult = (code) => ({
  isError: true,
  error: { message: 'x', ...(code ? { info: { name: 'ImageInputError', code } } : {}) },
  content: [{ type: 'text', text: 'Error: cannot read "a.ts": ...' }]
})

test('post-execute: IMAGE_UNSUPPORTED_MODEL → 强烈提示改用 analyze_image', async () => {
  writeCfg(BASE_CFG({ apis: [VLM_CARD] }))
  const ctx = makeFakeCtx()
  apply(ctx)
  await primePreStep(ctx)
  const fn = ctx.listeners.get('tools/post-execute')
  assert.equal(typeof fn, 'function')
  const decision = await fn({ name: 'read_image', arguments: { file_path: 'a.png' }, agent: { session: { events: [] } } }, readImageResult('IMAGE_UNSUPPORTED_MODEL'), nextAccept)
  assert.equal(decision.kind, 'accept')
  assert.equal(decision.content.length, 2, '原生报错保留 + 追加一句')
  assert.ok(String(decision.content[0].text).includes('cannot read'), '原生报错必须保留在前')
  const hint = String(decision.content[1].text)
  assert.ok(hint.includes('没有视觉能力'))
  assert.ok(hint.includes('analyze_image'))
})

test('post-execute: 路径/格式/过大等错误原样返回，不追加任何文案', async () => {
  writeCfg(BASE_CFG({ apis: [VLM_CARD] }))
  const ctx = makeFakeCtx()
  apply(ctx)
  await primePreStep(ctx)
  const fn = ctx.listeners.get('tools/post-execute')
  for (const code of ['IMAGE_UNSUPPORTED_FORMAT', 'IMAGE_INVALID', 'IMAGE_TOO_LARGE', 'IMAGE_DIMENSION_TOO_LARGE', undefined]) {
    const decision = await fn({ name: 'read_image', arguments: { file_path: 'a.ts' }, agent: {} }, readImageResult(code), nextAccept)
    assert.equal(decision.kind, 'accept')
    assert.equal(decision.content, undefined, code + ' 不得追加内容')
  }
  const ok = await fn({ name: 'read_image', arguments: {}, agent: {} }, { isError: false, content: [] }, nextAccept)
  assert.equal(ok.content, undefined, '成功结果不追加')
  const other = await fn({ name: 'read', arguments: {}, agent: {} }, readImageResult('IMAGE_UNSUPPORTED_MODEL'), nextAccept)
  assert.equal(other.content, undefined, '非 read_image 不追加')
})

test('post-execute: VLM 未配置时不追加（analyze_image 也没注册）', async () => {
  writeCfg(BASE_CFG({ apis: [], fallbackConfig: { provider: 'ovhcloud', models: [], timeoutMs: 1000, enabled: false } }))
  const ctx = makeFakeCtx()
  apply(ctx)
  const fn = ctx.listeners.get('tools/post-execute')
  const decision = await fn({ name: 'read_image', arguments: {}, agent: {} }, readImageResult('IMAGE_UNSUPPORTED_MODEL'), nextAccept)
  assert.equal(decision.content, undefined)
})

// ---------- v2.19: native vision hint follows capability, not the gate ----------

test('gate 关闭 + 视觉模型 → 图片 marker 仍优先自身视觉', async () => {
  _setLastSource('custom', 'vlm')
  writeCfg(BASE_CFG({
    apis: [{
      id: 'c1', name: 'T', provider: 'custom', protocol: 'openai-completions',
      endpoint: 'https://example.invalid/v1', apiKey: 'sk-x', model: 'vlm', enabled: true
    }],
    globalConfig: { dynamicMultimodalAdapt: true, nativeVisionGate: false }
  }))
  const ctx = makeFakeCtx()
  apply(ctx)
  await primePreStep(ctx)
  await syncToolRegistration()
  const text = String(toolImageMarker({ attachment: { attachmentId: 'sha256:abc', name: 'a.png' } }).text)
  assert.ok(text.includes('优先用当前模型自身视觉能力'), text)
  assert.ok(text.includes('只有确实看不到图片内容时才调用 analyze_image'), 'gate 关闭不应把视觉模型推给 analyze_image')
  _resetLastSource()
})
