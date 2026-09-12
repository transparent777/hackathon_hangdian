# 赛博陪伴相机 · B/C/D 对齐文件

> **更新**：2026-09-11（冻结日）  
> **发起人**：A（小程序前端）  
> **目的**：明确各方交付物、文件路径、联调方式，9/12 答辩前对齐

---

## 一、项目现状（A 侧已就绪）

小程序在 **Mock 模式**下可完整演示：

```
抽取陪伴兽 → 溶图 → 结果页（保存/分享）→ 历史回看 → 陪伴日记（加分项）
```

- 代码目录：`miniprogram/`
- 本地运行：微信开发者工具打开 `miniprogram/` → 构建 npm → 编译
- 当前 `miniprogram/app.js`：`useMock: true`（不依赖后端）

**A 已完成**：页面/UI、历史、分享、陪伴日记、接口调用层、接口文档、README、测试清单、bug 清零（P0）。

---

## 二、分工与你要交付的文件

### B · 后端 & 部署

| 交付项 | 文件/位置 | 说明 |
|--------|-----------|------|
| 接口实现 | `server/` 或云函数 | 至少 `POST /roll`、`POST /blend` |
| 接口文档 | `docs/api.md` | **按此实现**，字段勿擅自改 |
| 日记批注 | `docs/diary-api.md` | `/blend` 出参增加 `diaryNote`、`fontStyle` |
| 读 prompt | `ai/diary-prompts.json` | 多模态日记批注，已冻结 9/11 |
| 环境变量 | `server/.env`（本地，**勿提交**） | 模板见 `server/.env.example` |
| 线上地址 | 发给 A | HTTPS，用于小程序 `apiBaseUrl` |
| 合法域名 | 微信公众平台 | 配置 request + uploadFile 域名 |
| 健康检查 | `GET /api/health` | 本地 stub 已有，线上请保留 |

**`/blend` 入参（multipart）**

```
image        file      用户原图
characterId  string    naiwa | doro | maodie
rarity       string    普通 | 稀有 | 传说
openid       string    可选
```

**`/blend` 出参（JSON）**

```json
{
  "resultUrl": "https://...",
  "companionText": "今天在窗边陪你晒太阳",
  "diaryNote": "阳光落在书页上…",
  "fontStyle": "naiwa",
  "taskId": "blend-xxx"
}
```

**联调步骤（A 执行）**

1. B 提供 HTTPS 基址，如 `https://xxx.com/api`
2. A 改 `miniprogram/app.js`：`useMock: false`，`apiBaseUrl` 填该地址
3. 真机调试时改为电脑局域网 IP（开发阶段）
4. 冒烟：roll → blend → 结果页有图 → 日记有 `diaryNote`

**阻塞 A 的事项**：无 HTTPS 地址 / 出参字段不一致 / 溶图超时无降级。

---

### C · AI & 溶图 & 标杆图

| 交付项 | 文件/位置 | 说明 |
|--------|-----------|------|
| 溶图 prompt | `ai/prompts/naiwa.json` 等 | **已搭骨架（占位）**，联调时调优 |
| 日记 prompt | `ai/diary-prompts.json` | **已完成并冻结**，9/11 后仅改错别字 |
| 角色参考图 | `ai/references/` | 三角色参考，确保无隐私 |
| 标杆样图 ×3 | `pitch/samples/` | 答辩 PPT 第 5 页，命名见 `pitch/README.md` |
| 效果验收 | — | 溶图「角色像不像」由 C 拍板 |

**角色 ID（全仓库统一，勿改）**

| characterId | 名称 |
|-------------|------|
| `naiwa` | 奶蛙 |
| `doro` | doro |
| `maodie` | 耄耋 |

**日记批注**：B 溶图成功后调多模态，读 `ai/diary-prompts.json` 中对应角色 + 稀有度 prompt，输入**用户原图**（对原图看图说话，再用角色语气表达陪伴）。

