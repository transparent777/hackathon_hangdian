# 角色参考图（溶图 API）

## 主参考图（默认溶图用）

| 文件 | 角色 | 说明 |
|------|------|------|
| `naiwa.jpg` | 奶蛙 | 溶图时作为「角色外观唯一依据」传给 API |
| `doro.jpg` | doro | 同上 |
| `maodie.jpg` | 耄耋 | 同上 |

`ai/prompts/*.json` 的 `referenceImage` 指向上述文件，供撰写 prompt 时对照角色外观；**方案 A 溶图不会把参考图上传给 Seedream**，角色外观由 `blend.prompt` 文字描述。

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
