// Sector definitions with constituent stocks for BSE, NSE, and US markets

export const SECTORS = {
  'Information Technology': {
    color: '#38bdf8',
    icon: '💻',
    nse: ['TCS.NS','INFY.NS','WIPRO.NS','HCLTECH.NS','TECHM.NS','LTIM.NS','MPHASIS.NS','COFORGE.NS','PERSISTENT.NS','LTTS.NS'],
    bse: ['TCS.BO','INFY.BO','WIPRO.BO','HCLTECH.BO','TECHM.BO'],
    us: ['AAPL','MSFT','GOOGL','META','NVDA','AMD','CRM','ORCL','INTC','ADBE'],
    etf: { nse: 'NIFTTY_IT.NS', us: 'XLK' }
  },
  'Banking & Finance': {
    color: '#34d399',
    icon: '🏦',
    nse: ['HDFCBANK.NS','ICICIBANK.NS','SBIN.NS','KOTAKBANK.NS','AXISBANK.NS','INDUSINDBK.NS','BANKBARODA.NS','PNB.NS','FEDERALBNK.NS','IDFCFIRSTB.NS'],
    bse: ['HDFCBANK.BO','ICICIBANK.BO','SBIN.BO','KOTAKBANK.BO','AXISBANK.BO'],
    us: ['JPM','BAC','WFC','GS','MS','C','USB','PNC','SCHW','BLK'],
    etf: { nse: 'BANKNIFTY.NS', us: 'XLF' }
  },
  'Pharmaceuticals': {
    color: '#a78bfa',
    icon: '💊',
    nse: ['SUNPHARMA.NS','DRREDDY.NS','CIPLA.NS','DIVISLAB.NS','APOLLOHOSP.NS','BIOCON.NS','LUPIN.NS','AUROPHARMA.NS','TORNTPHARM.NS','ALKEM.NS'],
    bse: ['SUNPHARMA.BO','DRREDDY.BO','CIPLA.BO','DIVISLAB.BO'],
    us: ['JNJ','PFE','UNH','MRK','ABBV','LLY','TMO','ABT','AMGN','GILD'],
    etf: { us: 'XLV' }
  },
  'Energy & Oil': {
    color: '#fbbf24',
    icon: '⚡',
    nse: ['RELIANCE.NS','ONGC.NS','NTPC.NS','POWERGRID.NS','ADANIGREEN.NS','TATAPOWER.NS','BPCL.NS','IOC.NS','GAIL.NS','COALINDIA.NS'],
    bse: ['RELIANCE.BO','ONGC.BO','NTPC.BO','POWERGRID.BO'],
    us: ['XOM','CVX','COP','SLB','EOG','MPC','PSX','VLO','OXY','HAL'],
    etf: { us: 'XLE' }
  },
  'Automobile': {
    color: '#f472b6',
    icon: '🚗',
    nse: ['MARUTI.NS','TATAMOTORS.NS','M&M.NS','BAJAJ-AUTO.NS','HEROMOTOCO.NS','EICHERMOT.NS','ASHOKLEY.NS','TVSMOTOR.NS','BHARATFORG.NS','MRF.NS'],
    bse: ['MARUTI.BO','TATAMOTORS.BO','M&M.BO','BAJAJ-AUTO.BO'],
    us: ['TSLA','F','GM','TM','RIVN','LCID','NIO','LI','STLA','RACE'],
    etf: { us: 'CARZ' }
  },
  'FMCG': {
    color: '#fb923c',
    icon: '🛒',
    nse: ['HINDUNILVR.NS','ITC.NS','NESTLEIND.NS','BRITANNIA.NS','DABUR.NS','MARICO.NS','GODREJCP.NS','COLPAL.NS','TATACONSUM.NS','VBL.NS'],
    bse: ['HINDUNILVR.BO','ITC.BO','NESTLEIND.BO','BRITANNIA.BO'],
    us: ['PG','KO','PEP','COST','WMT','CL','KMB','MDLZ','GIS','K'],
    etf: { us: 'XLP' }
  },
  'Metals & Mining': {
    color: '#94a3b8',
    icon: '⛏️',
    nse: ['TATASTEEL.NS','HINDALCO.NS','JSWSTEEL.NS','VEDL.NS','COALINDIA.NS','NMDC.NS','SAIL.NS','NATIONALUM.NS','MOIL.NS','HINDCOPPER.NS'],
    bse: ['TATASTEEL.BO','HINDALCO.BO','JSWSTEEL.BO','VEDL.BO'],
    us: ['NEM','FCX','NUE','STLD','CLF','AA','X','VALE','RIO','BHP'],
    etf: { us: 'XLB' }
  },
  'Real Estate': {
    color: '#2dd4bf',
    icon: '🏢',
    nse: ['DLF.NS','GODREJPROP.NS','OBEROIRLTY.NS','PHOENIXLTD.NS','PRESTIGE.NS','LODHA.NS','SOBHA.NS','BRIGADE.NS','SUNTECK.NS','MAHLIFE.NS'],
    bse: ['DLF.BO','GODREJPROP.BO','OBEROIRLTY.BO'],
    us: ['AMT','PLD','CCI','EQIX','SPG','PSA','DLR','O','VICI','WELL'],
    etf: { us: 'XLRE' }
  },
  'Telecom': {
    color: '#60a5fa',
    icon: '📡',
    nse: ['BHARTIARTL.NS','IDEA.NS','TATACOMM.NS','ROUTE.NS','STERLITE.NS'],
    bse: ['BHARTIARTL.BO','IDEA.BO'],
    us: ['T','VZ','TMUS','LUMN','CHTR','CMCSA'],
    etf: { us: 'XLC' }
  },
  'Consumer Discretionary': {
    color: '#e879f9',
    icon: '🎯',
    nse: ['TITAN.NS','TRENT.NS','PAGEIND.NS','RAJESHEXPO.NS','RELAXO.NS','BATAINDIA.NS','WHIRLPOOL.NS','HAVELLS.NS','VOLTAS.NS','CROMPTON.NS'],
    bse: ['TITAN.BO','TRENT.BO','PAGEIND.BO'],
    us: ['AMZN','HD','NKE','SBUX','MCD','LOW','TJX','BKNG','CMG','LULU'],
    etf: { us: 'XLY' }
  }
};

