/**
 * Mock provider：不调用外网 AI，用于答辩前前端联调。
 */
async function blendImage({ sourceImagePath, publicResultPath }) {
  return {
    resultUrl: publicResultPath,
    localPath: sourceImagePath,
    provider: 'mock',
    blended: false
  }
}

const { getFallbackDiaryNote } = require('../fallbacks')

async function generateDiaryNote({ characterId, rarityKey, fallbackText }) {
  return {
    diaryNote: getFallbackDiaryNote(characterId, rarityKey) || fallbackText,
    provider: 'mock'
  }
}

module.exports = {
  blendImage,
  generateDiaryNote
}
