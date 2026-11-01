// tool-image-card-ui.source-lock.test.js — v2.16: show_image renders as a
// conversation-BODY illustration (Turn tail), never inside the collapsible
// tool fold.
//
// ⚠️ THIS IS A SOURCE-LEVEL REGRESSION LOCK, NOT BEHAVIOURAL COVERAGE.
// Every assertion below is a regular expression against the RAW TEXT of
// `lib/client.js`. `lib/client.js` line 1 is `window.__ModuleLoader__.load({...})`
// — a browser bundle that cannot be imported from Node, so rendering the real
// component is not possible here. The genuinely reachable behaviour is covered
// by the browser E2E (the figure must appear outside `.omni-toolview-card`).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'client.js'), 'utf8')

test('show_image no longer owns a tool.call.toolview card (it would sit in the fold)', () => {
  assert.doesNotMatch(src, /id: "omni-view-show_image"/)
  assert.doesNotMatch(src, /function ToolImageCard/)
})

test('illustration registers on conversation.chat.turnTail', () => {
  assert.match(src, /slots\.inject\("conversation\.chat\.turnTail"/)
  assert.match(src, /name: "conversation\.chat\.turnTail", id: "omni-illustration"/)
})

test('illustration pulls show_image paths from the Turn and skips ones the AI already inlined', () => {
  assert.match(src, /function turnImagePaths\(snapshot, turnNo\)/)
  assert.match(src, /root\.name !== "show_image"/)
  assert.match(src, /function assistantMentions\(snapshot, turnNo, path\)/)
  // Only a real Markdown image counts as "already inlined" — not prose quoting the path.
  assert.match(src, /var re = \/!\\\[\[\^\\\]\]\*\\\]\\\(\(\[\^\)/)
})

test('illustration is a centered light-novel figure with caption and click-to-zoom', () => {
  assert.match(src, /"\.omni-illus \{ display: flex; flex-direction: column; align-items: center;/)
  assert.match(src, /"\.omni-illus-img \{ display: block; max-width: 100%; max-height: min\(70vh, 560px\);/)
  assert.match(src, /"\.omni-illus-cap \{/)
  assert.match(src, /className: "omni-img-btn omni-illus-open"/)
  assert.match(src, /className: "omni-img-modal-el"/)
  assert.match(src, /查看原图/)
})

test('hooks stay unconditional (outer gate + inner body split)', () => {
  assert.match(src, /function OmniIllustration\(props\)/)
  assert.match(src, /function OmniIllustrationBody\(props\)/)
  assert.match(src, /if \(typeof props\.useChat !== "function" \|\| turnNo === null\) return null;/)
  assert.match(src, /var key = props\.useChat\(function \(snapshot\)/)
})