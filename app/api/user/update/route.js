import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

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

    // Notify Admin of changes
    const gmailUser = 'investiq.helpdesk@gmail.com';
    const gmailPass = process.env.GMAIL_APP_PASSWORD;
    if (gmailPass && gmailPass !== 'YOUR_GMAIL_APP_PASSWORD_HERE') {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: gmailUser, pass: gmailPass },
      });

      let changesText = [];
      if (updatedUser.name !== targetUser.name) changesText.push(`Name: ${targetUser.name} -> ${updatedUser.name}`);
      if (updatedUser.email !== targetUser.email) changesText.push(`Email: ${targetUser.email} -> ${updatedUser.email}`);
      if (updatedUser.mobile !== targetUser.mobile) changesText.push(`Mobile: ${targetUser.mobile} -> ${updatedUser.mobile}`);

      if (changesText.length > 0) {
        try {
          // Notify Admin
          await transporter.sendMail({
            from: '"InvestIQ System" <' + gmailUser + '>',
            to: 'investiq.helpdesk@gmail.com',
            subject: `User Profile Updated: ${targetUser.email}`,
            text: `A user has updated their profile details:\n\nUser ID: ${updatedUser.id}\nOriginal Email: ${targetUser.email}\n\nChanges Made:\n${changesText.join('\n')}`,
            html: `<p>A user has updated their profile details:</p><ul><li>Original Email: ${targetUser.email}</li></ul><p><strong>Changes Made:</strong></p><ul>${changesText.map(c => `<li>${c}</li>`).join('')}</ul>`
          });
          
          // Notify User
          await transporter.sendMail({
            from: '"InvestIQ AI" <' + gmailUser + '>',
            to: updatedUser.email,
            subject: 'Your Profile Has Been Updated',
            text: `Hi ${updatedUser.name || 'User'},\n\nYour profile details have been successfully updated.\n\nChanges Made:\n${changesText.join('\n')}\n\nIf you did not make these changes, please contact support immediately.\n\nInvestIQ AI Team`,
            html: `<p>Hi ${updatedUser.name || 'User'},</p><p>Your profile details have been successfully updated.</p><p><strong>Changes Made:</strong></p><ul>${changesText.map(c => `<li>${c}</li>`).join('')}</ul><p>If you did not make these changes, please contact support immediately at investiq.helpdesk@gmail.com.</p><p>InvestIQ AI Team</p>`
          });
        } catch (e) { console.error('Failed to notify about update', e); }
      }
    }

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
