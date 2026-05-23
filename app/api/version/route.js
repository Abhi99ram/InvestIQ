import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Simply returns the current live version and timestamp of the latest deploy.
// Incrementing this will instantly push alert notifications to all Android, iOS, and PC users.
export async function GET() {
  return NextResponse.json({
    version: '1.7.1',
    releasedAt: '2026-05-23T14:15:00Z',
    notes: 'Removed Get InvestIQ app installation banner.'
  });
}
