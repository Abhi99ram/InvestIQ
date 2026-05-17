import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Simply returns the current live version and timestamp of the latest deploy.
// Incrementing this will instantly push alert notifications to all Android, iOS, and PC users.
export async function GET() {
  return NextResponse.json({
    version: '1.5.2',
    releasedAt: '2026-05-17T21:00:00Z',
    notes: 'Removed broken offline cache. Site loads directly from network for reliable access.'
  });
}
