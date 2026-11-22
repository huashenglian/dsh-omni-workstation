// analyze-image-max.test.js — v2.18 图片张数上限的配置链路 + 提示词动态取值
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

process.env.DSH_HOME = mkdtempSync(join(tmpdir(), 'omni-aimax-'))
process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR = process.env.DSH_HOME

const {
  normalizeConfig, applyPatch, masked, buildPromptText, DEFAULT_PROMPTS, applyPromptVars
} = await import('../lib/index.js')

const CARD = {
  id: 'c1', name: 'T', provider: 'custom', protocol: 'openai-completions',
  endpoint: 'https://example.invalid/v1', apiKey: 'sk-x', model: 'vlm', enabled: true
}

test('默认 6；显式值被 clamp 到 1..20', () => {
  assert.equal(normalizeConfig({}).globalConfig.analyzeImageMaxCount, 6)
  assert.equal(normalizeConfig({ globalConfig: { analyzeImageMaxCount: 1 } }).globalConfig.analyzeImageMaxCount, 1)
  assert.equal(normalizeConfig({ globalConfig: { analyzeImageMaxCount: 0 } }).globalConfig.analyzeImageMaxCount, 1, '0 不能出现（会退化成「一张都不许」）')
  assert.equal(normalizeConfig({ globalConfig: { analyzeImageMaxCount: 25 } }).globalConfig.analyzeImageMaxCount, 20)
  assert.equal(normalizeConfig({ globalConfig: { analyzeImageMaxCount: 'junk' } }).globalConfig.analyzeImageMaxCount, 6)
})

test('applyPatch / masked 走同一条 clamp', () => {
  let cfg = normalizeConfig({})
  cfg = applyPatch(cfg, { globalConfig: { field: 'analyzeImageMaxCount', value: 4 } })
  assert.equal(cfg.globalConfig.analyzeImageMaxCount, 4)
  cfg = applyPatch(cfg, { globalConfig: { field: 'analyzeImageMaxCount', value: 0 } })
  assert.equal(cfg.globalConfig.analyzeImageMaxCount, 1)
  cfg = applyPatch(cfg, { globalConfig: { field: 'analyzeImageMaxCount', value: 99 } })
  assert.equal(cfg.globalConfig.analyzeImageMaxCount, 20)
  assert.equal(masked(cfg).globalConfig.analyzeImageMaxCount, 20)
  const reset = applyPatch(cfg, { globalConfig: 'reset' })
  assert.equal(reset.globalConfig.analyzeImageMaxCount, 6)
})

test('applyPromptVars：{{max}} 取当前值，没有占位符时原样返回', () => {
  assert.equal(applyPromptVars('最多 {{max}} 张', { analyzeImageMaxCount: 3 }), '最多 3 张')
  assert.equal(applyPromptVars('最多 {{ max }} 张', { analyzeImageMaxCount: 1 }), '最多 1 张')
  assert.equal(applyPromptVars('无占位符', { analyzeImageMaxCount: 1 }), '无占位符')
  assert.equal(applyPromptVars('最多 {{max}} 张', {}), '最多 6 张', '缺字段回落默认 6')
  assert.equal(applyPromptVars('', {}), '')
})

test('提示词里真的带上了上限数字，且改配置后跟着变', () => {
  const cfg = normalizeConfig({ apis: [CARD] })
  const text = buildPromptText(cfg)
  assert.ok(text.includes(DEFAULT_PROMPTS.vlm.slice(0, 10)), 'vlm 段应在')
  assert.ok(text.includes('单次最多 6 张'), '默认 6: ' + text.slice(0, 160))
  assert.ok(!text.includes('{{max}}'), '占位符必须被替换')

  const small = normalizeConfig({ apis: [CARD], globalConfig: { analyzeImageMaxCount: 2 } })
  assert.ok(buildPromptText(small).includes('单次最多 2 张'))
})

test('用户自定义提示词里的 {{max}} 同样生效', () => {
  const cfg = normalizeConfig({
    apis: [CARD],
    globalConfig: { analyzeImageMaxCount: 3, prompts: { vlm: '一次最多 {{max}} 张，多了就分批。' } }
  })
  assert.ok(buildPromptText(cfg).includes('一次最多 3 张'))
})
