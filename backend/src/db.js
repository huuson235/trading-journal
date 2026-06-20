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
    rr REAL,
    pnl REAL,
    note TEXT NOT NULL DEFAULT '',
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

const IMAGE_SLOTS = ['htf', 'mtf', 'ltf']
const BG_SETTINGS_KEY = 'background'
export const DEFAULT_BACKGROUND = { type: 'default' }

function timeframeFromRow(row, slot) {
  const filename = row[`${slot}_image`]
  return {
    text: row[`${slot}_text`],
    imageUrl: filename ? `/uploads/${filename}` : null,
    thumbUrl: filename ? resolveThumbUrl(UPLOADS_DIR, filename) : null,
  }
}

function normalizeNumber(value) {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function rowToEntry(row) {
  return {
    id: row.id,
    no: row.no,
    date: row.date,
    createdAt: row.created_at,
    session: row.session,
    pair: row.pair,
    rr: normalizeNumber(row.rr),
    pnl: normalizeNumber(row.pnl),
    note: row.note,
    htf: timeframeFromRow(row, 'htf'),
    mtf: timeframeFromRow(row, 'mtf'),
    ltf: timeframeFromRow(row, 'ltf'),
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

export function getAllEntries() {
  const rows = db
    .prepare('SELECT * FROM journal_entries ORDER BY no DESC, id DESC')
    .all()
  return rows.map(rowToEntry)
}

export function getEntryById(id) {
  const row = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id)
  return row ? rowToEntry(row) : null
}

export function createEntry(data) {
  const maxNo = db.prepare('SELECT COALESCE(MAX(no), 0) as m FROM journal_entries').get().m
  const stmt = db.prepare(`
    INSERT INTO journal_entries (no, date, session, pair, rr, pnl, note, htf_text, mtf_text, ltf_text)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const result = stmt.run(
    maxNo + 1,
    data.date,
    data.session,
    data.pair ?? '',
    normalizeNumber(data.rr),
    normalizeNumber(data.pnl),
    data.note ?? '',
    data.htf?.text ?? '',
    data.mtf?.text ?? '',
    data.ltf?.text ?? '',
  )
  return getEntryById(Number(result.lastInsertRowid))
}

export function updateEntry(id, data) {
  const existing = db.prepare('SELECT id FROM journal_entries WHERE id = ?').get(id)
  if (!existing) return null

  const stmt = db.prepare(`
    UPDATE journal_entries SET
      date = ?, session = ?, pair = ?, rr = ?, pnl = ?, note = ?,
      htf_text = ?, mtf_text = ?, ltf_text = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `)
  stmt.run(
    data.date,
    data.session,
    data.pair ?? '',
    normalizeNumber(data.rr),
    normalizeNumber(data.pnl),
    data.note ?? '',
    data.htf?.text ?? '',
    data.mtf?.text ?? '',
    data.ltf?.text ?? '',
    id,
  )
  return getEntryById(id)
}

export function deleteEntry(id) {
  const row = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id)
  if (!row) return false

  for (const slot of IMAGE_SLOTS) {
    const filename = row[`${slot}_image`]
    if (filename) removeImageFiles(UPLOADS_DIR, filename)
  }

  db.prepare('DELETE FROM journal_entries WHERE id = ?').run(id)
  renumberAll()
  return true
}

export function setEntryImage(id, slot, filename) {
  if (!IMAGE_SLOTS.includes(slot)) return null

  const row = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id)
  if (!row) return null

  const oldFilename = row[`${slot}_image`]
  if (oldFilename && oldFilename !== filename) {
    removeImageFiles(UPLOADS_DIR, oldFilename)
  }

  db.prepare(
    `UPDATE journal_entries SET ${slot}_image = ?, updated_at = datetime('now') WHERE id = ?`,
  ).run(filename, id)

  return getEntryById(id)
}

export function removeEntryImage(id, slot) {
  if (!IMAGE_SLOTS.includes(slot)) return null

  const row = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id)
  if (!row) return null

  const filename = row[`${slot}_image`]
  if (filename) removeImageFiles(UPLOADS_DIR, filename)

  db.prepare(
    `UPDATE journal_entries SET ${slot}_image = NULL, updated_at = datetime('now') WHERE id = ?`,
  ).run(id)

  return getEntryById(id)
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

export { db, IMAGE_SLOTS }
