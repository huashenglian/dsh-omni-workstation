// show-video.test.js — show_video 工具（宿主）+ /omni/media 路由（目录穿越/上限）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, closeSync, openSync, ftruncateSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildVisionToolDefs } from '../lib/vision-tools.js'

const dshHome = mkdtempSync(join(tmpdir(), 'omni-show-video-'))
process.env.DSH_HOME = dshHome
process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR = dshHome
const { apply, sniffMediaKind, mediaMimeFor, _setMediaRootCwd, MAX_MEDIA_SERVE_BYTES } = await import('../lib/index.js')

// 最小可嗅探为 video 的 mp4：offset 4 = 'ftyp'，brand 'isom'（非 M4A*）。
function mp4Header(size = 64) {
  const b = Buffer.alloc(size)
  b.writeUInt32BE(size, 0)
  b.write('ftyp', 4, 'ascii')
  b.write('isom', 8, 'ascii')
  return b
}

const dir = mkdtempSync(join(tmpdir(), 'omni-video-'))
const writeVideo = (name, buf = mp4Header()) => { const p = join(dir, name); writeFileSync(p, buf); return p }
const exec = { agent: { meta: { cwd: dir } } }

function byName() {
  return Object.fromEntries(buildVisionToolDefs({
    getCtx: () => ({ get: () => undefined }),
    loadConfig: async () => ({}),
    resolveImage: async () => { throw new Error('unused') },
    askVlm: async () => ({ text: '', model: '', api: '' }),
    sniffMediaKind,
    mediaMimeFor
  }).map((t) => [t.name, t]))
}

test('show_video 在工作区内 mp4 → {ok,path,mime:video/mp4,bytes}', async () => {
  const p = writeVideo('clip.mp4')
  const tool = byName().show_video
  const r = await tool.execute({ video_path: p, label: '演示' }, exec)
  assert.equal(r.ok, true)
  assert.equal(r.path, p)
  assert.equal(r.mime, 'video/mp4')
  assert.equal(r.label, '演示')
  assert.equal(r.bytes, 64)
})

test('show_video 相对路径按 sessionCwd 解析（不回退 process.cwd）', async () => {
  const p = writeVideo('rel.mp4')
  const tool = byName().show_video
  const r = await tool.execute({ video_path: 'rel.mp4' }, exec)
  assert.equal(r.ok, true)
  assert.equal(r.path, p)
})

test('show_video 路径不存在 → 中文错误', async () => {
  const tool = byName().show_video
  await assert.rejects(
    () => tool.execute({ video_path: join(dir, 'nope.mp4') }, exec),
    /show_video: 无法读取视频文件/
  )
})

test('show_video 非视频文件 → 中文错误', async () => {
  const txt = join(dir, 'note.txt')
  writeFileSync(txt, Buffer.from('hello world, not a video at all'))
  const tool = byName().show_video
  await assert.rejects(
    () => tool.execute({ video_path: txt }, exec),
    /show_video: 该文件不是视频/
  )
})

test('show_video render 只返回文本块（绝不返回 image 块）', async () => {
  const p = writeVideo('render.mp4')
  const tool = byName().show_video
  const r = await tool.execute({ video_path: p }, exec)
  const blocks = tool.output.render({}, r)
  assert.equal(blocks.length, 1)
  assert.equal(blocks[0].type, 'text')
  assert.equal(blocks.filter((b) => b.type === 'image').length, 0)
  assert.ok(blocks[0].text.includes('## 视频展示'))
  assert.ok(blocks[0].text.includes(p.replace(/\\/g, '/')))
  // 失败时也只有文本块
  const bad = tool.output.render({}, { ok: false, detail: 'x' })
  assert.equal(bad.length, 1)
  assert.equal(bad[0].type, 'text')
})

// ---------- /omni/media 路由 ----------

function makeFakeCtx() {
  const routes = []
  const registered = []
  return {
    routes,
    registered,
    get: (n) => (n === 'webServer' ? { register: (r) => { routes.push(r); return () => {} } } : undefined),
    tools: { register: (d) => { registered.push(d); return () => {} } },
    llm: {
      listProviders: () => [], registerAdapter: () => () => {},
      registration: () => { throw new Error('no source') }, stream: async function* () {}, on: () => {}, effect: () => {}
    },
    logger: { warn: () => {} },
    on: () => {}, effect: (fn) => fn()
  }
}

const makeReq = (raw) => {
  const listeners = {}
  return {
    method: 'POST',
    on: (ev, fn) => { listeners[ev] = fn },
    emitData: () => { if (listeners.data) listeners.data(raw) },
    emitEnd: () => { if (listeners.end) listeners.end() }
  }
}
const callRoute = async (route, body) => {
  let status = 0; let payload = null
  const res = { writeHead: (s) => { status = s }, end: (b) => { payload = JSON.parse(b) } }
  const req = makeReq(JSON.stringify(body))
  const pending = route.handler(req, res)
  req.emitData(); req.emitEnd()
  await pending
  return { status, payload }
}

function mediaRoute(ctx) {
  const route = ctx.routes.find((r) => r.path === '/omni/media')
  assert.ok(route, 'apply 应注册 /omni/media 路由')
  return route
}

test('/omni/media 工作区内视频 → {ok,mime,data(base64)}', async () => {
  _setMediaRootCwd(dir)
  const ctx = makeFakeCtx(); apply(ctx)
  const p = writeVideo('serve.mp4')
  const { status, payload } = await callRoute(mediaRoute(ctx), { path: p })
  assert.equal(status, 200)
  assert.equal(payload.ok, true)
  assert.equal(payload.mime, 'video/mp4')
  assert.equal(Buffer.from(payload.data, 'base64').length, 64)
})

test('/omni/media 相对 ../ 穿越 → 403', async () => {
  _setMediaRootCwd(dir)
  const ctx = makeFakeCtx(); apply(ctx)
  const { status, payload } = await callRoute(mediaRoute(ctx), { path: '../../outside.mp4' })
  assert.equal(status, 403)
  assert.equal(payload.ok, false)
})

test('/omni/media 工作区外绝对路径 → 403', async () => {
  _setMediaRootCwd(dir)
  const ctx = makeFakeCtx(); apply(ctx)
  const outside = process.platform === 'win32' ? 'C:/Windows/win.ini' : '/etc/passwd'
  const { status } = await callRoute(mediaRoute(ctx), { path: outside })
  assert.equal(status, 403)
})

test('/omni/media 超过 32MB 上限 → 413', async () => {
  _setMediaRootCwd(dir)
  const ctx = makeFakeCtx(); apply(ctx)
  const big = join(dir, 'big.mp4')
  const fd = openSync(big, 'w')
  try { ftruncateSync(fd, MAX_MEDIA_SERVE_BYTES + 1) } finally { closeSync(fd) }
  const { status, payload } = await callRoute(mediaRoute(ctx), { path: big })
  assert.equal(status, 413)
  assert.equal(payload.ok, false)
  assert.ok(/过大|上限/.test(payload.error), payload.error)
})