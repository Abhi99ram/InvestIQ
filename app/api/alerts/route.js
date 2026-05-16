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
        <div style="font-family:sans-serif;max-width:520px;margin:auto;background:#0d1117;color:#e5e7eb;border-radius:12px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#1a3a5c,#0d2137);padding:24px;text-align:center;">
            <h2 style="color:#38bdf8;margin:0;font-size:20px;">⚡ InvestIQ Alert Triggered</h2>
          </div>
          <div style="padding:24px;">
            <p style="margin:0 0 12px;">Hello ${recipientEmail.split('@')[0]},</p>
            <div style="background:#161b22;border-left:4px solid #38bdf8;border-radius:8px;padding:16px;margin-bottom:16px;">
              <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#38bdf8;">📊 ${symbol}</p>
              <p style="margin:0;color:#cbd5e0;font-size:14px;">${message}</p>
            </div>
            <p style="font-size:12px;color:#6b7280;margin:0;">
              🕐 Triggered at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST<br/>
              InvestIQ — Your Financial Intelligence Hub
            </p>
          </div>
        </div>
      `;

      const info = await transporter.sendMail({
        from: `"InvestIQ Alerts" <${fromAddr}>`,
        to: recipientEmail,
        subject: `⚡ InvestIQ Alert: ${symbol}`,
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
