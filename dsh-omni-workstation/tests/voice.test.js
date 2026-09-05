// voice.test.js — voice module config, engine, and gate logic
// Pure functions (defaultVoiceConfig / normalizeVoiceConfig / isVoiceConfigValid)
// are module-level in index.js and NOT exported; their logic is reproduced here
// so unit tests can run without a server (same pattern as video-config.test.js).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

process.env.DSH_HOME = mkdtempSync(join(tmpdir(), 'omni-workstation-voice-'))
process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR = mkdtempSync(join(tmpdir(), 'omni-workstation-vcfg-'))

const { applyPatch, buildCloneVoiceToolDef, buildSpeakToolDef, isVoiceConfigValid: realIsVoiceConfigValid, resolveDoubaoClonePreset, runDoubaoTts, runIndexTts, doIndexTtsClone, runGptSovits, runVoxCpm, doVoxCpmClone, runTtsWebui } = await import('../lib/index.js')

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
  region: 'cn',
  apiVersion: 'v1',
  gptModel: '',
  sovitsModel: '',
  refAudioPath: '',
  refText: '',
  promptLang: '中文',
  textLang: '中文'
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
    region: typeof raw.region === 'string' ? raw.region : 'cn',
    apiVersion: typeof raw.apiVersion === 'string' ? raw.apiVersion : 'v1',
    gptModel: typeof raw.gptModel === 'string' ? raw.gptModel : '',
    sovitsModel: typeof raw.sovitsModel === 'string' ? raw.sovitsModel : '',
    refAudioPath: typeof raw.refAudioPath === 'string' ? raw.refAudioPath : '',
    refText: typeof raw.refText === 'string' ? raw.refText : '',
    promptLang: typeof raw.promptLang === 'string' ? raw.promptLang : '中文',
    textLang: typeof raw.textLang === 'string' ? raw.textLang : '中文'
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

test('voice presets: default preset auto-created (runtime config is source of truth)', () => {
  let cfg = applyPatch({}, { voiceConfig: { field: 'provider', value: 'minimax' } })
  assert.ok(Array.isArray(cfg.voicePresets))
  assert.equal(cfg.voicePresets.length, 1)
  assert.equal(cfg.voicePresets[0].name, '默认')
  assert.equal(cfg.activeVoicePreset, cfg.voicePresets[0].id)
  // Runtime voiceConfig is the source of truth, not the preset
  assert.equal(cfg.voiceConfig.provider, 'minimax')
  // Preset is NOT auto-synced — retains its own config
  assert.equal(cfg.voicePresets[0].config.provider, 'mimo') // default
})

test('voice presets: voiceConfig patches do NOT sync into active preset (manual-save)', () => {
  let cfg = applyPatch({}, { voiceConfig: { field: 'provider', value: 'indextts' } })
  cfg = applyPatch(cfg, { voiceConfig: { field: 'model', value: 'custom-tts' } })
  assert.equal(cfg.voiceConfig.model, 'custom-tts') // runtime config updated
  // Preset is NOT auto-synced
  assert.equal(cfg.voicePresets[0].config.model, '') // default, unchanged
})

// ---- v2.9.1: subtab namespaced presets + extra fields ----

