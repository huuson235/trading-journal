import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { requireAuth } from '../auth.js'
import { generateThumbnail, removeImageFiles } from '../images.js'
import {
  IMAGE_SLOTS,
  UPLOADS_DIR,
  createEntry,
  deleteEntry,
  getAllEntries,
  getDistinctPairs,
  getEntryById,
  removeEntryImage,
  setEntryImage,
  updateEntry,
} from '../db.js'

const router = Router()

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png'
    const slot = req.params.slot
    cb(null, `${req.params.id}-${slot}-${Date.now()}${ext}`)
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

router.get('/entries', (_req, res) => {
  res.json(getAllEntries())
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
    rr: req.body.rr ?? null,
    pnl: req.body.pnl ?? null,
    note: req.body.note ?? '',
    htf: { text: '' },
    mtf: { text: '' },
    ltf: { text: '' },
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
    rr: req.body.rr !== undefined ? req.body.rr : existing.rr,
    pnl: req.body.pnl !== undefined ? req.body.pnl : existing.pnl,
    note: req.body.note ?? existing.note,
    htf: { text: req.body.htf?.text ?? existing.htf.text },
    mtf: { text: req.body.mtf?.text ?? existing.mtf.text },
    ltf: { text: req.body.ltf?.text ?? existing.ltf.text },
  })
  res.json(entry)
})

router.delete('/entries/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id)
  if (!deleteEntry(id)) return res.status(404).json({ error: 'Không tìm thấy entry' })
  res.status(204).end()
})

router.post('/entries/:id/images/:slot', requireAuth, upload.single('image'), async (req, res) => {
  const id = Number(req.params.id)
  const slot = req.params.slot

  if (!IMAGE_SLOTS.includes(slot)) {
    return res.status(400).json({ error: 'Slot không hợp lệ' })
  }
  if (!getEntryById(id)) {
    return res.status(404).json({ error: 'Không tìm thấy entry' })
  }
  if (!req.file) {
    return res.status(400).json({ error: 'Thiếu file ảnh' })
  }

  try {
    await generateThumbnail(UPLOADS_DIR, req.file.filename)
    const entry = setEntryImage(id, slot, req.file.filename)
    res.json(entry)
  } catch (err) {
    removeImageFiles(UPLOADS_DIR, req.file.filename)
    res.status(500).json({ error: err.message || 'Không tạo được thumbnail' })
  }
})

router.delete('/entries/:id/images/:slot', requireAuth, (req, res) => {
  const id = Number(req.params.id)
  const slot = req.params.slot

  if (!IMAGE_SLOTS.includes(slot)) {
    return res.status(400).json({ error: 'Slot không hợp lệ' })
  }

  const entry = removeEntryImage(id, slot)
  if (!entry) return res.status(404).json({ error: 'Không tìm thấy entry' })
  res.json(entry)
})

export default router
