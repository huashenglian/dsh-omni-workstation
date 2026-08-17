# dsh-her-eyes

[English](README.md) | 中文

用于 **DeepSeek Harness**(`dsh`)的视觉语言模型(VLM)分析器插件。为 AI 提供 `analyze_image` 工具,底层接入**有序的视觉 API 卡片列表**(OpenAI / Anthropic / Gemini 协议,自定义 / Ollama 供应商),支持单次请求内回退、每卡超时与 JPEG→PNG 重编码兜底;同时在 Web 设置中新增**设置 → 多模态 (VLM)**面板(自动保存,支持中/英文)。

## 功能

- **`analyze_image` 工具**:注册在全局工具注册表,所有会话可用;无任何有效卡片时自动隐藏。
- **有序 API 卡片列表**:多张卡片,各自独立 `endpoint` + `apiKey` + `model`、协议(`openai-completions` / `openai-responses` / `anthropic-messages` / `google-gemini`)与供应商(`custom` / `ollama`)。请求按列表自上而下;单次请求内单卡重试超限或遇不可恢复错误即回退下一卡;每次新请求重新从顶部开始。
- **每卡超时**:`timeoutMs`(默认 120000 ms,钳制 [1000, 3600000]);慢卡超时后立即中止并尝试下一卡。
- **JPEG→PNG 重编码兜底**:当服务端对 JPEG 载荷报 400/415 解码错误(如 llama.cpp `stb_image`)时,自动解码(vendored jpeg-js)并重编码为 PNG,同卡重试一次。
- **自动保存的设置面板**:每次修改即时保存、立即生效,无需"保存"按钮;支持从端点拉取可用模型列表、拖拽排序卡片。
- **Tab + 模块开关**:VLM / 生图两个 Tab,各自带模块开关;关闭 VLM 即注销 `analyze_image` 工具但保留配置(生图 Tab 为后续模块占位)。
- **供应商预设**:自定义 / Ollama 之外内置 **28 家固定供应商**(OpenAI、Anthropic、Gemini、Groq、MiniMax、Moonshot、Z.AI、xAI 等)。固定供应商端点与协议内置不可改(只读展示),只需填 API Key、模型与超时。
- **批量操作与删除确认**:"添加模型"右侧为批量按钮(收纳全部/展开全部/删除全部,删除需两次确认);单卡删除同样两次确认;页面底部时模型下拉自动向上展开。
- **Web 路由**:宿主半提供 `/vlm/config`、`/vlm/models`、`/vlm/key`。
- **i18n**:设置面板跟随界面语言(中文 / English)。

## 环境要求

- `dsh` CLI(DeepSeek Harness)且已安装 `web` profile;`PATH` 中有 `pnpm`(或用 `npx --yes pnpm@<version>` 代替)。

## 安装

本插件是 **bundle**:自带 `cordis.patch.yml` 并自我激活。安装只需一条命令,无需手动修改 profile 的 patch 文件。

```bash
# 本地目录安装
dsh plugin --profile web add ./dsh-her-eyes

# GitHub 安装
dsh plugin --profile web add github:huashenglian/dsh-her-eyes

# tarball 安装(pnpm pack / npm pack 打包后)
dsh plugin --profile web add ./dsh-her-eyes-1.5.0.tgz
```

`dsh plugin add` 会自动安装依赖,并把该 bundle 追加到 `dsh.profile.bundles`。

> 若 `pnpm` 不在 PATH,可手动等价执行:
> ```bash
> # 在 profile 目录下(约 ~/.dsh/profiles/web)
> npx --yes pnpm@11.7.0 add file:./plugins/dsh-her-eyes
> ```
> 然后在 `package.json` 的 `dsh.profile.bundles` 数组中加入 `"dsh-her-eyes"`。

### 手动放置(备选)

