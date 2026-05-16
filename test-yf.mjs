import yahooFinance from 'yahoo-finance2';
console.log('Type of yahooFinance:', typeof yahooFinance);
console.log('Keys:', Object.keys(yahooFinance));
yahooFinance.quote('TCS.NS').then(r => console.log('Price:', r.regularMarketPrice)).catch(e => console.error('Error:', e.message));
