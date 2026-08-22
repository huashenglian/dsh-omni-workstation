// comfy-mapping.test.js — v2.8 detectComfyMapping: unet/vae/clip support + relaxed checkpoint requirement
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { detectComfyMapping } = await import('../lib/index.js')

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

test('detectComfyMapping: missing sampler still throws', () => {
  const bad = { '4': { class_type: 'CheckpointLoaderSimple', inputs: {} }, '28': { class_type: 'EmptyLatentImage', inputs: {} } }
  assert.throws(() => detectComfyMapping(bad), /采样器/)
})

test('detectComfyMapping: missing both checkpoint and unet throws model-loader error', () => {
  const bad = {
    '63': { class_type: 'KSampler', inputs: { positive: ['11', 0], negative: ['12', 0] } },
    '11': { class_type: 'CLIPTextEncode', inputs: {} },
    '12': { class_type: 'CLIPTextEncode', inputs: {} },
    '28': { class_type: 'EmptyLatentImage', inputs: {} }
  }
  assert.throws(() => detectComfyMapping(bad), /模型加载器/)
})
