const { fetchRoll } = require('../../utils/api')

Page({
  data: {
    companion: null,
    rolling: false
  },

  onShow() {
    const app = getApp()
    if (app.globalData.todayCompanion) {
      this.setData({ companion: app.globalData.todayCompanion })
    }
  },

  async onRoll() {
    this.setData({ rolling: true })
    try {
      const companion = await fetchRoll()
      getApp().globalData.todayCompanion = companion
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
    if (!companion) return
    wx.navigateTo({
      url: `/pages/camera/camera?characterId=${companion.characterId}&name=${companion.name}`
    })
  }
})
