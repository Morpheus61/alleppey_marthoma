'use client'

/**
 * PhotoUpload
 * Tap-to-upload component for profile pic and family photo.
 * Compresses the image client-side → uploads to Supabase Storage (avatars bucket)
 * → calls onUploaded(url) to persist the URL.
 */

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Camera, Loader2, AlertTriangle } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import { createClient } from '@/lib/supabase/client'

interface Props {
  /** The profile owner's UUID — used as the storage folder name */
  userId: string
  /** Current stored URL (null if none uploaded yet) */
  currentUrl: string | null
  /** Used for the initials fallback */
  displayName: string
  /** 'avatar' = round profile pic  |  'family' = wider family photo */
  type: 'avatar' | 'family'
  /** Called after successful upload with the public storage URL */
  onUploaded: (url: string) => Promise<{ error: string } | { success: true }>
}

export default function PhotoUpload({ userId, currentUrl, displayName, type, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const initials = displayName
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError(null)

    try {
      // 1. Compress — profile pic ≤ 300 KB, family photo ≤ 500 KB
      const compressed = await imageCompression(file, {
        maxSizeMB:        type === 'avatar' ? 0.3 : 0.5,
        maxWidthOrHeight: type === 'avatar' ? 600 : 1200,
        useWebWorker:     true,
        fileType:         'image/jpeg',
      })

      // 2. Upload to Supabase Storage
      const supabase = createClient()
      const path = `${userId}/${type}.jpg`

      const { error: storageErr } = await supabase.storage
        .from('avatars')
        .upload(path, compressed, { contentType: 'image/jpeg', upsert: true })

      if (storageErr) throw new Error(storageErr.message)

      // 3. Get public URL
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

      // 4. Show immediately (with cache-bust so the browser doesn't show the old image)
      setPreviewUrl(`${publicUrl}?t=${Date.now()}`)

      // 5. Persist URL to profiles row via server action
      const result = await onUploaded(publicUrl)
      if (result && 'error' in result) throw new Error(result.error)

    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
      // Reset input so the same file can be re-selected if needed
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const isAvatar = type === 'avatar'
  const label    = isAvatar ? 'profile photo' : 'family photo'

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Tap target */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label={`Upload ${label}`}
        className={[
          'relative group overflow-hidden border-2 border-amber-200 bg-brand-100 shadow-sm',
          'hover:opacity-90 disabled:cursor-not-allowed transition-opacity',
          isAvatar ? 'w-24 h-24 rounded-full' : 'w-40 h-28 rounded-2xl',
        ].join(' ')}
      >
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={displayName}
            fill
            className="object-cover"
            unoptimized   // avoids Next.js image optimisation for storage URLs
          />
        ) : (
          <span className="flex items-center justify-center w-full h-full text-brand-900 font-bold text-2xl select-none">
            {isAvatar ? initials : '📷'}
          </span>
        )}

        {/* Hover / loading overlay */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {uploading
            ? <Loader2 size={22} className="text-white animate-spin" />
            : <Camera size={22} className="text-white" />
          }
        </div>
      </button>

      <p className="text-[11px] text-muted-foreground text-center leading-tight">
        {uploading
          ? 'Uploading…'
          : `Tap to ${previewUrl ? 'change' : 'add'} ${label}`}
      </p>
      <p className="text-[10px] text-gray-400 text-center">JPG / PNG / WebP · max {isAvatar ? '300 KB' : '500 KB'}</p>

      {uploadError && (
        <div className="flex items-start gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 max-w-[180px]">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          <span>{uploadError}</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden
      />
    </div>
  )
}
