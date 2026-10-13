// media-pipeline.test.js — analyze_media host pipeline: sniff, resolveMedia, askMedia
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, openSync, ftruncateSync, closeSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'

const dshHome = mkdtempSync(join(tmpdir(), 'omni-workstation-media-'))
process.env.DSH_HOME = dshHome
process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR = dshHome

const {
  apply, sniffMediaKind, resolveMedia, protocolMediaSupported, askMedia
} = await import('../lib/index.js')

const MAX_MEDIA_BYTES = 64 * 1024 * 1024

const pad = (head) => {
  const b = Buffer.isBuffer(head) ? head : Buffer.from(head, 'binary')
  return Buffer.concat([b, Buffer.alloc(Math.max(0, 16 - b.length), 0)])
}
const MAGIC = {
  mp4: Buffer.concat([Buffer.from('00000018', 'hex'), Buffer.from('ftypmp42', 'binary'), Buffer.alloc(8)]),
  m4a: Buffer.concat([Buffer.from('00000018', 'hex'), Buffer.from('ftypM4A ', 'binary'), Buffer.alloc(8)]),
  webm: pad(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])),
  avi: Buffer.concat([Buffer.from('RIFF', 'binary'), Buffer.alloc(4), Buffer.from('AVI ', 'binary'), Buffer.alloc(8)]),
  wav: Buffer.concat([Buffer.from('RIFF', 'binary'), Buffer.alloc(4), Buffer.from('WAVE', 'binary'), Buffer.alloc(8)]),
  flac: pad(Buffer.from('fLaC', 'binary')),
  ogg: pad(Buffer.from('OggS', 'binary')),
  mp3id3: pad(Buffer.from('ID3', 'binary')),
  mp3sync: pad(Buffer.from([0xff, 0xfb, 0x90, 0x00])),
  jpeg: pad(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))
}

function startServer(reply) {
  const requests = []
  const server = createServer((req, res) => {
    let raw = ''
    req.on('data', (c) => { raw += c })
    req.on('end', () => {
      requests.push({ url: req.url, body: raw })
      const r = reply || { status: 200, body: { choices: [{ message: { content: '媒体回答' } }] } }
      res.writeHead(r.status, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(r.body))
    })
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, requests, port: server.address().port }))
  })
}

