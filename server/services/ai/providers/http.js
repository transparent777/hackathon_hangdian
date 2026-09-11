/**
 * 火山方舟 · 豆包 Seedream 溶图（live）
 * 文档：https://www.volcengine.com/docs/82379
 */
const path = require('path')
const fs = require('fs')
const { fileToDataUri, downloadImageToDir } = require('../image-utils')

const DEFAULT_ARK_BASE = 'https://ark.cn-beijing.volces.com'
const DEFAULT_BLEND_MODEL = 'doubao-seedream-4-5-251128'

class AiProviderNotImplementedError extends Error {
  constructor(feature) {
    super(`[ai/http] ${feature} 尚未实现`)
    this.code = 'AI_NOT_IMPLEMENTED'
  }
}

function resolveArkBaseUrl(config) {
  return (config.apiBaseUrl || DEFAULT_ARK_BASE).replace(/\/$/, '')
}

function buildBlendPrompt(promptText) {
  return [
    '将虚拟陪伴兽自然融入用户真实生活照片中，保持场景光线与透视一致，半写实合成，无水印无文字。',
    promptText
  ]
    .filter(Boolean)
    .join(' ')
}

function collectReferenceImages(sourceImagePath, referenceImagePath) {
  const images = []

  const source = fileToDataUri(sourceImagePath)
  if (source) images.push(source)

  if (referenceImagePath && fs.existsSync(referenceImagePath)) {
    const ref = fileToDataUri(referenceImagePath)
    if (ref) images.push(ref)
  }

  return images
}

async function callSeedreamGeneration(config, body) {
  const url = `${resolveArkBaseUrl(config)}/api/v3/images/generations`
  const timeoutMs = config.timeoutMs || 90000

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(body),
      signal: controller.signal
    })

    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      const message = payload.error?.message || payload.message || `HTTP ${response.status}`
      throw new Error(`Seedream 请求失败: ${message}`)
    }

    const resultUrl = payload.data?.[0]?.url
    if (!resultUrl) {
      throw new Error('Seedream 未返回图片 URL')
    }

    return resultUrl
  } finally {
    clearTimeout(timer)
  }
}

async function blendImage(ctx) {
  const {
    config,
    promptText,
    referenceImagePath,
    sourceImagePath,
    publicBaseUrl,
    uploadDir
  } = ctx

  if (!config.apiKey) {
    throw new Error('AI_API_KEY 未配置')
  }

  const images = collectReferenceImages(sourceImagePath, referenceImagePath)
  if (!images.length) {
    throw new Error('缺少用户原图，无法溶图')
  }

  const body = {
    model: config.blendModel || DEFAULT_BLEND_MODEL,
    prompt: buildBlendPrompt(promptText),
    size: process.env.AI_BLEND_SIZE || '2K',
    sequential_image_generation: 'disabled',
    response_format: 'url',
    stream: false,
    watermark: process.env.AI_BLEND_WATERMARK !== 'false'
  }

  // 图生图：单张用 image，多张用 image 数组（用户场景 + 角色参考）
  body.image = images.length === 1 ? images[0] : images

  const remoteUrl = await callSeedreamGeneration(config, body)

  const filename = await downloadImageToDir(remoteUrl, uploadDir)
  const resultUrl = `${publicBaseUrl}/uploads/${filename}`

  return {
    resultUrl,
    provider: 'volcengine-seedream',
    blended: true,
    remoteUrl
  }
}

async function generateDiaryNote(ctx) {
  const { config, fallbackText } = ctx

  if (!config.apiKey) {
    throw new Error('AI_API_KEY 未配置')
  }

  // 日记批注需多模态对话模型，与 Seedream 分离；暂用 fallback
  console.warn('[ai/http] diary 多模态未接入，使用 fallback 文案')
  return {
    diaryNote: fallbackText,
    provider: 'fallback'
  }
}

module.exports = {
  AiProviderNotImplementedError,
  blendImage,
  generateDiaryNote
}
