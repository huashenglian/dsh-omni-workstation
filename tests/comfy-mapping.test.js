// comfy-mapping.test.js — v2.8 detectComfyMapping: unet/vae/clip support + relaxed checkpoint requirement
// v2.9.14: never throws — missing[] + generalized fallbacks (custom sampler/text-encode/latent)
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { detectComfyMapping, applyPatch } = await import('../lib/index.js')

// ANIMA-style workflow: no CheckpointLoader, has UNETLoader/VAELoader/CLIPLoader.
// Node ids mirror the real ANIMA API-format dump from the plan.
const animaApi = {
  '63': { class_type: 'KSampler', inputs: { positive: ['11', 0], negative: ['12', 0] } },
  '11': { class_type: 'CLIPTextEncode', inputs: {} },
  '12': { class_type: 'CLIPTextEncode', inputs: {} },
  '44': { class_type: 'UNETLoader', inputs: {} },
  '15': { class_type: 'VAELoader', inputs: {} },
  '45': { class_type: 'CLIPLoader', inputs: {} },
  '28': { class_type: 'EmptyLatentImage', inputs: {} }
}

// Default bundled workflow: has CheckpointLoaderSimple, no UNET/VAE/CLIP.
const defaultApi = {
  '4': { class_type: 'CheckpointLoaderSimple', inputs: {} },
  '63': { class_type: 'KSampler', inputs: { positive: ['11', 0], negative: ['12', 0] } },
  '11': { class_type: 'CLIPTextEncode', inputs: {} },
  '12': { class_type: 'CLIPTextEncode', inputs: {} },
  '28': { class_type: 'EmptyLatentImage', inputs: {} }
}

test('detectComfyMapping: ANIMA (no checkpoint, unet/vae/clip present) does not throw and maps correctly', () => {
  const m = detectComfyMapping(animaApi)
  assert.strictEqual(m.sampler, '63')
  assert.strictEqual(m.checkpoint, undefined)
  assert.strictEqual(m.unet, '44')
  assert.strictEqual(m.vae, '15')
  assert.strictEqual(m.clip, '45')
  assert.strictEqual(m.latent, '28')
  assert.strictEqual(m.positive, '11')
  assert.strictEqual(m.negative, '12')
})

test('detectComfyMapping: default workflow (checkpoint present, no unet/vae/clip) returns checkpoint', () => {
  const m = detectComfyMapping(defaultApi)
  assert.strictEqual(m.checkpoint, '4')
  assert.strictEqual(m.unet, undefined)
  assert.strictEqual(m.vae, undefined)
  assert.strictEqual(m.clip, undefined)
})

test('detectComfyMapping: missing sampler is reported in missing[], does not throw', () => {
  const bad = { '4': { class_type: 'CheckpointLoaderSimple', inputs: {} }, '28': { class_type: 'EmptyLatentImage', inputs: {} } }
  const m = detectComfyMapping(bad)
  assert.ok(m.missing.includes('采样器(KSampler)'))
})

test('detectComfyMapping: missing both checkpoint and unet is reported in missing[], does not throw', () => {
  const bad = {
    '63': { class_type: 'KSampler', inputs: { positive: ['11', 0], negative: ['12', 0] } },
    '11': { class_type: 'CLIPTextEncode', inputs: {} },
    '12': { class_type: 'CLIPTextEncode', inputs: {} },
    '28': { class_type: 'EmptyLatentImage', inputs: {} }
  }
  const m = detectComfyMapping(bad)
  assert.ok(m.missing.includes('模型加载器(Checkpoint 或 UNETLoader)'))
})

