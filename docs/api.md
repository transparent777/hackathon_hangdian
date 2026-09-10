# 赛博陪伴相机 API（B 负责）

> 当前版本：`0.1.0`。接口已可联调，图片 provider 暂为 `mock`；C 确定真实 AI 服务后替换 `server/src/providers/`，接口格式不变。

## 本地启动

```bash
cd server
npm install
npm start
```

默认地址：`http://localhost:3000/api`。

可选环境变量：

| 名称 | 默认值 | 说明 |
|---|---:|---|
| `PORT` | `3000` | HTTP 端口 |
| `AI_PROVIDER` | `mock` | 图片融合 provider；真实 provider 待接入 |
| `AI_TIMEOUT_MS` | `20000` | AI 调用超时毫秒数 |
| `DAILY_BLEND_LIMIT` | `10` | 每个 openid 每日溶图次数 |
| `PUBLIC_BASE_URL` | 根据请求生成 | 部署后的 HTTPS 公网地址 |
| `DATA_DIR` | 系统临时目录 | Mock 阶段的历史记录和结果图目录；正式部署后替换为数据库与对象存储 |

密钥只能放在 `server/.env` 或部署平台的环境变量中，禁止提交 Git。

## 通用约定

- API 前缀：`/api`
- JSON 请求使用 `Content-Type: application/json`
- 图片上传使用 `multipart/form-data`
- Demo 阶段未传 `openid` 时按 `demo-user` 处理；接入微信登录后应传真实 openid
- 错误格式：`{ "code": "ERROR_CODE", "message": "错误说明" }`

## 健康检查

### `GET /api/health`

```json
{
  "ok": true,
  "provider": "mock",
  "timestamp": "2026-09-10T07:00:00.000Z"
}
```

`provider: mock` 表示后端通路正常，但尚未接入真实 AI。

## 每日抽取

### `POST /api/roll`

请求：

```json
{ "openid": "demo-user-001" }
```

同一用户在北京时间同一天得到相同结果。

响应：

```json
{
  "characterId": "doro",
  "name": "doro",
  "rarity": "普通",
  "quote": "什么都不想，就趴在你旁边",
  "date": "2026-09-10"
}
```

## 图片融合

### `POST /api/blend`

请求类型：`multipart/form-data`。

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `image` | file | 是 | JPEG、PNG 或 WebP，最大 10MB |
| `characterId` | string | 是 | `naiwa` / `doro` / `maodie` |
| `openid` | string | 否 | Demo 缺省为 `demo-user` |
| `rarity` | string | 否 | `普通` / `稀有` / `传说`，默认普通 |

当前 Mock provider 会原样返回上传图片，用于 A、D 提前完成联调。真实 AI 接入后响应结构不变。

响应：

```json
{
  "resultUrl": "http://localhost:3000/api/files/blend-xxx.png",
  "companionText": "什么都不想，就趴在你旁边",
  "taskId": "blend-xxx",
  "diaryNote": "",
  "fontStyle": "doro",
  "provider": "mock"
}
```

`diaryNote` 会在多模态模型接入后生成；当前为空字符串属于预期降级。

限流响应为 HTTP `429`：

```json
{
  "code": "DAILY_LIMIT_EXCEEDED",
  "message": "今日生成次数已达上限（10 次）"
}
```

## 结果图片

### `GET /api/files/:fileName`

直接返回图片内容，供小程序结果页显示。

## 历史记录

### `GET /api/history?openid=demo-user-001&limit=10`

最多返回最近 10 条：

```json
{
  "records": [
    {
      "taskId": "blend-xxx",
      "openid": "demo-user-001",
      "characterId": "doro",
      "characterName": "doro",
      "rarity": "稀有",
      "resultUrl": "http://localhost:3000/api/files/blend-xxx.png",
      "companionText": "什么都不想，就趴在你旁边",
      "diaryNote": "",
      "fontStyle": "doro",
      "provider": "mock",
      "createdAt": 1789023600000
    }
  ],
  "count": 1
}
```

## A 的联调事项

1. `miniprogram/app.js` 保持 `apiBaseUrl: 'http://localhost:3000/api'`。
2. 开发者工具本地联调时将 `useMock` 改为 `false`。
3. `/blend` 使用 `wx.uploadFile`，文件字段必须叫 `image`。
4. 部署后将 `apiBaseUrl` 换成已加入微信后台白名单的 HTTPS 地址。

## D 的冒烟测试

导入 `postman/cyber-companion.postman_collection.json`，依次运行：

1. Health
2. Roll
3. Blend（在 Body 中为 `image` 选择一张本地图片）
4. History

Blend 返回 `201` 且 `resultUrl` 可以打开，即说明 Mock 端到端通路通过。
