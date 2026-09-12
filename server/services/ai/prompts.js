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
    `你是图像合成师。请把「${name}」这只虚拟陪伴兽自然地放进用户拍摄的真实照片里，输出一张照片级的合成图。`,
    `【角色特征】${name}：${keywords || '圆润可爱的卡通生物'}。${voice}`,
    '【必须做到】',
    '1. 完整保留原照片的场景、构图、拍摄视角与透视关系，以及所有真实物体和人物的位置；不要重绘背景，不要换背景，不要改变画幅比例。',
    '2. 先判断主光源来自哪一侧，再让角色的受光方向、色温和阴影与原照片完全一致。',
    '3. 让角色按真实比例落在场景里：可以坐在桌沿、趴在键盘旁、靠在杯子或书页上，高度约为画面主体的 1/6～1/3，不要占满画面。',
    '4. 在角色底部与接触面加与光照方向一致的接触阴影，并带一点环境色反射，让它"有重量"、真的贴在物体表面。',
    '5. 不要遮挡照片中的人脸与核心主体；宁可放在边角、留白处或前景空位。',
    '6. 保持原照片的清晰度与颗粒感，合成边缘柔和，不要有抠图硬边。',
    '【禁止】不要出现任何文字、水印、logo、边框；不要新增原照片里没有的人物、动物或物体；不要把整张画面变成插画或 3D 渲染风格；不要让原照片中的人或物变形。'
  ].join('\n')
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
  return path.join(AI_ROOT, rel)
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
