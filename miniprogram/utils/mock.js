const { getCharacterById } = require('./characters')
const { mockDiaryFields } = require('./mock-diary')

function mockBlend({ characterId, imagePath, rarity }) {
  const character = getCharacterById(characterId, rarity || '普通')
  const diary = mockDiaryFields(characterId, rarity || character.rarity || '普通')

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        resultUrl: imagePath,
        companionText: character.quote,
        characterName: character.name,
        characterId: character.characterId,
        characterImage: character.image,
        diaryNote: diary.diaryNote,
        fontStyle: diary.fontStyle,
        taskId: `mock-${Date.now()}`
      })
    }, 1800)
  })
}

module.exports = {
  mockBlend
}
