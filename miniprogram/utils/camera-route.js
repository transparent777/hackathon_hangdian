const RARITY_BY_COVER_KEY = {
  normal: '普通',
  rare: '稀有',
  legendary: '传说'
}

function inferRarityFromCover(imagePath) {
  const match = /\/(normal|rare|legendary)\.jpg(?:\?.*)?$/.exec(imagePath || '')
  if (!match) return '普通'
  return RARITY_BY_COVER_KEY[match[1]] || '普通'
}

function buildCameraPageUrl({ characterId, name, image, rarity, imagePath }) {
  const resolvedRarity = rarity || inferRarityFromCover(image)
  const params = [
    `characterId=${characterId}`,
    `name=${encodeURIComponent(name || '')}`,
    `rarity=${encodeURIComponent(resolvedRarity)}`,
    `image=${encodeURIComponent(image || '')}`
  ]

  if (imagePath) {
    params.push(`imagePath=${encodeURIComponent(imagePath)}`)
  }

  return `/pages/camera/camera?${params.join('&')}`
}

module.exports = {
  buildCameraPageUrl,
  inferRarityFromCover
}
