const YahooFinance = require('yahoo-finance2').default;
try {
  const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
  yf.quote('TCS.NS').then(r => console.log('Price:', r.regularMarketPrice)).catch(e => console.error('Quote Error:', e));
} catch(e) {
  console.error('Init Error:', e);
}
