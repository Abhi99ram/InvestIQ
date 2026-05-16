import { NextResponse } from 'next/server';
import { getUsers } from '../../../../lib/cloudDB';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const users = await getUsers();
    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error("Admin API Error:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
