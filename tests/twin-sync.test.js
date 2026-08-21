// twin-sync.test.js — v1.8: syncTwins reconciles ONE twin (route 'auto-vision')
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Isolate config reads from the real user home (configDir caches per process).
const dshHome = mkdtempSync(join(tmpdir(), 'omni-workstation-tmp-'))
process.env.DSH_HOME = mkdtempSync(join(tmpdir(), 'omni-workstation-sync-'))
process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR = dshHome

const { syncTwins, makeTwinAdapter, _resetLastSource } = await import('../lib/index.js')

function makeFakeCtx(providers) {
  const registrations = new Map() // route -> adapter
  const disposed = []
  const effects = []
  return {
    registrations,
    disposed,
    effects,
    llm: {
      listProviders: () => providers.map((id) => ({ id, name: id })),
      registerAdapter: (routes, adapter) => {
        const route = routes[0]
        assert.equal(registrations.has(route), false, 'duplicate registration of ' + route)
        registrations.set(route, adapter)
        return () => {
          registrations.delete(route)
          disposed.push(route)
        }
      },
      registration: () => {
        throw new Error('no source adapter in unit test')
      },
      stream: async function* () {},
      on: () => {},
      effect: () => {}
    },
    logger: { warn: () => {} },
    on: () => {},
    effect: (fn) => {
      effects.push(fn)
      fn()
    }
  }
}

// twinHandles + lastSourceProvider are module-level; reset both between cases.
const resetTwins = () => { _resetLastSource(); return syncTwins(makeFakeCtx([]), {}, false) }

test('v1.8: syncTwins registers ONE twin (route auto-vision) for the default first source provider', async () => {
  await resetTwins()
  const ctx = makeFakeCtx(['alpha', 'beta'])
  await syncTwins(ctx, {}, true)
  // v1.7 registered both alpha-omni-workstation AND beta-omni-workstation; v1.8 registers ONE 'auto-vision'.
  assert.deepEqual([...ctx.registrations.keys()], ['auto-vision'])
})

test('syncTwins disposes all twins when shouldVlm=false', async () => {
  await resetTwins()
  const ctx = makeFakeCtx(['alpha'])
  await syncTwins(ctx, {}, true)
  await syncTwins(ctx, {}, false)
  assert.equal(ctx.registrations.size, 0)
  assert.deepEqual(ctx.disposed, ['auto-vision'])
})

test('syncTwins is idempotent on re-entry (no duplicate registration)', async () => {
  await resetTwins()
  const ctx = makeFakeCtx(['alpha'])
  await syncTwins(ctx, {}, true)
  await syncTwins(ctx, {}, true)
  assert.deepEqual([...ctx.registrations.keys()], ['auto-vision'])
  assert.equal(ctx.disposed.length, 0)
})

test('syncTwins excludes -omni-workstation and -vision routes from the default pick', async () => {
  await resetTwins()
  const ctx = makeFakeCtx(['gamma', 'gamma-vision', 'gamma-omni-workstation'])
  await syncTwins(ctx, {}, true)
  // default = first non-twin provider = 'gamma'; twin route is 'auto-vision'.
  assert.deepEqual([...ctx.registrations.keys()], ['auto-vision'])
})

test('syncTwins registers NO twin when no source provider exists', async () => {
  await resetTwins()
  const ctx = makeFakeCtx([])
  await syncTwins(ctx, {}, true)
  assert.equal(ctx.registrations.size, 0)
})

test('syncTwins keeps the single auto-vision twin when providers shrink', async () => {
  await resetTwins()
  const ctx = makeFakeCtx(['alpha', 'beta'])
  await syncTwins(ctx, {}, true)
  assert.deepEqual([...ctx.registrations.keys()], ['auto-vision'])
  // 'alpha' disappears; the twin route 'auto-vision' is fixed — no re-registration,
  // the stream reads lastSourceProvider at call time.
  ctx.llm.listProviders = () => [{ id: 'beta', name: 'beta' }]
  await syncTwins(ctx, {}, true)
  assert.deepEqual([...ctx.registrations.keys()], ['auto-vision'])
  assert.equal(ctx.disposed.length, 0, 'twin not disposed on provider shrink (fixed route)')
})

// ---- makeTwinAdapter contract (v1.8: fixed route 'auto-vision', 1 model) ----

test('twin adapter contract: providerInfo/listModels/resolveModel (v1.8 1-model)', async () => {
  await resetTwins()
  const ctx = makeFakeCtx(['alpha'])
  const source = {
    providerInfo: () => ({ id: 'alpha', name: 'Alpha' }),
    listModels: async () => [
      { id: 'm1', provider: 'alpha', name: 'Model 1' },
      { id: 'm2', provider: 'alpha', name: 'Model 2' }
    ],
    resolveModel: async (p, m) => ({ id: m, provider: p, name: 'Model ' + m, inputModalities: ['text'] })
  }
  ctx.llm.registration = () => ({ adapter: source })
  const adapter = makeTwinAdapter(ctx, 'alpha')
  const info = adapter.providerInfo()
  assert.equal(info.id, 'auto-vision')
  assert.ok(info.name.includes('Auto Vision'))
  // v1.8: listModels returns EXACTLY 1 model (not the source catalog mirror).
  const models = await adapter.listModels()
  assert.equal(models.length, 1)
  assert.equal(models[0].id, 'auto-vision')
  assert.equal(models[0].provider, 'auto-vision')
  assert.deepEqual(models[0].inputModalities, ['text', 'image'])
  // v1.8: resolveModel always returns the single twin model (id must match).
  const resolved = await adapter.resolveModel('auto-vision', 'auto-vision')
  assert.equal(resolved.id, 'auto-vision')
  assert.equal(resolved.provider, 'auto-vision')
  assert.deepEqual(resolved.inputModalities, ['text', 'image'])
})

test('twin adapter falls back to provider name when source providerInfo missing', async () => {
  await resetTwins()
  const ctx = makeFakeCtx(['alpha'])
  ctx.llm.registration = () => ({ adapter: {} })
  const adapter = makeTwinAdapter(ctx, 'alpha')
  assert.equal(adapter.providerInfo().id, 'auto-vision')
  // v1.9: auto-vision name is generic 'Auto Vision' (no provider/model suffix)
  assert.equal(adapter.providerInfo().name, 'Auto Vision')
  // v1.8: listModels always returns 1 model (does NOT call source listModels).
  const models = await adapter.listModels()
  assert.equal(models.length, 1)
  assert.equal(models[0].id, 'auto-vision')
})
