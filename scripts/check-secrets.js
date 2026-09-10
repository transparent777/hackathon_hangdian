#!/usr/bin/env node
/**
 * 提交前敏感信息扫描（本地运行，不安装 git hook 也可用）
 * 用法：node scripts/check-secrets.js
 *       node scripts/check-secrets.js --staged   # 仅检查暂存区
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

const IGNORE_DIRS = new Set([
  'node_modules',
  'miniprogram_npm',
  '.git',
  'uploads',
  '素材库',
  '.agents'
])

const IGNORE_FILES = new Set([
  '.env.example',
  'check-secrets.js',
  'project.private.config.json.example',
  'security.md'
])

const RULES = [
  { name: 'OpenAI / 通用 API Key', pattern: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { name: '阿里云 DashScope', pattern: /\bsk-[a-f0-9]{32}\b/i },
  { name: '硬编码 apiKey', pattern: /api[_-]?key\s*[:=]\s*['"][^'"]{8,}['"]/i },
  { name: '硬编码 secret', pattern: /(?:app)?secret\s*[:=]\s*['"][^'"]{8,}['"]/i },
  { name: '硬编码 password', pattern: /password\s*[:=]\s*['"][^'"]{4,}['"]/i },
  { name: '微信 AppSecret', pattern: /appsecret\s*[:=]\s*['"][^'"]+['"]/i },
  {
    name: '真实微信 AppID（wx 开头 18 位）',
    pattern: /\bwx[a-f0-9]{16}\b/i,
    allowIn: ['project.config.json', 'project.private.config.json', 'project.private.config.json.example']
  }
]

function shouldSkip(filePath) {
  const parts = filePath.split(/[/\\]/)
  if (parts.some((p) => IGNORE_DIRS.has(p))) return true
  const base = path.basename(filePath)
  if (IGNORE_FILES.has(base)) return true
  if (base.startsWith('.env')) return true
  if (base.endsWith('.pem') || base.endsWith('.key') || base.endsWith('.p12')) return true
  return false
}

function getFiles(stagedOnly) {
  if (stagedOnly) {
    try {
      const out = execSync('git diff --cached --name-only --diff-filter=ACM', {
        cwd: ROOT,
        encoding: 'utf8'
      })
      return out
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((f) => path.join(ROOT, f))
        .filter((f) => fs.existsSync(f) && fs.statSync(f).isFile())
    } catch {
      console.warn('[check-secrets] 非 git 仓库或无法读取暂存区，扫描工作区关键文件')
      return []
    }
  }

  const targets = [
    'miniprogram/project.config.json',
    'miniprogram/app.js',
    'server/index.js',
    'ai/diary-prompts.json'
  ]
  return targets
    .map((f) => path.join(ROOT, f))
    .filter((f) => fs.existsSync(f))
}

function scanFile(absPath, stagedOnly) {
  const rel = path.relative(ROOT, absPath).replace(/\\/g, '/')
  const base = path.basename(absPath)
  if (shouldSkip(rel)) return []

  let content
  try {
    content = fs.readFileSync(absPath, 'utf8')
  } catch {
    return []
  }

  const hits = []
  for (const rule of RULES) {
    if (rule.allowIn?.includes(base)) continue
    if (rule.pattern.test(content)) {
      hits.push({ file: rel, rule: rule.name })
    }
  }
  return hits
}

function main() {
  const stagedOnly = process.argv.includes('--staged')
  const files = getFiles(stagedOnly)

  if (!files.length) {
    console.log('[check-secrets] 无需扫描的文件')
    process.exit(0)
  }

  const allHits = files.flatMap((f) => scanFile(f, stagedOnly))

  if (!allHits.length) {
    console.log('[check-secrets] 未发现明显敏感信息 ✓')
    process.exit(0)
  }

  console.error('[check-secrets] 发现可疑内容，请检查后再提交：\n')
  for (const hit of allHits) {
    console.error(`  • ${hit.file}  →  ${hit.rule}`)
  }
  console.error('\n若确认为占位符，可改用语义化占位（如 wxYOUR_APPID_HERE）或移入 .env / project.private.config.json')
  process.exit(1)
}

main()
