// voice.test.js — voice module config, engine, and gate logic
// Pure functions (defaultVoiceConfig / normalizeVoiceConfig / isVoiceConfigValid)
// are module-level in index.js and NOT exported; their logic is reproduced here
// so unit tests can run without a server (same pattern as video-config.test.js).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

process.env.DSH_HOME = mkdtempSync(join(tmpdir(), 'omni-workstation-voice-'))
process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR = mkdtempSync(join(tmpdir(), 'omni-workstation-vcfg-'))

const { applyPatch, buildCloneVoiceToolDef, buildSpeakToolDef } = await import('../lib/index.js')

// ---- Reproduce pure voice helpers (not exported from index.js) ----

const clampTimeout = (v, def = 120000) => {
  const n = Number(v)
  return Number.isFinite(n) && n >= 1000 && n <= 3600000 ? Math.floor(n) : def
}

const VOICE_PROVIDERS = {
  mimo:      { protocol: 'mimo-tts', endpoint: 'https://api.xiaomimimo.com/v1', keyRequired: true, fixedUrl: true, fixedProtocol: true },
  minimax:   { protocol: 'minimax-tts', endpoint: 'https://api.minimaxi.com', keyRequired: true, fixedUrl: true, fixedProtocol: true },
  doubao:    { protocol: 'doubao-tts', endpoint: 'https://openspeech.bytedance.com', keyRequired: true, fixedUrl: true, fixedProtocol: true },
  indextts:  { protocol: 'indextts-tts', endpoint: 'http://127.0.0.1:7880', keyRequired: false, fixedUrl: true, fixedProtocol: true },
  gptsovits: { protocol: 'gptsovits-tts', endpoint: 'http://127.0.0.1:9880', keyRequired: false, fixedUrl: true, fixedProtocol: true },
  voxcpm:    { protocol: 'voxcpm-tts', endpoint: 'http://127.0.0.1:8000', keyRequired: false, fixedUrl: true, fixedProtocol: true },
  'tts-webui': { protocol: 'openai-speech', endpoint: '', keyRequired: false, fixedUrl: false, fixedProtocol: false }
}
const VOICE_PROVIDER_IDS = Object.keys(VOICE_PROVIDERS)
const VOICE_PROTOCOLS = ['mimo-tts', 'minimax-tts', 'doubao-tts', 'indextts-tts', 'gptsovits-tts', 'voxcpm-tts', 'openai-speech']

const defaultVoiceConfig = () => ({
  provider: 'mimo',
  protocol: 'mimo-tts',
  endpoint: 'https://api.xiaomimimo.com/v1',
  apiKey: '',
  model: '',
  voiceId: 'mimo_default',
  timeoutMs: 120000,
  styleInstruction: '',
  singMode: false,
  optimizeText: false,
  voiceSamplePath: '',
  outputFormat: 'wav',
  streamOutput: false,
  filterVoiceModels: true,
  retryCount: 1,
  appId: '',
  accessKey: '',
  emoStrategy: '',
  emoWeight: '',
  mode: 'clone',
  region: 'cn'
})

function normalizeVoiceConfig(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaultVoiceConfig()
  const provider = VOICE_PROVIDER_IDS.includes(raw.provider) ? raw.provider : 'mimo'
  const meta = VOICE_PROVIDERS[provider]
  const protocol = meta && meta.fixedProtocol
    ? meta.protocol
    : (VOICE_PROTOCOLS.includes(raw.protocol) ? raw.protocol : 'mimo-tts')
  return {
    provider,
    protocol,
    endpoint: typeof raw.endpoint === 'string' ? raw.endpoint : '',
    apiKey: typeof raw.apiKey === 'string' ? raw.apiKey : '',
    model: typeof raw.model === 'string' ? raw.model : '',
    voiceId: typeof raw.voiceId === 'string' ? raw.voiceId : 'mimo_default',
    timeoutMs: clampTimeout(raw.timeoutMs, 120000),
    styleInstruction: typeof raw.styleInstruction === 'string' ? raw.styleInstruction : '',
    singMode: raw.singMode === true,
    optimizeText: raw.optimizeText === true,
    voiceSamplePath: typeof raw.voiceSamplePath === 'string' ? raw.voiceSamplePath : '',
    outputFormat: typeof raw.outputFormat === 'string' ? raw.outputFormat : 'wav',
    streamOutput: raw.streamOutput === true,
    filterVoiceModels: raw.filterVoiceModels === false ? false : true,
    retryCount: Number.isFinite(Number(raw.retryCount)) && Number(raw.retryCount) >= 1 ? Math.floor(Number(raw.retryCount)) : 1,
    appId: typeof raw.appId === 'string' ? raw.appId : '',
    accessKey: typeof raw.accessKey === 'string' ? raw.accessKey : '',
    emoStrategy: typeof raw.emoStrategy === 'string' ? raw.emoStrategy : '',
    emoWeight: typeof raw.emoWeight === 'string' ? raw.emoWeight : '',
    mode: typeof raw.mode === 'string' ? raw.mode : 'clone',
    region: typeof raw.region === 'string' ? raw.region : 'cn'
  }
}

