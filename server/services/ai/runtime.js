const { createSemaphore } = require('./concurrency')
const { loadAiRuntimeConfig } = require('./config')
const { AITimeoutError, describe } = require('./errors')
const { sanitize } = require('./log')

let semaphore = null
let semaphoreLimit = 0
let lastError = null
let lastBlendError = null

function getSemaphore(limit) {
  if (!semaphore || semaphoreLimit !== limit) {
    semaphore = createSemaphore(limit)
    semaphoreLimit = limit
  }
  return semaphore
}

function semaphoreStats() {
  if (!semaphore) return { active: 0, pending: 0, limit: semaphoreLimit }
  return { active: semaphore.active, pending: semaphore.pending, limit: semaphore.limit }
}

function recordError(error, scope = 'general') {
  const info = describe(error)
  lastError = {
    code: info.code || info.name,
    kind: info.kind,
    status: info.status,
    stage: info.stage,
    message: sanitize(info.message),
    at: Date.now()
  }
  if (scope === 'blend') lastBlendError = lastError
  return info
}

function getLastError() {
  return lastError
}

function getLastBlendError() {
  return lastBlendError
}

async function withSlot({ deadline, waitMs = 5000 }, fn) {
  const cfg = loadAiRuntimeConfig()
  const sem = getSemaphore(cfg.concurrency)

  let budget = waitMs
  if (deadline) {
    const left = deadline - Date.now() - 1000
    if (left <= 0) {
      throw new AITimeoutError('预算已耗尽，未进入队列')
    }
    budget = Math.min(budget, left)
  }

  let release
  try {
    release = await sem.acquire({ timeoutMs: budget })
  } catch (error) {
    recordError(error)
    throw error
  }

  try {
    return await fn()
  } catch (error) {
    recordError(error)
    throw error
  } finally {
    release()
  }
}

function remainingMs(deadline, hardCap) {
  if (!deadline) return hardCap
  const left = deadline - Date.now()
  if (left < 1000) {
    throw new AITimeoutError('预算已耗尽')
  }
  return Math.max(1000, Math.min(hardCap, left))
}

module.exports = {
  withSlot,
  semaphoreStats,
  getLastError,
  getLastBlendError,
  recordError,
  remainingMs
}
