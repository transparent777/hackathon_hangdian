const TAB_ROUTES = ['pages/index/index', 'pages/history/history', 'pages/me/me']

function setTabBarIndex(page, index) {
  if (!page || typeof page.getTabBar !== 'function') return

  let tabBar
  try {
    tabBar = page.getTabBar()
  } catch (error) {
    console.warn('getTabBar failed', error)
    return
  }
  if (!tabBar) return

  if (typeof tabBar.syncSelected === 'function') {
    tabBar.syncSelected()
    return
  }

  tabBar.setData({ selected: index })
}

function getTabIndexByRoute(route) {
  return TAB_ROUTES.indexOf(route)
}

module.exports = {
  setTabBarIndex,
  getTabIndexByRoute,
  TAB_ROUTES
}
