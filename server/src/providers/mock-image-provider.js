class MockImageProvider {
  constructor() {
    this.name = 'mock'
  }

  async blend({ imageBuffer, mimeType }) {
    return {
      buffer: imageBuffer,
      mimeType,
      provider: this.name
    }
  }
}

module.exports = { MockImageProvider }
