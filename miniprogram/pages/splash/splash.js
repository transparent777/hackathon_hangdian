const SPLASH_DURATION = 2800

Page({
  data: {
    started: false,
    leaving: false
  },

  onLoad() {
    this.setData({ started: true })
    this._timer = setTimeout(() => this.goHome(), SPLASH_DURATION)
  },

  onUnload() {
    if (this._timer) clearTimeout(this._timer)
  },

  goHome() {
    this.setData({ leaving: true })
    setTimeout(() => {
      wx.redirectTo({ url: '/pages/index/index' })
    }, 420)
  },

  onTapSkip() {
    if (this._timer) clearTimeout(this._timer)
    this.goHome()
  }
})
