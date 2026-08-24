# dsh-omni-workstation

English | [中文](README.zh.md)

An **Omni Workstation** plugin for **DeepSeek Harness** (`dsh`). It gives the AI an `analyze_image` tool backed by an ordered list of vision API cards (OpenAI / Anthropic / Gemini protocols, Custom / Ollama providers) with single-request failover, per-card timeout, and a JPEG→PNG re-encode fallback, and adds an auto-saving **Settings → Omni Workstation** page (English/中文).

## Features

- **`analyze_image` tool** registered on the global tools registry — available in every session; hidden automatically when no card is fully configured.
- **Ordered API card list** — multiple cards, each with its own `endpoint` + `apiKey` + `model`, protocol (`openai-completions` / `openai-responses` / `anthropic-messages` / `google-gemini`) and provider (`custom` / `ollama`). Calls go top-down; within a single request a card falls back to the next after exceeding the retry count or hitting an unrecoverable error; every new request restarts from the top card.
- **Per-card timeout** — `timeoutMs` (default 120000 ms, clamp [1000, 3600000]); a slow card is aborted and the next card is tried immediately.
- **JPEG→PNG re-encode fallback** — when a server rejects a JPEG payload with a 400/415 decode error (e.g. llama.cpp `stb_image`), the image is decoded (vendored jpeg-js) and re-encoded as PNG, then the same card is retried once.
- **Auto-saving settings page** — every edit saves and takes effect immediately; no Save button. Also lets you fetch the model list from the endpoint and reorder cards by drag-and-drop.
- **Tabs + module switches** — VLM / Image Gen / Video tabs, each with a module toggle; switching VLM off unregisters `analyze_image` while keeping your configuration intact; switching Video off stops injecting the `generate_video` tool (0 token cost).
- **`generate_video` tool** (v2.8) — text-to-video (t2v) and image-to-video (i2v) via an async-task pipeline: submit → poll → download MP4 into the workspace. Provider presets: Custom (any Sora-compatible relay), Agnes AI / Agnes AI CN (Agnes Video V2.0, tested), Alibaba Bailian (DashScope wan, incl. workspace endpoints), Kling (AccessKey|SecretKey JWT), Volcengine Ark (Seedance), MiniMax Hailuo, **Qwen Token Plan / Qwen Token Plan CN** (OpenAI-compatible `openai-videos` via the Token Plan gateway). The settings **Video** tab lets you configure protocol/endpoint/key/model, timeout/poll interval/retry, default duration/aspect-ratio/resolution, video-model filtering, and async-task fields. Registered only when the Video module switch is ON and a valid API is configured.
- **Provider presets** — custom / Ollama plus **28 built-in fixed providers** (OpenAI, Anthropic, Gemini, Groq, MiniMax, Moonshot, Z.AI, xAI…). Fixed providers have baked-in endpoints & protocol (read-only, shown inline); only the API key, model and timeout are editable.
- **Batch card actions & confirmations** — collapse/expand all and delete all (two-step confirm) next to “Add Model”; per-card delete also asks for confirmation; the model dropdown flips upward near the bottom of the page.
- **Web routes** `/omni/config`, `/omni/models`, `/omni/key` served by the host half.
- **Vision Toolkit** — new in v2.0: 6 AI-callable vision tools (`zoom_image` / `sample_colors` / `image_diff` / `ocr_image` / `detect_elements` / `show_image`), four of which are pure-local and cost zero tokens. Gated by the `visionToolsEnabled` switch (on by default).
- **i18n** — the settings page follows the harness UI language (English / 中文).

## Requirements

- `dsh` CLI (DeepSeek Harness) with a `web` profile installed. Requires `pnpm` on `PATH` (or use `npx --yes pnpm@<version>`).

## Install

The plugin is a **bundle**: it carries its own `cordis.patch.yml` and self-activates. Installing it is a single command — no manual patch editing in the profile.

