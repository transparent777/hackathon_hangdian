const TAB_LIST = [
  { pagePath: 'pages/index/index', text: '首页', icon: 'wap-home-o' },
  { pagePath: 'pages/history/history', text: '历史', icon: 'photo-o' },
  { pagePath: 'pages/me/me', text: '我的', icon: 'smile-o' }
]

Component({
  data: {
    selected: 0,
    list: TAB_LIST,
    hidden: false
  },

  lifetimes: {
    attached() {
      this.syncSelected()
    }
  },

  pageLifetimes: {
    show() {
      this.syncSelected()
    }
  },

  methods: {
    syncSelected() {
      const pages = getCurrentPages()
      if (!pages.length) return

      const route = pages[pages.length - 1].route
      const selected = TAB_LIST.findIndex((item) => item.pagePath === route)

      if (selected !== -1 && selected !== this.data.selected) {
        this.setData({ selected })
      }
    },

    onSwitch(e) {
      const tabIndex = Number(e.currentTarget.dataset.index)
      const item = TAB_LIST[tabIndex]
      if (!item || tabIndex === this.data.selected) return

      wx.switchTab({
        url: `/${item.pagePath}`,
        fail: (err) => console.error('switchTab failed', err)
      })
    }
  }
})
