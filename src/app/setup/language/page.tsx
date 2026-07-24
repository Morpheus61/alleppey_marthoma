'use client'

import { setLanguage } from './actions'
import Image from 'next/image'

export default function LanguagePickerPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f9f0e3] px-4 py-10">
      <div className="w-full max-w-sm">

        {/* Church header */}
        <div className="rounded-2xl shadow-2xl overflow-hidden border border-amber-100">
          <div className="bg-[#fdf6eb] px-6 pt-8 pb-6 flex flex-col items-center gap-3 border-b border-amber-100">
            <div
              role="img"
              aria-label="Mar Thoma Church Logo"
              style={{
                width: '80px', height: '80px',
                backgroundImage: 'url(/MarThoma_logo.png)',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
              }}
            />
            <div className="text-center">
              <h1 className="text-brand-900 font-bold text-lg leading-snug tracking-wide">
                St. George Marthoma Syrian Church
              </h1>
              <p className="text-amber-700 text-[0.65rem] font-semibold tracking-[0.25em] uppercase mt-1">
                Alappuzha
              </p>
            </div>
          </div>

          {/* Language choice */}
          <div className="bg-white px-6 pt-6 pb-8 space-y-5">
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-gray-700">Choose your language</p>
              <p className="font-malayalam text-sm text-muted-foreground" lang="ml">
                നിങ്ങളുടെ ഭാഷ തിരഞ്ഞെടുക്കുക
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* English */}
              <form action={setLanguage.bind(null, 'en')}>
                <button
                  type="submit"
                  className="w-full flex flex-col items-center gap-2 rounded-2xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:border-brand-900 transition-colors px-4 py-5 font-semibold text-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900"
                >
                  <span className="text-3xl">🇬🇧</span>
                  <span className="text-base">English</span>
                </button>
              </form>

              {/* Malayalam */}
              <form action={setLanguage.bind(null, 'ml')}>
                <button
                  type="submit"
                  className="w-full flex flex-col items-center gap-2 rounded-2xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:border-brand-900 transition-colors px-4 py-5 focus:outline-none focus:ring-2 focus:ring-brand-900"
                >
                  <span className="text-3xl">🇮🇳</span>
                  <span className="font-malayalam text-base font-semibold text-brand-900" lang="ml">
                    മലയാളം
                  </span>
                </button>
              </form>
            </div>

            <p className="text-center text-[11px] text-muted-foreground">
              You can change this later in your Profile.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
