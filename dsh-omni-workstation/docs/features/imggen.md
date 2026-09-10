# 图像生成（generate_image）

> [English](../../README.md) | [返回功能索引](../../README.zh.md#功能总览)

生图模块为 AI 提供 `generate_image` 工具：生成图片并保存到工作区，返回文件路径。支持 OpenAI 兼容、DashScope 原生与 ComfyUI 工作流三种路线。

![生图设置面板](../images/omni-panel-imggen.png)

## 工具：generate_image

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `prompt` | string | 是 | 图像生成提示词（内容、风格、构图、色调） |
| `size` | string | | 尺寸，如 `1024x1024` / `1792x1024`；留空用模型默认 |
| `n` | number | | 生成数量，默认 1（钳制 1–4） |
| `reference_image` | string | | 参考图路径；传入后以图生图模式生成 |
| `output_dir` | string | | 保存目录；不指定则保存到 `<工作区>/.omni-workstation/images/` |

返回 `{ ok, paths[], model, attempts, verifyReminder, verifyReminderMode }`。生成后按验证模式注入提醒（VLM 开 → `analyze_image` 验证；多模态模型或 VLM 关 → 「必须立即视觉验证此图片…」）。

## 协议与供应商

协议 4 种：`openai-images` / `openai-completions` / `dashscope-image` / `comfyui-image`。

| 供应商 | 协议 | 说明 |
|---|---|---|
| `custom` | 任选 | 自定义端点（openai 族自动补 `/v1`） |
| `ollama` | openai-completions | 本地，免 Key |
| `comfyui` | comfyui-image（固定） | 本地 ComfyUI，免 Key，UI 隐藏协议字段 |
| `bailian` | dashscope-image（固定） | 阿里云百炼原生异步任务（workspace 专属域名自动重写为标准域名） |
| 28 家固定供应商 | 见 VLM 文档 | 与 VLM 卡片共用同一张供应商表，端点内置只读 |

## 配置（imggenConfig）

| 字段 | 默认 | 说明 |
|---|---|---|
| `provider` / `protocol` | `custom` / `openai-images` | 供应商与协议 |
| `endpoint` | 空 | 端点 URL |
| `apiPath` | 空 | API 路径，默认按协议取 `/images/generations` 或 `/chat/completions` |
| `apiKey` | 空 | API Key |
| `model` | 空 | 模型名 |
| `vae` / `clip` | 空 | ComfyUI VAELoader / CLIPLoader 文件（空 = 不注入） |
| `timeoutMs` | `300000` | 请求超时 |
| `retryCount` | `2` | 重试次数（≤10） |
| `responseFormat` | `auto` | `auto`（优先 b64_json，url 立即下载）/ `b64_json` / `url` |
| `filterImageModels` | `true` | 获取模型时按关键词筛选（含 image 的模型） |

另有 `imggenPresets[]` 预设栏（手动「保存」快照，运行时配置为真值源）。

**模块开关**：`imggenEnabled`（默认关）。开启且配置有效时才注册工具（0 token 门控）。

## ComfyUI 工作流（comfyWorkflows[]）

`comfyWorkflows` 为顶层配置（独立于预设），每项：

| 字段 | 说明 |
|---|---|
| `id` / `name` | 标识与显示名 |
| `workflow` | 工作流 JSON 字符串（API 格式） |
| `uiWorkflow` | UI 格式快照（可选） |
| `mapping` | 角色到节点的映射（见下） |
| `customMappings[]` | 自定义字段注入：`{ label, nodeId, field, valueType, value, options[] }` |
| `steps` / `cfg` / `scheduler` / `seed` | 快捷注入字段（空 = 不注入） |

**角色映射键**：`sampler`、`checkpoint`、`unet`、`vae`、`clip`、`latent`、`positive`、`negative`。映射值支持 `string`（节点 id）或 `{ node, field }`（覆盖字段名）。映射缺失的键在 UI 的 `missing` 区展示。

**导入**：工作流 JSON 文件导入（`comfyWfImport.prepared` 通道，预解析后入库）；从 ComfyUI `/history` 导入的路由已在 v2.9.15 移除，文件导入是唯一方式。

**注入守卫**：latent 类节点仅当键存在才写 `batch_size`；采样器 seed 自适应（`noise_seed` 等）；三方自定义节点工作流无需本地转换即可重放。

## 工件目录约定

- `generate_image` → `<工作区>/.omni-workstation/images/`

## Related

- [VLM 图像分析](vlm.md) —— 生图后的视觉验证提醒
