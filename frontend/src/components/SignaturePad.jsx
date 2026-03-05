import { useEffect, useRef, useState } from 'react'
import { Button } from './Button.jsx'

function getPos(e, canvas) {
  const rect = canvas.getBoundingClientRect()
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
  return { x: clientX - rect.left, y: clientY - rect.top }
}

export function SignaturePad({ onChangeDataUrl }) {
  const canvasRef = useRef(null)
  const drawingRef = useRef(false)
  const [hasInk, setHasInk] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = Math.round(rect.width * dpr)
    canvas.height = Math.round(rect.height * dpr)
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#111827'
  }, [])

  function emit() {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    onChangeDataUrl?.(dataUrl)
  }

  function onDown(e) {
    const canvas = canvasRef.current
    if (!canvas) return
    drawingRef.current = true
    const ctx = canvas.getContext('2d')
    const { x, y } = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(x, y)
    e.preventDefault?.()
  }

  function onMove(e) {
    const canvas = canvasRef.current
    if (!canvas || !drawingRef.current) return
    const ctx = canvas.getContext('2d')
    const { x, y } = getPos(e, canvas)
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasInk(true)
    e.preventDefault?.()
  }

  function onUp() {
    drawingRef.current = false
    if (hasInk) emit()
  }

  function clear() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasInk(false)
    onChangeDataUrl?.(null)
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
        Draw signature
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700">
        <canvas
          ref={canvasRef}
          className="h-28 w-full touch-none"
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={onUp}
          onTouchStart={onDown}
          onTouchMove={onMove}
          onTouchEnd={onUp}
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="text-xs text-zinc-500">{hasInk ? 'Signature ready' : 'Draw inside the box'}</div>
        <Button variant="secondary" type="button" onClick={clear}>
          Clear
        </Button>
      </div>
    </div>
  )
}

