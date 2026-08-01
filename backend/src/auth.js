import crypto from 'crypto'
import {
  getAccountByUsername,
  verifyPassword,
} from './accounts.js'

function getRootUsername() {
  return process.env.AUTH_USERNAME ?? ''
}

function getRootPassword() {
  return process.env.AUTH_PASSWORD ?? ''
}

export function assertAuthConfig() {
  if (!getRootUsername() || !getRootPassword()) {
    throw new Error('Thiếu AUTH_USERNAME hoặc AUTH_PASSWORD trong file .env')
  }
}

/** @type {Map<string, { role: 'root'|'user', username: string, accountId?: number, slug?: string }>} */
const sessions = new Map()

export function createSession(payload) {
  const token = crypto.randomUUID()
  sessions.set(token, payload)
  return token
}

export function revokeToken(token) {
  if (token) sessions.delete(token)
}

export function getSession(token) {
  if (!token) return null
  return sessions.get(token) ?? null
}

export function getRequestToken(req) {
  const header = req.headers.authorization
  return header?.startsWith('Bearer ') ? header.slice(7) : null
}

export function getRequestSession(req) {
  return getSession(getRequestToken(req))
}

export function isRequestAuthenticated(req) {
  return Boolean(getRequestSession(req))
}

export function isRootCredentials(username, password) {
  return username === getRootUsername() && password === getRootPassword()
}

export function authenticate(username, password) {
  if (isRootCredentials(username, password)) {
    return {
      role: 'root',
      username: getRootUsername(),
    }
  }

  const account = getAccountByUsername(username)
  if (!account || !account.active) return null
  if (!verifyPassword(password, account.passwordHash, account.passwordSalt)) {
    return null
  }

  return {
    role: 'user',
    username: account.username,
    accountId: account.id,
    slug: account.slug,
  }
}

export function requireAuth(req, res, next) {
  const session = getRequestSession(req)
  if (!session) {
    return res.status(401).json({ error: 'Yêu cầu đăng nhập' })
  }
  req.session = session
  next()
}

export function requireRoot(req, res, next) {
  const session = getRequestSession(req)
  if (!session) {
    return res.status(401).json({ error: 'Yêu cầu đăng nhập' })
  }
  if (session.role !== 'root') {
    return res.status(403).json({ error: 'Chỉ root mới được phép' })
  }
  req.session = session
  next()
}

/** Cho phép chỉnh journal của slug nếu là owner hoặc root */
export function requireAccountWrite(req, res, next) {
  const session = getRequestSession(req)
  if (!session) {
    return res.status(401).json({ error: 'Yêu cầu đăng nhập' })
  }
  const slug = req.params.slug
  if (session.role === 'root') {
    req.session = session
    return next()
  }
  if (session.role === 'user' && session.slug === slug) {
    req.session = session
    return next()
  }
  return res.status(403).json({ error: 'Không có quyền chỉnh sửa journal này' })
}
