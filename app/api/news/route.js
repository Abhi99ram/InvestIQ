import { NextResponse } from 'next/server';
import { callAI } from '../../lib/ai-provider';

export const dynamic = 'force-dynamic';

const SIX_MONTHS_MS = 183 * 24 * 60 * 60 * 1000; // 6 months

function isFresh(iso) {
  try {
    const d = new Date(iso);
    const now = Date.now();
    // Accept if within 6 months (past) OR up to 2 days in future (clock drift)
    return d.getTime() <= now + 2 * 86400000 && (now - d.getTime()) <= SIX_MONTHS_MS;
  } catch { return false; }
}

// ── SYMBOL → METRIC CONFIG MAP ────────────────────────────────────────────────
// mustContain: article MUST match at least 1 of these (case-insensitive) to pass
const SYMBOL_METRIC_MAP = {
  // ── Indian Indices ──────────────────────────────────────────────────────────
  '^NSEI': {
    label: 'Nifty 50',
    mustContain: ['nifty 50','nifty50','nifty','nse index','nifty fifty'],
    feeds: ['yahooNifty','etMarkets','mcMarkets','ndtvProfit','livemint','bqPrime','etSensex'],
    queries: ['Nifty 50 NSE India stock market today rally fall','Nifty50 index NSE FII DII bulk deal','India NSE Nifty 50 quarterly earnings expiry','Nifty 50 Bank Nifty F&O expiry circuit breaker'],
    region: 'IN',
  },
  '^BSESN': {
    label: 'Sensex BSE',
    mustContain: ['sensex','bse sensex','bombay stock exchange'],
    feeds: ['yahooNifty','etMarkets','mcMarkets','ndtvProfit','livemint','etSensex'],
    queries: ['BSE Sensex India stock market today rally fall','Sensex BSE FII DII India market performance','BSE Sensex Nifty earnings results quarterly India','India stock market BSE Sensex weekly performance'],
    region: 'IN',
  },
  '^NSEBANK': {
    label: 'Bank Nifty',
    mustContain: ['bank nifty','banknifty','nifty bank','nse bank'],
    feeds: ['rbi','etMarkets','mcMarkets','livemint','bqPrime'],
    queries: ['Bank Nifty NSE banking sector today India','Bank Nifty index RBI interest rate HDFC ICICI SBI weekly','India banking stocks NPA credit growth quarterly results','Bank Nifty options expiry weekly performance'],
    region: 'IN',
  },
  // ── Commodities: Gold ───────────────────────────────────────────────────────
  'GC=F': {
    label: 'Gold',
    mustContain: ['gold','bullion','yellow metal','mcx gold','comex gold','gold price','gold etf','sovereign gold','gold futures','gold rate','precious metal','gold demand','gold import','gold reserve'],
    feeds: ['yahooGold','bloombergComm'],
    queries: ['gold price today MCX India 10 gram rate bullion','gold COMEX futures price rally fall safe haven dollar','gold price India MCX rate import duty sovereign bond ETF','international gold price Federal Reserve inflation COMEX','gold demand jewelry investment central bank reserves'],
    region: null,
  },
  'GLD': {
    label: 'Gold ETF',
    mustContain: ['gold','bullion','gld','yellow metal','precious metal','gold etf','gold price'],
    feeds: ['yahooGold','bloombergComm'],
    queries: ['gold price ETF GLD COMEX today','gold bullion price rally fall investment'],
    region: null,
  },
  // ── Commodities: Silver ─────────────────────────────────────────────────────
  'SI=F': {
    label: 'Silver',
    mustContain: ['silver','mcx silver','comex silver','silver price','silver rate','silver futures','silver etf','white metal','silver demand','silver supply','silver industrial','precious metal silver'],
    feeds: ['yahooSilver','bloombergComm'],
    queries: ['silver price today MCX India per kg rate COMEX','silver COMEX futures SI price rally fall industrial demand','silver price India MCX rate solar energy demand supply','silver market outlook price forecast precious metal','silver industrial demand solar panel photovoltaic supply deficit'],
    region: null,
  },
  'SLV': {
    label: 'Silver ETF',
    mustContain: ['silver','slv','precious metal','silver price','silver etf'],
    feeds: ['yahooSilver','bloombergComm'],
    queries: ['silver price ETF SLV COMEX today','silver bullion price rally fall investment'],
    region: null,
  },
  // ── Commodities: Crude Oil ──────────────────────────────────────────────────
  'CL=F': {
    label: 'Crude Oil WTI',
    mustContain: ['crude oil','crude','oil price','wti','brent','opec','petroleum','barrel','petrol','diesel','nymex','energy price','oil market','oil supply','oil demand','oil futures'],
    feeds: ['yahooCrude','bloombergComm'],
    queries: ['crude oil price today WTI NYMEX OPEC production cut','crude oil price India import petrol diesel impact','WTI Brent crude oil price rally fall OPEC supply','oil price energy sector today barrel OPEC decision','crude oil market outlook demand supply geopolitics'],
    region: null,
  },
  'BZ=F': {
    label: 'Brent Crude Oil',
    mustContain: ['brent','crude oil','crude','oil price','opec','petroleum','barrel','energy price','oil market'],
    feeds: ['yahooCrude','bloombergComm'],
    queries: ['Brent crude oil price today OPEC energy supply','oil price market Brent WTI rally fall OPEC cut'],
    region: null,
  },
  // ── Forex: USD/INR ──────────────────────────────────────────────────────────
  'USDINR=X': {
    label: 'USD/INR',
    mustContain: ['rupee','dollar','usd/inr','usd inr','inr','forex','exchange rate','currency','rbi intervention','foreign exchange','dxy','dollar index','fii outflow','current account','trade deficit','remittance'],
    feeds: ['yahooRupee','investingForex'],
    queries: ['dollar rupee exchange rate RBI today USD INR forex','rupee vs dollar RBI intervention forex reserves FII DII','USD INR exchange rate India current account deficit trade','rupee dollar DXY dollar index Federal Reserve impact India','RBI monetary policy dollar rupee forex market today'],
    region: 'IN',
  },
  'INRUSD=X': {
    label: 'INR/USD',
    mustContain: ['rupee','dollar','usd','inr','forex','exchange rate','currency'],
    feeds: ['yahooRupee','investingForex'],
    queries: ['rupee dollar exchange rate RBI intervention forex','USD INR forex RBI reserves FII outflow'],
    region: 'IN',
  },
  // ── US Indices ──────────────────────────────────────────────────────────────
  '^GSPC': {
    label: 'S&P 500',
    mustContain: ['s&p 500','sp500','s&p500','nasdaq','dow jones','wall street','nyse','us stock','us market','federal reserve','fed rate','us economy','us stocks'],
    feeds: ['yahooUS','cnbc','marketwatch','bloombergMkts','wsj'],
    queries: ['S&P 500 stock market today NYSE rally fall Fed','SP500 index earnings quarterly results US market','US stock market S&P 500 Federal Reserve interest rate inflation','Wall Street S&P 500 quarterly earnings results outlook'],
    region: 'US',
  },
  '^DJI': {
    label: 'Dow Jones',
    mustContain: ['dow jones','djia','wall street','us stock','us market','nyse','federal reserve','us economy','nasdaq','s&p'],
    feeds: ['yahooUS','cnbc','marketwatch','bloombergMkts','wsj'],
    queries: ['Dow Jones Industrial Average today NYSE rally fall','Dow Jones DJIA earnings quarterly results Wall Street','Wall Street Dow Jones Federal Reserve interest rate','Dow Jones stocks earnings results quarterly outlook'],
    region: 'US',
  },
  '^IXIC': {
    label: 'NASDAQ',
    mustContain: ['nasdaq','nasdaq 100','qqq','tech stocks','technology stocks','us stock','us market','federal reserve','semiconductor','big tech','faang','magnificent seven'],
    feeds: ['yahooUS','cnbc','cnbcEarnings','marketwatch','bloombergMkts','bloombergTech'],
    queries: ['NASDAQ Composite stock market today tech earnings','NASDAQ index technology stocks quarterly results','NASDAQ tech stocks Fed interest rate growth outlook','NASDAQ 100 QQQ tech AI semiconductor earnings quarterly'],
    region: 'US',
  },
  '^FTSE': {
    label: 'FTSE 100',
    mustContain: ['ftse','london stock','uk stock','uk market','bank of england','sterling','pound','uk economy','footsie'],
    feeds: ['bbc','ft','reuters'],
    queries: ['FTSE 100 London stock market today UK economy','UK stocks FTSE Bank of England interest rate sterling'],
    region: null,
  },
  '^N225': {
    label: 'Nikkei 225',
    mustContain: ['nikkei','japan stock','tokyo stock','boj','bank of japan','yen','japanese economy','tsmc japan'],
    feeds: ['reuters','bloombergMkts'],
    queries: ['Nikkei 225 Japan stock market today Bank of Japan yen','Japan stocks BOJ yen monetary policy Tokyo'],
    region: null,
  },
};


