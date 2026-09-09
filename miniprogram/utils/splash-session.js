const RESUME_THRESHOLD_MS = 2000

function shouldShowSplash() {
  const app = getApp()
  return !app.globalData._splashDismissed
}

function dismissSplash() {
  getApp().globalData._splashDismissed = true
}

function resetSplashOnAppShow(hiddenMs) {
  const app = getApp()
  if (hiddenMs >= RESUME_THRESHOLD_MS) {
    app.globalData._splashDismissed = false
  }
}

module.exports = {
  shouldShowSplash,
  dismissSplash,
  resetSplashOnAppShow,
  RESUME_THRESHOLD_MS
}
