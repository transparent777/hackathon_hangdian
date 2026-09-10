// 换视频时递增版本号，避免真机仍播旧缓存
const SPLASH_VIDEO_VERSION = '2.6'
const DEST_PATH = `${wx.env.USER_DATA_PATH}/splash-intro-${SPLASH_VIDEO_VERSION}.mp4`

const PACKAGE_SOURCES = [
  '/assets/splash/intro.mp4',
  'assets/splash/intro.mp4'
]

let preparePromise = null

function accessFile(fs, path) {
  return new Promise((resolve, reject) => {
    fs.access({ path, success: resolve, fail: reject })
  })
}

function unlinkFile(fs, path) {
  return new Promise((resolve) => {
    fs.unlink({ filePath: path, success: resolve, fail: resolve })
  })
}

function copyPackageFile(fs, srcPath) {
  return new Promise((resolve, reject) => {
    fs.copyFile({
      srcPath,
      destPath: DEST_PATH,
      success: () => resolve(DEST_PATH),
      fail: reject
    })
  })
}

function readPackageFile(fs, srcPath) {
  return new Promise((resolve, reject) => {
    fs.readFile({
      filePath: srcPath,
      success: (res) => resolve(res.data),
      fail: reject
    })
  })
}

function writeBuffer(fs, data) {
  return new Promise((resolve, reject) => {
    fs.writeFile({
      filePath: DEST_PATH,
      data,
      success: () => resolve(DEST_PATH),
      fail: reject
    })
  })
}

async function materializeFromSource(fs, srcPath) {
  try {
    return await copyPackageFile(fs, srcPath)
  } catch (copyError) {
    console.warn('[splash] copyFile failed, fallback readFile', srcPath, copyError)
    const data = await readPackageFile(fs, srcPath)
    return writeBuffer(fs, data)
  }
}

async function materializeVideo(fs) {
  let lastError = null

  for (const srcPath of PACKAGE_SOURCES) {
    try {
      return await materializeFromSource(fs, srcPath)
    } catch (error) {
      lastError = error
      console.warn('[splash] source unavailable', srcPath, error)
    }
  }

  throw lastError || new Error('splash video materialize failed')
}

function prepareSplashVideo(options = {}) {
  const force = Boolean(options.force)

  if (!force && preparePromise) {
    return preparePromise
  }

  const fs = wx.getFileSystemManager()

  preparePromise = (async () => {
    if (force) {
      await unlinkFile(fs, DEST_PATH)
    } else {
      try {
        await accessFile(fs, DEST_PATH)
        return DEST_PATH
      } catch (_) {
        // cache miss
      }
    }

    const localPath = await materializeVideo(fs)
    console.log('[splash] video ready at', localPath)
    return localPath
  })()

  preparePromise.catch(() => {
    preparePromise = null
  })

  return preparePromise
}

function invalidateSplashVideoCache() {
  preparePromise = null
  const fs = wx.getFileSystemManager()
  return unlinkFile(fs, DEST_PATH)
}

module.exports = {
  prepareSplashVideo,
  invalidateSplashVideoCache,
  DEST_PATH,
  SPLASH_VIDEO_VERSION
}
