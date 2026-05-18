import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global;
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ count: 0, alerts: [], error: 'User not found' }, { status: 200 });
    }

    let alerts = [];
    if (user.alerts && Array.isArray(user.alerts)) alerts = user.alerts;
    else if (typeof user.alerts === 'string') {
      try { alerts = JSON.parse(user.alerts); } catch (e) {}
    }

    const count = alerts.filter(a => a.triggered === true).length;
    return NextResponse.json({ count, alerts: alerts.filter(a => a.triggered === true) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 200 });

    let alerts = [];
    if (user.alerts && Array.isArray(user.alerts)) alerts = user.alerts;
    else if (typeof user.alerts === 'string') {
      try { alerts = JSON.parse(user.alerts); } catch (e) {}
    }

    // Mark all triggered as viewed (delete the flag)
    const updatedAlerts = alerts.map(a => {
      if (a.triggered) {
        return { ...a, triggered: false };
      }
      return a;
    });

    await prisma.user.update({
      where: { email },
      data: { alerts: updatedAlerts }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
