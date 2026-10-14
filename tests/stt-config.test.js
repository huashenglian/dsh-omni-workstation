// stt-config.test.js — STT (speech-to-text) config layer (v2.13)
// Mirrors tests/voice.test.js harness: node:test + dynamic import + DSH_HOME /
// config-dir mkdtemp. applyPatch usage copied from voice.test.js existing cases.
// The pure helpers (defaultSttConfig / normalizeSttConfig / isSttConfigValid /
// maskedStt) are exported from index.js and imported directly here.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

process.env.DSH_HOME = mkdtempSync(join(tmpdir(), 'omni-workstation-stt-'))
process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR = mkdtempSync(join(tmpdir(), 'omni-workstation-stcfg-'))

const { applyPatch, defaultSttConfig, normalizeSttConfig, maskedStt, isSttConfigValid } = await import('../lib/index.js')

// ---- defaultSttConfig ----

test('defaultSttConfig returns funasr-shaped defaults', () => {
  const d = defaultSttConfig()
  assert.equal(d.provider, 'funasr')
  assert.equal(d.protocol, 'openai-stt')
  assert.equal(d.endpoint, 'http://127.0.0.1:8000/v1')
  assert.equal(d.apiKey, '')
  assert.equal(d.model, 'sensevoice')
  assert.equal(d.timeoutMs, 120000)
  assert.equal(d.retryCount, 1)
  assert.equal(d.language, '')
  assert.equal(d.outputMode, 'text')
  assert.equal(d.hotwords, '')
  assert.equal(d.extraParams, '')
  assert.equal('voiceId' in d, false) // no TTS-shaped field
})

// ---- normalizeSttConfig ----

test('normalizeSttConfig: legacy TTS-shaped config silently falls back to funasr', () => {
  const c = normalizeSttConfig({ provider: 'mimo', voiceId: 'x' })
  assert.equal(c.provider, 'funasr')
  assert.equal(c.protocol, 'openai-stt')
  assert.equal('voiceId' in c, false)
})

test('normalizeSttConfig: non-object falls back to default', () => {
  assert.equal(normalizeSttConfig(null).provider, 'funasr')
  assert.equal(normalizeSttConfig('bogus').provider, 'funasr')
  assert.equal(normalizeSttConfig([]).provider, 'funasr')
})

test('normalizeSttConfig: outputMode not in whitelist -> text', () => {
  assert.equal(normalizeSttConfig({ outputMode: 'bogus' }).outputMode, 'text')
})

test('normalizeSttConfig: timeoutMs and retryCount clamp', () => {
  assert.equal(normalizeSttConfig({ timeoutMs: 5 }).timeoutMs, 120000) // below floor
  assert.equal(normalizeSttConfig({ retryCount: 99 }).retryCount, 10) // above cap
  assert.equal(normalizeSttConfig({ retryCount: 0 }).retryCount, 1)
})

test('normalizeSttConfig: language/hotwords/extraParams are strings', () => {
  const c = normalizeSttConfig({ language: 'zh', hotwords: '你好 world', extraParams: '{"diarize":true}' })
  assert.equal(c.language, 'zh')
  assert.equal(c.hotwords, '你好 world')
  assert.equal(c.extraParams, '{"diarize":true}')
  // non-string junk coerces to '' (never throws)
  assert.equal(normalizeSttConfig({ language: 123, hotwords: null, extraParams: undefined }).language, '')
})

// ---- isSttConfigValid ----

test('isSttConfigValid: funasr default valid; openai no key invalid; custom no endpoint invalid', () => {
  assert.equal(isSttConfigValid(defaultSttConfig()), true)
  assert.equal(isSttConfigValid(normalizeSttConfig({ provider: 'openai' })), false)
  assert.equal(isSttConfigValid(normalizeSttConfig({ provider: 'custom' })), false)
  // openai with key + model + fixed endpoint is valid
  assert.equal(isSttConfigValid(normalizeSttConfig({ provider: 'openai', apiKey: 'sk-x', model: 'whisper-1' })), true)
  // custom with endpoint + model is valid
  assert.equal(isSttConfigValid(normalizeSttConfig({ provider: 'custom', endpoint: 'http://localhost/v1', model: 'm' })), true)
})

// ---- maskedStt ----

test('maskedStt: enumerates all fields, includes apiKeySet, omits apiKey', () => {
  const m = maskedStt(defaultSttConfig())
  const keys = Object.keys(m)
  for (const f of ['provider', 'protocol', 'endpoint', 'model', 'timeoutMs', 'retryCount', 'language', 'outputMode', 'hotwords', 'extraParams', 'apiKeySet']) {
    assert.ok(keys.includes(f), 'missing key ' + f)
  }
  assert.equal('apiKey' in m, false)
  assert.equal(m.apiKeySet, false)
  const m2 = maskedStt(normalizeSttConfig({ apiKey: 'sk-x' }))
  assert.equal(m2.apiKeySet, true)
})

