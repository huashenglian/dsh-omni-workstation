// mirror-config.test.js — v1.9: mirrorConfig normalize/mask/patch + syncTwins 3-mode logic
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

process.env.DSH_HOME = mkdtempSync(join(tmpdir(), 'her-eyes-mirror-'))

const {
  syncTwins, _resetLastSource,
  defaultMirrorConfig, normalizeMirrorConfig,
  mirrorRouteId, mirrorDisplayName,
  makePerProviderTwinAdapter, makeMappingTwinAdapter
} = await import('../lib/index.js')

// Fake ctx with a working registration() so syncTwins default-pick + per-provider
// twin construction can call listModels/resolveModel without throwing.
function makeFakeCtx(providers) {
  const registrations = new Map()
  const disposed = []
  return {
    registrations,
    disposed,
    llm: {
      listProviders: () => providers.map((id) => ({ id, name: id })),
      registerAdapter: (routes, adapter) => {
        const route = routes[0]
        registrations.set(route, adapter)
        return () => { registrations.delete(route); disposed.push(route) }
      },
      registration: (provider) => ({
        adapter: {
          providerInfo: () => ({ id: provider, name: provider }),
          listModels: async () => [{ id: 'model-a', name: 'Model A' }, { id: 'model-b', name: 'Model B' }],
          resolveModel: async (_p, model) => ({ id: model, provider, name: model, inputModalities: ['text'] }),
          providerRetryPolicy: () => undefined,
        }
      }),
      stream: async function* () {},
      on: () => {},
      effect: () => {}
    },
    logger: { warn: () => {} },
    on: () => {},
    effect: (fn) => fn()
  }
}

const resetTwins = () => { _resetLastSource(); return syncTwins(makeFakeCtx([]), {}, false) }

// ---- normalizeMirrorConfig ----

test('defaultMirrorConfig returns autoVisionEnabled=true (backward compat)', () => {
  const d = defaultMirrorConfig()
  assert.equal(d.autoVisionEnabled, true)
  assert.equal(d.mirrorAllEnabled, false)
  assert.deepEqual(d.mappings, [])
})

test('normalizeMirrorConfig with undefined returns defaults', () => {
  const m = normalizeMirrorConfig(undefined)
  assert.equal(m.autoVisionEnabled, true)
  assert.equal(m.mirrorAllEnabled, false)
  assert.deepEqual(m.mappings, [])
})

test('normalizeMirrorConfig with custom values', () => {
  const m = normalizeMirrorConfig({
    autoVisionEnabled: false,
    mirrorAllEnabled: true,
    mappings: [{ id: 'm1', originalProvider: 'prov', originalModel: 'model-x', mirrorName: 'custom' }]
  })
  assert.equal(m.autoVisionEnabled, false)
  assert.equal(m.mirrorAllEnabled, true)
  assert.equal(m.mappings.length, 1)
  assert.equal(m.mappings[0].originalModel, 'model-x')
  assert.equal(m.mappings[0].mirrorName, 'custom')
})

test('normalizeMirrorConfig keeps mappings with empty originalModel (user adds row before selecting)', () => {
  const m = normalizeMirrorConfig({
    mappings: [
      { id: 'ok', originalProvider: 'p', originalModel: 'm' },
      { id: 'new', originalProvider: 'p' },  // missing originalModel — kept so user can fill it in
    ]
  })
  assert.equal(m.mappings.length, 2)
  assert.equal(m.mappings[0].id, 'ok')
  assert.equal(m.mappings[1].id, 'new')
  assert.equal(m.mappings[1].originalModel, '')
})

test('normalizeMirrorConfig generates id for mappings without one', () => {
  const m = normalizeMirrorConfig({
    mappings: [{ originalProvider: 'p', originalModel: 'm' }]
  })
  assert.equal(m.mappings.length, 1)
  assert.ok(m.mappings[0].id.startsWith('c_'), 'generated id should start with c_')
})

// ---- mirrorRouteId + mirrorDisplayName ----

test('mirrorRouteId prefixes with her-eyes-m-', () => {
  assert.equal(mirrorRouteId('my-model'), 'her-eyes-m-my-model')
  assert.equal(mirrorRouteId(''), 'her-eyes-m-mirror')
})

test('mirrorDisplayName uses mirrorName when provided', () => {
  assert.equal(mirrorDisplayName({ mirrorName: 'custom', originalModel: 'orig' }), 'custom')
})

test('mirrorDisplayName defaults to <originalModel>-vision when empty', () => {
  assert.equal(mirrorDisplayName({ mirrorName: '', originalModel: 'deepseek-chat' }), 'deepseek-chat-vision')
  assert.equal(mirrorDisplayName({ mirrorName: '  ', originalModel: 'gpt4' }), 'gpt4-vision')
})

