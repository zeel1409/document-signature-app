const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { z } = require('zod')
const User = require('../models/User')

const router = express.Router()

function signToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' },
  )
}

router.post('/register', async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' })

  const { name, email, password } = parsed.data
  const existing = await User.findOne({ email })
  if (existing) return res.status(409).json({ error: 'Email already registered' })

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await User.create({ name, email, passwordHash })
  return res.json({ token: signToken(user) })
})

router.post('/login', async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' })

  const { email, password } = parsed.data
  const user = await User.findOne({ email })
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
  return res.json({ token: signToken(user) })
})

module.exports = router

