// multi-image.test.js — v2.18 analyze_image 多图对照 + 张数硬上限
//  · clampAnalyzeImageMaxCount：1..20，1 = 单图行为
//  · collectImageRefs：数组优先、顺序稳定、去重、单值兼容
//  · buildProtocolText / protocolBody：4 协议多图结构 + 图1/图2 顺序标签
//  · resolveImages：超过上限**直接拒绝**（不发请求），报错含上限
//  · execute：2/3 张图走同一个请求；max=1 时多图被拒；附件 id 前缀可解析
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'

const dshHome = mkdtempSync(join(tmpdir(), 'omni-multi-image-'))
process.env.DSH_HOME = dshHome
process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR = dshHome

const {
  apply, toolDef, clampAnalyzeImageMaxCount, collectImageRefs, resolveImages,
  protocolBody, buildProtocolText, ANALYZE_IMAGE_MAX_DEFAULT, ANALYZE_IMAGE_MAX_HARD
} = await import('../lib/index.js')

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32, 1)])
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32, 2)])

function startServer() {
  const requests = []
  const server = createServer((req, res) => {
    let raw = ''
    req.on('data', (c) => { raw += c })
    req.on('end', () => {
      requests.push({ url: req.url, body: raw })
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ choices: [{ message: { content: '两张图的差别是按钮颜色' } }] }))
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
    llm: { listProviders: () => [], registerAdapter: () => () => {}, registration: () => { throw new Error('no source') }, stream: async function* () {}, on: () => {}, effect: () => {} },
    logger: { warn: () => {} },
    on: () => {},
    effect: (fn) => fn()
  }
}
const makeExec = (events) => ({ signal: undefined, agent: { session: { events }, meta: { cwd: dshHome } } })
const userImageEvent = (attachment) => ({ type: 'user/message', data: { role: 'user', content: [{ type: 'image', attachment }] } })

const writeCfg = (extra) => writeFileSync(join(dshHome, 'omni-vision.json'), JSON.stringify(Object.assign({
  vlmEnabled: true,
  apis: []
}, extra || {})))

// ---------- 纯函数 ----------

test('clampAnalyzeImageMaxCount：1..20，1 表示单图，非法值回落默认', () => {
  assert.equal(ANALYZE_IMAGE_MAX_DEFAULT, 6)
  assert.equal(ANALYZE_IMAGE_MAX_HARD, 20)
  assert.equal(clampAnalyzeImageMaxCount(undefined), 6)
  assert.equal(clampAnalyzeImageMaxCount(''), 6)
  assert.equal(clampAnalyzeImageMaxCount('abc'), 6)
  assert.equal(clampAnalyzeImageMaxCount(0), 1, '0 也必须落在 >=1')
  assert.equal(clampAnalyzeImageMaxCount(-5), 1)
  assert.equal(clampAnalyzeImageMaxCount(1), 1)
  assert.equal(clampAnalyzeImageMaxCount('3'), 3)
  assert.equal(clampAnalyzeImageMaxCount(3.9), 3)
  assert.equal(clampAnalyzeImageMaxCount(999), 20)
})

test('collectImageRefs：数组按顺序、去重，混合时路径在前', () => {
  const refs = collectImageRefs({
    image_paths: ['a.png', 'b.png', 'a.png'],
    attachment_ids: ['sha256:1111', 'sha256:2222', 'sha256:1111']
  })
  assert.deepEqual(refs.map((r) => r.kind + ':' + r.value), [
    'path:a.png', 'path:b.png', 'attachment:sha256:1111', 'attachment:sha256:2222'
  ])
})

test('collectImageRefs：单值兼容 —— attachment_id 优先于 image_path', () => {
  assert.deepEqual(collectImageRefs({ attachment_id: 'sha256:aa', image_path: 'x.png' }).map((r) => r.value), ['sha256:aa'])
  assert.deepEqual(collectImageRefs({ image_path: 'x.png' }).map((r) => r.value), ['x.png'])
  assert.deepEqual(collectImageRefs({}), [])
})

test('collectImageRefs：数组存在时忽略同名单值（避免重复）', () => {
  const refs = collectImageRefs({ image_paths: ['a.png'], image_path: 'b.png' })
  assert.deepEqual(refs.map((r) => r.value), ['a.png'])
})

