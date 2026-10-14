// stt-routes.test.js — STT routes (v2.13, todo 5)
// Part 1: filterSttModelIds unit contract (plan acceptance cases + edge cases).
// Part 2: the three HTTP surface points — /omni/models {stt:true},
// /omni/key {stt:true}, /omni/stt/test — driven through the captured route
// handlers from a fakeCtx (apply() capture pattern of tests/stt-conflict.test.js)
// against a local node:http mock STT endpoint (pattern of
// tests/stt-execution.test.js). No real harness needed.
// Note: the base64 length pre-check (oversize body) is not unit-tested here —
// custom-provider limit is 64MB, allocating a ±90MB base64 string in the suite
// is not worth it; it is exercised by the browser e2e (todo 9) and shares its
// error text with the post-decode size guard, which is covered by construction.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import http from 'node:http'
import { Readable } from 'node:stream'

const dshHome = mkdtempSync(join(tmpdir(), 'omni-workstation-stt-routes-'))
process.env.DSH_HOME = dshHome
process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR = dshHome

const { apply, filterSttModelIds } = await import('../lib/index.js')

const writeCfg = (obj) => writeFileSync(join(dshHome, 'omni-vision.json'), JSON.stringify(obj))

// ---------- Part 1: filterSttModelIds ----------

test('filterSttModelIds keeps only speech-family ids (acceptance case 1)', () => {
  assert.deepEqual(filterSttModelIds(['gpt-4o', 'whisper-1', 'text-embedding']), ['whisper-1'])
})

test('filterSttModelIds: no keyword match -> ORIGINAL list unchanged (fallback)', () => {
  const ids = ['qwen3-omni', 'mimo-audio-7b', 'iic/nls_16k']
  assert.deepEqual(filterSttModelIds(ids), ids)
})

test('filterSttModelIds: multi-match preserves input ordering', () => {
  assert.deepEqual(
    filterSttModelIds(['gpt-4o-transcribe', 'gpt-4o', 'whisper-large-v3-turbo', 'text-embedding-3']),
    ['gpt-4o-transcribe', 'whisper-large-v3-turbo']
  )
})

test('filterSttModelIds: provider-namespaced ids kept (SenseVoiceSmall / TeleSpeechASR)', () => {
  assert.deepEqual(
    filterSttModelIds(['FunAudioLLM/SenseVoiceSmall', 'TeleAI/TeleSpeechASR', 'Qwen2.5-7B']),
    ['FunAudioLLM/SenseVoiceSmall', 'TeleAI/TeleSpeechASR']
  )
})

test('filterSttModelIds: empty array -> empty array (acceptance case 3)', () => {
  assert.deepEqual(filterSttModelIds([]), [])
})

test('filterSttModelIds: non-array input -> empty array', () => {
  assert.deepEqual(filterSttModelIds(null), [])
})

// ---------- Part 2: routes ----------

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

// Boot apply() on a fakeCtx and return the captured route for a path.
async function bootRoute(cfg, path) {
  writeCfg(cfg)
  const ctx = makeFakeCtx()
  apply(ctx)
  await waitFor(() => ctx.routes.some((r) => r.path === path))
  return ctx.routes.find((r) => r.path === path).handler
}

// Drive a captured handler with a fake req (Readable emits data/end for
// readBody) and a fake res (jsonOut only needs writeHead + end).
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

function startMock(handler) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const chunks = []
      req.on('data', (c) => chunks.push(c))
      req.on('end', () => handler(req, res, Buffer.concat(chunks).toString('utf8')))
    })
    server.listen(0, '127.0.0.1', () => resolve({ server, url: 'http://127.0.0.1:' + server.address().port }))
  })
}
const close = (server) => new Promise((r) => server.close(r))

const sttCfg = (url, extra = {}) => ({
  retryCount: 1,
  apis: [],
  voiceConfigStt: Object.assign({
    provider: 'custom', protocol: 'openai-stt', endpoint: url, apiKey: 'sk-stt',
    model: 'whisper-1', timeoutMs: 5000, retryCount: 1, language: '', outputMode: 'text',
    hotwords: '', extraParams: ''
  }, extra)
})

const WAV = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVE'), Buffer.alloc(8)])

// ---- GET /omni/stt/test -> 405 ----

test('/omni/stt/test: GET -> 405', async () => {
  const handler = await bootRoute(sttCfg('http://127.0.0.1:1'), '/omni/stt/test')
  const r = await callRoute(handler, { method: 'GET' })
  assert.equal(r.status, 405)
  assert.equal(r.body.ok, false)
})

// ---- invalid STT config -> 400 ----

test('/omni/stt/test: invalid config (no model) -> 400 STT 配置无效', async () => {
  const handler = await bootRoute(sttCfg('http://127.0.0.1:1', { model: '' }), '/omni/stt/test')
  const r = await callRoute(handler, { body: JSON.stringify({ base64: WAV.toString('base64'), name: 'a.wav' }) })
  assert.equal(r.status, 400)
  assert.match(r.body.error, /STT 配置无效/)
})

