const test = require('node:test')
const assert = require('node:assert/strict')
const { normalizeScenePlan, buildFallbackScenePlan } = require('../services/ai/scene')
const { extractJsonObject } = require('../services/ai/providers/deepseek')

const profile = {
  defaultVariant: 'calm',
  defaultAnchor: { x: 0.5, y: 0.88 },
  defaultScale: 0.24,
  variants: [
    { id: 'calm' },
    { id: 'happy' }
  ]
}

test('normalizes a scene plan and rejects unknown variants', () => {
  const plan = normalizeScenePlan(
    {
      variantId: 'unknown',
      expression: '开心',
      anchor: { x: 8, y: -2 },
      scale: 0.9,
      rotation: 30
    },
    profile
  )

  assert.equal(plan.variantId, 'calm')
  assert.deepEqual(plan.anchor, { x: 0.9, y: 0.5 })
  assert.equal(plan.scale, 0.3)
  assert.equal(plan.rotation, 6)
})

test('uses profile defaults when scene analysis is unavailable', () => {
  const plan = buildFallbackScenePlan(profile)
  assert.equal(plan.variantId, 'calm')
  assert.deepEqual(plan.anchor, { x: 0.5, y: 0.82 })
  assert.equal(plan.scale, 0.24)
})

test('extracts JSON from plain text or a fenced response', () => {
  assert.deepEqual(extractJsonObject('{"variantId":"happy"}'), { variantId: 'happy' })
  assert.deepEqual(extractJsonObject('```json\n{"variantId":"calm"}\n```'), {
    variantId: 'calm'
  })
})
