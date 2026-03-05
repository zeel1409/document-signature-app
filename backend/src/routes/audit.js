const express = require('express')
const { requireAuth } = require('../middleware/auth')
const Document = require('../models/Document')
const AuditLog = require('../models/AuditLog')

const router = express.Router()

router.get('/:docId', requireAuth, async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.docId, ownerId: req.user.userId })
  if (!doc) return res.status(404).json({ error: 'Document not found' })
  const logs = await AuditLog.find({ documentId: doc._id }).sort({ createdAt: -1 }).limit(100)
  return res.json({ logs })
})

module.exports = router

