// Supabase Auth Hook — Send OTP via Twilio Verify (WhatsApp or SMS)
//
// Register this as an Auth Hook in Supabase Dashboard:
//   Authentication → Hooks → Send SMS → Supabase Edge Function → send-otp
//
// Secrets to set in Supabase Dashboard → Edge Functions → Secrets:
//   TWILIO_ACCOUNT_SID
//   TWILIO_AUTH_TOKEN
//   TWILIO_VERIFY_SERVICE_SID
//   SUPABASE_SERVICE_ROLE_KEY  (already available as built-in)
//
// Hook payload from Supabase:
//   { "user": { "phone": "+919876543210" }, "sms": { "otp": "123456" } }
//
// We IGNORE the Supabase-generated OTP and use Twilio Verify to generate
// and deliver its own OTP (WhatsApp or SMS). The user enters the Twilio OTP
// which is verified via supabase.auth.verifyOtp on the client (Supabase
// re-verifies with Twilio Verify under the hood).
//
// Channel preference is read from the otp_channel_pref table written by
// the /api/otp-channel Next.js route before signInWithOtp is called.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = { 'Content-Type': 'application/json' }

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  let phone = ''
  try {
    const payload = await req.json()
    phone = payload.user?.phone ?? payload.phone ?? ''
    console.log(`[send-otp] phone="${phone}"`)
  } catch (e) {
    console.error('[send-otp] JSON parse error:', e)
    // Return {} to unblock Supabase even on malformed payload
    return new Response(JSON.stringify({}), { status: 200, headers: CORS })
  }

  if (!phone) {
    console.error('[send-otp] Missing phone — unblocking Supabase')
    return new Response(JSON.stringify({}), { status: 200, headers: CORS })
  }

  const accountSid  = Deno.env.get('TWILIO_ACCOUNT_SID')
  const authToken   = Deno.env.get('TWILIO_AUTH_TOKEN')
  const serviceSid  = Deno.env.get('TWILIO_VERIFY_SERVICE_SID')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  if (!accountSid || !authToken || !serviceSid) {
    console.error('[send-otp] Missing Twilio secrets')
    return new Response(
      JSON.stringify({ error: { http_code: 500, message: 'Twilio not configured' } }),
      { status: 500, headers: CORS }
    )
  }

  // ── Read channel preference (set by /api/otp-channel before signInWithOtp) ──
  let channel: 'whatsapp' | 'sms' = 'whatsapp' // default to WhatsApp
  try {
    const supabase = createClient(supabaseUrl, serviceKey)
    const { data: pref } = await supabase
      .from('otp_channel_pref')
      .select('channel, set_at')
      .eq('phone_e164', phone)
      .maybeSingle()

    if (pref) {
      const ageSecs = (Date.now() - new Date(pref.set_at).getTime()) / 1000
      if (ageSecs < 600) channel = pref.channel as 'whatsapp' | 'sms'
      // Clean up — one-time use
      await supabase.from('otp_channel_pref').delete().eq('phone_e164', phone)
    }
    console.log(`[send-otp] channel="${channel}" (pref found: ${!!pref})`)
  } catch (e) {
    console.error('[send-otp] Channel pref lookup failed — using WhatsApp default:', e)
  }

  // ── Call Twilio Verify REST API ──────────────────────────────────────────
  // Twilio Verify generates its own OTP and delivers it.
  // Supabase verifyOtp() delegates verification back to Twilio Verify.
  try {
    const url = `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`
    const credentials = btoa(`${accountSid}:${authToken}`)

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: phone, Channel: channel }),
    })

    const data = await resp.json()
    console.log('[send-otp] Twilio response:', JSON.stringify(data))

    if (resp.ok && data.status === 'pending') {
      console.log(`[send-otp] ✓ OTP sent via ${channel} to ${phone}`)
      // Return {} — Supabase hook expects empty success response
      return new Response(JSON.stringify({}), { status: 200, headers: CORS })
    }

    console.error(`[send-otp] Twilio error: ${data.message ?? JSON.stringify(data)}`)
    return new Response(
      JSON.stringify({ error: { http_code: 400, message: data.message ?? 'OTP delivery failed' } }),
      { status: 400, headers: CORS }
    )
  } catch (err) {
    console.error('[send-otp] Twilio fetch error:', err)
    return new Response(
      JSON.stringify({ error: { http_code: 500, message: 'Internal error' } }),
      { status: 500, headers: CORS }
    )
  }
})
