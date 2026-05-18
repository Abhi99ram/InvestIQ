import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

// ── Gmail SMTP (if App Password set) or Ethereal fallback ────────────────────
async function createMailTransporter() {
  const gmailUser = 'investiq.helpdesk@gmail.com';
  const gmailPass = process.env.GMAIL_APP_PASSWORD && process.env.GMAIL_APP_PASSWORD !== 'YOUR_GMAIL_APP_PASSWORD_HERE'
    ? process.env.GMAIL_APP_PASSWORD
    : 'mhne tsvo hbfl xmdi';

  return {
    transporter: nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPass },
    }),
    fromAddr: gmailUser,
    isReal: true,
  };
}

// ── Real SMS via Fast2SMS ─────────────────────────────────────────────────────
async function sendAlertSms(mobile, message) {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey || !mobile) return false;

  const mobileClean = mobile.replace(/^\+91/, '').replace(/\s+/g, '').trim();

  try {
    const url = new URL('https://www.fast2sms.com/dev/bulkV2');
    url.searchParams.set('authorization', apiKey);
    url.searchParams.set('message', message.slice(0, 160));
    url.searchParams.set('language', 'english');
    url.searchParams.set('route', 'q');
    url.searchParams.set('numbers', mobileClean);

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'cache-control': 'no-cache' },
    });
    const data = await res.json();
    console.log('[Fast2SMS Alert SMS]', JSON.stringify(data));
    return data.return === true;
  } catch (err) {
    console.error('[Alert SMS Error]', err.message);
    return false;
  }
}

export async function POST(request) {
  try {
    const { user, alertDetails } = await request.json();

    if (!user || !alertDetails) {
      return NextResponse.json({ error: 'Missing user or alertDetails' }, { status: 400 });
    }

    const recipientEmail = user.email || process.env.GMAIL_USER || 'alapatisubhashchowdary1233@gmail.com';
    const recipientMobile = user.mobile || '9059204355';
    const symbol = alertDetails.symbol || 'Market';
    const message = alertDetails.message || 'Your alert has been triggered.';

    const results = { emailSent: false, smsSent: false, emailPreviewUrl: null, isRealEmail: false };

    // ── 1. Send Email ──────────────────────────────────────────────────────
    try {
      const { transporter, fromAddr, isReal } = await createMailTransporter();

      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b; line-height: 1.6;">
          <h2 style="color: #0f172a; font-size: 20px; font-weight: 600; margin-top: 0; margin-bottom: 16px;">InvestIQ Price Alert</h2>
          <p style="margin-top: 0; margin-bottom: 16px;">Hello,</p>
          <p style="margin-top: 0; margin-bottom: 16px;">This message is to notify you that your custom alert for <strong>${symbol}</strong> has been triggered.</p>
          
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569;"><strong>Symbol:</strong> ${symbol}</p>
            <p style="margin: 0; font-size: 14px; color: #1e293b;"><strong>Details:</strong> ${message}</p>
          </div>
          
          <p style="margin-top: 0; margin-bottom: 24px;">Please log in to your InvestIQ dashboard to manage your active watchlists and notifications.</p>
          <p style="margin-top: 0; margin-bottom: 0;">Sincerely,</p>
          <p style="margin-top: 4px; margin-bottom: 0; font-weight: 500; color: #475569;">The InvestIQ Support Team</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 25px; margin-bottom: 15px;" />
          <p style="font-size: 11px; color: #94a3b8; line-height: 1.5; margin: 0;">
            You are receiving this automated alert because you configured a price tracker at InvestIQ. If you wish to stop receiving these alerts, you can manage or delete them in your user dashboard, or close your account via the Support page.
          </p>
        </div>
      `;

      const emailText = `Hello,\n\nThis message is to notify you that your custom alert for ${symbol} has been triggered.\n\nSymbol: ${symbol}\nDetails: ${message}\n\nPlease log in to your InvestIQ dashboard to manage your active watchlists and notifications.\n\nSincerely,\nThe InvestIQ Support Team\n\n---\nYou are receiving this automated alert because you configured a price tracker at InvestIQ. If you wish to stop receiving these alerts, you can manage or delete them in your user dashboard, or close your account via the Support page.`;

      const info = await transporter.sendMail({
        from: '"InvestIQ Alerts" <' + fromAddr + '>',
        to: recipientEmail,
        subject: `InvestIQ Alert: ${symbol} Notification`,
        text: emailText,
        html: emailHtml,
        headers: {
          'X-Priority': '3',
          'X-MSMail-Priority': 'Normal',
          'Importance': 'Normal',
          'X-Auto-Response-Suppress': 'OOF, AutoReply',
          'Feedback-ID': 'custom-alert:investiq'
        }
      });

      results.emailSent = true;
      results.isRealEmail = isReal;

      if (!isReal) {
        results.emailPreviewUrl = nodemailer.getTestMessageUrl(info);
        console.log(`[Alert Email] Ethereal preview: ${results.emailPreviewUrl}`);
      } else {
        console.log(`[Alert Email] Real email sent to ${recipientEmail}`);
      }
    } catch (emailErr) {
      console.error('[Alert Email Error]', emailErr.message);
    }

    // ── 2. Send Real SMS ───────────────────────────────────────────────────
    const smsText = `InvestIQ Alert: ${symbol} - ${message}`.slice(0, 160);
    results.smsSent = await sendAlertSms(recipientMobile, smsText);

    return NextResponse.json({
      success: true,
      message: 'Alert processed',
      emailSent: results.emailSent,
      smsSent: results.smsSent,
      isRealEmail: results.isRealEmail,
      emailPreviewUrl: results.emailPreviewUrl,
    });
  } catch (error) {
    console.error('Alert Processing Error:', error);
    return NextResponse.json({ error: 'Failed to process alert' }, { status: 500 });
  }
}
