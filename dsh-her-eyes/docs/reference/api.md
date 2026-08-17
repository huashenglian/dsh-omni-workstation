# API 参考 (v1.8)

> [Back to root AGENTS.md](..)

## /vlm/config — `GET + POST`

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

## /vlm/models (`POST`)
- **无额外 body**：按当前配置请求 `/models`
- query params？无。
- **响应体**：`{ ok, models: [...] }` — 模型 ID 列表

## /vlm/key (`POST`)
- **请求**: `{ cardId: string }` 或 `{ imggen: true }`
- **响应**: `{ ok: boolean, apiKey: string }` — 解密后的真实 key

## 工具定义

- **analyze_image(image_path, attachment_id, question)**：分析本地文件或对话上传的图片。二者互斥（attachment_id 优先）；question 必填。output.schema 中 usage 非 required → 无时必须省略该键。
- **generate_image(prompt, size, n)**：生成图片。prompt 必填。保存到 `{cwd}/generated-images/img_<ts>_<i>.png`。render 用 markdown `![Generated Image](file:///...)`。
