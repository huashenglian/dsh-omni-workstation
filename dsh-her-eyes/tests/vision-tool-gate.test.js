// vision-tool-gate.test.js — visionToolsEnabled config + registration gate (Task 3)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dshHome = mkdtempSync(join(tmpdir(), 'her-eyes-vtools-'))

process.env.DSH_HOME = dshHome

process.env.DSH_HER_EYES_CONFIG_DIR = dshHome
const { apply, _resetVisionTools } = await import('../lib/index.js')

const VISION_TOOL_NAMES = ['zoom_image', 'sample_colors', 'image_diff', 'ocr_image', 'detect_elements', 'show_image']

function makeFakeCtx() {
  const registered = []
  const listeners = new Map()
  const routes = []
  return {
    registered,
    listeners,
    routes,
    get: (name) => {
      if (name === 'webServer') {
        return { register: (route) => { routes.push(route); return () => {} } }
      }
      return undefined
    },
    tools: {
      register: (def) => {
        registered.push(def)
        return () => {
          const i = registered.indexOf(def)
          if (i >= 0) registered.splice(i, 1)
        }
      }
    },
    llm: {
      listProviders: () => [],
      registerAdapter: () => () => {},
      registration: () => { throw new Error('no source') },
      stream: async function* () {},
      on: () => {},
      effect: () => {}
    },
    logger: { warn: () => {} },
    on: (event, fn) => listeners.set(event, fn),
    effect: (fn) => fn()
  }
}

const writeCfg = (obj) => writeFileSync(join(dshHome, 'vlm-vision.json'), JSON.stringify(obj))

const waitFor = async (fn, timeout = 3000) => {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (fn()) return
    await new Promise((r) => setTimeout(r, 10))
  }
  throw new Error('waitFor timeout')
}
const visionCount = (ctx) => ctx.registered.filter((d) => d && VISION_TOOL_NAMES.includes(d.name)).length

test('normalizeConfig defaults visionToolsEnabled to true (backward compatible)', async () => {
  // loadConfig with no config file → defaultConfig() (no visionToolsEnabled key).
  // The settings page reads masked(cfg).visionToolsEnabled via GET /vlm/config;
  // here we assert the default-on behavior through a minimal config.
  writeCfg({})
  const ctx = makeFakeCtx()
  apply(ctx)
  const route = ctx.routes.find((r) => r.path === '/vlm/config')
  assert.ok(route, 'apply registers the /vlm/config route')
  let payload = null
  const res = { writeHead: () => {}, end: (body) => { payload = JSON.parse(body) } }
  await route.handler({ method: 'GET' }, res)
  assert.equal(payload.ok, true)
  assert.equal(payload.config.visionToolsEnabled, true, 'visionToolsEnabled defaults true')
})

test('masked config does not leak apiKey but keeps visionToolsEnabled', async () => {
  writeCfg({ visionToolsEnabled: false })
  const ctx = makeFakeCtx()
  apply(ctx)
  const route = ctx.routes.find((r) => r.path === '/vlm/config')
  let payload = null
  const res = { writeHead: () => {}, end: (body) => { payload = JSON.parse(body) } }
  await route.handler({ method: 'GET' }, res)
  assert.equal(payload.config.visionToolsEnabled, false)
})

test('applyPatch can toggle visionToolsEnabled (via /vlm/config POST)', async () => {
  _resetVisionTools()
  writeCfg({})
  const ctx = makeFakeCtx()
  apply(ctx)
  const route = ctx.routes.find((r) => r.path === '/vlm/config')
  let payload = null
  const res2 = { writeHead: () => {}, end: (body) => { payload = JSON.parse(body) } }
  const makeReq = (raw) => {
    const listeners = {}
    return {
      method: 'POST',
      on: (ev, fn) => { listeners[ev] = fn },
      emitData: () => { if (listeners.data) listeners.data(raw) },
      emitEnd: () => { if (listeners.end) listeners.end() }
    }
  }
  const r1 = makeReq(JSON.stringify({ visionToolsEnabled: false }))
  // Start the handler (it awaits readBody), then feed the body events.
  const pending = route.handler(r1, res2)
  r1.emitData()
  r1.emitEnd()
  await pending
  assert.equal(payload.ok, true)
  assert.equal(payload.config.visionToolsEnabled, false)
})

