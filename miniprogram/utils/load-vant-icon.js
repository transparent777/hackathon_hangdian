const VANT_ICON_FAMILY = 'vant-icon'
const LOCAL_FONT = '/assets/fonts/vant-icon.woff2'
const CDN_FONT =
  'https://at.alicdn.com/t/c/font_2553510_kfwma2yq1rs.woff2?t=1694918397022'

function loadFrom(source) {
  return new Promise((resolve, reject) => {
    wx.loadFontFace({
      family: VANT_ICON_FAMILY,
      global: true,
      source: `url("${source}")`,
      success: resolve,
      fail: reject
    })
  })
}

/** 全局加载 Vant 图标字体（van-icon 依赖此字体，否则图标空白） */
function loadVantIconFont() {
  return loadFrom(LOCAL_FONT).catch(() => loadFrom(CDN_FONT)).catch((error) => {
    console.warn('[app] vant-icon font load failed (local + CDN)', error)
  })
}

module.exports = {
  loadVantIconFont
}
