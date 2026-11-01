# 配置文件参考 — omni-vision.json

> 面向**直接编辑配置文件**的用户（尤其是 CLI / headless 环境：那里没有设置页）。
> 设置页改的也是同一个文件，两种方式等价、可混用。

## 1. 文件位置与优先级

| # | 路径 | 何时生效 |
|---|---|---|
| 1 | `$DSH_OMNI_WORKSTATION_CONFIG_DIR/omni-vision.json` | 仅测试 / 高级覆盖（不写进文档的常规用法） |
| 2 | `~/.dsh/omni-vision.json`（设了 `DSH_HOME` 时是 `$DSH_HOME/omni-vision.json`） | **推荐**。只要文件存在就用它；全新安装也默认写到这里 |
| 3 | `~/.dsh/profiles/<profile>/node_modules/dsh-omni-workstation/omni-vision.json` | 旧位置（v2.5–v2.13）。home 没有配置时继续沿用，不做自动搬家 |

- 优先级在**每次读取时**重新判定：运行期间新建/删除 home 文件，下一次读取就会切换（并在日志里报一行 `config path changed`）。
- 同目录会有：`omni-vision.json.bak`（恢复副本，与主文件同步写）、`omni-vision.schema.json`（本插件自动复制的 JSON Schema）、`voice-library/`（克隆音色样本）、`transcripts/`（STT 字幕测试输出）。
- Windows 示例：`C:\Users\<你>\.dsh\omni-vision.json`。

启动日志示例（`dsh web` 的终端输出、或 `dsh --profile headless "…"` 的 stderr）：

```
[dsh-omni-workstation] config: C:\Users\you\.dsh\omni-vision.json (home) | vlm=on(2 cards) toolkit=on media=off imggen=off video=on(1) tts=off stt=off fallback=on
```

- `(home)` / `(plugin)` / `(home-new)` / `(env)` 说明这次选中的是哪一级。
- 模块全关时会有第二条 warn，指出配置文件里缺什么。
- CLI / headless 面会**多打一行**「无设置页与 /omni 路由，直接编辑 <路径> 即可（存盘自动生效）」（web 面不打印）——该判定延后 2.5s，因为 `webServer` 可能晚于插件提供。

## 2. 生效规则

| 行为 | 说明 |
|---|---|
| 手改生效 | 存盘后**下一个 agent 步**重新读取并重注册工具，不需要重启 `dsh` |
| 语法错误 | 打印路径 + 原始错误，**不覆写你的文件**；内存里回退 `.bak` 继续跑，改好即恢复 |
| 写盘时机 | 设置页保存、首次启动建默认配置、AI 建卡等；写入为「临时文件 + rename」原子替换 |
| `$schema` | 每次写盘由插件补在第一个键，供编辑器补全；手动新建文件时自己加一行即可 |
| 未知字段 | 插件只读取自己认识的字段，多出来的键不会报错（但保存时会被丢弃） |

## 2.1 开关不等于可用（v2.15）

模块开关只决定**上限**。只有当对应配置**完整**时，插件才把工具 schema 交给模型；配置不全等于没配，工具不注册，也就 0 token：

| 模块 | 注册工具需要的完整配置 |
|---|---|
| VLM | 至少一张完整卡片（`endpoint` + `model`，`custom` 还需 `apiKey`）**或** `fallbackConfig.models` 非空 |
| 生图 | `imggenConfig` 完整（`endpoint` + `model` + `apiKey`，ComfyUI / ollama 等免 Key 路线除外） |
| 视频 | 至少一张 `videoCards[]` 的 `enabled !== false` 且 `config` 完整 |
| TTS | `voiceEnabled` + `ttsEnabled` + `voiceConfig` 完整 |
| STT | `voiceEnabled` + `sttEnabled` + `voiceConfigStt` 完整（**`sttEnabled` 默认关**） |
| `analyze_media` | 有卡开启 `video` / `audio` 且协议支持；STT 生效时音频由 `transcribe` 接管 |
| 视觉工具箱本地工具 | `zoom_image` / `sample_colors` / `image_diff` / `show_image` / `show_video`：无需任何配置 |
| 视觉工具箱 VLM 工具 | `ocr_image` / `detect_elements`：需一张完整 VLM 卡片**或** `fallbackConfig.models` 非空 |

**兜底也算配置（D2）**：`fallbackConfig.models` 非空时，即使 `apis[]` 里一张完整卡都没有，`analyze_image`（以及 `ocr_image` / `detect_elements`）仍会注册，用当前会话模型跑兜底链。想彻底不注册就清空 `models`。

## 3. 顶层字段

> 完整机读定义见仓库根 `omni-vision.schema.json`（编辑器补全即来自它）。

