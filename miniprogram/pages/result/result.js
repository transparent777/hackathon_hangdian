Page({
  data: {
    imageUrl: '',
    quote: '',
    characterName: ''
  },

  onLoad(options) {
    this.setData({
      imageUrl: decodeURIComponent(options.imageUrl || ''),
      quote: decodeURIComponent(options.quote || ''),
      characterName: decodeURIComponent(options.name || '陪伴兽')
    })
  },

  saveImage() {
    const { imageUrl } = this.data
    wx.saveImageToPhotosAlbum({
      filePath: imageUrl,
      success: () => wx.showToast({ title: '已保存', icon: 'success' }),
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