function isVoiceConfigValid(c) {
  if (!c) return false
  const meta = VOICE_PROVIDERS[c.provider]
  const endpoint = (meta && meta.fixedUrl) ? meta.endpoint : c.endpoint
  if (typeof endpoint !== 'string' || endpoint.trim() === '') return false
  if (typeof c.model !== 'string' || c.model.trim() === '') return false
  if (meta && meta.keyRequired !== false) {
    if (typeof c.apiKey !== 'string' || c.apiKey === '') return false
  }
  return true
}

// ---- defaultVoiceConfig ----

test('defaultVoiceConfig returns expected shape', () => {
  const d = defaultVoiceConfig()
  assert.equal(d.provider, 'mimo')
  assert.equal(d.protocol, 'mimo-tts')
  assert.equal(d.endpoint, 'https://api.xiaomimimo.com/v1')
  assert.equal(d.apiKey, '')
  assert.equal(d.model, '')
  assert.equal(d.voiceId, 'mimo_default')
  assert.equal(d.timeoutMs, 120000)
  assert.equal(d.styleInstruction, '')
  assert.equal(d.singMode, false)
  assert.equal(d.optimizeText, false)
  assert.equal(d.voiceSamplePath, '')
})

// ---- normalizeVoiceConfig ----

test('normalizeVoiceConfig({}) returns defaults (endpoint/apiKey empty from missing raw fields)', () => {
  const c = normalizeVoiceConfig({})
  assert.equal(c.provider, 'mimo')
  assert.equal(c.protocol, 'mimo-tts')
  assert.equal(c.endpoint, '')       // raw.endpoint is undefined -> ''
  assert.equal(c.apiKey, '')         // raw.apiKey is undefined -> ''
  assert.equal(c.model, '')
  assert.equal(c.voiceId, 'mimo_default')
  assert.equal(c.timeoutMs, 120000)
})

test('normalizeVoiceConfig(null) returns defaults', () => {
  assert.deepEqual(normalizeVoiceConfig(null), defaultVoiceConfig())
})

test('normalizeVoiceConfig({provider:"mimo"}) locks mimo protocol (endpoint from raw, filled by fixedUrl in validity check)', () => {
  const c = normalizeVoiceConfig({ provider: 'mimo', apiKey: 'sk-x' })
  assert.equal(c.provider, 'mimo')
  assert.equal(c.protocol, 'mimo-tts')   // fixedProtocol -> mimo-tts
  // endpoint stays '' from raw (normalizeVoiceConfig doesn't inject fixedUrl;
  // isVoiceConfigValid uses meta.endpoint when meta.fixedUrl is true)
  assert.equal(c.endpoint, '')
})

test('normalizeVoiceConfig locks protocol per built-in provider', () => {
  assert.equal(normalizeVoiceConfig({ provider: 'minimax' }).protocol, 'minimax-tts')
  assert.equal(normalizeVoiceConfig({ provider: 'doubao' }).protocol, 'doubao-tts')
  assert.equal(normalizeVoiceConfig({ provider: 'indextts' }).protocol, 'indextts-tts')
  assert.equal(normalizeVoiceConfig({ provider: 'gptsovits' }).protocol, 'gptsovits-tts')
  assert.equal(normalizeVoiceConfig({ provider: 'voxcpm' }).protocol, 'voxcpm-tts')
  // tts-webui has fixedProtocol=false → falls through to protocol allowlist
  // undefined protocol → default 'mimo-tts'
  assert.equal(normalizeVoiceConfig({ provider: 'tts-webui' }).protocol, 'mimo-tts')
  // tts-webui with valid protocol -> openai-speech
  assert.equal(normalizeVoiceConfig({ provider: 'tts-webui', protocol: 'openai-speech' }).protocol, 'openai-speech')
})

