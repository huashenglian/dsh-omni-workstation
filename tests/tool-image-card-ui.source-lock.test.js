// tool-image-card-ui.source-lock.test.js — T11: ToolImageCard collects ALL image
// blocks, lays them out in a wrapping row and sizes them from
// globalConfig.showImageMaxHeight.
//
// ⚠️ THIS IS A SOURCE-LEVEL REGRESSION LOCK, NOT BEHAVIOURAL COVERAGE.
// Every assertion below is a regular expression against the RAW TEXT of
// `lib/client.js`. Deleting the whole ToolImageCard feature from client.js can
// still leave these regexes matching the surrounding scaffolding, so they pass
// even when the feature is gone. That is exactly why the file was renamed (was
// `tool-image-card-ui.test.js`): the old name implied UI behaviour it cannot
// observe.
//
// `lib/client.js` line 1 is `window.__ModuleLoader__.load({...})` — a browser
// bundle that cannot be imported from Node, and this repo has no jsdom /
// testing-library, so rendering the real component is not possible here. The
// genuinely reachable behaviour of this feature is covered by
// `./media-display-behaviour.test.js` (`showImageMaxHeight` round-trips through
// `applyPatch` → `masked`; the multi-image result carries `skipped`) and by the
// browser E2E script. Do not count this file as proof that the strip renders.
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
