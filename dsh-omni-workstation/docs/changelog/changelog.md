# Changelog — dsh-omni-workstation

> [Back to root AGENTS.md](..)

## v2.9.15 — ComfyUI 面板清理（移除历史导入）+ 模型计数修复 + 映射滚动修复

- **移除「从历史导入」按钮**：导入本质是 JSON 文件，统一走「导入工作流」文件通道。删除 WorkflowHistoryModal 组件、`POST /omni/comfy/history` 路由、5 个历史 state（histOpen/histItems/histLoading/histError/histBusyId）、3 个函数（openHistory/refreshHistory/pickHistory）、2 个 handler（fetchComfyHistory/importComfyHistory）、12 个 zh + 12 个 en DICTS key、9 条 CSS 类、2 个 props（onFetchHistory/onImportHistory）。新增 `comfyWfHelpClose` key 替代被删的 `comfyWfHistoryClose`。

- **更新教程「?」文案**：移除历史导入引用，改为强调 ComfyUI Save (API Format) → 「导入工作流」文件路径 + 三方节点兼容说明。映射说明保持不变。

- **修复「获取可用模型」计数**：ComfyUI 返回 checkpoints + unet + vae + clip 四类列表，旧代码只计 checkpoints（`igModelCount[1](fetchedModels.length)`）——使用 UNETLoader 的工作流 checkpoints=0 但 unets>0，toast 显示"可用模型 0 个"但下拉有模型。现改为 `totalCount = checkpoints + unets + vae + clip`，toast 和状态行显示总数。

- **修复映射列表溢出**：`.omni-comfy-wf-mapping-body` 无 max-height/overflow，添加多行映射后「添加映射」按钮被推出可视区。新增 `.omni-comfy-wf-mapping-rows`（max-height:200px + overflow-y:auto）包裹映射行，按钮在容器外始终可见。

- **三方节点工作流无需适配**：Job(1).json（API 格式，含 ImpactWildcardProcessor 自定义正/负编码器）经「导入工作流」成功导入并生成图片——`prepareComfyWorkflow` 直接处理 API 格式（仅过滤 class_type 节点），不经 `comfyUiToApi`，三方节点完整保留。E2E 测试验证：checkpoints=0/unets=1/vae=3/clip=4 → total=8（旧代码显示 0），PNG 生成成功。

- **验证**：单测 219 全通过；E2E（`tests/e2e_v2915_comfy_fixes.py`）1 例通过（导入 Job(1).json + AI 对话生图 + PNG 签名验证）。

## v2.9.14 — ComfyUI 执行历史导入（零导出）+ 自定义节点映射增强

- **「从历史导入」按钮**（导入工作流右侧）：新增 `POST /omni/comfy/history` 路由代理 ComfyUI `/history`（list：队列号/status/节点数/prompt 摘要，新→旧排序；get：取回**前端已转好的 API 格式图**——用户浏览器 Queue 后服务端必然存有），最小注入后重发。**彻底解决三方自定义节点工作流**：API 图由用户前端序列化、且在同一台服务器执行过（class\_type 必然存在），插件只认识注入点，不认识任何三方节点。

- **映射检测全面降级**：`detectComfyMapping` 不再 throw，返回 `missing[]`（未识别角色随 mapping 持久化）；新增泛化识别——任意带 positive/negative 数组输入的节点=采样器（覆盖 Efficiency/自定义采样器）、无采样器时 TextEncode 节点回退正/负、任意数值 width/height 节点=Latent。**永远能导入、永远能跑**（未识别角色生成时保留工作流原值）。

- **映射配置项可增/删 + 字段名覆盖**：8 角色逐行显示（节点号 + **可选字段名**，如自定义编码节点映射到 `prompt` 字段而非 `text`），✕ 删除行、「添加映射」追加空行；`applyPatch comfyWfUpdateMapping` 支持 `string | {node,field}`，空节点保留空行（仅 null 删除）、新增 `comfyWfDeleteMapping`。

- **"?" 教程浮窗**：工作流列表标题旁帮助按钮弹覆盖层（不占面板空间），内置两条路径教程（历史导入推荐路径 / 手动 Save (API Format) 导出路径）+ 映射说明。

- **注入守卫修复**：latent 的 width/height/batch\_size 仅写节点已有的键（自定义 Latent 缺 batch\_size 不再 400）；采样器 seed 字段自适应（KSamplerAdvanced 用 `noise_seed`）；单字段角色默认字段缺失时跳过（保留原值）、用户显式字段覆盖优先。

- **prepared 导入通道**：`/omni/config` 的 `comfyWfImport.prepared:true` 跳过本地转换（只校验 JSON 合法性），历史导入走单一写路径（applyPatch→storeConfig→syncToolRegistration）。

- **验证**：单测 219 全通过（新增 comfy-history.test.js 6 例、comfy-mapping +9 例含 applyPatch 4 例）；E2E 需本机 ComfyUI（见 plan doc 验证步骤）。

## v2.9.13 — 豆包双区独立 V1/V3 鉴权 + 自定义音色自动 ICL

