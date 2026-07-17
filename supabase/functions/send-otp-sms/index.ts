// Supabase Auth Hook — Send SMS via 2Factor.in
// Triggered by Supabase Auth whenever a phone OTP needs to be sent.
//
// Request body (Supabase Auth Hook format):
//   { "user": { "phone": "+919446012324" }, "sms_data": { "otp": "123456", ... } }
//
// Success response: {} (empty JSON, 200)
// Error response:   { "error": { "http_code": N, "message": "..." } }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()

    // Supabase hook payload structure
    const phone: string = payload.user?.phone ?? ''
    const otp:   string = payload.sms_data?.otp ?? ''

    if (!phone || !otp) {
      console.error('Missing phone or OTP in payload', JSON.stringify(payload))
      return new Response(
        JSON.stringify({ error: { http_code: 400, message: 'Missing phone or OTP' } }),
        { status: 400, headers: corsHeaders }
      )
    }

    const apiKey   = Deno.env.get('TWOFACTOR_API_KEY')
    const template = Deno.env.get('TWOFACTOR_TEMPLATE_NAME') ?? 'Marthoma'

    if (!apiKey) {
      console.error('TWOFACTOR_API_KEY secret not set')
      return new Response(
        JSON.stringify({ error: { http_code: 500, message: '2Factor API key not configured' } }),
        { status: 500, headers: corsHeaders }
      )
    }

    // Normalise phone: +919446012324 → 9446012324 (10 digits, India)
    const phone10 = phone.replace(/^\+91/, '').replace(/\D/g, '').slice(-10)

    if (phone10.length !== 10) {
      return new Response(
        JSON.stringify({ error: { http_code: 400, message: `Invalid Indian phone number: ${phone}` } }),
        { status: 400, headers: corsHeaders }
      )
    }

    // 2Factor REST API
    // GET /API/V1/{api_key}/SMS/{mobile}/{otp}/{template_name}
    const url = `https://2factor.in/API/V1/${apiKey}/SMS/${phone10}/${otp}/${encodeURIComponent(template)}`

    console.log(`Sending OTP to ${phone10} via template "${template}"`)
    const resp = await fetch(url, { method: 'GET' })
    const data = await resp.json()

    if (data.Status === 'Success') {
      console.log(`OTP sent successfully. SessionId: ${data.Details}`)
      return new Response(JSON.stringify({}), { status: 200, headers: corsHeaders })
    }

    console.error('2Factor error response:', JSON.stringify(data))
    return new Response(
      JSON.stringify({ error: { http_code: 400, message: data.Details ?? 'SMS delivery failed' } }),
      { status: 400, headers: corsHeaders }
    )
  } catch (err) {
    console.error('send-otp-sms hook error:', err)
    return new Response(
      JSON.stringify({ error: { http_code: 500, message: 'Internal server error' } }),
      { status: 500, headers: corsHeaders }
    )
  }
})
