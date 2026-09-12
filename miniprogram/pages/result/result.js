const { getCharacterById } = require('../../utils/characters')
const { buildCameraPageUrl } = require('../../utils/camera-route')
const { saveImageToAlbum, handleSaveImageError } = require('../../utils/save-image')

Page({
  data: {
    imageUrl: '',
    quote: '',
    characterName: '',
    characterId: '',
    characterImage: '',
    sourceImagePath: '',
    degraded: false,
    failedStage: '',
    fallbackKind: '',
    degradedLabel: '',
    degradedNotice: '',
    isHistoryView: false
  },

  onLoad(options) {
    const character = getCharacterById(options.characterId || 'naiwa')
    const fallbackKind = decodeURIComponent(options.fallbackKind || '')
    const candidateFallback = fallbackKind === 'ai-candidate'
    this.setData({
      imageUrl: decodeURIComponent(options.imageUrl || ''),
      quote: decodeURIComponent(options.quote || ''),
      characterName: decodeURIComponent(options.name || character.name),
      characterId: options.characterId || character.characterId,
      characterImage: decodeURIComponent(options.characterImage || '') || character.image,
      sourceImagePath: decodeURIComponent(options.sourceImagePath || ''),
      degraded: options.degraded === '1',
      failedStage: decodeURIComponent(options.failedStage || ''),
      fallbackKind,
      degradedLabel: candidateFallback ? 'AI 完整图' : '基础合成',
      degradedNotice: candidateFallback
        ? '角色提取未完成，本图保留 AI 候选图，背景可能有轻微变化'
        : 'AI 动作生成未完成，本图使用预设角色素材',
      isHistoryView: options.from === 'history'
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

    const { characterId, characterName, characterImage, sourceImagePath } = this.data
    const url = buildCameraPageUrl({
      characterId,
      name: characterName,
      image: characterImage,
      imagePath: sourceImagePath
    })

    wx.redirectTo({
      url,
      fail: (error) => {
        console.error('redirect to camera failed', error)
        wx.showToast({ title: '无法打开拍照页', icon: 'none' })
        this._retakeLock = false
      }
    })
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
