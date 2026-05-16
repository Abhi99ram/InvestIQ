import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global;
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const dynamic = 'force-dynamic';

export async function PUT(request) {
  try {
    const { targetEmail, name, email: newEmail, mobile: newMobile } = await request.json();

    if (!targetEmail) {
      return NextResponse.json({ error: 'Target email is required' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { email: targetEmail.toLowerCase() } });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if new email is already taken by someone else
    if (newEmail && newEmail.toLowerCase() !== targetEmail.toLowerCase()) {
      const existingEmail = await prisma.user.findUnique({ where: { email: newEmail.toLowerCase() } });
      if (existingEmail) {
        return NextResponse.json({ error: 'This email is already in use' }, { status: 400 });
      }
    }

    // Check if new mobile is already taken by someone else
    if (newMobile && newMobile !== targetUser.mobile) {
      const existingMobile = await prisma.user.findUnique({ where: { mobile: newMobile } });
      if (existingMobile) {
        return NextResponse.json({ error: 'This mobile number is already in use' }, { status: 400 });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { email: targetEmail.toLowerCase() },
      data: {
        name: name !== undefined ? name : targetUser.name,
        email: newEmail ? newEmail.toLowerCase() : targetUser.email,
        mobile: newMobile !== undefined ? newMobile : targetUser.mobile,
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'User updated successfully', 
      user: { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email, mobile: updatedUser.mobile }
    });

  } catch (error) {
    console.error('[User Update Error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