function makeFakeCtx(attachments) {
  return {
    get: (name) => (name === 'attachments' ? attachments : undefined),
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

const card = (over) => Object.assign({
  id: 'c_' + Math.random().toString(36).slice(2),
  name: 'Test', provider: 'custom', protocol: 'openai-completions',
  endpoint: 'http://127.0.0.1:1/v1', apiKey: 'sk-test', model: 'test-model'
}, over)

const makeCfg = (apis, fallbackConfig) => ({
  retryCount: 1,
  apis,
  fallbackConfig: fallbackConfig || { provider: 'ollama', models: [], timeoutMs: 1000 },
  globalConfig: {
    retryStatusCodes: '429',
    backoffBase: 1, backoff429Base: 1, backoffMax: 1, backoff429Max: 1
  }
})

// ---------- sniffMediaKind ----------

test('sniffMediaKind: mp4/mov/m4v (ftyp)', () => {
  assert.equal(sniffMediaKind(new Uint8Array(MAGIC.mp4)), 'video')
})

test('sniffMediaKind: m4a (ftyp + M4A brand)', () => {
  assert.equal(sniffMediaKind(new Uint8Array(MAGIC.m4a)), 'audio')
})

test('sniffMediaKind: webm/mkv (EBML magic)', () => {
  assert.equal(sniffMediaKind(new Uint8Array(MAGIC.webm)), 'video')
})

test('sniffMediaKind: avi (RIFF....AVI )', () => {
  assert.equal(sniffMediaKind(new Uint8Array(MAGIC.avi)), 'video')
})

test('sniffMediaKind: wav (RIFF....WAVE)', () => {
  assert.equal(sniffMediaKind(new Uint8Array(MAGIC.wav)), 'audio')
})

test('sniffMediaKind: flac / ogg', () => {
  assert.equal(sniffMediaKind(new Uint8Array(MAGIC.flac)), 'audio')
  assert.equal(sniffMediaKind(new Uint8Array(MAGIC.ogg)), 'audio')
})

test('sniffMediaKind: mp3 (ID3 and frame sync)', () => {
  assert.equal(sniffMediaKind(new Uint8Array(MAGIC.mp3id3)), 'audio')
  assert.equal(sniffMediaKind(new Uint8Array(MAGIC.mp3sync)), 'audio')
})

test('sniffMediaKind: jpeg / short / empty are undefined', () => {
  assert.equal(sniffMediaKind(new Uint8Array(MAGIC.jpeg)), undefined)
  assert.equal(sniffMediaKind(new Uint8Array(Buffer.alloc(4, 0))), undefined)
  assert.equal(sniffMediaKind(undefined), undefined)
})

// ---------- resolveMedia via local path ----------

test('resolveMedia: local mp4 path -> video/mp4', async () => {
  apply(makeFakeCtx(undefined))
  const file = join(dshHome, 'clip.mp4')
  writeFileSync(file, MAGIC.mp4)
  const r = await resolveMedia({}, { media_path: file })
  assert.equal(r.kind, 'video')
  assert.equal(r.mime, 'video/mp4')
  assert.equal(r.buffer.length, MAGIC.mp4.length)
})

test('resolveMedia: local wav path -> audio/wav', async () => {
  apply(makeFakeCtx(undefined))
  const file = join(dshHome, 'voice.wav')
  writeFileSync(file, MAGIC.wav)
  const r = await resolveMedia({}, { media_path: file })
  assert.equal(r.kind, 'audio')
  assert.equal(r.mime, 'audio/wav')
})

test('resolveMedia: relative path joined with session cwd', async () => {
  apply(makeFakeCtx(undefined))
  writeFileSync(join(dshHome, 'rel.mp4'), MAGIC.mp4)
  const exec = { agent: { session: { header: { cwd: dshHome } } } }
  const r = await resolveMedia(exec, { media_path: 'rel.mp4' })
  assert.equal(r.kind, 'video')
})

test('resolveMedia: unreadable path throws explicit Chinese error', async () => {
  apply(makeFakeCtx(undefined))
  await assert.rejects(
    () => resolveMedia({}, { media_path: join(dshHome, 'nope.mp4') }),
    /无法读取媒体文件/
  )
})

test('resolveMedia: neither path nor id throws', async () => {
  apply(makeFakeCtx(undefined))
  await assert.rejects(() => resolveMedia({}, {}), /必须提供 media_path/)
})

test('resolveMedia: oversized file throws explicit 64MB error', async () => {
  apply(makeFakeCtx(undefined))
  const big = join(dshHome, 'big.mp4')
  const fd = openSync(big, 'w')
  ftruncateSync(fd, MAX_MEDIA_BYTES + 1)
  closeSync(fd)
  try {
    await assert.rejects(() => resolveMedia({}, { media_path: big }), /超过 64MB/)
  } finally {
    rmSync(big, { force: true })
  }
})

// ---------- resolveMedia via attachment_id (file block + readFileStream) ----------

test('resolveMedia: attachment_id resolves a file block via readFileStream', async () => {
  const readRefs = []
  const attachments = {
    readFileStream: async function* (ref) {
      readRefs.push(ref)
      yield MAGIC.mp4.subarray(0, 4)
      yield MAGIC.mp4.subarray(4)
    }
  }
  apply(makeFakeCtx(attachments))
  const fileEvent = {
    type: 'user/message',
    data: { role: 'user', content: [{ type: 'file', attachment: { attachmentId: 'sha256:vid', name: 'clip.mp4' } }] }
  }
  const exec = { agent: { session: { events: [fileEvent] } } }
  const r = await resolveMedia(exec, { attachment_id: 'sha256:vid' })
  assert.equal(r.kind, 'video')
  assert.equal(r.mime, 'video/mp4')
  assert.equal(r.buffer.length, MAGIC.mp4.length)
  assert.equal(readRefs.length, 1)
  assert.equal(readRefs[0].attachmentId, 'sha256:vid')
})

test('resolveMedia: file block inside nested tool-result content is found', async () => {
  const attachments = { readFileStream: async function* () { yield MAGIC.wav } }
  apply(makeFakeCtx(attachments))
  const resultEvent = {
    type: 'tool/result',
    data: { message: { content: [{ type: 'tool-result', content: [{ type: 'file', attachment: { attachmentId: 'sha256:aud', name: 'v.wav' } }] }] } }
  }
  const exec = { agent: { session: { events: [resultEvent] } } }
  const r = await resolveMedia(exec, { attachment_id: 'sha256:aud' })
  assert.equal(r.kind, 'audio')
  assert.equal(r.mime, 'audio/wav')
})

test('resolveMedia: unknown attachment id throws', async () => {
  apply(makeFakeCtx({ readFileStream: async function* () { yield MAGIC.mp4 } }))
  const exec = { agent: { session: { events: [] } } }
  await assert.rejects(() => resolveMedia(exec, { attachment_id: 'sha256:none' }), /未知附件 id/)
})

test('resolveMedia: attachment with unrecognised bytes throws', async () => {
  apply(makeFakeCtx({ readFileStream: async function* () { yield Buffer.alloc(32, 7) } }))
  const exec = { agent: { session: { events: [{ type: 'user/message', data: { role: 'user', content: [{ type: 'file', attachment: { attachmentId: 'x', name: 'mystery' } }] } }] } } }
  await assert.rejects(() => resolveMedia(exec, { attachment_id: 'x' }), /无法识别该附件的媒体类型/)
})

// ---------- protocolMediaSupported ----------

test('protocolMediaSupported: supported vs unsupported protocols', () => {
  assert.equal(protocolMediaSupported({ protocol: 'openai-completions' }), true)
  assert.equal(protocolMediaSupported({ protocol: 'google-gemini' }), true)
  assert.equal(protocolMediaSupported({ protocol: 'anthropic-messages' }), false)
  assert.equal(protocolMediaSupported({ protocol: 'openai-responses' }), false)
})

// ---------- askMedia: routing ----------

test('askMedia: no supporting card throws before any request', async () => {
  // audio-only card, video requested -> no video card -> throw, never reaches network.
  const cfg = makeCfg([card({ audio: true, endpoint: 'http://127.0.0.1:1/v1' })])
  await assert.rejects(
    () => askMedia({}, cfg, MAGIC.mp4, 'video/mp4', 'video', 'q', {}, {}),
    /没有开启视频模态的模型卡片/
  )
})

test('askMedia: card without the modality switch is never attempted', async () => {
  const { server, requests, port } = await startServer()
  try {
    const cfg = makeCfg([
      card({ video: false, endpoint: 'http://127.0.0.1:' + port + '/v1' }),
      card({ video: true, endpoint: 'http://127.0.0.1:' + port + '/v1' })
    ])
    const out = await askMedia({}, cfg, MAGIC.mp4, 'video/mp4', 'video', '这是什么？', {}, {})
    assert.equal(out.text, '媒体回答')
    assert.equal(out.attempts, 1)
    assert.equal(requests.length, 1, 'only the video-enabled card received a request')
    assert.ok(requests[0].body.includes('data:video/mp4;base64,'), 'video rides as an image_url data URL')
    assert.ok(requests[0].body.includes('这是什么？'))
    assert.ok(!requests[0].body.includes('video_url'), 'no video_url block (T1: dropped silently)')
  } finally {
    server.close()
  }
})

test('askMedia: unsupported-protocol card is skipped, supported card used', async () => {
  const { server, requests, port } = await startServer()
  try {
    const cfg = makeCfg([
      card({ video: true, protocol: 'anthropic-messages', endpoint: 'http://127.0.0.1:' + port + '/v1' }),
      card({ video: true, protocol: 'openai-completions', endpoint: 'http://127.0.0.1:' + port + '/v1' })
    ])
    const out = await askMedia({}, cfg, MAGIC.mp4, 'video/mp4', 'video', 'q', {}, {})
    assert.equal(out.text, '媒体回答')
    assert.equal(requests.length, 1, 'anthropic card skipped (protocol cannot carry video)')
  } finally {
    server.close()
  }
})

test('askMedia: fallback models never run (skipFallback) and error is labelled', async () => {
  const { server, requests, port } = await startServer({ status: 500, body: { error: 'boom' } })
  try {
    const cfg = makeCfg(
      [card({ video: true, endpoint: 'http://127.0.0.1:' + port + '/v1' })],
      { provider: 'ollama', models: ['should-not-run'], timeoutMs: 1000 }
    )
    await assert.rejects(
      () => askMedia({}, cfg, MAGIC.mp4, 'video/mp4', 'video', 'q', {}, {}),
      (e) => {
        assert.match(e.message, /analyze_media: 所有 VLM API 均失败/)
        assert.ok(!e.message.includes('兜底'), 'fallback model must not be attempted')
        return true
      }
    )
    assert.equal(requests.length, 1, 'one request to the (failing) user card only')
  } finally {
    server.close()
  }
})