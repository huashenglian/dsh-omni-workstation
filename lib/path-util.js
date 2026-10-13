// dsh-omni-workstation — 共享路径判定
//
// 只做一件事：判断一个「本地文件系统路径」是不是绝对路径。四类形式都算：
//   盘符 + 反斜杠   C:\Users\me\clip.mp4
//   盘符 + 正斜杠   C:/Users/me/clip.mp4
//   POSIX 根        /home/me/clip.mp4
//   UNC             \\server\share\clip.mp4
//
// 本文件不 import 任何本地模块（避免与 index.js / vision-tools.js 形成环），
// 也不引入第三方依赖（安装副本无依赖解析）。相对路径、扩展协议（http:、file:
// 之类）、空串与非字符串一律返回 false —— 调用方据此决定是否拼会话工作区。
export function isAbsoluteLocalPath(p) {
  if (typeof p !== 'string' || p.length === 0) return false
  return /^[A-Za-z]:[\\/]/.test(p) || p.startsWith('/') || p.startsWith('\\\\')
}