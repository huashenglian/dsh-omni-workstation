// media-modality-config.test.js — T3: per-card video/audio modality switches survive
// the three persistence allow-lists (masked / patchCard / full-apis merge).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

process.env.DSH_HOME = mkdtempSync(join(tmpdir(), 'omni-workstation-home-'))
process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR = mkdtempSync(join(tmpdir(), 'omni-workstation-cfg-'))

const { applyPatch, masked, normalizeConfig } = await import('../lib/index.js')

// Minimal config that normalizeConfig accepts (apis survive with at least id).
const baseCfg = () => ({
  vlmEnabled: true,
  apis: [
    { id: 'c_a', name: 'A', provider: 'custom', protocol: 'openai-completions', endpoint: 'https://a/v1', apiKey: 'sk-a', model: 'm-a' },
    { id: 'c_b', name: 'B', provider: 'custom', protocol: 'openai-completions', endpoint: 'https://b/v1', apiKey: 'sk-b', model: 'm-b' }
  ]
})

// ---- (a) patchCard video ----

test('patchCard video=true sets video and leaves audio off', () => {
  const out = applyPatch(baseCfg(), { patchCard: { id: 'c_a', field: 'video', value: true } })
  const card = out.apis.find((x) => x.id === 'c_a')
  assert.equal(card.video, true)
  assert.equal(Boolean(card.audio), false, 'sibling audio must stay off')
})

test('patchCard video=false clears a previously set video flag', () => {
  const once = applyPatch(baseCfg(), { patchCard: { id: 'c_a', field: 'video', value: true } })
  const out = applyPatch(once, { patchCard: { id: 'c_a', field: 'video', value: false } })
  assert.equal(out.apis.find((x) => x.id === 'c_a').video, false)
})

test('patchCard video only touches the addressed card', () => {
  const out = applyPatch(baseCfg(), { patchCard: { id: 'c_a', field: 'video', value: true } })
  assert.equal(Boolean(out.apis.find((x) => x.id === 'c_b').video), false)
})

// ---- (b) patchCard audio ----

test('patchCard audio=true sets audio and leaves video off', () => {
  const out = applyPatch(baseCfg(), { patchCard: { id: 'c_b', field: 'audio', value: true } })
  const card = out.apis.find((x) => x.id === 'c_b')
  assert.equal(card.audio, true)
  assert.equal(Boolean(card.video), false, 'sibling video must stay off')
})

test('patchCard audio=false clears a previously set audio flag', () => {
  const once = applyPatch(baseCfg(), { patchCard: { id: 'c_b', field: 'audio', value: true } })
  const out = applyPatch(once, { patchCard: { id: 'c_b', field: 'audio', value: false } })
  assert.equal(out.apis.find((x) => x.id === 'c_b').audio, false)
})

test('video and audio are independent switches', () => {
  let out = applyPatch(baseCfg(), { patchCard: { id: 'c_a', field: 'video', value: true } })
  out = applyPatch(out, { patchCard: { id: 'c_a', field: 'audio', value: true } })
  const card = out.apis.find((x) => x.id === 'c_a')
  assert.equal(card.video, true)
  assert.equal(card.audio, true)
  out = applyPatch(out, { patchCard: { id: 'c_a', field: 'video', value: false } })
  const after = out.apis.find((x) => x.id === 'c_a')
  assert.equal(after.video, false)
  assert.equal(after.audio, true)
})

// ---- (c) full-array apis merge (drag reorder path) ----

test('full apis replace preserves video/audio across drag reorder', () => {
  // Seed both flags, then simulate the UI round-tripping the whole (reordered) array.
  let cfg = applyPatch(baseCfg(), { patchCard: { id: 'c_a', field: 'video', value: true } })
  cfg = applyPatch(cfg, { patchCard: { id: 'c_a', field: 'audio', value: true } })
  cfg = applyPatch(cfg, { patchCard: { id: 'c_b', field: 'video', value: true } })

  const reordered = [
    Object.assign({}, cfg.apis.find((x) => x.id === 'c_b'), { video: true, audio: false }),
    Object.assign({}, cfg.apis.find((x) => x.id === 'c_a'), { video: true, audio: true })
  ]
  const out = applyPatch(cfg, { apis: reordered })

  assert.deepEqual(out.apis.map((x) => x.id), ['c_b', 'c_a'], 'order must follow the patch')
  const b = out.apis.find((x) => x.id === 'c_b')
  assert.equal(b.video, true)
  assert.equal(b.audio, false)
  const a = out.apis.find((x) => x.id === 'c_a')
  assert.equal(a.video, true)
  assert.equal(a.audio, true)
})

test('full apis replace defaults missing flags to false (not undefined)', () => {
  const cfg = applyPatch(baseCfg(), { patchCard: { id: 'c_a', field: 'video', value: true } })
  const out = applyPatch(cfg, { apis: [{ id: 'c_a' }] })
  const a = out.apis.find((x) => x.id === 'c_a')
  assert.equal(a.video, false)
  assert.equal(a.audio, false)
})

// ---- (d) masked() exposes both booleans to the client ----

test('masked() returns video/audio booleans for every card', () => {
  let cfg = applyPatch(baseCfg(), { patchCard: { id: 'c_a', field: 'audio', value: true } })
  cfg = applyPatch(cfg, { patchCard: { id: 'c_b', field: 'video', value: true } })
  const out = masked(cfg)
  assert.equal(typeof out.apis[0].video, 'boolean')
  assert.equal(typeof out.apis[0].audio, 'boolean')
  assert.equal(out.apis[0].audio, true)
  assert.equal(out.apis[0].video, false)
  assert.equal(out.apis[1].video, true)
  assert.equal(out.apis[1].audio, false)
})

test('masked() reports false for cards that never set the flags', () => {
  const out = masked(normalizeConfig(baseCfg()))
  assert.equal(out.apis[0].video, false)
  assert.equal(out.apis[0].audio, false)
})

test('masked() never leaks apiKey', () => {
  const out = masked(normalizeConfig(baseCfg()))
  assert.equal(out.apis[0].apiKey, undefined)
  assert.equal(out.apis[0].apiKeySet, true)
})
