// tts-output-dir.test.js — v2.13.1 unified TTS output_dir resolution
// Pure function: resolveTtsOutputDir(args, exec, label)
//   args.output_dir (absolute/UNC/root) wins; relative joins session cwd;
//   empty falls back to <cwd>/.omni-workstation/audio/; no cwd -> throws.
//   NEVER falls back to process.cwd() (runMimoTts's old fallback was removed —
//   M1 must-pass: the two runMimoTts cases below guard that behavior change).
// Integration: runTtsWebui / runIndexTts / runMimoTts with mocked fetch,
//   asserting where the artifact file actually lands.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

process.env.DSH_HOME = mkdtempSync(join(tmpdir(), 'omni-workstation-ttsout-'))
process.env.DSH_OMNI_WORKSTATION_CONFIG_DIR = mkdtempSync(join(tmpdir(), 'omni-workstation-ttsoutcfg-'))

const { resolveTtsOutputDir, runMimoTts, runIndexTts, runTtsWebui } = await import('../lib/index.js')

const cwdExec = (cwd) => ({ agent: { meta: { cwd } } })
const noCwdExec = () => ({ agent: {} })

// ---- pure function ----

test('resolveTtsOutputDir: Windows absolute path used as-is', () => {
  assert.equal(resolveTtsOutputDir({ output_dir: 'D:\\x\\y' }, noCwdExec(), 't'), 'D:\\x\\y')
})

test('resolveTtsOutputDir: UNC path used as-is', () => {
  assert.equal(resolveTtsOutputDir({ output_dir: '\\\\srv\\share' }, noCwdExec(), 't'), '\\\\srv\\share')
})

test('resolveTtsOutputDir: POSIX absolute path used as-is', () => {
  assert.equal(resolveTtsOutputDir({ output_dir: '/tmp/x' }, noCwdExec(), 't'), '/tmp/x')
})

test('resolveTtsOutputDir: relative path joins session cwd', () => {
  assert.equal(resolveTtsOutputDir({ output_dir: 'out' }, cwdExec('C:\\ws'), 't'), join('C:\\ws', 'out'))
})

test('resolveTtsOutputDir: empty falls back to <cwd>/.omni-workstation/audio/', () => {
  assert.equal(resolveTtsOutputDir({}, cwdExec('C:\\ws'), 't'), join('C:\\ws', '.omni-workstation', 'audio'))
})

test('resolveTtsOutputDir: empty + no cwd throws (message mentions output_dir)', () => {
  assert.throws(() => resolveTtsOutputDir({}, noCwdExec(), 't'), /output_dir/)
})

test('resolveTtsOutputDir: relative + no cwd throws (message mentions output_dir)', () => {
  assert.throws(() => resolveTtsOutputDir({ output_dir: 'out' }, noCwdExec(), 't'), /output_dir/)
})

// ---- integration: file lands where resolveTtsOutputDir says ----

const blobFetch = () => async () => ({
  ok: true, status: 200, text: async () => '',
  blob: async () => new Blob([Buffer.from('fake-audio')]),
  json: async () => ({})
})

test('runTtsWebui: absolute output_dir + no cwd -> file lands in that dir', async () => {
  const outDir = mkdtempSync(join(tmpdir(), 'omni-tts-out-'))
  const realFetch = global.fetch
  global.fetch = blobFetch()
  let res
  try {
    const vc = { provider: 'tts-webui', endpoint: 'http://127.0.0.1:9999', model: 'tts-1', voiceId: 'v1', outputFormat: 'wav', timeoutMs: 5000 }
    res = await runTtsWebui(vc, { text: '你好', output_dir: outDir }, noCwdExec())
  } finally { global.fetch = realFetch }
  const files = readdirSync(outDir)
  assert.equal(files.length, 1, 'exactly one artifact file')
  assert.match(files[0], /^voice_.*\.wav$/)
  assert.equal(res.path, join(outDir, files[0]))
})

test('runIndexTts: no output_dir + cwd -> lands in <cwd>/.omni-workstation/audio/', async () => {
  const cwd = mkdtempSync(join(tmpdir(), 'omni-tts-cwd-'))
  const realFetch = global.fetch
  global.fetch = blobFetch()
  let res
  try {
    const vc = { provider: 'indextts', voiceId: 'voice1', timeoutMs: 5000 }
    res = await runIndexTts(vc, { text: '你好', voice: 'voice1' }, cwdExec(cwd))
  } finally { global.fetch = realFetch }
  const audioDir = join(cwd, '.omni-workstation', 'audio')
  const files = readdirSync(audioDir)
  assert.equal(files.length, 1)
  assert.match(files[0], /^voice_.*\.wav$/)
  assert.equal(res.path, join(audioDir, files[0]))
})

test('runIndexTts: no output_dir + no cwd -> throws (no process.cwd() fallback)', async () => {
  const realFetch = global.fetch
  global.fetch = blobFetch()
  try {
    const vc = { provider: 'indextts', voiceId: 'voice1', timeoutMs: 5000 }
    await assert.rejects(runIndexTts(vc, { text: '你好', voice: 'voice1' }, noCwdExec()), /output_dir/)
  } finally { global.fetch = realFetch }
})

const mimoFetch = () => async () => ({
  ok: true, status: 200,
  json: async () => ({ choices: [{ message: { audio: { data: Buffer.from('RIFF....WAVEfake').toString('base64') } } }] })
})

test('runMimoTts: absolute output_dir + no cwd -> file lands in that dir (M1)', async () => {
  const outDir = mkdtempSync(join(tmpdir(), 'omni-tts-mimo-'))
  const realFetch = global.fetch
  global.fetch = mimoFetch()
  let res
  try {
    const vc = { provider: 'mimo', apiKey: 'sk-test', timeoutMs: 5000 }
    res = await runMimoTts(vc, { text: '你好', output_dir: outDir }, noCwdExec())
  } finally { global.fetch = realFetch }
  const files = readdirSync(outDir)
  assert.equal(files.length, 1)
  assert.match(files[0], /^voice_.*\.wav$/)
  assert.equal(res.path, join(outDir, files[0]))
})

test('runMimoTts: no output_dir + no cwd -> throws (M1: process.cwd() fallback removed)', async () => {
  const realFetch = global.fetch
  global.fetch = mimoFetch()
  try {
    const vc = { provider: 'mimo', apiKey: 'sk-test', timeoutMs: 5000 }
    await assert.rejects(runMimoTts(vc, { text: '你好' }, noCwdExec()), /output_dir/)
  } finally { global.fetch = realFetch }
})