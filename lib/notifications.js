// Browser Notifications for price alerts

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function sendNotification(title, body, icon = '📊') {
  if (Notification.permission !== 'granted') return;
  const notification = new Notification(title, {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: `investiq-${Date.now()}`,
    requireInteraction: false,
  });
  notification.onclick = () => { window.focus(); notification.close(); };
  setTimeout(() => notification.close(), 10000);
}

export function checkPriceAlerts(alerts, currentPrices) {
  const triggered = [];
  for (const alert of alerts) {
    if (!alert.active) continue;
    const price = currentPrices[alert.symbol];
    if (!price) continue;
    
    if (alert.direction === 'above' && price >= alert.targetPrice) {
      triggered.push(alert);
      sendNotification(
        `🔔 Price Alert: ${alert.symbol}`,
        `${alert.symbol} has reached ₹${price.toFixed(2)} (above your target of ₹${alert.targetPrice})`
      );
    } else if (alert.direction === 'below' && price <= alert.targetPrice) {
      triggered.push(alert);
      sendNotification(
        `🔔 Price Alert: ${alert.symbol}`,
        `${alert.symbol} has dropped to ₹${price.toFixed(2)} (below your target of ₹${alert.targetPrice})`
      );
    }
  }
  return triggered;
}

export function notifySectorChange(sector, change) {
  if (Math.abs(change) >= 2) {
    const direction = change > 0 ? '📈' : '📉';
    sendNotification(
      `${direction} Sector Alert: ${sector}`,
      `${sector} sector has moved ${change > 0 ? '+' : ''}${change.toFixed(2)}% today`
    );
  }
}
