import { DatabaseSync } from 'node:sqlite'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
export const DATA_DIR = path.join(ROOT, 'data')
export const USERS_DATA_DIR = path.join(DATA_DIR, 'users')
export const UPLOADS_ROOT = path.join(ROOT, 'uploads')
export const USERS_UPLOADS_DIR = path.join(UPLOADS_ROOT, 'users')

fs.mkdirSync(USERS_DATA_DIR, { recursive: true })
fs.mkdirSync(USERS_UPLOADS_DIR, { recursive: true })

const accountsDb = new DatabaseSync(path.join(DATA_DIR, 'accounts.db'))

accountsDb.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    slug TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

accountsDb.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`)

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/

export function isValidSlug(slug) {
  return typeof slug === 'string' && SLUG_RE.test(slug)
}

export function slugifyUsername(username) {
  const base = String(username ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
  return base || 'user'
}

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return { hash, salt }
}

export function verifyPassword(password, hash, salt) {
  const next = crypto.scryptSync(password, salt, 64).toString('hex')
  const a = Buffer.from(hash, 'hex')
  const b = Buffer.from(next, 'hex')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

function rowToAccount(row, { includeSensitive = false } = {}) {
  if (!row) return null
  const account = {
    id: row.id,
    username: row.username,
    slug: row.slug,
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
  if (includeSensitive) {
    account.passwordHash = row.password_hash
    account.passwordSalt = row.password_salt
  }
  return account
}

export function listAccounts({ activeOnly = false } = {}) {
  const rows = activeOnly
    ? accountsDb.prepare('SELECT * FROM accounts WHERE active = 1 ORDER BY username ASC').all()
    : accountsDb.prepare('SELECT * FROM accounts ORDER BY username ASC').all()
  return rows.map((row) => rowToAccount(row))
}

export function getAccountById(id) {
  const row = accountsDb.prepare('SELECT * FROM accounts WHERE id = ?').get(id)
  return rowToAccount(row)
}

export function getAccountByUsername(username) {
  const row = accountsDb
    .prepare('SELECT * FROM accounts WHERE username = ? COLLATE NOCASE')
    .get(username)
  return rowToAccount(row, { includeSensitive: true })
}

export function getAccountBySlug(slug) {
  const row = accountsDb.prepare('SELECT * FROM accounts WHERE slug = ?').get(slug)
  return rowToAccount(row)
}

function ensureUniqueSlug(preferred) {
  let slug = preferred
  let i = 2
  while (getAccountBySlug(slug)) {
    const suffix = String(i++)
    slug = `${preferred.slice(0, Math.max(1, 32 - suffix.length - 1))}-${suffix}`
  }
  return slug
}

export function userDataDir(slug) {
  return path.join(USERS_DATA_DIR, slug)
}

export function userUploadsDir(slug) {
  return path.join(USERS_UPLOADS_DIR, slug)
}

export function createAccount({ username, password, slug }) {
  const cleanUser = String(username ?? '').trim()
  if (!cleanUser) throw new Error('Username không được trống')
  if (!password || String(password).length < 4) {
    throw new Error('Password phải có ít nhất 4 ký tự')
  }
  if (getAccountByUsername(cleanUser)) {
    throw new Error('Username đã tồn tại')
  }

  const preferred = slug ? String(slug).trim().toLowerCase() : slugifyUsername(cleanUser)
  if (!isValidSlug(preferred)) {
    throw new Error('Slug không hợp lệ (a-z, 0-9, dấu gạch ngang)')
  }
  const finalSlug = ensureUniqueSlug(preferred)
  const { hash, salt } = hashPassword(password)

  const dataDir = userDataDir(finalSlug)
  const uploadsDir = userUploadsDir(finalSlug)
  fs.mkdirSync(dataDir, { recursive: true })
  fs.mkdirSync(uploadsDir, { recursive: true })

  const result = accountsDb
    .prepare(
      `INSERT INTO accounts (username, slug, password_hash, password_salt)
       VALUES (?, ?, ?, ?)`,
    )
    .run(cleanUser, finalSlug, hash, salt)

  return getAccountById(Number(result.lastInsertRowid))
}

export function updateAccount(id, { username, password, active } = {}) {
  const existing = accountsDb.prepare('SELECT * FROM accounts WHERE id = ?').get(id)
  if (!existing) return null

  let nextUsername = existing.username
  if (username !== undefined) {
    const cleanUser = String(username).trim()
    if (!cleanUser) throw new Error('Username không được trống')
    const conflict = getAccountByUsername(cleanUser)
    if (conflict && conflict.id !== id) throw new Error('Username đã tồn tại')
    nextUsername = cleanUser
  }

  let hash = existing.password_hash
  let salt = existing.password_salt
  if (password !== undefined && password !== '') {
    if (String(password).length < 4) throw new Error('Password phải có ít nhất 4 ký tự')
    ;({ hash, salt } = hashPassword(password))
  }

  const nextActive = active === undefined ? existing.active : active ? 1 : 0

  accountsDb
    .prepare(
      `UPDATE accounts SET
        username = ?, password_hash = ?, password_salt = ?, active = ?,
        updated_at = datetime('now')
       WHERE id = ?`,
    )
    .run(nextUsername, hash, salt, nextActive, id)

  return getAccountById(id)
}

export function deleteAccount(id) {
  const account = getAccountById(id)
  if (!account) return false

  accountsDb.prepare('DELETE FROM accounts WHERE id = ?').run(id)

  try {
    const dataDir = userDataDir(account.slug)
    const uploadsDir = userUploadsDir(account.slug)
    const stamp = Date.now()
    if (fs.existsSync(dataDir)) {
      fs.renameSync(dataDir, `${dataDir}.deleted-${stamp}`)
    }
    if (fs.existsSync(uploadsDir)) {
      fs.renameSync(uploadsDir, `${uploadsDir}.deleted-${stamp}`)
    }
  } catch (err) {
    console.warn('Không đổi tên thư mục account đã xóa:', err.message)
  }

  return true
}

/**
 * @param {(slug: string) => void} ensureStore - open journal store after moving files
 */
export function migrateLegacyJournal(ensureStore) {
  const migrated = accountsDb
    .prepare("SELECT value FROM settings WHERE key = 'legacy_migrated'")
    .get()
  if (migrated) return

  const legacyDb = path.join(DATA_DIR, 'journal.db')
  if (!fs.existsSync(legacyDb)) {
    accountsDb
      .prepare(
        `INSERT INTO settings (key, value) VALUES ('legacy_migrated', '1')
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      )
      .run()
    return
  }

  if (!getAccountBySlug('main')) {
    const username = process.env.MIGRATE_ACCOUNT_USERNAME || 'main'
    const password = process.env.MIGRATE_ACCOUNT_PASSWORD || 'main'
    const { hash, salt } = hashPassword(password)

    const dataDir = userDataDir('main')
    const uploadsDir = userUploadsDir('main')
    fs.mkdirSync(dataDir, { recursive: true })
    fs.mkdirSync(uploadsDir, { recursive: true })

    const targetDb = path.join(dataDir, 'journal.db')
    if (!fs.existsSync(targetDb)) {
      fs.renameSync(legacyDb, targetDb)
    }

    for (const name of fs.readdirSync(UPLOADS_ROOT)) {
      if (name === 'users' || name === '.gitkeep') continue
      const from = path.join(UPLOADS_ROOT, name)
      const to = path.join(uploadsDir, name)
      if (!fs.existsSync(to)) {
        fs.renameSync(from, to)
      }
    }

    if (!getAccountByUsername(username)) {
      accountsDb
        .prepare(
          `INSERT INTO accounts (username, slug, password_hash, password_salt)
           VALUES (?, 'main', ?, ?)`,
        )
        .run(username, hash, salt)
      console.log(
        `[migrate] Journal cũ → account "${username}" / slug "main" (password: MIGRATE_ACCOUNT_PASSWORD hoặc "main")`,
      )
    }

    ensureStore?.('main')
  }

  accountsDb
    .prepare(
      `INSERT INTO settings (key, value) VALUES ('legacy_migrated', '1')
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .run()
}
