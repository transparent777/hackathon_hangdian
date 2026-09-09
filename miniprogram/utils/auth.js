// B 联调后：把 code 发给后端换 openid
function login() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (res) => {
        if (res.code) {
          resolve({ code: res.code })
          return
        }
        reject(new Error('wx.login 未返回 code'))
      },
      fail: reject
    })
  })
}

async function getOpenId() {
  // TODO: B 提供 POST /auth 后在这里请求
  const { code } = await login()
  return { code, openid: null }
}

module.exports = {
  login,
  getOpenId
}
