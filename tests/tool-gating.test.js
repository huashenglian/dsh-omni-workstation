// tool-gating.test.js — v2.15: modules default ON, tools only when configured.
// D2 (user decision): the built-in keyless fallback models count as a valid VLM
// channel, so a fresh install can use analyze_image for free without any card.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

process.env.DSH_HOME = mkdtempSync(join(tmpdir(), 'omni-workstation-gating-'))
process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR = mkdtempSync(join(tmpdir(), 'omni-workstation-gcfg-'))

const {
  normalizeConfig, applyPatch,
  hasVlmCards, hasVlmChannel, isVlmLive, isImggenLive, videoLiveCards, isVideoLive,
  isVoiceLive, isSttLive, isMediaLive, toolkitToolNames,
  resolveVerifyReminderMode,
} = await import('../lib/index.js')

const CARD = {
  id: 'c1', name: 'T', provider: 'custom', protocol: 'openai-completions',
  endpoint: 'https://example.invalid/v1', apiKey: 'sk-x', model: 'vlm', enabled: true,
}
const STT_VALID = {
  provider: 'custom', protocol: 'openai-stt', endpoint: 'https://stt.invalid/v1',
  apiKey: 'sk-stt', model: 'whisper-1',
}

const ALL_LOCAL = ['image_diff', 'sample_colors', 'show_image', 'show_video', 'zoom_image']
const ALL_TOOLS = [...ALL_LOCAL, 'detect_elements', 'ocr_image'].sort()

test('fresh config: modules default ON, auto-vision OFF, STT OFF', () => {
  const cfg = normalizeConfig({})
  assert.equal(cfg.vlmEnabled, true)
  assert.equal(cfg.imggenEnabled, true)
  assert.equal(cfg.videoEnabled, true)
  assert.equal(cfg.voiceEnabled, true)
  assert.equal(cfg.ttsEnabled, true)
  assert.equal(cfg.sttEnabled, false)
  assert.equal(cfg.visionToolsEnabled, true)
  assert.equal(cfg.mirrorConfig.autoVisionEnabled, false)
})

test('D2: fallback models are a valid VLM channel even with zero cards', () => {
  const cfg = normalizeConfig({})
  assert.equal(hasVlmCards(cfg), false)
  assert.equal(hasVlmChannel(cfg), true, 'default fallback models ship with the config')
  assert.equal(isVlmLive(cfg), true)
  assert.deepEqual(toolkitToolNames(cfg).sort(), ALL_TOOLS)
})

test('no cards + no fallback: VLM tools and ocr/detect are not live', () => {
  const cfg = normalizeConfig({ fallbackConfig: { provider: 'ovhcloud', models: [] } })
  assert.equal(hasVlmChannel(cfg), false)
  assert.equal(isVlmLive(cfg), false)
  assert.deepEqual(toolkitToolNames(cfg).sort(), ALL_LOCAL)
})

test('one complete card: VLM live and ocr/detect join the toolkit', () => {
  const cfg = normalizeConfig({ apis: [CARD], fallbackConfig: { models: [] } })
  assert.equal(hasVlmCards(cfg), true)
  assert.equal(isVlmLive(cfg), true)
  assert.deepEqual(toolkitToolNames(cfg).sort(), ALL_TOOLS)
})

test('explicit module off wins even with a complete config', () => {
  const cfg = normalizeConfig({ vlmEnabled: false, apis: [CARD] })
  assert.equal(isVlmLive(cfg), false)
})

test('toolkit honors per-tool toggles and the master switch', () => {
  let cfg = applyPatch({ apis: [CARD] }, { visionToolToggle: { tool: 'zoom_image', value: false } })
  assert.deepEqual(toolkitToolNames(cfg).sort(), ['detect_elements', 'image_diff', 'ocr_image', 'sample_colors', 'show_image', 'show_video'].sort())
  cfg = applyPatch(cfg, { visionToolsEnabled: false })
  assert.deepEqual(toolkitToolNames(cfg), [])
})

test('imggen / video / voice / stt gates require complete configs', () => {
  let cfg = normalizeConfig({})
  assert.equal(isImggenLive(cfg), false)
  assert.equal(isVideoLive(cfg), false)
  assert.equal(videoLiveCards(cfg).length, 0)
  assert.equal(isVoiceLive(cfg), false)
  assert.equal(isSttLive(cfg), false)

  cfg = applyPatch(cfg, { imggenConfig: { field: 'endpoint', value: 'https://img.invalid/v1' } })
  cfg = applyPatch(cfg, { imggenConfig: { field: 'model', value: 'gpt-image-1' } })
  cfg = applyPatch(cfg, { imggenConfig: { field: 'apiKey', value: 'sk-img' } })
  assert.equal(isImggenLive(cfg), true)

  const cid = cfg.videoCards[0].id
  cfg = applyPatch(cfg, {
    videoCardPatch: { id: cid, field: 'provider', value: 'agnes-cn' },
    saveVideoCardPreset: { cardId: cid },
  })
  cfg = applyPatch(cfg, { videoCardPatch: { id: cid, field: 'apiKey', value: 'sk-v' }, saveVideoCardPreset: { cardId: cid } })
  cfg = applyPatch(cfg, { videoCardPatch: { id: cid, field: 'model', value: 'v-model' }, saveVideoCardPreset: { cardId: cid } })
  assert.equal(isVideoLive(cfg), true)
  assert.equal(videoLiveCards(cfg).length, 1)

  cfg = applyPatch(cfg, { voiceConfig: { field: 'apiKey', value: 'sk-voice' } })
  cfg = applyPatch(cfg, { voiceConfig: { field: 'model', value: 'mimo-v2.5-tts' } })
  assert.equal(isVoiceLive(cfg), true)

  cfg = applyPatch(cfg, { sttEnabled: true, voiceConfigStt: STT_VALID })
  assert.equal(isSttLive(cfg), true)
})

test('analyze_media is live only for protocol-capable card modalities', () => {
  let cfg = normalizeConfig({ apis: [{ ...CARD, video: true }], fallbackConfig: { models: [] } })
  assert.equal(isMediaLive(cfg), true)
  cfg = normalizeConfig({ apis: [{ ...CARD, video: false, audio: false }], fallbackConfig: { models: [] } })
  assert.equal(isMediaLive(cfg), false)
})

test('verify reminder never points at an unavailable path', () => {
  const cfg = normalizeConfig({ globalConfig: { verifyReminder: true } })
  assert.equal(resolveVerifyReminderMode(cfg, false, false), '')
  assert.equal(resolveVerifyReminderMode(cfg, true, false), 'analyze_image')
  assert.equal(resolveVerifyReminderMode(cfg, false, true), 'native_vision')
})