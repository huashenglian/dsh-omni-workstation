// dsh-her-eyes — 视觉工具箱宿主模块（vision toolkit host-side tool defs）
//
// 本文件用 `buildVisionToolDefs(deps)` 工厂创建 6 个 `defineTool(...)` 工具：
//   zoom_image / sample_colors / image_diff / ocr_image / detect_elements / show_image
// deps 由 index.js 注入（本文件只定义接口并调用，不实现宿主侧）：
//   deps.getCtx       () => appCtx                    // 返回宿主半 ctx
//   deps.loadConfig   async (ctx) => cfg              // 读取 normalize 后的配置
//   deps.resolveImage async (exec, args) => ({ buffer, mime, width, height })
//   deps.askVlm       async (ctx, buffer, mime, question, exec, opts) =>
//                          ({ text, model, api })     // 复用 analyze_image 的 failover 链
//
// 所有工具结果都只返回紧凑 JSON + 工件路径（图片字节不返回给模型），模型按需
// 再调 analyze_image 细看。可选参数整个不要写 required 键（required:false 会破坏
// schema 校验）；工具失败一律 throw new Error('<工具名>: 中文错误信息')；需要让模型
// 看到可结构化原因时返回 { ok:false, code, ... }。

import { defineTool } from '@deepseek-ai/dsh-tools'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync, execFile } from 'node:child_process'
import jpegJs from './vendor/jpeg-js/index.cjs'
import { encodePng, decodePng } from './vendor/png.js'

// ---------- 魔数嗅探（本文件独立实现，避免与 index.js 循环依赖） ----------
function sniffMediaType(bytes) {
  if (!bytes || bytes.length < 12) return undefined
  const head = (offset, count) => {
    const parts = []
    for (let i = offset; i < offset + count; i++) parts.push(bytes[i].toString(16).padStart(2, '0'))
    return parts.join('')
  }
  if (head(0, 8) === '89504e470d0a1a0a') return 'image/png'
  if (head(0, 3) === 'ffd8ff') return 'image/jpeg'
  const riff = head(0, 4)
  const webp = head(8, 4)
  if (riff === '52494646' && webp === '57454250') return 'image/webp'
  if (riff === '47494638') return 'image/gif'
  return undefined
}

// ---------- 纯像素助手（导出供测试与复用） ----------

/**
 * 统一解码 JPEG / PNG 为 RGBA 像素。
 * @returns {{ width, height, data: Uint8Array }}
 */
export function decodeAny(buffer, mime) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  const m = (mime && String(mime).trim()) || sniffMediaType(bytes) || ''
  if (m === 'image/png') {
    return decodePng(bytes)
  }
  if (m === 'image/jpeg') {
    return jpegJs.decode(bytes, { useTArray: true, formatAsRGBA: true })
  }
  throw new Error('不支持该图片类型' + (m ? '：' + m : '（无法识别文件格式）'))
}

/**
 * 解析 region "x1,y1,x2,y2"（容忍空格）。四项全在 [0,1] 视为宽高分数，否则为原图像素。
 * 越界 clamp，退化（x2<=x1 或 y2<=y1）抛错并附带当前图片尺寸。
 */
export function parseRegion(str, width, height) {
  const raw = String(str || '').split(/[\s,，]+/).map((s) => Number(s)).filter((n) => Number.isFinite(n))
  if (raw.length !== 4) throw new Error('region 参数格式应为 "x1,y1,x2,y2"（四个数字）')
  let [x1, y1, x2, y2] = raw
  const allFraction = [x1, y1, x2, y2].every((v) => v >= 0 && v <= 1)
  if (allFraction) {
    x1 = Math.round(x1 * width)
    y1 = Math.round(y1 * height)
    x2 = Math.round(x2 * width)
    y2 = Math.round(y2 * height)
  }
  x1 = Math.max(0, Math.min(width, Math.round(x1)))
  y1 = Math.max(0, Math.min(height, Math.round(y1)))
  x2 = Math.max(0, Math.min(width, Math.round(x2)))
  y2 = Math.max(0, Math.min(height, Math.round(y2)))
  if (x2 <= x1 || y2 <= y1) {
    throw new Error('region 区域退化（需要 x2>x1 且 y2>y1），图片尺寸 ' + width + 'x' + height)
  }
  return { x1, y1, x2, y2 }
}

/** 最近邻降采样到 maxPixels 以内；已满足则原样返回。 */
export function nearestDownscale(data, width, height, maxPixels) {
  const pixels = width * height
  if (pixels <= maxPixels) return { data, width, height }
  const scale = Math.sqrt(maxPixels / pixels)
  const newW = Math.max(1, Math.round(width * scale))
  const newH = Math.max(1, Math.round(height * scale))
  const out = new Uint8Array(newW * newH * 4)
  for (let y = 0; y < newH; y++) {
    const srcY = Math.min(height - 1, Math.floor(y / scale))
    for (let x = 0; x < newW; x++) {
      const srcX = Math.min(width - 1, Math.floor(x / scale))
      const si = (srcY * width + srcX) * 4
      const di = (y * newW + x) * 4
      out[di] = data[si]
      out[di + 1] = data[si + 1]
      out[di + 2] = data[si + 2]
      out[di + 3] = data[si + 3]
    }
  }
  return { data: out, width: newW, height: newH }
}

