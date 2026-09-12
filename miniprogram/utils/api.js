const { rollCharacter } = require('./characters')

function getAppConfig() {
  const app = getApp()
  return {
    apiBaseUrl: app.globalData.apiBaseUrl,
    useMock: app.globalData.useMock
  }
}

function assertBlendResult(data) {
  if (!data?.resultUrl) {
    throw new Error('溶图返回缺少结果图')
  }
  if (data.blended === false) {
    throw new Error('溶图失败，未生成合成图')
  }
}

function request({ url, method = 'GET', data = {} }) {
  const { apiBaseUrl, useMock } = getAppConfig()

  if (useMock) {
    return Promise.reject(new Error('mock mode'))
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${apiBaseUrl}${url}`,
      method,
      data,
      header: {
        'content-type': 'application/json'
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
          return
        }
        reject(new Error(res.data?.message || '请求失败'))
      },
      fail: reject
    })
  })
}

function checkApiHealth() {
  const { apiBaseUrl, useMock } = getAppConfig()
  if (useMock) {
    return Promise.resolve({ ok: true, mock: true })
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${apiBaseUrl}/health`,
      method: 'GET',
      timeout: 5000,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300 && res.data?.ok) {
          resolve(res.data)
          return
        }
        reject(new Error(`后端异常 HTTP ${res.statusCode}`))
      },
      fail: () => {
        reject(new Error(`连不上后端 ${apiBaseUrl}，请先 cd server && npm start`))
      }
    })
  })
}

function assertUploadableFile(imagePath) {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().getFileInfo({
      filePath: imagePath,
      success: () => resolve(imagePath),
      fail: () => reject(new Error('图片路径无效，请重新选图'))
    })
  })
}

function uploadBlend({ characterId, imagePath, openid, rarity }) {
  const { apiBaseUrl } = getAppConfig()
  const uploadUrl = `${apiBaseUrl}/blend`

  return assertUploadableFile(imagePath).then(
    () =>
      new Promise((resolve, reject) => {
        console.log('[uploadBlend] start', uploadUrl, imagePath)
        wx.uploadFile({
          url: uploadUrl,
          filePath: imagePath,
          name: 'image',
          timeout: 180000,
          formData: {
            characterId,
            openid: openid || '',
            rarity: rarity || '普通'
          },
          success: (res) => {
            let data
            try {
              data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
            } catch (error) {
              reject(new Error('溶图返回解析失败'))
              return
            }

            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                assertBlendResult(data)
                resolve(data)
              } catch (error) {
                reject(error)
              }
              return
            }

            const requestError = new Error(data?.message || '溶图失败')
            requestError.failedStage = data?.failedStage || ''
            reject(requestError)
          },
          fail: (error) => {
            const hint = String(error?.errMsg || error?.message || '')
            console.error('[uploadBlend] fail', uploadUrl, hint)
            if (hint.includes('timeout')) {
              reject(new Error('溶图超时，请稍后重试'))
              return
            }
            reject(new Error(`上传失败：${hint || '请确认 server 已启动'}`))
          }
        })
      })
  )
}

// 抽取陪伴兽：纯本地随机，不依赖后端
function fetchRoll() {
  return Promise.resolve(rollCharacter())
}

async function fetchBlend({ characterId, imagePath, openid, rarity }) {
  const { useMock } = getAppConfig()
  if (useMock) {
    throw new Error('溶图需要后端，请启动 server 并将 useMock 设为 false')
  }
  await checkApiHealth()
  return uploadBlend({ characterId, imagePath, openid, rarity })
}

module.exports = {
  request,
  fetchRoll,
  fetchBlend,
  uploadBlend,
  checkApiHealth
}