- **V1 TTS 合成鉴权头修正**：合成按官方旧版控制台文档用 `X-Api-App-Id`+`X-Api-Access-Key`+`X-Api-Resource-Id`+`X-Api-Request-Id`（不再用 `Authorization: Bearer`——那是 mega\_tts 克隆专用）。V3：`X-Api-Key` 优先，无 KEY 回退 App-Key/Access-Key。

- **上（生成）/下（复刻）两区独立协议+凭据**：上方 doubao V1 显示 App ID+Access Token 行、V3 显示 KEY 行；复刻区每个预设自带「API 协议」选择器与对应凭据行（V1=App ID+Token / V3=KEY），预设新增 `apiKey` 字段；两区可配不同凭据。

- **自定义音色自动 ICL**：`resolveDoubaoClonePreset(speaker, cfg)`（已导出）—预设精确匹配或 `S_` 前缀活动预设兜底；`speak` 命中预设时用预设的 cloneModel（seed-icl-2.0）+预设协议/凭据合成（内置 s 音色仍用上方 seed-tts-2.0）。

- **预设为唯一凭据源**：`speak`/`clone_voice`/`/omni/doubao/clone` 均不复用上方 vc 的 appId/accessKey/apiKey，防止 V3 预设泄漏上方遗留 V1 凭据发错鉴权头；克隆 apiVersion 预设优先。

- **`isVoiceConfigValid`** **doubao**：V1 要求上方 appId+accessKey，V3 要求 apiKey（与协议一致）。

- **验证（真凭据浏览器 E2E + 后端复核）**：V1 克隆 S\_R4WKW0yd2 status=2 ✅；V1 生成内置语音 ✅（voice\_mthe7z86.mp3）；V1 生成自定义音色自动 seed-icl-2.0 ✅（voice\_mthe8uoa.mp3）；V3 生成内置 ✅（voice\_mtheibdx.mp3）；V3 生成自定义 S\_vx6CUo342 → seed-icl-2.0 ✅（voice\_mthewz1s.mp3，工具卡显示模型 seed-icl-2.0）。全套测试 205 通过。

- 排坑：同名 speaker 残留预设会抢先命中 find → `resolveDoubaoClonePreset` 匹配第一个即返回；V3 预设混入 V1 遗留凭据会发错头 → 预设唯一凭据源。

## v2.9.10 — doDoubaoClone V1 API 重写 + 6 项 UI 改动

- **`doDoubaoClone`** **重写为 V1 API（旧版控制台）**：端点 `POST /api/v1/mega_tts/audio/upload` + 轮询 `/api/v1/mega_tts/status`。Auth `Authorization: Bearer; <accessToken>` + `Resource-Id` 头。Body `{appid, speaker_id, audios:[{audio_bytes, audio_format}], source:2, model_type, language}`。Response `BaseResp.StatusCode===0`。**音频时长 ≥5s 否则报 1307 PromptAudioDurationTooShort**。

- **`doubaoClonePresets`** **加** **`cloneModel`** **字段**：每预设存独立复刻模型（`seed-icl-2.0`/`seed-icl-1.0`）。`doubaoClonePresetPatch` 支持更新 `cloneModel`。`/omni/doubao/clone` 路由和 `clone_voice` 工具传递 `dcp.cloneModel` 给 `doDoubaoClone`。

- **6 项 UI 改动**：①移除"仅显示 TTS 模型"开关；②TTS 模型下拉仅 `seed-tts-2.0`（ICL 移到复刻模型选择器）；③预置音色下拉显示复刻预设名（"默认（自定义）"）；④Access Key → Access Token 标签；⑤复刻模型选择器（ICL 模型下拉，存入 preset.cloneModel）；⑥行小标题（复刻模型/参考语音/speaker\_id）。

- **验证**：豆包克隆 V1 API ✅ SUCCESS（status=2, 10.2s, speaker\_id=S\_rJ9MW0yd2, audio=vo\_hutao\_draw\_appear.wav 1786KB）。

## v2.9.9 — doubao 克隆预设管理 + UI

- **`doubaoClonePresets`** **配置**：`{id, name, speakerId, refAudioPath}`，共享跨语音配置预设。applyPatch 支持 5 种操作（switch/add/delete/rename/patch）。

- **`DoubaoCloneSection`** **面板组件**：预设栏（名称输入+下拉+添加+删除）+ 路径输入 + 文件选择 + speaker\_id + 克隆按钮。

- **`/omni/doubao/clone`** **路由**使用当前预设的 speakerId/refAudioPath 作为默认值。

- **`clone_voice`** **工具 doubao 分支**使用预设的 appId/accessKey/speakerId，AI 可覆盖 `app_id`/`access_key`/`voice_sample_path`。

- **`X-Api-Request-Id`** **头**加到 doDoubaoClone（V3 API 需要，V1 不需要）。**`voiceStatusNoSynth`** **检查加 doubao**。

## v2.9.8 — 豆包声音复刻（TTS 合成 + 克隆 API + 面板 UI）

- **`runDoubaoTts(vc, args, exec)`**：`POST /api/v3/tts/unidirectional`，chunked JSON 响应解析（逐行 JSON.parse → base64 拼接 → mp3 buffer → 落 `<cwd>/.omni-workstation/artifacts/voice_<ts>.mp3`）。auth 双模式：legacy（`X-Api-App-Key`+`X-Api-Access-Key`）或新版（`X-Api-Key`）。model = `X-Api-Resource-Id`（`seed-tts-2.0` 预置 / `seed-icl-2.0` 复刻 2.0 / `seed-icl-1.0` 复刻 1.0）。

