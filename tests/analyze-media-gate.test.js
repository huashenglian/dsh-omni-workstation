// analyze-media-gate.test.js — analyze_media registration gate + per-modality routing (Task 9)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dshHome = mkdtempSync(join(tmpdir(), 'omni-workstation-media-gate-'))
process.env.DSH_HOME = dshHome
process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR = dshHome

const { apply, _resetMedia, mediaToolDef } = await import('../lib/index.js')

const writeCfg = (obj) => writeFileSync(join(dshHome, 'omni-vision.json'), JSON.stringify(obj))

function makeFakeCtx() {
  const registered = []
  const listeners = new Map()
  const routes = []
  return {
    registered,
    listeners,
    routes,
    get: (name) => {
      if (name === 'webServer') {
        return { register: (route) => { routes.push(route); return () => {} } }
      }
      return undefined
    },
    tools: {
      register: (def) => {
        registered.push(def)
        return () => {
          const i = registered.indexOf(def)
          if (i >= 0) registered.splice(i, 1)
        }
      }
    },
    llm: {
      listProviders: () => [],
      registerAdapter: () => () => {},
      registration: () => { throw new Error('no source') },
      stream: async function* () {},
      on: () => {},
      effect: () => {}
    },
    logger: { warn: () => {} },
    on: (event, fn) => listeners.set(event, fn),
    effect: (fn) => fn()
  }
}

const waitFor = async (fn, timeout = 3000) => {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (fn()) return
    await new Promise((r) => setTimeout(r, 10))
  }
  throw new Error('waitFor timeout')
}
const names = (ctx) => ctx.registered.map((d) => d && d.name).filter(Boolean)

const card = (over) => Object.assign({
  id: 'c_' + Math.random().toString(36).slice(2),
  name: 'Test', provider: 'custom', protocol: 'openai-completions',
  endpoint: 'http://127.0.0.1:9/v1', apiKey: 'sk-test', model: 'test-model'
}, over)

// real media bytes (magic sniffed by resolveMedia)
const MP4 = Buffer.concat([Buffer.from('00000018', 'hex'), Buffer.from('ftypmp42', 'binary'), Buffer.alloc(8)])
const WAV = Buffer.concat([Buffer.from('RIFF', 'binary'), Buffer.alloc(4), Buffer.from('WAVE', 'binary'), Buffer.alloc(8)])
const mp4Path = join(dshHome, 'clip.mp4')
const wavPath = join(dshHome, 'voice.wav')
writeFileSync(mp4Path, MP4)
writeFileSync(wavPath, WAV)

// ---- global fetch stub: records every httpJson attempt, replies per URL ----
let calls = []
let replyFor = () => ({ status: 200, body: { choices: [{ message: { content: '媒体回答' } }] } })
const realFetch = globalThis.fetch
function installFetchStub() {
  calls = []
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), body: init && init.body })
    const rule = replyFor(String(url))
    return { ok: rule.status >= 200 && rule.status < 300, status: rule.status, text: async () => JSON.stringify(rule.body) }
  }
}
const restoreFetch = () => { globalThis.fetch = realFetch }
const callsTo = (frag) => calls.filter((c) => c.url.includes(frag))

const BASE_CFG = (apis, extra) => Object.assign({
  retryCount: 1,
  apis,
  fallbackConfig: { provider: 'ovhcloud', models: [], timeoutMs: 1000 },
  globalConfig: { retryStatusCodes: '429', backoffBase: 1, backoff429Base: 1, backoffMax: 1, backoff429Max: 1 }
}, extra || {})

// ---------- registration gate ----------

test('gate off: no card has video/audio → analyze_media not registered', async () => {
  _resetMedia()
  writeCfg(BASE_CFG([card({}), card({}), card({})]))
  const ctx = makeFakeCtx()
  apply(ctx)
  await waitFor(() => names(ctx).includes('zoom_image')) // syncToolRegistration finished
  assert.ok(!names(ctx).includes('analyze_media'), 'analyze_media must NOT register when all switches are off')
})

test('gate on: a card with video on → analyze_media registered', async () => {
  _resetMedia()
  writeCfg(BASE_CFG([card({}), card({ video: true }), card({})]))
  const ctx = makeFakeCtx()
  apply(ctx)
  await waitFor(() => names(ctx).includes('analyze_media'))
  assert.ok(names(ctx).includes('analyze_media'))
})

test('gate on: a card with audio on → analyze_media registered', async () => {
  _resetMedia()
  writeCfg(BASE_CFG([card({ audio: true })]))
  const ctx = makeFakeCtx()
  apply(ctx)
  await waitFor(() => names(ctx).includes('analyze_media'))
  assert.ok(names(ctx).includes('analyze_media'))
})

