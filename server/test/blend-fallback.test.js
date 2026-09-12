const test = require('node:test')
const assert = require('node:assert/strict')
const { AIStageError } = require('../services/ai/errors')
const { buildCandidateFallback } = require('../services/ai/blend')
const { resolveCharacterRegion } = require('../services/ai/segmenter')

test('keeps the complete AI candidate when foreground segmentation fails', () => {
  const candidate = {
    resultUrl: 'http://localhost/uploads/candidate.jpg',
    localPath: 'uploads/candidate.jpg',
    provider: 'seedream',
    blended: true
  }
  const scenePlan = { anchor: { x: 0.5, y: 0.82 }, scale: 0.25 }
  const error = new AIStageError('foreground_segmentation', new Error('mask rejected'))

  const result = buildCandidateFallback(candidate, scenePlan, error)

  assert.equal(result.resultUrl, candidate.resultUrl)
  assert.equal(result.localPath, candidate.localPath)
  assert.equal(result.degraded, true)
  assert.equal(result.backgroundPreserved, false)
  assert.equal(result.fallbackKind, 'ai-candidate')
  assert.equal(result.failedStage, 'foreground_segmentation')
})

test('builds a tight character region from the planned anchor and scale', () => {
  const editRegion = { x1: 469, y1: 553, x2: 1237, y2: 1087, width: 1706, height: 1279 }
  const region = resolveCharacterRegion(editRegion, {
    anchor: { x: 0.5, y: 0.82 },
    scale: 0.25
  })

  assert.deepEqual(region, { x: 604, y: 681, width: 498, height: 502 })
  assert.ok(region.width < editRegion.x2 - editRegion.x1)
})
