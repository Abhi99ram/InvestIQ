import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global;
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { email, alert } = await request.json();
    if (!email || !alert) {
      return NextResponse.json({ error: 'Email and alert details required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Append new alert to existing alerts array
    let currentAlerts = [];
    if (user.alerts && Array.isArray(user.alerts)) {
      currentAlerts = user.alerts;
    } else if (typeof user.alerts === 'string') {
      try { currentAlerts = JSON.parse(user.alerts); } catch(e) {}
    }

    // Assign a unique ID if not present
    if (!alert.id) alert.id = Date.now();
    alert.active = true;

    currentAlerts.push(alert);

    await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { alerts: currentAlerts }
    });

    return NextResponse.json({ success: true, message: 'Alert saved securely to database', alerts: currentAlerts });
  } catch (error) {
    console.error('[Save Alert Error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
