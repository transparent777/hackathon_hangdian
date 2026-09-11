const fs = require('fs/promises')
const path = require('path')

const SAFETY_MS = 10 * 60 * 1000
const DEFAULT_INTERVAL_MS = 30 * 60 * 1000

async function sweepOnce({ dir, ttlMs, logger }) {
  const cutoff = Date.now() - Math.max(ttlMs, SAFETY_MS)

  let names
  try {
    names = await fs.readdir(dir)
  } catch (_error) {
    return { scanned: 0, removed: 0 }
  }

  let removed = 0
  for (const name of names) {
    if (name.startsWith('.')) continue
    const filePath = path.join(dir, name)
    try {
      const stat = await fs.stat(filePath)
      if (!stat.isFile()) continue
      if (stat.mtimeMs > cutoff) continue
      await fs.unlink(filePath)
      removed += 1
    } catch (_error) {
      // 单文件失败不影响整轮
    }
  }

  if (removed && logger) logger.info('uploads 清扫完成', { removed, scanned: names.length })
  return { scanned: names.length, removed }
}

function startUploadsSweeper({ dir, ttlMs, intervalMs = DEFAULT_INTERVAL_MS, logger }) {
  if (!ttlMs || ttlMs <= 0) {
    if (logger) logger.info('uploads 清扫已关闭（UPLOAD_TTL_HOURS=0）')
    return () => {}
  }

  const timer = setInterval(() => {
    sweepOnce({ dir, ttlMs, logger }).catch(() => {})
  }, intervalMs)
  if (typeof timer.unref === 'function') timer.unref()

  sweepOnce({ dir, ttlMs, logger }).catch(() => {})

  return () => clearInterval(timer)
}

module.exports = { startUploadsSweeper, sweepOnce }
