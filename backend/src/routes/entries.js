import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { isRequestAuthenticated, requireAuth } from '../auth.js'
import { generateThumbnail, removeImageFiles } from '../images.js'
import {
  UPLOADS_DIR,
  addEntryImage,
  createEntry,
  deleteEntry,
  getAllEntries,
  getDistinctPairs,
  getEntryById,
  removeEntryImageById,
  updateEntry,
} from '../db.js'

const router = Router()

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png'
    cb(null, `${req.params.id}-img-${Date.now()}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Chỉ chấp nhận file ảnh'))
  },
})

router.get('/entries', (req, res) => {
  const visibleOnly = !isRequestAuthenticated(req)
  res.json(getAllEntries(visibleOnly))
})

router.get('/entries/:id', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'ID không hợp lệ' })
  }
  const visibleOnly = !isRequestAuthenticated(req)
  const entry = getEntryById(id, visibleOnly)
  if (!entry) return res.status(404).json({ error: 'Không tìm thấy entry' })
  res.json(entry)
})

router.get('/pairs', (_req, res) => {
  res.json(getDistinctPairs())
})

router.post('/entries', requireAuth, (req, res) => {
  const today = new Date().toISOString().slice(0, 10)
  const entry = createEntry({
    date: req.body.date ?? today,
    session: req.body.session ?? 'Asia',
    pair: req.body.pair ?? '',
    direction: req.body.direction ?? 'LONG',
    rr: req.body.rr ?? null,
    pnl: req.body.pnl ?? null,
    note: req.body.note ?? '',
    visible: req.body.visible !== false,
  })
  res.status(201).json(entry)
})

router.patch('/entries/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id)
  const existing = getEntryById(id)
  if (!existing) return res.status(404).json({ error: 'Không tìm thấy entry' })

  const entry = updateEntry(id, {
    date: req.body.date ?? existing.date,
    session: req.body.session ?? existing.session,
    pair: req.body.pair ?? existing.pair,
    direction: req.body.direction ?? existing.direction,
    rr: req.body.rr !== undefined ? req.body.rr : existing.rr,
    pnl: req.body.pnl !== undefined ? req.body.pnl : existing.pnl,
    note: req.body.note ?? existing.note,
    visible: req.body.visible !== undefined ? req.body.visible : existing.visible,
  })
  res.json(entry)
})

router.delete('/entries/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id)
  if (!deleteEntry(id)) return res.status(404).json({ error: 'Không tìm thấy entry' })
  res.status(204).end()
})

router.post('/entries/:id/images', requireAuth, upload.single('image'), async (req, res) => {
  const id = Number(req.params.id)
  if (!getEntryById(id)) {
    return res.status(404).json({ error: 'Không tìm thấy entry' })
  }
  if (!req.file) {
    return res.status(400).json({ error: 'Thiếu file ảnh' })
  }

  try {
    await generateThumbnail(UPLOADS_DIR, req.file.filename)
    const entry = addEntryImage(id, req.file.filename)
    res.json(entry)
  } catch (err) {
    removeImageFiles(UPLOADS_DIR, req.file.filename)
    res.status(500).json({ error: err.message || 'Không tạo được thumbnail' })
  }
})

router.delete('/entries/:id/images/:imageId', requireAuth, (req, res) => {
  const id = Number(req.params.id)
  const imageId = Number(req.params.imageId)
  if (!Number.isFinite(imageId)) {
    return res.status(400).json({ error: 'ID ảnh không hợp lệ' })
  }

  const entry = removeEntryImageById(id, imageId)
  if (!entry) return res.status(404).json({ error: 'Không tìm thấy entry hoặc ảnh' })
  res.json(entry)
})

export default router
