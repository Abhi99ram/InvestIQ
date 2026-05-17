import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Simply returns the current live version and timestamp of the latest deploy.
// Incrementing this will instantly push alert notifications to all Android, iOS, and PC users.
export async function GET() {
  return NextResponse.json({
    version: '1.6.0',
    releasedAt: '2026-05-17T21:30:00Z',
    notes: 'Permanent fix: no PWA cache. Service workers auto-cleared on every visit.'
  });
}
