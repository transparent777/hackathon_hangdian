const { MockImageProvider } = require('./mock-image-provider')

function createImageProvider(providerName = 'mock') {
  if (providerName === 'mock') {
    return new MockImageProvider()
  }

  throw new Error(`未支持的 AI_PROVIDER: ${providerName}。C 确定服务后请在 server/src/providers/ 添加适配器。`)
}

module.exports = { createImageProvider }
