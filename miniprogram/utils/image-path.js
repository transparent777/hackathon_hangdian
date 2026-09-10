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

async function ensureStableImagePath(filePath) {
  if (!filePath) {
    throw new Error('image path is empty')
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
