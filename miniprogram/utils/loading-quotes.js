/** 溶图等待时陪伴兽名言（趣味 Loading），D 可扩写 */
const LOADING_QUOTES = {
  naiwa: [
    '哟齁齁，反正我哪儿都不去。',
    '摆烂也是一种陪伴。',
    '你先忙，我在这儿傻笑。',
    '今天也不想努力，就赖着你。'
  ],
  doro: [
    '什么都不想，就躺在你旁边。',
    '橘子分你一半，我就不慌了。',
    '眼神放空中……但我在哦。',
    '有你在，就不用缩成一团了。'
  ],
  maodie: [
    '这儿我罩着，别多嘴。',
    '老艺术家的从容，就是陪你发呆。',
    '哼，勉强陪你看一会儿。',
    '别动，让我先视察一下领地。'
  ]
}

function pickLoadingQuote(characterId) {
  const pool = LOADING_QUOTES[characterId] || LOADING_QUOTES.naiwa
  const index = Math.floor(Math.random() * pool.length)
  return pool[index]
}

module.exports = {
  LOADING_QUOTES,
  pickLoadingQuote
}
