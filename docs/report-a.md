# 技术报告 A：小程序前端（Role A）

> 赛博陪伴相机 · 杭电 Hackathon  
> 负责人：A（小程序前端）  
> 报告日期：2026-09-12

---

## 1. 职责与交付对照

| 计划交付物 | 实际状态 |
|-----------|---------|
| 页面开发、UI 实现 | ✅ 已完成 |
| 拍照 / 相册选图 | ✅ 已完成 |
| Roll 抽取 | ✅ 功能完成，动画为简化版 |
| 结果展示、保存、分享 | ✅ 已完成 |
| 历史记录（最近 10 条） | ✅ 已完成 |
| 可运行小程序 + 联调通过 | ✅ 默认对接 `127.0.0.1:3000/api` |
| 加分项：陪伴日记时间线 UI | ✅ 已完成 |
| 加分项：Roll 稀有度动画 | ❌ 未实现 |

---

## 2. 技术选型

- **框架**：微信原生小程序（`libVersion 3.5.5`）
- **UI 组件库**：Vant Weapp `@vant/weapp ^1.11.6`
- **设计风格**：JuJuly 手绘风，主色 `#6C5CE7`，奶油底 `#FFF9F0`，无 Figma 设计稿
- **数据存储**：`wx.storage` 本地持久化（历史、今日陪伴兽）
- **后端通信**：`wx.request` + `wx.uploadFile`

---

## 3. 页面架构

共 **6 个注册页面**，3 个 Tab + 3 个流程页：

| 页面 | 路由类型 | 功能 |
|------|---------|------|
| `pages/index/index` | Tab 首页 | 开场动画、Banner、Roll 抽取、进入溶图 |
| `pages/history/history` | Tab 历史 | 2 列网格展示最近 10 条溶图 |
| `pages/me/me` | Tab 我的 | 功能入口、玩法说明、Mock 状态 |
| `pages/camera/camera` | navigateTo | 拍照/选图、预览贴纸、上传溶图 |
| `pages/result/result` | navigateTo | 拍立得结果展示、保存/分享 |
| `pages/diary/diary` | navigateTo | 手账式陪伴日记时间线 |

`app.json` 中注册了自定义 TabBar 与全局 Vant 组件：

```json
{
  "entryPagePath": "pages/index/index",
  "pages": [
    "pages/index/index",
    "pages/history/history",
    "pages/me/me",
    "pages/camera/camera",
    "pages/result/result",
    "pages/diary/diary"
  ],
  "tabBar": { "custom": true },
  "usingComponents": {
    "van-button": "@vant/weapp/button/index",
    "van-loading": "@vant/weapp/loading/index",
    "van-toast": "@vant/weapp/toast/index",
    "van-tag": "@vant/weapp/tag/index",
    "van-overlay": "@vant/weapp/overlay/index",
    "van-icon": "@vant/weapp/icon/index"
  }
}
```

---

## 4. 核心用户流程

```
冷启动 → splash-overlay 开场视频
    ↓
首页 Roll 抽取陪伴兽（本地随机 + 稀有度概率）
    ↓
进入 camera 页 → wx.chooseMedia 拍照/选图
    ↓
预览区叠加角色 sticker → 点击溶图
    ↓
wx.uploadFile POST /api/blend（超时 180s）
    ↓
result 页拍立得展示 → 保存相册 / 分享 / 再拍一张
    ↓
history Tab 回看 / me → diary 陪伴日记
```

---

## 5. 关键模块实现

### 5.1 Roll 抽取（`utils/characters.js` + `utils/daily.js`）

- **纯前端实现**，不依赖后端 `/roll`
- 三角色等概率随机 + 稀有度概率：普通 70% / 稀有 22% / 传说 8%
- 结果写入 `globalData.todayCompanion` 与 `today_companion` Storage
- UI 反馈：`van-loading` 旋转 + 按压 `scale(0.98)`，**无老虎机/转盘动画**

### 5.2 拍照与溶图（`pages/camera/` + `utils/api.js`）

- 选图：`wx.chooseMedia({ sourceType: ['album','camera'], count: 1 })`
- 路径持久化：`ensureStableImagePath()` 将临时路径转本地文件
- 溶图：`checkApiHealth()` 通过后 `wx.uploadFile` 上传至 `/api/blend`
- Loading：全屏 `van-overlay` + 角色头像 + `loading-quotes.js` 随机趣味文案

### 5.3 结果页（`pages/result/`）

- **拍立得风格**：`.polaroid.card--tilt-left` 手绘倾斜卡片 + 640rpx 相框
- 降级提示：根据 `degraded` / `fallbackKind` 显示「AI 完整图」或「基础合成」标签
- 操作：`action-pill` 组件统一胶囊按钮（保存 / 分享 / 再拍 / 返回）
- 分享：`onShareAppMessage()` 返回标题与首页 path

