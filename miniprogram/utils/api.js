const { rollCharacter } = require('./characters')
const { mockBlend } = require('./mock')

function getAppConfig() {
  const app = getApp()
  return {
    apiBaseUrl: app.globalData.apiBaseUrl,
    useMock: app.globalData.useMock
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

// B 联调：uploadFile 溶图
function uploadBlend({ characterId, imagePath, openid, rarity }) {
  const { apiBaseUrl } = getAppConfig()

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${apiBaseUrl}/blend`,
      filePath: imagePath,
      name: 'image',
      formData: {
        characterId,
        openid: openid || '',
        rarity: rarity || '普通'
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
            resolve(data)
            return
          } catch (error) {
            reject(new Error('溶图返回解析失败'))
            return
          }
        }
        reject(new Error('溶图失败'))
      },
      fail: reject
    })
  })
}

async function fetchRoll() {
  const { useMock } = getAppConfig()
  if (useMock) {
    return Promise.resolve(rollCharacter())
  }
  const data = await request({ url: '/roll', method: 'POST', data: {} })
  return data
}

async function fetchBlend({ characterId, imagePath, openid, rarity }) {
  const { useMock } = getAppConfig()
  if (useMock) {
    return mockBlend({ characterId, imagePath, rarity })
  }
  return uploadBlend({ characterId, imagePath, openid, rarity })
}

module.exports = {
  request,
  fetchRoll,
  fetchBlend,
  uploadBlend
}
