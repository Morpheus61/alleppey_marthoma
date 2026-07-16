'use client'

// Error boundary for the (app) layout group.
// Catches server component render errors and shows a recoverable UI.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f9f0e3] px-6">
      <div className="max-w-sm w-full bg-white rounded-2xl border border-amber-100 shadow-lg p-8 text-center space-y-4">
        <div className="text-4xl">⚠️</div>
        <h1 className="text-lg font-bold text-brand-900">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          A page failed to load. This is usually temporary.
        </p>
        {error.digest && (
          <p className="text-[11px] font-mono text-gray-400">
            Error ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="w-full rounded-xl bg-brand-900 text-white text-sm font-semibold py-3 hover:bg-brand-800 transition-colors"
        >
          Try Again
        </button>
        <a
          href="/"
          className="block text-xs text-brand-700 underline underline-offset-2"
        >
          Go to Home
        </a>
      </div>
    </div>
  )
}
