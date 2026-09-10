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

function isTempImagePath(filePath) {
  if (!filePath) return false
  return filePath.startsWith('wxfile://') || filePath.includes('tmp') || filePath.startsWith('http://tmp')
}

function persistImagePath(tempPath) {
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
    if (isTempImagePath(record.imageUrl)) {
      savedImagePath = await persistImagePath(record.imageUrl)
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
  isTempImagePath,
  persistImagePath,
  MAX_ITEMS
}
