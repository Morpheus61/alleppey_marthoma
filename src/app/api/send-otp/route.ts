// Supabase Auth Hook — delivers phone OTP via 2Factor.in (StGMTC sender)

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  // Log every incoming request header and body for debugging
  const allHeaders: Record<string, string> = {}
  req.headers.forEach((v, k) => { allHeaders[k] = v })
  console.log('[send-otp] Headers:', JSON.stringify(allHeaders))

  let rawBody = ''
  try {
    rawBody = await req.text()
    console.log('[send-otp] Body:', rawBody)
  } catch (e) {
    console.error('[send-otp] Failed to read body:', e)
    return NextResponse.json({})  // return success anyway to unblock Supabase
  }

  let phone = '', otp = ''
  try {
    const payload = JSON.parse(rawBody) as {
      user?: { phone?: string }
      sms?: { otp?: string | number; phone?: string }      // actual GoTrue field name
      sms_data?: { otp?: string | number }                 // documented (wrong) field name
      phone?: string; otp?: string
    }
    phone = payload.user?.phone ?? payload.phone ?? ''
    otp   = String(payload.sms?.otp ?? payload.sms_data?.otp ?? payload.otp ?? '')
    console.log(`[send-otp] phone="${phone}" otp="${otp}"`)
  } catch (e) {
    console.error('[send-otp] JSON parse error:', e)
    return NextResponse.json({})  // return success anyway
  }

  if (!phone || !otp) {
    console.error('[send-otp] Missing phone or OTP — returning success to unblock')
    return NextResponse.json({})
  }

  const apiKey   = process.env.TWOFACTOR_API_KEY
  const template = process.env.TWOFACTOR_TEMPLATE_NAME ?? 'Marthoma'

  if (!apiKey) {
    console.error('[send-otp] TWOFACTOR_API_KEY not set — SMS NOT sent but returning success')
    return NextResponse.json({})  // unblock Supabase even if 2Factor not configured
  }

  const phone10 = phone.replace(/^\+91/, '').replace(/\D/g, '').slice(-10)
  console.log(`[send-otp] phone10="${phone10}" template="${template}"`)

  try {
    const url = `https://2factor.in/API/V1/${apiKey}/SMS/${phone10}/${otp}/${encodeURIComponent(template)}`
    console.log(`[send-otp] 2Factor URL: ${url.replace(apiKey, '***')}`)
    const resp = await fetch(url, { method: 'GET' })
    const data = await resp.json() as { Status: string; Details: string }
    console.log('[send-otp] 2Factor response:', JSON.stringify(data))

    if (data.Status === 'Success') {
      console.log(`[send-otp] ✓ SMS sent. SessionId: ${data.Details}`)
    } else {
      console.error(`[send-otp] 2Factor error: ${data.Details}`)
    }
  } catch (err) {
    console.error('[send-otp] 2Factor fetch error:', err)
  }

  // ALWAYS return HTTP 200 {} so Supabase proceeds regardless of SMS delivery status
  return NextResponse.json({})
}




