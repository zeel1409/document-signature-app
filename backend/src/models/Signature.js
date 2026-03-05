const mongoose = require('mongoose')

const SignatureSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    signerName: { type: String, default: null },
    signerEmail: { type: String, default: null, lowercase: true, trim: true },
    page: { type: Number, required: true },
    xPct: { type: Number, required: true },
    yPct: { type: Number, required: true },
    widthPct: { type: Number, required: true },
    heightPct: { type: Number, required: true },
    imagePath: { type: String, required: true },
    status: { type: String, enum: ['pending', 'signed', 'rejected'], default: 'pending', index: true },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Signature', SignatureSchema)

