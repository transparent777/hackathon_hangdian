const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const sharp = require('sharp')
const { composeCharacter } = require('../services/ai/compositor')

test('keeps every pixel outside the character and shadow bounds unchanged', async (t) => {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'companion-composite-'))
  t.after(() => fs.promises.rm(dir, { recursive: true, force: true }))
  const source = path.join(dir, 'source.png')
  const sprite = path.join(dir, 'sprite.png')

  await sharp({
    create: { width: 320, height: 240, channels: 4, background: { r: 92, g: 148, b: 203, alpha: 1 } }
  })
    .png()
    .toFile(source)
  await sharp(
    Buffer.from(
      '<svg width="80" height="120" xmlns="http://www.w3.org/2000/svg"><circle cx="40" cy="38" r="30" fill="#ffd54f"/><rect x="20" y="62" width="40" height="52" rx="12" fill="#fff"/></svg>'
    )
  )
    .png()
    .toFile(sprite)

  const result = await composeCharacter({
    sourceImagePath: source,
    characterImagePath: sprite,
    plan: { anchor: { x: 0.5, y: 0.86 }, scale: 0.25, rotation: 0 },
    uploadDir: dir
  })
  const before = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const after = await sharp(result.localPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  assert.equal(after.info.width, before.info.width)
  assert.equal(after.info.height, before.info.height)

  const inBounds = (x, y, bounds) =>
    x >= bounds.x && y >= bounds.y && x < bounds.x + bounds.width && y < bounds.y + bounds.height
  let changedInside = 0
  for (let y = 0; y < before.info.height; y += 1) {
    for (let x = 0; x < before.info.width; x += 1) {
      const offset = (y * before.info.width + x) * 4
      const changed =
        before.data[offset] !== after.data[offset] ||
        before.data[offset + 1] !== after.data[offset + 1] ||
        before.data[offset + 2] !== after.data[offset + 2] ||
        before.data[offset + 3] !== after.data[offset + 3]
      if (!changed) continue

      const allowed =
        inBounds(x, y, result.characterBounds) || inBounds(x, y, result.shadowBounds)
      assert.equal(allowed, true, `unexpected changed pixel at ${x},${y}`)
      changedInside += 1
    }
  }
  assert.ok(changedInside > 0)
})
