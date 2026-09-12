# 技术报告 C：AI 与内容（Role C）

> 赛博陪伴相机 · 杭电 Hackathon  
> 负责人：C（AI & 内容）  
> 报告日期：2026-09-12

---

## 1. 职责与交付对照

| 计划交付物 | 实际状态 |
|-----------|---------|
| 溶图 API + prompt 调优 | ✅ 三层溶图策略已实现 |
| `ai/prompts/*.json` 三角色 | ✅ naiwa / doro / maodie |
| `ai/quotes.json` 陪伴语 | ✅ 每角色 5 条 |
| `ai/diary-prompts.json` | ✅ 2026-09-11 冻结 |
| `ai/references/` 参考图 | ⚠️ manifest 已维护，二进制被 gitignore |
| `pitch/samples/` 标杆样图 | ❌ 目录为空，待交付 |
| 效果验收 ≥7/10 | 无自动化脚本，依赖人工 |

---

## 2. 技术架构演进

计划初版为「单一溶图 API」，实际演进为 **多策略 AI 管线**：

```
用户原图 + characterId + rarity
        │
        ▼
blend.js ──读──► ai/prompts/{id}.json
        │
        ├─ seedream-full ──► 火山方舟 Seedream Pro（直接返回完整候选图）
        │
        ├─ hybrid ──► Seedream 候选 → U2Net-P 分割 → Sharp 背景恢复
        │
        └─ asset-composite ──► DeepSeek 场景分析 → 透明 PNG 贴纸合成
        │
        ▼
溶图 resultUrl
        │
        ▼
diary.js ──读──► ai/diary-prompts.json → DeepSeek 多模态批注
        │
        ▼
diaryNote + fontStyle → 返回前端
```

---

## 3. Prompt 配置体系

### 3.1 溶图 Prompt（`ai/prompts/*.json`）

每个角色 JSON 含四层配置：

| 字段 | 用途 |
|------|------|
| `characterId` / `name` | 角色标识 |
| `referenceImage` | 主参考图（相对 `ai/references/`） |
| `blend` | Seedream 溶图：prompt、negativePrompt、editRegion |
| `composition` | 本地合成：identityLock、variants、defaultAnchor/Scale |

doro 示例结构：

```json
{
  "characterId": "doro",
  "name": "doro",
  "referenceImage": "references/doro.jpg",
  "blend": {
    "prompt": "在编辑区域添加「doro」桌面小宠物：可爱造型、粗黑描边...",
    "negativePrompt": "背景修改, 重绘背景, 改变构图...",
    "editRegion": { "x": 0.32, "y": 0.58, "w": 0.36, "h": 0.22 }
  },
  "composition": {
    "identityLock": "保持粉色头发、紫色眼睛、白色身体...",
    "variants": [
      { "id": "01", "file": "variants/doro/01.png", "description": "举手兴奋庆祝" }
    ]
  }
}
```

三角色差异：

| 角色 | 溶图约束 | variants | 特殊 |
|------|---------|----------|------|
| 奶蛙 | 圆润粗描边、摆烂气质；禁写实青蛙/3D | 5 个 PNG | identityLock 锁定奶黄身体 |
| doro | 放空软糯；禁写实动物/3D | 5 个 PNG | 粉色头发、紫色眼睛 |
| 耄耋 | 圆头无耳梗图；禁真猫/真狗 | 2 个 | `base` 含 SVG cutout 矢量蒙版 |

`editRegion` 三角色统一为 `{ x: 0.32, y: 0.58, w: 0.36, h: 0.22 }`（画面下方中央桌面区域）。

### 3.2 陪伴语（`ai/quotes.json`）

- 结构：`{ "naiwa": [...], "doro": [...], "maodie": [...] }`
- 每角色 5 条 `text`，用于 `/roll` 与 `/api/blend` 的 `companionText`
- 与 `diaryNote`（看图批注）为独立字段
- 读取链路：`prompts.js` → `pickQuote()` → roll / blend 响应

### 3.3 日记批注 Prompt（`ai/diary-prompts.json`）

- 三角色 × 三稀有度（normal/rare/legendary）矩阵
- 每格含：`maxLength`、`tone`、`prompt`
- 禁词：`作为AI`、`图片中`、`这张照片`、`用户`、`生成` 等
- `fontStyle` 仅用于前端手账字体，不参与 AI 请求

| 角色 | fontStyle | 普通字数 | 稀有字数 | 传说字数 |
|------|-----------|----------|----------|----------|
| 奶蛙 | `naiwa` | 36 | 52 | 72 |
| doro | `doro` | 30 | 48 | 64 |
| 耄耋 | `maodie` | 40 | 56 | 76 |

---

## 4. 溶图三策略详解

默认策略见 `ai/config.json`：

```json
{
  "blend": {
    "defaultStrategy": "seedream-full",
    "timeoutMs": 90000,
    "maxRetries": 1
  }
}
```

