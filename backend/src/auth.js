import crypto from 'crypto'

function getAuthUsername() {
  return process.env.AUTH_USERNAME ?? ''
}

function getAuthPassword() {
  return process.env.AUTH_PASSWORD ?? ''
}

export function assertAuthConfig() {
  if (!getAuthUsername() || !getAuthPassword()) {
    throw new Error('Thiếu AUTH_USERNAME hoặc AUTH_PASSWORD trong file .env')
  }
}

const tokens = new Set()

export function createToken() {
  const token = crypto.randomUUID()
  tokens.add(token)
  return token
}

export function revokeToken(token) {
  if (token) tokens.delete(token)
}

export function isValidToken(token) {
  return Boolean(token && tokens.has(token))
}

export function validateCredentials(username, password) {
  return username === getAuthUsername() && password === getAuthPassword()
}

export function getAuthenticatedUsername() {
  return getAuthUsername()
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!isValidToken(token)) {
    return res.status(401).json({ error: 'Yêu cầu đăng nhập' })
  }
  next()
}
