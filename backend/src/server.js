import cors from 'cors'
import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import entriesRouter from './routes/entries.js'
import authRouter from './routes/auth.js'
import settingsRouter from './routes/settings.js'
import { assertAuthConfig } from './auth.js'
import { UPLOADS_DIR } from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const DIST_DIR = path.join(ROOT, 'dist')
const PORT = process.env.PORT || 3001

assertAuthConfig()

const app = express()

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(UPLOADS_DIR))
app.use('/api/auth', authRouter)
app.use('/api', settingsRouter)
app.use('/api', entriesRouter)

const indexHtml = path.join(DIST_DIR, 'index.html')
if (fs.existsSync(indexHtml)) {
  app.use(express.static(DIST_DIR))
  app.get(/^(?!\/api|\/uploads).*/, (_req, res) => {
    res.sendFile(indexHtml)
  })
}

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Lỗi server' })
})

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`)
  if (fs.existsSync(indexHtml)) {
    console.log(`Serving frontend from ${DIST_DIR}`)
  }
})