test('buildProtocolText：单图不前缀，多图列「图1/图2」', () => {
  assert.equal(buildProtocolText('有什么？', [{ label: 'a.png' }]), '有什么？')
  assert.equal(buildProtocolText('有什么？', []), '有什么？')
  const multi = buildProtocolText('图1 和图2 有什么区别？', [{ label: 'a.png' }, { label: 'b.png' }])
  assert.ok(multi.startsWith('图1：a.png\n图2：b.png'))
  assert.ok(multi.endsWith('图1 和图2 有什么区别？'))
})

test('protocolBody：四种协议都按顺序放多图，文本块在前', () => {
  const imgs = [
    { dataUrl: 'data:image/png;base64,AAA', mime: 'image/png', base64: 'AAA', label: 'a.png' },
    { dataUrl: 'data:image/png;base64,BBB', mime: 'image/png', base64: 'BBB', label: 'b.png' }
  ]
  const card = (protocol) => ({ protocol, model: 'm', maxOutput: 100 })

  const oc = protocolBody(card('openai-completions'), 'Q', imgs)
  assert.equal(oc.messages[0].content.length, 3, 'text + 2 images')
  assert.equal(oc.messages[0].content[0].type, 'text')
  assert.equal(oc.messages[0].content.filter((b) => b.type === 'image_url').length, 2)
  assert.equal(oc.messages[0].content[0].text.split('\n')[0], '图1：a.png')

  const oresp = protocolBody(card('openai-responses'), 'Q', imgs)
  assert.equal(oresp.input[0].content.filter((b) => b.type === 'input_image').length, 2)

  const an = protocolBody(card('anthropic-messages'), 'Q', imgs)
  assert.equal(an.messages[0].content.filter((b) => b.type === 'image').length, 2)
  assert.equal(an.messages[0].content[1].source.data, 'AAA', '顺序不能乱')

  const gem = protocolBody(card('google-gemini'), 'Q', imgs)
  assert.equal(gem.contents[0].parts.filter((p) => p.inline_data).length, 2)
  assert.equal(gem.contents[0].parts[0].text.split('\n')[0], '图1：a.png')
})

test('protocolBody：单图调用与 v2.17 逐字节一致（无前缀）', () => {
  const b = protocolBody({ protocol: 'openai-completions', model: 'm', maxOutput: 10 }, 'Q', 'data:image/png;base64,IMG', 'image/png', 'IMG')
  assert.deepEqual(b.messages[0].content, [
    { type: 'text', text: 'Q' },
    { type: 'image_url', image_url: { url: 'data:image/png;base64,IMG' } }
  ])
})

// ---------- resolveImages（硬上限） ----------

test('resolveImages：按顺序解析并带标签', async () => {
  writeCfg()
  apply(makeFakeCtx({}))
  const a = join(dshHome, 'a.png'); writeFileSync(a, PNG)
  const b = join(dshHome, 'b.jpg'); writeFileSync(b, JPEG)
  const imgs = await resolveImages(makeExec([]), { image_paths: [a, b] }, 6)
  assert.equal(imgs.length, 2)
  assert.deepEqual(imgs.map((i) => i.label), ['a.png', 'b.jpg'])
  assert.equal(imgs[0].mime, 'image/png')
  assert.equal(imgs[1].mime, 'image/jpeg')
})

test('resolveImages：超过上限直接抛错，错误里带当前上限', async () => {
  writeCfg()
  apply(makeFakeCtx({}))
  const a = join(dshHome, 'a.png'); writeFileSync(a, PNG)
  const b = join(dshHome, 'b.png'); writeFileSync(b, PNG)
  await assert.rejects(() => resolveImages(makeExec([]), { image_paths: [a, b] }, 1), /单次最多 1 张图片，本次传入 2 张/)
})

// ---------- execute 端到端 ----------

const CARD = (port) => ({
  vlmEnabled: true,
  apis: [{ id: 'c_1', name: 'Test', provider: 'custom', protocol: 'openai-completions', endpoint: 'http://127.0.0.1:' + port + '/v1', apiKey: 'sk-test', model: 'test-model' }]
})

