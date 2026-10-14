// stt-conflict.test.js — STT-first conflict gate: pre-execute deny + media
// description + askMedia body guard (Task 4)
// Harness mirrors tests/stt-config.test.js: node:test + dynamic import +
// DSH_HOME / config-dir mkdtemp.
// Coverage: the pure gate `sttAudioDenyReason` (7 required assertions) plus the
// registered `tools/pre-execute` listener grabbed from a fakeCtx (mirror of
// tests/analyze-media-gate.test.js:48 `on:` collector) — apply() on a fakeCtx
// with a valid STT config boots syncToolRegistration, which sets sttVisible and
// registers the listener, so no real harness is needed.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dshHome = mkdtempSync(join(tmpdir(), 'omni-workstation-stt-conflict-'))
process.env.DSH_HOME = dshHome
process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR = dshHome

const { apply, _resetMedia, _resetStt, buildMediaToolDef, sttAudioDenyReason, askMedia, defaultSttConfig } = await import('../lib/index.js')

const writeCfg = (obj) => writeFileSync(join(dshHome, 'omni-vision.json'), JSON.stringify(obj))

function makeFakeCtx() {
  const registered = []
  const listeners = new Map()
  const routes = []
  return {
    registered,
    listeners,
    routes,
    get: (name) => {
      if (name === 'webServer') return { register: (route) => { routes.push(route); return () => {} } }
      return undefined
    },
    tools: {
      register: (def) => {
        registered.push(def)
        return () => { const i = registered.indexOf(def); if (i >= 0) registered.splice(i, 1) }
      }
    },
    llm: {
      listProviders: () => [],
      registerAdapter: () => () => {},
      registration: () => { throw new Error('no source') },
      stream: async function* () {},
      on: () => {},
      effect: () => {}
    },
    logger: { warn: () => {} },
    on: (event, fn) => listeners.set(event, fn),
    effect: (fn) => fn()
  }
}

const waitFor = async (fn, timeout = 3000) => {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (fn()) return
    await new Promise((r) => setTimeout(r, 10))
  }
  throw new Error('waitFor timeout')
}
const names = (ctx) => ctx.registered.map((d) => d && d.name).filter(Boolean)
const descs = (ctx, name) => ctx.registered.filter((d) => d && d.name === name).map((d) => d.description)

const card = (over) => Object.assign({
  id: 'c_' + Math.random().toString(36).slice(2),
  name: 'Test', provider: 'custom', protocol: 'openai-completions',
  endpoint: 'http://127.0.0.1:9/v1', apiKey: 'sk-test', model: 'test-model'
}, over)

const STT_ON = defaultSttConfig()
STT_ON.provider = 'openai'
STT_ON.apiKey = 'sk-stt'
STT_ON.model = 'whisper-1'

const BASE_CFG = (extra) => Object.assign({
  retryCount: 1,
  apis: [card({ video: true }), card({ audio: true })],
  fallbackConfig: { provider: 'ovhcloud', models: [], timeoutMs: 1000 },
  globalConfig: { retryStatusCodes: '429', backoffBase: 1, backoff429Base: 1, backoffMax: 1, backoff429Max: 1 }
}, extra || {})

const CFG_STT_ON = BASE_CFG({ voiceEnabled: true, sttEnabled: true, voiceConfigStt: STT_ON })

// ---------- 1-5: sttAudioDenyReason ----------

test('1. audio path (.mp3) is denied with a transcribe hint', () => {
  const r = sttAudioDenyReason(true, 'analyze_media', { media_path: 'a.mp3' }, [])
  assert.ok(r.includes('transcribe'), 'reason must name the transcribe tool')
  assert.ok(r.includes('a.mp3'))
})

test('2. video path (.mp4) is NOT denied', () => {
  assert.equal(sttAudioDenyReason(true, 'analyze_media', { media_path: 'a.mp4' }, []), '')
  assert.equal(sttAudioDenyReason(true, 'analyze_media', { media_path: 'a.mov' }, []), '')
})

test('3. unknown extension (.bin) falls through to the body gate', () => {
  assert.equal(sttAudioDenyReason(true, 'analyze_media', { media_path: 'a.bin' }, []), '')
})

test('4. STT off → no denial (zero behavior change)', () => {
  assert.equal(sttAudioDenyReason(false, 'analyze_media', { media_path: 'a.mp3' }, []), '')
  // also: other tools are never denied even when STT is on
  assert.equal(sttAudioDenyReason(true, 'speak', { media_path: 'a.mp3' }, []), '')
})

