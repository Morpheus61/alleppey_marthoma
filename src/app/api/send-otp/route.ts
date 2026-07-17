// Supabase Auth Hook endpoint — receives phone + OTP from Supabase, sends via 2Factor.in
// Protected by ?secret=<CRON_SECRET> query param (stored only in Supabase Hook config)
//
// Supabase Auth Hook payload:
//   POST { "user": { "phone": "+919446012324" }, "sms_data": { "otp": "123456" } }
// Success: HTTP 200, body {}
// Error:   HTTP 4xx, body { "error": { "http_code": N, "message": "..." } }

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  // Verify shared secret — same key used for cron route protection
  const secret = req.nextUrl.searchParams.get('secret')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: { http_code: 401, message: 'Unauthorized' } },
      { status: 401 }
    )
  }

  let payload: { user?: { phone?: string }; sms_data?: { otp?: string } }
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json(
      { error: { http_code: 400, message: 'Invalid JSON body' } },
      { status: 400 }
    )
  }

  const phone = payload.user?.phone ?? ''
  const otp   = payload.sms_data?.otp ?? ''

  if (!phone || !otp) {
    console.error('[send-otp] Missing phone or OTP', JSON.stringify(payload))
    return NextResponse.json(
      { error: { http_code: 400, message: 'Missing phone or OTP in hook payload' } },
      { status: 400 }
    )
  }

  const apiKey   = process.env.TWOFACTOR_API_KEY
  const template = process.env.TWOFACTOR_TEMPLATE_NAME ?? 'Marthoma'

  if (!apiKey) {
    console.error('[send-otp] TWOFACTOR_API_KEY env var not set')
    return NextResponse.json(
      { error: { http_code: 500, message: '2Factor API key not configured' } },
      { status: 500 }
    )
  }

  // Strip country code → 10-digit Indian mobile
  const phone10 = phone.replace(/^\+91/, '').replace(/\D/g, '').slice(-10)

  if (phone10.length !== 10) {
    console.error(`[send-otp] Invalid phone after normalisation: "${phone}" → "${phone10}"`)
    return NextResponse.json(
      { error: { http_code: 400, message: `Invalid Indian phone number: ${phone}` } },
      { status: 400 }
    )
  }

  // 2Factor REST API: GET /API/V1/{key}/SMS/{mobile}/{otp}/{template}
  const url = `https://2factor.in/API/V1/${apiKey}/SMS/${phone10}/${otp}/${encodeURIComponent(template)}`

  try {
    console.log(`[send-otp] Sending OTP to ${phone10} via template "${template}"`)
    const resp = await fetch(url, { method: 'GET' })
    const data = await resp.json() as { Status: string; Details: string }

    if (data.Status === 'Success') {
      console.log(`[send-otp] Success. SessionId: ${data.Details}`)
      return NextResponse.json({}, { status: 200 })
    }

    console.error('[send-otp] 2Factor error:', data)
    return NextResponse.json(
      { error: { http_code: 400, message: data.Details ?? 'SMS delivery failed' } },
      { status: 400 }
    )
  } catch (err) {
    console.error('[send-otp] Fetch error:', err)
    return NextResponse.json(
      { error: { http_code: 500, message: 'Failed to reach 2Factor API' } },
      { status: 500 }
    )
  }
}
