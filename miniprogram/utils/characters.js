const RARITIES = [
  { label: '普通', color: '#74b9ff', key: 'normal' },
  { label: '稀有', color: '#6c5ce7', key: 'rare' },
  { label: '传说', color: '#ff6b6b', key: 'legendary' }
]

const CHARACTERS = [
  {
    characterId: 'naiwa',
    name: '奶蛙',
    emoji: '🐸',
    accent: '#a8e6cf',
    quote: '今天在窗边陪你晒太阳'
  },
  {
    characterId: 'doro',
    name: 'doro',
    emoji: '🍊',
    accent: '#ffd3a5',
    quote: '什么都不想，就躺在你旁边'
  },
  {
    characterId: 'maodie',
    name: '耄耋',
    emoji: '🐱',
    accent: '#dda0dd',
    quote: '老艺术家的从容，就是陪你发呆'
  }
]

function getRarityMeta(label) {
  return RARITIES.find((item) => item.label === label) || RARITIES[0]
}

function getCoverImage(characterId, rarityLabel) {
  const rarity = getRarityMeta(rarityLabel)
  return `/images/characters/covers/${characterId}/${rarity.key}.jpg`
}

function rollRarity() {
  const roll = Math.random()
  if (roll > 0.92) return RARITIES[2]
  if (roll > 0.7) return RARITIES[1]
  return RARITIES[0]
}

function enrichCharacter(character, rarityLabel) {
  const rarity = getRarityMeta(rarityLabel)
  return {
    ...character,
    image: getCoverImage(character.characterId, rarity.label),
    rarity: rarity.label,
    rarityColor: rarity.color
  }
}

function rollCharacter() {
  const index = Math.floor(Math.random() * CHARACTERS.length)
  const rolledRarity = rollRarity()
  return enrichCharacter(CHARACTERS[index], rolledRarity.label)
}

function getCharacterById(id, rarityLabel = '普通') {
  const character = CHARACTERS.find((item) => item.characterId === id) || CHARACTERS[0]
  return enrichCharacter(character, rarityLabel)
}

module.exports = {
  CHARACTERS,
  RARITIES,
  getCoverImage,
  rollCharacter,
  getCharacterById
}
