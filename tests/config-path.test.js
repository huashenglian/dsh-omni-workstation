// config-path.test.js — v2.14 配置位置解析（纯函数，无磁盘副作用）
// 四级优先：DSH_OMNI_WORKSTATION_CONFIG_DIR → <dshHome>/omni-vision.json
//           → <pluginDir>/omni-vision.json（旧位置）→ 新建到 <dshHome>
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import {
  CONFIG_FILE_NAME,
  SCHEMA_FILE_NAME,
  backupPathFor,
  configDirOf,
  expandHomePath,
  resolveActiveConfig,
  resolveDshHome
} from '../lib/config-path.js'

const HOME = join(process.cwd(), 'fake-home')
const PLUGIN = join(process.cwd(), 'fake-plugin')
const HOME_FILE = join(HOME, CONFIG_FILE_NAME)
const PLUGIN_FILE = join(PLUGIN, CONFIG_FILE_NAME)

const existsIn = (...files) => (p) => files.includes(p)

test('home 优先：home 与插件目录都有配置时用 home', () => {
  const res = resolveActiveConfig({ pluginDir: PLUGIN, env: { DSH_HOME: HOME }, exists: existsIn(HOME_FILE, PLUGIN_FILE) })
  assert.equal(res.source, 'home')
  assert.equal(res.file, HOME_FILE)
  assert.equal(res.backupFile, HOME_FILE + '.bak')
  assert.equal(res.pluginFile, PLUGIN_FILE)
})

test('旧位置兼容：只有插件目录有配置时沿用它', () => {
  const res = resolveActiveConfig({ pluginDir: PLUGIN, env: { DSH_HOME: HOME }, exists: existsIn(PLUGIN_FILE) })
  assert.equal(res.source, 'plugin')
  assert.equal(res.file, PLUGIN_FILE)
  assert.equal(res.homeFile, HOME_FILE)
})

test('新装：两处都没有时落到 home（不写 node_modules）', () => {
  const res = resolveActiveConfig({ pluginDir: PLUGIN, env: { DSH_HOME: HOME }, exists: existsIn() })
  assert.equal(res.source, 'home-new')
  assert.equal(res.file, HOME_FILE)
})

test('覆盖变量优先于 home 与插件目录', () => {
  const dir = join(process.cwd(), 'fake-override')
  const res = resolveActiveConfig({
    pluginDir: PLUGIN,
    env: { DSH_HOME: HOME, DSH_OMNI_WORKSTATION_CONFIG_DIR: dir },
    exists: existsIn(HOME_FILE, PLUGIN_FILE)
  })
  assert.equal(res.source, 'env')
  assert.equal(res.file, join(dir, CONFIG_FILE_NAME))
})

test('空白的覆盖变量 / 空白的 DSH_HOME 都被忽略', () => {
  const res = resolveActiveConfig({
    pluginDir: PLUGIN,
    env: { DSH_HOME: '   ', DSH_OMNI_WORKSTATION_CONFIG_DIR: '  ' },
    exists: existsIn()
  })
  assert.equal(res.source, 'home-new')
  assert.ok(res.file.endsWith(join('.dsh', CONFIG_FILE_NAME)), '未设置 DSH_HOME 时应回退到 ~/.dsh')
})

test('DSH_HOME 的 ~ 前缀会被展开', () => {
  const home = resolveDshHome({ DSH_HOME: join('~', 'custom-dsh') })
  assert.ok(!home.startsWith('~'), '~ 必须展开：' + home)
  assert.ok(home.endsWith('custom-dsh'))
})

test('backup / dir / schema 常量与配置同目录', () => {
  assert.equal(backupPathFor(HOME_FILE), HOME_FILE + '.bak')
  assert.equal(configDirOf(HOME_FILE), HOME)
  assert.equal(SCHEMA_FILE_NAME, 'omni-vision.schema.json')
  assert.equal(CONFIG_FILE_NAME, 'omni-vision.json')
})

test('expandHomePath 只展开当前用户形式', () => {
  assert.equal(expandHomePath('~alice/x'), '~alice/x')
  assert.equal(expandHomePath('/abs/x'), '/abs/x')
  assert.ok(!expandHomePath(join('~', 'x')).startsWith('~'))
})