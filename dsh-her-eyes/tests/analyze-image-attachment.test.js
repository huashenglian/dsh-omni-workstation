// analyze-image-attachment.test.js — analyze_image execute with attachment_id
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'

const dshHome = mkdtempSync(join(tmpdir(), 'her-eyes-attach-'))
process.env.DSH_HOME = dshHome

const { apply, toolDef, sniffMediaType } = await import('../lib/index.js')

const PNG_BYTES = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)])
const JPEG_BYTES = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 2)])

// Local fake VLM endpoint: captures requests, answers with a fixed text.
function startServer() {
  const requests = []
  const server = createServer((req, res) => {
    let raw = ''
    req.on('data', (c) => { raw += c })
    req.on('end', () => {
      requests.push({ url: req.url, body: raw })
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ choices: [{ message: { content: '这是测试回答' } }] }))
    })
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, requests, port: server.address().port })
    })
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

const makeExec = (events) => ({
  signal: undefined,
  agent: { session: { events }, meta: { cwd: process.cwd() } }
})

const userImageEvent = (attachment) => ({
  type: 'user/message',
  data: { role: 'user', content: [{ type: 'image', attachment }] }
})

test('sniffMediaType detects formats from magic bytes', () => {
  assert.equal(sniffMediaType(new Uint8Array(PNG_BYTES)), 'image/png')
  assert.equal(sniffMediaType(new Uint8Array(JPEG_BYTES)), 'image/jpeg')
  assert.equal(sniffMediaType(new Uint8Array(Buffer.from('52494646' + '00000000' + '57454250', 'hex'))), 'image/webp')
  assert.equal(sniffMediaType(new Uint8Array(Buffer.from('474946383961' + '000000000000', 'hex'))), 'image/gif')
  assert.equal(sniffMediaType(new Uint8Array(Buffer.alloc(16, 0))), undefined)
  assert.equal(sniffMediaType(new Uint8Array(Buffer.alloc(4, 0))), undefined)
})

test('execute requires image_path or attachment_id', async () => {
  const { server } = await startServer()
  try {
    writeFileSync(join(dshHome, 'vlm-vision.json'), JSON.stringify({
      vlmEnabled: true,
      apis: [{ id: 'c_1', name: 'Test', provider: 'custom', protocol: 'openai-completions', endpoint: 'http://127.0.0.1:' + server.address().port + '/v1', apiKey: 'sk-test', model: 'test-model' }]
    }))
    apply(makeFakeCtx({ readImage: async () => { throw new Error('should not be called') } }))
    await assert.rejects(() => toolDef.execute({ question: 'q' }, makeExec([])), /必须提供 image_path（图片文件路径）或 attachment_id（上传图片的附件 id）之一/)
  } finally {
    server.close()
  }
})

test('attachment_id without session events throws', async () => {
  const { server } = await startServer()
  try {
    apply(makeFakeCtx({ readImage: async () => { throw new Error('should not be called') } }))
    await assert.rejects(
      () => toolDef.execute({ attachment_id: 'sha256:abc', question: 'q' }, { signal: undefined, agent: {} }),
      /无会话事件日志/
    )
  } finally {
    server.close()
  }
})

test('unknown attachment id throws', async () => {
  const { server } = await startServer()
  try {
    apply(makeFakeCtx({ readImage: async () => { throw new Error('should not be called') } }))
    const exec = makeExec([userImageEvent({ attachmentId: 'sha256:abc', name: '截图.png' })])
    await assert.rejects(
      () => toolDef.execute({ attachment_id: 'sha256:unknown', question: 'q' }, exec),
      /未知附件 id "sha256:unknown"/
    )
  } finally {
    server.close()
  }
})

test('attachment read failure propagates', async () => {
  const { server } = await startServer()
  try {
    apply(makeFakeCtx({ readImage: async () => { throw new Error('disk error') } }))
    const exec = makeExec([userImageEvent({ attachmentId: 'sha256:abc' })])
    await assert.rejects(
      () => toolDef.execute({ attachment_id: 'sha256:abc', question: 'q' }, exec),
      /disk error/
    )
  } finally {
    server.close()
  }
})

test('happy path: attachment_id image analyzed end-to-end', async () => {
  const { server, requests, port } = await startServer()
  try {
    writeFileSync(join(dshHome, 'vlm-vision.json'), JSON.stringify({
      vlmEnabled: true,
      apis: [{ id: 'c_1', name: 'Test', provider: 'custom', protocol: 'openai-completions', endpoint: 'http://127.0.0.1:' + port + '/v1', apiKey: 'sk-test', model: 'test-model' }]
    }))
    const readCalls = []
    const attachments = {
      readImage: async (ref) => {
        readCalls.push(ref)
        return { ref, data: PNG_BYTES }
      }
    }
    apply(makeFakeCtx(attachments))
    const exec = makeExec([userImageEvent({ attachmentId: 'sha256:abc', name: '截图.png' })])
    const result = await toolDef.execute({ attachment_id: 'sha256:abc', question: '这张图是什么？' }, exec)
    assert.equal(result.ok, true)
    assert.equal(result.answer, '这是测试回答')
    assert.equal(result.usage, undefined, 'usage omitted when response has none')
    assert.equal(readCalls.length, 1)
    assert.equal(readCalls[0].attachmentId, 'sha256:abc')
    assert.equal(requests.length, 1)
    assert.ok(requests[0].body.includes('data:image/png;base64,'), 'attachment bytes sent as PNG dataUrl')
    assert.ok(requests[0].body.includes('这张图是什么？'))
  } finally {
    server.close()
  }
})

test('image_path flow still works (regression)', async () => {
  const { server, requests, port } = await startServer()
  try {
    writeFileSync(join(dshHome, 'vlm-vision.json'), JSON.stringify({
      vlmEnabled: true,
      apis: [{ id: 'c_1', name: 'Test', provider: 'custom', protocol: 'openai-completions', endpoint: 'http://127.0.0.1:' + port + '/v1', apiKey: 'sk-test', model: 'test-model' }]
    }))
    apply(makeFakeCtx({ readImage: async () => { throw new Error('should not be called') } }))
    const file = join(dshHome, 'local.png')
    writeFileSync(file, PNG_BYTES)
    const result = await toolDef.execute({ image_path: file, question: '本地图？' }, makeExec([]))
    assert.equal(result.ok, true)
    assert.equal(requests.length, 1)
    assert.ok(requests[0].body.includes('data:image/png;base64,'))
  } finally {
    server.close()
  }
})

test('attachment_id takes precedence when both given', async () => {
  const { server, requests, port } = await startServer()
  try {
    writeFileSync(join(dshHome, 'vlm-vision.json'), JSON.stringify({
      vlmEnabled: true,
      apis: [{ id: 'c_1', name: 'Test', provider: 'custom', protocol: 'openai-completions', endpoint: 'http://127.0.0.1:' + port + '/v1', apiKey: 'sk-test', model: 'test-model' }]
    }))
    const attachments = { readImage: async (ref) => ({ ref, data: PNG_BYTES }) }
    apply(makeFakeCtx(attachments))
    const file = join(dshHome, 'local.jpg')
    writeFileSync(file, JPEG_BYTES)
    const exec = makeExec([userImageEvent({ attachmentId: 'sha256:abc' })])
    const result = await toolDef.execute({ attachment_id: 'sha256:abc', image_path: file, question: '谁优先？' }, exec)
    assert.equal(result.ok, true)
    assert.ok(requests[0].body.includes('data:image/png;base64,'), 'attachment (PNG) wins over file (JPEG)')
  } finally {
    server.close()
  }
})