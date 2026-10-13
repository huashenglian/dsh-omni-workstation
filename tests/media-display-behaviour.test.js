// media-display-behaviour.test.js — REAL behavioural coverage for the v2.12 /
// v0.1.1 media display surface (plan task 5).
//
// Why this file exists: `tool-*-card-ui*.test.js` used to be the only coverage
// for the media display feature and they were regexes over the raw text of
// `lib/client.js` — deleting the feature still let them pass. They are now
// renamed `*.source-lock.test.js` and say so. This file is the replacement: it
// drives the actual production code paths and asserts on their observable
// results.
//
// Covered here (all reachable from Node; no jsdom needed):
//   A. `POST /omni/media` round-trip  — 200 + byte-exact base64 + correct mime,
//      with a sessionId, WITHOUT one (fallback), and with an unknown one;
//      403 for a workspace-external path; 413 for a >32MB file; 400/403 for
//      malformed bodies.
//   B. `globalConfig.showImageMaxHeight` / `showVideoMaxHeight` round-trip
//      through `applyPatch` → `masked` (the exact path the settings page uses)
//      — defaults 180/360 and the 64..2000 clamp.
//   C. `show_video`'s `output.render` returns ONLY text blocks for every
//      successful value — an image block there would be silently stripped by
//      the plugin's own tool-result sanitizer on text-only models.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, openSync, ftruncateSync, closeSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { buildVisionToolDefs } from '../lib/vision-tools.js'

const dshHome = mkdtempSync(join(tmpdir(), 'omni-media-beh-home-'))
process.env.DSH_HOME = dshHome
process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR = dshHome
const {
  apply, _setMediaRootCwd, MAX_MEDIA_SERVE_BYTES, sniffMediaKind, mediaMimeFor,
  applyPatch, masked
} = await import('../lib/index.js')

// ---- temp workspace bookkeeping (all of it removed in `after`) ----
const tempDirs = [dshHome]
const mkRoot = (tag) => {
  const d = mkdtempSync(join(tmpdir(), 'omni-beh-' + tag + '-'))
  tempDirs.push(d)
  return d
}
after(() => { for (const d of tempDirs) { try { rmSync(d, { recursive: true, force: true }) } catch { /* best-effort */ } } })

// ---- minimal sniffable media fixtures ----
// mp4: 4-byte box size + 'ftyp' + brand 'isom' (an M4A brand would sniff audio).
const MP4 = (() => {
  const b = Buffer.alloc(64)
  b.writeUInt32BE(64, 0); b.write('ftyp', 4, 'ascii'); b.write('isom', 8, 'ascii')
  return b
})()
// webm/mkv: EBML magic. Different extension → the mime must follow the file.
const WEBM = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(28, 0x21)])

// ---- the fake cordis ctx + route driver (same shape as media-pipeline.test.js) ----
function makeFakeCtx() {
  const routes = []
  return {
    routes,
    get: (n) => (n === 'webServer' ? { register: (r) => { routes.push(r); return () => {} } } : undefined),
    tools: { register: () => () => {} },
    llm: {
      listProviders: () => [], registerAdapter: () => () => {},
      registration: () => { throw new Error('no source') }, stream: async function* () {}, on: () => {}, effect: () => {}
    },
    logger: { warn: () => {}, info: () => {}, debug: () => {} },
    on: () => {}, effect: (fn) => fn()
  }
}
function mediaRoute(ctx) {
  const route = ctx.routes.find((r) => r.path === '/omni/media')
  assert.ok(route, 'apply 应注册 /omni/media 路由')
  return route
}
// `body` may be an object (JSON-stringified) or a raw string (malformed input).
const callRoute = async (route, body) => {
  let status = 0
  let payload = null
  const res = { writeHead: (s) => { status = s }, end: (b) => { payload = JSON.parse(b) } }
  const listeners = {}
  const req = { method: 'POST', on: (ev, fn) => { listeners[ev] = fn } }
  const raw = typeof body === 'string' ? body : JSON.stringify(body)
  const pending = route.handler(req, res)
  if (listeners.data) listeners.data(raw)
  if (listeners.end) listeners.end()
  await pending
  return { status, payload }
}
// One workspace + one registered route, reused by the route cases below.
const ws = mkRoot('ws')
const clip = join(ws, 'clip.mp4')
writeFileSync(clip, MP4)
const routeCtx = makeFakeCtx()
apply(routeCtx)
const route = mediaRoute(routeCtx)
_setMediaRootCwd('beh-s1', ws)

// ============ A. /omni/media round-trip ============

test('A1 /omni/media: 会话工作区内的 mp4 + sessionId → 200, data 是逐字节正确的 base64, mime=video/mp4', async () => {
  const { status, payload } = await callRoute(route, { path: clip, sessionId: 'beh-s1' })
  assert.equal(status, 200)
  assert.equal(payload.ok, true)
  assert.equal(payload.mime, 'video/mp4')
  // Independent oracle: the bytes on disk. Not a re-implementation of the route.
  const served = Buffer.from(payload.data, 'base64')
  assert.deepEqual(served, MP4, 'base64 round-trip must be byte-identical to the file')
  assert.equal(payload.data, MP4.toString('base64'), 'data really is base64, not JSON of a Buffer')
})