- **`doDoubaoClone(vc, refPath, speakerId, text)`**：`POST /api/v3/tts/voice_clone`，base64 音频入 JSON body（非 multipart）。后付费自定义 speaker\_id（`speaker_id='custom_speaker_id'`，`custom_speaker_id` = 用户定义，无需预购槽位）。训练异步：轮询 `POST /api/v3/tts/get_voice` 直到 status=2(Success)/4(Active)，最多 120s 3s 间隔。

- **`POST /omni/doubao/clone`** **路由**：面板入口，接受 `ref_audio_path` 或 `base64+mime`+`voice_id` → `doDoubaoClone` → 返回 `{ok, speaker_id, status, demo_audio}`。

- **speak/clone\_voice 工具加 doubao 分支**：`speak` execute 路由加 `vc.provider === 'doubao' ? runDoubaoTts`；`clone_voice` execute 加 doubao 分支（调 `doDoubaoClone` → 返回 speaker\_id）；`syncToolRegistration` 扩展到 mimo+minimax+doubao 三供应商注册。

- **`isVoiceConfigValid`** **doubao 鉴权**：接受 `appId+accessKey`（legacy）或 `apiKey`（新版 X-Api-Key），二选一即可。

- **`DoubaoCloneSection`** **面板组件**（client.js）：文件选择（audio/\*）→ base64 → speaker\_id 输入 → 克隆按钮 → `POST /omni/doubao/clone` → 成功 `patchVoice('voiceId', speaker_id)` + toast。仅在 `provider==='doubao'` 时渲染。

- **doubao 模型下拉**：已含 `seed-tts-2.0`/`seed-icl-2.0`/`seed-icl-1.0`（合成 + 复刻 2.0 + 复刻 1.0）。

- **测试**：新增 5 例（clone\_voice doubao description、speak doubao 无 voice\_sample\_path、isVoiceConfigValid doubao auth 3 例），全套 **44** 例通过。

- 验证：`node --check` + `node --test` 全通过；E2E 浏览器验证待进行。

## v2.9.7 — 统一 clone\_voice（clone-only）+ 语音面板修复

- **统一** **`clone_voice`**（clone-only，不合成）：mimo+minimax 均注册，替代旧 mimo clone+synthesize（一步克隆+合成）和旧 `minimax_clone_voice`（一步克隆+合成）。AI 克隆→拿 voice\_id（minimax 持久化）或 voice\_sample\_path（mimo 内联）→ 后续 `speak` 传 `voice`/`voice_sample_path` 复用，不写 config 防冲突。

- **`speak`** **工具更新**：加 `voice_sample_path` 参数（mimo-only，execute 覆写 model→`mimo-v2.5-tts-voiceclone`，`runMimoTts` line 2721 已处理 base64 inline）；description 改为 provider-aware（minimax 提示 voice\_id，mimo 提示 voice\_sample\_path）。

- **`syncToolRegistration`**：`cloneDisposer` 扩展到 mimo+minimax；`minimaxCloneDisposer` 移除（二 disposer）；旧 `buildMinimaxCloneVoiceToolDef` 删除。

- **`/omni/key`** **路由加 voice 分支**：`POST /omni/key {voice:true}` 返回 `voiceConfig.apiKey`，修复语音面板 key 眼睛按钮不显示问题（旧版无 voice 分支 → 404 card not found → `.catch` 吞掉 → key 永不显示）。

- **provider 切换重置 voiceId**：`applyPatch` provider 变更时自动重置——mimo→`mimo_default`、doubao→`zh_female_vv_uranus_bigtts`、其余→空，**minimax 除外**（保留克隆 voice\_id，防 `runMinimaxTts` 抛错）；客户端 `changeVoiceProvider` 同步更新本地 draft。

- **豆包 10 内置音色**：`DOUBAO_PRESET_VOICES`（client.js 常量，来自 `文档/豆包.txt`），默认 Vivi 2.0；面板 `Field`→`SelectField` 下拉（含 stale-value 兜底——自定义 voiceId 追加为额外选项）；`fetchVoiceModels` doubao 分支填充 `voiceVoiceList`。

- **导出**：`buildCloneVoiceToolDef`/`buildSpeakToolDef` 导出供测试直接调用（参照 `buildVideoToolDef` 模式）。

- **测试**：新增 8 例（clone\_voice 工具定义、speak provider-aware 参数、applyPatch voiceId 重置 5 例 + preset 同步），全套 **197** 例通过。

- 验证：`node --check` + `node --test` 全通过；E2E 手动验证待用户启动 `dsh web` 后进行。

## v2.9.6 — minimax 克隆音色区：音色库下拉菜单 + 选择/删除（对齐 mimo RefAudioRow 交互）

- **「选择参考音频」→「选择」**：上传按钮文案缩短为「选择」（`voiceClonePickRef`），完整提示移到 `voiceClonePickRefTitle`（按钮 title）。

