import { NextRequest, NextResponse } from 'next/server'

// Proxies requests to Google Input Tools transliteration API
// so we avoid browser CORS issues.
export async function GET(req: NextRequest) {
  const text = req.nextUrl.searchParams.get('text')?.trim()
  if (!text) return NextResponse.json({ result: '' })

  try {
    const url = `https://inputtools.google.com/request?text=${encodeURIComponent(text)}&itc=ml-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8`
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const data = await res.json()
    // Response shape: ["SUCCESS", [["word", ["transliteration"], ...]]]
    const transliteration: string = data?.[1]?.[0]?.[1]?.[0] ?? ''
    return NextResponse.json({ result: transliteration })
  } catch {
    return NextResponse.json({ result: '' }, { status: 502 })
  }
}