test('A2 /omni/media: 请求体不带 sessionId → 回退最近写入的根, 仍然 200（不是报错）', async () => {
  const withId = await callRoute(route, { path: clip, sessionId: 'beh-s1' })
  const without = await callRoute(route, { path: clip })
  assert.equal(without.status, 200)
  assert.equal(without.payload.ok, true)
  assert.deepEqual(Buffer.from(without.payload.data, 'base64'), MP4)
  assert.equal(without.payload.data, withId.payload.data, '回退读到的应是同一个会话的同一个文件')
})

test('A3 /omni/media: 未知 sessionId 回退到最近写入的根, 已知 id 各读各的（各会话隔离）', async () => {
  const other = mkRoot('ws-other')
  const otherClip = join(other, 'other.mp4')
  writeFileSync(otherClip, MP4)
  _setMediaRootCwd('beh-s2', other)
  try {
    // Unknown id → most recently written root (beh-s2): its own file is served…
    const unknown = await callRoute(route, { path: otherClip, sessionId: 'beh-never-seen' })
    assert.equal(unknown.status, 200, '未知 id 回退到最近写入的根（beh-s2）')
    assert.deepEqual(Buffer.from(unknown.payload.data, 'base64'), MP4)
    // …and beh-s1's file is NOT reachable through that fallback.
    assert.equal((await callRoute(route, { path: clip, sessionId: 'beh-never-seen' })).status, 403)

    // beh-s1 keeps its OWN root, so beh-s2's file is outside it → refused.
    const cross = await callRoute(route, { path: otherClip, sessionId: 'beh-s1' })
    assert.equal(cross.status, 403, 'beh-s1 不能从 beh-s2 的工作区读')
    assert.equal(cross.payload.data, undefined, '拒绝时不得回传任何字节')

    // …and beh-s2 still reads its own file.
    const own = await callRoute(route, { path: otherClip, sessionId: 'beh-s2' })
    assert.equal(own.status, 200)
  } finally {
    _setMediaRootCwd('beh-s1', ws) // restore for the cases below
  }
})

test('A4 /omni/media: mime 跟随容器扩展名, 不是写死的 mp4（webm → video/webm）', async () => {
  const w = join(ws, 'clip.webm')
  writeFileSync(w, WEBM)
  const { status, payload } = await callRoute(route, { path: w, sessionId: 'beh-s1' })
  assert.equal(status, 200)
  assert.equal(payload.mime, 'video/webm')
  assert.deepEqual(Buffer.from(payload.data, 'base64'), WEBM)
})

test('A5 /omni/media: 工作区之外的**已存在**文件 → 403, 不回传字节', async () => {
  const outside = join(dshHome, 'outside.mp4')
  writeFileSync(outside, MP4)
  const { status, payload } = await callRoute(route, { path: outside, sessionId: 'beh-s1' })
  assert.equal(status, 403)
  assert.equal(payload.ok, false)
  assert.equal(payload.data, undefined)
  assert.ok(payload.error.includes('拒绝访问工作区之外的路径'), payload.error)
})

test('A6 /omni/media: 超过 32MB 上限 → 413, 不回传字节', async () => {
  const big = join(ws, 'big.mp4')
  const fd = openSync(big, 'w')
  try { ftruncateSync(fd, MAX_MEDIA_SERVE_BYTES + 1) } finally { closeSync(fd) }
  const { status, payload } = await callRoute(route, { path: big, sessionId: 'beh-s1' })
  assert.equal(status, 413)
  assert.equal(payload.ok, false)
  assert.equal(payload.data, undefined)
  assert.ok(/过大|上限/.test(payload.error), payload.error)

  // …and exactly at the cap is still served, so 413 is the cap and not "big".
  const edge = join(ws, 'edge.mp4')
  const fd2 = openSync(edge, 'w')
  try { ftruncateSync(fd2, MAX_MEDIA_SERVE_BYTES) } finally { closeSync(fd2) }
  const ok = await callRoute(route, { path: edge, sessionId: 'beh-s1' })
  assert.equal(ok.status, 200, '恰好等于上限应放行')
  assert.equal(Buffer.from(ok.payload.data, 'base64').length, MAX_MEDIA_SERVE_BYTES)
  rmSync(big, { force: true }); rmSync(edge, { force: true })
})

test('A7 /omni/media 畸形输入: 非法 JSON / 缺 path / 空 path → 400, .. 穿越 → 403', async () => {
  const bad = await callRoute(route, '{not json')
  assert.equal(bad.status, 400)
  assert.equal(bad.payload.ok, false)

  for (const p of [undefined, '', '   ']) {
    const r = await callRoute(route, { path: p, sessionId: 'beh-s1' })
    assert.equal(r.status, 400, 'path=' + JSON.stringify(p))
    assert.equal(r.payload.error, 'missing path')
  }

  const trav = await callRoute(route, { path: '../../outside.mp4', sessionId: 'beh-s1' })
  assert.equal(trav.status, 403)
  assert.equal(trav.payload.data, undefined)
})

