#!/usr/bin/env python3
"""从 素材库/ 同步并压缩资源到 miniprogram/"""

from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "素材库"
DST = ROOT / "miniprogram"
IMAGE_MAX_BYTES = 200 * 1024
VIDEO_MAX_BYTES = int(1.5 * 1024 * 1024)

CHAR_MAP = {"naiwa": "奶蛙", "doro": "doro", "maodie": "耄耋"}
RARITY_MAP = {"普通": "normal", "稀有": "rare", "传说": "legendary"}

MEDIA_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp3", ".wav", ".aac", ".m4a", ".mp4"}
FFMPEG = shutil.which("ffmpeg")


def compress_jpeg(path: Path, max_width: int = 720, quality: int = 68) -> None:
    from PIL import Image

    im = Image.open(path)
    if im.width > max_width:
        im = im.resize((max_width, int(im.height * max_width / im.width)), Image.Resampling.LANCZOS)
    if im.mode != "RGB":
        im = im.convert("RGB")

    for q in range(quality, 40, -6):
        im.save(path, "JPEG", quality=q, optimize=True)
        if path.stat().st_size <= IMAGE_MAX_BYTES:
            return

    im.save(path, "JPEG", quality=40, optimize=True)


def compress_intro_video(path: Path) -> None:
    if not FFMPEG:
        raise RuntimeError("未找到 ffmpeg，无法压缩开场视频")

    tmp = path.with_suffix(".tmp.mp4")
    cmd = [
        FFMPEG, "-y", "-i", str(path), "-an",
        "-vf", "scale=1080:-2",
        "-c:v", "libx264", "-crf", "24",
        "-maxrate", "2500k", "-bufsize", "5000k",
        "-preset", "medium", "-movflags", "+faststart",
        str(tmp),
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    tmp.replace(path)


def ensure_image_under_limit(path: Path) -> None:
    if path.stat().st_size <= IMAGE_MAX_BYTES:
        return
    if path.suffix.lower() in {".jpg", ".jpeg"}:
        compress_jpeg(path)
    if path.stat().st_size > IMAGE_MAX_BYTES:
        raise RuntimeError(f"{path.relative_to(ROOT)} 仍超过 200KB ({path.stat().st_size // 1024} KB)")


def ensure_video_under_limit(path: Path) -> None:
    if path.stat().st_size <= VIDEO_MAX_BYTES:
        return
    compress_intro_video(path)
    if path.stat().st_size > VIDEO_MAX_BYTES:
        raise RuntimeError(
            f"{path.relative_to(ROOT)} 仍超过 1.5MB ({path.stat().st_size // 1024} KB)，请提高 CRF 或降低分辨率"
        )


def copy_and_compress_image(src: Path, dst: Path) -> bool:
    if not src.exists():
        print(f"  skip (missing): {src.relative_to(ROOT)}")
        return False
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    ensure_image_under_limit(dst)
    print(f"  ok: {dst.relative_to(ROOT)} ({dst.stat().st_size // 1024} KB)")
    return True


def copy_png_asset(src: Path, dst: Path) -> bool:
    """复制 PNG 相框等需保留透明通道的素材"""
    if not src.exists():
        print(f"  skip (missing): {src.relative_to(ROOT)}")
        return False
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    if dst.stat().st_size > IMAGE_MAX_BYTES:
        from PIL import Image

        im = Image.open(dst)
        im.save(dst, "PNG", optimize=True)
    if dst.stat().st_size > IMAGE_MAX_BYTES:
        raise RuntimeError(f"{dst.relative_to(ROOT)} 仍超过 200KB ({dst.stat().st_size // 1024} KB)")
    print(f"  ok: {dst.relative_to(ROOT)} ({dst.stat().st_size // 1024} KB)")
    return True


def copy_intro_video(src: Path, dst: Path) -> bool:
    if not src.exists():
        print(f"  skip (missing): {src.relative_to(ROOT)}")
        return False
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    ensure_video_under_limit(dst)
    print(f"  ok: {dst.relative_to(ROOT)} ({dst.stat().st_size // 1024} KB)")
    return True


def audit_miniprogram() -> list:
    bad = []
    intro = DST / "assets" / "splash" / "intro.mp4"
    for path in DST.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in MEDIA_SUFFIXES:
            continue
        limit = VIDEO_MAX_BYTES if path == intro else IMAGE_MAX_BYTES
        size = path.stat().st_size
        if size > limit:
            bad.append((path.relative_to(ROOT), size, limit))
    return bad


def main():
    print("== intro video ==")
    copy_intro_video(SRC / "封面" / "开场2.0.mp4", DST / "assets" / "splash" / "intro.mp4")

    print("== banner ==")
    copy_and_compress_image(SRC / "主页" / "banner.jpg", DST / "images" / "placeholders" / "home-banner.jpg")

    print("== character covers ==")
    for cid, cn in CHAR_MAP.items():
        for r_cn, r_en in RARITY_MAP.items():
            copy_and_compress_image(
                SRC / "主页" / "陪伴兽" / cn / f"{r_cn}.jpg",
                DST / "images" / "characters" / "covers" / cid / f"{r_en}.jpg",
            )

    print("== diary (陪伴空间) ==")
    diary_src = next(
        (p for p in SRC.iterdir() if p.is_dir() and ((p / "相框1.png").exists() or (p / "相框1.jpg").exists())),
        SRC / "陪伴空间",
    )
    frame1 = diary_src / "相框1.png" if (diary_src / "相框1.png").exists() else diary_src / "相框1.jpg"
    frame2 = diary_src / "相框2.png" if (diary_src / "相框2.png").exists() else diary_src / "相框2.jpg"
    dst1 = DST / "images" / "diary" / ("polaroid-frame-1.png" if frame1.suffix.lower() == ".png" else "polaroid-frame-1.jpg")
    dst2 = DST / "images" / "diary" / ("polaroid-frame-2.png" if frame2.suffix.lower() == ".png" else "polaroid-frame-2.jpg")
    if frame1.suffix.lower() == ".png":
        copy_png_asset(frame1, dst1)
    else:
        copy_and_compress_image(frame1, dst1)
    if frame2.suffix.lower() == ".png":
        copy_png_asset(frame2, dst2)
    else:
        copy_and_compress_image(frame2, dst2)
    copy_and_compress_image(diary_src / "草稿纸背景.jpg", DST / "images" / "diary" / "draft-paper-bg.jpg")

    print("== audit ==")
    bad = audit_miniprogram()
    if bad:
        for rel, size, limit in bad:
            print(f"  OVER: {rel} ({size // 1024} KB > {limit // 1024} KB)")
        sys.exit(1)

    print("done. 图像/音频 ≤ 200KB，开场视频 ≤ 1.5MB")


if __name__ == "__main__":
    main()