```bash
# From a local directory
dsh plugin --profile web add ./dsh-omni-workstation

# From GitHub
dsh plugin --profile web add github:huashenglian/dsh-omni-workstation

# From a packed tarball (pnpm pack / npm pack)
dsh plugin --profile web add ./dsh-omni-workstation-1.5.0.tgz
```

`dsh plugin add` installs the dependency and appends the bundle to `dsh.profile.bundles` automatically.

> If `pnpm` is not on `PATH`, run the equivalent manually:
> ```bash
> # in the profile directory (~/.dsh/profiles/web)
> npx --yes pnpm@11.7.0 add file:./plugins/dsh-omni-workstation
> ```
> then add `"dsh-omni-workstation"` to the `dsh.profile.bundles` array in `package.json`.

### Manual placement (alternative)

1. Put the package under `$DSH_HOME/profiles/web/plugins/dsh-omni-workstation/`.
2. Add `"dsh-omni-workstation": "file:./plugins/dsh-omni-workstation"` to the profile `package.json` `dependencies`.
3. Add `"dsh-omni-workstation"` to the profile `dsh.profile.bundles` array.
4. Run `pnpm install` (or `npx --yes pnpm@11.7.0 install`), then restart `dsh web`.

Do **not** add a manual `- insert: - id: omni-workstation` row to the profile `cordis.patch.yml` — the bundle already inserts it. A second insert would throw `duplicate loader entry id: omni-workstation` at boot.

## Configure

All configuration lives in one JSON file: **`omni-vision.json`** — resolved via `configDir()`: the settings document directory when available, else `$DSH_HOME`, else the user home directory (e.g. `C:\Users\<user>\omni-vision.json`).

```json
{
  "retryCount": 5,
  "vlmEnabled": true,
  "imggenEnabled": false,
  "apis": [
    {
      "id": "c_xxx",
      "name": "Local Ollama",
      "provider": "ollama",
      "protocol": "openai-completions",
      "endpoint": "http://127.0.0.1:8080",
      "model": "qwen",
      "collapsed": false,
      "timeoutMs": 600000
    },
    {
      "id": "c_yyy",
      "name": "VLM API",
      "provider": "custom",
      "protocol": "openai-completions",
      "endpoint": "https://api.example.com/v1",
      "apiKey": "sk-...",
      "model": "gpt-4o",
      "collapsed": false,
      "timeoutMs": 120000
    }
  ]
}
```

- `apis` — ordered list of cards (array order = priority, top-down). Fields: `name`, `provider` (`custom` | `ollama`), `protocol` (`openai-completions` | `openai-responses` | `anthropic-messages` | `google-gemini`), `endpoint`, `apiKey` (masked in the settings response; set via the page), `model`, `collapsed`, `timeoutMs`.
- `timeoutMs` — per-card request timeout in ms (default 120000, clamp [1000, 3600000]). On timeout the card is aborted and the next card is tried immediately (no same-card retry).
- `retryCount` — within a single request, how many consecutive failures of one card trigger a fallback to the next card.
- JPEG images that a server rejects with a 400/415 decode error are automatically re-encoded as PNG and the same card retried once.

You can edit the file directly, or use the settings page (all edits auto-save).

## Vision Toolkit

> New in v2.0 — 6 AI-callable vision tools registered by the host half (`lib/vision-tools.js`, via the `buildVisionToolDefs(deps)` factory). They share the same image-resolution (`resolveImage`) and card failover chain (`askVlm`) as `analyze_image`. Gated by `visionToolsEnabled` (on by default — the third Module Switch on the Settings → Omni Workstation page); toggling it off unregisters all 6 tools while keeping your config.

### Tools

