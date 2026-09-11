const { ensureStableImagePath } = require('./image-path')

const STORAGE_KEY = 'blend_history'
const MAX_ITEMS = 10

function getHistory() {
  try {
    return wx.getStorageSync(STORAGE_KEY) || []
  } catch (error) {
    console.error('read history failed', error)
    return []
  }
}

async function addHistory(record) {
  let imageUrl = record.imageUrl
  try {
    imageUrl = await ensureStableImagePath(record.imageUrl)
  } catch (error) {
    if (/^https?:\/\//i.test(record.imageUrl)) {
      console.warn('keep remote result url for history', error)
      imageUrl = record.imageUrl
    } else {
      throw error
    }
  }

  const item = {
    id: `${Date.now()}`,
    characterId: record.characterId,
    characterName: record.characterName,
    characterImage: record.characterImage,
    rarity: record.rarity || '普通',
    imageUrl,
    sourceImagePath: record.sourceImagePath || '',
    quote: record.quote,
    diaryNote: record.diaryNote || '',
    fontStyle: record.fontStyle || record.characterId || 'naiwa',
    createdAt: Date.now()
  }

  const list = getHistory()
  const next = [item, ...list].slice(0, MAX_ITEMS)
  wx.setStorageSync(STORAGE_KEY, next)
  return item
}

function removeHistory(id) {
  const next = getHistory().filter((item) => item.id !== id)
  wx.setStorageSync(STORAGE_KEY, next)
}

module.exports = {
  getHistory,
  addHistory,
  removeHistory,
  MAX_ITEMS
}
