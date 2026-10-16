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

// ---------- pure: nativeVisionDenyReason ----------

test('nativeVisionDenyReason: adapt off → no denial', () => {
  assert.equal(nativeVisionDenyReason(false, true, 'analyze_image', {}), '')
})

test('nativeVisionDenyReason: text-only model → no denial', () => {
  assert.equal(nativeVisionDenyReason(true, false, 'analyze_image', {}), '')
})

test('nativeVisionDenyReason: other tools unaffected', () => {
  assert.equal(nativeVisionDenyReason(true, true, 'analyze_media', {}), '')
  assert.equal(nativeVisionDenyReason(true, true, 'zoom_image', {}), '')
  assert.equal(nativeVisionDenyReason(true, true, 'transcribe', {}), '')
})

test('nativeVisionDenyReason: adapt on + vision model + analyze_image → denied with escape hint', () => {
  const r = nativeVisionDenyReason(true, true, 'analyze_image', { image_path: 'a.png' })
  assert.ok(r.length > 0, 'must deny')
  assert.ok(r.includes('native_vision_failed'), 'deny reason must name the escape hatch')
  assert.ok(r.includes('read_image'), 'deny reason must point at native vision')
})

test('nativeVisionDenyReason: native_vision_failed:true → allowed (escape hatch)', () => {
  assert.equal(nativeVisionDenyReason(true, true, 'analyze_image', { native_vision_failed: true }), '')
})

test('nativeVisionDenyReason: native_vision_failed falsy/missing → still denied', () => {
  assert.ok(nativeVisionDenyReason(true, true, 'analyze_image', { native_vision_failed: false }).length > 0)
  assert.ok(nativeVisionDenyReason(true, true, 'analyze_image', null).length > 0)
})

// ---------- listener: tools/pre-execute deny / allow ----------

test('listener: adapt on + vision model → analyze_image denied; flag call allowed', async () => {
  _resetLastSource()
  writeCfg(BASE_CFG()) // dynamicMultimodalAdapt defaults on
  const ctx = makeFakeCtx()
  apply(ctx)
  _setLastSource('proxyz', 'vision-x')
  await primePreStep(ctx) // sets lastDynamicAdapt=true + lastSourceAcceptsImages=true
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

test('listener: adapt off → analyze_image allowed even on a vision model', async () => {
  _resetLastSource()
  writeCfg(BASE_CFG({ globalConfig: { dynamicMultimodalAdapt: false, retryStatusCodes: '429', backoffBase: 1, backoff429Base: 1, backoffMax: 1, backoff429Max: 1 } }))
  const ctx = makeFakeCtx()
  apply(ctx)
  _setLastSource('proxyz', 'vision-x')
  await primePreStep(ctx) // sets lastDynamicAdapt=false
  const fn = ctx.listeners.get('tools/pre-execute')
  const r = await fn({ name: 'analyze_image', arguments: { image_path: 'a.png' }, agent: { session: { events: [] } } }, nextOk)
  assert.equal(r.kind, 'proceed', 'adapt off → legacy behavior (no gate)')
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