| Tool | Key params | Function | Token cost |
|---|---|---|---|
| `zoom_image` | `image_path`/`attachment_id`, `region` (required) | crop & upscale a region, saved to `.omni-workstation/artifacts/zoom_*.png`, returns path/size | local, 0 |
| `sample_colors` | `image_path`/`attachment_id`, `top` (default 8), `region` | dominant color sampling (64×64 + 32-bin quantize) → `[{hex,count,share}]` | local, 0 |
| `image_diff` | `original`, `compare` (path or `sha256:` attachment id), `threshold` (default 16) | 8×8 grid pixel diff → `diffRatio` + `worstRegions` (≤5) + `heatmapPath` | local, 0 |
| `ocr_image` | `image_path`/`attachment_id`, `engine` (`auto`/`local`/`vlm`) | OCR; local Tesseract first, falls back to VLM transcription → `{engine,text}` | local=0; vlm=1 |
| `detect_elements` | `image_path`/`attachment_id`, `target`, `annotate` (default true) | VLM element detection: strict-JSON numbered `[{number,label,box}]` in original pixel coords, optional 2px annotated overlay | VLM 1–2 |
| `show_image` | `image_path`/`attachment_id`, `label` | show an image to the user: inline markdown + attachment block + client toolview card | 0 |

### Workflows

- **detect → zoom → analyze**: `detect_elements` returns numbered boxes; `zoom_image` a region (pass the box as `region`); then `analyze_image` the cropped path for detail.
- **show_image**: display a local/attached/generated image to the user; `generate_image` output can also be fed to `analyze_image`.
- **Chinese OCR**: `engine=auto` prefers local Tesseract (`chi_sim+eng`, `--psm 6`, 20s timeout), falling back to VLM transcription when unavailable or empty (fixed transcription prompt, 8000-char soft cap).

### Config & dependencies

- `visionToolsEnabled` (default `true`) — third Module Switch on the Settings page; off = unregister tools only, config preserved (same pattern as `vlmEnabled`/`imggenEnabled`).
- **Tesseract (optional, local OCR only)** — system install with `chi_sim` data. Probe order (cached once per process): `OMNI_WORKSTATION_TESSERACT` env → `tesseract` on `PATH` → Windows default `C:\Program Files\Tesseract-OCR\tesseract.exe`. Without it, `auto` degrades to VLM; `local` returns `LOCAL_OCR_UNAVAILABLE`.
- **Token optimization** — tools return only compact JSON + artifact paths (never image bytes); tool-produced images (image blocks nested under `tool-result`, e.g. `show_image` output) are rewritten to a one-line text marker instead of being re-uploaded every turn — the model calls `analyze_image` on demand. User-uploaded images are untouched.
- **Naming** — tool names are fully distinct from the reference dsh-vision-router plugin (`vision_crop`/`vision_colors`/`vision_present` are not copied) to avoid harness tool-name collisions.

## How it works

The package is **dual-face**:

- **Host half** (`lib/index.js`) — a cordis plugin. Registers the `analyze_image` tool on the global tools registry and the `/omni/config|models|key` routes on the web server. Loads and persists `omni-vision.json`.
- **Client half** (`lib/client.js`) — the browser module, loaded via `__ModuleLoader__` because the package declares `dsh.client`. Registers a **Settings → Omni Workstation** section (list slot `settings.section`, id `omni-vision`, order 40) and the locale namespace `settings.omni-workstation`.

The bundle `cordis.patch.yml` inserts the `omni-workstation` entry that activates both halves.

## Coexistence with other plugins

This plugin is built to play nicely with other frontend plugins that touch the settings window:

| Resource | Value | Notes |
|---|---|---|
| Loader entry id | `omni-workstation` | unique across the harness |
| Settings slot id | `omni-vision` | the `settings.section` slot is a **list** — multiple sections coexist; only the same `id` would conflict |
| Locale namespace | `settings.omni-workstation` | namespaced by plugin |
| Tool name | `analyze_image` | unique |
| Web routes | `/omni/*` | unique path prefix |
| CSS classes | `omni-*` | global styles, prefixed to avoid collisions |

The harness itself enforces uniqueness (duplicate loader ids, slot ids, tool names, or routes throw and fail loudly) — so two plugins never silently shadow each other.

## Uninstall

```bash
dsh plugin --profile web remove dsh-omni-workstation
```

This removes the dependency and the bundle entry. Your `omni-vision.json` config file is left untouched.

## License

MIT
