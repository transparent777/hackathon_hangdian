/**
 * Mock provider：不调用外网 AI，用于答辩前前端联调。
 */
async function blendImage({ sourceImagePath, publicResultPath }) {
  return {
    resultUrl: publicResultPath,
    provider: 'mock',
    blended: false
  }
}

async function generateDiaryNote({ fallbackText }) {
  return {
    diaryNote: fallbackText,
    provider: 'mock'
  }
}

module.exports = {
  blendImage,
  generateDiaryNote
}
