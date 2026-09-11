const { setTabBarIndex } = require('../../utils/tabbar')

Page({
  data: {
    useMock: true,
    featureItems: [
      {
        title: '陪伴日记',
        desc: '溶图后以手账形式回看 AI 批注',
        icon: 'notes-o',
        status: '已上线',
        page: '/pages/diary/diary'
      },
      {
        title: '趣味 Loading',
        desc: '溶图等待时，陪伴兽会像聊天一样发来一句名言',
        icon: 'comment-o',
        status: '已上线'
      }
    ],
    guides: [
      {
        title: '1. 抽取陪伴兽',
        desc: '首页左侧点击抽取，每天随机获得奶蛙 / doro / 耄耋之一。'
      },
      {
        title: '2. 进入溶图',
        desc: '抽取成功后拍照或选图；等待时陪伴兽会发名言陪你（趣味 Loading）。'
      },
      {
        title: '3. 历史回看',
        desc: '「历史」Tab 查看溶图记录；「陪伴日记」可回看 AI 批注。'
      }
    ]
  },

  onShow() {
    setTabBarIndex(this, 2)
    this.setData({ useMock: getApp().globalData.useMock })
  },

  onFeatureTap(e) {
    const { page } = e.currentTarget.dataset
    if (!page) return
    wx.navigateTo({ url: page })
  }
})
