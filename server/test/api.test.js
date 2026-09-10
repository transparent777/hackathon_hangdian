const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { after, before, test } = require('node:test')
const request = require('supertest')

const { createApp } = require('../src/app')

let app
let tempDir

before(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cyber-companion-test-'))
  app = createApp({
    dataDir: path.join(tempDir, 'data'),
    uploadsDir: path.join(tempDir, 'uploads')
  })
})

after(async () => {
  await fs.rm(tempDir, { recursive: true, force: true })
})

test('GET /api/health reports the active provider', async () => {
  const response = await request(app).get('/api/health').expect(200)
  assert.equal(response.body.ok, true)
  assert.equal(response.body.provider, 'mock')
})

test('POST /api/roll is stable for the same user and day', async () => {
  const first = await request(app).post('/api/roll').send({ openid: 'tester' }).expect(200)
  const second = await request(app).post('/api/roll').send({ openid: 'tester' }).expect(200)
  assert.deepEqual(first.body, second.body)
  assert.ok(['naiwa', 'doro', 'maodie'].includes(first.body.characterId))
})

test('invalid JSON returns a clear client error', async () => {
  const response = await request(app)
    .post('/api/roll')
    .set('Content-Type', 'application/json')
    .send('{bad json')
    .expect(400)

  assert.equal(response.body.code, 'INVALID_JSON')
})

test('POST /api/blend accepts an image and writes history', async () => {
  const blend = await request(app)
    .post('/api/blend')
    .field('openid', 'tester')
    .field('characterId', 'doro')
    .field('rarity', '稀有')
    .attach('image', Buffer.from('fake-png-content'), { filename: 'scene.png', contentType: 'image/png' })
    .expect(201)

  assert.match(blend.body.resultUrl, /\/api\/files\/blend-/)
  assert.equal(blend.body.fontStyle, 'doro')
  assert.equal(blend.body.provider, 'mock')

  const history = await request(app).get('/api/history').query({ openid: 'tester' }).expect(200)
  assert.equal(history.body.count, 1)
  assert.equal(history.body.records[0].taskId, blend.body.taskId)
})

test('POST /api/blend rejects an unknown character', async () => {
  const response = await request(app)
    .post('/api/blend')
    .field('characterId', 'unknown')
    .attach('image', Buffer.from('fake-png-content'), { filename: 'scene.png', contentType: 'image/png' })
    .expect(400)

  assert.equal(response.body.code, 'INVALID_CHARACTER')
})
