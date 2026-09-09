const { fetchRoll } = require('../../utils/api')
const { getTodayCompanion, setTodayCompanion } = require('../../utils/daily')
const { getHistory } = require('../../utils/history')

Page({
  data: {
    companion: null,
    rolling: false,
    history: [],
    useMock: true
  },

  onShow() {
    const app = getApp()
    const companion = app.globalData.todayCompanion || getTodayCompanion()

    if (companion) {
      app.globalData.todayCompanion = companion
    }

    this.setData({
      companion,
      history: getHistory(),
      useMock: app.globalData.useMock
    })
  },

  async onRoll() {
    this.setData({ rolling: true })
    try {
      const companion = await fetchRoll()
      const app = getApp()
      app.globalData.todayCompanion = companion
      setTodayCompanion(companion)
      this.setData({ companion })
      wx.showToast({ title: `召唤了 ${companion.name}`, icon: 'none' })
    } catch (error) {
      wx.showToast({ title: 'Roll 失败', icon: 'none' })
      console.error(error)
    } finally {
      this.setData({ rolling: false })
    }
  },

  goCamera() {
    const { companion } = this.data
    if (!companion) {
      wx.showToast({ title: '请先 Roll 陪伴兽', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: `/pages/camera/camera?characterId=${companion.characterId}&name=${companion.name}&image=${encodeURIComponent(companion.image)}`
    })
  },

  openHistory(e) {
    const { item } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/result/result?imageUrl=${encodeURIComponent(item.imageUrl)}&quote=${encodeURIComponent(item.quote)}&name=${encodeURIComponent(item.characterName)}&characterId=${item.characterId}&characterImage=${encodeURIComponent(item.characterImage || '')}`
    })
  }
})
