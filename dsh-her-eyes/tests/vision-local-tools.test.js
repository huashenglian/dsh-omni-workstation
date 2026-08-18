// vision-local-tools.test.js — 视觉工具箱工具级测试（假 deps，纯像素与 stub VLM）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { encodePng } from '../lib/vendor/png.js'
import { buildVisionToolDefs } from '../lib/vision-tools.js'

// 构造 RGBA 像素图并编码为 PNG
function makePng(width, height, fill, paint) {
  const data = new Uint8Array(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    const o = i * 4
    data[o] = fill[0]
    data[o + 1] = fill[1]
    data[o + 2] = fill[2]
    data[o + 3] = fill[3]
    if (paint) paint(data, o, i, width, height)
  }
  return { buffer: encodePng(data, width, height), width, height, data }
}

// 预置状态对象 + 假 deps
const execCwd = mkdtempSync(join(tmpdir(), 'her-eyes-vtools-'))
const exec = { agent: { meta: { cwd: execCwd } } }

function makeDeps() {
  const state = {
    buffer: null,
    width: 0,
    height: 0,
    mime: 'image/png',
    attachments: undefined,
    vlmCalls: 0,
    vlmAnswer: '[]'
  }
  const deps = {
    getCtx: () => ({ get: (name) => (name === 'attachments' ? state.attachments : undefined) }),
    loadConfig: async () => ({}),
    resolveImage: async () => ({ buffer: state.buffer, mime: state.mime, width: state.width, height: state.height }),
    askVlm: async (ctx, buffer, mime, question, exec2, opts) => {
      state.vlmCalls++
      return { text: state.vlmAnswer, model: 'mock-model', api: 'mock-api' }
    }
  }
  return { deps, state }
}

function build(state) {
  const { deps } = makeDeps()
  const tools = buildVisionToolDefs(deps)
  const byName = Object.fromEntries(tools.map((t) => [t.name, t]))
  return { tools, byName, state }
}

function buildByName(deps) {
  return Object.fromEntries(buildVisionToolDefs(deps).map((t) => [t.name, t]))
}

function assertHeld(tools, names) {
  for (const n of names) {
    assert.equal(typeof tools[n], 'object')
    assert.equal(typeof tools[n].execute, 'function')
    assert.equal(typeof tools[n].output.render, 'function')
  }
}

test('buildVisionToolDefs 返回 6 个工具定义', () => {
  const { byName } = build(null)
  assertHeld(byName, ['zoom_image', 'sample_colors', 'image_diff', 'ocr_image', 'detect_elements', 'show_image'])
})

// ---------- zoom_image ----------
test('zoom_image 分数裁剪尺寸正确', async () => {
  const img = makePng(100, 100, [200, 200, 200, 255])
  const { deps, state } = makeDeps()
  Object.assign(state, { buffer: img.buffer, width: img.width, height: img.height })
  const byName = buildByName(deps)
  const r = await byName.zoom_image.execute({ image_path: '/x.png', region: '0,0,0.5,0.5' }, exec)
  assert.equal(r.ok, true)
  assert.equal(r.width, 50)
  assert.equal(r.height, 50)
  assert.equal(r.source_width, 100)
  assert.equal(r.source_height, 100)
  assert.ok(typeof r.path === 'string' && r.path.length > 0)
})

test('zoom_image 越界 clamp', async () => {
  const img = makePng(100, 60, [10, 10, 10, 255])
  const { deps, state } = makeDeps()
  Object.assign(state, { buffer: img.buffer, width: img.width, height: img.height })
  const byName = buildByName(deps)
  const r = await byName.zoom_image.execute({ image_path: '/x.png', region: '0,0,500,500' }, exec)
  assert.equal(r.ok, true)
  assert.equal(r.width, 100)
  assert.equal(r.height, 60)
})

test('zoom_image 退化 region 抛错含尺寸', async () => {
  const img = makePng(100, 80, [10, 10, 10, 255])
  const { deps, state } = makeDeps()
  Object.assign(state, { buffer: img.buffer, width: img.width, height: img.height })
  const byName = buildByName(deps)
  await assert.rejects(
    () => byName.zoom_image.execute({ image_path: '/x.png', region: '10,10,5,5' }, exec),
    /图片尺寸 100x80/
  )
})

