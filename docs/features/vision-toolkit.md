# 视觉工具箱（Vision Toolkit）

> [English](../../README.md) | [返回功能索引](../../README.zh.md#功能总览)

7 个 AI 可调用视觉工具，与 `analyze_image` 共享同一套图片来源解析（`resolveImage`：本地路径 / `sha256:` 附件 id）与卡片回退链。其中 5 个纯本地计算，零 token 成本。由 `visionToolsEnabled` 开关（默认开，第三模块开关）控制，另支持每个工具独立开关（`visionToolToggles`）。

## 工具一览

| 工具 | 关键参数 | 功能 | token 成本 |
|---|---|---|---|
| `zoom_image` | `region`（必填） | 裁剪放大局部区域，另存 PNG 并返回路径 | 本地，0 |
| `sample_colors` | `top`（默认 8）、`region` | 主色调采样（64×64 缩放 + 量化） | 本地，0 |
| `image_diff` | `original`、`compare`（必填） | 两图 8×8 网格像素对比 + 热力图 | 本地，0 |
| `ocr_image` | `engine`（`auto`/`local`/`vlm`） | 图片文字提取（OCR） | local=0；vlm=1 |
| `detect_elements` | `target`、`annotate` | VLM 元素检测，编号边界框 | VLM 1–2 |
| `show_image` | `image_paths`、`label` | 向用户展示图片，可一次多张（仅展示不分析） | 0 |
| `show_video` | `video_path`、`label` | 在对话中渲染视频播放器（仅展示不分析） | 0 |

所有工具产出图片统一落盘 `<工作区>/.omni-workstation/images/`（`zoom_*.png` / `annot_*.png` / diff 热力图），返回紧凑 JSON + 工件路径，不回传图片字节。

## 参数明细

### zoom_image —— 局部放大

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `image_path` / `attachment_id` | string | 二选一 | 图片来源 |
| `region` | string | 是 | `"x1,y1,x2,y2"`；四项均在 0~1 之间按宽高分数处理，否则按原图像素；越界自动夹紧 |

返回 `{ ok, path, width, height, source_width, source_height }`。典型用法：`detect_elements` 拿到 box → `zoom_image` 放大 → `analyze_image` 细看。

### sample_colors —— 色调采样

| 参数 | 类型 | 说明 |
|---|---|---|
| `top` | number | 返回颜色数，默认 8（上限 64） |
| `region` | string | 限定采样区域（同 zoom_image 语义，可选） |

返回 `colors: [{ hex, count, share }]`，适用于判断配色、主题或背景色。

### image_diff —— 像素对比

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `original` | string | 是 | 基准图：本地路径或 `sha256:` 附件 id |
| `compare` | string | 是 | 待对比图 |
| `threshold` | number | 差异阈值（平均 RGB 距离 0~442），默认 16 |

返回 `{ diffRatio, diffCells, worstRegions[{cell, box, score}]（≤5）, heatmapPath }`。

### ocr_image —— OCR 文字提取

| 参数 | 类型 | 说明 |
|---|---|---|
| `engine` | string | `auto`（默认，本地优先、失败降级 VLM）/ `local`（仅本地）/ `vlm`（仅视觉模型） |

仅返回图中文字内容，不用于理解图片整体（那是 `analyze_image` 的事）。本地引擎为 Tesseract（`chi_sim+eng`）。

**Tesseract 探测顺序**（进程内缓存一次）：环境变量 `OMNI_WORKSTATION_TESSERACT` → PATH 上的 `tesseract` → Windows 默认 `C:\Program Files\Tesseract-OCR\tesseract.exe`。未安装时 `auto` 自动降级 VLM，`local` 返回 `LOCAL_OCR_UNAVAILABLE`。

### detect_elements —— 元素检测

| 参数 | 类型 | 说明 |
|---|---|---|
| `target` | string | 检测对象类型描述，默认「可交互元素与主要可见对象」 |
| `annotate` | boolean | 是否绘制 2px 标注框，默认 true |

VLM 返回严格 JSON 的编号数组 `[{ number, label, box }]`，坐标为原图像素（超过 4MP 自动降采样后仍按原尺寸换算）；每项 clamp 并取前 20。解析失败会用更强提示词重试一次。

### show_image —— 图片展示

| 参数 | 类型 | 说明 |
|---|---|---|
| `image_path` / `attachment_id` | string | 单张图片来源（二选一） |
| `image_paths` | string[] | 一次展示多张的路径数组，**最多 8 张**；非空时优先于 `image_path` / `attachment_id` |
| `label` | string | 展示标题，默认「图片」 |

在对话中内联显示图片（markdown + 附件块 + 工具卡片），不分析内容。

多图时工具卡片内**横向并排**渲染（可换行）；单张解析失败只让该张显示错误标记，其余照常显示。返回 `{ ok, path, width, height, count, images[] }`——`path`/`width`/`height` 始终是首张（兼容单图），`images[]` 为全部图片。

### show_video —— 视频展示

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `video_path` | string | 是 | 视频文件路径（绝对路径，或相对当前工作目录） |
| `label` | string | | 展示标题，默认「视频」 |

在对话中渲染内嵌播放器（仅展示，不分析视频内容——需要理解内容请用 `analyze_media`）。播放器默认暂停且不显示原生控件，**hover 才显示**底部进度条（可点击跳转）、全屏按钮、画面中央播放键与右下角暂停键；全屏为**页面内更大模态**（非浏览器原生全屏）。视频字节经 `POST /omni/media`（base64 JSON，**32 MB** 上限，限定当前工作区内路径）取回。工具结果只出文本块。

## 展示尺寸设置

设置 → **工具设置** 里为两个展示类工具各提供一个最大高度输入：

| 配置键 | 适用工具 | 默认 | 范围 |
|---|---|---|---|
| `showImageMaxHeight` | `show_image` | 180 | 64–2000 px |
| `showVideoMaxHeight` | `show_video` | 360 | 64–2000 px |

两个值只影响工具卡片的展示尺寸，不进任何工具 schema，无 token 成本。

## Token 优化机制

- 工具只返回紧凑 JSON + 工件路径，绝不回传图片字节。
- `agent/pre-step` 对 tool-result 里的图片块改写为单行文本标记（防止每轮重复上传），模型需要时按路径调 `analyze_image`；用户上传的图片不受影响。
- 当前模型为多模态（`inputModalities` 含 image）且动态多模态适应开启时，跳过 sanitize，模型直接看图。

## Related

- [VLM 图像分析](vlm.md) —— 卡片链与 `analyze_image` 主工具
