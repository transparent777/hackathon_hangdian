const { log } = require('./log')
const deepseek = require('./providers/deepseek')

const DEFAULT_PLAN = {
  variantId: '',
  expression: '根据画面里最显著的物体产生自然且有辨识度的表情',
  action: '根据接触面和附近物体设计新的姿势，可以趴、探头、伸手或侧身观察',
  interaction: '必须与画面中真实可见的具体物体形成动作或视线互动',
  anchor: { x: 0.5, y: 0.82 },
  scale: 0.25,
  rotation: 0
}

function clamp(value, min, max, fallback) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback
}

function buildFallbackScenePlan(profile = {}) {
  const configuredAnchor = profile.defaultAnchor || DEFAULT_PLAN.anchor
  return normalizeScenePlan(
    {
      ...DEFAULT_PLAN,
      variantId: profile.defaultVariant || profile.variants?.[0]?.id || '',
      anchor: { x: configuredAnchor.x, y: Math.min(configuredAnchor.y, 0.82) },
      scale: profile.defaultScale || DEFAULT_PLAN.scale
    },
    profile
  )
}

function normalizeScenePlan(candidate, profile = {}) {
  const configuredAnchor = profile.defaultAnchor || DEFAULT_PLAN.anchor
  const fallback = {
    ...DEFAULT_PLAN,
    variantId: profile.defaultVariant || profile.variants?.[0]?.id || '',
    anchor: { x: configuredAnchor.x, y: Math.min(configuredAnchor.y, 0.82) },
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
