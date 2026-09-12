# 陪伴日记 · 接口与数据约定

> 负责人：B 实现接口，C 维护 `ai/diary-prompts.json`，A 前端展示，D 润色 prompt 口语。

## 一、产品行为（已对齐）

| 项 | 约定 |
|----|------|
| 入口 | 「我的」→ 陪伴日记卡片 → 新页面 `pages/diary/diary` |
| 触发时机 | 溶图成功时，**后端**调用多模态生成 `diaryNote`，随 `/blend` 响应返回 |
| 存储 | 写入本地历史 `blend_history`，新字段 `diaryNote` |
| 与 `quote` 关系 | **独立字段**：`quote` = roll 时短陪伴语；`diaryNote` = 看图生成的日记批注 |
| 字体 | 每只陪伴兽固定一种 `fontStyle`；稀有度只影响文案细腻度，不换字体 |
| 空态 | 「还没有日记，去拍一张吧」 |

---

## 二、推荐方案：扩展现有 `/blend` 响应

溶图与日记批注在同一次请求内完成（后端内部串行：先溶图 → 再多模态写批注），前端无感知。

### `POST /api/blend`（扩展出参）

**入参**（不变）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `openid` | string | 可选 |
| `characterId` | string | `naiwa` / `doro` / `maodie` |
| `rarity` | string | `普通` / `稀有` / `传说`（前端 formData 传入） |
| `image` | file | 用户原图 |

**出参**（新增字段）：

```json
{
  "resultUrl": "https://...",
  "companionText": "今天在窗边陪你晒太阳",
  "taskId": "blend-xxx",
  "diaryNote": "阳光落在书页上，我蜷在你手边，哪儿都不想去。",
  "fontStyle": "naiwa"
}
```

| 新字段 | 类型 | 说明 |
|--------|------|------|
| `diaryNote` | string | AI 看图生成的日记批注；失败时可回退为空字符串 |
| `fontStyle` | string | 前端字体 key，与 `diary-prompts.json` 中 `characters.*.fontStyle` 一致 |

**失败降级**：多模态超时/失败时，`diaryNote` 返回 `""`，`fontStyle` 仍按角色返回；前端日记页该条显示「批注生成中…」或隐藏批注区（MVP 建议隐藏）。

---

## 三、后端生成逻辑（B 参考）

```
1. 接收 blend 请求，完成溶图 → resultUrl
2. 读取 ai/diary-prompts.json
3. rarityLabel → rarityKey：普通→normal，稀有→rare，传说→legendary
4. 拼接 messages：
   - system: global.systemPrompt + global.outputRules
   - user text: characters[characterId].rarityLevels[rarityKey].prompt
   - user image: 用户上传原图（不含溶图角色；批注是对原图看图说话 + 角色口吻陪伴）
5. 调用多模态大模型，截断至 maxLength
6. 返回 diaryNote + fontStyle
```

### Prompt 拼接伪代码

```js
const cfg = require('../ai/diary-prompts.json')
const char = cfg.characters[characterId]
const level = char.rarityLevels[rarityKey]

const system = [
  cfg.global.systemPrompt,
  `角色：${char.name}。说话风格：${char.voice}`,
  `输出要求：${cfg.global.outputRules.format}，最多 ${level.maxLength} 字。`
].join('\n')

const userText = level.prompt

// 多模态请求
visionChat({
  system,
  messages: [
    { role: 'user', content: [
      { type: 'text', text: userText },
      { type: 'image_url', image_url: resultUrl }
    ]}
  ]
})
```

---

## 四、历史记录数据结构（前端本地）

`miniprogram/utils/history.js` 单条记录扩展：

```json
{
  "id": "1725955200000",
  "characterId": "naiwa",
  "characterName": "奶蛙",
  "characterImage": "/images/characters/covers/naiwa/rare.jpg",
  "rarity": "稀有",
  "imageUrl": "wxfile://...",
  "sourceImagePath": "wxfile://...",
  "quote": "今天在窗边陪你晒太阳",
  "diaryNote": "阳光落在书页上，我蜷在你手边，哪儿都不想去。",
  "fontStyle": "naiwa",
  "createdAt": 1725955200000
}
```

---

## 五、前端字体映射（A 参考）

| `fontStyle` | 角色 | 视觉风格 | 稀有度 UI 差异 |
|-------------|------|----------|----------------|
| `naiwa` | 奶蛙 | 圆润软糯手写体 | 普通：细线；稀有：略粗+淡紫描边；传说：金色点缀 |
| `doro` | doro | 随性涂鸦体 | 普通：铅笔感；稀有：马克笔；传说：荧光笔高亮 |
| `maodie` | 耄耋 | 慵懒潦草体 | 普通：灰褐；稀有：墨绿；传说：深金+倾斜加大 |

字体文件放 `miniprogram/assets/fonts/`（或使用系统 fallback + letter-spacing 模拟）。

---

## 六、陪伴日记页 UI 结构

```
pages/diary/diary
├── 顶栏：陪伴日记
├── scroll-view（纵向）
│   └── diary-entry × N（按 createdAt 倒序）
│       ├── 日期标签
│       ├── polaroid（溶图 imageUrl）
│       ├── 陪伴兽头像（characterImage）+ 稀有度 tag
│       └── 批注区（diaryNote，class 由 fontStyle + rarity 决定）
└── 空态：还没有日记，去拍一张吧
```

---

## 七、前端需改动清单（A）

- [ ] `camera.js`：`fetchBlend` 时传 `rarity`；`addHistory` 写入 `diaryNote` / `fontStyle` / `rarity`
- [ ] `history.js`：扩展字段
- [ ] `api.js`：`uploadBlend` formData 加 `rarity`
- [ ] `mock.js`：mock 返回假 `diaryNote` + `fontStyle`
- [ ] 新建 `pages/diary/diary`
- [ ] `me.js`：陪伴日记卡片 `bind:tap` → `navigateTo` diary 页

---

## 八、C 填写 prompt 的检查清单

- [ ] 三个角色 × 三个稀有度 = 9 条 `prompt` 全部替换「【待填写】」
- [ ] `maxLength` 与 prompt 里字数要求一致
- [ ] 稀有度递进：普通短直 → 稀有有细节 → 传说有氛围/记忆感
- [ ] 用 3 张标杆溶图试跑，确认不会编造画面外内容
