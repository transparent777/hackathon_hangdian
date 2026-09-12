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
ai/prompts/*.json          角色身份约束、透明动作候选和旧溶图 prompt
ai/diary-prompts.json      日记多模态 prompt（已冻结）
ai/quotes.json             陪伴语池
server/services/ai/        运行时：blend + diary + providers
```

| `AI_MODE` | 行为 |
|-----------|------|
| `mock` | 使用默认动作和位置完成本地素材合成；日记用 fallback 文案 |
| `live` | Seedream Pro 生成一次场景互动候选图，U2Net-P 本地分割角色并恢复原背景；日记走 DeepSeek 多模态 |

**`.env` 示例**（Key 自行填入，勿提交）：

```env
AI_MODE=live
AI_BLEND_STRATEGY=hybrid

# 旧整图 Seedream 兼容策略（仅 AI_BLEND_STRATEGY=seedream-full 时使用）
AI_API_KEY=你的火山方舟密钥
AI_API_BASE_URL=https://ark.cn-beijing.volces.com
AI_BLEND_VARIANT=pro
AI_BLEND_SIZE=2K

# 日记批注 · DeepSeek V4.1-Flash
AI_DIARY_API_KEY=你的DeepSeek密钥
AI_DIARY_API_BASE_URL=https://api.deepseek.com
AI_DIARY_MODEL=deepseek-flash

PUBLIC_BASE_URL=http://localhost:3000
```

`hybrid` 模式需要 `AI_API_KEY`、Python、Pillow、NumPy、ONNX Runtime 和 `models/u2netp.onnx`。失败时默认返回透明动作素材，同时用 `degraded`、`failedStage` 和 `fallbackReason` 明确标记；设置 `AI_ALLOW_ASSET_FALLBACK=false` 可改为直接返回错误。

| `AI_BLEND_STRATEGY` | 行为 |
|---------------------|------|
| `hybrid`（默认） | Seedream Pro 生成互动候选；U2Net-P 本地分割，Sharp 恢复原始背景 |
| `asset-composite` | DeepSeek 选择透明动作素材，Sharp 直接合成，不生成新动作 |
| `seedream-full` | 保留旧 Seedream 整图编辑路径；不能保证背景像素不变 |

Seedream 候选图：`providers/http.js` · 本地分割：`segmenter.js` / `scripts/segment_foreground.py` · 背景恢复与合成：`compositor.js` · 场景分析/日记：`providers/deepseek.js`。**密钥勿写进代码**。

## 安全

- 密钥只写在 `server/.env`，模板见 `.env.example`
- `uploads/` 已 gitignore
- 提交前：`npm run check-secrets`

## 接口

- `GET /api/health` — 含 `ai.mode` / `ai.live`
- `POST /api/roll` — 随机陪伴兽 + `quotes.json` 随机语
- `POST /api/blend` — 溶图 + `diaryNote` / `fontStyle`（见 `docs/diary-api.md`）
