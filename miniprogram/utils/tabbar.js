const TAB_ROUTES = ['pages/index/index', 'pages/history/history', 'pages/me/me']

function setTabBarIndex(page, index) {
  if (!page || typeof page.getTabBar !== 'function') return

  const tabBar = page.getTabBar()
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
