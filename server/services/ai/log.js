const SECRET_PATTERNS = [
  [/Authorization\s*:\s*Bearer\s+[^\s"']+/gi, 'Authorization: Bearer <redacted>'],
  [/x-goog-api-key\s*:\s*[^\s"',;]+/gi, 'x-goog-api-key: <redacted>'],
  [/([?&]key=)[^&\s"']+/gi, '$1<redacted>'],
  [/(api[_-]?key\s*[:=]\s*)["']?[^\s"',;}]{6,}/gi, '$1<redacted>'],
  [/sk-[A-Za-z0-9_-]{16,}/g, '<redacted>'],
  [/(Bearer\s+)[A-Za-z0-9._~+/-]{12,}=*/g, '$1<redacted>']
]

const MAX_LEN = 400

function sanitize(value) {
  let text
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') {
    text = value
  } else if (value instanceof Error) {
    text = value.message || value.name || 'Error'
  } else {
    try {
      text = JSON.stringify(value)
    } catch (_error) {
      text = String(value)
    }
  }

  for (const [pattern, replacement] of SECRET_PATTERNS) {
    text = text.replace(pattern, replacement)
  }

  text = text.replace(/\s+/g, ' ').trim()
  return text.length > MAX_LEN ? `${text.slice(0, MAX_LEN)}…` : text
}

function emit(level, message, detail) {
  const parts = [`[ai] ${level} ${sanitize(message)}`]
  if (detail !== undefined) parts.push(sanitize(detail))
  const line = `${new Date().toISOString()} ${parts.join(' | ')}`
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

const log = {
  info: (message, detail) => emit('info', message, detail),
  warn: (message, detail) => emit('warn', message, detail),
  error: (message, detail) => emit('error', message, detail),
  sanitize
}

module.exports = { log, sanitize }
