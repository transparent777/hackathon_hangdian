# AI 配置层（原 C 职责）

> **密钥不进 Git**：`AI_API_KEY` 等只写在 `server/.env`（见 `server/.env.example`）。

## 目录

| 路径 | 用途 | 谁改 |
|------|------|------|
| `prompts/*.json` | 溶图 prompt（三角色） | A/B 填占位 → 联调时调优 |
| `diary-prompts.json` | 陪伴日记多模态批注 prompt | 已冻结，仅改错别字 |
| `quotes.json` | roll / 陪伴语池 | 润色文案 |
| `references/` | 角色参考图（给溶图 API） | 从 `素材库/` 整理 |
| `config.json` | 模型名、超时等非敏感默认项 | 与 `.env` 配合 |

## 数据流

```
用户原图 + characterId + rarity
        │
        ▼
server/services/ai/blend.js  ──读──► ai/prompts/{id}.json
        │
        ▼
providers/mock.js   AI_MODE=mock（默认，回传原图 URL）
providers/http.js   AI_MODE=live + AI_API_KEY（待接入真实 API）
        │
        ▼
溶图结果图 URL
        │
        ▼
server/services/ai/diary.js  ──读──► ai/diary-prompts.json
        │
        ▼
diaryNote + fontStyle → 返回小程序
```

## 联调开关

`server/.env`：

```env
AI_MODE=live
AI_API_KEY=你的火山方舟_API_Key
AI_API_BASE_URL=https://ark.cn-beijing.volces.com
AI_BLEND_MODEL=doubao-seedream-4-5-251128
PUBLIC_BASE_URL=http://localhost:3000
```

溶图已接入 `server/services/ai/providers/http.js`（Seedream 图生图）。日记批注多模态仍用 fallback，后续可接方舟视觉对话模型。
