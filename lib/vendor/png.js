// Minimal PNG encoder/decoder (RGBA <-> PNG bytes) using only node:zlib.
// Encode is used as a re-encode fallback when a VLM endpoint rejects a JPEG
// payload, and as the artifact format for the vision toolkit. Decode is used
// by the vision toolkit to read PNG artifacts/attachments back for pixel work
// (zoom / sample_colors / image_diff / detect_elements annotations).
// PNG format: 8-byte signature + IHDR + IDAT (zlib deflate) + IEND, all with CRC32.
import { deflateSync, inflateSync } from 'node:zlib'

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

// ---------- PNG decoder ----------

// Reads a big-endian unsigned int from a buffer at an offset (used below).
function readU32(buf, off) {
  return buf.readUInt32BE(off)
}

// PNG scanline filters (both encoding and decoding conventions).
const FILTER_NONE = 0
const FILTER_SUB = 1
const FILTER_UP = 2
const FILTER_AVERAGE = 3
const FILTER_PAETH = 4

// Paeth predictor used by filter 4.
function paeth(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  if (pb <= pc) return b
  return c
}

function decodeUnsupported(msg) {
  const err = new Error(msg)
  err.code = 'PNG_UNSUPPORTED'
  return err
}

/**
 * Decode a PNG byte buffer into `{ width, height, data }` where `data` is an
 * RGBA pixel buffer (4 bytes per pixel, row-major). Supports 8-bit, non-
 * interlaced PNGs of color type 0 (grayscale), 2 (truecolor), 3 (indexed),
 * 4 (grayscale+alpha) and 6 (truecolor+alpha). Unsupported variants (16-bit,
 * interlaced, unknown color type) throw a structured error with code
 * `PNG_UNSUPPORTED`.
 * @param {Buffer} bytes - complete PNG file bytes.
 * @returns {{ width: number, height: number, data: Uint8Array }}
 */
