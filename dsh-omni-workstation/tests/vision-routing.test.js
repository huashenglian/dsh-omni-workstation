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

test('resolveVerifyReminderMode: VLM on + tool → analyze_image', () => {
  assert.equal(resolveVerifyReminderMode({ vlmEnabled: true, globalConfig: { verifyReminder: true } }, true), 'analyze_image')
  assert.equal(resolveVerifyReminderMode({ vlmEnabled: true, globalConfig: {} }, true), 'analyze_image')
})

test('resolveVerifyReminderMode: VLM off → native_vision even without tool', () => {
  assert.equal(resolveVerifyReminderMode({ vlmEnabled: false, globalConfig: { verifyReminder: true } }, false), 'native_vision')
  assert.equal(resolveVerifyReminderMode({ vlmEnabled: false, globalConfig: {} }, true), 'native_vision')
})

test('resolveVerifyReminderMode: VLM on but no tool → native_vision', () => {
  assert.equal(resolveVerifyReminderMode({ vlmEnabled: true, globalConfig: {} }, false), 'native_vision')
})

test('resolveVerifyReminderMode: switch off → empty', () => {
  assert.equal(resolveVerifyReminderMode({ vlmEnabled: true, globalConfig: { verifyReminder: false } }, true), '')
  assert.equal(resolveVerifyReminderMode({ vlmEnabled: false, globalConfig: { verifyReminder: false } }, false), '')
})