- **输入框内右侧指示键**：voice\_id 输入框右侧新增 dropdown 按钮（`.omni-preset-dd-btn`，I\_EXPAND/I\_COLLAPSE 图标），点击展开**共享音色库菜单**（`voice-library` 列表，菜单项为库内音频名，active 高亮当前选中）。从菜单直接选择音频 → `refFile` 变 `{path,name}` 模式，克隆时走 `ref_audio_path` 直传（**无需重新上传**）。

- **「克隆」右侧新增垃圾桶删除键**：库条目（path 模式）→ 确认弹窗（复用 voiceRefAudioDelete\* 文案）→ `voice-library delete` 删库 + 刷新 + 清空选择；base64 本地回退 → 直接清空。

- **上传即入库**：点「选择」选文件后，base64 写入共享 `voice-library`（name=文件名去扩展名，服务端 dedup），成功后 refFile=库条目 path 模式 + 输入框自动填文件名（去后缀）+ toast「参考音频已导入」+ 刷新库；入库失败回退 base64 模式（仍可克隆）。

- **`onMinimaxClone`** **扩展**：接受 `{ref_audio_path, voice_id}`（库条目）或 `{base64, mime, voice_id}`（回退）。

- **布局**：`MinimaxCloneSection` 容器改为 `omni-preset-bar omni-ref-audio-bar omni-minimax-clone-bar`，输入组复用 `.omni-preset-input-wrap`（相对定位 + padding-right 留指示键空间 + `.omni-preset-menu` 下拉），outside-click 关闭复用父级 `.omni-preset-bar` 逻辑。

- **新 i18n**（zh/en）：`voiceClonePickRefTitle`、`voiceCloneLibMenu`（"音色库"）、`voiceCloneLibEmpty`。

- 验证：浏览器自动化（agent-browser）设置→全模态→语音→MiniMax——快照确认「选择」+ 输入框指示键 + 「克隆」+ 垃圾桶四控件同行；点指示键展开菜单显示空态文案「音色库为空，点击「选择」上传音频」；上传 `vo_BZLQ001_4_hutao_03.wav` 后输入框显示 `vo_BZLQ001_4_hutao_03`、克隆/删除按钮启用。189 单测通过。（注：本轮 E2E 运行环境的沙箱限制写入 `~/.dsh/.../omni-vision.json`（storeConfig EPERM），voice-library 入库在正常用户环境（无沙箱）下生效；dsh web 需由用户正常启动以完成全链路验证。）

## v2.9.5 — minimax 克隆音色区 UI 修复（文件名校入输入框 + 三控件同行）

- **上传按钮不再被文件名替换**：此前上传音频后，按钮文本会变为音频文件名（`vo_xxx.wav`），按钮视觉"撑宽"且与输入框错位。现文件名（去扩展名）自动填入 voice\_id 输入框作为建议值（用户可继续编辑），按钮文案恒定「选择参考音频」；输入框 `title` 保留完整文件名便于查看，有文件时隐藏 placeholder。

- **三控件同一基线**：`MinimaxCloneSection` 内部容器由 `omni-model-wrap`（block，input 与按钮上下堆叠）改为 `omni-model-wrap omni-voice-upload omni-minimax-clone-bar`，复用 indextts/voxcpm 的 flex 横排规则——voice\_id 输入框（`flex:1`）+「选择参考音频」按钮 + 右侧「克隆」按钮同一行垂直居中。

- **CSS**：`.omni-voice-upload` 增加 `align-items:center`；新增 `.omni-voice-upload .omni-input { flex:1; min-width:0 }`；`.omni-voice-upload .omni-btn` 移 `align-self:center`（由父容器统一居中）；新增 `.omni-minimax-clone-bar .omni-btn { align-self:center }`。

- 验证：浏览器自动化（agent-browser）打开设置→全模态→语音→MiniMax，上传 `vo_BZLQ001_4_hutao_03.wav`——快照确认输入框 value=`vo_BZLQ001_4_hutao_03`、按钮文本不变、三控件同组；截图视觉确认三控件同一行居中；189 单测通过。

## v2.9.4 — provider-gated 注册收窄（隐藏无效专用工具）

- **严格按当前供应商注册**（`syncToolRegistration`）：`speak` 仅 mimo/minimax；`clone_voice`（mimo 专用）仅 mimo；`minimax_clone_voice` 仅 minimax。doubao/indextts/voxcpm/gptsovits/tts-webui 下**不注册任何语音工具**（合成未接入，防 AI 调到错端点）。

- v2.9.3 旧版仅 minimax↔mimo 二分，doubao 等仍误注册 mimo `clone_voice`+`speak`（会打 MiMo 端点必坏）；v2.9.4 收窄为严格 provider 三元。

- 面板状态新增 `voiceStatusNoSynth`（"该供应商合成未接入，仅 mimo/minimax 可用"），非 mimo/minimax 供应商显示此状态（而非误导性"已启用"）。

- 验证：e2e 切换供应商读状态——minimax→"已启用"、doubao→"未接入"、mimo→"已启用"；189 单测通过。

## v2.9.3 — MiniMax 音色克隆（AI 工具 + 面板）

- **新增 MiniMax 语音分支**：`speak` 工具按 `voiceConfig.provider` 路由——mimo→`runMimoTts`，minimax→`runMinimaxTts`（`POST {base}/v1/t2a_v2`，`audio_setting.format:'mp3'` 固定，响应 `data.audio` 为 hex，hex→mp3 落 `<cwd>/.omni-workstation/artifacts/voice_<ts>.mp3`，`sessionCwd` 空则抛错**不回退** `process.cwd()`，镜像 `generate_video`）

