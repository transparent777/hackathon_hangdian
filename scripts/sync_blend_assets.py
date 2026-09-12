#!/usr/bin/env python3
"""从 素材库/溶图 同步溶图素材到 ai/references/，并生成 manifest。"""

from __future__ import annotations

import hashlib
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "素材库" / "溶图"
AI_REFS = ROOT / "ai" / "references"
VARIANTS = AI_REFS / "variants"

CHAR_CN_TO_ID = {
    "奶蛙": "naiwa",
    "naiwa": "naiwa",
    "doro": "doro",
    "耄耋": "maodie",
    "maodie": "maodie",
}

CHAR_ID_TO_CN = {
    "naiwa": "奶蛙",
    "doro": "doro",
    "maodie": "耄耋",
}

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}


def file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sort_key(path: Path) -> tuple:
    stem = path.stem
    if stem.isdigit():
        return (0, int(stem), path.suffix.lower())
    return (1, stem, path.suffix.lower())


def resolve_source_dirs() -> dict[str, Path]:
    if not SRC.exists():
        raise FileNotFoundError(f"未找到素材目录: {SRC}")

    mapping: dict[str, Path] = {}
    for entry in sorted(SRC.iterdir()):
        if not entry.is_dir():
            continue
        cid = CHAR_CN_TO_ID.get(entry.name)
        if not cid:
            print(f"  skip unknown folder: {entry.name}")
            continue
        mapping[cid] = entry
    return mapping


def rename_source_folders(mapping: dict[str, Path]) -> None:
    """将 素材库/溶图 子目录统一为 naiwa / doro / maodie。"""
    for cid, folder in mapping.items():
        target = SRC / cid
        if folder.resolve() == target.resolve():
            continue
        if target.exists() and folder.resolve() != target.resolve():
            raise RuntimeError(f"目标目录已存在: {target}")
        folder.rename(target)
        print(f"  renamed: {folder.name} -> {cid}/")


def copy_variants(mapping: dict[str, Path]) -> dict:
    manifest: dict = {"source": "素材库/溶图", "characters": {}}

    for cid in ("naiwa", "doro", "maodie"):
        folder = mapping.get(cid) or SRC / cid
        if not folder.exists():
            print(f"  skip missing character folder: {cid}")
            continue

        files = sorted(
            [p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_SUFFIXES],
            key=sort_key,
        )
        if not files:
            print(f"  skip empty: {folder.relative_to(ROOT)}")
            continue

        out_dir = VARIANTS / cid
        if out_dir.exists():
            shutil.rmtree(out_dir)
        out_dir.mkdir(parents=True, exist_ok=True)

        primary_path = AI_REFS / f"{cid}.jpg"
        primary_hash = file_hash(primary_path) if primary_path.exists() else None

        variants = []
        for index, src in enumerate(files, start=1):
            dst_name = f"{index:02d}{src.suffix.lower()}"
            dst = out_dir / dst_name
            shutil.copy2(src, dst)
            digest = file_hash(dst)
            is_primary = primary_hash is not None and digest == primary_hash
            variants.append(
                {
                    "id": f"{index:02d}",
                    "file": f"variants/{cid}/{dst_name}",
                    "format": src.suffix.lower().lstrip("."),
                    "bytes": dst.stat().st_size,
                    "sha256": digest[:16],
                    "isPrimary": is_primary,
                    "source": str(src.relative_to(ROOT)).replace("\\", "/"),
                }
            )
            flag = " [primary]" if is_primary else ""
            print(f"  ok: {dst.relative_to(ROOT)} ({dst.stat().st_size // 1024} KB){flag}")

        manifest["characters"][cid] = {
            "name": CHAR_ID_TO_CN[cid],
            "primary": f"references/{cid}.jpg",
            "variantCount": len(variants),
            "variants": variants,
        }

    return manifest


def write_manifest(manifest: dict) -> None:
    manifest_path = AI_REFS / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"  wrote: {manifest_path.relative_to(ROOT)}")


def write_source_readme() -> None:
    readme = SRC / "README.md"
    readme.write_text(
        """# 溶图素材（本地源文件，不进 Git）

按角色分子目录，文件夹名请使用英文 ID：

```
溶图/
├── naiwa/     # 奶蛙 · 多角度 / 表情 / 姿势素材
├── doro/
└── maodie/    # 耄耋
```

## 同步到项目

主参考图（溶图 API 默认使用）放在 `ai/references/{角色}.jpg`。  
全部素材同步到 `ai/references/variants/` 并生成清单：

```bash
python scripts/sync_blend_assets.py
```

| 角色 ID | 中文名 | 主参考图 |
|---------|--------|----------|
| `naiwa` | 奶蛙 | `ai/references/naiwa.jpg` |
| `doro` | doro | `ai/references/doro.jpg` |
| `maodie` | 耄耋 | `ai/references/maodie.jpg` |

`variants/` 内为扩展素材库，供后续按场景选图或人工挑参考图使用。
""",
        encoding="utf-8",
    )
    print(f"  wrote: {readme.relative_to(ROOT)}")


def main() -> None:
    print("== normalize 素材库/溶图 folder names ==")
    mapping = resolve_source_dirs()
    rename_source_folders(mapping)
    mapping = resolve_source_dirs()

    print("== sync variants -> ai/references/variants ==")
    manifest = copy_variants(mapping)
    write_manifest(manifest)
    write_source_readme()

    print("== update ai/references/README.md ==")
    (AI_REFS / "README.md").write_text(
        """# 角色参考图（溶图 API）

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

源文件维护在本地 `素材库/溶图/`，运行：

```bash
python scripts/sync_blend_assets.py
```

## 选主参考图

1. 在 `素材库/溶图/{角色}/` 中挑选最清晰、造型最标准的一张
2. 复制为 `ai/references/{角色}.jpg`
3. 重新运行同步脚本，manifest 会自动标记 `isPrimary`
""",
        encoding="utf-8",
    )

    print("done.")


if __name__ == "__main__":
    main()
