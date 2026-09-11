# 本地后端

## 启动

```bash
cd server
copy .env.example .env    # 填入 AI_API_KEY 等（.env 不会提交 Git）
npm install
npm start
```

小程序 `app.js`：`useMock: false`，`apiBaseUrl: 'http://localhost:3000/api'`（真机用局域网 IP，并改 `.env` 的 `PUBLIC_BASE_URL`）。

## AI 架构（原 C 职责）

```
ai/prompts/*.json          溶图 prompt（占位英文，联调时改）
ai/diary-prompts.json      日记多模态 prompt（已冻结）
ai/quotes.json             陪伴语池
server/services/ai/        运行时：blend + diary + providers
```

| `AI_MODE` | 行为 |
|-----------|------|
| `mock` | 溶图回传原图 URL，日记用 fallback 文案 |
| `live` | 溶图走火山方舟 Seedream 5.0；日记走 DeepSeek 多模态（各自 Key） |

**`.env` 示例**（Key 自行填入，勿提交）：

```env
AI_MODE=live

# 溶图 · 火山方舟
AI_API_KEY=你的火山方舟密钥
AI_API_BASE_URL=https://ark.cn-beijing.volces.com
AI_BLEND_VARIANT=lite
AI_BLEND_SIZE=2K

# 日记批注 · DeepSeek V4.1-Flash
AI_DIARY_API_KEY=你的DeepSeek密钥
AI_DIARY_API_BASE_URL=https://api.deepseek.com
AI_DIARY_MODEL=deepseek-flash

PUBLIC_BASE_URL=http://localhost:3000
```

| `AI_BLEND_VARIANT` | 溶图模型 |
|--------------------|------|
| `lite`（默认） | `doubao-seedream-5-0-260128` |
| `pro` | `doubao-seedream-5-0-pro-260628` |

溶图：`providers/http.js` · 日记：`providers/deepseek.js`。**密钥勿写进代码**。

## 安全

- 密钥只写在 `server/.env`，模板见 `.env.example`
- `uploads/` 已 gitignore
- 提交前：`npm run check-secrets`

## 接口

- `GET /api/health` — 含 `ai.mode` / `ai.live`
- `POST /api/roll` — 随机陪伴兽 + `quotes.json` 随机语
- `POST /api/blend` — 溶图 + `diaryNote` / `fontStyle`（见 `docs/diary-api.md`）
