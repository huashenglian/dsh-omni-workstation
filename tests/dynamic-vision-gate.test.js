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

const { apply, nativeVisionDenyReason, _setLastSource, _resetLastSource, _setLastSourceAcceptsImages } = await import('../lib/index.js')

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

// ---------- v2.17: read_image failure → analyze_image fallback hint ----------

const nextAccept = async () => ({ kind: 'accept' })

test('post-execute: read_image 失败 + VLM 有效 → 追加 analyze_image 兜底提示', async () => {
  _resetLastSource()
  writeCfg(BASE_CFG({ fallbackConfig: { provider: 'ovhcloud', models: ['Qwen2.5-VL-72B-Instruct'], timeoutMs: 1000 } }))
  const ctx = makeFakeCtx()
  apply(ctx)
  await primePreStep(ctx)
  const fn = ctx.listeners.get('tools/post-execute')
  assert.equal(typeof fn, 'function', 'tools/post-execute listener must be registered')

  const result = { isError: true, content: [{ type: 'text', text: 'cannot read "a.png": not an image' }] }
  const decision = await fn({ name: 'read_image', arguments: { file_path: 'a.png' }, agent: { session: { events: [] } } }, result, nextAccept)
  assert.equal(decision.kind, 'accept')
  assert.equal(decision.content.length, 2)
  assert.ok(String(decision.content[0].text).includes('not an image'), '原错误内容保留在前')
  assert.ok(String(decision.content[1].text).includes('analyze_image'), '应提示改用 analyze_image')
})

test('post-execute: 其他工具失败 / 成功结果 一律不动', async () => {
  const ctx = makeFakeCtx()
  apply(ctx)
  const fn = ctx.listeners.get('tools/post-execute')
  const other = await fn({ name: 'read', arguments: {}, agent: {} }, { isError: true, content: [] }, nextAccept)
  assert.equal(other.kind, 'accept')
  assert.equal(other.content, undefined, '非 read_image 不追加内容')

  const ok = await fn({ name: 'read_image', arguments: {}, agent: {} }, { isError: false, content: [] }, nextAccept)
  assert.equal(ok.content, undefined, '成功结果不追加内容')
})

test('post-execute: VLM 无效（无卡片且兜底关闭）→ 不追加提示', async () => {
  writeCfg(BASE_CFG({ fallbackConfig: { provider: 'ovhcloud', models: ['m'], timeoutMs: 1000, enabled: false } }))
  const ctx = makeFakeCtx()
  apply(ctx)
  await primePreStep(ctx)
  const fn = ctx.listeners.get('tools/post-execute')
  const decision = await fn({ name: 'read_image', arguments: {}, agent: {} }, { isError: true, content: [{ type: 'text', text: 'x' }] }, nextAccept)
  assert.equal(decision.content, undefined)
})
