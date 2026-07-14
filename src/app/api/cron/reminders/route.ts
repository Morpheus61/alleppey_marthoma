import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Vercel Cron: runs every 15 minutes
 * Scans events starting within the next 15 minutes and sends push reminders.
 * Protected by CRON_SECRET header.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // TODO Stage 8: implement push fanout logic
  // 1. Query events where starts_at between now and now+reminder_minutes
  // 2. For each event, fetch group members' push_subscriptions
  // 3. Send web-push notifications via VAPID

  return NextResponse.json({ ok: true, message: 'Cron executed (fanout in Stage 8)' })
}
