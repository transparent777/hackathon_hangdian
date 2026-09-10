const { getCharacterById } = require('../../utils/characters')
const { buildCameraPageUrl } = require('../../utils/camera-route')
const { saveImageToAlbum, handleSaveImageError } = require('../../utils/save-image')

Page({
  data: {
    imageUrl: '',
    quote: '',
    characterName: '',
    characterId: '',
    characterImage: ''
  },

  onLoad(options) {
    const character = getCharacterById(options.characterId || 'naiwa')
    this.setData({
      imageUrl: decodeURIComponent(options.imageUrl || ''),
      quote: decodeURIComponent(options.quote || ''),
      characterName: decodeURIComponent(options.name || character.name),
      characterId: options.characterId || character.characterId,
      characterImage: decodeURIComponent(options.characterImage || '') || character.image
    })
  },

  onShareAppMessage() {
    const { characterName, quote } = this.data
    return {
      title: `${characterName} 来陪你了：${quote}`,
      path: '/pages/index/index'
    }
  },

  async saveImage() {
    const { imageUrl } = this.data
    if (!imageUrl) return

    try {
      const stablePath = await saveImageToAlbum(imageUrl)
      if (stablePath !== imageUrl) {
        this.setData({ imageUrl: stablePath })
      }
      wx.showToast({ title: '已保存到相册', icon: 'success' })
    } catch (error) {
      console.error('save image failed', error)
      handleSaveImageError(error)
    }
  },

  retakePhoto() {
    if (this._retakeLock) return
    this._retakeLock = true

    const { characterId, characterName, characterImage } = this.data
    const url = buildCameraPageUrl({
      characterId,
      name: characterName,
      image: characterImage
    })

    wx.redirectTo({
      url,
      fail: (error) => {
        console.error('redirect to camera failed', error)
        wx.showToast({ title: '无法打开拍照页', icon: 'none' })
        this._retakeLock = false
      }
    })
  }
})
