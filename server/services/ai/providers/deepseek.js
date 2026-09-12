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

async function callDeepSeekVision(
  config,
  { system, userText, imageDataUri, timeoutMs, deadline, maxTokens = 256, temperature = 0.8 }
) {
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
      max_tokens: maxTokens,
      temperature
    },
    timeoutMs,
    retryMax: config.retryMax,
    deadline
  })

  const content = extractAssistantContent(json.choices?.[0]?.message)
  if (!content) {
    throw new AIExtractError('DeepSeek 未返回视觉分析文本', { code: 'NO_TEXT' })
  }

  return content
}

function extractJsonObject(text) {
  const cleaned = String(text || '').replace(/```(?:json)?/gi, '').replace(/```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end <= start) {
    throw new AIExtractError('场景分析未返回 JSON', { code: 'INVALID_SCENE_JSON' })
  }
  try {
    return JSON.parse(cleaned.slice(start, end + 1))
  } catch (error) {
    throw new AIExtractError('场景分析 JSON 无法解析', {
      code: 'INVALID_SCENE_JSON',
      cause: error
    })
  }
}

async function analyzeScene(ctx) {
  const { config, characterId, characterName, profile, imagePath, timeoutMs, deadline } = ctx
  const imageDataUri = fileToDataUri(imagePath)
  if (!imageDataUri) throw new Error('场景分析缺少用户原图')

  const variants = (profile.variants || [])
    .map((item) => `${item.id}: ${item.description}; 适合 ${item.tags.join('、')}`)
    .join('\n')
  const system = [
    '你是桌面陪伴角色的场景导演。只分析照片并选择现有角色动作，不修改照片。',
    '只输出一个 JSON 对象，不要 Markdown，不要补充说明。',
    'anchor 是角色脚底中心在原图中的归一化坐标，必须落在真实可见的桌面、地面或台面上。',
    '优先选择空白且不遮挡人脸和主体的位置。scale 是角色高度占画面高度的比例，范围 0.18 到 0.30。'
  ].join('\n')
  const userText = [
    `角色：${characterName || characterId}`,
    `角色互动气质：${profile.actionStyle || '自然陪伴场景'}`,
    '候选动作：',
    variants,
    '请结合照片里真实可见的物体和氛围，选择一个 variantId，并输出：',
    '{"variantId":"候选ID","expression":"简短表情","action":"简短动作","interaction":"与画面中具体物体的互动","anchor":{"x":0.5,"y":0.88},"scale":0.25,"rotation":0}'
  ].join('\n')

  const raw = await callDeepSeekVision(config, {
    system,
    userText,
    imageDataUri,
    timeoutMs,
    deadline,
    maxTokens: 400,
    temperature: 0.2
  })
  return extractJsonObject(raw)
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
    throw new Error('日记批注缺少溶图结果图')
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
  generateDiaryNote,
  analyzeScene,
  extractJsonObject
}
