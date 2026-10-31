// config-write.test.js — v2.14 配置写盘语义
//  · storeConfig 建目录 / 原子写 / 自动补 $schema / schema 落到配置同目录
//  · loadConfig 遇到坏 JSON 时**不覆写用户文件**，只内存回退 .bak
//  · 配置缺失时立刻落盘一份默认配置（首开即有默认视频卡）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const cfgDir = join(mkdtempSync(join(tmpdir(), 'omni-cfgwrite-')), 'nested', 'deep')
process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR = cfgDir

const { loadConfig, storeConfig, backupFile, normalizeConfig } = await import('../lib/index.js')

const fakeCtx = { get: () => undefined }
const mainFile = join(cfgDir, 'omni-vision.json')
const schemaFile = join(cfgDir, 'omni-vision.schema.json')

function cfgWith(model) {
  return Object.assign(normalizeConfig({}), {
    apis: [{ id: 'c_t', name: 'T', provider: 'custom', protocol: 'openai-completions', endpoint: 'http://t', apiKey: 'sk-t', model, collapsed: false, enabled: true, video: false, audio: false, timeoutMs: 60000 }]
  })
}

test('storeConfig 建出缺失的目录并写主文件 + .bak + schema', async () => {
  await storeConfig(fakeCtx, cfgWith('m1'))
  assert.ok(existsSync(mainFile), '主配置应存在（父目录被创建）')
  assert.ok(existsSync(backupFile()), '.bak 应在配置同目录')
  assert.ok(existsSync(schemaFile), 'schema 应复制到配置同目录')

  const main = JSON.parse(readFileSync(mainFile, 'utf8'))
  assert.equal(Object.keys(main)[0], '$schema', '$schema 必须是第一个键（编辑器识别）')
  assert.equal(main.$schema, 'omni-vision.schema.json')
  assert.equal(main.apis[0].model, 'm1')

  const bak = JSON.parse(readFileSync(backupFile(), 'utf8'))
  assert.equal(bak.apis[0].model, 'm1', '.bak 内容应与主文件一致')
  assert.equal(bak.$schema, 'omni-vision.schema.json')
})

test('loadConfig 读到坏 JSON 时不覆写用户文件，内存回退 .bak', async () => {
  await storeConfig(fakeCtx, cfgWith('recover-me'))
  const broken = '{ "apis": [ { "model": "hand-edit", } ]  // 手改漏了引号'
  writeFileSync(mainFile, broken, 'utf8')

  const loaded = await loadConfig(fakeCtx)
  assert.equal(loaded.apis[0].model, 'recover-me', '应回退到 .bak 内容')
  assert.equal(readFileSync(mainFile, 'utf8'), broken, '用户文件必须原样保留（手改内容不丢）')
})

test('配置缺失时 loadConfig 立刻落盘一份默认配置', async () => {
  rmSync(mainFile, { force: true })
  rmSync(backupFile(), { force: true })
  const fresh = await loadConfig(fakeCtx)
  assert.ok(existsSync(mainFile), '缺失时应当场建出配置')
  const onDisk = JSON.parse(readFileSync(mainFile, 'utf8'))
  assert.equal(onDisk.$schema, 'omni-vision.schema.json')
  assert.ok(Array.isArray(onDisk.videoCards) && onDisk.videoCards.length > 0, '默认视频卡应已写入')
  assert.equal(onDisk.vlmEnabled, fresh.vlmEnabled)
})