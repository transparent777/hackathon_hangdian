# 安全与敏感信息管理

## 原则

**永远不要提交到 Git：**
- 真实 AppID / AppSecret（若写在私有配置里）
- AI API Key、OSS 密钥
- `.env` 文件
- 用户上传的私人照片（测试图也别进仓库）

**可以提交：**
- `project.config.json`（AppID 用占位符）
- `project.private.config.json.example`（模板）

**不要提交：**
- `.env`（后端本地密钥，B 自建即可，无需模板文件）

---

## 各角色怎么用

### A（小程序前端）

```bash
cd miniprogram
cp project.private.config.json.example project.private.config.json
# 编辑 project.private.config.json，填入真实 AppID
```

- `project.private.config.json` 已被 `.gitignore`，不会误提交
- **不要**再把真实 AppID 写进 `project.config.json`

### B（后端）

- 在 `server/` 目录自建 `.env`，填入密钥
- `.env` 已被 `.gitignore`，不会误提交
- 代码里用 `process.env.AI_API_KEY` 读取，禁止硬编码

### C（AI）

- API Key 交给 B 写入服务器 `.env`，**不要**写进 `ai/prompts/*.json`
- 参考图放 `ai/references/` 可以提交（确保无个人隐私）

### 全员

提交前自检：

```bash
git status
git diff --staged
```

看到 `.env`、`project.private.config.json`、含 key 的文件 → **不要 commit**

---

## 已误提交密钥怎么办

1. 立即在对应平台**轮换/重置**密钥（微信后台、AI 厂商控制台）
2. 从 Git 删除提交（你们已对 AppID 提交做过 `reset`）
3. 若密钥曾推上 GitHub，视为已泄露，必须重置

---

## 推荐：提交前钩子（可选）

安装 [git-secrets](https://github.com/awslabs/git-secrets) 或团队约定：push 前跑：

```bash
git diff --staged | findstr /i "apikey secret password appsecret"
```

有输出则先检查再提交。
