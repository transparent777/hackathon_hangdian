const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const sharp = require('sharp')

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function shadowSvg(width, height, opacity) {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">` +
      `<ellipse cx="${width / 2}" cy="${height / 2}" rx="${width * 0.42}" ry="${height * 0.2}" ` +
      `fill="#000" fill-opacity="${opacity}"/></svg>`
  )
}

async function applyCutout(characterImagePath, cutout) {
  if (!cutout?.viewBox || !cutout?.shapes) return sharp(characterImagePath).rotate().ensureAlpha().png().toBuffer()
  const metadata = await sharp(characterImagePath).metadata()
  const mask = Buffer.from(
    `<svg width="${metadata.width}" height="${metadata.height}" viewBox="${cutout.viewBox}" ` +
      `xmlns="http://www.w3.org/2000/svg"><g fill="#fff">${cutout.shapes}</g></svg>`
  )
  return sharp(characterImagePath)
    .rotate()
    .ensureAlpha()
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer()
}

async function prepareSprite(characterImagePath, targetHeight, rotation, cutout) {
  const cutoutBuffer = await applyCutout(characterImagePath, cutout)
  const trimmed = await sharp(cutoutBuffer)
    .rotate()
    .ensureAlpha()
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  let pipeline = sharp(trimmed).resize({ height: targetHeight, fit: 'inside', withoutEnlargement: false })
  if (rotation) {
    pipeline = pipeline.rotate(rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
  }
  return pipeline.png().toBuffer({ resolveWithObject: true })
}

async function composeCharacter({ sourceImagePath, characterImagePath, cutout, plan, uploadDir }) {
  if (!fs.existsSync(characterImagePath)) {
    throw new Error(`缺少透明角色素材：${characterImagePath}`)
  }

  const background = await sharp(sourceImagePath)
    .rotate()
    .toColourspace('srgb')
    .png()
    .toBuffer({ resolveWithObject: true })
  const width = background.info.width
  const height = background.info.height
  const targetHeight = Math.round(height * plan.scale)
  const sprite = await prepareSprite(characterImagePath, targetHeight, plan.rotation, cutout)

  const footX = Math.round(width * plan.anchor.x)
  const footY = Math.round(height * plan.anchor.y)
  const left = clamp(Math.round(footX - sprite.info.width / 2), 0, Math.max(0, width - sprite.info.width))
  const top = clamp(Math.round(footY - sprite.info.height), 0, Math.max(0, height - sprite.info.height))

  const shadowWidth = Math.max(24, Math.round(sprite.info.width * 0.62))
  const shadowHeight = Math.max(10, Math.round(sprite.info.height * 0.1))
  const shadow = await sharp(shadowSvg(shadowWidth, shadowHeight, 0.24))
    .blur(Math.max(2, Math.round(shadowHeight * 0.18)))
    .png()
    .toBuffer()
  const shadowLeft = clamp(
    Math.round(left + (sprite.info.width - shadowWidth) / 2),
    0,
    Math.max(0, width - shadowWidth)
  )
  const shadowTop = clamp(
    Math.round(footY - shadowHeight / 2),
    0,
    Math.max(0, height - shadowHeight)
  )

  await fs.promises.mkdir(uploadDir, { recursive: true })
  const filename = `blend-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.png`
  const localPath = path.join(uploadDir, filename)
  await sharp(background.data)
    .composite([
      { input: shadow, left: shadowLeft, top: shadowTop, blend: 'over' },
      { input: sprite.data, left, top, blend: 'over' }
    ])
    .png()
    .toFile(localPath)

  return {
    filename,
    localPath,
    width,
    height,
    characterBounds: { x: left, y: top, width: sprite.info.width, height: sprite.info.height },
    shadowBounds: { x: shadowLeft, y: shadowTop, width: shadowWidth, height: shadowHeight }
  }
}

module.exports = {
  composeCharacter,
  prepareSprite,
  applyCutout
}
