const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const sharp = require('sharp')

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function expandBounds(bounds, padding, width, height) {
  const x = Math.max(0, bounds.x - padding)
  const y = Math.max(0, bounds.y - padding)
  const right = Math.min(width, bounds.x + bounds.width + padding)
  const bottom = Math.min(height, bounds.y + bounds.height + padding)
  return { x, y, width: right - x, height: bottom - y }
}

function shadowSvg(width, height, opacity) {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">` +
      `<ellipse cx="${width / 2}" cy="${height / 2}" rx="${width * 0.42}" ry="${height * 0.2}" ` +
      `fill="#000" fill-opacity="${opacity}"/></svg>`
  )
}

function largestComponent(binary, width, height, focus = null) {
  const queue = new Int32Array(binary.length)
  let largest = null
  let focused = null
  const minFocusedSize = Math.max(16, Math.round(width * height * 0.003))

  for (let start = 0; start < binary.length; start += 1) {
    if (binary[start] === 0) continue
    let head = 0
    let tail = 0
    let minX = width
    let minY = height
    let maxX = 0
    let maxY = 0
    binary[start] = 0
    queue[tail++] = start

    while (head < tail) {
      const index = queue[head++]
      const x = index % width
      const y = Math.floor(index / width)
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)

      let neighbor
      if (x > 0 && binary[(neighbor = index - 1)] !== 0) {
        binary[neighbor] = 0
        queue[tail++] = neighbor
      }
      if (x + 1 < width && binary[(neighbor = index + 1)] !== 0) {
        binary[neighbor] = 0
        queue[tail++] = neighbor
      }
      if (y > 0 && binary[(neighbor = index - width)] !== 0) {
        binary[neighbor] = 0
        queue[tail++] = neighbor
      }
      if (y + 1 < height && binary[(neighbor = index + width)] !== 0) {
        binary[neighbor] = 0
        queue[tail++] = neighbor
      }
    }

    const bounds = { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
    const centerX = bounds.x + bounds.width / 2
    const centerY = bounds.y + bounds.height / 2
    const distance = focus ? Math.hypot(centerX - focus.x, centerY - focus.y) : 0
    const candidate = {
        size: tail,
        pixels: queue.slice(0, tail),
        bounds,
        distance
    }
    if (!largest || candidate.size > largest.size) largest = candidate
    if (
      focus &&
      candidate.size >= minFocusedSize &&
      (!focused || candidate.distance < focused.distance)
    ) focused = candidate
  }

  return focus ? focused || largest : largest
}

function growComponentFromSeed(binary, width, height, seed) {
  const queue = new Int32Array(binary.length)
  let head = 0
  let tail = 0
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0

  for (const index of seed.pixels) {
    if (!binary[index]) continue
    binary[index] = 0
    queue[tail++] = index
  }

  while (head < tail) {
    const index = queue[head++]
    const x = index % width
    const y = Math.floor(index / width)
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)

    let neighbor
    if (x > 0 && binary[(neighbor = index - 1)] !== 0) {
      binary[neighbor] = 0
      queue[tail++] = neighbor
    }
    if (x + 1 < width && binary[(neighbor = index + 1)] !== 0) {
      binary[neighbor] = 0
      queue[tail++] = neighbor
    }
    if (y > 0 && binary[(neighbor = index - width)] !== 0) {
      binary[neighbor] = 0
      queue[tail++] = neighbor
    }
    if (y + 1 < height && binary[(neighbor = index + width)] !== 0) {
      binary[neighbor] = 0
      queue[tail++] = neighbor
    }
  }

  return {
    size: tail,
    pixels: queue.slice(0, tail),
    bounds: { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 },
    distance: seed.distance
  }
}

function borderMean(data, width, height) {
  let total = 0
  let count = 0
  for (let x = 0; x < width; x += 1) {
    total += data[x] + data[(height - 1) * width + x]
    count += 2
  }
  for (let y = 1; y + 1 < height; y += 1) {
    total += data[y * width] + data[y * width + width - 1]
    count += 2
  }
  return count ? total / count : 0
}

