// Minimal PNG encoder (RGBA -> PNG bytes) using only node:zlib.
// Used as a re-encode fallback when a VLM endpoint rejects a JPEG payload.
// PNG format: 8-byte signature + IHDR + IDAT (zlib deflate) + IEND, all with CRC32.
import { deflateSync } from 'node:zlib'

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

// Standard CRC-32 (IEEE 802.3, reflected, poly 0xEDB88320) lookup table.
const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf, start, end) {
  let crc = 0xffffffff
  for (let i = start; i < end; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(out, 4, 8 + data.length), 8 + data.length)
  return out
}

/**
 * Encode an RGBA pixel buffer into PNG bytes.
 * @param rgba - pixel data (4 bytes per pixel, row-major, R,G,B,A).
 * @param width - pixel columns.
 * @param height - pixel rows.
 * @returns complete PNG file bytes (Buffer).
 */
export function encodePng(rgba, width, height) {
  const bpp = 4
  const stride = width * bpp
  // Each scanline is prefixed with a filter byte (0 = None).
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    for (let x = 0; x < stride; x++) {
      raw[y * (stride + 1) + 1 + x] = rgba[y * stride + x]
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: truecolor + alpha (RGBA)
  ihdr[10] = 0 // compression: deflate
  ihdr[11] = 0 // filter: adaptive
  ihdr[12] = 0 // interlace: none

  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ])
}