| 字段 | 类型 | 默认 | 作用 |
|---|---|---|---|
| `vlmEnabled` | bool | `true` | VLM 模块总开关（只决定上限；见 §2.1 的「开关不等于可用」） |
| `retryCount` | 1–10 | `3` | VLM 单次调用的总尝试次数（含首次） |
| `apis` | array | 1 张空卡 | **VLM 卡片列表**，自上而下失败切换（见 §4） |
| `fallbackConfig` | object | 内置模型列表 | 兜底模型：`{provider, models[], timeoutMs}`。卡片全失败时救援；`models` 非空**也算已配置**（见 §2.1） |
| `globalConfig` | object | 见 §6 | 全局行为：退避、动态多模态适应、显示尺寸等 |
| `visionToolsEnabled` | bool | `true` | 视觉工具箱总开关（本地工具无需配置；`ocr_image` / `detect_elements` 需 VLM 配置） |
| `visionToolToggles` | object | 全 `true` | 逐个工具开关：`zoom_image` / `sample_colors` / `image_diff` / `ocr_image` / `detect_elements` / `show_image` / `show_video` |
| `mirrorConfig` | object | 见 §7 | 镜像模型 / auto-vision 路由 |
| `imggenEnabled` | bool | `true` | 生图模块开关（v2.15 起默认开；还需 `imggenConfig` 完整才注册 `generate_image`） |
| `imggenConfig` | object | `provider=custom` | 生图配置（§5） |
| `videoEnabled` | bool | `true` | 视频模块开关（v2.15 起默认开；无配置完整的视频卡则仍不注册任何视频工具） |
| `videoCards` | array | 1 张默认空卡 | 视频卡片列表（每卡一个工具，上限 `videoCardLimit`） |
| `videoCardLimit` | 1–10 | `10` | 视频卡数量硬顶 |
| `videoBuilderEnabled` | bool | `true` | 是否注册 `/build-video-tool` 斜杠指令（需要 `commands` 服务，headless 无） |
| `voiceEnabled` | bool | `true` | 语音模块总开关（v2.15 起默认开；配置不完整时语音工具仍不注册） |
| `ttsEnabled` | bool | `true` | TTS 子开关（需 `voiceEnabled` + `voiceConfig` 完整） |
| `sttEnabled` | bool | `false` | STT 子开关（需 `voiceEnabled` + `voiceConfigStt` 完整）；默认关，避免指向未启动的本地 FunASR。打开后音频分析一律改走 `transcribe` |
| `voiceConfig` / `voiceConfigStt` | object | 见 §8 | TTS / STT 配置 |
| `voicePresets` / `voicePresetsStt` / `activeVoicePreset` / `activeVoicePresetStt` | — | — | 语音预设池与当前选中项 |
| `voiceLibrary` | array | `[]` | 克隆音色库（`{id,name,provider,samplePath,createdAt}`） |
| `doubaoClonePresets` / `activeDoubaoClonePreset` | — | — | 豆包声音复刻预设（V1/V3 凭据） |
| `comfyWorkflows` / `activeComfyWorkflow` | — | `[]` / `''` | ComfyUI 工作流（通常由设置页导入） |
| `videoPresets` / `imggenPresets` / `videoCustomTypes` | — | 各 1 条 | 视频 / 生图的共享预设池与自定义类型标签 |

## 4. VLM 卡片（`apis[]`）

```json
{
  "id": "c_vlm_main",
  "name": "VLM API",
  "provider": "custom",
  "protocol": "openai-completions",
  "endpoint": "https://api.example.com/v1",
  "apiKey": "sk-...",
  "model": "gpt-4o",
  "timeoutMs": 120000,
  "enabled": true,
  "video": false,
  "audio": false
}
```

| 字段 | 说明 |
|---|---|
| `provider` | 供应商 id。`custom` 需要自己填 `endpoint` + `protocol`；`ollama` 免 Key；其余为内置供应商（URL/协议内置，手写时通常只需 `apiKey` + `model`） |
| `protocol` | `openai-completions`（最常用）/ `openai-responses` / `anthropic-messages` / `google-gemini` |
| `endpoint` | Base URL（含 `/v1`）。内置供应商留空即可 |
| `model` | 模型 id |
| `enabled` | `false` 时该卡不参与失败切换 |
| `video` / `audio` | 允许该卡分析视频 / 音频（`analyze_media`）；STT 开启时音频走 `transcribe` |
| 有效性判定 | `endpoint`（或内置地址）+ `model` + `apiKey`（免 Key 供应商除外）齐全才算有效卡 |

> 没有完整卡片时，只要 `fallbackConfig.models` 非空，`analyze_image` 仍会注册（用当前会话模型跑兜底链，v2.15 起兜底算「已配置」）。

## 5. 生图（`imggenConfig`）

```json
{
  "imggenEnabled": true,
  "imggenConfig": {
    "provider": "openai",
    "protocol": "openai-images",
    "endpoint": "https://api.openai.com/v1",
    "apiKey": "sk-...",
    "model": "gpt-image-1",
    "timeoutMs": 300000,
    "retryCount": 2,
    "responseFormat": "auto"
  }
}
```

- `protocol`：`openai-images` / `openai-completions` / `dashscope-image` / `comfyui-image`（`provider=comfyui` 时自动用 ComfyUI 协议，`provider=bailian` 自动用 DashScope）。
- ComfyUI 额外字段：`vae` / `clip`（留空 = 不注入），工作流在顶层 `comfyWorkflows`。

