// e2e-config-persistence.js — v1.9-fix E2E: verify config persistence via API
// Usage: node e2e-config-persistence.js [baseURL]
// Default baseURL: http://127.0.0.1:3080
import { createServer } from 'node:http'

const BASE = process.argv[2] || 'http://127.0.0.1:3080'
const URL = BASE + '/vlm/config'
let pass = 0, fail = 0

function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✓ ' + msg) }
  else { fail++; console.log('  ✗ ' + msg) }
}

async function getConfig() {
  const res = await fetch(URL)
  return res.json()
}

async function postConfig(patch) {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch)
  })
  return res.json()
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  console.log('\n=== E2E: Config Persistence Test ===')
  console.log('Target: ' + URL)

  // 1. GET initial config
  console.log('\n--- Step 1: GET initial config ---')
  const initial = await getConfig()
  if (!initial || !initial.ok) {
    console.log('FATAL: dsh web not running or /vlm/config failed')
    process.exit(1)
  }
  const cfg = initial.config
  console.log('  retryCount=' + cfg.retryCount + ' vlmEnabled=' + cfg.vlmEnabled)
  ok(cfg.mirrorConfig !== undefined, 'mirrorConfig field exists in response')
  ok(cfg.mirrorConfig.autoVisionEnabled !== undefined, 'autoVisionEnabled exists')
  ok(cfg.mirrorConfig.mirrorAllEnabled !== undefined, 'mirrorAllEnabled exists')
  ok(Array.isArray(cfg.mirrorConfig.mappings), 'mappings is array')

  const originalAutoVision = cfg.mirrorConfig.autoVisionEnabled
  const originalMirrorAll = cfg.mirrorConfig.mirrorAllEnabled
  console.log('  Original: autoVision=' + originalAutoVision + ' mirrorAll=' + originalMirrorAll)

  // 2. Toggle mirrorAllEnabled
  console.log('\n--- Step 2: Toggle mirrorAllEnabled → true ---')
  const r2 = await postConfig({ mirrorConfig: { field: 'mirrorAllEnabled', value: true } })
  ok(r2.ok === true, 'POST returned ok')
  ok(r2.config.mirrorConfig.mirrorAllEnabled === true, 'mirrorAllEnabled=true in response')

  // 3. Wait + GET to verify persistence
  console.log('\n--- Step 3: Wait 1s, GET to verify persistence ---')
  await sleep(1000)
  const r3 = await getConfig()
  ok(r3.config.mirrorConfig.mirrorAllEnabled === true, 'mirrorAllEnabled=true persisted to disk ✓')

  // 4. Add a mapping
  console.log('\n--- Step 4: Add a mapping ---')
  const r4 = await postConfig({ mirrorConfig: { field: 'addMapping', value: { originalProvider: '', originalModel: '', mirrorName: 'test-mirror' } } })
  ok(r4.ok === true, 'POST addMapping returned ok')
  ok(r4.config.mirrorConfig.mappings.length > 0, 'mapping added in response')
  const mappingId = r4.config.mirrorConfig.mappings[0]?.id
  console.log('  Mapping id: ' + mappingId)

  // 5. GET to verify mapping persisted
  console.log('\n--- Step 5: GET to verify mapping persisted ---')
  const r5 = await getConfig()
  ok(r5.config.mirrorConfig.mappings.length > 0, 'mapping persisted to disk ✓')
  ok(r5.config.mirrorConfig.mappings[0]?.mirrorName === 'test-mirror', 'mirrorName persisted ✓')
  ok(r5.config.mirrorConfig.mirrorAllEnabled === true, 'mirrorAllEnabled STILL true (mergePatch fix) ✓')

  // 6. Test fallbackConfig persistence
  console.log('\n--- Step 6: Test fallbackConfig resetModels ---')
  const r6 = await postConfig({ fallbackConfig: { field: 'resetModels', value: true } })
  ok(r6.ok === true, 'POST resetModels returned ok')
  ok(r6.config.fallbackConfig.models.length === 5, 'reset to 5 default models')

  // 7. GET to verify fallback persisted
  console.log('\n--- Step 7: GET to verify fallback persisted ---')
  const r7 = await getConfig()
  ok(r7.config.fallbackConfig.models.length === 5, 'fallback models persisted ✓')
  ok(r7.config.mirrorConfig.mirrorAllEnabled === true, 'mirrorAll STILL true (no cross-contamination) ✓')

  // 8. Cleanup: restore original state
  console.log('\n--- Step 8: Cleanup (restore original state) ---')
  await postConfig({ mirrorConfig: { field: 'mirrorAllEnabled', value: originalMirrorAll } })
  if (mappingId) {
    await postConfig({ mirrorConfig: { field: 'removeMapping', value: mappingId } })
  }
  console.log('  Restored original state')

  // 9. Test /vlm/all-models endpoint
  console.log('\n--- Step 9: Test /vlm/all-models endpoint ---')
  try {
    const amRes = await fetch(BASE + '/vlm/all-models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    })
    const amJson = await amRes.json()
    if (amJson.ok) {
      console.log('  /vlm/all-models returned ' + (amJson.groups?.length || 0) + ' provider groups')
      ok(Array.isArray(amJson.groups), 'all-models groups is array')
    } else {
      console.log('  /vlm/all-models error: ' + (amJson.error || 'unknown'))
      ok(false, '/vlm/all-models should return ok')
    }
  } catch (e) {
    ok(false, '/vlm/all-models endpoint not reachable: ' + e.message)
  }

  // Summary
  console.log('\n=== Summary ===')
  console.log('  Pass: ' + pass)
  console.log('  Fail: ' + fail)
  if (fail > 0) {
    console.log('  ❌ SOME TESTS FAILED')
    process.exit(1)
  } else {
    console.log('  ✅ ALL TESTS PASSED')
  }
}

main().catch(e => { console.error('E2E error:', e); process.exit(1) })
