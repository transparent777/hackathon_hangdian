const { isTempImagePath, persistImagePath } = require('./image-path')

function ensureAlbumAuth() {
  return new Promise((resolve, reject) => {
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.writePhotosAlbum']) {
          resolve()
          return
        }

        wx.authorize({
          scope: 'scope.writePhotosAlbum',
          success: () => resolve(),
          fail: reject
        })
      },
      fail: reject
    })
  })
}

async function ensureStablePath(filePath) {
  if (!isTempImagePath(filePath)) return filePath
  return persistImagePath(filePath)
}

function saveToPhotosAlbum(filePath) {
  return new Promise((resolve, reject) => {
    wx.saveImageToPhotosAlbum({
      filePath,
      success: resolve,
      fail: reject
    })
  })
}

async function saveImageToAlbum(filePath) {
  const stablePath = await ensureStablePath(filePath)
  await ensureAlbumAuth()
  await saveToPhotosAlbum(stablePath)
  return stablePath
}

function handleSaveImageError(error) {
  const message = error?.errMsg || ''

  if (message.includes('auth deny') || message.includes('authorize') || message.includes('permission')) {
    wx.showModal({
      title: '需要相册权限',
      content: '请在设置中允许「保存到相册」',
      confirmText: '去设置',
      success: (res) => {
        if (res.confirm) wx.openSetting()
      }
    })
    return
  }

  if (message.includes('fail cancel')) return

  if (message.includes('file not exist') || message.includes('invalid') || message.includes('no such file')) {
    wx.showToast({ title: '图片已失效，请重新溶图', icon: 'none' })
    return
  }

  wx.showToast({ title: '保存失败，请重试', icon: 'none' })
}

module.exports = {
  saveImageToAlbum,
  handleSaveImageError
}
