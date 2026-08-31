// comfy-history.test.js — v2.9.14 helpers for the /omni/comfy/history route
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { comfyHistoryPromptApi, comfyMapTarget, comfyHistoryHint } = await import('../lib/index.js')

// standard /history entry shape: prompt = [queueNo, promptId, apiPrompt, extraData, outputsToExecute]
const apiGraph = {
  '4': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: 'sd_xl_base_1.0.safetensors' } },
  '6': { class_type: 'CLIPTextEncode', inputs: { text: 'a cat, sunny', clip: ['4', 1] } },
  '7': { class_type: 'CLIPTextEncode', inputs: { text: 'watermark', clip: ['4', 1] } }
}

test('comfyHistoryPromptApi: standard 5-element prompt array extracts api graph + queue', () => {
  const entry = { prompt: [42, 'pid-1', apiGraph, {}, ['9']], outputs: {}, status: { status_str: 'success' } }
  const got = comfyHistoryPromptApi(entry)
  assert.ok(got)
  assert.strictEqual(got.queue, 42)
  assert.strictEqual(got.api, apiGraph)
})

test('comfyHistoryPromptApi: prompts with the graph at another index still work (defensive scan)', () => {
  const entry = { prompt: [7, 'pid-2', 'extra-id-string', apiGraph], status: {} }
  const got = comfyHistoryPromptApi(entry)
  assert.ok(got)
  assert.strictEqual(got.queue, 7)
  assert.strictEqual(got.api, apiGraph)
})

test('comfyHistoryPromptApi: non-array prompt / missing / malformed returns null', () => {
  assert.strictEqual(comfyHistoryPromptApi(null), null)
  assert.strictEqual(comfyHistoryPromptApi({}), null)
  assert.strictEqual(comfyHistoryPromptApi({ prompt: 'not-an-array' }), null)
  assert.strictEqual(comfyHistoryPromptApi({ prompt: ['x', 'y'] }), null)
})

test('comfyMapTarget: string, object, empty and null inputs', () => {
  assert.deepStrictEqual(comfyMapTarget('6'), { node: '6', field: '' })
  assert.deepStrictEqual(comfyMapTarget(' 7 '), { node: '7', field: '' })
  assert.deepStrictEqual(comfyMapTarget({ node: '6', field: 'prompt' }), { node: '6', field: 'prompt' })
  assert.deepStrictEqual(comfyMapTarget({ node: '6' }), { node: '6', field: '' })
  assert.deepStrictEqual(comfyMapTarget({ node: ' 9 ', field: ' text ' }), { node: '9', field: 'text' })
  assert.strictEqual(comfyMapTarget(null), null)
  assert.strictEqual(comfyMapTarget(undefined), null)
  assert.strictEqual(comfyMapTarget(''), null)
  assert.strictEqual(comfyMapTarget('   '), null)
  assert.strictEqual(comfyMapTarget({ node: '', field: 'x' }), null)
  assert.strictEqual(comfyMapTarget(42), null)
})

test('comfyHistoryHint: positive text wins and is truncated at 40 chars', () => {
  const mapping = { positive: '6' }
  assert.strictEqual(comfyHistoryHint(apiGraph, mapping), 'a cat, sunny')
  const long = { '6': { class_type: 'CLIPTextEncode', inputs: { text: 'x'.repeat(80) } } }
  const h = comfyHistoryHint(long, { positive: '6' })
  assert.strictEqual(h.length, 41)
  assert.ok(h.endsWith('…'))
})

test('comfyHistoryHint: falls back to loader model name when no positive text', () => {
  const noText = {
    '4': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: 'sd_xl_base_1.0.safetensors' } },
    '9': { class_type: 'CLIPTextEncode', inputs: {} }
  }
  assert.strictEqual(comfyHistoryHint(noText, { checkpoint: '4' }), 'sd_xl_base_1.0.safetensors')
  assert.strictEqual(comfyHistoryHint(noText, {}), '')
  assert.strictEqual(comfyHistoryHint(null, {}), '')
})