const fs = require('node:fs/promises')
const path = require('node:path')

class HistoryRepository {
  constructor(dataDir) {
    this.dataDir = dataDir
    this.filePath = path.join(dataDir, 'history.json')
    this.writeQueue = Promise.resolve()
  }

  async initialize() {
    await fs.mkdir(this.dataDir, { recursive: true })
    try {
      await fs.access(this.filePath)
    } catch (error) {
      await fs.writeFile(this.filePath, '[]\n', 'utf8')
    }
  }

  async readAll() {
    await this.writeQueue
    const content = await fs.readFile(this.filePath, 'utf8')
    return JSON.parse(content)
  }

  async add(record) {
    this.writeQueue = this.writeQueue.then(async () => {
      const records = JSON.parse(await fs.readFile(this.filePath, 'utf8'))
      records.unshift(record)
      const retained = records.slice(0, 500)
      await fs.writeFile(this.filePath, `${JSON.stringify(retained, null, 2)}\n`, 'utf8')
    })
    await this.writeQueue
    return record
  }

  async list(openid, limit = 10) {
    const records = await this.readAll()
    return records.filter((record) => record.openid === openid).slice(0, limit)
  }
}

module.exports = { HistoryRepository }
