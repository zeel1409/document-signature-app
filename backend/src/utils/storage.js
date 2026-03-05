const fs = require('fs')
const path = require('path')

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true })
}

function ensureStorage() {
  const base = path.join(__dirname, '..', '..', 'storage')
  const uploads = path.join(base, 'uploads')
  const signed = path.join(base, 'signed')
  const sigs = path.join(base, 'signatures')
  ensureDir(base)
  ensureDir(uploads)
  ensureDir(signed)
  ensureDir(sigs)
  return { base, uploads, signed, sigs }
}

module.exports = { ensureStorage }