test('normalizeVoiceConfig({provider:"invalid"}) falls back to mimo', () => {
  const c = normalizeVoiceConfig({ provider: 'bogus' })
  assert.equal(c.provider, 'mimo')
  assert.equal(c.protocol, 'mimo-tts')
})

test('normalizeVoiceConfig clamps timeoutMs and sanitizes booleans', () => {
  const c = normalizeVoiceConfig({ provider: 'mimo', timeoutMs: 500, singMode: 'yes', optimizeText: 1 })
  assert.equal(c.timeoutMs, 120000) // below clamp -> default
  assert.equal(c.singMode, false)
  assert.equal(c.optimizeText, false)

  // Within range: passes through
  const c2 = normalizeVoiceConfig({ provider: 'mimo', timeoutMs: 3600000 })
  assert.equal(c2.timeoutMs, 3600000) // upper bound inclusive

  // Above range: falls back to default (not capped to max)
  const c3 = normalizeVoiceConfig({ provider: 'mimo', timeoutMs: 9999999 })
  assert.equal(c3.timeoutMs, 120000)

  const c4 = normalizeVoiceConfig({ provider: 'mimo', singMode: true, optimizeText: true })
  assert.equal(c4.singMode, true)
  assert.equal(c4.optimizeText, true)
})

test('normalizeVoiceConfig preserves valid user fields', () => {
  const c = normalizeVoiceConfig({
    provider: 'mimo',
    endpoint: 'https://custom-tts.example.com/v1',
    apiKey: 'sk-test-key',
    model: 'mimo-v2.5-tts-voiceclone',
    voiceId: 'Mia',
    styleInstruction: '温暖的女声',
    voiceSamplePath: '/tmp/sample.wav'
  })
  assert.equal(c.endpoint, 'https://custom-tts.example.com/v1')
  assert.equal(c.apiKey, 'sk-test-key')
  assert.equal(c.model, 'mimo-v2.5-tts-voiceclone')
  assert.equal(c.voiceId, 'Mia')
  assert.equal(c.styleInstruction, '温暖的女声')
  assert.equal(c.voiceSamplePath, '/tmp/sample.wav')
})

// ---- isVoiceConfigValid ----

test('isVoiceConfigValid with valid mimo config returns true', () => {
  assert.equal(isVoiceConfigValid(normalizeVoiceConfig({ provider: 'mimo', apiKey: 'sk-test', model: 'mimo-v2.5-tts' })), true)
})

test('isVoiceConfigValid with empty apiKey returns false for keyRequired providers', () => {
  assert.equal(isVoiceConfigValid(normalizeVoiceConfig({ provider: 'mimo', apiKey: '', model: 'mimo-v2.5-tts' })), false)
  assert.equal(isVoiceConfigValid(normalizeVoiceConfig({ provider: 'minimax', apiKey: '', model: 'tts' })), false)
  assert.equal(isVoiceConfigValid(normalizeVoiceConfig({ provider: 'doubao', apiKey: '', model: 'tts' })), false)
})

test('isVoiceConfigValid with empty apiKey returns true for keyRequired=false providers', () => {
  assert.equal(isVoiceConfigValid(normalizeVoiceConfig({ provider: 'indextts', apiKey: '', model: 'tts' })), true)
  assert.equal(isVoiceConfigValid(normalizeVoiceConfig({ provider: 'gptsovits', apiKey: '', model: 'tts' })), true)
  assert.equal(isVoiceConfigValid(normalizeVoiceConfig({ provider: 'voxcpm', apiKey: '', model: 'tts' })), true)
})

test('isVoiceConfigValid with empty model returns false', () => {
  assert.equal(isVoiceConfigValid(normalizeVoiceConfig({ provider: 'indextts', apiKey: '', model: '' })), false)
})

test('isVoiceConfigValid with null returns false', () => {
  assert.equal(isVoiceConfigValid(null), false)
})

test('isVoiceConfigValid uses fixedUrl for built-in providers (ignores empty stored endpoint)', () => {
  const cfg = normalizeVoiceConfig({ provider: 'mimo', endpoint: '', apiKey: 'sk', model: 'mimo-v2.5-tts' })
  // endpoint is empty from user, but fixedUrl means meta.endpoint is used
  assert.equal(isVoiceConfigValid(cfg), true)
})

