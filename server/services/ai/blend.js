const { loadAiRuntimeConfig } = require('./config')
const { buildBlendPromptText, resolveReferenceImagePath, loadBlendPrompt } = require('./prompts')
const { getProvider } = require('./providers')
const mockProvider = require('./providers/mock')

async function runBlend({ characterId, rarityLabel, sourceFile, publicBaseUrl }) {
  const config = loadAiRuntimeConfig()
  const provider = getProvider(config)
  const promptText = buildBlendPromptText(characterId, rarityLabel)
  const blendCfg = loadBlendPrompt(characterId)
  const referenceImagePath = resolveReferenceImagePath(characterId)

  const relativeUrl = `/uploads/${sourceFile.filename}`
  const publicResultPath = `${publicBaseUrl}${relativeUrl}`

  const ctx = {
    config,
    characterId,
    rarityLabel,
    promptText,
    negativePrompt: blendCfg.blend?.negativePrompt || '',
    strength: blendCfg.blend?.strength,
    referenceImagePath,
    sourceImagePath: sourceFile.path,
    publicResultPath
  }

  try {
    return await provider.blendImage(ctx)
  } catch (error) {
    if (config.isLive) {
      console.warn('[ai/blend] live failed, fallback mock:', error.message)
      return mockProvider.blendImage(ctx)
    }
    throw error
  }
}

module.exports = {
  runBlend
}
