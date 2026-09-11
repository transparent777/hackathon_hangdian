const path = require('path')

const ROOT = path.join(__dirname, '../../..')
const aiDefaults = require(path.join(ROOT, 'ai/config.json'))

function maskSecret(value) {
  if (!value) return '(unset)'
  if (value.length <= 8) return '***'
  return `${value.slice(0, 4)}***${value.slice(-2)}`
}

function loadAiRuntimeConfig() {
  const mode = (process.env.AI_MODE || 'mock').toLowerCase()
  const apiKey = process.env.AI_API_KEY || ''
  const apiBaseUrl = (process.env.AI_API_BASE_URL || '').replace(/\/$/, '')

  return {
    mode,
    apiKey,
    apiBaseUrl,
    blendModel: process.env.AI_BLEND_MODEL || 'placeholder-blend-model',
    diaryModel: process.env.AI_DIARY_MODEL || 'placeholder-vision-model',
    timeoutMs: Number(process.env.AI_TIMEOUT_MS) || aiDefaults.blend.timeoutMs,
    publicBaseUrl: (process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`).replace(
      /\/$/,
      ''
    ),
    isLive: mode === 'live' && Boolean(apiKey)
  }
}

function logAiBootSummary(config) {
  console.log(
    `[ai] mode=${config.mode} live=${config.isLive} key=${maskSecret(config.apiKey)} base=${config.apiBaseUrl || '(default)'}`
  )
}

module.exports = {
  loadAiRuntimeConfig,
  maskSecret,
  logAiBootSummary,
  AI_ROOT: path.join(ROOT, 'ai')
}