- **新增** **`POST /omni/minimax/clone`** **路由**（面板 + AI 工具共用）：clone-only，支持 `ref_audio_path`（服务端路径直传）或 `base64+mime`（面板文件输入，服务端落 `<configDir>/voice-library/` 后克隆）；前置校验 `provider==='minimax'` + `isVoiceConfigValid`；返回 `{ok, voice_id, file_id, demo_audio}`

- **新增** **`minimax_clone_voice`** **AI 工具**（`buildMinimaxCloneVoiceToolDef`）：一次调用完成「上传参考音频→克隆→合成文本」，参 `text`(必填)/`voice_sample_path`(必填)/`voice_id`(可选, 缺省 `hutao_<ts>`)/`style`(可选)；minimax 下**替代** mimo `clone_voice`（后者硬编码 MiMo endpoint 在 minimax 上必坏）

- **`syncToolRegistration`** **provider-gated 注册**：`voiceSig` 加入 `provider`，minimax↔mimo 切换即重注册；`else` 分支独立清理 `minimaxCloneDisposer`（与 `voiceDisposer`/`cloneDisposer` 三 disposer 各自独立）

- **新增面板** **`MinimaxCloneSection`**（client.js）：仅 `provider==='minimax'` 时渲染——隐藏文件输入（audio/\*）→base64 + voice\_id 输入 + 克隆按钮 → POST `/omni/minimax/clone` → 成功则 `patchVoice('voiceId')` 自动选中 + toast；en/zh 6 条 i18n keys

- **helper 函数**：`minimaxBase(region)`（cn→`https://api.minimaxi.com`，global→`https://api.minimax.io`）+ `doMinimaxClone`（两步：multipart `/v1/files/upload` purpose=voice\_clone→`file_id` → `/v1/voice_clone` JSON）；**关键**：`httpJson` 只 JSON.stringify body，multipart 必须用原生 `fetch`+`FormData`+`new Blob([buf])`

- **新增单测**：`tests/voice.test.js` +3 例（`runMinimaxTts` 请求体快照 / `doMinimaxClone` 两步）；全套 **189** 例通过

- **验证**：直接路由 `POST /omni/minimax/clone`（`vo_hutao_draw_appear.wav` 19.1s，`voice_id=hutao_e2e`）→ `{ok:true, voice_id, file_id, demo_audio}` ✓；t2a\_v2 直连合成用克隆出的 voice\_id → 64500 字节 mp3 ✓；bailian-LLM agent e2e FAILED（`"本轮运行失败 Connection error"`——bailian 端点环境不可达，非代码问题）

- **关键坑**：voice key 写入走 `POST /omni/config {voiceConfig:{field:'apiKey',value:'…'}}`（applyPatch 写回），**勿用** `/omni/key {voice:true}`（该路由只读且无 voice 分支）

- **约束**：MiMo `runMimoTts`/`buildCloneVoiceToolDef` 源码未改（仅注册门控）；非 mimo/minimax 合成（doubao/indextts/voxcpm/gptsovits）留待后续；`VOICE_PROVIDERS` 端点未改；minimax key 不提交

- 详见 [docs/plan/v2.9.3-minimax-clone.md](../plan/v2.9.3-minimax-clone.md)

## v2.8.6 — dashscope-video 协议修正（百炼 wan2.7-i2v 真正跑通）

- **关键 bug 修复**：原 dashscope-video 实现有两个致命问题，导致百炼 wan2.7-i2v 始终无法调用：

  1. `dashscopeVideoBase` 把 `ws-*.maas.aliyuncs.com` workspace 域名**静默改写为** `dashscope.aliyuncs.com/api/v1`（公网域名，拒绝 workspace 级 key，表现为"非法 URL / url error"）。现已移除该改写，仅做 `/api/v1` 后缀归一，保留原 workspace 域名。
  2. 提交路径 `/services/aigc/video-generation/generation` 应为 `/video-synthesis`；请求体 `input.img_url` 应为 `input.media=[{type:"first_frame",url}]`（公网 URL 或 `data:{mime};base64,…`），并补 `parameters`（resolution / duration / prompt\_extend / watermark）。依据官方文档 `百炼wan2.7-i2v图生视频技术实现.md` 修正。

- 同步更新单测：提交路径改为 `video-synthesis`；`img_url` 断言改为 `media[0].url`；"ws 改写"测试改为断言**保留原 workspace 域名**；全套 155 例通过。

- 验证：浏览器自动化 E2E 经百炼（dashscope-video）跑通 i2v —— 参考图 `img_mt65jeyo_0.png` 成功生成火车飞向太空视频 `video_mt7brktj.mp4`（4.8MB），确认 URL 修正 + 请求体修正 + i2v Base64 修正三者共同生效，无 url error。

- 注：上一条 v2.8.5 的 dashscope-video 描述（img\_url）为误诊断下的实现，以本次修正为准。

## v2.8.5 — 视频供应商分组合并 + i2v Base64 格式修复

