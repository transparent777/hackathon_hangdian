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

const GLOBAL_FORBIDDEN = [
  '修改背景',
  '背景挖洞',
  '背景留白方块',
  '背景空洞',
  '画中画',
  '参考图小窗',
  '角标缩略图',
  '二次出现参考图',
  '真实动物',
  '写实宠物',
  '真狗',
  '真猫',
  '3D渲染',
  '立体手办',
  '画风写实化',
  '把角色重画成另一种生物'
].join(', ')

function buildBlendPrompt(promptText, negativePrompt = '') {
  const global = [
    '【合成方式】抠图叠加：图1是用户真实生活照片，背景必须完整保留、不得擦除、挖洞、替换、重绘或出现任何空白方块；只在背景之上新增一个角色图层。',
    '【角色来源】图2是角色官方参考图，仅用于复制其外观（线条、配色、扁平画风、造型比例）；成图中只能出现一次该角色，禁止把图2再显示为小窗、角标、缩略图或贴图边框。',
    '【角色风格】保持二次元平面梗图/表情包画风，不得变成3D模型、写实玩偶、真实猫狗或照片质感动物。',
    '【角色尺寸】手掌大小的小摆件尺度，高度约为画面高度的百分之五到百分之八，像桌上小物件，不要巨大化。',
    '【允许调整】仅可微调姿势、表情、朝向与落点，并添加与场景一致的方向性高光和脚下接触阴影；不得改变角色辨识度。',
    '【构图】角色放在桌沿、杯旁或前景空白处，不遮挡人脸与主要食物。无水印无文字。'
  ].join(' ')

  const parts = [global, promptText].filter(Boolean)
  const forbidden = [GLOBAL_FORBIDDEN, String(negativePrompt || '').trim()].filter(Boolean).join(', ')
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
