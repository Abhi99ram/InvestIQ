import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const globalForPrisma = global;
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const dynamic = 'force-dynamic';

async function sendAlertEmail(email, name, symbol, targetPrice, currentPrice, direction) {
  try {
    const gmailUser = 'investiq.helpdesk@gmail.com';
    const gmailPass = process.env.GMAIL_APP_PASSWORD && process.env.GMAIL_APP_PASSWORD !== 'YOUR_GMAIL_APP_PASSWORD_HERE'
      ? process.env.GMAIL_APP_PASSWORD
      : 'mhne tsvo hbfl xmdi';

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPass },
    });


    const isGain = direction === 'above';
    const color = isGain ? '#22c55e' : '#ef4444';
    const icon = isGain ? '📈' : '📉';

    const emailHtml = `
      <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:20px;border:1px solid #eee;border-radius:10px;">
        <h2 style="color:${color};">InvestIQ Price Alert Triggered</h2>
        <p>Hi ${name || 'Investor'},</p>
        <p>Your price alert for <strong>${symbol}</strong> has just been triggered!</p>
        <div style="background:#f8fafc;padding:15px;border-radius:8px;margin:20px 0;">
          <p style="margin:5px 0;"><strong>Condition:</strong> Price goes ${direction} ₹${targetPrice}</p>
          <p style="margin:5px 0;font-size:18px;color:${color};"><strong>Current Price:</strong> ₹${currentPrice.toFixed(2)}</p>
        </div>
        <p>Log in to InvestIQ to view your portfolio and take action.</p>
        <hr style="border:none;border-top:1px solid #eee;margin-top:30px;" />
        <p style="font-size:11px;color:#94a3b8;line-height:1.4;">
          <strong>To ensure delivery of future alerts, please add this email address to your contacts.</strong><br/>
          You are receiving this automated alert because you configured a price tracker at InvestIQ. If you wish to stop receiving these, please log in and delete the alert, or delete your account via the Support tab.<br/>
          For support, contact investiq.helpdesk@gmail.com
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: '"InvestIQ Alerts" <' + gmailUser + '>',
      to: email,
      subject: `Alert: ${symbol} is now ₹${currentPrice.toFixed(2)}`,
      text: `InvestIQ Price Alert Triggered\n\nHi ${name || 'Investor'},\n\nYour price alert for ${symbol} has just been triggered!\nCondition: Price goes ${direction} ₹${targetPrice}\nCurrent Price: ₹${currentPrice.toFixed(2)}\n\nLog in to InvestIQ to view your portfolio and take action.\n\n---\nTo ensure delivery of future alerts, please add this email address to your contacts.\nYou are receiving this automated alert because you configured a price tracker at InvestIQ. If you wish to unsubscribe, you can delete your alert or account via the Support tab.`,
      html: emailHtml,
    });
    return true;
  } catch (error) {
    console.error('[Cron Email Error]', error.message);
    return false;
  }
}

export async function GET(request) {
  const debug = [];
  try {
    const users = await prisma.user.findMany();
    debug.push(`Found ${users.length} users`);
    
    let symbolsToFetch = new Set();
    let userAlertsMap = [];

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
        debug.push(`User ${user.email} has ${activeAlerts.length} active alerts`);
      }
    }

    if (symbolsToFetch.size === 0) {
      return NextResponse.json({ success: true, message: 'No active alerts to process', debug });
    }

    const prices = {};
    const symbolsArray = Array.from(symbolsToFetch);
    debug.push(`Fetching prices for: ${symbolsArray.join(',')}`);
    
    for (const sym of symbolsArray) {
      try {
        const result = await yahooFinance.quote(sym);
        if (result && result.regularMarketPrice) {
          prices[sym] = result.regularMarketPrice;
          debug.push(`Price for ${sym}: ${prices[sym]}`);
        }
      } catch (err) {
        debug.push(`Failed to fetch ${sym}: ${err.message}`);
      }
    }

    let emailsSent = 0;

    for (const userEntry of userAlertsMap) {
      const { user, allAlerts, activeAlerts } = userEntry;
      let userUpdated = false;

      for (const alert of activeAlerts) {
        const currentPrice = prices[alert.symbol];
        if (!currentPrice) {
          debug.push(`No price found for ${alert.symbol}`);
          continue;
        }

        const conditionMet = (alert.direction === 'above' && currentPrice >= alert.targetPrice) ||
                             (alert.direction === 'below' && currentPrice <= alert.targetPrice) ||
                             (alert.direction === 'equal' && currentPrice === alert.targetPrice);

        debug.push(`Evaluating ${alert.symbol} for ${user.email}: current=${currentPrice}, target=${alert.targetPrice}, dir=${alert.direction}, met=${conditionMet}`);

        if (conditionMet) {
          const sent = await sendAlertEmail(user.email, user.name, alert.symbol, alert.targetPrice, currentPrice, alert.direction);
          debug.push(`Email sent result for ${user.email}: ${sent}`);
          if (sent) {
            emailsSent++;
            const alertIndex = allAlerts.findIndex(a => a.id === alert.id);
            if (alertIndex > -1) {
              allAlerts[alertIndex].active = false;
              allAlerts[alertIndex].triggered = true;
              allAlerts[alertIndex].triggeredTime = Date.now();
              userUpdated = true;
            }
          }
        }
      }

      if (userUpdated) {
        await prisma.user.update({
          where: { id: user.id },
          data: { alerts: allAlerts }
        });
        debug.push(`Updated DB for ${user.email}`);
      }
    }

    return NextResponse.json({ success: true, message: `Processed alerts. Emails sent: ${emailsSent}`, debug });
  } catch (error) {
    debug.push(`Fatal Error: ${error.message}`);
    return NextResponse.json({ error: 'Internal server error', debug }, { status: 500 });
  }
}

