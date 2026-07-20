'use client'

interface Props {
  messageId: string
  title: string | null
  scriptureRef: string | null
}

export default function ShareButton({ messageId, title, scriptureRef }: Props) {
  async function handleShare() {
    const url = `${window.location.origin}/pulpit/${messageId}`
    const shareTitle = title || 'Message from the Vicar'
    const text = [
      '🕊️ ' + shareTitle,
      scriptureRef ? `📖 ${scriptureRef}` : null,
      'St. George Marthoma Syrian Church, Alappuzha',
    ].filter(Boolean).join('\n')

    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text, url })
      } catch {
        // User cancelled — do nothing
      }
    } else {
      // Desktop fallback: WhatsApp Web
      window.open(
        `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,
        '_blank',
        'noopener,noreferrer'
      )
    }
  }

  return (
    <button
      onClick={handleShare}
      aria-label="Share message"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-500 text-xs hover:border-amber-300 transition-colors min-h-[36px]"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
      Share
    </button>
  )
}
