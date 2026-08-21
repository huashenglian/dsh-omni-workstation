// wrapper.test.js — v1.8 makeTwinAdapter stream(): image rewrite / preserve / deep + delegation to lastSource
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dshHome = mkdtempSync(join(tmpdir(), 'omni-workstation-tmp-'))
process.env.DSH_HOME = mkdtempSync(join(tmpdir(), 'omni-workstation-wrap-'))
process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR = dshHome

const { makeTwinAdapter, rewriteImagesDeep, _resetLastSource, _setLastSource } = await import('../lib/index.js')

function makeSource(resolveModelImpl) {
  return {
    providerInfo: () => ({ id: 'alpha', name: 'Alpha' }),
    listModels: async () => [],
    resolveModel: resolveModelImpl
  }
}

function makeCtx(source, onStream) {
  const calls = []
  return {
    calls,
    llm: {
      registration: () => ({ adapter: source }),
      stream: async function* (options) {
        calls.push(options)
        yield { type: 'text', text: 'ok' }
      }
    }
  }
}

const imageBlock = (attachment) => ({ type: 'image', attachment })

// v1.8: module-level lastSourceProvider/Model persist across tests in this
// process; reset before each case so sourceProvider() falls back to the
// `provider` arg ('alpha') unless explicitly set via _setLastSource.
const resetSource = () => _resetLastSource()

test('text-only source: image blocks rewritten to analyze_image marker', async () => {
  resetSource()
  const source = makeSource(async (p, m) => ({ id: m, provider: p, inputModalities: ['text'] }))
  const ctx = makeCtx(source)
  const adapter = makeTwinAdapter(ctx, 'alpha')
  const messages = [
    { role: 'user', content: [imageBlock({ attachmentId: 'sha256:abc', name: '截图.png' }), { type: 'text', text: '看看' }] }
  ]
  const out = []
  for await (const chunk of adapter.stream({ provider: 'auto-vision', model: 'auto-vision', messages })) out.push(chunk)
  assert.equal(out.length, 1)
  assert.equal(ctx.calls.length, 1)
  const delegated = ctx.calls[0]
  assert.equal(delegated.provider, 'alpha') // delegates to the SOURCE provider, not the twin route
  const content = delegated.messages[0].content
  assert.equal(content[0].type, 'text')
  assert.ok(content[0].text.includes('sha256:abc'), 'marker carries attachment id')
  assert.ok(content[0].text.includes('截图.png'), 'marker carries image name')
  assert.ok(content[0].text.includes('analyze_image'), 'marker points at analyze_image')
  assert.ok(content[0].text.includes('attachment_id: "sha256:abc"'))
  assert.equal(content[1].type, 'text') // non-image blocks untouched
})

test('multimodal source: images preserved (no rewrite)', async () => {
  resetSource()
  const source = makeSource(async (p, m) => ({ id: m, provider: p, inputModalities: ['text', 'image'] }))
  const ctx = makeCtx(source)
  const adapter = makeTwinAdapter(ctx, 'alpha')
  const messages = [
    { role: 'user', content: [imageBlock({ attachmentId: 'sha256:abc', name: '截图.png' })] }
  ]
  for await (const chunk of adapter.stream({ provider: 'auto-vision', model: 'auto-vision', messages })) void chunk
  const delegated = ctx.calls[0]
  assert.equal(delegated.messages, messages, 'same array identity when preserved')
  assert.equal(delegated.messages[0].content[0].type, 'image')
})

test('capability probe throwing: falls back to rewrite (safe bridge)', async () => {
  resetSource()
  const source = makeSource(async () => {
    throw new Error('metadata unavailable')
  })
  const ctx = makeCtx(source)
  const adapter = makeTwinAdapter(ctx, 'alpha')
  const messages = [{ role: 'user', content: [imageBlock({ attachmentId: 'sha256:abc' })] }]
  for await (const chunk of adapter.stream({ provider: 'auto-vision', model: 'auto-vision', messages })) void chunk
  const content = ctx.calls[0].messages[0].content
  assert.equal(content[0].type, 'text')
  assert.ok(content[0].text.includes('sha256:abc'))
})

test('nested tool-result image blocks are rewritten deep', async () => {
  resetSource()
  const source = makeSource(async (p, m) => ({ id: m, provider: p, inputModalities: ['text'] }))
  const ctx = makeCtx(source)
  const adapter = makeTwinAdapter(ctx, 'alpha')
  const messages = [{
    role: 'user',
    content: [{
      type: 'tool-result',
      content: [imageBlock({ attachmentId: 'sha256:nested', name: '内嵌图.png' })]
    }]
  }]
  for await (const chunk of adapter.stream({ provider: 'auto-vision', model: 'auto-vision', messages })) void chunk
  const inner = ctx.calls[0].messages[0].content[0]
  assert.equal(inner.type, 'tool-result')
  assert.equal(inner.content[0].type, 'text')
  assert.ok(inner.content[0].text.includes('sha256:nested'))
})

test('attachment.id fallback and name fallback in marker', async () => {
  resetSource()
  const source = makeSource(async (p, m) => ({ id: m, provider: p, inputModalities: ['text'] }))
  const ctx = makeCtx(source)
  const adapter = makeTwinAdapter(ctx, 'alpha')
  const messages = [
    { role: 'user', content: [imageBlock({ id: 'sha256:xyz' })] } // no attachmentId, no name
  ]
  for await (const chunk of adapter.stream({ provider: 'auto-vision', model: 'auto-vision', messages })) void chunk
  const text = ctx.calls[0].messages[0].content[0].text
  assert.ok(text.includes('sha256:xyz'), 'falls back to attachment.id')
  assert.ok(text.includes('图片「图片」'), 'falls back to default name')
})

test('v1.8: stream delegates to lastSourceProvider (NOT the twin route)', async () => {
  // The KEY v1.8 behavior: the twin route is 'auto-vision' but stream
  // delegates to lastSourceProvider+lastSourceModel (set by agent/request),
  // preventing recursion into the twin's own stream.
  resetSource()
  _setLastSource('beta', 'm-beta')
  const source = makeSource(async (p, m) => ({ id: m, provider: p, inputModalities: ['text'] }))
  const ctx = makeCtx(source)
  const adapter = makeTwinAdapter(ctx, 'alpha') // arg 'alpha' is fallback only
  const messages = [{ role: 'user', content: [imageBlock({ attachmentId: 'sha256:abc' })] }]
  for await (const chunk of adapter.stream({ provider: 'auto-vision', model: 'auto-vision', messages })) void chunk
  const delegated = ctx.calls[0]
  assert.equal(delegated.provider, 'beta', 'delegates to lastSourceProvider, not the twin route or the arg')
  assert.equal(delegated.model, 'm-beta', 'delegates with lastSourceModel')
})

test('rewriteImagesDeep: untouched input keeps identity', () => {
  const content = [{ type: 'text', text: 'hi' }]
  const result = rewriteImagesDeep(content, () => undefined)
  assert.equal(result.changed, false)
  assert.equal(result.content, content)
})
