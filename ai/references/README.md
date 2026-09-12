# 角色参考图（溶图 API）

## 主参考图（默认溶图用）

| 文件 | 角色 | 说明 |
|------|------|------|
| `naiwa.jpg` | 奶蛙 | 角色原始形象参考 |
| `doro.jpg` | doro | 同上 |
| `maodie.jpg` | 耄耋 | 同上 |

默认 `hybrid` 流程读取 `ai/prompts/*.json` 的 `composition.variants`，由场景分析选择带透明通道的动作图，再确定性合成到用户原图。`referenceImage` 保留为原始形象依据；旧 `seedream-full` 策略仍使用文字描述进行整图编辑。

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
