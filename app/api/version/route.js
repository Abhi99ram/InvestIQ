import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Simply returns the current live version and timestamp of the latest deploy.
// Incrementing this will instantly push alert notifications to all Android, iOS, and PC users.
export async function GET() {
  return NextResponse.json({
    version: '1.3.8',
    releasedAt: '2026-05-17T15:40:00Z',
    notes: 'Configured clickjacking notification permission settle timeout and direct APK/IPA mobile downloads.'
  });
}
