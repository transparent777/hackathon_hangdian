# Cursor Skills 安装说明

> 用于后续让 AI 帮忙美化 UI 时使用，**不影响当前小程序代码**。

## 已安装的 Skills（本机）

安装位置：`.agents/skills/`（已在 `.gitignore` 中，不提交 Git）

| Skill | 用途 |
|-------|------|
| **frontend-design** | Anthropic 官方，避免 AI 通用丑 UI |
| **ui-ux-pro-max** | 配色、风格、UX 规范库 |
| ui-styling / design / brand 等 | ui-ux-pro-max 包内附带 |

## 队友安装（在项目根目录执行）

```bash
# 必装：前端设计审美
npx skills add anthropics/skills@frontend-design --target cursor --scope project

# 可选：配色与 UX 词库
npx skills add nextlevelbuilder/ui-ux-pro-max-skill --target cursor --scope project
```

安装后重启 Cursor，或新开对话。

## 以后要用时怎么说

等需要美化页面时，在 Cursor 里说：

> 使用 frontend-design skill，帮我把小程序首页做成治愈系赛博陪伴风，继续用 Vant Weapp。

**现在不用动小程序代码**，等 9/09 联调 API 稳定后再做 UI。

## 注意

- Skills 只影响 Cursor AI 的生成风格，**不会自动改你的代码**
- `.agents/` 文件夹很大，不要 `git add` 进仓库
- 从官方源安装，不要用来路不明的 skill
