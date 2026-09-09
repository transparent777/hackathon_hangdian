#!/usr/bin/env python3
"""检查 miniprogram 内图像/音视频是否超过 200KB"""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
MINIPROGRAM = ROOT / "miniprogram"
MAX_BYTES = 200 * 1024
SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp3", ".wav", ".aac", ".m4a", ".mp4"}

bad = []
for path in MINIPROGRAM.rglob("*"):
    if path.is_file() and path.suffix.lower() in SUFFIXES:
        size = path.stat().st_size
        rel = path.relative_to(ROOT)
        mark = "OK" if size <= MAX_BYTES else "OVER"
        print(f"[{mark}] {size // 1024:3d} KB  {rel}")
        if size > MAX_BYTES:
            bad.append(rel)

if bad:
    print(f"\n{len(bad)} 个文件超过 200KB，请运行: python scripts/sync_assets.py 或手动压缩")
    sys.exit(1)

print("\n全部通过（≤ 200KB）")
