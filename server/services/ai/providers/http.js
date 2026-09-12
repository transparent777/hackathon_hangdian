/**
 * 火山方舟 · 豆包 Seedream 5.0 Pro 交互编辑溶图（live · 方案 A）
 * 单图 + 坐标区域编辑，不传角色参考图，避免多图融合重绘背景。
 * 文档：https://www.volcengine.com/docs/82379
 */
const path = require('path')
const { fileToDataUri, downloadImageToDir, getImageSizeFromFile } = require('../image-utils')
const { resolveBlendSize } = require('../config')
const { fetchJson } = require('../http')
const { log } = require('../log')

const DEFAULT_ARK_BASE = 'https://ark.cn-beijing.volces.com'
const PRO_MODEL_ID = 'doubao-seedream-5-0-pro-260628'

/** 默认编辑区：画面下方中央桌面空白（归一化 0~1） */
const DEFAULT_EDIT_REGION = { x: 0.32, y: 0.58, w: 0.36, h: 0.22 }

function resolveArkBaseUrl(config) {
  return (config.apiBaseUrl || DEFAULT_ARK_BASE).replace(/\/$/, '')
}

const GLOBAL_FORBIDDEN = [
  '修改背景',
  '重绘背景',
  '改变构图',
  '改变色调',
  '背景挖洞',
  '背景留白方块',
  '背景空洞',
  '修改寿司',
  '修改盘子',
  '修改桌面',
  '修改餐具',
  '扭曲食物',
  '画中画',
  '参考图小窗',
  '角标缩略图',
  '真实动物',
  '写实宠物',
  '真狗',
  '真猫',
  '3D渲染',
  '立体手办',
  '画风写实化',
  '把角色重画成另一种生物',
  '巨大体型'
].join(', ')

function resolveEditRegionPixels(sourceImagePath, editRegion) {
  const size = getImageSizeFromFile(sourceImagePath) || { width: 1000, height: 1000 }
  const region = { ...DEFAULT_EDIT_REGION, ...(editRegion || {}) }
  const x1 = Math.max(0, Math.round(region.x * size.width))
  const y1 = Math.max(0, Math.round(region.y * size.height))
  const x2 = Math.min(size.width, Math.round((region.x + region.w) * size.width))
  const y2 = Math.min(size.height, Math.round((region.y + region.h) * size.height))

  return { x1, y1, x2, y2, width: size.width, height: size.height }
}

function buildBlendPrompt(promptText, negativePrompt = '', editRegionText = '') {
  const global = [
    '【编辑方式】Seedream Pro 交互编辑：仅在上传的用户生活照指定坐标区域内新增一个桌面小宠物角色；坐标以外所有像素必须逐像素保留，不得重绘、替换或修改背景。',
    editRegionText,
    '【角色尺寸】手掌大小的小摆件，高度约为画面高度的百分之五到百分之八，像桌上小物件，不要巨大化。',
    '【光影融合】匹配原图室内暖光方向与色温，在角色脚下添加柔和接触阴影，让它真的站在接触面上。',
    '【构图】角色只出现在编辑区域内，不遮挡人脸与主要食物；无水印无文字。',
    '【允许微调】仅可微调姿势、表情与朝向；不得改变角色辨识度、配色、描边风格与平面梗图画风。'
  ].filter(Boolean).join(' ')

  const parts = [global, promptText].filter(Boolean)
  const forbidden = [GLOBAL_FORBIDDEN, String(negativePrompt || '').trim()].filter(Boolean).join(', ')
  if (forbidden) {
    parts.push(`禁止出现：${forbidden.replace(/,/g, '、')}`)
  }
  return parts.join(' ')
}

function resolveBlendModel(config) {
  const model = config.blendModel || PRO_MODEL_ID
  if (model !== PRO_MODEL_ID) {
    log.warn('溶图方案 A 需要 Seedream Pro 交互编辑，已自动切换模型', {
      requested: model,
      using: PRO_MODEL_ID
    })
    return PRO_MODEL_ID
  }
  return model
}

function buildSeedreamBody({ model, prompt, sourceImageDataUri }) {
  return {
    model,
    prompt,
    image: sourceImageDataUri,
    size: resolveBlendSize(model),
    response_format: 'url',
    stream: false,
    watermark: process.env.AI_BLEND_WATERMARK !== 'false'
  }
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
    editRegion,
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

  const sourceImageDataUri = fileToDataUri(sourceImagePath)
  if (!sourceImageDataUri) {
    throw new Error('缺少用户原图，无法溶图')
  }

  const region = resolveEditRegionPixels(sourceImagePath, editRegion)
  const editRegionText = `【编辑区域】仅在坐标 ${region.x1} ${region.y1} ${region.x2} ${region.y2} 内生成角色；该区域以外画面全部保持原样。`

  const model = resolveBlendModel(config)
  const prompt = buildBlendPrompt(promptText, negativePrompt, editRegionText)

  log.info('seedream blend request (scheme A: single-image interactive edit)', {
    characterId: ctx.characterId,
    model,
    imageSize: `${region.width}x${region.height}`,
    editRegion: `${region.x1},${region.y1},${region.x2},${region.y2}`,
    referenceImagePath: referenceImagePath || '(prompt-only, not uploaded)'
  })

  const body = buildSeedreamBody({ model, prompt, sourceImageDataUri })
  const remoteUrl = await callSeedreamGeneration(config, body, {
    timeoutMs: timeoutMs || config.timeoutMs,
    deadline: deadline || 0
  })

  const filename = await downloadImageToDir(remoteUrl, uploadDir)
  const resultUrl = `${publicBaseUrl}/uploads/${filename}`

  return {
    resultUrl,
    localPath: path.join(uploadDir, filename),
    provider: 'volcengine-seedream-5-pro-edit',
    blended: true,
    remoteUrl,
    model,
    editRegion: region
  }
}

module.exports = {
  blendImage,
  PRO_MODEL_ID,
  DEFAULT_EDIT_REGION,
  resolveEditRegionPixels,
  buildBlendPrompt
}
