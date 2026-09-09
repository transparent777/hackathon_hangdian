const RARITIES = [
  { label: '普通', color: '#74b9ff' },
  { label: '稀有', color: '#6c5ce7' },
  { label: '传说', color: '#ff6b6b' }
]

const CHARACTERS = [
  {
    characterId: 'naiwa',
    name: '奶蛙',
    emoji: '🐸',
    image: '/images/characters/naiwa.jpg',
    accent: '#a8e6cf',
    quote: '今天在窗边陪你晒太阳'
  },
  {
    characterId: 'doro',
    name: 'doro',
    emoji: '🍊',
    image: '/images/characters/doro.jpg',
    accent: '#ffd3a5',
    quote: '什么都不想，就躺在你旁边'
  },
  {
    characterId: 'maodie',
    name: '耄耋',
    emoji: '🐱',
    image: '/images/characters/maodie.jpg',
    accent: '#dda0dd',
    quote: '老艺术家的从容，就是陪你发呆'
  }
]

function rollRarity() {
  const roll = Math.random()
  if (roll > 0.92) return RARITIES[2]
  if (roll > 0.7) return RARITIES[1]
  return RARITIES[0]
}

function rollCharacter() {
  const index = Math.floor(Math.random() * CHARACTERS.length)
  const rarity = rollRarity()
  return {
    ...CHARACTERS[index],
    rarity: rarity.label,
    rarityColor: rarity.color
  }
}

function getCharacterById(id) {
  const character = CHARACTERS.find((item) => item.characterId === id) || CHARACTERS[0]
  return {
    ...character,
    rarity: '普通',
    rarityColor: RARITIES[0].color
  }
}

module.exports = {
  CHARACTERS,
  RARITIES,
  rollCharacter,
  getCharacterById
}