// ── MARKET-RELEVANT KEYWORDS (must have at least one) ──────────────────────
const MARKET_KEYWORDS = [
  'stock','share','market','nse','bse','sensex','nifty','equity','ipo','fpo',
  'earnings','revenue','profit','loss','ebitda','margin','quarterly','results',
  'rbi','sebi','fed','federal reserve','central bank','interest rate','repo rate',
  'inflation','cpi','gdp','fiscal','deficit','budget','monetary','policy rate',
  'sector','industry','bank','nbfc','insurance','mutual fund','fund','aum',
  'oil','crude','commodity','gold','silver','steel','cement','copper','aluminium',
  'dividend','buyback','merger','acquisition','stake','ipo','ncd','bond','debenture',
  'rupee','dollar','exchange rate','forex','currency',
  'subsidy','tender','capex','investment','fdi','fii','dii',
  'company','firm','corporate','promoter','ceo','cfo','board','management',
  'fraud','scam','investigation','sebi order','insider','trading',
  'export','import','trade','tariff','duty','gst','tax',
  'power','energy','renewable','solar','wind','hydrogen','infrastructure',
  'pharma','drug','fda','cdsco','patent','clinical','biotech',
  'real estate','realty','housing','reit','property',
  'telecom','5g','spectrum','trai','jio','airtel',
  'auto','ev','electric vehicle','automobile','sales volume',
  'tech','software','it sector','cloud','ai','semiconductor',
];

// ── BLACKLIST — pure political/social noise ─────────────────────────────────
const BLACKLIST_KEYWORDS = [
  'neet','bjp','congress','aap','shiv sena','aam aadmi','lok sabha','rajya sabha',
  'election','polling','voter','constituency','mla','mp ','minister resigns',
  'cricket','ipl','football','sports','bollywood','film','actor','actress',
  'wedding','marriage','celebrity','entertains','fashion','lifestyle',
  'weather','cyclone','flood','earthquake','accident','crime','murder','rape',
  'temple','mosque','church','religion','caste','riot','protest rally',
  'exam','neet-ug','jee','upsc','university admission','school',
];

function isMarketRelevant(item) {
  const text = (item.title + ' ' + item.description).toLowerCase();
  // Fail if blacklist hit
  for (const bl of BLACKLIST_KEYWORDS) {
    if (text.includes(bl)) return false;
  }
  // Pass only if at least one market keyword present
  for (const kw of MARKET_KEYWORDS) {
    if (text.includes(kw)) return true;
  }
  return false;
}

