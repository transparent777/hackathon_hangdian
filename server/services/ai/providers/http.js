/**
 * 火山方舟 · 豆包 Seedream 5.0 溶图（live）
 * 文档：https://www.volcengine.com/docs/82379
 */
const fs = require('fs')
const path = require('path')
const { fileToDataUri, downloadImageToDir } = require('../image-utils')
const { resolveBlendSize } = require('../config')
const { fetchJson } = require('../http')
const { log } = require('../log')

const DEFAULT_ARK_BASE = 'https://ark.cn-beijing.volces.com'
const DEFAULT_BLEND_MODEL = 'doubao-seedream-5-0-260128'
const PRO_MODEL_ID = 'doubao-seedream-5-0-pro-260628'

function resolveArkBaseUrl(config) {
  return (config.apiBaseUrl || DEFAULT_ARK_BASE).replace(/\/$/, '')
}

function buildBlendPrompt(promptText, negativePrompt = '') {
  const global = [
    '图1是用户真实生活照片，作为场景底图，保留原场景结构、透视与光线基调，不要替换或重绘背景。',
    '图2是该角色官方参考素材，角色外观的唯一依据，必须高保真还原其造型、比例、配色与画风。',
    '任务：把图2中的陪伴兽清晰合成进图1，最终成图中必须能看见陪伴兽本体；可放在桌沿、沙发角或前景空白处，允许调整姿势、表情、朝向与大小以融入场景。',
    '陪伴兽约占画面八分之一到四分之一，优先放在边角，尽量不遮挡人脸；光影与接触阴影须与场景一致。',
    '半写实合成，边缘清晰自然，无水印无文字。'
  ].join(' ')

  const parts = [global, promptText].filter(Boolean)
  const forbidden = String(negativePrompt || '').trim()
  if (forbidden) {
    parts.push(`禁止出现：${forbidden.replace(/,/g, '、')}`)
  }
  return parts.join(' ')
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
    negativePrompt,
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
  if (images.length < 2) {
    log.warn('溶图缺少角色参考图，仅上传用户原图', {
      referenceImagePath,
      characterId: ctx.characterId
    })
  }

  const model = config.blendModel || DEFAULT_BLEND_MODEL
  log.info('seedream blend request', {
    characterId: ctx.characterId,
    imageCount: images.length,
    model
  })
  const body = buildSeedreamBody({
    model,
    prompt: buildBlendPrompt(promptText, negativePrompt),
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
