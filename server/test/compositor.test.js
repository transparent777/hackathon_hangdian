const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const sharp = require('sharp')
const {
  composeCharacter,
  composeGeneratedCharacter,
  normalizeGeneratedMask,
  largestComponent
} = require('../services/ai/compositor')

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

test('selects the valid component nearest the planned character center', () => {
  const width = 100
  const height = 100
  const binary = new Uint8Array(width * height)
  for (let y = 10; y < 40; y += 1) {
    for (let x = 10; x < 40; x += 1) binary[y * width + x] = 1
  }
  for (let y = 60; y < 80; y += 1) {
    for (let x = 65; x < 85; x += 1) binary[y * width + x] = 1
  }
  const component = largestComponent(binary, width, height, { x: 75, y: 70 })
  assert.deepEqual(component.bounds, { x: 65, y: 60, width: 20, height: 20 })
})

test('restores the original background around an extracted generated character', async (t) => {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'companion-extract-'))
  t.after(() => fs.promises.rm(dir, { recursive: true, force: true }))
  const source = path.join(dir, 'source.png')
  const candidate = path.join(dir, 'candidate.png')
  const mask = path.join(dir, 'mask.png')

  await sharp({
    create: { width: 240, height: 180, channels: 4, background: { r: 45, g: 90, b: 135, alpha: 1 } }
  })
    .png()
    .toFile(source)
  await sharp({
    create: { width: 240, height: 180, channels: 4, background: { r: 210, g: 180, b: 150, alpha: 1 } }
  })
    .composite([
      {
        input: Buffer.from('<svg width="240" height="180" xmlns="http://www.w3.org/2000/svg"><rect x="150" y="45" width="55" height="90" rx="20" fill="#fff"/></svg>')
      }
    ])
    .png()
    .toFile(candidate)
  await sharp(
    Buffer.from('<svg width="240" height="180" xmlns="http://www.w3.org/2000/svg"><rect width="240" height="180" fill="#000"/><rect x="150" y="45" width="55" height="90" rx="20" fill="#fff"/><rect x="5" y="5" width="8" height="4" fill="#fff"/></svg>')
  )
    .png()
    .toFile(mask)

  const output = await composeGeneratedCharacter({
    sourceImagePath: source,
    candidateImagePath: candidate,
    maskImagePath: mask,
    uploadDir: dir
  })
  assert.ok(output.foregroundRatio > 0.05)
  assert.ok(output.foregroundRatio < 0.2)
  const originalPixel = await sharp(source).extract({ left: 20, top: 20, width: 1, height: 1 }).raw().toBuffer()
  const outputPixel = await sharp(output.localPath).extract({ left: 20, top: 20, width: 1, height: 1 }).raw().toBuffer()
  assert.deepEqual(outputPixel, originalPixel)
  const characterPixel = await sharp(output.localPath)
    .extract({ left: 175, top: 80, width: 1, height: 1 })
    .raw()
    .toBuffer()
  assert.deepEqual([...characterPixel.slice(0, 3)], [255, 255, 255])
})

test('rejects a mask that treats most of the image as foreground', async (t) => {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'companion-mask-'))
  t.after(() => fs.promises.rm(dir, { recursive: true, force: true }))
  const mask = path.join(dir, 'bad-mask.png')
  await sharp({
    create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 255, b: 255 } }
  })
    .png()
    .toFile(mask)
  await assert.rejects(() => normalizeGeneratedMask(mask, 100, 100))
})

test('fills small holes inside an otherwise valid character silhouette', async (t) => {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'companion-hole-fill-'))
  t.after(() => fs.promises.rm(dir, { recursive: true, force: true }))
  const mask = path.join(dir, 'mask.png')

  await sharp(
    Buffer.from(
      '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#000"/><rect x="30" y="20" width="40" height="60" fill="#fff"/><rect x="48" y="48" width="4" height="4" fill="#000"/></svg>'
    )
  )
    .png()
    .toFile(mask)

  const output = await normalizeGeneratedMask(mask, 100, 100, { x: 50, y: 50 }, null, 60)
  const pixel = await sharp(output.buffer)
    .extract({ left: 50, top: 50, width: 1, height: 1 })
    .raw()
    .toBuffer()
  assert.ok(pixel[3] > 200)
  assert.ok(output.filledHoleRatio > 0)
})

test('grows a complete character from a high-confidence head into a low-confidence body', async (t) => {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'companion-hysteresis-'))
  t.after(() => fs.promises.rm(dir, { recursive: true, force: true }))
  const mask = path.join(dir, 'mask.png')

  await sharp(
    Buffer.from(
      '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#000"/><circle cx="50" cy="30" r="18" fill="#fff"/><rect x="35" y="45" width="30" height="42" rx="8" fill="#404040"/></svg>'
    )
  )
    .png()
    .toFile(mask)

  const output = await normalizeGeneratedMask(mask, 100, 100, { x: 50, y: 35 }, null, 70)
  const bodyPixel = await sharp(output.buffer)
    .extract({ left: 50, top: 70, width: 1, height: 1 })
    .raw()
    .toBuffer()
  assert.ok(bodyPixel[3] > 200)
  assert.ok(output.bounds.height >= 70)
})

test('rejects a character silhouette with a large internal tear', async (t) => {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'companion-hole-reject-'))
  t.after(() => fs.promises.rm(dir, { recursive: true, force: true }))
  const mask = path.join(dir, 'mask.png')

  await sharp(
    Buffer.from(
      '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#000"/><rect x="15" y="10" width="70" height="80" fill="#fff"/><rect x="25" y="25" width="50" height="50" fill="#000"/></svg>'
    )
  )
    .png()
    .toFile(mask)

  await assert.rejects(
    () => normalizeGeneratedMask(mask, 100, 100, { x: 50, y: 50 }, null, 80),
    /大面积孔洞/
  )
})