test('isVoiceConfigValid tts-webui requires non-empty endpoint', () => {
  // tts-webui has fixedUrl=false, so it uses the stored endpoint
  const valid = normalizeVoiceConfig({ provider: 'tts-webui', endpoint: 'http://localhost:8888', apiKey: '', model: 'tts' })
  assert.equal(isVoiceConfigValid(valid), true)
  const empty = normalizeVoiceConfig({ provider: 'tts-webui', endpoint: '', apiKey: '', model: 'tts' })
  assert.equal(isVoiceConfigValid(empty), false)
})

// ---- Config integration via applyPatch ----

test('applyPatch({voiceEnabled:true}) sets voiceEnabled=true', () => {
  const cfg = applyPatch({}, { voiceEnabled: true })
  assert.equal(cfg.voiceEnabled, true)
})

test('applyPatch: voiceConfig provider patch seeds fixedUrl + normalizes', () => {
  let cfg = applyPatch({}, {})
  // default voiceConfig should exist with defaultVoiceConfig values
  assert.equal(cfg.voiceConfig.provider, 'mimo')
  assert.equal(cfg.voiceConfig.model, '')
  assert.equal(cfg.voiceConfig.voiceId, 'mimo_default')

  cfg = applyPatch(cfg, { voiceConfig: { field: 'provider', value: 'minimax' } })
  assert.equal(cfg.voiceConfig.provider, 'minimax')
  assert.equal(cfg.voiceConfig.protocol, 'minimax-tts')
  assert.equal(cfg.voiceConfig.endpoint, 'https://api.minimaxi.com')

  cfg = applyPatch(cfg, { voiceConfig: { field: 'apiKey', value: 'sk-test' } })
  assert.equal(cfg.voiceConfig.apiKey, 'sk-test')

  cfg = applyPatch(cfg, { voiceConfig: { field: 'model', value: 'speech-002' } })
  assert.equal(cfg.voiceConfig.model, 'speech-002')

  cfg = applyPatch(cfg, { voiceConfig: { field: 'voiceId', value: 'Mia' } })
  assert.equal(cfg.voiceConfig.voiceId, 'Mia')

  cfg = applyPatch(cfg, { voiceConfig: { field: 'styleInstruction', value: '温柔女声' } })
  assert.equal(cfg.voiceConfig.styleInstruction, '温柔女声')
})

test('applyPatch: voiceReset resets to default', () => {
  let cfg = applyPatch({}, { voiceConfig: { field: 'provider', value: 'minimax' } })
  cfg = applyPatch(cfg, { voiceConfig: { field: 'apiKey', value: 'sk-x' } })
  assert.equal(cfg.voiceConfig.provider, 'minimax')
  cfg = applyPatch(cfg, { voiceReset: true })
  assert.equal(cfg.voiceConfig.provider, 'mimo')
  assert.equal(cfg.voiceConfig.apiKey, '')
})

const maskedVoice = (c) => ({
  provider: c.provider,
  protocol: c.protocol,
  endpoint: c.endpoint,
  model: c.model,
  voiceId: c.voiceId,
  timeoutMs: c.timeoutMs,
  styleInstruction: c.styleInstruction,
  singMode: c.singMode,
  optimizeText: c.optimizeText,
  voiceSamplePath: c.voiceSamplePath,
  apiKeySet: c.apiKey !== ''
})

// ---- masked() — apiKey hidden, apiKeySet reported ----

test('maskedVoice() returns apiKeySet not apiKey', () => {
  const cfg = normalizeVoiceConfig({ provider: 'mimo', apiKey: 'secret-key-123' })
  const m = maskedVoice(cfg)
  assert.equal(m.apiKey, undefined)
  assert.equal(m.apiKeySet, true)
  assert.equal(m.provider, 'mimo')
  assert.equal(m.voiceId, 'mimo_default')
})

test('maskedVoice() reports apiKeySet=false when no key set', () => {
  const m = maskedVoice(defaultVoiceConfig())
  assert.equal(m.apiKey, undefined)
  assert.equal(m.apiKeySet, false)
})

// ---- gate logic (voiceVisible equivalent) ----

test('voice gate: voiceEnabled=true + valid config -> gate passes', () => {
  let cfg = applyPatch({}, { voiceEnabled: true })
  cfg = applyPatch(cfg, { voiceConfig: { field: 'apiKey', value: 'sk-test' } })
  cfg = applyPatch(cfg, { voiceConfig: { field: 'model', value: 'mimo-v2.5-tts' } })
  assert.equal(cfg.voiceEnabled === true && isVoiceConfigValid(cfg.voiceConfig), true)
})

