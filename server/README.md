# 本地后端（单人开发用）

## 启动

```bash
cd server
copy .env.example .env    # 填入 AI_API_KEY 等（.env 不会提交 Git）
npm install
npm start
```

小程序 `app.js` 中设置 `useMock: false`，`apiBaseUrl: 'http://localhost:3000/api'`（真机需改为你电脑的局域网 IP）。

## 安全

- 密钥只写在 `.env`，参考 `.env.example`
- 用户上传图片存于 `uploads/`（已 gitignore）
- 提交前：`npm run check-secrets`

## 接口

- `POST /api/blend` — 溶图 + 返回 `diaryNote` / `fontStyle`（单图最大 10MB，可用 `MAX_UPLOAD_BYTES` 调整）
- `POST /api/roll` — 随机陪伴兽

多模态日记批注：在 `index.js` 的 `getDiaryNote()` 中接入视觉大模型，读取 `../ai/diary-prompts.json` 拼接 prompt。详见 `docs/diary-api.md`。
