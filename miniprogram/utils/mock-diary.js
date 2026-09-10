const { getFontStyle, getRarityKey } = require('./diary')

const MOCK_NOTES = {
  naiwa: {
    normal: [
      '屏幕亮着你不关，哟，反正我陪你耗到断电。',
      '杯子歪了也不管，摆烂嘛，我笑给你看。'
    ],
    rare: [
      '夕阳光打在桌角，颜色有点离谱……行，反正我陪你摆烂到天黑。',
      '键盘上落了点灰，哟齁，这不就是咱俩今天的勋章吗。'
    ],
    legendary: [
      '光从窗帘缝里漏进来，落在你的杯子上，像谁偷偷打了个哈欠。世界很吵，但我决定赖在这儿——哟齁齁，陪你把荒唐过完今天。'
    ]
  },
  doro: {
    normal: [
      '橘子味阳光……嗯，我趴这儿。',
      '窗户外很亮。你不走，我就不缩成团。'
    ],
    rare: [
      '桌上有个小橘子……分你一半？有你在我，就不怕了。',
      '光线软软的，像刚剥开的欧润吉。我放空一会儿，但不想你走远。'
    ],
    legendary: [
      '窗外很亮，屋里很安静。我眼神放空地看着这一切，心里却慢慢暖起来。最好的那瓣橘子，想留给你——有你陪着，我就不缩成一团了。'
    ]
  },
  maodie: {
    normal: [
      '这角落我早占了。别误会，不是等你，是领地得有人。',
      '沙发皱成这样……啧，算了，我勉强罩着。'
    ],
    rare: [
      '光打得还行，桌上那玩意儿碍眼……但咱俩的地盘，我认了。',
      '空气里有点懒意，像我刚睡醒。别得意，我只是懒得赶你走。'
    ],
    legendary: [
      '光影在地板上画了一道线，像领地边界。我巡视了一圈，一切还算规矩。别误会——不是温柔，是这儿有你在，我就默认也在。'
    ]
  }
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function mockDiaryNote(characterId, rarityLabel) {
  const rarityKey = getRarityKey(rarityLabel)
  const pool = MOCK_NOTES[characterId]?.[rarityKey] || MOCK_NOTES.naiwa.normal
  return pickRandom(pool)
}

function mockDiaryFields(characterId, rarityLabel) {
  return {
    diaryNote: mockDiaryNote(characterId, rarityLabel),
    fontStyle: getFontStyle(characterId)
  }
}

module.exports = {
  mockDiaryNote,
  mockDiaryFields
}
