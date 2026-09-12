/**
 * 火山方舟 · Seedream 候选图生成。
 * 默认 hybrid 流程不会直接返回候选图，而是提取角色后覆盖回原始照片。
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
    '【编辑方式】在图片1的真实场景中新增图片2的桌面小宠物角色，让角色根据场景中的显著物体自然调整表情和动作。',
    editRegionText,
    '【角色尺寸】桌面小宠物高度约为画面高度的百分之二十到百分之三十，不要巨大化。',
    '【光影融合】匹配原图室内暖光方向与色温，在角色脚下添加柔和接触阴影，让它真的站在接触面上。',
    '【构图】角色只出现在编辑区域内，不遮挡人脸与主要食物；无水印无文字。',
    '【允许变化】只允许改变姿势、表情与朝向；不得改变角色辨识度、脸部纹理、配色、描边风格与平面梗图画风。'
  ].filter(Boolean).join(' ')

  const parts = [global, promptText].filter(Boolean)
  const forbidden = [GLOBAL_FORBIDDEN, String(negativePrompt || '').trim()].filter(Boolean).join(', ')
  if (forbidden) {
    parts.push(`禁止出现：${forbidden.replace(/,/g, '、')}`)
  }
  return parts.join(' ')
}

function resolveBlendModel(config) {
  return config.blendModel || PRO_MODEL_ID
}

function buildSeedreamBody({ model, prompt, image, watermark }) {
  return {
    model,
    prompt,
    image,
    size: resolveBlendSize(model),
    response_format: 'url',
    stream: false,
    watermark: watermark ?? process.env.AI_BLEND_WATERMARK !== 'false'
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
  const sceneDirection = ctx.scenePlan
    ? `【场景互动】${ctx.scenePlan.expression}；${ctx.scenePlan.action}；${ctx.scenePlan.interaction}。角色脚底中心约在归一化坐标 (${ctx.scenePlan.anchor.x}, ${ctx.scenePlan.anchor.y})，角色高度约占画面 ${Math.round(ctx.scenePlan.scale * 100)}%。`
    : ''
  const referenceImageDataUri = fileToDataUri(referenceImagePath)
  const rolePrompt = referenceImageDataUri
    ? '【图片职责】图片1是必须保持构图的生活场景，图片2是角色身份与画风的唯一参考。只允许角色根据场景改变表情和动作，不得把图片2作为画中画贴入。'
    : ''
  const prompt = buildBlendPrompt(
    [rolePrompt, sceneDirection, promptText].filter(Boolean).join(' '),
    negativePrompt,
    editRegionText
  )

  log.info('seedream candidate request (scene + character reference)', {
    characterId: ctx.characterId,
    model,
    imageSize: `${region.width}x${region.height}`,
    editRegion: `${region.x1},${region.y1},${region.x2},${region.y2}`,
    referenceImagePath: referenceImagePath || '(missing)'
  })

  const body = buildSeedreamBody({
    model,
    prompt,
    image: referenceImageDataUri
      ? [sourceImageDataUri, referenceImageDataUri]
      : sourceImageDataUri,
    watermark: false
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
    provider: 'volcengine-seedream-5-pro-edit',
    blended: true,
    remoteUrl,
    model,
    editRegion: region
  }
}

async function generateCharacterMask(ctx) {
  const { config, candidateImagePath, uploadDir, timeoutMs, deadline } = ctx
  const candidateImageDataUri = fileToDataUri(candidateImagePath)
  if (!candidateImageDataUri) throw new Error('缺少 Seedream 候选图，无法生成角色蒙版')

  const model = resolveBlendModel(config)
  const prompt = [
    '把输入图片转换为严格的黑白二值分割蒙版，画布尺寸、宽高比和所有物体位置必须与输入完全一致。',
    '只把画面中明显属于插画或表情包风格的卡通桌面宠物完整区域画成纯白色，包括脸、身体、手脚、衣物和黑色描边。',
    '照片原有的桌子、食物、餐具、墙壁、人物以及其他所有背景必须是纯黑色。',
    '不要移动、缩放或重画角色轮廓，不要输出原照片，不要灰色、阴影、文字、水印和额外图形。'
  ].join(' ')
  const body = buildSeedreamBody({
    model,
    prompt,
    image: candidateImageDataUri,
    watermark: false
  })
  const remoteUrl = await callSeedreamGeneration(config, body, {
    timeoutMs: timeoutMs || config.timeoutMs,
    deadline: deadline || 0
  })
  const filename = await downloadImageToDir(remoteUrl, uploadDir)

  return {
    localPath: path.join(uploadDir, filename),
    remoteUrl,
    model
  }
}

module.exports = {
  blendImage,
  PRO_MODEL_ID,
  DEFAULT_EDIT_REGION,
  resolveEditRegionPixels,
  buildBlendPrompt,
  generateCharacterMask,
  buildSeedreamBody
}
