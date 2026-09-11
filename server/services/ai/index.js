const { loadAiRuntimeConfig, logAiBootSummary } = require('./config')
const { runBlend } = require('./blend')
const { runDiary } = require('./diary')
const { pickQuote, CHARACTER_IDS } = require('./prompts')

const NAMES = { naiwa: '奶蛙', doro: 'doro', maodie: '耄耋' }
const RARITIES = ['普通', '稀有', '传说']

function rollCharacter() {
  const roll = Math.random()
  const rarity = roll > 0.92 ? RARITIES[2] : roll > 0.7 ? RARITIES[1] : RARITIES[0]
  const characterId = CHARACTER_IDS[Math.floor(Math.random() * CHARACTER_IDS.length)]

  return {
    characterId,
    name: NAMES[characterId],
    rarity,
    quote: pickQuote(characterId)
  }
}

function initAi() {
  const config = loadAiRuntimeConfig()
  logAiBootSummary(config)
  return config
}

module.exports = {
  initAi,
  runBlend,
  runDiary,
  rollCharacter,
  pickQuote
}