/** 最近邻缩放到精确目标尺寸（内部复用，image_diff 对齐两图尺寸用）。 */
function nearestResize(data, srcW, srcH, dstW, dstH) {
  if (srcW === dstW && srcH === dstH) return data
  const out = new Uint8Array(dstW * dstH * 4)
  for (let y = 0; y < dstH; y++) {
    const srcY = Math.min(srcH - 1, Math.floor((y * srcH) / dstH))
    for (let x = 0; x < dstW; x++) {
      const srcX = Math.min(srcW - 1, Math.floor((x * srcW) / dstW))
      const si = (srcY * srcW + srcX) * 4
      const di = (y * dstW + x) * 4
      out[di] = data[si]
      out[di + 1] = data[si + 1]
      out[di + 2] = data[si + 2]
      out[di + 3] = data[si + 3]
    }
  }
  return out
}

/**
 * 写工件到 `<cwd>/.her-eyes/artifacts/<name>`。cwd 来自 exec.agent.meta.cwd，
 * 取不到用 process.cwd()。返回绝对路径。
 */
export function saveArtifact(exec, name, buffer) {
  const cwd = exec && exec.agent && exec.agent.meta ? exec.agent.meta.cwd : undefined
  const base = cwd || process.cwd()
  const dir = join(base, '.her-eyes', 'artifacts')
  mkdirSync(dir, { recursive: true })
  const file = join(dir, name)
  writeFileSync(file, buffer)
  return file
}

/** 32-bin 量化（步长 8）统计主色调，返回按占比降序数组。alpha<128 跳过。 */
export function quantizeColors(data, width, height, top) {
  const counts = new Map()
  let valid = 0
  const n = width * height
  for (let i = 0; i < n; i++) {
    const o = i * 4
    if (data[o + 3] < 128) continue
    valid++
    const r = (data[o] >> 3) << 3
    const g = (data[o + 1] >> 3) << 3
    const b = (data[o + 2] >> 3) << 3
    const hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
    counts.set(hex, (counts.get(hex) || 0) + 1)
  }
  const arr = [...counts.entries()].map(([hex, count]) => ({ hex, count, share: valid > 0 ? count / valid : 0 }))
  arr.sort((a, b) => b.count - a.count)
  return arr.slice(0, Math.max(1, Math.floor(top)))
}

/**
 * 8×8 网格像素对比。返回 { diffRatio, worstRegions[], heatmapRgba, heatWidth, heatHeight }。
 * 网格平均 RGB 距离 > threshold 记为差异格；heatmapRgba 与源等尺寸（差异格红色热斑，
 * 其余保持原色）。
 */
export function gridDiff(aData, bData, width, height, threshold) {
  const GW = 8
  const GH = 8
  const cellW = width / GW
  const cellH = height / GH
  const cells = []
  for (let gy = 0; gy < GH; gy++) {
    for (let gx = 0; gx < GW; gx++) {
      const x1 = Math.floor(gx * cellW)
      const y1 = Math.floor(gy * cellH)
      const x2 = Math.max(x1 + 1, Math.floor((gx + 1) * cellW))
      const y2 = Math.max(y1 + 1, Math.floor((gy + 1) * cellH))
      let sum = 0
      let cnt = 0
      for (let yy = y1; yy < y2 && yy < height; yy++) {
        for (let xx = x1; xx < x2 && xx < width; xx++) {
          const o = (yy * width + xx) * 4
          const dr = aData[o] - bData[o]
          const dg = aData[o + 1] - bData[o + 1]
          const db = aData[o + 2] - bData[o + 2]
          sum += Math.sqrt(dr * dr + dg * dg + db * db)
          cnt++
        }
      }
      const score = cnt > 0 ? sum / cnt : 0
      cells.push({ cell: gy * GW + gx, box: { x1, y1, x2, y2 }, score, isDiff: score > threshold })
    }
  }
  const diffCount = cells.filter((c) => c.isDiff).length
  const worstRegions = cells
    .filter((c) => c.isDiff)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ cell, box, score }) => ({ cell, box, score }))
  // 热力图：与原图同尺寸
  const heatmapRgba = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const gx = Math.min(GW - 1, Math.floor(x / cellW))
      const gy = Math.min(GH - 1, Math.floor(y / cellH))
      const cell = cells[gy * GW + gx]
      const o = (y * width + x) * 4
      const si = o
      if (cell.isDiff) {
        const i = Math.min(1, cell.score / 442)
        heatmapRgba[o] = 255
        heatmapRgba[o + 1] = Math.round(255 * (1 - i))
        heatmapRgba[o + 2] = Math.round(255 * (1 - i))
        heatmapRgba[o + 3] = 255
      } else {
        heatmapRgba[o] = aData[si]
        heatmapRgba[o + 1] = aData[si + 1]
        heatmapRgba[o + 2] = aData[si + 2]
        heatmapRgba[o + 3] = aData[si + 3] || 255
      }
    }
  }
  return { diffRatio: diffCount / (GW * GH), diffCells: diffCount, worstRegions, heatmapRgba, heatWidth: width, heatHeight: height }
}

