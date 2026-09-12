# 赛博陪伴相机

每天随机抽取一只热门虚拟陪伴兽（奶蛙 / doro / 耄耋），溶进你的真实生活照片，生成「赛博陪伴」瞬间。

> 杭电 Hackathon 参赛作品 · 微信小程序

[![License](https://img.shields.io/badge/license-learning%20only-blue)](LICENSE)

---

## 项目简介

**赛博陪伴相机**是一款面向年轻微信用户的轻量陪伴类产品：无需注册登录、无需重度养成，打开小程序即可 Roll 一只 meme 角色，拍照或选图后由 AI 将角色溶入真实场景，配上陪伴语与手账式日记批注，生成可保存、可分享的「赛博陪伴」瞬间。

**目标用户**：熟悉网络梗文化的 Z 世代用户，在独居或碎片化生活中渴望轻量情感连接，但不愿投入复杂养成或社交成本。

**答辩 Demo**：Roll 到「耄耋」→ 拍书桌 → 出图「耄耋趴在键盘旁」+ 陪伴语 → 保存分享。

详细产品说明见 [docs/PRD.md](docs/PRD.md)。

---

## 功能概览

| 模块 | 说明 |
|------|------|
| 每日抽取 | 随机 Roll 陪伴兽，含普通 / 稀有 / 传说三档稀有度 |
| AI 溶图 | 拍照或相册选图，多策略 AI 将角色融入生活场景 |
| 结果页 | 拍立得风格展示 + 陪伴语，支持保存相册与转发好友 |
| 历史记录 | 本地保存最近 10 条溶图，点击回看 |
| 陪伴日记 | 手账式时间线，AI 批注按角色字体与稀有度展示（加分项） |

## 体验路径

```
打开小程序 → 抽取今日陪伴兽 → 拍照/选图 → 溶图 → 保存/分享
                ↓
         历史 Tab 回看 / 我的 → 陪伴日记
```

---

## 技术架构

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ 微信小程序   │────▶│ Node API      │────▶│ 本地 uploads │
│ 拍照/Roll/UI │     │ roll/blend   │     │ 原图/结果图  │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        Seedream Pro   U2Net-P      DeepSeek
        溶图候选生成    前景分割      日记批注
```

| 层 | 选型 |
|----|------|
| 小程序 | 微信原生 + [Vant Weapp](https://github.com/youzan/vant-weapp) |
| 后端 | Node.js + Express（`server/`） |
| AI 溶图 | Seedream Pro（火山方舟）+ U2Net-P 本地分割 + Sharp 合成 |
| AI 日记 | DeepSeek Flash 多模态看图批注 |
| 存储 | 本地 `wx.storage`（历史）；后端 `uploads/`（联调） |

溶图支持三种策略热切换：`seedream-full`（效果优先）/ `hybrid`（背景保真）/ `asset-composite`（确定性贴纸）。详见 [server/README.md](server/README.md)。

---

## 团队分工

| 成员 | 角色 | 职责 |
|------|------|------|
| **队长（A + C）** | 前端 + AI 内容 | 小程序全栈体验、溶图 Prompt、多策略 AI 管线、效果验收 |
| **队员 B** | 后端 & 基建 | API 服务、AI 接入、部署联调、接口文档 |
| **队员 D** | 产品 & 测试 & 答辩 | 文案配置、全流程测试、文档维护、答辩主讲 |

技术报告：[docs/report-a.md](docs/report-a.md) · [docs/report-c.md](docs/report-c.md)

---

## 目录结构

```
hackathon_hangdian/
├── miniprogram/              # 微信小程序（队长 A）
│   ├── pages/                # index / camera / result / history / diary / me
│   ├── utils/                # API、角色、历史、日记等工具
│   ├── components/           # splash-overlay、action-pill 等
│   └── images/               # 角色封面、日记素材
├── server/                   # Node 后端（队员 B）
│   └── services/ai/          # 溶图编排、合成、日记、Provider
├── ai/                       # AI 配置层（队长 C）
│   ├── prompts/              # 三角色溶图 + 合成 prompt
│   ├── diary-prompts.json    # 陪伴日记多模态 prompt
│   ├── quotes.json           # 陪伴语池
│   └── references/           # 角色参考图 manifest
├── docs/                     # 文档（队员 D 维护）
│   ├── PRD.md                # 产品需求 / 创作说明
│   ├── api.md                # 接口说明
│   └── qa-checklist.md       # 功能测试清单
├── pitch/                    # 答辩素材
├── scripts/                  # 素材同步、体积检查、敏感信息扫描
├── PLAN.md                   # 团队分工与倒排计划
└── README.md
```

---

## 快速开始

### 环境要求

- [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)（稳定版）
- Node.js 18+（联调后端时需要）
- Python 3（hybrid 分割模式 / 素材同步时需要）

### 1. 运行小程序

```bash
cd miniprogram
npm install
```

1. 用微信开发者工具打开 **`miniprogram/`** 目录（注意不是仓库根目录）
2. 菜单：**工具 → 构建 npm**
3. 编译运行

默认配置（`miniprogram/app.js`）：

```js
globalData: {
  apiBaseUrl: 'http://127.0.0.1:3000/api',  // 开发者工具用 127.0.0.1
  useMock: false                             // false = 溶图走真实后端
}
```

> Roll 抽取始终为本地随机，无需后端。仅溶图与日记批注需要启动 `server/`。

### 2. 联调本地后端

```bash
cd server
copy .env.example .env   # Windows；macOS/Linux 用 cp
# 编辑 .env，填入 AI_API_KEY、AI_DIARY_API_KEY
npm install
npm start
```

真机调试时将 `apiBaseUrl` 改为电脑局域网 IP，并同步修改 `server/.env` 中的 `PUBLIC_BASE_URL`。上线前须在微信公众平台配置 request / uploadFile 合法域名（HTTPS）。

### 3. 同步素材（可选）

本地源文件放在 `素材库/`（不进 Git）：

```bash
python scripts/sync_assets.py          # 全量同步（封面、开场视频、角色图等）
python scripts/sync_blend_assets.py    # 溶图参考图与透明动作素材
python scripts/check_assets_size.py    # 检查微信包体积限制
```

---

## 配置说明

| 文件 | 作用 |
|------|------|
| `miniprogram/app.js` | `apiBaseUrl`、`useMock` 开关 |
| `miniprogram/project.config.json` | 小程序 AppID、打包忽略规则 |
| `server/.env` | AI API Key、溶图策略等（勿提交 Git） |
| `ai/config.json` | 模型名、超时等非敏感 AI 默认项 |
| `ai/prompts/*.json` | 三角色溶图 + 合成配置 |
| `ai/diary-prompts.json` | 三角色 × 三稀有度日记批注 prompt |
| `ai/quotes.json` | Roll / 结果页陪伴语池 |

密钥与安全规范见 [docs/security.md](docs/security.md)。

---

## 角色 IP

| characterId | 名称 | 气质 |
|-------------|------|------|
| `naiwa` | 奶蛙 | 荒诞戏谑、摆烂松弛 |
| `doro` | doro（多洛） | 呆萌奶音、爱吃橘子 |
| `maodie` | 耄耋（猫爹） | 暴躁野性、嘴硬心软 |

角色形象版权归各原作方，本项目仅供学习与交流，请勿用于商业用途。

---

## 上传与体积限制

微信小程序**主包 ≤ 2MB**。上传前注意：

- 开场视频 `assets/splash/intro.mp4` 须 **≤ 1.5MB**（可用 `sync_assets.py` 自动压缩）
- 勿提交 `node_modules/`、`素材库/`、`.env`、`ai/references/**` 二进制
- 上传失败 Timeout 时：清缓存 → 检查包体积 → 换网络重试

```bash
node scripts/check-secrets.js   # 提交前敏感信息扫描
```

---

## 相关文档

| 文档 | 内容 |
|------|------|
| [docs/PRD.md](docs/PRD.md) | **产品需求文档 / 创作说明** |
| [PLAN.md](PLAN.md) | 团队分工与倒排日程 |
| [docs/api.md](docs/api.md) | 接口说明 |
| [docs/diary-api.md](docs/diary-api.md) | 陪伴日记接口约定 |
| [docs/qa-checklist.md](docs/qa-checklist.md) | 功能测试清单 |
| [docs/bugs.md](docs/bugs.md) | Bug 跟踪 |
| [docs/demo-script.md](docs/demo-script.md) | 30s 录屏脚本 |
| [docs/pitch-outline.md](docs/pitch-outline.md) | 答辩 PPT 大纲 |
| [docs/report-a.md](docs/report-a.md) | 前端技术报告 |
| [docs/report-c.md](docs/report-c.md) | AI 技术报告 |
| [docs/素材库.md](docs/素材库.md) | 本地素材同步说明 |
| [server/README.md](server/README.md) | 后端启动与 AI 架构 |
| [ai/README.md](ai/README.md) | AI 配置层说明 |

---

## License

本项目为 Hackathon 参赛作品，代码仅供学习与交流使用。角色形象版权归各原作方，请勿用于商业用途。
