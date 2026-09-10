#!/usr/bin/env python3
"""仅同步陪伴日记素材（陪伴空间 → miniprogram/images/diary/）"""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from sync_assets import copy_and_compress_image, copy_png_asset, DST, SRC


def find_companion_dir() -> Path:
    for path in SRC.iterdir():
        if not path.is_dir():
            continue
        if (path / "相框1.png").exists() or (path / "相框1.jpg").exists():
            return path
    raise FileNotFoundError("未找到 素材库/*/相框1.png，请确认 陪伴空间 目录存在")


def sync_frame(src_dir: Path, src_name: str, dst_stem: str) -> None:
    src_png = src_dir / src_name.replace(".jpg", ".png")
    src_jpg = src_dir / src_name.replace(".png", ".jpg")
    if src_png.exists():
        copy_png_asset(src_png, DST / "images" / "diary" / f"{dst_stem}.png")
    elif src_jpg.exists():
        copy_and_compress_image(src_jpg, DST / "images" / "diary" / f"{dst_stem}.jpg")
    else:
        print(f"  skip (missing): {src_name}")


def main():
    diary_src = find_companion_dir()
    print(f"== diary from {diary_src.relative_to(ROOT)} ==")
    sync_frame(diary_src, "相框1.png", "polaroid-frame-1")
    sync_frame(diary_src, "相框2.png", "polaroid-frame-2")
    copy_and_compress_image(diary_src / "草稿纸背景.jpg", DST / "images" / "diary" / "draft-paper-bg.jpg")
    print("done.")


if __name__ == "__main__":
    main()