export const MAJOR_INDICES = [
  // Indian Indices
  { symbol: '^NSEI',    name: 'NIFTY 50',   exchange: 'NSE',    country: '🇮🇳', group: 'india' },
  { symbol: '^BSESN',  name: 'SENSEX',      exchange: 'BSE',    country: '🇮🇳', group: 'india' },
  { symbol: '^NSEBANK', name: 'BANK NIFTY', exchange: 'NSE',    country: '🇮🇳', group: 'india' },
  // US Indices
  { symbol: '^GSPC',   name: 'S&P 500',     exchange: 'NYSE',   country: '🇺🇸', group: 'us' },
  { symbol: '^IXIC',   name: 'NASDAQ',      exchange: 'NASDAQ', country: '🇺🇸', group: 'us' },
  { symbol: '^DJI',    name: 'DOW JONES',   exchange: 'NYSE',   country: '🇺🇸', group: 'us' },
  // Commodities & Forex
  { symbol: 'GC=F',    name: 'GOLD',        exchange: 'MCX/COMEX', country: '🥇', group: 'commodity', unit: 'USD/oz' },
  { symbol: 'SI=F',    name: 'SILVER',      exchange: 'MCX/COMEX', country: '⚪', group: 'commodity', unit: 'USD/oz' },
  { symbol: 'USDINR=X', name: 'USD/INR',   exchange: 'FOREX',  country: '💱', group: 'forex', unit: '₹' },
  { symbol: 'CL=F',   name: 'CRUDE OIL',   exchange: 'NYMEX',  country: '🛢️', group: 'commodity', unit: 'USD/bbl' },
];

export function getSectorColor(sectorName) {
  return SECTORS[sectorName]?.color || '#94a3b8';
}

export function getSectorStocks(sectorName, exchange = 'all') {
  const sector = SECTORS[sectorName];
  if (!sector) return [];
  if (exchange === 'nse') return sector.nse || [];
  if (exchange === 'bse') return sector.bse || [];
  if (exchange === 'us') return sector.us || [];
  return [...(sector.nse || []), ...(sector.bse || []), ...(sector.us || [])];
}

export function findSectorForStock(symbol) {
  for (const [name, data] of Object.entries(SECTORS)) {
    const allStocks = [...(data.nse || []), ...(data.bse || []), ...(data.us || [])];
    if (allStocks.includes(symbol)) return name;
  }
  return null;
}

export function getAllSectorNames() {
  return Object.keys(SECTORS);
}