test('voice gate: voiceEnabled=false -> gate fails regardless of config', () => {
  let cfg = applyPatch({}, { voiceConfig: { field: 'apiKey', value: 'sk-test' } })
  // voiceEnabled defaults false
  assert.equal(cfg.voiceEnabled === true && isVoiceConfigValid(cfg.voiceConfig), false)
})

test('voice gate: voiceEnabled=true + invalid config -> gate fails', () => {
  const cfg = applyPatch({}, { voiceEnabled: true })
  // default voiceConfig has empty apiKey -> invalid for mimo
  assert.equal(cfg.voiceEnabled === true && isVoiceConfigValid(cfg.voiceConfig), false)
})

// ---- voicePresets via applyPatch ----

test('voice presets: default preset auto-created with provider change', () => {
  let cfg = applyPatch({}, { voiceConfig: { field: 'provider', value: 'minimax' } })
  assert.ok(Array.isArray(cfg.voicePresets))
  assert.equal(cfg.voicePresets.length, 1)
  assert.equal(cfg.voicePresets[0].name, '默认')
  assert.equal(cfg.activeVoicePreset, cfg.voicePresets[0].id)
  assert.equal(cfg.voicePresets[0].config.provider, 'minimax')
})

test('voice presets: voiceConfig patches sync into active preset', () => {
  let cfg = applyPatch({}, { voiceConfig: { field: 'provider', value: 'indextts' } })
  cfg = applyPatch(cfg, { voiceConfig: { field: 'model', value: 'custom-tts' } })
  assert.equal(cfg.voiceConfig.model, 'custom-tts')
  assert.equal(cfg.voicePresets[0].config.model, 'custom-tts')
})

// ---- v2.9.1: subtab namespaced presets + extra fields ----

test('voice subtab STT: patches target voiceConfigStt namespace, do not touch TTS', () => {
  let cfg = applyPatch({}, { voiceSubtab: 'stt', voiceConfig: { field: 'model', value: 'stt-model' } })
  assert.equal(cfg.voiceConfigStt.model, 'stt-model')
  assert.equal(cfg.voiceConfig.model, '')           // TTS untouched
  assert.equal(cfg.voicePresetsStt[0].config.model, 'stt-model')
  assert.notEqual(cfg.activeVoicePresetStt, cfg.activeVoicePreset)

  // default 'stt' namespace is a separate list from TTS
  cfg = applyPatch(cfg, { voiceSubtab: 'stt', voicePresetAdd: true })
  assert.equal(cfg.voicePresetsStt.length, 2)
  assert.equal(cfg.voicePresets.length, 1)          // TTS presets unaffected
})

test('voice extra fields persist via applyPatch', () => {
  let cfg = applyPatch({}, {})
  cfg = applyPatch(cfg, { voiceConfig: { field: 'outputFormat', value: 'pcm16' } })
  cfg = applyPatch(cfg, { voiceConfig: { field: 'streamOutput', value: true } })
  cfg = applyPatch(cfg, { voiceConfig: { field: 'filterVoiceModels', value: false } })
  cfg = applyPatch(cfg, { voiceConfig: { field: 'retryCount', value: 3 } })
  assert.equal(cfg.voiceConfig.outputFormat, 'pcm16')
  assert.equal(cfg.voiceConfig.streamOutput, true)
  assert.equal(cfg.voiceConfig.filterVoiceModels, false)
  assert.equal(cfg.voiceConfig.retryCount, 3)
})

test('voice provider-specific fields persist via applyPatch', () => {
  let cfg = applyPatch({}, {})
  cfg = applyPatch(cfg, { voiceConfig: { field: 'appId', value: 'abc' } })
  cfg = applyPatch(cfg, { voiceConfig: { field: 'accessKey', value: 'secret-key' } })
  cfg = applyPatch(cfg, { voiceConfig: { field: 'emoStrategy', value: '3' } })
  cfg = applyPatch(cfg, { voiceConfig: { field: 'emoWeight', value: '0.8' } })
  cfg = applyPatch(cfg, { voiceConfig: { field: 'mode', value: 'design' } })
  cfg = applyPatch(cfg, { voiceConfig: { field: 'region', value: 'global' } })
  assert.equal(cfg.voiceConfig.appId, 'abc')
  assert.equal(cfg.voiceConfig.accessKey, 'secret-key')
  assert.equal(cfg.voiceConfig.emoStrategy, '3')
  assert.equal(cfg.voiceConfig.emoWeight, '0.8')
  assert.equal(cfg.voiceConfig.mode, 'design')
  assert.equal(cfg.voiceConfig.region, 'global')
  // invalid mode/region are rejected
  const bad = applyPatch(cfg, { voiceConfig: { field: 'mode', value: 'bogus' } })
  assert.equal(bad.voiceConfig.mode, 'design')
})

