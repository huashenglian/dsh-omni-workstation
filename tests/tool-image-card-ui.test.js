// tool-image-card-ui.test.js — T11: ToolImageCard collects ALL image blocks,
// lays them out in a wrapping row and sizes them from
// globalConfig.showImageMaxHeight. Source-level regression lock (no DOM in the
// node test env; the real browser assertion lives in T16).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'client.js'), 'utf8')

test('ToolImageCard no longer stops at the first image block', () => {
  assert.doesNotMatch(src, /imgBlock = b; break/)
  assert.doesNotMatch(src, /imgBlock = bj; break/)
  assert.match(src, /collectFrom\(outer\.content\)/)
  assert.match(src, /collectFrom\(toolviewCollectBlocks\(props\)\)/)
})

test('sanitized-marker fallback still recovers attachment ids (all of them)', () => {
  assert.match(src, /附件 id「\(\[\^」\]\+\)」/)
  assert.match(src, /while \(\(m = re\.exec\(text\)\) !== null\)/)
})

test('image strip is a wrapping row and each img uses the configured max height', () => {
  assert.match(src, /\.omni-toolview-imgs \{ display: flex; flex-direction: row; flex-wrap: wrap; gap: 8px;/)
  assert.match(src, /maxHeight: maxHeight/)
  assert.doesNotMatch(src, /style: \{ maxWidth: "100%", maxHeight: 360/)
  assert.match(src, /showImageMaxHeight/)
})

test('per-image error marker cannot hide other images (child component + stable key)', () => {
  assert.match(src, /function ToolImageView\(props\)/)
  assert.match(src, /key: it\.attachmentId/)
  assert.match(src, /maxHeight: maxHState\[0\]/)
})