// ---- syncTwins: 3 independent modes ----

test('Mode 1: autoVisionEnabled=false → no auto-vision twin', async () => {
  await resetTwins()
  const ctx = makeFakeCtx(['alpha'])
  await syncTwins(ctx, { mirrorConfig: { autoVisionEnabled: false, mirrorAllEnabled: false, mappings: [] } }, true)
  assert.equal(ctx.registrations.size, 0)
})

test('Mode 1: autoVisionEnabled=true → auto-vision twin registered', async () => {
  await resetTwins()
  const ctx = makeFakeCtx(['alpha'])
  await syncTwins(ctx, { mirrorConfig: { autoVisionEnabled: true, mirrorAllEnabled: false, mappings: [] } }, true)
  assert.ok(ctx.registrations.has('auto-vision'))
})

test('Mode 2: mirrorAllEnabled=true → per-provider <provider>-her-eyes twins', async () => {
  await resetTwins()
  const ctx = makeFakeCtx(['alpha', 'beta'])
  await syncTwins(ctx, { mirrorConfig: { autoVisionEnabled: false, mirrorAllEnabled: true, mappings: [] } }, true)
  assert.ok(ctx.registrations.has('alpha-her-eyes'))
  assert.ok(ctx.registrations.has('beta-her-eyes'))
  assert.equal(ctx.registrations.has('auto-vision'), false)
})

test('Mode 2: excludes -her-eyes, -vision, her-eyes-m- routes from per-provider twins', async () => {
  await resetTwins()
  const ctx = makeFakeCtx(['gamma', 'gamma-her-eyes', 'gamma-vision', 'her-eyes-m-foo'])
  await syncTwins(ctx, { mirrorConfig: { autoVisionEnabled: false, mirrorAllEnabled: true, mappings: [] } }, true)
  assert.ok(ctx.registrations.has('gamma-her-eyes'))
  assert.equal(ctx.registrations.size, 1, 'only gamma-her-eyes should be registered')
})

test('Mode 3: custom mappings → her-eyes-m-* twins', async () => {
  await resetTwins()
  const ctx = makeFakeCtx(['alpha'])
  await syncTwins(ctx, {
    mirrorConfig: {
      autoVisionEnabled: false,
      mirrorAllEnabled: false,
      mappings: [{ id: 'm1', originalProvider: 'alpha', originalModel: 'model-a', mirrorName: 'my-vision' }]
    }
  }, true)
  assert.ok(ctx.registrations.has('her-eyes-m-my-vision'))
  assert.equal(ctx.registrations.has('auto-vision'), false)
})

test('Mode 3: mapping with empty originalModel is kept in config but NOT registered as twin', async () => {
  await resetTwins()
  const ctx = makeFakeCtx(['alpha'])
  await syncTwins(ctx, {
    mirrorConfig: {
      autoVisionEnabled: false,
      mirrorAllEnabled: false,
      mappings: [
        { id: 'm1', originalProvider: 'alpha', originalModel: 'model-a', mirrorName: 'ok' },
        { id: 'm2', originalProvider: '', originalModel: '', mirrorName: 'pending' }
      ]
    }
  }, true)
  // only the complete mapping gets a twin
  assert.ok(ctx.registrations.has('her-eyes-m-ok'))
  assert.equal(ctx.registrations.has('her-eyes-m-pending'), false, 'incomplete mapping should not register a twin')
})

test('Mode 3: empty mirrorName → route uses <originalModel>-vision', async () => {
  await resetTwins()
  const ctx = makeFakeCtx(['alpha'])
  await syncTwins(ctx, {
    mirrorConfig: {
      autoVisionEnabled: false,
      mirrorAllEnabled: false,
      mappings: [{ id: 'm1', originalProvider: 'alpha', originalModel: 'model-a', mirrorName: '' }]
    }
  }, true)
  assert.ok(ctx.registrations.has('her-eyes-m-model-a-vision'))
})

test('Mode 2 masks Mode 3: mirrorAllEnabled=true + mappings → only per-provider twins, no mapping twins', async () => {
  await resetTwins()
  const ctx = makeFakeCtx(['alpha'])
  await syncTwins(ctx, {
    mirrorConfig: {
      autoVisionEnabled: false,
      mirrorAllEnabled: true,
      mappings: [{ id: 'm1', originalProvider: 'alpha', originalModel: 'model-a', mirrorName: 'custom' }]
    }
  }, true)
  assert.ok(ctx.registrations.has('alpha-her-eyes'))
  assert.equal(ctx.registrations.has('her-eyes-m-custom'), false, 'mapping twin should be masked by mirrorAll')
})

