import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

// ── Gmail SMTP (if App Password set) or Ethereal fallback ────────────────────
async function createMailTransporter() {
  const gmailUser = 'investiq.helpdesk@gmail.com';
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  // Use real Gmail if App Password is configured properly
  if (gmailPass && gmailPass !== 'YOUR_GMAIL_APP_PASSWORD_HERE') {
    return {
      transporter: nodemailer.createTransport({
        service: 'gmail',
        auth: { user: gmailUser, pass: gmailPass },
      }),
      fromAddr: gmailUser,
      isReal: true,
    };
  }

  // Fallback: Ethereal (fake email — for preview only)
  const testAccount = await nodemailer.createTestAccount();
  return {
    transporter: nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass },
    }),
    fromAddr: testAccount.user,
    isReal: false,
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
        <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:20px;border:1px solid #eee;border-radius:10px;">
          <h2 style="color:#38bdf8;">InvestIQ Alert</h2>
          <div style="background:#f8fafc;padding:15px;border-radius:8px;margin:20px 0;">
            <p style="margin:5px 0;"><strong>Symbol:</strong> ${symbol}</p>
            <p style="margin:5px 0;"><strong>Message:</strong> ${message}</p>
          </div>
          <p>Log in to InvestIQ to view details.</p>
          <hr style="border:none;border-top:1px solid #eee;margin-top:30px;" />
          <p style="font-size:11px;color:#94a3b8;line-height:1.4;">
            <strong>To ensure delivery of future alerts, please add this email address to your contacts.</strong><br/>
            You are receiving this automated alert because you configured a price tracker at InvestIQ. If you wish to stop receiving these, please log in and delete the alert, or delete your account via the Support tab.<br/>
            For support, contact investiq.helpdesk@gmail.com
          </p>
        </div>
      `;

      const info = await transporter.sendMail({
        from: '"InvestIQ Alerts" <' + fromAddr + '>',
        to: recipientEmail,
        subject: \`InvestIQ Alert: \${symbol}\`,
        text: \`Hello \${recipientEmail.split('@')[0]},\n\nInvestIQ Alert Triggered for \${symbol}!\n\n\${message}\n\nTriggered at: \${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST\n\nInvestIQ — Your Financial Intelligence Hub\n\n---\nTo ensure delivery of future alerts, please add this email address to your contacts.\nYou are receiving this automated alert because you configured a price tracker at InvestIQ. If you wish to unsubscribe, you can delete your alert or account via the Support tab.\`,
        html: emailHtml,
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
