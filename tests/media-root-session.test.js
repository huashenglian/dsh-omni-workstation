// media-root-session.test.js — /omni/media 工作区根按会话隔离（v0.1.1 / 计划 T1）
//
// 背景：v2.12 的 `mediaRootCwd` 是单一全局变量，被**最后一个** agent/pre-step
// 覆盖 —— 并发会话下会话 B 的根会顶掉会话 A 的根，A 的视频卡片随即 403。
// 本文件覆盖：pre-step 按会话写、路由按 sessionId 读、未知 id 回退最近写入值、
// Map 上限 8、以及 400/403 语义保持不变。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dshHome = mkdtempSync(join(tmpdir(), 'omni-media-root-'))
process.env.DSH_HOME = dshHome
process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR = dshHome
const { apply, _setMediaRootCwd, mediaRoot } = await import('../lib/index.js')

// 最小可嗅探为 video 的 mp4：offset 4 = 'ftyp'，brand 'isom'（非 M4A*）。
function mp4Header(size = 64) {
  const b = Buffer.alloc(size)
  b.writeUInt32BE(size, 0)
  b.write('ftyp', 4, 'ascii')
  b.write('isom', 8, 'ascii')
  return b
}

const mkRoot = (tag) => {
  const d = mkdtempSync(join(tmpdir(), 'omni-root-' + tag + '-'))
  writeFileSync(join(d, 'clip.mp4'), mp4Header())
  return d
}