// ── SOURCES: Market-only, authoritative — 55+ feeds ─────────────────────────
const FEEDS = {
  // Regulatory / Government (India)
  rbi:            'https://www.rbi.org.in/Scripts/RSS.aspx',
  sebi:           'https://www.sebi.gov.in/sebirss.xml',
  pibEconomy:     'https://pib.gov.in/RSS.aspx?MenuID=2',
  // India Financial — Core
  etMarkets:      'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms',
  etEconomy:      'https://economictimes.indiatimes.com/news/economy/rssfeeds/20410144.cms',
  etPolicy:       'https://economictimes.indiatimes.com/news/economy/policy/rssfeeds/1677393988.cms',
  etCompanies:    'https://economictimes.indiatimes.com/companies/rssfeeds/2143429.cms',
  etWealth:       'https://economictimes.indiatimes.com/wealth/rssfeeds/837555174.cms',
  etSensex:       'https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms',
  moneycontrol:   'https://www.moneycontrol.com/rss/MCtopnews.xml',
  mcMarkets:      'https://www.moneycontrol.com/rss/marketreports.xml',
  mcEconomy:      'https://www.moneycontrol.com/rss/economy.xml',
  mcIPO:          'https://www.moneycontrol.com/rss/ipo.xml',
  mcMF:           'https://www.moneycontrol.com/rss/mutual_funds.xml',
  mcCommodity:    'https://www.moneycontrol.com/rss/latestnews.xml',
  ndtvProfit:     'https://feeds.feedburner.com/ndtvprofit-latest',
  livemint:       'https://www.livemint.com/rss/markets',
  mintEconomy:    'https://www.livemint.com/rss/economy',
  mintCompanies:  'https://www.livemint.com/rss/companies',
  mintMF:         'https://www.livemint.com/rss/mutual-fund',
  businessLine:   'https://www.thehindubusinessline.com/feeder/default.rss',
  blMarkets:      'https://www.thehindubusinessline.com/markets/feeder/default.rss',
  blEconomy:      'https://www.thehindubusinessline.com/economy/feeder/default.rss',
  businessToday:  'https://www.businesstoday.in/rss/home',
  btMarkets:      'https://www.businesstoday.in/rss/markets',
  btPersonalFin:  'https://www.businesstoday.in/rss/personal-finance',
  zeeBusiness:    'https://www.zeebiz.com/feed',
  zeeMarketsIN:   'https://www.zeebiz.com/markets/feed',
  financialExpr:  'https://www.financialexpress.com/market/feed/',
  feEconomy:      'https://www.financialexpress.com/economy/feed/',
  feInvest:       'https://www.financialexpress.com/investing/feed/',
  bqPrime:        'https://www.bqprime.com/rss/home',
  bqMarkets:      'https://www.bqprime.com/rss/markets',
  // US / Global
  reuters:        'https://feeds.reuters.com/reuters/businessNews',
  reutersCompany: 'https://feeds.reuters.com/reuters/companyNews',
  reutersMoney:   'https://feeds.reuters.com/news/wealth',
  reutersTech:    'https://feeds.reuters.com/reuters/technologyNews',
  cnbc:           'https://www.cnbc.com/id/100003114/device/rss/rss.html',
  cnbcEarnings:   'https://www.cnbc.com/id/15839069/device/rss/rss.html',
  cnbcWorld:      'https://www.cnbc.com/id/100727362/device/rss/rss.html',
  marketwatch:    'https://feeds.marketwatch.com/marketwatch/topstories/',
  mwPulse:        'https://feeds.marketwatch.com/marketwatch/marketpulse/',
  bbc:            'https://feeds.bbci.co.uk/news/business/rss.xml',
  ft:             'https://www.ft.com/?format=rss',
  bloombergMkts:  'https://feeds.bloomberg.com/markets/news.rss',
  bloombergComm:  'https://feeds.bloomberg.com/commodities/news.rss',
  bloombergTech:  'https://feeds.bloomberg.com/technology/news.rss',
  wsj:            'https://feeds.a.dj.com/rss/RSSMarketsMain.xml',
  wsjBusiness:    'https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml',
  investingCom:   'https://www.investing.com/rss/news.rss',
  investingGold:  'https://www.investing.com/rss/news_14.rss',
  investingForex: 'https://www.investing.com/rss/news_1.rss',
  investingStocks:'https://www.investing.com/rss/news_25.rss',
  investingComm:  'https://www.investing.com/rss/news_8.rss',
  seekingAlpha:   'https://seekingalpha.com/market_currents.xml',
  // Yahoo Finance — Indexes & Commodities & Currency
  yahooNifty:     'https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5ENSEI,%5EBSESN&region=IN&lang=en-IN',
  yahooUS:        'https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EGSPC,%5EDJI,%5EIXIC&region=US&lang=en-US',
  yahooGold:      'https://feeds.finance.yahoo.com/rss/2.0/headline?s=GC%3DF,GLD&region=US&lang=en-US',
  yahooSilver:    'https://feeds.finance.yahoo.com/rss/2.0/headline?s=SI%3DF,SLV&region=US&lang=en-US',
  yahooRupee:     'https://feeds.finance.yahoo.com/rss/2.0/headline?s=USDINR%3DX,INRUSD%3DX&region=IN&lang=en-IN',
  yahooCrude:     'https://feeds.finance.yahoo.com/rss/2.0/headline?s=CL%3DF,BZ%3DF&region=US&lang=en-US',
};


