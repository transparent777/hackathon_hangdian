const { fetchRoll } = require('../../utils/api')
const { getTodayCompanion, setTodayCompanion } = require('../../utils/daily')
const { setTabBarIndex } = require('../../utils/tabbar')

const BANNER_FINAL = '/images/placeholders/home-banner.jpg'

Page({
  data: {
    companion: null,
    rolling: false,
    bannerSrc: ''
  },

  onShow() {
    setTabBarIndex(this, 0)

    if (!this._bannerChecked) {
      this._bannerChecked = true
      this.setData({ bannerSrc: BANNER_FINAL })
    }

    const app = getApp()
    const companion = app.globalData.todayCompanion || getTodayCompanion()
    if (companion) {
      app.globalData.todayCompanion = companion
    }

    this.setData({ companion })
  },

  onBannerError() {
    this.setData({ bannerSrc: '' })
  },

  async onRoll() {
    if (this.data.rolling) return

    this.setData({ rolling: true })
    try {
      const companion = await fetchRoll()
      const app = getApp()
      app.globalData.todayCompanion = companion
      setTodayCompanion(companion)
      this.setData({ companion })
      wx.showToast({ title: `召唤了 ${companion.name}`, icon: 'none' })
    } catch (error) {
      wx.showToast({ title: '抽取失败', icon: 'none' })
      console.error(error)
    } finally {
      this.setData({ rolling: false })
    }
  },

  goCamera() {
    const { companion } = this.data
    if (!companion) {
      wx.showToast({ title: '请先抽取陪伴兽', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: `/pages/camera/camera?characterId=${companion.characterId}&name=${companion.name}&image=${encodeURIComponent(companion.image)}`
    })
  }
})
