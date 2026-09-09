const { prepareSplashVideo } = require('./utils/splash-video')
const { resetSplashOnAppShow, RESUME_THRESHOLD_MS } = require('./utils/splash-session')

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
    this.globalData._splashDismissed = false

    prepareSplashVideo().catch((error) => {
      console.warn('[app] preload splash video failed', error)
    })

    const { getTodayCompanion } = require('./utils/daily')
    const companion = getTodayCompanion()
    if (companion) {
      this.globalData.todayCompanion = companion
    }
  },

  onShow() {
    const lastHideAt = this._hiddenAt || 0
    const hiddenMs = lastHideAt > 0 ? Date.now() - lastHideAt : RESUME_THRESHOLD_MS
    resetSplashOnAppShow(hiddenMs)
  },

  onHide() {
    this._hiddenAt = Date.now()
  }
})