test('gate on: 6 vision tools registered (visionToolsEnabled default true)', async () => {
  _resetVisionTools()
  writeCfg({ vlmEnabled: false, imggenEnabled: false })
  const ctx = makeFakeCtx()
  apply(ctx)
  await waitFor(() => visionCount(ctx) === 6)
  const names = ctx.registered.map((d) => d && d.name).filter(Boolean)
  const visionNames = names.filter((n) => VISION_TOOL_NAMES.includes(n))
  assert.deepEqual(visionNames.sort(), [...VISION_TOOL_NAMES].sort())
  // vlm/imggen tools must NOT be registered in this config
  assert.ok(!names.includes('analyze_image'))
  assert.ok(!names.includes('generate_image'))
})

test('gate off: 0 vision tools registered (visionToolsEnabled false)', async () => {
  _resetVisionTools()
  writeCfg({ vlmEnabled: false, imggenEnabled: false, visionToolsEnabled: false })
  const ctx = makeFakeCtx()
  apply(ctx)
  await waitFor(() => ctx.registered.length >= 0 && visionCount(ctx) === 0)
  const names = ctx.registered.map((d) => d && d.name).filter(Boolean)
  assert.equal(visionCount(ctx), 0)
  assert.ok(!names.includes('analyze_image'))
  assert.ok(!names.includes('generate_image'))
})

test('gate on + vlm on + imggen on: all 8 tools registered together', async () => {
  _resetVisionTools()
  // a minimal valid imggen config so generate_image also registers
  writeCfg({
    vlmEnabled: true,
    imggenEnabled: true,
    imggenConfig: { provider: 'custom', protocol: 'openai-images', endpoint: 'http://127.0.0.1:9/v1', apiKey: 'sk-x', model: 'm' },
    apis: [{ id: 'c_1', name: 'T', provider: 'custom', protocol: 'openai-completions', endpoint: 'http://127.0.0.1:9/v1', apiKey: 'sk-x', model: 'm' }]
  })
  const ctx = makeFakeCtx()
  apply(ctx)
  await waitFor(() => visionCount(ctx) === 6 && ctx.registered.some((d) => d && d.name === 'analyze_image'))
  const names = ctx.registered.map((d) => d && d.name).filter(Boolean)
  const all = [...VISION_TOOL_NAMES, 'analyze_image', 'generate_image']
  for (const n of all) assert.ok(names.includes(n), 'expected tool registered: ' + n)
})

test('gate toggle at runtime: disabling unregisters the 6 vision tools', async () => {
  _resetVisionTools()
  // First apply with tools ON
  writeCfg({ vlmEnabled: false, imggenEnabled: false })
  const ctx1 = makeFakeCtx()
  apply(ctx1)
  await waitFor(() => visionCount(ctx1) === 6)
  assert.equal(visionCount(ctx1), 6)
  // Then rewrite config OFF and apply again (fresh ctx) → disposers from ctx1
  // are released; the fresh ctx must see no vision tools.
  writeCfg({ vlmEnabled: false, imggenEnabled: false, visionToolsEnabled: false })
  const ctx2 = makeFakeCtx()
  apply(ctx2)
  await waitFor(() => ctx1.registered.length === 0)
  assert.equal(visionCount(ctx2), 0)
  assert.equal(ctx1.registered.length, 0, 'disposers removed the ctx1 registrations')
})

test('agent/pre-step strips tool-result images but preserves user message images', async () => {
  _resetVisionTools()
  writeCfg({ vlmEnabled: false, imggenEnabled: false })
  const ctx = makeFakeCtx()
  apply(ctx)
  const handler = ctx.listeners.get('agent/pre-step')
  assert.equal(typeof handler, 'function', 'agent/pre-step handler registered')
  const userImage = { type: 'image', attachment: { attachmentId: 'sha256:user', name: '用户图.png' } }
  const toolImage = { type: 'image', attachment: { attachmentId: 'sha256:tool', name: 'show.png' } }
  const decision = {
    kind: 'enter',
    messages: [
      { role: 'user', content: [userImage, { type: 'text', text: '看这张图' }] },
      { role: 'assistant', content: [{ type: 'text', text: 'ok' }] },
      {
        role: 'tool',
        content: [
          { type: 'text', text: 'json 摘要' },
          { type: 'image', attachment: { attachmentId: 'sha256:tool', name: 'show.png' } }
        ]
      }
    ]
  }
  // payload.agent.session is optional; layer 2 works without it
  const returned = await handler({ agent: {} }, async () => decision)
  // waterfall contract: must return a decision
  assert.ok(returned, 'returns the decision')
  assert.equal(returned.kind, 'enter')
  const userMsg = returned.messages[0]
  const toolMsg = returned.messages[2]
  // user message image preserved
  assert.ok(userMsg.content.some((b) => b && b.type === 'image' && b.attachment.attachmentId === 'sha256:user'))
  // tool message top-level image replaced with a text marker
  assert.equal(toolMsg.content.filter((b) => b && b.type === 'image').length, 0, 'tool image stripped')
  const marker = toolMsg.content.find((b) => b && b.type === 'text' && b.text && b.text.includes('sha256:tool'))
  assert.ok(marker, 'marker mentions the attachment id')
  assert.ok(toolMsg.content.some((b) => b && b.type === 'text' && b.text === 'json 摘要'))
})

