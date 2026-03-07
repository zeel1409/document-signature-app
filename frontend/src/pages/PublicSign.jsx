import { Document, Page } from 'react-pdf'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '../components/Button.jsx'
import { SignaturePad } from '../components/SignaturePad.jsx'
import { TextField } from '../components/TextField.jsx'
import { api } from '../lib/api.js'

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

export function PublicSign() {
  const { token } = useParams()
  const [docMeta, setDocMeta] = useState(null)
  const [numPages, setNumPages] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [signatureDataUrl, setSignatureDataUrl] = useState(null)
  const [placement, setPlacement] = useState(null)
  const [signerName, setSignerName] = useState('')
  const [signerEmail, setSignerEmail] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const pageWrapRef = useRef(null)
  const dragRef = useRef({ active: false, startX: 0, startY: 0, baseXPct: 0, baseYPct: 0 })

  const pdfFile = useMemo(() => {
    return { url: `${api.defaults.baseURL}/api/public/docs/${token}/file` }
  }, [token])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      setInfo('')
      try {
        const res = await api.get(`/api/public/docs/${token}`)
        setDocMeta(res.data.doc)
      } catch (err) {
        setError(err?.response?.data?.error || 'Invalid or expired signing link')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

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
    setPlacement({ page, xPct, yPct, widthPct, heightPct, imageDataUrl: signatureDataUrl })
  }

  function onDown(e) {
    if (!placement) return
    e.preventDefault()
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      baseXPct: placement.xPct,
      baseYPct: placement.yPct,
    }
  }

  useEffect(() => {
    function onMove(e) {
      if (!dragRef.current.active || !placement) return
      const wrap = pageWrapRef.current
      if (!wrap) return
      const rect = wrap.getBoundingClientRect()
      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY
      setPlacement((p) => {
        if (!p) return p
        const xPct = dragRef.current.baseXPct + dx / rect.width
        const yPct = dragRef.current.baseYPct + dy / rect.height
        return {
          ...p,
          xPct: clamp(xPct, 0, 1 - p.widthPct),
          yPct: clamp(yPct, 0, 1 - p.heightPct),
        }
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
  }, [placement])

  async function signNow() {
    setError('')
    setInfo('')
    if (!signerName || !signerEmail) {
      setError('Enter your name and email.')
      return
    }
    if (!placement) {
      setError('Place your signature on the document.')
      return
    }
    setSubmitting(true)
    try {
      const res = await api.post(`/api/public/docs/${token}/sign`, {
        signerName,
        signerEmail,
        page: placement.page,
        xPct: placement.xPct,
        yPct: placement.yPct,
        widthPct: placement.widthPct,
        heightPct: placement.heightPct,
        imageDataUrl: placement.imageDataUrl,
      })
      setInfo('Signed PDF generated. You can now download it.')
      const signedUrl = res.data.signedFileUrl
      if (signedUrl) window.open(`${api.defaults.baseURL}${signedUrl}`, '_blank', 'noreferrer')
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to sign')
    } finally {
      setSubmitting(false)
    }
  }

  async function rejectNow() {
    setError('')
    setInfo('')
    if (!signerName || !signerEmail) {
      setError('Enter your name and email.')
      return
    }
    if (!rejectReason) {
      setError('Add a rejection reason.')
      return
    }
    setSubmitting(true)
    try {
      await api.post(`/api/public/docs/${token}/reject`, { signerName, signerEmail, reason: rejectReason })
      setInfo('Document rejected successfully.')
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to reject')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="min-h-full bg-zinc-50 p-6 text-sm text-zinc-600 dark:bg-zinc-950 dark:text-zinc-200">Loading…</div>
  }

  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/60">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="text-sm font-bold">Public signing link</div>
          <div className="mt-1 text-xs text-zinc-500">{docMeta?.originalName || 'Document'}</div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
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
                <Document file={pdfFile} onLoadSuccess={(info) => setNumPages(info.numPages)}>
                  <Page pageNumber={page} renderTextLayer={false} renderAnnotationLayer={false} />
                </Document>

                {placement && Number(placement.page) === Number(page) ? (
                  <img
                    src={placement.imageDataUrl}
                    alt="signature"
                    className="absolute cursor-move select-none rounded-md border border-zinc-300 bg-white shadow-sm dark:border-zinc-700"
                    style={{
                      left: `${placement.xPct * 100}%`,
                      top: `${placement.yPct * 100}%`,
                      width: `${placement.widthPct * 100}%`,
                      height: `${placement.heightPct * 100}%`,
                    }}
                    onMouseDown={onDown}
                    draggable={false}
                  />
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="text-sm font-bold">Signer identity</div>
              <div className="mt-1 text-sm text-zinc-500">Used for the audit trail.</div>
              <div className="mt-4 space-y-3">
                <TextField label="Full name" value={signerName} onChange={(e) => setSignerName(e.target.value)} />
                <TextField label="Email" type="email" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} />
              </div>
            </div>

            <SignaturePad onChangeDataUrl={setSignatureDataUrl} />

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={placeSignature} disabled={!signatureDataUrl}>
                  Place signature
                </Button>
                <Button onClick={signNow} disabled={submitting}>
                  {submitting ? 'Signing…' : 'Sign & generate PDF'}
                </Button>
              </div>
              <div className="mt-3 text-xs text-zinc-500">
                Tip: place the signature on the correct page, then drag to align precisely.
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="text-sm font-bold">Reject document</div>
              <div className="mt-1 text-sm text-zinc-500">Optionally reject instead of signing.</div>
              <textarea
                className="mt-3 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-indigo-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                rows={3}
                placeholder="Reason for rejection…"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <div className="mt-3">
                <Button variant="danger" onClick={rejectNow} disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Reject'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

