// png-decode.test.js — vendored PNG decoder (Task 1)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deflateSync } from 'node:zlib'
import { encodePng, decodePng } from '../lib/vendor/png.js'

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function makePng({ width, height, colorType = 6, bitDepth = 8, raw, extraChunks = [] }) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = bitDepth
  ihdr[9] = colorType
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  const crc32 = (buf, start, end) => {
    let c = 0xffffffff
    for (let i = start; i < end; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      t[n] = c >>> 0
    }
    return t
  })()
  const chunk = (type, data) => {
    const out = Buffer.alloc(12 + data.length)
    out.writeUInt32BE(data.length, 0)
    out.write(type, 4, 'ascii')
    data.copy(out, 8)
    out.writeUInt32BE(crc32(out, 4, 8 + data.length), 8 + data.length)
    return out
  }
  const parts = [SIGNATURE, chunk('IHDR', ihdr)]
  for (const [type, data] of (extraChunks || [])) parts.push(chunk(type, data))
  parts.push(chunk('IDAT', deflateSync(raw)))
  parts.push(chunk('IEND', Buffer.alloc(0)))
  return Buffer.concat(parts)
}

// Build a scanline stream with NONE filters for full-raster so tests control
// bytes exactly; SUB/AVERAGE/PAETH filter paths are covered by roundtrip below.
const noFilterRaw = (lines, stride) => {
  const out = []
  for (const line of lines) {
    out.push(0) // filter type NONE
    for (let i = 0; i < stride; i++) out.push(line[i])
  }
  return Buffer.from(out)
}

test('roundtrip: encodePng then decodePng recovers RGBA exactly', () => {
  const w = 7
  const h = 5
  const rgba = new Uint8Array(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4] = (i * 37) & 0xff
    rgba[i * 4 + 1] = (i * 91 + 5) & 0xff
    rgba[i * 4 + 2] = (i * 13) & 0xff
    rgba[i * 4 + 3] = ((i % 11) === 0 ? 0 : 255)
  }
  const png = encodePng(rgba, w, h)
  const out = decodePng(png)
  assert.equal(out.width, w)
  assert.equal(out.height, h)
  assert.equal(out.data.byteLength, w * h * 4)
  for (let i = 0; i < out.data.length; i++) assert.equal(out.data[i], rgba[i], 'pixel byte ' + i)
})

test('decodes truecolor (color type 2) without alpha', () => {
  const w = 2
  const h = 2
  // pixels: red, green / blue, white
  const raw = noFilterRaw([
    [255, 0, 0, 0, 255, 0],
    [0, 0, 255, 255, 255, 255]
  ], 6)
  const png = makePng({ width: w, height: h, colorType: 2, raw })
  const out = decodePng(png)
  assert.deepEqual([...out.data.slice(0, 4)], [255, 0, 0, 255])
  assert.deepEqual([...out.data.slice(4, 8)], [0, 255, 0, 255])
  assert.deepEqual([...out.data.slice(8, 12)], [0, 0, 255, 255])
  assert.deepEqual([...out.data.slice(12, 16)], [255, 255, 255, 255])
})

test('decodes grayscale (color type 0)' , () => {
  const raw = noFilterRaw([[10, 200]], 2)
  const png = makePng({ width: 2, height: 1, colorType: 0, raw })
  const out = decodePng(png)
  assert.deepEqual([...out.data.slice(0, 4)], [10, 10, 10, 255])
  assert.deepEqual([...out.data.slice(4, 8)], [200, 200, 200, 255])
})

test('decodes indexed (color type 3) with palette + tRNS', () => {
  // palette: entry0 = red, entry1 = blue
  const plte = Buffer.from([255, 0, 0, 0, 0, 255])
  // tRNS: entry0 opaque(255), entry1 transparent(0)
  const trns = Buffer.from([255, 0])
  const raw = noFilterRaw([[0, 1]], 2)
  const png = makePng({ width: 2, height: 1, colorType: 3, raw, extraChunks: [['PLTE', plte], ['tRNS', trns]] })
  const out = decodePng(png)
  assert.deepEqual([...out.data.slice(0, 4)], [255, 0, 0, 255])
  assert.deepEqual([...out.data.slice(4, 8)], [0, 0, 255, 0])
})

test('decodes grayscale+alpha (color type 4)', () => {
  const raw = noFilterRaw([[128, 64, 0, 255]], 4)
  const png = makePng({ width: 2, height: 1, colorType: 4, raw })
  const out = decodePng(png)
  assert.deepEqual([...out.data.slice(0, 4)], [128, 128, 128, 64])
  assert.deepEqual([...out.data.slice(4, 8)], [0, 0, 0, 255])
})

test('rejects unsupported variants with PNG_UNSUPPORTED code', () => {
  // 16-bit truecolor
  const raw16 = noFilterRaw([[0, 0, 0, 0, 0, 0]], 6)
  assert.throws(() => decodePng(makePng({ width: 1, height: 1, colorType: 2, bitDepth: 16, raw: raw16 })), (e) => e.code === 'PNG_UNSUPPORTED')
  // bad signature
  assert.throws(() => decodePng(Buffer.concat([Buffer.alloc(8, 1), Buffer.alloc(64)])), (e) => e.code === 'PNG_UNSUPPORTED')
  // empty
  assert.throws(() => decodePng(Buffer.alloc(0)), (e) => e.code === 'PNG_UNSUPPORTED')
})