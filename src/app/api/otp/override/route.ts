// POST /api/otp/override
// Called immediately after supabase.auth.signInWithOtp() succeeds.
// Supabase triggers Twilio Verify with SMS (no channel forwarding from GoTrue).
// This route calls Twilio Verify directly to re-create the verification with
// the correct channel (whatsapp), which cancels the SMS one.
// GoTrue's nonce stays valid — when verifyOtp is called, GoTrue asks Twilio
// to check the OTP, and Twilio finds the WhatsApp verification approved.

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  console.log('[otp/override] handler invoked')
  let phone = '', channel = 'whatsapp'
  try {
    const body = await req.json() as { phone?: string; channel?: string }
    phone   = (body.phone   ?? '').trim()
    channel = (body.channel ?? 'whatsapp').trim()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!phone || !/^\+\d{7,15}$/.test(phone)) {
    return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
  }
  if (channel !== 'whatsapp' && channel !== 'sms') {
    return NextResponse.json({ error: 'Invalid channel' }, { status: 400 })
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken  = process.env.TWILIO_AUTH_TOKEN
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID

  if (!accountSid || !authToken || !serviceSid) {
    console.error('[otp/override] Twilio credentials not configured')
    return NextResponse.json({ error: 'OTP service not configured' }, { status: 500 })
  }

  const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

  const params = new URLSearchParams({ To: phone, Channel: channel })

  try {
    const res = await fetch(
      `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    )

    let data: { status?: string; message?: string; code?: number }
    try {
      data = await res.json() as { status?: string; message?: string; code?: number }
    } catch {
      console.error('[otp/override] Twilio returned non-JSON body, HTTP status:', res.status)
      return NextResponse.json({ error: 'OTP service returned unexpected response' }, { status: 502 })
    }
    console.log(`[otp/override] Twilio response for ${phone} via ${channel}:`, JSON.stringify(data))

    if (data.status === 'pending') {
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json(
      { error: data.message ?? 'Failed to send OTP' },
      { status: res.status }
    )
  } catch (err) {
    console.error('[otp/override] Twilio fetch error:', err)
    return NextResponse.json({ error: 'Failed to reach OTP service' }, { status: 502 })
  }
}
