const { AISemaphoreTimeout } = require('./errors')

function createSemaphore(max) {
  const limit = Math.max(1, Number(max) || 1)
  let active = 0
  const queue = []

  function pump() {
    while (active < limit && queue.length) {
      const waiter = queue.shift()
      active += 1
      let released = false
      waiter.resolve(() => {
        if (released) return
        released = true
        active -= 1
        pump()
      })
    }
  }

  return {
    acquire({ timeoutMs } = {}) {
      return new Promise((resolve, reject) => {
        const waiter = { resolve }
        let timer = null

        if (timeoutMs && timeoutMs > 0) {
          timer = setTimeout(() => {
            const index = queue.indexOf(waiter)
            if (index !== -1) queue.splice(index, 1)
            reject(new AISemaphoreTimeout('AI 并发已满，排队超时'))
          }, timeoutMs)
        }

        queue.push({
          resolve: (release) => {
            if (timer) clearTimeout(timer)
            resolve(release)
          }
        })
        pump()
      })
    },

    get active() {
      return active
    },
    get pending() {
      return queue.length
    },
    get limit() {
      return limit
    }
  }
}

module.exports = { createSemaphore }
