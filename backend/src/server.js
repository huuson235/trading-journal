import cors from 'cors'
import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import entriesRouter from './routes/entries.js'
import authRouter from './routes/auth.js'
import settingsRouter from './routes/settings.js'
import adminRouter from './routes/admin.js'
import { assertAuthConfig } from './auth.js'
import { migrateLegacyJournal, USERS_UPLOADS_DIR, isValidSlug } from './accounts.js'
import { openJournalStore } from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const DIST_DIR = path.join(ROOT, 'dist')
const PORT = process.env.PORT || 3001

assertAuthConfig()
migrateLegacyJournal(openJournalStore)

const app = express()

app.use(cors())
app.use(express.json())

app.use('/uploads/:slug', (req, res, next) => {
  const { slug } = req.params
  if (!isValidSlug(slug)) {
    return res.status(400).json({ error: 'Slug không hợp lệ' })
  }
  const dir = path.join(USERS_UPLOADS_DIR, slug)
  express.static(dir)(req, res, next)
})

app.use('/api/auth', authRouter)
app.use('/api/admin', adminRouter)
app.use('/api/u/:slug', settingsRouter)
app.use('/api/u/:slug', entriesRouter)

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
