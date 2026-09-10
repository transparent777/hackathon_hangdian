// 方案 A：每次冷启动（onLaunch）只播一次；回首页 / 切 Tab / 切后台回来均不重播

function shouldShowSplash() {
  const app = getApp()
  return !app.globalData._splashDismissed
}

function dismissSplash() {
  getApp().globalData._splashDismissed = true
}

module.exports = {
  shouldShowSplash,
  dismissSplash
}
