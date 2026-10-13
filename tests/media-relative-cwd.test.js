// media-relative-cwd.test.js — resolveMedia 相对路径必须落在会话工作区（计划 T3）
//
// 改造前：`sessionCwd(exec)` 为空且路径相对时，resolveMedia 静默按 process.cwd()
// 解析 —— 工件会从「程序启动目录」而不是「用户打开的工作区」被读出/读入。
// 改造后：显式抛中文错误。绝对路径与有 cwd 的相对路径行为不变。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dshHome = mkdtempSync(join(tmpdir(), 'omni-relcwd-'))
process.env.DSH_HOME = dshHome
process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR = dshHome
const { resolveMedia } = await import('../lib/index.js')

function mp4Header(size = 64) {
  const b = Buffer.alloc(size)
  b.writeUInt32BE(size, 0)
  b.write('ftyp', 4, 'ascii')
  b.write('isom', 8, 'ascii')
  return b
}

// 进程目录（node --test 每个测试文件一个独立进程，改它不影响其它文件）。
const procCwd = mkdtempSync(join(tmpdir(), 'omni-proccwd-'))
writeFileSync(join(procCwd, 'rel.mp4'), mp4Header())
const sessionRoot = mkdtempSync(join(tmpdir(), 'omni-sessionroot-'))
writeFileSync(join(sessionRoot, 'rel.mp4'), mp4Header())
const absolute = join(sessionRoot, 'rel.mp4')
process.chdir(procCwd)

const noCwd = {}                                       // 无任何 cwd 线索
const withCwd = { agent: { session: { header: { cwd: sessionRoot } } } }

// ---------- 现状刻画（改造前应通过） ----------

test('相对路径不再落到 process.cwd()：程序目录里的同名文件不会被读到', async () => {
  // 改造前：这里会成功读到 procCwd/rel.mp4（该文件此刻确实存在）。
  // 改造后：显式抛错，程序目录不再是媒体来源。
  assert.ok(existsSync(join(procCwd, 'rel.mp4')), '前提：程序目录里存在同名文件')
  await assert.rejects(
    () => resolveMedia(noCwd, { media_path: 'rel.mp4' }),
    /无法确定会话工作目录/
  )
})

test('刻画：绝对路径 → 无 cwd 也能读（改造后必须保持）', async () => {
  const r = await resolveMedia(noCwd, { media_path: absolute })
  assert.equal(r.mime, 'video/mp4')
})

test('刻画：有 cwd + 相对路径 → 落在会话工作区，不是 process.cwd()', async () => {
  const r = await resolveMedia(withCwd, { media_path: 'rel.mp4' })
  assert.equal(r.mime, 'video/mp4')
  // 两处同名同尺寸文件，靠 process.cwd() 的那份被删掉后仍能读到 → 证明走的是 cwd
  const { unlinkSync } = await import('node:fs')
  unlinkSync(join(procCwd, 'rel.mp4'))
  const again = await resolveMedia(withCwd, { media_path: 'rel.mp4' })
  assert.equal(again.mime, 'video/mp4')
})

// ---------- 新行为 ----------

test('无 cwd + 相对路径 → 显式抛错，文案含「无法确定会话工作目录」', async () => {
  await assert.rejects(
    () => resolveMedia(noCwd, { media_path: 'definitely-missing.mp4' }),
    (err) => {
      assert.match(String(err && err.message || err), /无法确定会话工作目录/)
      assert.match(String(err && err.message || err), /definitely-missing\.mp4/, '错误里应带上原路径')
      assert.match(String(err && err.message || err), /^analyze_media:/, '与 show_video 同前缀')
      return true
    }
  )
})