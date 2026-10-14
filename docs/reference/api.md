# API 参考 (v1.8)

> [Back to root AGENTS.md](..)

## /omni/config — `GET + POST`

返回配置（masked），POST 支持增量 patch。

| PATCH type | 含义 |
|---|---|
| `patchCard: {id, field, value}` | 修改指定卡片的某个字段 |
| `addCard: {}` | 添加新卡片 |
| `deleteCard: {id}` | 删除指定卡片 |
| `reorderCard: {id, from, to}` | 重排顺序（仅内部拖拽） |
| `apis: []` | 全量覆写（含批量删除全部 = `[]`） |

### GET 返回字段
- `config`：masked 配置对象（apiKeyPresent/removed → `apiKeySet:true/false`）
- `visible`：VLM 模块是否可见（shouldVlm gate）
- `twinVisible`：auto-vision twin 是否在 picker 中显示（=shouldVlm）
- `imggenVisible`：生图模块是否可见
- `globalConfig`、`fallbackConfig`、`version`

### POST 返回
与 GET 相同的 config 结构，但只包含本次 patch 后的值。可选参数**必须省略 `required` 键**。

## /omni/models (`POST`)
- **无额外 body**：按当前配置请求 `/models`
- `{ stt: true }`（v2.13）：拉 STT 模型列表。端点按当前 `voiceConfigStt` 供应商（固定端点或 `args.endpoint`）；响应 `{ ok, models: [...] }`，关键词过滤（whisper/transcribe/asr/sensevoice/paraformer/speech），空结果回退未过滤全量，取前 100。
- query params？无。
- **响应体**：`{ ok, models: [...] }` — 模型 ID 列表

## /omni/key (`POST`)
- **请求**: `{ cardId: string }` 或 `{ imggen: true }` / `{ video: true }` / `{ voice: true }` / `{ stt: true }`
- **响应**: `{ ok: boolean, apiKey: string }` — 解密后的真实 key（`stt: true` 返回 `voiceConfigStt.apiKey`）

## /omni/stt/test (`POST`)（v2.13）
- **请求**: `{ base64: string, name?: string }` — 音频 base64（**仅 base64，无路径分支**，防任意本地文件直传第三方端点）；`name` 默认 `recording.webm`
- **响应**: `{ ok, text, language, filePath, duration, segments }`；`filePath` 仅在 `outputMode` 为 `srt`/`vtt` 时非空，落 `<配置目录>/transcripts/`
- 错误：配置无效 / 缺 base64 / 超大小上限 / 不支持的格式 → `400 { ok:false, error }`

## 工具定义

- **analyze_image(image_path, attachment_id, question)**：分析本地文件或对话上传的图片。二者互斥（attachment_id 优先）；question 必填。output.schema 中 usage 非 required → 无时必须省略该键。
- **generate_image(prompt, size, n)**：生成图片。prompt 必填。保存到 `{cwd}/generated-images/img_<ts>_<i>.png`。render 用 markdown `![Generated Image](file:///...)`。
- **transcribe(audio_path, attachment_id, language, hotwords)**（v2.13）：语音转文字。audio_path / attachment_id 二选一（attachment_id 优先）；language / hotwords 可选覆盖面板配置。门控 `voiceEnabled && sttEnabled && isSttConfigValid(voiceConfigStt)`。输出样式由 `voiceConfigStt.outputMode` 决定（text / timestamps / srt / vtt）；srt/vtt 落 `<cwd>/.omni-workstation/transcripts/`。STT 有效时 `analyze_media` 音频通道被接管（视频不受影响）。
