const FALLBACK_NOTES = {
  naiwa: {
    normal: '我在这里陪你哈哈哈哈哈哈哈哈哈。',
    rare: '不管怎样，反正奶娃我陪你耗到断电。',
    legendary: '世界很吵，但我决定赖在这儿——哟齁齁，陪你把荒唐过完。'
  },
  doro: {
    normal: '橘子味……嗯，我在这。',
    rare: '有个小橘子……分你一半？有你在我，就不怕了。',
    legendary: '最好的那瓣橘子，想留给你——有你陪着，我就不缩成一团了。'
  },
  maodie: {
    normal: '照片真不错，让我抓一抓。',
    rare: '这角落我早占了。别误会，不是等你，而是想哈你。',
    legendary: '我这个级别的基米有权巡视所有人。'
  }
}

function getFallbackDiaryNote(characterId, rarityKey) {
  const bucket = FALLBACK_NOTES[characterId] || FALLBACK_NOTES.naiwa
  return bucket[rarityKey] || FALLBACK_NOTES.naiwa.normal
}

module.exports = {
  getFallbackDiaryNote
}