const GN  = (q) => `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
const GNI = (q) => `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IN&gl=IN&ceid=IN:en`;
const YF  = (s) => `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(s)}&region=US&lang=en-US`;

// Dedicated commodity/currency helpers
const GOLD_FEEDS   = () => [FEEDS.yahooGold, FEEDS.bloombergComm, FEEDS.investingGold];
const SILVER_FEEDS = () => [FEEDS.yahooSilver, FEEDS.bloombergComm, FEEDS.investingGold];
const FOREX_FEEDS  = () => [FEEDS.yahooRupee, FEEDS.investingForex, FEEDS.bloombergComm];

const SECTOR_CONFIG = {
  'Information Technology': {
    feeds: [FEEDS.etMarkets, FEEDS.etCompanies, FEEDS.cnbc, FEEDS.reutersTech, FEEDS.bloombergTech, FEEDS.livemint, FEEDS.bqMarkets],
    queries: [
      GNI('Infosys TCS Wipro HCL Tech Mahindra LTIM quarterly results NSE'),
      GNI('IT sector India software exports revenue guidance digital AI cloud'),
      GN('technology stocks NASDAQ Infosys Wipro TCS earnings revenue'),
      GNI('Indian IT company deal win AI cloud digital transformation headcount'),
    ],
    keywords: ['infosys','tcs','wipro','hcl','tech mahindra','ltim','mphasis','coforge','persistent','it sector','software','technology','digital','cloud','ai','deal win','attrition'],
  },
  'Banking & Finance': {
    feeds: [FEEDS.rbi, FEEDS.etMarkets, FEEDS.moneycontrol, FEEDS.mcMarkets, FEEDS.livemint, FEEDS.bqMarkets],
    queries: [
      GNI('HDFC Bank ICICI SBI Kotak Axis Bank quarterly results NPA credit'),
      GNI('RBI repo rate monetary policy bank credit NPA GNPA India'),
      GNI('bank interest rate net interest margin NIM provision deposits CASA'),
      GN('banking earnings JPMorgan Bank of America Goldman Sachs quarterly'),
    ],
    keywords: ['hdfc bank','icici bank','sbi','kotak','axis bank','indusind','rbi','npa','gnpa','credit growth','repo rate','interest rate','nim','net interest margin','provision','deposits','casa','banking'],
  },
  'Pharmaceuticals': {
    feeds: [FEEDS.etCompanies, FEEDS.reutersCompany, FEEDS.cnbc, FEEDS.livemint, FEEDS.moneycontrol],
    queries: [
      GNI('Sun Pharma Dr Reddy Cipla Divislab Biocon Lupin results quarterly FDA'),
      GNI('pharma sector India FDA CDSCO drug approval ANDA NDA patent'),
      GN('pharmaceutical FDA drug approval Sun Pharma Dr Reddys Cipla earnings'),
      GNI('India pharma exports API generics US FDA warning letter recall'),
    ],
    keywords: ['sun pharma','dr reddy','cipla','divislab','biocon','lupin','aurobindo','torrent','alkem','pharma','drug','fda','cdsco','api','generic','patent','clinical','biotech','healthcare','nda','anda'],
  },
  'Energy & Oil': {
    feeds: [FEEDS.reuters, FEEDS.bloombergComm, FEEDS.etMarkets, FEEDS.yahooCrude, FEEDS.livemint, FEEDS.moneycontrol],
    queries: [
      GNI('ONGC Reliance Industries NTPC BPCL IOC GAIL Adani Green results quarterly'),
      GNI('crude oil India energy sector power ONGC Reliance NTPC earnings production'),
      GN('OPEC crude oil price WTI Brent energy sector results'),
      GNI('renewable energy solar wind India NTPC Adani Tata Power MW capacity'),
    ],
    keywords: ['ongc','reliance industries','ntpc','powergrid','adani green','tata power','bpcl','ioc','gail','coal india','crude oil','energy','opec','renewable','solar','wind','petroleum','upstream'],
  },
  'Automobile': {
    feeds: [FEEDS.etCompanies, FEEDS.reuters, FEEDS.livemint, FEEDS.moneycontrol, FEEDS.bqMarkets],
    queries: [
      GNI('Maruti Tata Motors Mahindra Bajaj Auto Hero Eicher monthly wholesale sales'),
      GNI('auto sector India monthly sales volume EV electric vehicle SIAM data'),
      GNI('Maruti Suzuki Tata Motors MnM quarterly results revenue profit EBITDA'),
      GN('electric vehicle EV Tesla Ford GM auto earnings monthly sales'),
    ],
    keywords: ['maruti','tata motors','mahindra','bajaj auto','hero motocorp','eicher motors','ashok leyland','tvs motor','auto sector','automobile','monthly sales','ev','electric vehicle','siam','wholesale','suv'],
  },
  'FMCG': {
    feeds: [FEEDS.etCompanies, FEEDS.moneycontrol, FEEDS.livemint, FEEDS.bqMarkets, FEEDS.blMarkets],
    queries: [
      GNI('HUL Hindustan Unilever ITC Nestle India Britannia Dabur Marico quarterly'),
      GNI('FMCG sector India rural demand urban consumption volume growth pricing'),
      GNI('consumer goods India HUL ITC quarterly revenue profit EBITDA margin'),
      GN('consumer staples FMCG earnings Nestle Unilever Procter Gamble results'),
    ],
    keywords: ['hul','hindustan unilever','itc','nestle india','britannia','dabur','marico','godrej consumer','colgate','tata consumer','fmcg','consumer goods','rural demand','volume growth','premium'],
  },
  'Metals & Mining': {
    feeds: [FEEDS.bloombergComm, FEEDS.reuters, FEEDS.etCompanies, FEEDS.investingComm, FEEDS.moneycontrol],
    queries: [
      GNI('Tata Steel JSW Steel Hindalco Vedanta SAIL NMDC results quarterly steel'),
      GNI('steel price India hot rolled coil HRC JSW Tata Steel SAIL'),
      GN('metals mining iron ore copper aluminium zinc LME price earnings'),
      GNI('commodity metals India China demand steel aluminium copper zinc'),
    ],
    keywords: ['tata steel','jsw steel','hindalco','vedanta','sail','nmdc','steel price','iron ore','copper','aluminium','zinc','lme','hrc','mining','metals','coking coal','pellet'],
  },
  'Real Estate': {
    feeds: [FEEDS.etCompanies, FEEDS.livemint, FEEDS.businessLine, FEEDS.moneycontrol, FEEDS.blEconomy],
    queries: [
      GNI('DLF Godrej Properties Prestige Lodha Sobha Brigade real estate quarterly'),
      GNI('real estate India housing demand residential property sales launches'),
      GNI('residential commercial office space REIT India property market'),
      GNI('home loan interest rate housing market India property price'),
    ],
    keywords: ['dlf','godrej properties','prestige','lodha','sobha','brigade','real estate','housing','property','reit','residential','commercial','office space','home loan','realty','bookings'],
  },
  'Telecom': {
    feeds: [FEEDS.etCompanies, FEEDS.moneycontrol, FEEDS.livemint, FEEDS.bqMarkets, FEEDS.reutersTech],
    queries: [
      GNI('Airtel Bharti Jio Reliance Vodafone Idea 5G spectrum TRAI ARPU subscriber results'),
      GNI('telecom sector India 5G rollout Airtel Jio revenue ARPU tariff hike'),
      GNI('Airtel Jio quarterly results subscriber revenue EBITDA India'),
      GN('telecom 5G spectrum earnings T-Mobile Verizon wireless results'),
    ],
    keywords: ['jio','airtel','bharti airtel','vodafone idea','vi','trai','5g','spectrum','arpu','subscriber','telecom','broadband','tariff','mobile','fiber'],
  },
  'Financial Services': {
    feeds: [FEEDS.sebi, FEEDS.etMarkets, FEEDS.moneycontrol, FEEDS.mcMF, FEEDS.mintMF, FEEDS.mcIPO],
    queries: [
      GNI('NBFC mutual fund insurance SEBI IRDAI AUM SIP inflow quarterly results'),
      GNI('mutual fund AUM SIP inflow India AMFI monthly data equity debt'),
      GNI('IPO India SEBI listing gains primary market subscription GMP'),
      GNI('NBFC housing finance bajaj finance SBI cards quarterly results India'),
    ],
    keywords: ['nbfc','mutual fund','insurance','sebi','irdai','aum','sip','inflow','ipo','listing','amfi','bajaj finance','housing finance','gold loan','microfinance','financial services'],
  },
  // Aliases to handle sectors.js naming
  'Consumer Discretionary': {
    feeds: [FEEDS.etCompanies, FEEDS.moneycontrol, FEEDS.livemint, FEEDS.reuters],
    queries: [
      GNI('Titan Trent Page Industries Havells Voltas consumer discretionary results India'),
      GNI('consumer discretionary retail India premium luxury spending demand'),
      GN('consumer discretionary earnings retail Amazon HD Nike results'),
    ],
    keywords: ['titan','trent','page industries','havells','voltas','crompton','consumer discretionary','retail','premium','luxury','discretionary spending'],
  },
};


// ── RSS FETCHER & PARSER ────────────────────────────────────────────────────
async function fetchRSS(url, label = '') {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
      next: { revalidate: 0 },
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const text = await res.text();
    return parseRSS(text, label);
  } catch { return []; }
}

function parseRSS(xml, src) {
  const items = [];
  const re = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const b = m[1];
    const title = clean(xtag(b, 'title'));
    const link  = clean(xtag(b, 'link')) || xattr(b, 'link', 'href') || '';
    const pub   = xtag(b, 'pubDate') || xtag(b, 'dc:date') || '';
    const desc  = clean(xtag(b, 'description') || '').replace(/<[^>]+>/g, '').trim().slice(0, 300);
    const source = clean(xtag(b, 'source')) || src;
    if (!title || title.length < 8 || !link) continue;
    let publishedAt;
    try { publishedAt = pub ? new Date(pub).toISOString() : new Date().toISOString(); } catch { continue; }
    if (!isFresh(publishedAt)) continue;
    items.push({ title, link, description: desc, publishedAt, source });
  }
  return items;
}

function xtag(x, t) { const m = x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`, 'i')); return m ? m[1] : ''; }
function xattr(x, t, a) { const m = x.match(new RegExp(`<${t}[^>]*${a}="([^"]+)"`, 'i')); return m ? m[1] : ''; }
function clean(s) { return s.replace(/<!\[CDATA\[/g,'').replace(/\]\]>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim(); }

function process(items, limit = 40) {
  // Apply market relevance filter
  const relevant = items.filter(isMarketRelevant);
  const seen = new Set();
  const deduped = relevant.filter(n => {
    const k = n.title.toLowerCase().slice(0, 80);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  deduped.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  return deduped.slice(0, limit);
}

// Process for metric symbols: MUST match mustContain + blacklist filter
function processMetric(items, limit = 50, mustContain = []) {
  const filtered = items.filter(item => {
    const text = (item.title + ' ' + item.description).toLowerCase();
    // 1. Reject blacklisted content
    for (const bl of BLACKLIST_KEYWORDS) {
      if (text.includes(bl)) return false;
    }
    // 2. MUST contain at least one mandatory keyword for this metric
    if (mustContain.length > 0) {
      const passes = mustContain.some(kw => text.includes(kw.toLowerCase()));
      if (!passes) return false;
    }
    return true;
  });
  const seen = new Set();
  const deduped = filtered.filter(n => {
    const k = n.title.toLowerCase().slice(0, 80);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  deduped.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  return deduped.slice(0, limit);
}

function scoreRelevance(item, keywords) {
  const text = (item.title + ' ' + item.description).toLowerCase();
  return keywords.reduce((s, kw) => s + (text.includes(kw.toLowerCase()) ? (kw.length > 5 ? 2 : 1) : 0), 0);
}

// ── AI ANALYSIS for top articles ───────────────────────────────────────
async function enrichWithAI(articles) {
  if (articles.length === 0) return articles;
  try {
    const snippets = articles.slice(0, 15).map((a, i) =>
      `[${i}] "${a.title}" — ${a.description?.slice(0, 100) || ''}`
    ).join('\n');

    const res = await callAI([
      {
        role: 'system',
        content: `You are a financial market analyst. For each news item, output a JSON array with objects: {index, sentiment: "Bullish"|"Bearish"|"Neutral", impact: "High"|"Medium"|"Low", brief: "one sentence why this matters to markets/stocks/sectors"}. Only output the JSON array, nothing else.`
      }, {
        role: 'user',
        content: `Analyze these market news items:\n${snippets}`
      }
    ], { temperature: 0.1, max_tokens: 2000 });
    
    const raw = res.content || '[]';
    const analysis = JSON.parse(raw.match(/\[[\s\S]*\]/)?.[0] || '[]');
    return articles.map((a, i) => {
      const ai = analysis.find(x => x.index === i);
      return ai ? { ...a, sentiment: ai.sentiment, impact: ai.impact, brief: ai.brief } : a;
    });
  } catch (e) { 
    console.error('AI Enrichment error:', e.message);
    return articles; 
  }
}

// ── MAIN HANDLER ─────────────────────────────────────────────────────────────
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol  = searchParams.get('symbol') || '';
    const sector  = searchParams.get('sector') || '';
    const region  = searchParams.get('region') || '';
    const query   = searchParams.get('q') || '';
    const withAI  = searchParams.get('ai') === '1';

    let allNews = [];

    let queryMustContain = [];

    if (symbol) {
      // ── Check if this is a known market metric symbol (index/commodity/forex) ──
      const metricCfg = SYMBOL_METRIC_MAP[symbol];

      if (metricCfg) {
        // Use targeted queries for market metrics instead of symbol search
        const feedKeys = metricCfg.feeds || [];
        const feedFetches = feedKeys.map(k => fetchRSS(FEEDS[k], k));
        const queryFetches = metricCfg.queries.map(q => fetchRSS(GNI(q), 'Google News India'));
        // Also add English Google News for broader coverage
        const enFetches = metricCfg.queries.slice(0, 3).map(q => fetchRSS(GN(q), 'Google News'));
        // Add Yahoo Finance feed for the symbol itself
        const yFetch = fetchRSS(YF(symbol), 'Yahoo Finance');

        const settled = await Promise.allSettled([
          yFetch,
          ...feedFetches,
          ...queryFetches,
          ...enFetches,
        ]);
        allNews = settled.filter(r => r.status === 'fulfilled').flatMap(r => r.value);

        // Score and sort by relevance to the label keywords
        const labelKws = metricCfg.label.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        // Add extra keywords based on queries
        const extraKws = metricCfg.queries.join(' ').toLowerCase().split(/\s+/).filter(w => w.length > 4).slice(0, 15);
        const allKws = [...new Set([...labelKws, ...extraKws])];
        allNews = allNews
          .map(n => ({ ...n, _score: scoreRelevance(n, allKws) }))
          .filter(n => n._score >= 0); // Keep all — don't filter by score for metrics
        // Sort by date primarily, then score
        allNews.sort((a, b) => {
          const dateDiff = new Date(b.publishedAt) - new Date(a.publishedAt);
          if (Math.abs(dateDiff) > 3600000) return dateDiff; // > 1h apart: sort by date
          return (b._score || 0) - (a._score || 0); // within 1h: sort by score
        });

      } else {
        // Standard company symbol lookup
        const sym = symbol.replace('.NS','').replace('.BO','').replace('^','').replace('=X','').replace('=F','');
        const isIN = symbol.includes('.NS') || symbol.includes('.BO');
        const settled = await Promise.allSettled([
          fetchRSS(YF(symbol), 'Yahoo Finance'),
          fetchRSS(GN(`"${sym}" stock earnings results quarterly`), 'Google News'),
          fetchRSS(GNI(`"${sym}" NSE BSE share price results`), 'Google News India'),
          fetchRSS(GN(`"${sym}" merger acquisition dividend stake`), 'Google News'),
          fetchRSS(isIN ? GNI(`"${sym}" SEBI RBI regulator`) : GN(`"${sym}" SEC FDA regulator`), 'Google News'),
          fetchRSS(FEEDS.etMarkets, 'Economic Times'),
          fetchRSS(FEEDS.moneycontrol, 'MoneyControl'),
        ]);
        allNews = settled.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
        const kws = sym.toLowerCase().split(/\s+/).filter(k => k.length > 2);
        if (kws.length > 0) {
          allNews = allNews.filter(n => kws.some(k => (n.title + ' ' + n.description).toLowerCase().includes(k)));
        }
      }
    }

    else if (sector) {
      const cfg = SECTOR_CONFIG[sector] || {
        feeds: [FEEDS.etMarkets, FEEDS.moneycontrol],
        queries: [GNI(`${sector} sector stocks India NSE BSE quarterly results`)],
        keywords: [sector.toLowerCase()],
      };
      // Use ONLY the sector-specific feeds + queries — no generic broad feeds
      const settled = await Promise.allSettled([
        ...cfg.feeds.map(url => fetchRSS(url, sector)),
        ...(cfg.queries || []).map(url => fetchRSS(url, 'Google News')),
      ]);
      allNews = settled.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
      const keywords = cfg.keywords || [sector.toLowerCase()];
      allNews = allNews
        .map(n => ({ ...n, _score: scoreRelevance(n, keywords) }))
        .filter(n => n._score >= 2)  // Require at least 2 keyword hits for sector relevance
        .sort((a, b) => {
          const dateDiff = new Date(b.publishedAt) - new Date(a.publishedAt);
          if (Math.abs(dateDiff) > 3600000) return dateDiff; // sort by date first
          return (b._score || 0) - (a._score || 0);          // tie-break by score
        });
    }


    else if (query) {
      const q_lc = query.toLowerCase();
      let feedFetches = [];
      let queryFetches = [];

      // Map query to highly specific feeds and mandatory keywords
      if (q_lc.includes('gold')) {
        queryMustContain = ['gold','bullion','mcx gold','comex','yellow metal','precious metal'];
        feedFetches = [fetchRSS(FEEDS.yahooGold, 'Yahoo Gold'), fetchRSS(FEEDS.bloombergComm, 'Bloomberg Comm')];
        queryFetches = [fetchRSS(GNI('gold price India MCX 10 gram today bullion rate'), 'Google News India'), fetchRSS(GNI('gold ETF India import duty RBI bullion'), 'Google News India')];
      } else if (q_lc.includes('silver')) {
        queryMustContain = ['silver','mcx silver','comex','white metal','precious metal'];
        feedFetches = [fetchRSS(FEEDS.yahooSilver, 'Yahoo Silver'), fetchRSS(FEEDS.bloombergComm, 'Bloomberg Comm')];
        queryFetches = [fetchRSS(GNI('silver price India MCX rate today industrial demand'), 'Google News India')];
      } else if (q_lc.includes('rupee') || q_lc.includes('dollar') || q_lc.includes('usd') || q_lc.includes('inr')) {
        queryMustContain = ['rupee','dollar','usd/inr','usd','inr','forex','exchange rate','dxy'];
        feedFetches = [fetchRSS(FEEDS.yahooRupee, 'Yahoo USD/INR'), fetchRSS(FEEDS.investingForex, 'Investing Forex')];
        queryFetches = [fetchRSS(GNI('dollar rupee exchange rate RBI reference forex reserves FII'), 'Google News India'), fetchRSS(GN('DXY dollar index USD strength weakness emerging markets'), 'Google News')];
      } else if (q_lc.includes('rbi') || q_lc.includes('monetary') || q_lc.includes('interest rate') || q_lc.includes('repo')) {
        queryMustContain = ['rbi','repo rate','monetary policy','interest rate','mpc','shaktikanta das','central bank'];
        feedFetches = [fetchRSS(FEEDS.rbi, 'RBI'), fetchRSS(FEEDS.etPolicy, 'ET Policy')];
        queryFetches = [fetchRSS(GNI('RBI MPC repo rate India interest rate monetary policy decision'), 'Google News India')];
      } else if (q_lc.includes('sebi')) {
        queryMustContain = ['sebi','regulator','madhabi puri buch','stock market regulator'];
        feedFetches = [fetchRSS(FEEDS.sebi, 'SEBI')];
        queryFetches = [fetchRSS(GNI('SEBI stock market regulator rules F&O retail investors'), 'Google News India')];
      } else if (q_lc.includes('nifty') || q_lc === 'nse') {
        queryMustContain = ['nifty','nse','nifty 50','national stock exchange'];
        feedFetches = [fetchRSS(FEEDS.yahooNifty, 'Yahoo Nifty'), fetchRSS(FEEDS.etSensex, 'ET Sensex')];
        queryFetches = [fetchRSS(GNI('NSE Nifty India stock market today FII DII bulk deal'), 'Google News India')];
      } else if (q_lc.includes('sensex') || q_lc === 'bse') {
        queryMustContain = ['sensex','bse','bombay stock exchange'];
        feedFetches = [fetchRSS(FEEDS.yahooNifty, 'Yahoo Nifty'), fetchRSS(FEEDS.etSensex, 'ET Sensex')];
        queryFetches = [fetchRSS(GNI('BSE Sensex India stock market today FII DII'), 'Google News India')];
      } else if (q_lc.includes('crude') || q_lc.includes('oil')) {
        queryMustContain = ['crude oil','crude','oil price','wti','brent','opec','petroleum'];
        feedFetches = [fetchRSS(FEEDS.yahooCrude, 'Yahoo Crude'), fetchRSS(FEEDS.bloombergComm, 'Bloomberg Comm')];
        queryFetches = [fetchRSS(GN('crude oil price today WTI NYMEX OPEC'), 'Google News')];
      } else if (q_lc.includes('s&p 500') || q_lc.includes('sp500') || q_lc.includes('us market') || q_lc.includes('us markets')) {
        queryMustContain = ['s&p 500','sp500','wall street','us market','us stock','nyse'];
        feedFetches = [fetchRSS(FEEDS.yahooUS, 'Yahoo US'), fetchRSS(FEEDS.cnbc, 'CNBC')];
        queryFetches = [fetchRSS(GN('US stock market S&P 500 Federal Reserve interest rate'), 'Google News')];
      } else if (q_lc.includes('inflation')) {
        queryMustContain = ['inflation','cpi','wpi','consumer price index','wholesale price','retail inflation'];
        feedFetches = [fetchRSS(FEEDS.etEconomy, 'ET Economy'), fetchRSS(FEEDS.mcEconomy, 'MC Economy')];
        queryFetches = [fetchRSS(GNI('India inflation rate CPI WPI RBI MPC'), 'Google News India')];
      } else if (q_lc.includes('fiscal')) {
        queryMustContain = ['fiscal','budget','deficit','capex','government spending','tax','gst'];
        feedFetches = [fetchRSS(FEEDS.pibEconomy, 'PIB Economy'), fetchRSS(FEEDS.etEconomy, 'ET Economy')];
        queryFetches = [fetchRSS(GNI('India fiscal policy budget deficit capex government spending'), 'Google News India')];
      } else {
        // Fallback for general searches
        queryMustContain = q_lc.split(/\s+/).filter(w => w.length > 2);
        queryFetches = [
          fetchRSS(GN(`"${query}" stock market finance economy`), 'Google News'),
          fetchRSS(GNI(`"${query}" India market stocks`), 'Google News India'),
        ];
        feedFetches = [fetchRSS(YF(query), 'Yahoo Finance')];
      }

      const settled = await Promise.allSettled([
        fetchRSS(YF(query), 'Yahoo Finance'),
        ...feedFetches,
        ...queryFetches
      ]);
      allNews = settled.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
    }

    else if (region === 'IN') {
      const settled = await Promise.allSettled([
        fetchRSS(FEEDS.rbi, 'RBI'),
        fetchRSS(FEEDS.sebi, 'SEBI'),
        fetchRSS(FEEDS.pibEconomy, 'PIB Economy'),
        fetchRSS(FEEDS.etMarkets, 'Economic Times'),
        fetchRSS(FEEDS.etEconomy, 'ET Economy'),
        fetchRSS(FEEDS.etPolicy, 'ET Policy'),
        fetchRSS(FEEDS.etCompanies, 'ET Companies'),
        fetchRSS(FEEDS.etWealth, 'ET Wealth'),
        fetchRSS(FEEDS.moneycontrol, 'MoneyControl'),
        fetchRSS(FEEDS.mcMarkets, 'MC Markets'),
        fetchRSS(FEEDS.mcEconomy, 'MC Economy'),
        fetchRSS(FEEDS.ndtvProfit, 'NDTV Profit'),
        fetchRSS(FEEDS.livemint, 'Livemint'),
        fetchRSS(FEEDS.mintEconomy, 'Mint Economy'),
        fetchRSS(FEEDS.mintCompanies, 'Mint Companies'),
        fetchRSS(FEEDS.businessLine, 'Business Line'),
        fetchRSS(FEEDS.blMarkets, 'BL Markets'),
        fetchRSS(FEEDS.businessToday, 'Business Today'),
        fetchRSS(FEEDS.btMarkets, 'BT Markets'),
        fetchRSS(FEEDS.zeeBusiness, 'Zee Business'),
        fetchRSS(FEEDS.financialExpr, 'Financial Express'),
        fetchRSS(FEEDS.feEconomy, 'FE Economy'),
        fetchRSS(FEEDS.bqPrime, 'BQ Prime'),
        fetchRSS(FEEDS.yahooNifty, 'Yahoo Finance Nifty/BSE'),
        // Gold, Silver, Rupee/Dollar for India context
        fetchRSS(FEEDS.yahooGold, 'Yahoo Gold'),
        fetchRSS(FEEDS.yahooSilver, 'Yahoo Silver'),
        fetchRSS(FEEDS.yahooRupee, 'Yahoo USD/INR'),
        fetchRSS(FEEDS.bloombergComm, 'Bloomberg Commodities'),
        fetchRSS(FEEDS.investingGold, 'Investing.com Gold'),
        fetchRSS(FEEDS.investingForex, 'Investing.com Forex'),
        fetchRSS(GNI('gold price India MCX bullion rate today'), 'Google News India'),
        fetchRSS(GNI('silver price India MCX rate today'), 'Google News India'),
        fetchRSS(GNI('dollar rupee exchange rate USD INR RBI forex'), 'Google News India'),
        fetchRSS(GNI('NSE BSE Nifty50 Sensex India stock market today'), 'Google News India'),
        fetchRSS(GNI('India stock market NSE BSE Sensex Nifty50 earnings results'), 'Google News India'),
        fetchRSS(GNI('RBI SEBI India economy policy monetary rate inflation'), 'Google News India'),
        fetchRSS(GNI('India budget subsidy infrastructure capex FDI investment'), 'Google News India'),
        fetchRSS(GNI('Indian company quarterly results revenue profit'), 'Google News India'),
      ]);
      allNews = settled.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
    }

    else if (region === 'US') {
      const settled = await Promise.allSettled([
        fetchRSS(FEEDS.cnbc, 'CNBC'),
        fetchRSS(FEEDS.cnbcEarnings, 'CNBC Earnings'),
        fetchRSS(FEEDS.marketwatch, 'MarketWatch'),
        fetchRSS(FEEDS.mwPulse, 'MW Pulse'),
        fetchRSS(FEEDS.wsj, 'WSJ Markets'),
        fetchRSS(FEEDS.bloombergMkts, 'Bloomberg'),
        fetchRSS(FEEDS.cnn, 'CNN Money'),
        fetchRSS(FEEDS.ft, 'Financial Times'),
        fetchRSS(FEEDS.yahooUS, 'Yahoo Finance S&P/Dow/NASDAQ'),
        fetchRSS(FEEDS.seekingAlpha, 'Seeking Alpha'),
        fetchRSS(FEEDS.investingCom, 'Investing.com'),
        fetchRSS(FEEDS.reuters, 'Reuters'),
        fetchRSS(GN('US stock market S&P500 Dow Jones NASDAQ earnings results'), 'Google News US'),
        fetchRSS(GN('Federal Reserve interest rate inflation CPI economy policy'), 'Google News US'),
        fetchRSS(GN('Wall Street quarterly results earnings guidance outlook'), 'Google News US'),
        fetchRSS(GN('NYSE NASDAQ listed company results revenue earnings'), 'Google News US'),
      ]);
      allNews = settled.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
    }

    else {
      // ALL MARKETS — widest possible net
      const settled = await Promise.allSettled([
        // India
        fetchRSS(FEEDS.rbi, 'RBI'),
        fetchRSS(FEEDS.sebi, 'SEBI'),
        fetchRSS(FEEDS.etMarkets, 'Economic Times'),
        fetchRSS(FEEDS.etPolicy, 'ET Policy'),
        fetchRSS(FEEDS.etCompanies, 'ET Companies'),
        fetchRSS(FEEDS.moneycontrol, 'MoneyControl'),
        fetchRSS(FEEDS.ndtvProfit, 'NDTV Profit'),
        fetchRSS(FEEDS.livemint, 'Livemint'),
        fetchRSS(FEEDS.businessToday, 'Business Today'),
        fetchRSS(FEEDS.zeeBusiness, 'Zee Business'),
        fetchRSS(FEEDS.financialExpr, 'Financial Express'),
        fetchRSS(FEEDS.bqPrime, 'BQ Prime'),
        fetchRSS(FEEDS.businessLine, 'Business Line'),
        fetchRSS(FEEDS.yahooNifty, 'Yahoo Nifty/BSE'),
        // Commodities & Currency
        fetchRSS(FEEDS.yahooGold, 'Yahoo Gold'),
        fetchRSS(FEEDS.yahooSilver, 'Yahoo Silver'),
        fetchRSS(FEEDS.yahooRupee, 'Yahoo USD/INR'),
        fetchRSS(FEEDS.yahooCrude, 'Yahoo Crude Oil'),
        fetchRSS(FEEDS.bloombergComm, 'Bloomberg Commodities'),
        fetchRSS(FEEDS.investingGold, 'Investing.com Gold'),
        fetchRSS(FEEDS.investingForex, 'Investing.com Forex'),
        fetchRSS(GNI('gold price India MCX bullion dollar rupee USD INR today'), 'Google News India'),
        fetchRSS(GNI('silver price India MCX rate NSE BSE Nifty Sensex today'), 'Google News India'),
        // US & Global
        fetchRSS(FEEDS.reuters, 'Reuters'),
        fetchRSS(FEEDS.reutersCompany, 'Reuters Companies'),
        fetchRSS(FEEDS.cnbc, 'CNBC'),
        fetchRSS(FEEDS.bloombergMkts, 'Bloomberg'),
        fetchRSS(FEEDS.marketwatch, 'MarketWatch'),
        fetchRSS(FEEDS.bbc, 'BBC Business'),
        fetchRSS(FEEDS.cnn, 'CNN Money'),
        fetchRSS(FEEDS.yahooUS, 'Yahoo Finance US'),
        fetchRSS(FEEDS.wsj, 'WSJ Markets'),
        fetchRSS(FEEDS.investingCom, 'Investing.com'),
        // Google aggregated
        fetchRSS(GNI('India NSE BSE Nifty50 Sensex stocks earnings RBI SEBI'), 'Google News India'),
        fetchRSS(GN('global markets economy stocks commodities oil gold Fed'), 'Google News'),
        fetchRSS(GN('government policy interest rates inflation central bank economy'), 'Google News'),
        fetchRSS(GN('Wall Street S&P500 NASDAQ Dow earnings results quarterly'), 'Google News US'),
      ]);
      allNews = settled.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
    }

    let final;
    if (symbol && SYMBOL_METRIC_MAP[symbol]) {
      // Metric symbols: enforce mustContain mandatory keywords
      final = processMetric(allNews, 50, SYMBOL_METRIC_MAP[symbol].mustContain || []);
    } else if (query) {
      // Query chips from News & Updates: enforce custom queryMustContain
      final = processMetric(allNews, 50, queryMustContain || []);
    } else {
      final = process(allNews, 50);
    }

    // Groq AI enrichment (optional, triggered with ?ai=1)
    if (withAI && final.length > 0) {
      final = await enrichWithAI(final);
    }

    return NextResponse.json({ news: final, count: final.length, freshness: '6 months' });
  } catch (err) {
    console.error('News API error:', err);
    return NextResponse.json({ error: err.message, news: [] }, { status: 500 });
  }
}

