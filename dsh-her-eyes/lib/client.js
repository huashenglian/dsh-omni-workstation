window.__ModuleLoader__.load({
	id: "dsh-her-eyes",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		var React = require("react");

		// ---------- i18n dictionaries (inlined; locale service registers once) ----------
		var NS = "settings.her-eyes";
		var DICTS = {
			zh: {
				nav: "多模态",
				loading: "加载中…",
				loadFail: "加载配置失败：",
				unknown: "未知错误",
				saving: " · 正在自动保存…",
				intro: "配置多模态视觉模型 (VLM)：所有修改自动保存、立即生效，无需“保存”按钮。AI 通过 analyze_image 工具按卡片列表顺序从上到下调用；单次请求内重试超限后自动回退到下一张卡片，下一次请求重新从顶部开始。若没有任何有效的卡片配置，analyze_image 工具会自动隐藏。",
				retryTitle: "重试与回退",
				retryLabel: "重试次数（默认 5：单张卡片在单次请求内连续失败超过该值后，回退到下一张卡片）",
				statusPrefix: "当前有效卡片 ",
				toolVisible: " · analyze_image 工具已启用",
				toolHidden: " · analyze_image 工具已隐藏（无有效配置）",
				aboutTitle: "关于",
				aboutDesc: "该插件能够给予纯文本模型全模态的能力。",
				checkUpdateBtn: "检测更新",
				versionLabel: "版本 ",
				helpBtn: "说明",
				helpSearchPlaceholder: "搜索文档…",
				helpPlaceholder: "内容待补充。",
				helpNoResult: "无匹配结果",
				helpGroupVlm: "VLM",
				helpGroupImggen: "图像生成",
				helpVlmTitle: "VLM 视觉模型",
				helpVlmContent: "配置多模态视觉模型（VLM）。所有修改自动保存、立即生效，无需手动点保存。AI 通过 analyze_image 工具按卡片列表顺序从上到下调用；单次请求内重试超限后自动回退到下一张卡片，下一次请求重新从顶部开始。若没有任何有效的卡片配置，analyze_image 工具会自动隐藏。",
				helpImggenTitle: "图像生成",
				helpImggenContent: "配置图像生成模型。AI 通过 generate_image 工具生成图片并保存到工作区 generated-images/ 目录。所有修改自动保存。",
				helpAnalyzeTitle: "analyze_image 工具",
				helpAnalyzeContent: "让 AI 分析本地图片或对话中上传的图片。支持 image_path（本地文件路径）和 attachment_id（上传附件 id）两种图片来源，同时给出时以 attachment_id 为准。结果包含 AI 的文字描述、使用的模型和卡片、尝试次数。",
				helpFailoverTitle: "卡片与回退",
				helpFailoverContent: "多卡片列表按顺序从上到下调用。单次请求内，一张卡片连续失败超过重试次数后回退到下一张；超时立即回退不重试。每次新请求重新从顶部卡片开始。支持自定义供应商和 28 个内置固定供应商（OpenAI / Anthropic / Gemini / Groq / MiniMax 等）。",
			helpMirrorTitle: "镜像模型",
			helpMirrorContent: "镜像模型卡片提供三种独立模式控制 /model 中的镜像条目：\n\n1. auto-vision 自动路由（开关1）：注册一条 Auto Vision 条目，自动委派到最近使用的模型。\n2. 镜像全部模型（开关2）：为每个供应商注册镜像 twin，掩盖下方自定义映射列表。\n3. 模型映射列表：自定义原模型 → 镜像名映射，留空则用 <原模型>-vision 命名。\n\n所有配置热更新，对话中途修改下一轮生效。",
				cardListTitle: "API 卡片",
				addCard: "添加模型",
				cardAdded: "已添加模型卡片",
				cardDeleted: "已删除卡片",
				cardsCollapsedAll: "已全部折叠",
				cardsExpandedAll: "已全部展开",
				cardsDeletedAll: "已删除全部卡片",
				importedWf: "已导入工作流",
				deletedWf: "已删除工作流",
				resetDone: "已重置",
				autoMapped: "已自动映射",
				jsonUpdated: "已更新工作流",
				presetAdded: "已新建预设",
				presetDeleted: "已删除预设",
				presetSwitched: "已切换预设",
				noCards: "尚未配置任何 API 卡片，点击右上角“添加模型”开始。",
				cardNamePh: "VLM API",
				nameHint: "双击重命名",
				providerLabel: "供应商",
				providerCustom: "自定义",
				providerOllama: "Ollama",
				protocolLabel: "API 协议",
				timeoutLabel: "超时 (ms)",
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
			tabPlaceholder: "该模块尚在规划中，敬请期待。",
			settingsModuleSection: "模块开关",
			settingsBackoffSection: "退避策略",
			backoffBaseLabel: "退避基数 (ms)",
			backoffMaxLabel: "退避上限 (ms)",
			backoff429BaseLabel: "429 退避基数 (ms)",
			backoff429MaxLabel: "429 退避上限 (ms)",
			retryStatusCodesLabel: "重试状态码",
			retryStatusCodesHint: "逗号分隔的 HTTP 状态码，触发重试+回退",
			verifyReminderLabel: "生图后自动验证提醒",
			toolsSwitchLabel: "视觉工具箱",
			toolsOpen: "已开启",
			toolsOff: "已关闭",
			extCardTitle: "开关扩展",
			extVlmSection: "VLM",
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
				nav: "Multimodal",
				loading: "Loading…",
				loadFail: "Failed to load config: ",
				unknown: "unknown error",
				saving: " · auto-saving…",
				intro: "Configure Multimodal Vision-Language Models (VLM). All changes auto-save and take effect immediately — no Save button. The AI calls these API cards via the analyze_image tool top-down; within a single request it retries and falls back to the next card past the retry limit, and every new request restarts from the top card. If no card is fully configured, analyze_image is hidden automatically.",
				retryTitle: "Retry & Fallback",
				retryLabel: "Retry count (default 5: within a single request, a card falls back to the next after this many consecutive failures)",
				statusPrefix: "Valid cards: ",
				toolVisible: " · analyze_image enabled",
				toolHidden: " · analyze_image hidden (no valid config)",
				aboutTitle: "About",
				aboutDesc: "This plugin gives pure text models full multimodal capabilities.",
				checkUpdateBtn: "Check for Updates",
				versionLabel: "Version ",
				helpBtn: "Help",
				helpSearchPlaceholder: "Search docs…",
				helpPlaceholder: "Content TBD.",
				helpNoResult: "No results found",
				helpGroupVlm: "VLM",
				helpGroupImggen: "Image Generation",
				helpVlmTitle: "VLM Vision Models",
				helpVlmContent: "Configure multimodal vision models. All changes auto-save and take effect immediately. The AI calls analyze_image top-down by card order; retries and falls back to the next card past the limit; new requests restart from the top. If no card is configured, analyze_image is hidden.",
				helpImggenTitle: "Image Generation",
				helpImggenContent: "Configure image generation models. The AI generates images via generate_image and saves them to generated-images/. All changes auto-save.",
				helpAnalyzeTitle: "analyze_image Tool",
				helpAnalyzeContent: "Lets the AI analyze local or uploaded images. Supports image_path (local file path) and attachment_id (uploaded attachment id); attachment_id wins when both are given. Results include the AI's text description, model used, and attempt count.",
				helpFailoverTitle: "Cards & Failover",
				helpFailoverContent: "Multi-card list called top-down. Falls back to next card past retry limit; timeout falls back immediately without retry; new requests restart from the top card. Supports custom providers and 28 built-in fixed providers (OpenAI / Anthropic / Gemini / Groq / MiniMax, etc.).",
			helpMirrorTitle: "Mirror Model",
			helpMirrorContent: "The Mirror Models card provides three independent modes to control mirror entries in /model:\n\n1. auto-vision auto-routing (Toggle 1): registers a single Auto Vision entry that delegates to the last-used model.\n2. Mirror all models (Toggle 2): registers a mirror twin per provider; masks the custom mapping list below.\n3. Model mappings: custom original→mirror name mappings; empty defaults to <original>-vision.\n\nAll changes hot-update and take effect on the next conversation turn.",
				cardListTitle: "API Cards",
				addCard: "Add Model",
				cardAdded: "Card added",
				cardDeleted: "Card deleted",
				cardsCollapsedAll: "All collapsed",
				cardsExpandedAll: "All expanded",
				cardsDeletedAll: "All cards deleted",
				importedWf: "Workflow imported",
				deletedWf: "Workflow deleted",
				resetDone: "Reset complete",
				autoMapped: "Auto-mapped",
				jsonUpdated: "Workflow updated",
				presetAdded: "Preset added",
				presetDeleted: "Preset deleted",
				presetSwitched: "Preset switched",
				noCards: "No API cards yet. Click “Add Model” in the top-right to start.",
				cardNamePh: "VLM API",
				nameHint: "Double-click to rename",
				providerLabel: "Provider",
				providerCustom: "Custom",
				providerOllama: "Ollama",
				protocolLabel: "API Protocol",
				timeoutLabel: "Timeout (ms)",
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
			tabPlaceholder: "This module is planned. Coming soon.",
			settingsModuleSection: "Module Switches",
			settingsBackoffSection: "Backoff Strategy",
			backoffBaseLabel: "Backoff Base (ms)",
			backoffMaxLabel: "Backoff Max (ms)",
			backoff429BaseLabel: "429 Backoff Base (ms)",
			backoff429MaxLabel: "429 Backoff Max (ms)",
			retryStatusCodesLabel: "Retry Status Codes",
			retryStatusCodesHint: "Comma-separated HTTP status codes that trigger retry+failover",
			verifyReminderLabel: "Auto-verify reminder after image generation",
			toolsSwitchLabel: "Vision Toolbox",
			toolsOpen: "Enabled",
			toolsOff: "Disabled",
			extCardTitle: "Switch Extensions",
			extVlmSection: "VLM",
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
			var url = "/vlm/" + method;
			var init = { headers: { Accept: "application/json" } };
			if (!(method === "config" && payload === undefined)) {
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
			".vlm-page { display: flex; flex-direction: column; gap: 14px; padding: 4px 2px; font-size: 13px; color: var(--dsh-fg, #eee); }",
			".vlm-card { border: 1px solid var(--dsh-border, #555); border-radius: 8px; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; background: var(--dsh-bg-2, rgba(128,128,128,0.07)); }",
			".vlm-card h3 { margin: 0 0 2px; font-size: 14px; }",
			".vlm-field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; }",
			".vlm-grow { flex: 1; }",
			".vlm-label { opacity: 0.8; }",
			".vlm-input { padding: 6px 8px; border-radius: 6px; border: 1px solid var(--dsh-border, #555); background: var(--dsh-bg, #1e1e1e); color: var(--dsh-fg, #eee); font-size: 13px; box-sizing: border-box; width: 100%; }",
			".vlm-row { display: flex; gap: 8px; align-items: flex-end; }",
			".vlm-row .vlm-field { flex: 1; }",
			".vlm-btn { padding: 6px 12px; border-radius: 6px; border: 1px solid var(--dsh-border, #555); background: var(--dsh-bg-2, #333); color: var(--dsh-fg, #eee); cursor: pointer; font-size: 13px; white-space: nowrap; }",
			".vlm-btn:disabled { opacity: 0.55; cursor: default; }",
			".vlm-btn:hover { background: var(--dsh-bg, rgba(128,128,128,0.2)); border-color: var(--dsh-accent, #58a6ff); }",
			".vlm-btn:active { background: var(--dsh-bg, rgba(128,128,128,0.35)); transform: scale(0.98); }",
			".vlm-models { font-size: 11px; opacity: 0.75; margin: 0; word-break: break-all; }",
			".vlm-status { font-size: 11px; opacity: 0.75; margin: 0; }",
			".vlm-msg { font-size: 12px; margin: 0; }",
			".vlm-err { color: #f85149; }",
			".vlm-ok { color: #3fb950; }",
			".vlm-desc { font-size: 12px; opacity: 0.8; margin: 0; line-height: 1.6; }",
			// ---- card list ----
			".vlm-list { display: flex; flex-direction: column; gap: 10px; }",
			".vlm-list-head { display: flex; align-items: center; justify-content: space-between; }",
			".vlm-list-title { font-size: 13px; font-weight: 600; }",
			".vlm-add-btn { font-weight: 500; }",
			".vlm-reset-btn { flex: 0 0 auto; padding: 6px 8px; display: inline-flex; align-items: center; justify-content: center; }",
			// ---- card head ----
			".vlm-card-head { display: flex; align-items: center; gap: 8px; min-height: 24px; }",
			".vlm-drag-handle { cursor: grab; color: var(--dsh-fg-muted, #888); padding: 2px 4px; border-radius: 4px; flex: 0 0 auto; -webkit-user-select: none; user-select: none; }",
			".vlm-drag-handle:active { cursor: grabbing; }",
			".vlm-card-name { flex: 1; display: flex; align-items: center; gap: 6px; min-width: 0; font-size: 14px; font-weight: 500; cursor: text; -webkit-user-select: none; user-select: none; }",
			".vlm-card-name-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
			".vlm-card-name-input { padding: 3px 6px; border-radius: 4px; border: 1px solid var(--dsh-accent, #58a6ff); background: var(--dsh-bg, #1e1e1e); color: var(--dsh-fg, #eee); font-size: 13px; width: 100%; box-sizing: border-box; }",
			".vlm-card-summary { font-size: 11px; opacity: 0.55; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 280px; flex: 0 1 auto; }",
			".vlm-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 5px; border: none; background: transparent; color: var(--dsh-fg-muted, #888); cursor: pointer; padding: 0; flex: 0 0 auto; }",
			".vlm-icon-btn:hover { background: var(--dsh-bg, rgba(128,128,128,0.15)); color: var(--dsh-fg, #eee); }",
			".vlm-card-menu-wrap { position: relative; flex: 0 0 auto; }",
			".vlm-card-menu { position: absolute; right: 0; top: 26px; min-width: 132px; background: var(--dsh-bg-2, #262626); border: 1px solid var(--dsh-border, #555); border-radius: 6px; box-shadow: 0 6px 16px rgba(0,0,0,0.35); z-index: 100; padding: 4px; display: flex; flex-direction: column; }",
			".vlm-menu-item { display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 4px; cursor: pointer; font-size: 13px; color: var(--dsh-fg, #eee); }",
			".vlm-menu-item:hover { background: var(--dsh-bg, rgba(128,128,128,0.2)); }",
			".vlm-menu-item.vlm-menu-danger { color: #f85149; }",
			".vlm-menu-item.vlm-menu-danger:hover { background: rgba(248,81,73,0.12); }",
			// ---- clickable header (collapse hot zone) ----
			".vlm-head-clickable { cursor: pointer; }",
			".vlm-head-clickable:hover { background: light-dark(rgba(0,0,0,0.03), rgba(255,255,255,0.04)); }",
			// ---- list container (fallback models + mirror mappings) ----
			".vlm-list-container { border: 1px solid var(--dsh-border, #555); border-radius: 6px; background: light-dark(rgba(0,0,0,0.07), rgba(255,255,255,0.07)); max-height: 280px; overflow-y: auto; padding: 6px; margin-bottom: 8px; }",
			".vlm-list-container::-webkit-scrollbar { width: 8px; }",
			".vlm-list-container::-webkit-scrollbar-track { background: transparent; }",
			".vlm-list-container::-webkit-scrollbar-thumb { background: light-dark(rgba(0,0,0,0.2), rgba(255,255,255,0.2)); border-radius: 4px; }",
			".vlm-list-container::-webkit-scrollbar-thumb:hover { background: light-dark(rgba(0,0,0,0.35), rgba(255,255,255,0.35)); }",
			".vlm-list-empty { padding: 12px 8px; text-align: center; font-size: 12px; opacity: 0.5; font-style: italic; }",
			".vlm-list-container .vlm-fb-model-item:last-child, .vlm-list-container .vlm-mapping-row:last-child { margin-bottom: 0; }",
			// ---- mirror toggle pair (horizontal) ----
			".vlm-mirror-toggle-pair { display: flex; flex-direction: row; gap: 24px; }",
			".vlm-mirror-toggle-pair .vlm-mirror-toggle-row { gap: 8px; }",
			// ---- mirror mappings header (label + button) ----
			".vlm-mirror-mappings-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }",
			// ---- card body ----
			".vlm-card-body { display: flex; flex-direction: column; gap: 10px; }",
			".vlm-select { appearance: auto; }",
			".vlm-input::-ms-reveal, .vlm-input::-ms-clear { display: none; }",
			// ---- key eye toggle ----
			".vlm-key-wrap { position: relative; }",
			".vlm-key-input { padding-right: 32px !important; }",
			".vlm-eye-btn { position: absolute; right: 4px; bottom: 4px; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; border: none; background: transparent; color: var(--dsh-fg, #e6e6e6); cursor: pointer; padding: 0; border-radius: 4px; }",
			".vlm-eye-btn:hover { color: #fff; background: rgba(128,128,128,0.2); }",
			// ---- model dropdown ----
			".vlm-model-wrap { position: relative; }",
			".vlm-model-input { padding-right: 32px !important; }",
			".vlm-model-dropdown { position: absolute; left: 0; right: 0; top: calc(100% + 2px); max-height: 180px; overflow-y: auto; background: var(--dsh-bg-2, #262626); border: 1px solid var(--dsh-border, #555); border-radius: 6px; box-shadow: 0 6px 16px rgba(0,0,0,0.35); z-index: 110; padding: 4px; }",
			// Mirror-mapping dropdown lives inside a scrollable .vlm-list-container; pin it to the viewport so the container scrollbar never clips it. ponytail: fixed doesn't follow page scroll while open; acceptable — it closes on select.
			".vlm-mapping-dropdown { position: fixed; left: 0; top: 0; }",
			".vlm-dd-item { padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; color: var(--dsh-fg, #eee); word-break: break-all; }",
			".vlm-dd-item:hover { background: var(--dsh-bg, rgba(128,128,128,0.2)); }",
			".vlm-dd-item.active { color: var(--dsh-accent, #58a6ff); }",
			// ---- drag feedback ----
			".vlm-card.dragging { opacity: 0.45; border-style: dashed; }",
			".vlm-card.drop-target { outline: 2px dashed var(--dsh-accent, #58a6ff); outline-offset: -2px; }",
			// ---- tabs & module switches ----
		".vlm-tabs { display: flex; gap: 6px; position: sticky; top: 0; z-index: 60; padding: 6px 0; margin: -6px 0 -2px; background: var(--dsw-alias-bg-layer-2, light-dark(#ffffff, rgb(44, 44, 46))); }",
			".vlm-tab { position: relative; padding: 6px 28px 6px 14px; border-radius: 6px; border: 1px solid var(--dsh-border, #555); background: transparent; color: var(--dsh-fg-muted, #888); cursor: pointer; font-size: 13px; flex: 0 1 auto; white-space: nowrap; }",
			".vlm-tab.active { background: var(--dsh-bg-2, #333); border-color: var(--dsh-accent, #58a6ff); color: var(--dsh-fg, #eee); }",
			".vlm-tab:hover { background: var(--dsh-bg, rgba(128,128,128,0.15)); }",
			".vlm-tab:active { background: var(--dsh-bg, rgba(128,128,128,0.25)); }",
			".vlm-tab-dot { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); width: 8px; height: 8px; border-radius: 50%; flex: 0 0 auto; }",
			".vlm-tab-dot.on { background: #3fb950; }",
			".vlm-tab-dot.off { background: #f85149; }",
			// ---- tool.call.toolview cards ----
			".vlm-toolview-card { display: flex; flex-direction: column; gap: 8px; padding: 10px 12px; border: 1px solid var(--dsh-border, #555); border-radius: 8px; background: var(--dsh-bg-2, rgba(128,128,128,0.07)); font-size: 13px; min-width: 0; max-width: 100%; box-sizing: border-box; }",
			".vlm-toolview-head { font-weight: 600; font-size: 13px; }",
			".vlm-toolview-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 0; }",
			".vlm-toolview-path { font-size: 11px; opacity: 0.85; word-break: break-all; flex: 1; min-width: 0; }",
			".vlm-toolview-copy { flex: 0 0 auto; padding: 2px 8px; font-size: 11px; }",
			".vlm-toolview-val { font-size: 12px; opacity: 0.9; word-break: break-all; min-width: 0; }",
			".vlm-tab-body { display: flex; flex-direction: column; gap: 14px; }",
			".vlm-module-row { display: flex; align-items: center; gap: 10px; font-size: 13px; }",
			".vlm-tool-desc { font-size: 11px; opacity: 0.55; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 0 1 auto; min-width: 0; }",
			".vlm-switch { position: relative; display: inline-block; width: 34px; height: 18px; flex: 0 0 auto; }",
			".vlm-switch input { opacity: 0; width: 0; height: 0; }",
			".vlm-switch-slider { position: absolute; inset: 0; border-radius: 9px; background: var(--dsh-bg, #333); border: 1px solid var(--dsh-border, #555); cursor: pointer; transition: background 0.15s; }",
			".vlm-switch-slider::before { content: ''; position: absolute; width: 12px; height: 12px; left: 2px; top: 2px; border-radius: 50%; background: var(--dsh-fg-muted, #888); transition: transform 0.15s; }",
			".vlm-switch input:checked + .vlm-switch-slider { background: var(--dsh-accent, #58a6ff); }",
			".vlm-switch input:checked + .vlm-switch-slider::before { transform: translateX(16px); background: #fff; }",
			// ---- batch actions ----
			".vlm-batch-wrap { position: relative; flex: 0 0 auto; }",
			".vlm-batch-btn { width: 32px; height: 32px; padding: 0; display: inline-flex; align-items: center; justify-content: center; }",
			".vlm-batch-menu { position: absolute; right: 0; top: 26px; min-width: 132px; background: var(--dsh-bg-2, #262626); border: 1px solid var(--dsh-border, #555); border-radius: 6px; box-shadow: 0 6px 16px rgba(0,0,0,0.35); z-index: 100; padding: 4px; display: flex; flex-direction: column; }",
			// ---- provider dropdown (custom, height capped ~60% of native popup) ----
			".vlm-provider-wrap { position: relative; }",
			".vlm-provider-btn { text-align: left; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 8px; }",
			".vlm-provider-btn:hover { background: var(--dsh-bg, rgba(128,128,128,0.15)); }",
			".vlm-provider-btn:active { background: var(--dsh-bg, rgba(128,128,128,0.25)); }",
			".vlm-provider-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
			".vlm-provider-arrow { flex: 0 0 auto; }",
			".vlm-provider-dropdown { position: absolute; left: 0; right: 0; top: calc(100% + 2px); max-height: 320px; overflow-y: auto; background: var(--dsh-bg-2, #262626); border: 1px solid var(--dsh-border, #555); border-radius: 6px; box-shadow: 0 6px 16px rgba(0,0,0,0.35); z-index: 115; padding: 4px; }",
			".vlm-dd-group { padding: 6px 10px 2px; font-size: 11px; color: var(--dsh-fg-muted, #888); }",
			".vlm-fixed-url { font-size: 11px; opacity: 0.6; margin: 0; word-break: break-all; -webkit-user-select: all; user-select: all; }",
			".vlm-menu-item.vlm-menu-confirm { background: rgba(248, 81, 73, 0.18); }",
			// ---- imggen panel ----
			".vlm-imggen-panel { border: 1px solid var(--dsh-border, #555); border-radius: 8px; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; background: var(--dsh-bg-2, rgba(128,128,128,0.07)); }",
			".vlm-imggen-head { display: flex; align-items: center; gap: 8px; min-height: 24px; }",
			".vlm-imggen-title { flex: 1; font-size: 14px; font-weight: 500; }",
			// ---- extension card ----
			".vlm-ext-card { display: flex; flex-direction: column; gap: 10px; }",
			".vlm-ext-section { display: flex; flex-direction: column; gap: 6px; }",
			".vlm-ext-section-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; cursor: pointer; padding: 4px 0; }",
			".vlm-ext-section-title { font-size: 13px; font-weight: 600; opacity: 0.8; }",
			".vlm-ext-toggle-row { display: flex; flex-direction: row; align-items: center; gap: 24px; flex-wrap: wrap; padding: 4px 0; }",
			// ---- preset management ----
			".vlm-preset-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; position: relative; }",
		".vlm-preset-input-wrap { position: relative; flex: 1; min-width: 120px; }",
		".vlm-preset-name-input { width: 100%; padding-right: 36px !important; box-sizing: border-box; }",
		".vlm-preset-dd-btn { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border: none; background: transparent; cursor: pointer; color: var(--dsh-fg-muted, #888); padding: 0; flex: 0 0 auto; }",
		".vlm-preset-dd-btn:hover { color: var(--dsh-fg, #eee); }",
		".vlm-preset-menu { position: absolute; left: 0; top: calc(100% + 2px); right: 0; width: 100%; max-height: 260px; overflow-y: auto; background: var(--dsh-bg-2, #262626); border: 1px solid var(--dsh-border, #555); border-radius: 6px; box-shadow: 0 6px 16px rgba(0,0,0,0.35); z-index: 115; padding: 4px; }",
			".vlm-preset-menu-item { padding: 6px 10px; cursor: pointer; border-radius: 4px; font-size: 13px; }",
			".vlm-preset-menu-item:hover { background: rgba(88,166,255,0.12); }",
			".vlm-preset-menu-item.active { background: rgba(88,166,255,0.18); font-weight: 500; }",
			".vlm-preset-menu-item:active { background: rgba(88,166,255,0.2); }",
			".vlm-preset-divider { height: 1px; background: var(--dsh-border, #555); opacity: 0.3; margin: 6px 0; }",
			".vlm-preset-del-btn:disabled { opacity: 0.35; cursor: not-allowed; }",
		// ---- comfy workflow editor ----
		".vlm-comfy-wf-list { display: flex; flex-direction: column; gap: 8px; }",
		".vlm-comfy-wf-list-title { margin: 0 0 4px; font-size: 13px; }",
		".vlm-comfy-wf-cards { display: flex; flex-direction: column; gap: 4px; }",
		".vlm-comfy-wf-card { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--dsw-alias-bg-layer-2); border-radius: 6px; }",
		".vlm-comfy-wf-toggle { width: 16px; height: 16px; border-radius: 50%; border: none; cursor: pointer; flex-shrink: 0; }",
		".vlm-comfy-wf-toggle.on { background: #22c55e; }",
		".vlm-comfy-wf-toggle.off { border: 2px solid #666; background: transparent; }",
		".vlm-comfy-wf-toggle:hover { opacity: 0.8; }",
		".vlm-comfy-wf-toggle:active { transform: scale(0.9); }",
		".vlm-comfy-wf-name { flex: 1; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
		".vlm-comfy-wf-edit, .vlm-comfy-wf-delete { background: none; border: none; cursor: pointer; padding: 4px; display: inline-flex; }",
		".vlm-comfy-wf-delete { margin-left: 24px; color: #e5484d; }",
		".vlm-comfy-wf-edit svg, .vlm-comfy-wf-delete svg { width: 16px; height: 16px; }",
		".vlm-comfy-wf-import-btn { cursor: pointer; display: inline-flex; align-items: center; align-self: flex-start; }",
		".vlm-comfy-wf-confirm-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }",
		".vlm-comfy-wf-confirm-content { background: var(--dsw-alias-bg-layer-2); padding: 24px; border-radius: 8px; text-align: center; }",
		".vlm-confirm-delete { background: #e5484d; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }",
		".vlm-comfy-wf-edit { display: flex; flex-direction: column; gap: 12px; }",
		".vlm-comfy-wf-edit-header { display: flex; align-items: center; gap: 8px; }",
		".vlm-comfy-wf-title { font-size: 13px; font-weight: 600; }",
		".vlm-comfy-wf-name-input { flex: 1; }",
		".vlm-comfy-wf-json { width: 100%; box-sizing: border-box; font-family: monospace; font-size: 12px; min-height: 120px; resize: vertical; }",
		".vlm-comfy-wf-basic-config { display: flex; flex-direction: column; gap: 6px; }",
		".vlm-comfy-wf-mapping { display: flex; flex-direction: column; gap: 6px; }",
		".vlm-comfy-wf-mapping-toggle { background: none; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; color: inherit; font-size: 13px; }",
		".vlm-comfy-wf-mapping-toggle:hover { color: var(--dsh-accent, #58a6ff); }",
		".vlm-comfy-wf-mapping-body { margin-top: 8px; padding: 8px 12px; background: var(--dsw-alias-bg-layer-2); border-radius: 6px; display: flex; flex-direction: column; gap: 8px; }",
		".vlm-comfy-wf-mapping-summary { display: flex; gap: 8px; font-size: 12px; }",
		".vlm-comfy-wf-automap { align-self: flex-start; }",
		".vlm-toast-container { position: fixed; top: 16px; left: 50%; transform: translateX(-50%); z-index: 9999; display: flex; flex-direction: column; gap: 8px; pointer-events: none; }",
		".vlm-toast-card { display: flex; align-items: flex-start; gap: 8px; padding: 12px 16px; background: var(--dsw-alias-bg-layer-2); border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); min-width: 300px; max-width: 480px; pointer-events: auto; animation: vlm-toast-in 0.2s ease; border-left: 3px solid #3b82f6; }",
		".vlm-toast-info { border-left-color: #3b82f6; } .vlm-toast-info svg { color: #3b82f6; }",
		".vlm-toast-success { border-left-color: #22c55e; } .vlm-toast-success svg { color: #22c55e; }",
		".vlm-toast-warning { border-left-color: #f59e0b; } .vlm-toast-warning svg { color: #f59e0b; }",
		".vlm-toast-error { border-left-color: #e5484d; } .vlm-toast-error svg { color: #e5484d; }",
		".vlm-toast-body { flex: 1; } .vlm-toast-title { font-size: 13px; font-weight: 600; } .vlm-toast-desc { font-size: 12px; opacity: 0.85; margin-top: 2px; word-break: break-word; }",
		".vlm-toast-close { background: none; border: none; color: inherit; opacity: 0.5; cursor: pointer; font-size: 18px; line-height: 1; padding: 0 4px; } .vlm-toast-close:hover { opacity: 1; }",
		"@keyframes vlm-toast-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }",
		".vlm-label-sm { font-size: 11px; opacity: 0.8; }",
			// ---- delete buttons (trash icons are always red) ----
			".vlm-icon-btn.vlm-del-btn { color: #f85149; }",
			".vlm-icon-btn.vlm-del-btn:hover { color: #ff6b63; background: rgba(248,81,73,0.12); }",
			".vlm-btn.vlm-del-btn { color: #f85149; }",
			".vlm-btn.vlm-del-btn:hover:not(:disabled) { color: #ff6b63; }",
			// ---- confirm modal ----
			".vlm-confirm-overlay { position: fixed; inset: 0; z-index: 10001; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }",
			".vlm-confirm-modal { position: relative; width: 90vw; max-width: 400px; background: var(--dsh-bg, #1e1e1e); border: 1px solid var(--dsh-border, #555); border-radius: 12px; padding: 24px; display: flex; flex-direction: column; gap: 16px; }",
			".vlm-confirm-title { font-size: 16px; font-weight: 600; }",
			".vlm-confirm-msg { font-size: 14px; opacity: 0.85; line-height: 1.5; }",
			".vlm-confirm-btns { display: flex; justify-content: flex-end; gap: 8px; }",
			".vlm-confirm-danger { background: rgba(248,81,73,0.15); color: #f85149; border-color: rgba(248,81,73,0.4); }",
			".vlm-confirm-danger:hover { background: rgba(248,81,73,0.25); }",

			// ---- light-dark() theme override (respects harness color-scheme on <html>) ----
			// 浅色主题：输入框/按键背景深灰 + 文字白色；深色主题不变
			"@supports (color: light-dark(#000, #fff)) {",
			"  .vlm-page { color: light-dark(#333, #eee); }",
			"  .vlm-input, .vlm-btn, .vlm-provider-btn { background-color: light-dark(#3a3a3a, #1e1e1e); color: light-dark(#fff, #eee); border-color: light-dark(#555, #555); }",
			"  .vlm-dd-item { color: light-dark(#fff, #eee); }",
			"  .vlm-tab { color: light-dark(#666, #999); }",
			"  .vlm-tab.active { color: light-dark(#fff, #eee); }",
			"  .vlm-btn:hover { background-color: light-dark(rgba(0,0,0,0.12), rgba(255,255,255,0.12)); border-color: light-dark(#58a6ff, #58a6ff); }",
			"  .vlm-btn:active { background-color: light-dark(rgba(0,0,0,0.2), rgba(255,255,255,0.2)); }",
			"  .vlm-tab:hover { background-color: light-dark(rgba(0,0,0,0.08), rgba(255,255,255,0.08)); }",
			"  .vlm-tab:active { background-color: light-dark(rgba(0,0,0,0.15), rgba(255,255,255,0.15)); }",
			"  .vlm-dd-group { color: light-dark(#666, #888); }",
			// ---- preset dropdown + confirm/tool modal light theme (white bg + dark text) ----
			"  .vlm-preset-dd-btn { color: light-dark(#666, #ccc); }",
			"  .vlm-preset-dd-btn:hover { color: light-dark(#333, #fff); }",
			"  .vlm-preset-menu { background-color: light-dark(#fff, #262626); border-color: light-dark(#ccc, #555); box-shadow: 0 6px 16px rgba(0,0,0,0.12); }",
			"  .vlm-preset-menu-item { color: light-dark(#222, #eee); }",
			"  .vlm-preset-menu-item:hover { background-color: light-dark(rgba(0,120,255,0.10), rgba(88,166,255,0.12)); }",
			"  .vlm-preset-menu-item:active { background-color: light-dark(rgba(0,120,255,0.16), rgba(88,166,255,0.20)); }",
			"  .vlm-confirm-modal { background-color: light-dark(#fff, #1e1e1e); border-color: light-dark(#ccc, #555); }",
			"  .vlm-confirm-title { color: light-dark(#111, #eee); }",
			"  .vlm-confirm-msg { color: light-dark(#333, #eee); }",
			"  .vlm-module-row .vlm-label { color: light-dark(#222, #eee); }",
			"}",
			// ---- retry row (single line) ----
			".vlm-retry-row { display: flex; flex-direction: row; align-items: center; gap: 8px; padding: 8px 14px; }",
			".vlm-retry-label { flex: 1; font-weight: 500; }",
			".vlm-retry-sep { flex: 0 0 auto; opacity: 0.3; }",
			".vlm-retry-status { flex: 1; opacity: 0.6; }",
			".vlm-retry-input { width: 60px !important; flex: 0 0 60px; }",
			// ---- fallback card ----
			".vlm-fallback-card { border-style: dashed; }",
			".vlm-fb-model-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border: 1px solid var(--dsh-border, #555); border-radius: 6px; margin-bottom: 4px; background: var(--dsh-bg-2, rgba(128,128,128,0.07)); }",
			".vlm-fb-model-id { flex: 1; font-size: 12px; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
			".vlm-fb-model-item.dragging { opacity: 0.45; border-style: dashed; }",
			".vlm-fb-model-item.drop-target { outline: 2px dashed var(--dsh-accent, #58a6ff); outline-offset: -2px; }",
			// ---- mirror card ----
			".vlm-mirror-toggle-row { display: flex; flex-direction: row; align-items: center; gap: 10px; padding: 4px 0; }",
			".vlm-mirror-toggle-text { display: flex; flex-direction: column; gap: 2px; }",
			".vlm-mirror-hint { font-size: 11px; opacity: 0.55; }",
			".vlm-mirror-divider { height: 1px; background: var(--dsh-border, #555); opacity: 0.3; margin: 8px 0; }",
			".vlm-mapping-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }",
			".vlm-mapping-input { flex: 0 0 160px; }",
			".vlm-dd-group-title { font-size: 11px; font-weight: 600; opacity: 0.5; padding: 6px 10px 2px; text-transform: uppercase; letter-spacing: 0.5px; }",
			".vlm-mirror-disabled { opacity: 0.4; pointer-events: none; }",
			".vlm-mirror-disabled-msg { font-size: 12px; opacity: 0.6; font-style: italic; }",
			".vlm-mapping-list { display: flex; flex-direction: column; gap: 0; }",
			// ---- settings panel ----
			".vlm-settings-panel { display: flex; flex-direction: column; gap: 14px; }",
			".vlm-settings-section { display: flex; flex-direction: column; gap: 8px; }",
".vlm-settings-section-title { font-size: 13px; font-weight: 600; opacity: 0.8; }",
  ".vlm-settings-section .vlm-row { gap: 20px; }",
  ".vlm-about-card { margin-top: 16px; align-items: flex-start; }",
  ".vlm-about-update-btn { align-self: flex-start; }",
  ".vlm-about-version { font-size: 12px; opacity: 0.6; margin-top: 4px; }",
  ".vlm-about-btns { display: flex; gap: 8px; }",
  ".vlm-help-overlay { position: fixed; inset: 0; z-index: 10000; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }",
  ".vlm-help-modal { position: relative; width: 90vw; max-width: 1100px; height: 85vh; background: var(--dsh-bg, #1e1e1e); border: 1px solid var(--dsh-border, #555); border-radius: 12px; display: flex; overflow: hidden; }",
  ".vlm-help-close { position: absolute; top: 8px; right: 12px; z-index: 2; background: none; border: none; color: var(--dsh-fg-muted, #888); font-size: 24px; cursor: pointer; line-height: 1; }",
  ".vlm-help-close:hover { color: var(--dsh-fg, #eee); }",
  ".vlm-help-sidebar { width: 240px; flex-shrink: 0; border-right: 1px solid var(--dsh-border, #444); display: flex; flex-direction: column; overflow: visible; }",
  ".vlm-help-search-wrap { padding: 12px 12px 8px 12px; flex-shrink: 0; position: relative; }",
  ".vlm-help-search { width: 100%; box-sizing: border-box; padding: 7px 28px 7px 10px; border-radius: 6px; border: 1px solid var(--dsh-border, #555); background: var(--dsh-bg-2, rgba(128,128,128,0.1)); color: var(--dsh-fg, #eee); font-size: 13px; outline: none; }",
  ".vlm-help-search:focus { border-color: var(--dsh-accent, #58a6ff); }",
  ".vlm-help-search-clear { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--dsh-fg-muted, #888); font-size: 18px; cursor: pointer; line-height: 1; padding: 2px 4px; }",
  ".vlm-help-search-clear:hover { color: var(--dsh-fg, #eee); }",
  ".vlm-help-search-popup { position: absolute; top: calc(100% + 4px); left: 12px; width: 380px; max-height: 320px; overflow-y: auto; background: var(--dsh-bg, #1e1e1e); border: 1px solid var(--dsh-border, #555); border-radius: 0 8px 8px 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.3); z-index: 20; display: flex; flex-direction: column; gap: 2px; padding: 6px; }",
  ".vlm-help-search-result { display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; background: none; border: none; border-radius: 6px; cursor: pointer; text-align: left; }",
  ".vlm-help-search-result:hover { background: rgba(88,166,255,0.1); }",
  ".vlm-help-search-result-title { font-size: 13px; font-weight: 600; color: var(--dsh-fg, #eee); }",
  ".vlm-help-search-result-snippet { font-size: 12px; color: var(--dsh-fg-muted, #999); line-height: 1.4; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }",
  ".vlm-help-search-empty { padding: 12px 10px; font-size: 13px; color: var(--dsh-fg-muted, #888); text-align: center; }",
  ".vlm-help-nav { flex: 1; overflow-y: auto; padding: 4px 0 16px 0; display: flex; flex-direction: column; gap: 1px; }",
  ".vlm-help-group { display: flex; flex-direction: column; }",
  ".vlm-help-group-title { padding: 8px 16px; background: none; border: none; color: var(--dsh-fg, #eee); font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; cursor: pointer; opacity: 0.7; }",
  ".vlm-help-group-title:hover { opacity: 1; }",
  ".vlm-help-group-title:active { opacity: 0.4; }",
  ".vlm-help-nav-item { padding: 7px 16px 7px 24px; background: none; border: none; color: var(--dsh-fg-muted, #aaa); font-size: 13px; text-align: left; cursor: pointer; border-left: 3px solid transparent; }",
  ".vlm-help-nav-item:hover { color: var(--dsh-fg, #eee); background: rgba(255,255,255,0.05); }",
  ".vlm-help-nav-item:active { background: rgba(255,255,255,0.1); }",
  ".vlm-help-nav-item.active { color: var(--dsh-accent, #58a6ff); border-left-color: var(--dsh-accent, #58a6ff); }",
  ".vlm-help-content { flex: 1; padding: 28px 32px; overflow-y: auto; }",
  ".vlm-help-content-title { font-size: 18px; font-weight: 600; color: var(--dsh-fg, #eee); margin: 0 0 16px 0; }",
  ".vlm-help-content-text { font-size: 14px; line-height: 1.75; color: var(--dsh-fg-muted, #bbb); margin: 0; }",
  ".vlm-help-placeholder { opacity: 0.4; font-style: italic; }",
  // ---- Help modal light theme override (must come AFTER base rules) ----
  "@supports (color: light-dark(#000, #fff)) {",
  "  .vlm-help-modal { background-color: light-dark(#fff, #1e1e1e); border-color: light-dark(#ccc, #555); }",
  "  .vlm-help-close { color: light-dark(#666, #888); }",
  "  .vlm-help-close:hover { color: light-dark(#222, #eee); }",
  "  .vlm-help-sidebar { border-right-color: light-dark(#ddd, #444); }",
  "  .vlm-help-search { background-color: light-dark(rgba(0,0,0,0.04), rgba(128,128,128,0.1)); color: light-dark(#333, #eee); border-color: light-dark(#ccc, #555); }",
  "  .vlm-help-search-clear { color: light-dark(#999, #888); }",
  "  .vlm-help-search-clear:hover { color: light-dark(#333, #eee); }",
  "  .vlm-help-search-popup { background-color: light-dark(#fff, #1e1e1e); border-color: light-dark(#ccc, #555); box-shadow: 0 8px 24px rgba(0,0,0,0.12); }",
  "  .vlm-help-search-result-title { color: light-dark(#111, #eee); }",
  "  .vlm-help-search-result-snippet { color: light-dark(#666, #999); }",
  "  .vlm-help-search-empty { color: light-dark(#999, #888); }",
  "  .vlm-help-group-title { color: light-dark(#555, #eee); }",
  "  .vlm-help-nav-item { color: light-dark(#333, #aaa); }",
  "  .vlm-help-nav-item:hover { color: light-dark(#000, #eee); background-color: light-dark(rgba(0,0,0,0.05), rgba(255,255,255,0.05)); }",
  "  .vlm-help-content-title { color: light-dark(#111, #eee); }",
  "  .vlm-help-content-text { color: light-dark(#333, #bbb); }",
  "}"
].join("\n");

		function ensureStyles() {
			if (typeof document === "undefined" || document.getElementById("dsh-her-eyes-css") !== null) return;
			var tag = document.createElement("style");
			tag.id = "dsh-her-eyes-css";
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
		var I_DRAG = ["M3.5 2.5v0", "M8 2.5v0", "M12.5 2.5v0", "M3.5 8v0", "M8 8v0", "M12.5 8v0", "M3.5 13.5v0", "M8 13.5v0", "M12.5 13.5v0"];
		var I_MENU = ["M3 8v0", "M8 8v0", "M13 8v0"];
		var I_COLLAPSE = ["M4 6.5l4 4 4-4"];
		var I_EXPAND = ["M6.5 4l4 4-4 4"];
		var I_PIN_TOP = ["M8 13V3", "M4 7L8 3l4 4"];
		var I_PIN_BOTTOM = ["M8 3v10", "M4 9l4 4 4-4"];
		var I_TRASH = ["M3 4h10", "M6 4V3h4v1", "M5 4l.5 9.5h5L11 4", "M8 6.5v3.5", "M6 6.5v3"];
	var I_EDIT = ["M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z", "M10 4l2 2"];
	var I_TOAST_INFO = ["M8 2a6 6 0 100 12A6 6 0 008 2zm0 3a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0v-3A.75.75 0 018 5zm0 6a.75.75 0 100 1.5.75.75 0 000-1.5z"];
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
			"qwen-token-plan": { fixed: true, protocol: "openai-completions", endpoint: "https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1", name: "Qwen Token Plan" },
			"qwen-token-plan-cn": { fixed: true, protocol: "openai-completions", endpoint: "https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1", name: "Qwen Token Plan CN" },
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
				["agnes", "agnes-cn", "openai", "openrouter", "together", "fireworks", "huggingface", "bailian"].indexOf(p) >= 0;
		});

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
			var wrap = el.closest(".vlm-model-wrap");
			if (!wrap) return;
			var below = window.innerHeight - wrap.getBoundingClientRect().bottom;
			if (below < 210) { el.style.top = "auto"; el.style.bottom = "calc(100% + 2px)"; }
		}

		// Mirror-mapping dropdown: viewport-fixed so the scrollable mapping list never clips it.
		// Coordinates computed from the trigger wrap; flips up when space below is tight.
		function mappingDdRef(el) {
			if (!el) return;
			var wrap = el.closest(".vlm-model-wrap");
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
			var wrap = el.closest(".vlm-provider-wrap");
			if (!wrap) return;
			var rect = wrap.getBoundingClientRect();
			var below = window.innerHeight - rect.bottom;
			if (below < 340) { el.style.top = "auto"; el.style.bottom = "calc(100% + 2px)"; }
		}

		// Flip the card / batch / preset menus up when space below is tight (mirrors provDdRef).
		function menuDdRef(el) {
			if (!el) return;
			var wrap = el.closest(".vlm-card-menu-wrap, .vlm-batch-wrap, .vlm-preset-bar");
			if (!wrap) return;
			var below = window.innerHeight - wrap.getBoundingClientRect().bottom;
			var need = Math.min(el.offsetHeight || 140, 280) + 8;
			if (below < need) { el.style.top = "auto"; el.style.bottom = "calc(100% + 2px)"; }
		}

		// ---------- shared UI atoms ----------
		function Field(props) {
			return React.createElement("label", { className: "vlm-field" }, [
				React.createElement("span", { className: "vlm-label" }, props.label),
				React.createElement("input", {
					className: "vlm-input",
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
			return React.createElement("label", { className: "vlm-field" }, [
				React.createElement("span", { className: "vlm-label" }, props.label),
				React.createElement("select", {
					className: "vlm-input vlm-select",
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
					var cardEl = e.currentTarget.closest(".vlm-card");
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
			var head = React.createElement("div", { className: "vlm-card-head vlm-head-clickable", onClick: toggleCollapse }, [
				React.createElement("div", {
					className: "vlm-drag-handle",
					draggable: true,
					title: t("dragHint"),
					onDragStart: dragStart,
					onDragEnd: dragEnd,
					onClick: function (e) { e.stopPropagation(); }
				}, React.createElement(SvgIcon, { d: I_DRAG })),
				React.createElement("div", { className: "vlm-card-name" }, renaming
					? React.createElement("input", {
						className: "vlm-card-name-input",
						defaultValue: card.name,
						autoFocus: true,
						onKeyDown: commitRename,
						onBlur: blurRename
					})
					: [
						React.createElement("span", { className: "vlm-card-name-text", onDoubleClick: startRename, onClick: function (e) { e.stopPropagation(); } }, card.name || t("cardNamePh")),
						summary ? React.createElement("span", { className: "vlm-card-summary" }, summary) : null
					]),
				React.createElement("div", { className: "vlm-card-menu-wrap" }, [
					React.createElement("button", {
						className: "vlm-icon-btn vlm-card-menu-btn",
						onClick: function (e) { e.stopPropagation(); props.onToggleMenu(id); }
					}, React.createElement(SvgIcon, { d: I_MENU })),
					menuOpen ? React.createElement("div", { className: "vlm-card-menu", ref: menuDdRef }, [
						React.createElement("div", { className: "vlm-menu-item", onClick: function () { props.onMoveTop(id); props.onCloseMenu(); } },
							React.createElement(SvgIcon, { d: I_PIN_TOP }), React.createElement("span", null, t("menuPinTop"))),
						React.createElement("div", { className: "vlm-menu-item", onClick: function () { props.onMoveBottom(id); props.onCloseMenu(); } },
							React.createElement(SvgIcon, { d: I_PIN_BOTTOM }), React.createElement("span", null, t("menuPinBottom"))),
						React.createElement("div", { className: "vlm-menu-item vlm-menu-danger" + (confirmDel ? " vlm-menu-confirm" : ""), onClick: function () { props.onDeleteClick(id); } },
							React.createElement(SvgIcon, { d: I_TRASH }), React.createElement("span", null, confirmDel ? t("confirmDelete") : t("menuDelete")))
					]) : null
				]),
				React.createElement("button", {
					className: "vlm-icon-btn",
					title: expanded ? "Collapse" : "Expand",
					onClick: function (e) { e.stopPropagation(); toggleCollapse(); }
				}, React.createElement(SvgIcon, { d: expanded ? I_COLLAPSE : I_EXPAND }))
			]);

			var body = null;
			if (expanded) {
				body = React.createElement("div", { className: "vlm-card-body" }, [
					React.createElement("div", { className: "vlm-row" }, [
						React.createElement("div", { className: "vlm-field vlm-grow" }, [
							React.createElement("span", { className: "vlm-label" }, t("providerLabel")),
							React.createElement("div", { className: "vlm-provider-wrap" }, [
								React.createElement("button", {
									className: "vlm-input vlm-provider-btn", type: "button",
									onClick: function () { props.onToggleProv(id); }
								}, [
									React.createElement("span", { className: "vlm-provider-label" }, providerDisplay(card.provider, t)),
									React.createElement("span", { className: "vlm-provider-arrow" }, provOpen ? "▴" : "▾")
								]),
								provOpen ? React.createElement("div", { className: "vlm-provider-dropdown", ref: provDdRef }, providerGroups.map(function (g) {
									return [React.createElement("div", { key: "g-" + g.label, className: "vlm-dd-group" }, g.label)].concat(g.options.map(function (o) {
										return React.createElement("div", {
											key: o.value, className: "vlm-dd-item" + (o.value === card.provider ? " active" : ""),
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
					React.createElement("div", { className: "vlm-row" }, [
						React.createElement(Field, {
							label: t("timeoutLabel"),
							number: true,
							min: 1000,
							value: String(card.timeoutMs != null ? card.timeoutMs : 120000),
							placeholder: "120000",
							onChange: function (e) { props.onPatch(id, "timeoutMs", e.target.value); }
						}),
						React.createElement(Field, {
							label: "上下文窗口",
							number: true, min: 1,
							value: String(card.contextWindow != null ? card.contextWindow : ""),
							placeholder: "262144",
							onChange: function (e) { props.onPatch(id, "contextWindow", e.target.value); }
						}),
						React.createElement(Field, {
							label: "最大输出",
							number: true, min: 1,
							value: String(card.maxOutput != null ? card.maxOutput : ""),
							placeholder: "32768",
							onChange: function (e) { props.onPatch(id, "maxOutput", e.target.value); }
						})
					]),
					isFixed
						? React.createElement("p", { className: "vlm-fixed-url" }, t("fixedUrlLabel") + ": " + prov.endpoint)
						: React.createElement(Field, {
							label: t("endpointLabel"),
							value: card.endpoint || "",
							placeholder: t("endpointPh"),
							onChange: function (e) { props.onPatch(id, "endpoint", e.target.value); }
						}),
					isOllama
						? React.createElement("p", { className: "vlm-models" }, t("ollamaHint"))
						: React.createElement("label", { className: "vlm-field" }, [
							React.createElement("span", { className: "vlm-label" }, t("apiKeyLabel")),
							React.createElement("div", { className: "vlm-key-wrap" }, [
								React.createElement("input", {
									className: "vlm-input vlm-key-input",
									type: isRevealed ? "text" : "password",
									value: keyDraftValue,
									placeholder: card.apiKeySet ? t("apiKeySet") : "sk-...",
									onChange: function (e) { props.onSaveKey(id, e.target.value); }
								}),
								React.createElement("button", {
									className: "vlm-eye-btn", type: "button",
									title: isRevealed ? t("keyHide") : t("keyReveal"),
									onClick: function (e) { e.preventDefault(); props.onToggleReveal(id); }
								}, React.createElement(SvgIcon, { d: isRevealed ? I_EYE_OFF : I_EYE }))
							])
						]),
					React.createElement("div", { className: "vlm-row" }, [
					React.createElement("div", { className: "vlm-field vlm-grow" }, [
						React.createElement("span", { className: "vlm-label" }, t("modelLabel")),
						React.createElement("div", { className: "vlm-model-wrap" }, [
							React.createElement("input", {
								className: "vlm-input vlm-model-input",
								type: "text",
								value: card.model || "",
								placeholder: t("modelPh"),
								onChange: function (e) { props.onPatch(id, "model", e.target.value); }
							}),
							modelList.length > 0 ? React.createElement("button", {
								className: "vlm-eye-btn", type: "button",
								title: t("ddHint"),
								onClick: function (e) { e.preventDefault(); props.onToggleDd(id); }
							}, React.createElement(SvgIcon, { d: isDdOpen ? I_COLLAPSE : I_EXPAND })) : null,
							isDdOpen && modelList.length > 0 ? React.createElement("div", { className: "vlm-model-dropdown", ref: ddRef },
								modelList.map(function (m) {
									return React.createElement("div", {
										key: m, className: "vlm-dd-item" + (m === card.model ? " active" : ""),
										onClick: function () { props.onPickModel(id, m); }
									}, m);
								})) : null
						])
					]),
					React.createElement("button", {
						className: "vlm-btn",
						disabled: busy !== "",
						onClick: function () { props.onFetchModels(id); }
					}, busy === "mdl-" + id ? t("fetching") : t("fetchBtn"))
				]),
					(!card.endpoint && !isFixed) ? React.createElement("p", { className: "vlm-models" }, t("endpointHint")) : null
				]);
			}

			return React.createElement("div", {
				className: "vlm-card" + (isDragging ? " dragging" : "") + (isDropTarget ? " drop-target" : ""),
				onDragOver: dragOver,
				onDrop: drop,
				onDragEnd: dragEnd
			}, [head, body]);
		}

		// ---------- toast notification system (v2.7) ----------
		var TOAST_ICONS = { info: I_TOAST_INFO, success: I_TOAST_SUCCESS, warning: I_TOAST_WARNING, error: I_TOAST_ERROR };
		var TOAST_DUR = { info: 3000, success: 3000, warning: 3000, error: 3000 };
		function ToastCard(props) {
			var t = props.toast || {};
			var icon = TOAST_ICONS[t.type] || TOAST_ICONS.info;
			return React.createElement("div", {
				className: "vlm-toast-card vlm-toast-" + (t.type || "info"),
				onClick: function () { if (props.onExtend) props.onExtend(t.id); }
			}, [
				React.createElement(SvgIcon, { d: icon, width: 18, height: 18 }),
				React.createElement("div", { className: "vlm-toast-body" }, [
					t.title ? React.createElement("div", { className: "vlm-toast-title" }, t.title) : null,
					t.desc ? React.createElement("div", { className: "vlm-toast-desc" }, t.desc) : null
				]),
				React.createElement("button", { className: "vlm-toast-close", onClick: function (e) { e.stopPropagation(); if (props.onClose) props.onClose(); } }, "\u00d7")
			]);
		}
		function ToastContainer(props) {
			var toasts = Array.isArray(props.toasts) ? props.toasts : [];
			return React.createElement("div", { className: "vlm-toast-container" },
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
				return React.createElement("div", { key: wf.id, className: "vlm-comfy-wf-card" }, [
					React.createElement("button", {
						className: "vlm-comfy-wf-toggle " + (isActive ? "on" : "off"),
						title: isActive ? "ON" : "OFF",
						onClick: function () { if (!isActive) props.onToggle(wf.id); }
					}),
					React.createElement("span", { className: "vlm-comfy-wf-name" }, wf.name || t("comfyWfNamePh")),
					React.createElement("button", {
						className: "vlm-comfy-wf-edit", title: t("comfyWfEdit"),
						onClick: function () { props.onEdit(wf.id); }
					}, React.createElement(SvgIcon, { d: I_EDIT })),
					React.createElement("button", {
						className: "vlm-comfy-wf-delete", title: t("comfyWfDelete"),
						onClick: function () { delConfirm[1](wf.id); }
					}, React.createElement(SvgIcon, { d: I_TRASH }))
				]);
			});
			var modal = delConfirm[0] ? React.createElement("div", { className: "vlm-comfy-wf-confirm-modal" }, [
				React.createElement("div", { className: "vlm-comfy-wf-confirm-content" }, [
					React.createElement("p", null, t("comfyWfDeleteConfirm")),
					React.createElement("div", { className: "vlm-row" }, [
						React.createElement("button", {
							className: "vlm-btn vlm-confirm-delete",
							onClick: function () { props.onDelete(delConfirm[0]); delConfirm[1](null); }
						}, t("comfyWfDeleteConfirmBtn")),
						React.createElement("button", {
							className: "vlm-btn vlm-cancel",
							onClick: function () { delConfirm[1](null); }
						}, t("comfyWfDeleteCancel"))
					])
				])
			]) : null;
			return React.createElement("div", { className: "vlm-comfy-wf-list" }, [
				React.createElement("h4", { className: "vlm-comfy-wf-list-title" }, t("comfyWfListTitle")),
				workflows.length === 0 ? React.createElement("p", { className: "vlm-msg" }, t("comfyWfNoWorkflows")) : null,
				React.createElement("div", { className: "vlm-comfy-wf-cards" }, cards),
				React.createElement("label", { className: "vlm-btn vlm-comfy-wf-import-btn" }, [
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
				]),
				modal
			]);
		}

		function WorkflowEdit(props) {
			var t = props.t;
			var wf = props.wf || {};
			var collapsed = React.useState(true);
			var jsonDraft = React.useState(wf.workflow || "");
			var nameDraft = React.useState(wf.name || "");
			React.useEffect(function () { nameDraft[1](wf.name || ""); }, [wf.name]);
			var summary = wf.mapping ? [
				{ k: "sampler", l: "KSampler" }, { k: "checkpoint", l: "Checkpoint" },
				{ k: "latent", l: "EmptyLatent" }, { k: "positive", l: "Positive" }, { k: "negative", l: "Negative" }
			].filter(function (m) { return wf.mapping[m.k]; }).map(function (m) { return m.l + ": " + wf.mapping[m.k]; }).join(" · ") : "";
			return React.createElement("div", { className: "vlm-comfy-wf-edit" }, [
				React.createElement("div", { className: "vlm-comfy-wf-edit-header" }, [
					React.createElement("span", { className: "vlm-comfy-wf-title" }, t("comfyWfListTitle")),
					React.createElement("input", {
						className: "vlm-input vlm-comfy-wf-name-input", type: "text",
						placeholder: t("comfyWfNamePh"), value: nameDraft[0],
						onChange: function (e) { nameDraft[1](e.target.value); },
						onBlur: function (e) { if (e.target.value !== (wf.name || "")) props.onRename(wf.id, e.target.value); }
					}),
					React.createElement("button", { className: "vlm-btn vlm-comfy-wf-back", onClick: props.onBack }, t("comfyWfBack"))
				]),
				React.createElement("div", { className: "vlm-field" }, [
					React.createElement("span", { className: "vlm-label" }, t("comfyWfJsonLabel")),
					React.createElement("textarea", {
						className: "vlm-input vlm-comfy-wf-json", rows: 12,
						value: jsonDraft[0], onChange: function (e) { jsonDraft[1](e.target.value); }
					}),
					React.createElement("button", {
						className: "vlm-btn", onClick: function () { props.onUpdateJson(wf.id, jsonDraft[0]); }
					}, "保存 JSON")
				]),
				React.createElement("div", { className: "vlm-comfy-wf-basic-config" }, [
					React.createElement("span", { className: "vlm-label" }, t("comfyWfBasicConfig")),
					React.createElement("div", { className: "vlm-row" }, [
						React.createElement("div", { className: "vlm-field" }, [
							React.createElement("span", { className: "vlm-label vlm-label-sm" }, t("comfyWfSteps")),
							React.createElement("input", { className: "vlm-input", type: "number", value: wf.steps === "" ? "" : wf.steps, placeholder: "20",
								onChange: function (e) { props.onUpdateConfig(wf.id, "steps", e.target.value === "" ? "" : Number(e.target.value)); } })
						]),
						React.createElement("div", { className: "vlm-field" }, [
							React.createElement("span", { className: "vlm-label vlm-label-sm" }, t("comfyWfCfg")),
							React.createElement("input", { className: "vlm-input", type: "number", value: wf.cfg === "" ? "" : wf.cfg, placeholder: "8",
								onChange: function (e) { props.onUpdateConfig(wf.id, "cfg", e.target.value === "" ? "" : Number(e.target.value)); } })
						]),
						React.createElement("div", { className: "vlm-field" }, [
							React.createElement("span", { className: "vlm-label vlm-label-sm" }, t("comfyWfScheduler")),
							React.createElement("input", { className: "vlm-input", type: "text", value: wf.scheduler || "", placeholder: "normal",
								onChange: function (e) { props.onUpdateConfig(wf.id, "scheduler", e.target.value); } })
						]),
						React.createElement("div", { className: "vlm-field" }, [
							React.createElement("span", { className: "vlm-label vlm-label-sm" }, t("comfyWfSeed")),
							React.createElement("input", { className: "vlm-input", type: "number", value: wf.seed === "" ? "" : wf.seed, placeholder: t("comfyWfSeed"),
								onChange: function (e) { props.onUpdateConfig(wf.id, "seed", e.target.value === "" ? "" : Number(e.target.value)); } })
						])
					])
				]),
				React.createElement("div", { className: "vlm-comfy-wf-mapping" }, [
					React.createElement("button", {
						className: "vlm-comfy-wf-mapping-toggle",
						onClick: function () { collapsed[1](!collapsed[0]); }
					}, [
						React.createElement(SvgIcon, { d: collapsed[0] ? I_EXPAND : I_COLLAPSE }),
						React.createElement("span", null, t("comfyWfMappingTitle"))
					]),
					!collapsed[0] ? React.createElement("div", { className: "vlm-comfy-wf-mapping-body" }, [
						React.createElement("button", {
							className: "vlm-btn vlm-comfy-wf-automap",
							onClick: function () { props.onAutoMap(wf.id); }
						}, t("comfyWfAutoMap")),
						React.createElement("div", { className: "vlm-row" }, [
								{ key: "sampler", label: "KSampler" },
								{ key: "checkpoint", label: "Checkpoint" },
								{ key: "latent", label: "EmptyLatent" },
								{ key: "positive", label: "Positive" },
								{ key: "negative", label: "Negative" }
							].map(function (m) {
								return React.createElement("div", { key: m.key, className: "vlm-field vlm-grow" }, [
									React.createElement("span", { className: "vlm-label vlm-label-sm" }, m.label),
									React.createElement("input", {
										className: "vlm-input", type: "text",
										value: (wf.mapping && wf.mapping[m.key]) || "",
										onChange: function (e) { props.onUpdateMapping(wf.id, m.key, e.target.value); }
									})
								]);
							}))
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
			var busy = props.busy;
			var menuOpen = React.useState(false);
			// v2.7: workflow list/edit view state
			var wfView = React.useState("list"); // "list" | "edit"
			var editWf = React.useState(null); // workflow entry being edited
			var presetNameDraft = React.useState(props.activePresetName || "");
			React.useEffect(function () { presetNameDraft[1](props.activePresetName || ""); }, [props.activePresetName]);

			// close the reset menu on outside click (also clears the armed confirm state)
			React.useEffect(function () {
				if (!menuOpen[0]) return;
				function close(e) {
					var tgt = e.target;
					if (!tgt || !tgt.closest || !tgt.closest(".vlm-card-menu-wrap")) {
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
					if (!tgt || !tgt.closest || !tgt.closest(".vlm-preset-bar")) {
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

			var head = React.createElement("div", { className: "vlm-imggen-head" }, [
				React.createElement("span", { className: "vlm-imggen-title" }, t("imggenTitle")),
				React.createElement("div", { className: "vlm-card-menu-wrap" }, [
					React.createElement("button", {
						className: "vlm-icon-btn vlm-card-menu-btn",
						onClick: function () { menuOpen[1](!menuOpen[0]); }
					}, React.createElement(SvgIcon, { d: I_MENU })),
					menuOpen[0] ? React.createElement("div", { className: "vlm-card-menu", ref: menuDdRef }, [
						React.createElement("div", {
							className: "vlm-menu-item vlm-menu-danger" + (props.confirmReset ? " vlm-menu-confirm" : ""),
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
		var presetBar = React.createElement("div", { className: "vlm-preset-bar" }, [
			React.createElement("div", { className: "vlm-preset-input-wrap" }, [
				React.createElement("input", {
					className: "vlm-input vlm-preset-name-input",
					type: "text",
					value: presetNameDraft[0],
					placeholder: t("presetNamePh"),
					onChange: function (e) { presetNameDraft[1](e.target.value); },
					onBlur: function (e) { if (e.target.value !== (props.activePresetName || "")) props.onRenamePreset(e.target.value); }
				}),
				React.createElement("button", {
					className: "vlm-preset-dd-btn", type: "button",
					onClick: props.onTogglePresetDd
				}, React.createElement(SvgIcon, { d: props.presetDdOpen ? I_COLLAPSE : I_EXPAND })),
				props.presetDdOpen ? React.createElement("div", { className: "vlm-preset-menu", ref: menuDdRef },
					presets.map(function (p) {
						return React.createElement("div", {
							key: p.id, className: "vlm-preset-menu-item" + (p.id === props.activePresetId ? " active" : ""),
							onClick: function () { props.onSwitchPreset(p.id); }
						}, p.name);
					})
				) : null
			]),
			React.createElement("button", {
				className: "vlm-btn vlm-preset-new-btn", type: "button",
				title: t("presetNew"),
				onClick: props.onAddPreset
			}, React.createElement(SvgIcon, { d: I_PLUS })),
			React.createElement("button", {
				className: "vlm-btn vlm-preset-del-btn vlm-del-btn", type: "button",
				title: presets.length <= 1 ? t("presetDeleteDisabled") : t("presetDelete"),
				disabled: presets.length <= 1,
				onClick: props.onConfirmDeletePreset
			}, React.createElement(SvgIcon, { d: I_TRASH }))
		]);
		var confirmModal = props.presetDeleteConfirm ? React.createElement("div", { className: "vlm-confirm-overlay", onClick: props.onCancelDeletePreset }, [
			React.createElement("div", { className: "vlm-confirm-modal", onClick: function (e) { e.stopPropagation(); } }, [
				React.createElement("span", { className: "vlm-confirm-title" }, t("presetDeleteTitle")),
				React.createElement("p", { className: "vlm-confirm-msg" }, t("presetDeleteMsg")),
				React.createElement("div", { className: "vlm-confirm-btns" }, [
					React.createElement("button", { className: "vlm-btn", onClick: props.onCancelDeletePreset }, t("presetDeleteCancel")),
					React.createElement("button", { className: "vlm-btn vlm-confirm-danger", onClick: props.onConfirmDelete }, t("presetDeleteConfirm"))
				])
			])
		]) : null;
			var body = React.createElement("div", { className: "vlm-card-body" }, [
				React.createElement("div", { className: "vlm-row" }, [
					React.createElement("div", { className: "vlm-field vlm-grow" }, [
						React.createElement("span", { className: "vlm-label" }, t("imggenProviderLabel")),
						React.createElement("div", { className: "vlm-provider-wrap" }, [
							React.createElement("button", {
								className: "vlm-input vlm-provider-btn", type: "button",
								onClick: function () { props.onToggleProv(); }
							}, [
								React.createElement("span", { className: "vlm-provider-label" }, providerDisplay(cfg.provider, t)),
								React.createElement("span", { className: "vlm-provider-arrow" }, provOpen ? "▴" : "▾")
							]),
							provOpen ? React.createElement("div", { className: "vlm-provider-dropdown", ref: provDdRef }, providerGroups.map(function (g) {
								return [React.createElement("div", { key: "g-" + g.label, className: "vlm-dd-group" }, g.label)].concat(g.options.map(function (o) {
									return React.createElement("div", {
										key: o.value, className: "vlm-dd-item" + (o.value === cfg.provider ? " active" : ""),
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
					? React.createElement("p", { className: "vlm-fixed-url" }, t("fixedUrlLabel") + ": " + meta.endpoint)
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
					? React.createElement("p", { className: "vlm-models" }, t("ollamaHint"))
					: React.createElement("label", { className: "vlm-field" }, [
						React.createElement("span", { className: "vlm-label" }, t("imggenKeyLabel")),
						React.createElement("div", { className: "vlm-key-wrap" }, [
							React.createElement("input", {
								className: "vlm-input vlm-key-input",
								type: isRevealed ? "text" : "password",
								value: keyDraftValue,
								placeholder: cfg.apiKeySet ? t("apiKeySet") : (isComfy ? t("comfyKeyPh") : "sk-..."),
								onChange: function (e) { props.onSaveKey(e.target.value); }
							}),
							React.createElement("button", {
								className: "vlm-eye-btn", type: "button",
								title: isRevealed ? t("keyHide") : t("keyReveal"),
								onClick: function (e) { e.preventDefault(); props.onToggleReveal(); }
							}, React.createElement(SvgIcon, { d: isRevealed ? I_EYE_OFF : I_EYE }))
						])
					]),
				React.createElement("div", { className: "vlm-row" }, [
					React.createElement("div", { className: "vlm-field vlm-grow" }, [
						React.createElement("span", { className: "vlm-label" }, t("imggenModelLabel")),
						React.createElement("div", { className: "vlm-model-wrap" }, [
							React.createElement("input", {
								className: "vlm-input vlm-model-input",
								type: "text",
								value: cfg.model || "",
								placeholder: isComfy ? t("comfyModelPh") : t("modelPh"),
								onChange: function (e) { props.onPatch("model", e.target.value); }
							}),
							modelList.length > 0 ? React.createElement("button", {
								className: "vlm-eye-btn", type: "button",
								title: t("ddHint"),
								onClick: function (e) { e.preventDefault(); props.onToggleDd(); }
							}, React.createElement(SvgIcon, { d: isDdOpen ? I_COLLAPSE : I_EXPAND })) : null,
							isDdOpen && modelList.length > 0 ? React.createElement("div", { className: "vlm-model-dropdown", ref: ddRef },
								modelList.map(function (m) {
									return React.createElement("div", {
										key: m, className: "vlm-dd-item" + (m === cfg.model ? " active" : ""),
										onClick: function () { props.onPickModel(m); }
									}, m);
								})) : null
						])
					]),
					React.createElement("button", {
						className: "vlm-btn",
						disabled: busy !== "",
						onClick: function () { props.onFetchModels(); }
					}, busy === "ig-mdl" ? t("imggenFetching") : t("imggenFetchBtn"))
				]),
				isComfy ? null : React.createElement("div", { className: "vlm-module-row" }, [
					React.createElement("label", { className: "vlm-switch" }, [
						React.createElement("input", { type: "checkbox", checked: !!cfg.filterImageModels, onChange: function () { props.onToggleFilter(); } }),
						React.createElement("span", { className: "vlm-switch-slider" })
					]),
					React.createElement("span", { className: "vlm-label" }, t("imggenFilterLabel")),
					React.createElement("span", { className: "vlm-status" }, t("imggenFilterHint"))
				]),
				React.createElement("div", { className: "vlm-row" }, [
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
				isComfy ? React.createElement("p", { className: "vlm-status" }, t("comfyHint")) : null,
				isComfy && wfView[0] === "list" ? React.createElement(WorkflowList, {
					t: t, workflows: props.workflows || [], activeId: props.activeWfId,
					onImport: props.onImport, onToggle: props.onToggle,
					onEdit: function (id) { editWf[1]((props.workflows || []).find(function (w) { return w.id === id; })); wfView[1]("edit"); },
					onDelete: props.onDelete
				}) : null,
				isComfy && wfView[0] === "edit" && editWf[0] ? React.createElement(WorkflowEdit, {
					t: t, wf: editWf[0], onBack: function () { wfView[1]("list"); editWf[1](null); },
					onRename: props.onRename, onUpdateJson: props.onUpdateJson,
					onUpdateConfig: props.onUpdateConfig, onAutoMap: props.onAutoMap,
					onUpdateMapping: props.onUpdateMapping
				}) : null,
				React.createElement("p", { className: "vlm-status" },
					t("imggenStatusPrefix") + (props.visible ? t("imggenToolVisible") : (isComfy ? t("imggenToolHidden") : t("toolHidden"))) +
					(props.modelCount != null ? " · " + t("fetchOkPrefix") + props.modelCount + t("fetchOkSuffix") : ""))
			]);

return React.createElement("div", { className: "vlm-imggen-panel" }, [head, presetBar, React.createElement("div", { className: "vlm-preset-divider" }), body, confirmModal]);
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
			var head = React.createElement("div", { className: "vlm-card-head vlm-head-clickable", onClick: props.onToggleCollapse }, [
				React.createElement("div", { className: "vlm-card-name" }, [
					React.createElement("span", { className: "vlm-card-name-text" }, t("fallbackTitle") || "兜底模型"),
					collapsed ? React.createElement("span", { className: "vlm-card-summary" }, cfg.provider + " · " + ((cfg.models && cfg.models.length) || 0) + " 个模型") : null
				]),
				React.createElement("button", {
					className: "vlm-icon-btn",
					title: collapsed ? "Expand" : "Collapse",
					onClick: function (e) { e.stopPropagation(); props.onToggleCollapse(); }
				}, React.createElement(SvgIcon, { d: collapsed ? I_EXPAND : I_COLLAPSE }))
			]);
			var body = null;
			if (!collapsed) {
				body = React.createElement("div", { className: "vlm-card-body" }, [
					React.createElement("div", { className: "vlm-row" }, [
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
					React.createElement("div", { className: "vlm-field" }, [
						React.createElement("span", { className: "vlm-label" }, t("fallbackModelsLabel") || "模型列表（从上到下回退）"),
						React.createElement("div", { className: "vlm-row" }, [
							React.createElement("div", { className: "vlm-field vlm-grow" }, [
								React.createElement("div", { className: "vlm-model-wrap" }, [
									React.createElement("input", {
										className: "vlm-input vlm-model-input",
										type: "text",
										value: props.fbSearch || "",
										placeholder: "输入关键词搜索模型",
										onChange: function (e) { props.onSearchChange(e.target.value); }
									}),
									modelList.length > 0 ? React.createElement("button", {
										className: "vlm-eye-btn", type: "button",
										title: t("ddHint"),
										onClick: function (e) { e.preventDefault(); props.onToggleDd(); }
									}, React.createElement(SvgIcon, { d: isDdOpen ? I_COLLAPSE : I_EXPAND })) : null,
									isDdOpen ? React.createElement("div", { className: "vlm-model-dropdown", ref: ddRef },
										(function () {
											var search = String(props.fbSearch || "").toLowerCase();
											var filtered = search ? modelList.filter(function (m) { return String(m).toLowerCase().indexOf(search) >= 0; }) : modelList;
											return filtered.map(function (m) {
												return React.createElement("div", {
													key: m, className: "vlm-dd-item" + ((cfg.models || []).indexOf(m) >= 0 ? " active" : ""),
													onClick: function () { props.onPickModel(m); }
												}, m);
											});
										})()
									) : null
								])
							]),
							React.createElement("button", {
								className: "vlm-btn",
								disabled: props.busy !== "",
								onClick: props.onFetchModels
							}, props.busy === "fb-mdl" ? t("fetching") : t("fetchBtn")),
							React.createElement("button", {
								className: "vlm-btn vlm-reset-btn",
								title: t("fallbackReset") || "重置默认",
								onClick: props.onResetModels
							}, React.createElement(SvgFillIcon, { d: I_RESET_SVG }))
						]),
						React.createElement("div", { className: "vlm-list-container" },
							(cfg.models || []).length === 0
								? React.createElement("div", { className: "vlm-list-empty" }, t("fallbackEmpty"))
								: (cfg.models || []).map(function (m, i) {
							return React.createElement("div", {
								key: "fb-" + i, className: "vlm-fb-model-item" + (props.fbDragFrom === i ? " dragging" : "") + (props.fbDropOver === i ? " drop-target" : ""),
								draggable: true,
								onDragStart: function (e) { if (e.dataTransfer) { e.dataTransfer.setData("text/plain", String(i)); e.dataTransfer.effectAllowed = "move"; } props.onDragStart && props.onDragStart(i); },
								onDragOver: function (e) { e.preventDefault(); if (props.fbDragFrom !== null && props.fbDragFrom !== i) props.onDropOver && props.onDropOver(i); },
								onDrop: function (e) { e.preventDefault(); var from = Number(e.dataTransfer.getData("text/plain")); if (!Number.isNaN(from) && from !== i) props.onReorder && props.onReorder(from, i); props.onDragEnd && props.onDragEnd(); },
								onDragEnd: function () { props.onDragEnd && props.onDragEnd(); }
							}, [
								React.createElement("div", { className: "vlm-drag-handle", title: t("dragHint") || "拖动调整顺序" }, React.createElement(SvgIcon, { d: I_DRAG })),
								React.createElement("span", { className: "vlm-fb-model-id" }, m),
								React.createElement("button", {
									className: "vlm-icon-btn vlm-del-btn",
									title: t("menuDelete") || "删除",
									onClick: function () { props.onRemoveModel(m); }
								}, React.createElement(SvgIcon, { d: I_TRASH }))
							]);
						}))
					])
				]);
			}
			return React.createElement("div", { className: "vlm-card vlm-fallback-card" }, [head, body]);
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

			var head = React.createElement("div", { className: "vlm-card-head vlm-head-clickable", onClick: props.onToggleCollapse }, [
				React.createElement("div", { className: "vlm-card-name" }, [
					React.createElement("span", { className: "vlm-card-name-text" }, t("mirrorTitle")),
					collapsed ? React.createElement("span", { className: "vlm-card-summary" }, summary) : null
				]),
				React.createElement("button", {
					className: "vlm-icon-btn",
					title: collapsed ? "Expand" : "Collapse",
					onClick: function (e) { e.stopPropagation(); props.onToggleCollapse(); }
				}, React.createElement(SvgIcon, { d: collapsed ? I_EXPAND : I_COLLAPSE }))
			]);

			var body = null;
			if (!collapsed) {
				// toggle row factory
				function toggleRow(label, hint, checked, onChange) {
					return React.createElement("div", { className: "vlm-mirror-toggle-row" }, [
						React.createElement("label", { className: "vlm-switch" }, [
							React.createElement("input", { type: "checkbox", checked: checked, onChange: function (e) { onChange(e.target.checked); } }),
							React.createElement("span", { className: "vlm-switch-slider" })
						]),
						React.createElement("div", { className: "vlm-mirror-toggle-text" }, [
							React.createElement("span", { className: "vlm-label" }, label),
							React.createElement("span", { className: "vlm-mirror-hint" }, hint)
						])
					]);
				}

				// mapping rows
				var mappingRows = mappings.map(function (m) {
					var isOpen = openDdId === m.id;
					var displayVal = m.originalModel ? (m.originalProvider ? m.originalProvider + " / " + m.originalModel : m.originalModel) : "";
					return React.createElement("div", { key: m.id, className: "vlm-mapping-row" }, [
						React.createElement("div", { className: "vlm-field vlm-grow" }, [
							React.createElement("div", { className: "vlm-model-wrap" }, [
								React.createElement("input", {
									className: "vlm-input vlm-mapping-select",
									type: "text",
									value: displayVal,
									placeholder: t("mirrorOriginalModelPh"),
									readOnly: true,
									onClick: function (e) { e.preventDefault(); props.onToggleDd(m.id); }
								}),
								isOpen ? React.createElement("div", { className: "vlm-model-dropdown vlm-mapping-dropdown", ref: mappingDdRef },
									allModels.length === 0
										? React.createElement("div", { className: "vlm-dd-item vlm-dd-loading" }, props.busy === "mirror-mdl" ? t("fetching") : "—")
										: allModels.map(function (group) {
											return React.createElement("div", { key: group.provider, className: "vlm-dd-group" }, [
												React.createElement("div", { className: "vlm-dd-group-title" }, group.providerName || group.provider),
												group.models.map(function (model) {
													return React.createElement("div", {
														key: group.provider + "/" + model.id,
														className: "vlm-dd-item" + (m.originalModel === model.id && m.originalProvider === group.provider ? " active" : ""),
														onClick: function () { props.onSelectModel(m.id, group.provider, model.id); }
													}, model.name || model.id);
												})
											]);
										})
								) : null
							])
						]),
						React.createElement("input", {
							className: "vlm-input vlm-mapping-input",
							type: "text",
							value: m.mirrorName || "",
							placeholder: t("mirrorMirrorNamePh"),
							onChange: function (e) { props.onUpdateName(m.id, e.target.value); }
						}),
						React.createElement("button", {
							className: "vlm-icon-btn vlm-del-btn",
							title: t("menuDelete") || "删除",
							onClick: function () { props.onRemoveMapping(m.id); }
						}, React.createElement(SvgIcon, { d: I_TRASH }))
					]);
				});

				body = React.createElement("div", { className: "vlm-card-body" }, [
					React.createElement("div", { className: "vlm-mirror-toggle-pair" }, [
						React.createElement("div", { className: "vlm-mirror-toggle-row" }, [
							React.createElement("label", { className: "vlm-switch" }, [
								React.createElement("input", { type: "checkbox", checked: cfg.autoVisionEnabled !== false, onChange: function (e) { props.onPatch("autoVisionEnabled", e.target.checked); } }),
								React.createElement("span", { className: "vlm-switch-slider" })
							]),
							React.createElement("span", { className: "vlm-label" }, t("mirrorAutoVisionLabel"))
						]),
						React.createElement("div", { className: "vlm-mirror-toggle-row" }, [
							React.createElement("label", { className: "vlm-switch" }, [
								React.createElement("input", { type: "checkbox", checked: cfg.mirrorAllEnabled === true, onChange: function (e) { props.onPatch("mirrorAllEnabled", e.target.checked); } }),
								React.createElement("span", { className: "vlm-switch-slider" })
							]),
							React.createElement("span", { className: "vlm-label" }, t("mirrorAllLabel"))
						])
					]),
					React.createElement("div", { className: "vlm-mirror-divider" }),
					React.createElement("div", { className: "vlm-field" + (mirrorAllOn ? " vlm-mirror-disabled" : "") }, [
						React.createElement("div", { className: "vlm-mirror-mappings-header" }, [
							React.createElement("span", { className: "vlm-label" }, t("mirrorMappingsLabel")),
							!mirrorAllOn ? React.createElement("button", {
								className: "vlm-btn vlm-add-btn",
								disabled: props.busy !== "",
								onClick: props.onAddMapping
							}, t("mirrorAddMapping")) : null
						]),
						mirrorAllOn
							? React.createElement("p", { className: "vlm-mirror-disabled-msg" }, t("mirrorMappingsDisabled"))
							: React.createElement("div", { className: "vlm-list-container vlm-mapping-list" },
								mappingRows.length > 0 ? mappingRows : React.createElement("p", { className: "vlm-msg" }, t("mirrorMappingEmpty"))
							)
					])
				]);
			}
			return React.createElement("div", { className: "vlm-card vlm-mirror-card" }, [head, body]);
		}

		// ---------- settings panel (global config) ----------
		function SettingsPanel(props) {
			var t = props.t;
			var gc = props.globalConfig || {};
			return React.createElement("div", { className: "vlm-card vlm-settings-panel" }, [
				React.createElement("div", { className: "vlm-settings-section" }, [
					React.createElement("span", { className: "vlm-settings-section-title" }, t("settingsModuleSection")),
					React.createElement("div", { className: "vlm-row" }, [
						props.moduleRow("VLM", props.vlmOn, props.onToggleVlm, ""),
						props.moduleRow(t("tabImggen"), props.imggenOn, props.onToggleImggen, "")
					]),
				]),
				React.createElement("div", { className: "vlm-settings-section" }, [
					React.createElement("span", { className: "vlm-settings-section-title" }, t("settingsBackoffSection")),
					React.createElement("div", { className: "vlm-row" }, [
						React.createElement(Field, { label: t("backoffBaseLabel"), number: true, min: 100, value: String(gc.backoffBase || 800), placeholder: "800", onChange: function (e) { props.onPatchGlobal("backoffBase", e.target.value); } }),
						React.createElement(Field, { label: t("backoffMaxLabel"), number: true, min: 500, value: String(gc.backoffMax || 5000), placeholder: "5000", onChange: function (e) { props.onPatchGlobal("backoffMax", e.target.value); } })
					]),
					React.createElement("div", { className: "vlm-row" }, [
						React.createElement(Field, { label: t("backoff429BaseLabel"), number: true, min: 100, value: String(gc.backoff429Base || 2000), placeholder: "2000", onChange: function (e) { props.onPatchGlobal("backoff429Base", e.target.value); } }),
						React.createElement(Field, { label: t("backoff429MaxLabel"), number: true, min: 500, value: String(gc.backoff429Max || 10000), placeholder: "10000", onChange: function (e) { props.onPatchGlobal("backoff429Max", e.target.value); } })
					]),
					React.createElement(Field, { label: t("retryStatusCodesLabel"), value: gc.retryStatusCodes || "402,408,429,500,502,503,504,NET", placeholder: "402,408,429,500,502,503,504,NET", onChange: function (e) { props.onPatchGlobal("retryStatusCodes", e.target.value); } }),
					React.createElement("p", { className: "vlm-status" }, t("retryStatusCodesHint")),
			])
		]);
	}

	// ---------- extension card (v2.1) ----------
	function ExtensionCard(props) {
		var t = props.t;
		var gc = props.globalConfig || {};
		var vlmCollapsed = React.useState(function () { try { return JSON.parse(localStorage.getItem('her-eyes-collapse') || '{}').extVlm !== false; } catch (e) { return false; } });
		function toggleVlmCollapse() {
			var v = !vlmCollapsed[0];
			vlmCollapsed[1](v);
			try { var s = JSON.parse(localStorage.getItem('her-eyes-collapse') || '{}'); s.extVlm = v; localStorage.setItem('her-eyes-collapse', JSON.stringify(s)); } catch (e) {}
		}
		var expanded = !vlmCollapsed[0];
		var toolSettingsOpen = React.useState(false);
		var toolToggles = props.visionToolToggles || {};
		var toolNames = ["zoom_image", "sample_colors", "image_diff", "ocr_image", "detect_elements", "show_image"];
		var toolLabels = {"zoom_image": t("toolZoomImage"), "sample_colors": t("toolSampleColors"), "image_diff": t("toolImageDiff"), "ocr_image": t("toolOcrImage"), "detect_elements": t("toolDetectElements"), "show_image": t("toolShowImage")};
		var toolDescs = {"zoom_image": t("toolZoomImageDesc"), "sample_colors": t("toolSampleColorsDesc"), "image_diff": t("toolImageDiffDesc"), "ocr_image": t("toolOcrImageDesc"), "detect_elements": t("toolDetectElementsDesc"), "show_image": t("toolShowImageDesc")};
		var toolModal = toolSettingsOpen[0] ? React.createElement("div", { className: "vlm-confirm-overlay", onClick: function () { toolSettingsOpen[1](false); } }, [
			React.createElement("div", { className: "vlm-confirm-modal", onClick: function (e) { e.stopPropagation(); } }, [
				React.createElement("span", { className: "vlm-confirm-title" }, t("extToolSettings")),
				toolNames.map(function (tn) {
					return React.createElement("div", { key: tn, className: "vlm-module-row" }, [
						React.createElement("label", { className: "vlm-switch" }, [
							React.createElement("input", { type: "checkbox", checked: toolToggles[tn] !== false, onChange: function () { props.onToggleVisionTool(tn); } }),
							React.createElement("span", { className: "vlm-switch-slider" })
						]),
						React.createElement("span", { className: "vlm-label" }, toolLabels[tn] || tn),
						React.createElement("span", { className: "vlm-tool-desc", title: toolDescs[tn] || "" }, toolDescs[tn] || "")
					]);
				}),
				React.createElement("div", { className: "vlm-confirm-btns" }, [
					React.createElement("button", { className: "vlm-btn", onClick: function () { toolSettingsOpen[1](false); } }, "OK")
				])
			])
		]) : null;
		return React.createElement("div", { className: "vlm-card vlm-ext-card" }, [
			React.createElement("span", { className: "vlm-settings-section-title" }, t("extCardTitle")),
			React.createElement("div", { className: "vlm-ext-section" }, [
				React.createElement("div", { className: "vlm-ext-section-head vlm-head-clickable", onClick: toggleVlmCollapse }, [
					React.createElement("span", { className: "vlm-ext-section-title" }, t("extVlmSection")),
					React.createElement("button", { className: "vlm-icon-btn", title: expanded ? "Collapse" : "Expand", onClick: function (e) { e.stopPropagation(); toggleVlmCollapse(); } }, React.createElement(SvgIcon, { d: expanded ? I_COLLAPSE : I_EXPAND }))
				]),
				expanded ? React.createElement("div", { className: "vlm-ext-toggle-row" }, [
					React.createElement("div", { className: "vlm-module-row" }, [
						React.createElement("label", { className: "vlm-switch" }, [
							React.createElement("input", { type: "checkbox", checked: props.toolsOn, onChange: props.onToggleTools }),
							React.createElement("span", { className: "vlm-switch-slider" })
						]),
						React.createElement("span", { className: "vlm-label" }, t("toolsSwitchLabel")),
							React.createElement("button", { className: "vlm-icon-btn", title: t("extToolSettings"), onClick: function () { toolSettingsOpen[1](true); } }, React.createElement(SvgFillIcon, { d: I_GEAR_SVG, viewBox: "0 0 24 24" }))

					]),
					React.createElement("div", { className: "vlm-module-row" }, [
						React.createElement("label", { className: "vlm-switch" }, [
							React.createElement("input", { type: "checkbox", checked: gc.verifyReminder !== false, onChange: function (e) { props.onPatchGlobal("verifyReminder", e.target.checked); } }),
							React.createElement("span", { className: "vlm-switch-slider" })
						]),
						React.createElement("span", { className: "vlm-label" }, t("verifyReminderLabel"))
					])
				]) : null
			]),
			toolModal
		]);
	}

	function AboutCard(props) {
		var t = props.t;
		return React.createElement("div", { className: "vlm-card vlm-about-card" }, [
			React.createElement("span", { className: "vlm-settings-section-title" }, t("aboutTitle")),
			React.createElement("p", { className: "vlm-desc" }, t("aboutDesc")),
			React.createElement("div", { className: "vlm-about-btns" }, [
				React.createElement("button", {
					className: "vlm-btn",
					onClick: function () { if (props.onHelp) props.onHelp(); }
				}, t("helpBtn")),
				React.createElement("button", {
					className: "vlm-btn",
					onClick: function () { /* ghost: pending new repo */ }
				}, t("checkUpdateBtn"))
			]),
			React.createElement("p", { className: "vlm-status vlm-about-version" }, t("versionLabel") + (props.version || ""))
		]);
	}

	function HelpModal(props) {
		var t = props.t;
		var groups = [
			{
				id: "vlm", title: t("helpGroupVlm"), sections: [
					{ id: "vlm-overview", title: t("helpVlmTitle"), content: t("helpVlmContent") },
					{ id: "vlm-analyze", title: t("helpAnalyzeTitle"), content: t("helpAnalyzeContent") },
					{ id: "vlm-failover", title: t("helpFailoverTitle"), content: t("helpFailoverContent") },
					{ id: "vlm-mirror", title: t("helpMirrorTitle"), content: t("helpMirrorContent") }
				]
			},
			{
				id: "imggen", title: t("helpGroupImggen"), sections: [
					{ id: "imggen-overview", title: t("helpImggenTitle"), content: t("helpImggenContent") }
				]
			}
		];
		var allSections = [];
		groups.forEach(function (g) { g.sections.forEach(function (s) { allSections.push(s); }); });
		var active = React.useState("vlm-overview");
		var query = React.useState("");
		var collapsed = React.useState({});
		var searchOpen = React.useState(false);
		var q = query[0].toLowerCase().trim();
		var filtered = q ? allSections.filter(function (s) {
			return s.title.toLowerCase().indexOf(q) >= 0 || (s.content && s.content.toLowerCase().indexOf(q) >= 0);
		}) : [];
		var cur = allSections.find(function (s) { return s.id === active[0]; }) || allSections[0];
		function toggleGroup(id) {
			var c = {};
			for (var k in collapsed[0]) c[k] = collapsed[0][k];
			c[id] = !c[id];
			collapsed[1](c);
		}
		React.useEffect(function () {
			if (!searchOpen[0]) return;
			function onDocClick(e) {
				var tgt = e.target;
				if (!tgt || !tgt.closest || !tgt.closest(".vlm-help-search-wrap")) {
					searchOpen[1](false);
				}
			}
			document.addEventListener("click", onDocClick);
			return function () { document.removeEventListener("click", onDocClick); };
		}, [searchOpen[0]]);
		return React.createElement("div", { className: "vlm-help-overlay", onClick: props.onClose }, [
			React.createElement("div", { className: "vlm-help-modal", onClick: function (e) { e.stopPropagation(); } }, [
				React.createElement("button", { className: "vlm-help-close", onClick: props.onClose }, "×"),
				React.createElement("div", { className: "vlm-help-sidebar" }, [
					React.createElement("div", { className: "vlm-help-search-wrap" }, [
						React.createElement("input", {
							className: "vlm-help-search",
							type: "text",
							placeholder: t("helpSearchPlaceholder"),
							value: query[0],
							onChange: function (e) {
								query[1](e.target.value);
								searchOpen[1](e.target.value.trim().length > 0);
							},
							onFocus: function () { if (query[0].trim()) searchOpen[1](true); }
						}),
						query[0] ? React.createElement("button", {
							className: "vlm-help-search-clear",
							onClick: function () { query[1](""); searchOpen[1](false); }
						}, "×") : null,
						searchOpen[0] && q ? React.createElement("div", { className: "vlm-help-search-popup" },
							filtered.length > 0 ? filtered.map(function (s) {
								var snippet = s.content || t("helpPlaceholder");
								return React.createElement("button", {
									key: s.id,
									className: "vlm-help-search-result",
									onClick: function () { active[1](s.id); query[1](""); searchOpen[1](false); }
								}, [
									React.createElement("div", { className: "vlm-help-search-result-title" }, s.title),
									React.createElement("div", { className: "vlm-help-search-result-snippet" }, snippet)
								]);
							}) : React.createElement("div", { className: "vlm-help-search-empty" }, t("helpNoResult"))
						) : null
					]),
					React.createElement("div", { className: "vlm-help-nav" },
						groups.map(function (g) {
							return React.createElement("div", { key: g.id, className: "vlm-help-group" }, [
								React.createElement("button", {
									className: "vlm-help-group-title",
									onClick: function () { toggleGroup(g.id); }
								}, (collapsed[0][g.id] ? "▶ " : "▼ ") + g.title),
								!collapsed[0][g.id] ? g.sections.map(function (s) {
									return React.createElement("button", {
										key: s.id,
										className: "vlm-help-nav-item" + (active[0] === s.id ? " active" : ""),
										onClick: function () { active[1](s.id); }
									}, s.title);
								}) : null
							]);
						})
					)
				]),
				React.createElement("div", { className: "vlm-help-content" }, [
					React.createElement("h3", { className: "vlm-help-content-title" }, cur.title),
					cur.content ?
						React.createElement("p", { className: "vlm-help-content-text" }, cur.content)
						: React.createElement("p", { className: "vlm-help-content-text vlm-help-placeholder" }, t("helpPlaceholder"))
				])
			])
		]);
	}

		// ---------- settings page ----------
		function VlmSettingsPage(props) {
			var t = (props && props.t) || tBound || (function (k) { return k; });
			var snap = React.useState(null);
			var draft = React.useState(null);
			var helpOpen = React.useState(false);
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
			var confirmDelAll = React.useState(false);
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
			var fbCollapsed = React.useState(function () { try { var s = JSON.parse(localStorage.getItem('her-eyes-collapse') || '{}'); return s.fb !== undefined ? s.fb : true; } catch (e) { return true; } });
			var fbModels = React.useState([]);
			var fbOpenDd = React.useState(false);
			var fbBusy = React.useState("");
			var fbSearch = React.useState("");
			var fbDragFrom = React.useState(null);
			var fbDropOver = React.useState(null);
			var mirrorCollapsed = React.useState(function () { try { var s = JSON.parse(localStorage.getItem('her-eyes-collapse') || '{}'); return s.mirror !== undefined ? s.mirror : true; } catch (e) { return true; } });
			var mirrorAllModels = React.useState([]);
			var mirrorBusy = React.useState("");
			var mirrorOpenDd = React.useState(null);
			toastSeq = 0;
			var toasts = React.useState([]);
			var toastTimers = {};
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
						draft[1](s.config);
					} else {
						setMsg(t("loadFail") + (s && s.error ? s.error : t("unknown")), true);
						showToast('error', t("loadFail"), (s && s.error) || t("unknown"));
					}
				}).catch(function (e) { setMsg(t("loadFail") + et(e), true); showToast('error', t("loadFail"), et(e)); });
			}, []);

			// close card menu / model dropdown on outside click
			React.useEffect(function () {
				if (!menuOpen[0] && !openDd[0] && !batchOpen[0] && !openProv[0] && !igOpenDd[0] && !igOpenProv[0] && !igConfirmReset[0] && !fbOpenDd[0] && !mirrorOpenDd[0]) return;
				function close(e) {
					var tgt = e.target;
					if (!tgt || !tgt.closest) { menuOpen[1](null); openDd[1](null); batchOpen[1](false); openProv[1](null); igOpenDd[1](false); igOpenProv[1](false); igConfirmReset[1](false); fbOpenDd[1](false); mirrorOpenDd[1](null); confirmDel[1](null); confirmDelAll[1](false); return; }
					if (!tgt.closest(".vlm-card-menu-wrap")) { menuOpen[1](null); confirmDel[1](null); igConfirmReset[1](false); }
					if (!tgt.closest(".vlm-model-wrap")) { openDd[1](null); igOpenDd[1](false); fbOpenDd[1](false); mirrorOpenDd[1](null); }
					if (!tgt.closest(".vlm-provider-wrap")) { openProv[1](null); igOpenProv[1](false); }
					if (!tgt.closest(".vlm-batch-wrap")) { batchOpen[1](false); confirmDelAll[1](false); }
				}
				document.addEventListener("click", close);
				return function () { document.removeEventListener("click", close); };
			}, [menuOpen[0], openDd[0], batchOpen[0], openProv[0], igOpenDd[0], igOpenProv[0], igConfirmReset[0], fbOpenDd[0], mirrorOpenDd[0]]);

			if (!draft[0]) {
				return React.createElement("div", { className: "vlm-page" }, [
					React.createElement("p", { className: "vlm-desc" }, t("loading")),
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
				confirmDelAll[1](false);
				commitStructure({ apis: (draft[0].apis || []).map(function (c) { return Object.assign({}, c, { collapsed: v }); }) }, function (d) {
					d.apis = d.apis.map(function (c) { return Object.assign({}, c, { collapsed: v }); });
					return d;
				}, function () { showToast('success', v ? t('cardsCollapsedAll') : t('cardsExpandedAll'), ''); });
			}
			function batchDeleteAll() {
				if (!confirmDelAll[0]) { confirmDelAll[1](true); return; }
				batchOpen[1](false);
				confirmDelAll[1](false);
				commitStructure({ apis: [] }, function (d) { d.apis = []; return d; }, function () { showToast('success', t('cardsDeletedAll'), ''); });
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
				});
			}
			function removeMirrorMapping(id) {
				commitStructure({ mirrorConfig: { field: "removeMapping", value: id } }, function (d) {
					if (d.mirrorConfig) d.mirrorConfig.mappings = (d.mirrorConfig.mappings || []).filter(function (m) { return m.id !== id; });
					return d;
				});
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
				openDd[1](openDd[0] === id ? null : id);
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
				setMsg("", false);
				call("models", {
					imggen: true,
					endpoint: igc.endpoint || undefined,
					protocol: igc.protocol,
					apiKey: igKeyDraft[0] || undefined
				}).then(function (r) {
					if (r && r.ok) {
						igModelList[1](r.models || []);
						igModelCount[1]((r.models || []).length);
						if ((r.models || []).length > 0) igOpenDd[1](true); // auto-open dropdown
						showToast('success', t('fetchOkPrefix') + (r.models || []).length + t('fetchOkSuffix'), '');
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
			function importWorkflow(name, text) {
				commitStructure({ comfyWfImport: { name: name, workflow: text } }, function (d) { return d; }, function () { showToast('success', t('importedWf'), ''); });
			}
			function deleteWorkflow(id) {
				commitStructure({ comfyWfDelete: { id: id } }, null, function () { showToast('success', t('deletedWf'), ''); });
			}
			function renameWorkflow(id, name) { commitStructure({ comfyWfRename: { id: id, name: name } }); }
			function toggleWorkflow(id) { commitStructure({ comfyWfToggle: { id: id } }); }
			function updateWfJson(id, text) {
				commitStructure({ comfyWfUpdateJson: { id: id, workflow: text } }, null, function () { showToast('success', t('jsonUpdated'), ''); });
			}
			function updateWfConfig(id, field, value) {
				var p = { id: id }; p[field] = value; commitStructure({ comfyWfUpdateConfig: p });
			}
			function autoMapWorkflow(id) {
				commitStructure({ comfyWfAutoMap: { id: id } }, null, function () { showToast('success', t('autoMapped'), ''); });
			}
			function updateWfMapping(id, key, value) {
				commitStructure({ comfyWfUpdateMapping: { id: id, key: key, value: value } });
			}
			function toggleIgFilter() {
				patchImggen("filterImageModels", !igc.filterImageModels);
			}
			function changeIgProvider(v) {
				if (!PROVIDERS_UI[v]) return;
				// Timeout bump to 600000 for ComfyUI is done server-side in applyPatch
				// (single source of truth; avoids queueSave mergePatch overwriting it).
				patchImggen("provider", v);
			}
			function resetImggen() {
				if (!igConfirmReset[0]) { igConfirmReset[1](true); return; }
				igConfirmReset[1](false);
				igModelList[1]([]);
				igModelCount[1](null);
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
			commitStructure({ imggenPresetSwitch: id }, null, function () { showToast('success', t('presetSwitched'), ''); });
		}
		function addPreset() {
			igPresetDdOpen[1](false);
			igKeyDraft[1]("");
			igRevealed[1](false);
			igModelList[1]([]);
			igModelCount[1](null);
			commitStructure({ imggenPresetAdd: true }, null, function () { showToast('success', t('presetAdded'), ''); });
		}
		function deletePreset(id) {
			igPresetDeleteConfirm[1](false);
			igKeyDraft[1]("");
			igRevealed[1](false);
			igModelList[1]([]);
			igModelCount[1](null);
			commitStructure({ imggenPresetDelete: id }, null, function () { showToast('success', t('presetDeleted'), ''); });
		}
		function renamePreset(name) {
			queueSave({ imggenPresetRename: name });
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
			var toolStatus = vlmOn ? (validCount > 0 ? t("toolVisible") : t("toolHidden")) : t("toolOff");
			var igc = draft[0].imggenConfig || {};
			var igcValid = !!(draft[0].imggenPresets && draft[0].imggenPresets.length > 0);
			var imggenVisible = snap[0] ? snap[0].imggenVisible : false;

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
				return React.createElement("div", { className: "vlm-module-row" }, [
					React.createElement("label", { className: "vlm-switch" }, [
						React.createElement("input", { type: "checkbox", checked: checked, onChange: onChange }),
						React.createElement("span", { className: "vlm-switch-slider" })
					]),
					React.createElement("span", { className: "vlm-label" }, label),
					React.createElement("span", { className: "vlm-status" }, statusText || "")
				]);
			}

			var retryCard = React.createElement("div", { className: "vlm-card vlm-retry-row" }, [
				React.createElement("span", { className: "vlm-label vlm-retry-label" }, t("retryTitle")),
				React.createElement("input", {
					className: "vlm-input vlm-retry-input",
					type: "number", min: 1,
					value: String(draft[0].retryCount || 3),
					onChange: function (e) { patchRetry(e.target.value); }
				})
			]);

			var listHead = React.createElement("div", { className: "vlm-list-head" }, [
				React.createElement("span", { className: "vlm-list-title" },
					t("cardListTitle") + " (" + apis.length + ")" +
					(modelCount[0] ? " · " + t("fetchOkPrefix") + modelCount[0].count + t("fetchOkSuffix") : "")),
				React.createElement("div", { style: { display: "flex", gap: "8px", alignItems: "center" } }, [
					React.createElement("button", {
						className: "vlm-btn vlm-add-btn",
						disabled: busy[0] !== "",
						onClick: addCard
					}, t("addCard")),
					React.createElement("div", { className: "vlm-batch-wrap" }, [
						React.createElement("button", {
							className: "vlm-btn vlm-batch-btn",
							title: t("batchDeleteAll"),
							disabled: busy[0] !== "",
							onClick: function () { batchOpen[1](!batchOpen[0]); confirmDelAll[1](false); }
						}, React.createElement(SvgIcon, { d: I_COLLAPSE })),
						batchOpen[0] ? React.createElement("div", { className: "vlm-batch-menu", ref: menuDdRef }, [
							React.createElement("div", { className: "vlm-menu-item", onClick: function () { batchCollapse(true); } },
								React.createElement(SvgIcon, { d: I_COLLAPSE }), React.createElement("span", null, t("batchCollapseAll"))),
							React.createElement("div", { className: "vlm-menu-item", onClick: function () { batchCollapse(false); } },
								React.createElement(SvgIcon, { d: I_EXPAND }), React.createElement("span", null, t("batchExpandAll"))),
							React.createElement("div", { className: "vlm-menu-item vlm-menu-danger" + (confirmDelAll[0] ? " vlm-menu-confirm" : ""), onClick: batchDeleteAll },
								React.createElement(SvgIcon, { d: I_TRASH }), React.createElement("span", null, confirmDelAll[0] ? t("confirmDelete") : t("batchDeleteAll")))
						]) : null
					])
				])
			]);

			var vlmBody = React.createElement("div", { className: "vlm-tab-body" }, [
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
					onToggleCollapse: function () { var v = !fbCollapsed[0]; fbCollapsed[1](v); try { var s = JSON.parse(localStorage.getItem('her-eyes-collapse') || '{}'); s.fb = v; localStorage.setItem('her-eyes-collapse', JSON.stringify(s)); } catch (e) {} },
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
					onToggleCollapse: function () { var v = !mirrorCollapsed[0]; mirrorCollapsed[1](v); try { var s = JSON.parse(localStorage.getItem('her-eyes-collapse') || '{}'); s.mirror = v; localStorage.setItem('her-eyes-collapse', JSON.stringify(s)); } catch (e) {} },
					onPatch: patchMirror,
					onAddMapping: addMirrorMapping,
					onRemoveMapping: removeMirrorMapping,
					onSelectModel: selectMirrorModel,
					onUpdateName: updateMirrorName,
					onToggleDd: toggleMirrorDd
				}),
				React.createElement("div", { className: "vlm-list" }, [
					listHead,
					apis.length === 0 ? React.createElement("p", { className: "vlm-msg" }, t("noCards")) : null,
					apis.map(function (card, index) {
						return React.createElement(ApiCard, Object.assign({ key: card.id, card: card, index: index }, cardProps));
					})
				]),
				null
			]);

			var imggenBody = React.createElement("div", { className: "vlm-tab-body" }, [
				igcValid
					? React.createElement(ImggenPanel, Object.assign({ t: t, cfg: igc, visible: imggenVisible, busy: igBusy[0], keyDraft: igKeyDraft[0], revealed: igRevealed[0], openDd: igOpenDd[0], openProv: igOpenProv[0], confirmReset: igConfirmReset[0], modelList: igModelList[0], modelCount: igModelCount[0], onPatch: patchImggen, onSaveKey: saveImggenKey, onToggleReveal: toggleIgReveal, onFetchModels: fetchImggenModels, onPickModel: pickIgModel, onToggleDd: function () { igOpenDd[1](!igOpenDd[0]); }, onPickProvider: function (v) { changeIgProvider(v); igOpenProv[1](false); }, onToggleProv: function () { igOpenProv[1](!igOpenProv[0]); }, onToggleFilter: toggleIgFilter, onImport: importWorkflow, onDelete: deleteWorkflow, onRename: renameWorkflow, onToggle: toggleWorkflow, onUpdateJson: updateWfJson, onUpdateConfig: updateWfConfig, onAutoMap: autoMapWorkflow, onUpdateMapping: updateWfMapping, workflows: (draft[0].comfyWorkflows || []), activeWfId: (draft[0].activeComfyWorkflow || ""), onResetClick: resetImggen, onCloseMenu: function () { igConfirmReset[1](false); }, presets: (draft[0].imggenPresets || []), activePresetId: draft[0].activeImggenPreset || "", activePresetName: ((draft[0].imggenPresets || []).find(function (p) { return p.id === draft[0].activeImggenPreset; }) || {}).name || "", onSwitchPreset: switchPreset, onAddPreset: addPreset, onDeletePreset: deletePreset, onRenamePreset: renamePreset, presetDdOpen: igPresetDdOpen[0], onTogglePresetDd: togglePresetDd, presetDeleteConfirm: igPresetDeleteConfirm[0], onConfirmDeletePreset: function () { igPresetDeleteConfirm[1](true); }, onCancelDeletePreset: function () { igPresetDeleteConfirm[1](false); }, onConfirmDelete: function () { deletePreset(draft[0].activeImggenPreset || ""); } }, props))
					: React.createElement("p", { className: "vlm-msg" }, t("imggenNoConfig")),
				null
			]);

			var settingsBody = React.createElement("div", { className: "vlm-tab-body" }, [
			React.createElement(SettingsPanel, {
				t: t,
				globalConfig: draft[0].globalConfig || {},
				vlmOn: vlmOn,
				imggenOn: imggenOn,
				toolsOn: toolsOn,
				moduleRow: moduleRow,
				onToggleVlm: toggleVlm,
				onToggleImggen: toggleImggen,
				onToggleTools: toggleTools,
				onPatchGlobal: patchGlobal
			}),
			React.createElement(ExtensionCard, { t: t, globalConfig: draft[0].globalConfig || {}, toolsOn: toolsOn, onToggleTools: toggleTools, onPatchGlobal: patchGlobal, visionToolToggles: (draft[0].visionToolToggles || {}), onToggleVisionTool: function (tool) { queueSave({ visionToolToggle: { tool: tool, value: !((draft[0].visionToolToggles || {})[tool] !== false) } }); } }),
			React.createElement(AboutCard, { t: t, version: snap[0] ? snap[0].version : "", onHelp: function () { helpOpen[1](true); } })
		]);

			return React.createElement("div", { className: "vlm-page" }, [
				React.createElement(ToastContainer, { toasts: toasts[0], onClose: closeToast, onExtend: extendToast }),
				React.createElement("div", { className: "vlm-tabs" }, [
					React.createElement("button", { className: "vlm-tab" + (tab[0] === "vlm" ? " active" : ""), onClick: function () { tab[1]("vlm"); } }, [
					"VLM",
					React.createElement("span", { className: "vlm-tab-dot " + (vlmOn ? "on" : "off") })
				]),
					React.createElement("button", { className: "vlm-tab" + (tab[0] === "imggen" ? " active" : ""), onClick: function () { tab[1]("imggen"); } }, [
					t("tabImggen"),
					React.createElement("span", { className: "vlm-tab-dot " + (imggenOn ? "on" : "off") })
				]),
					React.createElement("button", { className: "vlm-tab" + (tab[0] === "video" ? " active" : ""), onClick: function () { tab[1]("video"); } }, t("tabVideo")),
					React.createElement("button", { className: "vlm-tab" + (tab[0] === "audio" ? " active" : ""), onClick: function () { tab[1]("audio"); } }, t("tabAudio")),
					React.createElement("button", { className: "vlm-tab" + (tab[0] === "settings" ? " active" : ""), onClick: function () { tab[1]("settings"); } }, t("settingsTab"))
				]),
				tab[0] === "vlm" ? vlmBody : (tab[0] === "imggen" ? imggenBody : (tab[0] === "video" || tab[0] === "audio"
					? React.createElement("div", { className: "vlm-tab-body" }, [React.createElement("p", { className: "vlm-desc" }, t("tabPlaceholder"))])
					: settingsBody)),
				helpOpen[0] ? React.createElement(HelpModal, { t: t, onClose: function () { helpOpen[1](false); } }) : null
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

			return React.createElement("div", { className: "vlm-toolview-card" }, [
				React.createElement("div", { className: "vlm-toolview-head" }, t("toolsLocalImage")),
				srcState[0] ? React.createElement("img", { src: srcState[0], alt: "", style: { maxWidth: "100%", maxHeight: 360, borderRadius: 6, alignSelf: "flex-start" } }) : null,
				errState[0] ? React.createElement("p", { className: "vlm-status vlm-err" }, t("toolsImageError")) : null
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
				rows.push(React.createElement("div", { key: k, className: "vlm-toolview-row" }, [
					React.createElement("span", { className: "vlm-label" }, (k === "path" ? t("toolsFile") : k) + ":"),
					React.createElement("code", { className: "vlm-toolview-path" }, v),
					React.createElement("button", {
						className: "vlm-btn vlm-toolview-copy",
						onClick: function () {
							try { if (navigator.clipboard) navigator.clipboard.writeText(v); } catch (e) {}
							copied[1](k);
							setTimeout(function () { copied[1](null); }, 1500);
						}
					}, copied[0] === k ? t("toolsCopied") : t("toolsCopyPath"))
				]));
			});
			numerics.forEach(function (k) {
				var v = json ? json[k] : undefined;
				if (typeof v === "undefined" || v === null || v === "") return;
				rows.push(React.createElement("div", { key: k, className: "vlm-toolview-row vlm-toolview-fact" }, [
					React.createElement("span", { className: "vlm-label" }, k + ":"),
					React.createElement("span", { className: "vlm-toolview-val" }, String(v))
				]));
			});
			if (!rows.length) {
				rows.push(React.createElement("p", { key: "empty", className: "vlm-status" }, text ? text : t("toolsNoData")));
			}

			return React.createElement("div", { className: "vlm-toolview-card" }, [
				React.createElement("div", { className: "vlm-toolview-head" }, label)
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
						{ name: "settings.section", id: "vlm-vision", order: 40, locale: NS, label: function () { return tBound ? tBound("nav") : "多模态"; } },
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
								{ name: "tool.call.toolview", id: "vlm-view-show_image", key: "show_image", order: 40 },
								function (props) { return React.createElement(ToolImageCard, { t: (props && props.t) || tBound, sessions: sessions, block: props, sessionId: props && props.sessionId }); }
							),
							slots.register(
								{ name: "tool.call.toolview", id: "vlm-view-zoom", key: "zoom_image", order: 41 },
								function (props) { return React.createElement(ToolMetaCard, { t: (props && props.t) || tBound, toolKey: "zoom_image", block: props }); }
							),
							slots.register(
								{ name: "tool.call.toolview", id: "vlm-view-diff", key: "image_diff", order: 42 },
								function (props) { return React.createElement(ToolMetaCard, { t: (props && props.t) || tBound, toolKey: "image_diff", block: props }); }
							),
							slots.register(
								{ name: "tool.call.toolview", id: "vlm-view-detect", key: "detect_elements", order: 43 },
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
