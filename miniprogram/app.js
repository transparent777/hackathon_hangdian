App({
  globalData: {
    // B 联调后改成真实地址，例如 https://your-domain.com/api
    apiBaseUrl: 'http://localhost:3000/api',
    // true = 用 mock，false = 调真实接口（9/09 再改）
    useMock: true,
    todayCompanion: null
  }
})