// ---------- sample_colors ----------
test('sample_colors 纯色图首色为 bin 色且占比≈1', async () => {
  const img = makePng(8, 8, [255, 0, 0, 255])
  const { deps, state } = makeDeps()
  Object.assign(state, { buffer: img.buffer, width: img.width, height: img.height })
  const byName = buildByName(deps)
  const r = await byName.sample_colors.execute({ image_path: '/x.png' }, exec)
  assert.equal(r.ok, true)
  assert.equal(r.colors[0].hex, '#f80000')
  assert.ok(Math.abs(r.colors[0].share - 1) < 0.01)
})

test('sample_colors region 生效（限定区域颜色）', async () => {
  // 上半红、下半蓝
  const img = makePng(8, 8, [255, 0, 0, 255], (data, o, i, w, h) => {
    const y = Math.floor(i / w)
    if (y >= 4) { data[o] = 0; data[o + 1] = 0; data[o + 2] = 255 }
  })
  const { deps, state } = makeDeps()
  Object.assign(state, { buffer: img.buffer, width: img.width, height: img.height })
  const byName = buildByName(deps)
  // 只采样左上 (0,0,0.5,0.5)：应全是红
  const r = await byName.sample_colors.execute({ image_path: '/x.png', region: '0,0,0.5,0.5' }, exec)
  assert.equal(r.colors[0].hex, '#f80000')
  assert.ok(Math.abs(r.colors[0].share - 1) < 0.01)
})

// ---------- image_diff ----------
test('image_diff 同图差异率 0', async () => {
  const img = makePng(80, 80, [200, 200, 200, 255])
  const base = img.buffer
  const { deps, state } = makeDeps()
  Object.assign(state, { buffer: base, width: img.width, height: img.height })
  const byName = buildByName(deps)
  const r = await byName.image_diff.execute({ original: '/a.png', compare: '/b.png' }, exec)
  assert.equal(r.ok, true)
  assert.equal(r.diffRatio, 0)
  assert.equal(r.worstRegions.length, 0)
  assert.ok(typeof r.heatmapPath === 'string')
})

// 让 resolveImage 能区分 original/compare
test('image_diff 一角差异图命中 worstRegions', async () => {
  const orig = makePng(80, 80, [255, 255, 255, 255])
  const cmp = makePng(80, 80, [255, 255, 255, 255], (data, o, i, w, h) => {
    const y = Math.floor(i / w)
    const x = i % w
    if (x < 10 && y < 10) { data[o] = 0; data[o + 1] = 0; data[o + 2] = 0 }
  })
  const deps = {
    getCtx: () => ({ get: () => undefined }),
    loadConfig: async () => ({}),
    resolveImage: async (exec, args) => {
      // 实际调用只传 image_path（resolveEither 拆解 original/compare 后以 image_path 传递）
      const which = String(args.image_path || '').includes('cmp') ? cmp : orig
      return { buffer: which.buffer, mime: 'image/png', width: which.width, height: which.height }
    },
    askVlm: async () => ({ text: '', model: '', api: '' })
  }
  const byName = buildByName(deps)
  const r = await byName.image_diff.execute({ original: '/orig.png', compare: '/cmp.png', threshold: 16 }, exec)
  assert.equal(r.ok, true)
  assert.equal(r.diffRatio, 1 / 64)
  assert.equal(r.diffCells, 1)
  assert.equal(r.worstRegions.length, 1)
  assert.equal(r.worstRegions[0].cell, 0)
  assert.ok(typeof r.heatmapPath === 'string')
})

// ---------- show_image ----------
test('show_image attachments 服务缺失 → attachment 省略，render 无 image 块', async () => {
  const img = makePng(6, 6, [10, 20, 30, 255])
  const { deps, state } = makeDeps()
  state.attachments = undefined
  Object.assign(state, { buffer: img.buffer, width: img.width, height: img.height })
  const byName = buildByName(deps)
  const r = await byName.show_image.execute({ image_path: '/abs/x.png' }, exec)
  assert.equal(r.ok, true)
  assert.equal(r.width, 6)
  assert.equal(r.height, 6)
  assert.equal(r.path, '/abs/x.png')
  assert.ok(!('attachment' in r), 'attachment 服务缺失时应省略 attachment 键')
  const blocks = byName.show_image.output.render({}, r)
  assert.equal(blocks.length, 1)
  assert.equal(blocks[0].type, 'text')
  assert.ok(blocks[0].text.includes('## 图片展示'))
  assert.ok(!blocks.some((b) => b.type === 'image'))
})

