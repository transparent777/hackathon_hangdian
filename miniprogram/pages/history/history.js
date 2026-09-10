const { getHistory, MAX_ITEMS } = require('../../utils/history')
const { setTabBarIndex } = require('../../utils/tabbar')

Page({
  data: {
    history: [],
    maxItems: MAX_ITEMS
  },

  onShow() {
    setTabBarIndex(this, 1)
    this.setData({ history: getHistory() })
  },

  openItem(e) {
    const { item } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/result/result?imageUrl=${encodeURIComponent(item.imageUrl)}&quote=${encodeURIComponent(item.quote)}&name=${encodeURIComponent(item.characterName)}&characterId=${item.characterId}&characterImage=${encodeURIComponent(item.characterImage || '')}&sourceImagePath=${encodeURIComponent(item.sourceImagePath || item.imageUrl)}`
    })
  }
})
