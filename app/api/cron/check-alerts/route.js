import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import yahooFinance from 'yahoo-finance2';

const globalForPrisma = global;
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const dynamic = 'force-dynamic';

async function sendAlertEmail(email, name, symbol, targetPrice, currentPrice, direction) {
  try {
    const gmailUser = 'investiq.helpdesk@gmail.com';
    const gmailPass = process.env.GMAIL_APP_PASSWORD;
    if (!gmailPass || gmailPass === 'YOUR_GMAIL_APP_PASSWORD_HERE') return false;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPass },
    });

    const isGain = direction === 'above';
    const color = isGain ? '#22c55e' : '#ef4444';
    const icon = isGain ? '📈' : '📉';

    const emailHtml = `
      <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:20px;border:1px solid #eee;border-radius:10px;">
        <h2 style="color:${color};">InvestIQ Price Alert Triggered ${icon}</h2>
        <p>Hi ${name || 'Investor'},</p>
        <p>Your price alert for <strong>${symbol}</strong> has just been triggered!</p>
        <div style="background:#f8fafc;padding:15px;border-radius:8px;margin:20px 0;">
          <p style="margin:5px 0;"><strong>Condition:</strong> Price goes ${direction} ₹${targetPrice}</p>
          <p style="margin:5px 0;font-size:18px;color:${color};"><strong>Current Price:</strong> ₹${currentPrice.toFixed(2)}</p>
        </div>
        <p>Log in to InvestIQ to view your portfolio and take action.</p>
        <p style="font-size:12px;color:#64748b;margin-top:30px;">This is an automated 24/7 background alert.</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"InvestIQ Alerts" <${gmailUser}>`,
      to: email,
      subject: `🚨 Alert: ${symbol} is now ₹${currentPrice.toFixed(2)}`,
      html: emailHtml,
    });
    return true;
  } catch (error) {
    console.error('[Cron Email Error]', error.message);
    return false;
  }
}

export async function GET(request) {
  try {
    // 1. Fetch all users
    const users = await prisma.user.findMany();
    
    let symbolsToFetch = new Set();
    let userAlertsMap = [];

    // 2. Collect all active stock alerts
    for (const user of users) {
      let alerts = [];
      if (user.alerts && Array.isArray(user.alerts)) {
        alerts = user.alerts;
      } else if (typeof user.alerts === 'string') {
        try { alerts = JSON.parse(user.alerts); } catch (e) {}
      }

      const activeAlerts = alerts.filter(a => a.active && a.symbol && a.targetPrice);
      if (activeAlerts.length > 0) {
        activeAlerts.forEach(a => symbolsToFetch.add(a.symbol));
        userAlertsMap.push({ user, allAlerts: alerts, activeAlerts });
      }
    }

    if (symbolsToFetch.size === 0) {
      return NextResponse.json({ success: true, message: 'No active alerts to process' });
    }

    // 3. Fetch live prices
    const prices = {};
    const symbolsArray = Array.from(symbolsToFetch);
    
    // Batch fetch from yahoo finance
    for (const sym of symbolsArray) {
      try {
        const result = await yahooFinance.quote(sym);
        if (result && result.regularMarketPrice) {
          prices[sym] = result.regularMarketPrice;
        }
      } catch (err) {
        console.error(`[Cron] Failed to fetch price for ${sym}`);
      }
    }

    // 4. Evaluate conditions & send emails
    let emailsSent = 0;

    for (const userEntry of userAlertsMap) {
      const { user, allAlerts, activeAlerts } = userEntry;
      let userUpdated = false;

      for (const alert of activeAlerts) {
        const currentPrice = prices[alert.symbol];
        if (!currentPrice) continue;

        const conditionMet = (alert.direction === 'above' && currentPrice >= alert.targetPrice) ||
                             (alert.direction === 'below' && currentPrice <= alert.targetPrice);

        if (conditionMet) {
          // Send Email
          const sent = await sendAlertEmail(user.email, user.name, alert.symbol, alert.targetPrice, currentPrice, alert.direction);
          if (sent) {
            emailsSent++;
            // Mark alert as inactive
            const alertIndex = allAlerts.findIndex(a => a.id === alert.id);
            if (alertIndex > -1) {
              allAlerts[alertIndex].active = false;
              userUpdated = true;
            }
          }
        }
      }

      // 5. Update user alerts in DB if any were triggered
      if (userUpdated) {
        await prisma.user.update({
          where: { id: user.id },
          data: { alerts: allAlerts }
        });
      }
    }

    return NextResponse.json({ success: true, message: `Processed alerts. Emails sent: ${emailsSent}` });
  } catch (error) {
    console.error('[Cron Job Error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