1. 把插件包放到 `$DSH_HOME/profiles/web/plugins/dsh-her-eyes/`。
2. 在 profile 的 `package.json` `dependencies` 加 `"dsh-her-eyes": "file:./plugins/dsh-her-eyes"`。
3. 在 profile 的 `dsh.profile.bundles` 数组加入 `"dsh-her-eyes"`。
4. 运行 `pnpm install`(或 `npx --yes pnpm@11.7.0 install`),重启 `dsh web`。

**不要**在 profile 的 `cordis.patch.yml` 里再加 `- insert: - id: her-eyes` 一行——bundle 已自带。重复 insert 会导致启动时报 `duplicate loader entry id: her-eyes`。

## 配置

所有配置集中在一个 JSON 文件:**`vlm-vision.json`**——由 `configDir()` 解析:优先设置文档目录,其次 `$DSH_HOME`,最后兜底用户主目录(如 `C:\Users\<user>\vlm-vision.json`)。

```json
{
  "retryCount": 5,
  "vlmEnabled": true,
  "imggenEnabled": false,
  "apis": [
    {
      "id": "c_xxx",
      "name": "本地 Ollama",
      "provider": "ollama",
      "protocol": "openai-completions",
      "endpoint": "http://127.0.0.1:8080",
      "model": "qwen",
      "collapsed": false,
      "timeoutMs": 600000
    },
    {
      "id": "c_yyy",
      "name": "VLM API",
      "provider": "custom",
      "protocol": "openai-completions",
      "endpoint": "https://api.example.com/v1",
      "apiKey": "sk-...",
      "model": "gpt-4o",
      "collapsed": false,
      "timeoutMs": 120000
    }
  ]
}
```

- `apis`:有序卡片列表(数组顺序即优先级,自上而下)。字段:`name`、`provider`(`custom` | `ollama`)、`protocol`(`openai-completions` | `openai-responses` | `anthropic-messages` | `google-gemini`)、`endpoint`、`apiKey`(设置响应中打码,通过面板保存)、`model`、`collapsed`、`timeoutMs`。
- `timeoutMs`:每卡请求超时(ms,默认 120000,钳制 [1000, 3600000]);超时即中止并立即尝试下一卡(同卡不重试)。
- `retryCount`:单次请求内,单卡连续失败超过该次数后回退到下一卡。
- 服务端对 JPEG 报 400/415 解码错误时,图片自动重编码为 PNG 并同卡重试一次。

可直接编辑文件,也可用设置面板(所有修改自动保存)。

## 工作原理

本包是**双面**插件:

- **宿主半**(`lib/index.js`):cordis 插件,在全局工具注册表注册 `analyze_image` 工具,在 web server 注册 `/vlm/config|models|key` 路由,读写 `vlm-vision.json`。
- **浏览器半**(`lib/client.js`):浏览器模块,因包声明了 `dsh.client` 由 `__ModuleLoader__` 加载。注册 **设置 → 多模态** 分区(list 槽 `settings.section`,id `vlm-vision`,order 40)与 locale 命名空间 `settings.her-eyes`。

bundle 的 `cordis.patch.yml` 插入的 `her-eyes` 条目同时激活两半。

## 与其他插件共存

本插件面向"其他也会影响前端设置窗口的插件"做了兼容设计:

| 资源 | 取值 | 说明 |
|---|---|---|
| loader 条目 id | `her-eyes` | 全 harness 唯一 |
| 设置槽 id | `vlm-vision` | `settings.section` 是 **list 槽**——多个分区可共存;仅相同 `id` 才会冲突 |
| locale 命名空间 | `settings.her-eyes` | 按插件命名空间隔离 |
| 工具名 | `analyze_image` | 唯一 |
| Web 路由 | `/vlm/*` | 唯一路径前缀 |
| CSS 类 | `vlm-*` | 全局样式,加前缀避免撞名 |

harness 本身会对唯一性做强制校验(重复的 loader id、槽 id、工具名或路由会直接抛错),因此两个插件绝不会互相静默覆盖。

## 卸载

```bash
dsh plugin --profile web remove dsh-her-eyes
```

会移除依赖与 bundle 条目;你的 `vlm-vision.json` 配置文件会保留。

## License

MIT