// v2.9.14: generalized samplers — any node whose inputs carry positive+negative
// array links counts, covering Efficiency / custom sampler nodes.
test('detectComfyMapping: custom sampler node (positive/negative array inputs) is detected as sampler', () => {
  const custom = {
    '4': { class_type: 'CheckpointLoaderSimple', inputs: {} },
    '77': { class_type: 'Efficiency Sampler', inputs: { positive: ['11', 0], negative: ['12', 0], steps: 20 } },
    '11': { class_type: 'CLIPTextEncode', inputs: {} },
    '12': { class_type: 'CLIPTextEncode', inputs: {} },
    '28': { class_type: 'EmptyLatentImage', inputs: {} }
  }
  const m = detectComfyMapping(custom)
  assert.strictEqual(m.sampler, '77')
  assert.strictEqual(m.positive, '11')
  assert.strictEqual(m.negative, '12')
  assert.deepStrictEqual(m.missing, [])
})

// v2.9.14: no sampler — positive/negative fall back to TextEncode nodes.
test('detectComfyMapping: without sampler, TextEncode nodes are used for positive/negative', () => {
  const noSampler = {
    '4': { class_type: 'CheckpointLoaderSimple', inputs: {} },
    '11': { class_type: 'CustomTextEncode', inputs: {} },
    '12': { class_type: 'CLIPTextEncode', inputs: {} },
    '28': { class_type: 'EmptyLatentImage', inputs: {} }
  }
  const m = detectComfyMapping(noSampler)
  assert.strictEqual(m.sampler, undefined)
  assert.strictEqual(m.positive, '11')
  assert.strictEqual(m.negative, '12')
  assert.ok(m.missing.includes('采样器(KSampler)'))
})

// v2.9.14: generalized latent — any node with numeric width/height inputs.
test('detectComfyMapping: custom latent node (numeric width/height) is detected as latent', () => {
  const customLatent = {
    '63': { class_type: 'KSampler', inputs: { positive: ['11', 0], negative: ['12', 0] } },
    '11': { class_type: 'CLIPTextEncode', inputs: {} },
    '12': { class_type: 'CLIPTextEncode', inputs: {} },
    '4': { class_type: 'CheckpointLoaderSimple', inputs: {} },
    '88': { class_type: 'CustomLatentCreator', inputs: { width: 1024, height: 1024 } }
  }
  const m = detectComfyMapping(customLatent)
  assert.strictEqual(m.latent, '88')
})

test('detectComfyMapping: missing[] reports sampler and latent when absent (loader present)', () => {
  const bad = {
    '11': { class_type: 'CLIPTextEncode', inputs: {} },
    '21': { class_type: 'UNETLoader', inputs: {} }
  }
  const m = detectComfyMapping(bad)
  assert.ok(m.missing.includes('采样器(KSampler)'))
  assert.ok(m.missing.includes('空Latent(EmptyLatentImage)'))
})

// ---- v2.9.14 applyPatch mapping ops ----
const cfgWithWf = () => ({ comfyWorkflows: [{ id: 'w1', name: 'wf', workflow: '{}', mapping: { positive: '6' } }] })

test('applyPatch comfyWfUpdateMapping: object value {node,field} is stored as-is', () => {
  const out = applyPatch(cfgWithWf(), { comfyWfUpdateMapping: { id: 'w1', key: 'positive', value: { node: '11', field: 'prompt' } } })
  assert.deepStrictEqual(out.comfyWorkflows[0].mapping.positive, { node: '11', field: 'prompt' })
})

test('applyPatch comfyWfUpdateMapping: empty-node object keeps an empty row (not deleted)', () => {
  const out = applyPatch(cfgWithWf(), { comfyWfUpdateMapping: { id: 'w1', key: 'positive', value: { node: '', field: '' } } })
  assert.deepStrictEqual(out.comfyWorkflows[0].mapping.positive, { node: '', field: '' })
})

test('applyPatch comfyWfUpdateMapping: string value stays a string (back-compat)', () => {
  const out = applyPatch(cfgWithWf(), { comfyWfUpdateMapping: { id: 'w1', key: 'negative', value: '12' } })
  assert.strictEqual(out.comfyWorkflows[0].mapping.negative, '12')
})

test('applyPatch comfyWfDeleteMapping removes the key entirely', () => {
  const out = applyPatch(cfgWithWf(), { comfyWfDeleteMapping: { id: 'w1', key: 'positive' } })
  assert.strictEqual(out.comfyWorkflows[0].mapping.positive, undefined)
})
