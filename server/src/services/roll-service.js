const { CHARACTERS, CHARACTER_IDS } = require('../config/characters')
const { getShanghaiDay } = require('../lib/day')
const { hashString } = require('../lib/hash')

function getRarity(seed) {
  const value = seed % 100
  if (value < 5) return '传说'
  if (value < 25) return '稀有'
  return '普通'
}

function rollForUser(openid = 'demo-user', date = new Date()) {
  const day = getShanghaiDay(date)
  const seed = hashString(`${openid}:${day}`)
  const character = CHARACTERS[CHARACTER_IDS[seed % CHARACTER_IDS.length]]
  const quote = character.quotes[Math.floor(seed / CHARACTER_IDS.length) % character.quotes.length]

  return {
    characterId: character.characterId,
    name: character.name,
    rarity: getRarity(Math.floor(seed / 7)),
    quote,
    date: day
  }
}

module.exports = { rollForUser }
