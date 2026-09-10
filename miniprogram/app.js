const { prepareSplashVideo } = require('./utils/splash-video')

App({
  globalData: {
    // B 联调后改成真实地址，例如 https://your-domain.com/api
    apiBaseUrl: 'http://localhost:3000/api',
    // true = mock 全流程；B 就绪后改 false 并配置合法域名
    useMock: true,
    todayCompanion: null,
    _splashDismissed: false
  },

  onLaunch() {
    // 仅冷启动重置：本次打开小程序只播一次开场动画
    this.globalData._splashDismissed = false

    prepareSplashVideo().catch((error) => {
      console.warn('[app] preload splash video failed', error)
    })

    const { getTodayCompanion } = require('./utils/daily')
    const companion = getTodayCompanion()
    if (companion) {
      this.globalData.todayCompanion = companion
    }
  }
})