- **视频面板供应商分组合并**：下拉由「通用 / 内置供应商·海外 / 内置供应商·国内」三组合并为「通用 / 内置供应商」两组（新增 i18n key `videoGroupBuiltin`，保留旧 key 向后兼容）

- **i2v Base64 格式修复（dashscope-video）**：原 `input.img_url` 对本地图片发裸 Base64（DashScope 报 `InvalidParameter: url error`）；改为 `data:{mime};base64,…`（`runVideoGeneration` 读取本地文件时通过 `sniffMediaType` + `mimeFor` 携带 mime）

- **i2v 实际 mime（openai-videos / volc / minimax）**：`imageDataUrl` 由硬编码 `image/png` 改为按实际 mime 生成 `data:{mime};base64,…`

- **Kling 不变**：仍发裸 Base64（无前缀），符合其协议要求

- 新增 4 例 i2v 单测（dashscope data URL + mime / url 透传 / kling 裸 Base64 / openai-videos 实际 mime），更新 dashscope `img_url` 断言；全套 155 例通过

- 验证：浏览器自动化 E2E 经 `agnes-cn`（openai-videos）供应商跑通 i2v —— 参考图 `img_mt65jeyo_0.png` 成功生成火车飞向太空视频并落盘（注：百炼/DashScope 通道当前 Key 无 wan 视频权限，无法在此环境实测 `dashscope-video` 路径，该路径仅由单测覆盖）

## v2.8.4 — qwen-token-plan 供应商改走百炼（DashScope）通道

