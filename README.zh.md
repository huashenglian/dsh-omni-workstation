# dsh-omni-workstation

[English](README.md) | 中文

用于 **DeepSeek Harness**(`dsh`)的全模态工作台(Omni Workstation)插件。为 AI 提供 `analyze_image` 工具,底层接入**有序的视觉 API 卡片列表**(OpenAI / Anthropic / Gemini 协议,自定义 / Ollama 供应商),支持单次请求内回退、每卡超时与 JPEG→PNG 重编码兜底;同时在 Web 设置中新增**设置 → 全模态**面板(自动保存,支持中/英文)。

## 功能

- **`analyze_image` 工具**:注册在全局工具注册表,所有会话可用;无任何有效卡片时自动隐藏。
- **有序 API 卡片列表**:多张卡片,各自独立 `endpoint` + `apiKey` + `model`、协议(`openai-completions` / `openai-responses` / `anthropic-messages` / `google-gemini`)与供应商(`custom` / `ollama`)。请求按列表自上而下;单次请求内单卡重试超限或遇不可恢复错误即回退下一卡;每次新请求重新从顶部开始。
- **每卡超时**:`timeoutMs`(默认 120000 ms,钳制 [1000, 3600000]);慢卡超时后立即中止并尝试下一卡。
- **JPEG→PNG 重编码兜底**:当服务端对 JPEG 载荷报 400/415 解码错误(如 llama.cpp `stb_image`)时,自动解码(vendored jpeg-js)并重编码为 PNG,同卡重试一次。
- **自动保存的设置面板**:每次修改即时保存、立即生效,无需"保存"按钮;支持从端点拉取可用模型列表、拖拽排序卡片。
- **Tab + 模块开关**:VLM / 生图 / 视频 三个 Tab,各自带模块开关;关闭 VLM 即注销 `analyze_image` 工具但保留配置;关闭视频即停止注入 `generate_video` 工具(0 token 消耗)。
- **`generate_video` 工具**(v2.8):文生视频(t2v)与图生视频(i2v),异步任务流水线(提交 → 轮询 → 下载 MP4 到工作区)。内置供应商:自定义(任意 Sora 兼容中转站)、Agnes AI / Agnes AI CN(Agnes Video V2.0,已实测)、阿里云百炼(DashScope wan,支持 workspace 专属端点)、可灵(AccessKey|SecretKey JWT)、火山方舟(Seedance)、MiniMax 海螺。设置页「视频」Tab 可配置协议/端点/Key/模型、超时/轮询间隔/重试、默认时长/画幅/分辨率、视频模型过滤与 async-task 字段;仅当视频模块开关开启且配置有效时注册工具。
- **供应商预设**:自定义 / Ollama 之外内置 **28 家固定供应商**(OpenAI、Anthropic、Gemini、Groq、MiniMax、Moonshot、Z.AI、xAI 等)。固定供应商端点与协议内置不可改(只读展示),只需填 API Key、模型与超时。
- **批量操作与删除确认**:"添加模型"右侧为批量按钮(收纳全部/展开全部/删除全部,删除需两次确认);单卡删除同样两次确认;页面底部时模型下拉自动向上展开。
- **Web 路由**:宿主半提供 `/omni/config`、`/omni/models`、`/omni/key`。
- **视觉工具箱（Vision Toolkit）**:v2.0 新增 6 个 AI 可调用视觉工具(`zoom_image` / `sample_colors` / `image_diff` / `ocr_image` / `detect_elements` / `show_image`),其中 4 个本地工具零 token 成本;由 `visionToolsEnabled` 开关(默认开启)控制。
- **i18n**:设置面板跟随界面语言(中文 / English)。

## 环境要求

- `dsh` CLI(DeepSeek Harness)且已安装 `web` profile;`PATH` 中有 `pnpm`(或用 `npx --yes pnpm@<version>` 代替)。

## 安装

本插件是 **bundle**:自带 `cordis.patch.yml` 并自我激活。安装只需一条命令,无需手动修改 profile 的 patch 文件。

```bash
# 本地目录安装
dsh plugin --profile web add ./dsh-omni-workstation

# GitHub 安装
dsh plugin --profile web add github:huashenglian/dsh-omni-workstation

# tarball 安装(pnpm pack / npm pack 打包后)
dsh plugin --profile web add ./dsh-omni-workstation-1.5.0.tgz
```

`dsh plugin add` 会自动安装依赖,并把该 bundle 追加到 `dsh.profile.bundles`。

> 若 `pnpm` 不在 PATH,可手动等价执行:
> ```bash
> # 在 profile 目录下(约 ~/.dsh/profiles/web)
> npx --yes pnpm@11.7.0 add file:./plugins/dsh-omni-workstation
> ```
> 然后在 `package.json` 的 `dsh.profile.bundles` 数组中加入 `"dsh-omni-workstation"`。

### 手动放置(备选)

1. 把插件包放到 `$DSH_HOME/profiles/web/plugins/dsh-omni-workstation/`。
2. 在 profile 的 `package.json` `dependencies` 加 `"dsh-omni-workstation": "file:./plugins/dsh-omni-workstation"`。
3. 在 profile 的 `dsh.profile.bundles` 数组加入 `"dsh-omni-workstation"`。
4. 运行 `pnpm install`(或 `npx --yes pnpm@11.7.0 install`),重启 `dsh web`。

**不要**在 profile 的 `cordis.patch.yml` 里再加 `- insert: - id: omni-workstation` 一行——bundle 已自带。重复 insert 会导致启动时报 `duplicate loader entry id: omni-workstation`。

## 配置

所有配置集中在一个 JSON 文件:**`omni-vision.json`**——由 `configDir()` 解析:优先设置文档目录,其次 `$DSH_HOME`,最后兜底用户主目录(如 `C:\Users\<user>\omni-vision.json`)。

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

