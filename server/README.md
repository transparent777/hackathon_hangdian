# 本地后端（单人开发用）

## 启动

```bash
cd server
npm install
npm start
```

小程序 `app.js` 中设置 `useMock: false`，`apiBaseUrl: 'http://localhost:3000/api'`（真机需改为你电脑的局域网 IP）。

## 接口

- `POST /api/blend` — 溶图 + 返回 `diaryNote` / `fontStyle`
- `POST /api/roll` — 随机陪伴兽

多模态日记批注：在 `index.js` 的 `getDiaryNote()` 中接入视觉大模型，读取 `../ai/diary-prompts.json` 拼接 prompt。详见 `docs/diary-api.md`。