test('execute：两张图进同一个请求，返回 imageCount=2', async () => {
  const { server, requests, port } = await startServer()
  try {
    writeCfg(CARD(port))
    apply(makeFakeCtx({}))
    const a = join(dshHome, 'v1.png'); writeFileSync(a, PNG)
    const b = join(dshHome, 'v2.png'); writeFileSync(b, PNG)
    const result = await toolDef.execute({ image_paths: [a, b], question: '图1 和图2 有什么区别？' }, makeExec([]))
    assert.equal(result.ok, true)
    assert.equal(result.imageCount, 2)
    assert.equal(requests.length, 1, '多图必须合并成一次请求')
    const body = JSON.parse(requests[0].body)
    assert.equal(body.messages[0].content.filter((x) => x.type === 'image_url').length, 2)
    assert.ok(body.messages[0].content[0].text.includes('图1：v1.png'))
    assert.ok(body.messages[0].content[0].text.includes('图2：v2.png'))
  } finally { server.close() }
})

test('execute：上限=1 时两张图被拒，且完全不发请求', async () => {
  const { server, requests, port } = await startServer()
  try {
    writeCfg(Object.assign(CARD(port), { globalConfig: { analyzeImageMaxCount: 1 } }))
    apply(makeFakeCtx({}))
    const a = join(dshHome, 'x1.png'); writeFileSync(a, PNG)
    const b = join(dshHome, 'x2.png'); writeFileSync(b, PNG)
    await assert.rejects(() => toolDef.execute({ image_paths: [a, b], question: 'q' }, makeExec([])), /单次最多 1 张图片/)
    assert.equal(requests.length, 0, '硬拦截必须发生在网络请求之前')
  } finally { server.close() }
})

test('execute：路径与附件混用，按数组顺序编号', async () => {
  const { server, requests, port } = await startServer()
  try {
    writeCfg(CARD(port))
    const attachments = { readImage: async (ref) => ({ ref, data: PNG }) }
    apply(makeFakeCtx(attachments))
    const a = join(dshHome, 'mixed.png'); writeFileSync(a, PNG)
    const exec = makeExec([userImageEvent({ attachmentId: 'sha256:abcdef1234567890', name: '截图.png' })])
    const result = await toolDef.execute({ image_paths: [a], attachment_ids: ['sha256:abcdef1234567890'], question: '对比一下' }, exec)
    assert.equal(result.imageCount, 2)
    const body = JSON.parse(requests[0].body)
    assert.equal(body.messages[0].content.filter((x) => x.type === 'image_url').length, 2)
    const text = body.messages[0].content[0].text
    assert.ok(text.includes('图1：mixed.png'))
    assert.ok(text.includes('图2：附件 abcdef12'), '附件用短 id 作标签: ' + text)
  } finally { server.close() }
})

test('execute：附件 id 短前缀（文本模型看到的 8 位句柄）可解析', async () => {
  const { server, requests, port } = await startServer()
  try {
    writeCfg(CARD(port))
    const attachments = { readImage: async (ref) => ({ ref, data: PNG }) }
    apply(makeFakeCtx(attachments))
    const exec = makeExec([userImageEvent({ attachmentId: 'sha256:abcdef1234567890' })])
    const result = await toolDef.execute({ attachment_ids: ['sha256:abcdef12'], question: '这是什么？' }, exec)
    assert.equal(result.ok, true)
    assert.equal(result.imageCount, 1)
    assert.ok(requests[0].body.includes('data:image/png;base64,'))
  } finally { server.close() }
})

test('execute：前缀命中多个时报错并提示加长', async () => {
  const { server } = await startServer()
  try {
    writeCfg(CARD(server.address().port))
    apply(makeFakeCtx({ readImage: async (ref) => ({ ref, data: PNG }) }))
    const exec = makeExec([
      userImageEvent({ attachmentId: 'sha256:abcd1111' }),
      userImageEvent({ attachmentId: 'sha256:abcd2222' })
    ])
    await assert.rejects(() => toolDef.execute({ attachment_ids: ['sha256:abcd'], question: 'q' }, exec), /前缀 "sha256:abcd" 不唯一/)
  } finally { server.close() }
})
