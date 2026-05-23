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
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 450px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b; line-height: 1.6;">
        <h2 style="color: #0f172a; font-size: 20px; font-weight: 600; margin-top: 0; margin-bottom: 16px;">InvestIQ Security Verification</h2>
        <p style="margin-top: 0; margin-bottom: 16px;">Hello,</p>
        <p style="margin-top: 0; margin-bottom: 16px;">A password reset request was initiated for your InvestIQ account. Please use the verification code below to authorize this request:</p>
        <div style="letter-spacing: 4px; color: #0f172a; font-size: 24px; font-weight: 700; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; text-align: center; border-radius: 8px; margin: 20px 0; font-family: monospace;">${otp}</div>
        <p style="font-size: 12px; color: #64748b; margin-top: 0; margin-bottom: 20px;">This code is valid for 10 minutes. For security, do not share this code with anyone.</p>
        <p style="font-size: 12px; color: #64748b; margin-top: 0; margin-bottom: 20px;">If you did not initiate this request, you can safely ignore this message. Your password will remain unchanged.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 25px; margin-bottom: 15px;" />
        <p style="font-size: 11px; color: #94a3b8; line-height: 1.5; margin: 0;">
          This is an automated security message. Please do not reply directly to this email. For assistance, contact support at <a href="mailto:investiq.helpdesk@gmail.com" style="color: #94a3b8; text-decoration: underline;">investiq.helpdesk@gmail.com</a>.
        </p>
      </div>
    `;

    const emailText = `Hello,\n\nA password reset request was initiated for your InvestIQ account. Please use the verification code below to authorize this request:\n\nVerification Code: ${otp}\n\nThis code is valid for 10 minutes. For security, do not share this code with anyone.\n\nIf you did not initiate this request, you can safely ignore this message. Your password will remain unchanged.\n\n---\nThis is an automated security message. Please do not reply directly to this email. For assistance, contact support at investiq.helpdesk@gmail.com.`;

    await transporter.sendMail({
      from: '"InvestIQ Helpdesk" <' + gmailUser + '>',
      to: email,
      subject: `InvestIQ Security Verification Code: ${otp}`,
      text: emailText,
      html: emailHtml,
      replyTo: 'investiq.helpdesk@gmail.com'
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
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b; line-height: 1.6;">
        <h2 style="color: #0f172a; font-size: 22px; font-weight: 600; margin-top: 0; margin-bottom: 16px;">Welcome to InvestIQ</h2>
        <p style="margin-top: 0; margin-bottom: 16px;">Hello ${name},</p>
        <p style="margin-top: 0; margin-bottom: 16px;">Thank you for registering an account on InvestIQ. We are writing to confirm that your account registration was successful and is now fully active.</p>
        <p style="margin-top: 0; margin-bottom: 16px;">Your user dashboard offers several tools to help monitor and manage your financial interests:</p>
        <ul style="margin-top: 0; margin-bottom: 24px; padding-left: 20px;">
          <li style="margin-bottom: 8px;"><strong>Custom Alerts:</strong> Configure customizable notifications for price updates.</li>
          <li style="margin-bottom: 8px;"><strong>Financial Analysis:</strong> Review key metrics and financial reports for tracked entities.</li>
          <li style="margin-bottom: 8px;"><strong>Personal Dashboard:</strong> Access clean, comprehensive real-time dashboard data.</li>
        </ul>
        <p style="margin-top: 0; margin-bottom: 24px;">If you have any questions or require support, please contact us by replying directly to this email.</p>
        <p style="margin-top: 0; margin-bottom: 0;">Sincerely,</p>
        <p style="margin-top: 4px; margin-bottom: 0; font-weight: 500; color: #475569;">The InvestIQ Support Team</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 30px; margin-bottom: 20px;" />
        <p style="font-size: 11px; color: #94a3b8; line-height: 1.5; margin: 0;">
          This is a transactional message sent to confirm your registration on InvestIQ. If you did not sign up for this account, please let us know at <a href="mailto:investiq.helpdesk@gmail.com" style="color: #94a3b8; text-decoration: underline;">investiq.helpdesk@gmail.com</a>.
        </p>
      </div>
    `;

    const emailText = `Hello ${name},\n\nThank you for registering an account on InvestIQ. We are writing to confirm that your account registration was successful and is now fully active.\n\nYour user dashboard offers several tools to help monitor and manage your financial interests:\n- Custom Alerts: Configure customizable notifications for price updates.\n- Financial Analysis: Review key metrics and financial reports for tracked entities.\n- Personal Dashboard: Access clean, comprehensive real-time dashboard data.\n\nIf you have any questions or require support, please contact us by replying directly to this email.\n\nSincerely,\nThe InvestIQ Support Team\n\n---\nThis is a transactional message sent to confirm your registration on InvestIQ. If you did not sign up for this account, please let us know at investiq.helpdesk@gmail.com.`;

    await transporter.sendMail({
      from: '"InvestIQ Helpdesk" <' + gmailUser + '>',
      to: email,
      subject: `Welcome to InvestIQ - Your Account Details`,
      text: emailText,
      html: emailHtml,
      replyTo: 'investiq.helpdesk@gmail.com'
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

      if (!identifier.includes('@')) {
        return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
      }

      const isEmail = true;
      let user = await getUserByEmail(identifier);

      if (!user) {
        return NextResponse.json({ error: 'No account found with this email' }, { status: 404 });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Store OTP securely in Prisma database
      await saveOtp(identifier, otp, isEmail);

      const sent = await sendEmailOtp(identifier, otp);

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
      
      const isEmail = true;
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
      
      const user = await getUserByEmail(identifier);
      
      if (!user) {
        return NextResponse.json({ error: 'No account found' }, { status: 404 });
      }

      await updateUserPasswordByEmail(identifier, password);

      return NextResponse.json({ success: true, message: 'Password reset successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Auth Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
