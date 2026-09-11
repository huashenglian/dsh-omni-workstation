window.__ModuleLoader__.load({
	id: "dsh-omni-workstation",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		var React = require("react");

		// ---------- i18n dictionaries (inlined; locale service registers once) ----------
		var NS = "settings.omni-workstation";
		var DICTS = {
			zh: {
				nav: "全模态",
				loading: "加载中…",
				loadFail: "加载配置失败：",
				unknown: "未知错误",
				saving: " · 正在自动保存…",
				intro: "全模态工作台：配置视觉模型 (VLM)、图像生成、镜像路由与视觉工具箱。所有修改自动保存、立即生效，无需“保存”按钮。AI 通过 analyze_image 工具按卡片列表顺序从上到下调用；单次请求内重试超限后自动回退到下一张卡片，下一次请求重新从顶部开始。若没有任何有效的卡片配置，analyze_image 工具会自动隐藏。",
				retryTitle: "重试与回退",
				retryLabel: "重试次数（默认 5：单张卡片在单次请求内连续失败超过该值后，回退到下一张卡片）",
				statusPrefix: "当前有效卡片 ",
				toolVisible: " · analyze_image 工具已启用",
				toolHidden: " · analyze_image 工具已隐藏（无有效配置）",
				aboutTitle: "关于",
				aboutDesc: "该插件能够给予纯文本模型全模态的能力。",
				checkUpdateBtn: "检测更新",
				checkingUpdate: "检测中…",
				updateUpToDate: "已是最新版本",
				updateAvailable: "发现新版本 ",
				updateCheckFail: "检测更新失败",
				versionLabel: "版本 ",
				githubRepoBtn: "GitHub",
				githubRepoHint: "打开插件 GitHub 仓库",
				cardListTitle: "API 卡片",
				addCard: "添加模型",
				cardAdded: "已添加模型卡片",
				cardDeleted: "已删除卡片",
				cardsCollapsedAll: "已全部折叠",
					cardsExpandedAll: "已全部展开",
					cardsDeletedAll: "已删除全部卡片",
					batchDeleteAllTitle: "删除全部卡片",
					batchDeleteAllMsg: "确定要删除所有卡片吗？此操作不可撤销。",
					importedWf: "已导入工作流",
				deletedWf: "已删除工作流",
				resetDone: "已重置",
				autoMapped: "已自动映射",
				jsonUpdated: "已更新工作流",
				presetAdded: "已新建预设",
				presetDeleted: "已删除预设",
				presetSwitched: "已切换预设",
				mappingAdded: "已添加映射",
				mappingRemoved: "已删除映射",
				comingSoon: "即将推出",
				noCards: "尚未配置任何 API 卡片，点击右上角“添加模型”开始。",
				cardNamePh: "VLM API",
				nameHint: "双击重命名",
				providerLabel: "供应商",
				providerCustom: "自定义",
				providerOllama: "Ollama",
				protocolLabel: "API 协议",
				timeoutLabel: "超时 (ms)",
				contextWindowLabel: "上下文窗口",
				maxOutputLabel: "最大输出",
				protoOpenaiCompletions: "openai-completions",
				protoOpenaiResponses: "openai-responses",
				protoAnthropicMessages: "anthropic-messages",
				protoGoogleGemini: "google-gemini",
				endpointLabel: "端点 URL",
				endpointPh: "如 https://api.openai.com/v1 或 http://127.0.0.1:8080（Ollama）",
				comfyEndpointPh: "http://127.0.0.1:8188",
				comfyKeyPh: "可选，反代 Bearer Token（本地默认留空）",
				comfyHint: "ComfyUI：使用内置默认工作流，模型列表来自服务器 checkpoints 目录。",
				comfyModelPh: "点击右侧获取可用模型，选择服务器 checkpoint（如 sd_xl_base_1.0.safetensors）",
				imggenToolHidden: " · generate_image 工具已隐藏（生图配置无效）",
				imggenToolVisible: " · generate_image 工具已启用",
				comfyWfLabel: "ComfyUI 工作流",
				comfyWfPh: "粘贴工作流 JSON（API 格式，或 WebUI 保存的标准格式；留空用内置默认工作流）",
				comfyWfListTitle: "ComfyUI 工作流",
				comfyWfImportBtn: "导入工作流",
				comfyWfEdit: "编辑",
				comfyWfDelete: "删除",
				comfyWfDeleteConfirm: "确认删除此工作流？",
				comfyWfDeleteConfirmBtn: "确认删除",
				comfyWfDeleteCancel: "取消",
				comfyWfAutoMap: "自动映射",
				comfyWfBack: "返回列表",
				comfyWfNamePh: "工作流名称",
				comfyWfSteps: "Steps",
				comfyWfCfg: "CFG",
				comfyWfScheduler: "Scheduler",
				comfyWfSeed: "Seed（留空=随机）",
				comfyWfMappingTitle: "节点映射",
				comfyWfMappingSummary: "映射结果",
				comfyWfNoWorkflows: "暂无工作流，点击下方导入",
				comfyWfJsonLabel: "工作流 JSON",
				comfyWfBasicConfig: "基础配置",
				comfyWfError: "工作流解析失败",
				comfyWfImportPh: "选择 .json 工作流文件…",
				comfyWfDefaultTag: "内置默认工作流",
				// v2.9.15: history import removed; help + mapping add/delete retained
				comfyWfImportWarn: "已导入；以下角色未识别，生成时将保留工作流原值",
				comfyWfHelpBtn: "如何导入工作流？",
				comfyWfHelpTitle: "导入工作流",
				comfyWfHelpClose: "关闭",
				comfyWfHelpIntro: "推荐路径（三方节点兼容）：",
				comfyWfHelpStep1: "在 ComfyUI 浏览器菜单点击 Save → Save (API Format)，导出 .json 文件；",
				comfyWfHelpStep2: "在插件面板点击「导入工作流」，选择刚才导出的 .json 文件。API 格式工作流保留所有自定义节点，无需额外适配。",
				comfyWfHelpManualTitle: "备选路径：",
				comfyWfHelpManual: "ComfyUI 菜单 → Save (API Format) 导出 .json，再用「导入工作流」选择该文件。",
				comfyWfHelpMappingTitle: "映射说明：",
				comfyWfHelpMapping: "自动识别节点映射；对未识别的角色可手动添加（节点号 + 可选字段名），未识别项在生成时保留工作流原值，不影响运行。",
				comfyWfMappingAdd: "添加映射",
				comfyWfMappingAllMapped: "全部角色已映射",
				// v2.9.15: custom mappings (unlimited, user-defined injection points)
				comfyWfCustomMappings: "自定义映射",
				comfyWfAddCustom: "添加自定义映射",
				comfyWfCmLabel: "标签",
				comfyWfCmLabelPh: "如：正向提示词",
				comfyWfCmNode: "节点ID",
				comfyWfCmField: "字段名",
				comfyWfCmFieldPh: "如：text",
				comfyWfCmDesc: "描述",
				comfyWfCmDescPh: "说明此参数用途（AI 可见）",
				comfyWfCmType: "类型",
				comfyWfCmValue: "值",
				comfyWfCmValuePh: "留空=工作流默认",
				comfyWfCmOptions: "选项（逗号分隔）",
				comfyWfCmOptionsPh: "opt1,opt2,opt3",
				comfyWfCmTypeAuto: "自动",
				comfyWfCmTypeString: "字符串",
				comfyWfCmTypeFloat: "浮点数",
				comfyWfCmTypeInt: "整数",
				comfyWfCmTypeOption: "选项",
				comfyWfMappingDelete: "删除此项",
				comfyWfMappingFieldPh: "字段（留空=默认）",
				comfyWfMappingComplete: "已识别",
				comfyWfMappingMissing: "未识别",
				ollamaHint: "Ollama 为本地模型服务器：只需填写 URL，无需 API Key。",
				apiKeyLabel: "API Key（输入后自动保存；留空保持不变）",
				apiKeySet: "已设置（输入新值以替换）",
				modelLabel: "模型",
				modelPh: "如 gpt-4o / qwen-vl-max / glm-4v / llama3.2-vision",
				fetchBtn: "获取可用模型",
				fetching: "获取中…",
				endpointHint: "提示：填好端点（和 Key）后点“获取可用模型”即可拉取模型列表；所有修改都会自动保存。",
				modelsAvail: "可用模型：",
				fetchOkPrefix: "可用模型 ",
				fetchOkSuffix: " 个",
				fetchFail: "获取模型列表失败：",
				saveFail: "保存失败：",
				menuPinTop: "置顶",
				menuPinBottom: "沉底",
				menuDelete: "删除",
				keyReveal: "显示 Key",
				keyHide: "隐藏 Key",
ddHint: "选择模型",
			dragHint: "拖动调整顺序",
			tabImggen: "生图",
			moduleSwitch: "模块开关",
			toolOff: " · analyze_image 已停用（模块开关关闭）",
			imggenIntro: "配置图像生成模型：AI 通过 generate_image 工具生成图片并保存到工作区 generated-images/ 目录。所有修改自动保存。",
			imggenTitle: "生图配置",
			imggenProviderLabel: "供应商",
			imggenProtocolLabel: "API 协议",
			imggenProtocolImages: "openai-images",
			imggenProtocolChat: "openai-completions",
			imggenApiPathLabel: "API 路径",
			imggenApiPathPh: "默认 /images/generations",
			imggenEndpointLabel: "端点 URL",
			imggenKeyLabel: "API Key（输入后自动保存；留空保持不变）",
			imggenModelLabel: "模型",
			imggenVaeLabel: "VAE",
			imggenClipLabel: "CLIP",
			imggenVaePh: "点击右侧获取，选择服务器 VAE（留空=用工作流内置 VAE）",
			imggenClipPh: "点击右侧获取，选择服务器 CLIP（留空=用工作流内置 CLIP）",
			imggenTimeoutLabel: "超时 (ms)",
			imggenRetryLabel: "重试次数",
			imggenResponseFormatLabel: "响应格式",
			imggenFormatAuto: "自动（优先 b64_json，url 立即下载）",
			imggenFormatB64: "b64_json",
			imggenFormatUrl: "url",
			imggenFilterLabel: "仅显示生图模型",
			imggenFilterHint: "获取模型时按关键词筛选（含 image 的模型），关闭则拉取全部",
			imggenFetchBtn: "获取可用模型",
			imggenFetching: "获取中…",
			imggenReset: "重置配置",
			imggenResetConfirm: "确定",
			imggenResetHint: "重置所有生图配置为初始状态",
			imggenNoConfig: "未配置有效的生图 API，generate_image 工具已隐藏。",
			imggenStatusPrefix: "生图有效配置",
			presetNamePh: "预设名称",
			presetNew: "新建",
			presetSaved: "保存",
			presetDelete: "删除",
			presetDeleteTitle: "删除预设",
			presetDeleteConfirm: "确认删除",
			presetDeleteCancel: "取消",
			presetDeleteMsg: "确定要删除该预设吗？此操作不可撤销。",
			presetDeleteDisabled: "至少保留一个预设",
			presetNewName: "新预设",
			presetDefaultName: "默认",
			batchCollapseAll: "收纳全部",
			batchExpandAll: "展开全部",
			batchDeleteAll: "删除全部",
			confirmDelete: "确定",
			fixedUrlLabel: "内置端点",
			providerGroupGeneral: "通用",
			providerGroupBuiltin: "内置供应商",
			fallbackTitle: "兜底模型",
			fallbackProviderLabel: "供应商",
			fallbackModelsLabel: "模型列表（从上到下回退）",
			fallbackEmpty: "暂无模型，点击上方获取并选择模型",
			fallbackReset: "重置为默认模型列表",
			mirrorTitle: "镜像模型",
			mirrorAutoVisionLabel: "auto-vision 自动路由",
			mirrorAutoVisionHint: "开启后在 /model 显示 Auto Vision 条目，自动路由到最近使用的模型",
			mirrorAllLabel: "镜像全部模型",
			mirrorAllHint: "开启后将所有供应商镜像为多模态条目（掩盖下方列表）",
			mirrorMappingsLabel: "模型映射列表",
			mirrorAddMapping: "添加映射",
			mirrorOriginalModelLabel: "原模型",
			mirrorOriginalModelPh: "点击选择原模型",
			mirrorMirrorNameLabel: "镜像名",
			mirrorMirrorNamePh: "留空则用 <原模型>-vision",
			mirrorMappingEmpty: "暂无映射，点击「添加映射」创建",
			mirrorMappingsDisabled: "镜像全部已开启，下方列表被掩盖",
			mirrorSummaryAll: "全部镜像",
			mirrorSummaryOff: "已关闭",
			settingsTab: "设置",
			settingsTitle: "全局配置",
			tabVideo: "视频",
				tabAudio: "语音",
				voiceTitle: "语音配置",
				voiceSubtabTts: "TTS",
				voiceSubtabStt: "STT",
				voiceProviderMimo: "MiMo（小米）",
				voiceProviderMinimax: "MiniMax 海螺",
				voiceProviderDoubao: "豆包 OpenSpeech",
				voiceProviderIndextts: "IndexTTS",
				voiceProviderGptsovits: "GPT-SoVITS",
				voiceProviderVoxcpm: "VoxCPM",
				voiceProviderTtsWebui: "本地 TTS-WebUI 桥接",
				voiceGroupCloud: "云端",
				voiceGroupLocal: "本地",
				voiceModelTts: "mimo-v2.5-tts（预置音色）",
				voiceModelVoicedesign: "mimo-v2.5-tts-voicedesign（文本设计）",
				voiceModelVoiceclone: "mimo-v2.5-tts-voiceclone（音色复刻）",
				voicePresetVoice: "预置音色",
				voiceVoiceDesc: "音色描述",
				voiceSamplePath: "参考音频",
				voiceStyleInstruction: "风格指令",
				voiceSingMode: "唱歌模式",
				voiceOptimizeText: "智能润色文本",
				voiceStatusOn: "speak 工具已启用",
				voiceStatusOff: "speak 工具已隐藏",
				voiceStatusNoConfig: "speak 工具已隐藏（无有效配置）",
				voiceStatusSubOff: "speak 工具已隐藏（子开关关闭）",
				voiceStatusNoSynth: "speak 工具已隐藏（该供应商合成未接入，仅 mimo/minimax 可用）",
				voiceCloneOn: "clone_voice 工具已启用",
				voiceCloneOff: "clone_voice 工具已隐藏",
				voiceSttPlaceholder: "STT 模块尚在开发中",
				voiceTtsModelsOnly: "仅显示 TTS 模型",
				voiceFetchModels: "获取可用模型",
voiceFetchBtn: "获取可用模型",
voiceFetchVoices: "拉音色",
voiceFetchRefAudio: "拉参考音频",
voiceFetchModelsShort: "拉模型",
voiceFilterTts: "仅显示 TTS 模型",
voiceFilterTtsDesc: "获取模型时按关键词筛选（含 tts/speech 的模型），关闭则拉取全部",
voiceModelPh: "如 mimo-v2.5-tts / speech-2.8-hd / seed-tts-2.0",
voiceStyleNotParsed: "当前供应商不解析此字段",
voiceDoubaoAppId: "App ID",
voiceDoubaoAccessKey: "Access Token",
voiceDoubaoCloneSection: "自定义音色",
voiceDoubaoCloneSpeakerPh: "speaker_id（如 hutao_voice）",
voiceDoubaoCloneBtn: "复刻",
voiceDoubaoCloneOk: "音色复刻成功",
voiceDoubaoCloneFail: "音色复刻失败",
voiceDoubaoCloneTraining: "训练中...",
voiceIndexEmoStrategy: "情绪策略 (0-3)",
voiceIndexEmoWeight: "emo_weight",
		voiceVoxcpmMode: "模式",
		voiceGptsovitsGptModel: "GPT 模型",
		voiceGptsovitsSovitsModel: "SoVITS 模型",
		voiceGptsovitsRefAudio: "参考音频路径",
		voiceGptsovitsRefText: "参考文本",
		voiceMinimaxRegion: "Region",
voiceRetryCount: "重试次数",
voiceOutputFormat: "输出格式",
voiceStreamOutput: "流式输出",
voiceSpeaker: "speaker",
voiceRefAudio: "参考音频",
voiceRefAudioPath: "参考音频",
			voiceRefText: "参考文本",
			voiceUpload: "上传",
			voiceRefAudioDelete: "删除参考音频",
			voiceRefAudioDeleteTitle: "删除参考音频",
			voiceRefAudioDeleteMsg: "确定删除此参考音频？此操作不可逆，将同时删除本地音频文件。",
			voiceRefAudioDeleteConfirm: "删除",
			voiceRefAudioNameTitle: "导入参考音频",
			voiceRefAudioNameMsg: "为参考音频命名（默认为文件名，同名将自动加编号）：",
			voiceRefAudioNamePh: "输入名称",
			voiceRefAudioUploadOk: "参考音频已导入",
			voiceRefAudioDeleteOk: "参考音频已删除",
			voiceRefAudioRenameOk: "参考音频已重命名",
			voiceRefAudioEmpty: "暂无参考音频，点击右侧「上传」导入",
			voiceRefAudioUploadFail: "参考音频导入失败",
			voiceCloneSection: "克隆音色",
			voiceCloneVoiceIdPh: "voice_id（如 hutao）",
			voiceCloneBtn: "克隆",
			voiceClonePickRef: "选择",
			voiceClonePickRefTitle: "选择参考音频",
			voiceCloneLibMenu: "音色库",
			voiceCloneLibEmpty: "音色库为空，点击「选择」上传音频",
			voiceCloneOk: "音色克隆成功",
			voiceCloneFail: "音色克隆失败",
voiceGptModel: "GPT 模型名",
voiceSovitsModel: "SoVITS 模型名",
				voiceReset: "重置语音配置",
				voiceResetConfirm: "确认重置？",
				voiceResetHint: "恢复默认语音配置",
				voiceLibraryTitle: "音色库",
				voiceLibraryEmpty: "暂无克隆音色",
				voiceLibraryPlay: "试听",
				voiceLibraryDelete: "删除",
				voiceEndpoint: "端点 URL",
				voiceApiKey: "API Key",
				voiceModel: "模型",
				voiceTimeout: "超时 (ms)",
				voiceProvider: "供应商",
			tabPlaceholder: "该模块尚在规划中，敬请期待。",
			// v2.8 视频生成
			videoIntro: "配置视频生成模型：AI 通过 generate_video 工具生成视频（文生视频 t2v / 图生视频 i2v）并保存到工作区。视频生成是异步任务，可能耗时数分钟。关闭本模块开关时不会向模型注入 generate_video 工具（0 token 消耗）。",
			videoTitle: "视频配置",
			videoProviderLabel: "供应商",
			videoProtocolLabel: "API 协议",
			videoEndpointLabel: "端点 URL",
			videoKeyLabel: "API Key（输入后自动保存；留空保持不变）",
			videoKeyKlingHint: "可灵需填入 AccessKey|SecretKey（中间用竖线 | 分隔）",
			videoModelLabel: "模型",
			videoTimeoutLabel: "超时 (ms)",
			videoPollIntervalLabel: "轮询间隔 (s)",
			videoRetryLabel: "重试次数",
			videoFilterLabel: "仅显示视频模型",
			videoFilterHint: "获取模型时按视频模型名筛选（i2v/t2v/wan/sora 等，自动排除 t2i/生图模型），关闭则拉取全部",
			videoFetchBtn: "获取可用模型",
			videoFetching: "获取中…",
			videoReset: "重置配置",
			videoResetConfirm: "确定",
			videoResetHint: "重置所有视频配置为初始状态",
			videoNoConfig: "未配置有效的视频 API，generate_video 工具已隐藏。",
			videoCardModalTitle: "添加视频模型",
			videoCardEditTitle: "编辑视频模型",
			videoCardModelName: "模型名称",
			videoCardModelType: "模型类型",
			videoCardToolName: "工具名称",
			videoCardModelDef: "模型定义",
			videoCardTypeGeneral: "通用",
			videoCardTypeCustom: "自定义",
			videoCardTypeT2v: "文生视频",
			videoCardTypeI2v: "图生视频",
			videoCardTypeEdit: "视频编辑",
			videoCardTypeRef: "参考生成",
			videoCardAddType: "添加类型",
			videoCardDeleteType: "删除类型",
			videoCardMaxCards: "最多 10 个卡片",
			videoCardTypeExists: "该类型已有卡片",
			videoCardToolNameTaken: "工具名已存在",
			videoCardConfirm: "确定",
			videoCardCancel: "取消",
			videoCardNoCards: "尚未配置任何视频模型卡片",
			videoCardListTitle: "视频模型卡片",
			videoStatusPrefix: "生视频有效配置",
			videoSecondsLabel: "默认时长 (s)",
			videoAspectLabel: "画幅",
			videoResolutionLabel: "分辨率",
			videoSubmitPathLabel: "提交路径",
			videoPollPathLabel: "轮询路径",
			videoTaskIdFieldLabel: "任务 ID 字段",
			videoStatusFieldLabel: "状态字段",
			videoResultFieldLabel: "结果字段",
			videoDoneStatusLabel: "完成状态值",
			videoAsyncHint: "async-task 协议：自行填写提交/轮询路径与字段，适配任意异步任务网关",
			videoAdapterHint: "custom-adapter：使用 AI 编写的 adapterCode（buildSubmit/parseTaskId/pollUrl/parseStatus）对接任意平台",
			videoProviderCustom: "自定义",
			videoProviderAgnes: "Agnes AI",
			videoProviderAgnesCn: "Agnes AI CN",
			videoProviderDashscope: "阿里云百炼",
			videoProviderKling: "可灵",
			videoProviderVolc: "火山引擎",
			videoProviderMinimax: "MiniMax 海螺",
			videoProviderQwenTokenPlan: "Qwen Token Plan",
			videoProviderQwenTokenPlanCn: "Qwen Token Plan CN",
			videoProtocolOpenai: "openai-videos（openai兼容）",
			videoProtocolDashscope: "dashscope-video（百炼 wan）",
			videoProtocolKling: "kling-video（JWT）",
			videoProtocolVolc: "volc-video（火山方舟）",
			videoProtocolMinimax: "minimax-video（海螺）",
			videoProtocolAsync: "async-task（通用异步）",
			videoProtocolCustomAdapter: "custom-adapter（自定义脚本）",
			videoAdapterCodeLabel: "Adapter 代码",
			videoGroupGeneral: "通用",
			videoGroupIntl: "内置供应商 · 海外",
			videoGroupCn: "内置供应商 · 国内",
			videoGroupBuiltin: "内置供应商",
			videoToolOn: "generate_video 工具已启用",
			videoToolHidden: "未配置有效视频 API，generate_video 工具已隐藏",
			videoCardModalTitle: "添加视频模型",
			videoCardEditTitle: "编辑视频模型",
			videoCardModelName: "模型名称",
			videoCardModelNamePh: "视频模型名称",
			videoCardModelType: "模型类型",
			videoCardToolName: "工具名称",
			videoCardModelDef: "模型定义",
			videoCardTypeGeneral: "通用",
			videoCardTypeCustom: "自定义",
			videoCardTypeT2v: "文生视频",
			videoCardTypeI2v: "图生视频",
			videoCardTypeEdit: "视频编辑",
			videoCardTypeRef: "参考生成",
			videoCardAddType: "添加自定义类型",
			videoCardDeleteType: "删除类型",
			videoCardMaxCards: "最多 10 个卡片",
			videoCardTypeExists: "该类型已有卡片",
			videoCardToolNameTaken: "工具名已存在",
			videoCardTypeGeneralHint: "通用类型：用途由实际模型决定",
			videoCardConfirm: "确认",
			videoCardCancel: "取消",
			videoCardDeleteTitle: "删除卡片",
			videoCardDeleteMsg: "确定要删除此卡片吗？此操作不可撤销。",
			videoCardNoCards: "尚未配置任何视频模型卡片，点击右上角“添加模型”开始。",
			videoCardBatchCollapseAll: "收纳全部",
			videoCardBatchExpandAll: "展开全部",
			videoCardBatchDeleteAll: "删除全部",
			videoCardAdded: "已添加视频模型卡片",
			videoCardDeleted: "已删除视频模型卡片",
			settingsModuleSection: "模块开关",
			settingsBackoffSection: "退避策略",
			backoffBaseLabel: "退避基数 (ms)",
			backoffMaxLabel: "退避上限 (ms)",
			backoff429BaseLabel: "429 退避基数 (ms)",
			backoff429MaxLabel: "429 退避上限 (ms)",
			retryStatusCodesLabel: "重试状态码",
			retryStatusCodesHint: "逗号分隔的 HTTP 状态码，触发重试+回退",
			toolOffToolkit: " · analyze_image 已停用 · 视觉工具箱仍可用（本地工具不依赖 VLM）",
			verifyReminderLabel: "生图后自动验证提醒",
			dynamicAdaptLabel: "动态多模态适应",
			dynamicAdaptHint: "开启：按当前对话模型是否多模态自动选择识图工具与生图验证提示；关闭：始终用 analyze_image",
			toolsSwitchLabel: "视觉工具箱",
			toolsOpen: "已开启",
			toolsOff: "已关闭",
			extCardTitle: "开关扩展",
			extVlmSection: "VLM",
			extVideoSection: "视频",
			videoBuilderSwitchLabel: "斜杠指令构建自定义视频工具",
			videoBuilderSwitchHint: "开启后在斜杠菜单出现 /build-video-tool；关闭则指令消失",
			videoCardLimitLabel: "视频卡片上限",
			videoCardLimitHint: "最多 10 张视频模型卡片及对应工具（含 AI 自定义）",
			videoAiBadge: "AI",
				extToolSettings: "工具设置",
				toolZoomImage: "局部放大",
				toolSampleColors: "采样取色",
				toolImageDiff: "图像对比",
				toolOcrImage: "OCR 文字",
				toolDetectElements: "元素检测",
				toolShowImage: "图片展示",
				toolZoomImageDesc: "放大图片关键区域以看清细节",
				toolSampleColorsDesc: "提取图片主要颜色",
				toolImageDiffDesc: "对比两张图片的差异",
				toolOcrImageDesc: "识别提取图中文字",
				toolDetectElementsDesc: "检测图中 UI 元素与位置",
				toolShowImageDesc: "在会话中展示本地图片",
				providerBailian: "阿里云百炼",
			toolsLocalImage: "本地图像",
			toolsFile: "文件",
			toolsCopyPath: "复制路径",
			toolsCopied: "已复制",
			toolsNoData: "无附加数据",
			toolsImageError: "图片读取失败",
			toolsZoom: "图像放大",
			toolsImageDiff: "像素对比",
			toolsElements: "元素检测"
		},
			en: {
				nav: "Omni Workstation",
				loading: "Loading…",
				loadFail: "Failed to load config: ",
				unknown: "unknown error",
				saving: " · auto-saving…",
				intro: "Omni Workstation: configure vision models (VLM), image generation, mirror routing and the vision toolkit. All changes auto-save and take effect immediately — no Save button. The AI calls these API cards via the analyze_image tool top-down; within a single request it retries and falls back to the next card past the retry limit, and every new request restarts from the top card. If no card is fully configured, analyze_image is hidden automatically.",
				retryTitle: "Retry & Fallback",
				retryLabel: "Retry count (default 5: within a single request, a card falls back to the next after this many consecutive failures)",
				statusPrefix: "Valid cards: ",
				toolVisible: " · analyze_image enabled",
				toolHidden: " · analyze_image hidden (no valid config)",
				aboutTitle: "About",
				aboutDesc: "This plugin gives pure text models full multimodal capabilities.",
				checkUpdateBtn: "Check for Updates",
				checkingUpdate: "Checking…",
				updateUpToDate: "Already up to date",
				updateAvailable: "New version available: ",
				updateCheckFail: "Update check failed",
				versionLabel: "Version ",
				githubRepoBtn: "GitHub",
				githubRepoHint: "Open plugin repository on GitHub",
				cardListTitle: "API Cards",
				addCard: "Add Model",
				cardAdded: "Card added",
				cardDeleted: "Card deleted",
				cardsCollapsedAll: "All collapsed",
					cardsExpandedAll: "All expanded",
					cardsDeletedAll: "All cards deleted",
					batchDeleteAllTitle: "Delete All Cards",
					batchDeleteAllMsg: "Are you sure you want to delete all cards? This cannot be undone.",
					importedWf: "Workflow imported",
				deletedWf: "Workflow deleted",
				resetDone: "Reset complete",
				autoMapped: "Auto-mapped",
				jsonUpdated: "Workflow updated",
				presetAdded: "Preset added",
				presetDeleted: "Preset deleted",
				presetSwitched: "Preset switched",
				mappingAdded: "Mapping added",
				mappingRemoved: "Mapping removed",
				comingSoon: "Coming soon",
				noCards: "No API cards yet. Click “Add Model” in the top-right to start.",
				cardNamePh: "VLM API",
				nameHint: "Double-click to rename",
				providerLabel: "Provider",
				providerCustom: "Custom",
				providerOllama: "Ollama",
				protocolLabel: "API Protocol",
				timeoutLabel: "Timeout (ms)",
				contextWindowLabel: "Context Window",
				maxOutputLabel: "Max Output",
				protoOpenaiCompletions: "openai-completions",
				protoOpenaiResponses: "openai-responses",
				protoAnthropicMessages: "anthropic-messages",
				protoGoogleGemini: "google-gemini",
				endpointLabel: "Endpoint URL",
				endpointPh: "e.g. https://api.openai.com/v1 or http://127.0.0.1:8080 (Ollama)",
				comfyEndpointPh: "http://127.0.0.1:8188",
				comfyKeyPh: "Optional, proxy Bearer Token (leave blank for local)",
				comfyHint: "ComfyUI: uses the built-in default workflow; model list comes from the server checkpoints dir.",
				comfyModelPh: "Click Fetch to pick a server checkpoint (e.g. sd_xl_base_1.0.safetensors)",
				imggenToolHidden: " · generate_image tool hidden (no valid image-gen config)",
				imggenToolVisible: " · generate_image tool enabled",
				comfyWfLabel: "ComfyUI Workflow",
				comfyWfPh: "Paste workflow JSON (API format, or standard WebUI format; blank = built-in default)",
				comfyWfListTitle: "ComfyUI Workflow",
				comfyWfImportBtn: "Import Workflow",
				comfyWfEdit: "Edit",
				comfyWfDelete: "Delete",
				comfyWfDeleteConfirm: "Delete this workflow?",
				comfyWfDeleteConfirmBtn: "Confirm Delete",
				comfyWfDeleteCancel: "Cancel",
				comfyWfAutoMap: "Auto Map",
				comfyWfBack: "Back to List",
				comfyWfNamePh: "Workflow name",
				comfyWfSteps: "Steps",
				comfyWfCfg: "CFG",
				comfyWfScheduler: "Scheduler",
				comfyWfSeed: "Seed (empty=random)",
				comfyWfMappingTitle: "Node Mapping",
				comfyWfMappingSummary: "Mapping Result",
				comfyWfNoWorkflows: "No workflows yet, click import below",
				comfyWfJsonLabel: "Workflow JSON",
				comfyWfBasicConfig: "Basic Config",
				comfyWfError: "Workflow parse failed",
				comfyWfImportPh: "Choose a .json workflow file…",
				comfyWfDefaultTag: "Built-in default workflow",
				// v2.9.15: history import removed; help + mapping add/delete retained
				comfyWfImportWarn: "Imported; the following roles were not identified — their original workflow values will be kept on generation",
				comfyWfHelpBtn: "How to import a workflow?",
				comfyWfHelpTitle: "Import Workflow",
				comfyWfHelpClose: "Close",
				comfyWfHelpIntro: "Recommended path (custom-node friendly):",
				comfyWfHelpStep1: "In the ComfyUI browser click Save → Save (API Format) to export a .json file;",
				comfyWfHelpStep2: "In this panel click “Import Workflow” and pick the .json file. API-format workflows preserve all custom nodes — no special adaptation needed.",
				comfyWfHelpManualTitle: "Alternative path:",
				comfyWfHelpManual: "ComfyUI menu → Save (API Format) to export a .json, then use “Import Workflow” to pick the file.",
				comfyWfHelpMappingTitle: "Mapping notes:",
				comfyWfHelpMapping: "Node roles are auto-detected; for unrecognized ones you can add them manually (node id + optional field name). Unidentified roles keep their original values on generation — they never block running.",
				comfyWfMappingAdd: "Add Mapping",
				comfyWfMappingAllMapped: "All roles mapped",
				// v2.9.15: custom mappings (unlimited, user-defined injection points)
				comfyWfCustomMappings: "Custom Mappings",
				comfyWfAddCustom: "Add Custom Mapping",
				comfyWfCmLabel: "Label",
				comfyWfCmLabelPh: "e.g. Positive Prompt",
				comfyWfCmNode: "Node ID",
				comfyWfCmField: "Field",
				comfyWfCmFieldPh: "e.g. text",
				comfyWfCmDesc: "Description",
				comfyWfCmDescPh: "Explain this parameter (AI-visible)",
				comfyWfCmType: "Type",
				comfyWfCmValue: "Value",
				comfyWfCmValuePh: "blank=workflow default",
				comfyWfCmOptions: "Options (comma-separated)",
				comfyWfCmOptionsPh: "opt1,opt2,opt3",
				comfyWfCmTypeAuto: "Auto",
				comfyWfCmTypeString: "String",
				comfyWfCmTypeFloat: "Float",
				comfyWfCmTypeInt: "Integer",
				comfyWfCmTypeOption: "Option",
				comfyWfMappingDelete: "Remove",
				comfyWfMappingFieldPh: "Field (blank = default)",
				comfyWfMappingComplete: "Identified",
				comfyWfMappingMissing: "Unidentified",
				ollamaHint: "Ollama is a local model server: just fill in the URL, no API Key needed.",
				apiKeyLabel: "API Key (auto-saves on input; leave blank to keep)",
				apiKeySet: "Set (enter new value to replace)",
				modelLabel: "Model",
				modelPh: "e.g. gpt-4o / qwen-vl-max / glm-4v / llama3.2-vision",
				fetchBtn: "Fetch available models",
				fetching: "Fetching…",
				endpointHint: "Tip: enter the endpoint (and Key) then click “Fetch available models” to list models; all edits auto-save.",
				modelsAvail: "Available models: ",
				fetchOkPrefix: "Available models: ",
				fetchOkSuffix: "",
				fetchFail: "Failed to fetch models: ",
				saveFail: "Save failed: ",
				menuPinTop: "Pin to Top",
				menuPinBottom: "Send to Bottom",
				menuDelete: "Delete",
				keyReveal: "Show key",
				keyHide: "Hide key",
ddHint: "Pick a model",
			dragHint: "Drag to reorder",
			tabImggen: "Image Gen",
			moduleSwitch: "Module switch",
			toolOff: " · analyze_image disabled (module switch off)",
			imggenIntro: "Configure image generation models: the AI generates images via the generate_image tool and saves them to the workspace generated-images/ directory. All changes auto-save.",
			imggenTitle: "Image Gen Config",
			imggenProviderLabel: "Provider",
			imggenProtocolLabel: "API Protocol",
			imggenProtocolImages: "openai-images",
			imggenProtocolChat: "openai-completions",
			imggenApiPathLabel: "API Path",
			imggenApiPathPh: "Default /images/generations",
			imggenEndpointLabel: "Endpoint URL",
			imggenKeyLabel: "API Key (auto-saves on input; leave blank to keep)",
			imggenModelLabel: "Model",
			imggenVaeLabel: "VAE",
			imggenClipLabel: "CLIP",
			imggenVaePh: "Click fetch to pick a server VAE (blank = workflow's built-in VAE)",
			imggenClipPh: "Click fetch to pick a server CLIP (blank = workflow's built-in CLIP)",
			imggenTimeoutLabel: "Timeout (ms)",
			imggenRetryLabel: "Retry count",
			imggenResponseFormatLabel: "Response format",
			imggenFormatAuto: "Auto (b64_json preferred; url downloaded immediately)",
			imggenFormatB64: "b64_json",
			imggenFormatUrl: "url",
			imggenFilterLabel: "Show image models only",
			imggenFilterHint: "Filter models by keyword (image) when fetching; off fetches all",
			imggenFetchBtn: "Fetch available models",
			imggenFetching: "Fetching…",
			imggenReset: "Reset config",
			imggenResetConfirm: "Confirm",
			imggenResetHint: "Reset all image-generation config to defaults",
			imggenNoConfig: "No valid image-generation API configured; generate_image is hidden.",
			imggenStatusPrefix: "Image gen valid config",
			presetNamePh: "Preset name",
			presetNew: "New",
			presetSaved: "Save",
			presetDelete: "Delete",
			presetDeleteTitle: "Delete Preset",
			presetDeleteConfirm: "Confirm Delete",
			presetDeleteCancel: "Cancel",
			presetDeleteMsg: "Are you sure you want to delete this preset? This cannot be undone.",
			presetDeleteDisabled: "At least one preset must remain",
			presetNewName: "New Preset",
			presetDefaultName: "Default",
			batchCollapseAll: "Collapse all",
			batchExpandAll: "Expand all",
			batchDeleteAll: "Delete all",
			confirmDelete: "Confirm",
			fixedUrlLabel: "Built-in endpoint",
			providerGroupGeneral: "General",
			providerGroupBuiltin: "Built-in providers",
			fallbackTitle: "Fallback Models",
			fallbackProviderLabel: "Provider",
			fallbackModelsLabel: "Model list (failover top to bottom)",
			fallbackEmpty: "No models yet. Fetch and pick models above.",
			fallbackReset: "Reset to default model list",
			mirrorTitle: "Mirror Models",
			mirrorAutoVisionLabel: "auto-vision auto-routing",
			mirrorAutoVisionHint: "Shows an Auto Vision entry in /model that auto-routes to the last-used model",
			mirrorAllLabel: "Mirror all models",
			mirrorAllHint: "Mirrors every provider as a multimodal entry (masks the list below)",
			mirrorMappingsLabel: "Model mappings",
			mirrorAddMapping: "Add mapping",
			mirrorOriginalModelLabel: "Original model",
			mirrorOriginalModelPh: "Click to select original model",
			mirrorMirrorNameLabel: "Mirror name",
			mirrorMirrorNamePh: "Empty = <original>-vision",
			mirrorMappingEmpty: "No mappings yet. Click \"Add mapping\" to create one.",
			mirrorMappingsDisabled: "Mirror all is on; the list below is masked",
			mirrorSummaryAll: "Mirror all",
			mirrorSummaryOff: "Off",
			settingsTab: "Settings",
			settingsTitle: "Global Config",
			tabVideo: "Video",
				tabAudio: "Audio",
				voiceTitle: "Voice Configuration",
				voiceSubtabTts: "TTS",
				voiceSubtabStt: "STT",
				voiceProviderMimo: "MiMo (Xiaomi)",
				voiceProviderMinimax: "MiniMax",
				voiceProviderDoubao: "Doubao OpenSpeech",
				voiceProviderIndextts: "IndexTTS",
				voiceProviderGptsovits: "GPT-SoVITS",
				voiceProviderVoxcpm: "VoxCPM",
				voiceProviderTtsWebui: "Local TTS-WebUI Bridge",
				voiceGroupCloud: "Cloud",
				voiceGroupLocal: "Local",
				voiceModelTts: "mimo-v2.5-tts (preset voice)",
				voiceModelVoicedesign: "mimo-v2.5-tts-voicedesign (text design)",
				voiceModelVoiceclone: "mimo-v2.5-tts-voiceclone (voice clone)",
				voicePresetVoice: "Preset Voice",
				voiceVoiceDesc: "Voice Description",
				voiceSamplePath: "Reference audio",
				voiceStyleInstruction: "Style Instruction",
				voiceSingMode: "Sing Mode",
				voiceOptimizeText: "Optimize Text",
				voiceStatusOn: "speak tool enabled",
				voiceStatusOff: "speak tool hidden",
				voiceStatusNoConfig: "speak tool hidden (no valid config)",
				voiceStatusSubOff: "speak tool hidden (sub-switch off)",
			voiceStatusNoSynth: "speak tool hidden (synthesis not wired for this provider; only mimo/minimax supported)",
				voiceCloneOn: "clone_voice tool enabled",
				voiceCloneOff: "clone_voice tool hidden",
				voiceSttPlaceholder: "STT module under development",
				voiceTtsModelsOnly: "Show TTS models only",
				voiceFetchModels: "Fetch available models",
voiceFetchBtn: "Fetch models",
voiceFetchVoices: "Fetch voices",
voiceFetchRefAudio: "Fetch ref audio",
voiceFetchModelsShort: "Fetch models",
voiceFilterTts: "Show TTS models only",
voiceFilterTtsDesc: "Filter models by keyword (tts/speech) when fetching; off = fetch all",
voiceModelPh: "e.g. mimo-v2.5-tts / speech-2.8-hd / seed-tts-2.0",
voiceStyleNotParsed: "This provider does not parse this field",
		voiceDoubaoAppId: "App ID",
		voiceDoubaoAccessKey: "Access Token",
		voiceDoubaoCloneSection: "Custom voice",
		voiceDoubaoCloneSpeakerPh: "speaker_id (e.g. hutao_voice)",
		voiceDoubaoCloneBtn: "Clone",
		voiceDoubaoCloneOk: "Voice cloned",
		voiceDoubaoCloneFail: "Voice clone failed",
		voiceDoubaoCloneTraining: "Training...",
voiceIndexEmoStrategy: "Emotion Strategy (0-3)",
voiceIndexEmoWeight: "emo_weight",
		voiceVoxcpmMode: "Mode",
		voiceGptsovitsGptModel: "GPT model",
		voiceGptsovitsSovitsModel: "SoVITS model",
		voiceGptsovitsRefAudio: "Reference audio path",
		voiceGptsovitsRefText: "Reference text",
		voiceMinimaxRegion: "Region",
voiceRetryCount: "Retry count",
voiceOutputFormat: "Output format",
voiceStreamOutput: "Stream output",
voiceSpeaker: "speaker",
voiceRefAudio: "Reference audio",
voiceRefAudioPath: "Reference audio",
			voiceRefText: "Reference text",
			voiceUpload: "Upload",
			voiceRefAudioDelete: "Delete reference audio",
			voiceRefAudioDeleteTitle: "Delete reference audio",
			voiceRefAudioDeleteMsg: "Delete this reference audio? This is irreversible and removes the local audio file.",
			voiceRefAudioDeleteConfirm: "Delete",
			voiceRefAudioNameTitle: "Import reference audio",
			voiceRefAudioNameMsg: "Name the reference audio (defaults to filename; duplicates get a suffix number):",
			voiceRefAudioNamePh: "Enter a name",
			voiceRefAudioUploadOk: "Reference audio imported",
			voiceRefAudioDeleteOk: "Reference audio deleted",
			voiceRefAudioRenameOk: "Reference audio renamed",
			voiceRefAudioEmpty: "No reference audio yet — click \"Upload\" to import",
			voiceRefAudioUploadFail: "Reference audio import failed",
			voiceCloneSection: "Voice clone",
			voiceCloneVoiceIdPh: "voice_id (e.g. hutao)",
			voiceCloneBtn: "Clone",
			voiceClonePickRef: "Pick",
			voiceClonePickRefTitle: "Pick reference audio",
			voiceCloneLibMenu: "Voice library",
			voiceCloneLibEmpty: "Voice library is empty — click \"Pick\" to upload",
			voiceCloneOk: "Voice cloned",
			voiceCloneFail: "Voice clone failed",
voiceGptModel: "GPT model name",
voiceSovitsModel: "SoVITS model name",
				voiceReset: "Reset voice config",
				voiceResetConfirm: "Confirm?",
				voiceResetHint: "Restore default voice config",
				voiceLibraryTitle: "Voice Library",
				voiceLibraryEmpty: "No cloned voices",
				voiceLibraryPlay: "Play",
				voiceLibraryDelete: "Delete",
				voiceEndpoint: "Endpoint URL",
				voiceApiKey: "API Key",
				voiceModel: "Model",
				voiceTimeout: "Timeout (ms)",
				voiceProvider: "Provider",
			tabPlaceholder: "This module is planned. Coming soon.",
			// v2.8 video generation
			videoIntro: "Configure video generation models: the AI generates videos via the generate_video tool (text-to-video t2v / image-to-video i2v) and saves them to the workspace. Video generation is an async task that can take minutes. Turning this module switch off stops injecting the generate_video tool into the model prompt (0 token cost).",
			videoTitle: "Video Config",
			videoProviderLabel: "Provider",
			videoProtocolLabel: "API Protocol",
			videoEndpointLabel: "Endpoint URL",
			videoKeyLabel: "API Key (auto-saves on input; leave blank to keep)",
			videoKeyKlingHint: "Kling requires AccessKey|SecretKey (separated by a pipe |)",
			videoModelLabel: "Model",
			videoTimeoutLabel: "Timeout (ms)",
			videoPollIntervalLabel: "Poll interval (s)",
			videoRetryLabel: "Retry count",
			videoFilterLabel: "Show video models only",
			videoFilterHint: "Filter by video model names (i2v/t2v/wan/sora etc., excludes t2i/image models); off fetches all",
			videoFetchBtn: "Fetch available models",
			videoFetching: "Fetching…",
			videoReset: "Reset config",
			videoResetConfirm: "Confirm",
			videoResetHint: "Reset all video-generation config to defaults",
			videoNoConfig: "No valid video-generation API configured; generate_video is hidden.",
			videoCardModalTitle: "Add Video Model",
			videoCardEditTitle: "Edit Video Model",
			videoCardModelName: "Model Name",
			videoCardModelType: "Model Type",
			videoCardToolName: "Tool Name",
			videoCardModelDef: "Model Definition",
			videoCardTypeGeneral: "General",
			videoCardTypeCustom: "Custom",
			videoCardTypeT2v: "Text-to-Video",
			videoCardTypeI2v: "Image-to-Video",
			videoCardTypeEdit: "Video Edit",
			videoCardTypeRef: "Reference Generation",
			videoCardAddType: "Add Type",
			videoCardDeleteType: "Delete Type",
			videoCardMaxCards: "Max 10 cards",
			videoCardTypeExists: "A card of this type already exists",
			videoCardToolNameTaken: "Tool name already exists",
			videoCardConfirm: "Confirm",
			videoCardCancel: "Cancel",
			videoCardNoCards: "No video model cards configured",
			videoCardListTitle: "Video Model Cards",
			videoStatusPrefix: "Video gen valid config",
			videoSecondsLabel: "Default duration (s)",
			videoAspectLabel: "Aspect ratio",
			videoSubmitPathLabel: "Submit path",
			videoPollPathLabel: "Poll path",
			videoTaskIdFieldLabel: "Task ID field",
			videoStatusFieldLabel: "Status field",
			videoResultFieldLabel: "Result field",
			videoDoneStatusLabel: "Done status value",
			videoAsyncHint: "async-task protocol: fill in submit/poll paths and fields for any async gateway",
			videoAdapterHint: "custom-adapter: AI-authored adapterCode (buildSubmit/parseTaskId/pollUrl/parseStatus)",
			videoProviderCustom: "Custom",
			videoProviderAgnes: "Agnes AI",
			videoProviderAgnesCn: "Agnes AI CN",
			videoProviderDashscope: "Alibaba Bailian",
			videoProviderKling: "Kling",
			videoProviderVolc: "Volcengine",
			videoProviderMinimax: "MiniMax Hailuo",
			videoProviderQwenTokenPlan: "Qwen Token Plan",
			videoProviderQwenTokenPlanCn: "Qwen Token Plan CN",
			videoProtocolOpenai: "openai-videos (OpenAI-compatible)",
			videoProtocolDashscope: "dashscope-video (Bailian wan)",
			videoProtocolKling: "kling-video (JWT)",
			videoProtocolVolc: "volc-video (Volcengine Ark)",
			videoProtocolMinimax: "minimax-video (Hailuo)",
			videoProtocolAsync: "async-task (generic async)",
			videoProtocolCustomAdapter: "custom-adapter (scripted)",
			videoAdapterCodeLabel: "Adapter code",
			videoGroupGeneral: "General",
			videoGroupIntl: "Built-in · Overseas",
			videoGroupCn: "Built-in · China",
			videoGroupBuiltin: "Built-in",
			videoToolOn: "generate_video tool enabled",
			videoToolHidden: "No valid video API configured; generate_video is hidden",
			videoCardModalTitle: "Add Video Model",
			videoCardEditTitle: "Edit Video Model",
			videoCardModelName: "Model Name",
			videoCardModelNamePh: "Video model name",
			videoCardModelType: "Model Type",
			videoCardToolName: "Tool Name",
			videoCardModelDef: "Model Definition",
			videoCardTypeGeneral: "General",
			videoCardTypeCustom: "Custom",
			videoCardTypeT2v: "Text-to-Video",
			videoCardTypeI2v: "Image-to-Video",
			videoCardTypeEdit: "Video Edit",
			videoCardTypeRef: "Reference",
			videoCardAddType: "Add custom type",
			videoCardDeleteType: "Delete type",
			videoCardMaxCards: "Max 10 cards",
			videoCardTypeExists: "This type already has a card",
			videoCardToolNameTaken: "Tool name already exists",
			videoCardTypeGeneralHint: "General: use case determined by actual model",
			videoCardConfirm: "Confirm",
			videoCardCancel: "Cancel",
			videoCardDeleteTitle: "Delete Card",
			videoCardDeleteMsg: "Are you sure you want to delete this card? This cannot be undone.",
			videoCardNoCards: "No video model cards yet. Click 'Add Model' to start.",
			videoCardBatchCollapseAll: "Collapse all",
			videoCardBatchExpandAll: "Expand all",
			videoCardBatchDeleteAll: "Delete all",
			videoCardAdded: "Video model card added",
			videoCardDeleted: "Video model card deleted",
			settingsModuleSection: "Module Switches",
			settingsBackoffSection: "Backoff Strategy",
			backoffBaseLabel: "Backoff Base (ms)",
			backoffMaxLabel: "Backoff Max (ms)",
			backoff429BaseLabel: "429 Backoff Base (ms)",
			backoff429MaxLabel: "429 Backoff Max (ms)",
			retryStatusCodesLabel: "Retry Status Codes",
			retryStatusCodesHint: "Comma-separated HTTP status codes that trigger retry+failover",
			toolOffToolkit: " · analyze_image disabled · Vision Toolkit still available (local tools need no VLM)",
			verifyReminderLabel: "Auto-verify reminder after image generation",
			dynamicAdaptLabel: "Dynamic multimodal adapt",
			dynamicAdaptHint: "On: pick vision tool & imggen verify text by current model modality; Off: always analyze_image",
			toolsSwitchLabel: "Vision Toolbox",
			toolsOpen: "Enabled",
			toolsOff: "Disabled",
			extCardTitle: "Switch Extensions",
			extVlmSection: "VLM",
			extVideoSection: "Video",
			videoBuilderSwitchLabel: "Slash command: build custom video tool",
			videoBuilderSwitchHint: "When on, /build-video-tool appears in the slash menu",
			videoCardLimitLabel: "Video card limit",
			videoCardLimitHint: "Max 10 video model cards/tools (including AI custom)",
			videoAiBadge: "AI",
				extToolSettings: "Tool Settings",
				toolZoomImage: "Zoom Image",
				toolSampleColors: "Sample Colors",
				toolImageDiff: "Image Diff",
				toolOcrImage: "OCR Text",
				toolDetectElements: "Detect Elements",
				toolShowImage: "Show Image",
				toolZoomImageDesc: "Zoom into key regions for detail",
				toolSampleColorsDesc: "Extract dominant colors",
				toolImageDiffDesc: "Compare two images for diffs",
				toolOcrImageDesc: "Recognize text in images",
				toolDetectElementsDesc: "Detect UI elements and positions",
				toolShowImageDesc: "Display local images in chat",
				providerBailian: "Aliyun Bailian",
			toolsLocalImage: "Local Image",
			toolsFile: "File",
			toolsCopyPath: "Copy Path",
			toolsCopied: "Copied",
			toolsNoData: "No extra data",
			toolsImageError: "Failed to read image",
			toolsZoom: "Zoom",
			toolsImageDiff: "Pixel Diff",
			toolsElements: "Element Detection"
		}
		};
		var tBound = null;

		// ---------- RPC to the host half (web routes) ----------
		function call(method, payload) {
			var url = "/omni/" + method;
			var init = { headers: { Accept: "application/json" } };
			var isGet = (method === "config" || method === "update-check") && payload === undefined;
			if (!isGet) {
				init.method = "POST";
				init.headers["Content-Type"			] = "application/json";
				init.body = JSON.stringify(payload || {});
			}
			return fetch(url, init).then(function (response) {
				return response.json().catch(function () { return null; });
			});
		}

		// ---------- styling ----------
		var CSS = [
			".omni-page { display: flex; flex-direction: column; gap: 14px; padding: 4px 2px; font-size: 13px; color: var(--dsh-fg, #eee); }",
			".omni-card { border: 1px solid var(--dsh-border, #555); border-radius: 8px; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; background: var(--dsh-bg-2, rgba(128,128,128,0.07)); }",
			".omni-card h3 { margin: 0 0 2px; font-size: 14px; }",
			".omni-field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; }",
			".omni-grow { flex: 1; }",
			".omni-label { opacity: 0.8; }",
			".omni-input { padding: 6px 8px; border-radius: 6px; border: 1px solid var(--dsh-border, #555); background: var(--dsh-bg, #1e1e1e); color: var(--dsh-fg, #eee); font-size: 13px; box-sizing: border-box; width: 100%; }",
			".omni-row { display: flex; gap: 8px; align-items: flex-end; }",
			".omni-row.omni-model-fetch-row { gap: 4px; }",
			".omni-row .omni-field { flex: 1; }",
			".omni-btn { padding: 6px 12px; border-radius: 6px; border: 1px solid var(--dsh-border, #555); background: var(--dsh-bg-2, #333); color: var(--dsh-fg, #eee); cursor: pointer; font-size: 13px; white-space: nowrap; }",
			".omni-btn:disabled { opacity: 0.55; cursor: default; }",
			".omni-btn:hover { background: var(--dsh-bg, rgba(128,128,128,0.2)); border-color: var(--dsh-accent, #58a6ff); }",
			".omni-btn:active { background: var(--dsh-bg, rgba(128,128,128,0.35)); transform: scale(0.98); }",
			".omni-models { font-size: 11px; opacity: 0.75; margin: 0; word-break: break-all; }",
			".omni-status { font-size: 11px; opacity: 0.75; margin: 0; }",
			".omni-msg { font-size: 12px; margin: 0; }",
			".omni-err { color: #f85149; }",
			".omni-ok { color: #3fb950; }",
			".omni-desc { font-size: 12px; opacity: 0.8; margin: 0; line-height: 1.6; }",
			// ---- card list ----
			".omni-list { display: flex; flex-direction: column; gap: 10px; }",
			".omni-list-head { display: flex; align-items: center; justify-content: space-between; }",
			".omni-list-title { font-size: 13px; font-weight: 600; }",
			".omni-add-btn { font-weight: 500; }",
			".omni-reset-btn { flex: 0 0 auto; padding: 6px 8px; display: inline-flex; align-items: center; justify-content: center; }",
			// ---- card head ----
			".omni-card-head { display: flex; align-items: center; gap: 8px; min-height: 24px; }",
			".omni-drag-handle { cursor: grab; color: var(--dsh-fg-muted, #888); padding: 2px 4px; border-radius: 4px; flex: 0 0 auto; -webkit-user-select: none; user-select: none; }",
			".omni-drag-handle:active { cursor: grabbing; }",
			".omni-card-name { flex: 1; display: flex; align-items: center; gap: 6px; min-width: 0; font-size: 14px; font-weight: 500; cursor: text; -webkit-user-select: none; user-select: none; }",
			".omni-card-name-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
			".omni-card-name-input { padding: 3px 6px; border-radius: 4px; border: 1px solid var(--dsh-accent, #58a6ff); background: var(--dsh-bg, #1e1e1e); color: var(--dsh-fg, #eee); font-size: 13px; width: 100%; box-sizing: border-box; }",
			".omni-card-summary { font-size: 11px; opacity: 0.55; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 280px; flex: 0 1 auto; }",
			".omni-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 5px; border: none; background: transparent; color: var(--dsh-fg-muted, #888); cursor: pointer; padding: 0; flex: 0 0 auto; }",
			".omni-icon-btn:hover { background: var(--dsh-bg, rgba(128,128,128,0.15)); color: var(--dsh-fg, #eee); }",
			".omni-card-menu-wrap { position: relative; flex: 0 0 auto; }",
			".omni-card-menu { position: absolute; right: 0; top: 26px; min-width: 132px; background: var(--dsh-bg-2, #262626); border: 1px solid var(--dsh-border, #555); border-radius: 6px; box-shadow: 0 6px 16px rgba(0,0,0,0.35); z-index: 100; padding: 4px; display: flex; flex-direction: column; }",
			".omni-menu-item { display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 4px; cursor: pointer; font-size: 13px; color: var(--dsh-fg, #eee); }",
			".omni-menu-item:hover { background: var(--dsh-bg, rgba(128,128,128,0.2)); }",
			".omni-menu-item.omni-menu-danger { color: #f85149; }",
			".omni-menu-item.omni-menu-danger:hover { background: rgba(248,81,73,0.12); }",
			// ---- clickable header (collapse hot zone) ----
			".omni-head-clickable { cursor: pointer; }",
			".omni-head-clickable:hover { background: light-dark(rgba(0,0,0,0.03), rgba(255,255,255,0.04)); }",
			// ---- list container (fallback models + mirror mappings) ----
			".omni-list-container { border: 1px solid var(--dsh-border, #555); border-radius: 6px; background: light-dark(rgba(0,0,0,0.07), rgba(255,255,255,0.07)); max-height: 280px; overflow-y: auto; padding: 6px; margin-bottom: 8px; }",
			".omni-list-container::-webkit-scrollbar { width: 8px; }",
			".omni-list-container::-webkit-scrollbar-track { background: transparent; }",
			".omni-list-container::-webkit-scrollbar-thumb { background: light-dark(rgba(0,0,0,0.2), rgba(255,255,255,0.2)); border-radius: 4px; }",
			".omni-list-container::-webkit-scrollbar-thumb:hover { background: light-dark(rgba(0,0,0,0.35), rgba(255,255,255,0.35)); }",
			".omni-list-empty { padding: 12px 8px; text-align: center; font-size: 12px; opacity: 0.5; font-style: italic; }",
			".omni-list-container .omni-fb-model-item:last-child, .omni-list-container .omni-mapping-row:last-child { margin-bottom: 0; }",
			// ---- mirror toggle pair (horizontal) ----
			".omni-mirror-toggle-pair { display: flex; flex-direction: row; gap: 24px; }",
			".omni-mirror-toggle-pair .omni-mirror-toggle-row { gap: 8px; }",
			// ---- mirror mappings header (label + button) ----
			".omni-mirror-mappings-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }",
			// ---- card body ----
			".omni-card-body { display: flex; flex-direction: column; gap: 10px; }",
			".omni-select { appearance: none; -webkit-appearance: none; -moz-appearance: none; background-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%23e6e6e6' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6.5 4l4 4-4 4'/%3E%3C/svg%3E\"); background-repeat: no-repeat; background-position: right 8px center; background-size: 14px; padding-right: 28px; cursor: pointer; }",
			".omni-input::-ms-reveal, .omni-input::-ms-clear { display: none; }",
			// ---- key eye toggle ----
			".omni-key-wrap { position: relative; }",
			".omni-key-input { padding-right: 32px !important; }",
			".omni-eye-btn { position: absolute; right: 4px; bottom: 4px; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; border: none; background: transparent; color: var(--dsh-fg, #e6e6e6); cursor: pointer; padding: 0; border-radius: 4px; }",
			".omni-eye-btn:hover { color: #fff; background: rgba(128,128,128,0.2); }",
			// ---- model dropdown ----
			".omni-model-wrap { position: relative; }",
			".omni-model-input { padding-right: 32px !important; }",
			".omni-model-dropdown { position: absolute; left: 0; right: 0; top: calc(100% + 2px); max-height: 180px; overflow-y: auto; background: var(--dsh-bg-2, #262626); border: 1px solid var(--dsh-border, #555); border-radius: 6px; box-shadow: 0 6px 16px rgba(0,0,0,0.35); z-index: 110; padding: 4px; }",
			// Mirror-mapping dropdown lives inside a scrollable .omni-list-container; pin it to the viewport so the container scrollbar never clips it. ponytail: fixed doesn't follow page scroll while open; acceptable — it closes on select.
			".omni-mapping-dropdown { position: fixed; left: 0; top: 0; }",
			".omni-dd-item { padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; color: var(--dsh-fg, #eee); word-break: break-all; }",
			".omni-dd-item:hover { background: var(--dsh-bg, rgba(128,128,128,0.2)); }",
			".omni-dd-item.active { color: var(--dsh-accent, #58a6ff); }",
			// ---- drag feedback ----
			".omni-card.dragging { opacity: 0.45; border-style: dashed; }",
			".omni-card.drop-target { outline: 2px dashed var(--dsh-accent, #58a6ff); outline-offset: -2px; }",
			// ---- tabs & module switches ----
		".omni-tabs { display: flex; gap: 6px; position: sticky; top: 0; z-index: 60; padding: 6px 0; margin: -6px 0 -2px; background: var(--dsw-alias-bg-layer-2, light-dark(#ffffff, rgb(44, 44, 46))); }",
			".omni-tab { position: relative; padding: 6px 28px 6px 14px; border-radius: 6px; border: 1px solid var(--dsh-border, #555); background: transparent; color: var(--dsh-fg-muted, #888); cursor: pointer; font-size: 13px; flex: 0 1 auto; white-space: nowrap; }",
			".omni-tab.active { background: var(--dsh-bg-2, #333); border-color: var(--dsh-accent, #58a6ff); color: var(--dsh-fg, #eee); }",
			".omni-tab:hover { background: var(--dsh-bg, rgba(128,128,128,0.15)); }",
			".omni-tab:active { background: var(--dsh-bg, rgba(128,128,128,0.25)); }",
			".omni-tab-dot { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); width: 8px; height: 8px; border-radius: 50%; flex: 0 0 auto; }",
			".omni-tab-dot.on { background: #3fb950; }",
			".omni-tab-dot.off { background: #f85149; }",
			// ---- tool.call.toolview cards ----
			".omni-toolview-card { display: flex; flex-direction: column; gap: 8px; padding: 10px 12px; border: 1px solid var(--dsh-border, #555); border-radius: 8px; background: var(--dsh-bg-2, rgba(128,128,128,0.07)); font-size: 13px; min-width: 0; max-width: 100%; box-sizing: border-box; }",
			".omni-toolview-head { font-weight: 600; font-size: 13px; }",
			".omni-toolview-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 0; }",
			".omni-toolview-path { font-size: 11px; opacity: 0.85; word-break: break-all; flex: 1; min-width: 0; }",
			".omni-toolview-copy { flex: 0 0 auto; padding: 2px 8px; font-size: 11px; }",
			".omni-toolview-val { font-size: 12px; opacity: 0.9; word-break: break-all; min-width: 0; }",
			".omni-tab-body { display: flex; flex-direction: column; gap: 14px; }",
				".omni-module-row { display: flex; align-items: center; gap: 10px; font-size: 13px; white-space: nowrap; flex-wrap: nowrap; }",
".omni-filter-inline { display: flex; align-items: center; gap: 4px; font-size: 11px; white-space: nowrap; flex: 0 0 auto; }",
".omni-filter-label { color: var(--omni-text-muted, #888); }",
".omni-model-right-col { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex: 0 0 auto; }",
".omni-switch-sm { width: 26px; height: 14px; }",
".omni-switch-sm input:checked + .omni-switch-slider::before { transform: translateX(12px); }",
".omni-card-enable { flex: 0 0 auto; margin-left: 4px; }",
".omni-card-disabled { opacity: 0.5; }",
".omni-video-type-label { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 4px; background: rgba(88,166,255,0.15); color: #58a6ff; flex: 0 0 auto; white-space: nowrap; }",
".omni-ai-badge { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: rgba(188,140,255,0.18); color: #bc8cff; flex: 0 0 auto; white-space: nowrap; letter-spacing: 0.5px; }",
".omni-ext-video-row { display: flex; flex-direction: column; gap: 8px; }",
".omni-limit-row { display: flex; align-items: center; gap: 8px; }",
".omni-limit-input { width: 72px; }",
".omni-card-modal { position: relative; width: 90vw; max-width: 500px; background: var(--dsh-bg, #1e1e1e); border: 1px solid var(--dsh-border, #555); border-radius: 12px; padding: 24px; display: flex; flex-direction: column; gap: 16px; }",
".omni-card-modal-field { display: flex; flex-direction: column; gap: 4px; }",
".omni-card-modal-field label { font-size: 12px; font-weight: 500; opacity: 0.7; }",
".omni-save-btn { flex: 0 0 auto; padding: 6px 12px; display: inline-flex; align-items: center; justify-content: center; border: none; background: transparent; color: var(--dsh-fg, #eee); cursor: pointer; border-radius: 5px; }",
	".omni-preset-bar > .omni-btn { width: 32px !important; height: 32px !important; padding: 0 !important; display: inline-flex !important; align-items: center; justify-content: center; flex: 0 0 auto; }",
	".omni-save-btn:hover { background: rgba(128,128,128,0.2); }",
	".omni-save-btn:disabled { opacity: 0.35; cursor: not-allowed; }",
			".omni-tool-desc { font-size: 11px; opacity: 0.55; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 0 1 auto; min-width: 0; }",
			".omni-switch { position: relative; display: inline-block; width: 34px; height: 18px; flex: 0 0 auto; }",
			".omni-switch input { opacity: 0; width: 0; height: 0; }",
			".omni-switch-slider { position: absolute; inset: 0; border-radius: 9px; background: var(--dsh-bg, #333); border: 1px solid var(--dsh-border, #555); cursor: pointer; transition: background 0.15s; }",
			".omni-switch-slider::before { content: ''; position: absolute; width: 12px; height: 12px; left: 2px; top: 2px; border-radius: 50%; background: var(--dsh-fg-muted, #888); transition: transform 0.15s; }",
			".omni-switch input:checked + .omni-switch-slider { background: var(--dsh-accent, #58a6ff); }",
			".omni-switch input:checked + .omni-switch-slider::before { transform: translateX(16px); background: #fff; }",
			// ---- batch actions ----
			".omni-batch-wrap { position: relative; flex: 0 0 auto; }",
			".omni-batch-btn { width: 32px; height: 32px; padding: 0; display: inline-flex; align-items: center; justify-content: center; }",
			".omni-batch-menu { position: absolute; right: 0; top: 26px; min-width: 132px; background: var(--dsh-bg-2, #262626); border: 1px solid var(--dsh-border, #555); border-radius: 6px; box-shadow: 0 6px 16px rgba(0,0,0,0.35); z-index: 100; padding: 4px; display: flex; flex-direction: column; }",
			// ---- provider dropdown (custom, height capped ~60% of native popup) ----
			".omni-provider-wrap { position: relative; }",
			".omni-provider-btn { text-align: left; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 8px; }",
			".omni-provider-btn:hover { background: var(--dsh-bg, rgba(128,128,128,0.15)); }",
			".omni-provider-btn:active { background: var(--dsh-bg, rgba(128,128,128,0.25)); }",
			".omni-provider-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
			".omni-provider-arrow { flex: 0 0 auto; }",
			".omni-provider-dropdown { position: absolute; left: 0; right: 0; top: calc(100% + 2px); max-height: 320px; overflow-y: auto; background: var(--dsh-bg-2, #262626); border: 1px solid var(--dsh-border, #555); border-radius: 6px; box-shadow: 0 6px 16px rgba(0,0,0,0.35); z-index: 115; padding: 4px; }",
			".omni-dd-group { padding: 6px 10px 2px; font-size: 11px; color: var(--dsh-fg-muted, #888); }",
			".omni-fixed-url { font-size: 11px; opacity: 0.6; margin: 0; word-break: break-all; -webkit-user-select: all; user-select: all; }",
			".omni-menu-item.omni-menu-confirm { background: rgba(248, 81, 73, 0.18); }",
			// ---- imggen panel ----
			".omni-imggen-panel { border: 1px solid var(--dsh-border, #555); border-radius: 8px; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; background: var(--dsh-bg-2, rgba(128,128,128,0.07)); }",
			".omni-imggen-head { display: flex; align-items: center; gap: 8px; min-height: 24px; }",
			".omni-imggen-title { flex: 1; font-size: 14px; font-weight: 500; }",
			// ---- extension card ----
			".omni-ext-card { display: flex; flex-direction: column; gap: 10px; }",
			".omni-ext-section { display: flex; flex-direction: column; gap: 6px; }",
			".omni-ext-section-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; cursor: pointer; padding: 4px 0; }",
			".omni-ext-section-title { font-size: 13px; font-weight: 600; opacity: 0.8; }",
			".omni-ext-toggle-row { display: flex; flex-direction: row; align-items: center; gap: 24px; flex-wrap: wrap; padding: 4px 0; }",
			// ---- preset management ----
			".omni-preset-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; position: relative; }",
		".omni-preset-input-wrap { position: relative; flex: 1; min-width: 120px; }",
		".omni-preset-name-input { width: 100%; padding-right: 36px !important; box-sizing: border-box; }",
		".omni-preset-dd-btn { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border: none; background: transparent; cursor: pointer; color: var(--dsh-fg, #e6e6e6); padding: 0; flex: 0 0 auto; }",
		".omni-preset-dd-btn:hover { background: rgba(128,128,128,0.2); border-radius: 4px; }",
		".omni-preset-menu { position: absolute; left: 0; top: calc(100% + 2px); right: 0; width: 100%; max-height: 260px; overflow-y: auto; background: var(--dsh-bg-2, #262626); border: 1px solid var(--dsh-border, #555); border-radius: 6px; box-shadow: 0 6px 16px rgba(0,0,0,0.35); z-index: 115; padding: 4px; }",
			".omni-preset-menu-item { padding: 6px 10px; cursor: pointer; border-radius: 4px; font-size: 13px; }",
			".omni-preset-menu-item:hover { background: rgba(88,166,255,0.12); }",
			".omni-preset-menu-item.active { background: rgba(88,166,255,0.18); font-weight: 500; }",
			".omni-preset-menu-item:active { background: rgba(88,166,255,0.2); }",
			".omni-preset-divider { height: 1px; background: var(--dsh-border, #555); opacity: 0.3; margin: 6px 0; }",
			".omni-preset-del-btn:disabled { opacity: 0.35; cursor: not-allowed; }",
		// ---- comfy workflow editor ----
		".omni-comfy-wf-list { display: flex; flex-direction: column; gap: 8px; }",
		".omni-comfy-wf-list-title { margin: 0 0 4px; font-size: 13px; }",
		".omni-comfy-wf-cards { display: flex; flex-direction: column; gap: 4px; }",
		".omni-comfy-wf-card { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--dsw-alias-bg-layer-2); border-radius: 6px; }",
		".omni-comfy-wf-toggle { width: 16px; height: 16px; border-radius: 50%; border: none; cursor: pointer; flex-shrink: 0; }",
		".omni-comfy-wf-toggle.on { background: #22c55e; }",
		".omni-comfy-wf-toggle.off { border: 2px solid #666; background: transparent; }",
		".omni-comfy-wf-toggle:hover { opacity: 0.8; }",
		".omni-comfy-wf-toggle:active { transform: scale(0.9); }",
		".omni-comfy-wf-name { flex: 1; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
		".omni-comfy-wf-edit, .omni-comfy-wf-delete { background: none; border: none; cursor: pointer; padding: 4px; display: inline-flex; }",
		".omni-comfy-wf-delete { margin-left: 24px; color: #e5484d; }",
		".omni-comfy-wf-edit svg, .omni-comfy-wf-delete svg { width: 16px; height: 16px; }",
		".omni-comfy-wf-import-btn { cursor: pointer; display: inline-flex; align-items: center; align-self: flex-start; }",
		".omni-comfy-wf-confirm-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }",
		".omni-comfy-wf-confirm-content { background: var(--dsw-alias-bg-layer-2); padding: 24px; border-radius: 8px; text-align: center; }",
		".omni-confirm-delete { background: #e5484d; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }",
		".omni-comfy-wf-edit { display: flex; flex-direction: column; gap: 12px; }",
		".omni-comfy-wf-edit-header { display: flex; align-items: center; gap: 8px; }",
		".omni-comfy-wf-title { font-size: 13px; font-weight: 600; }",
		".omni-comfy-wf-name-input { flex: 1; }",
		".omni-comfy-wf-json { width: 100%; box-sizing: border-box; font-family: monospace; font-size: 12px; min-height: 120px; resize: vertical; }",
		".omni-comfy-wf-basic-config { display: flex; flex-direction: column; gap: 6px; }",
		".omni-comfy-wf-mapping { display: flex; flex-direction: column; gap: 6px; }",
		".omni-comfy-wf-mapping-toggle { background: none; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; color: inherit; font-size: 13px; }",
		".omni-comfy-wf-mapping-toggle:hover { color: var(--dsh-accent, #58a6ff); }",
		".omni-comfy-wf-mapping-body { margin-top: 8px; padding: 8px 12px; background: var(--dsw-alias-bg-layer-2); border-radius: 6px; display: flex; flex-direction: column; gap: 8px; }",
		".omni-comfy-wf-mapping-body .omni-row { flex-wrap: wrap; }",
		".omni-comfy-wf-mapping-body .omni-row .omni-field { flex: 1 1 calc(25% - 6px); min-width: calc(25% - 6px); }",
			".omni-comfy-wf-mapping-summary { display: flex; gap: 8px; font-size: 12px; }",
			".omni-comfy-wf-automap { align-self: flex-start; }",
			// v2.9.15: scrollable mapping rows container — add-mapping button stays visible outside
			".omni-comfy-wf-mapping-rows { max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }",
			// v2.9.15: custom mapping rows (unlimited, user-defined injection points)
			".omni-comfy-wf-custom-mappings { margin-top: 8px; display: flex; flex-direction: column; gap: 8px; }",
			".omni-comfy-wf-custom-rows { max-height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }",
			".omni-comfy-wf-cm-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 8px; background: var(--dsw-alias-bg-layer-2); border-radius: 6px; }",
			".omni-comfy-wf-cm-row .omni-field { flex: 1 1 120px; min-width: 100px; }",
			".omni-comfy-wf-cm-row .omni-label-sm { font-size: 11px; opacity: 0.7; white-space: nowrap; }",
		// v2.9.14: history import modal + help modal + mapping add/delete rows
		".omni-comfy-wf-list-title-row { display: flex; align-items: center; gap: 6px; }",
		".omni-comfy-wf-help-btn { background: none; border: none; cursor: pointer; padding: 0; display: inline-flex; opacity: 0.65; color: inherit; }",
		".omni-comfy-wf-help-btn:hover { opacity: 1; color: var(--dsh-accent, #58a6ff); }",
		".omni-comfy-wf-help-btn svg { width: 14px; height: 14px; }",
		".omni-comfy-wf-actions { display: flex; align-items: center; gap: 8px; margin-top: 2px; }",
			".omni-comfy-wf-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: omni-comfy-wf-fade 0.12s ease; }",
			".omni-comfy-wf-modal-in { background: var(--dsw-alias-bg-layer-2); border-radius: 8px; box-shadow: 0 8px 28px rgba(0,0,0,0.35); max-height: 70vh; display: flex; flex-direction: column; animation: omni-comfy-wf-pop 0.12s ease; }",
			".omni-comfy-wf-history-head { display: flex; align-items: center; gap: 8px; padding: 14px 16px; border-bottom: 1px solid var(--dsh-border, #444); }",
			".omni-comfy-wf-history-head h4 { flex: 1; margin: 0; font-size: 13px; }",
			".omni-comfy-wf-help-content { min-width: 420px; max-width: 480px; padding: 16px; text-align: left; font-size: 12px; line-height: 1.65; gap: 10px; }",
		".omni-comfy-wf-help-content ol, .omni-comfy-wf-help-content ul { margin: 0; padding-left: 18px; }",
		".omni-comfy-wf-help-content li { margin-bottom: 6px; }",
		".omni-comfy-wf-help-mapping { background: var(--dsw-alias-bg-layer-2); border-radius: 6px; padding: 8px 10px; }",
		".omni-comfy-wf-map-row { display: flex; align-items: center; gap: 8px; }",
		".omni-comfy-wf-map-row .omni-field { flex: 1; min-width: 0; }",
		".omni-comfy-wf-map-label { width: 82px; flex-shrink: 0; font-size: 12px; opacity: 0.9; }",
		".omni-comfy-wf-map-del { background: none; border: none; cursor: pointer; padding: 4px; display: inline-flex; color: #e5484d; align-self: flex-end; }",
		".omni-comfy-wf-map-del svg { width: 15px; height: 15px; }",
		".omni-comfy-wf-map-add { align-self: flex-start; }",
		".omni-comfy-wf-mapping-warn { font-size: 12px; color: #f59e0b; }",
		".omni-comfy-wf-mapping-missings { display: flex; flex-wrap: wrap; gap: 4px; }",
		".omni-comfy-wf-missing-chip { font-size: 11px; background: rgba(245,158,11,0.15); color: #f59e0b; padding: 1px 6px; border-radius: 10px; }",
		"@keyframes omni-comfy-wf-fade { from { opacity: 0; } to { opacity: 1; } }",
		"@keyframes omni-comfy-wf-pop { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }",
		".omni-toast-container { position: fixed; top: 16px; left: 50%; transform: translateX(-50%); z-index: 9999; display: flex; flex-direction: column; gap: 8px; pointer-events: none; }",
		".omni-toast-card { display: flex; align-items: flex-start; gap: 8px; padding: 12px 16px; background: var(--dsw-alias-bg-layer-2); border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); min-width: 300px; max-width: 480px; pointer-events: auto; animation: omni-toast-in 0.2s ease; border-left: 3px solid #3b82f6; }",
		".omni-toast-info { border-left-color: #3b82f6; } .omni-toast-info svg { color: #3b82f6; }",
		".omni-toast-success { border-left-color: #22c55e; } .omni-toast-success svg { color: #22c55e; }",
		".omni-toast-warning { border-left-color: #f59e0b; } .omni-toast-warning svg { color: #f59e0b; }",
		".omni-toast-error { border-left-color: #e5484d; } .omni-toast-error svg { color: #e5484d; }",
		".omni-toast-body { flex: 1; } .omni-toast-title { font-size: 13px; font-weight: 600; } .omni-toast-desc { font-size: 12px; opacity: 0.85; margin-top: 2px; word-break: break-word; }",
		".omni-toast-close { background: none; border: none; color: inherit; opacity: 0.5; cursor: pointer; font-size: 18px; line-height: 1; padding: 0 4px; } .omni-toast-close:hover { opacity: 1; }",
		"@keyframes omni-toast-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }",
		".omni-label-sm { font-size: 11px; opacity: 0.8; }",
			".omni-label-small { font-size: 0.75rem; opacity: 0.6; margin-bottom: 2px; display: block; }",
			".omni-section-hr { border: none; border-top: 1px solid var(--dsh-border, #444); margin: 12px 0 8px; }",
			".omni-confirm-actions { display: flex; justify-content: flex-end; gap: 8px; }",
			// ---- delete buttons (trash icons are always red) ----
			".omni-icon-btn.omni-del-btn { color: #f85149; }",
			".omni-icon-btn.omni-del-btn:hover { color: #ff6b63; background: rgba(248,81,73,0.12); }",
			".omni-btn.omni-del-btn { color: #f85149; }",
			".omni-btn.omni-del-btn:hover:not(:disabled) { color: #ff6b63; }",
			// ---- confirm modal ----
			".omni-confirm-overlay { position: fixed; inset: 0; z-index: 10001; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }",
			".omni-confirm-modal { position: relative; width: 90vw; max-width: 400px; background: var(--dsh-bg, #1e1e1e); border: 1px solid var(--dsh-border, #555); border-radius: 12px; padding: 24px; display: flex; flex-direction: column; gap: 16px; }",
			".omni-confirm-title { font-size: 16px; font-weight: 600; }",
			".omni-confirm-msg { font-size: 14px; opacity: 0.85; line-height: 1.5; }",
			".omni-confirm-btns { display: flex; justify-content: flex-end; gap: 8px; }",
			".omni-confirm-danger { background: rgba(248,81,73,0.15); color: #f85149; border-color: rgba(248,81,73,0.4); }",
	".omni-confirm-danger:hover { background: rgba(248,81,73,0.25); }",
	// v2.11: video card modal (form modal, NOT omni-confirm-modal) + type-label badge
	".omni-card-modal-overlay { position: fixed; inset: 0; z-index: 10002; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }",
	".omni-card-modal { position: relative; width: 90vw; max-width: 520px; background: var(--dsh-bg, #1e1e1e); border: 1px solid var(--dsh-border, #555); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 12px; max-height: 80vh; overflow-y: auto; }",
	".omni-card-modal-title { font-size: 16px; font-weight: 600; margin: 0; }",
	".omni-card-modal-field { display: flex; flex-direction: column; gap: 4px; }",
	".omni-card-modal-field textarea { resize: vertical; min-height: 60px; }",
	".omni-card-modal-btns { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }",
	".omni-video-type-label { font-size: 11px; font-weight: 600; padding: 1px 6px; border-radius: 4px; background: rgba(88,166,255,0.15); color: #58a6ff; white-space: nowrap; flex-shrink: 0; }",
	
	// ---- light-dark() theme override (respects harness color-scheme on <html>) ----
			// 浅色主题：输入框/按键背景深灰 + 文字白色；深色主题不变
			"@supports (color: light-dark(#000, #fff)) {",
			"  .omni-page { color: light-dark(#333, #eee); }",
			"  .omni-input, .omni-btn, .omni-provider-btn { background-color: light-dark(#3a3a3a, #1e1e1e); color: light-dark(#fff, #eee); border-color: light-dark(#555, #555); }",
			"  .omni-dd-item { color: light-dark(#fff, #eee); }",
			"  .omni-tab { color: light-dark(#666, #999); }",
			"  .omni-tab.active { color: light-dark(#fff, #eee); }",
			"  .omni-btn:hover { background-color: light-dark(rgba(0,0,0,0.12), rgba(255,255,255,0.12)); border-color: light-dark(#58a6ff, #58a6ff); }",
			"  .omni-btn:active { background-color: light-dark(rgba(0,0,0,0.2), rgba(255,255,255,0.2)); }",
			"  .omni-tab:hover { background-color: light-dark(rgba(0,0,0,0.08), rgba(255,255,255,0.08)); }",
			"  .omni-tab:active { background-color: light-dark(rgba(0,0,0,0.15), rgba(255,255,255,0.15)); }",
			"  .omni-dd-group { color: light-dark(#666, #888); }",
			// ---- preset dropdown + confirm/tool modal light theme (white bg + dark text) ----
			"  .omni-preset-dd-btn { color: light-dark(#fff, #eee); }",
			"  .omni-preset-dd-btn:hover { background: rgba(128,128,128,0.2); border-radius: 4px; }",
			"  .omni-preset-menu { background-color: light-dark(#fff, #262626); border-color: light-dark(#ccc, #555); box-shadow: 0 6px 16px rgba(0,0,0,0.12); }",
			"  .omni-preset-menu-item { color: light-dark(#222, #eee); }",
			"  .omni-preset-menu-item:hover { background-color: light-dark(rgba(0,120,255,0.10), rgba(88,166,255,0.12)); }",
			"  .omni-preset-menu-item:active { background-color: light-dark(rgba(0,120,255,0.16), rgba(88,166,255,0.20)); }",
			"  .omni-confirm-modal { background-color: light-dark(#fff, #1e1e1e); border-color: light-dark(#ccc, #555); }",
			"  .omni-confirm-title { color: light-dark(#111, #eee); }",
			"  .omni-confirm-msg { color: light-dark(#333, #eee); }",
		"  .omni-module-row .omni-label { color: light-dark(#222, #eee); }",
		"  .omni-card-modal { background-color: light-dark(#fff, #1e1e1e); border-color: light-dark(#ccc, #555); }",
		"  .omni-card-modal-title { color: light-dark(#111, #eee); }",
		"  .omni-video-type-label { background-color: light-dark(rgba(88,166,255,0.15), rgba(88,166,255,0.15)); color: light-dark(#0969da, #58a6ff); }",
		"}",
			// ---- retry row (single line) ----
			".omni-retry-row { display: flex; flex-direction: row; align-items: center; gap: 8px; padding: 8px 14px; }",
			".omni-retry-label { flex: 1; font-weight: 500; }",
			".omni-retry-sep { flex: 0 0 auto; opacity: 0.3; }",
			".omni-retry-status { flex: 1; opacity: 0.6; }",
			".omni-retry-input { width: 60px !important; flex: 0 0 60px; }",
			// ---- fallback card ----
			".omni-fallback-card { border-style: dashed; }",
			".omni-fb-model-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border: 1px solid var(--dsh-border, #555); border-radius: 6px; margin-bottom: 4px; background: var(--dsh-bg-2, rgba(128,128,128,0.07)); }",
			".omni-fb-model-id { flex: 1; font-size: 12px; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
			".omni-fb-model-item.dragging { opacity: 0.45; border-style: dashed; }",
			".omni-fb-model-item.drop-target { outline: 2px dashed var(--dsh-accent, #58a6ff); outline-offset: -2px; }",
			// ---- mirror card ----
			".omni-mirror-toggle-row { display: flex; flex-direction: row; align-items: center; gap: 10px; padding: 4px 0; }",
			".omni-mirror-toggle-text { display: flex; flex-direction: column; gap: 2px; }",
			".omni-mirror-hint { font-size: 11px; opacity: 0.55; }",
			".omni-mirror-divider { height: 1px; background: var(--dsh-border, #555); opacity: 0.3; margin: 8px 0; }",
			".omni-mapping-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }",
			".omni-mapping-input { flex: 0 0 160px; }",
			".omni-dd-group-title { font-size: 11px; font-weight: 600; opacity: 0.5; padding: 6px 10px 2px; text-transform: uppercase; letter-spacing: 0.5px; }",
			".omni-mirror-disabled { opacity: 0.4; pointer-events: none; }",
			".omni-mirror-disabled-msg { font-size: 12px; opacity: 0.6; font-style: italic; }",
			".omni-mapping-list { display: flex; flex-direction: column; gap: 0; }",
			// ---- settings panel ----
			".omni-settings-panel { display: flex; flex-direction: column; gap: 14px; }",
			".omni-settings-section { display: flex; flex-direction: column; gap: 8px; }",
".omni-settings-section-title { font-size: 13px; font-weight: 600; opacity: 0.8; }",
  ".omni-settings-section .omni-row { gap: 20px; }",
  ".omni-about-card { margin-top: 16px; align-items: flex-start; }",
  ".omni-about-update-btn { align-self: flex-start; }",
  ".omni-about-version { font-size: 12px; opacity: 0.6; margin-top: 4px; }",
  ".omni-about-update { font-size: 12px; opacity: 0.85; margin: 0; }",
  ".omni-about-update-available { color: var(--dsw-alias-text-link, #58a6ff); }",
  ".omni-about-btns { display: flex; gap: 8px; flex-wrap: wrap; }",
".omni-github-btn { display: inline-flex; align-items: center; gap: 4px; }",
	  ".omni-subtab-row { display: flex; gap: 0; width: 100%; margin-bottom: 12px; }",
  ".omni-subtab-btn { display: flex; flex: 1; align-items: center; justify-content: space-between; padding: 8px 12px; border: 1px solid light-dark(#ddd, #333); background: light-dark(#f5f5f5, transparent); color: light-dark(#333, #ccc); cursor: pointer; transition: all 0.15s; font-size: 13px; }",
  ".omni-subtab-btn.active { background: #2a2a2e; border-color: #4a9eff; color: #fff; }",
	  ".omni-subtab-btn .omni-switch { transform: scale(0.8); margin: 0; }",
	  ".omni-subtab-row .omni-subtab-btn:first-child { border-radius: 8px 0 0 8px; }",
	  ".omni-subtab-row .omni-subtab-btn:last-child { border-radius: 0 8px 8px 0; border-left: none; }",
	  ".omni-tab-disabled { opacity: 0.4; pointer-events: none; }",
	  ".omni-voice-control { min-height: 40px; }",
	  // ---- v2.9.1 voice panel fixes ----
	  ".omni-voice-hint { font-size: 11px; opacity: 0.6; margin: 0; line-height: 1.4; }",
	  ".omni-chev { font-family: monospace; font-size: 12px; line-height: 1; color: currentColor; flex: 0 0 auto; width: 14px; text-align: center; }",
		".omni-voice-upload { display: flex; gap: 6px; align-items: center; }",
		".omni-voice-upload .omni-select { flex: 1; min-width: 0; }",
		".omni-voice-upload .omni-input { flex: 1; min-width: 0; }",
		".omni-voice-upload .omni-btn { flex: 0 0 auto; height: 32px; }",
		// v2.9.5 — minimax clone row: ensure upload button (height 32px) vertically centers with the
		// input and the trailing 克隆 button aligns to the input row baseline (not the label row).
		".omni-minimax-clone-bar .omni-btn { align-self: center; }",
	  ".omni-vr-override + .omni-voice-hint { margin-top: 3px; }",
	  ".omni-row > .omni-module-row { flex: 1; }",
	  ".omni-row > .omni-module-row:empty { display: none; }",
	  ".omni-voice-ph { color: var(--dsh-fg-muted, #888); opacity: 0.8; }"
	].join("\n");

		function ensureStyles() {
			if (typeof document === "undefined" || document.getElementById("dsh-omni-workstation-css") !== null) return;
			var tag = document.createElement("style");
			tag.id = "dsh-omni-workstation-css";
			tag.textContent = CSS;
			document.head.appendChild(tag);
		}

		// ---------- auto-save helpers (debounced, merging pending patches) ----------
		function debounce(fn, ms) {
			var timer = null;
			var debounced = function () {
				if (timer !== null) clearTimeout(timer);
				var self = this;
				var args = arguments;
				timer = setTimeout(function () {
					timer = null;
					fn.apply(self, args);
				}, ms);
			};
			debounced.flush = function () {
				if (timer !== null) { clearTimeout(timer); timer = null; return fn.apply(null, []); }
			};
			debounced.cancel = function () {
				if (timer !== null) { clearTimeout(timer); timer = null; }
			};
			return debounced;
		}

		function mergePatch(a, b) {
			if (a === null || a === undefined) return b;
			if (b === null || b === undefined) return a;
			if (typeof a !== "object" || Array.isArray(a) || typeof b !== "object" || Array.isArray(b)) return b;
			var out = Object.assign({}, a);
			for (var key of Object.keys(b)) out[key] = key in out ? mergePatch(out[key], b[key]) : b[key];
			return out;
		}

		// v2.12.2: key-order-insensitive JSON — dirty checks must not flake when
		// the server normalizes config objects into a different key order
		// v2.12.4: additionally normalizes scalar values (numeric strings == numbers)
		// so that "改回原值" (60000 -> 6000 -> 60000) compares equal again.
		function normDirtyVal(v) {
			if (typeof v === "number") return isFinite(v) ? v : null;
			if (typeof v === "string") {
				var s = v.trim();
				if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
				return s;
			}
			if (v === undefined) return null;
			return v;
		}
		function dirtyJson(v) {
			if (v === null || v === undefined || typeof v !== "object") return JSON.stringify(normDirtyVal(v));
			if (Array.isArray(v)) return "[" + v.map(dirtyJson).join(",") + "]";
			var keys = Object.keys(v).sort();
			return "{" + keys.map(function (k) { return JSON.stringify(k) + ":" + dirtyJson(v[k]); }).join(",") + "}";
		}

		// v2.12.4: 脏判定基线表。放在组件之外（闭包级）是为了让基线在
		// 切换 Tab（面板被卸载→重挂）后依然存在 —— 未保存的修改不会因为切面板而"消失"。
		// key = "<作用域>|<实体 id>|<预设 id>"
		var DIRTY_BASE = {};
		function dirtyKey(scope, id) { return scope + "|" + (id || ""); }
		// 首次见到某个 key 时把当前值记为基线（未改动 = 不脏）；已存在则原样返回
		function baselineFor(key, cur) {
			if (!Object.prototype.hasOwnProperty.call(DIRTY_BASE, key)) DIRTY_BASE[key] = cur;
			return DIRTY_BASE[key];
		}
		function setBaseline(key, cur) { DIRTY_BASE[key] = cur; }
		function forgetBaseline(key) { delete DIRTY_BASE[key]; }
		function forgetBaselineScope(scope) {
			var pre = scope + "|";
			Object.keys(DIRTY_BASE).forEach(function (k) { if (k.indexOf(pre) === 0) delete DIRTY_BASE[k]; });
		}
		// 服务端配置重新载入时清空全部基线（重新以服务端配置为准）
		function resetAllBaselines() {
			Object.keys(DIRTY_BASE).forEach(function (k) { delete DIRTY_BASE[k]; });
		}

		var pendingPatch = null;
		var scheduleSave = debounce(function () {
			if (pendingPatch === null) return;
			var patch = pendingPatch;
			pendingPatch = null;
			return call("config", patch).catch(function () {});
		}, 600);
		function queueSave(patch) {
			pendingPatch = mergePatch(pendingPatch, patch);
			scheduleSave();
		}

		var et = function (e) { return (e && e.message ? e.message : String(e)); };

		// ---------- inline SVG icon ----------
		function SvgIcon(props) {
			var d = props && props.d;
			var paths = Array.isArray(d) ? d : [];
			return React.createElement("svg", {
				width: (props && props.width) || 14,
				height: (props && props.height) || 14,
				viewBox: "0 0 16 16",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: 1.5,
				strokeLinecap: "round",
				strokeLinejoin: "round"
			}, paths.map(function (p, i) { return React.createElement("path", { key: i, d: p }); }));
		}
			// Fill-style SVG icon: inherits color via currentColor (theme-aware, no external assets).
			function SvgFillIcon(props) {
				var d = props && props.d;
				var paths = Array.isArray(d) ? d : [];
				return React.createElement("svg", {
					width: (props && props.width) || 14,
					height: (props && props.height) || 14,
					viewBox: (props && props.viewBox) || "0 0 1024 1024",
					fill: "currentColor"
				}, paths.map(function (p, i) { return React.createElement("path", { key: i, d: p }); }));
			}

			// Reusable confirmation modal. Usage: render at page root, control via state.
			function ConfirmDialog(props) {
				if (!props) return null;
				var t = props.t;
				return React.createElement("div", { className: "omni-confirm-overlay", onClick: props.onCancel }, [
					React.createElement("div", { className: "omni-confirm-modal", onClick: function (e) { e.stopPropagation(); } }, [
						React.createElement("span", { className: "omni-confirm-title" }, props.title),
						React.createElement("p", { className: "omni-confirm-msg" }, props.message),
						React.createElement("div", { className: "omni-confirm-btns" }, [
							React.createElement("button", { className: "omni-btn", onClick: props.onCancel }, props.cancelLabel || (t ? t("presetDeleteCancel") : "Cancel")),
							React.createElement("button", { className: "omni-btn omni-confirm-danger", onClick: props.onConfirm }, props.confirmLabel || (t ? t("confirmDelete") : "Confirm"))
						])
					])
				]);
			}

			var I_DRAG = ["M3.5 2.5v0", "M8 2.5v0", "M12.5 2.5v0", "M3.5 8v0", "M8 8v0", "M12.5 8v0", "M3.5 13.5v0", "M8 13.5v0", "M12.5 13.5v0"];
		var I_MENU = ["M3 8v0", "M8 8v0", "M13 8v0"];
		var I_COLLAPSE = ["M4 6.5l4 4 4-4"];
		var I_EXPAND = ["M6.5 4l4 4-4 4"];
		var I_PIN_TOP = ["M8 13V3", "M4 7L8 3l4 4"];
		var I_PIN_BOTTOM = ["M8 3v10", "M4 9l4 4 4-4"];
		var I_TRASH = ["M3 4h10", "M6 4V3h4v1", "M5 4l.5 9.5h5L11 4", "M8 6.5v3.5", "M6 6.5v3"];
	var I_EDIT = ["M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z", "M10 4l2 2"];
	var I_SAVE_FLOPPY = ["M925.248 356.928l-258.176-258.176a64 64 0 0 0-45.248-18.752H144a64 64 0 0 0-64 64v736a64 64 0 0 0 64 64h736a64 64 0 0 0 64-64V402.176a64 64 0 0 0-18.752-45.248zM288 144h192V256H288V144z m448 736H288V736h448v144z m144 0H800V704a32 32 0 0 0-32-32H256a32 32 0 0 0-32 32v176H144v-736H224V288a32 32 0 0 0 32 32h256a32 32 0 0 0 32-32V144h77.824l258.176 258.176V880z"];
	var I_TOAST_INFO = ["M8 2a6 6 0 100 12A6 6 0 008 2zm0 3a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0v-3A.75.75 0 018 5zm0 6a.75.75 0 100 1.5.75.75 0 000-1.5z"];
	var I_HELP = ["M8 2a6 6 0 100 12A6 6 0 008 2z", "M6.1 6.2a1.9 1.9 0 113.1 1.5c-.7.5-.9.8-1 1.3", "M8 11.4v.1"];
	var I_TOAST_SUCCESS = ["M8 2a6 6 0 100 12A6 6 0 008 2zm3 4.5L7 10.5 5 8.5"];
	var I_TOAST_WARNING = ["M8 1.5L1 14h14L8 1.5zM8 6v4M8 12v.5"];
	var I_TOAST_ERROR = ["M8 2a6 6 0 100 12A6 6 0 008 2zm3 3L5 11M11 5L5 11"];
		var I_PLUS = ["M8 3v10", "M3 8h10"];
		var I_RESET_SVG = ["M434.816 140.16c179.264-37.312 361.408 57.28 430.08 229.568a38.4 38.4 0 0 1-71.424 28.48c-56.32-141.312-208.96-217.6-356.928-179.648a302.976 302.976 0 1 0 181.632 577.216 303.04 303.04 0 0 0 194.24-244.416 38.4 38.4 0 0 1 76.16 9.984 379.84 379.84 0 0 1-243.52 306.368A379.776 379.776 0 1 1 417.472 144.192l17.344-4.032z", "M814.912 170.752a38.4 38.4 0 0 1 76.8 0v213.312c0 21.184-17.216 38.4-38.4 38.4H640a38.4 38.4 0 0 1 0-76.8h174.912V170.752z"];
		var I_GEAR_SVG = ["M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"];
		var I_EYE = ["M1 8s2.5-5.5 7-5.5S15 8 15 8s-2.5 5.5-7 5.5S1 8 1 8z", "M8 5.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z"];
		var I_EYE_OFF = ["M1 8s2.5-5.5 7-5.5S15 8 15 8s-2.5 5.5-7 5.5S1 8 1 8z", "M8 5.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z", "M2 2l12 12"];

		// ---------- provider presets (mirror of the host half) ----------
		// fixed: true = URL & protocol are built in and NOT user-editable.
		var PROVIDERS_UI = {
			custom: { fixed: false, keyRequired: true },
			ollama: { fixed: false, keyRequired: false },
			comfyui: { fixed: false, keyRequired: false, hideProtocol: true, name: "ComfyUI" },
			agnes: { fixed: true, protocol: "anthropic-messages", endpoint: "https://apihub.agnes-ai.com", name: "Agnes AI" },
			"agnes-cn": { fixed: true, protocol: "anthropic-messages", endpoint: "https://api.agnes-ai.cn", name: "Agnes AI CN" },
			anthropic: { fixed: true, protocol: "anthropic-messages", endpoint: "https://api.anthropic.com", name: "Anthropic" },
			"ant-ling": { fixed: true, protocol: "openai-completions", endpoint: "https://api.ant-ling.com/v1", name: "Ant Ling" },
			cerebras: { fixed: true, protocol: "openai-completions", endpoint: "https://api.cerebras.ai/v1", name: "Cerebras" },
			fireworks: { fixed: true, protocol: "openai-completions", endpoint: "https://api.fireworks.ai/inference", name: "Fireworks AI" },
			google: { fixed: true, protocol: "google-gemini", endpoint: "https://generativelanguage.googleapis.com/v1beta", name: "Google Gemini" },
			groq: { fixed: true, protocol: "openai-completions", endpoint: "https://api.groq.com/openai/v1", name: "Groq" },
			huggingface: { fixed: true, protocol: "openai-completions", endpoint: "https://router.huggingface.co/v1", name: "Hugging Face" },
			"kimi-coding": { fixed: true, protocol: "anthropic-messages", endpoint: "https://api.kimi.com/coding", name: "Kimi Coding" },
			minimax: { fixed: true, protocol: "anthropic-messages", endpoint: "https://api.minimax.io/anthropic", name: "MiniMax" },
			"minimax-cn": { fixed: true, protocol: "anthropic-messages", endpoint: "https://api.minimaxi.com/anthropic", name: "MiniMax CN" },
			moonshotai: { fixed: true, protocol: "openai-completions", endpoint: "https://api.moonshot.ai/v1", name: "Moonshot AI" },
			"moonshotai-cn": { fixed: true, protocol: "openai-completions", endpoint: "https://api.moonshot.cn/v1", name: "Moonshot AI CN" },
			nvidia: { fixed: true, protocol: "openai-completions", endpoint: "https://integrate.api.nvidia.com/v1", name: "NVIDIA NIM" },
			openai: { fixed: true, protocol: "openai-responses", endpoint: "https://api.openai.com/v1", name: "OpenAI" },
			openrouter: { fixed: true, protocol: "openai-completions", endpoint: "https://openrouter.ai/api/v1", name: "OpenRouter" },
			"qwen-token-plan": { fixed: true, protocol: "openai-completions", endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1", name: "Qwen Token Plan" },
			"qwen-token-plan-cn": { fixed: true, protocol: "openai-completions", endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1", name: "Qwen Token Plan CN" },
			together: { fixed: true, protocol: "openai-completions", endpoint: "https://api.together.ai/v1", name: "Together AI" },
			"vercel-ai-gateway": { fixed: true, protocol: "anthropic-messages", endpoint: "https://ai-gateway.vercel.sh", name: "Vercel AI Gateway" },
			xai: { fixed: true, protocol: "openai-completions", endpoint: "https://api.x.ai/v1", name: "xAI" },
			xiaomi: { fixed: true, protocol: "openai-completions", endpoint: "https://api.xiaomimimo.com/v1", name: "Xiaomi MiMo" },
			"xiaomi-token-plan-ams": { fixed: true, protocol: "openai-completions", endpoint: "https://token-plan-ams.xiaomimimo.com/v1", name: "Xiaomi Token Plan (AMS)" },
			"xiaomi-token-plan-cn": { fixed: true, protocol: "openai-completions", endpoint: "https://token-plan-cn.xiaomimimo.com/v1", name: "Xiaomi Token Plan CN" },
			"xiaomi-token-plan-sgp": { fixed: true, protocol: "openai-completions", endpoint: "https://token-plan-sgp.xiaomimimo.com/v1", name: "Xiaomi Token Plan (SGP)" },
			zai: { fixed: true, protocol: "openai-completions", endpoint: "https://api.z.ai/api/coding/paas/v4", name: "Z.AI" },
			"zai-coding-cn": { fixed: true, protocol: "openai-completions", endpoint: "https://open.bigmodel.cn/api/coding/paas/v4", name: "Z.AI Coding CN" },
			bailian: { fixed: false, keyRequired: true, hideProtocol: true, name: "阿里云百炼" },
		};
		var PROVIDER_IDS_UI = Object.keys(PROVIDERS_UI).sort();
		// 生图面板供应商：仅保留已知提供生图模型的供应商（排除纯文本/编码/不支持的）
		var IMGGEN_PROVIDER_IDS_UI = PROVIDER_IDS_UI.filter(function (p) {
			return p === "custom" || p === "comfyui" ||
				["agnes", "agnes-cn", "openai", "openrouter", "together", "fireworks", "huggingface", "bailian", "qwen-token-plan", "qwen-token-plan-cn"].indexOf(p) >= 0;
		});

		// v2.8: video-generation provider presets (mirror of host VIDEO_PROVIDERS).
		// fixed: URL baked in; fixedProtocol: protocol locked for that provider.
		var VIDEO_PROVIDERS_UI = {
			custom: { fixed: false, fixedProtocol: false, keyRequired: true },
			agnes: { fixed: true, fixedProtocol: true, protocol: "openai-videos", endpoint: "https://apihub.agnes-ai.com/v1", keyRequired: true },
			"agnes-cn": { fixed: true, fixedProtocol: true, protocol: "openai-videos", endpoint: "https://api.agnes-ai.cn/v1", keyRequired: true },
			dashscope: { fixed: false, fixedProtocol: true, protocol: "dashscope-video", endpoint: "https://dashscope.aliyuncs.com", keyRequired: true },
			kling: { fixed: true, fixedProtocol: true, protocol: "kling-video", endpoint: "https://api.klingai.com", keyRequired: true },
			volc: { fixed: true, fixedProtocol: true, protocol: "volc-video", endpoint: "https://ark.cn-beijing.volces.com", keyRequired: true },
			minimax: { fixed: true, fixedProtocol: true, protocol: "minimax-video", endpoint: "https://api.minimaxi.com", keyRequired: true },
			"qwen-token-plan": { fixed: false, fixedProtocol: true, protocol: "dashscope-video", endpoint: "https://dashscope.aliyuncs.com", keyRequired: true },
			"qwen-token-plan-cn": { fixed: false, fixedProtocol: true, protocol: "dashscope-video", endpoint: "https://dashscope.aliyuncs.com", keyRequired: true }
		};
			var VIDEO_PROVIDER_IDS_UI = Object.keys(VIDEO_PROVIDERS_UI);
			var VIDEO_PROTOCOL_OPTIONS_UI = [
				{ value: "openai-videos", label: "openai-videos" },
				{ value: "dashscope-video", label: "dashscope-video" },
				{ value: "kling-video", label: "kling-video" },
				{ value: "volc-video", label: "volc-video" },
				{ value: "minimax-video", label: "minimax-video" },
				{ value: "async-task", label: "async-task" },
				{ value: "custom-adapter", label: "custom-adapter" }
			];
			var VOICE_PROVIDERS_UI = {
				mimo: { group: "cloud", fixed: true, fixedUrl: true, endpoint: "https://api.xiaomimimo.com/v1", keyRequired: true },
				minimax: { group: "cloud", fixed: true, fixedUrl: true, endpoint: "https://api.minimaxi.com", keyRequired: true },
				doubao: { group: "cloud", fixed: true, fixedUrl: true, endpoint: "https://openspeech.bytedance.com", keyRequired: true },
				indextts: { group: "local", fixed: true, fixedUrl: true, endpoint: "http://127.0.0.1:7880", keyRequired: false },
				gptsovits: { group: "local", fixed: true, fixedUrl: true, endpoint: "http://127.0.0.1:9880", keyRequired: false },
				voxcpm: { group: "local", fixed: true, fixedUrl: true, endpoint: "http://127.0.0.1:8000", keyRequired: false },
				"tts-webui": { group: "local", fixed: false, fixedUrl: false, endpoint: "", keyRequired: false }
			};
			var MIMO_PRESET_VOICES = ["mimo_default", "冰糖", "茉莉", "苏打", "白桦", "Mia", "Chloe", "Milo", "Dean"];
			// v2.9.7: doubao 10 built-in voices from 文档/豆包.txt (seed-tts-2.0)
			var DOUBAO_PRESET_VOICES = [
				{ id: "zh_female_vv_uranus_bigtts", name: "Vivi 2.0" },
				{ id: "zh_female_xiaohe_uranus_bigtts", name: "小何 2.0" },
				{ id: "zh_female_qingxinnvsheng_uranus_bigtts", name: "清新女声 2.0" },
				{ id: "zh_male_m191_uranus_bigtts", name: "云舟 2.0" },
				{ id: "zh_male_taocheng_uranus_bigtts", name: "小天 2.0" },
				{ id: "zh_female_qinqienv_uranus_bigtts", name: "亲切女声 2.0" },
				{ id: "zh_male_silang_uranus_bigtts", name: "四郎 2.0" },
				{ id: "zh_female_peiqi_uranus_bigtts", name: "佩奇猪 2.0" },
				{ id: "ICL_uranus_en_female_charlie_tob", name: "Charlie 2.0" },
				{ id: "ICL_uranus_zh_female_nuanxinqianqian_tob", name: "暖心茜茜 2.0" }
			];
			function voiceProviderDisplay(id, t) {
				if (id === "mimo") return t("voiceProviderMimo");
				if (id === "minimax") return t("voiceProviderMinimax");
				if (id === "doubao") return t("voiceProviderDoubao");
				if (id === "indextts") return t("voiceProviderIndextts");
				if (id === "gptsovits") return t("voiceProviderGptsovits");
				if (id === "voxcpm") return t("voiceProviderVoxcpm");
				if (id === "tts-webui") return t("voiceProviderTtsWebui");
				return id;
			}
			function videoProviderDisplay(id, t) {
			if (id === "custom") return t("videoProviderCustom");
			if (id === "agnes") return t("videoProviderAgnes");
			if (id === "agnes-cn") return t("videoProviderAgnesCn");
			if (id === "dashscope") return t("videoProviderDashscope");
			if (id === "kling") return t("videoProviderKling");
			if (id === "volc") return t("videoProviderVolc");
			if (id === "minimax") return t("videoProviderMinimax");
			if (id === "qwen-token-plan") return t("videoProviderQwenTokenPlan");
			if (id === "qwen-token-plan-cn") return t("videoProviderQwenTokenPlanCn");
			return id;
		}

		function providerDisplay(id, t) {
			var m = PROVIDERS_UI[id];
			if (!m) return id;
			if (id === "custom") return t("providerCustom");
			if (id === "ollama") return t("providerOllama");
			if (id === "comfyui") return "ComfyUI";
			return m.name;
		}

		// Flip the model dropdown upward when there is not enough room below.
		function ddRef(el) {
			if (!el) return;
			var wrap = el.closest(".omni-model-wrap");
			if (!wrap) return;
			var below = window.innerHeight - wrap.getBoundingClientRect().bottom;
			if (below < 210) { el.style.top = "auto"; el.style.bottom = "calc(100% + 2px)"; }
		}

		// Mirror-mapping dropdown: viewport-fixed so the scrollable mapping list never clips it.
		// Coordinates computed from the trigger wrap; flips up when space below is tight.
		function mappingDdRef(el) {
			if (!el) return;
			var wrap = el.closest(".omni-model-wrap");
			if (!wrap) return;
			var r = wrap.getBoundingClientRect();
			el.style.left = r.left + "px";
			el.style.width = String(Math.max(r.width, 220)) + "px";
			var below = window.innerHeight - r.bottom;
			if (below < 220) { el.style.top = "auto"; el.style.bottom = (window.innerHeight - r.top + 2) + "px"; }
			else { el.style.top = (r.bottom + 2) + "px"; el.style.bottom = "auto"; }
		}

		// Flip the provider dropdown: below insufficient → up; above insufficient → down (default).
		function provDdRef(el) {
			if (!el) return;
			var wrap = el.closest(".omni-provider-wrap");
			if (!wrap) return;
			var rect = wrap.getBoundingClientRect();
			var below = window.innerHeight - rect.bottom;
			if (below < 340) { el.style.top = "auto"; el.style.bottom = "calc(100% + 2px)"; }
		}

		// Flip the card / batch / preset menus up when space below is tight (mirrors provDdRef).
		function menuDdRef(el) {
			if (!el) return;
			var wrap = el.closest(".omni-card-menu-wrap, .omni-batch-wrap, .omni-preset-bar");
			if (!wrap) return;
			var below = window.innerHeight - wrap.getBoundingClientRect().bottom;
			var need = Math.min(el.offsetHeight || 140, 280) + 8;
			if (below < need) { el.style.top = "auto"; el.style.bottom = "calc(100% + 2px)"; }
		}

		// ---------- shared UI atoms ----------
		function Field(props) {
			return React.createElement("label", { className: "omni-field" }, [
				React.createElement("span", { className: "omni-label" }, props.label),
				React.createElement("input", {
					className: "omni-input",
					type: props.password ? "password" : props.number ? "number" : "text",
					value: props.value,
					placeholder: props.placeholder || "",
					list: props.list || undefined,
					min: props.min,
					onChange: props.onChange
				})
			]);
		}

		function SelectField(props) {
			return React.createElement("label", { className: "omni-field" }, [
				React.createElement("span", { className: "omni-label" }, props.label),
				React.createElement("select", {
					className: "omni-input omni-select",
					value: props.value,
					onChange: props.onChange
				}, (props.optgroups
					? props.optgroups.map(function (g) {
						return React.createElement("optgroup", { key: g.label, label: g.label },
							g.options.map(function (o) {
								return React.createElement("option", { key: o.value, value: o.value }, o.label);
							}));
					})
					: (props.options || []).map(function (o) {
						return React.createElement("option", { key: o.value, value: o.value }, o.label);
					})))
			]);
		}

		// ---------- API card component ----------
		function ApiCard(props) {
			var t = props.t;
			var card = props.card;
			var id = card.id;
			var index = props.index;
			var expanded = !card.collapsed;
			var isOllama = card.provider === "ollama";
			var prov = PROVIDERS_UI[card.provider] || {};
			var isFixed = !!prov.fixed;
			var confirmDel = props.confirmDel === id;
			var provOpen = props.openProv === id;
			var modelList = (props.models && Array.isArray(props.models[id])) ? props.models[id] : [];
			var keyDraftValue = (props.keyDraft && props.keyDraft[id]) || "";
			var busy = props.busy;
			var menuOpen = props.menuOpen === id;
			var renaming = props.renameId === id;

			// collapsed summary line: endpoint (or provider), truncated
			var summary = "";
			if (card.collapsed) {
				var s = isFixed ? prov.endpoint : (card.endpoint ? card.endpoint : (isOllama ? "Ollama" : card.protocol));
				if (s.length > 42) s = s.slice(0, 42) + "…";
				summary = "· " + s;
			}

			var isDragging = props.dragFrom === index;
			var isDropTarget = props.dropOver === index;
			var isRevealed = !!((props.revealed && props.revealed[id]));
			var isDdOpen = props.openDd === id;

			// drag helpers (handle is always draggable; show whole-card ghost)
			function dragStart(e) {
				if (e.dataTransfer) {
					e.dataTransfer.setData("text/plain", String(index));
					e.dataTransfer.effectAllowed = "move";
					var cardEl = e.currentTarget.closest(".omni-card");
					if (cardEl && e.dataTransfer.setDragImage) e.dataTransfer.setDragImage(cardEl, 20, 12);
				}
				props.onDragStart(index);
			}
			function dragOver(e) {
				e.preventDefault();
				if (props.dragFrom !== null && props.dragFrom !== index) props.onDropOver(index);
			}
			function drop(e) {
				e.preventDefault();
				var from = Number(e.dataTransfer.getData("text/plain"));
				if (!Number.isNaN(from) && from !== index) props.onReorder(from, index);
				props.onDragEnd();
			}
			function dragEnd() {
				props.onDragEnd();
			}

			// rename helpers
			function startRename() { props.onStartRename(id); }
			function commitRename(e) {
				var v = e.target.value;
				if (e.key === "Enter") {
					var trimmed = String(v || "").trim();
					if (trimmed && trimmed !== card.name) props.onPatch(id, "name", trimmed);
					props.onEndRename();
				} else if (e.key === "Escape") {
					props.onEndRename();
				}
			}
			function blurRename(e) {
				var v = String(e.target.value || "").trim();
				if (v && v !== card.name) props.onPatch(id, "name", v);
				props.onEndRename();
			}

			var providerGroups = [
				{ label: t("providerGroupGeneral"), options: [
					{ value: "custom", label: t("providerCustom") },
					{ value: "ollama", label: t("providerOllama") }
				] },
				{ label: t("providerGroupBuiltin"), options: PROVIDER_IDS_UI.filter(function (p) { return p !== "custom" && p !== "ollama"; }).map(function (p) {
					return { value: p, label: providerDisplay(p, t) };
				}) }
			];
			var protocolOptions = [
				{ value: "openai-completions", label: t("protoOpenaiCompletions") },
				{ value: "openai-responses", label: t("protoOpenaiResponses") },
				{ value: "anthropic-messages", label: t("protoAnthropicMessages") },
				{ value: "google-gemini", label: t("protoGoogleGemini") }
			];

			var toggleCollapse = function () { props.onPatch(id, "collapsed", !card.collapsed); }
			var head = React.createElement("div", { className: "omni-card-head omni-head-clickable", onClick: toggleCollapse }, [
				React.createElement("div", {
					className: "omni-drag-handle",
					draggable: true,
					title: t("dragHint"),
					onDragStart: dragStart,
					onDragEnd: dragEnd,
					onClick: function (e) { e.stopPropagation(); }
				}, React.createElement(SvgIcon, { d: I_DRAG })),
				React.createElement("div", { className: "omni-card-name" }, renaming
					? React.createElement("input", {
						className: "omni-card-name-input",
						defaultValue: card.name,
						autoFocus: true,
						onKeyDown: commitRename,
						onBlur: blurRename
					})
					: [
						React.createElement("span", { className: "omni-card-name-text", onDoubleClick: startRename, onClick: function (e) { e.stopPropagation(); } }, card.name || t("cardNamePh")),
						summary ? React.createElement("span", { className: "omni-card-summary" }, summary) : null
					]),
				React.createElement("div", { className: "omni-card-menu-wrap" }, [
					React.createElement("button", {
						className: "omni-icon-btn omni-card-menu-btn",
						onClick: function (e) { e.stopPropagation(); props.onToggleMenu(id); }
					}, React.createElement(SvgIcon, { d: I_MENU })),
					menuOpen ? React.createElement("div", { className: "omni-card-menu", ref: menuDdRef }, [
						React.createElement("div", { className: "omni-menu-item", onClick: function (e) { e.stopPropagation(); props.onMoveTop(id); props.onCloseMenu(); } },
							React.createElement(SvgIcon, { d: I_PIN_TOP }), React.createElement("span", null, t("menuPinTop"))),
						React.createElement("div", { className: "omni-menu-item", onClick: function (e) { e.stopPropagation(); props.onMoveBottom(id); props.onCloseMenu(); } },
							React.createElement(SvgIcon, { d: I_PIN_BOTTOM }), React.createElement("span", null, t("menuPinBottom"))),
						React.createElement("div", { className: "omni-menu-item omni-menu-danger" + (confirmDel ? " omni-menu-confirm" : ""), onClick: function (e) { e.stopPropagation(); props.onDeleteClick(id); } },
							React.createElement(SvgIcon, { d: I_TRASH }), React.createElement("span", null, confirmDel ? t("confirmDelete") : t("menuDelete")))
					]) : null
				]),
				// v2.12: card enable/disable toggle — right of "..." menu, left of collapse button
				React.createElement("label", { className: "omni-switch omni-switch-sm omni-card-enable", title: card.enabled !== false ? "已启用" : "已禁用", onClick: function (e) { e.stopPropagation(); } }, [
					React.createElement("input", { type: "checkbox", checked: card.enabled !== false, onChange: function () { props.onPatch(id, "enabled", !(card.enabled !== false)); } }),
					React.createElement("span", { className: "omni-switch-slider" })
				]),
				React.createElement("button", {
					className: "omni-icon-btn",
					title: expanded ? "Collapse" : "Expand",
					onClick: function (e) { e.stopPropagation(); toggleCollapse(); }
				}, React.createElement(SvgIcon, { d: expanded ? I_COLLAPSE : I_EXPAND }))
			]);

			var body = null;
			if (expanded) {
				body = React.createElement("div", { className: "omni-card-body" }, [
					React.createElement("div", { className: "omni-row" }, [
						React.createElement("div", { className: "omni-field omni-grow" }, [
							React.createElement("span", { className: "omni-label" }, t("providerLabel")),
							React.createElement("div", { className: "omni-provider-wrap" }, [
								React.createElement("button", {
									className: "omni-input omni-provider-btn", type: "button",
									onClick: function () { props.onToggleProv(id); }
								}, [
									React.createElement("span", { className: "omni-provider-label" }, providerDisplay(card.provider, t)),
									React.createElement("span", { className: "omni-provider-arrow" }, provOpen ? "▴" : "▾")
								]),
								provOpen ? React.createElement("div", { className: "omni-provider-dropdown", ref: provDdRef }, providerGroups.map(function (g) {
									return [React.createElement("div", { key: "g-" + g.label, className: "omni-dd-group" }, g.label)].concat(g.options.map(function (o) {
										return React.createElement("div", {
											key: o.value, className: "omni-dd-item" + (o.value === card.provider ? " active" : ""),
											onClick: function () { props.onPickProvider(id, o.value); }
										}, o.label);
									}));
								})) : null
							])
						]),
						(isFixed || prov.hideProtocol) ? null : React.createElement(SelectField, {
							label: t("protocolLabel"),
							value: card.protocol,
							options: protocolOptions,
							onChange: function (e) { props.onPatch(id, "protocol", e.target.value); }
						})
					]),
					React.createElement("div", { className: "omni-row" }, [
						React.createElement(Field, {
							label: t("timeoutLabel"),
							number: true,
							min: 1000,
							value: String(card.timeoutMs != null ? card.timeoutMs : 120000),
							placeholder: "120000",
							onChange: function (e) { props.onPatch(id, "timeoutMs", e.target.value); }
						}),
						React.createElement(Field, {
							label: t("contextWindowLabel"),
							number: true, min: 1,
							value: String(card.contextWindow != null ? card.contextWindow : ""),
							placeholder: "262144",
							onChange: function (e) { props.onPatch(id, "contextWindow", e.target.value); }
						}),
						React.createElement(Field, {
							label: t("maxOutputLabel"),
							number: true, min: 1,
							value: String(card.maxOutput != null ? card.maxOutput : ""),
							placeholder: "32768",
							onChange: function (e) { props.onPatch(id, "maxOutput", e.target.value); }
						})
					]),
					isFixed
						? React.createElement("p", { className: "omni-fixed-url" }, t("fixedUrlLabel") + ": " + prov.endpoint)
						: React.createElement(Field, {
							label: t("endpointLabel"),
							value: card.endpoint || "",
							placeholder: t("endpointPh"),
							onChange: function (e) { props.onPatch(id, "endpoint", e.target.value); }
						}),
					isOllama
						? React.createElement("p", { className: "omni-models" }, t("ollamaHint"))
						: React.createElement("label", { className: "omni-field" }, [
							React.createElement("span", { className: "omni-label" }, t("apiKeyLabel")),
							React.createElement("div", { className: "omni-key-wrap" }, [
								React.createElement("input", {
									className: "omni-input omni-key-input",
									type: isRevealed ? "text" : "password",
									value: keyDraftValue,
									placeholder: card.apiKeySet ? t("apiKeySet") : "sk-...",
									onChange: function (e) { props.onSaveKey(id, e.target.value); }
								}),
								React.createElement("button", {
									className: "omni-eye-btn", type: "button",
									title: isRevealed ? t("keyHide") : t("keyReveal"),
									onClick: function (e) { e.preventDefault(); props.onToggleReveal(id); }
								}, React.createElement(SvgIcon, { d: isRevealed ? I_EYE_OFF : I_EYE }))
							])
						]),
					React.createElement("div", { className: "omni-row omni-model-fetch-row" }, [
					React.createElement("div", { className: "omni-field omni-grow" }, [
						React.createElement("span", { className: "omni-label" }, t("modelLabel")),
						React.createElement("div", { className: "omni-model-wrap" }, [
							React.createElement("input", {
								className: "omni-input omni-model-input",
								type: "text",
								value: card.model || "",
								placeholder: t("modelPh"),
								onChange: function (e) { props.onPatch(id, "model", e.target.value); }
							}),
							React.createElement("button", {
								className: "omni-eye-btn", type: "button",
								title: t("ddHint"),
								onClick: function (e) { e.preventDefault(); props.onToggleDd(id); }
							}, React.createElement(SvgIcon, { d: isDdOpen ? I_COLLAPSE : I_EXPAND })),
							isDdOpen && modelList.length > 0 ? React.createElement("div", { className: "omni-model-dropdown", ref: ddRef },
								modelList.map(function (m) {
									return React.createElement("div", {
										key: m, className: "omni-dd-item" + (m === card.model ? " active" : ""),
										onClick: function () { props.onPickModel(id, m); }
									}, m);
								})) : null
						])
					]),
					React.createElement("button", {
						className: "omni-btn",
						disabled: busy !== "",
						onClick: function () { props.onFetchModels(id); }
					}, busy === "mdl-" + id ? t("fetching") : t("fetchBtn"))
				]),
					(!card.endpoint && !isFixed) ? React.createElement("p", { className: "omni-models" }, t("endpointHint")) : null
				]);
			}

			return React.createElement("div", {
				className: "omni-card" + (isDragging ? " dragging" : "") + (isDropTarget ? " drop-target" : "") + (card.enabled === false ? " omni-card-disabled" : ""),
				onDragOver: dragOver,
				onDrop: drop,
				onDragEnd: dragEnd
			}, [head, body]);
		}

		// ---------- toast notification system (v2.7) ----------
		var TOAST_ICONS = { info: I_TOAST_INFO, success: I_TOAST_SUCCESS, warning: I_TOAST_WARNING, error: I_TOAST_ERROR };
		var TOAST_DUR = { info: 3000, success: 3000, warning: 3000, error: 3000 };
		// toastSeq / toastTimers live at module scope: the settings panel re-renders
		// on every config save, and a component-local map would be re-created each
		// render — extendToast could never clear the original dismiss timer and a
		// clicked toast would still die at TOAST_DUR. Module scope keeps the map
		// (and the id counter) alive across renders.
		var toastSeq = 0;
		var toastTimers = {};
		function ToastCard(props) {
			var t = props.toast || {};
			var icon = TOAST_ICONS[t.type] || TOAST_ICONS.info;
			return React.createElement("div", {
				className: "omni-toast-card omni-toast-" + (t.type || "info"),
				onClick: function () { if (props.onExtend) props.onExtend(t.id); }
			}, [
				React.createElement(SvgIcon, { d: icon, width: 18, height: 18 }),
				React.createElement("div", { className: "omni-toast-body" }, [
					t.title ? React.createElement("div", { className: "omni-toast-title" }, t.title) : null,
					t.desc ? React.createElement("div", { className: "omni-toast-desc" }, t.desc) : null
				]),
				React.createElement("button", { className: "omni-toast-close", onClick: function (e) { e.stopPropagation(); if (props.onClose) props.onClose(); } }, "\u00d7")
			]);
		}
		function ToastContainer(props) {
			var toasts = Array.isArray(props.toasts) ? props.toasts : [];
			return React.createElement("div", { className: "omni-toast-container" },
				toasts.map(function (t) {
					return React.createElement(ToastCard, {
						key: t.id, toast: t,
						onClose: function () { props.onClose(t.id); },
						onExtend: function () { props.onExtend(t.id); }
					});
				})
			);
		}
		// ---------- image generation panel ----------
		// v2.7: multi-workflow list + edit view replaces old single-workflow textarea
		function WorkflowList(props) {
			var t = props.t;
			var workflows = Array.isArray(props.workflows) ? props.workflows : [];
			var activeId = props.activeId || "";
			var delConfirm = React.useState(null);
			var cards = workflows.map(function (wf) {
				var isActive = wf.id === activeId;
				return React.createElement("div", { key: wf.id, className: "omni-comfy-wf-card" }, [
					React.createElement("button", {
						className: "omni-comfy-wf-toggle " + (isActive ? "on" : "off"),
						title: isActive ? "ON" : "OFF",
						onClick: function () { if (!isActive) props.onToggle(wf.id); }
					}),
					React.createElement("span", { className: "omni-comfy-wf-name" }, wf.name || t("comfyWfNamePh")),
					React.createElement("button", {
						className: "omni-comfy-wf-edit", title: t("comfyWfEdit"),
						onClick: function () { props.onEdit(wf.id); }
					}, React.createElement(SvgIcon, { d: I_EDIT })),
					React.createElement("button", {
						className: "omni-comfy-wf-delete", title: t("comfyWfDelete"),
						onClick: function () { delConfirm[1](wf.id); }
					}, React.createElement(SvgIcon, { d: I_TRASH }))
				]);
			});
			var modal = delConfirm[0] ? React.createElement("div", { className: "omni-comfy-wf-confirm-modal" }, [
				React.createElement("div", { className: "omni-comfy-wf-confirm-content" }, [
					React.createElement("p", null, t("comfyWfDeleteConfirm")),
					React.createElement("div", { className: "omni-row" }, [
						React.createElement("button", {
							className: "omni-btn omni-confirm-delete",
							onClick: function () { props.onDelete(delConfirm[0]); delConfirm[1](null); }
						}, t("comfyWfDeleteConfirmBtn")),
						React.createElement("button", {
							className: "omni-btn omni-cancel",
							onClick: function () { delConfirm[1](null); }
						}, t("comfyWfDeleteCancel"))
					])
				])
			]) : null;
			return React.createElement("div", { className: "omni-comfy-wf-list" }, [
				React.createElement("div", { className: "omni-comfy-wf-list-title-row" }, [
					React.createElement("h4", { className: "omni-comfy-wf-list-title" }, t("comfyWfListTitle")),
					React.createElement("button", {
						className: "omni-comfy-wf-help-btn", title: t("comfyWfHelpBtn"),
						onClick: function () { if (props.onOpenHelp) props.onOpenHelp(); }
					}, React.createElement(SvgIcon, { d: I_HELP }))
				]),
				workflows.length === 0 ? React.createElement("p", { className: "omni-msg" }, t("comfyWfNoWorkflows")) : null,
				React.createElement("div", { className: "omni-comfy-wf-cards" }, cards),
				React.createElement("div", { className: "omni-comfy-wf-actions" }, [
					React.createElement("label", { className: "omni-btn omni-comfy-wf-import-btn" }, [
						t("comfyWfImportBtn"),
						React.createElement("input", {
							type: "file", accept: ".json,application/json", style: { display: "none" },
							onChange: function (e) {
								var f = e.target.files && e.target.files[0];
								if (!f) return;
								var reader = new FileReader();
								reader.onload = function () {
									props.onImport(f.name.replace(/\.[^.]+$/, ""), String(reader.result || ""));
								};
								reader.readAsText(f);
								e.target.value = "";
							}
						})
					])
				]),
				modal
			]);
		}

		// v2.9.15: WorkflowHistoryModal removed — file import is the sole path now.

		// v2.9.14: static how-to-import help modal (popup, does not occupy panel space)
		function WorkflowHelpModal(props) {
			var t = props.t;
			return React.createElement("div", { className: "omni-comfy-wf-modal-overlay", onClick: function (e) { if (e.target === e.currentTarget) props.onClose(); } }, [
				React.createElement("div", { className: "omni-comfy-wf-modal-in omni-comfy-wf-help-content" }, [
					React.createElement("div", { className: "omni-comfy-wf-history-head" }, [
						React.createElement("h4", { className: "omni-comfy-wf-title" }, t("comfyWfHelpTitle")),
						React.createElement("button", { className: "omni-btn", onClick: props.onClose }, t("comfyWfHelpClose"))
					]),
					React.createElement("p", { className: "omni-label" }, t("comfyWfHelpIntro")),
					React.createElement("ol", null, [
						React.createElement("li", null, t("comfyWfHelpStep1")),
						React.createElement("li", null, t("comfyWfHelpStep2"))
					]),
					React.createElement("p", { className: "omni-label" }, t("comfyWfHelpManualTitle")),
					React.createElement("p", null, t("comfyWfHelpManual")),
					React.createElement("div", { className: "omni-comfy-wf-help-mapping" }, [
						React.createElement("p", { className: "omni-label" }, t("comfyWfHelpMappingTitle")),
						React.createElement("p", null, t("comfyWfHelpMapping"))
					])
				])
			]);
		}

		function WorkflowEdit(props) {
			var t = props.t;
			var wf = props.wf || {};
			var collapsed = React.useState(true);
			var jsonDraft = React.useState(wf.workflow || "");
			var nameDraft = React.useState(wf.name || "");
			React.useEffect(function () { nameDraft[1](wf.name || ""); }, [wf.name]);
			// v2.9.14: mapping roles — value may be a node-id string or {node, field}
			var MAPPING_ROLES = [
				{ key: "sampler", label: "KSampler", field: false, def: "KSampler" },
				{ key: "checkpoint", label: "Checkpoint", field: true, def: "CheckpointLoader" },
				{ key: "unet", label: "UNETLoader", field: true, def: "UNETLoader" },
				{ key: "vae", label: "VAELoader", field: true, def: "VAELoader" },
				{ key: "clip", label: "CLIPLoader", field: true, def: "CLIPLoader" },
				{ key: "latent", label: "EmptyLatent", field: false, def: "EmptyLatentImage" },
				{ key: "positive", label: "Positive", field: true, def: "Positive" },
				{ key: "negative", label: "Negative", field: true, def: "Negative" }
			];
			var mapVal = function (key) {
				var v = wf.mapping && wf.mapping[key];
				if (v == null) return null;
				if (typeof v === "string") return { node: v.trim(), field: "" };
				if (typeof v === "object") return { node: (typeof v.node === "string" ? v.node : ""), field: (typeof v.field === "string" ? v.field : "") };
				return null;
			};
			var summaryParts = wf.mapping ? MAPPING_ROLES.filter(function (r) { var mv = mapVal(r.key); return mv && mv.node !== ""; }).map(function (r) {
				var mv = mapVal(r.key);
				return r.label + ": " + mv.node + (r.field && mv.field ? "." + mv.field : "");
			}) : [];
			var mappingMissing = (wf.mapping && Array.isArray(wf.mapping.missing)) ? wf.mapping.missing : [];
			var summary = summaryParts.join(" · ") + (mappingMissing.length > 0 ? " · " + t("comfyWfMappingMissing") + " " + mappingMissing.length : "");
			return React.createElement("div", { className: "omni-comfy-wf-edit" }, [
				React.createElement("div", { className: "omni-comfy-wf-edit-header" }, [
					React.createElement("span", { className: "omni-comfy-wf-title" }, t("comfyWfListTitle")),
					React.createElement("input", {
						className: "omni-input omni-comfy-wf-name-input", type: "text",
						placeholder: t("comfyWfNamePh"), value: nameDraft[0],
						onChange: function (e) { nameDraft[1](e.target.value); },
						onBlur: function (e) { if (e.target.value !== (wf.name || "")) props.onRename(wf.id, e.target.value); }
					}),
					React.createElement("button", { className: "omni-btn omni-comfy-wf-back", onClick: props.onBack }, t("comfyWfBack"))
				]),
				React.createElement("div", { className: "omni-field" }, [
					React.createElement("span", { className: "omni-label" }, t("comfyWfJsonLabel")),
					React.createElement("textarea", {
						className: "omni-input omni-comfy-wf-json", rows: 12,
						value: jsonDraft[0], onChange: function (e) { jsonDraft[1](e.target.value); }
					}),
					React.createElement("button", {
						className: "omni-btn", onClick: function () { props.onUpdateJson(wf.id, jsonDraft[0]); }
					}, "保存 JSON")
				]),
				React.createElement("div", { className: "omni-comfy-wf-basic-config" }, [
					React.createElement("span", { className: "omni-label" }, t("comfyWfBasicConfig")),
					React.createElement("div", { className: "omni-row" }, [
						React.createElement("div", { className: "omni-field" }, [
							React.createElement("span", { className: "omni-label omni-label-sm" }, t("comfyWfSteps")),
							React.createElement("input", { className: "omni-input", type: "number", value: wf.steps === "" ? "" : wf.steps, placeholder: "20",
								onChange: function (e) { props.onUpdateConfig(wf.id, "steps", e.target.value === "" ? "" : Number(e.target.value)); } })
						]),
						React.createElement("div", { className: "omni-field" }, [
							React.createElement("span", { className: "omni-label omni-label-sm" }, t("comfyWfCfg")),
							React.createElement("input", { className: "omni-input", type: "number", value: wf.cfg === "" ? "" : wf.cfg, placeholder: "8",
								onChange: function (e) { props.onUpdateConfig(wf.id, "cfg", e.target.value === "" ? "" : Number(e.target.value)); } })
						]),
						React.createElement("div", { className: "omni-field" }, [
							React.createElement("span", { className: "omni-label omni-label-sm" }, t("comfyWfScheduler")),
							React.createElement("input", { className: "omni-input", type: "text", value: wf.scheduler || "", placeholder: "normal",
								onChange: function (e) { props.onUpdateConfig(wf.id, "scheduler", e.target.value); } })
						]),
						React.createElement("div", { className: "omni-field" }, [
							React.createElement("span", { className: "omni-label omni-label-sm" }, t("comfyWfSeed")),
							React.createElement("input", { className: "omni-input", type: "number", value: wf.seed === "" ? "" : wf.seed, placeholder: t("comfyWfSeed"),
								onChange: function (e) { props.onUpdateConfig(wf.id, "seed", e.target.value === "" ? "" : Number(e.target.value)); } })
						])
					])
				]),
				React.createElement("div", { className: "omni-comfy-wf-mapping" }, [
					React.createElement("button", {
						className: "omni-comfy-wf-mapping-toggle",
						onClick: function () { collapsed[1](!collapsed[0]); }
					}, [
						React.createElement(SvgIcon, { d: collapsed[0] ? I_EXPAND : I_COLLAPSE }),
						React.createElement("span", null, t("comfyWfMappingTitle"))
					]),
					!collapsed[0] ? React.createElement("div", { className: "omni-comfy-wf-mapping-body" }, [
						summary ? React.createElement("div", { className: "omni-comfy-wf-mapping-summary" }, summary) : null,
						mappingMissing.length > 0 ? React.createElement("div", { className: "omni-comfy-wf-mapping-warn" }, [
							t("comfyWfMappingMissing") + "：" + mappingMissing.join("、")
						]) : null,
						React.createElement("div", { className: "omni-row" }, [
							React.createElement("button", {
								className: "omni-btn omni-comfy-wf-automap",
								onClick: function () { props.onAutoMap(wf.id); }
							}, t("comfyWfAutoMap"))
						]),
						// v2.9.15: scrollable mapping rows container — insertion order (not MAPPING_ROLES fixed order)
						React.createElement("div", { className: "omni-comfy-wf-mapping-rows" },
							Object.keys(wf.mapping || {}).filter(function (key) {
								return MAPPING_ROLES.some(function (r) { return r.key === key; }) && mapVal(key);
							}).map(function (key) {
								var r = MAPPING_ROLES.find(function (mr) { return mr.key === key; }) || { key: key, label: key, field: false };
								var mv = mapVal(key);
								return React.createElement("div", { key: r.key, className: "omni-comfy-wf-map-row" }, [
									React.createElement("span", { className: "omni-comfy-wf-map-label" }, r.label),
									React.createElement("div", { className: "omni-field" }, [
										React.createElement("input", {
											className: "omni-input", type: "text", value: mv.node,
											placeholder: "node id",
											onChange: function (e) {
												var cur = mapVal(r.key) || { node: "", field: "" };
												var node = e.target.value;
												props.onUpdateMapping(wf.id, r.key, cur.field ? { node: node, field: cur.field } : node);
											}
										})
									]),
									r.field ? React.createElement("div", { className: "omni-field" }, [
										React.createElement("input", {
											className: "omni-input", type: "text",
											placeholder: t("comfyWfMappingFieldPh"), value: mv.field,
											onChange: function (e) {
												var cur = mapVal(r.key) || { node: "", field: "" };
												props.onUpdateMapping(wf.id, r.key, { node: cur.node, field: e.target.value });
											}
										})
									]) : null
								]);
							})
						),,
						// v2.9.15: custom mappings section (unlimited, user-defined injection points)
						React.createElement("div", { className: "omni-comfy-wf-custom-mappings" }, [
							React.createElement("span", { className: "omni-label" }, t("comfyWfCustomMappings")),
							React.createElement("div", { className: "omni-comfy-wf-custom-rows" },
								(wf.customMappings || []).map(function (cm) {
									var CM_TYPES = [
										{ v: "auto", l: t("comfyWfCmTypeAuto") },
										{ v: "string", l: t("comfyWfCmTypeString") },
										{ v: "float", l: t("comfyWfCmTypeFloat") },
										{ v: "integer", l: t("comfyWfCmTypeInt") },
										{ v: "option", l: t("comfyWfCmTypeOption") }
									];
									var updField = function (f, val) {
										var nm = (wf.customMappings || []).map(function (c) {
											return c.id === cm.id ? Object.assign({}, c, Object.prototype.hasOwnProperty.call(Object(f), f) ? Object.defineProperty({}, f, {value: val, enumerable: true}) : {}) : c;
										});
										props.onUpdateCustomMappings(wf.id, nm);
									};
									var upd = function (f, val) {
										var nm = (wf.customMappings || []).map(function (c) {
											if (c.id !== cm.id) return c;
											var copy = {}; for (var k in c) copy[k] = c[k];
											copy[f] = val; return copy;
										});
										props.onUpdateCustomMappings(wf.id, nm);
									};
									return React.createElement("div", { key: cm.id, className: "omni-comfy-wf-cm-row" }, [
										React.createElement("div", { className: "omni-field" }, [
											React.createElement("span", { className: "omni-label-sm" }, t("comfyWfCmLabel")),
											React.createElement("input", { className: "omni-input", type: "text", value: cm.label || "", placeholder: t("comfyWfCmLabelPh"), onChange: function (e) { upd("label", e.target.value); } })
										]),
										React.createElement("div", { className: "omni-field" }, [
											React.createElement("span", { className: "omni-label-sm" }, t("comfyWfCmNode")),
											React.createElement("input", { className: "omni-input", type: "text", value: cm.nodeId || "", placeholder: "node id", onChange: function (e) { upd("nodeId", e.target.value); } })
										]),
										React.createElement("div", { className: "omni-field" }, [
											React.createElement("span", { className: "omni-label-sm" }, t("comfyWfCmField")),
											React.createElement("input", { className: "omni-input", type: "text", value: cm.field || "", placeholder: t("comfyWfCmFieldPh"), onChange: function (e) { upd("field", e.target.value); } })
										]),
										React.createElement("div", { className: "omni-field" }, [
											React.createElement("span", { className: "omni-label-sm" }, t("comfyWfCmDesc")),
											React.createElement("input", { className: "omni-input", type: "text", value: cm.description || "", placeholder: t("comfyWfCmDescPh"), onChange: function (e) { upd("description", e.target.value); } })
										]),
										React.createElement("div", { className: "omni-field" }, [
											React.createElement("span", { className: "omni-label-sm" }, t("comfyWfCmType")),
											React.createElement("select", { className: "omni-input", value: cm.valueType || "auto", onChange: function (e) { upd("valueType", e.target.value); } },
												CM_TYPES.map(function (o) { return React.createElement("option", { key: o.v, value: o.v }, o.l); })
											)
										]),
										cm.valueType === "option" ? React.createElement("div", { className: "omni-field" }, [
											React.createElement("span", { className: "omni-label-sm" }, t("comfyWfCmOptions")),
											React.createElement("input", { className: "omni-input", type: "text", value: (cm.options || []).join(","), placeholder: t("comfyWfCmOptionsPh"), onChange: function (e) { upd("options", e.target.value.split(",").map(function (s) { return s.trim(); }).filter(Boolean)); } })
										]) : null,
										React.createElement("div", { className: "omni-field" }, [
											React.createElement("span", { className: "omni-label-sm" }, t("comfyWfCmValue")),
											cm.valueType === "option" && (cm.options || []).length > 0
												? React.createElement("select", { className: "omni-input", value: cm.value || "", onChange: function (e) { upd("value", e.target.value); } },
													[React.createElement("option", { key: "_", value: "" }, t("comfyWfCmValuePh"))].concat((cm.options || []).map(function (o) { return React.createElement("option", { key: o, value: o }, o); }))
												)
												: React.createElement("input", { className: "omni-input", type: "text", value: cm.value != null ? String(cm.value) : "", placeholder: t("comfyWfCmValuePh"), onChange: function (e) { upd("value", e.target.value); } })
										]),
										React.createElement("button", {
											className: "omni-comfy-wf-map-del", title: t("comfyWfMappingDelete"),
											onClick: function () {
												var nm = (wf.customMappings || []).filter(function (c) { return c.id !== cm.id; });
												props.onUpdateCustomMappings(wf.id, nm);
											}
										}, React.createElement(SvgIcon, { d: I_TRASH }))
									]);
								})
							),
							React.createElement("button", {
								className: "omni-btn omni-comfy-wf-map-add",
								onClick: function () {
									var nm = (wf.customMappings || []).concat([{
										id: "cm_" + Date.now() + "_" + Math.random().toString(36).slice(2, 5),
										label: "", nodeId: "", field: "", description: "",
										valueType: "auto", value: "", options: []
									}]);
									props.onUpdateCustomMappings(wf.id, nm);
								}
							}, t("comfyWfAddCustom"))
						])
					]) : null
				])
			]);
		}
		function ImggenPanel(props) {
			var t = props.t;
			var cfg = props.cfg || {};
			var meta = PROVIDERS_UI[cfg.provider] || {};
			var isFixed = !!meta.fixed;
			var isOllama = cfg.provider === "ollama";
			var isComfy = cfg.provider === "comfyui";
			var defaultPath = cfg.protocol === "openai-completions" ? "/chat/completions" : "/images/generations";
			var keyDraftValue = props.keyDraft || "";
			var isRevealed = !!props.revealed;
			var isDdOpen = !!props.openDd;
			var provOpen = !!props.openProv;
			var modelList = Array.isArray(props.modelList) ? props.modelList : [];
			var unetList = Array.isArray(props.unetList) ? props.unetList : [];
			var vaeList = Array.isArray(props.vaeList) ? props.vaeList : [];
			var clipList = Array.isArray(props.clipList) ? props.clipList : [];
			var vaeDdOpen = !!props.openVaeDd;
			var clipDdOpen = !!props.openClipDd;
			var busy = props.busy;
			var menuOpen = React.useState(false);
			// v2.7: workflow list/edit view state
			var wfView = React.useState("list"); // "list" | "edit"
			var editWf = React.useState(null); // workflow entry being edited
		// v2.9.15: history import removed; help modal state retained
		var helpOpen = React.useState(false);
		var presetNameDraft = React.useState(props.activePresetName || "");
		React.useEffect(function () { presetNameDraft[1](props.activePresetName || ""); }, [props.activePresetName]);
		// v2.12.3: 「仅显示生图模型」是 UI 状态 —— 不计入修改判定
		function igDirtyCfg(cf) { var o = Object.assign({}, cf || {}); delete o.filterImageModels; return o; }
		// v2.12.4: 基线存在组件外 —— 切 Tab 回来仍然是脏的；改回原值则不脏。
		// 基线名用「加载后的权威名」(props.activePresetName)，避免 editable 草稿名
		// 异步追平首帧造成的瞬时脏；cur 用 editable 草稿名。
		var igBaseKey = dirtyKey("imggen", props.activePresetId);
		// v2.12.5: 基线取自预设快照而非 props.cfg——props.cfg 已被 queueSave 自动落盘，
		// 重启后基线=已保存配置→脏标志丢失；预设快照仅「保存预设」时更新。
		var igPreset = (Array.isArray(props.presets) ? props.presets : []).find(function (p) { return p.id === props.activePresetId; });
		var igBaseline = baselineFor(igBaseKey, dirtyJson({ name: props.activePresetName || "", cfg: igDirtyCfg((igPreset || {}).config || {}) }));
		var igCur = dirtyJson({ name: presetNameDraft[0], cfg: igDirtyCfg(props.cfg) });
		var igDirty = igCur !== igBaseline;

		// v2.8: keep the edited workflow in sync with the draft-derived `props.workflows`
			// so that optimistic updates from updateWfConfig/updateWfMapping/renameWorkflow
			// (which mutate the draft synchronously) reflect immediately in the editor.
			React.useEffect(function () {
				if (wfView[0] === "edit" && editWf[0]) {
					var live = (props.workflows || []).find(function (w) { return w.id === editWf[0].id; });
					if (live && live !== editWf[0]) editWf[1](live);
				}
			}, [props.workflows]);

			// close the reset menu on outside click (also clears the armed confirm state)
			React.useEffect(function () {
				if (!menuOpen[0]) return;
				function close(e) {
					var tgt = e.target;
					if (!tgt || !tgt.closest || !tgt.closest(".omni-card-menu-wrap")) {
						menuOpen[1](false);
						if (props.onCloseMenu) props.onCloseMenu();
					}
				}
				document.addEventListener("click", close);
				return function () { document.removeEventListener("click", close); };
			}, [menuOpen[0]]);

			// close the preset dropdown on outside click (blank-space click closes it)
			React.useEffect(function () {
				if (!props.presetDdOpen) return;
				function close(e) {
					var tgt = e.target;
					if (!tgt || !tgt.closest || !tgt.closest(".omni-preset-bar")) {
						props.onTogglePresetDd();
					}
				}
				document.addEventListener("click", close);
				return function () { document.removeEventListener("click", close); };
			}, [props.presetDdOpen]);

			var providerGroups = [
				{ label: t("providerGroupGeneral"), options: [
					{ value: "custom", label: t("providerCustom") },
					{ value: "comfyui", label: "ComfyUI" }
				] },
				{ label: t("providerGroupBuiltin"), options: IMGGEN_PROVIDER_IDS_UI.filter(function (p) { return p !== "custom" && p !== "comfyui"; }).map(function (p) {
					return { value: p, label: providerDisplay(p, t) };
				}) }
			];
			var protocolOptions = [
				{ value: "openai-images", label: t("imggenProtocolImages") },
				{ value: "openai-completions", label: t("imggenProtocolChat") },
				{ value: "dashscope-image", label: "DashScope" }
			];
			var formatOptions = [
				{ value: "auto", label: t("imggenFormatAuto") },
				{ value: "b64_json", label: t("imggenFormatB64") },
				{ value: "url", label: t("imggenFormatUrl") }
			];

			var head = React.createElement("div", { className: "omni-imggen-head" }, [
				React.createElement("span", { className: "omni-imggen-title" }, t("imggenTitle")),
				React.createElement("div", { className: "omni-card-menu-wrap" }, [
					React.createElement("button", {
						className: "omni-icon-btn omni-card-menu-btn",
						onClick: function () { menuOpen[1](!menuOpen[0]); }
					}, React.createElement(SvgIcon, { d: I_MENU })),
					menuOpen[0] ? React.createElement("div", { className: "omni-card-menu", ref: menuDdRef }, [
						React.createElement("div", {
							className: "omni-menu-item omni-menu-danger" + (props.confirmReset ? " omni-menu-confirm" : ""),
							title: t("imggenResetHint"),
							onClick: function () {
								var wasArmed = !!props.confirmReset;
								props.onResetClick();
								if (wasArmed) menuOpen[1](false);
							}
						}, React.createElement(SvgIcon, { d: I_TRASH }), React.createElement("span", null, props.confirmReset ? t("imggenResetConfirm") : t("imggenReset")))
					]) : null
				])
			]);

		var presets = Array.isArray(props.presets) ? props.presets : [];
		var presetBar = React.createElement("div", { className: "omni-preset-bar" }, [
			React.createElement("div", { className: "omni-preset-input-wrap" }, [
				React.createElement("input", {
					className: "omni-input omni-preset-name-input",
					type: "text",
					value: presetNameDraft[0],
					placeholder: t("presetNamePh"),
					onChange: function (e) { presetNameDraft[1](e.target.value); }
				}),
				React.createElement("button", {
					className: "omni-preset-dd-btn", type: "button",
					onClick: props.onTogglePresetDd
				}, React.createElement(SvgIcon, { d: props.presetDdOpen ? I_COLLAPSE : I_EXPAND })),
				props.presetDdOpen ? React.createElement("div", { className: "omni-preset-menu", ref: menuDdRef },
					presets.map(function (p) {
						return React.createElement("div", {
							key: p.id, className: "omni-preset-menu-item" + (p.id === props.activePresetId ? " active" : ""),
							onClick: function () { props.onSwitchPreset(p.id); }
						}, p.name);
					})
				) : null
			]),
	React.createElement("button", {
		className: "omni-btn omni-save-btn", type: "button",
		title: t("presetSaved"),
		disabled: !igDirty,
		onClick: function () { if (presetNameDraft[0] !== (props.activePresetName || "")) props.onRenamePreset(presetNameDraft[0]); props.onSavePreset(); setBaseline(igBaseKey, igCur); }
	}, React.createElement(SvgFillIcon, { d: I_SAVE_FLOPPY })),
			React.createElement("button", {
				className: "omni-btn omni-preset-new-btn", type: "button",
				title: t("presetNew"),
				onClick: props.onAddPreset
			}, React.createElement(SvgIcon, { d: I_PLUS })),
			React.createElement("button", {
				className: "omni-btn omni-preset-del-btn omni-del-btn", type: "button",
				title: presets.length <= 1 ? t("presetDeleteDisabled") : t("presetDelete"),
				disabled: presets.length <= 1,
				onClick: props.onConfirmDeletePreset
			}, React.createElement(SvgIcon, { d: I_TRASH }))
		]);
		var confirmModal = props.presetDeleteConfirm ? React.createElement("div", { className: "omni-confirm-overlay", onClick: props.onCancelDeletePreset }, [
			React.createElement("div", { className: "omni-confirm-modal", onClick: function (e) { e.stopPropagation(); } }, [
				React.createElement("span", { className: "omni-confirm-title" }, t("presetDeleteTitle")),
				React.createElement("p", { className: "omni-confirm-msg" }, t("presetDeleteMsg")),
				React.createElement("div", { className: "omni-confirm-btns" }, [
					React.createElement("button", { className: "omni-btn", onClick: props.onCancelDeletePreset }, t("presetDeleteCancel")),
					React.createElement("button", { className: "omni-btn omni-confirm-danger", onClick: props.onConfirmDelete }, t("presetDeleteConfirm"))
				])
			])
		]) : null;
			// v2.8: derive model dropdown source + VAE/CLIP dropdown gating from the active workflow mapping
		var activeWf = (props.workflows || []).find(function (w) { return w.id === props.activeWfId; });
		var activeMp = (activeWf && activeWf.mapping) || {};
		var modelOpts = (activeMp.checkpoint && activeMp.unet) ? modelList.concat(unetList)
			: activeMp.unet ? unetList
			: modelList;
		// v2.8: 非 comfy 时 modelOpts 即 modelList；若 comfy 分支把列表算空（如残留
		// unet mapping 而 unetList 为空），回退到 modelList，保证下拉始终可渲染。
		var ddList = modelOpts.length > 0 ? modelOpts : modelList;
		var showVaeDd = vaeList.length > 0 && !!activeMp.vae;
		var showClipDd = clipList.length > 0 && !!activeMp.clip;
		var body = React.createElement("div", { className: "omni-card-body" }, [
				React.createElement("div", { className: "omni-row" }, [
					React.createElement("div", { className: "omni-field omni-grow" }, [
						React.createElement("span", { className: "omni-label" }, t("imggenProviderLabel")),
						React.createElement("div", { className: "omni-provider-wrap" }, [
							React.createElement("button", {
								className: "omni-input omni-provider-btn", type: "button",
								onClick: function () { props.onToggleProv(); }
							}, [
								React.createElement("span", { className: "omni-provider-label" }, providerDisplay(cfg.provider, t)),
								React.createElement("span", { className: "omni-provider-arrow" }, provOpen ? "▴" : "▾")
							]),
							provOpen ? React.createElement("div", { className: "omni-provider-dropdown", ref: provDdRef }, providerGroups.map(function (g) {
								return [React.createElement("div", { key: "g-" + g.label, className: "omni-dd-group" }, g.label)].concat(g.options.map(function (o) {
									return React.createElement("div", {
										key: o.value, className: "omni-dd-item" + (o.value === cfg.provider ? " active" : ""),
										onClick: function () { props.onPickProvider(o.value); }
									}, o.label);
								}));
							})) : null
						])
					]),
					isFixed || meta.hideProtocol ? null : React.createElement(SelectField, {
						label: t("imggenProtocolLabel"),
						value: cfg.protocol,
						options: protocolOptions,
						onChange: function (e) { props.onPatch("protocol", e.target.value); }
					}),
					React.createElement(Field, {
						label: t("imggenTimeoutLabel"),
						number: true,
						min: 1000,
						value: String(cfg.timeoutMs != null ? cfg.timeoutMs : 300000),
						placeholder: "300000",
						onChange: function (e) { props.onPatch("timeoutMs", e.target.value); }
					})
				]),
				isFixed
					? React.createElement("p", { className: "omni-fixed-url" }, t("fixedUrlLabel") + ": " + meta.endpoint)
					: React.createElement(Field, {
						label: t("imggenEndpointLabel"),
						value: cfg.endpoint || "",
						placeholder: isComfy ? t("comfyEndpointPh") : t("endpointPh"),
						onChange: function (e) { props.onPatch("endpoint", e.target.value); }
					}),
				isFixed || meta.hideProtocol ? null : React.createElement(Field, {
					label: t("imggenApiPathLabel"),
					value: cfg.apiPath || "",
					placeholder: cfg.protocol === "openai-completions"
						? t("imggenApiPathPh").replace("images/generations", "chat/completions")
						: cfg.protocol === "dashscope-image"
							? t("imggenApiPathPh").replace("images/generations", "services/aigc/image-generation/generation")
							: t("imggenApiPathPh"),
					onChange: function (e) { props.onPatch("apiPath", e.target.value); }
				}),
				isOllama
					? React.createElement("p", { className: "omni-models" }, t("ollamaHint"))
					: React.createElement("label", { className: "omni-field" }, [
						React.createElement("span", { className: "omni-label" }, t("imggenKeyLabel")),
						React.createElement("div", { className: "omni-key-wrap" }, [
							React.createElement("input", {
								className: "omni-input omni-key-input",
								type: isRevealed ? "text" : "password",
								value: keyDraftValue,
								placeholder: cfg.apiKeySet ? t("apiKeySet") : (isComfy ? t("comfyKeyPh") : "sk-..."),
								onChange: function (e) { props.onSaveKey(e.target.value); }
							}),
							React.createElement("button", {
								className: "omni-eye-btn", type: "button",
								title: isRevealed ? t("keyHide") : t("keyReveal"),
								onClick: function (e) { e.preventDefault(); props.onToggleReveal(); }
							}, React.createElement(SvgIcon, { d: isRevealed ? I_EYE_OFF : I_EYE }))
						])
					]),
				React.createElement("div", { className: "omni-row omni-model-fetch-row" }, [
					React.createElement("div", { className: "omni-field omni-grow" }, [
						React.createElement("span", { className: "omni-label" }, t("imggenModelLabel")),
						React.createElement("div", { className: "omni-model-wrap" }, [
							React.createElement("input", {
								className: "omni-input omni-model-input",
								type: "text",
								value: cfg.model || "",
								placeholder: isComfy ? t("comfyModelPh") : t("modelPh"),
								onChange: function (e) { props.onPatch("model", e.target.value); }
							}),
							React.createElement("button", {
								className: "omni-eye-btn", type: "button",
								title: t("ddHint"),
								onClick: function (e) { e.preventDefault(); props.onToggleDd(); }
							}, React.createElement(SvgIcon, { d: isDdOpen ? I_COLLAPSE : I_EXPAND })),
							isDdOpen && ddList.length > 0 ? React.createElement("div", { className: "omni-model-dropdown", ref: ddRef },
								ddList.map(function (m) {
									return React.createElement("div", {
										key: m, className: "omni-dd-item" + (m === cfg.model ? " active" : ""),
										onClick: function () { props.onPickModel(m); }
									}, m);
								})) : null
						])
					]),
					// v2.12: right column — toggle (top) + fetch button (bottom), shared right edge
					React.createElement("div", { className: "omni-model-right-col" }, [
						isComfy ? null : React.createElement("div", { className: "omni-filter-inline" }, [
							React.createElement("span", { className: "omni-filter-label" }, t("imggenFilterLabel")),
							React.createElement("label", { className: "omni-switch omni-switch-sm" }, [
								React.createElement("input", { type: "checkbox", checked: !!cfg.filterImageModels, onChange: function () { props.onToggleFilter(); } }),
								React.createElement("span", { className: "omni-switch-slider" })
							])
						]),
						React.createElement("button", {
							className: "omni-btn",
							disabled: busy !== "",
							onClick: function () { props.onFetchModels(); }
						}, busy === "ig-mdl" ? t("imggenFetching") : t("imggenFetchBtn"))
					])
				]),
			isComfy ? React.createElement("div", { className: "omni-row" }, [
				React.createElement("div", { className: "omni-field omni-grow" }, [
					React.createElement("span", { className: "omni-label" }, t("imggenVaeLabel")),
					React.createElement("div", { className: "omni-model-wrap" }, [
						React.createElement("input", {
							className: "omni-input omni-model-input",
							type: "text",
							value: cfg.vae || "",
							placeholder: t("imggenVaePh"),
							onChange: function (e) { props.onPatch("vae", e.target.value); }
						}),
						showVaeDd ? React.createElement("button", {
							className: "omni-eye-btn", type: "button",
							title: t("ddHint"),
							onClick: function (e) { e.preventDefault(); props.onToggleVaeDd(); }
						}, React.createElement(SvgIcon, { d: vaeDdOpen ? I_COLLAPSE : I_EXPAND })) : null,
						vaeDdOpen && showVaeDd ? React.createElement("div", { className: "omni-model-dropdown" },
							vaeList.map(function (m) {
								return React.createElement("div", {
									key: m, className: "omni-dd-item" + (m === cfg.vae ? " active" : ""),
									onClick: function () { props.onPickVae(m); }
								}, m);
							})) : null
					])
				]),
				React.createElement("div", { className: "omni-field omni-grow" }, [
					React.createElement("span", { className: "omni-label" }, t("imggenClipLabel")),
					React.createElement("div", { className: "omni-model-wrap" }, [
						React.createElement("input", {
							className: "omni-input omni-model-input",
							type: "text",
							value: cfg.clip || "",
							placeholder: t("imggenClipPh"),
							onChange: function (e) { props.onPatch("clip", e.target.value); }
						}),
						showClipDd ? React.createElement("button", {
							className: "omni-eye-btn", type: "button",
							title: t("ddHint"),
							onClick: function (e) { e.preventDefault(); props.onToggleClipDd(); }
						}, React.createElement(SvgIcon, { d: clipDdOpen ? I_COLLAPSE : I_EXPAND })) : null,
						clipDdOpen && showClipDd ? React.createElement("div", { className: "omni-model-dropdown" },
							clipList.map(function (m) {
								return React.createElement("div", {
									key: m, className: "omni-dd-item" + (m === cfg.clip ? " active" : ""),
									onClick: function () { props.onPickClip(m); }
								}, m);
							})) : null
					])
				])
			]) : null,
			isComfy ? null : React.createElement("div", { className: "omni-row" }, [
					React.createElement(Field, {
						label: t("imggenRetryLabel"),
						number: true,
						min: 0,
						value: String(cfg.retryCount != null ? cfg.retryCount : 2),
						placeholder: "2",
						onChange: function (e) { props.onPatch("retryCount", e.target.value); }
					}),
					isComfy ? null : React.createElement(SelectField, {
						label: t("imggenResponseFormatLabel"),
						value: cfg.responseFormat || "auto",
						options: formatOptions,
						onChange: function (e) { props.onPatch("responseFormat", e.target.value); }
					})
				]),
				isComfy ? React.createElement("p", { className: "omni-status" }, t("comfyHint")) : null,
				isComfy && wfView[0] === "list" ? React.createElement(WorkflowList, {
					t: t, workflows: props.workflows || [], activeId: props.activeWfId,
					onImport: props.onImport, onToggle: props.onToggle,
					onEdit: function (id) { editWf[1]((props.workflows || []).find(function (w) { return w.id === id; })); wfView[1]("edit"); },
					onDelete: props.onDelete,
					onOpenHelp: function () { helpOpen[1](true); }
				}) : null,
				isComfy && wfView[0] === "edit" && editWf[0] ? React.createElement(WorkflowEdit, {
					t: t, wf: editWf[0], onBack: function () { wfView[1]("list"); editWf[1](null); },
					onRename: props.onRename, onUpdateJson: props.onUpdateJson,
					onUpdateConfig: props.onUpdateConfig, onAutoMap: props.onAutoMap,
					onUpdateMapping: props.onUpdateMapping, onDeleteMapping: props.onDeleteMapping,
					onUpdateCustomMappings: props.onUpdateCustomMappings
				}) : null,
				React.createElement("p", { className: "omni-status" },
					t("imggenStatusPrefix") + (props.visible ? t("imggenToolVisible") : (isComfy ? t("imggenToolHidden") : t("toolHidden"))) +
					(props.modelCount != null ? " · " + t("fetchOkPrefix") + props.modelCount + t("fetchOkSuffix") : ""))
			]);

return React.createElement("div", { className: "omni-imggen-panel" }, [head, presetBar, React.createElement("div", { className: "omni-preset-divider" }), body, confirmModal]
	.concat(helpOpen[0] ? [React.createElement(WorkflowHelpModal, {
		t: t, onClose: function () { helpOpen[1](false); }
	})] : [])
	);
		}

		// ---------- fallback card ----------
		function FallbackCard(props) {
			var t = props.t;
			var cfg = props.cfg || {};
			var collapsed = props.collapsed !== false;
			var modelList = (props.models && Array.isArray(props.models)) ? props.models : [];
			var isDdOpen = props.openDd === true;
			var providerOptions = [
				{ value: "ovhcloud", label: "OVHcloud" }
			];
			var head = React.createElement("div", { className: "omni-card-head omni-head-clickable", onClick: props.onToggleCollapse }, [
				React.createElement("div", { className: "omni-card-name" }, [
					React.createElement("span", { className: "omni-card-name-text" }, t("fallbackTitle") || "兜底模型"),
					collapsed ? React.createElement("span", { className: "omni-card-summary" }, cfg.provider + " · " + ((cfg.models && cfg.models.length) || 0) + " 个模型") : null
				]),
				React.createElement("button", {
					className: "omni-icon-btn",
					title: collapsed ? "Expand" : "Collapse",
					onClick: function (e) { e.stopPropagation(); props.onToggleCollapse(); }
				}, React.createElement(SvgIcon, { d: collapsed ? I_EXPAND : I_COLLAPSE }))
			]);
			var body = null;
			if (!collapsed) {
				body = React.createElement("div", { className: "omni-card-body" }, [
					React.createElement("div", { className: "omni-row" }, [
						React.createElement(SelectField, {
							label: t("fallbackProviderLabel") || "供应商",
							value: cfg.provider || "ovhcloud",
							options: providerOptions,
							onChange: function (e) { props.onChangeProvider(e.target.value); }
						}),
						React.createElement(Field, {
							label: t("timeoutLabel"),
							number: true, min: 1000,
							value: String(cfg.timeoutMs || 120000),
							placeholder: "120000",
							onChange: function (e) { props.onPatch("timeoutMs", e.target.value); }
						})
					]),
					React.createElement("div", { className: "omni-field" }, [
						React.createElement("span", { className: "omni-label" }, t("fallbackModelsLabel") || "模型列表（从上到下回退）"),
						React.createElement("div", { className: "omni-row omni-model-fetch-row" }, [
							React.createElement("div", { className: "omni-field omni-grow" }, [
								React.createElement("div", { className: "omni-model-wrap" }, [
									React.createElement("input", {
										className: "omni-input omni-model-input",
										type: "text",
										value: props.fbSearch || "",
										placeholder: "输入关键词搜索模型",
										onChange: function (e) { props.onSearchChange(e.target.value); }
									}),
									modelList.length > 0 ? React.createElement("button", {
										className: "omni-eye-btn", type: "button",
										title: t("ddHint"),
										onClick: function (e) { e.preventDefault(); props.onToggleDd(); }
									}, React.createElement(SvgIcon, { d: isDdOpen ? I_COLLAPSE : I_EXPAND })) : null,
									isDdOpen ? React.createElement("div", { className: "omni-model-dropdown", ref: ddRef },
										(function () {
											var search = String(props.fbSearch || "").toLowerCase();
											var filtered = search ? modelList.filter(function (m) { return String(m).toLowerCase().indexOf(search) >= 0; }) : modelList;
											return filtered.map(function (m) {
												return React.createElement("div", {
													key: m, className: "omni-dd-item" + ((cfg.models || []).indexOf(m) >= 0 ? " active" : ""),
													onClick: function () { props.onPickModel(m); }
												}, m);
											});
										})()
									) : null
								])
							]),
							React.createElement("button", {
								className: "omni-btn",
								disabled: props.busy !== "",
								onClick: props.onFetchModels
							}, props.busy === "fb-mdl" ? t("fetching") : t("fetchBtn")),
							React.createElement("button", {
								className: "omni-btn omni-reset-btn",
								title: t("fallbackReset") || "重置默认",
								onClick: props.onResetModels
							}, React.createElement(SvgFillIcon, { d: I_RESET_SVG }))
						]),
						React.createElement("div", { className: "omni-list-container" },
							(cfg.models || []).length === 0
								? React.createElement("div", { className: "omni-list-empty" }, t("fallbackEmpty"))
								: (cfg.models || []).map(function (m, i) {
							return React.createElement("div", {
								key: "fb-" + i, className: "omni-fb-model-item" + (props.fbDragFrom === i ? " dragging" : "") + (props.fbDropOver === i ? " drop-target" : ""),
								draggable: true,
								onDragStart: function (e) { if (e.dataTransfer) { e.dataTransfer.setData("text/plain", String(i)); e.dataTransfer.effectAllowed = "move"; } props.onDragStart && props.onDragStart(i); },
								onDragOver: function (e) { e.preventDefault(); if (props.fbDragFrom !== null && props.fbDragFrom !== i) props.onDropOver && props.onDropOver(i); },
								onDrop: function (e) { e.preventDefault(); var from = Number(e.dataTransfer.getData("text/plain")); if (!Number.isNaN(from) && from !== i) props.onReorder && props.onReorder(from, i); props.onDragEnd && props.onDragEnd(); },
								onDragEnd: function () { props.onDragEnd && props.onDragEnd(); }
							}, [
								React.createElement("div", { className: "omni-drag-handle", title: t("dragHint") || "拖动调整顺序" }, React.createElement(SvgIcon, { d: I_DRAG })),
								React.createElement("span", { className: "omni-fb-model-id" }, m),
								React.createElement("button", {
									className: "omni-icon-btn omni-del-btn",
									title: t("menuDelete") || "删除",
									onClick: function () { props.onRemoveModel(m); }
								}, React.createElement(SvgIcon, { d: I_TRASH }))
							]);
						}))
					])
				]);
			}
			return React.createElement("div", { className: "omni-card omni-fallback-card" }, [head, body]);
		}

		// ---------- mirror card (v1.9) ----------
		function MirrorCard(props) {
			var t = props.t;
			var cfg = props.cfg || {};
			var collapsed = props.collapsed !== false;
			var allModels = (props.allModels && Array.isArray(props.allModels)) ? props.allModels : [];
			var openDdId = props.openDd; // mapping id or null
			var mappings = (cfg.mappings && Array.isArray(cfg.mappings)) ? cfg.mappings : [];
			var mirrorAllOn = cfg.mirrorAllEnabled === true;

			// summary for collapsed head
			var summary;
			if (mirrorAllOn) summary = t("mirrorSummaryAll");
			else if (mappings.length > 0) summary = mappings.length + " " + t("mirrorMappingsLabel");
			else if (cfg.autoVisionEnabled !== false) summary = "auto-vision";
			else summary = t("mirrorSummaryOff");

			var head = React.createElement("div", { className: "omni-card-head omni-head-clickable", onClick: props.onToggleCollapse }, [
				React.createElement("div", { className: "omni-card-name" }, [
					React.createElement("span", { className: "omni-card-name-text" }, t("mirrorTitle")),
					collapsed ? React.createElement("span", { className: "omni-card-summary" }, summary) : null
				]),
				React.createElement("button", {
					className: "omni-icon-btn",
					title: collapsed ? "Expand" : "Collapse",
					onClick: function (e) { e.stopPropagation(); props.onToggleCollapse(); }
				}, React.createElement(SvgIcon, { d: collapsed ? I_EXPAND : I_COLLAPSE }))
			]);

			var body = null;
			if (!collapsed) {
				// toggle row factory
				function toggleRow(label, hint, checked, onChange) {
					return React.createElement("div", { className: "omni-mirror-toggle-row" }, [
						React.createElement("label", { className: "omni-switch" }, [
							React.createElement("input", { type: "checkbox", checked: checked, onChange: function (e) { onChange(e.target.checked); } }),
							React.createElement("span", { className: "omni-switch-slider" })
						]),
						React.createElement("div", { className: "omni-mirror-toggle-text" }, [
							React.createElement("span", { className: "omni-label" }, label),
							React.createElement("span", { className: "omni-mirror-hint" }, hint)
						])
					]);
				}

				// mapping rows
				var mappingRows = mappings.map(function (m) {
					var isOpen = openDdId === m.id;
					var displayVal = m.originalModel ? (m.originalProvider ? m.originalProvider + " / " + m.originalModel : m.originalModel) : "";
					return React.createElement("div", { key: m.id, className: "omni-mapping-row" }, [
						React.createElement("div", { className: "omni-field omni-grow" }, [
							React.createElement("div", { className: "omni-model-wrap" }, [
								React.createElement("input", {
									className: "omni-input omni-mapping-select",
									type: "text",
									value: displayVal,
									placeholder: t("mirrorOriginalModelPh"),
									readOnly: true,
									onClick: function (e) { e.preventDefault(); props.onToggleDd(m.id); }
								}),
								isOpen ? React.createElement("div", { className: "omni-model-dropdown omni-mapping-dropdown", ref: mappingDdRef },
									allModels.length === 0
										? React.createElement("div", { className: "omni-dd-item omni-dd-loading" }, props.busy === "mirror-mdl" ? t("fetching") : "—")
										: allModels.map(function (group) {
											return React.createElement("div", { key: group.provider, className: "omni-dd-group" }, [
												React.createElement("div", { className: "omni-dd-group-title" }, group.providerName || group.provider),
												group.models.map(function (model) {
													return React.createElement("div", {
														key: group.provider + "/" + model.id,
														className: "omni-dd-item" + (m.originalModel === model.id && m.originalProvider === group.provider ? " active" : ""),
														onClick: function () { props.onSelectModel(m.id, group.provider, model.id); }
													}, model.name || model.id);
												})
											]);
										})
								) : null
							])
						]),
						React.createElement("input", {
							className: "omni-input omni-mapping-input",
							type: "text",
							value: m.mirrorName || "",
							placeholder: t("mirrorMirrorNamePh"),
							onChange: function (e) { props.onUpdateName(m.id, e.target.value); }
						}),
						React.createElement("button", {
							className: "omni-icon-btn omni-del-btn",
							title: t("menuDelete") || "删除",
							onClick: function () { props.onRemoveMapping(m.id); }
						}, React.createElement(SvgIcon, { d: I_TRASH }))
					]);
				});

				body = React.createElement("div", { className: "omni-card-body" }, [
					React.createElement("div", { className: "omni-mirror-toggle-pair" }, [
						React.createElement("div", { className: "omni-mirror-toggle-row" }, [
							React.createElement("label", { className: "omni-switch" }, [
								React.createElement("input", { type: "checkbox", checked: cfg.autoVisionEnabled !== false, onChange: function (e) { props.onPatch("autoVisionEnabled", e.target.checked); } }),
								React.createElement("span", { className: "omni-switch-slider" })
							]),
							React.createElement("span", { className: "omni-label" }, t("mirrorAutoVisionLabel"))
						]),
						React.createElement("div", { className: "omni-mirror-toggle-row" }, [
							React.createElement("label", { className: "omni-switch" }, [
								React.createElement("input", { type: "checkbox", checked: cfg.mirrorAllEnabled === true, onChange: function (e) { props.onPatch("mirrorAllEnabled", e.target.checked); } }),
								React.createElement("span", { className: "omni-switch-slider" })
							]),
							React.createElement("span", { className: "omni-label" }, t("mirrorAllLabel"))
						])
					]),
					React.createElement("div", { className: "omni-mirror-divider" }),
					React.createElement("div", { className: "omni-field" + (mirrorAllOn ? " omni-mirror-disabled" : "") }, [
						React.createElement("div", { className: "omni-mirror-mappings-header" }, [
							React.createElement("span", { className: "omni-label" }, t("mirrorMappingsLabel")),
							!mirrorAllOn ? React.createElement("button", {
								className: "omni-btn omni-add-btn",
								disabled: props.busy !== "",
								onClick: props.onAddMapping
							}, t("mirrorAddMapping")) : null
						]),
						mirrorAllOn
							? React.createElement("p", { className: "omni-mirror-disabled-msg" }, t("mirrorMappingsDisabled"))
							: React.createElement("div", { className: "omni-list-container omni-mapping-list" },
								mappingRows.length > 0 ? mappingRows : React.createElement("p", { className: "omni-msg" }, t("mirrorMappingEmpty"))
							)
					])
				]);
			}
			return React.createElement("div", { className: "omni-card omni-mirror-card" }, [head, body]);
		}

		// ---------- AddVideoCardModal (v2.11) ----------
	function AddVideoCardModal(props) {
		var t = props.t;
		var BUILTIN_TYPES = [
			{ value: "general", label: t("videoCardTypeGeneral") },
			{ value: "t2v", label: t("videoCardTypeT2v") },
			{ value: "i2v", label: t("videoCardTypeI2v") },
			{ value: "edit", label: t("videoCardTypeEdit") },
			{ value: "ref", label: t("videoCardTypeRef") }
		];
		var isEdit = !!props.editCard;
		var nameDraft = React.useState(isEdit ? (props.editCard.name || "") : "");
		var typeDraft = React.useState(isEdit ? (props.editCard.type || "") : "");
		var toolNameDraft = React.useState(isEdit ? (props.editCard.toolName || "generate_video") : "generate_video");
		var descDraft = React.useState(isEdit ? (props.editCard.description || "") : "");
		var typeDdOpen = React.useState(false);
		// v2.12.2: 自定义类型快照 = {name, toolName, description}（兼容旧字符串条目），与配置预设同语义
		var ctList = (Array.isArray(props.customTypes) ? props.customTypes : []).map(function (c) {
			if (typeof c === "string") return { name: c, toolName: "", description: "" };
			return (c && typeof c === "object") ? { name: String(c.name || ""), toolName: String(c.toolName || ""), description: String(c.description || "") } : null;
		}).filter(function (c) { return c && c.name; });

		// Track initial values for edit mode (to detect changes)
		var initialValues = React.useState(isEdit ? { name: props.editCard.name || "", type: props.editCard.type || "", toolName: props.editCard.toolName || "generate_video", description: props.editCard.description || "" } : {});

		var existingTypes = (props.cards || []).filter(function (c) { return !isEdit || c.id !== props.editCard.id; }).map(function (c) { return c.type; });
		var atMax = (props.cards || []).length >= 10;
		var selectedType = typeDraft[0];
		var isBuiltin = BUILTIN_TYPES.some(function (bt) { return bt.value === selectedType; });
		var isCustomType = ctList.some(function (ct) { return ct.name === selectedType; });
		var typeExists = selectedType && existingTypes.indexOf(selectedType) >= 0;
		var toolNameTaken = (props.cards || []).filter(function (c) { return !isEdit || c.id !== props.editCard.id; }).some(function (c) { return c.toolName === toolNameDraft[0]; });
		var hasChanges = !isEdit || nameDraft[0] !== initialValues[0].name || typeDraft[0] !== initialValues[0].type || toolNameDraft[0] !== initialValues[0].toolName || descDraft[0] !== initialValues[0].description;
		// 硬性要求：仅模型名称 / 工具名称 必填；模型类型 / 模型定义均可留空（后端回落 general / 空描述）
		var canConfirm = !atMax && nameDraft[0].trim().length > 0 && toolNameDraft[0].trim().length > 0 && !typeExists && !toolNameTaken && (isEdit ? hasChanges : true);
		// 类型保存按键：输入框为空或为内置类型时禁用（仅自定义类型可保存到类型快照）
		var canSaveType = selectedType.trim().length > 0 && !isBuiltin;

		function onSelectType(typeVal) {
			typeDraft[1](typeVal);
			var bt = BUILTIN_TYPES.find(function (b) { return b.value === typeVal; });
			if (bt) {
				// Built-in type: auto-fill tool name + description, set fields to read-only (disabled)
				if (typeVal === "general") { toolNameDraft[1]("generate_video"); descDraft[1]("生成视频：根据描述生成视频并保存。"); }
				else { toolNameDraft[1]("generate_video_" + typeVal); var tmpl = typeVal === "t2v" ? "文生视频：根据文字描述生成视频并保存。仅接受文字提示词，不支持图片输入。"
					: typeVal === "i2v" ? "图生视频：根据输入图片和文字描述生成视频并保存。需要图片输入。"
					: typeVal === "edit" ? "视频编辑：对输入视频/图片进行编辑生成新视频并保存。"
					: typeVal === "ref" ? "参考生成：根据参考素材（图片/视频）生成视频并保存。"
					: "生成视频：根据描述生成视频并保存。"; descDraft[1](tmpl); }
			} else {
				// v2.12.2: 自定义类型 —— 从快照回填已保存的工具名/定义（仅回填非空字段）
				var ct = ctList.find(function (x) { return x.name === typeVal; });
				if (ct) { if (ct.toolName) toolNameDraft[1](ct.toolName); if (ct.description) descDraft[1](ct.description); }
			}
			typeDdOpen[1](false);
		}

		function addCustomType() {
			// v2.12.2: 无条件新建「自定义 N」（空配置）入菜单（与配置预设"新预设 N"同语义），持久化并选中
			var mx = 0;
			ctList.forEach(function (ct) { var m = /^自定义(?:\s(\d+))?$/.exec(ct.name); if (m) mx = Math.max(mx, m[1] ? Number(m[1]) : 1); });
			var nm = "自定义 " + (mx + 1);
			if (props.onAddCustomType) props.onAddCustomType({ name: nm, toolName: "", description: "" });
			typeDraft[1](nm);
		}

		function saveCustomType() {
			// v2.12.2: 把当前 类型名+工具名+定义 upsert 进类型快照（仅保存，不代表应用；确认键始终应用）
			var nm = typeDraft[0].trim();
			if (!nm || isBuiltin) return;
			if (props.onAddCustomType) props.onAddCustomType({ name: nm, toolName: toolNameDraft[0].trim(), description: descDraft[0] });
		}

		function deleteCustomType(name) {
			if (props.onDeleteCustomType) props.onDeleteCustomType(name);
			if (typeDraft[0] === name) typeDraft[1]("");
		}

		var allTypes = BUILTIN_TYPES.concat(ctList.map(function (ct) { return { value: ct.name, label: ct.name, custom: true }; }));

		var dragStartedOnOverlay = React.useState(false);

		return React.createElement("div", { className: "omni-confirm-overlay", onMouseDown: function(e) { dragStartedOnOverlay[1](e.target === e.currentTarget); }, onClick: function(e) { if (dragStartedOnOverlay[0] && e.target === e.currentTarget) props.onCancel(); } }, [
		React.createElement("div", { className: "omni-card-modal", onClick: function (e) { e.stopPropagation(); var tg = e.target; if (typeDdOpen[0] && !(tg && tg.closest && tg.closest(".omni-preset-bar"))) typeDdOpen[1](false); } }, [
				React.createElement("span", { className: "omni-confirm-title" }, isEdit ? t("videoCardEditTitle") : t("videoCardModalTitle")),
				React.createElement("div", { className: "omni-card-modal-field" }, [
					React.createElement("label", null, t("videoCardModelName")),
					React.createElement("input", { className: "omni-input", type: "text", value: nameDraft[0], placeholder: "Video Model", onChange: function (e) { nameDraft[1](e.target.value); }, autoFocus: true })
				]),
				React.createElement("div", { className: "omni-card-modal-field" }, [
					React.createElement("label", null, t("videoCardModelType")),
					React.createElement("div", { className: "omni-preset-bar", style: { marginBottom: 0 } }, [
						React.createElement("div", { className: "omni-preset-input-wrap" }, [
							React.createElement("input", { className: "omni-input omni-preset-name-input", type: "text", value: typeDraft[0], placeholder: t("videoCardTypeCustom"), onChange: function (e) { typeDraft[1](e.target.value); } }),
							React.createElement("button", { className: "omni-preset-dd-btn", type: "button", onClick: function () { typeDdOpen[1](!typeDdOpen[0]); } }, React.createElement(SvgIcon, { d: typeDdOpen[0] ? I_COLLAPSE : I_EXPAND })),
							typeDdOpen[0] ? React.createElement("div", { className: "omni-preset-menu", ref: menuDdRef }, allTypes.map(function (tp) {
								var used = existingTypes.indexOf(tp.value) >= 0;
								return React.createElement("div", { key: tp.value, className: "omni-preset-menu-item" + (tp.value === selectedType ? " active" : "") + (used ? " omni-menu-disabled" : ""), onClick: function () { if (!used) onSelectType(tp.value); } }, tp.label + (used ? " ✓" : ""));
							})) : null
						]),
					React.createElement("button", {
						className: "omni-btn omni-save-btn", type: "button",
						title: t("presetSaved"),
						disabled: !canSaveType,
						onClick: saveCustomType
					}, React.createElement(SvgFillIcon, { d: I_SAVE_FLOPPY })),
					React.createElement("button", { className: "omni-btn omni-preset-new-btn", type: "button", title: t("videoCardAddType"), onClick: addCustomType }, React.createElement(SvgIcon, { d: I_PLUS })),
					React.createElement("button", { className: "omni-btn omni-preset-del-btn omni-del-btn", type: "button", title: t("videoCardDeleteType"), disabled: isBuiltin || !isCustomType, onClick: function () { if (isCustomType) deleteCustomType(selectedType); } }, React.createElement(SvgIcon, { d: I_TRASH }))
					])
				]),
				React.createElement("div", { className: "omni-card-modal-field" }, [
					React.createElement("label", null, t("videoCardToolName")),
					React.createElement("input", { className: "omni-input", type: "text", value: toolNameDraft[0], readOnly: isBuiltin, onChange: function (e) { toolNameDraft[1](e.target.value); } })
				]),
				React.createElement("div", { className: "omni-card-modal-field" }, [
					React.createElement("label", null, t("videoCardModelDef")),
					React.createElement("textarea", { className: "omni-input", rows: 3, value: descDraft[0], readOnly: isBuiltin && !isEdit, onChange: function (e) { descDraft[1](e.target.value); } })
				]),
				atMax ? React.createElement("p", { className: "omni-msg omni-menu-danger" }, t("videoCardMaxCards")) : null,
				typeExists ? React.createElement("p", { className: "omni-msg omni-menu-danger" }, t("videoCardTypeExists")) : null,
				toolNameTaken ? React.createElement("p", { className: "omni-msg omni-menu-danger" }, t("videoCardToolNameTaken")) : null,
				React.createElement("div", { className: "omni-confirm-btns" }, [
					React.createElement("button", { className: "omni-btn", onClick: props.onCancel }, t("videoCardCancel")),
					React.createElement("button", { className: "omni-btn omni-confirm-danger", disabled: !canConfirm, onClick: function () { props.onConfirm({ name: nameDraft[0].trim(), type: typeDraft[0].trim(), toolName: toolNameDraft[0].trim(), description: descDraft[0].trim() }); } }, t("videoCardConfirm"))
				])
			])
		]);
	}

		// ---------- video generation panel (v2.8) ----------
		// Mirrors ImggenPanel but slimmer: single config, async-task fields,
		// provider-grouped dropdown (General / Overseas / China). No presets.
		function VideoPanel(props) {
			var t = props.t;
			var card = props.card || {};
			var cfg = card.config || props.cfg || {};
			var meta = VIDEO_PROVIDERS_UI[cfg.provider] || {};
			var isFixed = !!meta.fixed;
			var isFixedProtocol = !!meta.fixedProtocol;
			var isAsync = cfg.protocol === "async-task";
			var isCustomAdapter = cfg.protocol === "custom-adapter";
			var keyDraftValue = props.keyDraft || "";
			var isRevealed = !!props.revealed;
			var isDdOpen = !!props.openDd;
			var provOpen = !!props.openProv;
			var modelList = Array.isArray(props.modelList) ? props.modelList : [];
			var busy = props.busy;
			var menuOpen = React.useState(false);
		var presetNameDraft = React.useState(props.activePresetName || "");
		React.useEffect(function () { presetNameDraft[1](props.activePresetName || ""); }, [props.activePresetName]);
	// v2.12.3: 只有白名单内的配置字段算「未保存的修改」（收纳/展开、仅显示视频模型开关等均不算）
	var VIDEO_DIRTY_KEYS = ["provider", "timeoutMs", "endpoint", "apiKeySet", "model", "pollIntervalMs", "retryCount", "seconds", "aspectRatio"];
	function dirtyCfg(cf) { var o = {}; for (var i = 0; i < VIDEO_DIRTY_KEYS.length; i++) o[VIDEO_DIRTY_KEYS[i]] = (cf || {})[VIDEO_DIRTY_KEYS[i]]; return o; }
	// v2.12.4: 基线存在组件外 —— 切 Tab 回来仍然是脏的；改回原值则不脏。
	// 基线名用「加载后的权威名」(props.activePresetName)，避免 editable 草稿名异步追平首帧的瞬时脏。
	var vcbBaseKey = dirtyKey("video", card.id + "|" + (props.activePresetId || ""));
	// v2.12.5: 基线取自预设快照（videoPresets[activePreset].config）而非 card.config，
	// 因为 card.config 已被 queueSave 自动落盘——重启后基线=已保存配置→脏标志丢失。
	// 预设快照仅在「保存预设」时更新，所以重启后仍能正确反映未保存的修改。
	var vcbPreset = (Array.isArray(props.presets) ? props.presets : []).find(function (p) { return p.id === props.activePresetId; });
	var vcbBaseline = baselineFor(vcbBaseKey, dirtyJson({ name: props.activePresetName || "", cfg: dirtyCfg((vcbPreset || {}).config || {}) }));
	var vcbCur = dirtyJson({ name: presetNameDraft[0], cfg: dirtyCfg(cfg) });
	var vcDirty = vcbCur !== vcbBaseline;
		var isCardEnabled = card.enabled !== false;
			var cardCollapsed = card.collapsed === true;
			var VIDEO_TYPE_LABELS = { general: t("videoCardTypeGeneral"), t2v: t("videoCardTypeT2v"), i2v: t("videoCardTypeI2v"), edit: t("videoCardTypeEdit"), ref: t("videoCardTypeRef") };

			// close the reset menu on outside click (also clears the armed confirm state)
			React.useEffect(function () {
				if (!menuOpen[0]) return;
				function close(e) {
					var tgt = e.target;
					if (!tgt || !tgt.closest || !tgt.closest(".omni-card-menu-wrap")) {
						menuOpen[1](false);
						if (props.onCloseMenu) props.onCloseMenu();
					}
				}
				document.addEventListener("click", close);
				return function () { document.removeEventListener("click", close); };
			}, [menuOpen[0]]);

			// close the preset dropdown on outside click (blank-space click closes it)
			React.useEffect(function () {
				if (!props.presetDdOpen) return;
				function close(e) {
					var tgt = e.target;
					if (!tgt || !tgt.closest || !tgt.closest(".omni-preset-bar")) {
						props.onTogglePresetDd();
					}
				}
				document.addEventListener("click", close);
				return function () { document.removeEventListener("click", close); };
			}, [props.presetDdOpen]);

			var providerGroups = [
				{ label: t("videoGroupGeneral"), options: [{ value: "custom", label: t("videoProviderCustom") }] },
				{ label: t("videoGroupBuiltin"), options: ["qwen-token-plan", "qwen-token-plan-cn", "agnes", "agnes-cn", "dashscope", "kling", "volc", "minimax"].map(function (p) { return { value: p, label: videoProviderDisplay(p, t) }; }) }
			];
			var protocolOptions = VIDEO_PROTOCOL_OPTIONS_UI.map(function (o) {
				var label = o.value === "openai-videos" ? t("videoProtocolOpenai")
					: o.value === "dashscope-video" ? t("videoProtocolDashscope")
					: o.value === "kling-video" ? t("videoProtocolKling")
					: o.value === "volc-video" ? t("videoProtocolVolc")
					: o.value === "minimax-video" ? t("videoProtocolMinimax")
					: o.value === "custom-adapter" ? t("videoProtocolCustomAdapter")
					: t("videoProtocolAsync");
				return { value: o.value, label: label };
			});
			var aspectOptions = [
				{ value: "16:9", label: "16:9" }, { value: "9:16", label: "9:16" },
				{ value: "1:1", label: "1:1" }, { value: "4:3", label: "4:3" }, { value: "3:4", label: "3:4" }
			];

			var head = React.createElement("div", { className: "omni-card-head omni-head-clickable" + (!isCardEnabled ? " omni-card-disabled" : ""), onClick: function () { props.onPatch("collapsed", !cardCollapsed); } }, [
				// v2.11.1: AI badge at the far left of the header, left of type label
				card.source === "ai" ? React.createElement("span", { className: "omni-ai-badge", title: "由 AI 通过 /build-video-tool 创建" }, t("videoAiBadge")) : null,
				React.createElement("span", { className: "omni-video-type-label" }, VIDEO_TYPE_LABELS[card.type] || card.type || t("videoCardTypeGeneral")),
			React.createElement("div", { className: "omni-card-name" }, [
				React.createElement("span", { className: "omni-card-name-text" }, card.name || "Video Card")
			]),
				React.createElement("button", { className: "omni-icon-btn", title: t("videoCardEditTitle"), onClick: function (e) { e.stopPropagation(); if (props.onEditClick) props.onEditClick(card); } }, React.createElement(SvgIcon, { d: I_EDIT })),
				React.createElement("div", { className: "omni-card-menu-wrap" }, [
					React.createElement("button", {
						className: "omni-icon-btn omni-card-menu-btn",
						onClick: function (e) { e.stopPropagation(); menuOpen[1](!menuOpen[0]); }
					}, React.createElement(SvgIcon, { d: I_MENU })),
					menuOpen[0] ? React.createElement("div", { className: "omni-card-menu", ref: menuDdRef }, [
						React.createElement("div", {
							className: "omni-menu-item omni-menu-danger" + (props.confirmDel ? " omni-menu-confirm" : ""),
							onClick: function (e) { e.stopPropagation(); if (props.onDeleteClick) props.onDeleteClick(card.id); }
						}, React.createElement(SvgIcon, { d: I_TRASH }), React.createElement("span", null, props.confirmDel ? t("confirmDelete") : t("menuDelete"))),
						React.createElement("div", {
							className: "omni-menu-item omni-menu-danger" + (props.confirmReset ? " omni-menu-confirm" : ""),
							title: t("videoResetHint"),
							onClick: function (e) { e.stopPropagation(); var wasArmed = !!props.confirmReset; props.onResetClick(); if (wasArmed) menuOpen[1](false); }
						}, React.createElement(SvgIcon, { d: I_TRASH }), React.createElement("span", null, props.confirmReset ? t("videoResetConfirm") : t("videoReset")))
					]) : null
				]),
				React.createElement("label", { className: "omni-switch omni-switch-sm omni-card-enable", title: isCardEnabled ? "已启用" : "已禁用", onClick: function (e) { e.stopPropagation(); } }, [
					React.createElement("input", { type: "checkbox", checked: isCardEnabled, onChange: function () { props.onPatch("enabled", !isCardEnabled); } }),
					React.createElement("span", { className: "omni-switch-slider" })
				]),
				React.createElement("button", { className: "omni-icon-btn", title: cardCollapsed ? "Expand" : "Collapse", onClick: function (e) { e.stopPropagation(); props.onPatch("collapsed", !cardCollapsed); } }, React.createElement(SvgIcon, { d: cardCollapsed ? I_EXPAND : I_COLLAPSE }))
			]);

			var presets = Array.isArray(props.presets) ? props.presets : [];
			var presetBar = React.createElement("div", { className: "omni-preset-bar" }, [
				React.createElement("div", { className: "omni-preset-input-wrap" }, [
					React.createElement("input", {
						className: "omni-input omni-preset-name-input",
						type: "text",
						value: presetNameDraft[0],
						placeholder: t("presetNamePh"),
						onChange: function (e) { presetNameDraft[1](e.target.value); }
					}),
					React.createElement("button", {
						className: "omni-preset-dd-btn", type: "button",
						onClick: props.onTogglePresetDd
					}, React.createElement(SvgIcon, { d: props.presetDdOpen ? I_COLLAPSE : I_EXPAND })),
					props.presetDdOpen ? React.createElement("div", { className: "omni-preset-menu", ref: menuDdRef },
						presets.map(function (p) {
							return React.createElement("div", {
								key: p.id, className: "omni-preset-menu-item" + (p.id === props.activePresetId ? " active" : ""),
								onClick: function () { props.onSwitchPreset(p.id); }
							}, p.name);
						})
					) : null
				]),
		React.createElement("button", {
			className: "omni-btn omni-save-btn", type: "button",
			title: t("presetSaved"),
			disabled: !vcDirty,
			onClick: function () { if (presetNameDraft[0] !== (props.activePresetName || "")) props.onRenamePreset(presetNameDraft[0]); props.onSavePreset(); setBaseline(vcbBaseKey, vcbCur); }
		}, React.createElement(SvgFillIcon, { d: I_SAVE_FLOPPY })),
			React.createElement("button", {
				className: "omni-btn omni-preset-new-btn", type: "button",
				title: t("presetNew"),
				onClick: props.onAddPreset
			}, React.createElement(SvgIcon, { d: I_PLUS })),
				React.createElement("button", {
					className: "omni-btn omni-preset-del-btn omni-del-btn", type: "button",
					title: presets.length <= 1 ? t("presetDeleteDisabled") : t("presetDelete"),
					disabled: presets.length <= 1,
					onClick: props.onConfirmDeletePreset
				}, React.createElement(SvgIcon, { d: I_TRASH }))
			]);
			var confirmModal = props.presetDeleteConfirm ? React.createElement("div", { className: "omni-confirm-overlay", onClick: props.onCancelDeletePreset }, [
				React.createElement("div", { className: "omni-confirm-modal", onClick: function (e) { e.stopPropagation(); } }, [
					React.createElement("span", { className: "omni-confirm-title" }, t("presetDeleteTitle")),
					React.createElement("p", { className: "omni-confirm-msg" }, t("presetDeleteMsg")),
					React.createElement("div", { className: "omni-confirm-btns" }, [
						React.createElement("button", { className: "omni-btn", onClick: props.onCancelDeletePreset }, t("presetDeleteCancel")),
						React.createElement("button", { className: "omni-btn omni-confirm-danger", onClick: props.onConfirmDelete }, t("presetDeleteConfirm"))
					])
				])
			]) : null;

			var body = React.createElement("div", { className: "omni-card-body" }, [
				// 1. 双列：供应商（下拉）｜超时 (ms)
				React.createElement("div", { className: "omni-row" }, [
					React.createElement("div", { className: "omni-field omni-grow" }, [
						React.createElement("span", { className: "omni-label" }, t("videoProviderLabel")),
						React.createElement("div", { className: "omni-provider-wrap" }, [
							React.createElement("button", {
								className: "omni-input omni-provider-btn", type: "button",
								onClick: function () { props.onToggleProv(); }
							}, [
								React.createElement("span", { className: "omni-provider-label" }, videoProviderDisplay(cfg.provider, t)),
								React.createElement("span", { className: "omni-provider-arrow" }, provOpen ? "▴" : "▾")
							]),
							provOpen ? React.createElement("div", { className: "omni-provider-dropdown", ref: provDdRef }, providerGroups.map(function (g) {
								return [React.createElement("div", { key: "g-" + g.label, className: "omni-dd-group" }, g.label)].concat(g.options.map(function (o) {
									return React.createElement("div", {
										key: o.value, className: "omni-dd-item" + (o.value === cfg.provider ? " active" : ""),
										onClick: function () { props.onPickProvider(o.value); }
									}, o.label);
								}));
							})) : null
						])
					]),
					isFixedProtocol ? null : React.createElement(SelectField, {
						label: t("videoProtocolLabel"),
						value: cfg.protocol,
						options: protocolOptions,
						onChange: function (e) { props.onPatch("protocol", e.target.value); }
					}),
					React.createElement(Field, {
						label: t("videoTimeoutLabel"), number: true, min: 60000,
						value: String(cfg.timeoutMs != null ? cfg.timeoutMs : 600000),
						placeholder: "600000",
						onChange: function (e) { props.onPatch("timeoutMs", e.target.value); }
					})
				]),
				// 2. 内置端点小字 / 自定义端点输入
				isFixed
					? React.createElement("p", { className: "omni-fixed-url" }, t("fixedUrlLabel") + ": " + meta.endpoint)
					: React.createElement(Field, {
						label: t("videoEndpointLabel"),
						value: cfg.endpoint || "",
						placeholder: cfg.provider === "dashscope" ? "https://dashscope.aliyuncs.com" : "https://relay.example.com/v1",
						onChange: function (e) { props.onPatch("endpoint", e.target.value); }
					}),
				// 3. 整行 API Key（眼睛内嵌）
				React.createElement("div", { className: "omni-row" }, [
					React.createElement("div", { className: "omni-field omni-grow" }, [
						React.createElement("span", { className: "omni-label" }, t("videoKeyLabel")),
						React.createElement("div", { className: "omni-key-wrap" }, [
							React.createElement("input", {
								className: "omni-input omni-key-input",
								type: isRevealed ? "text" : "password",
								value: keyDraftValue,
								placeholder: cfg.apiKeySet ? t("apiKeySet") : "sk-...",
								onChange: function (e) { props.onSaveKey(e.target.value); }
							}),
							React.createElement("button", { className: "omni-eye-btn", type: "button", onClick: props.onToggleReveal },
								React.createElement(SvgIcon, { d: isRevealed ? I_EYE_OFF : I_EYE }))
						])
					])
				]),
				// 4. 整行模型：输入框 + ▾ 指示图标 + 获取按钮同行
				React.createElement("div", { className: "omni-row omni-model-fetch-row" }, [
					React.createElement("div", { className: "omni-field omni-grow" }, [
						React.createElement("span", { className: "omni-label" }, t("videoModelLabel")),
						React.createElement("div", { className: "omni-model-wrap" }, [
							React.createElement("input", {
								className: "omni-input omni-model-input",
								type: "text", value: cfg.model || "",
								placeholder: "agnes-video-v2.0 / wan2.7-i2v",
								onChange: function (e) { props.onPatch("model", e.target.value); }
							}),
							React.createElement("button", {
								className: "omni-eye-btn", type: "button",
								title: t("ddHint"),
								onClick: function (e) { e.preventDefault(); props.onToggleDd(); }
							}, React.createElement(SvgIcon, { d: isDdOpen ? I_COLLAPSE : I_EXPAND })),
							isDdOpen && modelList.length > 0 ? React.createElement("div", { className: "omni-model-dropdown", ref: ddRef }, modelList.map(function (m) {
								return React.createElement("div", {
									key: m, className: "omni-dd-item" + (m === cfg.model ? " active" : ""),
									onClick: function () { props.onPickModel(m); }
								}, m);
							})) : null
						])
					]),
					// v2.12: right column — toggle (top) + fetch button (bottom), shared right edge
					React.createElement("div", { className: "omni-model-right-col" }, [
						React.createElement("div", { className: "omni-filter-inline" }, [
							React.createElement("span", { className: "omni-filter-label" }, t("videoFilterLabel")),
							React.createElement("label", { className: "omni-switch omni-switch-sm" }, [
								React.createElement("input", { type: "checkbox", checked: cfg.filterVideoModels !== false, onChange: props.onToggleFilter }),
								React.createElement("span", { className: "omni-switch-slider" })
							])
						]),
						React.createElement("button", {
							className: "omni-btn",
							disabled: busy !== "",
							onClick: props.onFetchModels
						}, busy === "video-mdl" ? t("videoFetching") : t("videoFetchBtn"))
					])
				]),
				cfg.provider === "kling" ? React.createElement("p", { className: "omni-status" }, t("videoKeyKlingHint")) : null,
				// 6. 单行四字段：轮询间隔 (s)｜重试次数｜默认时长 (s)｜画幅
				//（分辨率已移除 UI：由 AI 通过 generate_video 的 resolution 参数自行决定）
				React.createElement("div", { className: "omni-row" }, [
					React.createElement(Field, { label: t("videoPollIntervalLabel"), number: true, min: 1, value: String(cfg.pollIntervalMs != null ? cfg.pollIntervalMs / 1000 : 5), placeholder: "5", onChange: function (e) { props.onPatch("pollIntervalMs", Number(e.target.value) * 1000); } }),
					React.createElement(Field, { label: t("videoRetryLabel"), number: true, min: 1, value: String(cfg.retryCount != null ? cfg.retryCount : 1), placeholder: "1", onChange: function (e) { props.onPatch("retryCount", e.target.value); } }),
					React.createElement(Field, { label: t("videoSecondsLabel"), number: true, min: 1, max: 30, value: String(cfg.seconds != null ? cfg.seconds : 5), placeholder: "5", onChange: function (e) { props.onPatch("seconds", e.target.value); } }),
					React.createElement(SelectField, {
						label: t("videoAspectLabel"), value: cfg.aspectRatio || "16:9",
						options: aspectOptions,
						onChange: function (e) { props.onPatch("aspectRatio", e.target.value); }
					})
				]),
				// async-task 专属字段（双列）
				isAsync ? React.createElement("div", { className: "omni-row" }, [
					React.createElement(Field, { label: t("videoSubmitPathLabel"), value: cfg.submitPath || "/videos", placeholder: "/api/v1/generations", onChange: function (e) { props.onPatch("submitPath", e.target.value); } }),
					React.createElement(Field, { label: t("videoPollPathLabel"), value: cfg.pollPath || "/videos", placeholder: "/tasks/{id}", onChange: function (e) { props.onPatch("pollPath", e.target.value); } })
				]) : null,
				isAsync ? React.createElement("div", { className: "omni-row" }, [
					React.createElement(Field, { label: t("videoTaskIdFieldLabel"), value: cfg.taskIdField || "", placeholder: "data.task_id", onChange: function (e) { props.onPatch("taskIdField", e.target.value); } }),
					React.createElement(Field, { label: t("videoStatusFieldLabel"), value: cfg.statusField || "status", placeholder: "status", onChange: function (e) { props.onPatch("statusField", e.target.value); } })
				]) : null,
				isAsync ? React.createElement("div", { className: "omni-row" }, [
					React.createElement(Field, { label: t("videoResultFieldLabel"), value: cfg.resultField || "metadata.url", placeholder: "data.url", onChange: function (e) { props.onPatch("resultField", e.target.value); } }),
					React.createElement(Field, { label: t("videoDoneStatusLabel"), value: cfg.doneStatus || "completed", placeholder: "completed", onChange: function (e) { props.onPatch("doneStatus", e.target.value); } })
				]) : null,
				isAsync ? React.createElement("p", { className: "omni-status" }, t("videoAsyncHint")) : null,
				// custom-adapter: adapterCode editor (AI-authored submit/poll contract)
				isCustomAdapter ? React.createElement("div", { className: "omni-field", style: { display: "flex", flexDirection: "column", gap: "4px" } }, [
					React.createElement("span", { className: "omni-label" }, t("videoAdapterCodeLabel")),
					React.createElement("textarea", {
						className: "omni-input",
						style: { width: "100%", minHeight: "120px", fontFamily: "ui-monospace, Consolas, monospace", fontSize: "12px", resize: "vertical" },
						value: cfg.adapterCode || "",
						placeholder: "{ buildSubmit(ctx){...}, parseTaskId(res){...}, pollUrl(ctx){...}, parseStatus(res){...} }",
						onChange: function (e) { props.onPatch("adapterCode", e.target.value); }
					}),
					React.createElement("p", { className: "omni-status" }, t("videoAdapterHint"))
				]) : null,
				// 底部状态行（多段 · 分隔）
				React.createElement("p", { className: "omni-status" },
				t("videoStatusPrefix") + " · " + (props.visible ? t("videoToolOn") : t("videoToolHidden")) +
						(props.modelCount != null ? " · " + t("fetchOkPrefix") + props.modelCount + t("fetchOkSuffix") : ""))
				]);
			// v2.11.1: AI cards hide the shared-preset bar (custom adapter config
			// must not be overwritten by preset snapshots).
			var showPreset = card.source !== "ai";
				return React.createElement("div", { className: "omni-card" + (!isCardEnabled ? " omni-card-disabled" : "") }, [head, (!cardCollapsed && showPreset) ? presetBar : null, (!cardCollapsed && showPreset) ? React.createElement("div", { className: "omni-preset-divider" }) : null, !cardCollapsed ? body : null, confirmModal]);
			}

		// v2.9.2: 参考音频 row — input(modifiable name) + indicator(dropdown) + 上传 + 删除
		// reuses preset-bar CSS (.omni-preset-bar/.omni-preset-input-wrap/.omni-preset-dd-btn/.omni-preset-menu)
		function RefAudioRow(props) {
			var t = props.t;
			var lib = Array.isArray(props.library) ? props.library : [];
			var selected = lib.find(function (e) { return e && e.path === props.selectedPath; }) || null;
			var selectedName = selected ? selected.name : "";
			var selDraft = React.useState(selectedName);
			React.useEffect(function () { selDraft[1](selectedName); }, [selectedName]);
			var busy = props.uploadBusy === true;
			var bar = React.createElement("div", { className: "omni-preset-bar omni-ref-audio-bar" }, [
				React.createElement("div", { className: "omni-preset-input-wrap" }, [
					React.createElement("input", {
						className: "omni-input omni-preset-name-input", type: "text",
						value: selDraft[0], placeholder: t("voiceRefAudioEmpty"), readOnly: busy,
						onChange: function (e) { selDraft[1](e.target.value); },
						onBlur: function (e) {
							var v = String(e.target.value || "").trim();
							if (selected && v && v !== selected.name) { props.onRename(selected.name, v); }
							else { selDraft[1](selectedName); }
						}
					}),
					React.createElement("button", {
						className: "omni-preset-dd-btn", type: "button",
						onClick: props.onToggleDd
					}, React.createElement(SvgIcon, { d: props.ddOpen ? I_COLLAPSE : I_EXPAND })),
					props.ddOpen ? React.createElement("div", { className: "omni-preset-menu" },
						lib.length > 0 ? lib.map(function (e) {
							return React.createElement("div", {
								key: e.id || e.name, className: "omni-preset-menu-item" + (e.path === props.selectedPath ? " active" : ""),
								onClick: function () { props.onPick(e); }
							}, e.name);
						}) : [React.createElement("div", { key: "empty", className: "omni-preset-menu-item", style: { opacity: 0.6, cursor: "default" } }, t("voiceRefAudioEmpty"))]
					) : null
				]),
				React.createElement("button", {
					className: "omni-btn", type: "button", title: t("voiceUpload"), disabled: busy,
					onClick: props.onTriggerUpload
				}, React.createElement(SvgIcon, { d: I_PLUS })),
				React.createElement("button", {
					className: "omni-btn omni-del-btn", type: "button", title: t("voiceRefAudioDelete"),
					disabled: !selectedName || busy,
					onClick: function () { if (selectedName) props.onRequestDelete(selectedName); }
				}, React.createElement(SvgIcon, { d: I_TRASH }))
			]);
			var nameModal = props.uploadPending ? React.createElement("div", { className: "omni-confirm-overlay", onClick: props.onCancelUpload }, [
				React.createElement("div", { className: "omni-confirm-modal", onClick: function (e) { e.stopPropagation(); } }, [
					React.createElement("span", { className: "omni-confirm-title" }, t("voiceRefAudioNameTitle")),
					React.createElement("p", { className: "omni-confirm-msg" }, t("voiceRefAudioNameMsg")),
					React.createElement("input", {
						className: "omni-input", type: "text",
						value: props.nameDraft || "", placeholder: t("voiceRefAudioNamePh"),
						onChange: function (e) { props.onNameDraft(e.target.value); },
						onKeyDown: function (e) { if (e.key === "Enter") props.onConfirmUpload(); else if (e.key === "Escape") props.onCancelUpload(); },
						autoFocus: true
					}),
					React.createElement("div", { className: "omni-confirm-btns" }, [
						React.createElement("button", { className: "omni-btn", onClick: props.onCancelUpload, disabled: busy }, t("presetDeleteCancel")),
						React.createElement("button", { className: "omni-btn omni-confirm-danger", onClick: props.onConfirmUpload, disabled: busy }, t("voiceUpload"))
					])
				])
			]) : null;
			var deleteModal = props.deleteName ? React.createElement("div", { className: "omni-confirm-overlay", onClick: props.onCancelDelete }, [
				React.createElement("div", { className: "omni-confirm-modal", onClick: function (e) { e.stopPropagation(); } }, [
					React.createElement("span", { className: "omni-confirm-title" }, t("voiceRefAudioDeleteTitle")),
					React.createElement("p", { className: "omni-confirm-msg" }, t("voiceRefAudioDeleteMsg")),
					React.createElement("div", { className: "omni-confirm-btns" }, [
						React.createElement("button", { className: "omni-btn", onClick: props.onCancelDelete, disabled: busy }, t("presetDeleteCancel")),
						React.createElement("button", { className: "omni-btn omni-confirm-danger", onClick: props.onConfirmDelete, disabled: busy }, t("voiceRefAudioDeleteConfirm"))
					])
				])
			]) : null;
			return React.createElement("div", { className: "omni-field" }, [
				React.createElement("span", { className: "omni-label" }, t("voiceRefAudio")),
				bar, nameModal, deleteModal
			]);
		}

		// v2.9.3: minimax 克隆音色 section — ref-audio file picker (base64) + voice_id input + 克隆 button.
		// Browser file picker can't expose a server path, so it sends base64; the /omni/minimax/clone
		// route writes it to a temp file then does upload+voice_clone. On success auto-selects the
		// cloned voice_id into cfg.voiceId (so speak / clone_voice can reuse it).
		// v2.9.5: refactor layout — input + upload button share one row (same flex pattern as
		// indextts/voxcpm via .omni-voice-upload). On file pick, the audio filename (sans extension)
		// auto-fills the input as the suggested voice_id; the upload button itself no longer mutates
		// its label, so the three controls (input / 上传 / 克隆) stay on a single visual baseline.
		// v2.9.6: mirror the mimo RefAudioRow interactions — the input gains an in-box dropdown
		// indicator (opens the shared voice-library menu so previously uploaded audio can be reused
		// directly without re-picking), the pick button text shortens to 选择, and a trash button
		// (library delete with confirm) is added right of 克隆. Picked audio is imported into the
		// shared voice-library on upload; the menu entries reuse them via ref_audio_path.
		function MinimaxCloneSection(props) {
			var t = props.t;
			var vid = React.useState("");
			var refFile = React.useState(null); // {path,name} from library | {base64,mime,name} fallback
			var delName = React.useState(null); // library name pending delete confirmation
			var fileInput = React.useRef(null);
			var busy = props.busy === true;
			var lib = Array.isArray(props.library) ? props.library : [];
			var onPick = function () { if (!busy && fileInput.current) fileInput.current.click(); };
			var onPickFromLib = function (entry) {
				if (!entry || !entry.path) return;
				refFile[1]({ path: entry.path, name: entry.name });
				var nm = String(entry.name || ""); var dot = nm.lastIndexOf(".");
				vid[1](dot > 0 ? nm.slice(0, dot) : nm);
				if (props.onToggleDd) props.onToggleDd(); // close the menu
			};
			var onFileChange = function (e) {
				var f = e && e.target && e.target.files && e.target.files[0];
				if (!f) return;
				var reader = new FileReader();
				reader.onload = function () {
					var du = String(reader.result || ""); var c = du.indexOf(",");
					var head = c >= 0 ? du.slice(0, c) : ""; var b64 = c >= 0 ? du.slice(c + 1) : du;
					var mime = "audio/wav"; var m = head.match(/data:([^;]+)/); if (m) mime = m[1];
					var nm = String(f.name || ""); var dot = nm.lastIndexOf(".");
					var base = dot > 0 ? nm.slice(0, dot) : nm;
					// Import into the shared voice library so it shows up in the dropdown next time.
					call("voice-library", { base64: b64, mime: mime, name: base }).then(function (r) {
						if (r && r.ok && r.entry) {
							refFile[1]({ path: r.entry.path, name: r.entry.name });
							var en = String(r.entry.name || base); var ed = en.lastIndexOf(".");
							vid[1](ed > 0 ? en.slice(0, ed) : en);
							if (props.onLibReload) props.onLibReload();
							if (props.onToast) props.onToast('success', t('voiceRefAudioUploadOk'), r.entry.name);
						} else {
							// Import failed — keep a local base64 fallback so cloning can still proceed.
							refFile[1]({ base64: b64, mime: mime, name: f.name });
							vid[1](base);
							props.onFail && props.onFail((r && r.error) || t("unknown"));
						}
					}).catch(function (err) {
						refFile[1]({ base64: b64, mime: mime, name: f.name });
						vid[1](base);
						props.onFail && props.onFail(et(err));
					});
				};
				reader.onerror = function () { props.onFail && props.onFail(t("unknown")); };
				reader.readAsDataURL(f);
				if (e && e.target) e.target.value = "";
			};
			var onClone = function () {
				var rf = refFile[0]; var id = String(vid[0] || "").trim();
				if (!rf || !id) return;
				var payload = rf.path
					? { ref_audio_path: rf.path, voice_id: id }
					: { base64: rf.base64, mime: rf.mime, voice_id: id };
				props.onClone(payload);
			};
			var onDelete = function () {
				var rf = refFile[0];
				if (!rf) return;
				if (rf.path && rf.name) delName[1](rf.name); // library entry → confirm modal
				else { refFile[1](null); vid[1](""); }        // base64-only fallback → just clear
			};
			var onConfirmDelete = function () {
				var nm = delName[0];
				if (!nm) return;
				call("voice-library", { delete: nm }).then(function (r) {
					if (r && r.ok) {
						refFile[1](null); vid[1]("");
						if (props.onLibReload) props.onLibReload();
						if (props.onToast) props.onToast('success', t('voiceRefAudioDeleteOk'), nm);
					} else {
						props.onFail && props.onFail((r && r.error) || t("unknown"));
					}
				}).catch(function (err) { props.onFail && props.onFail(et(err)); }).finally(function () { delName[1](null); });
			};
			var hasFile = !!refFile[0];
			var bar = React.createElement("div", { className: "omni-preset-bar omni-ref-audio-bar omni-minimax-clone-bar" }, [
				React.createElement("div", { className: "omni-preset-input-wrap omni-minimax-clone-inputwrap" }, [
					React.createElement("input", {
						className: "omni-input omni-preset-name-input",
						type: "text",
						value: vid[0],
						placeholder: hasFile ? "" : t("voiceCloneVoiceIdPh"),
						title: hasFile ? String((refFile[0] && refFile[0].name) || "") : t("voiceCloneVoiceIdPh"),
						readOnly: busy,
						onChange: function (e) { vid[1](e.target.value); }
					}),
					React.createElement("button", {
						className: "omni-preset-dd-btn", type: "button",
						title: t("voiceCloneLibMenu"),
						onClick: props.onToggleDd
					}, React.createElement(SvgIcon, { d: props.ddOpen ? I_COLLAPSE : I_EXPAND })),
					props.ddOpen ? React.createElement("div", { className: "omni-preset-menu" },
						lib.length > 0 ? lib.map(function (e) {
							return React.createElement("div", {
								key: e.id || e.name, className: "omni-preset-menu-item" + (refFile[0] && refFile[0].path === e.path ? " active" : ""),
								onClick: function () { onPickFromLib(e); }
							}, e.name);
						}) : [React.createElement("div", { key: "empty", className: "omni-preset-menu-item", style: { opacity: 0.6, cursor: "default" } }, t("voiceCloneLibEmpty"))]
					) : null
				]),
				React.createElement("button", {
					className: "omni-btn", type: "button",
					title: t("voiceClonePickRefTitle"), disabled: busy,
					onClick: onPick
				}, t("voiceClonePickRef")),
				React.createElement("button", {
					className: "omni-btn omni-minimax-clone-btn", type: "button",
					title: t("voiceCloneBtn"), disabled: busy || !refFile[0] || !vid[0],
					onClick: onClone
				}, t("voiceCloneBtn")),
				React.createElement("button", {
					className: "omni-btn omni-del-btn", type: "button",
					title: t("voiceRefAudioDelete"), disabled: busy || !refFile[0],
					onClick: onDelete
				}, React.createElement(SvgIcon, { d: I_TRASH }))
			]);
			var deleteModal = delName[0] ? React.createElement("div", { className: "omni-confirm-overlay", onClick: function () { delName[1](null); } }, [
				React.createElement("div", { className: "omni-confirm-modal", onClick: function (e) { e.stopPropagation(); } }, [
					React.createElement("span", { className: "omni-confirm-title" }, t("voiceRefAudioDeleteTitle")),
					React.createElement("p", { className: "omni-confirm-msg" }, t("voiceRefAudioDeleteMsg")),
					React.createElement("div", { className: "omni-confirm-btns" }, [
						React.createElement("button", { className: "omni-btn", onClick: function () { delName[1](null); }, disabled: busy }, t("presetDeleteCancel")),
						React.createElement("button", { className: "omni-btn omni-confirm-danger", onClick: onConfirmDelete, disabled: busy }, t("voiceRefAudioDeleteConfirm"))
					])
				])
			]) : null;
			return React.createElement("div", { className: "omni-field omni-minimax-clone" }, [
				React.createElement("span", { className: "omni-label" }, t("voiceCloneSection")),
				bar,
				deleteModal,
				React.createElement("input", { ref: fileInput, type: "file", accept: "audio/*", style: { display: "none" }, onChange: onFileChange })
			]);
		}

		// v2.9.11: doubao clone — redesigned UI (custom voice + App ID/Access Token in preset + layout reflow)
		function DoubaoCloneSection(props) {
			var t = props.t;
			var busy = props.busy === true;
			var presets = Array.isArray(props.doubaoClonePresets) ? props.doubaoClonePresets : [];
			var activeId = props.activeDoubaoClonePreset || (presets.length > 0 ? presets[0].id : '');
			var activePreset = presets.filter(function(p) { return p.id === activeId; })[0] || presets[0] || {};
			var nameDraft = React.useState(activePreset.name || '');
			var ddOpen = React.useState(false);
			var delConfirm = React.useState(false);
			var pathDraft = React.useState(activePreset.refAudioPath || '');
			var speakerDraft = React.useState(activePreset.speakerId || '');
			var appIdDraft = React.useState(activePreset.appId || '');
			var accessTokenDraft = React.useState(activePreset.accessToken || '');
			var apiKeyDraft = React.useState(activePreset.apiKey || '');
			var fileInput = React.useRef(null);
			var onFilePick = function (e) {
				var f = e && e.target && e.target.files && e.target.files[0];
				if (!f) return;
				var reader = new FileReader();
				reader.onload = function () {
					var du = String(reader.result || ''); var c = du.indexOf(',');
					var b64 = c >= 0 ? du.slice(c + 1) : du;
					var mime = 'audio/wav'; var m = c >= 0 ? du.slice(0, c).match(/data:([^;]+)/) : null; if (m) mime = m[1];
					var nm = String(f.name || 'ref'); var dot = nm.lastIndexOf('.'); var base = dot > 0 ? nm.slice(0, dot) : nm;
					call('voice-library', { base64: b64, mime: mime, name: base }).then(function (r) {
						if (r && r.ok && r.entry && r.entry.path) {
							pathDraft[1](r.entry.path);
							props.onPatch({ refAudioPath: r.entry.path });
							if (props.onToast) props.onToast('success', t('voiceRefAudioUploadOk'), r.entry.name);
						} else {
							if (props.onToast) props.onToast('error', t('voiceRefAudioUploadFail'), (r && r.error) || t('unknown'));
						}
					}).catch(function (err) { if (props.onToast) props.onToast('error', t('voiceRefAudioUploadFail'), et(err)); });
				};
				reader.readAsDataURL(f);
				if (e && e.target) e.target.value = '';
			};
			var cloneModelDraft = React.useState(activePreset.cloneModel || 'seed-icl-2.0');
			var cloneModelDdOpen = React.useState(false);
			var ICL_MODELS = [
				{ value: 'seed-icl-2.0', label: 'seed-icl-2.0 (ICL 2.0)' },
				{ value: 'seed-icl-1.0', label: 'seed-icl-1.0 (ICL 1.0)' }
			];
			var onClone = function () {
				var sid = String(speakerDraft[0] || '').trim();
				if (!sid) { props.showToast && props.showToast('error', t('voiceDoubaoCloneFail'), '缺少 speaker_id'); return; }
				var rpath = String(pathDraft[0] || '').trim();
				if (!rpath) { props.showToast && props.showToast('error', t('voiceDoubaoCloneFail'), '缺少参考音频路径'); return; }
				props.onClone({ ref_audio_path: rpath, voice_id: sid });
			};
			// close preset dropdown on outside click (blank-space click closes it)
			React.useEffect(function () {
				if (!ddOpen[0]) return;
				function close(e) {
					var tgt = e.target;
					if (!tgt || !tgt.closest || !tgt.closest('.omni-preset-bar')) {
						ddOpen[1](false);
					}
				}
				document.addEventListener('click', close);
				return function () { document.removeEventListener('click', close); };
			}, [ddOpen[0]]);
			// close clone model dropdown on outside click
			React.useEffect(function () {
				if (!cloneModelDdOpen[0]) return;
				function close(e) {
					var tgt = e.target;
					if (!tgt || !tgt.closest || !tgt.closest('.omni-preset-bar')) {
						cloneModelDdOpen[1](false);
					}
				}
				document.addEventListener('click', close);
				return function () { document.removeEventListener('click', close); };
			}, [cloneModelDdOpen[0]]);
			// Preset bar
			var bar = React.createElement('div', { className: 'omni-preset-bar' }, [
				React.createElement('div', { className: 'omni-preset-input-wrap' }, [
					React.createElement('input', { className: 'omni-input omni-preset-name-input', type: 'text', value: nameDraft[0], placeholder: t('presetNamePh'), onChange: function (e) { nameDraft[1](e.target.value); }, onBlur: function (e) { if (e.target.value !== activePreset.name) props.onRename(e.target.value); } }),
					React.createElement('button', { className: 'omni-preset-dd-btn', type: 'button', onClick: function () { ddOpen[1](!ddOpen[0]); } }, React.createElement(SvgIcon, { d: ddOpen[0] ? I_COLLAPSE : I_EXPAND })),
					ddOpen[0] ? React.createElement('div', { className: 'omni-preset-menu' }, presets.map(function (p) { return React.createElement('div', { key: p.id, className: 'omni-preset-menu-item' + (p.id === activeId ? ' active' : ''), onClick: function () { props.onSwitch(p.id); ddOpen[1](false); } }, p.name); })) : null
				]),
				React.createElement('button', { className: 'omni-btn omni-preset-new-btn', type: 'button', title: t('presetNew'), onClick: function () { props.onAdd(); } }, React.createElement(SvgIcon, { d: I_PLUS })),
				React.createElement('button', { className: 'omni-btn omni-preset-del-btn omni-del-btn', type: 'button', title: presets.length <= 1 ? t('presetDeleteDisabled') : t('presetDelete'), disabled: presets.length <= 1, onClick: function () { delConfirm[1](true); } }, React.createElement(SvgIcon, { d: I_TRASH }))
			]);
			// Row: 复刻模型 | speaker_id (same row)
			var modelSpeakerRow = React.createElement('div', { className: 'omni-row' }, [
				React.createElement('div', { className: 'omni-field' }, [
					React.createElement('span', { className: 'omni-label-small' }, '复刻模型'),
					React.createElement('div', { className: 'omni-preset-input-wrap' }, [
						React.createElement('input', { className: 'omni-input', type: 'text', value: cloneModelDraft[0] || 'seed-icl-2.0', readOnly: true, onChange: function () {} }),
						React.createElement('button', { className: 'omni-preset-dd-btn', type: 'button', onClick: function () { cloneModelDdOpen[1](!cloneModelDdOpen[0]); } }, React.createElement(SvgIcon, { d: cloneModelDdOpen[0] ? I_COLLAPSE : I_EXPAND })),
						cloneModelDdOpen[0] ? React.createElement('div', { className: 'omni-preset-menu' }, ICL_MODELS.map(function (m) { return React.createElement('div', { key: m.value, className: 'omni-preset-menu-item' + (m.value === (cloneModelDraft[0] || 'seed-icl-2.0') ? ' active' : ''), onClick: function () { cloneModelDraft[1](m.value); cloneModelDdOpen[1](false); props.onPatch({ cloneModel: m.value }); } }, m.label); })) : null
					])
				]),
				React.createElement('div', { className: 'omni-field omni-grow' }, [
					React.createElement('span', { className: 'omni-label-small' }, 'speaker_id'),
					React.createElement('input', { className: 'omni-input', type: 'text', placeholder: t('voiceDoubaoCloneSpeakerPh'), value: speakerDraft[0] || '', onChange: function (e) { speakerDraft[1](e.target.value); }, onBlur: function (e) { props.onPatch({ speakerId: e.target.value }); } })
				])
			]);
			// Row: 参考语音（可选）| 选择 | 复刻
			var pathRow = React.createElement('div', { className: 'omni-field' }, [
				React.createElement('span', { className: 'omni-label-small' }, '参考语音（可选）'),
				React.createElement('div', { className: 'omni-preset-bar omni-ref-audio-bar omni-minimax-clone-bar' }, [
					React.createElement('input', { className: 'omni-input', type: 'text', placeholder: '可手动输入或点右侧选择', value: pathDraft[0] || '', onChange: function (e) { pathDraft[1](e.target.value); }, onBlur: function (e) { props.onPatch({ refAudioPath: e.target.value }); } }),
					React.createElement('button', { className: 'omni-btn', type: 'button', title: '选择参考音频', onClick: function () { if (fileInput.current) fileInput.current.click(); } }, '选择'),
					React.createElement('button', { className: 'omni-btn omni-minimax-clone-btn', type: 'button', disabled: busy, onClick: onClone, title: t('voiceDoubaoCloneBtn') }, t('voiceDoubaoCloneBtn'))
				])
			]);
			// v2.9.13: 复刻区独立协议切换（V1/V3）— 与上方生成语音区各自独立
			var protocolRow = React.createElement('div', { className: 'omni-row' }, [
				React.createElement(SelectField, {
					label: 'API 协议', value: activePreset.apiVersion || 'v1',
					options: [{ value: 'v1', label: 'V1 (旧版控制台)' }, { value: 'v3', label: 'V3 (新版控制台)' }],
					onChange: function (e) { props.onPatch({ apiVersion: e.target.value }); }
				})
			]);
			// v2.9.13: 复刻区凭据按协议切换 — V1 = App ID + Access Token；V3 = KEY
			var credRow = (activePreset.apiVersion || 'v1') === 'v1' ? React.createElement('div', { className: 'omni-row' }, [
				React.createElement('div', { className: 'omni-field' }, [
					React.createElement('span', { className: 'omni-label-small' }, 'App ID'),
					React.createElement('input', { className: 'omni-input', type: 'text', placeholder: 'App ID', value: appIdDraft[0] || '', onChange: function (e) { appIdDraft[1](e.target.value); }, onBlur: function (e) { props.onPatch({ appId: e.target.value }); } })
				]),
				React.createElement('div', { className: 'omni-field omni-grow' }, [
					React.createElement('span', { className: 'omni-label-small' }, 'Access Token'),
					React.createElement('input', { className: 'omni-input', type: 'password', placeholder: 'Access Token', value: accessTokenDraft[0] || '', onChange: function (e) { accessTokenDraft[1](e.target.value); }, onBlur: function (e) { props.onPatch({ accessToken: e.target.value }); } })
				])
			]) : React.createElement('div', { className: 'omni-row' }, [
				React.createElement('div', { className: 'omni-field omni-grow' }, [
					React.createElement('span', { className: 'omni-label-small' }, 'KEY'),
					React.createElement('input', { className: 'omni-input', type: 'password', placeholder: 'KEY（V3 新版控制台）', value: apiKeyDraft[0] || '', onChange: function (e) { apiKeyDraft[1](e.target.value); }, onBlur: function (e) { props.onPatch({ apiKey: e.target.value }); } })
				])
			]);
			// Delete confirm modal
			var delModal = delConfirm[0] ? React.createElement('div', { className: 'omni-confirm-overlay', onClick: function () { delConfirm[1](false); } }, [
				React.createElement('div', { className: 'omni-confirm-modal', onClick: function (e) { e.stopPropagation(); } }, [
					React.createElement('span', { className: 'omni-confirm-title' }, t('presetDeleteTitle')),
					React.createElement('p', { className: 'omni-confirm-msg' }, t('presetDeleteMsg')),
					React.createElement('div', { className: 'omni-confirm-actions' }, [
						React.createElement('button', { className: 'omni-btn', onClick: function () { delConfirm[1](false); } }, t('cancel')),
						React.createElement('button', { className: 'omni-btn omni-confirm-danger', onClick: function () { delConfirm[1](false); props.onDelete(); } }, t('presetDelete'))
					])
				])
			]) : null;
			return React.createElement('div', { className: 'omni-field omni-minimax-clone' }, [
				React.createElement('hr', { className: 'omni-section-hr' }),
				React.createElement('span', { className: 'omni-label' }, t('voiceDoubaoCloneSection')),
				bar,
				protocolRow,
				credRow,
				modelSpeakerRow,
				pathRow,
				delModal,
				React.createElement('input', { ref: fileInput, type: 'file', accept: 'audio/*', style: { display: 'none' }, onChange: onFilePick })
			]);
		}

		// ---------- voice generation panel (v2.8) ----------
		function VoicePanel(props) {
				var t = props.t;
				var cfg = props.cfg || {};
				var meta = VOICE_PROVIDERS_UI[cfg.provider] || {};
				var isFixedUrl = !!meta.fixedUrl;
				var keyDraftValue = props.keyDraft || "";
				var isRevealed = !!props.revealed;
				var isDdOpen = !!props.openDd;
				var provOpen = !!props.openProv;
				var modelList = Array.isArray(props.modelList) ? props.modelList : [];
				var busy = props.busy;
				var menuOpen = React.useState(false);
				var activeSubtab = React.useState("tts");
				var isStt = activeSubtab[0] === "stt";
				var presets = isStt ? (Array.isArray(props.presetsStt) ? props.presetsStt : []) : (Array.isArray(props.presets) ? props.presets : []);
				var activePresetId = isStt ? (props.activePresetIdStt || (presets.length > 0 ? presets[0].id : "")) : (props.activePresetId || (presets.length > 0 ? presets[0].id : ""));
				var activePresetName = isStt ? (props.activePresetNameStt || "") : (props.activePresetName || "");
			var presetNameDraft = React.useState(activePresetName);
			React.useEffect(function () { presetNameDraft[1](activePresetName); }, [activeSubtab[0], activePresetName]);
		// v2.12.4: 基线存在组件外 —— 切 Tab 回来仍然是脏的；改回原值则不脏。
		// 同 v2.12.3：UI 级开关（仅显示语音模型）不计入修改判定。
		// 基线名用「加载后的权威名」(activePresetName)，避免 editable 草稿名异步追平首帧的瞬时脏。
		function voiceDirtyCfg(cf) { var o = Object.assign({}, cf || {}); delete o.filterVoiceModels; return o; }
		var vpBaseKey = dirtyKey("voice", activeSubtab[0] + "|" + (activePresetId || ""));
		// v2.12.5: 基线取自预设快照而非 cfg——cfg 已被 queueSave 自动落盘，
		// 重启后基线=已保存配置→脏标志丢失；预设快照仅「保存预设」时更新。
		var vpPreset = presets.find(function (p) { return p.id === activePresetId; });
		var vpBaseline = baselineFor(vpBaseKey, dirtyJson({ name: activePresetName, cfg: voiceDirtyCfg((vpPreset || {}).config || {}) }));
		var vpCur = dirtyJson({ name: presetNameDraft[0], cfg: voiceDirtyCfg(cfg) });
		var vcDirty = vpCur !== vpBaseline;

			// close the reset menu on outside click
				React.useEffect(function () {
					if (!menuOpen[0]) return;
					function close(e) {
						var tgt = e.target;
						if (!tgt || !tgt.closest || !tgt.closest(".omni-card-menu-wrap")) {
							menuOpen[1](false);
							if (props.onCloseMenu) props.onCloseMenu();
						}
					}
					document.addEventListener("click", close);
					return function () { document.removeEventListener("click", close); };
				}, [menuOpen[0]]);

				// close the preset dropdown on outside click
				React.useEffect(function () {
					if (!props.presetDdOpen) return;
					function close(e) {
						var tgt = e.target;
						if (!tgt || !tgt.closest || !tgt.closest(".omni-preset-bar")) {
							props.onTogglePresetDd();
						}
					}
					document.addEventListener("click", close);
					return function () { document.removeEventListener("click", close); };
				}, [props.presetDdOpen]);

				var providerGroups = [
					{ label: t("voiceGroupCloud"), options: ["mimo", "minimax", "doubao"].map(function (p) { return { value: p, label: voiceProviderDisplay(p, t) }; }) },
					{ label: t("voiceGroupLocal"), options: ["indextts", "gptsovits", "voxcpm", "tts-webui"].map(function (p) { return { value: p, label: voiceProviderDisplay(p, t) }; }) }
				];

				var head = React.createElement("div", { className: "omni-imggen-head" }, [
					React.createElement("span", { className: "omni-imggen-title" }, t("voiceTitle")),
					React.createElement("div", { className: "omni-card-menu-wrap" }, [
						React.createElement("button", {
							className: "omni-icon-btn omni-card-menu-btn",
							onClick: function () { menuOpen[1](!menuOpen[0]); }
						}, React.createElement(SvgIcon, { d: I_MENU })),
						menuOpen[0] ? React.createElement("div", { className: "omni-card-menu", ref: menuDdRef }, [
							React.createElement("div", {
								className: "omni-menu-item omni-menu-danger" + (props.confirmReset ? " omni-menu-confirm" : ""),
								title: t("voiceResetHint"),
								onClick: function () {
									var wasArmed = !!props.confirmReset;
									props.onResetClick();
									if (wasArmed) menuOpen[1](false);
								}
							}, React.createElement(SvgIcon, { d: I_TRASH }), React.createElement("span", null, props.confirmReset ? t("voiceResetConfirm") : t("voiceReset")))
						]) : null
					])
				]);

				var presetBar = React.createElement("div", { className: "omni-preset-bar" }, [
					React.createElement("div", { className: "omni-preset-input-wrap" }, [
						React.createElement("input", {
							className: "omni-input omni-preset-name-input",
							type: "text",
							value: presetNameDraft[0],
							placeholder: t("presetNamePh"),
							onChange: function (e) { presetNameDraft[1](e.target.value); }
						}),
						React.createElement("button", {
							className: "omni-preset-dd-btn", type: "button",
							onClick: props.onTogglePresetDd
						}, React.createElement(SvgIcon, { d: props.presetDdOpen ? I_COLLAPSE : I_EXPAND })),
						props.presetDdOpen ? React.createElement("div", { className: "omni-preset-menu", ref: menuDdRef },
							presets.map(function (p) {
								return React.createElement("div", {
									key: p.id, className: "omni-preset-menu-item" + (p.id === activePresetId ? " active" : ""),
									onClick: function () { props.onSwitchPreset(p.id, activeSubtab[0]); }
								}, p.name);
							})
						) : null
					]),
		React.createElement("button", {
			className: "omni-btn omni-save-btn", type: "button",
			title: t("presetSaved"),
			disabled: !vcDirty,
			onClick: function () { if (presetNameDraft[0] !== activePresetName) props.onRenamePreset(presetNameDraft[0], activeSubtab[0]); props.onSavePreset(activeSubtab[0]); setBaseline(vpBaseKey, vpCur); }
		}, React.createElement(SvgFillIcon, { d: I_SAVE_FLOPPY })),
					React.createElement("button", {
						className: "omni-btn omni-preset-new-btn", type: "button",
						title: t("presetNew"),
						onClick: function () { props.onAddPreset(activeSubtab[0]); }
					}, React.createElement(SvgIcon, { d: I_PLUS })),
					React.createElement("button", {
						className: "omni-btn omni-preset-del-btn omni-del-btn", type: "button",
						title: presets.length <= 1 ? t("presetDeleteDisabled") : t("presetDelete"),
						disabled: presets.length <= 1,
						onClick: props.onConfirmDeletePreset
					}, React.createElement(SvgIcon, { d: I_TRASH }))
				]);
				var confirmModal = props.presetDeleteConfirm ? React.createElement("div", { className: "omni-confirm-overlay", onClick: props.onCancelDeletePreset }, [
					React.createElement("div", { className: "omni-confirm-modal", onClick: function (e) { e.stopPropagation(); } }, [
						React.createElement("span", { className: "omni-confirm-title" }, t("presetDeleteTitle")),
						React.createElement("p", { className: "omni-confirm-msg" }, t("presetDeleteMsg")),
						React.createElement("div", { className: "omni-confirm-btns" }, [
							React.createElement("button", { className: "omni-btn", onClick: props.onCancelDeletePreset }, t("presetDeleteCancel")),
							React.createElement("button", { className: "omni-btn omni-confirm-danger", onClick: function () { props.onConfirmDelete(activeSubtab[0]); } }, t("presetDeleteConfirm"))
						])
					])
				]) : null;

				var subtabRow = React.createElement("div", { className: "omni-subtab-row" }, [
					React.createElement("div", {
						className: "omni-subtab-btn" + (activeSubtab[0] === "tts" ? " active" : ""),
						onClick: function () { activeSubtab[1]("tts"); }
					}, [
						React.createElement("span", null, t("voiceSubtabTts")),
						React.createElement("label", { className: "omni-switch", onClick: function (e) { e.stopPropagation(); } }, [
							React.createElement("input", { type: "checkbox", checked: !!props.ttsEnabled, onChange: props.onToggleTts }),
							React.createElement("span", { className: "omni-switch-slider" })
						])
					]),
					React.createElement("div", {
						className: "omni-subtab-btn" + (activeSubtab[0] === "stt" ? " active" : ""),
						onClick: function () { activeSubtab[1]("stt"); }
					}, [
						React.createElement("span", null, t("voiceSubtabStt")),
						React.createElement("label", { className: "omni-switch", onClick: function (e) { e.stopPropagation(); } }, [
							React.createElement("input", { type: "checkbox", checked: !!props.sttEnabled, onChange: props.onToggleStt }),
							React.createElement("span", { className: "omni-switch-slider" })
						])
					])
				]);

				var ttsBody = React.createElement("div", { className: "omni-card-body" + (props.ttsEnabled ? "" : " omni-tab-disabled") }, [
					React.createElement("div", { className: "omni-row" }, [
						React.createElement("div", { className: "omni-field omni-grow" }, [
							React.createElement("span", { className: "omni-label" }, t("voiceProvider")),
							React.createElement("div", { className: "omni-provider-wrap" }, [
								React.createElement("button", {
									className: "omni-input omni-provider-btn", type: "button",
									onClick: function () { props.onToggleProv(); }
								}, [
									React.createElement("span", { className: "omni-provider-label" }, voiceProviderDisplay(cfg.provider, t)),
								React.createElement("span", { className: "omni-provider-arrow" }, provOpen ? "▴" : "▾")
								]),
								provOpen ? React.createElement("div", { className: "omni-provider-dropdown", ref: provDdRef }, providerGroups.map(function (g) {
									return [React.createElement("div", { key: "g-" + g.label, className: "omni-dd-group" }, g.label)].concat(g.options.map(function (o) {
										return React.createElement("div", {
											key: o.value, className: "omni-dd-item" + (o.value === cfg.provider ? " active" : ""),
											onClick: function () { props.onPickProvider(o.value); }
										}, o.label);
									}));
								})) : null
							])
						]),
						// v2.9.12: doubao API protocol selector (V1/V3)
						cfg.provider === "doubao" ? React.createElement(SelectField, {
							label: "API 协议", value: cfg.apiVersion || "v1",
							options: [{ value: "v1", label: "V1 (旧版控制台)" }, { value: "v3", label: "V3 (新版控制台)" }],
							onChange: function (e) { props.onPatch("apiVersion", e.target.value); }
						}) : null,
						React.createElement(Field, {
							label: t("voiceTimeout"), number: true, min: 1000,
							value: String(cfg.timeoutMs != null ? cfg.timeoutMs : 30000),
							placeholder: "30000",
							onChange: function (e) { props.onPatch("timeoutMs", e.target.value); }
						})
					]),
					isFixedUrl ? React.createElement("p", { className: "omni-fixed-url" }, t("fixedUrlLabel") + ": " + meta.endpoint)
						: React.createElement(Field, {
							label: t("voiceEndpoint"), value: cfg.endpoint || "",
							placeholder: "https://api.example.com/v1",
							onChange: function (e) { props.onPatch("endpoint", e.target.value); }
						}),
					// v2.9.13: doubao 上方生成语音区独立凭据 — V1 = App ID + Access Token；V3 = KEY
					(cfg.provider === "doubao" && (cfg.apiVersion || "v1") === "v1") ? React.createElement("div", { className: "omni-row" }, [
						React.createElement("div", { className: "omni-field" }, [
							React.createElement("span", { className: "omni-label" }, "App ID"),
							React.createElement("input", { className: "omni-input", type: "text", value: cfg.appId || "", placeholder: "App ID", onChange: function (e) { props.onPatch("appId", e.target.value); } })
						]),
						React.createElement("div", { className: "omni-field omni-grow" }, [
							React.createElement("span", { className: "omni-label" }, "Access Token"),
							React.createElement("input", { className: "omni-input", type: "password", value: cfg.accessKey || "", placeholder: "Access Token", onChange: function (e) { props.onPatch("accessKey", e.target.value); } })
						])
					]) :
					React.createElement("div", { className: "omni-row" }, [
						React.createElement("div", { className: "omni-field omni-grow" }, [
							React.createElement("span", { className: "omni-label" }, t("voiceApiKey")),
							React.createElement("div", { className: "omni-key-wrap" }, [
								React.createElement("input", {
									className: "omni-input omni-key-input",
									type: isRevealed ? "text" : "password",
									value: keyDraftValue,
									disabled: meta.keyRequired === false,
									placeholder: cfg.apiKeySet ? t("apiKeySet") : (meta.keyRequired === false ? "Not required" : "sk-..."),
									onChange: function (e) { props.onSaveKey(e.target.value); }
								}),
								React.createElement("button", { className: "omni-eye-btn", type: "button", onClick: props.onToggleReveal },
									React.createElement(SvgIcon, { d: isRevealed ? I_EYE_OFF : I_EYE }))
							])
						])
					]),
						React.createElement("div", { className: "omni-row omni-model-fetch-row" }, [
							React.createElement("div", { className: "omni-field omni-grow" }, [
								React.createElement("span", { className: "omni-label" }, t("voiceModel")),
								React.createElement("div", { className: "omni-model-wrap" }, [
									React.createElement("input", {
										className: "omni-input omni-model-input" + (cfg.model ? "" : " omni-voice-ph"),
										type: "text", value: cfg.model || "",
										placeholder: t("voiceModelPh"),
										onChange: function (e) { props.onPatch("model", e.target.value); }
									}),
									React.createElement("button", {
										className: "omni-eye-btn", type: "button",
										title: t("ddHint"),
										onClick: function (e) { e.preventDefault(); props.onToggleDd(); }
									}, React.createElement(SvgIcon, { d: isDdOpen ? I_COLLAPSE : I_EXPAND })),
									isDdOpen && modelList.length > 0 ? React.createElement("div", { className: "omni-model-dropdown", ref: ddRef }, modelList.map(function (m) {
										return React.createElement("div", {
											key: m, className: "omni-dd-item" + (m === cfg.model ? " active" : ""),
											onClick: function () { props.onPickModel(m); }
										}, m);
									})) : null
								])
							]),
								React.createElement("button", {
									className: "omni-btn",
									disabled: busy !== "" || cfg.provider === "gptsovits",
									title: cfg.provider === "gptsovits" ? "此供应商无模型拉取 API" : "",
									onClick: props.onFetchModels
								}, busy === "voice-mdl" ? t("fetching") : t("voiceFetchModels"))
						]),
						React.createElement("div", { className: "omni-voice-control" }, (function () {
							var p = cfg.provider;
							var m = cfg.model;

							// MiMo: 3 model forms
							if (p === "mimo") {
								if (m === "mimo-v2.5-tts-voicedesign") {
									return React.createElement(Field, { label: t("voiceVoiceDesc"), value: cfg.voiceDescription || "", placeholder: "成熟稳重的男声...", onChange: function (e) { props.onPatch("voiceDescription", e.target.value); } });
								} else if (m === "mimo-v2.5-tts-voiceclone") {
									return React.createElement(RefAudioRow, {
										t: t,
										library: props.voiceRefLibrary, ddOpen: props.voiceRefDdOpen,
										selectedPath: cfg.voiceSamplePath || "",
										onToggleDd: props.onToggleRefDd, onPick: props.onPickRefAudio,
										onTriggerUpload: props.onTriggerRefUpload,
										onRename: props.onRenameRefAudio,
										onRequestDelete: props.onRequestRefDelete,
										onNameDraft: props.onRefNameDraft, nameDraft: props.voiceRefNameDraft,
										uploadPending: props.voiceRefUploadPending, uploadBusy: props.voiceRefUploadBusy,
										onConfirmUpload: props.onConfirmRefUpload, onCancelUpload: props.onCancelRefUpload,
										deleteName: props.voiceRefDeleteName,
										onConfirmDelete: props.onConfirmRefDelete, onCancelDelete: props.onCancelRefDelete
									});
								} else {
									// mimo-v2.5-tts: preset dropdown
									return React.createElement(SelectField, { label: t("voicePresetVoice"), value: cfg.voiceId || "mimo_default", options: MIMO_PRESET_VOICES.map(function (v) { return { value: v, label: v }; }), onChange: function (e) { props.onPatch("voiceId", e.target.value); } });
								}
							}

							// MiniMax: voice dropdown from API (3 groups) or fallback
							if (p === "minimax") {
								var vlist = props.voiceVoiceList || [];
								var opts = (Array.isArray(vlist) && vlist.length > 0) ? vlist : [];
								if (opts.length === 0) opts = ["English_Graceful_Lady", "Wise_Woman", "cute_boy", "sweet_girl"].map(function (v) { return { id: v, name: v }; });
								return React.createElement(SelectField, { label: t("voicePresetVoice"), value: cfg.voiceId || (opts[0] && opts[0].id) || "", options: opts.map(function (v) { return { value: v.id, label: v.name }; }), onChange: function (e) { props.onPatch("voiceId", e.target.value); } });
							}

							// Doubao: speaker dropdown (10 built-in voices + cloned preset names + stale-value guard)
							if (p === "doubao") {
								var dbOpts = DOUBAO_PRESET_VOICES.map(function (v) { return { value: v.id, label: v.name }; });
								// v2.9.10: append cloned voice presets (from doubaoClonePresets with speakerId set)
								var dcPresets = Array.isArray(props.doubaoClonePresets) ? props.doubaoClonePresets : [];
								dcPresets.forEach(function (dcp) {
									if (dcp.speakerId && !dbOpts.some(function (o) { return o.value === dcp.speakerId; })) {
										dbOpts.push({ value: dcp.speakerId, label: dcp.name + "（自定义）" });
									}
								});
								// stale-value guard: if cfg.voiceId is not in any list, append it
								if (cfg.voiceId && !dbOpts.some(function (o) { return o.value === cfg.voiceId; })) {
									dbOpts.push({ value: cfg.voiceId, label: cfg.voiceId + " (自定义)" });
								}
								return React.createElement(SelectField, { label: t("voicePresetVoice"), value: cfg.voiceId || "zh_female_vv_uranus_bigtts", options: dbOpts, onChange: function (e) { props.onPatch("voiceId", e.target.value); } });
							}

							// IndexTTS: reference audio dropdown from API + upload button
							if (p === "indextts") {
								var vlist2 = props.voiceVoiceList || [];
								var opts2 = Array.isArray(vlist2) ? vlist2 : [];
								return React.createElement("div", { className: "omni-field" }, [
									React.createElement("span", { className: "omni-label" }, t("voiceRefAudio")),
									React.createElement("div", { className: "omni-model-wrap omni-voice-upload" }, [
										React.createElement("select", { className: "omni-input omni-select", value: cfg.voiceId || "", onChange: function (e) { props.onPatch("voiceId", e.target.value); } },
											React.createElement("option", { value: "" }, "— 选择参考音频 —"),
											opts2.map(function (v) { return React.createElement("option", { key: v.id, value: v.id }, v.name); })
										),
										React.createElement("button", { className: "omni-btn", type: "button", title: t("voiceUpload"), onClick: props.onTriggerRefUpload }, t("voiceUpload"))
									])
								]);
							}

							// GPT-SoVITS: ref audio path + ref text + gpt model + sovits model
							if (p === "gptsovits") {
								return React.createElement("div", null, [
									React.createElement(Field, { label: t("voiceRefAudioPath"), value: cfg.voiceId || "", placeholder: "custom_refs/xxx.wav", onChange: function (e) { props.onPatch("voiceId", e.target.value); } }),
									React.createElement(Field, { label: t("voiceRefText"), value: cfg.refText || "", placeholder: "参考文本...", onChange: function (e) { props.onPatch("refText", e.target.value); } }),
									React.createElement(Field, { label: t("voiceGptModel"), value: cfg.gptModel || "", placeholder: "gpt-xxx", onChange: function (e) { props.onPatch("gptModel", e.target.value); } }),
									React.createElement(Field, { label: t("voiceSovitsModel"), value: cfg.sovitsModel || "", placeholder: "sovits-xxx", onChange: function (e) { props.onPatch("sovitsModel", e.target.value); } })
								]);
							}

							// VoxCPM: reference audio dropdown from API + upload button
							if (p === "voxcpm") {
								var vlist3 = props.voiceVoiceList || [];
								var opts3 = Array.isArray(vlist3) ? vlist3 : [];
								return React.createElement("div", { className: "omni-field" }, [
									React.createElement("span", { className: "omni-label" }, t("voiceRefAudio")),
									React.createElement("div", { className: "omni-model-wrap omni-voice-upload" }, [
										React.createElement("select", { className: "omni-input omni-select", value: cfg.voiceId || "", onChange: function (e) { props.onPatch("voiceId", e.target.value); } },
											React.createElement("option", { value: "" }, "— 选择参考音频 —"),
											opts3.map(function (v) { return React.createElement("option", { key: v.id, value: v.id }, v.name); })
										),
										React.createElement("button", { className: "omni-btn", type: "button", title: t("voiceUpload"), onClick: props.onTriggerRefUpload }, t("voiceUpload"))
									])
								]);
							}

							// TTS-WebUI: render a voice row that follows the model (eliminate blank gap)
							if (p === "tts-webui") {
								return React.createElement("div", { className: "omni-field" }, [
									React.createElement("span", { className: "omni-label" }, t("voicePresetVoice")),
									React.createElement("input", { className: "omni-input", type: "text", value: cfg.model || "", placeholder: "— 跟随模型 —", disabled: true })
								]);
							}

							return null;
						})()),

					React.createElement("div", { className: "omni-field" }, [
						React.createElement("span", { className: "omni-label" }, t("voiceStyleInstruction")),
						React.createElement("textarea", {
							className: "omni-input", rows: 2,
							value: cfg.styleInstruction || "",
							placeholder: "温柔地、充满感情地...",
							onChange: function (e) { props.onPatch("styleInstruction", e.target.value); }
						}),
						(cfg.provider === "gptsovits" || cfg.provider === "tts-webui") ? React.createElement("p", { className: "omni-voice-hint" }, t("voiceStyleNotParsed")) : null
					]),
					// v2.9.11: 重试次数 | 输出格式 moved here (above provider-specific + custom voice)
					React.createElement("div", { className: "omni-row" }, [
						React.createElement(Field, { label: t("voiceRetryCount"), number: true, min: 1, value: String(cfg.retryCount || 1), onChange: function (e) { props.onPatch("retryCount", e.target.value); } }),
						React.createElement(SelectField, { label: t("voiceOutputFormat"), value: cfg.outputFormat || "wav", options: (function () {
							var p = cfg.provider;
							if (p === "doubao") return [{ value: "mp3", label: "mp3" }];
							if (p === "indextts" || p === "gptsovits" || p === "voxcpm") return [{ value: "wav", label: "wav" }];
							return [{ value: "wav", label: "wav" }, { value: "pcm16", label: "pcm16" }];
						})(), onChange: function (e) { props.onPatch("outputFormat", e.target.value); } })
					]),
					// 流式输出 | 唱歌模式
					React.createElement("div", { className: "omni-row" }, [
						cfg.provider === "mimo" ? React.createElement("div", { className: "omni-module-row" }, [
							React.createElement("label", { className: "omni-switch" }, [
								React.createElement("input", { type: "checkbox", checked: !!cfg.streamOutput, onChange: function (e) { props.onPatch("streamOutput", e.target.checked); } }),
								React.createElement("span", { className: "omni-switch-slider" })
							]),
							React.createElement("span", { className: "omni-label" }, t("voiceStreamOutput"))
						]) : null,
						(cfg.provider === "mimo" && cfg.model === "mimo-v2.5-tts") ? React.createElement("div", { className: "omni-module-row" }, [
							React.createElement("label", { className: "omni-switch" }, [
								React.createElement("input", { type: "checkbox", checked: !!cfg.singMode, onChange: function (e) { props.onPatch("singMode", e.target.checked); } }),
								React.createElement("span", { className: "omni-switch-slider" })
							]),
							React.createElement("span", { className: "omni-label" }, t("voiceSingMode"))
						]) : null
					]),
					// 供应商专属附加行（v2.9.1）
						// v2.9.11: doubao appId/accessKey moved into DoubaoCloneSection
						cfg.provider === "indextts" ? React.createElement("div", { className: "omni-row" }, [
							React.createElement(Field, { label: t("voiceIndexEmoStrategy"), value: cfg.emoStrategy || "", placeholder: "0-3", onChange: function (e) { props.onPatch("emoStrategy", e.target.value); } }),
							React.createElement(Field, { label: t("voiceIndexEmoWeight"), value: cfg.emoWeight || "", placeholder: "0-1", onChange: function (e) { props.onPatch("emoWeight", e.target.value); } })
						]) : null,
						cfg.provider === "voxcpm" ? React.createElement("div", { className: "omni-row" }, [
							React.createElement(SelectField, { label: t("voiceVoxcpmMode"), value: cfg.mode || "clone", options: [{ value: "clone", label: "clone" }, { value: "design", label: "design" }], onChange: function (e) { props.onPatch("mode", e.target.value); } })
						]) : null,
						// v2.10: gptsovits config fields — gptModel, sovitsModel, refAudioPath, refText
						cfg.provider === "gptsovits" ? React.createElement("div", { className: "omni-row" }, [
							React.createElement(Field, { label: t("voiceGptsovitsGptModel"), value: cfg.gptModel || "", placeholder: "e.g. v4::model.ckpt", onChange: function (e) { props.onPatch("gptModel", e.target.value); } }),
							React.createElement(Field, { label: t("voiceGptsovitsSovitsModel"), value: cfg.sovitsModel || "", placeholder: "e.g. v4::model.pth", onChange: function (e) { props.onPatch("sovitsModel", e.target.value); } })
						]) : null,
						cfg.provider === "gptsovits" ? React.createElement("div", { className: "omni-row" }, [
							React.createElement(Field, { label: t("voiceGptsovitsRefAudio"), value: cfg.refAudioPath || "", placeholder: "custom_refs/test.wav", onChange: function (e) { props.onPatch("refAudioPath", e.target.value); } }),
							React.createElement(Field, { label: t("voiceGptsovitsRefText"), value: cfg.refText || "", placeholder: "参考文本", onChange: function (e) { props.onPatch("refText", e.target.value); } })
						]) : null,
						cfg.provider === "minimax" ? React.createElement("div", { className: "omni-row" }, [
							React.createElement(SelectField, { label: t("voiceMinimaxRegion"), value: cfg.region || "cn", options: [{ value: "cn", label: "cn" }, { value: "global", label: "global" }], onChange: function (e) { props.onPatch("region", e.target.value); } })
						]) : null,
						cfg.provider === "minimax" ? React.createElement(MinimaxCloneSection, {
							t: t,
							busy: props.voiceCloneBusy,
							onClone: props.onMinimaxClone,
							library: props.voiceRefLibrary,
							ddOpen: props.voiceRefDdOpen,
							onToggleDd: props.onToggleRefDd,
							onLibReload: props.onRefLibReload,
							onToast: props.showToast,
							onFail: function (m) { props.showToast && props.showToast('error', t("voiceCloneFail"), m || t("unknown")); }
						}) : null,
						cfg.provider === "doubao" ? React.createElement(DoubaoCloneSection, {
							key: props.activeDoubaoClonePreset || 'dcp_default',
							t: t,
							busy: props.voiceCloneBusy,
							onClone: props.onDoubaoClone,
							onToast: props.showToast,
							showToast: props.showToast,
							doubaoClonePresets: props.doubaoClonePresets,
							activeDoubaoClonePreset: props.activeDoubaoClonePreset,
							onSwitch: props.onDoubaoClonePresetSwitch,
							onAdd: props.onDoubaoClonePresetAdd,
							onDelete: props.onDoubaoClonePresetDelete,
							onRename: props.onDoubaoClonePresetRename,
							onPatch: props.onDoubaoClonePresetPatch
						}) : null,
						// Voice library section

					cfg.model === "mimo-v2.5-tts-voiceclone" ? React.createElement("div", { className: "omni-voice-library", style: { marginTop: "10px" } }, [
						React.createElement("span", { className: "omni-label" }, t("voiceLibraryTitle")),
						React.createElement("div", { className: "omni-list-container" }, [
							React.createElement("div", { className: "omni-list-empty" }, t("voiceLibraryEmpty"))
						])
					]) : null,
					React.createElement("p", { className: "omni-status" },
						(function () {
							if (!props.ttsEnabled) return t("voiceStatusSubOff");
							// v2.10: all 7 providers now have synthesis wired — removed voiceStatusNoSynth block
							if (!props.visible) return t("voiceStatusNoConfig");
							return t("voiceStatusOn") + (props.modelCount != null ? " · " + t("fetchOkPrefix") + props.modelCount + t("fetchOkSuffix") : "");
						})())
				]);

				var sttBody = React.createElement("div", { className: "omni-card-body" + (activeSubtab[0] === "stt" ? "" : " omni-tab-disabled") }, [
					React.createElement("p", { className: "omni-msg" }, t("voiceSttPlaceholder")),
					React.createElement("p", { className: "omni-status" }, t("voiceSttPlaceholder"))
				]);

				return React.createElement("div", { className: "omni-imggen-panel omni-voice-panel" }, [
					head, subtabRow, presetBar, React.createElement("div", { className: "omni-preset-divider" }),
					activeSubtab[0] === "tts" ? ttsBody : sttBody,
					confirmModal
				]);
			}

			// ---------- settings panel (global config) ----------
		function SettingsPanel(props) {
			var t = props.t;
			var gc = props.globalConfig || {};
			return React.createElement("div", { className: "omni-card omni-settings-panel" }, [
				React.createElement("div", { className: "omni-settings-section" }, [
					React.createElement("span", { className: "omni-settings-section-title" }, t("settingsModuleSection")),
						React.createElement("div", { className: "omni-row" }, [
							props.moduleRow("VLM", props.vlmOn, props.onToggleVlm, ""),
							props.moduleRow(t("tabImggen"), props.imggenOn, props.onToggleImggen, ""),
							props.moduleRow(t("tabVideo"), props.videoOn, props.onToggleVideo, ""),
							props.moduleRow(t("tabAudio"), props.voiceOn, props.onToggleVoice, "")
						]),
				]),
				React.createElement("div", { className: "omni-settings-section" }, [
					React.createElement("span", { className: "omni-settings-section-title" }, t("settingsBackoffSection")),
					React.createElement("div", { className: "omni-row" }, [
						React.createElement(Field, { label: t("backoffBaseLabel"), number: true, min: 100, value: String(gc.backoffBase || 800), placeholder: "800", onChange: function (e) { props.onPatchGlobal("backoffBase", e.target.value); } }),
						React.createElement(Field, { label: t("backoffMaxLabel"), number: true, min: 500, value: String(gc.backoffMax || 5000), placeholder: "5000", onChange: function (e) { props.onPatchGlobal("backoffMax", e.target.value); } })
					]),
					React.createElement("div", { className: "omni-row" }, [
						React.createElement(Field, { label: t("backoff429BaseLabel"), number: true, min: 100, value: String(gc.backoff429Base || 2000), placeholder: "2000", onChange: function (e) { props.onPatchGlobal("backoff429Base", e.target.value); } }),
						React.createElement(Field, { label: t("backoff429MaxLabel"), number: true, min: 500, value: String(gc.backoff429Max || 10000), placeholder: "10000", onChange: function (e) { props.onPatchGlobal("backoff429Max", e.target.value); } })
					]),
					React.createElement(Field, { label: t("retryStatusCodesLabel"), value: gc.retryStatusCodes || "402,408,429,500,502,503,504,NET", placeholder: "402,408,429,500,502,503,504,NET", onChange: function (e) { props.onPatchGlobal("retryStatusCodes", e.target.value); } }),
					React.createElement("p", { className: "omni-status" }, t("retryStatusCodesHint")),
			])
		]);
	}

	// ---------- extension card (v2.1 / v2.11.1 video builder) ----------
	function ExtensionCard(props) {
		var t = props.t;
		var gc = props.globalConfig || {};
		var vlmCollapsed = React.useState(function () { try { return JSON.parse(localStorage.getItem('omni-workstation-collapse') || '{}').extVlm !== false; } catch (e) { return false; } });
		var videoCollapsed = React.useState(function () { try { return JSON.parse(localStorage.getItem('omni-workstation-collapse') || '{}').extVideo === true; } catch (e) { return true; } });
		function toggleVlmCollapse() {
			var v = !vlmCollapsed[0];
			vlmCollapsed[1](v);
			try { var s = JSON.parse(localStorage.getItem('omni-workstation-collapse') || '{}'); s.extVlm = v; localStorage.setItem('omni-workstation-collapse', JSON.stringify(s)); } catch (e) {}
		}
		function toggleVideoCollapse() {
			var v = !videoCollapsed[0];
			videoCollapsed[1](v);
			try { var s = JSON.parse(localStorage.getItem('omni-workstation-collapse') || '{}'); s.extVideo = v; localStorage.setItem('omni-workstation-collapse', JSON.stringify(s)); } catch (e) {}
		}
		var expanded = !vlmCollapsed[0];
		var videoExpanded = !videoCollapsed[0];
		var toolSettingsOpen = React.useState(false);
		var toolToggles = props.visionToolToggles || {};
		var toolNames = ["zoom_image", "sample_colors", "image_diff", "ocr_image", "detect_elements", "show_image"];
		var toolLabels = {"zoom_image": t("toolZoomImage"), "sample_colors": t("toolSampleColors"), "image_diff": t("toolImageDiff"), "ocr_image": t("toolOcrImage"), "detect_elements": t("toolDetectElements"), "show_image": t("toolShowImage")};
		var toolDescs = {"zoom_image": t("toolZoomImageDesc"), "sample_colors": t("toolSampleColorsDesc"), "image_diff": t("toolImageDiffDesc"), "ocr_image": t("toolOcrImageDesc"), "detect_elements": t("toolDetectElementsDesc"), "show_image": t("toolShowImageDesc")};
		var toolModal = toolSettingsOpen[0] ? React.createElement("div", { className: "omni-confirm-overlay", onClick: function () { toolSettingsOpen[1](false); } }, [
			React.createElement("div", { className: "omni-confirm-modal", onClick: function (e) { e.stopPropagation(); } }, [
				React.createElement("span", { className: "omni-confirm-title" }, t("extToolSettings")),
				toolNames.map(function (tn) {
					return React.createElement("div", { key: tn, className: "omni-module-row" }, [
						React.createElement("label", { className: "omni-switch" }, [
							React.createElement("input", { type: "checkbox", checked: toolToggles[tn] !== false, onChange: function () { props.onToggleVisionTool(tn); } }),
							React.createElement("span", { className: "omni-switch-slider" })
						]),
						React.createElement("span", { className: "omni-label" }, toolLabels[tn] || tn),
						React.createElement("span", { className: "omni-tool-desc", title: toolDescs[tn] || "" }, toolDescs[tn] || "")
					]);
				}),
				React.createElement("div", { className: "omni-confirm-btns" }, [
					React.createElement("button", { className: "omni-btn", onClick: function () { toolSettingsOpen[1](false); } }, "OK")
				])
			])
		]) : null;
		var builderOn = props.videoBuilderEnabled !== false;
		var cardLimit = props.videoCardLimit != null ? props.videoCardLimit : 10;
		return React.createElement("div", { className: "omni-card omni-ext-card" }, [
			React.createElement("span", { className: "omni-settings-section-title" }, t("extCardTitle")),
			React.createElement("div", { className: "omni-ext-section" }, [
				React.createElement("div", { className: "omni-ext-section-head omni-head-clickable", onClick: toggleVlmCollapse }, [
					React.createElement("span", { className: "omni-ext-section-title" }, t("extVlmSection")),
					React.createElement("button", { className: "omni-icon-btn", title: expanded ? "Collapse" : "Expand", onClick: function (e) { e.stopPropagation(); toggleVlmCollapse(); } }, React.createElement(SvgIcon, { d: expanded ? I_COLLAPSE : I_EXPAND }))
				]),
				expanded ? React.createElement("div", { className: "omni-ext-toggle-row" }, [
					React.createElement("div", { className: "omni-module-row" }, [
						React.createElement("label", { className: "omni-switch" }, [
							React.createElement("input", { type: "checkbox", checked: props.toolsOn, onChange: props.onToggleTools }),
							React.createElement("span", { className: "omni-switch-slider" })
						]),
						React.createElement("span", { className: "omni-label" }, t("toolsSwitchLabel")),
							React.createElement("button", { className: "omni-icon-btn", title: t("extToolSettings"), onClick: function () { toolSettingsOpen[1](true); } }, React.createElement(SvgFillIcon, { d: I_GEAR_SVG, viewBox: "0 0 24 24" }))

					]),
					// v2.11.3.1: verify reminder + dynamic adapt share one row (hint dropped — overflowed the panel)
					React.createElement("div", { className: "omni-module-row" }, [
						React.createElement("label", { className: "omni-switch" }, [
							React.createElement("input", { type: "checkbox", checked: gc.verifyReminder !== false, onChange: function (e) { props.onPatchGlobal("verifyReminder", e.target.checked); } }),
							React.createElement("span", { className: "omni-switch-slider" })
						]),
						React.createElement("span", { className: "omni-label" }, t("verifyReminderLabel")),
						React.createElement("label", { className: "omni-switch", title: t("dynamicAdaptHint") }, [
							React.createElement("input", { type: "checkbox", checked: gc.dynamicMultimodalAdapt !== false, onChange: function (e) { props.onPatchGlobal("dynamicMultimodalAdapt", e.target.checked); } }),
							React.createElement("span", { className: "omni-switch-slider" })
						]),
						React.createElement("span", { className: "omni-label", title: t("dynamicAdaptHint") }, t("dynamicAdaptLabel"))
					])
				]) : null
			]),
			React.createElement("div", { className: "omni-ext-section" }, [
				React.createElement("div", { className: "omni-ext-section-head omni-head-clickable", onClick: toggleVideoCollapse }, [
					React.createElement("span", { className: "omni-ext-section-title" }, t("extVideoSection")),
					React.createElement("button", { className: "omni-icon-btn", title: videoExpanded ? "Collapse" : "Expand", onClick: function (e) { e.stopPropagation(); toggleVideoCollapse(); } }, React.createElement(SvgIcon, { d: videoExpanded ? I_COLLAPSE : I_EXPAND }))
				]),
				videoExpanded ? React.createElement("div", { className: "omni-ext-toggle-row omni-ext-video-row" }, [
					React.createElement("div", { className: "omni-module-row" }, [
						React.createElement("label", { className: "omni-switch" }, [
							React.createElement("input", { type: "checkbox", checked: builderOn, onChange: function () { if (props.onToggleVideoBuilder) props.onToggleVideoBuilder(!builderOn); } }),
							React.createElement("span", { className: "omni-switch-slider" })
						]),
						React.createElement("span", { className: "omni-label" }, t("videoBuilderSwitchLabel"))
					]),
					React.createElement("div", { className: "omni-module-row omni-limit-row" }, [
						React.createElement("span", { className: "omni-label" }, t("videoCardLimitLabel")),
						React.createElement("input", {
							className: "omni-input omni-limit-input",
							type: "number", min: 1, max: 10,
							value: String(cardLimit),
							onChange: function (e) {
								var v = Math.max(1, Math.min(10, Math.floor(Number(e.target.value) || 10)));
								if (props.onPatchVideoCardLimit) props.onPatchVideoCardLimit(v);
							}
						}),
						React.createElement("span", { className: "omni-status" }, t("videoCardLimitHint"))
					])
				]) : null
			]),
			toolModal
		]);
	}

	function AboutCard(props) {
		var t = props.t;
		var updateState = React.useState({ status: "idle", remote: "", url: "" });
		var githubUrl = "https://github.com/huashenglian/dsh-omni-workstation";
		var githubSvg = React.createElement("svg", {
			width: "14", height: "14", viewBox: "0 0 16 16", fill: "currentColor",
			"aria-hidden": "true", style: { verticalAlign: "middle" }
		}, [
			React.createElement("path", {
				key: "p",
				d: "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
			})
		]);
		function openUrl(url) {
			try {
				window.open(url, "_blank", "noopener,noreferrer");
			} catch (e) { /* ignore */ }
		}
		function checkUpdate() {
			updateState[1]({ status: "checking", remote: "", url: "" });
			fetch("/omni/update-check", { headers: { Accept: "application/json" } })
				.then(function (r) { return r.json().catch(function () { return null; }); })
				.then(function (data) {
					if (!data || data.ok === false) {
						updateState[1]({ status: "fail", remote: "", url: (data && data.repo) || githubUrl });
						return;
					}
					if (!data.remote) {
						updateState[1]({ status: "fail", remote: "", url: data.repo || githubUrl });
						return;
					}
					if (data.hasUpdate) {
						updateState[1]({ status: "update", remote: data.remote || "", url: data.url || data.repo || githubUrl });
					} else {
						updateState[1]({ status: "latest", remote: data.remote || data.local || "", url: data.repo || githubUrl });
					}
				})
				.catch(function () {
					updateState[1]({ status: "fail", remote: "", url: githubUrl });
				});
		}
		var u = updateState[0];
		var updateText = "";
		if (u.status === "checking") updateText = t("checkingUpdate");
		else if (u.status === "latest") updateText = t("updateUpToDate") + (u.remote ? " (" + u.remote + ")" : "");
		else if (u.status === "update") updateText = t("updateAvailable") + (u.remote || "");
		else if (u.status === "fail") updateText = t("updateCheckFail");
		return React.createElement("div", { className: "omni-card omni-about-card" }, [
			React.createElement("span", { className: "omni-settings-section-title" }, t("aboutTitle")),
			React.createElement("p", { className: "omni-desc" }, t("aboutDesc")),
			React.createElement("div", { className: "omni-about-btns" }, [
				React.createElement("button", {
					disabled: u.status === "checking",
					title: t("checkUpdateBtn"),
					className: "omni-btn",
					onClick: checkUpdate
				}, t("checkUpdateBtn")),
				React.createElement("button", {
					className: "omni-btn omni-github-btn",
					title: t("githubRepoHint"),
					onClick: function () { openUrl(githubUrl); }
				}, [githubSvg, " ", t("githubRepoBtn")])
			]),
			updateText ? React.createElement(
				"p",
				{
					className: "omni-status omni-about-update" + (u.status === "update" ? " omni-about-update-available" : ""),
					style: u.status === "update" && u.url ? { cursor: "pointer", textDecoration: "underline" } : undefined,
					onClick: u.status === "update" && u.url ? function () { openUrl(u.url); } : undefined,
					title: u.status === "update" && u.url ? u.url : undefined
				},
				updateText
			) : null,
			React.createElement("p", { className: "omni-status omni-about-version" }, t("versionLabel") + (props.version || ""))
		]);
	}

		// ---------- settings page ----------
		function VlmSettingsPage(props) {
			var t = (props && props.t) || tBound || (function (k) { return k; });
			var snap = React.useState(null);
			var draft = React.useState(null);
			var keyDraft = React.useState({});
			var busy = React.useState("");
			var msg = React.useState("");
			var errState = React.useState(false);
			var saveState = React.useState("");
			var models = React.useState({});
			var menuOpen = React.useState(null);
			var renameId = React.useState(null);
			var dragFrom = React.useState(null);
			var dropOver = React.useState(null);
			var modelCount = React.useState(null);
			var revealed = React.useState({});
			var openDd = React.useState(null);
			var openProv = React.useState(null);
				var tab = React.useState("vlm");
				var batchOpen = React.useState(false);
				var confirmDel = React.useState(null);
				var confirmDialog = React.useState(null); // { title, message, confirmLabel, cancelLabel, onConfirm, onCancel }
				var igKeyDraft = React.useState("");
			var igRevealed = React.useState(false);
			var igOpenDd = React.useState(false);
			var igOpenProv = React.useState(false);
			var igBusy = React.useState("");
			var igConfirmReset = React.useState(false);
		var igPresetDdOpen = React.useState(false);
		var igPresetDeleteConfirm = React.useState(false);
		var igPresetNameDraft = React.useState("");
			var igModelList = React.useState([]);
			var igModelCount = React.useState(null);
			var igVaeList = React.useState([]);
			var igClipList = React.useState([]);
			var igUnetList = React.useState([]);
			var igVaeDd = React.useState(false);
			var igClipDd = React.useState(false);
			// v2.11: video card panel state (per-card, keyed by cardId)
			var vcKeyDraft = React.useState({});
			var vcRevealed = React.useState({});
			var vcOpenDd = React.useState({});
			var vcOpenProv = React.useState({});
			var vcBusy = React.useState({});
			var vcMenuOpen = React.useState(null);
			var vcConfirmDel = React.useState(null);
			var vcConfirmReset = React.useState(null);
			var vcModelList = React.useState({});
			var vcModelCount = React.useState({});
			var vcPresetDdOpen = React.useState({});
			var vcPresetDeleteConfirm = React.useState(null);
			var vcPresetNameDraft = React.useState({});
		var vcAddModalOpen = React.useState(false);
		var vcEditCard = React.useState(null);
		var vcBatchOpen = React.useState(false);
			// v2.8.1: voice panel state
			var voiceKeyDraft = React.useState("");
			var voiceRevealed = React.useState(false);
			var voiceOpenDd = React.useState(false);
			var voiceOpenProv = React.useState(false);
			var voiceBusy = React.useState("");
			var voiceConfirmReset = React.useState(false);
				var voiceModelList = React.useState([]);
				var voiceVoiceList = React.useState([]);

			var voiceModelCount = React.useState(null);
		var voicePresetDdOpen = React.useState(false);
		var voicePresetDeleteConfirm = React.useState(false);
		// v2.9.2: local reference-audio library (参考音频 row)
		var voiceRefLibrary = React.useState([]);
		var voiceRefDdOpen = React.useState(false);
		var voiceRefUploadBusy = React.useState(false);
		var voiceRefDeleteName = React.useState(null);   // name pending delete confirmation
		var voiceRefUploadPending = React.useState(null); // { name, base64, mime } awaiting name-confirm
		var voiceRefNameDraft = React.useState("");
		var refFileInput = React.useRef(null);
		var voiceCloneBusy = React.useState(false);
			var fbCollapsed = React.useState(function () { try { var s = JSON.parse(localStorage.getItem('omni-workstation-collapse') || '{}'); return s.fb !== undefined ? s.fb : true; } catch (e) { return true; } });
			var fbModels = React.useState([]);
			var fbOpenDd = React.useState(false);
			var fbBusy = React.useState("");
			var fbSearch = React.useState("");
			var fbDragFrom = React.useState(null);
			var fbDropOver = React.useState(null);
			var mirrorCollapsed = React.useState(function () { try { var s = JSON.parse(localStorage.getItem('omni-workstation-collapse') || '{}'); return s.mirror !== undefined ? s.mirror : true; } catch (e) { return true; } });
			var mirrorAllModels = React.useState([]);
			var mirrorBusy = React.useState("");
			var mirrorOpenDd = React.useState(null);
			var toasts = React.useState([]);
			function showToast(type, title, desc) {
				var id = 't_' + (++toastSeq);
				toasts[1](function (prev) {
					var next = [{ id: id, type: type, title: title, desc: desc }].concat(prev || []);
					return next.length > 5 ? next.slice(0, 5) : next;
				});
				var dur = TOAST_DUR[type] || 3000;
				toastTimers[id] = setTimeout(function () { closeToast(id); }, dur);
			}
			function closeToast(id) {
				if (toastTimers[id]) { clearTimeout(toastTimers[id]); delete toastTimers[id]; }
				toasts[1](function (prev) { return (prev || []).filter(function (t) { return t.id !== id; }); });
			}
			function extendToast(id) {
				if (toastTimers[id]) clearTimeout(toastTimers[id]);
				toastTimers[id] = setTimeout(function () { closeToast(id); }, 10000);
			}

			function reorderFallbackModels(fromIndex, toIndex) {
				updateDraft(function (d) {
					if (!d.fallbackConfig || !Array.isArray(d.fallbackConfig.models)) return d;
					var arr = d.fallbackConfig.models.slice();
					var moved = arr.splice(fromIndex, 1)[0];
					arr.splice(toIndex, 0, moved);
					d.fallbackConfig = Object.assign({}, d.fallbackConfig, { models: arr });
					return d;
				});
				saveState[1]("saving");
				queueSave({ fallbackConfig: { field: "reorder", value: { from: fromIndex, to: toIndex } } });
				Promise.resolve().then(function () { saveState[1]("recent"); });
			}

			function setMsg(text, isError) {
				msg[1](text);
				errState[1](!!isError);
			}

		React.useEffect(function () {
			call("config").then(function (s) {
				if (s && s.config) {
					snap[1](s);
					resetAllBaselines();
					draft[1](s.config);
					call("voice-library", { list: true }).then(function (rl) { if (rl && rl.ok) voiceRefLibrary[1](rl.library || []); }).catch(function () {});
				} else {
					setMsg(t("loadFail") + (s && s.error ? s.error : t("unknown")), true);
					showToast('error', t("loadFail"), (s && s.error ? s.error : t("unknown")));
				}
			}).catch(function (e) { setMsg(t("loadFail") + et(e), true); showToast('error', t("loadFail"), et(e)); });
		}, []);

			// close card menu / model dropdown on outside click
			React.useEffect(function () {
				var vcAnyOpen = Object.keys(vcOpenDd[0]).length > 0 || Object.keys(vcOpenProv[0]).length > 0 || Object.keys(vcPresetDdOpen[0]).length > 0;
				if (!menuOpen[0] && !openDd[0] && !batchOpen[0] && !openProv[0] && !igOpenDd[0] && !igOpenProv[0] && !igConfirmReset[0] && !fbOpenDd[0] && !mirrorOpenDd[0] && !vcAnyOpen && !voiceOpenDd[0] && !voiceOpenProv[0] && !voicePresetDdOpen[0] && !voiceRefDdOpen[0]) return;
				function close(e) {
					var tgt = e.target;
					if (!tgt || !tgt.closest) {
						menuOpen[1](null); openDd[1](null); batchOpen[1](false); openProv[1](null);
						igOpenDd[1](false); igOpenProv[1](false); igConfirmReset[1](false);
							fbOpenDd[1](false); mirrorOpenDd[1](null);
							vcOpenDd[1]({}); vcOpenProv[1]({}); vcPresetDdOpen[1]({});
							voiceOpenDd[1](false); voiceOpenProv[1](false); voicePresetDdOpen[1](false); voiceRefDdOpen[1](false);
							confirmDel[1](null); return;
						}
						if (!tgt.closest(".omni-card-menu-wrap")) { menuOpen[1](null); confirmDel[1](null); igConfirmReset[1](false); }
						if (!tgt.closest(".omni-model-wrap")) { openDd[1](null); igOpenDd[1](false); fbOpenDd[1](false); mirrorOpenDd[1](null); vcOpenDd[1]({}); voiceOpenDd[1](false); }
						if (!tgt.closest(".omni-provider-wrap")) { openProv[1](null); igOpenProv[1](false); vcOpenProv[1]({}); voiceOpenProv[1](false); }
						if (!tgt.closest(".omni-batch-wrap")) { batchOpen[1](false); }
						if (!tgt.closest(".omni-preset-bar")) { vcPresetDdOpen[1]({}); voicePresetDdOpen[1](false); voiceRefDdOpen[1](false); }
					}
					document.addEventListener("click", close);
					return function () { document.removeEventListener("click", close); };
				}, [menuOpen[0], openDd[0], batchOpen[0], openProv[0], igOpenDd[0], igOpenProv[0], igConfirmReset[0], fbOpenDd[0], mirrorOpenDd[0], vcOpenDd[0], vcOpenProv[0], vcPresetDdOpen[0], voiceOpenDd[0], voiceOpenProv[0], voicePresetDdOpen[0], voiceRefDdOpen[0]]);

			if (!draft[0]) {
				return React.createElement("div", { className: "omni-page" }, [
					React.createElement("p", { className: "omni-desc" }, t("loading")),
					null
				]);
			}

			function updateDraft(fn) {
				draft[1](function (d) { return fn(JSON.parse(JSON.stringify(d))); });
			}

			// ---- field patch: local update + debounced save ----
			function patchCard(id, field, value) {
				updateDraft(function (d) {
					var card = d.apis.find(function (c) { return c.id === id; });
					if (card) card[field] = value;
					return d;
				});
				if (field === "apiKey" && String(value || "").length === 0) return;
				saveState[1]("saving");
				queueSave({ patchCard: { id: id, field: field, value: value } });
				Promise.resolve().then(function () { saveState[1]("recent"); });
			}

		// ---- structure operations: local update + immediate POST, then sync ----
		function commitStructure(patch, localFn, onSuccess) {
			// Flush any pending debounced save to prevent race condition:
			// if a queueSave is pending (600ms debounce), send it NOW and WAIT
			// for it to complete before this immediate POST, so the backend
			// sees the cumulative state (no concurrent POST race).
			var flushPromise = scheduleSave.flush();
			var proceed = function () {
				if (localFn) updateDraft(localFn);
				busy[1]("struct");
				call("config", patch).then(function (r) {
					if (r && r.config) {
						draft[1](r.config);
						snap[1](r);
						if (onSuccess) onSuccess();
					} else {
						setMsg(t("saveFail") + (r && r.error ? r.error : t("unknown")), true);
						showToast('error', t("saveFail"), (r && r.error) || t("unknown"));
						call("config").then(function (s) {
							if (s && s.config) { draft[1](s.config); snap[1](s); }
						});
					}
				}).catch(function (e) { setMsg(t("saveFail") + et(e), true); showToast('error', t("saveFail"), et(e)); }).finally(function () { busy[1](""); });
			};
			if (flushPromise && typeof flushPromise.then === 'function') {
				flushPromise.then(proceed).catch(proceed);
			} else {
				proceed();
			}
		}

			function addCard() {
				commitStructure({ addCard: {} }, null, function () { showToast('success', t('cardAdded'), ''); });
			}
			function deleteCard(id) {
				commitStructure({ deleteCard: { id: id } }, function (d) {
					d.apis = d.apis.filter(function (c) { return c.id !== id; });
					return d;
				}, function () { showToast('success', t('cardDeleted'), ''); });
			}
			function moveCardTo(id, position) {
				commitStructure({ moveCardTo: { id: id, position: position } }, function (d) {
					var from = d.apis.findIndex(function (c) { return c.id === id; });
					if (from >= 0) {
						var moved = d.apis.splice(from, 1)[0];
						if (position === "top") d.apis.unshift(moved);
						else d.apis.push(moved);
					}
					return d;
				});
			}
			function reorderCard(fromIndex, toIndex) {
				var d = draft[0];
				if (!d || fromIndex < 0 || fromIndex >= d.apis.length) return;
				var id = d.apis[fromIndex].id;
				commitStructure({ reorderCard: { id: id, to: toIndex } }, function (dd) {
					var arr = dd.apis.slice();
					var moved = arr.splice(fromIndex, 1)[0];
					arr.splice(toIndex, 0, moved);
					dd.apis = arr;
					return dd;
				});
			}

			// 供应商变更：只 patch provider 字段；endpoint/protocol 由后端 effectiveCard 在请求时
			// 按预设表推导（固定供应商用内置值，custom/ollama 用存储值），不在切换时覆写存储值。
			function changeProvider(id, v) {
				if (!PROVIDERS_UI[v]) return;
				patchCard(id, "provider", v);
			}
			function batchCollapse(v) {
				batchOpen[1](false);
				commitStructure({ apis: (draft[0].apis || []).map(function (c) { return Object.assign({}, c, { collapsed: v }); }) }, function (d) {
					d.apis = d.apis.map(function (c) { return Object.assign({}, c, { collapsed: v }); });
					return d;
				}, function () { showToast('success', v ? t('cardsCollapsedAll') : t('cardsExpandedAll'), ''); });
			}
				function batchDeleteAll() {
					batchOpen[1](false);
					confirmDialog[1]({
						title: t("batchDeleteAllTitle"),
						message: t("batchDeleteAllMsg"),
						onConfirm: function () {
							confirmDialog[1](null);
							commitStructure({ apis: [] }, function (d) { d.apis = []; return d; }, function () { showToast('success', t('cardsDeletedAll'), ''); });
						}
					});
				}
			function deleteClick(id) {
				if (confirmDel[0] !== id) { confirmDel[1](id); return; }
				confirmDel[1](null);
				deleteCard(id);
				menuOpen[1](null);
			}
			function toggleVlm() {
				var v = draft[0].vlmEnabled !== false ? false : true;
				updateDraft(function (d) { d.vlmEnabled = v; return d; });
				saveState[1]("saving");
				queueSave({ vlmEnabled: v });
				Promise.resolve().then(function () { saveState[1]("recent"); });
			}

			function toggleImggen() {
				var v = draft[0].imggenEnabled !== true ? true : false;
				updateDraft(function (d) { d.imggenEnabled = v; return d; });
				saveState[1]("saving");
				queueSave({ imggenEnabled: v });
				Promise.resolve().then(function () { saveState[1]("recent"); });
			}

			// v2.8: video module switch (default OFF — tool/schema injected only when ON)
			function toggleVideo() {
				var v = draft[0].videoEnabled === true ? false : true;
				updateDraft(function (d) { d.videoEnabled = v; return d; });
				saveState[1]("saving");
				queueSave({ videoEnabled: v });
				Promise.resolve().then(function () { saveState[1]("recent"); });
			}
			// v2.8.1: voice module switch
			function toggleVoice() {
				var v = draft[0].voiceEnabled === true ? false : true;
				updateDraft(function (d) { d.voiceEnabled = v; return d; });
				saveState[1]("saving");
				queueSave({ voiceEnabled: v });
				Promise.resolve().then(function () { saveState[1]("recent"); });
			}

			function toggleTools() {
				var v = draft[0].visionToolsEnabled !== false ? false : true;
				updateDraft(function (d) { d.visionToolsEnabled = v; return d; });
				saveState[1]("saving");
				queueSave({ visionToolsEnabled: v });
				Promise.resolve().then(function () { saveState[1]("recent"); });
			}

			function patchRetry(value) {
				updateDraft(function (d) { d.retryCount = Number(value) || 5; return d; });
				saveState[1]("saving");
				queueSave({ retryCount: Number(value) || 5 });
				Promise.resolve().then(function () { saveState[1]("recent"); });
			}

			function patchFallback(field, value) {
				updateDraft(function (d) { d.fallbackConfig = Object.assign({}, d.fallbackConfig, { [field]: value }); return d; });
				saveState[1]("saving");
				queueSave({ fallbackConfig: { field: field, value: value } });
				Promise.resolve().then(function () { saveState[1]("recent"); });
			}
			function patchGlobal(field, value) {
				updateDraft(function (d) { d.globalConfig = Object.assign({}, d.globalConfig, { [field]: value }); return d; });
				saveState[1]("saving");
				queueSave({ globalConfig: { field: field, value: value } });
				Promise.resolve().then(function () { saveState[1]("recent"); });
			}
			function changeFallbackProvider(v) {
				var defaults = ["Qwen3.5-397B-A17B", "Qwen2.5-VL-72B-Instruct", "Qwen3.6-27B", "Mistral-Small-3.2-24B-Instruct-2506", "Qwen3.5-9B"];
				commitStructure({ fallbackConfig: { field: "provider", value: v } }, function (d) {
					if (!d.fallbackConfig) d.fallbackConfig = {};
					d.fallbackConfig.provider = v;
					var curModels = d.fallbackConfig.models || [];
					var isOvhDefaults = curModels.length > 0 && curModels.every(function (m) { return defaults.indexOf(m) >= 0; });
					if (curModels.length === 0 || isOvhDefaults) {
						d.fallbackConfig.models = defaults;
					}
					return d;
				});
				fbModels[1]([]);
				fbOpenDd[1](false);
			}
			function fetchFallbackModels() {
				fbBusy[1]("fb-mdl");
				var fbProv = draft[0].fallbackConfig && draft[0].fallbackConfig.provider || "ovhcloud";
				var defaults = ["Qwen3.5-397B-A17B", "Qwen2.5-VL-72B-Instruct", "Qwen3.6-27B", "Mistral-Small-3.2-24B-Instruct-2506", "Qwen3.5-9B"];
				call("models", { fallback: true, provider: fbProv }).then(function (r) {
					if (r && r.ok && (r.models || []).length > 0) {
						fbModels[1](r.models || []);
					} else {
						fbModels[1](defaults);
					}
					fbOpenDd[1](true);
				}).catch(function (e) {
					fbModels[1](defaults);
					fbOpenDd[1](true);
				}).finally(function () { fbBusy[1](""); });
			}
			function setFbSearch(v) { fbSearch[1](v); }
			function pickFallbackModel(m) {
				queueSave({ fallbackConfig: { field: "addModel", value: m } });
				updateDraft(function (d) {
					if (d.fallbackConfig) {
						d.fallbackConfig.models = d.fallbackConfig.models || [];
						if (!d.fallbackConfig.models.includes(m)) d.fallbackConfig.models.push(m);
					}
					return d;
				});
				fbOpenDd[1](false);
				saveState[1]("saving"); Promise.resolve().then(function () { saveState[1]("recent"); });
			}
			function removeFallbackModel(m) {
				queueSave({ fallbackConfig: { field: "removeModel", value: m } });
				updateDraft(function (d) { if (d.fallbackConfig) d.fallbackConfig.models = (d.fallbackConfig.models || []).filter(function (x) { return x !== m; }); return d; });
				saveState[1]("saving"); Promise.resolve().then(function () { saveState[1]("recent"); });
			}

			// ---------- mirror card handlers ----------
			// v1.9-fix: use commitStructure (immediate POST + response sync) for
			// all mirror operations except updateMirrorName (text input, debounced).
			// This avoids mergePatch swallowing { field, value } patches.
			function patchMirror(field, value) {
				commitStructure({ mirrorConfig: { field: field, value: value } }, function (d) {
					if (!d.mirrorConfig) d.mirrorConfig = { autoVisionEnabled: true, mirrorAllEnabled: false, mappings: [] };
					d.mirrorConfig[field] = value;
					return d;
				});
			}
			function fetchAllModels() {
				mirrorBusy[1]("mirror-mdl");
				call("all-models", {}).then(function (r) {
					mirrorAllModels[1](r && r.ok && Array.isArray(r.groups) ? r.groups : []);
				}).catch(function () { mirrorAllModels[1]([]); }).finally(function () { mirrorBusy[1](""); });
			}
			function addMirrorMapping() {
				commitStructure({ mirrorConfig: { field: "addMapping", value: { originalProvider: "", originalModel: "", mirrorName: "" } } }, function (d) {
					if (!d.mirrorConfig) d.mirrorConfig = { autoVisionEnabled: true, mirrorAllEnabled: false, mappings: [] };
					d.mirrorConfig.mappings = d.mirrorConfig.mappings || [];
					d.mirrorConfig.mappings.push({ id: "m_temp", originalProvider: "", originalModel: "", mirrorName: "" });
					return d;
				}, function () { showToast('success', t('mappingAdded'), ''); });
			}
			function removeMirrorMapping(id) {
				commitStructure({ mirrorConfig: { field: "removeMapping", value: id } }, function (d) {
					if (d.mirrorConfig) d.mirrorConfig.mappings = (d.mirrorConfig.mappings || []).filter(function (m) { return m.id !== id; });
					return d;
				}, function () { showToast('success', t('mappingRemoved'), ''); });
			}
			function selectMirrorModel(id, provider, model) {
				commitStructure({ mirrorConfig: { field: "updateMapping", value: { id: id, originalProvider: provider, originalModel: model } } }, function (d) {
					if (d.mirrorConfig && d.mirrorConfig.mappings) {
						d.mirrorConfig.mappings = d.mirrorConfig.mappings.map(function (m) {
							return m.id === id ? Object.assign({}, m, { originalProvider: provider, originalModel: model }) : m;
						});
					}
					return d;
				});
				mirrorOpenDd[1](null);
			}
			function updateMirrorName(id, value) {
				updateDraft(function (d) {
					if (d.mirrorConfig && d.mirrorConfig.mappings) {
						d.mirrorConfig.mappings = d.mirrorConfig.mappings.map(function (m) {
							return m.id === id ? Object.assign({}, m, { mirrorName: value }) : m;
						});
					}
					return d;
				});
				saveState[1]("saving");
				queueSave({ mirrorConfig: { field: "updateMapping", value: { id: id, mirrorName: value } } });
				Promise.resolve().then(function () { saveState[1]("recent"); });
			}
			function toggleMirrorDd(id) {
				var next = mirrorOpenDd[0] === id ? null : id;
				if (next !== null && mirrorAllModels[0].length === 0 && mirrorBusy[0] === "") {
					fetchAllModels();
				}
				mirrorOpenDd[1](next);
			}

			function saveKey(id, value) {
				keyDraft[1](function (k) { return Object.assign({}, k, { [id]: value }); });
				if (String(value || "").length === 0) return;
				saveState[1]("saving");
				queueSave({ patchCard: { id: id, field: "apiKey", value: value } });
				Promise.resolve().then(function () { saveState[1]("recent"); });
			}

			function toggleReveal(id) {
				var card = (draft[0].apis || []).find(function (c) { return c.id === id; });
				var willShow = !revealed[0][id];
				if (willShow && !keyDraft[0][id] && card && card.apiKeySet) {
					call("key", { cardId: id }).then(function (r) {
						if (r && r.ok) {
							keyDraft[1](function (k) { return Object.assign({}, k, { [id]: r.apiKey || "" }); });
						}
					}).catch(function () {});
				}
				if (!willShow) {
					// Hidden: clear the draft so the "已设置" placeholder shows again (not dots)
					keyDraft[1](function (k) { var n = Object.assign({}, k); n[id] = ""; return n; });
				}
				revealed[1](function (r) { var n = Object.assign({}, r); n[id] = willShow; return n; });
			}

			function toggleDd(id) {
				var next = openDd[0] === id ? null : id;
				openDd[1](next);
				// v2.8: 打开下拉但该卡模型列表尚未拉取 → 自动触发获取
				if (next !== null && !(models[0][id] && models[0][id].length > 0)) {
					fetchModels(id);
				}
			}
			function pickModel(id, m) {
				patchCard(id, "model", m);
				openDd[1](null);
			}

			function fetchModels(id) {
				var card = draft[0].apis.find(function (c) { return c.id === id; });
				if (!card) return;
				busy[1]("mdl-" + id);
				setMsg("", false);
				call("models", {
					cardId: id,
					endpoint: card.endpoint || undefined,
					apiKey: keyDraft[0][id] || undefined,
					protocol: card.protocol,
					provider: card.provider
				}).then(function (r) {
					if (r && r.ok) {
						models[1](function (m) { return Object.assign({}, m, { [id]: r.models || [] }); });
						modelCount[1]({ cardId: id, count: (r.models || []).length });
						showToast('success', t('fetchOkPrefix') + (r.models || []).length + t('fetchOkSuffix'), '');
						if ((r.models || []).length > 0) openDd[1](id); // auto-open dropdown
					} else {
						setMsg(t("fetchFail") + (r && r.error ? r.error : t("unknown")), true);
						showToast('error', t("fetchFail"), (r && r.error) || t("unknown"));
					}
				}).catch(function (e) { setMsg(t("fetchFail") + et(e), true); showToast('error', t("fetchFail"), et(e)); }).finally(function () { busy[1](""); });
			}

			// ---- v2.11: per-card video handlers (replaces old flat-form handlers) ----
			function patchVideoCard(cardId, field, value) {
				updateDraft(function (d) { var card = (d.videoCards || []).find(function (c) { return c.id === cardId; }); if (card) { if (field === "enabled") card.enabled = value !== false; else if (field === "collapsed") card.collapsed = value === true; else if (field === "name") card.name = String(value || "").slice(0, 60); else { card.config = card.config || {}; card.config[field] = value; } } return d; });
				if (field === "apiKey" && String(value || "").length === 0) return;
				saveState[1]("saving"); queueSave({ videoCardPatch: { id: cardId, field: field, value: value } }); Promise.resolve().then(function () { saveState[1]("recent"); });
			}
			function saveVideoCardKey(cardId, value) { vcKeyDraft[1](Object.assign({}, vcKeyDraft[0], { [cardId]: value })); if (String(value || "").length === 0) return; updateDraft(function (d) { var card = (d.videoCards || []).find(function (c) { return c.id === cardId; }); if (card) { card.config = card.config || {}; card.config.apiKeySet = true; } return d; }); saveState[1]("saving"); queueSave({ videoCardPatch: { id: cardId, field: "apiKey", value: value } }); Promise.resolve().then(function () { saveState[1]("recent"); }); }
			function toggleVideoCardReveal(cardId) { var cur = !!vcRevealed[0][cardId]; var willShow = !cur; var card = (draft[0].videoCards || []).find(function (c) { return c.id === cardId; }); var cfg = (card && card.config) || {}; if (willShow && !vcKeyDraft[0][cardId] && cfg.apiKeySet) { call("key", { video: true, cardId: cardId }).then(function (r) { if (r && r.ok) vcKeyDraft[1](Object.assign({}, vcKeyDraft[0], { [cardId]: r.apiKey || "" })); }).catch(function () {}); } if (!willShow) vcKeyDraft[1](Object.assign({}, vcKeyDraft[0], { [cardId]: "" })); vcRevealed[1](Object.assign({}, vcRevealed[0], { [cardId]: willShow })); }
			function fetchVideoCardModels(cardId) { var card = (draft[0].videoCards || []).find(function (c) { return c.id === cardId; }); var cfg = (card && card.config) || {}; vcBusy[1](Object.assign({}, vcBusy[0], { [cardId]: "video-mdl" })); vcModelList[1](Object.assign({}, vcModelList[0], { [cardId]: [] })); setMsg("", false); call("models", { video: true, cardId: cardId, endpoint: cfg.endpoint || undefined, protocol: cfg.protocol, apiKey: vcKeyDraft[0][cardId] || undefined }).then(function (r) { if (r && r.ok && Array.isArray(r.models) && r.models.length > 0) { vcModelList[1](Object.assign({}, vcModelList[0], { [cardId]: r.models })); vcModelCount[1](Object.assign({}, vcModelCount[0], { [cardId]: r.models.length })); vcOpenDd[1](Object.assign({}, vcOpenDd[0], { [cardId]: true })); showToast('success', t('fetchOkPrefix') + r.models.length + t('fetchOkSuffix'), ''); } else { vcModelCount[1](Object.assign({}, vcModelCount[0], { [cardId]: null })); setMsg(t("fetchFail") + (r && r.error ? r.error : t("unknown")), true); showToast('error', t("fetchFail"), (r && r.error) || t("unknown")); } }).catch(function (e) { setMsg(t("fetchFail") + et(e), true); showToast('error', t("fetchFail"), et(e)); }).finally(function () { vcBusy[1](Object.assign({}, vcBusy[0], { [cardId]: "" })); }); }
			function pickVideoCardModel(cardId, m) { patchVideoCard(cardId, "model", m); vcOpenDd[1](Object.assign({}, vcOpenDd[0], { [cardId]: false })); }
			function changeVideoCardProvider(cardId, v) { if (!VIDEO_PROVIDERS_UI[v]) return; patchVideoCard(cardId, "provider", v); vcModelList[1](Object.assign({}, vcModelList[0], { [cardId]: [] })); }
			function toggleVideoCardDd(cardId) { var cur = !!vcOpenDd[0][cardId]; vcOpenDd[1](Object.assign({}, vcOpenDd[0], { [cardId]: !cur })); if (!cur && (!vcModelList[0][cardId] || vcModelList[0][cardId].length === 0)) fetchVideoCardModels(cardId); }
			function toggleVideoCardProv(cardId) { var cur = !!vcOpenProv[0][cardId]; vcOpenProv[1](Object.assign({}, vcOpenProv[0], { [cardId]: !cur })); }
			function toggleVideoCardFilter(cardId) { var card = (draft[0].videoCards || []).find(function (c) { return c.id === cardId; }); var cfg = (card && card.config) || {}; patchVideoCard(cardId, "filterVideoModels", !(cfg.filterVideoModels !== false)); }
			function deleteVideoCardClick(cardId) { if (vcConfirmDel[0] !== cardId) { vcConfirmDel[1](cardId); return; } vcConfirmDel[1](null); vcMenuOpen[1](null); commitStructure({ videoCardDelete: cardId }, function (d) { d.videoCards = (d.videoCards || []).filter(function (c) { return c.id !== cardId; }); return d; }, function () { showToast('success', t('cardDeleted'), ''); }); }
			function resetVideoCard(cardId) { if (vcConfirmReset[0] !== cardId) { vcConfirmReset[1](cardId); return; } vcConfirmReset[1](null); commitStructure({ videoReset: { cardId: cardId } }, null, function () { showToast('success', t('resetDone'), ''); }); }
			function toggleVideoCardMenu(cardId) { vcMenuOpen[1](vcMenuOpen[0] === cardId ? null : cardId); vcConfirmDel[1](null); }
			function saveVideoCardPreset(cardId) { commitStructure({ saveVideoCardPreset: { cardId: cardId } }, null, function () { forgetBaselineScope("video|" + cardId); showToast('success', t('presetSaved'), ''); }); }
			function switchVideoCardPreset(cardId, presetId) { vcPresetDdOpen[1](Object.assign({}, vcPresetDdOpen[0], { [cardId]: false })); commitStructure({ videoCardPresetSwitch: { cardId: cardId, presetId: presetId } }, null, function () { forgetBaselineScope("video|" + cardId); showToast('success', t('presetSwitched'), ''); }); }
			function addVideoCardPreset(cardId) { vcPresetDdOpen[1](Object.assign({}, vcPresetDdOpen[0], { [cardId]: false })); commitStructure({ videoCardPresetAdd: { cardId: cardId } }, null, function () { forgetBaselineScope("video|" + cardId); showToast('success', t('presetAdded'), ''); }); }
			function deleteVideoCardPreset(cardId, presetId) { vcPresetDeleteConfirm[1](null); commitStructure({ videoCardPresetDelete: { cardId: cardId, presetId: presetId } }, null, function () { forgetBaselineScope("video|" + cardId); showToast('success', t('presetDeleted'), ''); }); }
			function renameVideoCardPreset(cardId, name) { queueSave({ videoCardPresetRename: { cardId: cardId, name: name } }); updateDraft(function (d) { var card = (d.videoCards || []).find(function (c) { return c.id === cardId; }); if (card) { d.videoPresets = (d.videoPresets || []).map(function (p) { if (p.id === card.activePreset) return Object.assign({}, p, { name: String(name).slice(0, 60) }); return p; }); } return d; }); }
			function toggleVideoCardPresetDd(cardId) { var cur = !!vcPresetDdOpen[0][cardId]; vcPresetDdOpen[1](Object.assign({}, vcPresetDdOpen[0], { [cardId]: !cur })); }
			function batchVideoCollapse(all) { vcBatchOpen[1](false); commitStructure({ videoCards: (draft[0].videoCards || []).map(function (c) { return Object.assign({}, c, { collapsed: all }); }) }, function (d) { d.videoCards = (d.videoCards || []).map(function (c) { return Object.assign({}, c, { collapsed: all }); }); return d; }, function () { showToast('success', all ? t('cardsCollapsedAll') : t('cardsExpandedAll'), ''); }); }
			function batchVideoDeleteAll() { commitStructure({ videoCards: [] }, function (d) { d.videoCards = []; return d; }, function () { showToast('success', t('cardsDeletedAll'), ''); }); }
			// ---- voice field patch: local update + debounced save (v2.8.1) ----
			function patchVoice(field, value) {
				updateDraft(function (d) {
					d.voiceConfig = Object.assign({}, d.voiceConfig || {}, { [field]: value });
					return d;
				});
				if (field === "apiKey" && String(value || "").length === 0) return;
				saveState[1]("saving");
				queueSave({ voiceConfig: { field: field, value: value } });
				Promise.resolve().then(function () { saveState[1]("recent"); });
			}
			function saveVoiceKey(value) {
				voiceKeyDraft[1](value);
				if (String(value || "").length === 0) return;
				saveState[1]("saving");
				queueSave({ voiceConfig: { field: "apiKey", value: value } });
				Promise.resolve().then(function () { saveState[1]("recent"); });
			}
			function toggleVoiceReveal() {
				var willShow = !voiceRevealed[0];
				var curVc = draft[0].voiceConfig || {};
				if (willShow && !voiceKeyDraft[0] && curVc.apiKeySet) {
					call("key", { voice: true }).then(function (r) {
						if (r && r.ok) voiceKeyDraft[1](r.apiKey || "");
					}).catch(function () {});
				}
				if (!willShow) voiceKeyDraft[1]("");
				voiceRevealed[1](willShow);
			}
				function fetchVoiceModels() {
					var vc = draft[0].voiceConfig || {};
					var p = vc.provider;
					if (p === "mimo") {
						var ms = ["mimo-v2.5-tts", "mimo-v2.5-tts-voicedesign", "mimo-v2.5-tts-voiceclone"];
						voiceModelList[1](ms);
						voiceModelCount[1](ms.length);
						voiceOpenDd[1](true);
						voiceVoiceList[1](MIMO_PRESET_VOICES.map(function (v) { return { id: v, name: v }; }));
						showToast('success', t('fetchOkPrefix') + ms.length + t('fetchOkSuffix'), '');
						return;
					}
					if (p === "doubao") {
						var dbModels = ["seed-tts-2.0", "seed-icl-2.0", "seed-icl-1.0"];
						voiceModelList[1](dbModels);
						voiceModelCount[1](dbModels.length);
						voiceOpenDd[1](true);
						voiceVoiceList[1](DOUBAO_PRESET_VOICES);
						showToast('success', t('fetchOkPrefix') + dbModels.length + t('fetchOkSuffix'), '');
						return;
					}
					if (p === "gptsovits") { return; }
					var mmModels = ["speech-2.8-hd", "speech-2.8-turbo", "speech-2.6-hd", "speech-2.6-turbo", "speech-01-hd", "speech-01-turbo"];
					voiceBusy[1]("voice-mdl");
					voiceModelList[1]([]);
					voiceVoiceList[1]([]);
					setMsg("", false);
					call("models", {
						voice: true,
						endpoint: vc.endpoint || undefined,
						apiKey: voiceKeyDraft[0] || undefined
					}).then(function (r) {
						if (r && r.ok) {
							if (p === "minimax") {
								voiceModelList[1](mmModels);
								voiceOpenDd[1](true);
							}
							if (r.voices && Array.isArray(r.voices) && r.voices.length > 0) {
								voiceVoiceList[1](r.voices);
								voiceModelCount[1](r.voices.length);
								showToast('success', t('fetchOkPrefix') + r.voices.length + t('fetchOkSuffix'), '');
							} else if (r.models && Array.isArray(r.models) && r.models.length > 0) {
								voiceModelList[1](r.models);
								voiceModelCount[1](r.models.length);
								voiceOpenDd[1](true);
								showToast('success', t('fetchOkPrefix') + r.models.length + t('fetchOkSuffix'), '');
							} else if (p === "minimax") {
								voiceModelCount[1](mmModels.length);
								showToast('success', t('fetchOkPrefix') + mmModels.length + t('fetchOkSuffix'), '');
							} else {
								voiceModelCount[1](null);
								setMsg(t("fetchFail") + (r && r.error ? r.error : t("unknown")), true);
							}
						} else {
							if (p === "minimax") {
								voiceModelList[1](mmModels);
								voiceOpenDd[1](true);
								voiceModelCount[1](mmModels.length);
							} else {
								voiceModelCount[1](null);
							}
							setMsg(t("fetchFail") + (r && r.error ? r.error : t("unknown")), true);
							showToast('error', t("fetchFail"), (r && r.error) || t("unknown"));
						}
					}).catch(function (e) { setMsg(t("fetchFail") + et(e), true); showToast('error', t("fetchFail"), et(e)); }).finally(function () { voiceBusy[1](""); });
				}

			function pickVoiceModel(m) {
				patchVoice("model", m);
				voiceOpenDd[1](false);
			}
		function toggleVoiceFilter() {
			patchVoice("filterVoiceModels", !((draft[0].voiceConfig || {}).filterVoiceModels !== false));
		}
		// v2.9.2: local reference-audio library (参考音频 row) handlers
		function fetchVoiceLibrary() {
			call("voice-library", { list: true }).then(function (r) { if (r && r.ok) voiceRefLibrary[1](r.library || []); }).catch(function () {});
		}
		function toggleRefDd() { voiceRefDdOpen[1](!voiceRefDdOpen[0]); }
		function selectRefAudio(entry) {
			if (entry && entry.path) patchVoice("voiceSamplePath", entry.path);
			voiceRefDdOpen[1](false);
		}
		function startRefUpload(file) {
			if (!file) return;
			var reader = new FileReader();
			reader.onload = function () {
				var dataUrl = String(reader.result || "");
				var comma = dataUrl.indexOf(",");
				var head = comma >= 0 ? dataUrl.slice(0, comma) : "";
				var base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
				var mime = "audio/wav";
				var m = head.match(/data:([^;]+)/); if (m) mime = m[1];
				var baseName = String(file.name || "reference").replace(/\.[^.]+$/, "");
				voiceRefNameDraft[1](baseName);
				voiceRefUploadPending[1]({ name: baseName, base64: base64, mime: mime });
			};
			reader.onerror = function () { showToast('error', t('voiceRefAudioUploadFail'), t('unknown')); };
			reader.readAsDataURL(file);
		}
		function confirmRefUpload() {
			var p = voiceRefUploadPending[0];
			if (!p) return;
			var name = String(voiceRefNameDraft[0] || p.name || "reference").trim() || "reference";
			voiceRefUploadBusy[1](true);
			call("voice-library", { base64: p.base64, mime: p.mime, name: name }).then(function (r) {
				if (r && r.ok && r.entry) {
					voiceRefLibrary[1](r.library || []);
					patchVoice("voiceSamplePath", r.entry.path);
					showToast('success', t('voiceRefAudioUploadOk'), r.entry.name);
					voiceRefUploadPending[1](null);
					voiceRefNameDraft[1]("");
					voiceRefDdOpen[1](false);
				} else {
					showToast('error', t('voiceRefAudioUploadFail'), (r && r.error) || t('unknown'));
				}
			}).catch(function (e) { showToast('error', t('voiceRefAudioUploadFail'), et(e)); }).finally(function () { voiceRefUploadBusy[1](false); });
		}
		function cancelRefUpload() { voiceRefUploadPending[1](null); voiceRefNameDraft[1](""); }
		function requestRefDelete(name) { voiceRefDeleteName[1](name); }
		function cancelRefDelete() { voiceRefDeleteName[1](null); }
		function confirmRefDelete() {
			var name = voiceRefDeleteName[0];
			if (!name) return;
			voiceRefUploadBusy[1](true);
			call("voice-library", { delete: name }).then(function (r) {
				if (r && r.ok) {
					var newLib = r.library || [];
					voiceRefLibrary[1](newLib);
					var vc = draft[0].voiceConfig || {};
					if (vc.voiceSamplePath && !newLib.some(function (e) { return e.path === vc.voiceSamplePath; })) patchVoice("voiceSamplePath", "");
					showToast('success', t('voiceRefAudioDeleteOk'), name);
				} else {
					showToast('error', t('voiceRefAudioUploadFail'), (r && r.error) || t('unknown'));
				}
			}).catch(function (e) { showToast('error', t('voiceRefAudioUploadFail'), et(e)); }).finally(function () { voiceRefUploadBusy[1](false); voiceRefDeleteName[1](null); });
		}
		function renameRefAudio(from, to) {
			if (!from || !to || from === to) return;
			voiceRefUploadBusy[1](true);
			call("voice-library", { rename: { from: from, to: to } }).then(function (r) {
				if (r && r.ok) {
					var newLib = r.library || [];
					voiceRefLibrary[1](newLib);
					var vc = draft[0].voiceConfig || {};
					if (r.entry && r.entry.path && vc.voiceSamplePath === (voiceRefLibrary[0].find(function (e) { return e.name === from; }) || {}).path) {
						patchVoice("voiceSamplePath", r.entry.path);
					}
					showToast('success', t('voiceRefAudioRenameOk'), to);
				} else {
					showToast('error', t('voiceRefAudioUploadFail'), (r && r.error) || t('unknown'));
				}
			}).catch(function (e) { showToast('error', t('voiceRefAudioUploadFail'), et(e)); }).finally(function () { voiceRefUploadBusy[1](false); });
		}
		function triggerRefUpload() { if (refFileInput.current) refFileInput.current.click(); }
		function onRefFileChange(e) {
			var f = e && e.target && e.target.files && e.target.files[0];
			if (f) startRefUpload(f);
			if (e && e.target) e.target.value = "";
		}
		// v2.9.3: minimax clone (panel) — POST /omni/minimax/clone {base64, mime, voice_id} → auto-select voice_id
		// v2.9.6: also accepts {ref_audio_path, voice_id} (voice-library entry picked from the dropdown).
		function onMinimaxClone(payload) {
			if (!payload || !payload.voice_id) return;
			if (!payload.ref_audio_path && !payload.base64) return;
			voiceCloneBusy[1](true);
			call("minimax/clone", {
				base64: payload.base64, mime: payload.mime,
				ref_audio_path: payload.ref_audio_path,
				voice_id: payload.voice_id
			}).then(function (r) {
				if (r && r.ok && r.voice_id) {
					patchVoice("voiceId", r.voice_id);
					showToast('success', t('voiceCloneOk'), r.voice_id);
				} else {
					showToast('error', t('voiceCloneFail'), (r && r.error) || t('unknown'));
				}
			}).catch(function (e) { showToast('error', t('voiceCloneFail'), et(e)); }).finally(function () { voiceCloneBusy[1](false); });
		}
		// v2.9.8: doubao clone (panel) — POST /omni/doubao/clone {base64, mime, voice_id} → poll → speaker_id
		function onDoubaoClone(payload) {
			if (!payload || !payload.voice_id) return;
			if (!payload.base64 && !payload.ref_audio_path) return;
			voiceCloneBusy[1](true);
			call("doubao/clone", {
				base64: payload.base64, mime: payload.mime,
				ref_audio_path: payload.ref_audio_path,
				voice_id: payload.voice_id
			}).then(function (r) {
				if (r && r.ok && (r.status === 2 || r.status === 4)) {
					patchVoice("voiceId", r.speaker_id);
					showToast('success', t('voiceDoubaoCloneOk'), r.speaker_id);
				} else if (r && r.ok) {
					showToast('warning', t('voiceDoubaoCloneTraining'), (r && r.error) || '');
				} else {
					showToast('error', t('voiceDoubaoCloneFail'), (r && r.error) || t('unknown'));
				}
			}).catch(function (e) { showToast('error', t('voiceDoubaoCloneFail'), et(e)); }).finally(function () { voiceCloneBusy[1](false); });
		}
		// v2.9.9: doubao clone preset handlers
		function onDoubaoClonePresetSwitch(id) {
			commitStructure({ doubaoClonePresetSwitch: id }, function (d) { d.activeDoubaoClonePreset = id; return d; });
		}
		function onDoubaoClonePresetAdd() {
			var newId = 'dcp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4);
			var newName = '新预设 ' + ((draft[0].doubaoClonePresets || []).length + 1);
			// v2.9.11: copy appId/accessToken from current active preset
			var cur = (draft[0].doubaoClonePresets || []).find(function(p) { return p.id === draft[0].activeDoubaoClonePreset; }) || {};
			commitStructure({ doubaoClonePresetAdd: true }, function (d) {
				d.doubaoClonePresets = (d.doubaoClonePresets || []).concat([{ id: newId, name: newName, speakerId: '', refAudioPath: '', cloneModel: 'seed-icl-2.0', appId: cur.appId || '', accessToken: cur.accessToken || '', apiKey: cur.apiKey || '', apiVersion: cur.apiVersion || 'v1' }]);
				d.activeDoubaoClonePreset = newId;
				return d;
			});
		}
		function onDoubaoClonePresetDelete() {
			var presets = draft[0].doubaoClonePresets || [];
			var activeId = draft[0].activeDoubaoClonePreset;
			if (presets.length <= 1) return;
			commitStructure({ doubaoClonePresetDelete: activeId }, function (d) {
				d.doubaoClonePresets = (d.doubaoClonePresets || []).filter(function (p) { return p.id !== activeId; });
				if (d.doubaoClonePresets.length > 0 && !d.doubaoClonePresets.some(function (p) { return p.id === d.activeDoubaoClonePreset; })) d.activeDoubaoClonePreset = d.doubaoClonePresets[0].id;
				return d;
			});
		}
		function onDoubaoClonePresetRename(name) {
			queueSave({ doubaoClonePresetRename: name });
			updateDraft(function (d) { var dcp = (d.doubaoClonePresets || []).find(function (p) { return p.id === d.activeDoubaoClonePreset; }); if (dcp) dcp.name = String(name).slice(0, 60); return d; });
		}
		function onDoubaoClonePresetPatch(fields) {
			queueSave({ doubaoClonePresetPatch: fields });
			updateDraft(function (d) { var dcp = (d.doubaoClonePresets || []).find(function (p) { return p.id === d.activeDoubaoClonePreset; }); if (dcp) { if (typeof fields.speakerId === 'string') dcp.speakerId = fields.speakerId; if (typeof fields.refAudioPath === 'string') dcp.refAudioPath = fields.refAudioPath; if (typeof fields.cloneModel === 'string') dcp.cloneModel = fields.cloneModel; if (typeof fields.appId === 'string') dcp.appId = fields.appId; if (typeof fields.accessToken === 'string') dcp.accessToken = fields.accessToken; if (typeof fields.apiVersion === 'string') dcp.apiVersion = fields.apiVersion; } return d; });
		}
				function changeVoiceProvider(v) {
					if (!VOICE_PROVIDERS_UI[v]) return;
					patchVoice("provider", v);
					// v2.9.7: reset voiceId to provider default (except minimax — preserve cloned voice_id)
					// v2.10: also reset model for local providers (isVoiceConfigValid requires non-empty model)
					if (v !== "minimax") {
						var defaultVid = v === "mimo" ? "mimo_default"
							: v === "doubao" ? "zh_female_vv_uranus_bigtts"
							: "";
						// v2.10: indextts/voxcpm need a placeholder model to pass isVoiceConfigValid
						var defaultModel = v === "indextts" ? "default"
							: v === "voxcpm" ? "default"
							: "";
						updateDraft(function (d) {
							d.voiceConfig = Object.assign({}, d.voiceConfig || {}, { voiceId: defaultVid, model: defaultModel || d.voiceConfig?.model || "" });
							return d;
						});
					}
					voiceModelList[1]([]);
					voiceVoiceList[1]([]);
					voiceModelCount[1](null);
					voiceOpenDd[1](false);
					voiceKeyDraft[1]("");
					voiceRevealed[1](false);
				}

			function resetVoice() {
				if (!voiceConfirmReset[0]) { voiceConfirmReset[1](true); return; }
				voiceConfirmReset[1](false);
				voiceModelList[1]([]);
				voiceModelCount[1](null);
				voiceKeyDraft[1]("");
				voiceRevealed[1](false);
				commitStructure({ voiceReset: true }, function (d) { d.voiceConfig = null; return d; }, function () { showToast('success', t('resetDone'), ''); });
			}
			// ---- voice preset management (v2.8.1, v2.9.1 subtab-namespaced) ----
			function switchVoicePreset(id, sub) {
				voicePresetDdOpen[1](false);
				voiceKeyDraft[1]("");
				voiceRevealed[1](false);
				voiceModelList[1]([]);
				voiceModelCount[1](null);
				commitStructure({ voicePresetSwitch: id, voiceSubtab: sub === "stt" ? "stt" : "tts" }, null, function () { forgetBaseline(dirtyKey("voice", (sub === "stt" ? "stt" : "tts") + "|" + id)); showToast('success', t('presetSwitched'), ''); });
			}
			function addVoicePreset(sub) {
				voicePresetDdOpen[1](false);
				voiceKeyDraft[1]("");
				voiceRevealed[1](false);
				voiceModelList[1]([]);
				voiceModelCount[1](null);
				commitStructure({ voicePresetAdd: true, voiceSubtab: sub === "stt" ? "stt" : "tts" }, null, function () { forgetBaselineScope("voice|" + (sub === "stt" ? "stt" : "tts")); showToast('success', t('presetAdded'), ''); });
			}
			function deleteVoicePreset(id, sub) {
				voicePresetDeleteConfirm[1](false);
				voiceKeyDraft[1]("");
				voiceRevealed[1](false);
				voiceModelList[1]([]);
				voiceModelCount[1](null);
				commitStructure({ voicePresetDelete: id, voiceSubtab: sub === "stt" ? "stt" : "tts" }, null, function () { forgetBaselineScope("voice|" + (sub === "stt" ? "stt" : "tts")); showToast('success', t('presetDeleted'), ''); });
			}
		function renameVoicePreset(name, sub) {
			var vpKey = sub === "stt" ? "voicePresetsStt" : "voicePresets";
			var vaKey = sub === "stt" ? "activeVoicePresetStt" : "activeVoicePreset";
			queueSave({ voicePresetRename: name, voiceSubtab: sub === "stt" ? "stt" : "tts" });
			updateDraft(function (d) {
				var vp = (d[vpKey] || []).find(function (p) { return p.id === d[vaKey]; });
				if (vp) vp.name = String(name).slice(0, 60);
			return d;
		});
	}
	function saveVoicePreset(sub) {
		commitStructure({ saveVoicePreset: sub === "stt" ? "stt" : "tts" }, null, function () { forgetBaselineScope("voice|" + (sub === "stt" ? "stt" : "tts")); showToast('success', t('presetSaved'), ''); });
	}
			function toggleVoicePresetDd() {
				voicePresetDdOpen[1](!voicePresetDdOpen[0]);
			}

			// ---- imggen field patch: local update + debounced save ----
			function patchImggen(field, value) {
				updateDraft(function (d) {
					d.imggenConfig = Object.assign({}, d.imggenConfig, { [field]: value });
					return d;
				});
				if (field === "apiKey" && String(value || "").length === 0) return;
				saveState[1]("saving");
				queueSave({ imggenConfig: { field: field, value: value } });
				Promise.resolve().then(function () { saveState[1]("recent"); });
			}
			function saveImggenKey(value) {
				igKeyDraft[1](value);
				if (String(value || "").length === 0) return;
				saveState[1]("saving");
				queueSave({ imggenConfig: { field: "apiKey", value: value } });
				Promise.resolve().then(function () { saveState[1]("recent"); });
			}
			function toggleIgReveal() {
				var willShow = !igRevealed[0];
				if (willShow && !igKeyDraft[0] && igc.apiKeySet) {
					call("key", { imggen: true }).then(function (r) {
						if (r && r.ok) igKeyDraft[1](r.apiKey || "");
					}).catch(function () {});
				}
				if (!willShow) igKeyDraft[1]("");
				igRevealed[1](willShow);
			}
			function fetchImggenModels() {
				igBusy[1]("ig-mdl");
				igModelList[1]([]);
				igUnetList[1]([]);
				igVaeList[1]([]);
				igClipList[1]([]);
				setMsg("", false);
				call("models", {
					imggen: true,
					endpoint: igc.endpoint || undefined,
					protocol: igc.protocol,
					apiKey: igKeyDraft[0] || undefined
				}).then(function (r) {
				if (r && r.ok) {
					var fetchedModels = r.models || [];
					// v2.9.15: ComfyUI returns checkpoints + unet + vae + clip; count all for toast/status
					var totalCount = fetchedModels.length + (r.unet||[]).length + (r.vae||[]).length + (r.clip||[]).length;
					igModelList[1](fetchedModels);
					igUnetList[1](r.unet || []);
					igVaeList[1](r.vae || []);
					igClipList[1](r.clip || []);
					igModelCount[1](totalCount);
					if (totalCount > 0) igOpenDd[1](true); // auto-open dropdown
					showToast('success', t('fetchOkPrefix') + totalCount + t('fetchOkSuffix'), '');
				} else {
						setMsg(t("fetchFail") + (r && r.error ? r.error : t("unknown")), true);
						showToast('error', t("fetchFail"), (r && r.error) || t("unknown"));
					}
				}).catch(function (e) { setMsg(t("fetchFail") + et(e), true); showToast('error', t("fetchFail"), et(e)); }).finally(function () { igBusy[1](""); });
			}
			function pickIgModel(m) {
				patchImggen("model", m);
				igOpenDd[1](false);
			}
			// v2.8: pick VAE / CLIP — stored into their own imggenConfig fields;
			// pickIgUnet still writes the unified `model` field (backend injects per mapping).
			function pickIgVae(m) {
				patchImggen("vae", m);
				igVaeDd[1](false);
			}
			function pickIgClip(m) {
				patchImggen("clip", m);
				igClipDd[1](false);
			}
			function importWorkflow(name, text) {
				commitStructure({ comfyWfImport: { name: name, workflow: text } }, function (d) { return d; }, function () { showToast('success', t('importedWf'), ''); });
			}
			function deleteWorkflow(id) {
				commitStructure({ comfyWfDelete: { id: id } }, null, function () { showToast('success', t('deletedWf'), ''); });
			}
			function renameWorkflow(id, name) {
				commitStructure({ comfyWfRename: { id: id, name: name } }, function (d) {
					var wf = (d.comfyWorkflows || []).find(function (w) { return w.id === id; });
					if (wf) wf.name = name;
					return d;
				});
			}
			function toggleWorkflow(id) { commitStructure({ comfyWfToggle: { id: id } }); }
			function updateWfJson(id, text) {
				commitStructure({ comfyWfUpdateJson: { id: id, workflow: text } }, null, function () { showToast('success', t('jsonUpdated'), ''); });
			}
			function updateWfConfig(id, field, value) {
				var p = { id: id }; p[field] = value;
				commitStructure({ comfyWfUpdateConfig: p }, function (d) {
					var wf = (d.comfyWorkflows || []).find(function (w) { return w.id === id; });
					if (wf) wf[field] = value;
					return d;
				});
			}
			function autoMapWorkflow(id) {
				commitStructure({ comfyWfAutoMap: { id: id } }, null, function () { showToast('success', t('autoMapped'), ''); });
			}
			function updateWfMapping(id, key, value) {
				commitStructure({ comfyWfUpdateMapping: { id: id, key: key, value: value } }, function (d) {
					var wf = (d.comfyWorkflows || []).find(function (w) { return w.id === id; });
					if (wf) { wf.mapping = wf.mapping || {}; wf.mapping[key] = value; }
					return d;
				});
			}
			// v2.9.14: mapping row delete
			function deleteWfMapping(id, key) {
				commitStructure({ comfyWfDeleteMapping: { id: id, key: key } }, function (d) {
					var wf = (d.comfyWorkflows || []).find(function (w) { return w.id === id; });
					if (wf && wf.mapping) { delete wf.mapping[key]; }
					return d;
				});
			}
			// v2.9.15: custom mappings (unlimited, user-defined injection points)
			function updateCustomMappings(id, mappings) {
				commitStructure({ comfyWfCustomMappings: { id: id, mappings: mappings } }, function (d) {
					var wf = (d.comfyWorkflows || []).find(function (w) { return w.id === id; });
					if (wf) wf.customMappings = mappings;
					return d;
				});
			}
			// v2.9.15: history import handlers removed — file import is the sole path now.
			function toggleIgFilter() {
				patchImggen("filterImageModels", !igc.filterImageModels);
			}
			function changeIgProvider(v) {
				if (!PROVIDERS_UI[v]) return;
				// Timeout bump to 600000 for ComfyUI is done server-side in applyPatch
				// (single source of truth; avoids queueSave mergePatch overwriting it).
				patchImggen("provider", v);
				// v2.8: drop stale VAE/CLIP/UNET lists when leaving ComfyUI so they don't linger on other providers
				if (v !== "comfyui") { igUnetList[1]([]); igVaeList[1]([]); igClipList[1]([]); }
			}
			function resetImggen() {
				if (!igConfirmReset[0]) { igConfirmReset[1](true); return; }
				igConfirmReset[1](false);
				igModelList[1]([]);
				igModelCount[1](null);
				igUnetList[1]([]);
				igVaeList[1]([]);
				igClipList[1]([]);
				igKeyDraft[1]("");
				igRevealed[1](false);
				commitStructure({ imggenReset: true }, function (d) { d.imggenConfig = null; return d; }, function () { showToast('success', t('resetDone'), ''); });
			}
		function switchPreset(id) {
			igPresetDdOpen[1](false);
			igKeyDraft[1]("");
			igRevealed[1](false);
			igModelList[1]([]);
			igModelCount[1](null);
			commitStructure({ imggenPresetSwitch: id }, null, function () { forgetBaselineScope("imggen"); showToast('success', t('presetSwitched'), ''); });
		}
		function addPreset() {
			igPresetDdOpen[1](false);
			igKeyDraft[1]("");
			igRevealed[1](false);
			igModelList[1]([]);
			igModelCount[1](null);
			commitStructure({ imggenPresetAdd: true }, null, function () { forgetBaselineScope("imggen"); showToast('success', t('presetAdded'), ''); });
		}
		function deletePreset(id) {
			igPresetDeleteConfirm[1](false);
			igKeyDraft[1]("");
			igRevealed[1](false);
			igModelList[1]([]);
			igModelCount[1](null);
			commitStructure({ imggenPresetDelete: id }, null, function () { forgetBaselineScope("imggen"); showToast('success', t('presetDeleted'), ''); });
		}
	function renamePreset(name) {
		queueSave({ imggenPresetRename: name });
		updateDraft(function (d) {
			var ip = (d.imggenPresets || []).find(function (p) { return p.id === d.activeImggenPreset; });
			if (ip) ip.name = String(name).slice(0, 60);
			return d;
		});
	}
	function saveImggenPreset() {
		commitStructure({ saveImggenPreset: true }, null, function () { forgetBaselineScope("imggen"); showToast('success', t('presetSaved'), ''); });
	}
	function togglePresetDd() {
			igPresetDdOpen[1](!igPresetDdOpen[0]);
		}

			var apis = draft[0].apis || [];
			var visible = snap[0] ? snap[0].visible : false;
			var validCount = apis.filter(function (c) {
				var prov = PROVIDERS_UI[c.provider] || {};
				if (!prov.fixed && !c.endpoint) return false;
				if (!c.model) return false;
				if (!prov.keyRequired) return true;
				return !!c.apiKeySet;
			}).length;
			var vlmOn = draft[0].vlmEnabled !== false;
			var imggenOn = draft[0].imggenEnabled === true;
			var toolsOn = draft[0].visionToolsEnabled !== false;
			var toolStatus = vlmOn ? (validCount > 0 ? t("toolVisible") : t("toolHidden")) : (toolsOn ? t("toolOffToolkit") : t("toolOff"));
			var igc = draft[0].imggenConfig || {};
			var igcValid = !!(draft[0].imggenPresets && draft[0].imggenPresets.length > 0);
			var imggenVisible = snap[0] ? snap[0].imggenVisible : false;
			// v2.11: video card panel derived state
			var videoCards = draft[0].videoCards || [];
			var videoOn = draft[0].videoEnabled === true;
			var videoVisible = snap[0] ? snap[0].videoVisible : false;
			var videoCardLimit = draft[0].videoCardLimit != null ? Math.max(1, Math.min(10, Math.floor(Number(draft[0].videoCardLimit) || 10))) : 10;
			var videoBuilderEnabled = draft[0].videoBuilderEnabled !== false;
			// v2.8.1: voice panel derived state
			var voiceOn = draft[0].voiceEnabled === true;
			var voiceVisible = snap[0] ? snap[0].voiceVisible : false;
			var voicePresets = draft[0].voicePresets || [];
			var activeVoicePresetId = draft[0].activeVoicePreset || (voicePresets.length > 0 ? voicePresets[0].id : "");
			var activeVoicePresetName = (voicePresets.find(function (p) { return p.id === activeVoicePresetId; }) || {}).name || "";
			// v2.9.1: STT namespace (independent presets from TTS)
			var voicePresetsStt = draft[0].voicePresetsStt || [];
			var activeVoicePresetIdStt = draft[0].activeVoicePresetStt || (voicePresetsStt.length > 0 ? voicePresetsStt[0].id : "");
			var activeVoicePresetNameStt = (voicePresetsStt.find(function (p) { return p.id === activeVoicePresetIdStt; }) || {}).name || "";

			var cardProps = {
				t: t,
				busy: busy[0],
				keyDraft: keyDraft[0],
				models: models[0],
				menuOpen: menuOpen[0],
				renameId: renameId[0],
				dragFrom: dragFrom[0],
				dropOver: dropOver[0],
				revealed: revealed[0],
				openDd: openDd[0],
				onPatch: patchCard,
				onSaveKey: saveKey,
				onFetchModels: fetchModels,
				onToggleReveal: toggleReveal,
				onToggleDd: toggleDd,
				onPickModel: pickModel,
				onToggleMenu: function (id) { menuOpen[1](menuOpen[0] === id ? null : id); confirmDel[1](null); },
				onCloseMenu: function () { menuOpen[1](null); confirmDel[1](null); },
				onStartRename: function (id) { renameId[1](id); },
				onEndRename: function () { renameId[1](null); },
				onDelete: deleteCard,
				confirmDel: confirmDel[0],
				openProv: openProv[0],
				onChangeProvider: changeProvider,
				onToggleProv: function (id) { openProv[1](openProv[0] === id ? null : id); },
				onPickProvider: function (id, v) { changeProvider(id, v); openProv[1](null); },
				onDeleteClick: deleteClick,
				onMoveTop: function (id) { moveCardTo(id, "top"); },
				onMoveBottom: function (id) { moveCardTo(id, "bottom"); },
				onReorder: reorderCard,
				onDragStart: function (i) { dragFrom[1](i); },
				onDropOver: function (i) { dropOver[1](i); },
				onDragEnd: function () { dragFrom[1](null); dropOver[1](null); }
			};

			function moduleRow(label, checked, onChange, statusText) {
				return React.createElement("div", { className: "omni-module-row" }, [
					React.createElement("label", { className: "omni-switch" }, [
						React.createElement("input", { type: "checkbox", checked: checked, onChange: onChange }),
						React.createElement("span", { className: "omni-switch-slider" })
					]),
					React.createElement("span", { className: "omni-label" }, label),
					React.createElement("span", { className: "omni-status" }, statusText || "")
				]);
			}

			var retryCard = React.createElement("div", { className: "omni-card omni-retry-row" }, [
				React.createElement("span", { className: "omni-label omni-retry-label" }, t("retryTitle")),
				React.createElement("input", {
					className: "omni-input omni-retry-input",
					type: "number", min: 1,
					value: String(draft[0].retryCount || 3),
					onChange: function (e) { patchRetry(e.target.value); }
				})
			]);

			var listHead = React.createElement("div", { className: "omni-list-head" }, [
				React.createElement("span", { className: "omni-list-title" },
					t("cardListTitle") + " (" + apis.length + ")" +
					(modelCount[0] ? " · " + t("fetchOkPrefix") + modelCount[0].count + t("fetchOkSuffix") : "")),
				React.createElement("div", { style: { display: "flex", gap: "8px", alignItems: "center" } }, [
					React.createElement("button", {
						className: "omni-btn omni-add-btn",
						disabled: busy[0] !== "",
						onClick: addCard
					}, t("addCard")),
					React.createElement("div", { className: "omni-batch-wrap" }, [
								React.createElement("button", {
									className: "omni-btn omni-batch-btn",
									title: t("batchDeleteAll"),
									disabled: busy[0] !== "",
									onClick: function () { batchOpen[1](!batchOpen[0]); }
								}, React.createElement(SvgIcon, { d: I_COLLAPSE })),
								batchOpen[0] ? React.createElement("div", { className: "omni-batch-menu", ref: menuDdRef }, [
									React.createElement("div", { className: "omni-menu-item", onClick: function () { batchCollapse(true); } },
										React.createElement(SvgIcon, { d: I_COLLAPSE }), React.createElement("span", null, t("batchCollapseAll"))),
									React.createElement("div", { className: "omni-menu-item", onClick: function () { batchCollapse(false); } },
										React.createElement(SvgIcon, { d: I_EXPAND }), React.createElement("span", null, t("batchExpandAll"))),
									React.createElement("div", { className: "omni-menu-item omni-menu-danger", onClick: batchDeleteAll },
										React.createElement(SvgIcon, { d: I_TRASH }), React.createElement("span", null, t("batchDeleteAll")))
								]) : null
					])
				])
			]);

			var vlmBody = React.createElement("div", { className: "omni-tab-body" }, [
				retryCard,
				React.createElement(FallbackCard, {
					t: t,
					cfg: draft[0].fallbackConfig || {},
					busy: fbBusy[0],
					models: fbModels[0],
					openDd: fbOpenDd[0],
					collapsed: fbCollapsed[0],
					onPatch: patchFallback,
					onChangeProvider: changeFallbackProvider,
					onFetchModels: fetchFallbackModels,
					onResetModels: function () { commitStructure({ fallbackConfig: { field: "resetModels", value: true } }, function (d) { if (d.fallbackConfig) d.fallbackConfig.models = ["Qwen3.5-397B-A17B", "Qwen2.5-VL-72B-Instruct", "Qwen3.6-27B", "Mistral-Small-3.2-24B-Instruct-2506", "Qwen3.5-9B"]; return d; }); },
					onRemoveModel: removeFallbackModel,
					onPickModel: pickFallbackModel,
					onToggleCollapse: function () { var v = !fbCollapsed[0]; fbCollapsed[1](v); try { var s = JSON.parse(localStorage.getItem('omni-workstation-collapse') || '{}'); s.fb = v; localStorage.setItem('omni-workstation-collapse', JSON.stringify(s)); } catch (e) {} },
					onToggleDd: function () { fbOpenDd[1](!fbOpenDd[0]); },
					fbSearch: fbSearch[0],
					onSearchChange: setFbSearch,
					fbDragFrom: fbDragFrom[0],
					fbDropOver: fbDropOver[0],
					onDragStart: function (i) { fbDragFrom[1](i); },
					onDropOver: function (i) { fbDropOver[1](i); },
					onDragEnd: function () { fbDragFrom[1](null); fbDropOver[1](null); },
					onReorder: reorderFallbackModels
				}),
				React.createElement(MirrorCard, {
					t: t,
					cfg: draft[0].mirrorConfig || {},
					collapsed: mirrorCollapsed[0],
					allModels: mirrorAllModels[0],
					busy: mirrorBusy[0],
					openDd: mirrorOpenDd[0],
					onToggleCollapse: function () { var v = !mirrorCollapsed[0]; mirrorCollapsed[1](v); try { var s = JSON.parse(localStorage.getItem('omni-workstation-collapse') || '{}'); s.mirror = v; localStorage.setItem('omni-workstation-collapse', JSON.stringify(s)); } catch (e) {} },
					onPatch: patchMirror,
					onAddMapping: addMirrorMapping,
					onRemoveMapping: removeMirrorMapping,
					onSelectModel: selectMirrorModel,
					onUpdateName: updateMirrorName,
					onToggleDd: toggleMirrorDd
				}),
				React.createElement("div", { className: "omni-list" }, [
					listHead,
					apis.length === 0 ? React.createElement("p", { className: "omni-msg" }, t("noCards")) : null,
					apis.map(function (card, index) {
						return React.createElement(ApiCard, Object.assign({ key: card.id, card: card, index: index }, cardProps));
					})
				]),
				null
			]);

			var imggenBody = React.createElement("div", { className: "omni-tab-body" }, [
				igcValid
					? React.createElement(ImggenPanel, Object.assign({ t: t, cfg: igc, visible: imggenVisible, busy: igBusy[0], keyDraft: igKeyDraft[0], revealed: igRevealed[0], openDd: igOpenDd[0], openProv: igOpenProv[0], confirmReset: igConfirmReset[0], modelList: igModelList[0], unetList: igUnetList[0], vaeList: igVaeList[0], clipList: igClipList[0], openVaeDd: igVaeDd[0], openClipDd: igClipDd[0], onToggleVaeDd: function () { igVaeDd[1](!igVaeDd[0]); }, onToggleClipDd: function () { igClipDd[1](!igClipDd[0]); }, onPickVae: pickIgVae, onPickClip: pickIgClip, modelCount: igModelCount[0], onPatch: patchImggen, onSaveKey: saveImggenKey, onToggleReveal: toggleIgReveal, onFetchModels: fetchImggenModels, onPickModel: pickIgModel, onToggleDd: function () { var n = !igOpenDd[0]; igOpenDd[1](n); if (n && igModelList[0].length === 0) fetchImggenModels(); }, onPickProvider: function (v) { changeIgProvider(v); igOpenProv[1](false); }, onToggleProv: function () { igOpenProv[1](!igOpenProv[0]); }, onToggleFilter: toggleIgFilter, onImport: importWorkflow, onDelete: deleteWorkflow, onRename: renameWorkflow, onToggle: toggleWorkflow, onUpdateJson: updateWfJson, onUpdateConfig: updateWfConfig, onAutoMap: autoMapWorkflow, onUpdateMapping: updateWfMapping, onDeleteMapping: deleteWfMapping, onUpdateCustomMappings: updateCustomMappings, workflows: (draft[0].comfyWorkflows || []), activeWfId: (draft[0].activeComfyWorkflow || ""), onResetClick: resetImggen, onCloseMenu: function () { igConfirmReset[1](false); }, presets: (draft[0].imggenPresets || []), activePresetId: draft[0].activeImggenPreset || "", activePresetName: ((draft[0].imggenPresets || []).find(function (p) { return p.id === draft[0].activeImggenPreset; }) || {}).name || "", onSwitchPreset: switchPreset, onAddPreset: addPreset, onDeletePreset: deletePreset, onRenamePreset: renamePreset, onSavePreset: saveImggenPreset, presetDdOpen: igPresetDdOpen[0], onTogglePresetDd: togglePresetDd, presetDeleteConfirm: igPresetDeleteConfirm[0], onConfirmDeletePreset: function () { igPresetDeleteConfirm[1](true); }, onCancelDeletePreset: function () { igPresetDeleteConfirm[1](false); }, onConfirmDelete: function () { deletePreset(draft[0].activeImggenPreset || ""); } }, props))
					: React.createElement("p", { className: "omni-msg" }, t("imggenNoConfig")),
				null
			]);

				// v2.11: video card panel body (replaces old flat-form VideoPanel)
				var videoCards = draft[0].videoCards || [];
				var videoBody = React.createElement("div", { className: "omni-tab-body" }, [
					React.createElement("div", { className: "omni-list-head" }, [
						React.createElement("span", { className: "omni-list-title" }, t("videoCardListTitle") + " (" + videoCards.length + ")"),
						React.createElement("div", { style: { display: "flex", gap: "8px", alignItems: "center" } }, [
							React.createElement("button", { className: "omni-btn omni-add-btn", disabled: busy[0] !== "" || videoCards.length >= videoCardLimit, onClick: function () { vcAddModalOpen[1](true); } }, t("addCard")),
							React.createElement("div", { className: "omni-batch-wrap" }, [
								React.createElement("button", { className: "omni-btn omni-batch-btn", title: t("batchDeleteAll"), disabled: busy[0] !== "", onClick: function () { vcBatchOpen[1](!vcBatchOpen[0]); } }, React.createElement(SvgIcon, { d: I_COLLAPSE })),
								vcBatchOpen[0] ? React.createElement("div", { className: "omni-batch-menu", ref: menuDdRef }, [
									React.createElement("div", { className: "omni-menu-item", onClick: function () { batchVideoCollapse(true); } }, React.createElement(SvgIcon, { d: I_COLLAPSE }), React.createElement("span", null, t("batchCollapseAll"))),
									React.createElement("div", { className: "omni-menu-item", onClick: function () { batchVideoCollapse(false); } }, React.createElement(SvgIcon, { d: I_EXPAND }), React.createElement("span", null, t("batchExpandAll"))),
									React.createElement("div", { className: "omni-menu-item omni-menu-danger", onClick: function () { vcBatchOpen[1](false); confirmDialog[1]({ title: t("batchDeleteAllTitle"), message: t("batchDeleteAllMsg"), onConfirm: function () { batchVideoDeleteAll(); confirmDialog[1](null); } }); } }, React.createElement(SvgIcon, { d: I_TRASH }), React.createElement("span", null, t("batchDeleteAll")))
								]) : null
							])
						])
					]),
					React.createElement("div", { className: "omni-list" }, [
						videoCards.length === 0 ? React.createElement("p", { className: "omni-msg" }, t("videoCardNoCards")) : null,
						videoCards.map(function (card, index) {
							var sharedPresets = draft[0].videoPresets || [];
							var activePreset = sharedPresets.find(function (p) { return p.id === card.activePreset; }) || sharedPresets[0];
							return React.createElement(VideoPanel, {
								key: card.id, t: t, card: card, index: index,
								busy: vcBusy[0][card.id] || "",
								keyDraft: vcKeyDraft[0][card.id] || "",
								revealed: !!vcRevealed[0][card.id],
								openDd: !!vcOpenDd[0][card.id],
								openProv: !!vcOpenProv[0][card.id],
								confirmDel: vcConfirmDel[0] === card.id,
								confirmReset: vcConfirmReset[0] === card.id,
								menuOpen: vcMenuOpen[0] === card.id,
								modelList: vcModelList[0][card.id] || [],
								modelCount: vcModelCount[0][card.id] || null,
							presets: sharedPresets,
							activePresetId: card.activePreset || (sharedPresets[0] || {}).id || "",
							activePresetName: (activePreset || {}).name || "",
							presetDdOpen: !!vcPresetDdOpen[0][card.id],
							presetDeleteConfirm: vcPresetDeleteConfirm[0] === card.id,
							presetNameDraft: (activePreset || {}).name || "",
							onPatch: function (field, value) { patchVideoCard(card.id, field, value); },
							onSaveKey: function (value) { saveVideoCardKey(card.id, value); },
							onToggleReveal: function () { toggleVideoCardReveal(card.id); },
							onFetchModels: function () { fetchVideoCardModels(card.id); },
							onPickModel: function (m) { pickVideoCardModel(card.id, m); },
							onToggleDd: function () { toggleVideoCardDd(card.id); },
								onPickProvider: function (v) { changeVideoCardProvider(card.id, v); vcOpenProv[1](Object.assign({}, vcOpenProv[0], { [card.id]: false })); },
								onToggleProv: function () { toggleVideoCardProv(card.id); },
								onToggleFilter: function () { toggleVideoCardFilter(card.id); },
								onResetClick: function () { resetVideoCard(card.id); },
							onDeleteClick: deleteVideoCardClick,
							onEditClick: function (card) { vcEditCard[1](card); },
							onToggleMenu: function () { toggleVideoCardMenu(card.id); },
								onCloseMenu: function () { vcConfirmReset[1](null); vcConfirmDel[1](null); },
								onSwitchPreset: function (presetId) { switchVideoCardPreset(card.id, presetId); },
								onAddPreset: function () { addVideoCardPreset(card.id); },
								onDeletePreset: function (presetId) { deleteVideoCardPreset(card.id, presetId); },
								onRenamePreset: function (name) { renameVideoCardPreset(card.id, name); },
								onTogglePresetDd: function () { toggleVideoCardPresetDd(card.id); },
								onSavePreset: function () { saveVideoCardPreset(card.id); },
								onConfirmDeletePreset: function () { vcPresetDeleteConfirm[1](card.id); },
								onCancelDeletePreset: function () { vcPresetDeleteConfirm[1](null); },
								onConfirmDelete: function () { deleteVideoCardPreset(card.id, card.activePreset || (sharedPresets[0] || {}).id || ""); }
							});
						})
					]),
					vcAddModalOpen[0] ? React.createElement(AddVideoCardModal, { t: t, cards: videoCards, customTypes: draft[0].videoCustomTypes || [], onAddCustomType: function (entry) { commitStructure({ videoCustomTypeAdd: entry }, function (d) { var arr = (d.videoCustomTypes || []).map(function (s) { return (typeof s === "string") ? { name: s, toolName: "", description: "" } : s; }); var nm = (typeof entry === "object") ? entry.name : entry; var i = -1; for (var k = 0; k < arr.length; k++) if (arr[k].name === nm) { i = k; break; } var ent = (typeof entry === "object") ? { name: entry.name, toolName: entry.toolName || "", description: entry.description || "" } : { name: nm, toolName: "", description: "" }; if (i >= 0) { if (typeof entry === "object") arr[i] = ent; } else { arr = arr.concat([ent]); } d.videoCustomTypes = arr; return d; }, null); }, onDeleteCustomType: function (nm) { commitStructure({ videoCustomTypeDelete: nm }, function (d) { d.videoCustomTypes = (d.videoCustomTypes || []).filter(function (s) { return s !== nm; }); return d; }, null); }, onCancel: function () { vcAddModalOpen[1](false); }, onConfirm: function (data) { vcAddModalOpen[1](false); commitStructure({ videoCardAdd: data }, null, function () { showToast('success', t('cardAdded'), ''); }); } }) : null,
					vcEditCard[0] ? React.createElement(AddVideoCardModal, { t: t, cards: videoCards, editCard: vcEditCard[0], customTypes: draft[0].videoCustomTypes || [], onAddCustomType: function (entry) { commitStructure({ videoCustomTypeAdd: entry }, function (d) { var arr = (d.videoCustomTypes || []).map(function (s) { return (typeof s === "string") ? { name: s, toolName: "", description: "" } : s; }); var nm = (typeof entry === "object") ? entry.name : entry; var i = -1; for (var k = 0; k < arr.length; k++) if (arr[k].name === nm) { i = k; break; } var ent = (typeof entry === "object") ? { name: entry.name, toolName: entry.toolName || "", description: entry.description || "" } : { name: nm, toolName: "", description: "" }; if (i >= 0) { if (typeof entry === "object") arr[i] = ent; } else { arr = arr.concat([ent]); } d.videoCustomTypes = arr; return d; }, null); }, onDeleteCustomType: function (nm) { commitStructure({ videoCustomTypeDelete: nm }, function (d) { d.videoCustomTypes = (d.videoCustomTypes || []).filter(function (s) { return s !== nm; }); return d; }, null); }, onCancel: function () { vcEditCard[1](null); }, onConfirm: function (data) { var cid = vcEditCard[0].id; vcEditCard[1](null); commitStructure({ videoCardPatch: { id: cid, field: "name", value: data.name }, videoCardPatchName: data.name, videoCardPatchType: data.type, videoCardPatchToolName: data.toolName, videoCardPatchDesc: data.description }, function (d) { var card = (d.videoCards || []).find(function (c) { return c.id === cid; }); if (card) { card.name = data.name; card.type = data.type; card.toolName = data.toolName; card.description = data.description; } return d; }, function () { showToast('success', t('cardAdded'), ''); }); } }) : null,
					null
				]);

					// v2.8.1: voice tab body
					var voiceBody = React.createElement("div", { className: "omni-tab-body" }, [
						React.createElement(VoicePanel, {
							t: t,
							cfg: draft[0].voiceConfig || {},
							cfgStt: draft[0].voiceConfigStt || {},
							visible: voiceVisible,
							busy: voiceBusy[0],
							keyDraft: voiceKeyDraft[0],
							revealed: voiceRevealed[0],
							openDd: voiceOpenDd[0],
							openProv: voiceOpenProv[0],
							confirmReset: voiceConfirmReset[0],
							modelList: voiceModelList[0],
							voiceVoiceList: voiceVoiceList[0],
							modelCount: voiceModelCount[0],
							presets: voicePresets || [],
							activePresetId: activeVoicePresetId,
							activePresetName: activeVoicePresetName,
							presetsStt: voicePresetsStt || [],
							activePresetIdStt: activeVoicePresetIdStt,
							activePresetNameStt: activeVoicePresetNameStt,
							presetDdOpen: voicePresetDdOpen[0],
							presetDeleteConfirm: voicePresetDeleteConfirm[0],
							onSwitchPreset: switchVoicePreset,
							onAddPreset: addVoicePreset,
							onDeletePreset: deleteVoicePreset,
							onRenamePreset: renameVoicePreset, onSavePreset: saveVoicePreset,
							onTogglePresetDd: toggleVoicePresetDd,
							onConfirmDeletePreset: function () { voicePresetDeleteConfirm[1](true); },
							onCancelDeletePreset: function () { voicePresetDeleteConfirm[1](false); },
							onConfirmDelete: function (sub) { deleteVoicePreset(sub === "stt" ? (activeVoicePresetIdStt || "") : (activeVoicePresetId || ""), sub); },
							onPatch: patchVoice,
							onSaveKey: saveVoiceKey,
							onToggleReveal: toggleVoiceReveal,
							onFetchModels: fetchVoiceModels,
							onPickModel: pickVoiceModel,
							onToggleDd: function () { var n = !voiceOpenDd[0]; voiceOpenDd[1](n); if (n && voiceModelList[0].length === 0) fetchVoiceModels(); },
							onPickProvider: function (v) { changeVoiceProvider(v); voiceOpenProv[1](false); },
							onToggleProv: function () { voiceOpenProv[1](!voiceOpenProv[0]); },
							onToggleFilter: toggleVoiceFilter,
							onResetClick: resetVoice,
							onCloseMenu: function () { voiceConfirmReset[1](false); },
							ttsEnabled: draft[0].ttsEnabled !== false,
							sttEnabled: draft[0].sttEnabled === true,
						onToggleTts: function () { commitStructure({ ttsEnabled: !(draft[0].ttsEnabled !== false) }, function(d) { d.ttsEnabled = !(d.ttsEnabled !== false); return d; }); },
						onToggleStt: function () { commitStructure({ sttEnabled: !(draft[0].sttEnabled === true) }, function(d) { d.sttEnabled = !(d.sttEnabled === true); return d; }); },
						voiceRefLibrary: voiceRefLibrary[0],
						voiceRefDdOpen: voiceRefDdOpen[0],
						voiceRefUploadBusy: voiceRefUploadBusy[0],
						voiceRefUploadPending: voiceRefUploadPending[0],
						voiceRefDeleteName: voiceRefDeleteName[0],
						voiceRefNameDraft: voiceRefNameDraft[0],
						onToggleRefDd: toggleRefDd,
						onPickRefAudio: selectRefAudio,
						onTriggerRefUpload: triggerRefUpload,
						onRenameRefAudio: renameRefAudio,
						onRequestRefDelete: requestRefDelete,
						onRefNameDraft: function (v) { voiceRefNameDraft[1](v); },
						onConfirmRefUpload: confirmRefUpload,
						onCancelRefUpload: cancelRefUpload,
						onConfirmRefDelete: confirmRefDelete,
						onCancelRefDelete: cancelRefDelete,
						onStartRefUpload: startRefUpload,
						onRefLibReload: fetchVoiceLibrary,
						voiceCloneBusy: voiceCloneBusy[0],
						onMinimaxClone: onMinimaxClone,
					onDoubaoClone: onDoubaoClone,
					doubaoClonePresets: draft[0].doubaoClonePresets,
					activeDoubaoClonePreset: draft[0].activeDoubaoClonePreset,
					onDoubaoClonePresetSwitch: onDoubaoClonePresetSwitch,
					onDoubaoClonePresetAdd: onDoubaoClonePresetAdd,
					onDoubaoClonePresetDelete: onDoubaoClonePresetDelete,
					onDoubaoClonePresetRename: onDoubaoClonePresetRename,
					onDoubaoClonePresetPatch: onDoubaoClonePresetPatch,
						showToast: showToast
					}),
						React.createElement("input", { ref: refFileInput, type: "file", accept: "audio/*", style: { display: "none" }, onChange: onRefFileChange })
					]);


			var settingsBody = React.createElement("div", { className: "omni-tab-body" }, [
				React.createElement(SettingsPanel, {
					t: t,
					globalConfig: draft[0].globalConfig || {},
					vlmOn: vlmOn,
					imggenOn: imggenOn,
					videoOn: videoOn,
					voiceOn: voiceOn,
					toolsOn: toolsOn,
					moduleRow: moduleRow,
					onToggleVlm: toggleVlm,
					onToggleImggen: toggleImggen,
					onToggleVideo: toggleVideo,
					onToggleVoice: toggleVoice,
					onToggleTools: toggleTools,
					onPatchGlobal: patchGlobal
				}),
			React.createElement(ExtensionCard, { t: t, globalConfig: draft[0].globalConfig || {}, toolsOn: toolsOn, onToggleTools: toggleTools, onPatchGlobal: patchGlobal, visionToolToggles: (draft[0].visionToolToggles || {}), onToggleVisionTool: function (tool) { queueSave({ visionToolToggle: { tool: tool, value: !((draft[0].visionToolToggles || {})[tool] !== false) } }); }, videoBuilderEnabled: videoBuilderEnabled, videoCardLimit: videoCardLimit, onToggleVideoBuilder: function (v) { commitStructure({ videoBuilderEnabled: v }, function (d) { d.videoBuilderEnabled = v; return d; }); }, onPatchVideoCardLimit: function (v) { commitStructure({ videoCardLimit: v }, function (d) { d.videoCardLimit = v; return d; }); } }),
			React.createElement(AboutCard, { t: t, version: snap[0] ? snap[0].version : "" })
		]);

			return React.createElement("div", { className: "omni-page" }, [
				React.createElement(ToastContainer, { toasts: toasts[0], onClose: closeToast, onExtend: extendToast }),
				React.createElement("div", { className: "omni-tabs" }, [
					React.createElement("button", { className: "omni-tab" + (tab[0] === "vlm" ? " active" : ""), onClick: function () { tab[1]("vlm"); } }, [
					"VLM",
					React.createElement("span", { className: "omni-tab-dot " + (vlmOn ? "on" : "off") })
				]),
					React.createElement("button", { className: "omni-tab" + (tab[0] === "imggen" ? " active" : ""), onClick: function () { tab[1]("imggen"); } }, [
					t("tabImggen"),
					React.createElement("span", { className: "omni-tab-dot " + (imggenOn ? "on" : "off") })
				]),
						React.createElement("button", { className: "omni-tab" + (tab[0] === "video" ? " active" : ""), onClick: function () { tab[1]("video"); } }, [
						t("tabVideo"),
						React.createElement("span", { className: "omni-tab-dot " + (videoOn ? "on" : "off") })
					]),
						React.createElement("button", { className: "omni-tab" + (tab[0] === "audio" ? " active" : "") + (voiceOn ? "" : " omni-tab-disabled"), onClick: function () { if (voiceOn) tab[1]("audio"); } }, [
						t("tabAudio"),
						React.createElement("span", { className: "omni-tab-dot " + (voiceOn ? "on" : "off") })
					]),
						React.createElement("button", { className: "omni-tab" + (tab[0] === "settings" ? " active" : ""), onClick: function () { tab[1]("settings"); } }, t("settingsTab"))
					]),
					tab[0] === "vlm" ? vlmBody : (tab[0] === "imggen" ? imggenBody : (tab[0] === "video" ? videoBody : (tab[0] === "audio"
						? voiceBody
							: settingsBody))),
					confirmDialog[0] ? React.createElement(ConfirmDialog, Object.assign({ t: t, onCancel: function () { confirmDialog[1](null); } }, confirmDialog[0])) : null
			]);
		}

		// ---------- tool.call.toolview cards ----------
		// Walk props tree defensively and collect every array whose items are objects
		// carrying a string "type" (candidate content-block arrays). Never throws.
		function toolviewCollectBlocks(props) {
			var result = [];
			var seen = [];
			function walk(v, depth) {
				if (v == null || depth > 6) return;
				if (typeof v !== "object") return;
				if (seen.indexOf(v) >= 0) return;
				seen.push(v);
				if (Array.isArray(v)) {
					var blocks = v.filter(function (b) { return !!b && typeof b === "object"; });
					if (blocks.length && blocks.every(function (b) { return typeof b.type === "string"; })) {
						result = result.concat(blocks);
						blocks.forEach(function (b) { walk(b, depth + 1); });
						return;
					}
					for (var i = 0; i < v.length; i++) walk(v[i], depth + 1);
				} else {
					Object.keys(v).forEach(function (k) {
						// skip host plumbing / React-only props to avoid noise & cycles
						if (k === "t" || k === "close" || k === "connection" || k === "sessions" || k === "call" || k === "session" || k === "children" || k === "key" || k === "ref") return;
						walk(v[k], depth + 1);
					});
				}
			}
			walk(props, 0);
			return result;
		}

		// Collect every text string found anywhere in the props tree (used to
		// recover an attachment id from a sanitized marker when the raw image
		// block is absent). Never throws, dedupes.
		function toolviewCollectTexts(props) {
			var result = [];
			var seen = [];
			var texts = [];
			function walk(v, depth) {
				if (v == null || depth > 8) return;
				if (typeof v === "string") { texts.push(v); return; }
				if (typeof v !== "object") return;
				if (seen.indexOf(v) >= 0) return;
				seen.push(v);
				if (Array.isArray(v)) {
					for (var i = 0; i < v.length; i++) walk(v[i], depth + 1);
				} else {
					Object.keys(v).forEach(function (k) {
						if (k === "t" || k === "close" || k === "connection" || k === "sessions" || k === "call" || k === "session" || k === "children" || k === "key" || k === "ref") return;
						walk(v[k], depth + 1);
					});
				}
			}
			walk(props, 0);
			for (var i = 0; i < texts.length; i++) {
				var t0 = texts[i];
				if (t0 && result.indexOf(t0) < 0 && t0.length <= 2000) result.push(t0);
			}
			return result;
		}

		// Extract the first top-level JSON object found in a text (handles nested braces).
		function toolviewFirstJson(text) {
			if (!text) return null;
			var start = text.indexOf("{");
			if (start < 0) return null;
			var depth = 0;
			var i = start;
			for (; i < text.length; i++) {
				var c = text[i];
				if (c === "{") depth++;
				else if (c === "}") { depth--; if (depth === 0) break; }
			}
			var sub = text.slice(start, i + 1);
			try { return JSON.parse(sub); } catch (e) { return null; }
		}

		// ---- show_image: local image preview backed by attachment bytes ----
		// The harness toolview passes `block` (content array) + `sessionId`.
		// Attachment bytes are read via sessions.binding(sessionId).session
		// .readAttachment(attachmentId), which resolves to
		// { ok, value: { attachment, data } } (dsh-vision-router's VisionPresentCard
		// contract). Two readiness hazards, both E2E-verified:
		//  1. the model surface may carry the SANITIZED marker (no image block) —
		//     recover the attachment id from the marker text;
		//  2. the session binding / attachment may not be ready the instant a
		//     freshly-created tool call mounts the card — the effect re-runs when
		//     props gain a sessionId, and the read is retried with backoff.
		function ToolImageCard(props) {
			var t = (props && props.t) || tBound || (function (k) { return k; });
			var sessions = (props && props.sessions) || null;

			// Resolve attachment id + session id during render (before useEffect)
			// so the effect can re-run when props later supply a sessionId.
			var imgBlock = null;
			var sessionId = null;
			var outer = props && props.block ? props.block : props;
			if (outer && outer.sessionId) sessionId = outer.sessionId;
			if (outer && Array.isArray(outer.content)) {
				for (var i = 0; i < outer.content.length; i++) {
					var b = outer.content[i];
					if (b && b.type === "image" && b.attachment) { imgBlock = b; break; }
				}
			}
			if (!imgBlock) {
				var blocks = toolviewCollectBlocks(props);
				for (var j = 0; j < blocks.length; j++) {
					var bj = blocks[j];
					if (bj && bj.type === "image" && bj.attachment) { imgBlock = bj; break; }
				}
			}
			var attachment = null;
			var attachmentId = null;
			if (imgBlock && imgBlock.attachment) {
				attachment = imgBlock.attachment;
				attachmentId = attachment.attachmentId || attachment.id;
			} else {
				// Sanitized marker path: [工具结果中包含图片「…」，附件 id「sha256:…」。…]
				var texts = toolviewCollectTexts(props);
				for (var k = 0; k < texts.length; k++) {
					var m = String(texts[k] || "").match(/附件 id「([^」]+)」/);
					if (m && m[1]) { attachmentId = m[1]; break; }
				}
			}
			var mediaType = (attachment && attachment.mediaType) || "image/png";

			var srcState = React.useState(null);
			var errState = React.useState(false);

			// Re-run when the attachment id or session id changes (props arrive
			// asynchronously as the tool result lands in the session).
			React.useEffect(function () {
				if (!attachmentId) { errState[1](true); return; }
				// A previous run may have failed while props were still settling;
				// clear the error so a successful read isn't masked.
				errState[1](false);
				var cancelled = false;
				var objectUrl = null;
				var timers = [];
				function release() {
					cancelled = true;
					for (var ti = 0; ti < timers.length; ti++) { try { clearTimeout(timers[ti]); } catch (e) {} }
					timers = [];
					if (objectUrl) { try { URL.revokeObjectURL(objectUrl); } catch (e) {} objectUrl = null; }
				}
				// Resolve the session binding lazily INSIDE the retry loop: the
				// binding/.session may not be ready the instant a freshly-created
				// tool call mounts the card, so every attempt re-resolves it and a
				// missing readAttachment counts as a retryable failure.
				var retryCount = 0;
				var maxAttempts = 8;
				var delays = [0, 250, 500, 1000, 1500, 2000, 3000, 4000];
				function resolveSess() {
					var s = sessions;
					if (s && typeof s.binding === "function") { var b2 = s.binding(sessionId || null); if (b2) s = b2; }
					if (s && s.session && typeof s.session.readAttachment === "function") s = s.session;
					return (s && typeof s.readAttachment === "function") ? s : null;
				}
				function tryRead() {
					if (cancelled) return;
					var sess2 = resolveSess();
					if (!sess2) { retryOrFail(); return; }
					var p;
					try { p = sess2.readAttachment(attachmentId); } catch (e4) { p = null; }
					if (!p || typeof p.then !== "function") {
						retryOrFail();
						return;
					}
					p.then(function (result) {
						if (cancelled) return;
						// readAttachment resolves to { ok, value:{ attachment, data } }.
						var data = null;
						if (result && result.ok === true && result.value && result.value.data) {
							data = result.value.data;
						} else if (result && result.data && result.data.byteLength !== undefined) {
							data = result.data; // tolerate a raw-bytes return
						}
						if (!data) { retryOrFail(); return; }
						try {
							var mt = (result && result.value && result.value.attachment && result.value.attachment.mediaType) || mediaType;
							var blob = new Blob([data], { type: mt });
							objectUrl = URL.createObjectURL(blob);
							if (!cancelled) srcState[1](objectUrl);
						} catch (e2) { retryOrFail(); }
					}).catch(function () { retryOrFail(); });
				}
				function retryOrFail() {
					if (cancelled) return;
					retryCount++;
					if (retryCount < maxAttempts) {
						timers.push(setTimeout(tryRead, delays[retryCount] != null ? delays[retryCount] : 4000));
					} else {
						errState[1](true);
					}
				}
				tryRead();
				return release;
			}, [attachmentId, sessionId]);

			return React.createElement("div", { className: "omni-toolview-card" }, [
				React.createElement("div", { className: "omni-toolview-head" }, t("toolsLocalImage")),
				srcState[0] ? React.createElement("img", { src: srcState[0], alt: "", style: { maxWidth: "100%", maxHeight: 360, borderRadius: 6, alignSelf: "flex-start" } }) : null,
				errState[0] ? React.createElement("p", { className: "omni-status omni-err" }, t("toolsImageError")) : null
			]);
		}

		// ---- zoom_image / image_diff / detect_elements: artifact metadata card ----
		function ToolMetaCard(props) {
			var t = (props && props.t) || tBound || (function (k) { return k; });
			var toolKey = (props && props.toolKey) || "";
			var copied = React.useState(null);

			var label = toolKey === "zoom_image" ? t("toolsZoom")
				: (toolKey === "image_diff" ? t("toolsImageDiff")
					: (toolKey === "detect_elements" ? t("toolsElements") : t("toolsFile")));

			var blocks = toolviewCollectBlocks(props);
			var text = "";
			for (var i = 0; i < blocks.length; i++) {
				if (blocks[i] && typeof blocks[i].text === "string") text += (text ? "\n" : "") + blocks[i].text;
			}
			var json = toolviewFirstJson(text);
			var paths = ["path", "annotatedPath", "heatmapPath"];
			var numerics = ["width", "height", "diffRatio", "scale"];
			var rows = [];

			paths.forEach(function (k) {
				var v = json ? json[k] : undefined;
				if (typeof v !== "string" || !v) return;
				rows.push(React.createElement("div", { key: k, className: "omni-toolview-row" }, [
					React.createElement("span", { className: "omni-label" }, (k === "path" ? t("toolsFile") : k) + ":"),
					React.createElement("code", { className: "omni-toolview-path" }, v),
					React.createElement("button", {
						className: "omni-btn omni-toolview-copy",
onClick: function () {
						try { if (navigator.clipboard) navigator.clipboard.writeText(v); } catch (e) {}
						showToast('success', t('toolsCopied'), '');
						copied[1](k);
							setTimeout(function () { copied[1](null); }, 1500);
						}
					}, copied[0] === k ? t("toolsCopied") : t("toolsCopyPath"))
				]));
			});
			numerics.forEach(function (k) {
				var v = json ? json[k] : undefined;
				if (typeof v === "undefined" || v === null || v === "") return;
				rows.push(React.createElement("div", { key: k, className: "omni-toolview-row omni-toolview-fact" }, [
					React.createElement("span", { className: "omni-label" }, k + ":"),
					React.createElement("span", { className: "omni-toolview-val" }, String(v))
				]));
			});
			if (!rows.length) {
				rows.push(React.createElement("p", { key: "empty", className: "omni-status" }, text ? text : t("toolsNoData")));
			}

			return React.createElement("div", { className: "omni-toolview-card" }, [
				React.createElement("div", { className: "omni-toolview-head" }, label)
			].concat(rows));
		}

		// ---------- plugin entry ----------
		function apply(ctx) {
			ensureStyles();
			var locale = ctx.get ? ctx.get("locale") : null;
			if (locale) {
				tBound = locale.bind(NS);
				var effect0 = typeof ctx.effect === "function" ? ctx.effect : function (fn) { var d = fn(); return d; };
				effect0(function () { return locale.register(NS, DICTS); });
			}
			var slots = ctx.get ? ctx.get("slots") : ctx.slots;
			if (!slots) return;
			var effect = typeof ctx.effect === "function" ? ctx.effect : function (fn) { var d = fn(); return d; };
			var connection = ctx.get ? ctx.get("connection") : ctx.connection;
			var sessions = ctx.get ? ctx.get("sessions") : ctx.sessions;

			effect(function () {
				return slots.inject("settings.section", function () {
					return slots.register(
						{ name: "settings.section", id: "omni-vision", order: 40, locale: NS, label: function () { return tBound ? tBound("nav") : "全模态"; } },
						function (props) { return React.createElement(VlmSettingsPage, { close: props && props.close, t: (props && props.t) || tBound, connection: connection, sessions: sessions }); }
					);
				});
			});

			// ---- tool.call.toolview cards (best-effort; silently skip if the host lacks the slot) ----
			effect(function () {
				try {
					return slots.inject("tool.call.toolview", function () {
						return [
							slots.register(
								{ name: "tool.call.toolview", id: "omni-view-show_image", key: "show_image", order: 40 },
								function (props) { return React.createElement(ToolImageCard, { t: (props && props.t) || tBound, sessions: sessions, block: props, sessionId: props && props.sessionId }); }
							),
							slots.register(
								{ name: "tool.call.toolview", id: "omni-view-zoom", key: "zoom_image", order: 41 },
								function (props) { return React.createElement(ToolMetaCard, { t: (props && props.t) || tBound, toolKey: "zoom_image", block: props }); }
							),
							slots.register(
								{ name: "tool.call.toolview", id: "omni-view-diff", key: "image_diff", order: 42 },
								function (props) { return React.createElement(ToolMetaCard, { t: (props && props.t) || tBound, toolKey: "image_diff", block: props }); }
							),
							slots.register(
								{ name: "tool.call.toolview", id: "omni-view-detect", key: "detect_elements", order: 43 },
								function (props) { return React.createElement(ToolMetaCard, { t: (props && props.t) || tBound, toolKey: "detect_elements", block: props }); }
							)
						];
					});
				} catch (e) {
					return null;
				}
			});
		}

		exports.apply = apply;
		exports.inject = ["slots", "locale", "connection", "sessions"];
		return module.exports;
	}
});