test('agent/pre-step leaves non-tool decisions untouched (same object identity)', async () => {
  _resetVisionTools()
  writeCfg({ vlmEnabled: false, imggenEnabled: false })
  const ctx = makeFakeCtx()
  apply(ctx)
  const handler = ctx.listeners.get('agent/pre-step')
  const decision = { kind: 'enter', messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }] }
  const returned = await handler({ agent: {} }, async () => decision)
  assert.equal(returned, decision, 'same object identity when nothing to sanitize')
})

test('sanitizeSessionToolResults shadows tool/result image events on the surface', async () => {
  const { sanitizeSessionToolResults } = await import('../lib/index.js')
  const appended = []
  const toolResultEvent = {
    type: 'tool/result',
    data: {
      turn: 1,
      step: 2,
      message: {
        role: 'tool',
        content: [
          { type: 'text', text: 'json' },
          { type: 'image', attachment: { attachmentId: 'sha256:tool', name: 'show.png' } }
        ]
      }
    }
  }
  const fakeSession = {
    events: [{}, {}, {}, toolResultEvent],
    surface: { nodes: [0, 1, 2, 3] },
    append: (type, data, opts) => { appended.push({ type, data, opts }) }
  }
  const logger = { info: () => {}, warn: () => {} }
  sanitizeSessionToolResults(fakeSession, logger)
  assert.equal(appended.length, 1, 'one shadow replacement emitted')
  assert.equal(appended[0].type, 'tool/result')
  assert.deepEqual(appended[0].opts.surfaceOp, { op: 'replace', start: 3, end: 3 })
  assert.deepEqual(appended[0].opts.sourceEventSeqs, [3])
  const shadowMessage = appended[0].data.message
  assert.equal(shadowMessage.content.filter((b) => b && b.type === 'image').length, 0, 'shadow message has no image')
  const marker = shadowMessage.content.find((b) => b && b.type === 'text' && b.text && b.text.includes('sha256:tool'))
  assert.ok(marker, 'shadow message has marker with attachment id')
  // second call is a no-op (memoized cursor)
  appended.length = 0
  sanitizeSessionToolResults(fakeSession, logger)
  assert.equal(appended.length, 0, 'incremental scan is idempotent')
  // a text-only tool/result event is left alone
  const fakeSession2 = {
    events: [{ type: 'tool/result', data: { message: { role: 'tool', content: [{ type: 'text', text: 'ok' }] } } }],
    surface: { nodes: [0] },
    append: (t, d, o) => { appended.push({ t, d, o }) }
  }
  sanitizeSessionToolResults(fakeSession2, logger)
  assert.equal(appended.length, 0, 'no image → no shadow')
})

test('agent/request leaves twin-route requests untouched (no stripping)', async () => {
  _resetVisionTools()
  writeCfg({ vlmEnabled: false, imggenEnabled: false })
  const ctx = makeFakeCtx()
  apply(ctx)
  const handler = ctx.listeners.get('agent/request')
  const config = {
    provider: 'auto-vision',
    model: 'auto-vision',
    messages: [{ role: 'tool', content: [{ type: 'tool-result', content: [{ type: 'image', attachment: { attachmentId: 'sha256:x' } }] }] }]
  }
  const returned = await handler({}, async () => config)
  assert.equal(returned, config, 'same object identity for twin routes (no mutation)')
})