## 6. 全局（`globalConfig`）

| 字段 | 默认 | 说明 |
|---|---|---|
| `dynamicMultimodalAdapt` | `true` | 按当前会话模型是否声明图片输入切换行为：开启且模型支持图片时 `analyze_image` 会被拒绝（要求直接看图 / `read_image`，除非显式传 `native_vision_failed: true`） |
| `verifyReminder` | `false` | 生图后是否提醒模型立即验证结果 |
| `backoffBase` / `backoffMax` | `800` / `5000` | 普通错误重试退避（毫秒） |
| `backoff429Base` / `backoff429Max` | `2000` / `10000` | 429 限流退避（毫秒） |
| `retryStatusCodes` | `402,408,429,500,502,503,504,NET` | 触发重试的状态码，`NET` = 网络错误 |
| `showImageMaxHeight` / `showVideoMaxHeight` | `420` / `360` | 正文插图 / 视频预览最大高度（px，64–2000；插图实际下限 320，避免旧值 180 把插图压成缩略图） |

## 7. 镜像模型（`mirrorConfig`）

| 字段 | 默认 | 说明 |
|---|---|---|
| `autoVisionEnabled` | `false` | 注册 `auto-vision` 路由：会话模型走本插件的卡片链（v2.15 起默认关，显式写 `true` 仍生效） |
| `mirrorAllEnabled` | `false` | 为每个供应商都生成 `*-omni-workstation` 镜像路由（会让模型列表变长） |
| `mappings` | `[]` | 自定义映射路由（`{id,name,provider,model…}`） |

## 8. 语音（`voiceConfig` / `voiceConfigStt`）

TTS（`voiceConfig`，供应商 `mimo` / `minimax` / `doubao` / `indextts` / `gptsovits` / `voxcpm` / `tts-webui`）：

```json
{
  "voiceEnabled": true,
  "ttsEnabled": true,
  "voiceConfig": {
    "provider": "minimax",
    "endpoint": "https://api.minimaxi.com",
    "apiKey": "sk-...",
    "model": "speech-2.8-hd",
    "voiceId": "",
    "timeoutMs": 120000,
    "retryCount": 1
  }
}
```

STT（`voiceConfigStt`，供应商 `openai` / `groq` / `siliconflow` / `funasr` / `custom`，全部走 OpenAI 兼容 `/audio/transcriptions`）：

```json
{
  "voiceEnabled": true,
  "sttEnabled": true,
  "voiceConfigStt": {
    "provider": "funasr",
    "protocol": "openai-stt",
    "endpoint": "http://127.0.0.1:8000/v1",
    "apiKey": "",
    "model": "sensevoice",
    "outputMode": "text",
    "language": "",
    "hotwords": ""
  }
}
```

- `outputMode`：`text` / `timestamps` / `srt` / `vtt`（后两者落字幕文件到 `transcripts/`）。
- 豆包是双协议：V1 = `appId` + `accessKey`，V3 = `apiKey`，由 `apiVersion` 选择；复刻预设见 `doubaoClonePresets`。

## 9. 编辑器补全 / 校验

1. 插件每次保存都会在文件首键写入 `"$schema": "omni-vision.schema.json"`，并把 schema 复制到同目录 —— VS Code 打开即生效。
2. 你手动新建的文件没有这行时，补一行即可：

   ```json
   { "$schema": "omni-vision.schema.json", "vlmEnabled": true, "...": "..." }
   ```

3. 不想改文件内容，也可以在 VS Code 设置里关联：

   ```json
   {
     "json.schemas": [
       { "fileMatch": ["**/omni-vision.json"], "url": "https://raw.githubusercontent.com/huashenglian/dsh-omni-workstation/main/omni-vision.schema.json" }
     ]
   }
   ```

## 10. 常见排错

| 现象 | 原因 / 处理 |
|---|---|
| 启动日志 `vlm=off`、AI 说没有 analyze_image | `apis` 里没有有效卡：`endpoint`（或内置供应商）+ `model` + `apiKey` 缺一个；或 `vlmEnabled=false` |
| 日志提示「配置仍在插件安装目录（旧位置）」 | 配置在 `node_modules` 里，升级/重装会丢；复制到 `~/.dsh/omni-vision.json` |
| 改完文件没反应 | 看日志是否有 `config reloaded from disk`；没有则是下一次 agent 步才检查（插件不会后台轮询） |
| 日志报 JSON 解析失败 | 按报错的行列修好并存盘即可，你的文件不会被覆盖 |
| 语音 / 视频工具不出现 | 三段门控全开：模块开关 + 子开关 + 配置完整（`videoCards[].config` / `voiceConfig` / `voiceConfigStt`）。v2.15 起开关默认开，所以最常见的原因是配置还没填完 |
| 只想用 OCR / 图片差异等本地工具 | `visionToolsEnabled !== false` 即注册本地 5 个工具（`zoom_image` / `sample_colors` / `image_diff` / `show_image` / `show_video`）；`ocr_image`（本地 Tesseract 可用时）与 `detect_elements` 还需一张完整 VLM 卡片或非空的 `fallbackConfig.models` |