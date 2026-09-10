const { DIARY_ASSETS } = require('./diary-assets')

const RARITY_KEY_MAP = {
  普通: 'normal',
  稀有: 'rare',
  传说: 'legendary'
}

function getRarityKey(label) {
  return RARITY_KEY_MAP[label] || 'normal'
}

function getFontStyle(characterId) {
  const map = {
    naiwa: 'naiwa',
    doro: 'doro',
    maodie: 'maodie'
  }
  return map[characterId] || 'naiwa'
}

function formatDiaryDate(timestamp) {
  const date = new Date(timestamp || Date.now())
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')
  return `${month}月${day}日 ${hours}:${minutes}`
}

function buildNoteClass(item) {
  const fontStyle = item.fontStyle || getFontStyle(item.characterId)
  const rarityKey = getRarityKey(item.rarity)
  return `note--${fontStyle} note--${rarityKey}`
}

function enrichDiaryEntry(item, index = 0) {
  const rarityKey = getRarityKey(item.rarity)
  return {
    ...item,
    dateLabel: formatDiaryDate(item.createdAt),
    rarityKey,
    fontStyle: item.fontStyle || getFontStyle(item.characterId),
    noteClass: buildNoteClass(item),
    tiltClass: index % 2 === 0 ? 'entry--tilt-left' : 'entry--tilt-right',
    hasNote: Boolean(item.diaryNote)
  }
}

function enrichDiaryList(list) {
  return list.map((item, index) => enrichDiaryEntry(item, index))
}

module.exports = {
  DIARY_ASSETS,
  getRarityKey,
  getFontStyle,
  formatDiaryDate,
  buildNoteClass,
  enrichDiaryEntry,
  enrichDiaryList
}
