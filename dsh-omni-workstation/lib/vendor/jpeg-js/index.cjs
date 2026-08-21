// Vendored jpeg-js decoder (Apache-2.0, Copyright 2011 notmasteryet).
// Only the decoder is vendored (we re-encode as PNG, never re-encode JPEG).
// Files are named .cjs because the parent package has "type": "module" and
// would otherwise treat plain .js as ESM (module.exports would crash).
'use strict'

module.exports = {
  decode: require('./decoder.cjs')
}
