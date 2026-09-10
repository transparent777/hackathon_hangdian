#!/usr/bin/env python3
"""检查 miniprogram 内媒体体积（图像/音频 ≤ 200KB，开场视频 ≤ 1.5MB）"""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
MINIPROGRAM = ROOT / "miniprogram"
IMAGE_MAX_BYTES = 200 * 1024
VIDEO_MAX_BYTES = int(1.5 * 1024 * 1024)
SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp3", ".wav", ".aac", ".m4a", ".mp4"}
INTRO_VIDEO = MINIPROGRAM / "assets" / "splash" / "intro.mp4"

bad = []
for path in MINIPROGRAM.rglob("*"):
    if not path.is_file() or path.suffix.lower() not in SUFFIXES:
        continue

    size = path.stat().st_size
    rel = path.relative_to(ROOT)
    limit = VIDEO_MAX_BYTES if path == INTRO_VIDEO else IMAGE_MAX_BYTES
    mark = "OK" if size <= limit else "OVER"
    limit_kb = limit // 1024
    print(f"[{mark}] {size // 1024:4d} KB (≤{limit_kb} KB)  {rel}")
    if size > limit:
        bad.append(rel)

if bad:
    print(f"\n{len(bad)} 个文件超限。图像/音频请跑 sync_assets.py；开场视频请用 scripts/sync_assets.py 或本地 ffmpeg 重压缩。")
    sys.exit(1)

print("\n全部通过")
