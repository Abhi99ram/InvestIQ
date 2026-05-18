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
    const gmailPass = process.env.GMAIL_APP_PASSWORD && process.env.GMAIL_APP_PASSWORD !== 'YOUR_GMAIL_APP_PASSWORD_HERE'
      ? process.env.GMAIL_APP_PASSWORD
      : 'mhne tsvo hbfl xmdi';

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPass },
    });


      // 1. Notify User
      try {
        const userHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b; line-height: 1.6;">
            <h2 style="color: #0f172a; font-size: 20px; font-weight: 600; margin-top: 0; margin-bottom: 16px;">Account Deletion Confirmation</h2>
            <p style="margin-top: 0; margin-bottom: 16px;">Hello ${targetUser.name || 'User'},</p>
            <p style="margin-top: 0; margin-bottom: 16px;">We are writing to confirm that your InvestIQ account has been successfully deleted, and all associated personal data has been permanently removed from our active database.</p>
            <p style="margin-top: 0; margin-bottom: 20px;">Thank you for using our platform. We appreciate your feedback as we continue to improve our tools.</p>
            <p style="margin-top: 0; margin-bottom: 0;">Sincerely,</p>
            <p style="margin-top: 4px; margin-bottom: 0; font-weight: 500; color: #475569;">The InvestIQ Support Team</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 25px; margin-bottom: 15px;" />
            <p style="font-size: 11px; color: #94a3b8; line-height: 1.5; margin: 0;">
              This is a transactional confirmation of account closure.
            </p>
          </div>
        `;

        const userText = `Hello ${targetUser.name || 'User'},\n\nWe are writing to confirm that your InvestIQ account has been successfully deleted, and all associated personal data has been permanently removed from our active database.\n\nThank you for using our platform. We appreciate your feedback as we continue to improve our tools.\n\nSincerely,\nThe InvestIQ Support Team\n\n---\nThis is a transactional confirmation of account closure.`;

        await transporter.sendMail({
          from: '"InvestIQ Helpdesk" <' + gmailUser + '>',
          to: targetUser.email,
          subject: 'InvestIQ Account Deletion Confirmation',
          text: userText,
          html: userHtml,
          headers: {
            'X-Priority': '3',
            'X-MSMail-Priority': 'Normal',
            'Importance': 'Normal',
            'X-Auto-Response-Suppress': 'OOF, AutoReply',
            'Feedback-ID': 'account-delete:investiq'
          }
        });
      } catch (e) { console.error('Failed to notify user of deletion', e); }

      // 2. Notify Admin
      try {
        const adminHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b; line-height: 1.6;">
            <h2 style="color: #ef4444; font-size: 20px; font-weight: 600; margin-top: 0; margin-bottom: 16px;">Admin Alert: User Deleted Account</h2>
            <p style="margin-top: 0; margin-bottom: 16px;">A user has deleted their account:</p>
            <ul style="margin-top: 0; margin-bottom: 20px; padding-left: 20px;">
              <li style="margin-bottom: 6px;"><strong>Name:</strong> ${targetUser.name}</li>
              <li style="margin-bottom: 6px;"><strong>Email:</strong> ${targetUser.email}</li>
              <li style="margin-bottom: 6px;"><strong>Mobile:</strong> ${targetUser.mobile}</li>
              <li style="margin-bottom: 6px;"><strong>Joined:</strong> ${targetUser.createdAt}</li>
            </ul>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 25px; margin-bottom: 15px;" />
            <p style="font-size: 11px; color: #94a3b8; margin: 0;">InvestIQ Administrative Notification</p>
          </div>
        `;

        await transporter.sendMail({
          from: '"InvestIQ System" <' + gmailUser + '>',
          to: 'investiq.helpdesk@gmail.com',
          subject: `User Deleted Account: ${targetUser.email}`,
          text: `A user has deleted their account:\n\nName: ${targetUser.name}\nEmail: ${targetUser.email}\nMobile: ${targetUser.mobile}\nJoined: ${targetUser.createdAt}`,
          html: adminHtml,
          headers: {
            'X-Priority': '3',
            'Importance': 'Normal',
            'X-Auto-Response-Suppress': 'OOF, AutoReply'
          }
        });
      } catch (e) { console.error('Failed to notify admin of deletion', e); }

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('[User Delete Error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
