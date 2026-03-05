const express = require('express')
const fs = require('fs')
const path = require('path')
const { z } = require('zod')
const { PDFDocument } = require('pdf-lib')
const { nanoid } = require('nanoid')
const Document = require('../models/Document')
const Signature = require('../models/Signature')
const { ensureStorage } = require('../utils/storage')
const { writeAudit } = require('../middleware/audit')

const router = express.Router()
const { sigs, signed } = ensureStorage()

function decodePngDataUrl(dataUrl) {
  const m = /^data:image\/png;base64,(.+)$/.exec(dataUrl || '')
  if (!m) throw new Error('Signature must be a PNG data URL')
  return Buffer.from(m[1], 'base64')
}

async function getDocByToken(token) {
  const doc = await Document.findOne({ sharedToken: token })
  if (!doc) return null
  if (doc.sharedTokenExpiresAt && doc.sharedTokenExpiresAt.getTime() < Date.now()) return null
  return doc
}

router.get('/docs/:token', async (req, res) => {
  const doc = await getDocByToken(req.params.token)
  if (!doc) return res.status(404).json({ error: 'Invalid or expired signing link' })
  return res.json({ doc: { _id: doc._id, originalName: doc.originalName, status: doc.status } })
})

router.get('/docs/:token/file', async (req, res) => {
  const doc = await getDocByToken(req.params.token)
  if (!doc) return res.status(404).json({ error: 'Invalid or expired signing link' })
  if (!doc.uploadPath || !fs.existsSync(doc.uploadPath)) return res.status(404).json({ error: 'File missing on server' })
  return res.sendFile(path.resolve(doc.uploadPath))
})

router.get('/docs/:token/signed', async (req, res) => {
  const doc = await getDocByToken(req.params.token)
  if (!doc) return res.status(404).json({ error: 'Invalid or expired signing link' })
  if (!doc.signedPath || !fs.existsSync(doc.signedPath)) return res.status(404).json({ error: 'Signed file not found' })
  return res.sendFile(path.resolve(doc.signedPath))
})

router.post('/docs/:token/sign', async (req, res) => {
  const doc = await getDocByToken(req.params.token)
  if (!doc) return res.status(404).json({ error: 'Invalid or expired signing link' })

  const schema = z.object({
    signerName: z.string().min(1),
    signerEmail: z.string().email(),
    page: z.number().int().min(1),
    xPct: z.number().min(0).max(1),
    yPct: z.number().min(0).max(1),
    widthPct: z.number().min(0.01).max(1),
    heightPct: z.number().min(0.01).max(1),
    imageDataUrl: z.string().min(10),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' })

  let buf
  try {
    buf = decodePngDataUrl(parsed.data.imageDataUrl)
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }

  const filename = `${doc._id}_${nanoid(10)}.png`
  const imagePath = path.join(sigs, filename)
  fs.writeFileSync(imagePath, buf)

  const sig = await Signature.create({
    documentId: doc._id,
    signerName: parsed.data.signerName,
    signerEmail: parsed.data.signerEmail,
    page: parsed.data.page,
    xPct: parsed.data.xPct,
    yPct: parsed.data.yPct,
    widthPct: parsed.data.widthPct,
    heightPct: parsed.data.heightPct,
    imagePath,
    status: 'pending',
  })

  await writeAudit({
    req,
    documentId: doc._id,
    action: 'PUBLIC_SIGNATURE_PLACED',
    actorEmail: parsed.data.signerEmail,
    meta: { signerName: parsed.data.signerName, page: parsed.data.page },
  })

  if (!doc.uploadPath || !fs.existsSync(doc.uploadPath)) return res.status(404).json({ error: 'Original file missing on server' })

  const pdfBytes = fs.readFileSync(doc.uploadPath)
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const pageObj = pdfDoc.getPage(sig.page - 1)
  if (!pageObj) return res.status(400).json({ error: 'Invalid page number' })

  const pageWidth = pageObj.getWidth()
  const pageHeight = pageObj.getHeight()
  const png = await pdfDoc.embedPng(buf)

  const drawWidth = sig.widthPct * pageWidth
  const drawHeight = sig.heightPct * pageHeight
  const x = sig.xPct * pageWidth
  const y = pageHeight - sig.yPct * pageHeight - drawHeight
  pageObj.drawImage(png, { x, y, width: drawWidth, height: drawHeight })

  const outBytes = await pdfDoc.save()
  const outPath = path.join(signed, `${doc._id}_signed.pdf`)
  fs.writeFileSync(outPath, outBytes)

  doc.signedPath = outPath
  doc.status = 'signed'
  await doc.save()
  sig.status = 'signed'
  await sig.save()

  await writeAudit({ req, documentId: doc._id, action: 'PUBLIC_DOC_SIGNED_FINALIZED', actorEmail: parsed.data.signerEmail })

  return res.json({ signedFileUrl: `/api/public/docs/${req.params.token}/signed` })
})

router.post('/docs/:token/reject', async (req, res) => {
  const doc = await getDocByToken(req.params.token)
  if (!doc) return res.status(404).json({ error: 'Invalid or expired signing link' })
  if (doc.status === 'signed') return res.status(400).json({ error: 'Document already signed' })

  const schema = z.object({
    signerName: z.string().min(1),
    signerEmail: z.string().email(),
    reason: z.string().min(1).max(500),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' })

  doc.status = 'rejected'
  await doc.save()

  await writeAudit({
    req,
    documentId: doc._id,
    action: 'PUBLIC_DOC_REJECTED',
    actorEmail: parsed.data.signerEmail,
    meta: { signerName: parsed.data.signerName, reason: parsed.data.reason },
  })

  return res.json({ ok: true })
})

module.exports = router

