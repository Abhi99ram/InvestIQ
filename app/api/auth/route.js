import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { saveUser, getUserByEmail, getUserByMobile, updateUserPassword, updateUserPasswordByEmail, saveOtp, verifyOtp } from '../../../lib/cloudDB';

export const dynamic = 'force-dynamic';

async function sendEmailOtp(email, otp) {
  try {
    const gmailUser = 'investiq.helpdesk@gmail.com';
    const gmailPass = process.env.GMAIL_APP_PASSWORD && process.env.GMAIL_APP_PASSWORD !== 'YOUR_GMAIL_APP_PASSWORD_HERE'
      ? process.env.GMAIL_APP_PASSWORD
      : 'mhne tsvo hbfl xmdi';

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPass },
    });


    const emailHtml = `
      <div style="font-family:sans-serif;max-width:400px;margin:auto;padding:20px;border:1px solid #eee;border-radius:10px;">
        <h2 style="color:#38bdf8;">InvestIQ OTP Verification</h2>
        <p>Your password reset OTP is:</p>
        <h1 style="letter-spacing:4px;color:#1e293b;background:#f1f5f9;padding:10px;text-align:center;border-radius:6px;">${otp}</h1>
        <p style="font-size:12px;color:#64748b;">This OTP is valid for 10 minutes. Do not share it with anyone.</p>
        <hr style="border:none;border-top:1px solid #eee;margin-top:20px;" />
        <p style="font-size:11px;color:#94a3b8;line-height:1.4;">
          <strong>To ensure delivery of future alerts, please add this email address to your contacts.</strong><br/>
          You are receiving this email because you registered an account at InvestIQ. If you did not request this, please ignore it.<br/>
          For support, contact investiq.helpdesk@gmail.com
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: '"InvestIQ Support" <' + gmailUser + '>',
      to: email,
      subject: `InvestIQ Password Reset OTP: ${otp}`,
      text: `Your InvestIQ OTP is: ${otp}\n\nThis OTP is valid for 10 minutes. Do not share it with anyone.\n\nTo ensure delivery of future alerts, please add this email address to your contacts.\n\nYou are receiving this email because you registered an account at InvestIQ. For support, contact investiq.helpdesk@gmail.com`,
      html: emailHtml,
    });
    console.log(`[OTP Email] Sent to ${email} successfully.`);
    return true;
  } catch (error) {
    console.error('[OTP Email Error]', error.message);
    return false;
  }
}

async function sendWelcomeEmail(email, name) {
  try {
    const gmailUser = 'investiq.helpdesk@gmail.com';
    const gmailPass = process.env.GMAIL_APP_PASSWORD && process.env.GMAIL_APP_PASSWORD !== 'YOUR_GMAIL_APP_PASSWORD_HERE'
      ? process.env.GMAIL_APP_PASSWORD
      : 'mhne tsvo hbfl xmdi';

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPass },
    });


    const emailHtml = `
      <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:20px;border:1px solid #eee;border-radius:10px;">
        <h2 style="color:#38bdf8;">Welcome to InvestIQ, ${name}!</h2>
        <p>We are thrilled to have you on board. InvestIQ is your 24/7 intelligent market companion.</p>
        <p><strong>What you can do now:</strong></p>
        <ul>
          <li>Set up Price Alerts to get notified instantly</li>
          <li>Analyze company financials with our AI insights</li>
          <li>Track market trends in real-time</li>
        </ul>
        <p style="margin-top:20px;">If you have any questions, simply reply to this email!</p>
        <p style="font-size:12px;color:#64748b;">Happy Investing,<br/>The InvestIQ Team</p>
        <hr style="border:none;border-top:1px solid #eee;margin-top:20px;" />
        <p style="font-size:11px;color:#94a3b8;line-height:1.4;">
          <strong>To ensure delivery of future alerts, please add this email address to your contacts.</strong><br/>
          You are receiving this email because you registered an account at InvestIQ. If you wish to unsubscribe, you can delete your account via the Support tab.<br/>
          For support, contact investiq.helpdesk@gmail.com
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: '"InvestIQ" <' + gmailUser + '>',
      to: email,
      subject: `Welcome to InvestIQ, ${name}!`,
      text: `Welcome to InvestIQ, ${name}!\n\nWe are thrilled to have you on board. InvestIQ is your 24/7 intelligent market companion.\n\nWhat you can do now:\n- Set up Price Alerts to get notified instantly\n- Analyze company financials with our AI insights\n- Track market trends in real-time\n\nIf you have any questions, simply reply to this email!\n\nHappy Investing,\nThe InvestIQ Team\n\n---\nTo ensure delivery of future alerts, please add this email address to your contacts.\nYou are receiving this email because you registered an account at InvestIQ. If you wish to unsubscribe, you can delete your account via the Support tab.`,
      html: emailHtml,
    });
    return true;
  } catch (error) {
    console.error('[Welcome Email Error]', error.message);
    return false;
  }
}

