const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

function fileToDataUri(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return null
  }

  const buf = fs.readFileSync(filePath)
  const ext = path.extname(filePath).toLowerCase()
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg'
  return `data:${mime};base64,${buf.toString('base64')}`
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
  fileToDataUri,
  downloadImageToDir
}