// 捕获 ctx.on 注册的监听器，好直接驱动 agent/pre-step 写入点。
function makeFakeCtx() {
  const routes = []
  const handlers = new Map()
  const warns = []
  return {
    routes,
    warns,
    handler: (name) => handlers.get(name),
    get: (n) => (n === 'webServer' ? { register: (r) => { routes.push(r); return () => {} } } : undefined),
    tools: { register: () => () => {} },
    llm: {
      listProviders: () => [], registerAdapter: () => () => {},
      registration: () => { throw new Error('no source') }, stream: async function* () {}, on: () => {}, effect: () => {}
    },
    logger: { warn: (...a) => { warns.push(a.map(String).join(' ')) }, info: () => {}, debug: () => {} },
    on: (name, fn) => { handlers.set(name, fn) },
    effect: (fn) => fn()
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
  let status = 0
  let payload = null
  const res = { writeHead: (s) => { status = s }, end: (b) => { payload = JSON.parse(b) } }
  const req = makeReq(typeof body === 'string' ? body : JSON.stringify(body))
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

// 驱动真实写入点：payload.agent.session.id 优先，其次 payload.agent.id。
const preStep = (ctx, agent) => ctx.handler('agent/pre-step')(
  { agent },
  async () => ({ kind: 'ok' })
)
const sessionAgent = (id, cwd) => ({ session: { id, header: { cwd } } })

// ---------- 无根 → 403（必须先跑：模块状态在首次写入前为空） ----------

test('会话未打开工作区（无任何根）→ 403 文案不变', async () => {
  const ctx = makeFakeCtx()
  apply(ctx)
  const fresh = mkRoot('fresh')
  const { status, payload } = await callRoute(mediaRoute(ctx), { path: join(fresh, 'clip.mp4') })
  assert.equal(status, 403)
  assert.equal(payload.error, '当前会话未打开工作区，无法读取媒体文件')
})

// ---------- 现状刻画（未改造前的行为）：全局根会被最后一次写入覆盖 ----------

test('刻画：连续两次写入后只剩最后一次（单全局被覆盖）', async () => {
  const a = mkRoot('clob-a')
  const b = mkRoot('clob-b')
  _setMediaRootCwd(a)
  assert.equal(mediaRoot(), a)
  _setMediaRootCwd(b)
  assert.equal(mediaRoot(), b)
})

// ---------- 新行为：按会话隔离 ----------

test('两次 pre-step 写入不同会话 → 各自读回自己的根，互不覆盖', async () => {
  const r1 = mkRoot('s1')
  const r2 = mkRoot('s2')
  const ctx = makeFakeCtx()
  apply(ctx)
  await preStep(ctx, sessionAgent('s1', r1))
  await preStep(ctx, sessionAgent('s2', r2))
  assert.equal(mediaRoot('s1'), r1)
  assert.equal(mediaRoot('s2'), r2)
})

test('无 session.id 时回退 payload.agent.id', async () => {
  const r1 = mkRoot('agent-id')
  const ctx = makeFakeCtx()
  apply(ctx)
  await preStep(ctx, { id: 'a1', session: { header: { cwd: r1 } } })
  assert.equal(mediaRoot('a1'), r1)
})

test('两者都取不到 → 记日志 + 落到 __default__ 键（写入不得被丢弃）', async () => {
  const r1 = mkRoot('nokey')
  const ctx = makeFakeCtx()
  apply(ctx)
  await preStep(ctx, { session: { header: { cwd: r1 } } })
  assert.equal(mediaRoot(), r1, '无标识时应写入 __default__ 键')
  assert.ok(ctx.warns.some((w) => w.includes('__default__')), '应记录一条含 __default__ 的告警：' + JSON.stringify(ctx.warns))
})

test('路由按 sessionId 取根：s1 读自己的文件成功，s2 读同一文件 403', async () => {
  const r1 = mkRoot('rt1')
  const r2 = mkRoot('rt2')
  const ctx = makeFakeCtx()
  apply(ctx)
  const route = mediaRoute(ctx)
  await preStep(ctx, sessionAgent('s1', r1))
  await preStep(ctx, sessionAgent('s2', r2))
  const own = await callRoute(route, { path: join(r1, 'clip.mp4'), sessionId: 's1' })
  assert.equal(own.status, 200)
  assert.equal(own.payload.mime, 'video/mp4')
  assert.equal(Buffer.from(own.payload.data, 'base64').length, 64)
  const cross = await callRoute(route, { path: join(r1, 'clip.mp4'), sessionId: 's2' })
  assert.equal(cross.status, 403)
  assert.equal(cross.payload.ok, false)
})

test('未知 sessionId / 缺省 → 回退最近写入的根（保留旧行为）', async () => {
  const r1 = mkRoot('fb1')
  const r2 = mkRoot('fb2')
  const ctx = makeFakeCtx()
  apply(ctx)
  const route = mediaRoute(ctx)
  await preStep(ctx, sessionAgent('s1', r1))
  await preStep(ctx, sessionAgent('s2', r2))
  assert.equal(mediaRoot('never-seen'), r2)
  assert.equal(mediaRoot(undefined), r2)
  const { status } = await callRoute(route, { path: join(r2, 'clip.mp4') })
  assert.equal(status, 200)
})

test('Map 上限 8：写入 9 个会话后最旧的被逐出，其余 8 个仍可读回', async () => {
  const roots = Array.from({ length: 9 }, (_, i) => mkRoot('cap' + i))
  const ctx = makeFakeCtx()
  apply(ctx)
  for (let i = 0; i < 9; i++) await preStep(ctx, sessionAgent('c' + i, roots[i]))
  assert.equal(mediaRoot('c1'), roots[1], '第 2 个插入的会话仍在 Map 内')
  assert.equal(mediaRoot('c8'), roots[8])
  assert.equal(mediaRoot('c0'), roots[8], '最旧的写入应被逐出（回退最近写入值）')
})

// ---------- 既有语义保持不变（400 / 403 文案逐字） ----------

test('空 path → 400 missing path', async () => {
  const ctx = makeFakeCtx()
  apply(ctx)
  await preStep(ctx, sessionAgent('s1', mkRoot('empty')))
  const { status, payload } = await callRoute(mediaRoute(ctx), { path: '   ' })
  assert.equal(status, 400)
  assert.equal(payload.error, 'missing path')
})

test('非法 JSON → 400（解析失败沿用既有 catch 分支）', async () => {
  const ctx = makeFakeCtx()
  apply(ctx)
  await preStep(ctx, sessionAgent('s1', mkRoot('badjson')))
  const { status, payload } = await callRoute(mediaRoute(ctx), '{not json')
  assert.equal(status, 400)
  assert.equal(payload.ok, false)
})

test('sessionId 为 null / 数字 / 对象 → 回退最近写入值，不 500', async () => {
  const r1 = mkRoot('weird')
  const ctx = makeFakeCtx()
  apply(ctx)
  const route = mediaRoute(ctx)
  await preStep(ctx, sessionAgent('s1', r1))
  for (const bad of [null, 12345, { a: 1 }]) {
    const { status, payload } = await callRoute(route, { path: join(r1, 'clip.mp4'), sessionId: bad })
    assert.equal(status, 200, 'sessionId=' + JSON.stringify(bad))
    assert.equal(payload.ok, true)
  }
})

test('路径含 .. 穿越 → 403（既有文案不变）', async () => {
  const r1 = mkRoot('trav')
  const ctx = makeFakeCtx()
  apply(ctx)
  await preStep(ctx, sessionAgent('s1', r1))
  const { status, payload } = await callRoute(mediaRoute(ctx), { path: '../../outside.mp4', sessionId: 's1' })
  assert.equal(status, 403)
  assert.ok(payload.error.includes('拒绝访问工作区之外的路径'), payload.error)
})