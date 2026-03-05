const mongoose = require('mongoose')

const AuditLogSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    actorEmail: { type: String, default: null, lowercase: true, trim: true },
    action: { type: String, required: true, index: true },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    meta: { type: Object, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

module.exports = mongoose.model('AuditLog', AuditLogSchema)