// ---- Config integration via applyPatch ----

test('applyPatch STT: language field targets voiceConfigStt and leaves TTS untouched', () => {
  let cfg = applyPatch({}, { voiceSubtab: 'stt', voiceConfig: { field: 'language', value: 'zh' } })
  assert.equal(cfg.voiceConfigStt.language, 'zh')
  assert.equal('language' in cfg.voiceConfig, false) // TTS has no language field (untouched)
})

test('applyPatch STT provider switch seeds groq fixedUrl + model', () => {
  let cfg = applyPatch({}, { voiceSubtab: 'stt', voiceConfig: { field: 'provider', value: 'groq' } })
  assert.equal(cfg.voiceConfigStt.provider, 'groq')
  assert.equal(cfg.voiceConfigStt.endpoint, 'https://api.groq.com/openai/v1')
  assert.equal(cfg.voiceConfigStt.protocol, 'openai-stt')
  assert.equal(cfg.voiceConfigStt.model, 'whisper-large-v3-turbo')
  // TTS branch unchanged by STT provider patch
  assert.equal(cfg.voiceConfig.provider, 'mimo')
})

test('applyPatch STT outputMode/hotwords persist', () => {
  let cfg = applyPatch({}, { voiceSubtab: 'stt', voiceConfig: { field: 'outputMode', value: 'srt' } })
  assert.equal(cfg.voiceConfigStt.outputMode, 'srt')
  cfg = applyPatch(cfg, { voiceSubtab: 'stt', voiceConfig: { field: 'hotwords', value: '你好 world' } })
  assert.equal(cfg.voiceConfigStt.hotwords, '你好 world')
  // invalid outputMode not accepted through applyPatch
  cfg = applyPatch(cfg, { voiceSubtab: 'stt', voiceConfig: { field: 'outputMode', value: 'nope' } })
  assert.equal(cfg.voiceConfigStt.outputMode, 'srt')
})

test('applyPatch: voiceReset (stt subtab) resets to defaultSttConfig', () => {
  let cfg = applyPatch({}, { voiceSubtab: 'stt', voiceConfig: { field: 'provider', value: 'groq' } })
  cfg = applyPatch(cfg, { voiceSubtab: 'stt', voiceConfig: { field: 'apiKey', value: 'sk-x' } })
  assert.equal(cfg.voiceConfigStt.provider, 'groq')
  cfg = applyPatch(cfg, { voiceReset: true, voiceSubtab: 'stt' })
  assert.deepEqual(cfg.voiceConfigStt, defaultSttConfig())
})

test('applyPatch: voicePresetAdd (stt subtab) creates STT preset without voiceId', () => {
  let cfg = applyPatch({}, { voiceSubtab: 'stt', voicePresetAdd: true })
  assert.equal(cfg.voicePresetsStt.length, 2)
  const np = cfg.voicePresetsStt[cfg.voicePresetsStt.length - 1]
  assert.equal('voiceId' in np.config, false)
  assert.equal(np.config.provider, 'funasr')
  assert.equal(cfg.voicePresets.length, 1) // TTS presets unaffected
})

test('applyPatch STT preset switch normalizes legacy TTS-shaped config (regression)', () => {
  // Seed a preset whose config is the old TTS shape (provider:'mimo', voiceId:'x')
  let cfg = applyPatch({}, { voiceSubtab: 'stt', voicePresetAdd: true })
  const id = cfg.voicePresetsStt[cfg.voicePresetsStt.length - 1].id
  cfg.voicePresetsStt = cfg.voicePresetsStt.map((p) => (p.id === id ? { ...p, config: { provider: 'mimo', voiceId: 'x' } } : p))
  // Now switch to that preset — :5369 normalization must rewrite to STT shape
  cfg = applyPatch(cfg, { voicePresetSwitch: id, voiceSubtab: 'stt' })
  assert.equal(cfg.voiceConfigStt.provider, 'funasr')
  assert.equal('voiceId' in cfg.voiceConfigStt, false)
})

test('applyPatch STT preset delete rebuilds with defaultSttConfig', () => {
  // Start with the single default STT preset, then delete it -> rebuild path
  let cfg = applyPatch({}, { voiceSubtab: 'stt' })
  const onlyId = cfg.voicePresetsStt[0].id
  cfg = applyPatch(cfg, { voicePresetDelete: onlyId, voiceSubtab: 'stt' })
  assert.equal(cfg.voicePresetsStt.length, 1)
  assert.equal('voiceId' in cfg.voicePresetsStt[0].config, false)
  assert.equal(cfg.voicePresetsStt[0].config.provider, 'funasr')
})
