const { AITimeoutError, AIProviderError, isNetworkError } = require('./errors')
const { log } = require('./log')

const RETRIABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504])

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseRetryAfter(headerValue) {
  if (!headerValue) return null
  const seconds = Number(headerValue)
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 5000)
  const date = Date.parse(headerValue)
  if (Number.isFinite(date)) return Math.min(Math.max(date - Date.now(), 0), 5000)
  return null
}

function canStillWait(deadline, waitMs) {
  if (!deadline) return true
  return deadline - Date.now() - waitMs >= 1000
}

async function fetchJson(url, options = {}) {
  const {
    method = 'POST',
    headers = {},
    body,
    timeoutMs = 15000,
    retryMax = 1,
    deadline = 0
  } = options

  let attempt = 0

  for (;;) {
    const remaining =
      deadline > 0 ? Math.max(1000, Math.min(timeoutMs, deadline - Date.now())) : timeoutMs

    if (deadline > 0 && deadline - Date.now() < 1000) {
      throw new AITimeoutError('预算已耗尽')
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), remaining)

    let res
    try {
      res = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal
      })
    } catch (error) {
      clearTimeout(timer)
      if (error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
        throw new AITimeoutError(`请求超时（${remaining}ms）`, { cause: error })
      }

      if (attempt < retryMax && isNetworkError(error)) {
        const waitMs = 300 * 2 ** attempt + Math.floor(Math.random() * 200)
        if (canStillWait(deadline, waitMs)) {
          attempt += 1
          log.warn('网络错误，退避重试', { attempt, waitMs })
          await sleep(waitMs)
          continue
        }
      }
      throw error
    } finally {
      clearTimeout(timer)
    }

    const text = await res.text().catch(() => '')
    let json = {}
    if (text) {
      try {
        json = JSON.parse(text)
      } catch (_error) {
        json = {}
      }
    }

    if (res.ok) {
      return { status: res.status, json }
    }

    const detail = text.slice(0, 512)

    if (RETRIABLE_STATUS.has(res.status) && attempt < retryMax) {
      const suggested = res.status === 429 ? parseRetryAfter(res.headers.get('retry-after')) : null
      const waitMs = suggested === null ? 300 * 2 ** attempt + Math.floor(Math.random() * 200) : suggested
      if (canStillWait(deadline, waitMs)) {
        attempt += 1
        log.warn('provider 可重试状态', { status: res.status, attempt, waitMs })
        await sleep(waitMs)
        continue
      }
    }

    const message = json.error?.message || json.message || detail || `HTTP ${res.status}`
    throw new AIProviderError(message, {
      status: res.status,
      code: `HTTP_${res.status}`,
      retriable: RETRIABLE_STATUS.has(res.status)
    })
  }
}

module.exports = { fetchJson }
