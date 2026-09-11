# 角色参考图（溶图 API 用）

从 `素材库/主页/陪伴兽/` 整理三张参考图到此目录（不含隐私）：

| 文件 | 角色 |
|------|------|
| `naiwa.jpg` | 奶蛙 |
| `doro.jpg` | doro |
| `maodie.jpg` | 耄耋 |

`ai/prompts/*.json` 中的 `referenceImage` 指向此处相对路径。  
接入真实 API 时由 `server/services/ai/blend.js` 解析为绝对路径传给 provider。
