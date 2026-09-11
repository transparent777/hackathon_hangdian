function isRemoteUrl(filePath) {
  return /^https?:\/\//i.test(String(filePath || ''))
}

function isTempImagePath(filePath) {
  if (!filePath) return false
  if (filePath.startsWith('http://tmp') || filePath.startsWith('https://tmp')) return true
  if (/wxfile:\/\/tmp/i.test(filePath)) return true
  if (filePath.includes('/tmp/') || filePath.includes('tmp_')) return true
  return false
}

function persistImagePath(tempPath) {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().saveFile({
      tempFilePath: tempPath,
      success: (res) => resolve(res.savedFilePath),
      fail: reject
    })
  })
}

function fileExists(filePath) {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().getFileInfo({
      filePath,
      success: () => resolve(true),
      fail: reject
    })
  })
}

function normalizeLocalApiUrl(url) {
  return String(url || '').replace('http://localhost:', 'http://127.0.0.1:')
}

function downloadRemoteImage(url) {
  const targetUrl = normalizeLocalApiUrl(url)
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url: targetUrl,
      success: (res) => {
        if (res.statusCode !== 200) {
          reject(new Error('download image failed'))
          return
        }
        persistImagePath(res.tempFilePath).then(resolve).catch(reject)
      },
      fail: reject
    })
  })
}

async function ensureStableImagePath(filePath) {
  if (!filePath) {
    throw new Error('image path is empty')
  }

  if (isRemoteUrl(filePath)) {
    return downloadRemoteImage(filePath)
  }

  if (isTempImagePath(filePath)) {
    try {
      const savedPath = await persistImagePath(filePath)
      await fileExists(savedPath)
      return savedPath
    } catch (error) {
      // 部分环境下 saveFile 失败，临时路径仍可用于本次预览/上传
      await fileExists(filePath)
      return filePath
    }
  }

  await fileExists(filePath)
  return filePath
}

module.exports = {
  isRemoteUrl,
  isTempImagePath,
  persistImagePath,
  ensureStableImagePath,
  fileExists
}
