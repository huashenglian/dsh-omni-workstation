// path-util.test.js — lib/path-util.js 的共享绝对路径判定（计划 T3）
//
// v2.12 在三处新增了同一段「是不是绝对路径」的内联正则（index.js resolveMedia、
// vision-tools.js show_image/show_video 的路径分支）。收敛成一个函数，避免第四处
// 再次抄错。判定四类绝对形式：盘符+反斜杠、盘符+正斜杠、POSIX 根、UNC。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isAbsoluteLocalPath } from '../lib/path-util.js'

test('盘符 + 反斜杠 → true', () => {
  assert.equal(isAbsoluteLocalPath('C:\\Users\\me\\clip.mp4'), true)
  assert.equal(isAbsoluteLocalPath('z:\\x'), true)
})

test('盘符 + 正斜杠 → true', () => {
  assert.equal(isAbsoluteLocalPath('C:/Users/me/clip.mp4'), true)
  assert.equal(isAbsoluteLocalPath('D:/'), true)
})

test('POSIX 根 → true', () => {
  assert.equal(isAbsoluteLocalPath('/home/me/clip.mp4'), true)
  assert.equal(isAbsoluteLocalPath('/'), true)
})

test('UNC（\\\\server\\share）→ true', () => {
  assert.equal(isAbsoluteLocalPath('\\\\server\\share\\clip.mp4'), true)
  assert.equal(isAbsoluteLocalPath('\\\\?\\C:\\x'), true)
})

test('相对路径 → false', () => {
  assert.equal(isAbsoluteLocalPath('clip.mp4'), false)
  assert.equal(isAbsoluteLocalPath('sub/dir/clip.mp4'), false)
  assert.equal(isAbsoluteLocalPath('..\\outside.mp4'), false)
  assert.equal(isAbsoluteLocalPath('~/clip.mp4'), false)
})

test('空串 / 非字符串 → false（不抛）', () => {
  assert.equal(isAbsoluteLocalPath(''), false)
  assert.equal(isAbsoluteLocalPath('   '), false)
  assert.equal(isAbsoluteLocalPath(null), false)
  assert.equal(isAbsoluteLocalPath(undefined), false)
  assert.equal(isAbsoluteLocalPath(42), false)
  assert.equal(isAbsoluteLocalPath({}), false)
})