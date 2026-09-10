const { createApp } = require('./app')

const port = Number(process.env.PORT || 3000)
const app = createApp()

app.locals.ready
  .then(() => {
    app.listen(port, () => {
      console.log(`Cyber Companion API listening on http://localhost:${port}`)
      console.log(`AI provider: ${process.env.AI_PROVIDER || 'mock'}`)
    })
  })
  .catch((error) => {
    console.error('Failed to initialize server storage', error)
    process.exitCode = 1
  })
