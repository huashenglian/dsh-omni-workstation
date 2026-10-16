// tts-route.test.js — POST /omni/tts/test (v2.13.1, T4)
// Drives the captured route handler from a fakeCtx (apply() capture pattern of
// tests/stt-routes.test.js) with mocked global.fetch (blob pattern of
// tests/voice.test.js). Asserts: base64 round-trip, temp-dir file deletion
// (no residue), 400s, 405.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'

const dshHome = mkdtempSync(join(tmpdir(), 'omni-workstation-tts-route-'))
process.env.DSH_HOME = dshHome
process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR = dshHome

const { apply } = await import('../lib/index.js')

const writeCfg = (obj) => writeFileSync(join(dshHome, 'omni-vision.json'), JSON.stringify(obj))

const TTS_TMP_DIR = join(tmpdir(), 'omni-tts-test')

function makeFakeCtx() {
  const routes = []
  return {
    routes,
    get: (name) => {
      if (name === 'webServer') return { register: (route) => { routes.push(route); return () => {} } }
      return undefined
    },
    tools: { register: () => () => {} },
    llm: {
      listProviders: () => [],
      registerAdapter: () => () => {},
      registration: () => { throw new Error('no source') },
      stream: async function* () {},
      on: () => {},
      effect: () => {}
    },
    logger: { warn: () => {} },
    on: () => {},
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

async function bootRoute(cfg, path) {
  writeCfg(cfg)
  const ctx = makeFakeCtx()
  apply(ctx)
  await waitFor(() => ctx.routes.some((r) => r.path === path))
  return ctx.routes.find((r) => r.path === path).handler
}

function callRoute(handler, { method = 'POST', body } = {}) {
  const req = Readable.from(body == null ? [] : [Buffer.from(body)])
  req.method = method
  const res = {
    statusCode: 0,
    payload: '',
    writeHead(status) { this.statusCode = status },
    end(t) { this.payload = t || '' }
  }
  return Promise.resolve(handler(req, res)).then(() => ({
    status: res.statusCode,
    body: res.payload ? JSON.parse(res.payload) : null
  }))
}

// tts-webui is the simplest routable provider (OpenAI-compatible /audio/speech, blob response).
const VOICE_VC = {
  provider: 'tts-webui', protocol: 'openai-speech', endpoint: 'http://127.0.0.1:1/v1',
  apiKey: '', model: 'tts-1', voiceId: 'v1', outputFormat: 'wav', timeoutMs: 5000
}
const ttsCfg = (voiceConfig, extra = {}) => Object.assign({ retryCount: 1, apis: [], voiceConfig }, extra)

const FAKE_BYTES = Buffer.from('fake-audio-bytes')

function mockBlobFetch(captured) {
  return async (url, opts) => {
    if (captured) { captured.url = String(url); captured.body = opts && opts.body }
    return { ok: true, status: 200, text: async () => '', blob: async () => new Blob([FAKE_BYTES]) }
  }
}

const residue = () => (existsSync(TTS_TMP_DIR) ? readdirSync(TTS_TMP_DIR).filter((f) => /^voice_/.test(f)) : [])

// ---- GET -> 405 ----

test('/omni/tts/test: GET -> 405', async () => {
  const handler = await bootRoute(ttsCfg(VOICE_VC), '/omni/tts/test')
  const r = await callRoute(handler, { method: 'GET' })
  assert.equal(r.status, 405)
  assert.equal(r.body.ok, false)
})

// ---- invalid voice config -> 400 ----

test('/omni/tts/test: invalid voice config -> 400 语音配置无效', async () => {
  const handler = await bootRoute(ttsCfg({ provider: 'tts-webui' }), '/omni/tts/test')
  const r = await callRoute(handler, { body: JSON.stringify({ text: '你好' }) })
  assert.equal(r.status, 400)
  assert.match(r.body.error, /语音配置无效/)
})

// ---- missing text -> 400 ----

test('/omni/tts/test: missing text -> 400', async () => {
  const handler = await bootRoute(ttsCfg(VOICE_VC), '/omni/tts/test')
  const r = await callRoute(handler, { body: JSON.stringify({}) })
  assert.equal(r.status, 400)
  assert.match(r.body.error, /缺少 text/)
})

// ---- happy path: base64 round-trip + no temp residue ----

test('/omni/tts/test: happy path -> base64 matches mock bytes, temp dir has no residue', async () => {
  const realFetch = globalThis.fetch
  const captured = {}
  globalThis.fetch = mockBlobFetch(captured)
  try {
    const handler = await bootRoute(ttsCfg(VOICE_VC), '/omni/tts/test')
    const r = await callRoute(handler, { body: JSON.stringify({ text: '你好，这是合成测试' }) })
    assert.equal(r.status, 200)
    assert.equal(r.body.ok, true)
    assert.equal(Buffer.from(r.body.base64, 'base64').toString(), FAKE_BYTES.toString(), 'base64 decodes to the mock bytes')
    assert.equal(r.body.mime, 'audio/wav')
    assert.equal(r.body.format, 'wav')
    assert.equal(r.body.model, 'tts-1')
    assert.ok(captured.url.includes('/audio/speech'), 'request hit the tts-webui speech endpoint')
    assert.ok(captured.body.includes('你好'), 'request body carries the text')
    assert.deepEqual(residue(), [], 'temp synthesis file must be deleted immediately (no residue)')
  } finally {
    globalThis.fetch = realFetch
  }
})

// ---- mp3 outputFormat -> mime audio/mpeg ----

test('/omni/tts/test: mp3 outputFormat -> mime audio/mpeg + no residue', async () => {
  const realFetch = globalThis.fetch
  globalThis.fetch = mockBlobFetch(null)
  try {
    const handler = await bootRoute(ttsCfg(Object.assign({}, VOICE_VC, { outputFormat: 'mp3' })), '/omni/tts/test')
    const r = await callRoute(handler, { body: JSON.stringify({ text: '你好' }) })
    assert.equal(r.status, 200)
    assert.equal(r.body.mime, 'audio/mpeg')
    assert.equal(r.body.format, 'mp3')
    assert.ok(r.body.base64.length > 0)
    assert.deepEqual(residue(), [])
  } finally {
    globalThis.fetch = realFetch
  }
})