// 三角色配置，后续可与 B 的 /roll 接口对齐
const CHARACTERS = [
  {
    characterId: 'naiwa',
    name: '奶蛙',
    emoji: '🐸',
    color: '#A8E6CF',
    quote: '今天在窗边陪你晒太阳'
  },
  {
    characterId: 'doro',
    name: 'doro',
    emoji: '🍊',
    color: '#FFD3A5',
    quote: '什么都不想，就躺在你旁边'
  },
  {
    characterId: 'maodie',
    name: '耄耋',
    emoji: '🐱',
    color: '#DDA0DD',
    quote: '老艺术家的从容，就是陪你发呆'
  }
]

function rollCharacter() {
  const index = Math.floor(Math.random() * CHARACTERS.length)
  return { ...CHARACTERS[index], rarity: '普通' }
}

function getCharacterById(id) {
  return CHARACTERS.find((item) => item.characterId === id) || CHARACTERS[0]
}

module.exports = {
  CHARACTERS,
  rollCharacter,
  getCharacterById
}
