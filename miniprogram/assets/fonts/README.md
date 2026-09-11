# Vant 图标字体（可选）

`van-icon` 依赖 `vant-icon` 字体。启动时 `utils/load-vant-icon.js` 会：

1. 优先加载本目录 `vant-icon.woff2`（离线可用）
2. 失败则回退到 `at.alicdn.com` CDN

若开发者工具里图标全空白，可将字体放到此处后重新编译：

```
vant-icon.woff2
```

来源（与 @vant/weapp 内置一致）：

`https://at.alicdn.com/t/c/font_2553510_kfwma2yq1rs.woff2`
