// schema-coverage.test.js — v2.14 JSON Schema 漂移哨兵
// schema 是手写的，默认配置是代码生成的：两边一旦脱钩，编辑器补全就会缺字段。
// 这里只做结构与覆盖面检查（不引入 ajv，安装副本无依赖解析）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR = mkdtempSync(join(tmpdir(), 'omni-schema-'))

const { normalizeConfig } = await import('../lib/index.js')

const schemaPath = new URL('../omni-vision.schema.json', import.meta.url)
const schemaText = readFileSync(schemaPath, 'utf8')
const schema = JSON.parse(schemaText)

test('schema 是合法 draft 2020-12 文档', () => {
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema')
  assert.equal(schema.type, 'object')
  assert.equal(schema.additionalProperties, true, '未知字段必须放行（插件还有大量高级字段）')
  assert.ok(typeof schema.$id === 'string' && schema.$id.startsWith('https://'))
})

test('schema 覆盖 normalizeConfig({}) 的全部顶层键', () => {
  const keys = Object.keys(normalizeConfig({}))
  const missing = keys.filter((k) => !(k in schema.properties))
  assert.deepEqual(missing, [], '这些顶层键还没写进 schema：' + missing.join(', '))
  const unknown = Object.keys(schema.properties).filter((k) => k !== '$schema' && !keys.includes(k))
  assert.deepEqual(unknown, [], 'schema 里有配置里不存在的键：' + unknown.join(', '))
})

test('每个属性都有中文说明（编辑器悬浮提示）', () => {
  const noDesc = Object.entries(schema.properties).filter(([, v]) => !v.description)
  assert.deepEqual(noDesc.map(([k]) => k), [], '缺少 description 的键：' + noDesc.map(([k]) => k).join(', '))
})

test('所有 $ref 都指向已定义的 $defs', () => {
  const refs = [...schemaText.matchAll(/"\$ref":\s*"#\/\$defs\/([A-Za-z0-9_]+)"/g)].map((m) => m[1])
  assert.ok(refs.length > 0, '应当使用 $defs 复用（apiCard / videoConfig 等）')
  for (const name of refs) {
    assert.ok(schema.$defs[name], '未定义的 $defs.' + name)
  }
})

test('关键枚举与代码常量保持一致', () => {
  const apiProvider = schema.$defs.apiCard.properties.provider.enum
  for (const p of ['custom', 'ollama', 'openai', 'anthropic', 'google', 'agnes', 'bailian', 'ovhcloud']) {
    assert.ok(apiProvider.includes(p), 'apiCard.provider 缺少 ' + p)
  }
  const sttProvider = schema.$defs.sttConfig.properties.provider.enum
  assert.deepEqual([...sttProvider].sort(), ['custom', 'funasr', 'groq', 'openai', 'siliconflow'])
  const voiceProvider = schema.$defs.voiceConfig.properties.provider.enum
  assert.deepEqual([...voiceProvider].sort(), ['doubao', 'gptsovits', 'indextts', 'mimo', 'minimax', 'tts-webui', 'voxcpm'])
  const videoProtocol = schema.$defs.videoConfig.properties.protocol.enum
  assert.ok(videoProtocol.includes('custom-adapter'))
  const sttMode = schema.$defs.sttConfig.properties.outputMode.enum
  assert.deepEqual(sttMode, ['text', 'timestamps', 'srt', 'vtt'])
})