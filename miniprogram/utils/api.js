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

// 今日 roll：9/08 先用 mock，9/09 接 B 的 /roll
async function fetchRoll() {
  const { useMock } = getAppConfig()
  if (useMock) {
    return Promise.resolve(rollCharacter())
  }
  const data = await request({ url: '/roll', method: 'POST', data: {} })
  return data
}

// 溶图：9/08 mock，9/09 接 B 的 /blend
async function fetchBlend({ characterId, imagePath }) {
  const { useMock } = getAppConfig()
  if (useMock) {
    return mockBlend({ characterId, imagePath })
  }

  // 真实接口：图片一般先 uploadFile 到后端，这里留给 9/09 和 B 对齐
  const data = await request({
    url: '/blend',
    method: 'POST',
    data: { characterId, imagePath }
  })
  return data
}

module.exports = {
  fetchRoll,
  fetchBlend
}
