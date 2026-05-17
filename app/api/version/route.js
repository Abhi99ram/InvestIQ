import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Simply returns the current live version and timestamp of the latest deploy.
// Incrementing this will instantly push alert notifications to all Android, iOS, and PC users.
export async function GET() {
  return NextResponse.json({
    version: '1.4.0',
    releasedAt: '2026-05-17T16:25:00Z',
    notes: 'Enabled direct free native installation via PWA for Android and iOS.'
  });
}
