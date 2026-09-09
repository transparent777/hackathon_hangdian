function setTabBarIndex(index) {
  if (typeof getTabBar === 'function' && getTabBar()) {
    getTabBar().setData({ selected: index })
  }
}

module.exports = {
  setTabBarIndex
}
