// protocol-media-body.test.js — T7: video/audio request bodies per protocol.
// Shapes are the ones the T1 probe measured on the real Gemini card
// (.omo/evidence/task-1-omni-modality-media-display.md); nothing here is invented.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

process.env.DSH_HOME = mkdtempSync(join(tmpdir(), 'omni-workstation-home-'))
process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR = mkdtempSync(join(tmpdir(), 'omni-workstation-cfg-'))

const { protocolMediaBody, protocolBody } = await import('../lib/index.js')

const card = (protocol, extra) => Object.assign(
  { id: 'c1', name: 'Gemini', provider: 'custom', protocol, endpoint: 'https://x/v1', apiKey: 'k', model: 'm1' },
  extra || {}
)

const VIDEO_B64 = 'AAAAVIDEO'
const VIDEO_URL = 'data:video/mp4;base64,' + VIDEO_B64
const AUDIO_B64 = 'AAAAAUDIO'
const Q = 'describe this'

// ---- openai-completions: video ----

test('openai-completions video rides as image_url with a data:video URL (never video_url)', () => {
  const b = protocolMediaBody(card('openai-completions'), Q, VIDEO_URL, 'video/mp4', VIDEO_B64, 'video')
  assert.ok(b)
  assert.equal(b.model, 'm1')
  assert.equal(b.stream, false)
  assert.equal(b.max_tokens, 32768)
  assert.equal(b.messages.length, 1)
  assert.equal(b.messages[0].role, 'user')
  const content = b.messages[0].content
  assert.equal(content.length, 2)
  assert.deepEqual(content[0], { type: 'text', text: Q })
  assert.deepEqual(content[1], { type: 'image_url', image_url: { url: VIDEO_URL } })
  assert.ok(!JSON.stringify(b).includes('video_url'), 'video_url block must never be emitted')
})

test('openai-completions video honors card.maxOutput instead of a hardcoded budget', () => {
  const b = protocolMediaBody(card('openai-completions', { maxOutput: 512 }), Q, VIDEO_URL, 'video/mp4', VIDEO_B64, 'video')
  assert.equal(b.max_tokens, 512)
})

// ---- openai-completions: audio ----

test('openai-completions audio uses input_audio {data, format:"wav"} for audio/wav', () => {
  const b = protocolMediaBody(card('openai-completions'), Q, '', 'audio/wav', AUDIO_B64, 'audio')
  assert.deepEqual(b.messages[0].content[1], {
    type: 'input_audio',
    input_audio: { data: AUDIO_B64, format: 'wav' }
  })
})

test('audio format derives from mime: mpeg and mp3 -> mp3', () => {
  for (const mime of ['audio/mpeg', 'audio/mp3']) {
    const b = protocolMediaBody(card('openai-completions'), Q, '', mime, AUDIO_B64, 'audio')
    assert.equal(b.messages[0].content[1].input_audio.format, 'mp3', mime)
  }
})

test('audio format falls back to wav for unknown/empty mime', () => {
  for (const mime of ['audio/x-foo', '', undefined]) {
    const b = protocolMediaBody(card('openai-completions'), Q, '', mime, AUDIO_B64, 'audio')
    assert.equal(b.messages[0].content[1].input_audio.format, 'wav', String(mime))
  }
})

// ---- google-gemini ----

test('google-gemini video uses inline_data with the raw mime', () => {
  const b = protocolMediaBody(card('google-gemini'), Q, VIDEO_URL, 'video/mp4', VIDEO_B64, 'video')
  assert.deepEqual(b.contents[0].parts[0], { text: Q })
  assert.deepEqual(b.contents[0].parts[1], { inline_data: { mime_type: 'video/mp4', data: VIDEO_B64 } })
  assert.equal(b.generationConfig.maxOutputTokens, 32768)
})

test('google-gemini audio uses the same inline_data shape with an audio mime', () => {
  const b = protocolMediaBody(card('google-gemini'), Q, '', 'audio/wav', AUDIO_B64, 'audio')
  assert.deepEqual(b.contents[0].parts[1], { inline_data: { mime_type: 'audio/wav', data: AUDIO_B64 } })
})

// ---- unproven protocols are refused, not guessed ----

test('openai-responses returns null for both kinds (not probed)', () => {
  assert.equal(protocolMediaBody(card('openai-responses'), Q, VIDEO_URL, 'video/mp4', VIDEO_B64, 'video'), null)
  assert.equal(protocolMediaBody(card('openai-responses'), Q, '', 'audio/wav', AUDIO_B64, 'audio'), null)
})

test('anthropic-messages returns null for both kinds (not probed)', () => {
  assert.equal(protocolMediaBody(card('anthropic-messages'), Q, VIDEO_URL, 'video/mp4', VIDEO_B64, 'video'), null)
  assert.equal(protocolMediaBody(card('anthropic-messages'), Q, '', 'audio/wav', AUDIO_B64, 'audio'), null)
})

test('unknown protocol and bogus kind return null', () => {
  assert.equal(protocolMediaBody(card('zzz-bogus'), Q, VIDEO_URL, 'video/mp4', VIDEO_B64, 'video'), null)
  assert.equal(protocolMediaBody(card('openai-completions'), Q, VIDEO_URL, 'video/mp4', VIDEO_B64, 'image'), null)
  assert.equal(protocolMediaBody(card('openai-completions'), Q, VIDEO_URL, 'video/mp4', VIDEO_B64), null)
})

// ---- the image path must be untouched ----

test('protocolBody (image) is unchanged by the media builder', () => {
  const b = protocolBody(card('openai-completions'), Q, 'data:image/png;base64,IMG', 'image/png', 'IMG')
  assert.deepEqual(b.messages[0].content[1], { type: 'image_url', image_url: { url: 'data:image/png;base64,IMG' } })
  assert.equal(b.max_tokens, 32768)
})
