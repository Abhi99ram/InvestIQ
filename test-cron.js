const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const yahooFinance = require('yahoo-finance2').default;

const prisma = new PrismaClient();

async function GET() {
  try {
    const users = await prisma.user.findMany();
    
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
      }
    }

    console.log("Users to check:", userAlertsMap.length);

    if (symbolsToFetch.size === 0) {
      console.log('No active alerts to process');
      return;
    }

    const prices = {};
    const symbolsArray = Array.from(symbolsToFetch);
    
    for (const sym of symbolsArray) {
      try {
        const result = await yahooFinance.quote(sym);
        if (result && result.regularMarketPrice) {
          prices[sym] = result.regularMarketPrice;
          console.log(`Live price for ${sym}:`, prices[sym]);
        }
      } catch (err) {
        console.error(`[Cron] Failed to fetch price for ${sym}`, err);
      }
    }

    let emailsSent = 0;

    for (const userEntry of userAlertsMap) {
      const { user, allAlerts, activeAlerts } = userEntry;

      for (const alert of activeAlerts) {
        const currentPrice = prices[alert.symbol];
        if (!currentPrice) continue;

        const conditionMet = (alert.direction === 'above' && currentPrice >= alert.targetPrice) ||
                             (alert.direction === 'below' && currentPrice <= alert.targetPrice);

        if (conditionMet) {
          console.log(`Condition MET for ${user.email}: ${alert.symbol} ${alert.direction} ${alert.targetPrice} (Price is ${currentPrice})`);
          emailsSent++;
        } else {
          console.log(`Condition NOT MET for ${user.email}: ${alert.symbol} ${alert.direction} ${alert.targetPrice} (Price is ${currentPrice})`);
        }
      }
    }

    console.log(`Processed alerts. Emails sent: ${emailsSent}`);
  } catch (error) {
    console.error('[Cron Job Error]', error);
  } finally {
    await prisma.$disconnect();
  }
}

GET();
