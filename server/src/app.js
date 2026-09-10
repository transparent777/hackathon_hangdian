const crypto = require('node:crypto')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const express = require('express')
const multer = require('multer')

const { CHARACTERS, CHARACTER_IDS } = require('./config/characters')
const { HttpError } = require('./lib/http-error')
const { withTimeout } = require('./lib/timeout')
const { createDailyRateLimit } = require('./middleware/daily-rate-limit')
const { createImageProvider } = require('./providers')
const { HistoryRepository } = require('./services/history-repository')
const { getPromptInfo } = require('./services/prompt-service')
const { rollForUser } = require('./services/roll-service')

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MIME_EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
}

function createApp(options = {}) {
  const app = express()
  const dataDir = options.dataDir || process.env.DATA_DIR || path.join(os.tmpdir(), 'cyber-companion-server')
  const uploadsDir = options.uploadsDir || path.join(dataDir, 'images')
  const history = options.history || new HistoryRepository(dataDir)
  const provider = options.provider || createImageProvider(process.env.AI_PROVIDER || 'mock')
  const dailyLimit = Number(process.env.DAILY_BLEND_LIMIT || 10)
  const providerTimeoutMs = Number(process.env.AI_TIMEOUT_MS || 20000)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 1 }
  })

  const ready = Promise.all([
    history.initialize(),
    fs.mkdir(uploadsDir, { recursive: true })
  ])
  app.locals.ready = ready

  app.disable('x-powered-by')
  app.set('trust proxy', true)
  app.use(express.json({ limit: '256kb' }))

  app.use(async (req, res, next) => {
    try {
      await ready
      next()
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, provider: provider.name, timestamp: new Date().toISOString() })
  })

  app.post('/api/roll', (req, res) => {
    const openid = normalizeOpenid(req.body.openid)
    res.json(rollForUser(openid))
  })

  app.post(
    '/api/blend',
    upload.single('image'),
    createDailyRateLimit(dailyLimit),
    async (req, res, next) => {
      try {
        if (!req.file) {
          throw new HttpError(400, 'IMAGE_REQUIRED', '请使用 image 字段上传图片')
        }
        if (!ALLOWED_MIME_TYPES.has(req.file.mimetype)) {
          throw new HttpError(415, 'UNSUPPORTED_IMAGE_TYPE', '仅支持 JPEG、PNG 或 WebP 图片')
        }

        const characterId = String(req.body.characterId || '')
        if (!CHARACTER_IDS.includes(characterId)) {
          throw new HttpError(400, 'INVALID_CHARACTER', 'characterId 必须是 naiwa、doro 或 maodie')
        }

        const openid = normalizeOpenid(req.body.openid)
        const rarity = ['普通', '稀有', '传说'].includes(req.body.rarity) ? req.body.rarity : '普通'
        const taskId = `blend-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
        const promptInfo = getPromptInfo(characterId, rarity)
        const result = await withTimeout(provider.blend({
          imageBuffer: req.file.buffer,
          mimeType: req.file.mimetype,
          characterId,
          rarity,
          promptInfo,
          taskId
        }), providerTimeoutMs, 'AI 融图超时')

        const extension = MIME_EXTENSIONS[result.mimeType] || MIME_EXTENSIONS[req.file.mimetype]
        const fileName = `${taskId}${extension}`
        await fs.writeFile(path.join(uploadsDir, fileName), result.buffer)

        const baseUrl = String(process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '')
        const resultUrl = `${baseUrl}/api/files/${fileName}`
        const character = CHARACTERS[characterId]
        const quoteIndex = Number.parseInt(taskId.slice(-2), 16) % character.quotes.length
        const record = {
          taskId,
          openid,
          characterId,
          characterName: character.name,
          rarity,
          resultUrl,
          companionText: character.quotes[quoteIndex],
          diaryNote: '',
          fontStyle: promptInfo.fontStyle,
          provider: result.provider || provider.name,
          createdAt: Date.now()
        }

        await history.add(record)
        res.status(201).json({
          resultUrl: record.resultUrl,
          companionText: record.companionText,
          taskId: record.taskId,
          diaryNote: record.diaryNote,
          fontStyle: record.fontStyle,
          provider: record.provider
        })
      } catch (error) {
        next(error)
      }
    }
  )

  app.get('/api/files/:fileName', async (req, res, next) => {
    try {
      const fileName = path.basename(req.params.fileName)
      const filePath = path.join(uploadsDir, fileName)
      await fs.access(filePath)
      res.sendFile(filePath)
    } catch (error) {
      next(new HttpError(404, 'FILE_NOT_FOUND', '图片不存在'))
    }
  })

  app.get('/api/history', async (req, res, next) => {
    try {
      const openid = normalizeOpenid(req.query.openid)
      const requestedLimit = Number.parseInt(req.query.limit, 10)
      const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 10) : 10
      const records = await history.list(openid, limit)
      res.json({ records, count: records.length })
    } catch (error) {
      next(error)
    }
  })

  app.use((req, res) => {
    res.status(404).json({ code: 'NOT_FOUND', message: '接口不存在' })
  })

  app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ code: 'IMAGE_TOO_LARGE', message: '图片不能超过 10MB' })
      return
    }

    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
      res.status(400).json({ code: 'INVALID_JSON', message: 'JSON 请求体格式错误' })
      return
    }

    const status = error.status || 500
    const code = error.code || 'INTERNAL_ERROR'
    const message = status >= 500 ? '服务器开小差了' : error.message
    if (status >= 500) console.error(error)
    res.status(status).json({ code, message })
  })

  return app
}

function normalizeOpenid(value) {
  const openid = String(value || '').trim()
  return openid || 'demo-user'
}

module.exports = { createApp }
