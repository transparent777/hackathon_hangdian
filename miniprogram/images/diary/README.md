# 陪伴日记素材

由 `scripts/sync_diary_assets.py` 从 `素材库/陪伴空间/` 同步（≤ 200KB）。

| 源文件 | 目标文件 | 用途 |
|--------|----------|------|
| `草稿纸背景.jpg` | `draft-paper-bg.jpg` | 日记卡片内背景 |

拍立得效果由 CSS 实现（左右细白边、上下粗白边、外圈黑框），不再使用相框素材。

```bash
python scripts/sync_diary_assets.py
```