async function sendSmsOtp(mobile, otp) {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) {
    console.error('[OTP] FAST2SMS_API_KEY not set');
    return false;
  }

  // Normalize mobile — strip country code prefix if present
  const mobileClean = mobile.replace(/^\+91/, '').replace(/\s+/g, '').trim();

  try {
    const url = new URL('https://www.fast2sms.com/dev/bulkV2');
    url.searchParams.set('authorization', apiKey);
    url.searchParams.set('variables_values', otp);
    url.searchParams.set('route', 'otp');
    url.searchParams.set('numbers', mobileClean);

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'cache-control': 'no-cache' },
    });

    const data = await res.json();
    console.log('[Fast2SMS OTP Response]', JSON.stringify(data));

    if (data.return === true) {
      console.log(`[OTP] Sent to ${mobileClean} successfully.`);
      return true;
    } else {
      console.error('[OTP] Fast2SMS error:', data.message);
      return false;
    }
  } catch (err) {
    console.error('[OTP] Network error:', err.message);
    return false;
  }
}

export async function POST(request) {
  try {
    const { action, name, email, password, mobile, identifier } = await request.json();

    if (action === 'signup') {
      if (!name || !email || !password || !mobile) {
        return NextResponse.json({ error: 'Name, email, mobile, and password are required' }, { status: 400 });
      }
      if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
      }
      if (!/^[0-9]{10}$/.test(mobile)) {
        return NextResponse.json({ error: 'Invalid mobile number' }, { status: 400 });
      }

      // Check BOTH email and mobile
      const existingEmail = await getUserByEmail(email);
      if (existingEmail) {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
      }
      
      const existingMobile = await getUserByMobile(mobile);
      if (existingMobile) {
        return NextResponse.json({ error: 'An account with this mobile number already exists' }, { status: 400 });
      }

      const newUser = {
        id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name,
        email,
        password,
        mobile,
        createdAt: new Date().toISOString(),
        alerts: [],
      };

      try {
        await saveUser(newUser);
        await sendWelcomeEmail(email, name);
      } catch (saveErr) {
        console.error('[Signup] Save failed:', saveErr.message);
        return NextResponse.json({ error: 'Failed to create account. Please try again in a moment.' }, { status: 500 });
      }

      return NextResponse.json({ success: true, user: { id: newUser.id, name: newUser.name, email: newUser.email, mobile: newUser.mobile } });
    }

    if (action === 'login') {
      const user = await getUserByEmail(email);
      if (!user || user.password !== password) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }
      return NextResponse.json({ success: true, user: { id: user.id, name: user.name, email: user.email, mobile: user.mobile } });
    }

    if (action === 'send-otp') {
      if (!identifier) return NextResponse.json({ error: 'Identifier required' }, { status: 400 });

      const isEmail = identifier.includes('@');
      let user = null;
      if (isEmail) {
        user = await getUserByEmail(identifier);
      } else {
        user = await getUserByMobile(identifier);
      }

      if (!user) {
        return NextResponse.json({ error: 'No account found with this identifier' }, { status: 404 });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Store OTP securely in Prisma database
      await saveOtp(identifier, otp, isEmail);

      let sent = false;
      if (isEmail) {
        sent = await sendEmailOtp(identifier, otp);
      } else {
        sent = await sendSmsOtp(identifier, otp);
      }

      if (!sent) {
        console.log(`[OTP FALLBACK] To: ${identifier} | OTP: ${otp}`);
        return NextResponse.json({ error: 'Failed to send OTP. Please try again.' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: `OTP sent successfully` });
    }

    if (action === 'verify-otp') {
      if (!identifier || !password) {
        return NextResponse.json({ error: 'Identifier and OTP required' }, { status: 400 });
      }
      
      const isEmail = identifier.includes('@');
      const isValid = await verifyOtp(identifier, password, isEmail);
      
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid or expired OTP. Please try again.' }, { status: 400 });
      }

      // OTP verified
      return NextResponse.json({ success: true, message: 'OTP verified' });
    }

    if (action === 'reset-password') {
      if (!identifier || !password) {
        return NextResponse.json({ error: 'Identifier and new password required' }, { status: 400 });
      }
      const isEmail = identifier.includes('@');
      
      let user = null;
      if (isEmail) user = await getUserByEmail(identifier);
      else user = await getUserByMobile(identifier);
      
      if (!user) {
        return NextResponse.json({ error: 'No account found' }, { status: 404 });
      }

      if (isEmail) {
        await updateUserPasswordByEmail(identifier, password);
      } else {
        await updateUserPassword(identifier, password);
      }

      return NextResponse.json({ success: true, message: 'Password reset successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Auth Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
