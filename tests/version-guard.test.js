// version-guard.test.js — v2.17 版本回退告警
// 背景：~/.dsh/profiles/<p>/package.json 把插件钉在注册表精确版本（0.1.2），
// 任何一次 pnpm install 都会把本地更新的构建覆盖回旧版且没有任何提示。
// 这里验证：meta.lastKnownVersion 的读写语义 + 更旧版本会被识别为 downgraded。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const home = mkdtempSync(join(tmpdir(), 'omni-verguard-'))
process.env.DSH_HOME = home
process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR = home

const { loadConfig, normalizeConfig, compareSemverLoose, getVersionGuard } = await import('../lib/index.js')

const file = join(home, 'omni-vision.json')
const fakeCtx = { get: () => undefined }

test('compareSemverLoose：忽略 prerelease 后缀，只比 major.minor.patch', () => {
  assert.equal(compareSemverLoose('0.2.1-beta.1', '0.2.1-beta.1'), 0)
  assert.equal(compareSemverLoose('0.2.1-beta.1', '0.1.2'), 1)
  assert.equal(compareSemverLoose('0.1.2', '0.2.0-beta.1'), -1)
  assert.equal(compareSemverLoose('0.2.0-beta.1', '0.2.0'), 0, '同一版本不同后缀视为同版')
  assert.equal(compareSemverLoose('1.0.0', '0.9.9'), 1)
  assert.equal(compareSemverLoose('', '0.0.1'), -1)
})

test('normalizeConfig 保留 meta.lastKnownVersion，缺失为空串', () => {
  assert.equal(normalizeConfig({}).meta.lastKnownVersion, '')
  assert.equal(normalizeConfig({ meta: { lastKnownVersion: '0.2.0-beta.1' } }).meta.lastKnownVersion, '0.2.0-beta.1')
  assert.equal(normalizeConfig({ meta: { lastKnownVersion: 42 } }).meta.lastKnownVersion, '')
})

test('首次加载把当前版本记入 meta，并落盘', async () => {
  writeFileSync(file, JSON.stringify({ apis: [] }), 'utf8')
  await loadConfig(fakeCtx)
  const guard = getVersionGuard()
  assert.equal(guard.downgraded, false)
  assert.equal(guard.current, guard.lastKnown)
  const onDisk = JSON.parse(readFileSync(file, 'utf8'))
  assert.equal(onDisk.meta.lastKnownVersion, guard.current, '当前版本应写回配置')
})

test('记录版本更高 → downgraded=true（且不改写用户文件）', async () => {
  writeFileSync(file, JSON.stringify({ apis: [], meta: { lastKnownVersion: '9.9.9' } }), 'utf8')
  const before = readFileSync(file, 'utf8')
  await loadConfig(fakeCtx)
  const guard = getVersionGuard()
  assert.equal(guard.downgraded, true)
  assert.equal(guard.lastKnown, '9.9.9')
  assert.equal(readFileSync(file, 'utf8'), before, '检测到回退时不得改写配置')
})
