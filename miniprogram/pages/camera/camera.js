const { fetchBlend } = require('../../utils/api')

Page({
  data: {
    characterId: '',
    characterName: '',
    imagePath: '',
    blending: false
  },

  onLoad(options) {
    this.setData({
      characterId: options.characterId || 'naiwa',
      characterName: options.name || '陪伴兽'
    })
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const imagePath = res.tempFiles[0].tempFilePath
        this.setData({ imagePath })
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('cancel')) return
        wx.showToast({ title: '选图失败', icon: 'none' })
      }
    })
  },

  async onBlend() {
    const { characterId, imagePath, characterName } = this.data
    if (!imagePath) return

    this.setData({ blending: true })
    try {
      const result = await fetchBlend({ characterId, imagePath })
      wx.navigateTo({
        url: `/pages/result/result?imageUrl=${encodeURIComponent(result.resultUrl)}&quote=${encodeURIComponent(result.companionText)}&name=${encodeURIComponent(characterName)}`
      })
    } catch (error) {
      wx.showToast({ title: '溶图失败，请重试', icon: 'none' })
      console.error(error)
    } finally {
      this.setData({ blending: false })
    }
  }
})