const ANNOTATE_PALETTE = ['#ff0000', '#00ff00', '#0000ff', '#ff8800', '#8800ff', '#00ccff', '#ff00cc', '#ccff00']

/** 在 RGBA 上按 boxes 绘制 2px 边框，返回新 RGBA。boxes 项含 {x1,y1,x2,y2}。 */
export function drawBoxes(data, width, height, boxes) {
  const out = new Uint8Array(data)
  const paint = (x, y, r, g, b) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const o = (y * width + x) * 4
    out[o] = r
    out[o + 1] = g
    out[o + 2] = b
    out[o + 3] = 255
  }
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i]
    const x1 = Math.max(0, Math.min(width - 1, Math.round(b.x1)))
    const y1 = Math.max(0, Math.min(height - 1, Math.round(b.y1)))
    const x2 = Math.max(0, Math.min(width - 1, Math.round(b.x2)))
    const y2 = Math.max(0, Math.min(height - 1, Math.round(b.y2)))
    const col = ANNOTATE_PALETTE[(i % ANNOTATE_PALETTE.length + ANNOTATE_PALETTE.length) % ANNOTATE_PALETTE.length]
    const r = parseInt(col.slice(1, 3), 16)
    const g = parseInt(col.slice(3, 5), 16)
    const b2 = parseInt(col.slice(5, 7), 16)
    // 上 / 下边框（2px）
    for (let y = y1; y <= Math.min(y1 + 1, y2); y++) for (let x = x1; x <= x2; x++) paint(x, y, r, g, b2)
    for (let y = Math.max(y1, y2 - 1); y <= y2; y++) for (let x = x1; x <= x2; x++) paint(x, y, r, g, b2)
    // 左 / 右边框（2px）
    for (let x = x1; x <= Math.min(x1 + 1, x2); x++) for (let y = y1; y <= y2; y++) paint(x, y, r, g, b2)
    for (let x = Math.max(x1, x2 - 1); x <= x2; x++) for (let y = y1; y <= y2; y++) paint(x, y, r, g, b2)
  }
  return out
}

// ---------- 文本软上限 ----------
const TEXT_CAP = 8000
function clampText(text) {
  const s = String(text || '')
  if (s.length <= TEXT_CAP) return s
  return s.slice(0, TEXT_CAP) + '\n…(已截断)'
}

// ---------- 本地 Tesseract 探测（进程内缓存） ----------
let tesseractProbeCache = null // null=未探测, false=不可用, string=二进制路径
function probeTesseract() {
  if (tesseractProbeCache !== null) return tesseractProbeCache
  const candidates = []
  if (process.env.HER_EYES_TESSERACT) candidates.push(process.env.HER_EYES_TESSERACT)
  candidates.push('tesseract')
  if (process.platform === 'win32') candidates.push('C:\\Program Files\\Tesseract-OCR\\tesseract.exe')
  for (const bin of candidates) {
    try {
      execFileSync(bin, ['--version'], { stdio: 'ignore', timeout: 5000 })
      tesseractProbeCache = bin
      return bin
    } catch {
      // try next candidate
    }
  }
  tesseractProbeCache = false
  return false
}
/** test-only：重置 Tesseract 探测缓存，使测试互不污染。 */
export function _resetTesseractProbe() { tesseractProbeCache = null }

function runTesseract(bin, buffer) {
  return new Promise((resolve, reject) => {
    execFile(bin, ['stdin', 'stdout', '-l', 'chi_sim+eng', '--psm', '6'], {
      input: buffer,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      timeout: 20000
    }, (err, stdout) => {
      if (err) reject(err)
      else resolve(String(stdout || ''))
    })
  })
}

// ---------- 严格 JSON 提取（容忍模型包裹 markdown/code fence） ----------
function extractFirstJsonArray(text) {
  const s = String(text || '')
  // 去掉被 ```json ``` 包裹的情况：直接取第一个 [ 到最后一个 ]
  const first = s.indexOf('[')
  const last = s.lastIndexOf(']')
  if (first === -1 || last === -1 || last <= first) throw new Error('no-array-in-answer')
  const slice = s.slice(first, last + 1)
  const parsed = JSON.parse(slice)
  return Array.isArray(parsed) ? parsed : [parsed]
}