// ---- runMimoTts: request construction logic (mocked) ----

test('runMimoTts request body: model, messages, audio voice, stream=false', async () => {
  const base64wav = Buffer.from('fake-wav-data').toString('base64')
  let capturedUrl, capturedBody

  // Mock global fetch
  const realFetch = global.fetch
  global.fetch = async (url, opts) => {
    capturedUrl = url
    capturedBody = JSON.parse(opts.body)
    return {
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({
        choices: [{ message: { audio: { data: base64wav } } }]
      })
    }
  }

  try {
    // Inline runMimoTts logic (function not exported)
    const vc = normalizeVoiceConfig({ provider: 'mimo', endpoint: 'https://api.xiaomimimo.com/v1', apiKey: 'sk-test' })
    const text = '你好世界'
    const style = ''
    const model = vc.model || 'mimo-v2.5-tts'
    const messages = []
    messages.push({ role: 'user', content: style })
    messages.push({ role: 'assistant', content: text })
    const audio = { format: 'wav', voice: vc.voiceId || 'mimo_default' }
    const endpoint = (vc.endpoint || 'https://api.xiaomimimo.com/v1').replace(/\/+$/, '')
    const url = endpoint + '/chat/completions'
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), vc.timeoutMs || 120000)

    const resp = await global.fetch(url, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + vc.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, audio, stream: false }),
      signal: controller.signal
    })
    clearTimeout(timeout)
    assert.equal(resp.ok, true)

    assert.equal(capturedUrl, 'https://api.xiaomimimo.com/v1/chat/completions')
    assert.equal(capturedBody.model, 'mimo-v2.5-tts')
    assert.deepEqual(capturedBody.messages, [
      { role: 'user', content: '' },
      { role: 'assistant', content: '你好世界' }
    ])
    assert.deepEqual(capturedBody.audio, { format: 'wav', voice: 'mimo_default' })
    assert.equal(capturedBody.stream, false)

    const body = await resp.json()
    const audioData = body.choices[0].message.audio.data
    assert.equal(audioData, base64wav)
    const wavBuffer = Buffer.from(audioData, 'base64')
    assert.equal(wavBuffer.toString(), 'fake-wav-data')
  } finally {
    global.fetch = realFetch
  }
})

// v2.9.3: runMinimaxTts (t2a_v2) request body shape + hex→mp3 decode (inlined; not exported)
test('runMinimaxTts request body: t2a_v2, voice_setting.voice_id, audio_setting.format=mp3, hex decode', async () => {
  const hexMp3 = Buffer.from('fake-mp3-data').toString('hex') // hex of a fake mp3
  let capturedUrl, capturedBody, capturedAuth

  const realFetch = global.fetch
  global.fetch = async (url, opts) => {
    capturedUrl = url
    capturedBody = JSON.parse(opts.body)
    capturedAuth = opts.headers['Authorization']
    return { ok: true, status: 200, text: async () => '', json: async () => ({ data: { audio: hexMp3 } }) }
  }

  try {
    // inline runMinimaxTts body construction
    const vc = normalizeVoiceConfig({ provider: 'minimax', region: 'cn', apiKey: 'sk-mm', model: 'speech-2.8-hd', voiceId: 'hutao_e2e' })
    const text = '你好，我是胡桃'
    const model = vc.model || 'speech-2.8-hd'
    const voiceId = 'hutao_e2e'
    const region = vc.region === 'global' ? 'global' : 'cn'
    const base = (region === 'global' ? 'https://api.minimax.io' : 'https://api.minimaxi.com').replace(/\/+$/, '')
    const url = base + '/v1/t2a_v2'
    const voiceSetting = { voice_id: voiceId }
    const audioSetting = { sample_rate: 32000, bitrate: 128000, format: 'mp3', channel: 1 }
    const resp = await global.fetch(url, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + vc.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, text, stream: false, output_format: 'hex', language_boost: 'auto', voice_setting: voiceSetting, audio_setting: audioSetting })
    })
    assert.equal(resp.ok, true)
    assert.equal(capturedUrl, 'https://api.minimaxi.com/v1/t2a_v2')
    assert.equal(capturedAuth, 'Bearer sk-mm')
    assert.equal(capturedBody.model, 'speech-2.8-hd')
    assert.equal(capturedBody.text, '你好，我是胡桃')
    assert.equal(capturedBody.stream, false)
    assert.equal(capturedBody.output_format, 'hex')
    assert.deepEqual(capturedBody.voice_setting, { voice_id: 'hutao_e2e' })
    assert.equal(capturedBody.audio_setting.format, 'mp3')
    assert.equal(capturedBody.audio_setting.channel, 1)

    const body = await resp.json()
    const audioHex = body.data.audio
    assert.equal(audioHex, hexMp3)
    const mp3Buffer = Buffer.from(audioHex, 'hex')
    assert.equal(mp3Buffer.toString(), 'fake-mp3-data') // hex→bytes round-trips
    assert.ok(mp3Buffer.length > 0)
  } finally {
    global.fetch = realFetch
  }
})

