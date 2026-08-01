import { Router } from 'express'
import { requireRoot } from '../auth.js'
import {
  createAccount,
  deleteAccount,
  getAccountById,
  listAccounts,
  updateAccount,
} from '../accounts.js'
import { dropJournalStore, openJournalStore } from '../db.js'

const router = Router()

router.use(requireRoot)

router.get('/accounts', (_req, res) => {
  res.json(listAccounts())
})

router.post('/accounts', (req, res) => {
  try {
    const account = createAccount({
      username: req.body.username,
      password: req.body.password,
      slug: req.body.slug,
    })
    openJournalStore(account.slug)
    res.status(201).json(account)
  } catch (err) {
    res.status(400).json({ error: err.message || 'Không tạo được account' })
  }
})

router.patch('/accounts/:id', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'ID không hợp lệ' })
  }
  try {
    const account = updateAccount(id, {
      username: req.body.username,
      password: req.body.password,
      active: req.body.active,
    })
    if (!account) return res.status(404).json({ error: 'Không tìm thấy account' })
    res.json(account)
  } catch (err) {
    res.status(400).json({ error: err.message || 'Không cập nhật được account' })
  }
})

router.delete('/accounts/:id', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'ID không hợp lệ' })
  }
  const existing = getAccountById(id)
  if (!existing) return res.status(404).json({ error: 'Không tìm thấy account' })
  dropJournalStore(existing.slug)
  if (!deleteAccount(id)) {
    return res.status(404).json({ error: 'Không tìm thấy account' })
  }
  res.status(204).end()
})

export default router
