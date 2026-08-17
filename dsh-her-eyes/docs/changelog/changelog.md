# Changelog — dsh-her-eyes

> [Back to root AGENTS.md](..)

## v1.8 (当前)
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
