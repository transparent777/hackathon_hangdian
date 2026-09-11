/**
 * Live HTTP provider 占位。
 * B 接入真实溶图 / 多模态 API 时，在此实现 fetch 调用。
 * 密钥仅从 config.apiKey 读取，禁止硬编码。
 */
const path = require('path')
const aiDefaults = require(path.join(__dirname, '../../../../ai/config.json'))

class AiProviderNotImplementedError extends Error {
  constructor(feature) {
    super(`[ai/http] ${feature} 尚未实现：请在 server/services/ai/providers/http.js 接入真实 API`)
    this.code = 'AI_NOT_IMPLEMENTED'
  }
}

async function blendImage(ctx) {
  const { config, promptText, referenceImagePath, sourceImagePath, publicResultPath } = ctx

  if (!config.apiKey) {
    throw new Error('AI_API_KEY 未配置')
  }

  // TODO(B): 调用溶图 API
  // 示例入参：config.apiBaseUrl + aiDefaults.providers.http.blendEndpoint
  // 示例字段：promptText, sourceImagePath, referenceImagePath, model: config.blendModel
  void promptText
  void referenceImagePath
  void sourceImagePath
  void publicResultPath
  void config
  void aiDefaults

  throw new AiProviderNotImplementedError('blend')
}

async function generateDiaryNote(ctx) {
  const { config, promptBundle, imagePath, fallbackText } = ctx

  if (!config.apiKey) {
    throw new Error('AI_API_KEY 未配置')
  }

  // TODO(B): 多模态 chat/completions，输入 imagePath + system/user prompt
  void promptBundle
  void imagePath
  void fallbackText
  void config

  throw new AiProviderNotImplementedError('diary')
}

module.exports = {
  AiProviderNotImplementedError,
  blendImage,
  generateDiaryNote
}
