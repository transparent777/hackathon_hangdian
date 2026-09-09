#!/usr/bin/env python3
"""从 素材库/ 同步资源到 miniprogram/（素材库本身不进 Git）"""

from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "素材库"
DST = ROOT / "miniprogram"

CHAR_MAP = {"naiwa": "奶蛙", "doro": "doro", "maodie": "耄耋"}
RARITY_MAP = {"普通": "normal", "稀有": "rare", "传说": "legendary"}


def copy_if_exists(src: Path, dst: Path) -> bool:
    if not src.exists():
        print(f"  skip (missing): {src.relative_to(ROOT)}")
        return False
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    print(f"  ok: {dst.relative_to(ROOT)} ({dst.stat().st_size // 1024} KB)")
    return True


def main():
    print("== banner ==")
    copy_if_exists(SRC / "主页" / "banner.jpg", DST / "images" / "placeholders" / "home-banner.jpg")

    print("== character covers ==")
    for cid, cn in CHAR_MAP.items():
        for r_cn, r_en in RARITY_MAP.items():
            copy_if_exists(
                SRC / "主页" / "陪伴兽" / cn / f"{r_cn}.jpg",
                DST / "images" / "characters" / "covers" / cid / f"{r_en}.jpg",
            )

    print("done. commit miniprogram/images/ only, not 素材库/")


if __name__ == "__main__":
    main()