test('A8 /omni/media: sessionId 为 null / 数字 / 对象 → 回退成功, 不 500', async () => {
  for (const id of [null, 12345, { a: 1 }, []]) {
    const { status, payload } = await callRoute(route, { path: clip, sessionId: id })
    assert.equal(status, 200, 'sessionId=' + JSON.stringify(id))
    assert.equal(payload.ok, true)
    assert.deepEqual(Buffer.from(payload.data, 'base64'), MP4)
  }
})

// ============ B. 显示尺寸设置往返（applyPatch → masked） ============

const baseCfg = () => ({
  vlmEnabled: true,
  apis: [{ id: 'c_beh', name: 'A', provider: 'custom', protocol: 'openai-completions', endpoint: 'https://a/v1', apiKey: 'sk-a', model: 'm-a' }]
})

test('B1 applyPatch → masked: 默认值为图片 180 / 视频 360', () => {
  const out = masked(applyPatch(baseCfg(), { globalConfig: { field: 'showImageMaxHeight', value: 500 } }))
  assert.equal(out.globalConfig.showImageMaxHeight, 500)
  assert.equal(out.globalConfig.showVideoMaxHeight, 360, '未触碰的兄弟项保持默认')
  assert.equal(masked(baseCfg()).globalConfig.showImageMaxHeight, 180)
})

test('B2 applyPatch → masked: 越界值夹取到 64..2000（两个设置各自独立）', () => {
  const cases = [[0, 64], [-5, 64], [1, 64], [63, 64], [64, 64], [2000, 2000], [2001, 2000], [99999, 2000]]
  for (const field of ['showImageMaxHeight', 'showVideoMaxHeight']) {
    for (const [input, want] of cases) {
      const got = masked(applyPatch(baseCfg(), { globalConfig: { field, value: input } })).globalConfig[field]
      assert.equal(got, want, `${field} value=${input} → ${got}`)
    }
  }
  // 两项互不影响
  const both = masked(applyPatch(
    applyPatch(baseCfg(), { globalConfig: { field: 'showImageMaxHeight', value: 120 } }),
    { globalConfig: { field: 'showVideoMaxHeight', value: 800 } }
  ))
  assert.equal(both.globalConfig.showImageMaxHeight, 120)
  assert.equal(both.globalConfig.showVideoMaxHeight, 800)
})

test('B3 applyPatch → masked: 数字字符串被强制转换, 垃圾值回落默认', () => {
  const asNum = masked(applyPatch(baseCfg(), { globalConfig: { field: 'showVideoMaxHeight', value: '720' } }))
  assert.equal(asNum.globalConfig.showVideoMaxHeight, 720, '输入框提交的是字符串 "720"')
  assert.equal(typeof asNum.globalConfig.showVideoMaxHeight, 'number')
  for (const junk of ['', 'abc', null]) {
    const r = masked(applyPatch(baseCfg(), { globalConfig: { field: 'showImageMaxHeight', value: junk } }))
    assert.equal(r.globalConfig.showImageMaxHeight, 180, 'value=' + JSON.stringify(junk))
  }
})

// ============ C. show_video render 只出文本块 ============

const videoTool = buildVisionToolDefs({
  getCtx: () => ({ get: () => undefined }),
  loadConfig: async () => ({}),
  resolveImage: async () => { throw new Error('unused') },
  askVlm: async () => ({ text: '', model: '', api: '' }),
  sniffMediaKind,
  mediaMimeFor
}).find((t) => t.name === 'show_video')

test('C1 show_video render: 任意成功形态都只产出 text 块, 绝不含 image 块或 data: URL', async () => {
  assert.ok(videoTool, 'show_video 应注册')
  const executed = await videoTool.execute({ video_path: clip, label: '演示' }, { agent: { meta: { cwd: ws } } })
  assert.equal(executed.ok, true)

  const values = [
    executed,                                                        // the real tool result
    { ok: true, path: 'C:/w/clip.mp4', mime: 'video/mp4', bytes: 1, label: 'x' },
    { ok: true, path: 'clip.mp4' },                                   // no label, no mime
    { ok: true, path: 'clip.mp4', label: '' }                         // empty label
  ]
  for (const v of values) {
    const blocks = videoTool.output.render({}, v)
    assert.ok(Array.isArray(blocks) && blocks.length > 0, 'render 必须返回块数组')
    assert.deepEqual(blocks.filter((b) => b.type !== 'text'), [], '非 text 块: ' + JSON.stringify(blocks))
    assert.equal(blocks.filter((b) => b.type === 'image').length, 0)
    const text = blocks.map((b) => b.text).join('\n')
    assert.ok(!/data:image|base64,/.test(text), '文本块里不得混入图片 data URL')
  }
})

test('C2 show_video render: 失败形态同样只出文本块', () => {
  for (const v of [{ ok: false, detail: 'boom' }, { ok: false }, null, undefined, {}]) {
    const blocks = videoTool.output.render({}, v)
    assert.equal(blocks.length, 1)
    assert.equal(blocks[0].type, 'text')
  }
})