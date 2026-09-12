const { log } = require('./log')
const deepseek = require('./providers/deepseek')

const DEFAULT_PLAN = {
  variantId: '',
  expression: '自然地看向画面中的主要物体',
  action: '保持角色原有动作',
  interaction: '陪伴当前场景',
  anchor: { x: 0.5, y: 0.88 },
  scale: 0.25,
  rotation: 0
}

function clamp(value, min, max, fallback) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback
}

function buildFallbackScenePlan(profile = {}) {
  return normalizeScenePlan(
    {
      ...DEFAULT_PLAN,
      variantId: profile.defaultVariant || profile.variants?.[0]?.id || '',
      anchor: profile.defaultAnchor || DEFAULT_PLAN.anchor,
      scale: profile.defaultScale || DEFAULT_PLAN.scale
    },
    profile
  )
}

function normalizeScenePlan(candidate, profile = {}) {
  const fallback = {
    ...DEFAULT_PLAN,
    variantId: profile.defaultVariant || profile.variants?.[0]?.id || '',
    anchor: profile.defaultAnchor || DEFAULT_PLAN.anchor,
    scale: profile.defaultScale || DEFAULT_PLAN.scale
  }
  const allowedVariantIds = new Set((profile.variants || []).map((item) => String(item.id)))
  const requestedVariant = String(candidate?.variantId || '')

  return {
    variantId: allowedVariantIds.has(requestedVariant) ? requestedVariant : fallback.variantId,
    expression: String(candidate?.expression || fallback.expression).slice(0, 80),
    action: String(candidate?.action || fallback.action).slice(0, 100),
    interaction: String(candidate?.interaction || fallback.interaction).slice(0, 100),
    anchor: {
      x: clamp(candidate?.anchor?.x, 0.1, 0.9, fallback.anchor.x),
      y: clamp(candidate?.anchor?.y, 0.5, 0.95, fallback.anchor.y)
    },
    scale: clamp(candidate?.scale, 0.18, 0.3, fallback.scale),
    rotation: clamp(candidate?.rotation, -6, 6, 0)
  }
}

async function buildScenePlan({ config, characterId, characterName, profile, imagePath, deadline }) {
  const fallback = buildFallbackScenePlan(profile)
  if (!config.isDiaryLive || !profile?.variants?.length) {
    return { ...fallback, provider: 'fallback' }
  }

  try {
    const candidate = await deepseek.analyzeScene({
      config,
      characterId,
      characterName,
      profile,
      imagePath,
      timeoutMs: Math.min(config.diaryTimeoutMs, 20000),
      deadline
    })
    return { ...normalizeScenePlan(candidate, profile), provider: 'deepseek-vision' }
  } catch (error) {
    log.warn('scene analysis fallback', log.sanitize(error.message))
    return { ...fallback, provider: 'fallback' }
  }
}

module.exports = {
  DEFAULT_PLAN,
  normalizeScenePlan,
  buildFallbackScenePlan,
  buildScenePlan
}
