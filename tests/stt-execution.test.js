// stt-execution.test.js — STT execution layer (v2.13)
// Mirrors tests/stt-config.test.js harness: node:test + dynamic import +
// DSH_HOME / config-dir mkdtemp. The transcription endpoint is a local
// node:http mock on 127.0.0.1:0 — multipart bodies are asserted with plain
// string matching (no parser needed).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import http from 'node:http'

process.env.DSH_HOME = mkdtempSync(join(tmpdir(), 'omni-workstation-stt-exec-'))
process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR = mkdtempSync(join(tmpdir(), 'omni-workstation-sttexec-'))

const {
  runOpenAiStt, parseSttExtraParams, sttResponseFormatFor,
  sttEndpointFor, sttSizeLimitFor, sttFormatAllowed, sttSaveSubtitle
} = await import('../lib/index.js')

const WAV_HEADER = Buffer.from('RIFF....WAVEfmt ', 'ascii')

function tmpFile(name, content) {
  const dir = mkdtempSync(join(tmpdir(), 'omni-stt-'))
  const p = join(dir, name)
  writeFileSync(p, content)
  return p
}

// Start a mock transcription server; handler(req, res, bodyText).
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

// A custom-provider STT config pointed at the mock (custom = user-supplied endpoint).
const mockCfg = (url, extra = {}) => Object.assign({
  provider: 'custom', protocol: 'openai-stt', endpoint: url, apiKey: 'sk-test',
  model: 'whisper-1', timeoutMs: 5000, retryCount: 1, language: '', outputMode: 'text',
  hotwords: '', extraParams: ''
}, extra)

// ---- pure helpers ----

test('sttResponseFormatFor maps output modes', () => {
  assert.equal(sttResponseFormatFor('text'), 'json')
  assert.equal(sttResponseFormatFor('timestamps'), 'verbose_json')
  assert.equal(sttResponseFormatFor('srt'), 'srt')
  assert.equal(sttResponseFormatFor('vtt'), 'vtt')
})

test('sttEndpointFor strips trailing slashes and honors fixedUrl', () => {
  assert.equal(sttEndpointFor({ provider: 'funasr', endpoint: 'x' }), 'http://127.0.0.1:8000/v1')
  assert.equal(sttEndpointFor({ provider: 'custom', endpoint: 'http://x.test/v1///' }), 'http://x.test/v1')
})

test('sttEndpointFor appends /v1 to a bare custom endpoint (v2.13.1)', () => {
  assert.equal(sttEndpointFor({ provider: 'custom', endpoint: 'http://x.test' }), 'http://x.test/v1')
  assert.equal(sttEndpointFor({ provider: 'custom', endpoint: 'http://x.test/v1' }), 'http://x.test/v1')
  assert.equal(sttEndpointFor({ provider: 'custom', endpoint: 'http://x.test/api/audio/transcriptions' }), 'http://x.test/api/audio/transcriptions')
  // transcription URL built the same way transcribeBuffer builds it
  assert.equal(sttEndpointFor({ provider: 'custom', endpoint: 'http://x.test' }) + '/audio/transcriptions', 'http://x.test/v1/audio/transcriptions')
})

test('sttSizeLimitFor: provider cap wins, 0 falls back to global MAX_STT_BYTES', () => {
  assert.equal(sttSizeLimitFor({ provider: 'openai' }), 25 * 1024 * 1024)
  assert.equal(sttSizeLimitFor({ provider: 'funasr' }), 64 * 1024 * 1024)
})

test('sttFormatAllowed: extension whitelist or audio magic bytes', () => {
  assert.equal(sttFormatAllowed('a.wav', Buffer.alloc(0)), true)
  assert.equal(sttFormatAllowed('a.silk', Buffer.alloc(0)), false)
  assert.equal(sttFormatAllowed('weird', WAV_HEADER), true) // RIFF/WAVE sniffed as audio
})

test('parseSttExtraParams: empty -> {}, bad JSON -> Chinese error', () => {
  assert.deepEqual(parseSttExtraParams(''), {})
  assert.deepEqual(parseSttExtraParams('{"diarize": true}'), { diarize: true })
  assert.throws(() => parseSttExtraParams('not json'), /JSON/)
  assert.throws(() => parseSttExtraParams('[1]'), /JSON/)
})

// ---- 1. happy path: request fields + response parse ----

