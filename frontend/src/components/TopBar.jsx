import { Link, useNavigate } from 'react-router-dom'
import { Button } from './Button.jsx'
import { clearToken } from '../lib/auth.js'

export function TopBar({ title = 'Document Signature App' }) {
  const nav = useNavigate()

  return (
    <div className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          {title}
        </Link>
        <Button
          variant="secondary"
          onClick={() => {
            clearToken()
            nav('/login')
          }}
        >
          Log out
        </Button>
      </div>
    </div>
  )
}

