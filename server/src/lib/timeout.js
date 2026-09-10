function withTimeout(promise, timeoutMs, message = '上游服务超时') {
  let timer
  const timeout = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs)
  })

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

module.exports = { withTimeout }
