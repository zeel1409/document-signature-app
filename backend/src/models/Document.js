const mongoose = require('mongoose')

const DocumentSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    originalName: { type: String, required: true },
    uploadPath: { type: String, required: true },
    signedPath: { type: String, default: null },
    status: { type: String, enum: ['pending', 'signed', 'rejected'], default: 'pending', index: true },
    sharedToken: { type: String, default: null, index: true },
    sharedTokenExpiresAt: { type: Date, default: null },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Document', DocumentSchema)

