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
    const gmailPass = process.env.GMAIL_APP_PASSWORD && process.env.GMAIL_APP_PASSWORD !== 'YOUR_GMAIL_APP_PASSWORD_HERE'
      ? process.env.GMAIL_APP_PASSWORD
      : 'mhne tsvo hbfl xmdi';

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
          // 1. Notify Admin
          const adminHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b; line-height: 1.6;">
              <h2 style="color: #0f172a; font-size: 20px; font-weight: 600; margin-top: 0; margin-bottom: 16px;">Admin Alert: Profile Updated</h2>
              <p style="margin-top: 0; margin-bottom: 16px;">A user has updated their account details:</p>
              <ul style="margin-top: 0; margin-bottom: 20px; padding-left: 20px;">
                <li style="margin-bottom: 6px;"><strong>User ID:</strong> ${updatedUser.id}</li>
                <li style="margin-bottom: 6px;"><strong>Original Email:</strong> ${targetUser.email}</li>
              </ul>
              <p style="margin-top: 0; margin-bottom: 12px;"><strong>Changes Made:</strong></p>
              <ul style="margin-top: 0; margin-bottom: 20px; padding-left: 20px;">
                ${changesText.map(c => `<li style="margin-bottom: 6px;">${c}</li>`).join('')}
              </ul>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 25px; margin-bottom: 15px;" />
              <p style="font-size: 11px; color: #94a3b8; margin: 0;">InvestIQ Administrative Notification</p>
            </div>
          `;

          await transporter.sendMail({
            from: '"InvestIQ System" <' + gmailUser + '>',
            to: 'investiq.helpdesk@gmail.com',
            subject: `User Profile Updated: ${targetUser.email}`,
            text: `A user has updated their profile details:\n\nUser ID: ${updatedUser.id}\nOriginal Email: ${targetUser.email}\n\nChanges Made:\n${changesText.join('\n')}`,
            html: adminHtml,
            headers: {
              'X-Priority': '3',
              'Importance': 'Normal',
              'X-Auto-Response-Suppress': 'OOF, AutoReply'
            }
          });
          
          // 2. Notify User
          const userHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b; line-height: 1.6;">
              <h2 style="color: #0f172a; font-size: 20px; font-weight: 600; margin-top: 0; margin-bottom: 16px;">InvestIQ Profile Update Confirmation</h2>
              <p style="margin-top: 0; margin-bottom: 16px;">Hello ${updatedUser.name || 'User'},</p>
              <p style="margin-top: 0; margin-bottom: 16px;">This message confirms that your profile details were successfully updated.</p>
              <p style="margin-top: 0; margin-bottom: 12px;"><strong>Changes Made:</strong></p>
              <ul style="margin-top: 0; margin-bottom: 20px; padding-left: 20px;">
                ${changesText.map(c => `<li style="margin-bottom: 6px;">${c}</li>`).join('')}
              </ul>
              <p style="margin-top: 0; margin-bottom: 20px;">If you did not authorize these changes, please notify our support team immediately.</p>
              <p style="margin-top: 0; margin-bottom: 0;">Sincerely,</p>
              <p style="margin-top: 4px; margin-bottom: 0; font-weight: 500; color: #475569;">The InvestIQ Support Team</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 25px; margin-bottom: 15px;" />
              <p style="font-size: 11px; color: #94a3b8; line-height: 1.5; margin: 0;">
                This is a security notification regarding your InvestIQ profile. Please do not reply directly to this automated email.
              </p>
            </div>
          `;

          const userText = `Hello ${updatedUser.name || 'User'},\n\nThis message confirms that your profile details were successfully updated.\n\nChanges Made:\n${changesText.join('\n')}\n\nIf you did not authorize these changes, please notify our support team immediately at investiq.helpdesk@gmail.com.\n\nSincerely,\nThe InvestIQ Support Team\n\n---\nThis is a security notification regarding your InvestIQ profile. Please do not reply directly to this automated email.`;

          await transporter.sendMail({
            from: '"InvestIQ Helpdesk" <' + gmailUser + '>',
            to: updatedUser.email,
            subject: 'Security Notification: InvestIQ Profile Updated',
            text: userText,
            html: userHtml,
            headers: {
              'X-Priority': '2',
              'X-MSMail-Priority': 'High',
              'Importance': 'high',
              'X-Auto-Response-Suppress': 'OOF, AutoReply',
              'Feedback-ID': 'profile-update:investiq'
            }
          });
        } catch (e) { console.error('Failed to notify about update', e); }
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
