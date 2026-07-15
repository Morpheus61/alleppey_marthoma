'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'

/**
 * Full-page branded loading screen. Use in route-segment loading.tsx files.
 * Renders the church shield with a gold pulse animation.
 * No rotation, no bounce. Reduced-motion safe.
 */
export function ShieldLoader() {
  const t = useTranslations('common')
  const label = t('loading')

  return (
    <div
      role="status"
      aria-label={label}
      className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-[#f9f0e3]"
    >
      <div className="shield-pulse">
        <Image
          src="/brand/shield-loader.png"
          alt=""
          aria-hidden="true"
          width={120}
          height={120}
          priority
          unoptimized
        />
      </div>
      <p className="text-sm text-amber-700/60 tracking-wide font-medium">{label}</p>
    </div>
  )
}

/**
 * Inline cross spinner for async button states.
 * Uses currentColor — white when inside a bg-brand-900 button, brand-900 otherwise.
 * Default size: 20. For buttons: size={16}.
 */
export function CrossSpinner({
  size = 20,
  className,
}: {
  size?: number
  className?: string
}) {
  const t = useTranslations('common')

  return (
    <span
      role="status"
      aria-label={t('loading')}
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
    >
      {/* Latin cross: vertical bar + horizontal bar, both rounded */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
        className="cross-pulse"
      >
        {/* Vertical bar — centred horizontally, full height */}
        <rect x="8.5" y="1" width="3" height="18" rx="1.5" />
        {/* Horizontal bar — full width, upper third */}
        <rect x="1" y="6.5" width="18" height="3" rx="1.5" />
      </svg>
    </span>
  )
}
