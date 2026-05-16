import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

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

    // Send Notification Emails
    const gmailUser = 'investiq.helpdesk@gmail.com';
    const gmailPass = process.env.GMAIL_APP_PASSWORD;
    if (gmailPass && gmailPass !== 'YOUR_GMAIL_APP_PASSWORD_HERE') {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: gmailUser, pass: gmailPass },
      });

      // 1. Notify User
      try {
        await transporter.sendMail({
          from: '"InvestIQ Support" <' + gmailUser + '>',
          to: targetUser.email,
          subject: 'Account Deleted - InvestIQ',
          text: \`Hi \${targetUser.name || 'User'},\n\nYour account has been successfully deleted.\nAll your personal data, watchlists, and alerts have been purged from our systems.\n\nThank you for trying InvestIQ.\n\nInvestIQ Team\`,
          html: \`<p>Hi \${targetUser.name || 'User'},</p><p>Your account has been successfully deleted. All your personal data, watchlists, and alerts have been purged from our systems.</p><p>Thank you for trying InvestIQ.</p>\`
        });
      } catch (e) { console.error('Failed to notify user of deletion', e); }

      // 2. Notify Admin
      try {
        await transporter.sendMail({
          from: '"InvestIQ System" <' + gmailUser + '>',
          to: 'investiq.helpdesk@gmail.com',
          subject: \`User Deleted Account: \${targetUser.email}\`,
          text: \`A user has deleted their account:\n\nName: \${targetUser.name}\nEmail: \${targetUser.email}\nMobile: \${targetUser.mobile}\nJoined: \${targetUser.createdAt}\`,
          html: \`<p>A user has deleted their account:</p><ul><li>Name: \${targetUser.name}</li><li>Email: \${targetUser.email}</li><li>Mobile: \${targetUser.mobile}</li></ul>\`
        });
      } catch (e) { console.error('Failed to notify admin of deletion', e); }
    }

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('[User Delete Error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
