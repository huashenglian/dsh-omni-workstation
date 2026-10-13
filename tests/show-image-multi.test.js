// show-image-multi.test.js — show_image 多图入参（真实临时 PNG 文件 + 假 deps）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { encodePng, decodePng } from '../lib/vendor/png.js'
import { buildVisionToolDefs } from '../lib/vision-tools.js'

function makePng(width, height, fill) {
  const data = new Uint8Array(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    const o = i * 4
    data[o] = fill[0]
    data[o + 1] = fill[1]
    data[o + 2] = fill[2]
    data[o + 3] = fill[3]
  }
  return { buffer: encodePng(data, width, height), width, height }
}

const dir = mkdtempSync(join(tmpdir(), 'omni-show-multi-'))
function writePng(name, w, h, fill) {
  const { buffer } = makePng(w, h, fill)
  const p = join(dir, name)
  writeFileSync(p, buffer)
  return p
}
const exec = { agent: { meta: { cwd: dir } } }

// resolveImage 真读盘：路径不存在 → 抛错（驱动「部分失败跳过」）
function makeDeps(attachments) {
  const deps = {
    getCtx: () => ({ get: (n) => (n === 'attachments' ? attachments : undefined) }),
    loadConfig: async () => ({}),
    resolveImage: async (exec2, args) => {
      const p = args.image_path
      if (!p || !existsSync(p)) throw new Error('IMAGE_NOT_FOUND: ' + p)
      const buffer = readFileSync(p)
      const d = decodePng(buffer)
      return { buffer, mime: 'image/png', width: d.width, height: d.height }
    },
    askVlm: async () => ({ text: '', model: '', api: '' })
  }
  return deps
}

function byName(deps) {
  return Object.fromEntries(buildVisionToolDefs(deps).map((t) => [t.name, t]))
}

const saveImage = async () => ({ attachmentId: 'att_x' })

test('image_paths 参数为可选（不含 required 键）+ schema 含 images 数组', () => {
  const t = byName(makeDeps(undefined)).show_image
  const params = t.parameters.properties || t.parameters
  assert.ok(params.image_paths, '应新增 image_paths 参数')
  assert.equal(params.image_paths.type, 'array')
  assert.ok(!('required' in params.image_paths), '可选参数必须省略 required 键')
  assert.ok(t.output.schema.properties.images, 'output schema 应含 images')
  assert.equal(t.output.schema.properties.images.type, 'array')
  assert.ok(t.output.schema.properties.count, 'output schema 应含 count')
})

test('image_paths 传 3 张真实 PNG → count/images 3 条，render 3 image 块 + 1 文本块', async () => {
  const p1 = writePng('a.png', 6, 5, [10, 20, 30, 255])
  const p2 = writePng('b.png', 7, 8, [40, 50, 60, 255])
  const p3 = writePng('c.png', 9, 4, [70, 80, 90, 255])
  const tool = byName(makeDeps({ saveImage })).show_image
  const r = await tool.execute({ image_paths: [p1, p2, p3], label: '多图' }, exec)
  assert.equal(r.ok, true)
  assert.equal(r.count, 3)
  assert.equal(r.images.length, 3)
  assert.deepEqual(r.images.map((i) => i.path), [p1, p2, p3])
  assert.deepEqual([r.images[0].width, r.images[0].height], [6, 5])
  assert.deepEqual([r.images[1].width, r.images[1].height], [7, 8])
  assert.deepEqual([r.images[2].width, r.images[2].height], [9, 4])
  assert.equal(r.path, p1, '扁平 path 取自首张')
  assert.equal(r.width, 6)
  assert.equal(r.height, 5)
  const blocks = tool.output.render({}, r)
  assert.equal(blocks.filter((b) => b.type === 'image').length, 3)
  assert.equal(blocks.filter((b) => b.type === 'text').length, 1)
  assert.equal(blocks.length, 4)
  const text = blocks.find((b) => b.type === 'text').text
  for (const p of [p1, p2, p3]) assert.ok(text.includes(p.replace(/\\/g, '/')), '文本块应列出 ' + p)
})

test('单图 image_path 行为与改造前一致（1 图块，count/images 为 1）', async () => {
  const p1 = writePng('single.png', 12, 3, [1, 2, 3, 255])
  const tool = byName(makeDeps({ saveImage })).show_image
  const r = await tool.execute({ image_path: p1 }, exec)
  assert.equal(r.ok, true)
  assert.equal(r.count, 1)
  assert.equal(r.images.length, 1)
  assert.equal(r.images[0].path, p1)
  assert.equal(r.path, p1)
  assert.equal(r.width, 12)
  assert.equal(r.height, 3)
  assert.equal(r.label, '图片')
  const blocks = tool.output.render({}, r)
  assert.equal(blocks.filter((b) => b.type === 'image').length, 1)
  assert.equal(blocks.filter((b) => b.type === 'text').length, 1)
})

test('单图 attachments 服务缺失 → 无 image 块（纯文本兜底，回归保护）', async () => {
  const p1 = writePng('nofallback.png', 4, 4, [5, 5, 5, 255])
  const tool = byName(makeDeps(undefined)).show_image
  const r = await tool.execute({ image_path: p1 }, exec)
  assert.ok(!('attachment' in r))
  const blocks = tool.output.render({}, r)
  assert.equal(blocks.length, 1)
  assert.equal(blocks[0].type, 'text')
  assert.ok(blocks[0].text.includes('## 图片展示'))
})

test('image_paths 其中一个路径不存在 → 2 of 3 存活，无异常', async () => {
  const p1 = writePng('ok1.png', 5, 5, [1, 1, 1, 255])
  const bad = join(dir, 'does-not-exist.png')
  const p3 = writePng('ok3.png', 6, 6, [2, 2, 2, 255])
  const tool = byName(makeDeps({ saveImage })).show_image
  const r = await tool.execute({ image_paths: [p1, bad, p3] }, exec)
  assert.equal(r.ok, true)
  assert.equal(r.count, 2)
  assert.deepEqual(r.images.map((i) => i.path), [p1, p3])
})

test('image_paths 9 个路径 → 抛「最多 8 张」中文错误', async () => {
  const tool = byName(makeDeps({ saveImage })).show_image
  const nine = Array.from({ length: 9 }, (_, i) => join(dir, 'n' + i + '.png'))
  await assert.rejects(
    () => tool.execute({ image_paths: nine }, exec),
    /show_image: .*8 张/
  )
})

test('image_paths 非空时优先于 image_path / attachment_id', async () => {
  const good = writePng('win.png', 3, 7, [9, 9, 9, 255])
  const tool = byName(makeDeps({ saveImage })).show_image
  const r = await tool.execute({ image_path: join(dir, 'ignored-bad.png'), attachment_id: 'sha256:ignored', image_paths: [good] }, exec)
  assert.equal(r.count, 1)
  assert.equal(r.images[0].path, good)
  assert.equal(r.width, 3)
  assert.equal(r.height, 7)
})

test('全部路径失败 → 抛 show_image 中文错误', async () => {
  const tool = byName(makeDeps({ saveImage })).show_image
  await assert.rejects(
    () => tool.execute({ image_paths: [join(dir, 'x1.png'), join(dir, 'x2.png')] }, exec),
    /show_image: 无法解析图片/
  )
})