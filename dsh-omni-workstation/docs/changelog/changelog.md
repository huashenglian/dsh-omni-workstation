# Changelog — dsh-omni-workstation

> [Back to root AGENTS.md](..)

## v2.8.4 — qwen-token-plan 供应商改走百炼（DashScope）通道
- **问题**：v2.8.3 新增的 `qwen-token-plan` / `qwen-token-plan-cn` 供应商（视频 + 生图）误用 Token Plan OpenAI 兼容网关（`token-plan.*.maas.aliyuncs.com/compatible-mode/v1`），而非百炼（DashScope）通道。参考官方文档 [配置 API Key](https://platform.qianwenai.com/docs/api-reference/preparation/export-api-key-env)：Qwen 平台即百炼，API Key = `DASHSCOPE_API_KEY`，Base URL = `https://dashscope.aliyuncs.com`
- **视频修复**：`VIDEO_PROVIDERS` / `VIDEO_PROVIDERS_UI` 中 `qwen-token-plan` / `qwen-token-plan-cn` 协议由 `openai-videos` 改为 `dashscope-video`（原生异步任务），端点改为 `https://dashscope.aliyuncs.com`，`fixedUrl` 改为 `false`（支持 workspace 专属域名，同 `dashscope` 供应商）；applyPatch 端点预填条件泛化为所有 `fixedUrl:false` 供应商
- **生图/VLM 修复**：`PROVIDERS` / `PROVIDERS_UI` 中 `qwen-token-plan` / `qwen-token-plan-cn` 端点由 `token-plan.*.maas.aliyuncs.com/compatible-mode/v1` 改为 `https://dashscope.aliyuncs.com/compatible-mode/v1`（DashScope OpenAI 兼容通道）
- 新增 applyPatch 端点预填单测；更新 qwen 视频请求体单测（`dashscope-video` 协议 + DashScope 端点）；全套 151 例通过

## v2.8.3 — 视频协议改名 + 生图/视频新增通义千问 (Qwen) Token Plan 供应商
- **视频协议显示名修正**：`openai-videos` 协议在设置面板的显示名由「openai-videos（Sora 兼容中转站 / Agnes）」改为「openai-videos（openai兼容）」（en: "openai-videos (OpenAI-compatible)"），更准确反映其 OpenAI 兼容本质
- **生图供应商新增 Qwen**：在 `IMGGEN_PROVIDER_IDS_UI` 过滤中加入 `qwen-token-plan` / `qwen-token-plan-cn`（复用 VLM 面板既有 Token Plan 端点，OpenAI 兼容网关；生图走 `openai-images` 协议，选中即锁定协议/端点）
- **视频供应商新增 Qwen**：`VIDEO_PROVIDERS` / `VIDEO_PROVIDERS_UI` 增加 `qwen-token-plan`（海外 `token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1`）与 `qwen-token-plan-cn`（国内 `token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1`），协议锁定 `openai-videos`（Sora 风格，POST {base}/videos），端点/协议固定，仅填 API Key + 模型；下拉分组（海外 / 国内）
- 配置参考 VLM 面板 qwen-token-plan 供应商与官方文档（DASHSCOPE_API_KEY + DashScope base url）；新增 qwen 视频归一化/校验/请求体单测；全套 150 例通过
- 详见 [docs/plan/v2.8-video.md](../plan/v2.8-video.md)

## v2.8.2 — VLM 卡片菜单收纳修复 + 视频面板交互/筛选/布局修复
- **修复 VLM 卡片菜单触发收纳**：ApiCard 的 '...' 菜单项（置顶/沉底/删除）补 `e.stopPropagation()`——此前点击菜单项冒泡到卡片头 `toggleCollapse` 导致卡片意外收纳；现点击菜单项后卡片收纳/展开状态保持不变
- **视频面板外点关闭**：模型下拉/供应商下拉纳入主外点关闭 effect（此前漏了 `videoOpenDd/videoOpenProv`，点空白不关）；VideoPanel 补齐 reset 菜单与预设下拉的外点关闭（镜像生图面板）
- **文案**：「仅显示生视频模型」→「仅显示视频模型」，hint 说明自动排除 t2i/生图模型
- **筛选关键词修正**：内联正则抽成纯函数 `filterVideoModelIds()`（export + 单测）——先排除 `t2i|wanx|image|img|seedream|dall|flux|cogview` 生图系，再保留 `t2v|i2v|video|sora|wan|kling|hailuo|seedance|cogvideo|veo|vidu`；修复裸 `wan` 放过 wan2.2-t2i/wanx 系生图模型的坑
- **移除分辨率 UI + 参数行合并**：删除设置面板「分辨率」字段（分辨率由 AI 经 generate_video `resolution` 参数自行决定；后端 cfg.resolution 归一化保留供 volc/minimax 协议缺省）；轮询间隔 (s)｜重试次数｜默认时长 (s)｜画幅 合并为一行 4 字段水平对齐
- **面板参数 = 初始默认，用户提示词优先**：`buildVideoToolDef(vc)` 动态注入面板初始默认（时长/画幅/重试）到工具描述并声明「用户明确要求时以用户要求为最高优先级」；新增 `resolution` 工具参数；注册处按 videoSig 变更重注册（seconds/aspectRatio/retryCount 变化时刷新描述）
- **wan2.7-i2v 排查结论（上游问题）**：关闭筛选拉全量，dashscope compatible-mode 返回 100 模型，**无 wan2.7-i2v 且无任何 i2v/t2v 视频模型**（仅 wan2.7-image-pro/wan2.7-image 生图系）——该模型未在上游 /v1/models 上架，非插件 bug
- 新增 3 例单测（filterVideoModelIds / args 覆盖 / 工具描述注入）；全套 149 例通过；截图 `截图/v2_8x_*.jpg`
- 详见 [docs/plan/v2.8-video.md](../plan/v2.8-video.md) 与 [docs/decisions.md](../../../docs/decisions.md)

## v2.8.1 — 模型下拉交互统一 + 视频面板 UI 对齐生图 + 视频预设
- **模型选择下拉统一（VLM / 生图 / 视频）**：模型输入框右侧新增/常驻「▾」指示图标按钮（点击开合下拉；列表未拉取时自动触发「获取可用模型」）；点击「获取可用模型」拉取成功即自动弹出下拉列表（三面板同款交互）
- **视频面板 UI 重排对齐生图（规范）**：删除长说明段落；新增预设管理行（预设名输入 + ▾ 菜单 + ＋新增 + 垃圾桶删除）+ 分隔线；布局统一为「供应商｜超时 → 内置端点 → API Key 整行（眼睛内嵌）→ 模型整行（输入框 + ▾ + 获取按钮同行）→ 过滤开关独占行 → 轮询间隔｜重试次数 → 默认时长｜（留空）→ 画幅｜分辨率」；async-task 字段改双列；底部状态行改多段「·」分隔（生视频有效配置 · 工具已启用/隐藏 · 可用模型 N 个）
- **视频真预设功能**：host 半 `videoPresets` + `activeVideoPreset`（normalize/mask/applyPatch：videoPresetSwitch/Add/Delete/Rename，videoConfig patch 同步到 active preset）；client 预设行 + handlers，与生图 imggenPresets 对齐
- **生图下拉健壮性**：模型下拉列表内容由 `modelOpts`（comfy 分支）回退到 `modelList`，避免残留 unet mapping 导致下拉无法渲染
- 新增视频预设单测 3 例（默认预设/同步/patch 管理）；全套 146 例通过
- 详见 [docs/plan/v2.8-video.md](../plan/v2.8-video.md)

## v2.8.0 — 视频生成面板 + generate_video 工具（全模态扩展）
- **新增设置页「视频」tab**（替换占位）：供应商下拉分组（通用-自定义 / 海外-Agnes AI、Agnes AI CN / 国内-阿里云百炼、可灵、火山引擎、MiniMax 海螺）、协议下拉（内置供应商锁定）、endpoint（fixed 只读 / dashscope 可编辑）、API Key（password+眼睛）、模型（自由输入+获取可用模型）、超时/轮询间隔/重试、默认时长/画幅/分辨率、视频模型过滤开关、async-task 专属字段组、重置、状态行（zh/en i18n 全量）
- **新增 `generate_video` 工具**（t2v + i2v 双能力）：`prompt` 必填 + `image`（首帧图，本地路径或公网 URL）+ `seconds`/`aspect_ratio`/`output_dir`；异步任务 submit → poll → 下载 mp4 → 写入工作区 `video_<ts>.mp4`（复用 sessionCwd，不回退 process.cwd()）
- **6 协议适配**：`openai-videos`（Sora 兼容中转站 / Agnes V2.0，Agnes 完成时经 `/agnesapi?video_id=` 解析 cos 下载地址，实测）、`dashscope-video`（百炼 wan，workspace host 重写为标准域名）、`kling-video`（AccessKey|SecretKey JWT HS256，Node crypto 零依赖）、`volc-video`（方舟 content tasks，图片 base64 data URL）、`minimax-video`（两步取片 /v1/files/retrieve）、`async-task`（自配提交/轮询路径与字段，{id} 占位）
- **门控**：`videoEnabled !== true` 或配置无效时 **generate_video 完全不注册**（tool schema 不注入 → 0 token），复用 imggen 模式；`/omni/config` 返回 `videoVisible`；`/omni/models` 支持 `{video:true}`（按 video/t2v/i2v/wan/kling 等过滤）；`/omni/key` 支持 `{video:true}`
- **配置模型**：`videoConfig{provider,protocol,endpoint,apiKey,model,timeoutMs:600000,pollIntervalMs:5000,retryCount:1,filterVideoModels,seconds:5,aspectRatio:'16:9',resolution:'720p',submitPath,pollPath,taskIdField,statusField,resultField,doneStatus}` + `videoEnabled`（默认 false）
- **单测**：新增 `tests/video-config.test.js` 33 例（normalize/mask/validity/applyPatch/门控/6 协议请求体快照/轮询 URL/状态归一化/task id 提取/JWT/num_frames）
- **E2E 浏览器自动化**（Agnes CN agnes-video-v2.0 + bailian-LLM）：设置面板 UI/供应商分组/真实 key 保存 → 对话驱动 generate_video → 提交/轮询//agnesapi 解析 → mp4 落盘（ftyp 头验证 1.2MB）→ 门控 OFF/ON 断言
- 详见 [docs/plan/v2.8-video.md](../plan/v2.8-video.md) 与 [docs/decisions.md](../docs/decisions.md)

## v2.7.4 — 镜像路由适配新 harness 的 prepareCall 契约
- **修复**：切换镜像模型发送消息报错 `registration.adapter.prepareCall is not a function`。新版 dsh CLI 的 agent-loop 对每个请求走 `llm.prepareCall → adapter.prepareCall`（旧版不走此路径，重装新版后暴露）
- 三个 twin 工厂（auto-vision / per-provider / mapping）全部补齐 `prepareCall(provider, model, signal)`：尽力向源 adapter 委托能力元数据查询（contextWindow 等），再按 `normalizeModelInfo` 契约重标 provider=镜像路由、id=请求模型、强制 `inputModalities:['text','image']`；返回的 `stream` 复用既有委托逻辑
- 新增 2 个回归测试（prepareCall 元数据形状 + 源 provider/id 不泄漏）

## v2.7.3 — 恢复生图验证提醒开关（toolVisible 门控）
- 恢复「生图后自动验证提醒」完整链路：设置页开关、`globalConfig.verifyReminder` 默认值/normalize/patch handler、generate_image 输出 schema + ⚠️ render 块、zh/en i18n
- 与 v2.7.2 解耦成果兼容：提醒文本仅在 analyze_image 实际注册时追加（execute 门控改为 `gc.verifyReminder !== false && toolVisible`，替代旧的 `cfg.vlmEnabled !== false`）——VLM 关闭**或**无有效卡片时不再产生死指令；开关标签标注「需 VLM 开启」

## v2.7.2 — 视觉工具箱与 VLM 开关解耦；移除生图验证提醒
- **视觉工具箱在 VLM 模块关闭时保持可用**（注册本就独立于 `vlmEnabled`；本次修复的是引用链）：
  - 图片 marker（用户上传 / show_image 会话表面 sanitize）不再硬编码 analyze_image——按 `toolVisible` 动态指向：VLM 开启时指 analyze_image，关闭时指视觉工具箱本地工具（zoom/sample_colors/image_diff/ocr/detect，ocr/detect 走卡片链不依赖 VLM 开关）
  - VLM 关闭且工具箱开启时，状态行显示「analyze_image 已停用 · 视觉工具箱仍可用」（新 i18n key `toolOffToolkit` zh/en）
- **移除「生图后自动验证提醒」**（绑定 analyze_image，VLM 关闭即失效）：删 `globalConfig.verifyReminder` 默认值/normalize/mask、generate_image 输出 schema 字段 + render ⚠️ 块 + execute 返回字段、patch handler 分支、设置页开关行、zh/en i18n；工具描述去掉「必须立即调用 analyze_image 验证」；删除过时 smoke_verify_reminder.mjs

## v2.7.1 — 设置菜单更名 全模态 + 视觉工具箱默认开启
- 设置导航 zh `多模态` → `全模态`、en `Multimodal` → `Omni Workstation`（含 fallback label）；intro/helpVlmContent 文案对齐全模态工作台
- `visionToolsEnabled` 默认开启（运行时 config 显式置 true；代码默认 `!== false` 不变）
- E2E 脚本路由随更名 `/vlm/*` → `/omni/*`、`text=多模态` 点击 → `text=全模态`
- `.credentials.yaml` 扁平化修复（`{version, refs}` 嵌套 → 顶层 `KEY: value`，匹配加载器契约）

## v2.7 — 插件更名 dsh-her-eyes → dsh-omni-workstation（全模态工作台）
- 包名/目录 `dsh-her-eyes` → `dsh-omni-workstation`；entry id `her-eyes` → `omni-workstation`；locale ns `settings.her-eyes` → `settings.omni-workstation`
- 功能前缀全量统一：路由 `/vlm/*` → `/omni/*`；CSS `vlm-*` → `omni-*`；settings slot `vlm-vision` → `omni-vision`；toolview 插槽 `vlm-view-*` → `omni-view-*`；twin 路由 `*-her-eyes`/`her-eyes-m-*` → `*-omni-workstation`/`omni-workstation-m-*`
- 环境变量：`DSH_HER_EYES_CONFIG_DIR` → `DSH_OMNI_WORKSTATION_CONFIG_DIR`；`HER_EYES_TESSERACT` → `OMNI_WORKSTATION_TESSERACT`
- 工件目录 `.her-eyes/artifacts/` → `.omni-workstation/artifacts/`；配置 `vlm-vision.json` → `omni-vision.json`（git 忽略；真实 API key 不提交）
- **保留不变**（功能语义，非品牌）：配置 schema 键 `vlmEnabled`/`imggenEnabled`/`visionToolsEnabled`；OCR engine 枚举 `vlm`；工具名 `analyze_image` 等 7 个
- 同步脚本更名 `sync-her-eyes-*.ps1` → `sync-omni-workstation-*.ps1`（目标路径随插件名更新）
- 安装副本 `.dsh/profiles/web/*/dsh-her-eyes` → `dsh-omni-workstation`

## v2.6.1 — 会话工作目录解析修复（generate_image 首调即成功）
- harness **不填充 `exec.agent.meta.cwd`**（web 会话实测为空）→ 新增 `sessionCwd(exec)` 回退链 `agent.meta.cwd → agent.session.header.cwd → agent.session.cwd`
- `generate_image` / `resolveImage` / dashscope refImage / vision-tools `saveArtifact` / `show_image` 全部改用；不回退 process.cwd()（输出必须落已打开工作区）
- 修复后云端 E2E（bailian-LLM）首次调用无需 output_dir 即成功，`output-dir-errors=0`
- 详见 [docs/decisions.md](../docs/decisions.md) v2.6.1 条目

## v2.0 (历史) — 视觉工具箱（Vision Toolkit）
- 新增 6 个 AI 可调用视觉工具（`lib/vision-tools.js`，`buildVisionToolDefs(deps)` 工厂，与 analyze_image 共享 resolveImage/askVlm 回退链）：
  - `zoom_image`：局部裁剪放大落盘 `zoom_*.png`（region 分数/像素两语义）— 纯本地 0 token
  - `sample_colors`：主色调采样（64×64 + 32-bin 量化，可选 region）— 纯本地 0 token
  - `image_diff`：8×8 网格像素对比 + worstRegions(≤5) + 热力图落盘 — 纯本地 0 token
  - `ocr_image`：engine=auto 本地 Tesseract（chi_sim+eng, psm6, 20s）优先，失败/为空降级 VLM 转写（8000 字符软上限）；engine=local/vlm 显式
  - `detect_elements`：VLM 严格 JSON 编号元素 [{number,label,box}] 原图像素坐标，>4MP 降采样，解析失败重试一次，box clamp + 2px 循环调色板标注图
  - `show_image`：markdown 内联 + attachment 块 + 客户端 toolview 卡片（首挂载即显示图片；含 sanitize marker 附件 id 提取兜底 + 就绪重试 + 状态复位）
- 配置新增 `visionToolsEnabled`（默认 true，normalize/mask/applyPatch 支持，Settings Module Switches 第三行开关）
- token 优化：工具只返回紧凑 JSON + 工件路径；`agent/pre-step` 处理器两层 tool-result 图片 sanitize —— ① `session.append('tool/result',…,{surfaceOp:{op:'replace'}})` 影子替换会话表面含 image 的 tool/result 事件（拦 `deriveMessages()` 与 compaction）；② 改写当步 claimed 消息里的工具图片块为短文本标记。**注意**：`agent/request` 只返回 provider/model 配置（messages 在其后才注入），第一版放那里的剥离器经 E2E 证明无效（show_image 后 compaction 报 UNSUPPORTED_CONTENT）
- client.js 注册 `tool.call.toolview` 卡片（show_image 预览 + zoom/diff/detect 元数据卡，插槽缺失静默降级）
- `lib/vendor/png.js` 新增 `decodePng`（8-bit 非隔行 color type 0/2/3/4/6，PNG_UNSUPPORTED 错误码）
- `package.json` files 增加 `lib/vision-tools.js`
- 新增 5 个测试文件（png-decode / vision-helpers / vision-local-tools / vision-ocr / vision-tool-gate），全量 101 测试通过
- 浏览器 E2E（模型 魔搭/deepseek-v4-flash-0731）：5 工具全部调用成功且协同闭环，最终中文总结正常生成，无 UNSUPPORTED_CONTENT 类错误
- 详见 [docs/plan/v2.0-vision-tools.md](./plan/v2.0-vision-tools.md)

## v1.9 (历史) — Mirror Model Card
- 新增「镜像模型」卡片（兜底模型下方，默认收纳）
- 三个独立模式控制 `/model` 镜像条目：
  - 开关1 `autoVisionEnabled`：auto-vision 单例（v1.8 行为，默认 ON 向后兼容）
  - 开关2 `mirrorAllEnabled`：每 provider 注册 `*-omni-workstation` twin（v1.7 行为，掩盖下方列表）
  - 列表 `mappings`：自定义模型映射（原模型 → 镜像名，默认 `<model>-vision`）
- 新增 `/omni/all-models` 路由：按 provider 分组返回全部模型（供下拉选择）
- 下拉选择框按 provider 分组显示（小字体类别标题）
- 所有配置热更新：UI 改 → syncTwins → 下一轮对话生效
- 22 单元测试覆盖 normalize/mask/patch/syncTwins 三模式
- 详见 [docs/plan/v1.9-mirror-card.md](./plan/v1.9-mirror-card.md)

### v1.8 → v1.9 Breaking
- `autoSelectTwin` 字段移除（已死代码），替换为 `mirrorConfig.autoVisionEnabled`
- syncTwins 从「always register auto-vision」改为「gated on autoVisionEnabled」
- agent/request 自递归 guard 新增 `omni-workstation-m-` 前缀过滤

## v1.8
- `auto-vision` twin 固定化：不再 per-provider mirror，只注册一条 + Auto Vision
- lastSourceProvider/Model 追踪通过 agent/request event；stream 委派给最近使用的源
- Help modal 支持分组折叠导航 + search popup float-out dropdown + clear button
- light-dark 浅色主题适配：搜索浮窗、结果项、空状态、group titles 等完整覆盖
- i18n: zh/en 双语言覆盖所有文档节点

### v1.7 → v1.8 Breaking
- twin 路由名从 `<provider>-omni-workstation` → `auto-vision`
- listModels 返回 1 项不再是全量镜像
- syncTwins 不再每 provider 注册一个 twin，改为 auto-vision 单例 no-op

## v1.5–v1.6 (历史)
- tabbed settings + imggen module + batch card actions + fixed provider presets
- generate_image tool (`prompt/size/n`) and openai-images / openai-completions protocols
- mergePatch collision fix：多字段联动必须走 commitStructure({apis: full})

(详见 [docs/plan/v1.4-1.6.md](./plan/v1.4-1.6.md))

## v1.3 (历史)
- apis: Card[] 替代 api: {primary, backup} — 数组优先级从上到下
- 首次实现 single-request failover + JPG→PNG re-encode fallback
