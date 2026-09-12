const path = require('path')
const fs = require('fs')
const express = require('express')
const cors = require('cors')
const multer = require('multer')

require('dotenv').config({ path: path.join(__dirname, '.env') })

const { initAi, runBlend, runDiary, rollCharacter, pickQuote } = require('./services/ai')
const { describeAiHealth } = require('./services/ai/config')
const { getDiaryPromptBundle, RARITY_KEY } = require('./services/ai/prompts')
const { getFallbackDiaryNote } = require('./services/ai/fallbacks')
const { startUploadsSweeper } = require('./services/ai/cleanup')
const { log } = require('./services/ai/log')
const { AIConfigError } = require('./services/ai/errors')

const app = express()
const PORT = Number(process.env.PORT) || 3000
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES) || 10 * 1024 * 1024
const uploadDir = path.join(__dirname, 'uploads')

const aiConfig = initAi()
startUploadsSweeper({
  dir: uploadDir,
  ttlMs: aiConfig.uploadTtlHours * 60 * 60 * 1000,
  logger: log
})

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 }
})

function createCorsOptions() {
  const origins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  if (!origins.length) {
    return { origin: true }
  }

  return {
    origin(origin, callback) {
      if (!origin || origins.includes(origin)) {
        callback(null, true)
        return
      }
      callback(new Error('Not allowed by CORS'))
    }
  }
}

app.use(cors(createCorsOptions()))
app.use('/uploads', express.static(uploadDir, { dotfiles: 'deny', index: false }))

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    ts: Date.now(),
    ai: describeAiHealth()
  })
})

app.post('/api/roll', (_req, res) => {
  res.json(rollCharacter())
})

app.post('/api/blend', (req, res) => {
  upload.single('image')(req, res, async (error) => {
    if (error) {
      const message = error.code === 'LIMIT_FILE_SIZE' ? '图片过大' : '上传失败'
      res.status(400).json({ message })
      return
    }

    const characterId = req.body.characterId || 'naiwa'
    const rarity = req.body.rarity || '普通'
    const file = req.file

    if (!file) {
      res.status(400).json({ message: '缺少图片' })
      return
    }

    log.info('blend request', { characterId, rarity, file: file?.originalname || file?.filename })

    const deadline = Date.now() + aiConfig.routeBudgetMs

    try {
      const blendResult = await runBlend({
        characterId,
        rarityLabel: rarity,
        sourceFile: file,
        publicBaseUrl: aiConfig.publicBaseUrl,
        deadline
      })

      const rarityKey = RARITY_KEY[rarity] || 'normal'
      const promptBundle = getDiaryPromptBundle(characterId, rarity)
      let diaryResult = {
        diaryNote: getFallbackDiaryNote(characterId, rarityKey),
        fontStyle: promptBundle.fontStyle,
        provider: 'fallback'
      }

      try {
        diaryResult = await runDiary({
          characterId,
          rarityLabel: rarity,
          imagePath: file.path,
          deadline
        })
      } catch (diaryError) {
        log.warn('diary skipped', log.sanitize(diaryError.message))
      }

      log.info('diary provider', diaryResult.provider || 'fallback')

      if (aiConfig.isLive && blendResult?.blended === false) {
        res.status(500).json({ message: '溶图处理失败，未生成合成图' })
        return
      }

      res.json({
        resultUrl: blendResult.resultUrl,
        blended: blendResult.blended !== false,
        companionText: pickQuote(characterId),
        diaryNote: diaryResult.diaryNote,
        fontStyle: diaryResult.fontStyle,
        diaryProvider: diaryResult.provider || 'fallback',
        taskId: `blend-${Date.now()}`
      })
    } catch (err) {
      if (err instanceof AIConfigError && err.code === 'UNSUPPORTED_MIME') {
        res.status(400).json({ message: err.message })
        return
      }
      log.error('blend failed', err)
      const detail = err?.message ? String(err.message).slice(0, 120) : ''
      res.status(500).json({
        message: detail && !detail.includes('溶图') ? `溶图失败：${detail}` : '溶图处理失败，请稍后重试'
      })
    }
  })
})

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] http://127.0.0.1:${PORT}`)
  console.log('[server] GET /api/health  POST /api/blend  POST /api/roll')
})
