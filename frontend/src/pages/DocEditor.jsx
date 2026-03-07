import { Document, Page } from 'react-pdf'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../components/Button.jsx'
import { TopBar } from '../components/TopBar.jsx'
import { SignaturePad } from '../components/SignaturePad.jsx'
import { api } from '../lib/api.js'
import { getToken } from '../lib/auth.js'

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

export function DocEditor() {
  const { docId } = useParams()
  const [doc, setDoc] = useState(null)
  const [numPages, setNumPages] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [signatureDataUrl, setSignatureDataUrl] = useState(null)
  const [placements, setPlacements] = useState([])
  const [saving, setSaving] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [audit, setAudit] = useState([])

  const pageWrapRef = useRef(null)
  const dragRef = useRef({ active: false, startX: 0, startY: 0, baseXPct: 0, baseYPct: 0, idx: -1 })

  const pdfFile = useMemo(() => {
    const token = getToken()
    return {
      url: `${api.defaults.baseURL}/api/docs/${docId}/file`,
      httpHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    }
  }, [docId])

  async function loadAll() {
    setLoading(true)
    setError('')
    setInfo('')
    try {
      const [d, sigs, aud] = await Promise.all([
        api.get(`/api/docs/${docId}`),
        api.get(`/api/signatures/${docId}`),
        api.get(`/api/audit/${docId}`),
      ])
      setDoc(d.data.doc)
      setPlacements(sigs.data.signatures || [])
      setAudit(aud.data.logs || [])
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load document')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId])

  function placeSignature() {
    setError('')
    setInfo('')
    if (!signatureDataUrl) {
      setError('Draw a signature first.')
      return
    }
    const wrap = pageWrapRef.current
    if (!wrap) return
    const rect = wrap.getBoundingClientRect()
    const wPx = 200
    const hPx = 80
    const widthPct = clamp(wPx / rect.width, 0.05, 0.8)
    const heightPct = clamp(hPx / rect.height, 0.03, 0.8)
    const xPct = 0.5 - widthPct / 2
    const yPct = 0.5 - heightPct / 2

    setPlacements((prev) => [
      ...prev,
      {
        _id: `local_${Date.now()}`,
        documentId: docId,
        page,
        xPct,
        yPct,
        widthPct,
        heightPct,
        imageDataUrl: signatureDataUrl,
        status: 'pending',
        _local: true,
      },
    ])
  }

  function onSigMouseDown(e, idx) {
    e.preventDefault()
    const p = placements[idx]
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      baseXPct: p.xPct,
      baseYPct: p.yPct,
      idx,
    }
  }

  useEffect(() => {
    function onMove(e) {
      if (!dragRef.current.active) return
      const wrap = pageWrapRef.current
      if (!wrap) return
      const rect = wrap.getBoundingClientRect()
      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY

      setPlacements((prev) => {
        const next = [...prev]
        const i = dragRef.current.idx
        const p = next[i]
        if (!p) return prev
        const xPct = dragRef.current.baseXPct + dx / rect.width
        const yPct = dragRef.current.baseYPct + dy / rect.height
        next[i] = {
          ...p,
          xPct: clamp(xPct, 0, 1 - p.widthPct),
          yPct: clamp(yPct, 0, 1 - p.heightPct),
        }
        return next
      })
    }

    function onUp() {
      dragRef.current.active = false
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  async function saveSignatures() {
    setSaving(true)
    setError('')
    setInfo('')
    try {
      const locals = placements.filter((p) => p._local)
      for (const p of locals) {
        await api.post('/api/signatures', {
          documentId: docId,
          page: p.page,
          xPct: p.xPct,
          yPct: p.yPct,
          widthPct: p.widthPct,
          heightPct: p.heightPct,
          imageDataUrl: p.imageDataUrl,
        })
      }
      await loadAll()
      if (locals.length > 0) {
        setInfo('Signature placements saved.')
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to save signatures')
    } finally {
      setSaving(false)
    }
  }

  async function finalize() {
    setFinalizing(true)
    setError('')
    setInfo('')
    try {
      await saveSignatures()
      await api.post('/api/signatures/finalize', { documentId: docId })
      await loadAll()
      setInfo('Signed PDF generated successfully.')
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to finalize')
    } finally {
      setFinalizing(false)
    }
  }

  const currentPageSigs = placements.filter((p) => Number(p.page) === Number(page))

  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <TopBar />

      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-bold">{doc?.originalName || 'Document'}</div>
            <div className="mt-1 text-xs text-zinc-500">Drag your signature onto the PDF and finalize to generate a signed copy.</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/">
              <Button variant="secondary">Back</Button>
            </Link>
            <Button variant="secondary" onClick={placeSignature} disabled={!signatureDataUrl}>
              Place signature
            </Button>
            <Button variant="secondary" onClick={saveSignatures} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button onClick={finalize} disabled={finalizing}>
              {finalizing ? 'Finalizing…' : 'Finalize PDF'}
            </Button>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        ) : null}
        {info ? (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
            {info}
          </div>
        ) : null}

        {loading ? (
          <div className="text-sm text-zinc-500">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
                    Page {page} / {numPages || '…'}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                      Prev
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setPage((p) => Math.min(numPages || p + 1, p + 1))}
                      disabled={numPages ? page >= numPages : true}
                    >
                      Next
                    </Button>
                  </div>
                </div>

                <div ref={pageWrapRef} className="relative mx-auto w-full overflow-auto rounded-xl bg-zinc-100 p-3 dark:bg-zinc-950">
                  <Document
                    file={pdfFile}
                    onLoadSuccess={(info) => setNumPages(info.numPages)}
                    loading={<div className="text-sm text-zinc-500">Loading PDF…</div>}
                    error={<div className="text-sm text-red-600">Failed to load PDF.</div>}
                  >
                    <Page pageNumber={page} renderTextLayer={false} renderAnnotationLayer={false} />
                  </Document>

                  {currentPageSigs.map((p) => {
                    const i = placements.findIndex((x) => x._id === p._id)
                    return (
                      <img
                        key={p._id}
                        src={p.imageDataUrl || (p.imageUrl ? `${api.defaults.baseURL}${p.imageUrl}` : '')}
                        alt="signature"
                        className="absolute cursor-move select-none rounded-md border border-zinc-300 bg-white shadow-sm dark:border-zinc-700"
                        style={{
                          left: `${p.xPct * 100}%`,
                          top: `${p.yPct * 100}%`,
                          width: `${p.widthPct * 100}%`,
                          height: `${p.heightPct * 100}%`,
                        }}
                        onMouseDown={(e) => onSigMouseDown(e, i)}
                        draggable={false}
                      />
                    )
                  })}
                </div>

                {doc?.signedFileUrl ? (
                  <div className="mt-4">
                    <a
                      className="text-sm font-semibold text-indigo-600 hover:underline"
                      href={`${api.defaults.baseURL}${doc.signedFileUrl}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Download signed PDF
                    </a>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-6">
              <SignaturePad onChangeDataUrl={setSignatureDataUrl} />

              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="text-sm font-bold">Audit trail</div>
                <div className="mt-1 text-sm text-zinc-500">Who did what, when, and from where.</div>
                <div className="mt-4 space-y-2">
                  {audit.length === 0 ? (
                    <div className="text-sm text-zinc-500">No events yet.</div>
                  ) : (
                    audit.slice(0, 12).map((l) => (
                      <div key={l._id} className="rounded-lg border border-zinc-200 p-3 text-xs dark:border-zinc-800">
                        <div className="font-semibold">{l.action}</div>
                        <div className="mt-1 text-zinc-500">
                          {new Date(l.createdAt).toLocaleString()} · {l.ip || '—'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

