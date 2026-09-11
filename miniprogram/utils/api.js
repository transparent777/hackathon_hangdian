const { rollCharacter, getCharacterById } = require('./characters')
const { mockBlend } = require('./mock')

function enrichRollResult(data) {
  const base = getCharacterById(data.characterId, data.rarity || '普通')
  return {
    ...base,
    quote: data.quote || base.quote
  }
}

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
      timeout: 180000,
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
        let message = '溶图失败'
        try {
          const errData = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
          message = errData?.message || message
        } catch (error) {
          // ignore parse error
        }
        reject(new Error(message))
      },
      fail: (error) => {
        const hint = String(error?.errMsg || error?.message || '')
        console.error('[uploadBlend] fail', apiBaseUrl, hint)
        if (hint.includes('timeout')) {
          reject(new Error('溶图超时，请稍后重试'))
          return
        }
        reject(new Error('无法连接后端，请确认 server 已启动'))
      }
    })
  })
}

async function fetchRoll() {
  const { useMock } = getAppConfig()
  if (useMock) {
    return Promise.resolve(rollCharacter())
  }
  const data = await request({ url: '/roll', method: 'POST', data: {} })
  return enrichRollResult(data)
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
