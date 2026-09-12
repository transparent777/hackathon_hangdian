# 角色参考图（溶图 API）

## 主参考图（默认溶图用）

| 文件 | 角色 | 说明 |
|------|------|------|
| `naiwa.jpg` | 奶蛙 | 溶图时作为「角色外观唯一依据」传给 API |
| `doro.jpg` | doro | 同上 |
| `maodie.jpg` | 耄耋 | 同上 |

`ai/prompts/*.json` 的 `referenceImage` 指向上述文件。  
由 `server/services/ai/blend.js` 解析后，与用户生活照一并传给 Seedream。

## 扩展素材库

```
variants/
├── naiwa/   # 01.jpg, 02.jpg, …
├── doro/
└── maodie/
```

清单见 `manifest.json`（含每张图是否为主参考图 `isPrimary`）。

源文件维护在本地 `素材库/溶图/`（**不进 Git**），运行：

```bash
python scripts/sync_blend_assets.py
```

本目录下的 `*.jpg`、`variants/`、`manifest.json` 均为本地生成，已在 `.gitignore` 中忽略；仓库只提交本 README。

## 选主参考图

1. 在 `素材库/溶图/{角色}/` 中挑选最清晰、造型最标准的一张
2. 复制为 `ai/references/{角色}.jpg`
3. 重新运行同步脚本，manifest 会自动标记 `isPrimary`
