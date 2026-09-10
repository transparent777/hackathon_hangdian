const STORAGE_KEY = 'today_companion'

function getTodayKey() {
  const now = new Date()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function getTodayCompanion() {
  try {
    const data = wx.getStorageSync(STORAGE_KEY)
    if (!data || data.date !== getTodayKey()) return null
    return data.companion
  } catch (error) {
    return null
  }
}

function setTodayCompanion(companion) {
  wx.setStorageSync(STORAGE_KEY, {
    date: getTodayKey(),
    companion
  })
}

module.exports = {
  getTodayCompanion,
  setTodayCompanion
}