export function decodePng(bytes) {
  if (!bytes || bytes.length < 8) throw decodeUnsupported('not enough bytes to be a PNG')
  // Signature check (magic bytes).
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== SIGNATURE[i]) throw decodeUnsupported('invalid PNG signature')
  }

  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  let interlace = 0
  const idatParts = []
  let palette = null // RGBA palette for color type 3 (after PLTE + tRNS)
  let tRNS = null // raw transparency bytes

  let offset = 8
  let sawIhdr = false
  while (offset + 12 <= bytes.length) {
    const length = readU32(bytes, offset)
    const type = bytes.toString('ascii', offset + 4, offset + 8)
    const dataStart = offset + 8
    const dataEnd = dataStart + length
    if (dataEnd + 4 > bytes.length) throw new Error('PNG: truncated chunk ' + type)

    if (type === 'IHDR') {
      sawIhdr = true
      if (length < 13) throw new Error('PNG: IHDR too short')
      width = readU32(bytes, dataStart)
      height = readU32(bytes, dataStart + 4)
      bitDepth = bytes[dataStart + 8]
      colorType = bytes[dataStart + 9]
      const compression = bytes[dataStart + 10]
      const filter = bytes[dataStart + 11]
      interlace = bytes[dataStart + 12]
      if (compression !== 0) throw decodeUnsupported('PNG: unsupported compression method ' + compression)
      if (filter !== 0) throw decodeUnsupported('PNG: unsupported filter method ' + filter)
      if (interlace !== 0) throw decodeUnsupported('PNG: interlaced PNGs are not supported')
      if (bitDepth !== 8) throw decodeUnsupported('PNG: only 8-bit PNGs are supported, got bit depth ' + bitDepth)
      if (![0, 2, 3, 4, 6].includes(colorType)) throw decodeUnsupported('PNG: unsupported color type ' + colorType)
    } else if (type === 'PLTE') {
      if (length % 3 !== 0) throw new Error('PNG: PLTE length not a multiple of 3')
      palette = new Uint8Array((length / 3) * 4)
      for (let i = 0; i < length / 3; i++) {
        palette[i * 4] = bytes[dataStart + i * 3]
        palette[i * 4 + 1] = bytes[dataStart + i * 3 + 1]
        palette[i * 4 + 2] = bytes[dataStart + i * 3 + 2]
        palette[i * 4 + 3] = 255
      }
    } else if (type === 'tRNS') {
      tRNS = bytes.slice(dataStart, dataEnd)
    } else if (type === 'IDAT') {
      idatParts.push(bytes.slice(dataStart, dataEnd))
    } else if (type === 'IEND') {
      break
    }

    offset = dataEnd + 4 // advance past data + CRC
  }
  if (!sawIhdr) throw decodeUnsupported('PNG: missing IHDR')
  if (idatParts.length === 0) throw new Error('PNG: missing IDAT data')
  if (width <= 0 || height <= 0) throw decodeUnsupported('PNG: invalid dimensions ' + width + 'x' + height)

  const raw = inflateSync(Buffer.concat(idatParts))

  // Apply tRNS to the palette for color type 3.
  if (colorType === 3 && palette && tRNS) {
    for (let i = 0; i < Math.min(tRNS.length, palette.length / 4); i++) {
      palette[i * 4 + 3] = tRNS[i]
    }
  }
  // Grayscale (color type 0) with tRNS: the single 16-bit value gives a
  // transparent sample — for 8-bit grayscale the low byte of tRNS is the
  // transparent gray level.
  let grayTransparent = -1
  if (colorType === 0 && tRNS && tRNS.length >= 2) grayTransparent = tRNS[1]

  // Channels per pixel before filtering.
  const channels = [1, 0, 3, 1, 2, 0, 4][colorType]
  const stride = width * channels
  const rows = new Array(height)
  let pos = 0
  for (let y = 0; y < height; y++) {
    if (pos + stride + 1 > raw.length) throw new Error('PNG: scanline data truncated at row ' + y)
    const filterType = raw[pos]
    const row = Buffer.from(raw.subarray(pos + 1, pos + 1 + stride))
    pos += stride + 1
    // Unfilter.
    if (filterType === FILTER_SUB) {
      for (let i = channels; i < stride; i++) row[i] = (row[i] + row[i - channels]) & 0xff
    } else if (filterType === FILTER_UP) {
      const prev = y > 0 ? rows[y - 1] : null
      if (prev) for (let i = 0; i < stride; i++) row[i] = (row[i] + prev[i]) & 0xff
    } else if (filterType === FILTER_AVERAGE) {
      const prev = y > 0 ? rows[y - 1] : null
      for (let i = 0; i < stride; i++) {
        const left = i >= channels ? row[i - channels] : 0
        const up = prev ? prev[i] : 0
        row[i] = (row[i] + ((left + up) >> 1)) & 0xff
      }
    } else if (filterType === FILTER_PAETH) {
      const prev = y > 0 ? rows[y - 1] : null
      for (let i = 0; i < stride; i++) {
        const a = i >= channels ? row[i - channels] : 0
        const b = prev ? prev[i] : 0
        const c = i >= channels && prev ? prev[i - channels] : 0
        row[i] = (row[i] + paeth(a, b, c)) & 0xff
      }
    } else if (filterType !== FILTER_NONE) {
      throw decodeUnsupported('PNG: unknown filter type ' + filterType)
    }
    rows[y] = row
  }

  // Convert to RGBA.
  const out = new Uint8Array(width * height * 4)
  const put = (idx, r, g, b, a) => {
    const o = idx * 4
    out[o] = r
    out[o + 1] = g
    out[o + 2] = b
    out[o + 3] = a
  }
  for (let y = 0; y < height; y++) {
    const row = rows[y]
    let pi = 0
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      switch (colorType) {
        case 0: { // grayscale
          const g = row[pi++]
          put(idx, g, g, g, g === grayTransparent ? 0 : 255)
          break
        }
        case 2: { // truecolor
          put(idx, row[pi], row[pi + 1], row[pi + 2], 255)
          pi += 3
          break
        }
        case 3: { // indexed
          const piIndex = row[pi++]
          if (palette) {
            const po = piIndex * 4
            put(idx, palette[po], palette[po + 1], palette[po + 2], palette[po + 3])
          } else {
            put(idx, piIndex, piIndex, piIndex, 255)
          }
          break
        }
        case 4: { // grayscale + alpha
          const g = row[pi]
          const a = row[pi + 1]
          pi += 2
          put(idx, g, g, g, a)
          break
        }
        case 6: { // truecolor + alpha
          put(idx, row[pi], row[pi + 1], row[pi + 2], row[pi + 3])
          pi += 4
          break
        }
      }
    }
  }
  return { width, height, data: out }
}
