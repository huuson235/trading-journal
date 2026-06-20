import { Router } from 'express'
import {
  createToken,
  getAuthenticatedUsername,
  revokeToken,
  requireAuth,
  validateCredentials,
} from '../auth.js'

const router = Router()

router.post('/login', (req, res) => {
  const { username, password } = req.body ?? {}
  if (!validateCredentials(username, password)) {
    return res.status(401).json({ error: 'Sai username hoặc password' })
  }
  const token = createToken()
  res.json({ token, username: getAuthenticatedUsername() })
})

router.post('/logout', (req, res) => {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  revokeToken(token)
  res.status(204).end()
})

router.get('/me', requireAuth, (_req, res) => {
  res.json({ username: getAuthenticatedUsername() })
})

export default router
