const { getCharacterById } = require('../../utils/characters')

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

  saveImage() {
    const { imageUrl } = this.data
    if (!imageUrl) return

    wx.saveImageToPhotosAlbum({
      filePath: imageUrl,
      success: () => wx.showToast({ title: '已保存原图', icon: 'success' }),
      fail: () => {
        wx.showModal({
          title: '需要相册权限',
          content: '请在设置中允许保存到相册',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) wx.openSetting()
          }
        })
      }
    })
  },

  goHome() {
    wx.navigateBack({ delta: 2 })
  }
})
