// vision-helpers.test.js — 纯像素助手（parseRegion / decodeAny / quantizeColors /
// nearestDownscale / gridDiff / drawBoxes / saveArtifact）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { encodePng, decodePng } from '../lib/vendor/png.js'
import {
  parseRegion,
  decodeAny,
  quantizeColors,
  nearestDownscale,
  gridDiff,
  drawBoxes,
  saveArtifact
} from '../lib/vision-tools.js'

// 生成纯色 PNG（RGBA render: 值域 0..255）
function solidPng(width, height, [r, g, b, a]) {
  const data = new Uint8Array(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    const o = i * 4
    data[o] = r
    data[o + 1] = g
    data[o + 2] = b
    data[o + 3] = a
  }
  return encodePng(data, width, height)
}

test('parseRegion 分数裁剪 → 整数像素范围', () => {
  const r = parseRegion('0.5,0.25,1,1', 100, 80)
  assert.equal(r.x1, 50)
  assert.equal(r.y1, 20)
  assert.equal(r.x2, 100)
  assert.equal(r.y2, 80)
})

test('parseRegion 像素模式 + 容忍空格与逗号', () => {
  const r = parseRegion('10, 20, 30, 40', 100, 100)
  assert.deepEqual(r, { x1: 10, y1: 20, x2: 30, y2: 40 })
})

test('parseRegion 越界自动 clamp', () => {
  const r = parseRegion('-5, -5, 500, 500', 100, 80)
  assert.equal(r.x1, 0)
  assert.equal(r.y1, 0)
  assert.equal(r.x2, 100)
  assert.equal(r.y2, 80)
})

test('parseRegion 退化抛错并含当前尺寸', () => {
  assert.throws(() => parseRegion('10,10,5,5', 100, 80), /region 区域退化/)
  assert.throws(() => parseRegion('10,10,5,5', 100, 80), /图片尺寸 100x80/)
  assert.throws(() => parseRegion('5,5,5,20', 100, 80), /region 区域退化/)
  // 格式错误
  assert.throws(() => parseRegion('1,2,3', 100, 80), /格式应为/)
})

test('decodeAny PNG roundtrip', () => {
  const png = solidPng(8, 6, [10, 20, 30, 255])
  const img = decodeAny(png, 'image/png')
  assert.equal(img.width, 8)
  assert.equal(img.height, 6)
  assert.equal(img.data.length, 8 * 6 * 4)
  assert.equal(img.data[0], 10)
  assert.equal(img.data[1], 20)
  assert.equal(img.data[2], 30)
})

test('decodeAny mime 为空时用魔数嗅探（PNG）', () => {
  const png = solidPng(4, 4, [1, 2, 3, 255])
  const img = decodeAny(png, '')
  assert.equal(img.width, 4)
  assert.equal(img.height, 4)
})

test('decodeAny 未知 mime 抛错', () => {
  const bytes = Buffer.alloc(64, 1)
  assert.throws(() => decodeAny(bytes, 'image/webp'), /不支持该图片类型：image\/webp/)
  assert.throws(() => decodeAny(Buffer.alloc(4, 0), ''), /不支持该图片类型/)
})

test('quantizeColors 纯色图 → 首色为该 bin 色且占比≈1', () => {
  const data = new Uint8Array(8 * 8 * 4)
  for (let i = 0; i < 8 * 8; i++) {
    const o = i * 4
    data[o] = 255; data[o + 1] = 0; data[o + 2] = 0; data[o + 3] = 255
  }
  const colors = quantizeColors(data, 8, 8, 4)
  assert.equal(colors[0].hex, '#f80000') // (255>>3)<<3 = 248
  assert.ok(Math.abs(colors[0].share - 1) < 1e-9)
  assert.equal(colors.length, 1)
})

test('quantizeColors 跳过 alpha<128 像素（全透明 → 空结果）', () => {
  const data = new Uint8Array(2 * 2 * 4)
  const colors = quantizeColors(data, 2, 2, 4)
  assert.equal(colors.length, 0) // 无有效像素
})

