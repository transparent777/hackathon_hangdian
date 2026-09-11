class AIError extends Error {
  constructor(message, options = {}) {
    super(message)
    this.name = this.constructor.name
    this.kind = options.kind || 'ai'
    this.code = options.code || null
    this.status = options.status || null
    this.retriable = Boolean(options.retriable)
    this.cause = options.cause
  }
}

class AIConfigError extends AIError {
  constructor(message, options = {}) {
    super(message, { ...options, kind: 'config', retriable: false })
  }
}

class AIProviderError extends AIError {
  constructor(message, options = {}) {
    super(message, { ...options, kind: 'provider' })
  }
}

class AITimeoutError extends AIError {
  constructor(message, options = {}) {
    super(message, { ...options, kind: 'timeout', retriable: false })
  }
}

class AISemaphoreTimeout extends AIError {
  constructor(message, options = {}) {
    super(message, { ...options, kind: 'busy', retriable: false })
  }
}

class AIExtractError extends AIError {
  constructor(message, options = {}) {
    super(message, { ...options, kind: 'extract', retriable: false })
  }
}

function isNetworkError(error) {
  if (!error) return false
  if (error.name === 'TypeError') return true
  const code = error.cause && error.cause.code
  return typeof code === 'string' && /^(ECONN|ENOTFOUND|EAI_|UND_ERR|ETIMEDOUT|EPIPE)/.test(code)
}

function describe(error) {
  const err = error instanceof AIError ? error : new AIError(error?.message || String(error))
  return {
    name: err.name,
    kind: err.kind,
    code: err.code,
    status: err.status,
    retriable: err.retriable,
    message: err.message
  }
}

module.exports = {
  AIError,
  AIConfigError,
  AIProviderError,
  AITimeoutError,
  AIExtractError,
  AISemaphoreTimeout,
  isNetworkError,
  describe
}
