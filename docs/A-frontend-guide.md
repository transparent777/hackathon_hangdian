# A 前端实操指南（9/07 + 9/08）

你是 **A（小程序前端）**，两天目标是：

- **9/07**：环境搭好，项目能跑
- **9/08**：首页 + 拍照页 + mock 溶图流程跑通

仓库里已放好 `miniprogram/` 骨架，按下面步骤做即可。

---

## 9/07 今天：注册 + 跑起来

### 步骤 1：注册小程序（约 20 分钟）

1. 打开 https://mp.weixin.qq.com
2. 注册 → 选择 **小程序**（个人或团队主体都行）
3. 登录后台 → **开发管理 → 开发设置** → 复制 **AppID**
4. 复制私有配置模板并填入 AppID（**不要写进会被 git 跟踪的文件**）：

```bash
cd miniprogram
cp project.private.config.json.example project.private.config.json
# 编辑 project.private.config.json，填入真实 AppID
```

> `project.private.config.json` 已在 `.gitignore` 中。`project.config.json` 保持占位符即可。

### 步骤 2：安装微信开发者工具（约 15 分钟）

1. 下载：https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html
2. 安装后用微信扫码登录

### 步骤 3：导入项目（5 分钟）

1. 开发者工具 → **导入项目**
2. 目录选：`hackathon_hangdian/miniprogram`
3. AppID 填你的（或测试号）
4. 点确定

### 步骤 4：安装 Vant（约 15 分钟）

在项目目录 `miniprogram/` 下打开终端：

```bash
cd miniprogram
npm install
```

回到微信开发者工具：

1. 菜单 **工具 → 构建 npm**
2. 看到 `miniprogram_npm/@vant/weapp` 即成功
3. **详情 → 本地设置** → 勾选「不校验合法域名」（开发阶段必勾）

### 步骤 5：验证能跑（5 分钟）

1. 点 **编译**
2. 应看到首页「赛博陪伴相机」
3. 点 **Roll 今日陪伴兽** → 出现奶蛙/doro/耄耋之一
4. 点 **拍照溶图** → 能进拍照页

### 9/07 交付 checklist

- [ ] 开发者工具能编译，无红错
- [ ] Vant 按钮能显示
- [ ] 首页 Roll 能随机出角色
- [ ] 把 **体验版路径截图** 发群（可选）

### 今天要和 B 对齐的一句话

> 「我小程序骨架好了，你 `/blend` 接口好了告诉我 `apiBaseUrl` 和入参格式。」

---

## 9/08 明天：首页 + 拍照 + mock 上传

骨架里 **已经写好**，你的任务是 **验收 + 微调**。

### 页面流程（已实现）

```
index（首页 Roll）
  → camera（选图/拍照）
  → result（结果展示）
```

### 你需要自测的 5 步

1. 首页 Roll 出角色
2. 点「拍照溶图」进入 camera 页
3. 点「拍照/从相册选择」选一张图
4. 点「开始溶图」→ loading 约 1.5 秒
5. 跳转 result 页，能看到图 + 陪伴语

> 9/08 的 mock 会 **先返回原图**（证明流程通了），真 AI 图等 9/09 接 B 接口。

### 关键文件（改代码时看这些）

| 文件 | 作用 |
|------|------|
| `app.js` | `apiBaseUrl`、`useMock` 开关 |
| `utils/characters.js` | 三角色配置 |
| `utils/mock.js` | mock 溶图（延时 1.5s） |
| `utils/api.js` | 统一请求，9/09 接真接口 |
| `pages/index/*` | 首页 Roll |
| `pages/camera/*` | 选图 + 上传溶图 |
| `pages/result/*` | 结果页 |

### 可选优化（有时间再做）

- Roll 时加简单动画（`wx.createAnimation` 或 CSS rotate）
- 角色卡片用 `companion.color` 做背景色
- 给 D 准备 `docs/qa-checklist.md` 模板（9/09 任务，可今晚先写草稿）

### 9/08 交付 checklist

- [ ] 首页 + 拍照页 UI 能看
- [ ] 选图 → mock 溶图 → 结果页 全流程通
- [ ] `useMock: true` 确认无误
- [ ] 把流程录屏 15 秒发群

---

## 9/09 预告（今天不用做，先知道）

B 接口 ready 后，改 `app.js`：

```js
globalData: {
  apiBaseUrl: 'https://你的域名/api',  // B 提供
  useMock: false,                       // 改成 false
}
```

`utils/api.js` 里 `fetchBlend` 的真实上传方式要和 B 对齐（`wx.uploadFile` 或先传 OSS url）。

---

## 常见问题

### 1. 「构建 npm」失败

- 确认 `package.json` 在 `miniprogram/` 下
- 先 `npm install`，再点「构建 npm」
- 删除 `miniprogram_npm` 后重新构建

### 2. Vant 组件不显示

- 检查 `app.json` 和页面 `.json` 的 `usingComponents`
- 确认已构建 npm

### 3. 选图/拍照没反应

- 模拟器里相册可能空，用 **真机调试**
- 真机调试：开发者工具 → 预览 → 手机扫码

### 4. 保存相册失败

- 真机第一次会要权限，result 页已处理 `openSetting`

---

## 你今天的时间安排（建议）

| 时段 | 做什么 |
|------|--------|
| 上午 | 注册小程序 + 装开发者工具 + 导入项目 |
| 下午 | npm + 构建 Vant + 跑通首页 |
| 晚上 | 走完 camera → result mock 流程，发群截图 |

---

有问题先找 **B（接口）**，UI 文案找 **D**，角色/溶图效果找 **C**。
