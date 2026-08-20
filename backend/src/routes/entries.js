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

function entryPayload(body, existing = null) {
  return {
    date: body.date ?? existing?.date,
    session: body.session ?? existing?.session,
    timeframe: body.timeframe !== undefined ? body.timeframe : existing?.timeframe ?? '',
    pair: body.pair ?? existing?.pair ?? '',
    direction: body.direction ?? existing?.direction,
    rrIdea: body.rrIdea ?? body.rrPlan ?? body.rr ?? existing?.rrIdea ?? null,
    rrReal: body.rrReal !== undefined
      ? body.rrReal
      : body.rrReality !== undefined
        ? body.rrReality
        : existing?.rrReal ?? null,
    checklist: body.checklist !== undefined ? body.checklist : existing?.checklist,
    pnl: body.pnl !== undefined ? body.pnl : existing?.pnl ?? null,
    result: body.result !== undefined ? body.result : existing?.result ?? '',
    note: body.note !== undefined ? body.note : existing?.note ?? '',
    tags: body.tags ?? existing?.tags ?? [],
    visible: body.visible !== undefined ? body.visible : existing?.visible,
    htfCtc: body.htfCtc ?? existing?.htfCtc ?? '',
    htfBias: body.htfBias ?? existing?.htfBias ?? '',
    htfPda: body.htfPda ?? existing?.htfPda ?? '',
    htfDol: body.htfDol ?? existing?.htfDol ?? '',
    mtfCtc: body.mtfCtc ?? existing?.mtfCtc ?? '',
    mtfPda: body.mtfPda ?? existing?.mtfPda ?? '',
    mtfModel: body.mtfModel ?? existing?.mtfModel ?? '',
    mtfSweep: body.mtfSweep ?? existing?.mtfSweep ?? false,
    mtfCisd: body.mtfCisd ?? existing?.mtfCisd ?? false,
    mtfMss: body.mtfMss ?? existing?.mtfMss ?? false,
    ltfSweep: body.ltfSweep ?? existing?.ltfSweep ?? false,
    ltfCisd: body.ltfCisd ?? existing?.ltfCisd ?? false,
    ltfMss: body.ltfMss ?? existing?.ltfMss ?? false,
    ltfEntry: body.ltfEntry ?? existing?.ltfEntry ?? '',
    ltfExist: body.ltfExist !== undefined ? body.ltfExist : existing?.ltfExist ?? true,
  }
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
    const slot = String(req.query?.slot ?? req.body?.slot ?? 'htf').toLowerCase()
    cb(null, `${req.params.id}-${slot}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`)
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
    ...entryPayload(req.body),
    date: req.body.date ?? today,
  })
  res.status(201).json(entry)
})

router.patch('/entries/:id', requireAccountWrite, (req, res) => {
  const store = resolveStore(req, res)
  if (!store) return
  const id = Number(req.params.id)
  const existing = store.getEntryById(id)
  if (!existing) return res.status(404).json({ error: 'Không tìm thấy entry' })

  const entry = store.updateEntry(id, entryPayload(req.body, existing))
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

    const slot = req.query.slot ?? req.body.slot ?? 'htf'

    try {
      await generateThumbnail(store.uploadsDir, req.file.filename)
      const entry = store.addEntryImage(id, req.file.filename, slot)
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