| 策略 | 流程 | 背景保真 | 适用场景 |
|------|------|---------|---------|
| `seedream-full` | Seedream 双图编辑 → 直接返回 | 可能微改 | 效果优先（默认） |
| `hybrid` | Seedream 候选 → U2Net-P 分割 → 叠回原图 | 像素级校验 | 背景不变 |
| `asset-composite` | DeepSeek 场景分析 → 透明 PNG 合成 | 完全不变 | 确定性贴纸 |

### 4.1 Seedream 溶图（`providers/http.js`）

- **提供商**：火山方舟 `https://ark.cn-beijing.volces.com`
- **端点**：`POST /api/v3/images/generations`
- **模型**：`doubao-seedream-5-0-pro-260628`（Pro 5.0）
- **输入**：`[用户原图 dataUri, 角色参考图 dataUri]` 双图编辑
- **Prompt 拼装**：全局约束 + 角色 prompt + negativePrompt + 编辑区域坐标 + scenePlan 动态调整
- **输出**：下载到 `server/uploads/`，返回 `resultUrl`

### 4.2 场景分析（`scene.js` + `deepseek.js`）

- 输入：用户生活照 + variants 候选列表
- 输出 JSON：`variantId`、`expression`、`action`、`anchor`、`scale`、`rotation`
- 约束：anchor 落在桌面/台面，scale 0.18–0.30，不遮挡人脸
- 失败降级：`buildFallbackScenePlan()` 使用 defaultVariant
- **仅在** `asset-composite` / `hybrid` 路径使用；`seedream-full` 不经过场景分析

### 4.3 前景分割（`segmenter.js`）

- Python 脚本 `server/scripts/segment_foreground.py` + `server/models/u2netp.onnx`（U2Net-P）
- 按 scenePlan 或 editRegion 裁剪关注区域
- 环境变量：`AI_SEGMENT_PYTHON`、`AI_SEGMENT_MODEL_PATH`

### 4.4 确定性合成（`compositor.js`）

- `composeCharacter()`：透明 PNG/SVG cutout → Sharp 缩放、旋转、投影 → 叠到原图
- `composeGeneratedCharacter()`：AI 候选 + 蒙版 → 提取角色 → 叠回原图
- `assertBackgroundPreserved()`：逐像素比对，确保 hybrid 模式背景不变
- 耄耋 `base` variant 使用 SVG cutout 矢量蒙版保证圆头贴图质量

---

## 5. 陪伴日记批注

- **触发**：`/api/blend` 溶图成功后串行调用 `runDiary()`
- **输入图**：溶图结果（角色已融入场景）
- **模型**：DeepSeek Flash 多模态（`deepseek-flash`）
- **Prompt**：`global.systemPrompt` + 角色 `voice` + 稀有度 `prompt` + `outputRules`
- **后处理**：禁词过滤、最短 4 字、按 maxLength 截断、最多 2 次重试
- **降级**：`fallbacks.js` 预设文案池（每角色 × 每稀有度 2 条）

---

## 6. 多层降级机制

计划预案「角色崩图 → 贴纸 PNG 前端叠图」，实际实现为 **后端多级降级**：

| 层级 | 机制 | 用户感知 |
|------|------|---------|
| L1 | `seedream-full` 直接返回 AI 图 | 最佳融合 |
| L2 | hybrid 分割失败 → 保留 AI 候选图 | 结果页标「AI 完整图」 |
| L3 | 候选生成失败 → `asset-composite` 透明 PNG | 结果页标「基础合成」 |
| L4 | `AI_MODE=mock` | 原图 + 本地贴纸 |
| 日记 | DeepSeek 失败 → `fallbacks.js` | `diaryProvider: mock-fallback` |

响应字段：`degraded`、`failedStage`（`candidate_generation` / `foreground_segmentation` / `background_composite`）、`fallbackReason`。

前端 `result` 页已处理降级状态并显示提示；拍照页 sticker 仅作选图前预览，非溶图失败兜底。

---

## 7. Prompt 加载与使用链路

```
ai/prompts/{characterId}.json
        │
        ▼
prompts.js::loadBlendPrompt()     # 内存缓存
        ├─ buildBlendPromptText()      → blend.js → http.js
        ├─ getCompositionProfile()     → scene.js / compositor.js
        ├─ resolveReferenceImagePath() → http.js 参考图
        └─ resolveVariantImagePath()   → asset-composite 素材路径

ai/diary-prompts.json
        │
        ▼
prompts.js::getDiaryPromptBundle() → diary.js → deepseek.js

ai/quotes.json
        │
        ▼
prompts.js::pickQuote() → roll / blend 响应 companionText
```

参考图解析优先级：

1. JSON 中 `referenceImage`
2. `ai/references/{id}.jpg|.png`
3. `manifest.json` 中 `isPrimary: true` 的 variant
4. `variants/{id}/` 目录首文件

---

