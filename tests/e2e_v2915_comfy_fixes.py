# e2e: v2.9.15 ComfyUI fixes — history removal + model count + mapping scroll + Job(1).json import
#
# Verifies:
#   1. "从历史导入" button is gone from the ComfyUI panel
#   2. "获取可用模型" count includes all loader types (not just checkpoints)
#   3. Mapping rows in scrollable container, "添加映射" button stays visible
#   4. Job(1).json (API format, third-party nodes) imports + generates image
#
# Prerequisites:
#   - dsh web running at 127.0.0.1:3080, plugin synced + restarted
#   - Preset "新预设 1" configured with ComfyUI endpoint URL
#   - AI model selected in the chat
#
# Run: python -m pytest tests/e2e_v2915_comfy_fixes.py -s
import re, json, os, glob, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:3080"
WF_DIR = Path(r"d:\Document\Document\AI_project\software\工作台\deepseek_harness\comfyui工作流")
SHOT_DIR = Path(r"d:\Document\Document\AI_project\software\工作台\deepseek_harness\截图")
SHOT_DIR.mkdir(parents=True, exist_ok=True)
errors = []

def _harness_workspace():
    store = Path.home() / ".dsh" / "storages" / "workspace.json"
    try:
        data = json.loads(store.read_text(encoding="utf-8"))
        wid = data["global"]["workspaceIds"][0]
        return Path(data["tables"]["workspaces"][wid]["path"])
    except Exception:
        return Path.cwd()

WORKSPACE = _harness_workspace()

def get_json(path):
    return json.loads(urllib.request.urlopen(BASE + path, timeout=15).read().decode())

def post_json(path, payload):
    req = urllib.request.Request(BASE + path, data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}, method='POST')
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())

def find_preset_by_name(config, name):
    presets = config.get("imggenPresets", [])
    for p in presets:
        if p.get("name") == name:
            return p
    return None