test('Modes 1+2 combined: autoVisionEnabled + mirrorAllEnabled → auto-vision + per-provider twins', async () => {
  await resetTwins()
  const ctx = makeFakeCtx(['alpha', 'beta'])
  await syncTwins(ctx, {
    mirrorConfig: { autoVisionEnabled: true, mirrorAllEnabled: true, mappings: [] }
  }, true)
  assert.ok(ctx.registrations.has('auto-vision'))
  assert.ok(ctx.registrations.has('alpha-her-eyes'))
  assert.ok(ctx.registrations.has('beta-her-eyes'))
})

test('syncTwins disposes twins when config changes (mirrorAll off → per-provider twins disposed)', async () => {
  await resetTwins()
  const ctx = makeFakeCtx(['alpha'])
  await syncTwins(ctx, { mirrorConfig: { autoVisionEnabled: false, mirrorAllEnabled: true, mappings: [] } }, true)
  assert.ok(ctx.registrations.has('alpha-her-eyes'))
  await syncTwins(ctx, { mirrorConfig: { autoVisionEnabled: false, mirrorAllEnabled: false, mappings: [] } }, true)
  assert.equal(ctx.registrations.has('alpha-her-eyes'), false)
  assert.ok(ctx.disposed.includes('alpha-her-eyes'))
})

test('syncTwins disposes mapping twins when mapping removed', async () => {
  await resetTwins()
  const ctx = makeFakeCtx(['alpha'])
  const cfg1 = { mirrorConfig: { autoVisionEnabled: false, mirrorAllEnabled: false, mappings: [{ id: 'm1', originalProvider: 'alpha', originalModel: 'model-a', mirrorName: 'custom' }] } }
  await syncTwins(ctx, cfg1, true)
  assert.ok(ctx.registrations.has('her-eyes-m-custom'))
  const cfg2 = { mirrorConfig: { autoVisionEnabled: false, mirrorAllEnabled: false, mappings: [] } }
  await syncTwins(ctx, cfg2, true)
  assert.equal(ctx.registrations.has('her-eyes-m-custom'), false)
})

test('shouldVlm=false disposes all twins (mirror modes inactive)', async () => {
  await resetTwins()
  const ctx = makeFakeCtx(['alpha'])
  await syncTwins(ctx, { mirrorConfig: { autoVisionEnabled: true, mirrorAllEnabled: true, mappings: [] } }, true)
  assert.ok(ctx.registrations.size > 0)
  await syncTwins(ctx, { mirrorConfig: { autoVisionEnabled: true, mirrorAllEnabled: true, mappings: [] } }, false)
  assert.equal(ctx.registrations.size, 0)
})

test('all modes off + empty mappings + shouldVlm=true → no twins registered', async () => {
  await resetTwins()
  const ctx = makeFakeCtx(['alpha'])
  await syncTwins(ctx, { mirrorConfig: { autoVisionEnabled: false, mirrorAllEnabled: false, mappings: [] } }, true)
  assert.equal(ctx.registrations.size, 0)
})

// ---- adapter contracts ----

test('makePerProviderTwinAdapter: providerInfo/listModels/resolveModel', async () => {
  const ctx = makeFakeCtx(['alpha'])
  const adapter = makePerProviderTwinAdapter(ctx, 'alpha')
  const info = adapter.providerInfo()
  assert.equal(info.id, 'alpha-her-eyes')
  assert.ok(info.name.includes('Auto Vision'))
  const models = await adapter.listModels()
  assert.equal(models.length, 2)
  assert.deepEqual(models[0].inputModalities, ['text', 'image'])
  assert.equal(models[0].provider, 'alpha-her-eyes')
})

test('makeMappingTwinAdapter: single model with mirror name', async () => {
  const ctx = makeFakeCtx(['alpha'])
  const mapping = { id: 'm1', originalProvider: 'alpha', originalModel: 'model-a', mirrorName: 'my-vision' }
  const adapter = makeMappingTwinAdapter(ctx, mapping)
  const info = adapter.providerInfo()
  assert.ok(info.name.includes('my-vision'))
  const models = await adapter.listModels()
  assert.equal(models.length, 1)
  assert.equal(models[0].id, 'my-vision')
  assert.deepEqual(models[0].inputModalities, ['text', 'image'])
  const resolved = await adapter.resolveModel('her-eyes-m-my-vision', 'my-vision')
  assert.equal(resolved.id, 'my-vision')
  assert.deepEqual(resolved.inputModalities, ['text', 'image'])
})