test('runOpenAiStt: posts model/response_format/language/prompt/extraParams and returns text', async () => {
  let seen = null
  const { server, url } = await startMock((req, res, body) => {
    seen = { headers: req.headers, body }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ text: '你好世界' }))
  })
  try {
    const cfg = mockCfg(url, { language: 'zh', hotwords: '热词A', extraParams: '{"diarize": true}' })
    const r = await runOpenAiStt(cfg, { audio_path: tmpFile('a.wav', WAV_HEADER) }, null)
    assert.equal(r.ok, true)
    assert.equal(r.text, '你好世界')
    assert.match(seen.body, /name="model"[\s\S]{0,40}whisper-1/)
    assert.match(seen.body, /name="response_format"[\s\S]{0,40}json/)
    assert.match(seen.body, /name="language"[\s\S]{0,40}zh/)
    assert.match(seen.body, /name="prompt"[\s\S]{0,80}热词A/)
    assert.match(seen.body, /name="diarize"[\s\S]{0,40}true/)
    assert.equal(seen.headers.authorization, 'Bearer sk-test')
  } finally {
    await close(server)
  }
})

// ---- 2. size pre-flight ----

test('runOpenAiStt: file over provider maxBytes -> 25MB error + compress/slice advice', async () => {
  const p = tmpFile('big.wav', Buffer.alloc(26 * 1024 * 1024))
  const cfg = mockCfg('http://127.0.0.1:1', { provider: 'openai', endpoint: '', apiKey: 'sk-test' })
  await assert.rejects(
    () => runOpenAiStt(cfg, { audio_path: p }, null),
    (e) => /25MB/.test(e.message) && /压缩或切片/.test(e.message)
  )
})

// ---- 3. format pre-flight ----

test('runOpenAiStt: .silk filename -> format error mentioning mp3/wav', async () => {
  const p = tmpFile('a.silk', Buffer.from([0x02, 0x23, 0x21, 0x53, 0x49, 0x4c, 0x4b]))
  await assert.rejects(
    () => runOpenAiStt(mockCfg('http://127.0.0.1:1'), { audio_path: p }, null),
    (e) => /mp3\/wav/.test(e.message)
  )
})

// ---- 4. extraParams JSON guard ----

test('runOpenAiStt: extraParams "not json" -> error mentions JSON', async () => {
  const p = tmpFile('a.wav', WAV_HEADER)
  await assert.rejects(
    () => runOpenAiStt(mockCfg('http://127.0.0.1:1', { extraParams: 'not json' }), { audio_path: p }, null),
    (e) => /JSON/.test(e.message)
  )
})

// ---- 5. retry = total attempts on 5xx ----

test('runOpenAiStt: mock always 500 -> request count === retryCount then throws', async () => {
  let count = 0
  const { server, url } = await startMock((req, res) => {
    count++
    res.writeHead(500, { 'Content-Type': 'text/plain' })
    res.end('boom')
  })
  try {
    const cfg = mockCfg(url, { retryCount: 3 })
    await assert.rejects(
      () => runOpenAiStt(cfg, { audio_path: tmpFile('a.wav', WAV_HEADER) }, null),
      /HTTP 500/
    )
    assert.equal(count, 3)
  } finally {
    await close(server)
  }
})

// ---- 6. verbose_json segments ----

test('runOpenAiStt: verbose_json maps segments correctly', async () => {
  const { server, url } = await startMock((req, res, body) => {
    assert.match(body, /name="response_format"[\s\S]{0,40}verbose_json/)
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({
      text: 'hi there', language: 'en', duration: 1.5,
      segments: [{ start: 0, end: 0.7, text: 'hi' }, { start: 0.7, end: 1.5, text: ' there' }]
    }))
  })
  try {
    const cfg = mockCfg(url, { outputMode: 'timestamps' })
    const r = await runOpenAiStt(cfg, { audio_path: tmpFile('a.wav', WAV_HEADER) }, null)
    assert.equal(r.ok, true)
    assert.equal(r.language, 'en')
    assert.equal(r.duration, 1.5)
    assert.deepEqual(r.segments, [
      { start: 0, end: 0.7, text: 'hi' },
      { start: 0.7, end: 1.5, text: ' there' }
    ])
  } finally {
    await close(server)
  }
})

// ---- 7. srt mode writes into <cwd>/.omni-workstation/transcripts ----

test('runOpenAiStt: srt mode saves subtitle under session cwd', async () => {
  const srt = '1\n00:00:00,000 --> 00:00:01,000\n你好\n'
  const { server, url } = await startMock((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end(srt)
  })
  const cwd = mkdtempSync(join(tmpdir(), 'omni-stt-cwd-'))
  const exec = { agent: { session: { header: { cwd } } } }
  try {
    const cfg = mockCfg(url, { outputMode: 'srt' })
    const r = await runOpenAiStt(cfg, { audio_path: tmpFile('meeting.wav', WAV_HEADER) }, exec)
    assert.equal(r.ok, true)
    assert.ok(r.filePath, 'filePath returned')
    assert.ok(r.filePath.startsWith(join(cwd, '.omni-workstation', 'transcripts')), 'path under cwd transcripts dir')
    assert.ok(existsSync(r.filePath))
    assert.equal(readFileSync(r.filePath, 'utf8'), srt)
  } finally {
    await close(server)
  }
})

