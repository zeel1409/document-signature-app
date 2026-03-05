const express = require('express')
const fs = require('fs')
const path = require('path')
const { z } = require('zod')
const { PDFDocument } = require('pdf-lib')
const { nanoid } = require('nanoid')
const { requireAuth } = require('../middleware/auth')
const { ensureStorage } = require('../utils/storage')
const Document = require('../models/Document')
const Signature = require('../models/Signature')
const { writeAudit } = require('../middleware/audit')

const router = express.Router()
const { sigs, signed } = ensureStorage()

function publicSig(sig) {
  const o = sig.toObject()
  delete o.imagePath
  return o
}

function decodePngDataUrl(dataUrl) {
  const m = /^data:image\/png;base64,(.+)$/.exec(dataUrl || '')
  if (!m) throw new Error('Signature must be a PNG data URL')
  return Buffer.from(m[1], 'base64')
}

router.post('/', requireAuth, async (req, res) => {
  const schema = z.object({
    documentId: z.string().min(1),
    page: z.number().int().min(1),
    xPct: z.number().min(0).max(1),
    yPct: z.number().min(0).max(1),
    widthPct: z.number().min(0.01).max(1),
    heightPct: z.number().min(0.01).max(1),
    imageDataUrl: z.string().min(10),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' })

  const { documentId, page, xPct, yPct, widthPct, heightPct, imageDataUrl } = parsed.data
  const doc = await Document.findOne({ _id: documentId, ownerId: req.user.userId })
  if (!doc) return res.status(404).json({ error: 'Document not found' })

  let buf
  try {
    buf = decodePngDataUrl(imageDataUrl)
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }

  const filename = `${documentId}_${nanoid(10)}.png`
  const imagePath = path.join(sigs, filename)
  fs.writeFileSync(imagePath, buf)

  const sig = await Signature.create({
    documentId,
    userId: req.user.userId,
    page,
    xPct,
    yPct,
    widthPct,
    heightPct,
    imagePath,
    status: 'pending',
  })

  await writeAudit({ req, documentId, action: 'SIGNATURE_PLACED', actorUserId: req.user.userId, meta: { page } })

  return res.json({
    signature: {
      ...publicSig(sig),
      imageUrl: `/api/signatures/image/${sig._id}`,
    },
  })
})

router.get('/image/:sigId', async (req, res) => {
  const sig = await Signature.findById(req.params.sigId)
  if (!sig || !sig.imagePath || !fs.existsSync(sig.imagePath)) return res.status(404).end()
  res.setHeader('Content-Type', 'image/png')
  return res.sendFile(path.resolve(sig.imagePath))
})

router.get('/:docId', requireAuth, async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.docId, ownerId: req.user.userId })
  if (!doc) return res.status(404).json({ error: 'Document not found' })
  const sigs = await Signature.find({ documentId: doc._id }).sort({ createdAt: 1 })
  return res.json({
    signatures: sigs.map((s) => ({
      ...publicSig(s),
      imageUrl: `/api/signatures/image/${s._id}`,
    })),
  })
})

router.post('/finalize', requireAuth, async (req, res) => {
  const schema = z.object({ documentId: z.string().min(1) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' })
  const { documentId } = parsed.data

  const doc = await Document.findOne({ _id: documentId, ownerId: req.user.userId })
  if (!doc) return res.status(404).json({ error: 'Document not found' })

  const signatures = await Signature.find({ documentId: doc._id })
  if (signatures.length === 0) return res.status(400).json({ error: 'No signatures to embed' })
  if (!doc.uploadPath || !fs.existsSync(doc.uploadPath)) return res.status(404).json({ error: 'Original file missing on server' })

  const pdfBytes = fs.readFileSync(doc.uploadPath)
  const pdfDoc = await PDFDocument.load(pdfBytes)

  for (const sig of signatures) {
    const pageIndex = sig.page - 1
    const pageObj = pdfDoc.getPage(pageIndex)
    if (!pageObj) continue

    const pageWidth = pageObj.getWidth()
    const pageHeight = pageObj.getHeight()

    if (!sig.imagePath || !fs.existsSync(sig.imagePath)) continue
    const pngBytes = fs.readFileSync(sig.imagePath)
    const png = await pdfDoc.embedPng(pngBytes)

    const drawWidth = sig.widthPct * pageWidth
    const drawHeight = sig.heightPct * pageHeight
    const x = sig.xPct * pageWidth
    const y = pageHeight - sig.yPct * pageHeight - drawHeight

    pageObj.drawImage(png, { x, y, width: drawWidth, height: drawHeight })
  }

  const outBytes = await pdfDoc.save()
  const outPath = path.join(signed, `${doc._id}_signed.pdf`)
  fs.writeFileSync(outPath, outBytes)

  doc.signedPath = outPath
  doc.status = 'signed'
  await doc.save()
  await Signature.updateMany({ documentId: doc._id }, { $set: { status: 'signed' } })

  await writeAudit({ req, documentId: doc._id, action: 'DOC_FINALIZED_SIGNED_PDF', actorUserId: req.user.userId })

  return res.json({ signedFileUrl: `/api/docs/${doc._id}/signed` })
})

module.exports = router

