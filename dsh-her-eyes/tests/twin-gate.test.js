// twin-gate.test.js — v1.8: gate wiring + adapters-updated + agent/request tracking + /vlm/config twinVisible
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dshHome = mkdtempSync(join(tmpdir(), 'her-eyes-gate-'))
process.env.DSH_HOME = dshHome

const { apply, syncTwins, _resetLastSource } = await import('../lib/index.js')

function makeFakeCtx(providers) {
  const registrations = new Map()
  const listeners = new Map()
  const routes = []
  return {
    registrations,
    listeners,
    routes,
    get: (name) => {
      if (name === 'webServer') {
        return {
          register: (route) => {
            routes.push(route)
            return () => {}
          }
        }
      }
      return undefined
    },
    tools: { register: () => () => {} },
    llm: {
      listProviders: () => providers.map((id) => ({ id, name: id })),
      registerAdapter: (r, adapter) => {
        registrations.set(r[0], adapter)
        return () => registrations.delete(r[0])
      },
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

const waitFor = async (fn, timeout = 3000) => {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (fn()) return
    await new Promise((r) => setTimeout(r, 10))
  }
  throw new Error('waitFor timeout')
}

const resetTwins = () => { _resetLastSource(); return syncTwins(makeFakeCtx([]), {}, false) }

const validConfig = (port) => JSON.stringify({
  vlmEnabled: true,
  apis: [{ id: 'c_1', name: 'Test', provider: 'custom', protocol: 'openai-completions', endpoint: 'http://127.0.0.1:' + port + '/v1', apiKey: 'sk-test', model: 'm' }]
})

test('gate off (shouldVlm=false) registers nothing', async () => {
  await resetTwins()
  const ctx = makeFakeCtx(['alpha'])
  await syncTwins(ctx, {}, false)
  assert.equal(ctx.registrations.size, 0)
})

test('gate on (shouldVlm=true) registers the auto-vision twin', async () => {
  await resetTwins()
  const ctx = makeFakeCtx(['alpha'])
  await syncTwins(ctx, {}, true)
  assert.deepEqual([...ctx.registrations.keys()], ['auto-vision'])
})

test('adapters-updated handler reconciles twin from stored config', async () => {
  await resetTwins()
  writeFileSync(join(dshHome, 'vlm-vision.json'), validConfig(9))
  const ctx = makeFakeCtx(['alpha'])
  apply(ctx)
  // apply's own initial sync registers the twin
  await waitFor(() => ctx.registrations.has('auto-vision'))
  // manual dispose — only the handler can bring it back
  await syncTwins(ctx, {}, false)
  assert.equal(ctx.registrations.size, 0)
  const handler = ctx.listeners.get('llm/adapters-updated')
  assert.equal(typeof handler, 'function')
  handler()
  await waitFor(() => ctx.registrations.has('auto-vision'))
  assert.deepEqual([...ctx.registrations.keys()], ['auto-vision'])
})

test('/vlm/config GET reports twinVisible with the gate', async () => {
  await resetTwins()
  writeFileSync(join(dshHome, 'vlm-vision.json'), validConfig(9))
  const ctx = makeFakeCtx(['alpha'])
  apply(ctx)
  const route = ctx.routes.find((r) => r.path === '/vlm/config')
  assert.ok(route, 'apply registers the /vlm/config route')
  let payload = null
  const res = {
    writeHead: () => {},
    end: (body) => { payload = JSON.parse(body) }
  }
  await route.handler({ method: 'GET' }, res)
  assert.equal(payload.ok, true)
  assert.equal(payload.twinVisible, true)
  assert.equal(payload.visible, true)
})

test('/vlm/config GET reports twinVisible=false when VLM disabled', async () => {
  await resetTwins()
  writeFileSync(join(dshHome, 'vlm-vision.json'), JSON.stringify({
    vlmEnabled: false,
    apis: [{ id: 'c_1', name: 'Test', provider: 'custom', protocol: 'openai-completions', endpoint: 'http://127.0.0.1:9/v1', apiKey: 'sk-test', model: 'm' }]
  }))
  const ctx = makeFakeCtx(['alpha'])
  apply(ctx)
  const route = ctx.routes.find((r) => r.path === '/vlm/config')
  assert.ok(route, 'apply registers the /vlm/config route')
  let payload = null
  const res = {
    writeHead: () => {},
    end: (body) => { payload = JSON.parse(body) }
  }
  await route.handler({ method: 'GET' }, res)
  assert.equal(payload.twinVisible, false)
  assert.equal(payload.visible, false)
})

test('v1.8: agent/request tracks lastSourceProvider; twin route stays auto-vision (no re-register)', async () => {
  await resetTwins()
  writeFileSync(join(dshHome, 'vlm-vision.json'), validConfig(9))
  const ctx = makeFakeCtx(['alpha', 'beta'])
  apply(ctx)
  // apply's initial sync registers the default twin (alpha = first provider)
  await waitFor(() => ctx.registrations.has('auto-vision'))
  assert.deepEqual([...ctx.registrations.keys()], ['auto-vision'])
  // simulate an agent/request that used provider 'beta'
  const handler = ctx.listeners.get('agent/request')
  assert.equal(typeof handler, 'function', 'apply registered an agent/request handler')
  const nextBeta = async () => ({ provider: 'beta', model: 'm-beta' })
  const returned = await handler({}, nextBeta)
  // waterfall contract: handler MUST return the config (not undefined)
  assert.equal(returned && returned.provider, 'beta')
  // v1.8: the twin route is FIXED 'auto-vision' — it does NOT switch to
  // 'beta-her-eyes'. The stream reads lastSourceProvider at call time.
  // Give the fire-and-forget sync a moment, then assert no new route appeared.
  await new Promise((r) => setTimeout(r, 100))
  assert.ok(ctx.registrations.has('auto-vision'), 'twin route stays auto-vision')
  assert.equal(ctx.registrations.size, 1, 'no second twin registered (fixed route)')
  assert.deepEqual([...ctx.registrations.keys()], ['auto-vision'])
  // a twin-route request must NOT overwrite lastSource (recursion guard)
  const nextTwin = async () => ({ provider: 'auto-vision', model: 'auto-vision' })
  await handler({}, nextTwin)
  await new Promise((r) => setTimeout(r, 100))
  assert.ok(ctx.registrations.has('auto-vision'))
  assert.equal(ctx.registrations.size, 1, 'still one twin after twin-route request')
})
