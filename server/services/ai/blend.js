const path = require('path')
const { loadAiRuntimeConfig } = require('./config')
const { buildBlendPromptText, resolveReferenceImagePath, loadBlendPrompt } = require('./prompts')
const { getProvider } = require('./providers')
const { withSlot, remainingMs } = require('./runtime')
const { assertSupportedImageFile } = require('./image-utils')
const { log } = require('./log')

const UPLOAD_DIR = path.join(__dirname, '../../uploads')

async function runBlend({ characterId, rarityLabel, sourceFile, publicBaseUrl, deadline }) {
  const config = loadAiRuntimeConfig()
  assertSupportedImageFile(sourceFile.path)

  const provider = getProvider(config)
  const promptText = buildBlendPromptText(characterId, rarityLabel)
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
    strength: blendCfg.blend?.strength,
    referenceImagePath,
    sourceImagePath: sourceFile.path,
    publicResultPath,
    publicBaseUrl,
    uploadDir: UPLOAD_DIR,
    timeoutMs,
    deadline
  }

  const result = await withSlot({ deadline, waitMs: Math.min(5000, timeoutMs) }, () =>
    provider.blendImage(ctx)
  )

  if (config.isLive && result?.blended === false) {
    throw new Error('AI 溶图未产出合成图')
  }

  return result
}

module.exports = {
  runBlend
}
