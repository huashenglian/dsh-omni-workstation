// tool-video-card-ui.test.js — T13: ToolVideoCard renders an inline player with
// a hover-only control layer and an IN-PAGE fullscreen modal. Source-level
// regression lock (no react/react-dom in the node test env; the real browser
// assertion lives in T16).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'client.js'), 'utf8')

test('ToolVideoCard registered at tool.call.toolview order 44', () => {
  assert.match(src, /id: "omni-view-show_video", key: "show_video", order: 44/)
  assert.match(src, /React\.createElement\(ToolVideoCard,/)
  assert.match(src, /function ToolVideoCard\(props\)/)
})

test('path parsed from the text-only show_video result', () => {
  assert.ok(src.includes('##\\s*视频展示'), 'heading regex anchored on T12 render format')
  assert.match(src, /function toolviewVideoPath\(props\)/)
  assert.match(src, /toolviewCollectTexts\(props\)/)
  assert.ok(src.includes('mp4|m4v|webm|mov|mkv'), 'video-extension fallback')
})

test('bytes come from /omni/media and the object URL is revoked', () => {
  assert.match(src, /call\("media", \{ path: path \}\)/)
  assert.match(src, /URL\.revokeObjectURL\(objectUrl\)/)
  assert.match(src, /new Blob\(\[bytes\]/)
})

test('sized by globalConfig.showVideoMaxHeight (default 360)', () => {
  assert.match(src, /showVideoMaxHeight/)
  assert.match(src, /React\.useState\(360\)/)
  assert.doesNotMatch(src, /maxHeight: 360/)
})

test('hover-only control layer: center play + bottom bar with seek + pause + fullscreen', () => {
  assert.match(src, /\.omni-video-ctrl \{ position: absolute; inset: 0; opacity: 0;/)
  assert.match(src, /\.omni-video-frame:hover \.omni-video-ctrl \{ opacity: 1;/)
  assert.match(src, /className: "omni-video-center"/)
  assert.match(src, /className: "omni-video-bar"/)
  assert.match(src, /onSeekClick/)
  assert.match(src, /className: "omni-video-btn"/)
})

test('fullscreen is an in-page modal — the Fullscreen API is never used', () => {
  assert.match(src, /omni-confirm-overlay omni-video-overlay/)
  assert.match(src, /className: "omni-video-modal"/)
  assert.doesNotMatch(src, /requestFullscreen/)
  assert.doesNotMatch(src, /webkitEnterFullscreen/)
  assert.doesNotMatch(src, /document\.exitFullscreen/)
})

test('closing the modal returns to the inline player, carrying time + play state', () => {
  assert.match(src, /onClick: exitFs/, 'overlay backdrop click closes')
  assert.match(src, /className: "omni-video-close"/)
  assert.match(src, /carryRef/)
  assert.match(src, /fsState\[0\] \? null : buildFrame\(false\)/, 'only one <video> node at a time')
})
