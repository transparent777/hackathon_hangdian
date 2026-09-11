const path = require('path')

const ROOT = path.join(__dirname, '../../..')
const aiDefaults = require(path.join(ROOT, 'ai/config.json'))

const SEEDREAM_MODELS = aiDefaults.seedream?.models || {}

function resolveBlendModel() {
  if (process.env.AI_BLEND_MODEL) {
    return process.env.AI_BLEND_MODEL.trim()
  }

  const variant = (process.env.AI_BLEND_VARIANT || aiDefaults.seedream?.defaultVariant || 'lite').toLowerCase()
  const entry = SEEDREAM_MODELS[variant] || SEEDREAM_MODELS.lite
  return entry?.id || 'doubao-seedream-5-0-260128'
}

function resolveBlendSize(modelId) {
  const requested = (process.env.AI_BLEND_SIZE || '2K').trim()
  const entry = Object.values(SEEDREAM_MODELS).find((item) => item.id === modelId)
  const allowed = entry?.sizes || ['2K', '3K', '4K']

  if (allowed.includes(requested)) {
    return requested
  }

  return allowed.includes('2K') ? '2K' : allowed[0]
}

function maskSecret(value) {
  if (!value) return '(unset)'
  if (value.length <= 8) return '***'
  return `${value.slice(0, 4)}***${value.slice(-2)}`
}

function loadAiRuntimeConfig() {
  const mode = (process.env.AI_MODE || 'mock').toLowerCase()
  const apiKey = process.env.AI_API_KEY || ''
  const apiBaseUrl = (process.env.AI_API_BASE_URL || '').replace(/\/$/, '')
  const diaryApiKey = process.env.AI_DIARY_API_KEY || ''
  const diaryApiBaseUrl = (
    process.env.AI_DIARY_API_BASE_URL ||
    aiDefaults.diary?.defaultBaseUrl ||
    'https://api.deepseek.com'
  ).replace(/\/$/, '')
  const diaryModel = process.env.AI_DIARY_MODEL || aiDefaults.diary?.model || 'deepseek-flash'

  return {
    mode,
    apiKey,
    apiBaseUrl,
    blendModel: resolveBlendModel(),
    blendVariant: (process.env.AI_BLEND_VARIANT || aiDefaults.seedream?.defaultVariant || 'lite').toLowerCase(),
    blendSize: resolveBlendSize(resolveBlendModel()),
    diaryApiKey,
    diaryApiBaseUrl,
    diaryModel,
    diaryTimeoutMs: Number(process.env.AI_DIARY_TIMEOUT_MS) || aiDefaults.diary?.timeoutMs || 45000,
    timeoutMs: Number(process.env.AI_TIMEOUT_MS) || aiDefaults.blend.timeoutMs,
    publicBaseUrl: (process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`).replace(
      /\/$/,
      ''
    ),
    isLive: mode === 'live' && Boolean(apiKey),
    isDiaryLive: mode === 'live' && Boolean(diaryApiKey)
  }
}

function logAiBootSummary(config) {
  console.log(
    `[ai] mode=${config.mode} blend=${config.isLive} model=${config.blendModel} size=${config.blendSize} key=${maskSecret(config.apiKey)} | diary=${config.isDiaryLive} model=${config.diaryModel} key=${maskSecret(config.diaryApiKey)}`
  )
}

module.exports = {
  loadAiRuntimeConfig,
  resolveBlendModel,
  resolveBlendSize,
  maskSecret,
  logAiBootSummary,
  AI_ROOT: path.join(ROOT, 'ai')
}
