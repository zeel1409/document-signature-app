import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button.jsx'
import { TextField } from '../components/TextField.jsx'
import { api } from '../lib/api.js'
import { setToken } from '../lib/auth.js'

export function Register() {
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/api/auth/register', { name, email, password })
      setToken(res.data.token)
      nav('/')
    } catch (err) {
      setError(err?.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-12">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-6">
            <div className="text-lg font-bold">Create account</div>
            <div className="mt-1 text-sm text-zinc-500">Upload PDFs, share links, and collect signatures.</div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <TextField
              label="Password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            {error ? <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? 'Creating…' : 'Create account'}
            </Button>
          </form>

          <div className="mt-6 text-sm text-zinc-600 dark:text-zinc-300">
            Already have an account?{' '}
            <Link className="font-semibold text-indigo-600 hover:underline" to="/login">
              Sign in
            </Link>
            .
          </div>
        </div>
      </div>
    </div>
  )
}