// v2.9.3: doMinimaxClone two-step (upload multipart → file_id → voice_clone JSON) — inlined
test('doMinimaxClone: upload FormData(voice_clone) then voice_clone body with file_id+voice_id', async () => {
  let calls = []
  const realFetch = global.fetch
  global.fetch = async (url, opts) => {
    calls.push({ url, method: opts.method, headers: opts.headers, body: opts.body })
    if (String(url).endsWith('/v1/files/upload')) {
      return { ok: true, status: 200, text: async () => '', json: async () => ({ file: { file_id: 'fid_123' } }) }
    }
    if (String(url).endsWith('/v1/voice_clone')) {
      return { ok: true, status: 200, text: async () => '', json: async () => ({ demo_audio: 'https://x/y.mp3' }) }
    }
    return { ok: false, status: 500, text: async () => 'err', json: async () => ({}) }
  }
  // FormData + Blob exist in Node 18+ test runtime
  try {
    const fd = new FormData()
    fd.append('purpose', 'voice_clone')
    fd.append('file', new Blob([Buffer.from('fake-audio')]), 'clip.wav')
    // step 1: upload
    const up = await global.fetch('https://api.minimaxi.com/v1/files/upload', { method: 'POST', headers: { 'Authorization': 'Bearer sk-mm' }, body: fd })
    const upBody = await up.json()
    const fileId = upBody.file.file_id
    assert.equal(fileId, 'fid_123')
    // step 2: voice_clone
    const cloneBody = { file_id: fileId, voice_id: 'hutao_e2e', model: 'speech-2.8-hd', need_noise_reduction: false, need_volume_normalization: true, aigc_watermark: false, text: '你好' }
    const cl = await global.fetch('https://api.minimaxi.com/v1/voice_clone', { method: 'POST', headers: { 'Authorization': 'Bearer sk-mm', 'Content-Type': 'application/json' }, body: JSON.stringify(cloneBody) })
    const clBody = await cl.json()
    assert.equal(clBody.demo_audio, 'https://x/y.mp3')
    assert.equal(calls.length, 2)
    assert.equal(calls[0].url, 'https://api.minimaxi.com/v1/files/upload')
    assert.equal(calls[0].headers['Authorization'], 'Bearer sk-mm')
    assert.equal(calls[1].url, 'https://api.minimaxi.com/v1/voice_clone')
    const parsed = JSON.parse(calls[1].body)
    assert.equal(parsed.file_id, 'fid_123')
    assert.equal(parsed.voice_id, 'hutao_e2e')
    assert.equal(parsed.need_volume_normalization, true)
    assert.equal(parsed.aigc_watermark, false)
  } finally {
    global.fetch = realFetch
  }
})

// ---- v2.9.7: clone_voice tool definition (clone-only, mimo+minimax) ----

test('buildCloneVoiceToolDef minimax: parameters + description + output schema', () => {
  const vc = { provider: 'minimax', voiceId: 'test_vid', model: 'speech-2.8-hd' }
  const def = buildCloneVoiceToolDef(vc)
  assert.equal(def.name, 'clone_voice')
  const props = def.parameters.properties
  assert.ok(props.voice_sample_path, 'voice_sample_path param present')
  // voice_id and text should exist too
  assert.ok(props.voice_id, 'voice_id param present')
  assert.ok(props.text, 'text param present')
  assert.ok(def.description.indexOf('voice_id') >= 0)
  assert.equal(def.output.schema.properties.ok.type, 'boolean')
  assert.equal(def.output.schema.properties.voice_id.type, 'string')
  assert.equal(def.output.schema.properties.demo_audio.type, 'string')
})

