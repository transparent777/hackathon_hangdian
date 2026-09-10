const { setTabBarIndex } = require('../../utils/tabbar')

Page({
  data: {
    useMock: true,
    guides: [
      { title: '1. 抽取陪伴兽', desc: '首页左侧点击抽取，每天随机获得奶蛙 / doro / 耄耋之一。' },
      { title: '2. 进入溶图', desc: '抽取成功后，点击「进入溶图」拍照或选图，生成陪伴瞬间。' },
      { title: '3. 历史回看', desc: '「历史」Tab 可查看最近溶图，点击卡片再次打开。' },
      { title: '4. 陪伴日记', desc: '「我的」→ 陪伴日记，以手账形式回看 AI 批注。' }
    ],
    bonusItems: [
      { title: '稀有度动画', icon: 'gem-o', status: '待接入' },
      { title: '陪伴日记', icon: 'notes-o', status: '已上线', page: '/pages/diary/diary' },
      { title: '趣味 Loading', icon: 'comment-o', status: '待接入' },
      { title: '分享海报', icon: 'share-o', status: '待接入' }
    ]
  },

  onShow() {
    setTabBarIndex(this, 2)
    this.setData({ useMock: getApp().globalData.useMock })
  },

  onBonusTap(e) {
    const { page } = e.currentTarget.dataset
    if (!page) return
    wx.navigateTo({ url: page })
  }
})