test('voice subtab STT: patches target voiceConfigStt namespace, do not touch TTS', () => {
  let cfg = applyPatch({}, { voiceSubtab: 'stt', voiceConfig: { field: 'model', value: 'stt-model' } })
  assert.equal(cfg.voiceConfigStt.model, 'stt-model')
  assert.equal(cfg.voiceConfig.model, '')           // TTS untouched
  // STT preset is NOT auto-synced
  assert.equal(cfg.voicePresetsStt[0].config.model, '') // default, unchanged
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

test('applyPatch provider switch resets voiceId in runtime config (not preset)', () => {
  let cfg = applyPatch({}, { voiceConfig: { field: 'provider', value: 'mimo' } })
  cfg = applyPatch(cfg, { voiceConfig: { field: 'provider', value: 'doubao' } })
  assert.equal(cfg.voiceConfig.voiceId, 'zh_female_vv_uranus_bigtts') // runtime config updated
  // Preset is NOT auto-synced — retains its own voiceId
  const vp = (cfg.voicePresets || []).find(p => p.id === cfg.activeVoicePreset)
  assert.ok(vp, 'active preset exists')
  assert.equal(vp.config.voiceId, 'mimo_default') // default preset, unchanged
})

// ---- v2.9.8: doubao tool definitions + validation ----

test('buildCloneVoiceToolDef doubao: description mentions speaker_id', () => {
  const vc = { provider: 'doubao', voiceId: 'zh_female_vv_uranus_bigtts', model: 'seed-tts-2.0' }
  const def = buildCloneVoiceToolDef(vc)
  assert.equal(def.name, 'clone_voice')
  assert.ok(def.description.indexOf('speaker_id') >= 0 || def.description.indexOf('doubao') >= 0, 'description should mention speaker_id or doubao')
})

test('buildSpeakToolDef doubao: no voice_sample_path, description mentions speaker_id', () => {
  const vc = { provider: 'doubao', voiceId: 'zh_female_vv_uranus_bigtts', model: 'seed-tts-2.0' }
  const def = buildSpeakToolDef(vc)
  const props = def.parameters.properties
  assert.equal(props.voice_sample_path, undefined, 'doubao speak should NOT have voice_sample_path')
  assert.ok(def.description.indexOf('speaker_id') >= 0 || def.description.indexOf('doubao') >= 0, 'description should mention speaker_id or doubao')
})

test('isVoiceConfigValid doubao v1: 需要 App ID + Access Token（真实函数）', () => {
  const vc = { provider: 'doubao', model: 'seed-tts-2.0', apiVersion: 'v1', apiKey: '', appId: 'test-app-id', accessKey: 'test-access-key' }
  assert.equal(realIsVoiceConfigValid(vc), true, 'v1 + appId+accessKey 应有效')
  assert.equal(realIsVoiceConfigValid({ ...vc, accessKey: '' }), false, 'v1 缺 Access Token 应无效')
  assert.equal(realIsVoiceConfigValid({ ...vc, appId: '' }), false, 'v1 缺 App ID 应无效')
})

test('isVoiceConfigValid doubao v3: 需要 KEY（真实函数）', () => {
  const vc = { provider: 'doubao', model: 'seed-tts-2.0', apiVersion: 'v3', apiKey: 'test-key', appId: '', accessKey: '' }
  assert.equal(realIsVoiceConfigValid(vc), true, 'v3 + apiKey 应有效')
  assert.equal(realIsVoiceConfigValid({ ...vc, apiKey: '' }), false, 'v3 缺 KEY 应无效')
})

test('resolveDoubaoClonePreset: 命中预设 / S_ 兜底 / 内置音色返回 null', () => {
  const cfg = {
    activeDoubaoClonePreset: 'p1',
    doubaoClonePresets: [
      { id: 'p1', name: '预设一', speakerId: 'S_abc', cloneModel: 'seed-icl-2.0', apiVersion: 'v1', appId: 'a', accessToken: 't' },
      { id: 'p2', name: '预设二', speakerId: 'S_def', cloneModel: 'seed-icl-1.0', apiVersion: 'v3', apiKey: 'k' }
    ]
  }
  assert.equal(resolveDoubaoClonePreset('S_def', cfg).id, 'p2', '精确命中预设')
  assert.equal(resolveDoubaoClonePreset('S_unknown', cfg).id, 'p1', 'S_ 未命中 → 活动预设兜底')
  assert.equal(resolveDoubaoClonePreset('zh_female_vv_uranus_bigtts', cfg), null, '内置音色未命中 → null')
  assert.equal(resolveDoubaoClonePreset('S_x', { doubaoClonePresets: [] }), null, '无预设 → null')
})

test('runDoubaoTts V1: X-Api-App-Id + X-Api-Access-Key + Resource-Id + Request-Id 头', async () => {
  const captured = {}
  const realFetch = global.fetch
  global.fetch = async (url, opts) => {
    captured.headers = opts.headers
    return { ok: true, status: 200, body: { getReader: () => ({ read: async () => ({ done: true }) }) } }
  }
  try {
    const exec = { agent: { meta: { cwd: process.env.DSH_HOME } } }
    const vc = { provider: 'doubao', model: 'seed-tts-2.0', apiVersion: 'v1', appId: 'app-1', accessKey: 'tok-1', voiceId: 'zh_female_vv_uranus_bigtts', timeoutMs: 5000 }
    await runDoubaoTts(vc, { text: '你好' }, exec)
  } catch (e) {
    assert.ok(String(e.message || '').indexOf('未收到音频数据') >= 0, 'mock 空流应报未收到音频：' + e.message)
  } finally {
    global.fetch = realFetch
  }
  assert.equal(captured.headers['X-Api-App-Id'], 'app-1')
  assert.equal(captured.headers['X-Api-Access-Key'], 'tok-1')
  assert.equal(captured.headers['X-Api-Resource-Id'], 'seed-tts-2.0')
  assert.ok(captured.headers['X-Api-Request-Id'], '应有 X-Api-Request-Id')
  assert.equal(captured.headers['Authorization'], undefined, 'V1 合成不应使用 Bearer 头')
})

test('runDoubaoTts V3: X-Api-Key 头', async () => {
  const captured = {}
  const realFetch = global.fetch
  global.fetch = async (url, opts) => {
    captured.headers = opts.headers
    return { ok: true, status: 200, body: { getReader: () => ({ read: async () => ({ done: true }) }) } }
  }
  try {
    const exec = { agent: { meta: { cwd: process.env.DSH_HOME } } }
    const vc = { provider: 'doubao', model: 'seed-tts-2.0', apiVersion: 'v3', apiKey: 'key-1', appId: '', accessKey: '', voiceId: 'zh_female_vv_uranus_bigtts', timeoutMs: 5000 }
    await runDoubaoTts(vc, { text: '你好' }, exec)
  } catch (e) {
    assert.ok(String(e.message || '').indexOf('未收到音频数据') >= 0, 'mock 空流应报未收到音频：' + e.message)
  } finally {
    global.fetch = realFetch
  }
  assert.equal(captured.headers['X-Api-Key'], 'key-1')
  assert.equal(captured.headers['X-Api-Resource-Id'], 'seed-tts-2.0')
  assert.equal(captured.headers['X-Api-App-Id'], undefined)
})

test('applyPatch: doubaoClonePresetPatch apiKey 持久化', () => {
  let cfg = applyPatch({}, { voiceConfig: { field: 'provider', value: 'doubao' } })
  assert.ok(Array.isArray(cfg.doubaoClonePresets) && cfg.doubaoClonePresets.length > 0, 'presets auto-created')
  cfg = applyPatch(cfg, { doubaoClonePresetPatch: { apiKey: 'preset-key-1', apiVersion: 'v3' } })
  assert.equal(cfg.doubaoClonePresets[0].apiKey, 'preset-key-1')
  assert.equal(cfg.doubaoClonePresets[0].apiVersion, 'v3')
})

// ---- v2.10: local voice provider tests ----

function mockBlobResp() {
  return { ok: true, status: 200, text: async () => '', blob: async () => new Blob([Buffer.from('fake-audio')]), json: async () => ({}) }
}

test('runIndexTts: POST /api/v1/tts/tasks with prompt_audio + Bearer auth', async () => {
  const captured = {}
  const realFetch = global.fetch
  global.fetch = async (url, opts) => { captured.url = url; captured.body = JSON.parse(opts.body); captured.headers = opts.headers; return mockBlobResp() }
  try {
    const exec = { agent: { meta: { cwd: process.env.DSH_HOME } } }
    const vc = { provider: 'indextts', apiKey: 'sk-test', voiceId: 'voice1', timeoutMs: 5000 }
    await runIndexTts(vc, { text: '你好', voice: 'voice1' }, exec)
  } finally { global.fetch = realFetch }
  assert.ok(captured.url.indexOf('/api/v1/tts/tasks') >= 0, 'URL should contain /api/v1/tts/tasks')
  assert.equal(captured.body.prompt_audio, 'voice1')
  assert.equal(captured.body.text, '你好')
  assert.equal(captured.headers['Authorization'], 'Bearer sk-test')
})

test('runIndexTts: no Bearer header when apiKey empty', async () => {
  const captured = {}
  const realFetch = global.fetch
  global.fetch = async (url, opts) => { captured.headers = opts.headers; return mockBlobResp() }
  try {
    const exec = { agent: { meta: { cwd: process.env.DSH_HOME } } }
    await runIndexTts({ provider: 'indextts', voiceId: 'v1', timeoutMs: 5000 }, { text: 'test' }, exec)
  } finally { global.fetch = realFetch }
  assert.equal(captured.headers['Authorization'], undefined)
})

test('runIndexTts: throws on empty text', async () => {
  try { await runIndexTts({ provider: 'indextts', voiceId: 'v1' }, {}, {}) } catch (e) {
    assert.ok(String(e.message).indexOf('text') >= 0); return
  }
  assert.fail('should throw')
})

test('runIndexTts: emo_text from style when style provided', async () => {
  const captured = {}
  const realFetch = global.fetch
  global.fetch = async (url, opts) => { captured.body = JSON.parse(opts.body); return mockBlobResp() }
  try {
    const exec = { agent: { meta: { cwd: process.env.DSH_HOME } } }
    await runIndexTts({ provider: 'indextts', voiceId: 'v1', timeoutMs: 5000 }, { text: '你好', style: '温柔' }, exec)
  } finally { global.fetch = realFetch }
  assert.equal(captured.body.emo_control_method, 3)
  assert.equal(captured.body.emo_text, '温柔')
})

test('doIndexTtsClone: POST /api/v1/upload with FormData', async () => {
  const captured = {}
  const realFetch = global.fetch
  global.fetch = async (url, opts) => { captured.url = url; captured.body = opts.body; return { ok: true, status: 200, text: async () => '', json: async () => ({ voice_id: 'uploaded_voice' }) } }
  try {
    const tmpFile = join(process.env.DSH_HOME, 'test_ref.wav')
    writeFileSync(tmpFile, Buffer.from('fake-audio'))
    const r = await doIndexTtsClone({ provider: 'indextts', apiKey: 'sk-test' }, tmpFile, {})
    assert.equal(r.voice_id, 'uploaded_voice')
  } finally { global.fetch = realFetch }
  assert.ok(captured.url.indexOf('/api/v1/upload') >= 0)
  assert.ok(captured.body instanceof FormData, 'body should be FormData')
})

test('runGptSovits: POST /infer_classic with app_key in body (not header)', async () => {
  const captured = {}
  const realFetch = global.fetch
  global.fetch = async (url, opts) => { captured.url = url; captured.body = JSON.parse(opts.body); captured.headers = opts.headers; return mockBlobResp() }
  try {
    const exec = { agent: { meta: { cwd: process.env.DSH_HOME } } }
    const vc = { provider: 'gptsovits', apiKey: 'gsv-key', gptModel: 'model.ckpt', sovitsModel: 'model.pth', refAudioPath: 'custom_refs/test.wav', refText: '参考', timeoutMs: 5000 }
    await runGptSovits(vc, { text: '你好' }, exec)
  } finally { global.fetch = realFetch }
  assert.ok(captured.url.indexOf('/infer_classic') >= 0)
  assert.equal(captured.body.app_key, 'gsv-key', 'app_key should be in body')
  assert.equal(captured.headers['Authorization'], undefined, 'no Authorization header for GSV')
  assert.equal(captured.body.gpt_model_name, 'model.ckpt')
  assert.equal(captured.body.sovits_model_name, 'model.pth')
  assert.equal(captured.body.ref_audio_path, 'custom_refs/test.wav')
  assert.equal(captured.body.prompt_text, '参考')
})

test('runGptSovits: version parsing "v4::model.ckpt" → version=v4, name=model.ckpt', async () => {
  const captured = {}
  const realFetch = global.fetch
  global.fetch = async (url, opts) => { captured.body = JSON.parse(opts.body); return mockBlobResp() }
  try {
    const exec = { agent: { meta: { cwd: process.env.DSH_HOME } } }
    await runGptSovits({ provider: 'gptsovits', gptModel: 'v4::model.ckpt', sovitsModel: 'v4::model.pth', refAudioPath: 'test.wav', refText: 'ref', timeoutMs: 5000 }, { text: 'hi' }, exec)
  } finally { global.fetch = realFetch }
  assert.equal(captured.body.version, 'v4')
  assert.equal(captured.body.gpt_model_name, 'model.ckpt')
  assert.equal(captured.body.sovits_model_name, 'model.pth')
})

test('runGptSovits: path auto-complete "test.wav" → "custom_refs/test.wav"', async () => {
  const captured = {}
  const realFetch = global.fetch
  global.fetch = async (url, opts) => { captured.body = JSON.parse(opts.body); return mockBlobResp() }
  try {
    const exec = { agent: { meta: { cwd: process.env.DSH_HOME } } }
    await runGptSovits({ provider: 'gptsovits', gptModel: 'm', sovitsModel: 's', refAudioPath: 'test.wav', refText: 'r', timeoutMs: 5000 }, { text: 'hi' }, exec)
  } finally { global.fetch = realFetch }
  assert.equal(captured.body.ref_audio_path, 'custom_refs/test.wav')
})

test('runGptSovits: throws on missing gptModel', async () => {
  try { await runGptSovits({ provider: 'gptsovits' }, { text: 'hi' }, {}) } catch (e) {
    assert.ok(String(e.message).indexOf('GPT') >= 0); return
  }
  assert.fail('should throw')
})

test('runVoxCpm clone mode: POST /v1/audio/clone with reference_wav_path', async () => {
  const captured = {}
  const realFetch = global.fetch
  global.fetch = async (url, opts) => { captured.url = url; captured.body = JSON.parse(opts.body); captured.headers = opts.headers; return mockBlobResp() }
  try {
    const exec = { agent: { meta: { cwd: process.env.DSH_HOME } } }
    const vc = { provider: 'voxcpm', mode: 'clone', apiKey: 'vox-key', voiceId: 'ref.wav', timeoutMs: 5000 }
    await runVoxCpm(vc, { text: '你好', voice: 'ref.wav' }, exec)
  } finally { global.fetch = realFetch }
  assert.ok(captured.url.indexOf('/v1/audio/clone') >= 0)
  assert.equal(captured.body.reference_wav_path, 'ref.wav')
  assert.equal(captured.headers['X-API-Key'], 'vox-key', 'should use X-API-Key not Bearer')
  assert.equal(captured.headers['Authorization'], undefined, 'no Bearer for VoxCPM')
})

test('runVoxCpm design mode: POST /v1/audio/design without reference_wav_path', async () => {
  const captured = {}
  const realFetch = global.fetch
  global.fetch = async (url, opts) => { captured.url = url; captured.body = JSON.parse(opts.body); return mockBlobResp() }
  try {
    const exec = { agent: { meta: { cwd: process.env.DSH_HOME } } }
    const vc = { provider: 'voxcpm', mode: 'design', voiceId: '', timeoutMs: 5000 }
    await runVoxCpm(vc, { text: '你好', style: '年轻女性' }, exec)
  } finally { global.fetch = realFetch }
  assert.ok(captured.url.indexOf('/v1/audio/design') >= 0)
  assert.equal(captured.body.reference_wav_path, undefined, 'design mode should not have reference_wav_path')
  assert.equal(captured.body.text, '(年轻女性) 你好', 'instruction prefix prepended')
})

test('doVoxCpmClone: POST /v1/audio/upload with FormData + X-API-Key', async () => {
  const captured = {}
  const realFetch = global.fetch
  global.fetch = async (url, opts) => { captured.url = url; captured.body = opts.body; captured.headers = opts.headers; return { ok: true, status: 200, text: async () => '', json: async () => ({ path: 'uploaded.wav' }) } }
  try {
    const tmpFile = join(process.env.DSH_HOME, 'vox_ref.wav')
    writeFileSync(tmpFile, Buffer.from('fake'))
    const r = await doVoxCpmClone({ provider: 'voxcpm', apiKey: 'vox-key' }, tmpFile, {})
    assert.equal(r.voice_id, 'uploaded.wav')
  } finally { global.fetch = realFetch }
  assert.ok(captured.url.indexOf('/v1/audio/upload') >= 0)
  assert.ok(captured.body instanceof FormData)
  assert.equal(captured.headers['X-API-Key'], 'vox-key')
})

test('runTtsWebui: POST /v1/audio/speech with model, input, voice, response_format', async () => {
  const captured = {}
  const realFetch = global.fetch
  global.fetch = async (url, opts) => { captured.url = url; captured.body = JSON.parse(opts.body); captured.headers = opts.headers; return mockBlobResp() }
  try {
    const exec = { agent: { meta: { cwd: process.env.DSH_HOME } } }
    const vc = { provider: 'tts-webui', endpoint: 'http://localhost:7778', apiKey: 'sk-test', model: 'bark', voiceId: 'speaker1', outputFormat: 'wav', timeoutMs: 5000 }
    await runTtsWebui(vc, { text: '你好' }, exec)
  } finally { global.fetch = realFetch }
  assert.ok(captured.url.indexOf('/v1/audio/speech') >= 0)
  assert.equal(captured.body.model, 'bark')
  assert.equal(captured.body.input, '你好')
  assert.equal(captured.body.voice, 'speaker1')
  assert.equal(captured.body.response_format, 'wav')
  assert.equal(captured.headers['Authorization'], 'Bearer sk-test')
})

test('runTtsWebui: throws on empty endpoint', async () => {
  try { await runTtsWebui({ provider: 'tts-webui', endpoint: '', model: 'bark', voiceId: 'v1' }, { text: 'hi' }, {}) } catch (e) {
    assert.ok(String(e.message).indexOf('endpoint') >= 0); return
  }
  assert.fail('should throw')
})

test('buildSpeakToolDef indextts: description mentions indextts', () => {
  const def = buildSpeakToolDef({ provider: 'indextts', voiceId: 'voice1', model: 'default' })
  assert.ok(def.description.indexOf('indextts') >= 0)
  assert.ok(def.description.indexOf('参考音色') >= 0)
})

test('buildSpeakToolDef gptsovits: description mentions gptsovits + gptModel', () => {
  const def = buildSpeakToolDef({ provider: 'gptsovits', gptModel: 'model.ckpt', sovitsModel: 'model.pth', model: '' })
  assert.ok(def.description.indexOf('gptsovits') >= 0)
  assert.ok(def.description.indexOf('参考音频路径') >= 0)
})

test('buildSpeakToolDef voxcpm: description mentions voxcpm + mode', () => {
  const def = buildSpeakToolDef({ provider: 'voxcpm', mode: 'clone', model: 'default' })
  assert.ok(def.description.indexOf('voxcpm') >= 0)
  assert.ok(def.description.indexOf('clone') >= 0)
})

test('buildSpeakToolDef tts-webui: description mentions tts-webui', () => {
  const def = buildSpeakToolDef({ provider: 'tts-webui', model: 'bark', voiceId: 'v1' })
  assert.ok(def.description.indexOf('tts-webui') >= 0)
})

test('buildCloneVoiceToolDef indextts: description mentions indextts upload', () => {
  const def = buildCloneVoiceToolDef({ provider: 'indextts', voiceId: 'v1', model: 'default' })
  assert.ok(def.description.indexOf('indextts') >= 0)
  assert.ok(def.description.indexOf('上传') >= 0)
})

test('buildCloneVoiceToolDef gptsovits: description mentions inline clone', () => {
  const def = buildCloneVoiceToolDef({ provider: 'gptsovits', gptModel: 'm', sovitsModel: 's', model: '' })
  assert.ok(def.description.indexOf('gptsovits') >= 0)
  assert.ok(def.description.indexOf('确认') >= 0)
})

test('buildCloneVoiceToolDef voxcpm: description mentions voxcpm upload', () => {
  const def = buildCloneVoiceToolDef({ provider: 'voxcpm', mode: 'clone', model: 'default' })
  assert.ok(def.description.indexOf('voxcpm') >= 0)
})

// ---- v2.11: runtime config source-of-truth tests ----

test('voice normalizeConfig: runtime voiceConfig sourced from src.voiceConfig (not preset)', () => {
  const src = {
    voiceConfig: { provider: 'minimax', apiKey: 'sk-mm', model: 'speech-2.8-hd' },
    voicePresets: [
      { id: 'p1', name: '默认', config: { provider: 'mimo', apiKey: 'sk-mimo', model: 'mimo-v2.5-tts' } }
    ]
  }
  const cfg = applyPatch(src, {})
  // Runtime config = src.voiceConfig
  assert.equal(cfg.voiceConfig.provider, 'minimax')
  assert.equal(cfg.voiceConfig.model, 'speech-2.8-hd')
  // Preset retains its own config
  assert.equal(cfg.voicePresets[0].config.provider, 'mimo')
})

test('imggen normalizeConfig: runtime imggenConfig sourced from src.imggenConfig (not preset)', () => {
  const src = {
    imggenConfig: { provider: 'openai', model: 'gpt-image-1', apiKey: 'sk-x' },
    imggenPresets: [
      { id: 'p1', name: '默认', config: { provider: 'bailian', model: 'wanx' } }
    ]
  }
  const cfg = applyPatch(src, {})
  assert.equal(cfg.imggenConfig.provider, 'openai')
  assert.equal(cfg.imggenConfig.model, 'gpt-image-1')
  assert.equal(cfg.imggenPresets[0].config.provider, 'bailian')
})

test('saveImggenPreset: copies imggenConfig → active preset', () => {
  let cfg = applyPatch({}, {})
  // Modify imggenConfig
  cfg = applyPatch(cfg, { imggenConfig: { field: 'model', value: 'gpt-image-2' } })
  // Save to preset
  cfg = applyPatch(cfg, { saveImggenPreset: true })
  assert.equal(cfg.imggenPresets[0].config.model, 'gpt-image-2')
})

test('saveVoicePreset: copies voiceConfig → active preset', () => {
  let cfg = applyPatch({}, {})
  cfg = applyPatch(cfg, { voiceConfig: { field: 'model', value: 'mimo-v2.5-tts-voiceclone' } })
  cfg = applyPatch(cfg, { saveVoicePreset: 'tts' })
  assert.equal(cfg.voicePresets[0].config.model, 'mimo-v2.5-tts-voiceclone')
})

test('saveVoicePreset: STT variant copies voiceConfigStt → active STT preset', () => {
  let cfg = applyPatch({}, {})
  cfg = applyPatch(cfg, { voiceSubtab: 'stt', voiceConfig: { field: 'model', value: 'stt-model-x' } })
  cfg = applyPatch(cfg, { saveVoicePreset: 'stt' })
  assert.equal(cfg.voicePresetsStt[0].config.model, 'stt-model-x')
})
