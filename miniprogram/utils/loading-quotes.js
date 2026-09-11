/** 溶图等待时陪伴兽名言（趣味 Loading） **/
const LOADING_QUOTES = {
  naiwa: [
    '哟齁齁，反正我哪儿都不去。',
    '摆烂也是一种陪伴。',
    '哦呀，哇嘎的纳塞。',
    '安迪~~~~~~~'
  ],
  doro: [
    '什么都不想，就躺在你旁边。',
    '橘子分你一半，我就不慌了。',
    '我学着一个人一整天都不失落。',
    '有你在，就不用缩成一团了。'
  ],
  maodie: [
    '三哈化气乃是武林绝学。',
    '哈基米南北绿豆~哈！',
    '哼，趁着大狗不在……',
    '难道我不是一只特别可爱的小猫咪？'
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
