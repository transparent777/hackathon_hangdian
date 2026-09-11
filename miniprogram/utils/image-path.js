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

function accessFile(path) {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().access({
      path,
      success: resolve,
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

  if (/^https?:\/\//i.test(filePath)) {
    return downloadRemoteImage(filePath)
  }

  if (!isTempImagePath(filePath)) {
    await accessFile(filePath)
    return filePath
  }

  const savedPath = await persistImagePath(filePath)
  await accessFile(savedPath)
  return savedPath
}

module.exports = {
  isTempImagePath,
  persistImagePath,
  ensureStableImagePath,
  accessFile
}