const OCR_TRANSCRIBE_QUESTION = '请原样转述图片中的所有文字，逐行保留顺序和换行，不要添加任何解释或总结，只输出转写结果。'

// ---------- artifact 文件名（带时间戳避免覆盖） ----------
const tsName = (prefix, ext) => prefix + '_' + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36) + ext

// ---------- 工厂：创建 6 个视觉工具定义 ----------
export function buildVisionToolDefs(deps) {
  const { getCtx, loadConfig, resolveImage, askVlm } = deps

  // ---------- zoom_image：局部放大 ----------
  const zoomTool = defineTool({
    name: 'zoom_image',
    description: '对图片的某个局部区域进行裁剪放大，另存为一个新图片文件并返回路径。传入图片来源和 region（x1,y1,x2,y2，可用宽高分数或用原图像素），用于细看小尺寸文字或细节。裁剪后调用 analyze_image 传入该路径细看该区域。',
    parameters: {
      image_path: { type: 'string', description: '图片文件路径（绝对路径或相对当前工作目录）。与 attachment_id 二选一。' },
      attachment_id: { type: 'string', description: '上传图片的附件 id（形如 "sha256:..."）。与 image_path 二选一。' },
      region: { type: 'string', required: true, description: '要放大的区域，形如 "x1,y1,x2,y2"（容忍空格）。四项都在 0~1 之间时按宽高分数处理，否则按原图像素；越界会自动夹紧。' }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ok: { type: 'boolean', required: true },
          path: { type: 'string' },
          width: { type: 'number' },
          height: { type: 'number' },
          source_width: { type: 'number' },
          source_height: { type: 'number' },
          detail: { type: 'string' }
        }
      },
      render: (args, value) => [{
        type: 'text',
        text: value && value.ok
          ? '## 放大区域\n\n![放大区域](file:///' + String(value.path).replace(/\\/g, '/') + ')\n\n尺寸: ' + value.width + 'x' + value.height + '（源图 ' + value.source_width + 'x' + value.source_height + '）\n\n> 提示：可调用 analyze_image 传入路径 "' + String(value.path).replace(/\\/g, '/') + '" 细看该区域的细节。'
          : '局部放大失败：' + (value ? (value.detail || JSON.stringify(value)) : '未知错误')
      }]
    },
    async execute(args, exec) {
      const { buffer, mime } = await resolveImage(exec, args)
      const img = decodeAny(buffer, mime)
      let region
      try {
        region = parseRegion(args.region, img.width, img.height)
      } catch (e) {
        throw new Error('zoom_image: ' + String(e && e.message || e))
      }
      const cw = region.x2 - region.x1
      const ch = region.y2 - region.y1
      const crop = new Uint8Array(cw * ch * 4)
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          const si = ((region.y1 + y) * img.width + (region.x1 + x)) * 4
          const di = (y * cw + x) * 4
          crop[di] = img.data[si]
          crop[di + 1] = img.data[si + 1]
          crop[di + 2] = img.data[si + 2]
          crop[di + 3] = img.data[si + 3]
        }
      }
      const png = encodePng(crop, cw, ch)
      const path = saveArtifact(exec, tsName('zoom_', '.png'), png)
      return { ok: true, path, width: cw, height: ch, source_width: img.width, source_height: img.height }
    }
  })

  // ---------- sample_colors：色调采样（纯本地零 VLM） ----------
  const sampleColorsTool = defineTool({
    name: 'sample_colors',
    description: '对图片进行主色调采样（纯本地计算，不消耗任何视觉模型额度）。可选 region 限定采样区域。返回最常见的若干颜色及其占比，适用于判断配色、主题或背景色。',
    parameters: {
      image_path: { type: 'string', description: '图片文件路径。与 attachment_id 二选一。' },
      attachment_id: { type: 'string', description: '上传图片的附件 id（形如 "sha256:..."）。与 image_path 二选一。' },
      top: { type: 'number', description: '返回的颜色数量，默认 8。' },
      region: { type: 'string', description: '限定采样区域，形如 "x1,y1,x2,y2"（同 zoom_image 语义，可为分数）。' }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ok: { type: 'boolean', required: true },
          colors: {
            type: 'array',
            items: { type: 'object', additionalProperties: false, properties: { hex: { type: 'string' }, count: { type: 'number' }, share: { type: 'number' } } }
          },
          source_width: { type: 'number' },
          source_height: { type: 'number' },
          detail: { type: 'string' }
        }
      },
      render: (args, value) => {
        if (!value || !value.ok) {
          return [{ type: 'text', text: '色调采样失败：' + (value ? (value.detail || JSON.stringify(value)) : '未知错误') }]
        }
        const lines = (value.colors || []).map((c) => c.hex + ' (占比 ' + (c.share * 100).toFixed(1) + '%)')
        return [{ type: 'text', text: '## 色调采样\n\n尺寸: ' + value.source_width + 'x' + value.source_height + '\n\n' + (lines.length ? lines.join('\n') : '（未采样到有效颜色）') }]
      }
    },
    async execute(args, exec) {
      const { buffer, mime } = await resolveImage(exec, args)
      const img = decodeAny(buffer, mime)
      let src = img.data
      let w = img.width
      let h = img.height
      if (args.region) {
        let region
        try {
          region = parseRegion(args.region, w, h)
        } catch (e) {
          throw new Error('sample_colors: ' + String(e && e.message || e))
        }
        const cw = region.x2 - region.x1
        const ch = region.y2 - region.y1
        const crop = new Uint8Array(cw * ch * 4)
        for (let y = 0; y < ch; y++) {
          for (let x = 0; x < cw; x++) {
            const si = ((region.y1 + y) * w + (region.x1 + x)) * 4
            const di = (y * cw + x) * 4
            crop[di] = src[si]
            crop[di + 1] = src[si + 1]
            crop[di + 2] = src[si + 2]
            crop[di + 3] = src[si + 3]
          }
        }
        src = crop
        w = cw
        h = ch
      }
      // 缩到 64x64 再量化
      const down = nearestDownscale(src, w, h, 64 * 64)
      const top = Math.max(1, Math.min(Math.floor(Number(args && args.top) || 8), 64))
      const colors = quantizeColors(down.data, down.width, down.height, top)
      return { ok: true, colors, source_width: img.width, source_height: img.height }
    }
  })

  // ---------- image_diff：像素对比 ----------
  const imageDiffTool = defineTool({
    name: 'image_diff',
    description: '对比两张图片的像素差异（纯本地计算）。original 与 compare 各接受一个本地路径或 "sha256: 附件 id" 字符串。返回整体差异率、差异最明显的若干网格区域及一张热力图路径。',
    parameters: {
      original: { type: 'string', required: true, description: '基准图片：本地路径 或 "sha256:<附件 id>"。' },
      compare: { type: 'string', required: true, description: '待对比图片：本地路径 或 "sha256:<附件 id>"。' },
      threshold: { type: 'number', description: '差异阈值（平均 RGB 距离，取值 0~442），默认 16。' }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ok: { type: 'boolean', required: true },
          diffRatio: { type: 'number' },
          diffCells: { type: 'number' },
          worstRegions: {
            type: 'array',
            items: { type: 'object', additionalProperties: false, properties: { cell: { type: 'number' }, box: { type: 'object', additionalProperties: false, properties: { x1: { type: 'number' }, y1: { type: 'number' }, x2: { type: 'number' }, y2: { type: 'number' } } }, score: { type: 'number' } } }
          },
          heatmapPath: { type: 'string' },
          width: { type: 'number' },
          height: { type: 'number' },
          detail: { type: 'string' }
        }
      },
      render: (args, value) => {
        if (!value || !value.ok) {
          return [{ type: 'text', text: '像素对比失败：' + (value ? (value.detail || JSON.stringify(value)) : '未知错误') }]
        }
        const n = value.diffCells != null ? value.diffCells : (value.worstRegions || []).length
        let text = '## 像素对比\n\n差异率: ' + (value.diffRatio * 100).toFixed(1) + '% · 异常网格: ' + n + '/64\n\n![像素diff](file:///' + String(value.heatmapPath).replace(/\\/g, '/') + ')'
        if (n > 0) {
          const lines = (value.worstRegions || []).map((r) => '单元格 ' + r.cell + ' — box(' + r.box.x1 + ',' + r.box.y1 + ',' + r.box.x2 + ',' + r.box.y2 + ') · 得分 ' + r.score.toFixed(0))
          text += '\n\n差异最明显区域：\n' + lines.join('\n')
        }
        return [{ type: 'text', text }]
      }
    },
    async execute(args, exec) {
      const threshold = Number(args.threshold)
      const thr = Number.isFinite(threshold) ? threshold : 16
      const a = await resolveEither(exec, args.original)
      const b = await resolveEither(exec, args.compare)
      const orig = decodeAny(a.buffer, a.mime)
      let cmp = decodeAny(b.buffer, b.mime)
      // 尺寸不一致：把 compare 最近邻缩放到 original 尺寸
      if (cmp.width !== orig.width || cmp.height !== orig.height) {
        cmp = { ...cmp, data: nearestResize(cmp.data, cmp.width, cmp.height, orig.width, orig.height), width: orig.width, height: orig.height }
      }
      const diff = gridDiff(orig.data, cmp.data, orig.width, orig.height, thr)
      const png = encodePng(diff.heatmapRgba, diff.heatWidth, diff.heatHeight)
      const heatmapPath = saveArtifact(exec, tsName('diff_', '.png'), png)
      return { ok: true, diffRatio: diff.diffRatio, diffCells: diff.diffCells, worstRegions: diff.worstRegions, heatmapPath, width: orig.width, height: orig.height }
    }
  })

  // image_diff 专用：original/compare 各自可能是路径或 "sha256: 附件 id"
  async function resolveEither(exec, raw) {
    const s = String(raw || '').trim()
    if (s.startsWith('sha256:')) return resolveImage(exec, { attachment_id: s })
    return resolveImage(exec, { image_path: s })
  }

  // ---------- ocr_image：OCR（本地优先自动降级） ----------
  const ocrTool = defineTool({
    name: 'ocr_image',
    description: '对图片进行文字识别（OCR）。本地安装了 Tesseract 时用算力引擎（默认自动），否则自动降级到视觉模型转写；也可显式指定 engine。仅读取图片文字，不要当作看图失败的重试。',
    parameters: {
      image_path: { type: 'string', description: '图片文件路径。与 attachment_id 二选一。' },
      attachment_id: { type: 'string', description: '上传图片的附件 id（形如 "sha256:..."）。与 attachment_id 二选一。' },
      engine: { type: 'string', enum: ['auto', 'local', 'vlm'], description: '识别引擎：auto(默认) 优先本地、local 仅本地、vlm 仅视觉模型。' }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ok: { type: 'boolean', required: true },
          engine: { type: 'string', enum: ['local', 'vlm'] },
          text: { type: 'string' },
          model: { type: 'string' },
          api: { type: 'string' },
          code: { type: 'string' },
          detail: { type: 'string' }
        }
      },
      render: (args, value) => {
        if (!value || !value.ok) {
          const code = value && value.code
          const label = code === 'LOCAL_OCR_UNAVAILABLE' ? 'OCR 识别失败：本地 OCR 不可用' : (code === 'NO_VLM_CARDS' ? 'OCR 识别失败：无可用视觉模型卡片' : 'OCR 识别失败')
          return [{ type: 'text', text: label + '：' + (value && value.detail ? value.detail : JSON.stringify(value || {})) }]
        }
        const engineLabel = value.engine === 'vlm' ? '视觉模型' : '本地 Tesseract'
        const extra = value.model ? '（模型 ' + value.model + '）' : ''
        return [{ type: 'text', text: '## OCR 结果（引擎: ' + engineLabel + extra + '）\n\n```text\n' + String(value.text || '') + '\n```' }]
      }
    },
    async execute(args, exec) {
      const ctx = getCtx()
      const { buffer, mime } = await resolveImage(exec, args)
      const engine = ['auto', 'local', 'vlm'].includes(args.engine) ? args.engine : 'auto'
      if (engine !== 'vlm') {
        const bin = probeTesseract()
        if (bin) {
          try {
            const text = clampText(String(await runTesseract(bin, buffer)).trim())
            if (text) return { ok: true, engine: 'local', text }
            if (engine === 'local') return { ok: false, code: 'LOCAL_OCR_UNAVAILABLE', text: '', detail: '本地 OCR 不可用（未安装 Tesseract 或识别为空）' }
          } catch (e) {
            if (engine === 'local') return { ok: false, code: 'LOCAL_OCR_UNAVAILABLE', text: '', detail: '本地 OCR 不可用（未安装 Tesseract 或识别失败）' }
          }
        } else if (engine === 'local') {
          return { ok: false, code: 'LOCAL_OCR_UNAVAILABLE', text: '', detail: '本地 OCR 不可用（未安装 Tesseract）' }
        }
        // engine == 'auto' 且本地失败/为空 → 降级走 VLM
      }
      // engine == 'vlm' 或 auto 降级
      try {
        const r = await askVlm(ctx, buffer, mime, OCR_TRANSCRIBE_QUESTION, exec, {})
        return { ok: true, engine: 'vlm', text: clampText(r.text), model: r.model, api: r.api }
      } catch (e) {
        const msg = String((e && e.message) || e)
        if (/无可用|没有可用|N一可用|no available|no valid/i.test(msg)) {
          return { ok: false, code: 'NO_VLM_CARDS', text: '', detail: msg }
        }
        throw new Error('ocr_image: ' + msg)
      }
    }
  })

  // ---------- detect_elements：元素检测 ----------
  const detectTool = defineTool({
    name: 'detect_elements',
    description: '调用视觉模型检测图片中的可交互元素与主要可见对象（按钮、输入框、链接、图标、文字块等），返回带编号的边界框（原图像素坐标）。得到 box 后可用 zoom_image 放大该区域再 analyze_image 细看。',
    parameters: {
      image_path: { type: 'string', description: '图片文件路径。与 attachment_id 二选一。' },
      attachment_id: { type: 'string', description: '上传图片的附件 id（形如 "sha256:..."）。与 image_path 二选一。' },
      target: { type: 'string', description: '要检测的对象类型描述，默认"可交互元素与主要可见对象（按钮、输入框、链接、图标、文字块）"。' },
      annotate: { type: 'boolean', description: '是否在标注图上绘制检测框，默认 true。' }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ok: { type: 'boolean', required: true },
          elements: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { number: { type: 'number' }, label: { type: 'string' }, box: { type: 'object', additionalProperties: false, properties: { x1: { type: 'number' }, y1: { type: 'number' }, x2: { type: 'number' }, y2: { type: 'number' } } } } } },
          annotatedPath: { type: 'string' },
          model: { type: 'string' },
          api: { type: 'string' },
          code: { type: 'string' },
          detail: { type: 'string' }
        }
      },
      render: (args, value) => {
        if (!value || !value.ok) {
          const label = value && value.code === 'NO_VLM_CARDS' ? '元素检测失败：无可用视觉模型卡片' : '元素检测失败'
          return [{ type: 'text', text: label + '：' + (value && value.detail ? value.detail : JSON.stringify(value || {})) }]
        }
        const el = value.elements || []
        const lines = el.map((e) => '#' + e.number + ' ' + (e.label || '未命名') + ' — box(' + e.box.x1 + ',' + e.box.y1 + ',' + e.box.x2 + ',' + e.box.y2 + ')')
        let text = '## 元素检测（模型: ' + (value.model || '未知') + '）\n\n' + (lines.length ? lines.join('\n') : '（未检测到元素）')
        if (value.annotatedPath) text += '\n\n![标注图](file:///' + String(value.annotatedPath).replace(/\\/g, '/') + ')'
        return [{ type: 'text', text }]
      }
    },
    async execute(args, exec) {
      const ctx = getCtx()
      const { buffer, mime } = await resolveImage(exec, args)
      const img = decodeAny(buffer, mime)
      // 超 4MP 先降采样（坐标仍是原图像素，因此用原始宽高做 clamp 与标注）
      let askedW = img.width
      let askedH = img.height
      let down = null
      if (img.width * img.height > 4000000) {
        down = nearestDownscale(img.data, img.width, img.height, 4000000)
      }
      const target = String(args && args.target || '').trim() || '可交互元素与主要可见对象（按钮、输入框、链接、图标、文字块）'
      const buildPrompt = (extra) => (
        '请检测图片中的[' + target + ']。返回一个 JSON 数组，每项形如 {"number":<序号>,"label":"<简短中文标签，≤40字>","box":{"x1":<整数>,"y1":<整数>,"x2":<整数>,"y2":<整数>}}。box 坐标必须是"原图像素"整数，图片原始尺寸为 ' + img.width + 'x' + img.height + '。最多返回 20 项。' + (down ? '注意：图片较大时以缩放后的视图检测，但坐标务必按原始尺寸换算。' : '') + (extra || '') + ' 只输出 JSON，不要 markdown 或任何解释。'
      )
      // 供 askVlm 的图片字节：降采样后需重新编码为 PNG 字节（VLM 链只接受图像文件字节，不接受原始 RGBA）
      const vlmBuffer = down ? encodePng(down.data, down.width, down.height) : buffer
      const vlmMime = down ? 'image/png' : mime
      let elems = []
      let model = ''
      let api = ''
      let parsed = false
      let firstText = ''
      try {
        const r1 = await askVlm(ctx, vlmBuffer, vlmMime, buildPrompt(''), exec, { hint: 'strict-json' })
        firstText = String(r1 && r1.text || '')
        elems = extractFirstJsonArray(firstText)
        model = r1.model
        api = r1.api
        parsed = true
      } catch (e) {
        const msg = String((e && e.message) || e)
        if (/无可用|没有可用|N一可用|no available|no valid/i.test(msg)) {
          return { ok: false, code: 'NO_VLM_CARDS', detail: msg }
        }
        if (!parsed && /no-array-in-answer|Unexpected|Expected/i.test(msg)) {
          // JSON 解析失败 → 换更强 prompt 重试一次
          try {
            const r2 = await askVlm(ctx, vlmBuffer, vlmMime, buildPrompt('只输出一个合法的 JSON 数组，不要任何其它文字。'), exec, { hint: 'strict-json' })
            elems = extractFirstJsonArray(String(r2 && r2.text || ''))
            model = r2.model
            api = r2.api
          } catch (e2) {
            const m2 = String((e2 && e2.message) || e2)
            if (/无可用|没有可用|N一可用|no available|no valid/i.test(m2)) {
              return { ok: false, code: 'NO_VLM_CARDS', detail: m2 }
            }
            return { ok: false, code: 'VLM_BAD_JSON', raw: firstText.slice(0, 500), detail: '视觉模型未返回可解析的 JSON 数组' }
          }
        } else {
          throw new Error('detect_elements: ' + msg)
        }
      }
      // 逐项 clamp box，丢弃退化项，取前 20
      const cleaned = []
      for (const raw of Array.isArray(elems) ? elems : []) {
        if (!raw || typeof raw !== 'object') continue
        const bx = raw.box || {}
        let x1 = Math.max(0, Math.min(img.width - 1, Math.round(Number(bx.x1) || 0)))
        let y1 = Math.max(0, Math.min(img.height - 1, Math.round(Number(bx.y1) || 0)))
        let x2 = Math.max(0, Math.min(img.width - 1, Math.round(Number(bx.x2) || 0)))
        let y2 = Math.max(0, Math.min(img.height - 1, Math.round(Number(bx.y2) || 0)))
        if (x2 <= x1 || y2 <= y1) continue
        cleaned.push({ number: cleaned.length + 1, label: String(raw.label || '元素' + (cleaned.length + 1)).slice(0, 40), box: { x1, y1, x2, y2 } })
        if (cleaned.length >= 20) break
      }
      const ret = { ok: true, elements: cleaned, model: model || '', api: api || '' }
      if (args.annotate !== false && cleaned.length > 0) {
        try {
          const annotated = drawBoxes(img.data, img.width, img.height, cleaned)
          const png = encodePng(annotated, img.width, img.height)
          ret.annotatedPath = saveArtifact(exec, tsName('annot_', '.png'), png)
        } catch {
          // 标注失败则省略 annotatedPath
        }
      }
      return ret
    }
  })

  // ---------- show_image：图片展示 ----------
  const showImageTool = defineTool({
    name: 'show_image',
    description: '把一张图片展示给用户查看（本地图片、附件或 generate_image 生成的图片均可）。返回图片在对话中的展示与可访问的本地路径。可用展示本地图片、附件、generate_image 生成的图片，让用户在对话中查看；如想细看请结合 analyze_image。',
    parameters: {
      image_path: { type: 'string', description: '图片文件路径。与 attachment_id 二选一。' },
      attachment_id: { type: 'string', description: '上传图片的附件 id（形如 "sha256:..."）。与 image_path 二选一。' },
      label: { type: 'string', description: '展示标题，默认"图片"。' }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ok: { type: 'boolean', required: true },
          path: { type: 'string' },
          label: { type: 'string' },
          width: { type: 'number' },
          height: { type: 'number' },
          attachment: { type: 'object', additionalProperties: true },
          detail: { type: 'string' }
        }
      },
      render: (args, value) => {
        if (!value || !value.ok) {
          return [{ type: 'text', text: '图片展示失败：' + (value ? (value.detail || JSON.stringify(value)) : '未知错误') }]
        }
        const label = String(value.label || '图片')
        const md = '## 图片展示\n\n![' + label + '](file:///' + String(value.path).replace(/\\/g, '/') + ')\n\n' + value.width + 'x' + value.height + ' · 路径: ' + String(value.path).replace(/\\/g, '/')
        const blocks = [{ type: 'text', text: md }]
        if (value.attachment && typeof value.attachment === 'object') {
          blocks.push({ type: 'image', attachment: value.attachment })
        }
        return blocks
      }
    },
    async execute(args, exec) {
      const ctx = getCtx()
      const { buffer, mime, width: rw, height: rh } = await resolveImage(exec, args)
      let width = 0
      let height = 0
      try {
        const d = decodeAny(buffer, mime)
        width = d.width
        height = d.height
      } catch {
        width = Number(rw) || 0
        height = Number(rh) || 0
      }
      const attachmentId = String(args && args.attachment_id || '').trim()
      let path
      if (attachmentId) {
        // 附件需先物化到 artifacts 目录（本地路径则直接用解析后的绝对路径）
        const ext = String(mime || '').includes('jpeg') ? '.jpg' : '.png'
        path = saveArtifact(exec, tsName('show_', ext), buffer)
      } else {
        const rawPath = String(args && args.image_path || '').trim()
        const cwd = exec && exec.agent && exec.agent.meta ? exec.agent.meta.cwd : undefined
        path = rawPath
        if (cwd && !/^[A-Za-z]:[\\/]/.test(rawPath) && !rawPath.startsWith('/') && !rawPath.startsWith('\\\\')) {
          path = join(cwd, rawPath)
        }
      }
      const label = String(args && args.label || '').trim() || '图片'
      // 尝试注册到 attachments 服务，供 toolview 卡片渲染；失败/缺失则纯 markdown 兜底
      let attachment = null
      let attachments
      try { attachments = ctx && typeof ctx.get === 'function' ? ctx.get('attachments') : undefined } catch { attachments = undefined }
      if (attachments && typeof attachments.saveImage === 'function') {
        try {
          attachment = await attachments.saveImage({ data: buffer, mediaType: mime || 'image/png' })
        } catch {
          attachment = null
        }
      }
      const ret = { ok: true, path, label, width, height }
      // attachment 为 null 时省略该键（nullable-object 会破坏 harness 的 must-be-object 校验，与 generate_image 的 usage 相同处理）
      if (attachment && typeof attachment === 'object') ret.attachment = attachment
      return ret
    }
  })

  return [zoomTool, sampleColorsTool, imageDiffTool, ocrTool, detectTool, showImageTool]
}

export { sniffMediaType }