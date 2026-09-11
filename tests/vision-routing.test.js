import test from 'node:test'
import assert from 'node:assert/strict'
import {
  sourceModelAcceptsImages,
  resolveVerifyReminderMode,
  _setLastSource,
  _resetLastSource
} from '../lib/index.js'

test('sourceModelAcceptsImages: no lastSource → false', async () => {
  _resetLastSource()
  assert.equal(await sourceModelAcceptsImages(null), false)
  assert.equal(await sourceModelAcceptsImages({}), false)
})

test('sourceModelAcceptsImages: vision model (input includes image)', async () => {
  _resetLastSource()
  _setLastSource('proxyz', 'sensenova-6.8-flash-lite')
  const ctx = {
    llm: {
      registration: (p) => ({
        adapter: {
          async resolveModel(provider, model) {
            assert.equal(provider, 'proxyz')
            assert.equal(model, 'sensenova-6.8-flash-lite')
            return { id: model, inputModalities: ['text', 'image'] }
          }
        }
      })
    }
  }
  assert.equal(await sourceModelAcceptsImages(ctx), true)
})

test('sourceModelAcceptsImages: text-only model', async () => {
  _resetLastSource()
  _setLastSource('proxyz', 'deepseek/deepseek-v4-flash')
  const ctx = {
    llm: {
      registration: () => ({
        adapter: {
          async resolveModel() {
            return { id: 'deepseek/deepseek-v4-flash', inputModalities: ['text'] }
          }
        }
      })
    }
  }
  assert.equal(await sourceModelAcceptsImages(ctx), false)
})

test('sourceModelAcceptsImages: missing modalities / throws → false', async () => {
  _resetLastSource()
  _setLastSource('proxyz', 'm')
  assert.equal(await sourceModelAcceptsImages({
    llm: { registration: () => ({ adapter: { async resolveModel() { return { id: 'm' } } } }) }
  }), false)
  assert.equal(await sourceModelAcceptsImages({
    llm: { registration: () => { throw new Error('nope') } }
  }), false)
  _resetLastSource()
})

// --- resolveVerifyReminderMode (v2.11.3) ---

test('adapt on + multimodal + VLM on → native_vision', () => {
  const cfg = { vlmEnabled: true, globalConfig: { verifyReminder: true, dynamicMultimodalAdapt: true } }
  assert.equal(resolveVerifyReminderMode(cfg, true, true), 'native_vision')
})

test('adapt on + text-only + VLM on → analyze_image', () => {
  const cfg = { vlmEnabled: true, globalConfig: { verifyReminder: true, dynamicMultimodalAdapt: true } }
  assert.equal(resolveVerifyReminderMode(cfg, true, false), 'analyze_image')
})

test('adapt off + multimodal + VLM on → analyze_image (legacy)', () => {
  const cfg = { vlmEnabled: true, globalConfig: { verifyReminder: true, dynamicMultimodalAdapt: false } }
  assert.equal(resolveVerifyReminderMode(cfg, true, true), 'analyze_image')
})

test('adapt on + VLM off → native_vision even without acceptsImages', () => {
  const cfg = { vlmEnabled: false, globalConfig: { verifyReminder: true, dynamicMultimodalAdapt: true } }
  assert.equal(resolveVerifyReminderMode(cfg, false, false), 'native_vision')
  assert.equal(resolveVerifyReminderMode(cfg, true, true), 'native_vision')
})

test('adapt off + VLM off → native_vision', () => {
  const cfg = { vlmEnabled: false, globalConfig: { verifyReminder: true, dynamicMultimodalAdapt: false } }
  assert.equal(resolveVerifyReminderMode(cfg, false, false), 'native_vision')
})

test('VLM on but no tool → native_vision', () => {
  const cfg = { vlmEnabled: true, globalConfig: { verifyReminder: true } }
  assert.equal(resolveVerifyReminderMode(cfg, false, false), 'native_vision')
})

test('verifyReminder switch off → empty', () => {
  assert.equal(resolveVerifyReminderMode({ vlmEnabled: true, globalConfig: { verifyReminder: false } }, true, true), '')
  assert.equal(resolveVerifyReminderMode({ vlmEnabled: false, globalConfig: { verifyReminder: false } }, false, false), '')
})

test('verifyReminder default off (missing field → empty)', () => {
  assert.equal(resolveVerifyReminderMode({ vlmEnabled: true, globalConfig: {} }, true, true), '')
  assert.equal(resolveVerifyReminderMode({ vlmEnabled: true }, true, false), '')
})