**阻塞 B 的事项**：`providers/http.js` 真实溶图 API 未实现 / 参考图未放入 `ai/references/`。

---

### D · 文案 & 测试 & 答辩

| 交付项 | 文件/位置 | 说明 |
|--------|-----------|------|
| 陪伴语润色 | `ai/quotes.json` | 只改 `text` 数组内容，**不改** characterId 结构 |
| 功能回归 | `docs/qa-checklist.md` | 真机勾选，问题记入 `docs/bugs.md` |
| Bug 跟踪 | `docs/bugs.md` | P0 答辩前必须清零 |
| 30s 录屏 | `pitch/demo.mp4` | 分镜见 `docs/demo-script.md` |
| 答辩 PPT | `pitch/deck.pptx` | 大纲见 `docs/pitch-outline.md` |
| 主讲排练 | — | 9/11 排练 2 遍；现场 demo A 站旁边保底 |

**测试重点（9/11 冻结版）**

- 主流程：roll → 溶图 → 保存/分享
- 历史 Tab 回看；历史进入结果页**无**「再拍一张/返回首页」
- 我的 → 陪伴日记手账页
- 体验版上传包体 < 2MB（已压缩开场视频）

**阻塞答辩的事项**：无 `pitch/demo.mp4` 备用 / PPT 未完成 / P0 bug 未关。

---

## 三、协作接口图

```
C ── ai/prompts/*.json ──────────► B ── /blend /roll ──► A (api.js)
C ── ai/diary-prompts.json ─────► B
D ── ai/quotes.json (润色) ─────► B (可选，roll 陪伴语)
D ── qa-checklist / bugs.md ────► A (修 bug)
C ── pitch/samples/ ────────────► D (放进 PPT)
```

---

## 四、今日站会快速同步（复制发群）

```
【9/11 冻结日对齐】

A：小程序 Mock 全流程 + 陪伴日记已上线，P0 已清，见 docs/qa-checklist.md

请 B 确认：
1. 何时能给 HTTPS apiBaseUrl？
2. /blend 是否按 docs/api.md + docs/diary-api.md 实现？
3. 何时联调？（我改 app.js useMock:false）

请 C 确认：
1. ai/prompts/ 三角色溶图 prompt 何时给 B？
2. pitch/samples/ 三张标杆图何时就绪？

请 D 确认：
1. ai/quotes.json 润色完成时间？
2. pitch/deck.pptx + demo.mp4 今晚能否齐？
3. 按 qa-checklist 回归一轮，bug 记 docs/bugs.md

```

---

## 五、仓库关键路径速查

```
hackathon_hangdian/
├── miniprogram/              # A · 小程序（工具打开此目录）
│   └── app.js                # useMock / apiBaseUrl 联调开关
├── server/                   # B · 后端
├── ai/
│   ├── prompts/              # C · 溶图 prompt（待补）
│   ├── diary-prompts.json    # C · 日记 prompt（已冻结）
│   └── quotes.json           # D · 陪伴语（待润色）
├── docs/
│   ├── api.md                # B 接口合同
│   ├── diary-api.md          # B 日记批注合同
│   ├── qa-checklist.md       # D 测试清单
│   └── bugs.md               # D bug 跟踪
└── pitch/
    ├── samples/              # C · 标杆图
    ├── demo.mp4              # D · 录屏
    └── deck.pptx             # D · PPT
```

---

## 六、联系方式与阻塞升级

| 问题类型 | 找谁 | 升级 |
|----------|------|------|
| 页面/UI/小程序 | A | — |
| 接口/部署/域名 | B | 无 API 则答辩用 Mock + demo.mp4 |
| 溶图效果/prompt | C | — |
| 文案/测试/PPT | D | — |

**答辩 Demo 预案**：现场 API 崩了 → Mock 模式演示 + 播放 `pitch/demo.mp4` + `pitch/samples/` 静态样图。

---

*本文档由 A 维护，有变更请同步更新并 @全员。*
