const fs = require('fs')
const path = require('path')
const { AI_ROOT } = require('./config')

const diaryPrompts = require(path.join(AI_ROOT, 'diary-prompts.json'))
const quotes = require(path.join(AI_ROOT, 'quotes.json'))

const RARITY_KEY = { 普通: 'normal', 稀有: 'rare', 传说: 'legendary' }
const CHARACTER_IDS = ['naiwa', 'doro', 'maodie']

const blendPromptCache = new Map()

function loadBlendPrompt(characterId) {
  const id = CHARACTER_IDS.includes(characterId) ? characterId : 'naiwa'
  if (blendPromptCache.has(id)) {
    return blendPromptCache.get(id)
  }

  const filePath = path.join(AI_ROOT, 'prompts', `${id}.json`)
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  blendPromptCache.set(id, data)
  return data
}

function buildBlendPromptText(characterId, rarityLabel = '普通') {
  const cfg = loadBlendPrompt(characterId)
  const modifier = cfg.rarityModifiers?.[rarityLabel] || cfg.rarityModifiers?.['普通'] || ''
  const base = cfg.blend?.prompt || ''
  return [base, modifier].filter(Boolean).join(' ')
}

function resolveReferenceImagePath(characterId) {
  const cfg = loadBlendPrompt(characterId)
  const rel = cfg.referenceImage || `references/${characterId}.jpg`
  return path.join(AI_ROOT, rel)
}

function getDiaryPromptBundle(characterId, rarityLabel) {
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

function pickQuote(characterId) {
  const pool = quotes[characterId] || quotes.naiwa || []
  if (!pool.length) return ''
  return pool[Math.floor(Math.random() * pool.length)]
}

module.exports = {
  RARITY_KEY,
  CHARACTER_IDS,
  loadBlendPrompt,
  buildBlendPromptText,
  resolveReferenceImagePath,
  getDiaryPromptBundle,
  pickQuote,
  diaryPrompts
}