test('show_image attachments.saveImage 存在 → attachment 返回且 render 含 image 块', async () => {
  const img = makePng(6, 6, [10, 20, 30, 255])
  const { deps, state } = makeDeps()
  const ref = { attachmentId: 'att_1' }
  state.attachments = { saveImage: async (p) => { state.saved = p; return ref } }
  Object.assign(state, { buffer: img.buffer, width: img.width, height: img.height })
  const byName = buildByName(deps)
  const r = await byName.show_image.execute({ image_path: '/abs/x.png', label: '我的图' }, exec)
  assert.equal(r.ok, true)
  assert.equal(r.attachment, ref)
  assert.equal(state.saved.mediaType, 'image/png')
  assert.ok(Buffer.isBuffer(state.saved.data))
  const blocks = byName.show_image.output.render({}, r)
  assert.ok(blocks.some((b) => b.type === 'image' && b.attachment === ref))
  assert.ok(blocks.some((b) => b.type === 'text' && b.text.includes('我的图')))
})

// ---------- detect_elements ----------
test('detect_elements 解析 VLM JSON 并绘制标注图', async () => {
  const img = makePng(60, 60, [255, 255, 255, 255])
  const { deps, state } = makeDeps()
  state.attachments = undefined
  Object.assign(state, { buffer: img.buffer, width: img.width, height: img.height })
  state.vlmAnswer = '[{"number":1,"label":"按钮","box":{"x1":0,"y1":0,"x2":20,"y2":20}},{"number":2,"label":"输入框","box":{"x1":5,"y1":5,"x2":3,"y2":30}}]'
  const byName = buildByName(deps)
  const r = await byName.detect_elements.execute({ image_path: '/x.png' }, exec)
  assert.equal(r.ok, true)
  assert.equal(state.vlmCalls, 1)
  assert.equal(r.elements.length, 1, '退化 box（x2<=x1）应被丢弃')
  assert.equal(r.elements[0].number, 1)
  assert.equal(r.elements[0].label, '按钮')
  assert.deepEqual(r.elements[0].box, { x1: 0, y1: 0, x2: 20, y2: 20 })
  assert.ok(typeof r.annotatedPath === 'string' && r.annotatedPath.length > 0)
})

test('detect_elements 模型返回非 JSON → 重试一次成功', async () => {
  const img = makePng(20, 20, [10, 10, 10, 255])
  const { deps, state } = makeDeps()
  Object.assign(state, { buffer: img.buffer, width: img.width, height: img.height })
  // 第一次返回被包裹的非法 JSON，第二次返回合法数组
  let call = 0
  deps.askVlm = async () => {
    call++
    if (call === 1) return { text: '```json\n{"x":1}\n```', model: 'm', api: 'a' }
    return { text: '[{"number":1,"label":"图标","box":{"x1":2,"y1":2,"x2":10,"y2":10}}]', model: 'm', api: 'a' }
  }
  const byName = buildByName(deps)
  const r = await byName.detect_elements.execute({ image_path: '/x.png' }, exec)
  assert.equal(r.ok, true)
  assert.equal(call, 2)
  assert.equal(r.elements.length, 1)
  assert.equal(r.elements[0].label, '图标')
})

test('detect_elements 两次都非 JSON → VLM_BAD_JSON', async () => {
  const img = makePng(20, 20, [10, 10, 10, 255])
  const { deps, state } = makeDeps()
  Object.assign(state, { buffer: img.buffer, width: img.width, height: img.height })
  state.vlmAnswer = '抱歉我无法识别'
  const byName = buildByName(deps)
  const r = await byName.detect_elements.execute({ image_path: '/x.png' }, exec)
  assert.equal(r.ok, false)
  assert.equal(r.code, 'VLM_BAD_JSON')
  assert.ok(typeof r.raw === 'string')
})