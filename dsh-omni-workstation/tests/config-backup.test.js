// config-backup.test.js — C1: config backup to DSH_HOME + loadConfig fallback
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, unlinkSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const cfgDir = mkdtempSync(join(tmpdir(), 'omni-workstation-cfg-'))
const bakDir = mkdtempSync(join(tmpdir(), 'omni-workstation-bak-'))
process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR = cfgDir
process.env.DSH_HOME = bakDir

const { storeConfig, loadConfig, backupFile, defaultConfig, normalizeConfig } = await import('../lib/index.js')

// Minimal ctx that doesn't throw in legacyConfigDir
const fakeCtx = { get: () => undefined }

function testConfig(overrides) {
  return Object.assign({ retryCount: 3, apis: [{ id: 'c_test', name: 'Test', provider: 'custom', protocol: 'openai-completions', endpoint: 'http://test', apiKey: 'sk-test', model: 'test-model', collapsed: false, timeoutMs: 60000 }] }, overrides)
}

test('storeConfig writes both main and backup files', async () => {
  const cfg = testConfig()
  await storeConfig(fakeCtx, cfg)

  const mainFile = join(cfgDir, 'omni-vision.json')
  const bakFile = backupFile()

  assert.ok(existsSync(mainFile), 'main config file should exist')
  assert.ok(existsSync(bakFile), 'backup file should exist')

  const mainContent = JSON.parse(readFileSync(mainFile, 'utf8'))
  const bakContent = JSON.parse(readFileSync(bakFile, 'utf8'))
  assert.equal(mainContent.apis[0].model, bakContent.apis[0].model, 'main and backup apis[0].model should match')
  assert.equal(mainContent.apis[0].apiKey, bakContent.apis[0].apiKey, 'main and backup apis[0].apiKey should match')
  assert.equal(mainContent.retryCount, bakContent.retryCount, 'main and backup retryCount should match')
  assert.equal(mainContent.apis[0].model, 'test-model')
})

test('loadConfig falls back to .bak when main file is missing', async () => {
  // store a known config first
  const cfg = testConfig({ apis: [{ id: 'c_missing', name: 'MissingTest', provider: 'custom', protocol: 'openai-completions', endpoint: 'http://missing', apiKey: 'sk-missing', model: 'recovery-model', collapsed: false, timeoutMs: 60000 }] })
  await storeConfig(fakeCtx, cfg)

  // delete main config file
  const mainFile = join(cfgDir, 'omni-vision.json')
  unlinkSync(mainFile)
  assert.ok(!existsSync(mainFile), 'main file should be deleted')

  // loadConfig should recover from .bak
  const loaded = await loadConfig(fakeCtx)
  assert.equal(loaded.apis[0].model, 'recovery-model', 'should recover from backup')
  assert.ok(existsSync(mainFile), 'main file should be restored from backup')
})

test('loadConfig falls back to .bak when main file is corrupt', async () => {
  // store a known config first
  const cfg = testConfig({ apis: [{ id: 'c_corrupt', name: 'CorruptTest', provider: 'custom', protocol: 'openai-completions', endpoint: 'http://corrupt', apiKey: 'sk-corrupt', model: 'corrupt-recovery', collapsed: false, timeoutMs: 60000 }] })
  await storeConfig(fakeCtx, cfg)

  // corrupt main config file
  const mainFile = join(cfgDir, 'omni-vision.json')
  writeFileSync(mainFile, '{invalid json!!!', 'utf8')

  // loadConfig should recover from .bak
  const loaded = await loadConfig(fakeCtx)
  assert.equal(loaded.apis[0].model, 'corrupt-recovery', 'should recover from backup when main is corrupt')
})