function fillSmallEnclosedHoles(component, width, height) {
  const matte = new Uint8Array(width * height)
  for (const index of component.pixels) matte[index] = 1

  const visited = new Uint8Array(width * height)
  const queue = new Int32Array(component.bounds.width * component.bounds.height)
  const maxHoleSize = Math.max(64, Math.round(component.size * 0.025))
  let filledHolePixels = 0
  let largeHolePixels = 0

  for (let y = component.bounds.y; y < component.bounds.y + component.bounds.height; y += 1) {
    for (let x = component.bounds.x; x < component.bounds.x + component.bounds.width; x += 1) {
      const start = y * width + x
      if (matte[start] || visited[start]) continue

      let head = 0
      let tail = 0
      let touchesBounds = false
      visited[start] = 1
      queue[tail++] = start

      while (head < tail) {
        const index = queue[head++]
        const currentX = index % width
        const currentY = Math.floor(index / width)
        if (
          currentX === component.bounds.x ||
          currentY === component.bounds.y ||
          currentX === component.bounds.x + component.bounds.width - 1 ||
          currentY === component.bounds.y + component.bounds.height - 1
        ) {
          touchesBounds = true
        }

        const neighbors = []
        if (currentX > component.bounds.x) neighbors.push(index - 1)
        if (currentX + 1 < component.bounds.x + component.bounds.width) neighbors.push(index + 1)
        if (currentY > component.bounds.y) neighbors.push(index - width)
        if (currentY + 1 < component.bounds.y + component.bounds.height) neighbors.push(index + width)
        for (const neighbor of neighbors) {
          const neighborX = neighbor % width
          const neighborY = Math.floor(neighbor / width)
          if (
            neighborX < component.bounds.x ||
            neighborY < component.bounds.y ||
            neighborX >= component.bounds.x + component.bounds.width ||
            neighborY >= component.bounds.y + component.bounds.height ||
            matte[neighbor] ||
            visited[neighbor]
          ) continue
          visited[neighbor] = 1
          queue[tail++] = neighbor
        }
      }

      if (touchesBounds) continue
      if (tail <= maxHoleSize) {
        for (let i = 0; i < tail; i += 1) matte[queue[i]] = 1
        filledHolePixels += tail
      } else {
        largeHolePixels += tail
      }
    }
  }

  return { matte, filledHolePixels, largeHolePixels }
}

function validateCharacterComponent(component, repaired, width, height, expectedHeight = null) {
  const boundsArea = component.bounds.width * component.bounds.height
  const repairedSize = component.size + repaired.filledHolePixels
  const occupancy = repairedSize / boundsArea
  const largeHoleRatio = repaired.largeHolePixels / Math.max(1, component.size)

  if (occupancy < 0.2) {
    throw new Error(`角色蒙版轮廓过于破碎：完整度 ${(occupancy * 100).toFixed(1)}%`)
  }
  if (largeHoleRatio > 0.5) {
    throw new Error(`角色蒙版存在大面积孔洞：${(largeHoleRatio * 100).toFixed(1)}%`)
  }
  if (expectedHeight) {
    const heightRatio = component.bounds.height / expectedHeight
    const widthRatio = component.bounds.width / expectedHeight
    if (heightRatio < 0.7 || heightRatio > 1.75 || widthRatio > 2.1) {
      throw new Error(
        `角色蒙版与规划尺寸不符：${component.bounds.width}x${component.bounds.height}`
      )
    }
  }

  return {
    repairedSize,
    occupancy,
    filledHoleRatio: repaired.filledHolePixels / Math.max(1, component.size)
  }
}

async function normalizeGeneratedMask(
  maskImagePath,
  width,
  height,
  focus = null,
  allowedBounds = null,
  expectedHeight = null
) {
  const raw = await sharp(maskImagePath)
    .rotate()
    .resize(width, height, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer()
  const invert = borderMean(raw, width, height) > 127
  const strong = new Uint8Array(raw.length)
  const weak = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) {
    const value = invert ? 255 - raw[i] : raw[i]
    const x = i % width
    const y = Math.floor(i / width)
    const allowed = !allowedBounds || inBounds(x, y, allowedBounds)
    strong[i] = value >= 160 && allowed ? 1 : 0
    weak[i] = value >= 32 && allowed ? 1 : 0
  }

  const seed = largestComponent(strong, width, height, focus)
  if (!seed) throw new Error('角色蒙版中没有可用前景')
  const component = growComponentFromSeed(weak, width, height, seed)
  const repaired = fillSmallEnclosedHoles(component, width, height)
  const quality = validateCharacterComponent(component, repaired, width, height, expectedHeight)
  const ratio = quality.repairedSize / (width * height)
  if (ratio < 0.005 || ratio > 0.5) {
    throw new Error(`角色蒙版面积异常：${(ratio * 100).toFixed(1)}%`)
  }
  if (component.bounds.width < width * 0.04 || component.bounds.height < height * 0.08) {
    throw new Error('角色蒙版尺寸过小')
  }

  const matte = Buffer.alloc(width * height)
  for (let i = 0; i < repaired.matte.length; i += 1) {
    if (repaired.matte[i]) matte[i] = 255
  }
  const softened = await sharp(matte, { raw: { width, height, channels: 1 } })
    .dilate(1)
    .blur(0.8)
    .raw()
    .toBuffer({ resolveWithObject: true })
  const bounds = expandBounds(component.bounds, 4, width, height)
  const rgba = Buffer.alloc(width * height * 4, 255)
  for (let i = 0; i < width * height; i += 1) {
    const x = i % width
    const y = Math.floor(i / width)
    rgba[i * 4 + 3] = inBounds(x, y, bounds)
      ? softened.data[i * softened.info.channels]
      : 0
  }
  const buffer = await sharp(rgba, { raw: { width, height, channels: 4 } }).png().toBuffer()

  return {
    buffer,
    bounds,
    foregroundRatio: ratio,
    inverted: invert,
    maskOccupancy: quality.occupancy,
    filledHoleRatio: quality.filledHoleRatio
  }
}

