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
providers/mock.js     AI_MODE=mock（默认，回传原图 URL）
providers/http.js     AI_MODE=live + AI_API_KEY（火山方舟 Seedream 溶图）
        │
        ▼
溶图结果图 URL
        │
        ▼
server/services/ai/diary.js  ──读──► ai/diary-prompts.json
        │
        ▼
providers/deepseek.js  AI_DIARY_API_KEY（DeepSeek 看图写批注）
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

# 二选一：variant 快捷切换，或直接写完整 model id
AI_BLEND_VARIANT=lite          # lite | pro | 4.5
# AI_BLEND_MODEL=doubao-seedream-5-0-pro-260628

AI_BLEND_SIZE=2K               # lite: 2K/3K/4K；pro: 1K/2K

AI_DIARY_API_KEY=你的DeepSeek密钥
AI_DIARY_API_BASE_URL=https://api.deepseek.com
AI_DIARY_MODEL=deepseek-flash

PUBLIC_BASE_URL=http://localhost:3000
```

| variant | 模型 ID | 说明 |
|---------|---------|------|
| `lite`（默认） | `doubao-seedream-5-0-260128` | 5.0 Lite，溶图推荐 |
| `pro` | `doubao-seedream-5-0-pro-260628` | 5.0 Pro，画质更好 |
| `4.5` | `doubao-seedream-4-5-251128` | 旧版兼容 |

溶图：`providers/http.js` · 日记：`providers/deepseek.js`。
