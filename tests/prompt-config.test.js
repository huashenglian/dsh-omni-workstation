// prompt-config.test.js — v2.17 插件提示词层
//  · DEFAULT_PROMPTS：5 条默认文案存在、不含插件内部术语
//  · promptTextFor / hasPromptOverride / normalizePrompts
//  · buildPromptText：只拼接「模块 live」的段落，全部关掉 → ''
//  · applyPatch：写入覆盖 / 空串清除（= 恢复默认）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

process.env.DSH_HOME = mkdtempSync(join(tmpdir(), 'omni-prompt-'))
process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR = process.env.DSH_HOME

const {
  normalizeConfig, applyPatch, buildPromptText, promptTextFor, hasPromptOverride,
  normalizePrompts, DEFAULT_PROMPTS, PROMPT_KEYS
} = await import('../lib/index.js')

const CARD = {
  id: 'c1', name: 'T', provider: 'custom', protocol: 'openai-completions',
  endpoint: 'https://example.invalid/v1', apiKey: 'sk-x', model: 'vlm', enabled: true
}

test('DEFAULT_PROMPTS：5 个模块都有文案，且不含插件机制术语', () => {
  assert.deepEqual(PROMPT_KEYS, ['vlm', 'toolkit', 'imggen', 'video', 'voice'])
  for (const key of PROMPT_KEYS) {
    const text = DEFAULT_PROMPTS[key]
    assert.ok(typeof text === 'string' && text.length > 20, key + ' 应有默认文案')
    assert.ok(!/动态多模态适应|镜像模型|兜底模型|native_vision_failed/.test(text), key + ' 不应暴露插件机制')
  }
  const chars = PROMPT_KEYS.reduce((n, k) => n + DEFAULT_PROMPTS[k].length, 0)
  assert.ok(chars < 700, '默认文案总量应保持精简（当前 ' + chars + ' 字）')
})

test('promptTextFor / hasPromptOverride / normalizePrompts', () => {
  const gc = { prompts: { vlm: '  自定义视觉  ', toolkit: '   ', video: 42 } }
  assert.equal(promptTextFor(gc, 'vlm'), '自定义视觉')
  assert.equal(promptTextFor(gc, 'toolkit'), DEFAULT_PROMPTS.toolkit, '空白覆盖 = 用默认')
  assert.equal(promptTextFor(gc, 'video'), DEFAULT_PROMPTS.video, '非字符串 = 用默认')
  assert.equal(hasPromptOverride(gc, 'vlm'), true)
  assert.equal(hasPromptOverride(gc, 'toolkit'), false)

  assert.deepEqual(normalizePrompts({ vlm: ' a ', bogus: 'x', toolkit: '' }), { vlm: 'a' })
  assert.deepEqual(normalizePrompts(null), {})
})

test('buildPromptText：只拼接启用的模块；全部关掉 → 空串', () => {
  // 只有 VLM 卡片 → VLM + 工具箱（本地工具永远可用）贡献，生图/视频/语音未配置则不出现
  const onlyVlm = normalizeConfig({ apis: [CARD] })
  const text = buildPromptText(onlyVlm)
  assert.ok(text.includes('analyze_image'), 'VLM 段应在')
  assert.ok(text.includes('zoom_image'), '工具箱段应在')
  assert.ok(!text.includes(DEFAULT_PROMPTS.imggen), '未配置生图 → 不贡献提示词')
  assert.ok(!text.includes(DEFAULT_PROMPTS.video), '未配置视频 → 不贡献提示词')
  assert.ok(!text.includes(DEFAULT_PROMPTS.voice), '未配置语音 → 不贡献提示词')

  const vlmOff = normalizeConfig({ apis: [CARD], vlmEnabled: false })
  const noVlm = buildPromptText(vlmOff)
  assert.ok(!noVlm.includes(DEFAULT_PROMPTS.vlm), 'VLM 关闭后不贡献提示词')
  assert.ok(noVlm.includes(DEFAULT_PROMPTS.toolkit), '工具箱仍可用')

  const nothing = normalizeConfig({
    apis: [], fallbackConfig: { models: [], enabled: false },
    visionToolsEnabled: false, imggenEnabled: false, videoEnabled: false,
    voiceEnabled: false, ttsEnabled: false, sttEnabled: false
  })
  assert.equal(buildPromptText(nothing), '')
})

test('buildPromptText：用户覆盖优先于默认', () => {
  const cfg = normalizeConfig({ apis: [CARD], globalConfig: { prompts: { vlm: '只看像素级差异' } } })
  const text = buildPromptText(cfg)
  assert.ok(text.includes('只看像素级差异'))
  assert.ok(!text.includes(DEFAULT_PROMPTS.vlm))
})

test('applyPatch：写入覆盖 / 空串清除 / 未知 key 忽略', () => {
  let cfg = normalizeConfig({ apis: [CARD] })
  cfg = applyPatch(cfg, { globalConfig: { field: 'prompt', value: { key: 'vlm', text: '  我的策略  ' } } })
  assert.equal(cfg.globalConfig.prompts.vlm, '我的策略')

  cfg = applyPatch(cfg, { globalConfig: { field: 'prompt', value: { key: 'vlm', text: '   ' } } })
  assert.equal('vlm' in cfg.globalConfig.prompts, false, '空串 = 恢复默认（去掉覆盖）')

  cfg = applyPatch(cfg, { globalConfig: { field: 'prompt', value: { key: 'nope', text: 'x' } } })
  assert.deepEqual(cfg.globalConfig.prompts, {})

  const reset = applyPatch(cfg, { globalConfig: 'reset' })
  assert.deepEqual(reset.globalConfig.prompts, {})
})
