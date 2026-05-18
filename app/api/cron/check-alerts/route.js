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
    const accentColor = isGain ? '#16a34a' : '#dc2626'; // Professional darker green/red

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b; line-height: 1.6;">
        <h2 style="color: ${accentColor}; font-size: 20px; font-weight: 600; margin-top: 0; margin-bottom: 16px;">InvestIQ Price Alert Triggered</h2>
        <p style="margin-top: 0; margin-bottom: 16px;">Hello ${name || 'Investor'},</p>
        <p style="margin-top: 0; margin-bottom: 16px;">This message is to notify you that your price alert for <strong>${symbol}</strong> has been triggered.</p>
        
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569;"><strong>Trigger Condition:</strong> Price moved ${direction} ₹${targetPrice}</p>
          <p style="margin: 0; font-size: 18px; color: ${accentColor}; font-weight: bold;"><strong>Current Market Price:</strong> ₹${currentPrice.toFixed(2)}</p>
        </div>
        
        <p style="margin-top: 0; margin-bottom: 24px;">To view your watchlists or manage your notifications, please log in to your InvestIQ dashboard.</p>
        <p style="margin-top: 0; margin-bottom: 0;">Sincerely,</p>
        <p style="margin-top: 4px; margin-bottom: 0; font-weight: 500; color: #475569;">The InvestIQ Support Team</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 25px; margin-bottom: 15px;" />
        <p style="font-size: 11px; color: #94a3b8; line-height: 1.5; margin: 0;">
          You are receiving this automated alert because you configured a price tracker at InvestIQ. If you wish to stop receiving these alerts, you can manage or delete them in your user dashboard, or close your account via the Support page.
        </p>
      </div>
    `;

    const emailText = `Hello ${name || 'Investor'},\n\nThis message is to notify you that your price alert for ${symbol} has been triggered.\n\nTrigger Condition: Price moved ${direction} ₹${targetPrice}\nCurrent Market Price: ₹${currentPrice.toFixed(2)}\n\nTo view your watchlists or manage your notifications, please log in to your InvestIQ dashboard.\n\nSincerely,\nThe InvestIQ Support Team\n\n---\nYou are receiving this automated alert because you configured a price tracker at InvestIQ. If you wish to stop receiving these alerts, you can manage or delete them in your user dashboard, or close your account via the Support page.`;

    await transporter.sendMail({
      from: '"InvestIQ Alerts" <' + gmailUser + '>',
      to: email,
      subject: `InvestIQ Alert: ${symbol} is ₹${currentPrice.toFixed(2)}`,
      text: emailText,
      html: emailHtml,
      headers: {
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal',
        'Importance': 'Normal',
        'X-Auto-Response-Suppress': 'OOF, AutoReply',
        'Feedback-ID': 'price-alert:investiq'
      }
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

