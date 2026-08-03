import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import {
  getRequestSession,
  requireAccountWrite,
} from '../auth.js'
import { generateThumbnail, removeImageFiles } from '../images.js'
import { getAccountBySlug, isValidSlug } from '../accounts.js'
import { openJournalStore } from '../db.js'

const router = Router({ mergeParams: true })

function resolveStore(req, res) {
  const slug = req.params.slug
  if (!isValidSlug(slug)) {
    res.status(400).json({ error: 'Slug không hợp lệ' })
    return null
  }
  const account = getAccountBySlug(slug)
  if (!account || !account.active) {
    res.status(404).json({ error: 'Không tìm thấy journal' })
    return null
  }
  return openJournalStore(slug)
}

function canSeePrivate(req, slug) {
  const session = getRequestSession(req)
  if (!session) return false
  if (session.role === 'root') return true
  return session.role === 'user' && session.slug === slug
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    try {
      const store = openJournalStore(req.params.slug)
      cb(null, store.uploadsDir)
    } catch (err) {
      cb(err)
    }
  },
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
  const store = resolveStore(req, res)
  if (!store) return
  const visibleOnly = !canSeePrivate(req, store.slug)
  res.json(store.getAllEntries(visibleOnly))
})

router.get('/entries/:id', (req, res) => {
  const store = resolveStore(req, res)
  if (!store) return
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'ID không hợp lệ' })
  }
  const privateView = canSeePrivate(req, store.slug)
  const entry = store.getEntryById(id, !privateView)
  if (!entry) return res.status(404).json({ error: 'Không tìm thấy entry' })
  if (!privateView) {
    res.json({ ...entry, pnl: null })
    return
  }
  res.json(entry)
})

router.get('/pairs', (req, res) => {
  const store = resolveStore(req, res)
  if (!store) return
  res.json(store.getDistinctPairs())
})

router.get('/tags', (req, res) => {
  const store = resolveStore(req, res)
  if (!store) return
  res.json(store.getDistinctTags())
})

router.post('/entries', requireAccountWrite, (req, res) => {
  const store = resolveStore(req, res)
  if (!store) return
  const today = new Date().toISOString().slice(0, 10)
  const entry = store.createEntry({
    date: req.body.date ?? today,
    session: req.body.session ?? 'Asia',
    pair: req.body.pair ?? '',
    direction: req.body.direction ?? 'LONG',
    rrPlan: req.body.rrPlan ?? req.body.rr ?? null,
    rrReality: req.body.rrReality ?? null,
    checklist: req.body.checklist === true,
    pnl: req.body.pnl ?? null,
    note: req.body.note ?? '',
    tags: req.body.tags ?? [],
    visible: req.body.visible !== false,
  })
  res.status(201).json(entry)
})

router.patch('/entries/:id', requireAccountWrite, (req, res) => {
  const store = resolveStore(req, res)
  if (!store) return
  const id = Number(req.params.id)
  const existing = store.getEntryById(id)
  if (!existing) return res.status(404).json({ error: 'Không tìm thấy entry' })

  const entry = store.updateEntry(id, {
    date: req.body.date ?? existing.date,
    session: req.body.session ?? existing.session,
    pair: req.body.pair ?? existing.pair,
    direction: req.body.direction ?? existing.direction,
    rrPlan: req.body.rrPlan !== undefined ? req.body.rrPlan : existing.rrPlan,
    rrReality: req.body.rrReality !== undefined ? req.body.rrReality : existing.rrReality,
    checklist: req.body.checklist !== undefined ? req.body.checklist : existing.checklist,
    pnl: req.body.pnl !== undefined ? req.body.pnl : existing.pnl,
    note: req.body.note !== undefined ? req.body.note : existing.note,
    tags: req.body.tags ?? existing.tags,
    visible: req.body.visible !== undefined ? req.body.visible : existing.visible,
  })
  res.json(entry)
})

router.delete('/entries/:id', requireAccountWrite, (req, res) => {
  const store = resolveStore(req, res)
  if (!store) return
  const id = Number(req.params.id)
  if (!store.deleteEntry(id)) return res.status(404).json({ error: 'Không tìm thấy entry' })
  res.status(204).end()
})

router.post(
  '/entries/:id/images',
  requireAccountWrite,
  upload.single('image'),
  async (req, res) => {
    const store = resolveStore(req, res)
    if (!store) return
    const id = Number(req.params.id)
    if (!store.getEntryById(id)) {
      return res.status(404).json({ error: 'Không tìm thấy entry' })
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Thiếu file ảnh' })
    }

    try {
      await generateThumbnail(store.uploadsDir, req.file.filename)
      const entry = store.addEntryImage(id, req.file.filename)
      res.json(entry)
    } catch (err) {
      removeImageFiles(store.uploadsDir, req.file.filename)
      res.status(500).json({ error: err.message || 'Không tạo được thumbnail' })
    }
  },
)

router.delete('/entries/:id/images/:imageId', requireAccountWrite, (req, res) => {
  const store = resolveStore(req, res)
  if (!store) return
  const id = Number(req.params.id)
  const imageId = Number(req.params.imageId)
  if (!Number.isFinite(imageId)) {
    return res.status(400).json({ error: 'ID ảnh không hợp lệ' })
  }

  const entry = store.removeEntryImageById(id, imageId)
  if (!entry) return res.status(404).json({ error: 'Không tìm thấy entry hoặc ảnh' })
  res.json(entry)
})

export default router
