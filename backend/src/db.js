import { DatabaseSync } from 'node:sqlite'
import fs from 'fs'
import path from 'path'
import { removeImageFiles, resolveThumbUrl } from './images.js'
import { userDataDir, userUploadsDir } from './accounts.js'

const stores = new Map()

const BG_SETTINGS_KEY = 'background'
export const DEFAULT_BACKGROUND = { type: 'default' }

const IMAGE_SLOTS = ['htf', 'mtf', 'ltf']
const SESSIONS = ['London', 'Asia', 'New York AM', 'New York PM', 'No session']
const RESULTS = ['Take profit', 'Stop loss', 'BE']
const CTC_VALUES = ['bullish', 'bearish', 'sideways']
const BIAS_VALUES = ['bullish', 'bearish', 'no_bias']
const MTF_MODELS = ['CRT', 'I-E', 'E-E', 'Unicorn']

const SESSION_ALIASES = {
  Asia: 'Asia',
  London: 'London',
  NYA: 'New York AM',
  NYL: 'New York PM',
  NYP: 'New York PM',
  'New York AM': 'New York AM',
  'New York PM': 'New York PM',
  'No session': 'No session',
}

const NEW_ENTRY_COLUMNS = [
  ['rr_idea', 'REAL'],
  ['rr_real', 'REAL'],
  ['result', "TEXT NOT NULL DEFAULT ''"],
  ['htf_ctc', "TEXT NOT NULL DEFAULT ''"],
  ['htf_bias', "TEXT NOT NULL DEFAULT ''"],
  ['htf_pda', "TEXT NOT NULL DEFAULT ''"],
  ['htf_dol', "TEXT NOT NULL DEFAULT ''"],
  ['mtf_ctc', "TEXT NOT NULL DEFAULT ''"],
  ['mtf_pda', "TEXT NOT NULL DEFAULT ''"],
  ['mtf_model', "TEXT NOT NULL DEFAULT ''"],
  ['mtf_sweep', 'INTEGER NOT NULL DEFAULT 0'],
  ['mtf_cisd', 'INTEGER NOT NULL DEFAULT 0'],
  ['mtf_mss', 'INTEGER NOT NULL DEFAULT 0'],
  ['ltf_sweep', 'INTEGER NOT NULL DEFAULT 0'],
  ['ltf_cisd', 'INTEGER NOT NULL DEFAULT 0'],
  ['ltf_mss', 'INTEGER NOT NULL DEFAULT 0'],
  ['ltf_entry', "TEXT NOT NULL DEFAULT ''"],
]

function normalizeTag(value) {
  return String(value ?? '').trim().toUpperCase()
}

