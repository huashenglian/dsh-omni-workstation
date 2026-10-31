// cli-mount.test.js — v2.14 CLI/headless 挂载
//  · 没有 webServer 的组合（dsh --profile headless）必须能 apply：工具注册、不抛错、不注册路由
//  · 有 webServer 时注册全部 14 条 /omni/* 路由，且同一个 ctx 只绑一次（register 重复路径会 throw）
//  · 启动即在 home 位置建出配置 + 同目录 schema
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dshHome = mkdtempSync(join(tmpdir(), 'omni-cli-mount-'))
process.env.DSH_HOME = dshHome
delete process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR

const { apply } = await import('../lib/index.js')

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

function makeCtx({ withWebServer }) {
  const routes = []
  const tools = []
  let registerCalls = 0
  const ctx = {
    tools: { register: (def) => { registerCalls += 1; tools.push(def.name); return () => { const i = tools.indexOf(def.name); if (i >= 0) tools.splice(i, 1) } } },
    llm: { listProviders: () => [], registerAdapter: () => () => {} },
    on: () => {},
    effect: () => {},
    inject: () => {},
    logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
    get(name) {
      if (name === 'tools') return ctx.tools
      if (name === 'llm') return ctx.llm
      if (name === 'webServer' && withWebServer) {
        return { register: (route) => { routes.push(route); return () => {} } }
      }
      return undefined
    }
  }
  return { ctx, routes, tools, calls: () => registerCalls }
}

test('无 webServer 也能挂载：工具注册、零路由', async () => {
  const { ctx, routes, tools } = makeCtx({ withWebServer: false })
  apply(ctx)
  await wait(200)
  assert.equal(routes.length, 0, 'CLI/headless 面不得注册 HTTP 路由')
  assert.ok(tools.includes('analyze_image'), '默认兜底模型可用 → analyze_image 应注册')
  assert.ok(tools.includes('zoom_image'), '视觉工具箱应注册')
  assert.ok(existsSync(join(dshHome, 'omni-vision.json')), '新装应在 ~/.dsh 建出配置')
  assert.ok(existsSync(join(dshHome, 'omni-vision.schema.json')), 'schema 应复制到配置同目录')
  const cfg = JSON.parse(readFileSync(join(dshHome, 'omni-vision.json'), 'utf8'))
  assert.equal(cfg.$schema, 'omni-vision.schema.json')
})

test('有 webServer 时注册全部路由，重复 apply 不重复绑定', async () => {
  const { ctx, routes } = makeCtx({ withWebServer: true })
  apply(ctx)
  await wait(200)
  assert.equal(routes.length, 14, '应有 14 条 /omni/* 路由')
  const paths = routes.map((r) => r.path)
  assert.equal(new Set(paths).size, paths.length, '路由路径不得重复')
  for (const p of ['/omni/config', '/omni/models', '/omni/key', '/omni/media', '/omni/stt/test']) {
    assert.ok(paths.includes(p), '缺少路由 ' + p)
  }

  // 同一个 ctx 再 apply（例如 reload 前的重复调用）必须被 per-context 守卫拦住，
  // 否则 webServer.register 会因重复路径直接 throw。
  apply(ctx)
  await wait(100)
  assert.equal(routes.length, 14, '重复 apply 不得重复绑路由')
})