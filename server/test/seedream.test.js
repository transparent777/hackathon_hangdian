const test = require('node:test')
const assert = require('node:assert/strict')
const { buildSeedreamBody } = require('../services/ai/providers/http')

test('sends the scene and character reference as ordered images without a watermark', () => {
  const body = buildSeedreamBody({
    model: 'test-model',
    prompt: 'test prompt',
    image: ['data:image/jpeg;base64,scene', 'data:image/png;base64,character'],
    watermark: false
  })

  assert.deepEqual(body.image, [
    'data:image/jpeg;base64,scene',
    'data:image/png;base64,character'
  ])
  assert.equal(body.watermark, false)
  assert.equal(body.response_format, 'url')
})