test('buildCloneVoiceToolDef mimo: description mentions voice_sample_path', () => {
  const vc = { provider: 'mimo', voiceId: 'mimo_default', model: 'mimo-v2.5-tts' }
  const def = buildCloneVoiceToolDef(vc)
  assert.equal(def.name, 'clone_voice')
  assert.ok(def.description.indexOf('voice_sample_path') >= 0)
  assert.ok(def.description.indexOf('克隆') >= 0)
})

// ---- v2.9.7: speak tool definition (provider-aware params) ----

test('buildSpeakToolDef mimo: has voice_sample_path param; minimax: does not', () => {
  const mimoVc = { provider: 'mimo', voiceId: 'mimo_default', model: 'mimo-v2.5-tts' }
  const mimoDef = buildSpeakToolDef(mimoVc)
  const mimoProps = mimoDef.parameters.properties
  assert.ok(mimoProps.voice_sample_path, 'mimo speak should have voice_sample_path')

  const mmVc = { provider: 'minimax', voiceId: 'test_vid', model: 'speech-2.8-hd' }
  const mmDef = buildSpeakToolDef(mmVc)
  const mmProps = mmDef.parameters.properties
  assert.equal(mmProps.voice_sample_path, undefined, 'minimax speak should NOT have voice_sample_path')
  assert.ok(mmDef.description.indexOf('clone_voice') >= 0)
  assert.equal(mmDef.description.indexOf('minimax_clone_voice'), -1)
})

// ---- v2.9.7: applyPatch voiceId reset on provider switch (except minimax) ----

test('applyPatch provider switch resets voiceId: mimo→doubao→gptsovits', () => {
  let cfg = applyPatch({}, { voiceConfig: { field: 'provider', value: 'mimo' } })
  assert.equal(cfg.voiceConfig.voiceId, 'mimo_default')
  cfg = applyPatch(cfg, { voiceConfig: { field: 'provider', value: 'doubao' } })
  assert.equal(cfg.voiceConfig.voiceId, 'zh_female_vv_uranus_bigtts')
  cfg = applyPatch(cfg, { voiceConfig: { field: 'provider', value: 'gptsovits' } })
  assert.equal(cfg.voiceConfig.voiceId, '')
})

test('applyPatch provider switch to minimax does NOT reset voiceId', () => {
  let cfg = applyPatch({}, { voiceConfig: { field: 'provider', value: 'mimo' } })
  cfg = applyPatch(cfg, { voiceConfig: { field: 'provider', value: 'minimax' } })
  cfg = applyPatch(cfg, { voiceConfig: { field: 'voiceId', value: 'hutao_cloned' } })
  assert.equal(cfg.voiceConfig.voiceId, 'hutao_cloned')
  cfg = applyPatch(cfg, { voiceConfig: { field: 'provider', value: 'doubao' } })
  assert.equal(cfg.voiceConfig.voiceId, 'zh_female_vv_uranus_bigtts')
  cfg = applyPatch(cfg, { voiceConfig: { field: 'provider', value: 'minimax' } })
  assert.notEqual(cfg.voiceConfig.voiceId, '')
})

test('applyPatch provider switch to indextts resets voiceId to empty', () => {
  let cfg = applyPatch({}, { voiceConfig: { field: 'provider', value: 'indextts' } })
  assert.equal(cfg.voiceConfig.voiceId, '')
})

test('applyPatch provider switch to voxcpm resets voiceId to empty', () => {
  let cfg = applyPatch({}, { voiceConfig: { field: 'provider', value: 'voxcpm' } })
  assert.equal(cfg.voiceConfig.voiceId, '')
})

test('applyPatch provider switch resets voiceId in active preset too', () => {
  let cfg = applyPatch({}, { voiceConfig: { field: 'provider', value: 'mimo' } })
  cfg = applyPatch(cfg, { voiceConfig: { field: 'provider', value: 'doubao' } })
  const vp = (cfg.voicePresets || []).find(p => p.id === cfg.activeVoicePreset)
  assert.ok(vp, 'active preset exists')
  assert.equal(vp.config.voiceId, 'zh_female_vv_uranus_bigtts')
})