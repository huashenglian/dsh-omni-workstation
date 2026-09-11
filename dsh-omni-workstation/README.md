# dsh-omni-workstation

<p align="center"><img src="docs/images/cover.jpg" alt="dsh-omni-workstation cover" width="720"></p>

[![version](https://img.shields.io/badge/version-0.1.0-blue)](https://github.com/huashenglian/dsh-omni-workstation)
[![license](https://img.shields.io/badge/license-MIT-green)](#license)
[![platform](https://img.shields.io/badge/platform-DeepSeek%20Harness-orange)](https://github.com/deepseek-ai)

English | [中文](README.zh.md)

An **omni-modal workstation plugin** for [DeepSeek Harness](https://github.com/deepseek-ai) (`dsh`). It gives the AI eyes, a brush, a camera and a voice: image analysis backed by an ordered multi-card VLM failover chain, a 6-tool local vision toolkit, image generation (incl. ComfyUI workflows), multi-card async video generation with an AI tool builder, and TTS / voice cloning across 3 cloud + 4 local providers — all configured from one auto-saving settings page (English / 中文).

## Feature Overview

| Module | Tool | Highlights |
|---|---|---|
| [VLM](docs/features/vlm.md) | `analyze_image` | Ordered API card list, single-request failover, per-card timeout, JPEG→PNG fallback, 28 built-in providers, mirror models, dynamic multimodal adaptation |
| [Vision Toolkit](docs/features/vision-toolkit.md) | `zoom_image` · `sample_colors` · `image_diff` · `ocr_image` · `detect_elements` · `show_image` | 4 tools are pure-local (zero tokens); shared image resolution + card chain; artifact paths only |
| [Image Gen](docs/features/imggen.md) | `generate_image` | OpenAI / DashScope / ComfyUI protocols, multi-workflow management with role mapping, reference-image support, auto verify reminder |
| [Video](docs/features/video.md) | `generate_video` (+ per-card names) | Multi-card (limit 10), 7 protocols, `/build-video-tool` AI builder with `custom-adapter` runtime |
| [Voice](docs/features/voice.md) | `speak` · `clone_voice` | MiMo / MiniMax / Doubao + IndexTTS / GPT-SoVITS / VoxCPM / TTS-WebUI; zero-registration inline & persisted cloning |

Every module has its own switch — turning one off unregisters its tools completely (0 token cost) while keeping your configuration.

## Why a plugin instead of a Skill or a fixed script

| Approach | Typical pain | What this plugin does |
|---|---|---|
| Long Skill text (official-API recipes) | A big instruction dump every turn — expensive tokens | Config lives only in the settings page / `omni-vision.json`; tool schemas inject only when a module is on |
| Fixed scripts (hand-written API calls) | Locked in a project folder; you must restate path and usage each time | Tools register into the harness — the AI finds and reuses them automatically |
| Changing config / switching models | Edit scripts or re-paste the Skill body | Change a field in Settings; it takes effect immediately |

In short: **less context, ready to use, config without code**.

## Custom tools (video)

Today you can AI-build a **custom video tool**: type `/build-video-tool` in chat. The plugin injects a build guide (card limit, existing tools, hard constraints); the AI collects the platform details and writes a new card plus a callable tool — no hand-written script, no re-pasting API docs.

<p align="center">
  <img src="docs/images/video-builder-chat.jpg" width="360" alt="build-video-tool chat example">
</p>

> [!TIP]
> Card limit defaults to 10; the command errors out when the cap is hit. Custom tools run on the `custom-adapter` runtime — see the [video docs](docs/features/video.md).

## Settings Panel

<p align="center">
  <img src="docs/images/omni-panel-vlm.png" width="380" alt="VLM tab">
  <img src="docs/images/omni-panel-imggen.png" width="380" alt="Image Gen tab">
</p>
<p align="center">
  <img src="docs/images/omni-panel-video.png" width="380" alt="Video tab">
  <img src="docs/images/omni-panel-voice.png" width="380" alt="Voice tab">
</p>

**Settings → Omni Workstation** — four tabs (VLM / Image Gen / Video / Voice) plus a global settings tab. Every edit auto-saves and takes effect immediately; no Save button.

## Requirements

- `dsh` CLI (DeepSeek Harness) with a `web` profile installed
- `pnpm` on `PATH` (or use `npx --yes pnpm@<version>`)

## Install

The plugin is a **bundle**: it carries its own `cordis.patch.yml` and self-activates — one command, no manual patch editing.

```bash
# From a local directory
dsh plugin --profile web add ./dsh-omni-workstation

# From GitHub
dsh plugin --profile web add github:huashenglian/dsh-omni-workstation

# From a packed tarball (pnpm pack / npm pack)
dsh plugin --profile web add ./dsh-omni-workstation-0.1.0.tgz
```

`dsh plugin add` installs the dependency and appends the bundle to `dsh.profile.bundles` automatically.

> [!NOTE]
> Do **not** add a manual `- insert: - id: omni-workstation` row to the profile `cordis.patch.yml` — the bundle already inserts it. A second insert throws `duplicate loader entry id: omni-workstation` at boot.
>
> Manual alternative: put the package under `$DSH_HOME/profiles/web/plugins/dsh-omni-workstation/`, add `"dsh-omni-workstation": "file:./plugins/dsh-omni-workstation"` to the profile `package.json` dependencies and `"dsh-omni-workstation"` to the `dsh.profile.bundles` array, run `pnpm install`, then restart `dsh web`.

## Quick Start

1. Restart `dsh web` and open **Settings → Omni Workstation**.
2. On the VLM tab, click **Add Model** (or edit the default card): pick a provider, paste your API key, fetch and pick a model.
3. Send the AI an image (or a local path) and ask about it — the `analyze_image` tool is now live.

All configuration lives in a single JSON file, `omni-vision.json`, stored **inside the plugin installation directory** (git-ignored; contains real API keys — never commit it). The settings page reads and writes this file; you can also edit it directly while `dsh web` is stopped:

```json
{
  "retryCount": 3,
  "vlmEnabled": true,
  "apis": [
    {
      "id": "c_yyy",
      "name": "VLM API",
      "provider": "custom",
      "protocol": "openai-completions",
      "endpoint": "https://api.example.com/v1",
      "apiKey": "sk-...",
      "model": "gpt-4o",
      "timeoutMs": 120000
    }
  ]
}
```

## How It Works

The package is **dual-face**:

- **Host half** (`lib/index.js`) — a cordis plugin: registers tools on the global tools registry and `/omni/*` web routes; loads and persists `omni-vision.json`; provider-gated tool registration re-syncs on config changes.
- **Client half** (`lib/client.js`) — the browser module (loaded via the `dsh.client` entry): registers the **Settings → Omni Workstation** section and its locale namespace (`settings.omni-workstation`).

## Documentation

- [docs/features/vlm.md](docs/features/vlm.md) — VLM analysis, card failover, mirror models, multimodal adaptation (中文)
- [docs/features/vision-toolkit.md](docs/features/vision-toolkit.md) — the 6 vision tools (中文)
- [docs/features/imggen.md](docs/features/imggen.md) — image generation & ComfyUI workflows (中文)
- [docs/features/video.md](docs/features/video.md) — multi-card video generation & `/build-video-tool` (中文)
- [docs/features/voice.md](docs/features/voice.md) — TTS & voice cloning (中文)
- [docs/reference/api.md](docs/reference/api.md) — `/omni/*` API contract
- [docs/changelog/changelog.md](docs/changelog/changelog.md) — changelog

## Uninstall

```bash
dsh plugin --profile web remove dsh-omni-workstation
```

This removes the dependency and the bundle entry. Your `omni-vision.json` config file is left untouched.

## License

MIT
