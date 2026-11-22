// fallback-toggle.test.js — v2.17 兜底模型开关
//  · fallbackHasModels 现在是「真的会被调用」：enabled=false 时即使有模型也返回 false
//  · analyze_image / ocr_image 的门禁随开关变化（无完整卡 + 关兜底 → 不注册）
//  · applyPatch / masked / normalizeConfig 三个通道都带上 enabled
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const home = mkdtempSync(join(tmpdir(), 'omni-fbtoggle-'))
process.env.DSH_HOME = home
process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR = home

const {
  apply, applyPatch, masked, normalizeConfig, loadConfig,
  fallbackHasModels, hasVlmChannel, isVlmLive, toolkitToolNames
} = await import('../lib/index.js')

const writeCfg = (obj) => writeFileSync(join(home, 'omni-vision.json'), JSON.stringify(obj))

function makeFakeCtx() {
  const registered = []
  const listeners = new Map()
  return {
    registered,
    listeners,
    get: () => undefined,
    tools: { register: (def) => { registered.push(def); return () => {} } },
    llm: { listProviders: () => [], registerAdapter: () => () => {}, stream: async function* () {}, registration: undefined },
    logger: { warn: () => {} },
    on: (event, fn) => listeners.set(event, fn),
    effect: (fn) => fn(),
    inject: () => {}
  }
}

const base = (extra) => Object.assign({
  retryCount: 1,
  apis: [],
  fallbackConfig: { provider: 'ovhcloud', models: ['Qwen2.5-VL-72B-Instruct'], timeoutMs: 1000 }
}, extra || {})

test('fallbackHasModels: enabled=false 时即使有模型也是 false', () => {
  assert.equal(fallbackHasModels({ fallbackConfig: { models: ['m'], enabled: false } }), false)
  assert.equal(fallbackHasModels({ fallbackConfig: { models: ['m'], enabled: true } }), true)
  assert.equal(fallbackHasModels({ fallbackConfig: { models: ['m'] } }), true, '缺字段 = 默认开')
  assert.equal(fallbackHasModels({ fallbackConfig: { models: [], enabled: true } }), false)
  assert.equal(fallbackHasModels({}), false)
})

test('门禁：无完整卡片时，兜底开关决定 analyze_image / ocr_image 是否注册', () => {
  const on = base()
  assert.equal(isVlmLive(on), true, '兜底有模型 → VLM live')
  assert.ok(toolkitToolNames(on).includes('ocr_image'))

  const off = base({ fallbackConfig: { provider: 'ovhcloud', models: ['Qwen2.5-VL-72B-Instruct'], timeoutMs: 1000, enabled: false } })
  assert.equal(hasVlmChannel(off), false)
  assert.equal(isVlmLive(off), false)
  assert.ok(!toolkitToolNames(off).includes('ocr_image'))
  assert.ok(toolkitToolNames(off).includes('zoom_image'), '本地工具不受影响')
})

test('注册路径：关兜底后 analyze_image 不注册，开着则注册', async () => {
  const offCtx = makeFakeCtx()
  writeCfg(base({ fallbackConfig: { provider: 'ovhcloud', models: ['m'], timeoutMs: 1000, enabled: false } }))
  apply(offCtx)
  await new Promise((r) => setTimeout(r, 60))
  assert.equal(offCtx.registered.some((d) => d.name === 'analyze_image'), false)

  const onCtx = makeFakeCtx()
  writeCfg(base())
  apply(onCtx)
  await new Promise((r) => setTimeout(r, 60))
  assert.equal(onCtx.registered.some((d) => d.name === 'analyze_image'), true)
})

test('normalizeConfig / masked 保留 enabled，缺字段默认 true', () => {
  const withOff = normalizeConfig(base({ fallbackConfig: { provider: 'ovhcloud', models: ['m'], timeoutMs: 1000, enabled: false } }))
  assert.equal(withOff.fallbackConfig.enabled, false)
  assert.equal(masked(withOff).fallbackConfig.enabled, false)

  const missing = normalizeConfig(base())
  assert.equal(missing.fallbackConfig.enabled, true)
})

test('applyPatch: enabled 开关 + reset 恢复默认', async () => {
  const ctx = makeFakeCtx()
  writeCfg(base())
  const off = applyPatch(normalizeConfig(await loadConfig(ctx)), { fallbackConfig: { field: 'enabled', value: false } })
  assert.equal(off.fallbackConfig.enabled, false)
  assert.equal(off.fallbackConfig.models.length, 1, '开关不动模型列表')

  const on = applyPatch(off, { fallbackConfig: { field: 'enabled', value: true } })
  assert.equal(on.fallbackConfig.enabled, true)

  const reset = applyPatch(on, { fallbackConfig: 'reset' })
  assert.equal(reset.fallbackConfig.enabled, true)
  assert.ok(reset.fallbackConfig.models.length > 0)
})