test('5. attachment: an uploaded audio file is denied with attachment_id guidance', () => {
  const events = [{
    type: 'user/message',
    data: { content: [{ type: 'file', attachment: { attachmentId: 'sha256:abc', name: 'v.mp3' } }] }
  }]
  const r = sttAudioDenyReason(true, 'analyze_media', { attachment_id: 'sha256:abc' }, events)
  assert.ok(r.includes('attachment_id'))
  assert.ok(r.includes('transcribe'))
  // unknown id → allow
  assert.equal(sttAudioDenyReason(true, 'analyze_media', { attachment_id: 'sha256:zzz' }, events), '')
})

// ---------- 6: description flip ----------

test('6. buildMediaToolDef: sttActive appends transcribe guidance, false keeps the original text', () => {
  const on = buildMediaToolDef(true)
  const off = buildMediaToolDef(false)
  assert.ok(on.description.includes('transcribe'))
  assert.ok(on.description.includes('视频'))
  assert.ok(!off.description.includes('transcribe'))
  assert.ok(on.description.startsWith(off.description), 'the original text is preserved verbatim as a prefix')
})

// ---------- 7: askMedia body guard (video untouched) ----------

test('7. askMedia: audio rejected when STT on; video path unaffected', async () => {
  const cfgOn = { voiceEnabled: true, sttEnabled: true, voiceConfigStt: STT_ON, apis: [] }
  const buf = Buffer.alloc(32)
  await assert.rejects(
    () => askMedia(null, cfgOn, buf, 'audio/mpeg', 'audio', 'q', {}),
    (e) => { assert.ok(e.message.includes('transcribe'), 'audio must be rejected with a transcribe hint'); return true }
  )
  // video: the guard does not fire — with no cards it fails on the modality error
  await assert.rejects(
    () => askMedia(null, cfgOn, buf, 'video/mp4', 'video', 'q', {}),
    /没有开启视频模态的模型卡片/
  )
  // STT off: audio is not rejected by the guard (same no-cards error instead)
  const cfgOff = { voiceEnabled: false, sttEnabled: false, voiceConfigStt: defaultSttConfig(), apis: [] }
  await assert.rejects(
    () => askMedia(null, cfgOff, buf, 'audio/mpeg', 'audio', 'q', {}),
    (e) => { assert.ok(!e.message.includes('transcribe'), 'STT off → askMedia audio guard inert'); return true }
  )
})

// ---------- registration: description follows the STT flag ----------

test('registration: analyze_media description flips to video-only while STT is valid', async () => {
  _resetMedia()
  _resetStt()
  writeCfg(CFG_STT_ON)
  const ctx = makeFakeCtx()
  apply(ctx)
  await waitFor(() => names(ctx).includes('analyze_media') && names(ctx).includes('transcribe'))
  const d = descs(ctx, 'analyze_media')
  assert.equal(d.length, 1)
  assert.ok(d[0].includes('transcribe'), 'STT on → registered description must carry the transcribe notice')

  // flip STT off → re-registered with the original description
  _resetMedia()
  _resetStt()
  writeCfg(BASE_CFG({ voiceEnabled: true, sttEnabled: false, voiceConfigStt: STT_ON }))
  const ctx2 = makeFakeCtx()
  apply(ctx2)
  await waitFor(() => names(ctx2).includes('analyze_media'))
  const d2 = descs(ctx2, 'analyze_media')
  assert.equal(d2.length, 1)
  assert.ok(!d2[0].includes('transcribe'), 'STT off → description must not carry the transcribe notice')
})

// ---------- listener level: tools/pre-execute deny / allow ----------

test('tools/pre-execute listener: denies analyze_media audio, allows video', async () => {
  _resetMedia()
  _resetStt()
  writeCfg(CFG_STT_ON)
  const ctx = makeFakeCtx()
  apply(ctx)
  await waitFor(() => names(ctx).includes('transcribe')) // sttVisible set
  const fn = ctx.listeners.get('tools/pre-execute')
  assert.equal(typeof fn, 'function', 'listener must be registered on tools/pre-execute')

  const allowed = { kind: 'allow' }
  const next = async () => allowed

  const denied = await fn({ name: 'analyze_media', arguments: { media_path: 'voice.mp3' }, agent: { session: { events: [] } } }, next)
  assert.equal(denied.kind, 'deny')
  assert.ok(denied.reason.includes('transcribe'))

  const video = await fn({ name: 'analyze_media', arguments: { media_path: 'clip.mp4' }, agent: { session: { events: [] } } }, next)
  assert.equal(video, allowed, 'video must pass straight through to next()')

  const other = await fn({ name: 'speak', arguments: { text: 'hi' }, agent: { session: { events: [] } } }, next)
  assert.equal(other, allowed, 'other tools must pass through')
})
