import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { requireAccountWrite } from '../auth.js'
import { removeBackgroundFile } from '../images.js'
import { getAccountBySlug, isValidSlug } from '../accounts.js'
import { DEFAULT_BACKGROUND, openJournalStore } from '../db.js'

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

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    try {
      const store = openJournalStore(req.params.slug)
      cb(null, store.uploadsDir)
    } catch (err) {
      cb(err)
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg'
    cb(null, `bg-${Date.now()}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Chỉ chấp nhận file ảnh'))
  },
})

function normalizeNumber(value, fallback = 0) {
  if (value == null || value === '') return fallback
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function mergeBackground(body, current, slug) {
  const type = body.type ?? current.type ?? 'default'

  if (type === 'default') return { ...DEFAULT_BACKGROUND }

  if (type === 'solid') {
    return {
      type: 'solid',
      color: body.color ?? current.color ?? '#fafafa',
    }
  }

  if (type === 'pattern') {
    return {
      type: 'pattern',
      pattern: body.pattern ?? current.pattern ?? 'dots',
      color: body.color ?? current.color ?? '#71717a',
      opacity: normalizeNumber(body.opacity, current.opacity ?? 0.15),
      baseColor: body.baseColor ?? current.baseColor,
    }
  }

  if (type === 'image') {
    const filename = body.filename ?? current.filename
    const imageUrl =
      body.imageUrl ??
      (filename ? `/uploads/${slug}/${filename}` : current.imageUrl)
    if (!imageUrl) return { ...DEFAULT_BACKGROUND }
    return {
      type: 'image',
      imageUrl,
      filename: filename ?? current.filename,
      fit: body.fit ?? current.fit ?? 'cover',
      overlay: normalizeNumber(body.overlay, current.overlay ?? 0),
    }
  }

  return { ...DEFAULT_BACKGROUND }
}

function clearBackgroundImage(store, settings) {
  if (settings.type === 'image' && settings.filename) {
    removeBackgroundFile(store.uploadsDir, settings.filename)
  }
}

router.get('/settings/background', (req, res) => {
  const store = resolveStore(req, res)
  if (!store) return
  res.json(store.getBackgroundSettings())
})

router.put('/settings/background', requireAccountWrite, (req, res) => {
  const store = resolveStore(req, res)
  if (!store) return
  const current = store.getBackgroundSettings()
  const next = mergeBackground(req.body, current, store.slug)

  if (current.type === 'image' && next.type !== 'image') {
    clearBackgroundImage(store, current)
  }

  res.json(store.setBackgroundSettings(next))
})

router.post(
  '/settings/background/image',
  requireAccountWrite,
  upload.single('image'),
  (req, res) => {
    const store = resolveStore(req, res)
    if (!store) return
    if (!req.file) return res.status(400).json({ error: 'Thiếu file ảnh' })

    const current = store.getBackgroundSettings()
    if (current.type === 'image' && current.filename) {
      removeBackgroundFile(store.uploadsDir, current.filename)
    }

    const settings = {
      type: 'image',
      imageUrl: `/uploads/${store.slug}/${req.file.filename}`,
      filename: req.file.filename,
      fit: req.body.fit || current.fit || 'cover',
      overlay: normalizeNumber(req.body.overlay, current.overlay ?? 0),
    }

    res.json(store.setBackgroundSettings(settings))
  },
)

export default router
