// vision-capability-prompt.test.js — v2.19 每回合视觉能力声明
// 验证 system-prompt/assemble 监听：
//  · 模型声明 image → 注入「支持图片输入」段（插在 omni:workstation 之后）
//  · 纯文本模型 → 注入「不能直接看图」，绝不出现「支持图片输入」
//  · 动态多模态适应关闭 / 无法解析 → 不注入
//  · VLM 未配置 → 不注入
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const home = mkdtempSync(join(tmpdir(), 'omni-vision-cap-'))
process.env.DSH_HOME = home
process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR = home

const { apply } = await import('../lib/index.js')

const CARD = {
  id: 'c1', name: 'T', provider: 'custom', protocol: 'openai-completions',
  endpoint: 'https://example.invalid/v1', apiKey: 'sk-x', model: 'vlm', enabled: true
}

function writeCfg(extra) {
  writeFileSync(join(home, 'omni-vision.json'), JSON.stringify(Object.assign({
    apis: [CARD],
    globalConfig: { dynamicMultimodalAdapt: true, nativeVisionGate: false }
  }, extra || {})))
}

function makeCtx(modalities) {
  const assemble = []
  const resolveCalls = []
  const ctx = {
    get: () => undefined,
    tools: { register: () => () => {} },
    llm: {
      listProviders: () => [],
      registerAdapter: () => () => {},
      registration: () => null,
      stream: async function* () {},
      on: () => {},
      effect: () => {},
      async resolveModelInfo(provider, model) {
        resolveCalls.push([provider, model])
        if (modalities === undefined) throw new Error('unknown model')
        return { id: model, provider, inputModalities: modalities }
      }
    },
    logger: { warn: () => {} },
    on: () => () => {},
    effect: (fn) => fn(),
    inject: (deps, cb) => {
      // The plugin injects the prompt registry twice (omni section + capability
      // waterfall); both callbacks receive a context whose `on` collects the
      // assemble listeners.
      cb({
        get: ctx.get,
        llm: ctx.llm,
        logger: ctx.logger,
        systemPrompt: { section: () => () => {} },
        effect: (fn) => fn(),
        on: (event, fn) => {
          if (event === 'system-prompt/assemble') assemble.push(fn)
          return () => {}
        }
      })
    }
  }
  return { ctx, assemble, resolveCalls }
}

async function runAssemble(fns, modelSelection) {
  const base = { sections: [{ name: 'omni:workstation', text: '模块提示词' }], contexts: [], variables: {}, tools: [] }
  for (const fn of fns) {
    base.sections = (await fn(base, { modelSelection }, async () => base)).sections
  }
  return base
}

test('视觉模型：注入能力段，插在 omni:workstation 之后', async () => {
  writeCfg()
  const { ctx, assemble, resolveCalls } = makeCtx(['text', 'image'])
  apply(ctx)
  assert.equal(assemble.length, 1, 'assemble 监听应注册一次')
  const out = await runAssemble(assemble, { provider: 'custom', model: 'vlm' })
  assert.deepEqual(resolveCalls, [['custom', 'vlm']], '必须按当前 modelSelection 解析能力')
  const idx = out.sections.findIndex((s) => s.name === 'omni:workstation:vision')
  assert.ok(idx > 0, '能力段应存在')
  assert.equal(out.sections[idx - 1].name, 'omni:workstation', '紧跟在模块提示词之后')
  assert.ok(out.sections[idx].text.includes('支持图片输入'))
  assert.ok(out.sections[idx].text.includes('不要因此放弃自己看图'))
})

test('纯文本模型：只说不能看图，绝不声称有视觉', async () => {
  writeCfg()
  const { ctx, assemble } = makeCtx(['text'])
  apply(ctx)
  const out = await runAssemble(assemble, { provider: 'custom', model: 'text-only' })
  const sec = out.sections.find((s) => s.name === 'omni:workstation:vision')
  assert.ok(sec, '能力段应存在')
  assert.ok(sec.text.includes('不能直接看图'))
  assert.ok(!sec.text.includes('支持图片输入'))
  assert.ok(!sec.text.includes('你都能直接看到'))
})

test('动态多模态适应关闭 / 能力未知 / VLM 未配置 → 不注入', async () => {
  writeCfg({ globalConfig: { dynamicMultimodalAdapt: false } })
  const a = makeCtx(['text', 'image'])
  apply(a.ctx)
  let out = await runAssemble(a.assemble, { provider: 'custom', model: 'vlm' })
  assert.ok(!out.sections.some((s) => s.name === 'omni:workstation:vision'), 'adapt 关闭不声明')

  writeCfg()
  const b = makeCtx(undefined) // resolveModelInfo throws → unknown
  apply(b.ctx)
  out = await runAssemble(b.assemble, { provider: 'custom', model: 'vlm' })
  assert.ok(!out.sections.some((s) => s.name === 'omni:workstation:vision'), '未知不声明')

  writeCfg({ apis: [], vlmEnabled: false })
  const c = makeCtx(['text', 'image'])
  apply(c.ctx)
  out = await runAssemble(c.assemble, { provider: 'custom', model: 'vlm' })
  assert.ok(!out.sections.some((s) => s.name === 'omni:workstation:vision'), 'VLM 未配置不声明')
})
