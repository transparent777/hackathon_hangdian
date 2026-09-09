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

function saveImageFile(tempPath) {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().saveFile({
      tempFilePath: tempPath,
      success: (res) => resolve(res.savedFilePath),
      fail: reject
    })
  })
}

async function addHistory(record) {
  const list = getHistory()
  let savedImagePath = record.imageUrl

  try {
    if (record.imageUrl && (record.imageUrl.startsWith('wxfile://') || record.imageUrl.includes('tmp'))) {
      savedImagePath = await saveImageFile(record.imageUrl)
    }
  } catch (error) {
    console.warn('save history image failed, use temp path', error)
  }

  const item = {
    id: `${Date.now()}`,
    characterId: record.characterId,
    characterName: record.characterName,
    characterImage: record.characterImage,
    imageUrl: savedImagePath,
    quote: record.quote,
    createdAt: Date.now()
  }

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
