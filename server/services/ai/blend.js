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
const { withSlot, remainingMs, recordError } = require('./runtime')
const { assertSupportedImageFile } = require('./image-utils')
const { buildScenePlan, buildFallbackScenePlan } = require('./scene')
const { composeCharacter, composeGeneratedCharacter } = require('./compositor')
const { segmentCharacter } = require('./segmenter')
const { log } = require('./log')
const { AIStageError } = require('./errors')

const UPLOAD_DIR = path.join(__dirname, '../../uploads')

async function runStage(stage, fn) {
  try {
    return await fn()
  } catch (error) {
    const wrapped = error instanceof AIStageError ? error : new AIStageError(stage, error)
    recordError(wrapped, 'blend')
    throw wrapped
  }
}

async function runAssetComposite({
  config,
  characterId,
  profile,
  sourceFile,
  publicBaseUrl,
  deadline,
  scenePlan
}) {
  const plan =
    scenePlan ||
    (await buildScenePlan({
      config,
      characterId,
      characterName: profile.characterName,
      profile,
      imagePath: sourceFile.path,
      deadline
    }))
  const selectedVariant =
    profile.variants.find((item) => String(item.id) === String(plan.variantId)) ||
    profile.variants.find((item) => String(item.id) === String(profile.defaultVariant)) ||
    profile.variants[0]
  const characterImagePath = resolveVariantImagePath(characterId, plan.variantId)
  const composed = await composeCharacter({
    sourceImagePath: sourceFile.path,
    characterImagePath,
    cutout: selectedVariant.cutout,
    plan,
    uploadDir: UPLOAD_DIR
  })

  return {
    resultUrl: `${publicBaseUrl}/uploads/${composed.filename}`,
    localPath: composed.localPath,
    provider: `asset-composite:${plan.provider}`,
    blended: true,
    scenePlan: plan,
    characterImagePath,
    characterBounds: composed.characterBounds,
    shadowBounds: composed.shadowBounds,
    degraded: false,
    backgroundPreserved: true
  }
}

async function runBlend({ characterId, rarityLabel, sourceFile, publicBaseUrl, deadline }) {
  const config = loadAiRuntimeConfig()
  assertSupportedImageFile(sourceFile.path)

  const promptText = buildBlendPromptText(characterId)
  const blendCfg = loadBlendPrompt(characterId)
  if (blendCfg._source === 'builtin') {
    log.warn('溶图使用内置 prompt 兜底', { characterId })
  }
  const referenceImagePath = resolveReferenceImagePath(characterId)
  const profile = getCompositionProfile(characterId)
  if (!profile.variants.length) {
    throw new Error(`角色 ${characterId} 未配置透明动作素材`)
  }

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
  } else if (config.blendStrategy === 'asset-composite' || !config.isLive) {
    result = await runAssetComposite({
      config,
      characterId,
      profile,
      sourceFile,
      publicBaseUrl,
      deadline
    })
  } else {
    const scenePlan = await buildScenePlan({
      config,
      characterId,
      characterName: profile.characterName,
      profile,
      imagePath: sourceFile.path,
      deadline
    })
    const provider = getProvider(config)
    try {
      const candidate = await runStage('candidate_generation', () =>
        withSlot({ deadline, waitMs: Math.min(5000, timeoutMs) }, () =>
          provider.blendImage({ ...ctx, scenePlan })
        )
      )
      const mask = await runStage('foreground_segmentation', () =>
        segmentCharacter({
          sourceImagePath: sourceFile.path,
          candidateImagePath: candidate.localPath,
          editRegion: candidate.editRegion,
          uploadDir: UPLOAD_DIR,
          timeoutMs: Math.min(20000, remainingMs(deadline, config.timeoutMs))
        })
      )
      const composed = await runStage('background_composite', () => {
        const imageWidth = candidate.editRegion.width
        const imageHeight = candidate.editRegion.height
        return composeGeneratedCharacter({
          sourceImagePath: sourceFile.path,
          candidateImagePath: candidate.localPath,
          maskImagePath: mask.localPath,
          uploadDir: UPLOAD_DIR,
          focus: {
            x: scenePlan.anchor.x * imageWidth,
            y: (scenePlan.anchor.y - scenePlan.scale / 2) * imageHeight
          }
        })
      })
      result = {
        resultUrl: `${publicBaseUrl}/uploads/${composed.filename}`,
        localPath: composed.localPath,
        provider: 'seedream-extract-composite',
        blended: true,
        scenePlan,
        characterBounds: composed.characterBounds,
        shadowBounds: composed.shadowBounds,
        foregroundRatio: composed.foregroundRatio,
        segmentationModel: mask.model,
        degraded: false,
        backgroundPreserved: true
      }
      log.info('seedream candidate extracted', {
        characterId,
        model: candidate.model,
        bounds: composed.characterBounds,
        foregroundRatio: composed.foregroundRatio
      })
    } catch (error) {
      log.warn('hybrid blend stage failed', {
        stage: error.stage || 'unknown',
        message: log.sanitize(error.message)
      })
      if (!config.allowAssetFallback) throw error
      result = await runAssetComposite({
        config: { ...config, isDiaryLive: false },
        characterId,
        profile,
        sourceFile,
        publicBaseUrl,
        deadline,
        scenePlan: { ...buildFallbackScenePlan(profile), provider: 'fallback' }
      })
      result.fallbackReason = log.sanitize(error.message)
      result.failedStage = error.stage || 'unknown'
      result.degraded = true
      result.backgroundPreserved = true
    }
  }

  if (config.isLive && result?.blended === false) {
    throw new Error('AI 溶图未产出合成图')
  }

  return result
}

module.exports = {
  runBlend,
  runAssetComposite
}
