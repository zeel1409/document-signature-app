require('dotenv').config()

const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const { connectDb } = require('./db')
const { ensureStorage } = require('./utils/storage')

const authRoutes = require('./routes/auth')
const docsRoutes = require('./routes/docs')
const signaturesRoutes = require('./routes/signatures')
const auditRoutes = require('./routes/audit')
const publicRoutes = require('./routes/public')

async function main() {
  ensureStorage()
  await connectDb()

  const app = express()
  app.set('trust proxy', true)

  const allowedOrigins = [
    'http://localhost:5173',
    'https://fanciful-cupcake-11cd4a.netlify.app',
    'https://document-signature-app-frontend-eosin.vercel.app'
  ]

  if (process.env.CORS_ORIGIN) {
    const envOrigins = process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    envOrigins.forEach((o) => {
      if (!allowedOrigins.includes(o)) allowedOrigins.push(o)
    })
  }

  app.use(
    cors({
      origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true)
        } else {
          callback(new Error('Not allowed by CORS'))
        }
      },
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  )
  app.use(morgan('dev'))
  app.use(express.json({ limit: '12mb' }))

  app.get('/health', (req, res) => res.json({ ok: true }))

  app.use('/api/auth', authRoutes)
  app.use('/api/docs', docsRoutes)
  app.use('/api/signatures', signaturesRoutes)
  app.use('/api/audit', auditRoutes)
  app.use('/api/public', publicRoutes)

  app.use((err, req, res, next) => {
    const msg = err?.message || 'Server error'
    const code = msg.includes('Only PDF') ? 400 : 500
    res.status(code).json({ error: msg })
  })

  const port = Number(process.env.PORT || 5174)
  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`)
  })
}

main().catch((e) => {
  console.error('Fatal startup error:', e.message)
  process.exit(1)
})

