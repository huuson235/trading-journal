import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

export function thumbFilename(originalFilename) {
  const ext = path.extname(originalFilename)
  const base = originalFilename.slice(0, -ext.length)
  return `${base}-thumb.webp`
}

export function resolveThumbUrl(uploadsDir, originalFilename) {
  if (!originalFilename) return null
  const thumbName = thumbFilename(originalFilename)
  if (fs.existsSync(path.join(uploadsDir, thumbName))) {
    return `/uploads/${thumbName}`
  }
  return `/uploads/${originalFilename}`
}

export async function generateThumbnail(uploadsDir, originalFilename) {
  const originalPath = path.join(uploadsDir, originalFilename)
  const thumbPath = path.join(uploadsDir, thumbFilename(originalFilename))

  await sharp(originalPath)
    .rotate()
    .resize(320, 320, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 70 })
    .toFile(thumbPath)
}

export function removeImageFiles(uploadsDir, originalFilename) {
  if (!originalFilename) return

  const originalPath = path.join(uploadsDir, originalFilename)
  if (fs.existsSync(originalPath)) fs.unlinkSync(originalPath)

  const thumbPath = path.join(uploadsDir, thumbFilename(originalFilename))
  if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath)
}

export function removeBackgroundFile(uploadsDir, filename) {
  if (!filename || !filename.startsWith('bg-')) return
  const filePath = path.join(uploadsDir, filename)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
}
