const { fetchBlend } = require('../../utils/api')
const { getCharacterById } = require('../../utils/characters')
const { addHistory } = require('../../utils/history')
const { ensureStableImagePath } = require('../../utils/image-path')
const { pickLoadingQuote } = require('../../utils/loading-quotes')

Page({
  data: {
    characterId: '',
    characterName: '',
    characterImage: '',
    rarity: '普通',
    imagePath: '',
    blending: false,
    loadingQuote: ''
  },

  onLoad(options) {
    const rarity = decodeURIComponent(options.rarity || '普通')
    const character = getCharacterById(options.characterId || 'naiwa', rarity)
    const imagePath = options.imagePath ? decodeURIComponent(options.imagePath) : ''
    const rawCharacterImage = options.image ? decodeURIComponent(options.image) : ''
    const characterImage =
      rawCharacterImage && rawCharacterImage !== 'undefined' ? rawCharacterImage : character.image

    this.setData({
      characterId: character.characterId,
      characterName: decodeURIComponent(options.name || '') || character.name,
      characterImage,
      rarity: character.rarity || rarity,
      imagePath,
      blending: false
    })

    if (imagePath) {
      this.validateImagePath(imagePath)
    }
  },

  async validateImagePath(imagePath) {
    const { fileExists } = require('../../utils/image-path')
    try {
      await fileExists(imagePath)
    } catch (error) {
      console.warn('stored image invalid', error)
      this.setData({ imagePath: '' })
      wx.showToast({ title: '原图已失效，请重新选图', icon: 'none' })
    }
  },

  onPreviewImageError() {
    console.warn('preview image load failed', this.data.imagePath)
    this.setData({ imagePath: '' })
    wx.showToast({ title: '图片无法预览，请重选', icon: 'none' })
  },

  chooseImage() {
    if (this._pickingImage) return
    this._pickingImage = true

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempPath = res.tempFiles[0]?.tempFilePath
        if (!tempPath) {
          wx.showToast({ title: '未获取到图片路径', icon: 'none' })
          return
        }
        // 先展示临时路径，避免 saveFile 阻塞导致白屏
        this.setData({ imagePath: tempPath })
        // 后台持久化：成功则静默换成稳定路径，供切页/再拍一张使用
        ensureStableImagePath(tempPath)
          .then((stablePath) => {
            if (stablePath && stablePath !== tempPath && this.data.imagePath === tempPath) {
              this.setData({ imagePath: stablePath })
            }
          })
          .catch((error) => {
            console.warn('background persist skipped', error)
          })
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

    this.setData({
      blending: true,
      loadingQuote: pickLoadingQuote(characterId)
    })
    try {
      let uploadPath = imagePath
      try {
        uploadPath = await ensureStableImagePath(imagePath)
        if (uploadPath !== imagePath) {
          this.setData({ imagePath: uploadPath })
        }
      } catch (pathError) {
        console.warn('use current image path for upload', pathError)
      }

      const result = await fetchBlend({ characterId, imagePath: uploadPath, rarity })
      const stableSourcePath = uploadPath
      let displayImageUrl = result.resultUrl

      try {
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
        displayImageUrl = historyItem.imageUrl
      } catch (historyError) {
        console.warn('save history failed, still show result', historyError)
      }

      const query = [
        `imageUrl=${encodeURIComponent(displayImageUrl)}`,
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
      const message = error?.message || '溶图失败，请重试'
      console.error('[onBlend]', error)
      wx.showModal({
        title: '溶图失败',
        content: message,
        showCancel: false
      })
    } finally {
      this.setData({ blending: false })
    }
  }
})
