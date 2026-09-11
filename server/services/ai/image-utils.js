const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1'])

function sniffImageMime(buffer) {
  if (!buffer || buffer.length < 12) return null

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'

  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png'
  }

  const riff = buffer.toString('latin1', 0, 4)
  const webp = buffer.toString('latin1', 8, 12)
  if (riff === 'RIFF' && webp === 'WEBP') return 'image/webp'

  const gif = buffer.toString('latin1', 0, 4)
  if (gif === 'GIF8') return 'image/gif'

  if (buffer.toString('latin1', 4, 8) === 'ftyp') {
    const brand = buffer.toString('latin1', 8, 12).toLowerCase()
    if (HEIC_BRANDS.has(brand)) return 'image/heic'
  }

  return null
}

function isProviderSupportedMime(mime) {
  return (
    mime === 'image/jpeg' ||
    mime === 'image/png' ||
    mime === 'image/webp' ||
    mime === 'image/gif'
  )
}

function fileToDataUri(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return null
  }

  const buf = fs.readFileSync(filePath)
  const sniffed = sniffImageMime(buf)
  const ext = path.extname(filePath).toLowerCase()
  const mime =
    sniffed ||
    (ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : ext === '.gif' ? 'image/gif' : 'image/jpeg')
  return `data:${mime};base64,${buf.toString('base64')}`
}

function assertSupportedImageFile(filePath) {
  const { AIConfigError } = require('./errors')
  if (!filePath || !fs.existsSync(filePath)) {
    throw new AIConfigError('缺少输入图片', { code: 'MISSING_IMAGE' })
  }

  const buf = fs.readFileSync(filePath)
  const mime = sniffImageMime(buf)
  if (!isProviderSupportedMime(mime)) {
    throw new AIConfigError(`不支持的图片格式：${mime || '未知'}`, { code: 'UNSUPPORTED_MIME' })
  }
}

async function downloadImageToDir(imageUrl, uploadDir) {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`下载溶图结果失败: HTTP ${response.status}`)
  }

  const buf = Buffer.from(await response.arrayBuffer())
  const filename = `blend-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.jpg`
  const dest = path.join(uploadDir, filename)
  fs.writeFileSync(dest, buf)
  return filename
}

module.exports = {
  sniffImageMime,
  isProviderSupportedMime,
  fileToDataUri,
  assertSupportedImageFile,
  downloadImageToDir
}
