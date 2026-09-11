const { loadAiRuntimeConfig } = require('./config')
const { getDiaryPromptBundle, RARITY_KEY } = require('./prompts')
const { getFallbackDiaryNote } = require('./fallbacks')
const { getDiaryProvider } = require('./providers')
const mockProvider = require('./providers/mock')
const { withSlot, remainingMs } = require('./runtime')
const { log } = require('./log')

async function runDiary({ characterId, rarityLabel, imagePath, deadline }) {
  const config = loadAiRuntimeConfig()
  const provider = getDiaryProvider(config)
  const rarityKey = RARITY_KEY[rarityLabel] || 'normal'
  const promptBundle = getDiaryPromptBundle(characterId, rarityLabel)
  const fallbackText = getFallbackDiaryNote(characterId, rarityKey)
  const timeoutMs = remainingMs(deadline, config.diaryTimeoutMs)

  const ctx = {
    config,
    characterId,
    rarityLabel,
    rarityKey,
    promptBundle,
    imagePath,
    fallbackText,
    timeoutMs,
    deadline
  }

  try {
    const result = await withSlot({ deadline, waitMs: Math.min(5000, timeoutMs) }, () =>
      provider.generateDiaryNote(ctx)
    )
    return {
      diaryNote: result.diaryNote || fallbackText,
      fontStyle: promptBundle.fontStyle,
      provider: result.provider || (config.isDiaryLive ? 'deepseek-flash' : 'mock')
    }
  } catch (error) {
    if (config.isDiaryLive) {
      log.warn('live 日记失败，降级 mock', log.sanitize(error.message))
      const result = await mockProvider.generateDiaryNote(ctx)
      return {
        diaryNote: result.diaryNote,
        fontStyle: promptBundle.fontStyle,
        provider: 'mock-fallback'
      }
    }
    throw error
  }
}

module.exports = {
  runDiary
}
