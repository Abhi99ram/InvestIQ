import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Simply returns the current live version and timestamp of the latest deploy.
// Incrementing this will instantly push alert notifications to all Android, iOS, and PC users.
export async function GET() {
  return NextResponse.json({
    version: '1.3.6',
    releasedAt: '2026-05-17T15:30:00Z',
    notes: 'Enabled full-scale mobile store and direct Windows installer update triggers.'
  });
}
