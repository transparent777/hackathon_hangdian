# A 单人一日作战计划

> **角色**：A（前端，一人扛 UI + 联调 + 素材接入）  
> **目标**：一天内交付「能 demo 的 JuJuly 风赛博陪伴小程序」  
> **原则**：先通路，再好看；mock 保底，真 API 优先

---

## 今日交付标准（晚上 21:00 前）

- [ ] 真机全流程：Roll → 选图 → 溶图 → 结果 → 保存/分享
- [ ] 接 B 的真实 `/roll`、`/blend`（mock 作 fallback）
- [ ] JuJuly 风视觉：米白底 + 大圆角卡片 + 角色插画（非 emoji）
- [ ] 本地历史记录最近 10 条
- [ ] 体验版可扫码演示

**不做**：自定义字体、完整 4 Tab 日记系统、完美复刻参考图每一屏

---

## 素材说明（`素材库/` 已 gitignore）

```
素材库/
├── 奶娃/   *.jpg
├── doro/   *.jpg
└── 耄耋/   *.jpg
```

**你要做的**：从每个文件夹挑 **1 张最清晰的**，复制到小程序目录（会进 Git）：

```
miniprogram/images/characters/
├── naiwa.png    ← 从 素材库/奶娃/ 选一张，可改后缀
├── doro.png
└── maodie.png
```

> 素材库不提交；`miniprogram/images/` 只放 3 张压缩后的小图（每张 < 200KB）。

压缩工具：https://squoosh.app 或 TinyPNG

---

## 时间表（建议 9:00 → 21:00）

### 09:00–10:00 环境与对齐（1h）

| # | 任务 | 产出 |
|---|------|------|
| 1 | `git pull` 最新 `develop` | 代码同步 |
| 2 | `cd miniprogram && npm install` → **构建 npm** | 模拟器能跑 |
| 3 | **找 B 要**：`apiBaseUrl`、接口文档、`openid` 怎么传 | 记在 `app.js` 注释里 |
| 4 | 从 `素材库/` 各选 1 图 → 压缩 → 放到 `miniprogram/images/characters/` | 3 张角色图 |

**检查点**：原版三页能编译，三张角色图能在本地打开。

---

### 10:00–12:00 API 联调（2h）— 最高优先级

| # | 任务 | 文件 |
|---|------|------|
| 5 | 改 `app.js`：`useMock: false`，填 `apiBaseUrl` | `app.js` |
| 6 | 实现 `wx.login` 拿 code 给 B（或 B 说用设备 id） | `utils/auth.js` 新建 |
| 7 | `fetchRoll` 对接 `POST /roll` | `utils/api.js` |
| 8 | `fetchBlend` 用 `wx.uploadFile` 上传图片 | `utils/api.js` |
| 9 | 加 loading / 失败 toast / 超时提示 | `camera.js` |

**与 B 对齐的 upload 模板**（二选一，问 B）：

```js
// 方案 A：直接 uploadFile 到 /blend
wx.uploadFile({
  url: `${apiBaseUrl}/blend`,
  filePath: imagePath,
  name: 'image',
  formData: { characterId, openid }
})

// 方案 B：先拿 OSS url，再 POST json
```

**检查点**：Postman 或真机走完一次真溶图。若 B 未 ready → **保持 `useMock: true`**，先做 UI，下午再切。

---

### 12:00–13:00 午饭 + 自测 mock 主流程

走一遍：Roll → 拍照 → 结果 → 保存。记下 bug 列表。

---

### 13:00–16:00 JuJuly 风 UI（3h）

| # | 任务 | 说明 |
|---|------|------|
| 10 | 新建 `miniprogram/styles/theme.wxss` | 色板见下表 |
| 11 | `app.wxss` 引入 theme，米白渐变底 | 参考 JuJuly |
| 12 | **首页改造**：顶部品牌区 + 角色插画 `image` + `van-tag` 稀有度 | 不用 emoji，用 `images/characters/` |
| 13 | **拍照页**：`van-image` 预览 + `van-overlay` 溶图 loading | 单根节点 |
| 14 | **结果页**：拍立得卡片 + 分享按钮 | `onShareAppMessage` |