// ---- missing base64 -> 400 ----

test('/omni/stt/test: missing base64 -> 400', async () => {
  const handler = await bootRoute(sttCfg('http://127.0.0.1:1'), '/omni/stt/test')
  const r = await callRoute(handler, { body: JSON.stringify({}) })
  assert.equal(r.status, 400)
  assert.match(r.body.error, /缺少 base64/)
})

// ---- happy path: text mode ----

test('/omni/stt/test: happy path -> {ok, text, language, duration, segments}', async () => {
  const { server, url } = await startMock((req, res, body) => {
    assert.match(body, /name="response_format"[\s\S]{0,40}json/)
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ text: '你好世界', language: 'zh', duration: 2.4, segments: [] }))
  })
  try {
    const handler = await bootRoute(sttCfg(url), '/omni/stt/test')
    const r = await callRoute(handler, {
      body: JSON.stringify({ base64: WAV.toString('base64'), name: 'recording.wav' })
    })
    assert.equal(r.status, 200)
    assert.equal(r.body.ok, true)
    assert.equal(r.body.text, '你好世界')
    assert.equal(r.body.language, 'zh')
    assert.equal(r.body.duration, 2.4)
    assert.deepEqual(r.body.segments, [])
    assert.equal(r.body.filePath, '')
  } finally {
    await close(server)
  }
})

// ---- srt mode -> subtitle saved under dirname(configFile())/transcripts ----

test('/omni/stt/test: srt mode saves subtitle under config dir transcripts/', async () => {
  const srt = '1\n00:00:00,000 --> 00:00:01,000\n你好\n'
  const { server, url } = await startMock((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end(srt)
  })
  try {
    const handler = await bootRoute(sttCfg(url, { outputMode: 'srt' }), '/omni/stt/test')
    const r = await callRoute(handler, {
      body: JSON.stringify({ base64: WAV.toString('base64'), name: 'recording.wav' })
    })
    assert.equal(r.status, 200)
    assert.equal(r.body.ok, true)
    assert.ok(r.body.filePath, 'filePath returned')
    assert.ok(r.body.filePath.startsWith(join(dshHome, 'transcripts')), 'path under config dir transcripts')
    assert.ok(existsSync(r.body.filePath))
    assert.equal(readFileSync(r.body.filePath, 'utf8'), srt)
  } finally {
    await close(server)
  }
})

// ---- format pre-flight -> 400 with supported list ----

test('/omni/stt/test: .silk -> 400 format error with supported extensions', async () => {
  const handler = await bootRoute(sttCfg('http://127.0.0.1:1'), '/omni/stt/test')
  const silk = Buffer.from([0x02, 0x23, 0x21, 0x53, 0x49, 0x4c, 0x4b])
  const r = await callRoute(handler, { body: JSON.stringify({ base64: silk.toString('base64'), name: 'a.silk' }) })
  assert.equal(r.status, 400)
  assert.match(r.body.error, /不支持的音频格式/)
  assert.match(r.body.error, /\.wav/)
})

// ---- /omni/key {stt:true} ----

test('/omni/key: stt branch returns voiceConfigStt.apiKey', async () => {
  const handler = await bootRoute(sttCfg('http://127.0.0.1:1', { apiKey: 'sk-stt-key' }), '/omni/key')
  const r = await callRoute(handler, { body: JSON.stringify({ stt: true }) })
  assert.equal(r.status, 200)
  assert.deepEqual(r.body, { ok: true, apiKey: 'sk-stt-key' })
})

// ---- /omni/models {stt:true} ----

test('/omni/models: stt branch fetches, filters and caps models', async () => {
  const { server, url } = await startMock((req, res) => {
    assert.equal(req.method, 'GET')
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ data: [{ id: 'gpt-4o' }, { id: 'whisper-1' }, { id: 'text-embedding-3' }] }))
  })
  try {
    const handler = await bootRoute(sttCfg(url), '/omni/models')
    const r = await callRoute(handler, { body: JSON.stringify({ stt: true }) })
    assert.equal(r.status, 200)
    assert.deepEqual(r.body, { ok: true, models: ['whisper-1'] })
  } finally {
    await close(server)
  }
})

test('/omni/models: stt branch falls back to unfiltered list when no keyword hits', async () => {
  const { server, url } = await startMock((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ models: ['clean-model-a', 'clean-model-b'] }))
  })
  try {
    const handler = await bootRoute(sttCfg(url), '/omni/models')
    const r = await callRoute(handler, { body: JSON.stringify({ stt: true }) })
    assert.equal(r.status, 200)
    assert.deepEqual(r.body, { ok: true, models: ['clean-model-a', 'clean-model-b'] })
  } finally {
    await close(server)
  }
})

test('/omni/models: stt branch without endpoint -> 400 未配置 endpoint', async () => {
  const handler = await bootRoute(sttCfg('', { endpoint: '' }), '/omni/models')
  const r = await callRoute(handler, { body: JSON.stringify({ stt: true }) })
  assert.equal(r.status, 400)
  assert.match(r.body.error, /未配置 endpoint/)
})