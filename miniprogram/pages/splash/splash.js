const {
  prepareSplashVideo,
  invalidateSplashVideoCache
} = require('../../utils/splash-video')

const FALLBACK_DURATION = 1800
const MAX_DURATION = 20000
const AUTOPLAY_WAIT_MS = 2000

Page({
  data: {
    videoSrc: '',
    objectFit: 'cover',
    leaving: false,
    useFallback: false,
    preparing: true,
    needTapPlay: false,
    statusText: '加载开场动画...'
  },

  onLoad() {
    this._navigated = false
    this._retryCount = 0
    this._played = false
    this._timer = setTimeout(() => this.goHome(), MAX_DURATION)
    this.initVideo()
  },

  async initVideo() {
    this.clearAutoplayTimer()

    try {
      const force = this._retryCount > 0
      const videoSrc = await prepareSplashVideo({ force })
      this.setData({
        videoSrc,
        preparing: false,
        needTapPlay: false,
        statusText: ''
      })
      this.scheduleAutoplayCheck()
      this.playVideo()
    } catch (error) {
      console.error('prepare splash video failed', error)
      this.enterFallback('动画加载失败，正在进入...')
    }
  },

  onReady() {
    if (this.data.videoSrc) {
      this.playVideo()
    }
  },

  onUnload() {
    this.clearTimers()
  },

  clearTimers() {
    if (this._timer) {
      clearTimeout(this._timer)
      this._timer = null
    }
    if (this._fallbackTimer) {
      clearTimeout(this._fallbackTimer)
      this._fallbackTimer = null
    }
    this.clearAutoplayTimer()
  },

  clearAutoplayTimer() {
    if (this._autoplayTimer) {
      clearTimeout(this._autoplayTimer)
      this._autoplayTimer = null
    }
  },

  scheduleAutoplayCheck() {
    this.clearAutoplayTimer()
    this._autoplayTimer = setTimeout(() => {
      if (this._played || this.data.useFallback || this._navigated) return
      this.setData({
        needTapPlay: true,
        statusText: '点击屏幕播放开场动画'
      })
    }, AUTOPLAY_WAIT_MS)
  },

  playVideo() {
    if (!this.data.videoSrc || this.data.useFallback) return

    wx.nextTick(() => {
      this.videoCtx = wx.createVideoContext('splash-video', this)
      this.videoCtx.play()
    })
  },

  onTapPlay() {
    this.setData({ needTapPlay: false, statusText: '' })
    this.playVideo()
  },

  onVideoLoadedMeta(event) {
    const { width, height } = event.detail
    if (!width || !height) return

    const { windowWidth, windowHeight } = wx.getWindowInfo()
    const videoRatio = width / height
    const screenRatio = windowWidth / windowHeight
    const objectFit = videoRatio >= screenRatio ? 'cover' : 'contain'

    this.setData({ objectFit })
    console.log('[splash] video', width, height, 'screen', windowWidth, windowHeight, 'fit', objectFit)
  },

  onVideoPlay() {
    this._played = true
    this.clearAutoplayTimer()
    this.setData({ needTapPlay: false, statusText: '' })
  },

  onVideoWaiting() {
    this.setData({ statusText: '缓冲中...' })
  },

  onVideoEnd() {
    this.goHome()
  },

  async onVideoError(event) {
    console.error('splash video error', event.detail)
    if (this.data.useFallback) return

    if (this._retryCount < 1) {
      this._retryCount += 1
      await invalidateSplashVideoCache()
      this.setData({
        videoSrc: '',
        preparing: true,
        needTapPlay: false,
        statusText: '重新加载动画...'
      })
      this.initVideo()
      return
    }

    this.enterFallback('动画播放失败，正在进入...')
  },

  enterFallback(statusText) {
    this.setData({
      useFallback: true,
      preparing: false,
      needTapPlay: false,
      videoSrc: '',
      statusText
    })
    this._fallbackTimer = setTimeout(() => this.goHome(), FALLBACK_DURATION)
  },

  onTapSkip() {
    if (this.videoCtx) {
      this.videoCtx.stop()
    }
    this.goHome()
  },

  goHome() {
    if (this._navigated) return
    this._navigated = true
    this.clearTimers()

    this.setData({ leaving: true })
    setTimeout(() => {
      wx.switchTab({ url: '/pages/index/index' })
    }, 320)
  }
})
