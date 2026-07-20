'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toggleAmen } from '@/lib/pulpit/queries'

interface Props {
  messageId: string
  initialCount: number
  initialAmened: boolean
  /** Pass false for public/guest pages so unauthenticated taps redirect to login */
  isAuthenticated?: boolean
}

export default function AmenButton({
  messageId,
  initialCount,
  initialAmened,
  isAuthenticated = true,
}: Props) {
  const [amened,  setAmened]  = useState(initialAmened)
  const [count,   setCount]   = useState(initialCount)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleToggle() {
    if (!isAuthenticated) {
      router.push(`/auth/login?next=/pulpit/${messageId}`)
      return
    }
    if (loading) return
    setLoading(true)
    const wasAmened = amened
    setAmened(!wasAmened)
    setCount(c => wasAmened ? c - 1 : c + 1)
    try {
      await toggleAmen(messageId, wasAmened)
    } catch {
      setAmened(wasAmened)
      setCount(count)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      aria-pressed={amened}
      title={isAuthenticated ? undefined : 'Sign in to say Amen'}
      className={[
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-all min-h-[36px]',
        amened
          ? 'bg-amber-50 border-amber-400 text-amber-800'
          : 'bg-white border-gray-200 text-gray-500 hover:border-amber-300',
      ].join(' ')}
    >
      <span className="text-base leading-none">🙏</span>
      <span className="font-semibold text-xs">Amen</span>
      {count > 0 && (
        <span className="text-xs font-bold ml-0.5 tabular-nums">{count}</span>
      )}
    </button>
  )
}
