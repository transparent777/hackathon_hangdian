# 开场动画

- 小程序播放：`intro.mp4`（**必须 ≤ 200KB**）
- 源文件：`素材库/封面/开场2.0.mp4`

更新后运行：

```bash
python scripts/sync_assets.py   # 若从素材库同步
python scripts/check_assets_size.py
```

并在 `utils/splash-video.js` 递增 `SPLASH_VIDEO_VERSION`。
