// Supabase Auth Hook endpoint — receives phone + OTP from Supabase, sends via 2Factor.in
// Supabase sends its hook secret as: Authorization: Bearer <v1,whsec_...>

import { NextRequest, NextResponse } from 'next/server'

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status })

function verifyAuth(req: NextRequest): boolean {
  const expectedSecret = process.env.SUPABASE_HOOK_SECRET
  if (!expectedSecret) return true   // not configured → allow (dev / first deploy)

  const authHeader = req.headers.get('authorization') ?? ''
  const bearer = authHeader.replace(/^Bearer\s+/i, '')
  return bearer === expectedSecret
}

export async function POST(req: NextRequest) {
  if (!verifyAuth(req)) {
    console.error('[send-otp] Unauthorized hook call')
    return json({ error: { http_code: 401, message: 'Unauthorized' } }, 401)
  }

  let payload: { user?: { phone?: string }; sms_data?: { otp?: string | number } }
  try {
    payload = await req.json()
  } catch {
    return json({ error: { http_code: 400, message: 'Invalid JSON body' } }, 400)
  }

  const phone = payload.user?.phone ?? ''
  const otp   = String(payload.sms_data?.otp ?? '')

  if (!phone || !otp) {
    console.error('[send-otp] Missing phone or OTP:', JSON.stringify(payload))
    return json({ error: { http_code: 400, message: 'Missing phone or OTP' } }, 400)
  }

  const apiKey   = process.env.TWOFACTOR_API_KEY
  const template = process.env.TWOFACTOR_TEMPLATE_NAME ?? 'Marthoma'

  if (!apiKey) {
    console.error('[send-otp] TWOFACTOR_API_KEY not set')
    return json({ error: { http_code: 500, message: '2Factor API key not configured' } }, 500)
  }

  const phone10 = phone.replace(/^\+91/, '').replace(/\D/g, '').slice(-10)
  if (phone10.length !== 10) {
    console.error(`[send-otp] Invalid phone: "${phone}"`)
    return json({ error: { http_code: 400, message: `Invalid phone number: ${phone}` } }, 400)
  }

  const url = `https://2factor.in/API/V1/${apiKey}/SMS/${phone10}/${otp}/${encodeURIComponent(template)}`

  try {
    console.log(`[send-otp] → 2Factor: ${phone10} template="${template}" otp=${otp}`)
    const resp = await fetch(url, { method: 'GET' })
    const data = await resp.json() as { Status: string; Details: string }

    if (data.Status === 'Success') {
      console.log(`[send-otp] ✓ Delivered. SessionId: ${data.Details}`)
      return json({})
    }

    console.error('[send-otp] 2Factor error:', JSON.stringify(data))
    return json({ error: { http_code: 400, message: data.Details ?? 'SMS delivery failed' } }, 400)
  } catch (err) {
    console.error('[send-otp] fetch error:', err)
    return json({ error: { http_code: 500, message: 'Failed to reach 2Factor API' } }, 500)
  }
}


