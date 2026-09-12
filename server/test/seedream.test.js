const test = require('node:test')
const assert = require('node:assert/strict')
const { buildSeedreamBody, resolveSceneEditRegion } = require('../services/ai/providers/http')
const { loadAiRuntimeConfig, resolveBlendModel } = require('../services/ai/config')
const { expandRegion } = require('../services/ai/segmenter')

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

test('hybrid strategy always resolves to Seedream Pro', () => {
  const previousStrategy = process.env.AI_BLEND_STRATEGY
  const previousVariant = process.env.AI_BLEND_VARIANT
  process.env.AI_BLEND_STRATEGY = 'hybrid'
  process.env.AI_BLEND_VARIANT = '4.5'
  try {
    assert.equal(resolveBlendModel(), 'doubao-seedream-5-0-pro-260628')
  } finally {
    if (previousStrategy === undefined) delete process.env.AI_BLEND_STRATEGY
    else process.env.AI_BLEND_STRATEGY = previousStrategy
    if (previousVariant === undefined) delete process.env.AI_BLEND_VARIANT
    else process.env.AI_BLEND_VARIANT = previousVariant
  }
})

test('uses direct Seedream candidate output as the default blend strategy', () => {
  const previousStrategy = process.env.AI_BLEND_STRATEGY
  delete process.env.AI_BLEND_STRATEGY
  try {
    const config = loadAiRuntimeConfig()
    assert.equal(config.blendStrategy, 'seedream-full')
    assert.equal(config.blendModel, 'doubao-seedream-5-0-pro-260628')
  } finally {
    if (previousStrategy !== undefined) process.env.AI_BLEND_STRATEGY = previousStrategy
  }
})

test('builds the edit region around the planned character position', () => {
  const region = resolveSceneEditRegion({ anchor: { x: 0.8, y: 0.72 }, scale: 0.25 })
  assert.ok(region.x <= 0.8 && region.x + region.w >= 0.8)
  assert.ok(region.y < 0.72 && region.y + region.h > 0.72)
  assert.ok(region.x >= 0 && region.x + region.w <= 1)
})

test('adds modest padding without pulling distant table objects into segmentation', () => {
  const region = expandRegion({ x1: 469, y1: 553, x2: 1237, y2: 1087, width: 1706, height: 1279 })
  assert.deepEqual(region, { x: 377, y: 489, width: 952, height: 662 })
})
