const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { nanoid } = require('nanoid')
const { requireAuth } = require('../middleware/auth')
const { ensureStorage } = require('../utils/storage')
const Document = require('../models/Document')
const { writeAudit } = require('../middleware/audit')

const router = express.Router()
const { uploads } = ensureStorage()

function publicDoc(doc) {
  const o = doc.toObject()
  delete o.uploadPath
  delete o.signedPath
  return o
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploads),
    filename: (req, file, cb) => cb(null, `tmp_${nanoid(10)}.pdf`),
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') return cb(new Error('Only PDF files allowed'))
    cb(null, true)
  },
  limits: { fileSize: 20 * 1024 * 1024 },
})

router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Missing file' })
  const ownerId = req.user.userId

  const doc = await Document.create({
    ownerId,
    originalName: req.file.originalname,
    uploadPath: 'pending',
    status: 'pending',
  })

  const finalName = `${doc._id}.pdf`
  const finalPath = path.join(uploads, finalName)
  fs.renameSync(req.file.path, finalPath)
  doc.uploadPath = finalPath
  await doc.save()

  await writeAudit({ req, documentId: doc._id, action: 'DOC_UPLOADED', actorUserId: ownerId, meta: { name: doc.originalName } })

  return res.json({ doc: publicDoc(doc) })
})

router.get('/', requireAuth, async (req, res) => {
  const docs = await Document.find({ ownerId: req.user.userId }).sort({ createdAt: -1 })
  return res.json({ docs: docs.map(publicDoc) })
})

router.get('/:id', requireAuth, async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, ownerId: req.user.userId })
  if (!doc) return res.status(404).json({ error: 'Document not found' })
  const signedFileUrl = doc.signedPath ? `/api/docs/${doc._id}/signed` : null
  return res.json({ doc: { ...publicDoc(doc), signedFileUrl } })
})

router.get('/:id/file', requireAuth, async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, ownerId: req.user.userId })
  if (!doc) return res.status(404).json({ error: 'Document not found' })
  if (!doc.uploadPath || !fs.existsSync(doc.uploadPath)) return res.status(404).json({ error: 'File missing on server' })
  return res.sendFile(path.resolve(doc.uploadPath))
})

router.get('/:id/signed', requireAuth, async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, ownerId: req.user.userId })
  if (!doc) return res.status(404).json({ error: 'Document not found' })
  if (!doc.signedPath || !fs.existsSync(doc.signedPath)) return res.status(404).json({ error: 'Signed file not found' })
  return res.sendFile(path.resolve(doc.signedPath))
})

router.post('/:id/share', requireAuth, async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, ownerId: req.user.userId })
  if (!doc) return res.status(404).json({ error: 'Document not found' })

  const token = nanoid(24)
  doc.sharedToken = token
  doc.sharedTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await doc.save()

  await writeAudit({ req, documentId: doc._id, action: 'DOC_SHARED_LINK_CREATED', actorUserId: req.user.userId })

  const base = process.env.PUBLIC_SIGN_BASE_URL || 'http://localhost:5173'
  const url = `${base.replace(/\/$/, '')}/sign/${token}`
  return res.json({ token, url })
})

router.post('/:id/reject', requireAuth, async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, ownerId: req.user.userId })
  if (!doc) return res.status(404).json({ error: 'Document not found' })
  if (doc.status === 'signed') return res.status(400).json({ error: 'Cannot reject a signed document' })

  const reason = typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 500) : null
  doc.status = 'rejected'
  await doc.save()

  await writeAudit({ req, documentId: doc._id, action: 'DOC_REJECTED', actorUserId: req.user.userId, meta: { reason } })

  return res.json({ doc: publicDoc(doc) })
})

module.exports = router