function parseTags(tagsValue) {
  if (!tagsValue) return []
  const trimmed = String(tagsValue).trim()
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

function normalizeNumber(value) {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function normalizeDirection(value) {
  return value === 'SHORT' ? 'SHORT' : 'LONG'
}

function normalizeBool(value) {
  return value === true || value === 1 || value === '1' || value === 'true'
}

function pickAllowed(value, allowed) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const found = allowed.find((item) => item.toLowerCase() === raw.toLowerCase())
  return found ?? ''
}

function normalizeSession(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return 'No session'
  if (SESSION_ALIASES[raw]) return SESSION_ALIASES[raw]
  const found = SESSIONS.find((item) => item.toLowerCase() === raw.toLowerCase())
  return found ?? 'No session'
}

function normalizeResult(value) {
  return pickAllowed(value, RESULTS)
}

function normalizeSlot(value) {
  const slot = String(value ?? '').trim().toLowerCase()
  return IMAGE_SLOTS.includes(slot) ? slot : 'htf'
}

function inferResultFromPnl(pnl) {
  const n = normalizeNumber(pnl)
  if (n == null) return ''
  if (n > 0) return 'Take profit'
  if (n < 0) return 'Stop loss'
  return 'BE'
}

function createJournalStore(slug) {
  const dataDir = userDataDir(slug)
  const uploadsDir = userUploadsDir(slug)
  fs.mkdirSync(dataDir, { recursive: true })
  fs.mkdirSync(uploadsDir, { recursive: true })

  const db = new DatabaseSync(path.join(dataDir, 'journal.db'))

  db.exec(`
    CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      no INTEGER NOT NULL,
      date TEXT NOT NULL,
      session TEXT NOT NULL DEFAULT 'Asia',
      pair TEXT NOT NULL DEFAULT '',
      direction TEXT NOT NULL DEFAULT 'LONG',
      rr REAL,
      rr_plan REAL,
      rr_reality REAL,
      rr_idea REAL,
      rr_real REAL,
      checklist INTEGER NOT NULL DEFAULT 0,
      pnl REAL,
      result TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      visible INTEGER NOT NULL DEFAULT 1,
      htf_text TEXT NOT NULL DEFAULT '',
      mtf_text TEXT NOT NULL DEFAULT '',
      ltf_text TEXT NOT NULL DEFAULT '',
      htf_image TEXT,
      mtf_image TEXT,
      ltf_image TEXT,
      htf_ctc TEXT NOT NULL DEFAULT '',
      htf_bias TEXT NOT NULL DEFAULT '',
      htf_pda TEXT NOT NULL DEFAULT '',
      htf_dol TEXT NOT NULL DEFAULT '',
      mtf_ctc TEXT NOT NULL DEFAULT '',
      mtf_pda TEXT NOT NULL DEFAULT '',
      mtf_model TEXT NOT NULL DEFAULT '',
      mtf_sweep INTEGER NOT NULL DEFAULT 0,
      mtf_cisd INTEGER NOT NULL DEFAULT 0,
      mtf_mss INTEGER NOT NULL DEFAULT 0,
      ltf_sweep INTEGER NOT NULL DEFAULT 0,
      ltf_cisd INTEGER NOT NULL DEFAULT 0,
      ltf_mss INTEGER NOT NULL DEFAULT 0,
      ltf_entry TEXT NOT NULL DEFAULT '',
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
      slot TEXT NOT NULL DEFAULT 'htf',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE
    )
  `)

  function migrate() {
    const cols = db.prepare('PRAGMA table_info(journal_entries)').all().map((c) => c.name)
    if (!cols.includes('direction')) {
      db.exec("ALTER TABLE journal_entries ADD COLUMN direction TEXT NOT NULL DEFAULT 'LONG'")
    }
    if (!cols.includes('visible')) {
      db.exec('ALTER TABLE journal_entries ADD COLUMN visible INTEGER NOT NULL DEFAULT 1')
    }
    if (!cols.includes('tags')) {
      db.exec("ALTER TABLE journal_entries ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'")
    }
    if (!cols.includes('rr_plan')) {
      db.exec('ALTER TABLE journal_entries ADD COLUMN rr_plan REAL')
    }
    if (!cols.includes('rr_reality')) {
      db.exec('ALTER TABLE journal_entries ADD COLUMN rr_reality REAL')
    }
    if (!cols.includes('checklist')) {
      db.exec('ALTER TABLE journal_entries ADD COLUMN checklist INTEGER NOT NULL DEFAULT 0')
    }

    for (const [name, ddl] of NEW_ENTRY_COLUMNS) {
      if (!cols.includes(name)) {
        db.exec(`ALTER TABLE journal_entries ADD COLUMN ${name} ${ddl}`)
      }
    }

    const imageCols = db.prepare('PRAGMA table_info(entry_images)').all().map((c) => c.name)
    if (!imageCols.includes('slot')) {
      db.exec("ALTER TABLE entry_images ADD COLUMN slot TEXT NOT NULL DEFAULT 'htf'")
    }

    const rrSplit = db.prepare("SELECT value FROM settings WHERE key = 'rr_plan_reality_split'").get()
    if (!rrSplit) {
      db.prepare(`
        UPDATE journal_entries
        SET rr_plan = rr
        WHERE rr_plan IS NULL AND rr IS NOT NULL
      `).run()
      db.prepare(`
        INSERT INTO settings (key, value) VALUES ('rr_plan_reality_split', '1')
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run()
    }

    const migrated = db.prepare("SELECT value FROM settings WHERE key = 'images_migrated'").get()
    if (!migrated) {
      const rows = db.prepare('SELECT * FROM journal_entries').all()
      for (const row of rows) {
        let order = 0
        for (const slot of IMAGE_SLOTS) {
          const filename = row[`${slot}_image`]
          if (filename) {
            const exists = db
              .prepare('SELECT id FROM entry_images WHERE entry_id = ? AND filename = ?')
              .get(row.id, filename)
            if (!exists) {
              db.prepare(
                'INSERT INTO entry_images (entry_id, filename, slot, sort_order) VALUES (?, ?, ?, ?)',
              ).run(row.id, filename, slot, order++)
            }
          }
        }
      }
      db.prepare(`
        INSERT INTO settings (key, value) VALUES ('images_migrated', '1')
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run()
    }

    const notesMigrated = db
      .prepare("SELECT value FROM settings WHERE key = 'notes_migrated_tags'")
      .get()
    if (!notesMigrated) {
      const rows = db.prepare('SELECT id, note FROM journal_entries').all()
      const update = db.prepare('UPDATE journal_entries SET note = ? WHERE id = ?')
      for (const row of rows) {
        const trimmed = String(row.note ?? '').trim()
        if (!trimmed || trimmed.startsWith('[')) continue
        update.run(serializeTags(parseTags(row.note)), row.id)
      }
      db.prepare(`
        INSERT INTO settings (key, value) VALUES ('notes_migrated_tags', '1')
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run()
    }

    const sessionMigrated = db
      .prepare("SELECT value FROM settings WHERE key = 'session_migrated_tags'")
      .get()
    if (!sessionMigrated) {
      const SESSION_TO_TAG = {
        Asia: 'ASIA',
        London: 'LO',
        NYA: 'NYA',
        NYL: 'NYL',
        NYP: 'NYP',
      }
      const rows = db.prepare('SELECT id, session, note, tags FROM journal_entries').all()
      const update = db.prepare('UPDATE journal_entries SET note = ? WHERE id = ?')
      for (const row of rows) {
        const tag = SESSION_TO_TAG[row.session] ?? 'ASIA'
        const tags = parseTags(row.note)
        if (tags.includes(tag)) continue
        update.run(serializeTags([...tags, tag]), row.id)
      }
      db.prepare(`
        INSERT INTO settings (key, value) VALUES ('session_migrated_tags', '1')
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run()
    }

    const noteTagsSplit = db
      .prepare("SELECT value FROM settings WHERE key = 'note_tags_split'")
      .get()
    if (!noteTagsSplit) {
      const rows = db.prepare('SELECT id, note, tags FROM journal_entries').all()
      const update = db.prepare('UPDATE journal_entries SET tags = ?, note = ? WHERE id = ?')
      for (const row of rows) {
        const existingTags = parseTags(row.tags)
        const fromNote = parseTags(row.note)
        const merged = existingTags.length > 0 ? existingTags : fromNote
        update.run(serializeTags(merged), '', row.id)
      }
      db.prepare(`
        INSERT INTO settings (key, value) VALUES ('note_tags_split', '1')
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run()
    }

    const tradeFormMigrated = db
      .prepare("SELECT value FROM settings WHERE key = 'trade_form_v1'")
      .get()
    if (!tradeFormMigrated) {
      const rows = db.prepare('SELECT * FROM journal_entries').all()
      const update = db.prepare(`
        UPDATE journal_entries SET
          session = ?, rr_idea = ?, rr_real = ?, result = ?, ltf_entry = ?
        WHERE id = ?
      `)
      const updateSlot = db.prepare(
        'UPDATE entry_images SET slot = ? WHERE entry_id = ? AND filename = ?',
      )

      for (const row of rows) {
        const rrIdea = normalizeNumber(row.rr_idea ?? row.rr_plan ?? row.rr)
        const rrReal = normalizeNumber(row.rr_real ?? row.rr_reality)
        const result = String(row.result ?? '').trim()
          ? normalizeResult(row.result)
          : inferResultFromPnl(row.pnl)
        const ltfEntry = String(row.ltf_entry ?? '').trim() || String(row.ltf_text ?? '')
        update.run(normalizeSession(row.session), rrIdea, rrReal, result, ltfEntry, row.id)

        for (const slot of IMAGE_SLOTS) {
          const filename = row[`${slot}_image`]
          if (filename) updateSlot.run(slot, row.id, filename)
        }
      }

      db.prepare(`
        INSERT INTO settings (key, value) VALUES ('trade_form_v1', '1')
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run()
    }
  }

  migrate()

  function uploadUrl(filename) {
    return `/uploads/${slug}/${filename}`
  }

  function toImage(row) {
    return {
      id: row.id,
      slot: normalizeSlot(row.slot),
      imageUrl: uploadUrl(row.filename),
      thumbUrl: resolveThumbUrl(uploadsDir, row.filename, slug),
    }
  }

  function loadImages(entryId) {
    const rows = db
      .prepare(
        'SELECT id, filename, slot FROM entry_images WHERE entry_id = ? ORDER BY sort_order ASC, id ASC',
      )
      .all(entryId)
    return rows.map(toImage)
  }

  function groupImages(images) {
    const grouped = { htf: [], mtf: [], ltf: [] }
    for (const image of images) {
      const slot = normalizeSlot(image.slot)
      grouped[slot].push(image)
    }
    return grouped
  }

  function rowToEntry(row) {
    const images = loadImages(row.id)
    const grouped = groupImages(images)
    const rrIdea = normalizeNumber(row.rr_idea ?? row.rr_plan ?? row.rr)
    const rrReal = normalizeNumber(row.rr_real ?? row.rr_reality)
    return {
      id: row.id,
      no: row.no,
      date: row.date,
      createdAt: row.created_at,
      session: normalizeSession(row.session),
      pair: String(row.pair ?? '').toUpperCase(),
      direction: normalizeDirection(row.direction),
      rrIdea,
      rrReal,
      rrPlan: rrIdea,
      rrReality: rrReal,
      checklist: Boolean(row.checklist ?? 0),
      pnl: normalizeNumber(row.pnl),
      result: normalizeResult(row.result),
      note: String(row.note ?? ''),
      tags: parseTags(row.tags),
      visible: Boolean(row.visible ?? 1),
      htfCtc: pickAllowed(row.htf_ctc, CTC_VALUES),
      htfBias: pickAllowed(row.htf_bias, BIAS_VALUES),
      htfPda: String(row.htf_pda ?? ''),
      htfDol: String(row.htf_dol ?? ''),
      mtfCtc: pickAllowed(row.mtf_ctc, CTC_VALUES),
      mtfPda: String(row.mtf_pda ?? ''),
      mtfModel: pickAllowed(row.mtf_model, MTF_MODELS),
      mtfSweep: Boolean(row.mtf_sweep ?? 0),
      mtfCisd: Boolean(row.mtf_cisd ?? 0),
      mtfMss: Boolean(row.mtf_mss ?? 0),
      ltfSweep: Boolean(row.ltf_sweep ?? 0),
      ltfCisd: Boolean(row.ltf_cisd ?? 0),
      ltfMss: Boolean(row.ltf_mss ?? 0),
      ltfEntry: String(row.ltf_entry ?? ''),
      htfImages: grouped.htf,
      mtfImages: grouped.mtf,
      ltfImages: grouped.ltf,
      images,
    }
  }

  function removeLegacyImages(row) {
    for (const slot of IMAGE_SLOTS) {
      const filename = row[`${slot}_image`]
      if (filename) removeImageFiles(uploadsDir, filename)
    }
  }

  function renumberAll() {
    const rows = db.prepare('SELECT id FROM journal_entries ORDER BY no DESC, id DESC').all()
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

  function buildWriteValues(data, existing) {
    const rrIdea = normalizeNumber(data.rrIdea ?? data.rrPlan ?? data.rr)
    const rrReal = normalizeNumber(
      data.rrReal !== undefined ? data.rrReal : data.rrReality !== undefined ? data.rrReality : existing?.rrReal,
    )
    const pnl = data.pnl !== undefined ? normalizeNumber(data.pnl) : existing ? existing.pnl : null
    const resultSource =
      data.result !== undefined ? data.result : existing ? existing.result : ''
    return {
      date: data.date ?? existing?.date,
      session: normalizeSession(data.session ?? existing?.session),
      pair: String(data.pair ?? existing?.pair ?? '').trim().toUpperCase(),
      direction: normalizeDirection(data.direction ?? existing?.direction),
      rrIdea,
      rrReal,
      checklist: data.checklist !== undefined ? normalizeBool(data.checklist) : Boolean(existing?.checklist),
      pnl,
      result: normalizeResult(resultSource),
      note: data.note !== undefined ? String(data.note ?? '') : String(existing?.note ?? ''),
      tags: data.tags !== undefined ? serializeTags(data.tags) : serializeTags(existing?.tags ?? []),
      visible: data.visible !== undefined ? data.visible !== false : existing ? existing.visible !== false : true,
      htfCtc: pickAllowed(data.htfCtc ?? existing?.htfCtc, CTC_VALUES),
      htfBias: pickAllowed(data.htfBias ?? existing?.htfBias, BIAS_VALUES),
      htfPda: String(data.htfPda ?? existing?.htfPda ?? ''),
      htfDol: String(data.htfDol ?? existing?.htfDol ?? ''),
      mtfCtc: pickAllowed(data.mtfCtc ?? existing?.mtfCtc, CTC_VALUES),
      mtfPda: String(data.mtfPda ?? existing?.mtfPda ?? ''),
      mtfModel: pickAllowed(data.mtfModel ?? existing?.mtfModel, MTF_MODELS),
      mtfSweep: normalizeBool(data.mtfSweep ?? existing?.mtfSweep),
      mtfCisd: normalizeBool(data.mtfCisd ?? existing?.mtfCisd),
      mtfMss: normalizeBool(data.mtfMss ?? existing?.mtfMss),
      ltfSweep: normalizeBool(data.ltfSweep ?? existing?.ltfSweep),
      ltfCisd: normalizeBool(data.ltfCisd ?? existing?.ltfCisd),
      ltfMss: normalizeBool(data.ltfMss ?? existing?.ltfMss),
      ltfEntry: String(data.ltfEntry ?? existing?.ltfEntry ?? ''),
    }
  }

  return {
    slug,
    uploadsDir,

    getAllEntries(visibleOnly = false) {
      const rows = db.prepare('SELECT * FROM journal_entries ORDER BY no DESC, id DESC').all()
      const filtered = visibleOnly ? rows.filter((r) => r.visible) : rows
      return filtered.map(rowToEntry)
    },

    getEntryById(id, visibleOnly = false) {
      const row = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id)
      if (!row) return null
      if (visibleOnly && !row.visible) return null
      return rowToEntry(row)
    },

    createEntry(data) {
      const maxNo = db.prepare('SELECT COALESCE(MAX(no), 0) as m FROM journal_entries').get().m
      const values = buildWriteValues(data, null)
      const stmt = db.prepare(`
        INSERT INTO journal_entries (
          no, date, session, pair, direction, rr, rr_plan, rr_reality, rr_idea, rr_real,
          checklist, pnl, result, note, tags, visible,
          htf_ctc, htf_bias, htf_pda, htf_dol,
          mtf_ctc, mtf_pda, mtf_model, mtf_sweep, mtf_cisd, mtf_mss,
          ltf_sweep, ltf_cisd, ltf_mss, ltf_entry
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      const result = stmt.run(
        maxNo + 1,
        values.date,
        values.session,
        values.pair,
        values.direction,
        values.rrIdea,
        values.rrIdea,
        values.rrReal,
        values.rrIdea,
        values.rrReal,
        values.checklist ? 1 : 0,
        values.pnl,
        values.result,
        values.note,
        values.tags,
        values.visible ? 1 : 0,
        values.htfCtc,
        values.htfBias,
        values.htfPda,
        values.htfDol,
        values.mtfCtc,
        values.mtfPda,
        values.mtfModel,
        values.mtfSweep ? 1 : 0,
        values.mtfCisd ? 1 : 0,
        values.mtfMss ? 1 : 0,
        values.ltfSweep ? 1 : 0,
        values.ltfCisd ? 1 : 0,
        values.ltfMss ? 1 : 0,
        values.ltfEntry,
      )
      return this.getEntryById(Number(result.lastInsertRowid))
    },

    updateEntry(id, data) {
      const existing = this.getEntryById(id)
      if (!existing) return null

      const values = buildWriteValues(data, existing)

      db.prepare(`
        UPDATE journal_entries SET
          date = ?, session = ?, pair = ?, direction = ?,
          rr = ?, rr_plan = ?, rr_reality = ?, rr_idea = ?, rr_real = ?,
          checklist = ?, pnl = ?, result = ?, note = ?, tags = ?, visible = ?,
          htf_ctc = ?, htf_bias = ?, htf_pda = ?, htf_dol = ?,
          mtf_ctc = ?, mtf_pda = ?, mtf_model = ?, mtf_sweep = ?, mtf_cisd = ?, mtf_mss = ?,
          ltf_sweep = ?, ltf_cisd = ?, ltf_mss = ?, ltf_entry = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `).run(
        values.date,
        values.session,
        values.pair,
        values.direction,
        values.rrIdea,
        values.rrIdea,
        values.rrReal,
        values.rrIdea,
        values.rrReal,
        values.checklist ? 1 : 0,
        values.pnl,
        values.result,
        values.note,
        values.tags,
        values.visible ? 1 : 0,
        values.htfCtc,
        values.htfBias,
        values.htfPda,
        values.htfDol,
        values.mtfCtc,
        values.mtfPda,
        values.mtfModel,
        values.mtfSweep ? 1 : 0,
        values.mtfCisd ? 1 : 0,
        values.mtfMss ? 1 : 0,
        values.ltfSweep ? 1 : 0,
        values.ltfCisd ? 1 : 0,
        values.ltfMss ? 1 : 0,
        values.ltfEntry,
        id,
      )
      return this.getEntryById(id)
    },

    deleteEntry(id) {
      const row = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id)
      if (!row) return false

      const images = db.prepare('SELECT filename FROM entry_images WHERE entry_id = ?').all(id)
      for (const img of images) {
        removeImageFiles(uploadsDir, img.filename)
      }
      removeLegacyImages(row)

      db.prepare('DELETE FROM entry_images WHERE entry_id = ?').run(id)
      db.prepare('DELETE FROM journal_entries WHERE id = ?').run(id)
      renumberAll()
      return true
    },

    addEntryImage(entryId, filename, slot = 'htf') {
      const row = db.prepare('SELECT id FROM journal_entries WHERE id = ?').get(entryId)
      if (!row) return null

      const normalizedSlot = normalizeSlot(slot)
      const maxOrder = db
        .prepare(
          'SELECT COALESCE(MAX(sort_order), -1) as m FROM entry_images WHERE entry_id = ? AND slot = ?',
        )
        .get(entryId, normalizedSlot).m

      db.prepare(
        'INSERT INTO entry_images (entry_id, filename, slot, sort_order) VALUES (?, ?, ?, ?)',
      ).run(entryId, filename, normalizedSlot, maxOrder + 1)

      return this.getEntryById(entryId)
    },

    removeEntryImageById(entryId, imageId) {
      const img = db
        .prepare('SELECT * FROM entry_images WHERE id = ? AND entry_id = ?')
        .get(imageId, entryId)
      if (!img) return null

      removeImageFiles(uploadsDir, img.filename)
      db.prepare('DELETE FROM entry_images WHERE id = ?').run(imageId)
      return this.getEntryById(entryId)
    },

    getDistinctTags() {
      const rows = db
        .prepare(`SELECT tags FROM journal_entries WHERE tags IS NOT NULL AND TRIM(tags) != '' AND TRIM(tags) != '[]'`)
        .all()
      const set = new Set()
      for (const row of rows) {
        for (const tag of parseTags(row.tags)) {
          set.add(tag)
        }
      }
      return [...set].sort()
    },

    getDistinctPairs() {
      const rows = db
        .prepare(
          `SELECT DISTINCT UPPER(pair) as pair FROM journal_entries
           WHERE pair IS NOT NULL AND TRIM(pair) != ''
           ORDER BY pair ASC`,
        )
        .all()
      return rows.map((r) => r.pair)
    },

    getBackgroundSettings() {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(BG_SETTINGS_KEY)
      if (!row) return { ...DEFAULT_BACKGROUND }
      try {
        const parsed = JSON.parse(row.value)
        if (parsed.type === 'image' && parsed.filename && !parsed.imageUrl?.includes(`/${slug}/`)) {
          parsed.imageUrl = uploadUrl(parsed.filename)
        }
        return parsed
      } catch {
        return { ...DEFAULT_BACKGROUND }
      }
    },

    setBackgroundSettings(settings) {
      const json = JSON.stringify(settings)
      db.prepare(`
        INSERT INTO settings (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run(BG_SETTINGS_KEY, json)
      return settings
    },
  }
}

export function openJournalStore(slug) {
  if (!stores.has(slug)) {
    stores.set(slug, createJournalStore(slug))
  }
  return stores.get(slug)
}

export function dropJournalStore(slug) {
  stores.delete(slug)
}
