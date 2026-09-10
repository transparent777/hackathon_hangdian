const { fetchBlend } = require('../../utils/api')
const { getCharacterById } = require('../../utils/characters')
const { addHistory } = require('../../utils/history')
const { ensureStableImagePath } = require('../../utils/image-path')

Page({
  data: {
    characterId: '',
    characterName: '',
    characterImage: '',
    rarity: '普通',
    imagePath: '',
    blending: false
  },

  onLoad(options) {
    const rarity = decodeURIComponent(options.rarity || '普通')
    const character = getCharacterById(options.characterId || 'naiwa', rarity)
    const imagePath = options.imagePath ? decodeURIComponent(options.imagePath) : ''

    this.setData({
      characterId: character.characterId,
      characterName: decodeURIComponent(options.name || '') || character.name,
      characterImage: decodeURIComponent(options.image || '') || character.image,
      rarity: character.rarity || rarity,
      imagePath,
      blending: false
    })

    if (imagePath) {
      this.validateImagePath(imagePath)
    }
  },

  async validateImagePath(imagePath) {
    try {
      await ensureStableImagePath(imagePath)
    } catch (error) {
      console.warn('stored image invalid', error)
      this.setData({ imagePath: '' })
      wx.showToast({ title: '原图已失效，请重新选图', icon: 'none' })
    }
  },

  chooseImage() {
    if (this._pickingImage) return
    this._pickingImage = true

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        try {
          const stablePath = await ensureStableImagePath(res.tempFiles[0].tempFilePath)
          this.setData({ imagePath: stablePath })
        } catch (error) {
          console.error('persist picked image failed', error)
          wx.showToast({ title: '图片保存失败，请重选', icon: 'none' })
        }
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('cancel')) return
        wx.showToast({ title: '选图失败', icon: 'none' })
      },
      complete: () => {
        this._pickingImage = false
      }
    })
  },

  async onBlend() {
    const { characterId, imagePath, characterName, characterImage, rarity } = this.data
    if (!imagePath) {
      wx.showToast({ title: '请先选一张图', icon: 'none' })
      return
    }

    this.setData({ blending: true })
    try {
      const stableSourcePath = await ensureStableImagePath(imagePath)
      if (stableSourcePath !== imagePath) {
        this.setData({ imagePath: stableSourcePath })
      }

      const result = await fetchBlend({ characterId, imagePath: stableSourcePath, rarity })
      const historyItem = await addHistory({
        characterId,
        characterName,
        characterImage,
        rarity,
        imageUrl: result.resultUrl,
        sourceImagePath: stableSourcePath,
        quote: result.companionText,
        diaryNote: result.diaryNote || '',
        fontStyle: result.fontStyle || characterId
      })

      const query = [
        `imageUrl=${encodeURIComponent(historyItem.imageUrl)}`,
        `quote=${encodeURIComponent(result.companionText)}`,
        `name=${encodeURIComponent(characterName)}`,
        `characterId=${characterId}`,
        `characterImage=${encodeURIComponent(characterImage)}`,
        `sourceImagePath=${encodeURIComponent(stableSourcePath)}`
      ].join('&')

      wx.navigateTo({
        url: `/pages/result/result?${query}`
      })
    } catch (error) {
      wx.showToast({ title: '溶图失败，请重试', icon: 'none' })
      console.error(error)
    } finally {
      this.setData({ blending: false })
    }
  }
})
