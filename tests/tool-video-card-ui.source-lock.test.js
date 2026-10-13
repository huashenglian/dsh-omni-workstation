// tool-video-card-ui.source-lock.test.js — T13: ToolVideoCard renders an inline
// player with a hover-only control layer and an IN-PAGE fullscreen modal.
//
// ⚠️ THIS IS A SOURCE-LEVEL REGRESSION LOCK, NOT BEHAVIOURAL COVERAGE.
// Every assertion below is a regular expression against the RAW TEXT of
// `lib/client.js`. Deleting the whole ToolVideoCard feature from client.js can
// still leave these regexes matching the surrounding scaffolding, so they pass
// even when the feature is gone. That is exactly why the file was renamed (was
// `tool-video-card-ui.test.js`): the old name implied UI behaviour it cannot
// observe.
//
// `lib/client.js` line 1 is `window.__ModuleLoader__.load({...})` — a browser
// bundle that cannot be imported from Node, and this repo has no jsdom /
// testing-library, so rendering the real component is not possible here. The
// genuinely reachable behaviour of this feature is covered by
// `./media-display-behaviour.test.js` (the `/omni/media` route that supplies
// the player's bytes) and by the browser E2E script. Do not count this file as
// proof that the player works.
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
  // v0.1.1: the card sends its sessionId so the media route reads the root of
  // THIS session (the host keys roots per session).
  assert.match(src, /call\("media", \{ path: path, sessionId: sessionId \}\)/)
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
