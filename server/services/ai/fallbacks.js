const FALLBACK_NOTES = {
  naiwa: {
    normal: '屏幕亮着你不关，哟，反正我陪你耗到断电。',
    rare: '夕阳光打在桌角，颜色有点离谱……行，反正我陪你摆烂到天黑。',
    legendary: '世界很吵，但我决定赖在这儿——哟齁齁，陪你把荒唐过完今天。'
  },
  doro: {
    normal: '橘子味阳光……嗯，我趴这儿。',
    rare: '桌上有个小橘子……分你一半？有你在我，就不怕了。',
    legendary: '最好的那瓣橘子，想留给你——有你陪着，我就不缩成一团了。'
  },
  maodie: {
    normal: '这角落我早占了。别误会，不是等你，是领地得有人。',
    rare: '光打得还行，桌上那玩意儿碍眼……但咱俩的地盘，我认了。',
    legendary: '别误会——不是温柔，是这儿有你在，我就默认也在。'
  }
}

function getFallbackDiaryNote(characterId, rarityKey) {
  const bucket = FALLBACK_NOTES[characterId] || FALLBACK_NOTES.naiwa
  return bucket[rarityKey] || FALLBACK_NOTES.naiwa.normal
}

module.exports = {
  getFallbackDiaryNote
}
