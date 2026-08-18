# Changelog — dsh-her-eyes

> [Back to root AGENTS.md](..)

## v2.0 (当前) — 视觉工具箱（Vision Toolkit）
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
  - 开关2 `mirrorAllEnabled`：每 provider 注册 `*-her-eyes` twin（v1.7 行为，掩盖下方列表）
  - 列表 `mappings`：自定义模型映射（原模型 → 镜像名，默认 `<model>-vision`）
- 新增 `/vlm/all-models` 路由：按 provider 分组返回全部模型（供下拉选择）
- 下拉选择框按 provider 分组显示（小字体类别标题）
- 所有配置热更新：UI 改 → syncTwins → 下一轮对话生效
- 22 单元测试覆盖 normalize/mask/patch/syncTwins 三模式
- 详见 [docs/plan/v1.9-mirror-card.md](./plan/v1.9-mirror-card.md)

### v1.8 → v1.9 Breaking
- `autoSelectTwin` 字段移除（已死代码），替换为 `mirrorConfig.autoVisionEnabled`
- syncTwins 从「always register auto-vision」改为「gated on autoVisionEnabled」
- agent/request 自递归 guard 新增 `her-eyes-m-` 前缀过滤

## v1.8
- `auto-vision` twin 固定化：不再 per-provider mirror，只注册一条 + Auto Vision
- lastSourceProvider/Model 追踪通过 agent/request event；stream 委派给最近使用的源
- Help modal 支持分组折叠导航 + search popup float-out dropdown + clear button
- light-dark 浅色主题适配：搜索浮窗、结果项、空状态、group titles 等完整覆盖
- i18n: zh/en 双语言覆盖所有文档节点

### v1.7 → v1.8 Breaking
- twin 路由名从 `<provider>-her-eyes` → `auto-vision`
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
