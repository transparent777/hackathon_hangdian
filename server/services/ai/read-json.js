const fs = require('fs')

function readJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(raw)
  } catch (_error) {
    return null
  }
}

module.exports = { readJson }
