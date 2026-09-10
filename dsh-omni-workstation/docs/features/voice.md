# 语音合成与音色克隆（speak / clone_voice）

> [English](../../README.md) | [返回功能索引](../../README.zh.md#功能总览)

语音模块提供 `speak`（文本转语音）与 `clone_voice`（音色克隆）两个工具。支持 3 家云端供应商 + 4 个本地供应商动态注册；工具门控为 `voiceEnabled === true && ttsEnabled === true && 配置有效`（默认关，关闭即 0 token）。

![语音设置面板](../images/omni-panel-voice.png)

## 供应商

| 供应商 | 类型 | 端点 | 说明 |
|---|---|---|---|
| `mimo` | 云端 | `https://api.xiaomimimo.com/v1` | 小米 MiMo TTS，OpenAI chat 兼容 |
| `minimax` | 云端 | `https://api.minimaxi.com` | MiniMax 海螺，`/v1/t2a_v2` |
| `doubao` | 云端 | `https://openspeech.bytedance.com` | 豆包 OpenSpeech，V1/V3 双区鉴权 |
| `indextts` | 本地 | `http://127.0.0.1:7880` | IndexTTS，`/api/v1/tts/tasks` |
| `gptsovits` | 本地 | `http://127.0.0.1:9880` | GPT-SoVITS，`/infer_classic` |
| `voxcpm` | 本地 | `http://127.0.0.1:8000` | VoxCPM，`/v1/audio/clone` \| `/v1/audio/design` |
| `tts-webui` | 本地 | 自定义 | OpenAI 兼容 `/v1/audio/speech` 桥接 |

另有 6 家纯预设下拉占位（openai-tts / elevenlabs / azure-tts / google-tts / dashscope / gemini-tts），执行时报错未接入。

**工具注册矩阵**：`speak` 在上述 7 家均注册；`clone_voice` 在 mimo / minimax / doubao / indextts / gptsovits / voxcpm（clone 模式）注册；`tts-webui` 不注册 `clone_voice`。

## 工具：speak

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `text` | string | 是 | 要合成的文本 |
| `voice` | string | | 音色：预置音色 ID（如 `mimo_default`/`茉莉`/`Chloe`）或音色描述文本（voicedesign）；minimax 下为 voice_id，doubao 下为 speaker_id，gptsovits/voxcpm 下为参考音频路径 |
| `voice_sample_path` | string | | 仅 mimo：`clone_voice` 返回的参考音频路径，传入后用克隆音色合成 |
| `style` | string | | 自然语言风格指令（如「温柔但疲惫，语速偏慢」），支持 `(唱歌)` 标签 |
| `output_dir` | string | | 保存目录；不指定则保存到 `<工作区>/.omni-workstation/audio/` |

返回 `{ ok, path, model, format, detail }`。

**MiMo 3 模型**：`mimo-v2.5-tts`（预置音色，含唱歌）/ `mimo-v2.5-tts-voicedesign`（文本设计音色）/ `mimo-v2.5-tts-voiceclone`（音色复刻，传 `voice_sample_path` 时自动切换）。预置音色 9 个：`mimo_default`、冰糖、茉莉、苏打、白桦、Mia、Chloe、Milo、Dean。

## 工具：clone_voice

| 参数 | 类型 | 说明 |
|---|---|---|
| `voice_sample_path` | string | 参考音频本地路径（doubao 不填时用面板预设路径；mimo/minimax 必填） |
| `voice_id` | string | 自定义音色 id（doubao 不填时用预设 speaker_id） |
| `app_id` / `access_key` | string | 仅 doubao：覆盖面板凭据 |
| `text` | string | 试听文本（可选，传了返回 demo_audio） |

各供应商行为：

- **mimo**：确认采样路径 → 后续 `speak` 传 `voice_sample_path` 复用（每次合成内联克隆）。
- **minimax**：上传参考音频（`/v1/files/upload` → `/v1/voice_clone`）注册持久 voice_id → `speak(voice=...)` 复用。
- **doubao**：V1 API 声音复刻（`/api/v1/mega_tts/audio/upload`，音频需 ≥5s）异步训练 → speaker_id → `speak(voice=...)` 复用；复刻区与生成区各自独立协议（V1 App ID+Access Token / V3 KEY）与凭据，命中复刻音色自动用 ICL 模型。
- **indextts / voxcpm**：上传到后端返回音色名/路径 → `speak(voice=...)` 复用。
- **gptsovits**：确认参考音频路径即可（每次合成自动使用，无需独立克隆 API）。

## 配置（voiceConfig）

| 字段 | 默认 | 说明 |
|---|---|---|
| `provider` / `protocol` / `endpoint` | `mimo` / `mimo-tts` / 内置 | 供应商（协议与端点固定） |
| `apiKey` | 空 | 鉴权 Key（doubao 双区：`appId`+`accessKey` 或 `apiKey`） |
| `model` | 空 | 模型（indextts/voxcpm 填 `default`） |
| `voiceId` | `mimo_default` | 默认音色 |
| `timeoutMs` | `120000` | 超时 |
| `styleInstruction` | 空 | 风格指令（面板默认值） |
| `singMode` / `optimizeText` | `false` | 唱歌模式 / 文本优化 |
| `outputFormat` | `wav` | 输出格式（`wav` / `pcm16`） |
| `streamOutput` | `false` | 流式输出 |
| `retryCount` | `1` | 重试 |
| `region` / `apiVersion` | `cn` / `v1` | minimax 区域 / doubao API 版本 |
| `gptModel` / `sovitsModel` / `refAudioPath` / `refText` / `promptLang` / `textLang` | 空/`中文` | GPT-SoVITS 专有 |
| `mode` | `clone` | voxcpm 模式（`clone` / `design`） |

另有：`voicePresets[]`（TTS 预设栏，手动保存快照）、`voiceConfigStt` + `voicePresetsStt`（STT 子页占位）、`voiceLibrary[]`（参考音频库，存 `<配置目录>/voice-library/`）、`doubaoClonePresets[]`（豆包复刻预设：speakerId/refAudioPath/cloneModel/appId/accessToken/apiKey/apiVersion，跨语音预设共享）。

**克隆路由**：`POST /omni/minimax/clone`、`/omni/doubao/clone`、`/omni/indextts/clone`、`/omni/voxcpm/clone`（面板与工具共用）。

## Related

- [README 功能索引](../../README.zh.md#功能总览)
