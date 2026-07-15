'use client'

import { useEffect, useState } from 'react'
import { X, Download, Share } from 'lucide-react'

type Platform = 'android' | 'ios' | null

export default function InstallPrompt() {
  const [platform, setPlatform] = useState<Platform>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt: () => Promise<void> } | null>(null)
  const [dismissed, setDismissed] = useState(true) // start hidden; show after checks

  useEffect(() => {
    // Don't show if already installed (running in standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return
    // Don't show if user already dismissed
    if (localStorage.getItem('pwa-install-dismissed')) return

    const ua = navigator.userAgent
    const isIos = /iphone|ipad|ipod/i.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream
    const isAndroid = /android/i.test(ua)

    if (isIos) {
      setPlatform('ios')
      setDismissed(false)
      return
    }

    // Android / Chrome Desktop — wait for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as Event & { prompt: () => Promise<void> })
      setPlatform('android')
      setDismissed(false)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  function dismiss() {
    localStorage.setItem('pwa-install-dismissed', '1')
    setDismissed(true)
  }

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    setDismissed(true)
  }

  if (dismissed || !platform) return null

  return (
    <div className="fixed bottom-[72px] left-0 right-0 z-50 px-3">
      <div className="max-w-lg mx-auto bg-brand-900 text-white rounded-2xl shadow-xl p-4">
        <div className="flex items-start gap-3">
          {/* Church icon */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/MarThoma_logo.png" alt="" className="w-10 h-10 rounded-full shrink-0" />

          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">Install SGM Church App</p>
            <p className="text-xs text-brand-200 mt-0.5">
              {platform === 'android'
                ? 'Add to your home screen for quick access — works offline too.'
                : 'Add to your home screen for the best experience.'}
            </p>

            {platform === 'ios' && (
              <div className="mt-2 space-y-1">
                <p className="text-[11px] text-brand-200 flex items-center gap-1.5">
                  <Share size={12} className="shrink-0" />
                  Tap the <strong className="text-white">Share</strong> button in Safari
                </p>
                <p className="text-[11px] text-brand-200">
                  → Then tap <strong className="text-white">&ldquo;Add to Home Screen&rdquo;</strong>
                </p>
              </div>
            )}

            {platform === 'android' && (
              <button
                onClick={install}
                className="mt-3 flex items-center gap-2 bg-white text-brand-900 font-bold text-xs px-4 py-2 rounded-xl hover:bg-brand-50 transition-colors"
              >
                <Download size={14} /> Install App
              </button>
            )}
          </div>

          <button onClick={dismiss} className="shrink-0 text-brand-300 hover:text-white transition-colors mt-0.5">
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
