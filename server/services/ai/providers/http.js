/**
 * 火山方舟 · 豆包 Seedream 5.0 溶图（live）
 * 文档：https://www.volcengine.com/docs/82379
 *
 * 模型 ID（须写全）：
 * - Lite: doubao-seedream-5-0-260128
 * - Pro:  doubao-seedream-5-0-pro-260628
 */
const fs = require('fs')
const { fileToDataUri, downloadImageToDir } = require('../image-utils')
const { resolveBlendSize } = require('../config')

const DEFAULT_ARK_BASE = 'https://ark.cn-beijing.volces.com'
const DEFAULT_BLEND_MODEL = 'doubao-seedream-5-0-260128'

const PRO_MODEL_ID = 'doubao-seedream-5-0-pro-260628'

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

function buildSeedreamBody({ model, prompt, images }) {
  const body = {
    model,
    prompt,
    size: resolveBlendSize(model),
    response_format: 'url',
    stream: false,
    watermark: process.env.AI_BLEND_WATERMARK !== 'false'
  }

  // Pro 不支持组图；Lite / 4.x 关闭组图
  if (model !== PRO_MODEL_ID) {
    body.sequential_image_generation = 'disabled'
  }

  // 图生图 / 多图融合：单张 string，多张 array
  body.image = images.length === 1 ? images[0] : images

  return body
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

  const model = config.blendModel || DEFAULT_BLEND_MODEL
  const body = buildSeedreamBody({
    model,
    prompt: buildBlendPrompt(promptText),
    images
  })

  const remoteUrl = await callSeedreamGeneration(config, body)

  const filename = await downloadImageToDir(remoteUrl, uploadDir)
  const resultUrl = `${publicBaseUrl}/uploads/${filename}`

  return {
    resultUrl,
    provider: 'volcengine-seedream-5',
    blended: true,
    remoteUrl,
    model
  }
}

async function generateDiaryNote(ctx) {
  const { config, fallbackText } = ctx

  if (!config.apiKey) {
    throw new Error('AI_API_KEY 未配置')
  }

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