// ---- 7b. srt mode with no session cwd must throw (never process.cwd()) ----

test('runOpenAiStt: srt mode without session cwd throws instead of writing to process.cwd()', async () => {
  const { server, url } = await startMock((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('1\n00:00:00,000 --> 00:00:01,000\nx\n')
  })
  try {
    const cfg = mockCfg(url, { outputMode: 'srt' })
    await assert.rejects(
      () => runOpenAiStt(cfg, { audio_path: tmpFile('a.wav', WAV_HEADER) }, null),
      /无法确定会话工作目录/
    )
  } finally {
    await close(server)
  }
})

// ---- 8. unreachable service -> actionable Chinese message ----

test('runOpenAiStt: ECONNREFUSED -> actionable Chinese message with settings hint', async () => {
  const { server, url } = await startMock((req, res) => res.end('x'))
  await close(server) // port is now dead
  const cfg = mockCfg(url, { retryCount: 1 })
  await assert.rejects(
    () => runOpenAiStt(cfg, { audio_path: tmpFile('a.wav', WAV_HEADER) }, null),
    (e) => /STT: 无法连接/.test(e.message) && /设置页/.test(e.message) && /语音 → STT/.test(e.message)
  )
})

// ---- 9. source resolution guards ----

test('runOpenAiStt: neither audio_path nor attachment_id -> Chinese error', async () => {
  await assert.rejects(
    () => runOpenAiStt(mockCfg('http://127.0.0.1:1'), {}, null),
    (e) => /必须提供 audio_path/.test(e.message) && /attachment_id/.test(e.message)
  )
})

test('runOpenAiStt: relative path without session cwd throws (no process.cwd fallback)', async () => {
  await assert.rejects(
    () => runOpenAiStt(mockCfg('http://127.0.0.1:1'), { audio_path: 'rel.wav' }, null),
    /无法确定会话工作目录/
  )
})

// ---- sttSaveSubtitle direct ----

test('sttSaveSubtitle writes <baseName>-<ts>.<ext> under transcripts/', () => {
  const dir = mkdtempSync(join(tmpdir(), 'omni-stt-save-'))
  const p = sttSaveSubtitle('WEBVTT\n', 'vtt', join(dir, '.omni-workstation'), 'clip')
  assert.ok(p.startsWith(join(dir, '.omni-workstation', 'transcripts')))
  assert.match(p, /clip-[a-z0-9]+\.vtt$/)
  assert.equal(readFileSync(p, 'utf8'), 'WEBVTT\n')
})

// ---- lossless-JSON regression (v2.13 fix) ----
// The harness's snapshotToolValue gate runs BEFORE schema validation and
// rejects any result with an undefined-valued own key (JSON.stringify would
// drop it, but the gate sees the raw object). deepStrictEqual against the
// JSON round-trip catches undefined-valued keys anywhere in the tree.

test('runOpenAiStt: response without duration -> no duration key, lossless JSON round-trip', async () => {
  const { server, url } = await startMock((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ text: '你好' })) // FunASR/sensevoice default shape
  })
  try {
    const r = await runOpenAiStt(mockCfg(url), { audio_path: tmpFile('a.wav', WAV_HEADER) }, null)
    assert.equal(r.ok, true)
    assert.equal(r.text, '你好')
    assert.equal('duration' in r, false)
    assert.deepStrictEqual(JSON.parse(JSON.stringify(r)), r)
  } finally {
    await close(server)
  }
})

test('runOpenAiStt: verbose_json segments missing start/end -> null members, lossless round-trip', async () => {
  const { server, url } = await startMock((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ text: 'a b', segments: [{ text: 'a' }, { text: 'b' }] }))
  })
  try {
    const cfg = mockCfg(url, { outputMode: 'timestamps' })
    const r = await runOpenAiStt(cfg, { audio_path: tmpFile('a.wav', WAV_HEADER) }, null)
    assert.equal(r.segments[0].start, null)
    assert.equal(r.segments[0].end, null)
    assert.equal(r.segments[0].text, 'a')
    assert.deepStrictEqual(JSON.parse(JSON.stringify(r)), r)
  } finally {
    await close(server)
  }
})

test('runOpenAiStt: duration present and finite is still kept (1.5)', async () => {
  const { server, url } = await startMock((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ text: 'hi', duration: 1.5 }))
  })
  try {
    const r = await runOpenAiStt(mockCfg(url), { audio_path: tmpFile('a.wav', WAV_HEADER) }, null)
    assert.equal(r.duration, 1.5)
    assert.deepStrictEqual(JSON.parse(JSON.stringify(r)), r)
  } finally {
    await close(server)
  }
})
