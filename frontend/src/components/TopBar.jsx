import { Link, useNavigate } from 'react-router-dom'
import { Button } from './Button.jsx'
import { clearToken, getCurrentUser } from '../lib/auth.js'

export function TopBar({ title = 'Document Signature App' }) {
  const nav = useNavigate()
  const user = getCurrentUser()

  return (
    <div className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          {title}
        </Link>
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex flex-col items-end text-xs leading-tight text-zinc-700 dark:text-zinc-300">
              <span className="font-semibold">{user.name || user.email}</span>
              {user.email ? <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{user.email}</span> : null}
            </div>
          ) : null}
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
    </div>
  )
}

