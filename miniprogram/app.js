App({
  globalData: {
    // B 联调后改成真实地址，例如 https://your-domain.com/api
    apiBaseUrl: 'http://localhost:3000/api',
    // true = mock 全流程；B 就绪后改 false 并配置合法域名
    useMock: true,
    todayCompanion: null
  },

  onLaunch() {
    const { getTodayCompanion } = require('./utils/daily')
    const companion = getTodayCompanion()
    if (companion) {
      this.globalData.todayCompanion = companion
    }
  }
})
