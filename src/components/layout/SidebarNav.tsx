'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { Home, Users, Calendar, User, BookOpen, ShieldCheck } from 'lucide-react'

const baseItems = [
  { href: '/',          icon: Home,        label: 'Home'      },
  { href: '/groups',    icon: Users,       label: 'Groups'    },
  { href: '/directory', icon: BookOpen,    label: 'Directory' },
  { href: '/calendar',  icon: Calendar,    label: 'Calendar'  },
  { href: '/me',        icon: User,        label: 'Profile'   },
]

export default function SidebarNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()

  const items = isAdmin
    ? [...baseItems, { href: '/admin', icon: ShieldCheck, label: 'Admin' }]
    : baseItems

  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 bg-white border-r border-amber-100 sticky top-[52px] h-[calc(100vh-52px)] overflow-y-auto">
      {/* Church logo */}
      <div className="px-4 py-5 border-b border-amber-50">
        <Link href="/" className="flex items-center gap-3 group">
          <Image
            src="/MarThoma_logo.png"
            alt="SGM Church"
            width={40}
            height={40}
            className="rounded-full shrink-0"
          />
          <div className="min-w-0">
            <p className="text-brand-900 font-bold text-sm leading-tight">St. George</p>
            <p className="text-brand-900 font-bold text-sm leading-tight">Marthoma Church</p>
            <p className="text-amber-600 text-[9px] font-semibold tracking-widest uppercase mt-0.5">
              Alappuzha
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map(({ href, icon: Icon, label }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-900 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-amber-50 hover:text-brand-900',
              ].join(' ')}
            >
              <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer tag */}
      <div className="px-5 py-3 border-t border-amber-50">
        <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-semibold">
          ✦ Lighted to Lighten ✦
        </p>
      </div>
    </aside>
  )
}