test('gate toggle off: switching both off unregisters analyze_media', async () => {
  _resetMedia()
  writeCfg(BASE_CFG([card({ video: true })]))
  const ctx = makeFakeCtx()
  apply(ctx)
  await waitFor(() => names(ctx).includes('analyze_media'))
  // rewrite config with no modality on, fresh apply → old disposer fires
  writeCfg(BASE_CFG([card({}), card({})]))
  const ctx2 = makeFakeCtx()
  apply(ctx2)
  await waitFor(() => !names(ctx).includes('analyze_media'))
  assert.ok(!names(ctx).includes('analyze_media'), 'switch off removes the registration')
  assert.ok(!names(ctx2).includes('analyze_media'))
})

// ---------- per-modality routing ----------

test('video request: hits only the video-enabled card, zero requests to others', async () => {
  _resetMedia()
  installFetchStub()
  try {
    writeCfg(BASE_CFG([
      card({ video: false, endpoint: 'http://127.0.0.1:9/card1/v1' }),
      card({ video: true, endpoint: 'http://127.0.0.1:9/card2/v1' }),
      card({ video: false, endpoint: 'http://127.0.0.1:9/card3/v1' })
    ]))
    apply(makeFakeCtx())
    const out = await mediaToolDef.execute({ media_path: mp4Path, question: '这是什么？' }, {})
    assert.equal(out.ok, true)
    assert.equal(out.answer, '媒体回答')
    assert.equal(out.attempts, 1)
    assert.equal(callsTo('/card2/').length, 1, 'only the video card received the request')
    assert.equal(callsTo('/card1/').length, 0, 'video-off card1 got zero requests')
    assert.equal(callsTo('/card3/').length, 0, 'video-off card3 got zero requests')
    assert.ok(calls[0].body.includes('data:video/mp4;base64,'), 'video rides as an image_url data URL')
  } finally {
    restoreFetch()
  }
})

test('video request: fails past retry then next supporting card; all fail → 均失败, no fallback', async () => {
  _resetMedia()
  installFetchStub()
  try {
    // both supporting cards return 500 (retryable is 429 only → immediate hop)
    replyFor = (url) => url.includes('/card2/') || url.includes('/card4/')
      ? { status: 500, body: { error: 'boom' } }
      : { status: 200, body: { choices: [{ message: { content: 'nope' } }] } }
    writeCfg(BASE_CFG(
      [
        card({ video: false, endpoint: 'http://127.0.0.1:9/card1/v1' }),
        card({ video: true, endpoint: 'http://127.0.0.1:9/card2/v1' }),
        card({ video: false, endpoint: 'http://127.0.0.1:9/card3/v1' }),
        card({ video: true, endpoint: 'http://127.0.0.1:9/card4/v1' })
      ],
      { fallbackConfig: { provider: 'ovhcloud', models: ['should-not-run'], timeoutMs: 1000 } }
    ))
    apply(makeFakeCtx())
    await assert.rejects(
      () => mediaToolDef.execute({ media_path: mp4Path, question: 'q' }, {}),
      (e) => {
        assert.match(e.message, /analyze_media: 所有 VLM API 均失败/)
        assert.match(e.message, /均失败/)
        assert.ok(!e.message.includes('兜底'), 'no fallback model in the error')
        return true
      }
    )
    assert.equal(callsTo('/card1/').length, 0, 'non-video card1 skipped')
    assert.equal(callsTo('/card3/').length, 0, 'non-video card3 skipped')
    assert.equal(callsTo('/card2/').length, 1, 'card2 tried once (retryCount=1)')
    assert.equal(callsTo('/card4/').length, 1, 'failover reached the next supporting card')
    assert.equal(calls.filter((c) => c.url.includes('ovh.net')).length, 0, 'fallback provider must never be called')
  } finally {
    restoreFetch()
  }
})

test('audio request with only video switches on → clear error, zero requests', async () => {
  _resetMedia()
  installFetchStub()
  try {
    writeCfg(BASE_CFG([
      card({ video: true, endpoint: 'http://127.0.0.1:9/card2/v1' }),
      card({ video: true, endpoint: 'http://127.0.0.1:9/card3/v1' })
    ]))
    apply(makeFakeCtx())
    await assert.rejects(
      () => mediaToolDef.execute({ media_path: wavPath, question: 'q' }, {}),
      /没有开启音频模态的模型卡片/
    )
    assert.equal(calls.length, 0, 'no request is made when no card carries the requested modality')
  } finally {
    restoreFetch()
  }
})

test('mediaToolDef shape: required question, media_path/attachment_id params', () => {
  assert.equal(mediaToolDef.name, 'analyze_media')
  const props = mediaToolDef.parameters.properties
  assert.ok(props.media_path, 'media_path param present')
  assert.ok(props.attachment_id, 'attachment_id param present')
  assert.ok(props.question, 'question param present')
})
