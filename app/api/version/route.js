import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Simply returns the current live version and timestamp of the latest deploy.
// Incrementing this will instantly push alert notifications to all Android, iOS, and PC users.
export async function GET() {
  return NextResponse.json({
    version: '1.5.0',
    releasedAt: '2026-05-17T20:15:00Z',
    notes: 'Live Yahoo prices with correct currency per market (USD, INR, EUR, etc.) across all pages.'
  });
}
