# API 接口说明（冻结版 9/11）

> Base URL：`{apiBaseUrl}`，默认 `http://localhost:3000/api`  
> 小程序配置：`miniprogram/app.js` → `globalData.apiBaseUrl`

## `POST /roll`

随机今日陪伴兽。

**请求体（JSON）**

```json
{}
```

**响应**

```json
{
  "characterId": "maodie",
  "name": "耄耋",
  "rarity": "稀有",
  "quote": "老艺术家的从容，就是陪你发呆"
}
```

## `POST /blend`

上传原图并溶图，返回结果与日记批注。

**请求（multipart/form-data）**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `image` | file | 是 | 用户原图 |
| `characterId` | string | 是 | `naiwa` / `doro` / `maodie` |
| `rarity` | string | 否 | `普通` / `稀有` / `传说` |
| `openid` | string | 否 | 预留 |

**响应**

```json
{
  "resultUrl": "https://...",
  "blended": true,
  "blendProvider": "seedream-extract-composite",
  "backgroundPreserved": true,
  "degraded": false,
  "failedStage": null,
  "fallbackReason": null,
  "companionText": "今天在窗边陪你晒太阳",
  "diaryNote": "阳光落在书页上…",
  "fontStyle": "naiwa",
  "taskId": "blend-1726..."
}
```

`hybrid` 模式只调用一次 Seedream Pro 生成互动候选图，再由本地 U2Net-P 分割角色并覆盖回原始照片。`backgroundPreserved=true` 表示区域外像素已通过完整性检查。AI 阶段失败且允许基础兜底时，`degraded=true`，`failedStage` 会区分 `candidate_generation`、`foreground_segmentation` 和 `background_composite`；小程序必须向用户显示该降级状态。

## 健康检查

使用 `GET /health` 查看当前 `blendStrategy`；也可用 `POST /roll` 冒烟。

本地启动：`cd server && npm install && npm start`

## 联调清单

- [ ] 小程序 `useMock: false`
- [ ] 微信公众平台配置 uploadFile / request 合法域名（HTTPS）
- [ ] 真机调试时 `apiBaseUrl` 改为电脑局域网 IP
