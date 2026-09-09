const { getCharacterById } = require('./characters')

function mockBlend({ characterId, imagePath }) {
  const character = getCharacterById(characterId)

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        resultUrl: imagePath,
        companionText: character.quote,
        characterName: character.name,
        characterId: character.characterId,
        characterImage: character.image,
        taskId: `mock-${Date.now()}`
      })
    }, 1800)
  })
}

module.exports = {
  mockBlend
}
