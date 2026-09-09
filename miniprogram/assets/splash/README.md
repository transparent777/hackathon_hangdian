# 开场动画

- 小程序播放：`intro.mp4`（720p 压缩版，约 260KB）
- 高清源文件：`素材库/封面/开场2.0.mp4`
- 本地备份：`intro-source-1080p.mp4`（不提交 git，仅本地参考）

更新流程：
1. 把新视频放到 `素材库/封面/`
2. 用 ffmpeg 压缩后覆盖 `intro.mp4`
3. 递增 `utils/splash-video.js` 的 `SPLASH_VIDEO_VERSION`
4. 重新编译

压缩命令参考：
```bash
ffmpeg -y -i 源视频.mp4 -an -vf "scale=720:-2" -c:v libx264 -crf 32 -maxrate 1000k -bufsize 2000k -preset fast -movflags +faststart intro.mp4
```
