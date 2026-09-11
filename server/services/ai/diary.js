const { loadAiRuntimeConfig } = require('./config')
const { getDiaryPromptBundle, RARITY_KEY } = require('./prompts')
const { getFallbackDiaryNote } = require('./fallbacks')
const { getDiaryProvider } = require('./providers')
const mockProvider = require('./providers/mock')

async function runDiary({ characterId, rarityLabel, imagePath }) {
  const config = loadAiRuntimeConfig()
  const provider = getDiaryProvider(config)
  const rarityKey = RARITY_KEY[rarityLabel] || 'normal'
  const promptBundle = getDiaryPromptBundle(characterId, rarityLabel)
  const fallbackText = getFallbackDiaryNote(characterId, rarityKey)

  const ctx = {
    config,
    characterId,
    rarityLabel,
    rarityKey,
    promptBundle,
    imagePath,
    fallbackText
  }

  try {
    const result = await provider.generateDiaryNote(ctx)
    return {
      diaryNote: result.diaryNote || fallbackText,
      fontStyle: promptBundle.fontStyle,
      provider: result.provider || (config.isDiaryLive ? 'deepseek-flash' : 'mock')
    }
  } catch (error) {
    if (config.isDiaryLive) {
      console.warn('[ai/diary] live failed, fallback mock:', error.message)
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
