const { getShanghaiDay } = require('../lib/day')
const { HttpError } = require('../lib/http-error')

function createDailyRateLimit(limit) {
  const counters = new Map()

  return function dailyRateLimit(req, res, next) {
    const openid = req.body.openid || 'demo-user'
    const key = `${getShanghaiDay()}:${openid}`
    const used = counters.get(key) || 0

    if (used >= limit) {
      next(new HttpError(429, 'DAILY_LIMIT_EXCEEDED', `今日生成次数已达上限（${limit} 次）`))
      return
    }

    counters.set(key, used + 1)
    res.setHeader('X-RateLimit-Limit', String(limit))
    res.setHeader('X-RateLimit-Remaining', String(limit - used - 1))
    next()
  }
}

module.exports = { createDailyRateLimit }
