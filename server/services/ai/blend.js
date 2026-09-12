const path = require('path')
const { loadAiRuntimeConfig } = require('./config')
const {
  buildBlendPromptText,
  resolveReferenceImagePath,
  resolveVariantImagePath,
  getCompositionProfile,
  loadBlendPrompt
} = require('./prompts')
const { getProvider } = require('./providers')
const { withSlot, remainingMs } = require('./runtime')
const { assertSupportedImageFile } = require('./image-utils')
const { buildScenePlan } = require('./scene')
const { composeCharacter } = require('./compositor')
const { log } = require('./log')

const UPLOAD_DIR = path.join(__dirname, '../../uploads')

async function runBlend({ characterId, rarityLabel, sourceFile, publicBaseUrl, deadline }) {
  const config = loadAiRuntimeConfig()
  assertSupportedImageFile(sourceFile.path)

  const promptText = buildBlendPromptText(characterId)
  const blendCfg = loadBlendPrompt(characterId)
  if (blendCfg._source === 'builtin') {
    log.warn('溶图使用内置 prompt 兜底', { characterId })
  }
  const referenceImagePath = resolveReferenceImagePath(characterId)

  const relativeUrl = `/uploads/${sourceFile.filename}`
  const publicResultPath = `${publicBaseUrl}${relativeUrl}`

  const timeoutMs = remainingMs(deadline, config.timeoutMs)

  const ctx = {
    config,
    characterId,
    rarityLabel,
    promptText,
    negativePrompt: blendCfg.blend?.negativePrompt || '',
    editRegion: blendCfg.blend?.editRegion || null,
    referenceImagePath,
    sourceImagePath: sourceFile.path,
    publicResultPath,
    publicBaseUrl,
    uploadDir: UPLOAD_DIR,
    timeoutMs,
    deadline
  }

  let result
  if (config.blendStrategy === 'seedream-full') {
    const provider = getProvider(config)
    result = await withSlot({ deadline, waitMs: Math.min(5000, timeoutMs) }, () =>
      provider.blendImage(ctx)
    )
  } else {
    const profile = getCompositionProfile(characterId)
    if (!profile.variants.length) {
      throw new Error(`角色 ${characterId} 未配置透明动作素材`)
    }
    const scenePlan = await buildScenePlan({
      config,
      characterId,
      characterName: profile.characterName,
      profile,
      imagePath: sourceFile.path,
      deadline
    })
    const characterImagePath = resolveVariantImagePath(characterId, scenePlan.variantId)
    const selectedVariant =
      profile.variants.find((item) => String(item.id) === String(scenePlan.variantId)) ||
      profile.variants.find((item) => String(item.id) === String(profile.defaultVariant)) ||
      profile.variants[0]
    const composed = await withSlot({ deadline, waitMs: Math.min(5000, timeoutMs) }, () =>
      composeCharacter({
        sourceImagePath: sourceFile.path,
        characterImagePath,
        cutout: selectedVariant.cutout,
        plan: scenePlan,
        uploadDir: UPLOAD_DIR
      })
    )
    result = {
      resultUrl: `${publicBaseUrl}/uploads/${composed.filename}`,
      localPath: composed.localPath,
      provider: `hybrid-composite:${scenePlan.provider}`,
      blended: true,
      scenePlan,
      characterImagePath,
      characterBounds: composed.characterBounds,
      shadowBounds: composed.shadowBounds
    }
    log.info('hybrid blend complete', {
      characterId,
      variantId: scenePlan.variantId,
      sceneProvider: scenePlan.provider,
      anchor: scenePlan.anchor,
      scale: scenePlan.scale,
      bounds: composed.characterBounds
    })
  }

  if (config.isLive && result?.blended === false) {
    throw new Error('AI 溶图未产出合成图')
  }

  return result
}

module.exports = {
  runBlend
}
