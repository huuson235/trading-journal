import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { requireAuth } from '../auth.js'
import { removeBackgroundFile } from '../images.js'
import {
  DEFAULT_BACKGROUND,
  UPLOADS_DIR,
  getBackgroundSettings,
  setBackgroundSettings,
} from '../db.js'

const router = Router()

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
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

function mergeBackground(body, current) {
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
    const imageUrl = body.imageUrl ?? (filename ? `/uploads/${filename}` : current.imageUrl)
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

function clearBackgroundImage(settings) {
  if (settings.type === 'image' && settings.filename) {
    removeBackgroundFile(UPLOADS_DIR, settings.filename)
  }
}

router.get('/settings/background', (_req, res) => {
  res.json(getBackgroundSettings())
})

router.put('/settings/background', requireAuth, (req, res) => {
  const current = getBackgroundSettings()
  const next = mergeBackground(req.body, current)

  if (current.type === 'image' && next.type !== 'image') {
    clearBackgroundImage(current)
  }

  res.json(setBackgroundSettings(next))
})

router.post('/settings/background/image', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Thiếu file ảnh' })

  const current = getBackgroundSettings()
  if (current.type === 'image' && current.filename) {
    removeBackgroundFile(UPLOADS_DIR, current.filename)
  }

  const settings = {
    type: 'image',
    imageUrl: `/uploads/${req.file.filename}`,
    filename: req.file.filename,
    fit: req.body.fit || current.fit || 'cover',
    overlay: normalizeNumber(req.body.overlay, current.overlay ?? 0),
  }

  res.json(setBackgroundSettings(settings))
})

export default router
