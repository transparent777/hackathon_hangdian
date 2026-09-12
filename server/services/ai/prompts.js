const fs = require('fs')
const path = require('path')
const { AI_ROOT } = require('./config')
const { readJson } = require('./read-json')
const { log } = require('./log')

const DIARY_PROMPTS_PATH = path.join(AI_ROOT, 'diary-prompts.json')
const QUOTES_PATH = path.join(AI_ROOT, 'quotes.json')

const RARITY_KEY = { 普通: 'normal', 稀有: 'rare', 传说: 'legendary' }
const CHARACTER_IDS = ['naiwa', 'doro', 'maodie']

const BUILTIN_NAMES = { naiwa: '奶蛙', doro: 'doro', maodie: '耄耋' }
const BUILTIN_KEYWORDS = {
  naiwa: ['chibi milk dragon', 'cute', 'round face'],
  doro: ['orange simple creature', 'meme style'],
  maodie: ['fluffy old cat meme', 'lazy']
}

const INLINE_QUOTES = {
  naiwa: '今天在窗边陪你大笑',
  doro: '什么都不想，就躺在你旁边',
  maodie: '老艺术家的从容，就是陪你哈气'
}

const blendPromptCache = new Map()

function loadDiaryPrompts() {
  return readJson(DIARY_PROMPTS_PATH) || { characters: {}, global: {} }
}

function buildBuiltinBlendPrompt(characterId) {
  const cfg = loadDiaryPrompts()
  const voice =
    (cfg.characters && cfg.characters[characterId] && cfg.characters[characterId].voice) || ''
  const keywords = (BUILTIN_KEYWORDS[characterId] || []).join(', ')
  const name = BUILTIN_NAMES[characterId] || characterId

  return [
    `在编辑区域添加虚拟陪伴兽「${name}」：${keywords || '圆润可爱的平面梗图生物'}，${voice}`,
    '保持二次元平面梗图/表情包画风，粗描边、扁平色块，不得变成 3D 或写实动物。',
    '角色站在编辑区内的桌面或台面上，像手掌大小的桌面小摆件。'
  ].join(' ')
}

function loadBlendPrompt(characterId) {
  const id = CHARACTER_IDS.includes(characterId) ? characterId : 'naiwa'
  if (blendPromptCache.has(id)) {
    return blendPromptCache.get(id)
  }

  const filePath = path.join(AI_ROOT, 'prompts', `${id}.json`)
  const data = readJson(filePath)
  if (data && data.blend) {
    const entry = { ...data, _source: 'authored' }
    blendPromptCache.set(id, entry)
    return entry
  }

  const entry = {
    characterId: id,
    name: BUILTIN_NAMES[id] || id,
    referenceImage: `references/${id}.jpg`,
    blend: {
      prompt: buildBuiltinBlendPrompt(id),
      negativePrompt: '',
      strength: 0.65
    },
    _source: 'builtin'
  }
  blendPromptCache.set(id, entry)
  if (data === null) {
    log.warn('未找到或无法解析溶图 prompt，使用内置兜底', { characterId: id })
  }
  return entry
}

function getBlendPromptSource(characterId) {
  return loadBlendPrompt(characterId)._source || 'authored'
}

function buildBlendPromptText(characterId) {
  const cfg = loadBlendPrompt(characterId)
  return cfg.blend?.prompt || ''
}

function resolveReferenceImagePath(characterId) {
  const cfg = loadBlendPrompt(characterId)
  const rel = cfg.referenceImage || `references/${characterId}.jpg`
  const candidates = [
    path.join(AI_ROOT, rel),
    path.join(AI_ROOT, 'references', `${characterId}.jpg`),
    path.join(AI_ROOT, 'references', `${characterId}.png`)
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  const manifestPath = path.join(AI_ROOT, 'references', 'manifest.json')
  const manifest = readJson(manifestPath)
  const marked = manifest?.characters?.[characterId]?.variants?.find((item) => item.isPrimary)
  if (marked?.file) {
    const fromManifest = path.join(AI_ROOT, 'references', marked.file)
    if (fs.existsSync(fromManifest)) {
      return fromManifest
    }
  }

  const variantsDir = path.join(AI_ROOT, 'references', 'variants', characterId)
  if (fs.existsSync(variantsDir)) {
    const files = fs
      .readdirSync(variantsDir)
      .filter((name) => /\.(jpe?g|png|webp)$/i.test(name))
      .sort()
    if (files.length) {
      return path.join(variantsDir, files[0])
    }
  }

  log.warn('未找到角色参考图', { characterId, expected: candidates[0] })
  return candidates[0]
}

function getDiaryPromptBundle(characterId, rarityLabel) {
  const diaryPrompts = loadDiaryPrompts()
  const rarityKey = RARITY_KEY[rarityLabel] || 'normal'
  const char = diaryPrompts.characters?.[characterId] || diaryPrompts.characters?.naiwa
  const level = char?.rarityLevels?.[rarityKey]

  return {
    systemPrompt: diaryPrompts.global?.systemPrompt || '',
    outputRules: diaryPrompts.global?.outputRules || {},
    characterPrompt: level?.prompt || '',
    maxLength: level?.maxLength || 48,
    fontStyle: char?.fontStyle || characterId || 'naiwa',
    voice: char?.voice || ''
  }
}

function getQuotePool(characterId) {
  const data = readJson(QUOTES_PATH)
  const pool = data && Array.isArray(data[characterId]) ? data[characterId] : null
  if (pool && pool.length) return pool
  const fallback = INLINE_QUOTES[characterId] || INLINE_QUOTES.naiwa
  return [fallback]
}

function pickQuote(characterId) {
  const pool = getQuotePool(characterId)
  return pool[Math.floor(Math.random() * pool.length)]
}

module.exports = {
  RARITY_KEY,
  CHARACTER_IDS,
  loadBlendPrompt,
  getBlendPromptSource,
  buildBlendPromptText,
  resolveReferenceImagePath,
  getDiaryPromptBundle,
  pickQuote,
  loadDiaryPrompts
}