## 视觉工具箱（Vision Toolkit）

> v2.0 新增。6 个 AI 可调用视觉工具由宿主半 `lib/vision-tools.js`(通过 `buildVisionToolDefs(deps)` 工厂)注册,与 `analyze_image` 共享同一套图片来源解析(`resolveImage`)与视觉模型卡片回退链(`askVlm`)。由设置页「全模态」Module Switches 第三行开关 `visionToolsEnabled`(默认开启)控制,关闭即注销全部 6 工具但保留配置。

### 工具一览

| 工具 | 关键参数 | 功能 | token 成本 |
|---|---|---|---|
| `zoom_image` | `image_path`/`attachment_id`、`region`(必填) | 局部裁剪放大,落盘 `.omni-workstation/artifacts/zoom_*.png`,返回路径/尺寸 | 纯本地,0 |
| `sample_colors` | `image_path`/`attachment_id`、`top`(默认 8)、`region` | 主色调采样:64×64 缩放 + 32-bin 量化,返回 `[{hex,count,share}]` | 纯本地,0 |
| `image_diff` | `original`、`compare`(路径或 `sha256:` 附件 id)、`threshold`(默认 16) | 8×8 网格像素对比:`diffRatio` + `worstRegions`(≤5) + 热力图 `heatmapPath` | 纯本地,0 |
| `ocr_image` | `image_path`/`attachment_id`、`engine`(`auto`/`local`/`vlm`) | 文字识别;本地 Tesseract 优先,失败/为空自动降级 VLM 转写,返回 `{engine,text}` | local=0;vlm=1 次 |
| `detect_elements` | `image_path`/`attachment_id`、`target`、`annotate`(默认 true) | VLM 元素检测:严格 JSON 返回编号 `[{number,label,box}]`(原图像素坐标),可选画 2px 标注框落盘 | VLM 1–2 次 |
| `show_image` | `image_path`/`attachment_id`、`label` | 把图片展示给用户:markdown 内联 + 附件块 + 客户端 toolview 卡片 | 0 |

### 协同工作流示例

- **detect → zoom → analyze**:先 `detect_elements` 拿到元素编号与边界框,对感兴趣区域调 `zoom_image`(把 box 坐标作为 `region`)放大,再 `analyze_image` 细看该区域细节。
- **show_image 展示**:把本地图片、附件或 `generate_image` 生成的图片传给 `show_image`,用户在对话中直接看到;`generate_image` 产出的图片同样可喂给 `analyze_image` 继续分析。
- **OCR 中文场景**:`engine=auto` 时优先本地 Tesseract(`chi_sim+eng`,`--psm 6`,20s 超时),未安装或识别为空再降级到视觉模型转写(固定转写 prompt,8000 字符软上限)。

### 配置与依赖

- `visionToolsEnabled`(默认 `true`):设置页 Module Switches 第三行开关;关闭仅注销工具,配置完整保留(与 `vlmEnabled`/`imggenEnabled` 同模式)。
- **Tesseract(可选,仅本地 OCR 需要)**:系统安装 Tesseract OCR 并含 `chi_sim` 中文数据。探测顺序(进程内缓存一次):环境变量 `OMNI_WORKSTATION_TESSERACT` → `PATH` 中的 `tesseract` → Windows 默认 `C:\Program Files\Tesseract-OCR\tesseract.exe`。未安装时 `auto` 自动降级 VLM;`local` 返回 `LOCAL_OCR_UNAVAILABLE`。
- **token 优化设计**:所有工具只返回紧凑 JSON + 工件路径,图片字节不返回给模型;工具产出图片(`tool-result` 内嵌 image 块,如 `show_image` 输出)会被改写为一行文本标记,不再每轮重新上传,模型按需再调 `analyze_image` 细看。用户上传的图片不受影响。
- **命名区隔**:本插件工具命名与参考插件 dsh-vision-router 完全区隔,不照抄 `vision_crop`/`vision_colors`/`vision_present` 等,避免 harness 工具名唯一性冲突。

## 工作原理

本包是**双面**插件:

- **宿主半**(`lib/index.js`):cordis 插件,在全局工具注册表注册 `analyze_image` 工具,在 web server 注册 `/omni/config|models|key` 路由,读写 `omni-vision.json`。
- **浏览器半**(`lib/client.js`):浏览器模块,因包声明了 `dsh.client` 由 `__ModuleLoader__` 加载。注册 **设置 → 全模态** 分区(list 槽 `settings.section`,id `omni-vision`,order 40)与 locale 命名空间 `settings.omni-workstation`。

bundle 的 `cordis.patch.yml` 插入的 `omni-workstation` 条目同时激活两半。

## 与其他插件共存

本插件面向"其他也会影响前端设置窗口的插件"做了兼容设计:

| 资源 | 取值 | 说明 |
|---|---|---|
| loader 条目 id | `omni-workstation` | 全 harness 唯一 |
| 设置槽 id | `omni-vision` | `settings.section` 是 **list 槽**——多个分区可共存;仅相同 `id` 才会冲突 |
| locale 命名空间 | `settings.omni-workstation` | 按插件命名空间隔离 |
| 工具名 | `analyze_image` | 唯一 |
| Web 路由 | `/omni/*` | 唯一路径前缀 |
| CSS 类 | `omni-*` | 全局样式,加前缀避免撞名 |

harness 本身会对唯一性做强制校验(重复的 loader id、槽 id、工具名或路由会直接抛错),因此两个插件绝不会互相静默覆盖。

## 卸载

```bash
dsh plugin --profile web remove dsh-omni-workstation
```

会移除依赖与 bundle 条目;你的 `omni-vision.json` 配置文件会保留。

## License

MIT
