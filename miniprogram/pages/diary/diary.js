const { getHistory } = require('../../utils/history')
const { enrichDiaryList } = require('../../utils/diary')

Page({
  data: {
    entries: [],
    isEmpty: true
  },

  onShow() {
    this.loadEntries()
  },

  loadEntries() {
    const raw = getHistory()
    const entries = enrichDiaryList(raw)
    this.setData({
      entries,
      isEmpty: entries.length === 0
    })
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
