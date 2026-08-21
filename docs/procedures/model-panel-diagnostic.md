# 模型面板故障诊断手册（Model Panel Diagnostic Runbook)

> **English summary（摘要）**: A runbook for diagnosing the dsh core "Settings → Models" panel bug where custom models disappear and the "Add provider" button becomes unresponsive. The dsh-omni-workstation plugin is provably innocent: it stores its own config in `omni-vision.json` (inside the plugin install dir) and never touches dsh core settings/credentials/llm APIs (grep-confirmed). Use this checklist top-to-bottom if your models vanish or the add button won't click.

## 背景

你遇到了两个现象：**之前在模型面板里添加的自定义模型不见了**，以及**"添加提供方"按钮点了没反应**。这两个问题都出在 dsh 核心（dsh core）侧，与 dsh-omni-workstation 插件无关。下面按顺序排查，一次一步。

## 第 1 步：检查 settings.yaml

1. 打开文件 `~/.dsh/settings.yaml`（Windows 下即 `C:\Users\<你的用户名>\.dsh\settings.yaml`）。
2. 确认里面存在 `llm-pi-ai` 和 `llm-deepseek` 这两个命名空间分段。
3. 如果**文件不存在**、或文件里**找不到这些分段**，说明配置被清空或从未写入，模型自然就丢了。

> 自定义模型存在 dsh 核心的 `settings.yaml` 里，**不在**插件的配置文件里。插件从不读写这个文件。

## 第 2 步：查看浏览器控制台报错

1. 打开 dsh web（`http://127.0.0.1:3080`），进入"设置 → 模型"页面。
2. 按 **F12** 打开开发者工具，切到 **Console（控制台）** 标签页。
3. 留意红色报错，尤其是包含 `namespace`、`provider`、`llm-pi-ai` 关键字的错误。把这些报错内容截图或复制下来，方便后续反馈。

## 第 3 步：检查适配器是否加载

1. 在命令行运行 `dsh plugin list`（或在 dsh web 的"设置 → 插件"页面查看）。
2. 确认 `llm-pi-ai` 适配器处于**已加载**状态。
3. 如果它没加载，"添加提供方"按钮会被前端禁用，看起来就像"按钮坏了"。

## 第 4 步：硬刷新浏览器

1. 在模型面板页面按 **Ctrl+Shift+R** 强制刷新（绕过浏览器缓存）。
2. 再看面板是否恢复正常。这一步排除缓存导致的界面与后端状态不同步。

## 第 5 步：检查 settings.yaml 是否损坏

1. 如果 `settings.yaml` 文件存在但内容异常（比如不是有效的 YAML 格式），模型面板可能读不出配置。
2. 先**备份**一份（复制为 `settings.yaml.bak`），再尝试修复或重置，避免直接丢数据。
3. 如果以上 5 步都无法解决，建议把你收集到的信息（第 2 步的控制台报错、第 1/5 步的 settings.yaml 内容）反馈给 dsh 核心维护者。

## 第 6 步：插件免责声明（重要）

**dsh-omni-workstation 插件不是这些问题的原因。** 依据如下：

- 插件使用**独立的** `omni-vision.json` 配置文件，存放在插件安装目录内（`PLUGIN_DIR/omni-vision.json`），从不读写 dsh 核心的 `settings.yaml`。
- 经 grep 全量验证，插件代码中**不存在** `settings.mutate`、`credentials.set`、`llm.providers` 等对 dsh 核心设置/凭据/LLM API 的调用。
- 插件无 slot ID 冲突（插件 `omni-vision` vs 核心 `models`）、无 CSS 冲突（插件全局 `omni-*` vs 核心 CSS Modules）、无路由冲突。

因此，**模型的遗失**与**"添加提供方"按钮无响应**都属于 dsh 核心侧的问题，排查方向应在 dsh 核心的配置与适配器加载上（即上述第 1–5 步）。