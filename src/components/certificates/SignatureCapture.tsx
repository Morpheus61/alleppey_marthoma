'use client'

import { useRef, useState, useEffect } from 'react'
import { Pen, Upload, RotateCcw } from 'lucide-react'

interface Props {
  label: string
  onCapture: (dataUrl: string, type: 'drawn' | 'uploaded') => void
  existingUrl?: string | null
}

export default function SignatureCapture({ label, onCapture, existingUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Dynamically imported SignaturePad instance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const padRef = useRef<any>(null)
  const [mode, setMode] = useState<'draw' | 'upload'>('draw')
  const [captured, setCaptured] = useState<string | null>(existingUrl ?? null)

  useEffect(() => {
    if (mode !== 'draw' || !canvasRef.current) return
    let cancelled = false
    import('signature_pad').then(mod => {
      if (cancelled || !canvasRef.current) return
      const SP = mod.default
      padRef.current = new SP(canvasRef.current, {
        penColor: '#1a1a1a',
        backgroundColor: 'rgba(0,0,0,0)',
      })
    })
    return () => {
      cancelled = true
      padRef.current?.off()
      padRef.current = null
    }
  }, [mode])

  const handleSave = () => {
    if (!padRef.current || padRef.current.isEmpty()) return
    const dataUrl = padRef.current.toDataURL('image/png')
    setCaptured(dataUrl)
    onCapture(dataUrl, 'drawn')
  }

  const handleClear = () => {
    padRef.current?.clear()
    setCaptured(null)
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setCaptured(dataUrl)
      onCapture(dataUrl, 'uploaded')
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">{label}</p>

      {captured ? (
        <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={captured} alt="Signature" className="h-16 object-contain border border-gray-100 rounded-lg bg-gray-50 w-full" />
          <button
            onClick={() => { setCaptured(null); padRef.current?.clear() }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw size={12} /> Redo
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode('draw')}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                mode === 'draw'
                  ? 'bg-brand-900 text-white border-brand-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Pen size={12} /> Draw
            </button>
            <button
              onClick={() => setMode('upload')}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                mode === 'upload'
                  ? 'bg-brand-900 text-white border-brand-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Upload size={12} /> Upload image
            </button>
          </div>

          {mode === 'draw' && (
            <div className="space-y-2">
              <canvas
                ref={canvasRef}
                width={400}
                height={100}
                className="w-full border border-dashed border-gray-200 rounded-lg bg-gray-50 touch-none"
                style={{ height: 100 }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleClear}
                  className="text-xs text-muted-foreground hover:text-foreground border border-gray-200 rounded-lg px-3 py-1.5"
                >
                  Clear
                </button>
                <button
                  onClick={handleSave}
                  className="text-xs bg-brand-900 text-white rounded-lg px-3 py-1.5 hover:bg-brand-800"
                >
                  Save signature
                </button>
              </div>
            </div>
          )}

          {mode === 'upload' && (
            <div className="space-y-1">
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleUpload}
                className="text-xs w-full"
              />
              <p className="text-[11px] text-muted-foreground">PNG or JPG on white background</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
