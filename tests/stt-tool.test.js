// stt-tool.test.js — STT tool layer (v2.13): buildTranscribeToolDef + _resetStt
// Mirrors tests/stt-config.test.js harness: node:test + dynamic import + DSH_HOME /
// config-dir mkdtemp. Test 4 (invalid config) writes a real omni-vision.json into
// the temp config dir, so loadConfig(appCtx=null) reads it without a live host ctx
// (the file-exists path never touches ctx) — this exercises the real execute guard.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

process.env.DSH_HOME = mkdtempSync(join(tmpdir(), 'omni-workstation-stt-tool-'))
process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR = mkdtempSync(join(tmpdir(), 'omni-workstation-stt-tool-cfg-'))

const { buildTranscribeToolDef, _resetStt, defaultSttConfig, mergeTranscribeArgs } = await import('../lib/index.js')

// ---- tool definition ----

test('transcribe: name + description mark it the preferred STT tool (analyze_media not for audio)', () => {
  const def = buildTranscribeToolDef(defaultSttConfig())
  assert.equal(def.name, 'transcribe')
  assert.ok(def.description.includes('首选'), 'description must mark transcribe as the preferred tool')
  assert.ok(def.description.includes('analyze_media'), 'description must steer audio away from analyze_media')
  assert.ok(def.description.includes('sensevoice'), 'description must embed the current model')
})

test('transcribe: exactly the 5 optional params, no required key anywhere', () => {
  const def = buildTranscribeToolDef(defaultSttConfig())
  const props = def.parameters.properties
  assert.deepEqual(Object.keys(props).sort(), ['attachment_id', 'audio_path', 'hotwords', 'language', 'output_mode'])
  // this codebase's schema DSL: optional params must OMIT `required` entirely
  assert.equal('required' in def.parameters, false, 'no param is required')
  for (const key of Object.keys(props)) {
    assert.equal('required' in props[key], false, key + ' must omit required (required:false is a bug)')
  }
})

test('transcribe: output schema has ok(required)/text/language/duration/filePath/segments/detail', () => {
  const def = buildTranscribeToolDef(defaultSttConfig())
  const schema = def.output.schema
  for (const f of ['ok', 'text', 'language', 'duration', 'filePath', 'segments', 'detail']) {
    assert.ok(schema.properties[f], 'missing output field ' + f)
  }
  assert.deepEqual(schema.required, ['ok'])
  assert.equal(schema.properties.ok.type, 'boolean')
  assert.equal(schema.properties.segments.type, 'array')
})

// ---- execute guard ----

test('transcribe execute: rejects invalid STT config with actionable Chinese message', async () => {
  // Seed an invalid STT config (openai without api key/model) into the real
  // config file — loadConfig then returns it and execute must reject.
  writeFileSync(
    join(process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR, 'omni-vision.json'),
    JSON.stringify({ voiceConfigStt: { provider: 'openai' } }),
    'utf8'
  )
  const def = buildTranscribeToolDef(defaultSttConfig())
  await assert.rejects(
    () => def.execute({ audio_path: 'whatever.mp3' }, {}),
    (e) => String(e && e.message).includes('STT 配置无效')
  )
})

// ---- render ----

test('transcribe render: segments -> [mm:ss – mm:ss] lines, text blocks only', () => {
  const def = buildTranscribeToolDef(defaultSttConfig())
  const blocks = def.output.render({}, {
    ok: true,
    text: '你好世界',
    language: 'zh',
    duration: 70,
    segments: [
      { start: 0, end: 5.2, text: '你好' },
      { start: 65, end: 70, text: '世界' }
    ]
  })
  assert.ok(Array.isArray(blocks) && blocks.length > 0)
  for (const b of blocks) assert.equal(b.type, 'text', 'render must emit ONLY text blocks (sanitizer-safe)')
  const text = blocks.map((b) => b.text).join('\n')
  assert.ok(text.includes('[00:00 – 00:05] 你好'), 'mm:ss timestamp line for the first segment')
  assert.ok(text.includes('[01:05 – 01:10] 世界'), 'mm:ss timestamp line for the second segment')
  // >= 1h switches to hh:mm:ss
  const long = def.output.render({}, { ok: true, text: 'x', segments: [{ start: 3661, end: 3665, text: '长' }] })
  assert.ok(long[0].text.includes('[01:01:01 – 01:01:05] 长'), 'hh:mm:ss once >= 1h')
  // filePath footer
  const withFile = def.output.render({}, { ok: true, text: 'x', filePath: 'D:/ws/.omni-workstation/transcripts/a-1.srt' })
  assert.ok(withFile[0].text.includes('字幕文件: D:/ws/.omni-workstation/transcripts/a-1.srt'))
  for (const b of withFile) assert.equal(b.type, 'text')
})

// ---- test reset hook ----

test('_resetStt is callable without throwing', () => {
  assert.doesNotThrow(() => _resetStt())
})

// ---- mergeTranscribeArgs (v2.13.1): panel config = default request params ----

test('mergeTranscribeArgs: empty args keep panel values', () => {
  const live = defaultSttConfig()
  const merged = mergeTranscribeArgs(live, {})
  assert.equal(merged.language, live.language)
  assert.equal(merged.hotwords, live.hotwords)
  assert.equal(merged.outputMode, live.outputMode)
})

test('mergeTranscribeArgs: whitelisted output_mode overrides', () => {
  const merged = mergeTranscribeArgs(defaultSttConfig(), { output_mode: 'srt' })
  assert.equal(merged.outputMode, 'srt')
})

test('mergeTranscribeArgs: non-whitelisted output_mode is ignored', () => {
  const merged = mergeTranscribeArgs(defaultSttConfig(), { output_mode: 'bogus' })
  assert.equal(merged.outputMode, defaultSttConfig().outputMode)
})

test('mergeTranscribeArgs: empty language does not override panel value', () => {
  const live = Object.assign(defaultSttConfig(), { language: 'zh' })
  const merged = mergeTranscribeArgs(live, { language: '' })
  assert.equal(merged.language, 'zh')
})

test('mergeTranscribeArgs: non-empty language and hotwords override', () => {
  const live = Object.assign(defaultSttConfig(), { language: 'zh', hotwords: 'a' })
  const merged = mergeTranscribeArgs(live, { language: 'en', hotwords: 'b c' })
  assert.equal(merged.language, 'en')
  assert.equal(merged.hotwords, 'b c')
})
