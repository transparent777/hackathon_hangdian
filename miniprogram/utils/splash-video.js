// 换视频时递增版本号，避免真机仍播旧缓存
const SPLASH_VIDEO_VERSION = '2.2'
const DEST_PATH = `${wx.env.USER_DATA_PATH}/splash-intro-${SPLASH_VIDEO_VERSION}.mp4`

const PACKAGE_SOURCES = ['/assets/splash/intro.mp4']

function prepareSplashVideo() {
  const fs = wx.getFileSystemManager()

  return new Promise((resolve, reject) => {
    fs.access({
      path: DEST_PATH,
      success: () => resolve(DEST_PATH),
      fail: () => copyFromPackage(fs, 0, resolve, reject)
    })
  })
}

function copyFromPackage(fs, index, resolve, reject) {
  if (index >= PACKAGE_SOURCES.length) {
    // 模拟器上 copy 可能失败，最后再试代码包直链
    resolve(PACKAGE_SOURCES[0])
    return
  }

  fs.copyFile({
    srcPath: PACKAGE_SOURCES[index],
    destPath: DEST_PATH,
    success: () => resolve(DEST_PATH),
    fail: () => copyFromPackage(fs, index + 1, resolve, reject)
  })
}

module.exports = {
  prepareSplashVideo,
  DEST_PATH
}
