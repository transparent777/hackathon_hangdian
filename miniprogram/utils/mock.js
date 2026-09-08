const { getCharacterById } = require('./characters')

// 模拟 AI 生成耗时
function mockBlend({ characterId, imagePath }) {
  const character = getCharacterById(characterId)

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        resultUrl: imagePath, // 9/08：先原图占位，证明流程通了
        companionText: character.quote,
        characterName: character.name,
        taskId: `mock-${Date.now()}`
      })
    }, 1500)
  })
}

module.exports = {
  mockBlend
}
