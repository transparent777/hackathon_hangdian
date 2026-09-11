const mock = require('./mock')
const http = require('./http')
const deepseek = require('./deepseek')

function getProvider(config) {
  return config.isLive ? http : mock
}

function getDiaryProvider(config) {
  return config.isDiaryLive ? deepseek : mock
}

module.exports = {
  getProvider,
  getDiaryProvider,
  mock,
  http,
  deepseek
}