## 8. 配置与环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `AI_MODE` | `mock` | `live` + Key 才启用真 API |
| `AI_API_KEY` | — | 火山方舟溶图密钥 |
| `AI_API_BASE_URL` | `https://ark.cn-beijing.volces.com` | |
| `AI_BLEND_STRATEGY` | `seedream-full` | `hybrid` / `asset-composite` |
| `AI_BLEND_VARIANT` | `lite`（非 hybrid）/ `pro`（hybrid） | pro / lite / 4.5 |
| `AI_DIARY_API_KEY` | — | DeepSeek 密钥 |
| `AI_DIARY_API_BASE_URL` | `https://api.deepseek.com` | |
| `AI_DIARY_MODEL` | `deepseek-flash` | |
| `AI_ALLOW_ASSET_FALLBACK` | `true` | hybrid 失败是否贴纸降级 |
| `AI_MAX_CONCURRENCY` | `4` | 并发槽 |
| `BLEND_ROUTE_BUDGET_MS` | `120000` | 整路由超时预算 |
| `PUBLIC_BASE_URL` | `http://localhost:3000` | 结果图 URL 前缀 |

非敏感默认项在 `ai/config.json`；密钥见 `server/.env.example`。

---

## 9. 参考素材（`ai/references/`）

| 项 | 状态 |
|----|------|
| `README.md` | 已文档化主参考图 + variants 目录结构 |
| `manifest.json` | 已维护三角色完整清单（naiwa 13、doro 8、maodie 7 张） |
| 二进制图片 | **gitignore**，需 `python scripts/sync_blend_assets.py` 从 `素材库/溶图/` 同步 |
| 主参考图 | manifest 标记：`naiwa/01.jpg`、`doro/08.jpg`、`maodie/04.jpg` 为 `isPrimary` |

---

## 10. 测试与验收

| 测试文件 | 覆盖 |
|---------|------|
| `server/test/blend-fallback.test.js` | 候选图降级、角色区域计算 |
| `server/test/compositor.test.js` | 蒙版/合成逻辑 |
| `server/test/seedream.test.js` | 模型/策略配置解析 |

无端到端溶图质量评分脚本；C 侧验收依赖人工评判「角色像不像」。

---

## 11. API 路由集成

| 路由 | AI 相关行为 |
|------|-------------|
| `POST /api/roll` | `rollCharacter()`：随机角色 + 稀有度 + `pickQuote()` |
| `POST /api/blend` | `runBlend()` → `runDiary()`；返回溶图元数据 + `companionText` + `diaryNote` |
| `GET /api/health` | `describeAiHealth()`：模式、策略、prompt 来源、最近错误 |

完整入参/出参见 `docs/api.md` 与 `docs/diary-api.md`。

---

## 12. 待补交付

1. **`pitch/samples/` 标杆图**：目录仅有 `.gitkeep`，计划要求 10 张、答辩至少 3 张
2. **本地 references 二进制素材**：需同步后方可完整复现 live 溶图
3. **9/12 备用样图**：API 现场崩溃时的离线演示素材

---

## 13. 答辩可用技术要点

1. **三角色差异化 prompt**：溶图约束（平面梗图、禁写实）+ 合成身份锁 + 多档透明动作库
2. **溶图三策略可热切换**：`seedream-full`（效果优先）/ `hybrid`（背景保真）/ `asset-composite`（确定性贴纸）
3. **hybrid 管线**：Seedream Pro 双图编辑 → U2Net-P 本地分割 → Sharp 像素级背景恢复 + 完整性校验
4. **场景导演**：DeepSeek 看图选 variant、定锚点，驱动互动姿势
5. **陪伴日记**：三角色 × 三稀有度 × 独立字体风格，多模态看图批注 + 禁词/长度治理
6. **多层降级**：AI 候选保留 → 透明素材合成 → 离线文案，前端明确标注降级状态

---

## 14. 关键文件索引

| 类别 | 路径 |
|------|------|
| 溶图 prompt | `ai/prompts/naiwa.json`、`doro.json`、`maodie.json` |
| 日记 prompt | `ai/diary-prompts.json` |
| 陪伴语 | `ai/quotes.json` |
| AI 默认配置 | `ai/config.json` |
| 参考图清单 | `ai/references/manifest.json` |
| 溶图编排 | `server/services/ai/blend.js` |
| Seedream 调用 | `server/services/ai/providers/http.js` |
| 场景分析/日记 | `server/services/ai/providers/deepseek.js` |
| 本地合成 | `server/services/ai/compositor.js` |
| Prompt 加载 | `server/services/ai/prompts.js` |
| 运行时配置 | `server/services/ai/config.js` |
| 标杆图目录（空） | `pitch/samples/` |

---

## 15. 结论

AI 侧从计划中的「单一溶图 API」演进为完整的多策略管线，prompt 配置体系完善（溶图 + 合成 + 日记三层），降级机制健全。主要缺口为 **标杆样图未入库** 与 **参考图二进制素材未进 Git**，影响答辩演示与新人复现。
