# 赛博陪伴相机

每天随机抽取一只热门虚拟陪伴兽（奶蛙 / doro / 耄耋），溶进你的真实生活照片，生成「赛博陪伴」瞬间。

> 杭电 hackathon 项目 · 微信小程序

## 功能概览

| 模块 | 说明 |
|------|------|
| 每日抽取 | 随机 roll 陪伴兽，含普通 / 稀有 / 传说稀有度 |
| AI 溶图 | 拍照或相册选图，生成角色融入生活的结果图 |
| 结果页 | 拍立得风格展示 + 陪伴语，支持保存相册与分享 |
| 历史记录 | 本地保存最近 10 条溶图，点击回看 |
| 陪伴日记 | 手账式时间线，AI 批注按角色字体与稀有度展示（加分项） |

## 体验路径

```
打开小程序 → 抽取今日陪伴兽 → 拍照/选图 → 溶图 → 保存/分享
                ↓
         历史 Tab 回看 / 我的 → 陪伴日记
```

**答辩 Demo**：roll 到「耄耋」→ 拍书桌 → 出图「耄耋趴在键盘旁」+ 陪伴语 → 保存分享。

## 技术栈

| 层 | 选型 |
|----|------|
| 小程序 | 微信原生 + [Vant Weapp](https://github.com/youzan/vant-weapp) |
| 后端 | Node.js + Express（`server/`） |
| AI | 溶图 API + 多模态日记批注（`ai/diary-prompts.json`） |
| 存储 | 本地 `wx.storage`（历史）；后端 `uploads/`（联调） |

当前默认 **Mock 模式**

## 目录结构

```
hackathon_hangdian/
├── miniprogram/          # 微信小程序
│   ├── pages/            # index / camera / result / history / diary / me
│   ├── utils/            # API、角色、历史、日记等工具
│   ├── components/       # 公共组件
│   └── images/           # 角色封面、日记素材等
├── server/               # 本地后端（溶图 / roll / 日记批注）
├── ai/
│   └── diary-prompts.json  # 陪伴日记多模态 prompt
├── scripts/              # 素材同步、体积检查、敏感信息扫描
├── docs/                 # 接口、安全、测试清单等文档
└── PLAN.md               # 团队分工与倒排计划
```

## 快速开始

### 环境要求

- [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)（稳定版）
- Node.js 18+（仅联调后端时需要）
- Python 3（同步/压缩素材时需要）

### 1. 运行小程序（Mock 模式）

```bash
# 安装 Vant 组件并构建 npm
cd miniprogram
npm install
```

1. 用微信开发者工具打开 **`miniprogram/`** 目录（注意不是仓库根目录）
2. 菜单：**工具 → 构建 npm**
3. 确认 `miniprogram/app.js` 中 `useMock: true`
4. 编译运行

### 2. 联调本地后端（可选）

```bash
cd server
copy .env.example .env   # Windows；macOS/Linux 用 cp
npm install
npm start
```

修改 `miniprogram/app.js`：

```js
globalData: {
  apiBaseUrl: 'http://localhost:3000/api',  // 真机调试改为电脑局域网 IP
  useMock: false
}
```

在微信公众平台配置 request / uploadFile 合法域名（上线前必须 HTTPS）。

### 3. 同步素材（可选）

本地源文件放在 `素材库/`（不进 Git），运行：

```bash
python scripts/sync_assets.py          # 全量同步（封面、开场视频、角色图等）
python scripts/sync_diary_assets.py    # 仅陪伴日记素材
python scripts/check_assets_size.py    # 检查是否超过微信体积限制
```

## 配置说明

| 文件 | 作用 |
|------|------|
| `miniprogram/app.js` | `apiBaseUrl`、`useMock` 开关 |
| `miniprogram/project.config.json` | 小程序 AppID、打包忽略规则 |
| `server/.env` | AI API Key 等密钥（勿提交 Git） |
| `ai/diary-prompts.json` | 三角色 × 三稀有度日记批注 prompt |

密钥与安全规范见 [docs/security.md](docs/security.md)。

## 上传与体积限制

微信小程序**主包 ≤ 2MB**。上传前注意：

- 开场视频 `assets/splash/intro.mp4` 须 **≤ 1.5MB**（可用 `sync_assets.py` 自动压缩）
- 勿提交 `node_modules/`、`素材库/`、`.env`
- 上传失败 Timeout 时：先清缓存，检查包体积，换网络重试

```bash
# 提交前敏感信息扫描
node scripts/check-secrets.js
```

## 相关文档

| 文档 | 内容 |
|------|------|
| [PLAN.md](PLAN.md) | 产品定义、分工、倒排日程 |
| [docs/diary-api.md](docs/diary-api.md) | 陪伴日记接口约定 |
| [docs/qa-checklist.md](docs/qa-checklist.md) | 功能测试清单（9/11 冻结回归） |
| [docs/bugs.md](docs/bugs.md) | Bug 跟踪 |
| [docs/api.md](docs/api.md) | 接口说明 |
| [docs/demo-script.md](docs/demo-script.md) | 30s 录屏脚本 |
| [docs/pitch-outline.md](docs/pitch-outline.md) | 答辩 PPT 大纲 |
| [docs/素材库.md](docs/素材库.md) | 本地素材同步说明 |
| [server/README.md](server/README.md) | 后端启动与接口 |

## 角色 IP

| characterId | 名称 | 气质 |
|-------------|------|------|
| `naiwa` | 奶蛙 | 荒诞戏谑、摆烂松弛 |
| `doro` | doro（多洛） | 呆萌奶音、爱吃橘子 |
| `maodie` | 耄耋（猫爹） | 暴躁野性、嘴硬心软 |

## License

本项目为 hackathon 参赛作品，代码仅供学习与交流使用。角色形象版权归各原作方，请勿用于商业用途。
