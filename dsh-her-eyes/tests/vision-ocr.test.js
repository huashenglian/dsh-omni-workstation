// vision-ocr.test.js — OCR 工具测试（不依赖系统是否安装 Tesseract）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { encodePng } from '../lib/vendor/png.js'
import { buildVisionToolDefs, _resetTesseractProbe } from '../lib/vision-tools.js'

function pngBytes() {
  const data = new Uint8Array(4 * 4 * 4)
  for (let i = 0; i < 4 * 4; i++) data[i * 4 + 3] = 255
  return encodePng(data, 4, 4)
}

function makeDeps() {
  const state = { buffer: pngBytes(), mime: 'image/png', width: 4, height: 4, vlmCalls: 0, vlmAnswer: '识别文本' }
  const deps = {
    getCtx: () => ({ get: () => undefined }),
    loadConfig: async () => ({}),
    resolveImage: async () => ({ buffer: state.buffer, mime: state.mime, width: state.width, height: state.height }),
    askVlm: async () => { state.vlmCalls++; return { text: state.vlmAnswer, model: 'mock-model', api: 'mock-api' } }
  }
  return { deps, state }
}

const exec = { agent: { meta: { cwd: process.cwd() } } }

test('ocr_image engine=local 探测不可用 → LOCAL_OCR_UNAVAILABLE', async () => {
  // 把 HER_EYES_TESSERACT 指向 node 可执行文件：--version 探测成功（缓存为 node），
  // 但真正以 tesseract 参数调用会失败 → 结果确定地返回 LOCAL_OCR_UNAVAILABLE，
  // 与系统是否安装 Tesseract 无关。
  process.env.HER_EYES_TESSERACT = process.execPath
  _resetTesseractProbe()
  try {
    const { deps } = makeDeps()
    const byName = Object.fromEntries(buildVisionToolDefs(deps).map((t) => [t.name, t]))
    const r = await byName.ocr_image.execute({ image_path: '/x.png', engine: 'local' }, exec)
    assert.equal(r.ok, false)
    assert.equal(r.code, 'LOCAL_OCR_UNAVAILABLE')
    assert.equal(r.engine, undefined)
  } finally {
    delete process.env.HER_EYES_TESSERACT
    _resetTesseractProbe()
  }
})

test('ocr_image engine=vlm 调用 stub askVlm 并返回 engine:vlm', async () => {
  const { deps, state } = makeDeps()
  const byName = Object.fromEntries(buildVisionToolDefs(deps).map((t) => [t.name, t]))
  const r = await byName.ocr_image.execute({ image_path: '/x.png', engine: 'vlm' }, exec)
  assert.equal(r.ok, true)
  assert.equal(r.engine, 'vlm')
  assert.equal(r.text, '识别文本')
  assert.equal(state.vlmCalls, 1)
})

test('ocr_image engine=auto 无本地引擎 → 降级走 VLM', async () => {
  // 指向 node 使本地探测“看似可用但识别失败” → auto 应降级 VLM
  process.env.HER_EYES_TESSERACT = process.execPath
  _resetTesseractProbe()
  try {
    const { deps, state } = makeDeps()
    const byName = Object.fromEntries(buildVisionToolDefs(deps).map((t) => [t.name, t]))
    const r = await byName.ocr_image.execute({ image_path: '/x.png', engine: 'auto' }, exec)
    assert.equal(r.ok, true)
    assert.equal(r.engine, 'vlm')
    assert.equal(r.text, '识别文本')
    assert.equal(state.vlmCalls, 1)
  } finally {
    delete process.env.HER_EYES_TESSERACT
    _resetTesseractProbe()
  }
})

test('ocr_image render 成功含 OCR 结果与引擎标注', () => {
  const { deps } = makeDeps()
  const byName = Object.fromEntries(buildVisionToolDefs(deps).map((t) => [t.name, t]))
  const blocks = byName.ocr_image.output.render({}, { ok: true, engine: 'vlm', text: 'hello', model: 'm' })
  assert.ok(blocks[0].text.includes('## OCR 结果'))
  assert.ok(blocks[0].text.includes('视觉模型'))
  assert.ok(blocks[0].text.includes('hello'))
})