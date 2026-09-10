const path = require('path')
const fs = require('fs')
const express = require('express')
const cors = require('cors')
const multer = require('multer')

require('dotenv').config({ path: path.join(__dirname, '.env') })

const diaryPrompts = require('../ai/diary-prompts.json')

const app = express()
const PORT = Number(process.env.PORT) || 3000
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES) || 10 * 1024 * 1024
const uploadDir = path.join(__dirname, 'uploads')

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 }
})

const RARITY_KEY = { 普通: 'normal', 稀有: 'rare', 传说: 'legendary' }

const QUOTES = {
  naiwa: '今天在窗边陪你晒太阳',
  doro: '什么都不想，就躺在你旁边',
  maodie: '老艺术家的从容，就是陪你发呆'
}

const FALLBACK_NOTES = {
  naiwa: {
    normal: '屏幕亮着你不关，哟，反正我陪你耗到断电。',
    rare: '夕阳光打在桌角，颜色有点离谱……行，反正我陪你摆烂到天黑。',
    legendary: '世界很吵，但我决定赖在这儿——哟齁齁，陪你把荒唐过完今天。'
  },
  doro: {
    normal: '橘子味阳光……嗯，我趴这儿。',
    rare: '桌上有个小橘子……分你一半？有你在我，就不怕了。',
    legendary: '最好的那瓣橘子，想留给你——有你陪着，我就不缩成一团了。'
  },
  maodie: {
    normal: '这角落我早占了。别误会，不是等你，是领地得有人。',
    rare: '光打得还行，桌上那玩意儿碍眼……但咱俩的地盘，我认了。',
    legendary: '别误会——不是温柔，是这儿有你在，我就默认也在。'
  }
}

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

function getFontStyle(characterId) {
  return diaryPrompts.characters[characterId]?.fontStyle || characterId || 'naiwa'
}

function getDiaryNote(characterId, rarityLabel) {
  const rarityKey = RARITY_KEY[rarityLabel] || 'normal'
  const char = diaryPrompts.characters[characterId]
  if (!char) {
    return FALLBACK_NOTES.naiwa[rarityKey]
  }

  // TODO: 接入多模态 API — 使用 process.env.AI_API_KEY，禁止硬编码
  // const prompt = char.rarityLevels[rarityKey].prompt
  return FALLBACK_NOTES[characterId]?.[rarityKey] || FALLBACK_NOTES.naiwa[rarityKey]
}

app.post('/api/blend', (req, res) => {
  upload.single('image')(req, res, (error) => {
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

    const resultUrl = `/uploads/${file.filename}`

    res.json({
      resultUrl: `http://localhost:${PORT}${resultUrl}`,
      companionText: QUOTES[characterId] || QUOTES.naiwa,
      diaryNote: getDiaryNote(characterId, rarity),
      fontStyle: getFontStyle(characterId),
      taskId: `blend-${Date.now()}`
    })
  })
})

app.post('/api/roll', (_req, res) => {
  const ids = ['naiwa', 'doro', 'maodie']
  const names = { naiwa: '奶蛙', doro: 'doro', maodie: '耄耋' }
  const rarities = ['普通', '稀有', '传说']
  const roll = Math.random()
  const rarity = roll > 0.92 ? rarities[2] : roll > 0.7 ? rarities[1] : rarities[0]
  const characterId = ids[Math.floor(Math.random() * ids.length)]

  res.json({
    characterId,
    name: names[characterId],
    rarity,
    quote: QUOTES[characterId]
  })
})

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

app.listen(PORT, () => {
  console.log(`[server] http://localhost:${PORT}`)
  console.log('[server] POST /api/blend  POST /api/roll')
  if (!process.env.AI_API_KEY) {
    console.log('[server] AI_API_KEY 未配置，diaryNote 使用占位文案')
  }
})
