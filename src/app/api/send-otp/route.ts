// Supabase Auth Hook — delivers phone OTP via 2Factor.in (StGMTC sender)
// Called by Supabase Auth each time a phone OTP is needed.

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  let payload: { user?: { phone?: string }; sms_data?: { otp?: string | number } }
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: { http_code: 400, message: 'Invalid JSON' } }, { status: 400 })
  }

  const phone = payload.user?.phone ?? ''
  const otp   = String(payload.sms_data?.otp ?? '')

  if (!phone || !otp) {
    console.error('[send-otp] Missing phone or OTP:', JSON.stringify(payload))
    return NextResponse.json({ error: { http_code: 400, message: 'Missing phone or OTP' } }, { status: 400 })
  }

  const apiKey   = process.env.TWOFACTOR_API_KEY
  const template = process.env.TWOFACTOR_TEMPLATE_NAME ?? 'Marthoma'

  if (!apiKey) {
    console.error('[send-otp] TWOFACTOR_API_KEY not set')
    return NextResponse.json({ error: { http_code: 500, message: '2Factor API key not configured' } }, { status: 500 })
  }

  const phone10 = phone.replace(/^\+91/, '').replace(/\D/g, '').slice(-10)
  if (phone10.length !== 10) {
    return NextResponse.json({ error: { http_code: 400, message: `Invalid phone: ${phone}` } }, { status: 400 })
  }

  const url = `https://2factor.in/API/V1/${apiKey}/SMS/${phone10}/${otp}/${encodeURIComponent(template)}`

  try {
    console.log(`[send-otp] → ${phone10} otp=${otp} template="${template}"`)
    const resp = await fetch(url, { method: 'GET' })
    const data = await resp.json() as { Status: string; Details: string }

    if (data.Status === 'Success') {
      console.log(`[send-otp] ✓ SessionId: ${data.Details}`)
      return NextResponse.json({})
    }

    console.error('[send-otp] 2Factor error:', JSON.stringify(data))
    return NextResponse.json({ error: { http_code: 400, message: data.Details ?? 'SMS failed' } }, { status: 400 })
  } catch (err) {
    console.error('[send-otp] fetch error:', err)
    return NextResponse.json({ error: { http_code: 500, message: 'Network error' } }, { status: 500 })
  }
}



