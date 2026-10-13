// media-display-size.test.js — T5: client-side image/video preview max-height
// settings (globalConfig.showImageMaxHeight / showVideoMaxHeight), clamped 64-2000.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

process.env.DSH_HOME = mkdtempSync(join(tmpdir(), 'omni-workstation-home-'))
process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR = mkdtempSync(join(tmpdir(), 'omni-workstation-cfg-'))

const { applyPatch, masked, normalizeConfig } = await import('../lib/index.js')

const baseCfg = () => ({
  vlmEnabled: true,
  apis: [
    { id: 'c_a', name: 'A', provider: 'custom', protocol: 'openai-completions', endpoint: 'https://a/v1', apiKey: 'sk-a', model: 'm-a' }
  ]
})

// ---- (a) defaults ----

test('normalizeConfig default showImageMaxHeight=180 / showVideoMaxHeight=360', () => {
  const out = normalizeConfig({})
  assert.equal(out.globalConfig.showImageMaxHeight, 180)
  assert.equal(out.globalConfig.showVideoMaxHeight, 360)
})

test('a config with no globalConfig gets both defaults via applyPatch', () => {
  const out = applyPatch(baseCfg(), { globalConfig: { field: 'showImageMaxHeight', value: 500 } })
  assert.equal(out.globalConfig.showImageMaxHeight, 500)
  assert.equal(out.globalConfig.showVideoMaxHeight, 360, 'untouched sibling keeps its default')
})

// ---- (b) PATCH persists ----

test('globalConfig PATCH persists a new image max-height', () => {
  const out = applyPatch(baseCfg(), { globalConfig: { field: 'showImageMaxHeight', value: 420 } })
  assert.equal(out.globalConfig.showImageMaxHeight, 420)
})

test('globalConfig PATCH persists a new video max-height', () => {
  const out = applyPatch(baseCfg(), { globalConfig: { field: 'showVideoMaxHeight', value: 720 } })
  assert.equal(out.globalConfig.showVideoMaxHeight, 720)
})

// ---- (c) out-of-range clamps ----

test('out-of-range image max-height clamps to 64 / 2000', () => {
  assert.equal(applyPatch(baseCfg(), { globalConfig: { field: 'showImageMaxHeight', value: 0 } }).globalConfig.showImageMaxHeight, 64)
  assert.equal(applyPatch(baseCfg(), { globalConfig: { field: 'showImageMaxHeight', value: 99999 } }).globalConfig.showImageMaxHeight, 2000)
  assert.equal(applyPatch(baseCfg(), { globalConfig: { field: 'showImageMaxHeight', value: -5 } }).globalConfig.showImageMaxHeight, 64)
})

test('out-of-range video max-height clamps to 64 / 2000', () => {
  assert.equal(applyPatch(baseCfg(), { globalConfig: { field: 'showVideoMaxHeight', value: 0 } }).globalConfig.showVideoMaxHeight, 64)
  assert.equal(applyPatch(baseCfg(), { globalConfig: { field: 'showVideoMaxHeight', value: 99999 } }).globalConfig.showVideoMaxHeight, 2000)
  assert.equal(applyPatch(baseCfg(), { globalConfig: { field: 'showVideoMaxHeight', value: -1 } }).globalConfig.showVideoMaxHeight, 64)
})

test('normalizeConfig clamps an out-of-range stored value', () => {
  const out = normalizeConfig({ globalConfig: { showImageMaxHeight: 99999, showVideoMaxHeight: 1 } })
  assert.equal(out.globalConfig.showImageMaxHeight, 2000)
  assert.equal(out.globalConfig.showVideoMaxHeight, 64)
})

// ---- (d) non-numeric falls back to default ----

test('non-numeric image max-height falls back to 180', () => {
  for (const v of ['', 'abc', null]) {
    assert.equal(applyPatch(baseCfg(), { globalConfig: { field: 'showImageMaxHeight', value: v } }).globalConfig.showImageMaxHeight, 180, `value=${String(v)}`)
  }
})

test('non-numeric video max-height falls back to 360', () => {
  for (const v of ['', 'abc', null]) {
    assert.equal(applyPatch(baseCfg(), { globalConfig: { field: 'showVideoMaxHeight', value: v } }).globalConfig.showVideoMaxHeight, 360, `value=${String(v)}`)
  }
})

// ---- (e) independence ----

test('image and video max-heights are independent', () => {
  let out = applyPatch(baseCfg(), { globalConfig: { field: 'showImageMaxHeight', value: 300 } })
  out = applyPatch(out, { globalConfig: { field: 'showVideoMaxHeight', value: 800 } })
  assert.equal(out.globalConfig.showImageMaxHeight, 300)
  assert.equal(out.globalConfig.showVideoMaxHeight, 800)
  out = applyPatch(out, { globalConfig: { field: 'showImageMaxHeight', value: 120 } })
  assert.equal(out.globalConfig.showImageMaxHeight, 120)
  assert.equal(out.globalConfig.showVideoMaxHeight, 800, 'video untouched by image edit')
})

// ---- (f) masked() exposes them ----

test('masked() exposes both display heights to the client', () => {
  const out = masked(normalizeConfig(baseCfg()))
  assert.equal(out.globalConfig.showImageMaxHeight, 180)
  assert.equal(out.globalConfig.showVideoMaxHeight, 360)
})

test('masked() reflects a patched value', () => {
  const cfg = applyPatch(baseCfg(), { globalConfig: { field: 'showVideoMaxHeight', value: 540 } })
  assert.equal(masked(cfg).globalConfig.showVideoMaxHeight, 540)
})
