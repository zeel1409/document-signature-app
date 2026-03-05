const mongoose = require('mongoose')

async function connectDb() {
  const uri = process.env.MONGO_URI
  if (!uri) {
    throw new Error('Missing MONGO_URI in backend/.env')
  }
  mongoose.set('strictQuery', true)
  await mongoose.connect(uri, { autoIndex: true })
}

module.exports = { connectDb }

