import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global;
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const dynamic = 'force-dynamic';

export async function DELETE(request) {
  try {
    const { targetEmail } = await request.json();

    if (!targetEmail) {
      return NextResponse.json({ error: 'Target email is required' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { email: targetEmail.toLowerCase() } });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await prisma.user.delete({
      where: { email: targetEmail.toLowerCase() }
    });

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('[User Delete Error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
