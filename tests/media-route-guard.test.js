// media-route-guard.test.js — /omni/media 边界校验（计划 T2）
//
// v2.12 的 isInside 只做 resolve()+relative() 字符串比较，工作区里一个指向外部
// 目录的软链/junction 会被判成「在工作区内」而放行。本文件覆盖：正常子路径、
// `..` 穿越、不存在的路径（回退严格比较）、以及软链越界。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, realpathSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const dshHome = mkdtempSync(join(tmpdir(), 'omni-guard-'))
process.env.DSH_HOME = dshHome
process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR = dshHome
const { isInside } = await import('../lib/index.js')

const outside = mkdtempSync(join(tmpdir(), 'omni-outside-'))
writeFileSync(join(outside, 'secret.mp4'), 'x')
const root = mkdtempSync(join(tmpdir(), 'omni-root-'))
writeFileSync(join(root, 'clip.mp4'), 'x')

// 在工作区内造一个指向外部目录的链接。Windows 优先 junction（无需管理员权限，
// 且目录链接正是 Windows 上最常见的越权形态）；否则退回符号链接。
function makeEscapeLink(name = 'escape') {
  const link = join(root, name)
  if (process.platform === 'win32') {
    try {
      execFileSync('cmd.exe', ['/c', 'mklink', '/J', link, outside], { stdio: 'ignore' })
      return { link, kind: 'junction' }
    } catch (e) {
      // junction 不可用 → 退回 symlinkSync
    }
  }
  try {
    symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir')
    return { link, kind: 'symlink' }
  } catch (e) {
    return { link, kind: 'unavailable', error: String(e && e.message || e) }
  }
}
const escape = makeEscapeLink()

// ---------- 现状刻画：既有的字符串比较行为 ----------

test('刻画：正常子路径 → true', () => {
  assert.equal(isInside(root, resolve(root, 'clip.mp4')), true)
})

test('刻画：`..` 穿越 → false', () => {
  assert.equal(isInside(root, resolve(root, '..', 'secret.mp4')), false)
})

test('刻画：不存在的路径 → 不抛（严格比较后返回布尔）', () => {
  const missing = resolve(root, 'nope', 'gone.mp4')
  assert.equal(isInside(root, missing), true, '工作区内的不存在路径仍在根内')
  assert.equal(isInside(root, resolve(root, '..', 'nowhere')), false)
})

// ---------- 新行为：解析软链 / junction ----------

test('工作区内的链接指向工作区外 → false（软链/junction 被解析）', (t) => {
  if (escape.kind === 'unavailable') {
    t.skip('环境无法创建目录链接：' + escape.error)
    return
  }
  const viaLink = join(escape.link, 'secret.mp4')
  // 先确认真实路径确实越界（否则这条断言测不到任何东西）
  assert.ok(!isInside(realpathSync(root), realpathSync(viaLink)), '前提：realpath 后确实在根外')
  assert.equal(isInside(root, viaLink), false, escape.kind + ' 未被解析，必须拒绝')
})

test('根目录自身 → true（等值边界不变）', () => {
  assert.equal(isInside(root, root), true)
})