/**
 * DeepSeek V4.1-Flash 多模态 · 陪伴日记批注
 * 文档：https://api-docs.deepseek.com/guides/vision
 */
const { fileToDataUri } = require('../image-utils')
const { fetchJson } = require('../http')
const { cleanNote, hitsForbidden, truncateNote } = require('../note')
const { AIExtractError } = require('../errors')

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

async function callDeepSeekVision(config, { system, userText, imageDataUri, timeoutMs, deadline }) {
  const baseUrl = (config.diaryApiBaseUrl || DEFAULT_BASE).replace(/\/$/, '')
  const url = `${baseUrl}/v1/chat/completions`

  const { json } = await fetchJson(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.diaryApiKey}`
    },
    body: {
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
    },
    timeoutMs,
    retryMax: config.retryMax,
    deadline
  })

  const content = extractAssistantContent(json.choices?.[0]?.message)
  if (!content) {
    throw new AIExtractError('DeepSeek 未返回日记批注', { code: 'NO_TEXT' })
  }

  return content
}

async function generateDiaryNote(ctx) {
  const { config, promptBundle, imagePath, fallbackText } = ctx
  const timeoutMs = ctx.timeoutMs || config.diaryTimeoutMs
  const deadline = ctx.deadline || 0

  if (!config.diaryApiKey) {
    throw new Error('AI_DIARY_API_KEY 未配置')
  }

  const imageDataUri = fileToDataUri(imagePath)
  if (!imageDataUri) {
    throw new Error('日记批注缺少用户原图')
  }

  const { system, userText } = buildDiaryMessages(promptBundle)
  let lastError = null

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const raw = await callDeepSeekVision(config, { system, userText, imageDataUri, timeoutMs, deadline })
      const cleaned = cleanNote(raw)
      if (!cleaned) {
        throw new AIExtractError('批注清洗后为空', { code: 'EMPTY_NOTE' })
      }
      if (hitsForbidden(cleaned, promptBundle.outputRules)) {
        throw new AIExtractError('批注命中禁词', { code: 'FORBIDDEN_WORD' })
      }
      const diaryNote = truncateNote(cleaned, promptBundle.maxLength)
      if (diaryNote && diaryNote.length >= 4) {
        return {
          diaryNote,
          provider: 'deepseek-flash'
        }
      }
      lastError = new AIExtractError('DeepSeek 返回批注过短', { code: 'TOO_SHORT' })
    } catch (error) {
      lastError = error
    }
  }

  throw lastError || new Error(fallbackText || 'DeepSeek 未返回日记批注')
}

module.exports = {
  generateDiaryNote
}
