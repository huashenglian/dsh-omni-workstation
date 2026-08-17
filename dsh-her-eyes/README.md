# dsh-her-eyes

English | [中文](README.zh.md)

A Vision-Language-Model (VLM) analyzer plugin for **DeepSeek Harness** (`dsh`). It gives the AI an `analyze_image` tool backed by an ordered list of vision API cards (OpenAI / Anthropic / Gemini protocols, Custom / Ollama providers) with single-request failover, per-card timeout, and a JPEG→PNG re-encode fallback, and adds an auto-saving **Settings → Vision Models (VLM)** page (English/中文).

## Features

- **`analyze_image` tool** registered on the global tools registry — available in every session; hidden automatically when no card is fully configured.
- **Ordered API card list** — multiple cards, each with its own `endpoint` + `apiKey` + `model`, protocol (`openai-completions` / `openai-responses` / `anthropic-messages` / `google-gemini`) and provider (`custom` / `ollama`). Calls go top-down; within a single request a card falls back to the next after exceeding the retry count or hitting an unrecoverable error; every new request restarts from the top card.
- **Per-card timeout** — `timeoutMs` (default 120000 ms, clamp [1000, 3600000]); a slow card is aborted and the next card is tried immediately.
- **JPEG→PNG re-encode fallback** — when a server rejects a JPEG payload with a 400/415 decode error (e.g. llama.cpp `stb_image`), the image is decoded (vendored jpeg-js) and re-encoded as PNG, then the same card is retried once.
- **Auto-saving settings page** — every edit saves and takes effect immediately; no Save button. Also lets you fetch the model list from the endpoint and reorder cards by drag-and-drop.
- **Tabs + module switches** — VLM / Image Gen tabs, each with a module toggle; switching VLM off unregisters `analyze_image` while keeping your configuration intact (Image Gen is a placeholder for a future module).
- **Provider presets** — custom / Ollama plus **28 built-in fixed providers** (OpenAI, Anthropic, Gemini, Groq, MiniMax, Moonshot, Z.AI, xAI…). Fixed providers have baked-in endpoints & protocol (read-only, shown inline); only the API key, model and timeout are editable.
- **Batch card actions & confirmations** — collapse/expand all and delete all (two-step confirm) next to “Add Model”; per-card delete also asks for confirmation; the model dropdown flips upward near the bottom of the page.
- **Web routes** `/vlm/config`, `/vlm/models`, `/vlm/key` served by the host half.
- **i18n** — the settings page follows the harness UI language (English / 中文).

## Requirements

- `dsh` CLI (DeepSeek Harness) with a `web` profile installed. Requires `pnpm` on `PATH` (or use `npx --yes pnpm@<version>`).

## Install

The plugin is a **bundle**: it carries its own `cordis.patch.yml` and self-activates. Installing it is a single command — no manual patch editing in the profile.

```bash
# From a local directory
dsh plugin --profile web add ./dsh-her-eyes

# From GitHub
dsh plugin --profile web add github:huashenglian/dsh-her-eyes

# From a packed tarball (pnpm pack / npm pack)
dsh plugin --profile web add ./dsh-her-eyes-1.5.0.tgz
```

`dsh plugin add` installs the dependency and appends the bundle to `dsh.profile.bundles` automatically.

> If `pnpm` is not on `PATH`, run the equivalent manually:
> ```bash
> # in the profile directory (~/.dsh/profiles/web)
> npx --yes pnpm@11.7.0 add file:./plugins/dsh-her-eyes
> ```
> then add `"dsh-her-eyes"` to the `dsh.profile.bundles` array in `package.json`.

### Manual placement (alternative)

1. Put the package under `$DSH_HOME/profiles/web/plugins/dsh-her-eyes/`.
2. Add `"dsh-her-eyes": "file:./plugins/dsh-her-eyes"` to the profile `package.json` `dependencies`.
3. Add `"dsh-her-eyes"` to the profile `dsh.profile.bundles` array.
4. Run `pnpm install` (or `npx --yes pnpm@11.7.0 install`), then restart `dsh web`.

Do **not** add a manual `- insert: - id: her-eyes` row to the profile `cordis.patch.yml` — the bundle already inserts it. A second insert would throw `duplicate loader entry id: her-eyes` at boot.

## Configure

All configuration lives in one JSON file: **`vlm-vision.json`** — resolved via `configDir()`: the settings document directory when available, else `$DSH_HOME`, else the user home directory (e.g. `C:\Users\<user>\vlm-vision.json`).

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

## How it works

The package is **dual-face**:

- **Host half** (`lib/index.js`) — a cordis plugin. Registers the `analyze_image` tool on the global tools registry and the `/vlm/config|models|key` routes on the web server. Loads and persists `vlm-vision.json`.
- **Client half** (`lib/client.js`) — the browser module, loaded via `__ModuleLoader__` because the package declares `dsh.client`. Registers a **Settings → Vision Models (VLM)** section (list slot `settings.section`, id `vlm-vision`, order 40) and the locale namespace `settings.her-eyes`.

The bundle `cordis.patch.yml` inserts the `her-eyes` entry that activates both halves.

## Coexistence with other plugins

This plugin is built to play nicely with other frontend plugins that touch the settings window:

| Resource | Value | Notes |
|---|---|---|
| Loader entry id | `her-eyes` | unique across the harness |
| Settings slot id | `vlm-vision` | the `settings.section` slot is a **list** — multiple sections coexist; only the same `id` would conflict |
| Locale namespace | `settings.her-eyes` | namespaced by plugin |
| Tool name | `analyze_image` | unique |
| Web routes | `/vlm/*` | unique path prefix |
| CSS classes | `vlm-*` | global styles, prefixed to avoid collisions |

The harness itself enforces uniqueness (duplicate loader ids, slot ids, tool names, or routes throw and fail loudly) — so two plugins never silently shadow each other.

## Uninstall

```bash
dsh plugin --profile web remove dsh-her-eyes
```

This removes the dependency and the bundle entry. Your `vlm-vision.json` config file is left untouched.

## License

MIT
