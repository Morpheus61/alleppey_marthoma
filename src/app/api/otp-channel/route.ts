// POST /api/otp-channel
// Called by login page before supabase.auth.signInWithOtp.
// Stores the user's channel choice so the send-otp Edge Function can read it.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  let phone = '', channel = 'whatsapp'
  try {
    const body = await req.json() as { phone?: string; channel?: string }
    phone   = (body.phone   ?? '').trim()
    channel = (body.channel ?? 'whatsapp').trim()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!phone || !/^\+\d{7,15}$/.test(phone)) {
    return NextResponse.json({ error: 'Invalid phone' }, { status: 400 })
  }
  if (channel !== 'sms' && channel !== 'whatsapp') {
    return NextResponse.json({ error: 'Invalid channel' }, { status: 400 })
  }

  await admin
    .from('otp_channel_pref')
    .upsert({ phone_e164: phone, channel, set_at: new Date().toISOString() })

  return NextResponse.json({ ok: true })
}
