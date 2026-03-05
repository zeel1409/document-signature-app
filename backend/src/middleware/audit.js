const AuditLog = require('../models/AuditLog')

async function writeAudit({ req, documentId, action, actorUserId = null, actorEmail = null, meta = {} }) {
  try {
    await AuditLog.create({
      documentId,
      actorUserId,
      actorEmail,
      action,
      ip: req.ip,
      userAgent: req.headers['user-agent'] || null,
      meta,
    })
  } catch {
    // best-effort audit trail: never block main request
  }
}

module.exports = { writeAudit }

