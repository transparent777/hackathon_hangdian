const { fetchBlend } = require('../../utils/api')
const { getCharacterById } = require('../../utils/characters')
const { addHistory } = require('../../utils/history')

Page({
  data: {
    characterId: '',
    characterName: '',
    characterImage: '',
    imagePath: '',
    blending: false
  },

  onLoad(options) {
    const character = getCharacterById(options.characterId || 'naiwa')
    this.setData({
      characterId: character.characterId,
      characterName: options.name || character.name,
      characterImage: decodeURIComponent(options.image || '') || character.image
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
    const { characterId, imagePath, characterName, characterImage } = this.data
    if (!imagePath) {
      wx.showToast({ title: '请先选一张图', icon: 'none' })
      return
    }

    this.setData({ blending: true })
    try {
      const result = await fetchBlend({ characterId, imagePath })
      await addHistory({
        characterId,
        characterName,
        characterImage,
        imageUrl: result.resultUrl,
        quote: result.companionText
      })

      wx.navigateTo({
        url: `/pages/result/result?imageUrl=${encodeURIComponent(result.resultUrl)}&quote=${encodeURIComponent(result.companionText)}&name=${encodeURIComponent(characterName)}&characterId=${characterId}&characterImage=${encodeURIComponent(characterImage)}`
      })
    } catch (error) {
      wx.showToast({ title: '溶图失败，请重试', icon: 'none' })
      console.error(error)
    } finally {
      this.setData({ blending: false })
    }
  }
})
