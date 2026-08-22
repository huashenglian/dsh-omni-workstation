# Changelog — dsh-omni-workstation

> [Back to root AGENTS.md](..)

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
