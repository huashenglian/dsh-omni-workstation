// dsh-omni-workstation — 配置文件位置判定
//
// 只做一件事：决定 omni-vision.json 到底读/写哪个文件。四条优先级（高 → 低）：
//
//   1. DSH_OMNI_WORKSTATION_CONFIG_DIR  测试 / 高级覆盖：<dir>/omni-vision.json
//   2. <dshHome>/omni-vision.json       用户数据根（$DSH_HOME 或 ~/.dsh）—— 推荐位置
//   3. <pluginDir>/omni-vision.json     旧位置（v2.5–v2.13：插件安装目录内）
//   4. 都不存在                          → 写 <dshHome>/omni-vision.json（新装默认）
//
// 为什么不再只认插件安装目录：CLI / headless 面没有设置页，用户只能手改文件；
// 而 node_modules 里的文件在 `dsh plugin update/remove` 时会被连同 .bak 一起删掉，
// 且每个 profile（web / headless）各有一份。home 位置稳定、好找、跨 profile 共用。
//
// 本文件不 import 任何本地模块（避免与 index.js 形成环），也不引入第三方依赖
// （安装副本无依赖解析）；只导出纯函数，磁盘探测由调用方注入（exists），便于单测。
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

/** 配置文件名（各位置一致）。 */
export const CONFIG_FILE_NAME = 'omni-vision.json'

/** 同目录恢复副本后缀。 */
export const BACKUP_SUFFIX = '.bak'

/** 与配置文件同目录、供编辑器补全用的 JSON Schema 文件名。 */
export const SCHEMA_FILE_NAME = 'omni-vision.schema.json'

/** harness 用户数据根目录名（默认 ~/.dsh）。 */
export const DSH_HOME_DIR_NAME = '.dsh'

/**
 * 展开 `~`、`~/`、`~\` 前缀（只展开当前用户，`~alice` 原样返回）。
 * @param {string} p - 可能带 ~ 前缀的路径。
 * @returns {string} 展开后的路径（无前缀则原样返回）。
 */
export function expandHomePath(p) {
  if (typeof p !== 'string' || p.length === 0) return p
  if (p === '~') return homedir()
  if (p.startsWith('~/') || p.startsWith('~\\')) return join(homedir(), p.slice(2))
  return p
}

/**
 * 解析 DeepSeek Harness 用户数据根。优先级与 @deepseek-ai/dsh-home-paths 一致：
 * $DSH_HOME（空白视为未设置）→ ~/.dsh；结果做 ~ 展开 + resolve。
 * @param {Record<string, string | undefined>} [env] - 环境变量表，默认 process.env。
 * @returns {string} 绝对路径（不创建目录）。
 */
export function resolveDshHome(env = process.env) {
  const raw = env && typeof env.DSH_HOME === 'string' ? env.DSH_HOME : ''
  const selected = raw.trim().length > 0 ? raw : join(homedir(), DSH_HOME_DIR_NAME)
  return resolve(expandHomePath(selected))
}

/**
 * 配置文件的同目录（`voice-library/`、STT 字幕等工件都落在这里）。
 * @param {string} file - 配置文件绝对路径。
 * @returns {string} 所在目录。
 */
export function configDirOf(file) {
  return dirname(file)
}

/**
 * 恢复副本路径（永远与主配置同目录，不写 $HOME 根）。
 * @param {string} file - 配置文件绝对路径。
 * @returns {string} `<file>.bak`。
 */
export function backupPathFor(file) {
  return String(file) + BACKUP_SUFFIX
}

/**
 * 解析当前生效的配置文件位置。
 * @param {object} [options]
 * @param {string} options.pluginDir - 插件安装目录（旧位置所在）。
 * @param {Record<string, string | undefined>} [options.env] - 环境变量表，默认 process.env。
 * @param {(p: string) => boolean} [options.exists] - 存在性探测，默认 fs.existsSync；测试可注入。
 * @returns {{ file: string, backupFile: string, pluginFile: string, homeFile: string, source: 'env' | 'home' | 'plugin' | 'home-new', dshHome: string }}
 *   `source` 说明本次为何选这个位置：env=覆盖变量；home=已存在的 home 文件；
 *   plugin=沿用旧安装目录文件；home-new=两处都没有，新建在 home。
 */
export function resolveActiveConfig(options = {}) {
  const env = options.env || process.env
  const exists = typeof options.exists === 'function' ? options.exists : () => false
  const pluginDir = String(options.pluginDir || '')

  const override = env && typeof env.DSH_OMNI_WORKSTATION_CONFIG_DIR === 'string'
    ? env.DSH_OMNI_WORKSTATION_CONFIG_DIR
    : ''
  const dshHome = resolveDshHome(env)
  if (override.trim().length > 0) {
    const file = join(override, CONFIG_FILE_NAME)
    return { file, backupFile: backupPathFor(file), pluginFile: pluginDir ? join(pluginDir, CONFIG_FILE_NAME) : '', homeFile: join(dshHome, CONFIG_FILE_NAME), source: 'env', dshHome }
  }
  const homeFile = join(dshHome, CONFIG_FILE_NAME)
  const pluginFile = pluginDir ? join(pluginDir, CONFIG_FILE_NAME) : ''

  if (exists(homeFile)) {
    return { file: homeFile, backupFile: backupPathFor(homeFile), pluginFile, homeFile, source: 'home', dshHome }
  }
  if (pluginFile && exists(pluginFile)) {
    return { file: pluginFile, backupFile: backupPathFor(pluginFile), pluginFile, homeFile, source: 'plugin', dshHome }
  }
  return { file: homeFile, backupFile: backupPathFor(homeFile), pluginFile, homeFile, source: 'home-new', dshHome }
}