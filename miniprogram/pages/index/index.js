const { fetchRoll } = require('../../utils/api')
const { getCharacterById } = require('../../utils/characters')
const { getTodayCompanion, setTodayCompanion } = require('../../utils/daily')
const { setTabBarIndex } = require('../../utils/tabbar')
const { shouldShowSplash, dismissSplash } = require('../../utils/splash-session')

function normalizeCompanion(companion) {
  if (!companion || !companion.characterId) return null
  return getCharacterById(companion.characterId, companion.rarity || '普通')
}

const BANNER_FINAL = '/images/placeholders/home-banner.jpg'

Page({
  data: {
    companion: null,
    rolling: false,
    bannerSrc: '',
    showSplash: false
  },

  onLoad() {
    this.setData({
      bannerSrc: BANNER_FINAL,
      showSplash: shouldShowSplash()
    }, () => {
      this.syncTabBarVisibility()
    })
  },

  syncTabBarVisibility() {
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null
    if (tabBar) {
      tabBar.setData({ hidden: this.data.showSplash })
    }
  },

  onShow() {
    this.syncTabBarVisibility()

    try {
      setTabBarIndex(this, 0)
    } catch (error) {
      console.warn('tabBar sync failed', error)
    }
    const app = getApp()
    const raw = app.globalData.todayCompanion || getTodayCompanion()
    const companion = normalizeCompanion(raw)
    if (companion) {
      app.globalData.todayCompanion = companion
      setTodayCompanion(companion)
    }

    this.setData({ companion })
  },

  onSplashComplete() {
    dismissSplash()
    this.setData({ showSplash: false }, () => {
      this.syncTabBarVisibility()
    })
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
      url: `/pages/camera/camera?characterId=${companion.characterId}&name=${companion.name}&rarity=${encodeURIComponent(companion.rarity)}&image=${encodeURIComponent(companion.image)}`
    })
  }
})
