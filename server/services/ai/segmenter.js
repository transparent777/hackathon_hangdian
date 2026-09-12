const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

const SCRIPT_PATH = path.join(__dirname, '../../scripts/segment_foreground.py')
const DEFAULT_MODEL_PATH = path.join(__dirname, '../../models/u2netp.onnx')

function expandRegion(region, paddingRatio = 0.12) {
  const padX = Math.round((region.x2 - region.x1) * paddingRatio)
  const padY = Math.round((region.y2 - region.y1) * paddingRatio)
  const x = Math.max(0, region.x1 - padX)
  const y = Math.max(0, region.y1 - padY)
  const right = Math.min(region.width, region.x2 + padX)
  const bottom = Math.min(region.height, region.y2 + padY)
  return { x, y, width: right - x, height: bottom - y }
}

function resolveCharacterRegion(editRegion, scenePlan) {
  if (!scenePlan?.anchor || !Number.isFinite(Number(scenePlan.scale))) {
    return expandRegion(editRegion)
  }

  const imageWidth = editRegion.width
  const imageHeight = editRegion.height
  const plannedHeight = Math.max(1, Number(scenePlan.scale) * imageHeight)
  const centerX = Number(scenePlan.anchor.x) * imageWidth
  const footY = Number(scenePlan.anchor.y) * imageHeight
  const halfWidth = plannedHeight * 0.78
  const x = Math.max(0, Math.round(centerX - halfWidth))
  const y = Math.max(0, Math.round(footY - plannedHeight * 1.15))
  const right = Math.min(imageWidth, Math.round(centerX + halfWidth))
  const bottom = Math.min(imageHeight, Math.round(footY + plannedHeight * 0.42))

  return { x, y, width: right - x, height: bottom - y }
}

function runPython(args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const executable = process.env.AI_SEGMENT_PYTHON || 'python'
    const child = spawn(executable, args, { windowsHide: true })
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error(`本地角色分割超时（${timeoutMs}ms）`))
    }, timeoutMs)

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
      if (stderr.length > 1000) stderr = stderr.slice(-1000)
    })
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(new Error(`无法启动本地角色分割器：${error.message}`))
    })
    child.on('exit', (code) => {
      clearTimeout(timer)
      if (code === 0) resolve()
      else reject(new Error(`本地角色分割失败：${stderr.trim() || `exit ${code}`}`))
    })
  })
}

async function segmentCharacter({
  sourceImagePath,
  candidateImagePath,
  editRegion,
  scenePlan,
  uploadDir,
  timeoutMs = 20000
}) {
  const configuredModelPath = process.env.AI_SEGMENT_MODEL_PATH
  const modelPath = configuredModelPath
    ? path.resolve(path.join(__dirname, '../..'), configuredModelPath)
    : DEFAULT_MODEL_PATH
  if (!fs.existsSync(modelPath)) {
    throw new Error(`缺少本地分割模型：${modelPath}`)
  }
  const region = resolveCharacterRegion(editRegion, scenePlan)
  const filename = `mask-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.png`
  const localPath = path.join(uploadDir, filename)
  await fs.promises.mkdir(uploadDir, { recursive: true })
  await runPython(
    [
      SCRIPT_PATH,
      '--model', modelPath,
      '--source', sourceImagePath,
      '--candidate', candidateImagePath,
      '--output', localPath,
      '--region', `${region.x},${region.y},${region.width},${region.height}`
    ],
    timeoutMs
  )
  return { localPath, model: path.basename(modelPath, path.extname(modelPath)), region }
}

module.exports = { segmentCharacter, expandRegion, resolveCharacterRegion }
