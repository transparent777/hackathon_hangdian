/**
 * DeepSeek V4.1-Flash 多模态 · 陪伴日记批注
 * 文档：https://api-docs.deepseek.com/guides/vision
 */
const { fileToDataUri } = require('../image-utils')

const DEFAULT_BASE = 'https://api.deepseek.com'
const DEFAULT_MODEL = 'deepseek-flash'

function buildDiaryMessages(promptBundle) {
  const { systemPrompt, outputRules, characterPrompt, maxLength, voice } = promptBundle
  const forbidden = (outputRules.forbidden || []).join('、')

  const system = [
    systemPrompt,
    voice ? `角色说话风格：${voice}` : '',
    `输出要求：${outputRules.format || '纯文本'}，最多 ${maxLength} 字。`,
    forbidden ? `禁止使用：${forbidden}` : ''
  ]
    .filter(Boolean)
    .join('\n')

  return { system, userText: characterPrompt }
}

function extractAssistantContent(message) {
  if (!message) return ''

  const content = message.content
  if (typeof content === 'string') {
    return content.trim()
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part
        return part?.text || ''
      })
      .join('')
      .trim()
  }

  return ''
}

function sanitizeDiaryText(text, maxLength) {
  let s = String(text || '').trim()
  s = s.replace(/^["'「『]+|["'」』]+$/g, '')
  s = s.replace(/\n+/g, '')
  if (maxLength && s.length > maxLength) {
    s = s.slice(0, maxLength)
  }
  return s
}

async function callDeepSeekVision(config, { system, userText, imageDataUri }) {
  const baseUrl = (config.diaryApiBaseUrl || DEFAULT_BASE).replace(/\/$/, '')
  const url = `${baseUrl}/v1/chat/completions`
  const timeoutMs = config.diaryTimeoutMs || 45000

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.diaryApiKey}`
      },
      body: JSON.stringify({
        model: config.diaryModel || DEFAULT_MODEL,
        messages: [
          { role: 'system', content: system },
          {
            role: 'user',
            content: [
              { type: 'text', text: userText },
              { type: 'image_url', image_url: { url: imageDataUri } }
            ]
          }
        ],
        max_tokens: 256,
        temperature: 0.8
      }),
      signal: controller.signal
    })

    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      const message = payload.error?.message || payload.message || `HTTP ${response.status}`
      throw new Error(`DeepSeek 请求失败: ${message}`)
    }

    const content = extractAssistantContent(payload.choices?.[0]?.message)
    if (!content) {
      throw new Error('DeepSeek 未返回日记批注')
    }

    return content
  } finally {
    clearTimeout(timer)
  }
}

async function generateDiaryNote(ctx) {
  const { config, promptBundle, imagePath, fallbackText } = ctx

  if (!config.diaryApiKey) {
    throw new Error('AI_DIARY_API_KEY 未配置')
  }

  const imageDataUri = fileToDataUri(imagePath)
  if (!imageDataUri) {
    throw new Error('日记批注缺少溶图结果图')
  }

  const { system, userText } = buildDiaryMessages(promptBundle)
  let lastError = null

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const raw = await callDeepSeekVision(config, { system, userText, imageDataUri })
      const diaryNote = sanitizeDiaryText(raw, promptBundle.maxLength)
      if (diaryNote && diaryNote.length >= 4) {
        return {
          diaryNote,
          provider: 'deepseek-flash'
        }
      }
      lastError = new Error('DeepSeek 返回批注过短')
    } catch (error) {
      lastError = error
    }
  }

  throw lastError || new Error('DeepSeek 未返回日记批注')
}

module.exports = {
  generateDiaryNote
}
