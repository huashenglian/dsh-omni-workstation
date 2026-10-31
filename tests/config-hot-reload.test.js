// config-hot-reload.test.js — v2.14 改文件免重启
// agent/pre-step 里按 mtime+size 戳比对：文件变了就重跑 syncToolRegistration，
// 没变就什么都不做（不发多余注册）。CLI/headless 面没有设置页，这是唯一生效通道。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dshHome = mkdtempSync(join(tmpdir(), 'omni-hotreload-'))
process.env.DSH_HOME = dshHome
delete process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR

const { apply } = await import('../lib/index.js')

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const cfgFile = join(dshHome, 'omni-vision.json')

const registered = new Set()
const listeners = new Map()
let registerCalls = 0

const ctx = {
  tools: { register: (def) => { registerCalls += 1; registered.add(def.name); return () => registered.delete(def.name) } },
  llm: { listProviders: () => [], registerAdapter: () => () => {} },
  on: (event, fn) => { if (!listeners.has(event)) listeners.set(event, []); listeners.get(event).push(fn) },
  effect: () => {},
  inject: () => {},
  logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
  get(name) { return name === 'tools' || name === 'llm' ? ctx[name] : undefined }
}

const preStep = async (sessionId = 's1') => {
  const fn = (listeners.get('agent/pre-step') || [])[0]
  assert.ok(fn, 'agent/pre-step 监听器应已注册')
  return fn({ agent: { session: { id: sessionId } } }, async () => ({ kind: 'continue', messages: [] }))
}

test('手改配置后一个 agent 步内生效（无需重启）', async () => {
  apply(ctx)
  await wait(200)
  assert.ok(registered.has('analyze_image'), '启动时 analyze_image 应已注册')
  assert.ok(!registered.has('generate_video'), '默认视频卡无有效 endpoint → 不注册 generate_video')

  const cfg = JSON.parse(readFileSync(cfgFile, 'utf8'))
  cfg.videoEnabled = true
  cfg.videoCards = [{
    id: 'vc1', name: '视频模型', type: 'general', toolName: 'generate_video', enabled: true, source: 'user',
    config: { provider: 'custom', protocol: 'openai-videos', endpoint: 'https://api.example.com/v1', apiKey: 'sk-x', model: 'v-model' }
  }]
  writeFileSync(cfgFile, JSON.stringify(cfg, null, 2), 'utf8')
  await wait(20)

  await preStep()
  await wait(300)
  assert.ok(registered.has('generate_video'), '改完存盘后 generate_video 应自动出现')

  const callsAfterReload = registerCalls
  await preStep()
  await wait(200)
  assert.equal(registerCalls, callsAfterReload, '文件没变时不应重复注册（戳比对短路）')
})

test('把模块关掉同样即时生效', async () => {
  const cfg = JSON.parse(readFileSync(cfgFile, 'utf8'))
  cfg.visionToolsEnabled = false
  writeFileSync(cfgFile, JSON.stringify(cfg, null, 2), 'utf8')
  await wait(20)
  await preStep('s2')
  await wait(300)
  assert.ok(!registered.has('zoom_image'), '关闭视觉工具箱后应被卸载')
  assert.ok(registered.has('analyze_image'), 'VLM 模块不受影响')
})