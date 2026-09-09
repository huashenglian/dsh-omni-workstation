import test from 'node:test'
import assert from 'node:assert/strict'
import {
  clampVideoCardLimit,
  loadCustomAdapter,
  validateCustomAdapter,
  buildVideoBuilderGuide,
  CUSTOM_ADAPTER_PROTOCOL,
  VIDEO_CARD_HARD_MAX,
  VIDEO_BUILDER_CMD
} from '../lib/video-builder.js'
import { applyPatch, isVideoConfigValid } from '../lib/index.js'

const GOOD_ADAPTER = `{
  name: 't',
  buildSubmit(ctx) { return { url: ctx.cfg.endpoint + '/v1', method: 'POST', headers: { Authorization: 'Bearer ' + ctx.cfg.apiKey }, body: { model: ctx.cfg.model, prompt: ctx.prompt } } },
  parseTaskId(res) { return res.task_id || '' },
  pollUrl(ctx) { return ctx.cfg.endpoint + '/tasks/' + ctx.taskId },
  parseStatus(res) { return res.status === 'ok' ? { status: 'completed', videoUrl: res.url } : { status: 'running' } }
}`

test('clampVideoCardLimit defaults to 10 and caps at HARD_MAX', () => {
  assert.equal(clampVideoCardLimit(undefined), 10)
  assert.equal(clampVideoCardLimit(null), 10)
  assert.equal(clampVideoCardLimit(''), 10)
  assert.equal(clampVideoCardLimit(0), 10)
  assert.equal(clampVideoCardLimit(-1), 10)
  assert.equal(clampVideoCardLimit(5), 5)
  assert.equal(clampVideoCardLimit(99), VIDEO_CARD_HARD_MAX)
  assert.equal(clampVideoCardLimit(10), 10)
  assert.equal(VIDEO_CARD_HARD_MAX, 10)
})

test('loadCustomAdapter accepts a valid object expression', () => {
  const a = loadCustomAdapter(GOOD_ADAPTER)
  assert.equal(typeof a.buildSubmit, 'function')
  assert.equal(a.parseTaskId({ task_id: 'x' }), 'x')
})

test('loadCustomAdapter rejects missing methods', () => {
  assert.throws(() => loadCustomAdapter('{ buildSubmit(){} }'), /parseTaskId/)
  assert.throws(() => loadCustomAdapter(''), /adapterCode 为空/)
  assert.throws(() => loadCustomAdapter('1+1'), /对象/)
})

test('validateCustomAdapter returns ok flag', () => {
  assert.equal(validateCustomAdapter(GOOD_ADAPTER).ok, true)
  assert.equal(validateCustomAdapter('nope').ok, false)
})

test('buildVideoBuilderGuide includes command, limit and scaffold hooks', () => {
  const cfg = { videoCards: [{ toolName: 'generate_video_a', name: 'A' }] }
  const g = buildVideoBuilderGuide('https://example.com docs', cfg, 10)
  assert.ok(g.includes('custom-adapter'))
  assert.ok(g.includes('videoCardAddAi'))
  assert.ok(g.includes('buildSubmit'))
  assert.ok(g.includes('parseStatus'))
  assert.ok(g.includes('1/10'))
  assert.ok(g.includes('https://example.com docs'))
  const empty = buildVideoBuilderGuide('', { videoCards: [] }, 10)
  assert.ok(empty.includes('必须先向用户询问'))
})

test('applyPatch videoCardLimit clamps and videoBuilderEnabled toggles', () => {
  const base = applyPatch({}, {})
  const next = applyPatch(base, { videoCardLimit: 99, videoBuilderEnabled: false })
  assert.equal(next.videoCardLimit, 10)
  assert.equal(next.videoBuilderEnabled, false)
  const next2 = applyPatch(next, { videoCardLimit: 3, videoBuilderEnabled: true })
  assert.equal(next2.videoCardLimit, 3)
  assert.equal(next2.videoBuilderEnabled, true)
})

