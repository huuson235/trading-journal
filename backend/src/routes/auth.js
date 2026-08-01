import { Router } from 'express'
import {
  authenticate,
  createSession,
  getRequestToken,
  requireAuth,
  revokeToken,
} from '../auth.js'
import { listAccounts } from '../accounts.js'

const router = Router()

router.post('/login', (req, res) => {
  const { username, password } = req.body ?? {}
  const session = authenticate(username, password)
  if (!session) {
    return res.status(401).json({ error: 'Sai username hoặc password' })
  }
  const token = createSession(session)
  res.json({
    token,
    username: session.username,
    role: session.role,
    slug: session.slug ?? null,
  })
})

router.post('/logout', (req, res) => {
  revokeToken(getRequestToken(req))
  res.status(204).end()
})

router.get('/me', requireAuth, (req, res) => {
  const session = req.session
  res.json({
    username: session.username,
    role: session.role,
    slug: session.slug ?? null,
  })
})

/** Danh sách account public (để chọn journal xem) */
router.get('/accounts', (_req, res) => {
  const accounts = listAccounts({ activeOnly: true }).map((a) => ({
    username: a.username,
    slug: a.slug,
  }))
  res.json(accounts)
})

export default router
