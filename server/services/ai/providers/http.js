/**
 * 火山方舟 · 豆包 Seedream 5.0 溶图（live）
 * 文档：https://www.volcengine.com/docs/82379
 */
const fs = require('fs')
const path = require('path')
const { fileToDataUri, downloadImageToDir } = require('../image-utils')
const { resolveBlendSize } = require('../config')
const { fetchJson } = require('../http')

const DEFAULT_ARK_BASE = 'https://ark.cn-beijing.volces.com'
const DEFAULT_BLEND_MODEL = 'doubao-seedream-5-0-260128'
const PRO_MODEL_ID = 'doubao-seedream-5-0-pro-260628'

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

  if (model !== PRO_MODEL_ID) {
    body.sequential_image_generation = 'disabled'
  }

  body.image = images.length === 1 ? images[0] : images
  return body
}

async function callSeedreamGeneration(config, body, { timeoutMs, deadline }) {
  const url = `${resolveArkBaseUrl(config)}/api/v3/images/generations`

  const { json } = await fetchJson(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body,
    timeoutMs,
    retryMax: config.retryMax,
    deadline
  })

  const resultUrl = json.data?.[0]?.url
  if (!resultUrl) {
    throw new Error('Seedream 未返回图片 URL')
  }

  return resultUrl
}

async function blendImage(ctx) {
  const {
    config,
    promptText,
    referenceImagePath,
    sourceImagePath,
    publicBaseUrl,
    uploadDir,
    timeoutMs,
    deadline
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

  const remoteUrl = await callSeedreamGeneration(config, body, {
    timeoutMs: timeoutMs || config.timeoutMs,
    deadline: deadline || 0
  })

  const filename = await downloadImageToDir(remoteUrl, uploadDir)
  const resultUrl = `${publicBaseUrl}/uploads/${filename}`

  return {
    resultUrl,
    localPath: path.join(uploadDir, filename),
    provider: 'volcengine-seedream-5',
    blended: true,
    remoteUrl,
    model
  }
}

module.exports = {
  blendImage
}
