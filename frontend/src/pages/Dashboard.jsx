import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/Button.jsx'
import { TopBar } from '../components/TopBar.jsx'
import { api } from '../lib/api.js'

function StatusPill({ status }) {
  const label = status || 'pending'
  const styles =
    label === 'signed'
      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
      : label === 'rejected'
        ? 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'
        : 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${styles}`}>{label.toUpperCase()}</span>
}

export function Dashboard() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const hasDocs = useMemo(() => docs.length > 0, [docs])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/api/docs')
      setDocs(res.data.docs || [])
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function onUpload(e) {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      await api.post('/api/docs/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setFile(null)
      await load()
    } catch (err) {
      setError(err?.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function onShare(docId) {
    setError('')
    try {
      const res = await api.post(`/api/docs/${docId}/share`)
      const url = res.data.url
      if (url && navigator.clipboard?.writeText) await navigator.clipboard.writeText(url)
      await load()
      alert(url ? `Public signing link copied:\n\n${url}` : 'Link created.')
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to create share link')
    }
  }

  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <TopBar />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <div className="w-full md:w-1/3">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="text-sm font-bold">Upload PDF</div>
              <div className="mt-1 text-sm text-zinc-500">Add a document to start collecting signatures.</div>

              <form onSubmit={onUpload} className="mt-4 space-y-3">
                <input
                  className="block w-full rounded-lg border border-zinc-300 bg-white p-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required
                />
                <Button className="w-full" type="submit" disabled={uploading}>
                  {uploading ? 'Uploading…' : 'Upload'}
                </Button>
              </form>
            </div>

            {error ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </div>
            ) : null}
          </div>

          <div className="w-full md:w-2/3">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold">Your documents</div>
                  <div className="mt-1 text-sm text-zinc-500">Pending → Signed → Rejected lifecycle.</div>
                </div>
                <Button variant="secondary" onClick={load} disabled={loading}>
                  Refresh
                </Button>
              </div>

              <div className="mt-4">
                {loading ? (
                  <div className="text-sm text-zinc-500">Loading…</div>
                ) : !hasDocs ? (
                  <div className="rounded-xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-500 dark:border-zinc-700">
                    No documents yet. Upload a PDF to get started.
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                    {docs.map((d) => (
                      <div key={d._id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{d.originalName}</div>
                          <div className="mt-1 flex items-center gap-2">
                            <StatusPill status={d.status} />
                            {d.sharedToken ? (
                              <span className="text-xs text-zinc-500">Public link enabled</span>
                            ) : (
                              <span className="text-xs text-zinc-500">Private</span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Link to={`/docs/${d._id}`}>
                            <Button variant="secondary">Open</Button>
                          </Link>
                          <Button variant="secondary" onClick={() => onShare(d._id)}>
                            Share link
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

