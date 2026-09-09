#!/usr/bin/env python3
"""从 素材库/ 同步并压缩资源到 miniprogram/（单文件图像/音视频 ≤ 200KB）"""

from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "素材库"
DST = ROOT / "miniprogram"
MAX_BYTES = 200 * 1024

CHAR_MAP = {"naiwa": "奶蛙", "doro": "doro", "maodie": "耄耋"}
RARITY_MAP = {"普通": "normal", "稀有": "rare", "传说": "legendary"}

MEDIA_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp3", ".wav", ".aac", ".m4a", ".mp4"}


def compress_jpeg(path: Path, max_width: int = 720, quality: int = 68) -> None:
    from PIL import Image

    im = Image.open(path)
    if im.width > max_width:
        im = im.resize((max_width, int(im.height * max_width / im.width)), Image.Resampling.LANCZOS)
    if im.mode != "RGB":
        im = im.convert("RGB")

    for q in range(quality, 40, -6):
        im.save(path, "JPEG", quality=q, optimize=True)
        if path.stat().st_size <= MAX_BYTES:
            return

    im.save(path, "JPEG", quality=40, optimize=True)


def compress_video(path: Path) -> None:
    tmp = path.with_suffix(".tmp.mp4")
    cmd = [
        "ffmpeg", "-y", "-i", str(path), "-an",
        "-vf", "scale=640:-2",
        "-c:v", "libx264", "-crf", "38",
        "-maxrate", "280k", "-bufsize", "560k",
        "-preset", "fast", "-movflags", "+faststart",
        str(tmp),
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    tmp.replace(path)


def ensure_under_limit(path: Path) -> None:
    if path.stat().st_size <= MAX_BYTES:
        return
    suffix = path.suffix.lower()
    if suffix in {".jpg", ".jpeg"}:
        compress_jpeg(path)
    elif suffix == ".mp4":
        compress_video(path)
    if path.stat().st_size > MAX_BYTES:
        raise RuntimeError(f"{path.relative_to(ROOT)} 仍超过 200KB ({path.stat().st_size // 1024} KB)")


def copy_and_compress(src: Path, dst: Path) -> bool:
    if not src.exists():
        print(f"  skip (missing): {src.relative_to(ROOT)}")
        return False
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    ensure_under_limit(dst)
    print(f"  ok: {dst.relative_to(ROOT)} ({dst.stat().st_size // 1024} KB)")
    return True


def audit_miniprogram() -> int:
    bad = []
    for path in (DST).rglob("*"):
        if not path.is_file() or path.suffix.lower() not in MEDIA_SUFFIXES:
            continue
        size = path.stat().st_size
        if size > MAX_BYTES:
            bad.append((path.relative_to(ROOT), size))
    return bad


def main():
    print("== banner ==")
    copy_and_compress(SRC / "主页" / "banner.jpg", DST / "images" / "placeholders" / "home-banner.jpg")

    print("== character covers ==")
    for cid, cn in CHAR_MAP.items():
        for r_cn, r_en in RARITY_MAP.items():
            copy_and_compress(
                SRC / "主页" / "陪伴兽" / cn / f"{r_cn}.jpg",
                DST / "images" / "characters" / "covers" / cid / f"{r_en}.jpg",
            )

    print("== audit ==")
    bad = audit_miniprogram()
    if bad:
        for rel, size in bad:
            print(f"  OVER 200KB: {rel} ({size // 1024} KB)")
        sys.exit(1)

    print("done. 所有图像/音视频 ≤ 200KB")


if __name__ == "__main__":
    main()
