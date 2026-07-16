'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, Calendar, User, BookOpen, ShieldCheck, Wallet } from 'lucide-react'

const items = [
  { href: '/',           icon: Home,       label: 'Home'      },
  { href: '/groups',     icon: Users,       label: 'Groups'    },
  { href: '/directory',  icon: BookOpen,    label: 'Directory' },
  { href: '/calendar',   icon: Calendar,    label: 'Calendar'  },
  { href: '/finance',    icon: Wallet,      label: 'Finance'   },
  { href: '/me',         icon: User,        label: 'Profile'   },
]

export default function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()

  const allItems = isAdmin
    ? [...items, { href: '/admin', icon: ShieldCheck, label: 'Admin' }]
    : items

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-amber-100 safe-area-pb md:hidden">
      <div className="flex items-stretch justify-around max-w-lg mx-auto">
        {allItems.map(({ href, icon: Icon, label }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 min-h-[56px] text-[10px] font-medium transition-colors ${
                active ? 'text-brand-900' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