test('nearestDownscale 大图降采样到 maxPixels 内', () => {
  const w = 1000
  const h = 1000
  const data = new Uint8Array(w * h * 4)
  const out = nearestDownscale(data, w, h, 250000) // 目标 500x500
  assert.ok(out.width * out.height <= 250000)
  assert.ok(out.width < w)
  assert.equal(out.data.length, out.width * out.height * 4)
})

test('gridDiff 同图差异率 0', () => {
  const w = 80
  const h = 80
  const d = new Uint8Array(w * h * 4)
  for (let i = 0; i < w * h; i++) d[i * 4 + 3] = 255
  const out = gridDiff(d, d, w, h, 16)
  assert.equal(out.diffRatio, 0)
  assert.deepEqual(out.worstRegions, [])
})

test('gridDiff 角落差异命中 worstRegions（cell 0）', () => {
  const w = 80
  const h = 80
  const a = new Uint8Array(w * h * 4)
  const b = new Uint8Array(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    a[i * 4] = 255; a[i * 4 + 1] = 255; a[i * 4 + 2] = 255; a[i * 4 + 3] = 255
    b[i * 4] = 255; b[i * 4 + 1] = 255; b[i * 4 + 2] = 255; b[i * 4 + 3] = 255
  }
  // cell (0,0) 覆盖 x<10,y<10 → 填黑
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      const o = (y * w + x) * 4
      b[o] = 0; b[o + 1] = 0; b[o + 2] = 0
    }
  }
  const out = gridDiff(a, b, w, h, 16)
  assert.equal(out.diffRatio, 1 / 64)
  assert.equal(out.worstRegions.length, 1)
  assert.equal(out.worstRegions[0].cell, 0)
  assert.equal(out.worstRegions[0].box.x1, 0)
  assert.equal(out.worstRegions[0].box.y1, 0)
  assert.equal(out.heatWidth, w)
  assert.equal(out.heatHeight, h)
  assert.equal(out.heatmapRgba.length, w * h * 4)
})

test('gridDiff 热力图在角落 cell 应为红色', () => {
  const w = 80
  const h = 80
  const a = new Uint8Array(w * h * 4)
  const b = new Uint8Array(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    a[i * 4] = 255; a[i * 4 + 1] = 255; a[i * 4 + 2] = 255; a[i * 4 + 3] = 255
    b[i * 4] = 255; b[i * 4 + 1] = 255; b[i * 4 + 2] = 255; b[i * 4 + 3] = 255
  }
  for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) { b[(y * w + x) * 4] = 0 }
  const out = gridDiff(a, b, w, h, 16)
  // 位置 (0,0) 在差异 cell 内 → R 通道被加强
  assert.equal(out.heatmapRgba[0], 255)
  assert.ok(out.heatmapRgba[1] < 255) // 绿色被压低 → 偏红
})

test('drawBoxes 返回新 RGBA 并绘制边框（不改原数据）', () => {
  const w = 20
  const h = 20
  const src = new Uint8Array(w * h * 4)
  for (let i = 0; i < w * h; i++) { src[i * 4 + 3] = 255 }
  const boxes = [{ x1: 2, y1: 2, x2: 6, y2: 6 }]
  const out = drawBoxes(src, w, h, boxes)
  assert.notEqual(out, src, '应返回新 buffer')
  // 边框顶部中央像素变为红色（默认 palette[0] #ff0000）
  const o = (2 * w + 3) * 4
  assert.equal(out[o], 255)
  assert.equal(out[o + 1], 0)
  assert.equal(out[o + 2], 0)
  // 原始数据未被修改
  assert.equal(src[o], 0)
})

test('saveArtifact 落盘到 exec.meta.cwd/.omni-workstation/artifacts', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'omni-workstation-art-'))
  const exec = { agent: { meta: { cwd } } }
  const file = saveArtifact(exec, 'x_123.png', Buffer.from([1, 2, 3]))
  assert.ok(existsSync(file))
  assert.equal(file, join(cwd, '.omni-workstation', 'artifacts', 'x_123.png'))
})