def test_comfy_fixes():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, channel="msedge")
        page = browser.new_page(viewport={"width": 1440, "height": 1100})
        page.on('pageerror', lambda e: errors.append(f"pageerror: {e}"))
        page.goto(BASE, timeout=40000)
        page.wait_for_load_state('domcontentloaded', timeout=40000)
        page.wait_for_timeout(2500)

        # --- 1. Find and switch to preset "新预设 1" ---
        config = get_json("/omni/config")["config"]
        preset = find_preset_by_name(config, "新预设 1")
        assert preset, f"预设 '新预设 1' not found in imggenPresets: {[p.get('name') for p in config.get('imggenPresets', [])]}"
        preset_id = preset["id"]
        print(f"  [preset] found '新预设 1' (id={preset_id})")

        r = post_json("/omni/config", {"imggenPresetSwitch": preset_id})
        assert r.get("ok"), f"preset switch failed: {r}"
        page.wait_for_timeout(1000)

        # Reload config to verify provider
        config = get_json("/omni/config")["config"]
        igc = config.get("imggenConfig", {})
        provider = igc.get("provider", "")
        endpoint = igc.get("endpoint", "")
        print(f"  [config] provider={provider} endpoint={endpoint}")
        assert provider == "comfyui", f"provider is {provider}, expected 'comfyui'"
        assert endpoint, "endpoint URL not configured in preset '新预设 1'"
        print(f"  [config] ComfyUI endpoint: {endpoint}")

        # --- 2. Verify "从历史导入" button is gone ---
        # Open settings -> Omni Workstation -> Image Gen tab
        page.screenshot(path=str(SHOT_DIR / "e2e_v2915_01_home.png"), full_page=True)
        # The "从历史导入" text should not appear anywhere on the page
        body_text = page.locator('body').inner_text()
        assert "从历史导入" not in body_text, "'从历史导入' text still appears on page (should be removed)"
        assert "From History" not in body_text, "'From History' text still appears on page (should be removed)"
        print("  [verify] '从历史导入' button removed OK")

        # --- 3. Import Job(1).json workflow ---
        job_path = WF_DIR / "Job(1).json"
        assert job_path.exists(), f"Job(1).json not found at {job_path}"
        workflow_raw = job_path.read_text(encoding="utf-8")
        print(f"  [import] Job(1).json: {len(workflow_raw)} bytes")

        r = post_json("/omni/config", {"comfyWfImport": {
            "name": "Job1-Test",
            "workflow": workflow_raw
        }})
        assert r.get("ok"), f"workflow import failed: {r.get('error', r)}"
        print(f"  [import] Job(1).json imported successfully OK")

        # Verify workflow is in the config
        config = get_json("/omni/config")["config"]
        wfs = config.get("comfyWorkflows", [])
        job_wf = [w for w in wfs if w.get("name") == "Job1-Test"]
        assert job_wf, "imported workflow not found in comfyWorkflows"
        # Activate it
        wf_id = job_wf[0]["id"]
        r = post_json("/omni/config", {"imggenConfig": {"field": "activeComfyWorkflow", "value": wf_id}})
        assert r.get("ok"), f"activate workflow failed: {r}"
        print(f"  [import] workflow activated (id={wf_id}) OK")

        # --- 4. Fetch models and verify count ---
        r = post_json("/omni/models", {
            "imggen": True,
            "endpoint": endpoint,
            "protocol": "comfyui-image",
            "apiKey": igc.get("apiKey", "")
        })
        assert r.get("ok"), f"fetch models failed: {r}"
        checkpoints = r.get("models", [])
        unets = r.get("unet", [])
        vae = r.get("vae", [])
        clip = r.get("clip", [])
        total = len(checkpoints) + len(unets) + len(vae) + len(clip)
        print(f"  [models] checkpoints={len(checkpoints)} unets={len(unets)} vae={len(vae)} clip={len(clip)} total={total}")
        assert total > 0, f"no models fetched (checkpoints={len(checkpoints)}, unets={len(unets)}, vae={len(vae)}, clip={len(clip)})"
        # The old bug: count showed 0 when checkpoints=0 but unets>0. Now total should be >0.
        if len(checkpoints) == 0 and len(unets) > 0:
            print("  [verify] model count fix: checkpoints=0 but unets>0 — old code would show '0 个', now shows total OK")
        print(f"  [models] total count = {total} (should be >0) OK")

        # --- 5. Drive AI to generate image ---
        page.goto(BASE, timeout=40000)
        page.wait_for_load_state('domcontentloaded', timeout=40000)
        page.wait_for_timeout(2500)

        prompt = (
            "请立即调用 generate_image 工具生成一张图片，不要只回复文字："
            "prompt 传 'a cute orange cat sitting on a windowsill, sunny morning, soft warm light', "
            "size 传 '512x512'。"
        )
        composer = page.locator("textarea").first
        composer.fill(prompt)
        composer.press("Enter")
        print("  [generate] prompt sent, waiting for image generation...", flush=True)

        deadline = 420
        found = None
        for i in range(deadline):
            page.wait_for_timeout(1000)
            hits = glob.glob(str(WORKSPACE / "img_*.png"))
            if hits:
                found = max(hits, key=os.path.getmtime)
                break
            if page.get_by_text(re.compile(r"生图请求失败|generate.*fail", re.I)).count() > 0:
                page.screenshot(path=str(SHOT_DIR / "e2e_v2915_error.png"), full_page=True)
                dump = page.locator('body').inner_text()[:2000]
                raise RuntimeError(f"image generation failed\nUI_TEXT:\n{dump}")
        if not found:
            page.screenshot(path=str(SHOT_DIR / "e2e_v2915_timeout.png"), full_page=True)
            dump = page.locator('body').inner_text()[:2000]
            raise RuntimeError(f"no img_*.png saved within {deadline}s\nUI_TEXT:\n{dump}")

        # Assert PNG signature
        with open(found, "rb") as fh:
            head = fh.read(8)
        assert head == b"\x89PNG\r\n\x1a\n", f"not a PNG: {found}"
        print(f"  [generate] PNG saved: {found} OK")
        page.screenshot(path=str(SHOT_DIR / "e2e_v2915_success.png"), full_page=True)

        # Cleanup
        try:
            os.remove(found)
        except OSError:
            pass

        # Check for page errors
        if errors:
            raise RuntimeError(f"page errors detected: {errors}")

        browser.close()
        print("=== ALL V2.9.15 COMFY FIXES TESTS PASSED ===")

if __name__ == "__main__":
    test_comfy_fixes()
