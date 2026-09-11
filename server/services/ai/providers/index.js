const mock = require('./mock')
const http = require('./http')

function getProvider(config) {
  return config.isLive ? http : mock
}

module.exports = {
  getProvider,
  mock,
  http
}
