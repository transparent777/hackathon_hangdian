const { prepareSplashVideo } = require('./utils/splash-video')
const { loadVantIconFont } = require('./utils/load-vant-icon')

App({
  globalData: {
    // B 联调后改成真实地址，例如 https://your-domain.com/api
    // 开发者工具请用 127.0.0.1（localhost 常连不上）；真机改局域网 IP
    apiBaseUrl: 'http://127.0.0.1:3000/api',
    // false = 走本地/线上后端真溶图
    useMock: false,
    todayCompanion: null,
    _splashDismissed: false
  },

  onLaunch() {
    // 仅冷启动重置：本次打开小程序只播一次开场动画
    this.globalData._splashDismissed = false

    loadVantIconFont()

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
