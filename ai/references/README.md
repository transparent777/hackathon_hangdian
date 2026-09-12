# 角色参考图（溶图 API）

## 主参考图（默认溶图用）

| 文件 | 角色 | 说明 |
|------|------|------|
| `naiwa.jpg` | 奶蛙 | 角色原始形象参考 |
| `doro.jpg` | doro | 同上 |
| `maodie.jpg` | 耄耋 | 同上 |

默认 `hybrid` 流程将 `referenceImage` 与用户场景一并交给 Seedream 生成候选图，再通过角色蒙版将候选角色覆盖回原始背景。`composition.variants` 用于 `asset-composite` 策略和任何生成/蒙版失败时的安全回退。

## 扩展素材库

```
variants/
├── naiwa/   # 01.jpg, 02.jpg, …
├── doro/
└── maodie/
```

清单见 `manifest.json`（含每张图是否为主参考图 `isPrimary`）。

源文件维护在本地 `素材库/溶图/`，运行：

```bash
python scripts/sync_blend_assets.py
```

## 选主参考图

1. 在 `素材库/溶图/{角色}/` 中挑选最清晰、造型最标准的一张
2. 复制为 `ai/references/{角色}.jpg`
3. 重新运行同步脚本，manifest 会自动标记 `isPrimary`
