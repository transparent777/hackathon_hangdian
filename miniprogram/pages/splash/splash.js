const { prepareSplashVideo } = require('../../utils/splash-video')

const FALLBACK_DURATION = 1800
const MAX_DURATION = 20000

Page({
  data: {
    videoSrc: '',
    objectFit: 'cover',
    leaving: false,
    useFallback: false,
    preparing: true,
    statusText: '加载开场动画...'
  },

  onLoad() {
    this._navigated = false
    this._timer = setTimeout(() => this.goHome(), MAX_DURATION)
    this.initVideo()
  },

  async initVideo() {
    try {
      const videoSrc = await prepareSplashVideo()
      this.setData({
        videoSrc,
        preparing: false,
        statusText: ''
      })
      this.playVideo()
    } catch (error) {
      console.error('prepare splash video failed', error)
      this.setData({
        useFallback: true,
        preparing: false,
        statusText: '动画加载失败，正在进入...'
      })
      this._fallbackTimer = setTimeout(() => this.goHome(), FALLBACK_DURATION)
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
  },

  playVideo() {
    if (!this.data.videoSrc || this.data.useFallback) return

    wx.nextTick(() => {
      this.videoCtx = wx.createVideoContext('splash-video', this)
      this.videoCtx.play()
    })
  },

  onVideoLoadedMeta(event) {
    const { width, height } = event.detail
    if (!width || !height) return

    const { windowWidth, windowHeight } = wx.getWindowInfo()
    const videoRatio = width / height
    const screenRatio = windowWidth / windowHeight

    // 9:16 视频在更长屏幕（如 9:19.5）上：
    // contain → 上下黑边；cover → 铺满高度，仅裁左右
    const objectFit = videoRatio >= screenRatio ? 'cover' : 'contain'

    this.setData({ objectFit })
    console.log('[splash] video', width, height, 'screen', windowWidth, windowHeight, 'fit', objectFit)
  },

  onVideoPlay() {
    this.setData({ statusText: '' })
  },

  onVideoWaiting() {
    this.setData({ statusText: '缓冲中...' })
  },

  onVideoEnd() {
    this.goHome()
  },

  onVideoError(event) {
    console.error('splash video error', event.detail)
    if (this.data.useFallback) return

    this.setData({
      useFallback: true,
      videoSrc: '',
      statusText: '动画播放失败，正在进入...'
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
      wx.redirectTo({ url: '/pages/index/index' })
    }, 320)
  }
})
