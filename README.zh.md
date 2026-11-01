<div align="center">

<img src="docs/images/cover.jpg" alt="dsh-omni-workstation 封面" width="720" />

# dsh-omni-workstation

[![version](https://img.shields.io/badge/version-0.1.2-blue)](https://github.com/huashenglian/dsh-omni-workstation)
[![license](https://img.shields.io/badge/license-MIT-green)](#license)
[![platform](https://img.shields.io/badge/platform-DeepSeek%20Harness-orange)](https://github.com/deepseek-ai)

用于 [DeepSeek Harness](https://github.com/deepseek-ai)（`dsh`）的**全模态工作台插件**。给 AI 装上眼睛、画笔、摄像机和嗓音：图像分析由有序多卡片 VLM 回退链驱动，配备 6 个本地视觉工具、图像生成（含 ComfyUI 工作流）、多卡片异步视频生成（带 AI 工具构建指令）以及覆盖 3 家云端 + 4 个本地供应商的语音合成与音色克隆——全部在一个自动保存的设置页（中/英文）完成配置。

[English](README.md) | 中文

[安装](#安装) · [快速开始](#快速开始) · [功能](#功能总览) · [文档](#文档) · [工作原理](#工作原理)

</div>

---

## 安装

本插件是 **bundle**：自带 `cordis.patch.yml` 并自我激活——一条命令完成，无需手动修改 profile 的 patch 文件。

```bash
# 本地目录安装
dsh plugin --profile web add ./dsh-omni-workstation

# GitHub 安装
dsh plugin --profile web add github:huashenglian/dsh-omni-workstation

# tarball 安装（pnpm pack / npm pack 打包后）
dsh plugin --profile web add ./dsh-omni-workstation-0.1.2.tgz
```

`dsh plugin add` 会自动安装依赖，并把该 bundle 追加到 `dsh.profile.bundles`。

> [!NOTE]
> **不要**在 profile 的 `cordis.patch.yml` 里再加 `- insert: - id: omni-workstation` 一行——bundle 已自带，重复 insert 会导致启动时报 `duplicate loader entry id: omni-workstation`。
>
> 手动放置（备选）：把插件包放到 `$DSH_HOME/profiles/web/plugins/dsh-omni-workstation/`，在 profile 的 `package.json` `dependencies` 加 `"dsh-omni-workstation": "file:./plugins/dsh-omni-workstation"`，并把 `"dsh-omni-workstation"` 加入 `dsh.profile.bundles` 数组，运行 `pnpm install` 后重启 `dsh web`。

重启 `dsh web` 后打开 <http://127.0.0.1:3080>。若还没有 `dsh` CLI，可直接启动 web 服务：

```bash
npx @deepseek-ai/dsh web
```

## 环境要求

- `dsh` CLI（DeepSeek Harness）且已装 `web` profile——或任意 CLI/headless profile（见 [CLI / headless](#cli--headless无浏览器)）
- `PATH` 中有 `pnpm`（或用 `npx --yes pnpm@<version>` 代替）

## 快速开始

1. 重启 `dsh web`，打开 **设置 → 全模态**。
2. 在 VLM Tab 点「添加模型」（或编辑默认卡片）：选供应商、粘贴 API Key、获取并选择模型。
3. 给 AI 发一张图片（或一个本地路径）并提问——`analyze_image` 工具已就绪。

## 配置文件

所有配置都在**一个 JSON 文件** `omni-vision.json` 里。设置页会读写它；在纯终端（CLI/headless）环境里，它是**唯一**的配置入口——不需要记任何斜杠指令。

**文件位置**（优先级由高到低）：

| # | 路径 | 何时生效 |
|---|---|---|
| 1 | `$DSH_OMNI_WORKSTATION_CONFIG_DIR/omni-vision.json` | 仅测试 / 高级覆盖用 |
| 2 | `~/.dsh/omni-vision.json`（设了 `DSH_HOME` 则是 `$DSH_HOME/omni-vision.json`） | **推荐**；只要存在就用它，新装也默认写这里 |
| 3 | `~/.dsh/profiles/<profile>/node_modules/dsh-omni-workstation/omni-vision.json` | 旧位置（v2.5–v2.13）；home 没有配置时继续沿用 |

Windows 示例：`C:\Users\<你>\.dsh\omni-vision.json`。插件持久化的其它东西都在**同一个目录**：`omni-vision.json.bak`（恢复副本）、`omni-vision.schema.json`（编辑器补全）、`voice-library/`（克隆音色样本）、`transcripts/`（STT 输出）。

> [!TIP]
> - **手改文件存盘即生效，不用重启**：插件在下一个 agent 步重新读取配置并重注册工具。
> - 启动日志会打印实际使用的路径与各模块是否生效，例如 `[dsh-omni-workstation] config: /home/you/.dsh/omni-vision.json (home) | vlm=on(2 cards) toolkit=on …`；不确定用的是哪份就看它。
> - JSON 语法写错时会报出路径，并且**绝不会覆写你的文件**——插件在内存里用上一份好的 `.bak` 继续跑，等你改好。
> - 文件里有真实 API Key：切勿提交。每次保存插件都会写入 `"$schema": "omni-vision.schema.json"`（编辑器补全 + 校验）；只有在你用别的方式新建/编辑该文件时，才需要手动补这一行（详见[配置参考](docs/reference/configuration.md)）。
> - 想把旧位置的配置搬到稳定位置：`cp ~/.dsh/profiles/web/node_modules/dsh-omni-workstation/omni-vision.json ~/.dsh/`（PowerShell：`Copy-Item <源> ~/.dsh/omni-vision.json`）。之后 home 文件优先。

手写最小配置——一张 VLM 卡片就能让 `analyze_image` 生效：

```json
{
  "retryCount": 3,
  "vlmEnabled": true,
  "apis": [
    {
      "id": "c_yyy",
      "name": "VLM API",
      "provider": "custom",
      "protocol": "openai-completions",
      "endpoint": "https://api.example.com/v1",
      "apiKey": "sk-...",
      "model": "gpt-4o",
      "timeoutMs": 120000
    }
  ]
}
```

## CLI / headless（无浏览器）

只要组合提供了 `tools` + `llm`，插件就能加载——**不需要** web 服务。没有 web 面的组合里不存在 `/omni/*` 路由与设置页，所以直接改文件：

```bash
# 装进 CLI profile（profile 名随意，例如 headless）
dsh plugin --profile headless add github:huashenglian/dsh-omni-workstation

# 在 ~/.dsh/omni-vision.json 里写好一张有效 VLM 卡片后：
dsh --profile headless "描述一下 ./screenshot.png"
```

- `analyze_image`、6 个视觉工具、`generate_image` / `generate_video`、`speak` / `clone_voice` / `transcribe` 都能用——同样由配置文件里的开关门控。
- 仅浏览器可用的部分：设置页、`/omni/*` HTTP 路由、`show_image` / `show_video` 的可视化预览（工具本身仍可用，会返回工件路径）、`/build-video-tool` 斜杠指令。
- web 与 CLI profile 读**同一份**文件，配一次到处可用。

## 功能总览

| 模块 | 工具 | 亮点 |
|---|---|---|
| [VLM 图像分析](docs/features/vlm.md) | `analyze_image` | 有序 API 卡片链、单请求内回退、每卡超时、JPEG→PNG 重编码兜底、28 家内置供应商、镜像模型、动态多模态适应 |
| [视觉工具箱](docs/features/vision-toolkit.md) | `zoom_image` · `sample_colors` · `image_diff` · `ocr_image` · `detect_elements` · `show_image` | 4 个纯本地工具零 token 成本；共享图片来源解析与卡片链；只返回工件路径 |
| [图像生成](docs/features/imggen.md) | `generate_image` | OpenAI / DashScope / ComfyUI 三种路线、多工作流管理 + 角色映射、参考图、生图后自动视觉验证提醒 |
| [视频生成](docs/features/video.md) | `generate_video`（+每卡片独立工具名） | 多卡片（上限 10）、7 种协议、`/build-video-tool` AI 构建指令与 `custom-adapter` 运行时 |
| [语音](docs/features/voice.md) | `speak` · `clone_voice` · `transcribe` | MiMo / MiniMax / 豆包 + IndexTTS / GPT-SoVITS / VoxCPM / TTS-WebUI；零注册内联克隆与持久化克隆；语音转文字走一套 OpenAI 兼容协议（默认本地 FunASR，无需 Key） |

每个模块都有独立开关（默认开，STT 子开关默认关），但开关只是上限：关闭即完全注销工具；配置不完整时工具同样不会注册（0 token），已有配置完整保留。

## 为何选插件，而不是 Skill / 固定脚本

| 方式 | 常见痛点 | 本插件的做法 |
|---|---|---|
| 长文 Skill（照官方 API 配置） | 每轮会话都要塞一大段说明，token 贵 | 配置只在设置页 / `omni-vision.json`；工具 schema 按模块开关注入 |
| 固定脚本（手写 API 调用） | 脚本锁在某个项目目录，每次还得口头告诉 AI 路径和用法 | 工具注册进 harness，AI 在会话里自动发现、直接复用 |
| 改配置 / 换模型 | 改脚本或重贴 Skill 正文 | 改设置页字段即可，即时生效 |

简言之：**少占上下文、开箱即用、改配置不改代码**。

## 工具自定义（视频）

当前支持 AI 辅助构建**自定义视频工具**：在聊天框输入 `/build-video-tool`，插件会注入构建指南（含卡片上限、现有工具等硬约束），AI 按指南收集平台信息并写入新卡片与可调用工具——无需你手写脚本或再贴一遍 API 文档。

<p align="center">
  <img src="docs/images/video-builder-chat.jpg" width="360" alt="build-video-tool 对话示意">
</p>

> [!TIP]
> 卡片上限默认 10；已达上限时指令会直接报错。自定义工具走 `custom-adapter` 运行时，详见 [视频文档](docs/features/video.md)。

## 设置面板

<p align="center">
  <img src="docs/images/omni-panel-vlm.png" width="380" alt="VLM 面板">
  <img src="docs/images/omni-panel-imggen.png" width="380" alt="生图面板">
</p>
<p align="center">
  <img src="docs/images/omni-panel-video.png" width="380" alt="视频面板">
  <img src="docs/images/omni-panel-voice.png" width="380" alt="语音面板">
</p>

**设置 → 全模态**——四个 Tab（VLM / 生图 / 视频 / 语音）加全局设置 Tab。每次修改即时保存、立即生效，无需「保存」按钮。

## 工作原理

本包是**双面结构**：

- **宿主半**（`lib/index.js`）——cordis 插件：在全局工具注册表注册工具；加载并持久化 `omni-vision.json`（见[配置文件](#配置文件)）；配置变化（包括运行中手改文件）时自动重同步注册。`/omni/*` Web 路由只在存在 `webServer` 的组合（web / desktop）里注册；CLI 与 headless 组合拿到工具但没有 HTTP 面。
- **浏览器半**（`lib/client.js`）——浏览器模块（经 `dsh.client` 入口加载）：注册 **设置 → 全模态** 区块及其语言命名空间（`settings.omni-workstation`）。

## 文档

- [docs/reference/configuration.md](docs/reference/configuration.md) —— 配置文件全部字段、位置优先级、CLI 最小配置
- [docs/features/vlm.md](docs/features/vlm.md) —— VLM 分析、卡片回退、镜像模型、多模态适应
- [docs/features/vision-toolkit.md](docs/features/vision-toolkit.md) —— 6 个视觉工具
- [docs/features/imggen.md](docs/features/imggen.md) —— 图像生成与 ComfyUI 工作流
- [docs/features/video.md](docs/features/video.md) —— 多卡片视频生成与 `/build-video-tool`
- [docs/features/voice.md](docs/features/voice.md) —— 语音合成与音色克隆
- [docs/reference/api.md](docs/reference/api.md) —— `/omni/*` API 契约
- [docs/changelog/changelog.md](docs/changelog/changelog.md) —— Changelog

## 卸载

```bash
dsh plugin --profile web remove dsh-omni-workstation
```

移除依赖与 bundle 条目。位于 `~/.dsh/omni-vision.json` 的配置**会保留**（想连 API Key 一起清掉就手动删）；仍在插件安装目录里的旧配置随插件一起移除。

## License

MIT