- **问题**：v2.8.3 新增的 `qwen-token-plan` / `qwen-token-plan-cn` 供应商（视频 + 生图）误用 Token Plan OpenAI 兼容网关（`token-plan.*.maas.aliyuncs.com/compatible-mode/v1`），而非百炼（DashScope）通道。参考官方文档 [配置 API Key](https://platform.qianwenai.com/docs/api-reference/preparation/export-api-key-env)：Qwen 平台即百炼，API Key = `DASHSCOPE_API_KEY`，Base URL = `https://dashscope.aliyuncs.com`

- **视频修复**：`VIDEO_PROVIDERS` / `VIDEO_PROVIDERS_UI` 中 `qwen-token-plan` / `qwen-token-plan-cn` 协议由 `openai-videos` 改为 `dashscope-video`（原生异步任务），端点改为 `https://dashscope.aliyuncs.com`，`fixedUrl` 改为 `false`（支持 workspace 专属域名，同 `dashscope` 供应商）；applyPatch 端点预填条件泛化为所有 `fixedUrl:false` 供应商

- **生图/VLM 修复**：`PROVIDERS` / `PROVIDERS_UI` 中 `qwen-token-plan` / `qwen-token-plan-cn` 端点由 `token-plan.*.maas.aliyuncs.com/compatible-mode/v1` 改为 `https://dashscope.aliyuncs.com/compatible-mode/v1`（DashScope OpenAI 兼容通道）

- 新增 applyPatch 端点预填单测；更新 qwen 视频请求体单测（`dashscope-video` 协议 + DashScope 端点）；全套 151 例通过

## v2.8.3 — 视频协议改名 + 生图/视频新增通义千问 (Qwen) Token Plan 供应商

- **视频协议显示名修正**：`openai-videos` 协议在设置面板的显示名由「openai-videos（Sora 兼容中转站 / Agnes）」改为「openai-videos（openai兼容）」（en: "openai-videos (OpenAI-compatible)"），更准确反映其 OpenAI 兼容本质

- **生图供应商新增 Qwen**：在 `IMGGEN_PROVIDER_IDS_UI` 过滤中加入 `qwen-token-plan` / `qwen-token-plan-cn`（复用 VLM 面板既有 Token Plan 端点，OpenAI 兼容网关；生图走 `openai-images` 协议，选中即锁定协议/端点）

- **视频供应商新增 Qwen**：`VIDEO_PROVIDERS` / `VIDEO_PROVIDERS_UI` 增加 `qwen-token-plan`（海外 `token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1`）与 `qwen-token-plan-cn`（国内 `token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1`），协议锁定 `openai-videos`（Sora 风格，POST {base}/videos），端点/协议固定，仅填 API Key + 模型；下拉分组（海外 / 国内）

- 配置参考 VLM 面板 qwen-token-plan 供应商与官方文档（DASHSCOPE\_API\_KEY + DashScope base url）；新增 qwen 视频归一化/校验/请求体单测；全套 150 例通过

- 详见 [docs/plan/v2.8-video.md](../plan/v2.8-video.md)

## v2.8.2 — VLM 卡片菜单收纳修复 + 视频面板交互/筛选/布局修复

- **修复 VLM 卡片菜单触发收纳**：ApiCard 的 '...' 菜单项（置顶/沉底/删除）补 `e.stopPropagation()`——此前点击菜单项冒泡到卡片头 `toggleCollapse` 导致卡片意外收纳；现点击菜单项后卡片收纳/展开状态保持不变

- **视频面板外点关闭**：模型下拉/供应商下拉纳入主外点关闭 effect（此前漏了 `videoOpenDd/videoOpenProv`，点空白不关）；VideoPanel 补齐 reset 菜单与预设下拉的外点关闭（镜像生图面板）

- **文案**：「仅显示生视频模型」→「仅显示视频模型」，hint 说明自动排除 t2i/生图模型

- **筛选关键词修正**：内联正则抽成纯函数 `filterVideoModelIds()`（export + 单测）——先排除 `t2i|wanx|image|img|seedream|dall|flux|cogview` 生图系，再保留 `t2v|i2v|video|sora|wan|kling|hailuo|seedance|cogvideo|veo|vidu`；修复裸 `wan` 放过 wan2.2-t2i/wanx 系生图模型的坑

- **移除分辨率 UI + 参数行合并**：删除设置面板「分辨率」字段（分辨率由 AI 经 generate\_video `resolution` 参数自行决定；后端 cfg.resolution 归一化保留供 volc/minimax 协议缺省）；轮询间隔 (s)｜重试次数｜默认时长 (s)｜画幅 合并为一行 4 字段水平对齐

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

## v2.8.0 — 视频生成面板 + generate\_video 工具（全模态扩展）

- **新增设置页「视频」tab**（替换占位）：供应商下拉分组（通用-自定义 / 海外-Agnes AI、Agnes AI CN / 国内-阿里云百炼、可灵、火山引擎、MiniMax 海螺）、协议下拉（内置供应商锁定）、endpoint（fixed 只读 / dashscope 可编辑）、API Key（password+眼睛）、模型（自由输入+获取可用模型）、超时/轮询间隔/重试、默认时长/画幅/分辨率、视频模型过滤开关、async-task 专属字段组、重置、状态行（zh/en i18n 全量）

- **新增** **`generate_video`** **工具**（t2v + i2v 双能力）：`prompt` 必填 + `image`（首帧图，本地路径或公网 URL）+ `seconds`/`aspect_ratio`/`output_dir`；异步任务 submit → poll → 下载 mp4 → 写入工作区 `video_<ts>.mp4`（复用 sessionCwd，不回退 process.cwd()）

- **6 协议适配**：`openai-videos`（Sora 兼容中转站 / Agnes V2.0，Agnes 完成时经 `/agnesapi?video_id=` 解析 cos 下载地址，实测）、`dashscope-video`（百炼 wan，workspace host 重写为标准域名）、`kling-video`（AccessKey|SecretKey JWT HS256，Node crypto 零依赖）、`volc-video`（方舟 content tasks，图片 base64 data URL）、`minimax-video`（两步取片 /v1/files/retrieve）、`async-task`（自配提交/轮询路径与字段，{id} 占位）

- **门控**：`videoEnabled !== true` 或配置无效时 **generate\_video 完全不注册**（tool schema 不注入 → 0 token），复用 imggen 模式；`/omni/config` 返回 `videoVisible`；`/omni/models` 支持 `{video:true}`（按 video/t2v/i2v/wan/kling 等过滤）；`/omni/key` 支持 `{video:true}`

- **配置模型**：`videoConfig{provider,protocol,endpoint,apiKey,model,timeoutMs:600000,pollIntervalMs:5000,retryCount:1,filterVideoModels,seconds:5,aspectRatio:'16:9',resolution:'720p',submitPath,pollPath,taskIdField,statusField,resultField,doneStatus}` + `videoEnabled`（默认 false）

- **单测**：新增 `tests/video-config.test.js` 33 例（normalize/mask/validity/applyPatch/门控/6 协议请求体快照/轮询 URL/状态归一化/task id 提取/JWT/num\_frames）

- **E2E 浏览器自动化**（Agnes CN agnes-video-v2.0 + bailian-LLM）：设置面板 UI/供应商分组/真实 key 保存 → 对话驱动 generate\_video → 提交/轮询//agnesapi 解析 → mp4 落盘（ftyp 头验证 1.2MB）→ 门控 OFF/ON 断言

- 详见 [docs/plan/v2.8-video.md](../plan/v2.8-video.md) 与 [docs/decisions.md](../docs/decisions.md)

## v2.7.4 — 镜像路由适配新 harness 的 prepareCall 契约

- **修复**：切换镜像模型发送消息报错 `registration.adapter.prepareCall is not a function`。新版 dsh CLI 的 agent-loop 对每个请求走 `llm.prepareCall → adapter.prepareCall`（旧版不走此路径，重装新版后暴露）

- 三个 twin 工厂（auto-vision / per-provider / mapping）全部补齐 `prepareCall(provider, model, signal)`：尽力向源 adapter 委托能力元数据查询（contextWindow 等），再按 `normalizeModelInfo` 契约重标 provider=镜像路由、id=请求模型、强制 `inputModalities:['text','image']`；返回的 `stream` 复用既有委托逻辑

- 新增 2 个回归测试（prepareCall 元数据形状 + 源 provider/id 不泄漏）

## v2.7.3 — 恢复生图验证提醒开关（toolVisible 门控）

- 恢复「生图后自动验证提醒」完整链路：设置页开关、`globalConfig.verifyReminder` 默认值/normalize/patch handler、generate\_image 输出 schema + ⚠️ render 块、zh/en i18n

- 与 v2.7.2 解耦成果兼容：提醒文本仅在 analyze\_image 实际注册时追加（execute 门控改为 `gc.verifyReminder !== false && toolVisible`，替代旧的 `cfg.vlmEnabled !== false`）——VLM 关闭**或**无有效卡片时不再产生死指令；开关标签标注「需 VLM 开启」

## v2.7.2 — 视觉工具箱与 VLM 开关解耦；移除生图验证提醒

- **视觉工具箱在 VLM 模块关闭时保持可用**（注册本就独立于 `vlmEnabled`；本次修复的是引用链）：

  - 图片 marker（用户上传 / show\_image 会话表面 sanitize）不再硬编码 analyze\_image——按 `toolVisible` 动态指向：VLM 开启时指 analyze\_image，关闭时指视觉工具箱本地工具（zoom/sample\_colors/image\_diff/ocr/detect，ocr/detect 走卡片链不依赖 VLM 开关）

  - VLM 关闭且工具箱开启时，状态行显示「analyze\_image 已停用 · 视觉工具箱仍可用」（新 i18n key `toolOffToolkit` zh/en）

- **移除「生图后自动验证提醒」**（绑定 analyze\_image，VLM 关闭即失效）：删 `globalConfig.verifyReminder` 默认值/normalize/mask、generate\_image 输出 schema 字段 + render ⚠️ 块 + execute 返回字段、patch handler 分支、设置页开关行、zh/en i18n；工具描述去掉「必须立即调用 analyze\_image 验证」；删除过时 smoke\_verify\_reminder.mjs

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

## v2.6.1 — 会话工作目录解析修复（generate\_image 首调即成功）

- harness **不填充** **`exec.agent.meta.cwd`**（web 会话实测为空）→ 新增 `sessionCwd(exec)` 回退链 `agent.meta.cwd → agent.session.header.cwd → agent.session.cwd`

- `generate_image` / `resolveImage` / dashscope refImage / vision-tools `saveArtifact` / `show_image` 全部改用；不回退 process.cwd()（输出必须落已打开工作区）

- 修复后云端 E2E（bailian-LLM）首次调用无需 output\_dir 即成功，`output-dir-errors=0`

- 详见 [docs/decisions.md](../docs/decisions.md) v2.6.1 条目

## v2.0 (历史) — 视觉工具箱（Vision Toolkit）

- 新增 6 个 AI 可调用视觉工具（`lib/vision-tools.js`，`buildVisionToolDefs(deps)` 工厂，与 analyze\_image 共享 resolveImage/askVlm 回退链）：

  - `zoom_image`：局部裁剪放大落盘 `zoom_*.png`（region 分数/像素两语义）— 纯本地 0 token

  - `sample_colors`：主色调采样（64×64 + 32-bin 量化，可选 region）— 纯本地 0 token

  - `image_diff`：8×8 网格像素对比 + worstRegions(≤5) + 热力图落盘 — 纯本地 0 token

  - `ocr_image`：engine=auto 本地 Tesseract（chi\_sim+eng, psm6, 20s）优先，失败/为空降级 VLM 转写（8000 字符软上限）；engine=local/vlm 显式

  - `detect_elements`：VLM 严格 JSON 编号元素 \[{number,label,box}] 原图像素坐标，>4MP 降采样，解析失败重试一次，box clamp + 2px 循环调色板标注图

  - `show_image`：markdown 内联 + attachment 块 + 客户端 toolview 卡片（首挂载即显示图片；含 sanitize marker 附件 id 提取兜底 + 就绪重试 + 状态复位）

- 配置新增 `visionToolsEnabled`（默认 true，normalize/mask/applyPatch 支持，Settings Module Switches 第三行开关）

- token 优化：工具只返回紧凑 JSON + 工件路径；`agent/pre-step` 处理器两层 tool-result 图片 sanitize —— ① `session.append('tool/result',…,{surfaceOp:{op:'replace'}})` 影子替换会话表面含 image 的 tool/result 事件（拦 `deriveMessages()` 与 compaction）；② 改写当步 claimed 消息里的工具图片块为短文本标记。**注意**：`agent/request` 只返回 provider/model 配置（messages 在其后才注入），第一版放那里的剥离器经 E2E 证明无效（show\_image 后 compaction 报 UNSUPPORTED\_CONTENT）

- client.js 注册 `tool.call.toolview` 卡片（show\_image 预览 + zoom/diff/detect 元数据卡，插槽缺失静默降级）

- `lib/vendor/png.js` 新增 `decodePng`（8-bit 非隔行 color type 0/2/3/4/6，PNG\_UNSUPPORTED 错误码）

- `package.json` files 增加 `lib/vision-tools.js`

- 新增 5 个测试文件（png-decode / vision-helpers / vision-local-tools / vision-ocr / vision-tool-gate），全量 101 测试通过

- 浏览器 E2E（模型 魔搭/deepseek-v4-flash-0731）：5 工具全部调用成功且协同闭环，最终中文总结正常生成，无 UNSUPPORTED\_CONTENT 类错误

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

- generate\_image tool (`prompt/size/n`) and openai-images / openai-completions protocols

- mergePatch collision fix：多字段联动必须走 commitStructure({apis: full})

(详见 [docs/plan/v1.4-1.6.md](./plan/v1.4-1.6.md))

## v1.3 (历史)

- apis: Card\[] 替代 api: {primary, backup} — 数组优先级从上到下

- 首次实现 single-request failover + JPG→PNG re-encode fallback

