Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/index/index', text: '首页', icon: 'wap-home-o' },
      { pagePath: '/pages/history/history', text: '历史', icon: 'photo-o' },
      { pagePath: '/pages/me/me', text: '我的', icon: 'smile-o' }
    ]
  },

  methods: {
    onSwitch(e) {
      const { path, index } = e.currentTarget.dataset
      wx.switchTab({ url: path })
      this.setData({ selected: index })
    }
  }
})