function inBounds(x, y, bounds) {
  return x >= bounds.x && y >= bounds.y && x < bounds.x + bounds.width && y < bounds.y + bounds.height
}

async function assertBackgroundPreserved(sourceImagePath, resultImagePath, allowedBounds) {
  const source = await sharp(sourceImagePath)
    .rotate()
    .toColourspace('srgb')
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const result = await sharp(resultImagePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  if (source.info.width !== result.info.width || source.info.height !== result.info.height) {
    throw new Error('背景完整性检查失败：输出尺寸发生变化')
  }

  const width = source.info.width
  const height = source.info.height
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (allowedBounds.some((bounds) => inBounds(x, y, bounds))) continue
      const offset = (y * width + x) * 4
      if (
        source.data[offset] !== result.data[offset] ||
        source.data[offset + 1] !== result.data[offset + 1] ||
        source.data[offset + 2] !== result.data[offset + 2] ||
        source.data[offset + 3] !== result.data[offset + 3]
      ) {
        throw new Error(`背景完整性检查失败：${x},${y} 发生非预期变化`)
      }
    }
  }
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

async function composeGeneratedCharacter({
  sourceImagePath,
  candidateImagePath,
  maskImagePath,
  uploadDir,
  focus,
  allowedBounds,
  expectedHeight
}) {
  const background = await sharp(sourceImagePath)
    .rotate()
    .toColourspace('srgb')
    .png()
    .toBuffer({ resolveWithObject: true })
  const width = background.info.width
  const height = background.info.height
  const mask = await normalizeGeneratedMask(
    maskImagePath,
    width,
    height,
    focus,
    allowedBounds,
    expectedHeight
  )
  const candidate = await sharp(candidateImagePath)
    .rotate()
    .resize(width, height, { fit: 'fill' })
    .ensureAlpha()
    .composite([{ input: mask.buffer, blend: 'dest-in' }])
    .png()
    .toBuffer()

  const shadowWidth = Math.max(24, Math.round(mask.bounds.width * 0.56))
  const shadowHeight = Math.max(10, Math.round(mask.bounds.height * 0.07))
  const shadow = await sharp(shadowSvg(shadowWidth, shadowHeight, 0.18))
    .blur(Math.max(2, Math.round(shadowHeight * 0.18)))
    .png()
    .toBuffer()
  const shadowLeft = clamp(
    Math.round(mask.bounds.x + (mask.bounds.width - shadowWidth) / 2),
    0,
    Math.max(0, width - shadowWidth)
  )
  const shadowTop = clamp(
    Math.round(mask.bounds.y + mask.bounds.height - shadowHeight / 2),
    0,
    Math.max(0, height - shadowHeight)
  )

  await fs.promises.mkdir(uploadDir, { recursive: true })
  const filename = `blend-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.png`
  const localPath = path.join(uploadDir, filename)
  await sharp(background.data)
    .composite([
      { input: shadow, left: shadowLeft, top: shadowTop, blend: 'over' },
      { input: candidate, left: 0, top: 0, blend: 'over' }
    ])
    .png()
    .toFile(localPath)
  await assertBackgroundPreserved(sourceImagePath, localPath, [
    mask.bounds,
    { x: shadowLeft, y: shadowTop, width: shadowWidth, height: shadowHeight }
  ])

  return {
    filename,
    localPath,
    width,
    height,
    characterBounds: mask.bounds,
    shadowBounds: { x: shadowLeft, y: shadowTop, width: shadowWidth, height: shadowHeight },
    foregroundRatio: mask.foregroundRatio,
    maskInverted: mask.inverted,
    maskOccupancy: mask.maskOccupancy,
    filledHoleRatio: mask.filledHoleRatio
  }
}

module.exports = {
  composeCharacter,
  composeGeneratedCharacter,
  normalizeGeneratedMask,
  growComponentFromSeed,
  fillSmallEnclosedHoles,
  validateCharacterComponent,
  largestComponent,
  assertBackgroundPreserved,
  prepareSprite,
  applyCutout
}