test('applyPatch videoCardAdd enforces physical limit', () => {
  // empty applyPatch seeds 1 default card; set limit to 2 so only one add is allowed
  let cfg = applyPatch({}, { videoCardLimit: 2 })
  assert.equal(cfg.videoCards.length, 1)
  cfg = applyPatch(cfg, { videoCardAdd: { name: 'A', toolName: 'generate_video_a', type: 't2v' } })
  assert.equal(cfg.videoCards.length, 2)
  assert.throws(() => applyPatch(cfg, { videoCardAdd: { name: 'B', toolName: 'generate_video_b', type: 't2v' } }), /上限/)
  cfg = applyPatch(cfg, { videoCardDelete: cfg.videoCards[0].id })
  const added = applyPatch(cfg, { videoCardAdd: { name: 'B', toolName: 'generate_video_b', type: 't2v' } })
  assert.equal(added.videoCards.length, 2)
})

test('applyPatch videoCardAddAi creates AI card with custom-adapter', () => {
  const base = applyPatch({}, {})
  const next = applyPatch(base, {
    videoCardAddAi: {
      name: 'HappyHorse',
      type: 't2v',
      toolName: 'generate_video_happyhorse',
      description: 'happyhorse t2v',
      config: {
        provider: 'custom',
        protocol: CUSTOM_ADAPTER_PROTOCOL,
        endpoint: 'https://ws.example.com/compatible-mode/v1',
        apiKey: 'sk-test',
        model: 'happyhorse-1.0-t2v',
        adapterCode: GOOD_ADAPTER
      }
    }
  })
  const card = next.videoCards.find(c => c.toolName === 'generate_video_happyhorse')
  assert.ok(card)
  assert.equal(card.source, 'ai')
  assert.equal(card.config.protocol, CUSTOM_ADAPTER_PROTOCOL)
  assert.equal(isVideoConfigValid(card.config), true)
})

test('applyPatch videoCardAddAi rejects bad adapter and duplicate toolName', () => {
  const base = applyPatch({}, {})
  assert.throws(() => applyPatch(base, {
    videoCardAddAi: {
      name: 'X', type: 't2v', toolName: 'generate_video_x',
      config: { protocol: CUSTOM_ADAPTER_PROTOCOL, endpoint: 'https://x', adapterCode: 'bad' }
    }
  }), /adapterCode 无效|配置无效/)
  const withCard = applyPatch(base, {
    videoCardAddAi: {
      name: 'Y', type: 't2v', toolName: 'generate_video_y',
      config: { protocol: CUSTOM_ADAPTER_PROTOCOL, endpoint: 'https://x', adapterCode: GOOD_ADAPTER }
    }
  })
  assert.throws(() => applyPatch(withCard, {
    videoCardAddAi: {
      name: 'Y2', type: 't2v', toolName: 'generate_video_y',
      config: { protocol: CUSTOM_ADAPTER_PROTOCOL, endpoint: 'https://x', adapterCode: GOOD_ADAPTER }
    }
  }), /已存在/)
})

test('isVideoConfigValid custom-adapter needs endpoint+adapter, key/model optional', () => {
  assert.equal(isVideoConfigValid({ protocol: CUSTOM_ADAPTER_PROTOCOL, endpoint: '', adapterCode: GOOD_ADAPTER }), false)
  assert.equal(isVideoConfigValid({ protocol: CUSTOM_ADAPTER_PROTOCOL, endpoint: 'https://x', adapterCode: '' }), false)
  assert.equal(isVideoConfigValid({ protocol: CUSTOM_ADAPTER_PROTOCOL, endpoint: 'https://x', adapterCode: GOOD_ADAPTER }), true)
  assert.equal(isVideoConfigValid({ protocol: CUSTOM_ADAPTER_PROTOCOL, endpoint: 'https://x', adapterCode: GOOD_ADAPTER, model: '', apiKey: '' }), true)
})

test('VIDEO_BUILDER_CMD name is stable', () => {
  assert.equal(VIDEO_BUILDER_CMD, 'build-video-tool')
})
