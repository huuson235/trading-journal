import { DatabaseSync } from 'node:sqlite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { removeImageFiles, resolveThumbUrl } from './images.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
export const DATA_DIR = path.join(ROOT, 'data')
export const UPLOADS_DIR = path.join(ROOT, 'uploads')

fs.mkdirSync(DATA_DIR, { recursive: true })
fs.mkdirSync(UPLOADS_DIR, { recursive: true })

const db = new DatabaseSync(path.join(DATA_DIR, 'journal.db'))

db.exec(`
  CREATE TABLE IF NOT EXISTS journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    no INTEGER NOT NULL,
    date TEXT NOT NULL,
    session TEXT NOT NULL DEFAULT 'Asia',
    pair TEXT NOT NULL DEFAULT '',
    direction TEXT NOT NULL DEFAULT 'LONG',
    rr REAL,
    pnl REAL,
    note TEXT NOT NULL DEFAULT '',
    visible INTEGER NOT NULL DEFAULT 1,
    htf_text TEXT NOT NULL DEFAULT '',
    mtf_text TEXT NOT NULL DEFAULT '',
    ltf_text TEXT NOT NULL DEFAULT '',
    htf_image TEXT,
    mtf_image TEXT,
    ltf_image TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS entry_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE
  )
`)

function normalizeTag(value) {
  return String(value ?? '').trim().toUpperCase()
}

function parseTagsFromNote(noteValue) {
  if (!noteValue) return []
  const trimmed = String(noteValue).trim()
  if (!trimmed) return []
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeTag).filter(Boolean)
      }
    } catch {
      /* legacy plain text */
    }
  }
  return [normalizeTag(trimmed)]
}

function serializeTags(tags) {
  const normalized = (Array.isArray(tags) ? tags : [])
    .map(normalizeTag)
    .filter(Boolean)
  return JSON.stringify(normalized)
}