### 5.4 历史记录（`utils/history.js`）

- Storage 键：`blend_history`，上限 `MAX_ITEMS = 10`
- 新记录 `unshift` 后 `slice(0, 10)`，远程图转本地路径防失效
- 单条字段：`id, characterId, characterName, imageUrl, quote, diaryNote, fontStyle, createdAt` 等
- 历史回看：`from=history` 跳转 result 页，隐藏「再拍一张」

### 5.5 陪伴日记（加分项，`pages/diary/` + `utils/diary.js`）

- 数据源：复用 `getHistory()`，经 `enrichDiaryList()` 加工
- 视觉：草稿纸背景、左右交替微倾斜、CSS 拍立得边框
- 批注样式：按 `fontStyle`（naiwa/doro/maodie）+ `rarity` 组合不同字体/颜色

---

## 6. 公共组件

| 组件 | 职责 |
|------|------|
| `components/splash-overlay/` | 冷启动 MP4 开场，失败降级文字，可跳过 |
| `components/action-pill/` | 统一胶囊按钮（primary/secondary/accent + loading/share） |
| `custom-tab-bar/` | 自定义底部 TabBar，开场期间可 hidden |

---

## 7. 工具层（`utils/`）

| 模块 | 职责 |
|------|------|
| `api.js` | `fetchRoll()`、`fetchBlend()`、`checkApiHealth()` |
| `characters.js` | 三角色定义、稀有度 Roll |
| `daily.js` | 按日缓存今日陪伴兽 |
| `history.js` | 历史 CRUD（删除 API 已有，UI 未接） |
| `diary.js` | 历史 → 日记条目 enrich |
| `save-image.js` | 相册权限 + `saveImageToPhotosAlbum` |
| `image-path.js` | 临时路径持久化、远程图下载 |
| `loading-quotes.js` | 溶图等待趣味文案池 |
| `auth.js` | `wx.login` 占位，`getOpenId()` 为 TODO |

---

## 8. Mock 与联调

```javascript
// app.js globalData
apiBaseUrl: 'http://127.0.0.1:3000/api'
useMock: false  // 当前默认走真实后端
```

| 功能 | 行为 |
|------|------|
| Roll | 始终本地随机，无需后端 |
| 溶图 | `useMock: false` 时走真实 API；`mock.js` 存在但未接入 `api.js` |
| openid | 未实际上传，`auth.js` 待联调 |

真机联调时需将 `apiBaseUrl` 改为电脑局域网 IP，并在微信公众平台配置合法域名（上线前必须 HTTPS）。

---

## 9. UI 设计体系

- **主题令牌**：`styles/theme.wxss`（主色、奶油底、手绘描边 `4rpx solid #2D3436`）
- **卡片系统**：`.card` + `.card--tilt-left/right` 微旋转
- **胶囊按钮**：蓝外框 + 黄内芯 + 圆点装饰
- **Vant 实际使用**：`van-icon`、`van-loading`、`van-tag`、`van-overlay`；`van-button`、`van-toast` 已注册未使用

---

## 10. 目录结构

```
miniprogram/
├── app.js / app.json / app.wxss          # 入口、全局配置、主题引入
├── project.config.json                   # AppID、libVersion 3.5.5
├── package.json                          # @vant/weapp 依赖
├── pages/
│   ├── index/        # 首页 Tab + splash-overlay
│   ├── history/      # 历史 Tab
│   ├── me/           # 我的 Tab
│   ├── camera/       # 拍照溶图
│   ├── result/       # 结果展示
│   └── diary/        # 陪伴日记（加分）
├── components/
│   ├── action-pill/  # 胶囊按钮
│   └── splash-overlay/ # 开场动画
├── custom-tab-bar/   # 自定义 TabBar
├── utils/            # 14 个工具模块
├── styles/theme.wxss # 设计令牌
├── images/
│   ├── characters/covers/{naiwa,doro,maodie}/{normal,rare,legendary}.jpg
│   ├── diary/draft-paper-bg.jpg
│   └── placeholders/home-banner.jpg
└── assets/
    ├── splash/intro.mp4
    └── fonts/vant-icon.woff2
```

---

## 11. 已知缺口

1. Roll 稀有度动画（plan 加分项）未实现
2. `mock.js` 溶图逻辑未接线，`useMock: true` 时无法离线演示溶图
3. 用户认证 / openid 未联调
4. 历史记录无删除 UI
5. `pages/splash/` 遗留页未注册路由
6. 分享固定跳转首页，未带结果图深链

---

## 12. 结论

小程序前端 **MVP 功能完整**，核心路径「Roll → 选图 → 溶图 → 结果 → 历史/日记」已打通，UI 风格统一，已与后端联调。主要遗留为 Roll 动画、Mock 回退路径与用户认证。