**色板（抄 JuJuly 结构，赛博配色）**

| 令牌 | 值 |
|------|-----|
| 背景 | `#FFF9F0` |
| 主色 | `#6C5CE7` |
| 辅色 | `#FFE66D` |
| 强调 | `#FF6B6B` |
| 卡片圆角 | `24rpx` |
| 描边（可选） | `3rpx solid #2D3436` 仅插画区 |

**检查点**：截图发群，外人能认出「有设计风格」而非纯白页。

---

### 16:00–18:00 历史 + 分享 + 打磨（2h）

| # | 任务 | 文件 |
|---|------|------|
| 15 | 溶图成功写入 `wx.setStorageSync('history', [])` | `utils/history.js` |
| 16 | 新建 `pages/history/history` 或在首页底部加「最近记录」列表 | 二选一，推荐**首页下方列表**省时间 |
| 17 | 结果页 `open-type="share"` + `onShareAppMessage` | `result.js` |
| 18 | 错误态：无网络、溶图失败、未 roll 就拍照 | 各页补 toast |

**检查点**：重启小程序历史仍在；分享卡片有标题。

---

### 18:00–19:00 自定义 TabBar（可选，时间不够就跳过）

| # | 任务 |
|---|------|
| 19 | `app.json` 加 `tabBar.custom: true` |
| 20 | `custom-tab-bar/` 两 tab 即可：**首页**、**我的/历史** |

> 一天单人做，**TabBar 可砍**：用首页入口 + 顶部导航代替，答辩够用。

---

### 19:00–20:00 真机测试 + 体验版（1h）

| # | 任务 |
|---|------|
| 21 | 真机预览全流程 3 遍 |
| 22 | 开发者工具 **上传** → 后台设 **体验版** |
| 23 | 写 `docs/qa-checklist.md` 给 D（或自己勾） |

---

### 20:00–21:00 缓冲修 bug + commit

| # | 任务 |
|---|------|
| 24 | 修 P0 bug only |
| 25 | `git add` → commit → push `develop` |
| 26 | 录 15 秒屏发群 |

---

## 你需要改/新建的文件清单

```
miniprogram/
├── app.js                    # apiBaseUrl, useMock
├── app.json                  # 页面注册、全局组件
├── app.wxss                  # 引入 theme
├── styles/theme.wxss         # 新建
├── images/characters/        # 3 张角色图（从素材库复制）
├── utils/
│   ├── api.js                # 真接口 + uploadFile
│   ├── auth.js               # 新建（可选）
│   └── history.js            # 新建
├── pages/index/              # JuJuly 风首页
├── pages/camera/             # overlay loading
└── pages/result/             # 分享 + 拍立得
```

---

## 向 B 要的 3 句话（早上必发）

1. `apiBaseUrl` 是多少？开发环境域名要不要配进小程序后台？  
2. `/blend` 是 `uploadFile` 还是传 OSS url？字段名是什么？  
3. `/roll` 返回 JSON 结构发我一份（和 `characters.js` 对齐）。

---

## 风险与砍 scope

| 来不及 | 砍什么 |
|--------|--------|
| B API 未好 | 全天 `useMock: true`，UI 照做，晚上再切 30 分钟 |
| TabBar 做不完 | 不要 TabBar，三页 `navigateTo` 够用 |
| 历史页做不完 | 只做 `storage` 存图，答辩口头说「后续加列表」 |
| 插画来不及 | 暂用素材库最好的一张，别抠细节 |

---

## 今晚 commit 信息参考

```
feat(miniprogram): JuJuly风UI、API联调、本地历史与分享
```

---

*配合 `docs/skills-setup.md` 使用 Cursor Skills 时可说：「按 frontend-design，JuJuly 插画风，但配色用赛博陪伴令牌」*
