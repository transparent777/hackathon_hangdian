const { fetchBlend } = require('../../utils/api')
const { getCharacterById } = require('../../utils/characters')
const { addHistory } = require('../../utils/history')
const { ensureStableImagePath, compressImage } = require('../../utils/image-path')
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

  onPreviewImageError(e) {
    const failedPath = this.data.imagePath
    console.warn('preview image load failed', failedPath, e?.detail)

    // 部分相册图（HEIC/超大图）需压缩为 JPEG 后才能预览，仅重试一次
    if (failedPath && this._previewCompressTried !== failedPath) {
      this._previewCompressTried = failedPath
      compressImage(failedPath)
        .then((compressedPath) => {
          if (compressedPath && compressedPath !== failedPath) {
            this.setData({ imagePath: compressedPath })
            return
          }
          this.clearPreviewWithError()
        })
        .catch(() => this.clearPreviewWithError())
      return
    }

    this.clearPreviewWithError()
  },

  clearPreviewWithError() {
    this.setData({ imagePath: '' })
    wx.showToast({ title: '图片无法预览，请换一张 JPG 或拍照', icon: 'none' })
  },

  chooseImage() {
    if (this._pickingImage) return
    this._pickingImage = true

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      // 优先压缩为 JPEG，减少相册 HEIC 在真机上无法预览的情况
      sizeType: ['compressed'],
      success: (res) => {
        const tempPath = res.tempFiles[0]?.tempFilePath
        if (!tempPath) {
          wx.showToast({ title: '未获取到图片路径', icon: 'none' })
          return
        }
        this._previewCompressTried = ''
        // 预览始终用 chooseMedia 返回的临时路径；持久化推迟到点击溶图时
        this.setData({ imagePath: tempPath })
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
      } catch (pathError) {
        console.warn('use current image path for upload', pathError)
      }

      const result = await fetchBlend({ characterId, imagePath: uploadPath, rarity })
      console.log('[blend]', result.blendProvider || 'unknown', result.diaryProvider || 'unknown')
      if (result.degraded) {
        console.warn('[blend] degraded', result.failedStage, result.fallbackReason)
        const candidateFallback = result.fallbackKind === 'ai-candidate'
        wx.showToast({
          title: candidateFallback ? '角色提取未完成，保留 AI 完整图' : 'AI 动作生成失败，当前为基础合成',
          icon: 'none',
          duration: 3000
        })
      }
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
        `sourceImagePath=${encodeURIComponent(stableSourcePath)}`,
        `degraded=${result.degraded ? '1' : '0'}`,
        `failedStage=${encodeURIComponent(result.failedStage || '')}`,
        `fallbackKind=${encodeURIComponent(result.fallbackKind || '')}`
      ].join('&')

      wx.navigateTo({
        url: `/pages/result/result?${query}`
      })
    } catch (error) {
      const stageNames = {
        candidate_generation: 'AI 候选图生成',
        foreground_segmentation: '角色提取',
        background_composite: '背景恢复'
      }
      const stageName = stageNames[error?.failedStage]
      const message = stageName
        ? `${stageName}失败，请重试\n${error?.message || ''}`
        : error?.message || '溶图失败，请重试'
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
