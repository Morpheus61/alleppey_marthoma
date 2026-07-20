'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function VicarComposeButton({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()
  // Render nothing for non-admins or when already on the compose page
  if (!isAdmin || pathname === '/pulpit/compose') return null

  return (
    <Link
      href="/pulpit/compose"
      aria-label="Write new Pulpit message"
      // bottom-24 (96px) clears the 56px mobile bottom nav; md:bottom-8 on desktop
      className="fixed bottom-24 right-5 md:bottom-8 z-50 w-[52px] h-[52px] rounded-full bg-brand-900 text-white flex items-center justify-center text-[22px] shadow-lg hover:bg-brand-800 active:scale-95 transition-all"
    >
      🕊️
    </Link>
  )
}
