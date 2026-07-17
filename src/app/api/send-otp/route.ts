// Supabase Auth Hook endpoint — receives phone + OTP from Supabase, sends via 2Factor.in
// Security: verified via HMAC-SHA256 signature in x-supabase-signature header
// (set SUPABASE_HOOK_SECRET in Vercel env vars — the v1,whsec_... value from Supabase Auth Hooks)

import { NextRequest, NextResponse } from 'next/server'

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status })

async function verifySignature(req: NextRequest, rawBody: string): Promise<boolean> {
  const secret = process.env.SUPABASE_HOOK_SECRET
  if (!secret) return true  // no secret configured → skip (dev/first-deploy)

  // Supabase sends: x-supabase-signature: sha256=<hex>
  const sigHeader = req.headers.get('x-supabase-signature') ?? ''
  const [, hexSig] = sigHeader.split('sha256=')
  if (!hexSig) return false

  // Decode the v1,whsec_<base64> format
  const b64 = secret.replace(/^v1,whsec_/, '')
  const keyBytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))

  const key = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  )
  const bodyBytes = new TextEncoder().encode(rawBody)
  const sigBytes = Uint8Array.from(
    hexSig.match(/.{2}/g)!.map(h => parseInt(h, 16))
  )
  return crypto.subtle.verify('HMAC', key, sigBytes, bodyBytes)
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  // Verify Supabase HMAC signature
  const valid = await verifySignature(req, rawBody)
  if (!valid) {
    console.error('[send-otp] Invalid HMAC signature')
    return json({ error: { http_code: 401, message: 'Invalid signature' } }, 401)
  }

  let payload: { user?: { phone?: string }; sms_data?: { otp?: string } }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return json({ error: { http_code: 400, message: 'Invalid JSON body' } }, 400)
  }

  const phone = payload.user?.phone ?? ''
  const otp   = String(payload.sms_data?.otp ?? '')

  if (!phone || !otp) {
    console.error('[send-otp] Missing phone or OTP', JSON.stringify(payload))
    return json({ error: { http_code: 400, message: 'Missing phone or OTP in hook payload' } }, 400)
  }

  const apiKey   = process.env.TWOFACTOR_API_KEY
  const template = process.env.TWOFACTOR_TEMPLATE_NAME ?? 'Marthoma'

  if (!apiKey) {
    console.error('[send-otp] TWOFACTOR_API_KEY env var not set')
    return json({ error: { http_code: 500, message: '2Factor API key not configured' } }, 500)
  }

  // Strip country code → 10-digit Indian mobile
  const phone10 = phone.replace(/^\+91/, '').replace(/\D/g, '').slice(-10)
  if (phone10.length !== 10) {
    console.error(`[send-otp] Invalid phone: "${phone}" → "${phone10}"`)
    return json({ error: { http_code: 400, message: `Invalid phone: ${phone}` } }, 400)
  }

  // 2Factor REST API
  const url = `https://2factor.in/API/V1/${apiKey}/SMS/${phone10}/${otp}/${encodeURIComponent(template)}`

  try {
    console.log(`[send-otp] Sending OTP to ${phone10} via template "${template}"`)
    const resp = await fetch(url, { method: 'GET' })
    const data = await resp.json() as { Status: string; Details: string }

    if (data.Status === 'Success') {
      console.log(`[send-otp] Delivered. SessionId: ${data.Details}`)
      return json({})   // HTTP 200 + empty JSON = success signal to Supabase
    }

    console.error('[send-otp] 2Factor error:', JSON.stringify(data))
    return json({ error: { http_code: 400, message: data.Details ?? 'SMS delivery failed' } }, 400)
  } catch (err) {
    console.error('[send-otp] Fetch error:', err)
    return json({ error: { http_code: 500, message: 'Failed to reach 2Factor API' } }, 500)
  }
}

