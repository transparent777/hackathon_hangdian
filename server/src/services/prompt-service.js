const fs = require('node:fs')
const path = require('node:path')
const { CHARACTERS } = require('../config/characters')

const RARITY_KEYS = {
  '普通': 'normal',
  '稀有': 'rare',
  '传说': 'legendary'
}

function loadDiaryConfig() {
  const configPath = path.resolve(__dirname, '../../../ai/diary-prompts.json')
  return JSON.parse(fs.readFileSync(configPath, 'utf8'))
}

function getPromptInfo(characterId, rarity = '普通') {
  const fallback = CHARACTERS[characterId]
  const rarityKey = RARITY_KEYS[rarity] || 'normal'

  try {
    const config = loadDiaryConfig()
    const character = config.characters[characterId]
    const level = character?.rarityLevels?.[rarityKey]
    return {
      fontStyle: character?.fontStyle || fallback.fontStyle,
      diarySystemPrompt: [
        config.global.systemPrompt,
        `角色：${character.name}。说话风格：${character.voice}`,
        `输出要求：${config.global.outputRules.format}，最多 ${level.maxLength} 字。`
      ].join('\n'),
      diaryUserPrompt: level.prompt,
      maxLength: level.maxLength
    }
  } catch (error) {
    return {
      fontStyle: fallback.fontStyle,
      diarySystemPrompt: '',
      diaryUserPrompt: '',
      maxLength: 0
    }
  }
}

module.exports = { getPromptInfo }
