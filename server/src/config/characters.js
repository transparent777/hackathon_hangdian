const CHARACTERS = {
  naiwa: {
    characterId: 'naiwa',
    name: '奶蛙',
    fontStyle: 'naiwa',
    quotes: [
      '今天在窗边陪你晒太阳',
      '先不着急，我陪你慢慢来',
      '哟齁齁，今天也赖在你身边'
    ]
  },
  doro: {
    characterId: 'doro',
    name: 'doro',
    fontStyle: 'doro',
    quotes: [
      '什么都不想，就趴在你旁边',
      '分你一瓣橘子，今天不用孤单',
      '我先放空一会儿，你慢慢忙'
    ]
  },
  maodie: {
    characterId: 'maodie',
    name: '耄耋',
    fontStyle: 'maodie',
    quotes: [
      '老艺术家的从容，就是陪你发呆',
      '这片地盘我看过了，你放心待着',
      '别慌，有本座在这儿罩着'
    ]
  }
}

const CHARACTER_IDS = Object.keys(CHARACTERS)

module.exports = { CHARACTERS, CHARACTER_IDS }