function migrate() {
  const cols = db.prepare('PRAGMA table_info(journal_entries)').all().map((c) => c.name)
  if (!cols.includes('direction')) {
    db.exec("ALTER TABLE journal_entries ADD COLUMN direction TEXT NOT NULL DEFAULT 'LONG'")
  }
  if (!cols.includes('visible')) {
    db.exec('ALTER TABLE journal_entries ADD COLUMN visible INTEGER NOT NULL DEFAULT 1')
  }

  const migrated = db.prepare("SELECT value FROM settings WHERE key = 'images_migrated'").get()
  if (!migrated) {
    const slots = ['htf', 'mtf', 'ltf']
    const rows = db.prepare('SELECT * FROM journal_entries').all()
    for (const row of rows) {
      let order = 0
      for (const slot of slots) {
        const filename = row[`${slot}_image`]
        if (filename) {
          const exists = db
            .prepare('SELECT id FROM entry_images WHERE entry_id = ? AND filename = ?')
            .get(row.id, filename)
          if (!exists) {
            db.prepare(
              'INSERT INTO entry_images (entry_id, filename, sort_order) VALUES (?, ?, ?)',
            ).run(row.id, filename, order++)
          }
        }
      }
    }
    db.prepare(`
      INSERT INTO settings (key, value) VALUES ('images_migrated', '1')
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run()
  }

  const notesMigrated = db.prepare("SELECT value FROM settings WHERE key = 'notes_migrated_tags'").get()
  if (!notesMigrated) {
    const rows = db.prepare('SELECT id, note FROM journal_entries').all()
    const update = db.prepare('UPDATE journal_entries SET note = ? WHERE id = ?')
    for (const row of rows) {
      const trimmed = String(row.note ?? '').trim()
      if (!trimmed || trimmed.startsWith('[')) continue
      update.run(serializeTags(parseTagsFromNote(row.note)), row.id)
    }
    db.prepare(`
      INSERT INTO settings (key, value) VALUES ('notes_migrated_tags', '1')
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run()
  }

  const sessionMigrated = db.prepare("SELECT value FROM settings WHERE key = 'session_migrated_tags'").get()
  if (!sessionMigrated) {
    const SESSION_TO_TAG = {
      Asia: 'ASIA',
      London: 'LO',
      NYA: 'NYA',
      NYL: 'NYL',
      NYP: 'NYP',
    }
    const rows = db.prepare('SELECT id, session, note FROM journal_entries').all()
    const update = db.prepare('UPDATE journal_entries SET note = ? WHERE id = ?')
    for (const row of rows) {
      const tag = SESSION_TO_TAG[row.session] ?? 'ASIA'
      const tags = parseTagsFromNote(row.note)
      if (tags.includes(tag)) continue
      update.run(serializeTags([...tags, tag]), row.id)
    }
    db.prepare(`
      INSERT INTO settings (key, value) VALUES ('session_migrated_tags', '1')
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run()
  }
}

migrate()

const BG_SETTINGS_KEY = 'background'
export const DEFAULT_BACKGROUND = { type: 'default' }

function normalizeNumber(value) {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function normalizeDirection(value) {
  return value === 'SHORT' ? 'SHORT' : 'LONG'
}

function loadImages(entryId) {
  const rows = db
    .prepare(
      'SELECT id, filename FROM entry_images WHERE entry_id = ? ORDER BY sort_order ASC, id ASC',
    )
    .all(entryId)
  return rows.map((row) => ({
    id: row.id,
    imageUrl: `/uploads/${row.filename}`,
    thumbUrl: resolveThumbUrl(UPLOADS_DIR, row.filename),
  }))
}

export function rowToEntry(row) {
  return {
    id: row.id,
    no: row.no,
    date: row.date,
    createdAt: row.created_at,
    session: row.session,
    pair: row.pair,
    direction: normalizeDirection(row.direction),
    rr: normalizeNumber(row.rr),
    pnl: normalizeNumber(row.pnl),
    tags: parseTagsFromNote(row.note),
    visible: Boolean(row.visible ?? 1),
    images: loadImages(row.id),
  }
}

function removeLegacyImages(row) {
  for (const slot of ['htf', 'mtf', 'ltf']) {
    const filename = row[`${slot}_image`]
    if (filename) removeImageFiles(UPLOADS_DIR, filename)
  }
}

export function renumberAll() {
  const rows = db
    .prepare('SELECT id FROM journal_entries ORDER BY no DESC, id DESC')
    .all()
  const update = db.prepare('UPDATE journal_entries SET no = ? WHERE id = ?')
  db.exec('BEGIN')
  try {
    rows.forEach((row, i) => update.run(rows.length - i, row.id))
    db.exec('COMMIT')
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
}

export function getAllEntries(visibleOnly = false) {
  const rows = db
    .prepare('SELECT * FROM journal_entries ORDER BY no DESC, id DESC')
    .all()
  const filtered = visibleOnly ? rows.filter((r) => r.visible) : rows
  return filtered.map(rowToEntry)
}

export function getEntryById(id, visibleOnly = false) {
  const row = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id)
  if (!row) return null
  if (visibleOnly && !row.visible) return null
  return rowToEntry(row)
}

export function createEntry(data) {
  const maxNo = db.prepare('SELECT COALESCE(MAX(no), 0) as m FROM journal_entries').get().m
  const stmt = db.prepare(`
    INSERT INTO journal_entries (no, date, session, pair, direction, rr, pnl, note, visible)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const result = stmt.run(
    maxNo + 1,
    data.date,
    data.session,
    data.pair ?? '',
    normalizeDirection(data.direction),
    normalizeNumber(data.rr),
    normalizeNumber(data.pnl),
    serializeTags(data.tags ?? []),
    data.visible === false ? 0 : 1,
  )
  return getEntryById(Number(result.lastInsertRowid))
}

export function updateEntry(id, data) {
  const existing = db.prepare('SELECT id, note FROM journal_entries WHERE id = ?').get(id)
  if (!existing) return null

  const noteValue =
    data.tags !== undefined ? serializeTags(data.tags) : existing.note ?? '[]'

  const stmt = db.prepare(`
    UPDATE journal_entries SET
      date = ?, session = ?, pair = ?, direction = ?, rr = ?, pnl = ?, note = ?, visible = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `)
  stmt.run(
    data.date,
    data.session,
    data.pair ?? '',
    normalizeDirection(data.direction),
    normalizeNumber(data.rr),
    normalizeNumber(data.pnl),
    noteValue,
    data.visible === false ? 0 : 1,
    id,
  )
  return getEntryById(id)
}

export function deleteEntry(id) {
  const row = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id)
  if (!row) return false

  const images = db.prepare('SELECT filename FROM entry_images WHERE entry_id = ?').all(id)
  for (const img of images) {
    removeImageFiles(UPLOADS_DIR, img.filename)
  }
  removeLegacyImages(row)

  db.prepare('DELETE FROM entry_images WHERE entry_id = ?').run(id)
  db.prepare('DELETE FROM journal_entries WHERE id = ?').run(id)
  renumberAll()
  return true
}

export function addEntryImage(entryId, filename) {
  const row = db.prepare('SELECT id FROM journal_entries WHERE id = ?').get(entryId)
  if (!row) return null

  const maxOrder = db
    .prepare('SELECT COALESCE(MAX(sort_order), -1) as m FROM entry_images WHERE entry_id = ?')
    .get(entryId).m

  db.prepare(
    'INSERT INTO entry_images (entry_id, filename, sort_order) VALUES (?, ?, ?)',
  ).run(entryId, filename, maxOrder + 1)

  return getEntryById(entryId)
}

export function removeEntryImageById(entryId, imageId) {
  const img = db
    .prepare('SELECT * FROM entry_images WHERE id = ? AND entry_id = ?')
    .get(imageId, entryId)
  if (!img) return null

  removeImageFiles(UPLOADS_DIR, img.filename)
  db.prepare('DELETE FROM entry_images WHERE id = ?').run(imageId)
  return getEntryById(entryId)
}

export function getDistinctTags() {
  const rows = db
    .prepare(`SELECT note FROM journal_entries WHERE note IS NOT NULL AND TRIM(note) != ''`)
    .all()
  const set = new Set()
  for (const row of rows) {
    for (const tag of parseTagsFromNote(row.note)) {
      set.add(tag)
    }
  }
  return [...set].sort()
}

export function getDistinctPairs() {
  const rows = db
    .prepare(
      `SELECT DISTINCT UPPER(pair) as pair FROM journal_entries
       WHERE pair IS NOT NULL AND TRIM(pair) != ''
       ORDER BY pair ASC`,
    )
    .all()
  return rows.map((r) => r.pair)
}

export function getBackgroundSettings() {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(BG_SETTINGS_KEY)
  if (!row) return { ...DEFAULT_BACKGROUND }
  try {
    return JSON.parse(row.value)
  } catch {
    return { ...DEFAULT_BACKGROUND }
  }
}

export function setBackgroundSettings(settings) {
  const json = JSON.stringify(settings)
  db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(BG_SETTINGS_KEY, json)
  return settings
}

export { db }
