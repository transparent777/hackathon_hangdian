# 安全与敏感信息管理

## 原则

**永远不要提交到 Git：**
- 真实 AppID / AppSecret（写在 `project.private.config.json` 或 `.env`）
- AI API Key、OSS 密钥
- `.env` 文件（仅保留 `.env.example` 模板）
- 用户上传的私人照片（`server/uploads/`、`uploads/`）
- `node_modules/`、`miniprogram_npm/`

**可以提交：**
- `project.config.json`（AppID 必须为占位符 `wxYOUR_APPID_HERE`）
- `project.private.config.json.example`、`server/.env.example`（模板，无真实密钥）
- `ai/diary-prompts.json`（仅 prompt 文案，不含 Key）

---

## 快速配置（单人开发）

### 小程序

```bash
cd miniprogram
copy project.private.config.json.example project.private.config.json
# 编辑 project.private.config.json，填入真实 AppID
```

- `project.private.config.json` 已被 `.gitignore`
- **禁止**把真实 AppID 写回 `project.config.json`

### 后端

```bash
cd server
copy .env.example .env
# 编辑 .env，填入 AI_API_KEY 等
npm install
npm start
```

- 密钥只放 `.env`，代码用 `process.env.AI_API_KEY` 读取
- 用户上传图落在 `server/uploads/`，已被 ignore

---

## 提交前检查（推荐每次 commit 前跑）

```bash
node scripts/check-secrets.js
node scripts/check-secrets.js --staged   # 仅扫暂存区
```

或：

```bash
cd server && npm run check-secrets
```

脚本会检测：硬编码 API Key、AppSecret、真实 `wx` AppID 等。

---

## `.gitignore` 重点条目

| 路径 | 原因 |
|------|------|
| `.env` / `.env.*` | 后端密钥 |
| `project.private.config.json` | 微信 AppID |
| `server/uploads/` | 用户上传原图/溶图 |
| `**/secrets.*` / `**/.credentials/` | 各类凭证 |
| `*.pem` / `*.key` / `private.*.key` | 证书与上传密钥 |
| `node_modules/` / `miniprogram_npm/` | 依赖，体积大 |

完整列表见仓库根目录 `.gitignore`。

---

## 已误提交密钥怎么办

1. **立即轮换**密钥（微信后台、AI 厂商控制台）
2. 从 Git 历史移除敏感文件（若已 push，视为泄露，必须重置密钥）
3. 将真实 AppID 迁到 `project.private.config.json`，`project.config.json` 改回占位符

> 本仓库 `project.config.json` 曾含真实 AppID，已改为占位符。若你本地曾 push 过旧版本，请在微信后台确认是否需要重置 AppSecret。

---

## 生产环境额外注意

- `server/.env` 中设置 `CORS_ORIGINS` 限制来源
- 小程序 `urlCheck: true`（在 `project.private.config.json`）
- 上线后 `useMock: false`，API 走 HTTPS 合法域名
- 溶图/日记接口加限流，避免 Key 被盗刷
