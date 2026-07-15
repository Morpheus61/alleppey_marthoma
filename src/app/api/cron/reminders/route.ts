import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Reminder cron handler — triggered by Supabase pg_cron every 15 minutes via pg_net POST.
 * Scans events starting within the next 15 minutes and sends push reminders.
 * Protected by CRON_SECRET bearer token.
 */
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // TODO Stage 8: implement push fanout logic
  // 1. Query events where starts_at between now and now+reminder_minutes
  // 2. For each event, fetch group members' push_subscriptions
  // 3. Send web-push notifications via VAPID

  return NextResponse.json({ ok: true, remindersSent: 0 })
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // TODO Stage 8: implement push fanout logic (same as GET above)

  return NextResponse.json({ ok: true, remindersSent: 0 })
}
