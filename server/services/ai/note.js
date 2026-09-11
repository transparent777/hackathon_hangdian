function cleanNote(text) {
  let out = String(text || '').trim()
  if (!out) return ''

  out = out.replace(/^["'“”‘’「『]+/, '').replace(/["'“”‘’」』]+$/, '')
  out = out.replace(/^\s*(批注|日记|回复)\s*[:：]\s*/, '')
  out = out.replace(/\s*\n+\s*/g, ' ')
  out = out.replace(/[ \t　]+/g, ' ')
  return out.trim()
}

function hitsForbidden(text, rules) {
  const list = (rules && Array.isArray(rules.forbidden) && rules.forbidden) || []
  return list.some((word) => word && text.includes(word))
}

function truncateNote(text, maxLength) {
  if (!text) return ''
  const limit = Number(maxLength) || 0
  if (!limit || text.length <= limit) return text
  return text.slice(0, limit).replace(/[，、,;；:：\s]+$/, '')
}

module.exports = { cleanNote, hitsForbidden, truncateNote }
