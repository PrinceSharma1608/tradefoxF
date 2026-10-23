/**
 * TradeFox — Dashboard Terminal Script
 * FULL POSTGRESQL & BACKEND API INTEGRATION
 * - Fetches real authenticated user & walletBalance via GET /api/users/{userId}
 * - Real-time Database Order Handshake via POST /api/orders
 * - Real Holdings from PostgreSQL via GET /api/holdings?userId={userId}
 * - Real Order Book from PostgreSQL via GET /api/orders?userId={userId}
 * - Real Watchlist from PostgreSQL via GET /api/watchlist?userId={userId}
 * - Comprehensive Stock Terminal Window with Live Chart Canvas & Technicals
 */

document.addEventListener('DOMContentLoaded', async () => {
  // --------------------------------------------------------------------------
  // 1. Session & Auth Verification
  // --------------------------------------------------------------------------
  const STORAGE_KEY_USER = 'tradefox_user';
  const STORAGE_KEY_TOKEN = 'tradefox_token';
  const STORAGE_KEY_THEME = 'tradefox_theme_pref';

  const rawUser = localStorage.getItem(STORAGE_KEY_USER);
  const token = localStorage.getItem(STORAGE_KEY_TOKEN);

  if (!rawUser || !token) {
    window.location.href = 'index.html';
    return;
  }

  let sessionUser = null;
  try {
    sessionUser = JSON.parse(rawUser);
  } catch {
    window.location.href = 'index.html';
    return;
  }

  const userId = sessionUser.user_id || sessionUser.userId;
  if (!userId) {
    window.location.href = 'index.html';
    return;
  }

  // --------------------------------------------------------------------------
  // 2. Application State (Connected to PostgreSQL Backend)
  // --------------------------------------------------------------------------
  let liveUser = {
    userId: userId,
    name: sessionUser.name || '',
    email: sessionUser.email || '',
    walletBalance: 1000000.00
  };

  let holdings = [];
  let orders = [];
  let watchlist = [];
  let marketQuotes = null;
  const lastKnownStockPrices = {};
  const lastKnownIndexPrices = {};

  // Active Terminal Window State
  let activeStock = {
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd.',
    exchange: 'NSE',
    price: 2548.60,
    dayChange: 30.58,
    dayChangePercentage: 1.21,
    direction: 'UP',
    range: '1D'
  };
  let activeChartCandles = [];
  let activeOrderMode = 'BUY';

  // Benchmark securities for Explore tab & High-Speed Market Search
  // Benchmark securities for Explore tab & High-Speed Market Search (90+ Top NSE/BSE Universe)
  const BENCHMARK_STOCKS = [
    // Benchmark Leaders & Nifty 50
    { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', price: 2548.60, change: '+1.21%', sector: 'Energy', tags: ['nifty50', 'oil', 'telecom', 'jio', 'ambani'] },
    { symbol: 'TCS', name: 'Tata Consultancy Services Ltd.', price: 3520.40, change: '+0.85%', sector: 'IT', tags: ['nifty50', 'tech', 'tata', 'software'] },
    { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', price: 1682.15, change: '-0.42%', sector: 'Banking', tags: ['nifty50', 'bank', 'private', 'finance'] },
    { symbol: 'INFY', name: 'Infosys Ltd.', price: 1465.75, change: '+1.10%', sector: 'IT', tags: ['nifty50', 'tech', 'software'] },
    { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd.', price: 1128.50, change: '+0.75%', sector: 'Banking', tags: ['nifty50', 'bank', 'private', 'finance'] },
    { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd.', price: 892.30, change: '+2.15%', sector: 'Auto', tags: ['nifty50', 'ev', 'tata', 'cars', 'jlr'] },
    { symbol: 'SBIN', name: 'State Bank of India', price: 788.90, change: '-0.30%', sector: 'Banking', tags: ['nifty50', 'psu', 'public bank', 'sbi'] },
    { symbol: 'ITC', name: 'ITC Ltd.', price: 438.10, change: '+0.45%', sector: 'FMCG', tags: ['nifty50', 'cigarettes', 'hotels', 'fmcg'] },
    { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd.', price: 1415.80, change: '+1.65%', sector: 'Telecom', tags: ['nifty50', '5g', 'airtel', 'telecom'] },
    { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd.', price: 7180.00, change: '-0.80%', sector: 'Finance', tags: ['nifty50', 'nbfc', 'lending', 'bajaj'] },
    { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd.', price: 11980.00, change: '+0.60%', sector: 'Auto', tags: ['nifty50', 'cars', 'suzuki'] },
    { symbol: 'LT', name: 'Larsen & Toubro Ltd.', price: 3640.20, change: '+1.40%', sector: 'Infrastructure', tags: ['nifty50', 'construction', 'engineering'] },
    { symbol: 'TITAN', name: 'Titan Company Ltd.', price: 3395.50, change: '+0.61%', sector: 'Consumer', tags: ['nifty50', 'tanishq', 'jewelry', 'tata'] },
    { symbol: 'WIPRO', name: 'Wipro Ltd.', price: 482.60, change: '+0.92%', sector: 'IT', tags: ['nifty50', 'tech', 'software'] },
    { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd.', price: 1782.40, change: '+0.70%', sector: 'Banking', tags: ['nifty50', 'bank', 'private bank'] },
    { symbol: 'AXISBANK', name: 'Axis Bank Ltd.', price: 1185.30, change: '+0.92%', sector: 'Banking', tags: ['nifty50', 'bank', 'private bank'] },
    { symbol: 'TATASTEEL', name: 'Tata Steel Ltd.', price: 152.80, change: '+1.26%', sector: 'Metals', tags: ['nifty50', 'steel', 'metals', 'tata'] },
    { symbol: 'HCLTECH', name: 'HCL Technologies Ltd.', price: 1648.20, change: '+0.81%', sector: 'IT', tags: ['nifty50', 'tech', 'software'] },
    { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd.', price: 2480.00, change: '+0.59%', sector: 'FMCG', tags: ['nifty50', 'fmcg', 'consumer', 'hul'] },
    { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Industries Ltd.', price: 1680.50, change: '+0.93%', sector: 'Pharma', tags: ['nifty50', 'pharma', 'medicine'] },
    { symbol: 'NTPC', name: 'NTPC Ltd.', price: 388.40, change: '+1.09%', sector: 'Energy', tags: ['nifty50', 'power', 'energy', 'psu'] },
    { symbol: 'POWERGRID', name: 'Power Grid Corporation of India', price: 318.50, change: '+1.11%', sector: 'Energy', tags: ['nifty50', 'power', 'grid', 'psu'] },
    { symbol: 'ONGC', name: 'Oil & Natural Gas Corporation Ltd.', price: 284.10, change: '+0.92%', sector: 'Energy', tags: ['nifty50', 'oil', 'gas', 'psu'] },
    { symbol: 'M&M', name: 'Mahindra & Mahindra Ltd.', price: 2780.00, change: '+1.27%', sector: 'Auto', tags: ['nifty50', 'suv', 'tractors', 'mahindra'] },
    { symbol: 'HAL', name: 'Hindustan Aeronautics Ltd.', price: 4480.00, change: '+1.36%', sector: 'Defense', tags: ['defense', 'aerospace', 'psu', 'fighter jets'] },
    { symbol: 'BEL', name: 'Bharat Electronics Ltd.', price: 285.50, change: '+1.28%', sector: 'Defense', tags: ['defense', 'electronics', 'psu', 'radars'] },
    { symbol: 'ZOMATO', name: 'Zomato Ltd.', price: 255.40, change: '+1.83%', sector: 'Internet', tags: ['food', 'delivery', 'blinkit', 'quick commerce'] },
    { symbol: 'JIOFIN', name: 'Jio Financial Services Ltd.', price: 335.20, change: '+1.27%', sector: 'Finance', tags: ['fintech', 'ambani', 'jio', 'finance'] },
    { symbol: 'ADANIENT', name: 'Adani Enterprises Ltd.', price: 3120.00, change: '+1.13%', sector: 'Conglomerate', tags: ['nifty50', 'adani', 'airports', 'mining'] },
    { symbol: 'ADANIPORTS', name: 'Adani Ports and SEZ Ltd.', price: 1380.00, change: '+1.10%', sector: 'Infrastructure', tags: ['nifty50', 'adani', 'ports', 'logistics'] },
    { symbol: 'COALINDIA', name: 'Coal India Ltd.', price: 485.60, change: '+0.96%', sector: 'Metals', tags: ['nifty50', 'coal', 'mining', 'psu'] },
    { symbol: 'DRREDDY', name: 'Dr. Reddy\'s Laboratories Ltd.', price: 6550.00, change: '+0.92%', sector: 'Pharma', tags: ['nifty50', 'pharma', 'healthcare'] },
    { symbol: 'CIPLA', name: 'Cipla Ltd.', price: 1520.00, change: '+1.00%', sector: 'Pharma', tags: ['nifty50', 'pharma', 'inhalers'] },
    { symbol: 'IRCTC', name: 'Indian Railway Catering & Tourism Corp', price: 915.00, change: '+1.10%', sector: 'Travel', tags: ['railways', 'trains', 'psu', 'tourism'] },

    // Top Retail & Growth Favourites
    { symbol: 'TATAPOWER', name: 'Tata Power Company Ltd.', price: 345.65, change: '-2.22%', sector: 'Energy', tags: ['tata', 'power', 'green', 'ev charging', 'solar', 'renewables'] },
    { symbol: 'SUZLON', name: 'Suzlon Energy Ltd.', price: 58.40, change: '+4.85%', sector: 'Energy', tags: ['wind', 'green energy', 'renewable', 'clean tech'] },
    { symbol: 'IREDA', name: 'Indian Renewable Energy Dev Agency', price: 172.50, change: '+3.15%', sector: 'Finance', tags: ['psu', 'green energy', 'nbfc', 'renewable funding'] },
    { symbol: 'RVNL', name: 'Rail Vikas Nigam Ltd.', price: 340.20, change: '+2.40%', sector: 'Infrastructure', tags: ['railways', 'trains', 'psu', 'infra'] },
    { symbol: 'IRFC', name: 'Indian Railway Finance Corporation', price: 138.90, change: '+1.80%', sector: 'Finance', tags: ['railways', 'trains', 'psu', 'finance', 'nbfc'] },
    { symbol: 'BHEL', name: 'Bharat Heavy Electricals Ltd.', price: 218.40, change: '+1.45%', sector: 'Energy', tags: ['psu', 'power equipment', 'engineering'] },
    { symbol: 'NHPC', name: 'NHPC Ltd.', price: 82.50, change: '+0.95%', sector: 'Energy', tags: ['hydro', 'green energy', 'psu', 'power'] },
    { symbol: 'SJVN', name: 'SJVN Ltd.', price: 104.20, change: '+1.65%', sector: 'Energy', tags: ['hydro', 'solar', 'power', 'psu'] },
    { symbol: 'ADANIGREEN', name: 'Adani Green Energy Ltd.', price: 1140.00, change: '+2.10%', sector: 'Energy', tags: ['adani', 'solar', 'wind', 'renewables'] },
    { symbol: 'ADANIPOWER', name: 'Adani Power Ltd.', price: 545.00, change: '+1.85%', sector: 'Energy', tags: ['adani', 'thermal', 'power', 'energy'] },

    // Retail, Consumer & Aviation
    { symbol: 'TRENT', name: 'Trent Ltd.', price: 5420.00, change: '+3.20%', sector: 'Consumer', tags: ['tata', 'zudio', 'westside', 'fashion', 'retail'] },
    { symbol: 'DMART', name: 'Avenue Supermarts Ltd.', price: 3680.00, change: '+0.75%', sector: 'Consumer', tags: ['supermarket', 'grocery', 'damani', 'retail'] },
    { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd.', price: 2280.00, change: '+0.45%', sector: 'Consumer', tags: ['paints', 'decor', 'home', 'coatings'] },
    { symbol: 'NESTLEIND', name: 'Nestle India Ltd.', price: 2190.00, change: '+0.60%', sector: 'FMCG', tags: ['maggi', 'fmcg', 'food', 'milk'] },
    { symbol: 'BRITANNIA', name: 'Britannia Industries Ltd.', price: 4890.00, change: '+0.80%', sector: 'FMCG', tags: ['biscuits', 'cookies', 'dairy', 'fmcg'] },
    { symbol: 'PIDILITIND', name: 'Pidilite Industries Ltd.', price: 2890.00, change: '+0.95%', sector: 'Consumer', tags: ['fevicol', 'm-seal', 'adhesives', 'chemicals'] },
    { symbol: 'BERGEPAINT', name: 'Berger Paints India Ltd.', price: 475.00, change: '+0.65%', sector: 'Consumer', tags: ['paints', 'coatings', 'decor'] },
    { symbol: 'INDIGO', name: 'InterGlobe Aviation Ltd.', price: 4120.00, change: '+1.45%', sector: 'Travel', tags: ['airlines', 'flights', 'aviation', 'travel'] },
    { symbol: 'DLF', name: 'DLF Ltd.', price: 745.00, change: '+1.75%', sector: 'Infrastructure', tags: ['real estate', 'property', 'housing', 'construction'] },

    // Defense & Shipbuilding
    { symbol: 'MAZDOCK', name: 'Mazagon Dock Shipbuilders Ltd.', price: 4180.00, change: '+3.60%', sector: 'Defense', tags: ['defense', 'submarines', 'navy', 'shipbuilding', 'psu'] },
    { symbol: 'COCHINSHIP', name: 'Cochin Shipyard Ltd.', price: 1420.00, change: '+2.90%', sector: 'Defense', tags: ['defense', 'aircraft carrier', 'ships', 'psu'] },
    { symbol: 'BDL', name: 'Bharat Dynamics Ltd.', price: 1045.00, change: '+1.90%', sector: 'Defense', tags: ['defense', 'missiles', 'torpedoes', 'psu'] },

    // Banking & Financial Services
    { symbol: 'PNB', name: 'Punjab National Bank', price: 98.40, change: '+0.85%', sector: 'Banking', tags: ['bank', 'psu bank', 'public sector'] },
    { symbol: 'BANKBARODA', name: 'Bank of Baroda', price: 232.00, change: '+1.10%', sector: 'Banking', tags: ['bank', 'psu bank', 'bob'] },
    { symbol: 'CANBK', name: 'Canara Bank', price: 96.50, change: '+0.70%', sector: 'Banking', tags: ['bank', 'psu bank'] },
    { symbol: 'IDFCFIRSTB', name: 'IDFC First Bank Ltd.', price: 62.80, change: '+1.20%', sector: 'Banking', tags: ['bank', 'private bank', 'credit card'] },
    { symbol: 'FEDERALBNK', name: 'The Federal Bank Ltd.', price: 182.00, change: '+0.95%', sector: 'Banking', tags: ['bank', 'south bank', 'private'] },
    { symbol: 'MUTHOOTFIN', name: 'Muthoot Finance Ltd.', price: 1980.00, change: '+1.40%', sector: 'Finance', tags: ['gold loan', 'nbfc', 'lending'] },
    { symbol: 'CHOLAFIN', name: 'Cholamandalam Investment & Finance', price: 1320.00, change: '+1.15%', sector: 'Finance', tags: ['vehicle finance', 'murugappa', 'nbfc'] },
    { symbol: 'SHRIRAMFIN', name: 'Shriram Finance Ltd.', price: 2890.00, change: '+1.50%', sector: 'Finance', tags: ['commercial vehicle', 'nbfc', 'lending'] },
    { symbol: 'LICI', name: 'Life Insurance Corporation of India', price: 890.00, change: '+0.60%', sector: 'Finance', tags: ['insurance', 'lic', 'psu', 'life insurance'] },
    { symbol: 'SBILIFE', name: 'SBI Life Insurance Company Ltd.', price: 1540.00, change: '+0.85%', sector: 'Finance', tags: ['insurance', 'sbi', 'life insurance'] },
    { symbol: 'HDFCLIFE', name: 'HDFC Life Insurance Company Ltd.', price: 685.00, change: '+0.75%', sector: 'Finance', tags: ['insurance', 'hdfc', 'life insurance'] },

    // Fintech, Depository & Broking
    { symbol: 'PAYTM', name: 'One97 Communications Ltd. (Paytm)', price: 685.00, change: '+2.80%', sector: 'Finance', tags: ['fintech', 'payments', 'upi', 'soundbox', 'qr'] },
    { symbol: 'CDSL', name: 'Central Depository Services Ltd.', price: 1380.00, change: '+2.40%', sector: 'Finance', tags: ['depository', 'demat', 'bse', 'monopoly'] },
    { symbol: 'ANGELONE', name: 'Angel One Ltd.', price: 2640.00, change: '+1.90%', sector: 'Finance', tags: ['broking', 'fintech', 'trading', 'demat'] },

    // Auto & Mobility Leaders
    { symbol: 'EICHERMOT', name: 'Eicher Motors Ltd.', price: 4780.00, change: '+1.60%', sector: 'Auto', tags: ['royal enfield', 'bullet', 'bikes', 'motorcycles'] },
    { symbol: 'HEROMOTOCO', name: 'Hero MotoCorp Ltd.', price: 4320.00, change: '+0.85%', sector: 'Auto', tags: ['two wheeler', 'splendor', 'motorcycles'] },
    { symbol: 'BAJAJ-AUTO', name: 'Bajaj Auto Ltd.', price: 8950.00, change: '+1.15%', sector: 'Auto', tags: ['pulsar', 'chetak ev', 'two wheeler', 'auto'] },
    { symbol: 'TVSMOTOR', name: 'TVS Motor Company Ltd.', price: 2380.00, change: '+1.40%', sector: 'Auto', tags: ['apache', 'jupiter', 'iqube ev', 'two wheeler'] },
    { symbol: 'MOTHERSON', name: 'Samvardhana Motherson International', price: 145.00, change: '+1.20%', sector: 'Auto', tags: ['auto parts', 'wiring', 'mirrors', 'global'] },

    // IT & Tech Exports
    { symbol: 'TECHM', name: 'Tech Mahindra Ltd.', price: 1580.00, change: '+1.10%', sector: 'IT', tags: ['telecom it', 'software', 'mahindra'] },
    { symbol: 'LTIM', name: 'LTIMindtree Ltd.', price: 5680.00, change: '+1.25%', sector: 'IT', tags: ['lt', 'software', 'tech', 'cloud'] },
    { symbol: 'PERSISTENT', name: 'Persistent Systems Ltd.', price: 5450.00, change: '+2.10%', sector: 'IT', tags: ['software', 'product engineering', 'cloud'] },
    { symbol: 'COFORGE', name: 'Coforge Ltd.', price: 6850.00, change: '+1.80%', sector: 'IT', tags: ['travel tech', 'bfsi', 'software'] },

    // Metals, Mining & Resources
    { symbol: 'VEDL', name: 'Vedanta Ltd.', price: 440.00, change: '+2.30%', sector: 'Metals', tags: ['zinc', 'aluminum', 'oil', 'mining', 'dividend'] },
    { symbol: 'JSWSTEEL', name: 'JSW Steel Ltd.', price: 940.00, change: '+1.10%', sector: 'Metals', tags: ['steel', 'jindal', 'metals', 'manufacturing'] },
    { symbol: 'HINDALCO', name: 'Hindalco Industries Ltd.', price: 645.00, change: '+1.45%', sector: 'Metals', tags: ['aluminum', 'copper', 'novelis', 'aditya birla'] },
    { symbol: 'JINDALSTEL', name: 'Jindal Steel & Power Ltd.', price: 885.00, change: '+1.35%', sector: 'Metals', tags: ['steel', 'power', 'infra'] },
    { symbol: 'NMDC', name: 'NMDC Ltd.', price: 215.00, change: '+1.25%', sector: 'Metals', tags: ['iron ore', 'mining', 'psu'] },

    // Oil, Gas & Refineries
    { symbol: 'BPCL', name: 'Bharat Petroleum Corporation Ltd.', price: 285.00, change: '+1.05%', sector: 'Energy', tags: ['petrol', 'diesel', 'refinery', 'psu'] },
    { symbol: 'IOC', name: 'Indian Oil Corporation Ltd.', price: 135.00, change: '+0.80%', sector: 'Energy', tags: ['petrol', 'diesel', 'oil', 'psu'] },
    { symbol: 'GAIL', name: 'GAIL (India) Ltd.', price: 185.00, change: '+1.15%', sector: 'Energy', tags: ['gas pipeline', 'cng', 'lpg', 'psu'] },

    // Cement & Infra Materials
    { symbol: 'ULTRACEMCO', name: 'UltraTech Cement Ltd.', price: 10850.00, change: '+0.90%', sector: 'Infrastructure', tags: ['cement', 'aditya birla', 'construction'] },
    { symbol: 'AMBUJACEM', name: 'Ambuja Cements Ltd.', price: 540.00, change: '+1.10%', sector: 'Infrastructure', tags: ['cement', 'adani', 'construction'] },
    { symbol: 'GRASIM', name: 'Grasim Industries Ltd.', price: 2520.00, change: '+0.70%', sector: 'Conglomerate', tags: ['textiles', 'chemicals', 'paints', 'birla'] },
    { symbol: 'IDEA', name: 'Vodafone Idea Ltd.', price: 7.45, change: '+2.05%', sector: 'Telecom', tags: ['vi', 'vodafone', 'telecom', '5g'] },

    // Healthcare, Hospitals & Pharma
    { symbol: 'APOLLOHOSP', name: 'Apollo Hospitals Enterprise Ltd.', price: 6850.00, change: '+1.30%', sector: 'Pharma', tags: ['hospitals', 'pharmacy', 'apollo 247', 'healthcare'] },
    { symbol: 'MAXHEALTH', name: 'Max Healthcare Institute Ltd.', price: 920.00, change: '+1.80%', sector: 'Pharma', tags: ['hospitals', 'healthcare', 'delhi ncr'] },
    { symbol: 'MANKIND', name: 'Mankind Pharma Ltd.', price: 2480.00, change: '+1.15%', sector: 'Pharma', tags: ['manforce', 'gas-o-fast', 'prega news', 'fmcg pharma'] },
    { symbol: 'LUPIN', name: 'Lupin Ltd.', price: 2040.00, change: '+1.40%', sector: 'Pharma', tags: ['generics', 'pharma', 'exports'] },
    { symbol: 'AUROPHARMA', name: 'Aurobindo Pharma Ltd.', price: 1240.00, change: '+0.95%', sector: 'Pharma', tags: ['generics', 'pharma', 'injectables'] }
  ];

  // --------------------------------------------------------------------------
  // 3. API Helpers & Backend Handshakes
  // --------------------------------------------------------------------------
  const savedRemoteBackend = localStorage.getItem('tradefox_backend_url');
  const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const API_BASE = savedRemoteBackend 
    ? savedRemoteBackend.replace(/\/+$/, '') 
    : (isLocalHost ? '/api' : (window.location.protocol.startsWith('http') ? '/api' : 'http://localhost:8080/api'));

  function formatCurrency(val, includePlusSign = false) {
    const num = Number(val) || 0;
    const isNeg = num < 0;
    const formatted = Math.abs(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (isNeg) {
      return `-₹${formatted}`;
    }
    if (includePlusSign && num > 0) {
      return `+₹${formatted}`;
    }
    return `₹${formatted}`;
  }

  function authHeaders(extra = {}) {
    const headers = { ...extra };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  let sessionAlertShown = false;
  function handleUnauthorized() {
    if (sessionAlertShown) return;
    sessionAlertShown = true;
    showToast('Your session has expired. Redirecting to login...', 'warning');
    setTimeout(() => {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      window.location.href = 'index.html';
    }, 1500);
  }

  // Fetch real verified user details and balance from PostgreSQL
  async function fetchRealUserDetails() {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}`, {
        headers: authHeaders({ 'Accept': 'application/json' })
      });
      if (res.ok) {
        const data = await res.json();
        liveUser.name = data.name || sessionUser.name;
        liveUser.email = data.email || sessionUser.email;
        liveUser.walletBalance = parseFloat(data.walletBalance) || 1000000.00;
        renderUserHeader();
        updateWalletSummaryUI();
      } else if (res.status === 401) {
        handleUnauthorized();
      }
    } catch (err) {
      console.warn('Could not fetch user details from /api/users:', err);
      renderUserHeader();
      updateWalletSummaryUI();
    }
  }

  // Fetch real holdings from PostgreSQL
  async function fetchBackendHoldings() {
    try {
      const res = await fetch(`${API_BASE}/holdings?userId=${userId}`, {
        headers: authHeaders({ 'Accept': 'application/json' })
      });
      if (res.ok) {
        holdings = await res.json();
      } else {
        if (res.status === 401) handleUnauthorized();
        holdings = [];
      }
    } catch (e) {
      console.warn('Failed to load holdings:', e);
      holdings = [];
    }
    renderHoldingsTable();
    updateWalletSummaryUI();
  }

  // Fetch real order book from PostgreSQL
  async function fetchBackendOrders() {
    try {
      const res = await fetch(`${API_BASE}/orders?userId=${userId}`, {
        headers: authHeaders({ 'Accept': 'application/json' })
      });
      if (res.ok) {
        orders = await res.json();
      } else {
        if (res.status === 401) handleUnauthorized();
        orders = [];
      }
    } catch (e) {
      console.warn('Failed to load orders:', e);
      orders = [];
    }
    renderOrdersTable('all');
  }

  // Fetch real watchlist from PostgreSQL
  async function fetchBackendWatchlist() {
    try {
      const res = await fetch(`${API_BASE}/watchlist?userId=${userId}`, {
        headers: authHeaders({ 'Accept': 'application/json' })
      });
      if (res.ok) {
        watchlist = await res.json();
      } else {
        if (res.status === 401) handleUnauthorized();
        watchlist = [];
      }
    } catch (e) {
      console.warn('Failed to load watchlist:', e);
      watchlist = [];
    }
    renderWatchlistTable();
    updateWatchlistButtonState();
  }

  function renderUserHeader() {
    const name = liveUser.name || 'Trader';
    const initial = name.trim().charAt(0).toUpperCase() || 'T';

    const userDisplayElem = document.getElementById('user-display-name');
    if (userDisplayElem) userDisplayElem.textContent = name;

    const profileBtnName = document.getElementById('profile-btn-name');
    if (profileBtnName) profileBtnName.textContent = name.split(' ')[0];

    const popupUserName = document.getElementById('popup-user-name');
    if (popupUserName) popupUserName.textContent = name;

    const popupUserEmail = document.getElementById('popup-user-email');
    if (popupUserEmail) popupUserEmail.textContent = liveUser.email;

    const userAvatarInitial = document.getElementById('user-avatar-initial');
    if (userAvatarInitial) userAvatarInitial.textContent = initial;

    const popupAvatarInitial = document.getElementById('popup-avatar-initial');
    if (popupAvatarInitial) popupAvatarInitial.textContent = initial;

    const popupUserId = document.getElementById('popup-user-id');
    if (popupUserId) popupUserId.textContent = `FOX-${liveUser.userId}`;
  }

  function updateWalletSummaryUI() {
    let totalInvested = 0;
    let totalCurrent = 0;
    let totalDayPnl = 0;
    let totalPrevDayValue = 0;
    const dataObj = marketQuotes && marketQuotes.data ? marketQuotes.data : {};

    holdings.forEach(h => {
      const qty = Number(h.quantity) || 0;
      const avg = Number(h.averagePurchasePrice) || 0;
      totalInvested += (qty * avg);

      const live = dataObj[h.stockSymbol];
      const curPrice = (live && (live.live_price || live.price)) ? Number(live.live_price || live.price) : avg;
      const dayChg = (live && live.day_change !== undefined) ? Number(live.day_change) : 0;
      const prevClose = (live && live.prev_close) ? Number(live.prev_close) : (curPrice - dayChg);

      const holdingCurrentVal = qty * curPrice;
      const holdingPrevVal = qty * prevClose;
      const stockDayPnl = (live && live.day_change !== undefined) 
        ? (qty * dayChg) 
        : (holdingCurrentVal - holdingPrevVal);

      totalCurrent += holdingCurrentVal;
      totalPrevDayValue += holdingPrevVal;
      totalDayPnl += stockDayPnl;
    });

    const totalPortfolioValue = liveUser.walletBalance + totalCurrent;

    // Profile Popup Balances
    const popupWallet = document.getElementById('popup-wallet-amount');
    if (popupWallet) {
      const parts = liveUser.walletBalance.toFixed(2).split('.');
      popupWallet.innerHTML = `₹${Number(parts[0]).toLocaleString('en-IN')}<span class="cents">.${parts[1]}</span>`;
    }

    const popupInvested = document.getElementById('popup-invested-val');
    if (popupInvested) popupInvested.textContent = formatCurrency(totalInvested);

    const popupTotal = document.getElementById('popup-total-val');
    if (popupTotal) popupTotal.textContent = formatCurrency(totalPortfolioValue);

    // Holdings View Summary Banner
    const hInvested = document.getElementById('holdings-total-invested');
    if (hInvested) hInvested.textContent = formatCurrency(totalInvested);

    const hCurrent = document.getElementById('holdings-total-current');
    if (hCurrent) hCurrent.textContent = formatCurrency(totalCurrent);

    const hPnl = document.getElementById('holdings-total-pnl');
    if (hPnl) {
      const totalPnl = totalCurrent - totalInvested;
      const pnlPercent = totalInvested > 0 ? ((totalPnl / totalInvested) * 100) : 0;
      hPnl.textContent = `${formatCurrency(totalPnl, true)} (${totalPnl >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%)`;
      hPnl.className = `summary-value ${totalPnl >= 0 ? 'positive' : 'negative'}`;
    }

    // 1-Day Returns (Live Portfolio 1-Day P&L)
    const hDayPnl = document.getElementById('holdings-day-pnl');
    if (hDayPnl) {
      if (holdings.length === 0) {
        hDayPnl.textContent = `₹0.00 (0.00%)`;
        hDayPnl.className = 'summary-value';
      } else {
        const dayPct = totalPrevDayValue > 0 ? ((totalDayPnl / totalPrevDayValue) * 100) : 0;
        hDayPnl.textContent = `${formatCurrency(totalDayPnl, true)} (${totalDayPnl >= 0 ? '+' : ''}${dayPct.toFixed(2)}%)`;
        hDayPnl.className = `summary-value ${totalDayPnl >= 0 ? 'positive' : 'negative'}`;
      }
    }

    const badge = document.getElementById('holdings-count-badge');
    if (badge) badge.textContent = holdings.length;
  }

  // Profile Popup Toggle
  const profileBtn = document.getElementById('profile-btn');
  const profilePopup = document.getElementById('profile-popup');

  if (profileBtn && profilePopup) {
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = profilePopup.classList.contains('hidden');
      if (isHidden) {
        profilePopup.classList.remove('hidden');
        profileBtn.setAttribute('aria-expanded', 'true');
      } else {
        profilePopup.classList.add('hidden');
        profileBtn.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('click', (e) => {
      if (!profilePopup.contains(e.target) && !profileBtn.contains(e.target)) {
        profilePopup.classList.add('hidden');
        profileBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  const btnRefreshBal = document.getElementById('btn-refresh-balance');
  if (btnRefreshBal) {
    btnRefreshBal.addEventListener('click', async () => {
      await fetchRealUserDetails();
      await fetchBackendHoldings();
      showToast('Synchronized balance from database', 'info');
    });
  }

  // Logout
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      localStorage.removeItem(STORAGE_KEY_USER);
      showToast('Logged out.', 'info');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 400);
    });
  }

  // --------------------------------------------------------------------------
  // 4. Major Indices Strip: Real Data from Backend
  // --------------------------------------------------------------------------
  async function fetchMarketQuotes() {
    try {
      const res = await fetch(`${API_BASE}/market/quotes`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        marketQuotes = data;
        updateIndicesStrip(data);
        renderExploreView(data);
        updateHoldingsPricesInPlace(data);
        updateWatchlistPricesInPlace(data);
        updateActiveTerminalLiveQuote(data);
        updateWalletSummaryUI();
      }
    } catch (e) {
      console.warn('Market quotes fetch failed:', e);
    }
  }

  function updateIndicesStrip(status) {
    if (!status) return;

    const statusText = document.getElementById('status-title-text');
    if (statusText) {
      statusText.textContent = status.tokenReady
        ? 'Live Feed (1m Ticks)'
        : (status.lastError || 'Live Feed (1m Ticks)');
    }

    const indices = status.indices || {};

    function applyIndex(sym, valElemId, changeElemId, fallbackVal, fallbackChg) {
      const valElem = document.getElementById(valElemId);
      const changeElem = document.getElementById(changeElemId);
      if (!valElem || !changeElem) return;

      if (indices[sym] && indices[sym].lastPrice) {
        const item = indices[sym];
        const newPrice = Number(item.lastPrice);
        const oldPrice = lastKnownIndexPrices[sym];

        if (oldPrice !== undefined && oldPrice !== newPrice) {
          valElem.classList.remove('flash-up', 'flash-down');
          void valElem.offsetWidth;
          valElem.classList.add(newPrice > oldPrice ? 'flash-up' : 'flash-down');
          setTimeout(() => valElem.classList.remove('flash-up', 'flash-down'), 1200);
        }
        lastKnownIndexPrices[sym] = newPrice;

        valElem.textContent = newPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const chg = Number(item.dayChange || 0);
        const chgPct = Number(item.dayChangePercentage || 0);
        const isUp = chg >= 0;
        changeElem.className = `index-change ${isUp ? 'up' : 'down'}`;
        changeElem.textContent = `${isUp ? '+' : ''}${chg.toFixed(2)} (${isUp ? '+' : ''}${chgPct.toFixed(2)}%)`;
      } else {
        valElem.textContent = fallbackVal;
        changeElem.className = 'index-change up';
        changeElem.textContent = fallbackChg;
      }
    }

    applyIndex('NIFTY 50', 'val-nifty', 'change-nifty', '24,852.10', '+112.40 (+0.45%)');
    applyIndex('SENSEX', 'val-sensex', 'change-sensex', '81,420.50', '+325.80 (+0.40%)');
    applyIndex('BANK NIFTY', 'val-banknifty', 'change-banknifty', '51,280.90', '+180.20 (+0.35%)');
    applyIndex('NIFTY IT', 'val-niftyit', 'change-niftyit', '42,150.00', '+420.10 (+1.01%)');
    applyIndex('INDIA VIX', 'val-vix', 'change-vix', '13.45', '-0.32 (-2.32%)');
  }

  // --------------------------------------------------------------------------
  // 5. Navigation Tabs
  // --------------------------------------------------------------------------
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabViews = document.querySelectorAll('.tab-view');

  function switchDashboardTab(tabId) {
    navTabs.forEach(t => {
      const isActive = t.getAttribute('data-tab') === tabId;
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    tabViews.forEach(v => {
      const isTarget = v.id === `view-${tabId}`;
      v.classList.toggle('active', isTarget);
      v.classList.toggle('hidden', !isTarget);
    });

    if (tabId === 'explore') renderExploreView(marketQuotes);
    if (tabId === 'holdings') {
      renderHoldingsTable();
      fetchBackendHoldings();
    }
    if (tabId === 'orders') {
      renderOrdersTable('all');
      fetchBackendOrders();
    }
    if (tabId === 'watchlist') {
      renderWatchlistTable();
      fetchBackendWatchlist();
    }
  }

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchDashboardTab(tab.getAttribute('data-tab'));
    });
  });

  // --------------------------------------------------------------------------
  // 6. View Renderers (Explore, Holdings, Orders, Watchlist)
  // --------------------------------------------------------------------------

  // --------------------------------------------------------------------------
  // Categorized Market Feed Configuration (Groww-Style Rail Feeds)
  // --------------------------------------------------------------------------
  const FEED_CATEGORIES = [
    {
      id: 'popular',
      icon: '🔥',
      title: 'Most Popular on TradeFox',
      subtitle: 'Benchmark leaders with highest daily volume',
      symbols: ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'TATAMOTORS', 'ZOMATO', 'HAL', 'ITC']
    },
    {
      id: 'gainers',
      icon: '📈',
      title: 'Top Gainers Today',
      subtitle: 'Securities currently yielding the highest day gain %',
      isDynamicGainers: true
    },
    {
      id: 'banking',
      icon: '🏦',
      title: 'Banking & Financials',
      subtitle: 'Leading private, PSU banks and NBFC powerhouses',
      symbols: ['HDFCBANK', 'ICICIBANK', 'SBIN', 'KOTAKBANK', 'AXISBANK', 'BAJFINANCE', 'JIOFIN']
    },
    {
      id: 'tech',
      icon: '💻',
      title: 'IT & Technology Leaders',
      subtitle: 'Software exports, global IT enterprises and digital services',
      symbols: ['TCS', 'INFY', 'WIPRO', 'HCLTECH', 'ZOMATO']
    },
    {
      id: 'auto',
      icon: '🚗',
      title: 'Auto, EV & Mobility',
      subtitle: 'Electric mobility, passenger cars and commercial fleets',
      symbols: ['TATAMOTORS', 'MARUTI', 'M&M']
    },
    {
      id: 'energy',
      icon: '⚡',
      title: 'Energy, Oil & Power',
      subtitle: 'National grid, green energy producers and refineries',
      symbols: ['RELIANCE', 'NTPC', 'POWERGRID', 'ONGC', 'COALINDIA']
    },
    {
      id: 'defense',
      icon: '🛡️',
      title: 'Defense, Infra & Railways',
      subtitle: 'Aerospace, defense electronics, mega-infra and rail transport',
      symbols: ['HAL', 'BEL', 'LT', 'ADANIENT', 'ADANIPORTS', 'IRCTC']
    },
    {
      id: 'pharma',
      icon: '💊',
      title: 'Pharma & Healthcare',
      subtitle: 'Global generics, formulations and active pharma ingredients',
      symbols: ['SUNPHARMA', 'DRREDDY', 'CIPLA']
    }
  ];

  function generateCardSparklineSvg(isUp) {
    const strokeColor = isUp ? '#00D09C' : '#EB5B56';
    const fillColor = isUp ? 'rgba(0, 208, 156, 0.12)' : 'rgba(235, 91, 86, 0.12)';
    const points = isUp 
      ? "M0,26 Q30,22 60,24 T120,16 T180,9 T220,5 L220,36 L0,36 Z"
      : "M0,8 Q30,12 60,11 T120,20 T180,26 T220,31 L220,36 L0,36 Z";
    const line = isUp
      ? "M0,26 Q30,22 60,24 T120,16 T180,9 T220,5"
      : "M0,8 Q30,12 60,11 T120,20 T180,26 T220,31";
    return `
      <svg class="card-sparkline-svg" viewBox="0 0 220 36" preserveAspectRatio="none">
        <path d="${points}" fill="${fillColor}" />
        <path d="${line}" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" />
      </svg>
    `;
  }

  // View 1: Explore (With Groww-Style Categorized Rails & Full Table)
  function renderExploreView(status) {
    const container = document.getElementById('explore-content-area');
    if (!container) return;

    const dataObj = status ? (status.data || {}) : {};

    // In-place update if already rendered in DOM
    const categoriesWrap = container.querySelector('#explore-categories-wrapper');
    const existingTable = container.querySelector('.stocks-table-card');

    if (categoriesWrap && existingTable) {
      // 1. Update horizontal cards
      container.querySelectorAll('.feed-stock-card').forEach(card => {
        const sym = card.getAttribute('data-symbol');
        const live = dataObj[sym];
        if (!live || !live.live_price) return;

        const newPrice = Number(live.live_price);
        const oldPrice = lastKnownStockPrices['CARD_' + sym];
        const priceEl = card.querySelector('.card-price');
        if (priceEl) {
          if (oldPrice !== undefined && oldPrice !== newPrice) {
            priceEl.classList.remove('flash-up', 'flash-down');
            void priceEl.offsetWidth;
            priceEl.classList.add(newPrice > oldPrice ? 'flash-up' : 'flash-down');
            setTimeout(() => priceEl.classList.remove('flash-up', 'flash-down'), 1200);
          }
          priceEl.textContent = formatCurrency(newPrice);
        }
        lastKnownStockPrices['CARD_' + sym] = newPrice;

        const badgeEl = card.querySelector('.card-change-badge');
        if (badgeEl && live.day_change_percentage !== undefined) {
          const chgPct = Number(live.day_change_percentage);
          const isUp = chgPct >= 0;
          badgeEl.className = `card-change-badge ${isUp ? 'up' : 'down'}`;
          badgeEl.innerHTML = `${isUp ? '▲' : '▼'} ${chgPct.toFixed(2)}%`;
        }
      });

      // 2. Update directory table rows
      BENCHMARK_STOCKS.forEach(item => {
        const row = container.querySelector(`tr[data-symbol="${item.symbol}"]`);
        if (!row) return;

        const live = dataObj[item.symbol];
        const newPrice = live && live.live_price ? Number(live.live_price) : item.price;
        const oldPrice = lastKnownStockPrices[item.symbol];

        const priceEl = row.querySelector('.explore-price-val');
        if (priceEl) {
          if (oldPrice !== undefined && oldPrice !== newPrice) {
            priceEl.classList.remove('flash-up', 'flash-down');
            void priceEl.offsetWidth;
            priceEl.classList.add(newPrice > oldPrice ? 'flash-up' : 'flash-down');
            setTimeout(() => priceEl.classList.remove('flash-up', 'flash-down'), 1200);
          }
          priceEl.textContent = formatCurrency(newPrice);
        }

        const changeEl = row.querySelector('.explore-change-val');
        if (changeEl && live && live.day_change_percentage !== undefined) {
          const chgPct = Number(live.day_change_percentage);
          const isUp = chgPct >= 0;
          changeEl.className = `mover-change explore-change-val ${isUp ? 'up' : 'down'}`;
          changeEl.textContent = `${isUp ? '+' : ''}${chgPct.toFixed(2)}%`;
        }

        const btnTrade = row.querySelector('.btn-explore-trade');
        if (btnTrade) btnTrade.setAttribute('data-price', newPrice);

        lastKnownStockPrices[item.symbol] = newPrice;
      });
      return;
    }

    // Initial Full Render: Build Horizontal Category Rails + Directory Table
    let categoriesHtml = `<div id="explore-categories-wrapper">`;

    FEED_CATEGORIES.forEach(cat => {
      let stockList = [];
      if (cat.isDynamicGainers) {
        // Sort benchmark stocks by live percentage gain descending
        stockList = [...BENCHMARK_STOCKS].map(s => {
          const live = dataObj[s.symbol];
          const pct = live && live.day_change_percentage !== undefined ? Number(live.day_change_percentage) : parseFloat(s.change);
          return { ...s, currentPct: pct };
        }).sort((a, b) => b.currentPct - a.currentPct).slice(0, 8);
      } else {
        stockList = cat.symbols
          .map(sym => BENCHMARK_STOCKS.find(s => s.symbol === sym))
          .filter(Boolean);
      }

      categoriesHtml += `
        <section class="feed-category-section" id="cat-sec-${cat.id}">
          <div class="category-header">
            <div class="category-title-group">
              <span class="category-title-icon">${cat.icon}</span>
              <div>
                <span class="category-title-text">${cat.title}</span>
                <span class="category-subtitle">${cat.subtitle}</span>
              </div>
            </div>
            <div class="category-nav-controls">
              <button type="button" class="rail-nav-btn prev" data-target="rail-${cat.id}" data-dir="prev" aria-label="Scroll Left">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <button type="button" class="rail-nav-btn next" data-target="rail-${cat.id}" data-dir="next" aria-label="Scroll Right">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>
          </div>

          <div class="category-scroll-rail" id="rail-${cat.id}">
            ${stockList.map(item => {
              const live = dataObj[item.symbol];
              const price = live && live.live_price ? Number(live.live_price) : item.price;
              const chgPct = (live && live.day_change_percentage !== undefined)
                ? Number(live.day_change_percentage)
                : parseFloat(item.change);
              const isUp = chgPct >= 0;

              lastKnownStockPrices['CARD_' + item.symbol] = price;
              lastKnownStockPrices[item.symbol] = price;

              return `
                <div class="feed-stock-card" data-symbol="${item.symbol}">
                  <div>
                    <div class="card-top-row">
                      <span class="card-symbol">${item.symbol}</span>
                      <span class="card-sector-pill">${item.sector || 'NSE'}</span>
                    </div>
                    <div class="card-company-name" title="${item.name}">${item.name}</div>
                  </div>
                  <div class="card-sparkline-wrap">
                    ${generateCardSparklineSvg(isUp)}
                  </div>
                  <div class="card-bottom-row">
                    <div class="card-price-block">
                      <span class="card-price" data-sym="${item.symbol}">${formatCurrency(price)}</span>
                    </div>
                    <span class="card-change-badge ${isUp ? 'up' : 'down'}" data-sym="${item.symbol}">
                      ${isUp ? '▲' : '▼'} ${chgPct.toFixed(2)}%
                    </span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </section>
      `;
    });

    categoriesHtml += `</div>`;

    // Directory Table Header & Table
    const directoryTableHtml = `
      <div class="category-directory-divider">
        <div>
          <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.25rem;">
            📊 All Benchmark Securities (34 Stocks)
          </h3>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0;">
            Complete exchange listing with real-time PostgreSQL trade execution
          </p>
        </div>
      </div>

      <div class="stocks-table-card">
        <table class="fin-table">
          <thead>
            <tr>
              <th>Security Name</th>
              <th>Sector</th>
              <th>Live Price</th>
              <th>Day Change</th>
              <th class="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            ${BENCHMARK_STOCKS.map(item => {
              const live = dataObj[item.symbol];
              const price = live && live.live_price ? Number(live.live_price) : item.price;
              const chg = (live && live.day_change_percentage !== undefined)
                ? `${Number(live.day_change_percentage) >= 0 ? '+' : ''}${Number(live.day_change_percentage).toFixed(2)}%`
                : item.change;
              const isUp = !chg.startsWith('-');
              return `
                <tr class="clickable-stock-row" data-symbol="${item.symbol}">
                  <td>
                    <div class="stock-cell-wrap">
                      <strong class="stock-cell-sym">${item.symbol}</strong>
                      <span class="stock-cell-name" style="font-size: 0.78rem; color: var(--text-muted);">${item.name}</span>
                    </div>
                  </td>
                  <td><span class="stock-sector-badge">${item.sector}</span></td>
                  <td><strong class="explore-price-val">${formatCurrency(price)}</strong></td>
                  <td><span class="mover-change explore-change-val ${isUp ? 'up' : 'down'}">${chg}</span></td>
                  <td class="text-right" onclick="event.stopPropagation();">
                    <button type="button" class="btn-action-buy btn-explore-trade" data-sym="${item.symbol}" data-price="${price}">
                      View &amp; Trade
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = categoriesHtml + directoryTableHtml;

    // Attach card click handlers (Opens Stock Terminal)
    container.querySelectorAll('.feed-stock-card').forEach(card => {
      card.addEventListener('click', () => {
        const sym = card.getAttribute('data-symbol');
        openStockTerminal(sym);
      });
    });

    // Attach rail scroll arrow buttons
    container.querySelectorAll('.rail-nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetId = btn.getAttribute('data-target');
        const direction = btn.getAttribute('data-dir');
        const rail = document.getElementById(targetId);
        if (rail) {
          rail.scrollBy({ left: direction === 'next' ? 280 : -280, behavior: 'smooth' });
        }
      });
    });

    // Attach table row click handlers
    container.querySelectorAll('.clickable-stock-row').forEach(row => {
      row.addEventListener('click', () => {
        const sym = row.getAttribute('data-symbol');
        openStockTerminal(sym);
      });
    });

    container.querySelectorAll('.btn-explore-trade').forEach(btn => {
      btn.addEventListener('click', () => {
        const sym = btn.getAttribute('data-sym');
        const price = parseFloat(btn.getAttribute('data-price')) || 100.0;
        openStockTerminal(sym, price, 'BUY');
      });
    });
  }

  // View 2: Holdings (Direct from PostgreSQL with Real-Time Live Quote Ticks)
  function renderHoldingsTable() {
    const tbody = document.getElementById('holdings-table-body');
    if (!tbody) return;

    if (holdings.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 3rem 1.5rem; color: var(--text-muted);">
            <div style="font-size: 1.6rem; margin-bottom: 0.5rem;">📁</div>
            <div style="font-weight: 600; color: var(--text-main); margin-bottom: 0.25rem;">No holdings in your portfolio</div>
            <div style="font-size: 0.8rem;">Click on any stock or use the search bar above to place your first trade.</div>
          </td>
        </tr>
      `;
      return;
    }

    const dataObj = marketQuotes && marketQuotes.data ? marketQuotes.data : {};

    tbody.innerHTML = holdings.map((h) => {
      const qty = Number(h.quantity) || 0;
      const avg = Number(h.averagePurchasePrice) || 0;
      const invested = Number(h.investedAmount) || (qty * avg);
      const live = dataObj[h.stockSymbol];
      const benchmark = BENCHMARK_STOCKS.find(b => b.symbol === h.stockSymbol);
      // Priority: 1. Live market feed, 2. Last known holding price, 3. Purchase price (avg).
      // Strictly avoid falling back to benchmark.price which causes instant phantom profit/loss!
      const currentPrice = (live && (live.live_price || live.price)) 
        ? Number(live.live_price || live.price) 
        : (lastKnownStockPrices['HOLDING_' + h.stockSymbol] || avg);
      const currentValue = qty * currentPrice;
      let pnl = currentValue - invested;
      if (Math.abs(pnl) < 0.01) pnl = 0.00;
      const pnlPct = invested > 0 && Math.abs(pnl) >= 0.01 ? ((pnl / invested) * 100).toFixed(2) : '0.00';
      const isPositive = pnl >= 0;

      // Stock Day Change (per share)
      const dayChg = (live && live.day_change !== undefined) 
        ? Number(live.day_change) 
        : (benchmark ? (benchmark.price * (parseFloat(benchmark.change) / 100)) : 0);
      const dayPct = (live && live.day_change_percentage !== undefined) 
        ? Number(live.day_change_percentage) 
        : (benchmark ? parseFloat(benchmark.change) : 0);
      const isDayPositive = dayChg >= 0;

      // Holding 1-Day Gain (in Rupees)
      const dayHoldingPnl = qty * dayChg;

      // Canonical display name
      const companyName = benchmark ? benchmark.name : (h.stockName || h.stockSymbol);

      lastKnownStockPrices['HOLDING_' + h.stockSymbol] = currentPrice;

      return `
        <tr class="clickable-holding-row" data-symbol="${h.stockSymbol}">
          <td>
            <div class="stock-cell-wrap">
              <strong class="stock-cell-sym">${h.stockSymbol}</strong>
              <span style="font-size: 0.76rem; color: var(--text-muted);">${companyName}</span>
            </div>
          </td>
          <td><strong>${qty}</strong></td>
          <td>${formatCurrency(avg)}</td>
          <td>
            <strong class="holding-live-price" data-sym="${h.stockSymbol}">${formatCurrency(currentPrice)}</strong>
            <div class="holding-ltp-change ${isDayPositive ? 'up' : 'down'}" style="font-size: 0.74rem; font-weight: 500; margin-top: 2px;">
              ${formatCurrency(dayChg, true)} (${isDayPositive ? '+' : ''}${dayPct.toFixed(2)}%)
            </div>
          </td>
          <td>
            <strong class="holding-current-val">${formatCurrency(currentValue)}</strong>
            <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 2px;">Inv: ${formatCurrency(invested)}</div>
          </td>
          <td>
            <span class="mover-change holding-day-return-val ${isDayPositive ? 'up' : 'down'}">
              ${formatCurrency(dayHoldingPnl, true)} (${isDayPositive ? '+' : ''}${dayPct.toFixed(2)}%)
            </span>
          </td>
          <td>
            <span class="mover-change holding-pnl-val ${isPositive ? 'up' : 'down'}">
              ${formatCurrency(pnl, true)} (${isPositive ? '+' : ''}${pnlPct}%)
            </span>
          </td>
          <td class="text-right" onclick="event.stopPropagation();">
            <div class="cell-actions">
              <button type="button" class="btn-action-buy btn-holding-buy" data-sym="${h.stockSymbol}" data-price="${currentPrice}">+ Buy</button>
              <button type="button" class="btn-action-sell btn-holding-sell" data-sym="${h.stockSymbol}" data-price="${currentPrice}">Exit</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.clickable-holding-row').forEach(row => {
      row.addEventListener('click', () => {
        const sym = row.getAttribute('data-symbol');
        openStockTerminal(sym);
      });
    });

    tbody.querySelectorAll('.btn-holding-buy').forEach(b => {
      b.addEventListener('click', () => {
        const sym = b.getAttribute('data-sym');
        const price = parseFloat(b.getAttribute('data-price')) || 100.0;
        openStockTerminal(sym, price, 'BUY');
      });
    });

    tbody.querySelectorAll('.btn-holding-sell').forEach(b => {
      b.addEventListener('click', () => {
        const sym = b.getAttribute('data-sym');
        const price = parseFloat(b.getAttribute('data-price')) || 100.0;
        openStockTerminal(sym, price, 'SELL');
      });
    });
  }

  // In-place Holdings Live Quote Updater (Flashes prices smoothly)
  function updateHoldingsPricesInPlace(status) {
    if (!status || !status.data || holdings.length === 0) return;
    const tbody = document.getElementById('holdings-table-body');
    if (!tbody) return;

    holdings.forEach(h => {
      const row = tbody.querySelector(`tr[data-symbol="${h.stockSymbol}"]`);
      if (!row) return;

      const live = status.data[h.stockSymbol];
      if (!live || !live.live_price) return;

      const newPrice = Number(live.live_price);
      const qty = Number(h.quantity) || 0;
      const avg = Number(h.averagePurchasePrice) || 0;
      const invested = Number(h.investedAmount) || (qty * avg);
      const currentValue = qty * newPrice;
      const pnl = currentValue - invested;
      const pnlPct = invested > 0 ? ((pnl / invested) * 100).toFixed(2) : '0.00';
      const isPositive = pnl >= 0;

      const dayChg = live.day_change !== undefined ? Number(live.day_change) : 0;
      const dayPct = live.day_change_percentage !== undefined ? Number(live.day_change_percentage) : 0;
      const dayHoldingPnl = qty * dayChg;
      const isDayPositive = dayChg >= 0;

      const priceEl = row.querySelector('.holding-live-price');
      if (priceEl) {
        const oldPrice = lastKnownStockPrices['HOLDING_' + h.stockSymbol];
        if (oldPrice !== undefined && oldPrice !== newPrice) {
          priceEl.classList.remove('flash-up', 'flash-down');
          void priceEl.offsetWidth;
          priceEl.classList.add(newPrice > oldPrice ? 'flash-up' : 'flash-down');
          setTimeout(() => priceEl.classList.remove('flash-up', 'flash-down'), 1200);
        }
        lastKnownStockPrices['HOLDING_' + h.stockSymbol] = newPrice;
        priceEl.textContent = formatCurrency(newPrice);
      }

      const ltpChangeEl = row.querySelector('.holding-ltp-change');
      if (ltpChangeEl) {
        ltpChangeEl.className = `holding-ltp-change ${isDayPositive ? 'up' : 'down'}`;
        ltpChangeEl.textContent = `${formatCurrency(dayChg, true)} (${isDayPositive ? '+' : ''}${dayPct.toFixed(2)}%)`;
      }

      const curValEl = row.querySelector('.holding-current-val');
      if (curValEl) curValEl.textContent = formatCurrency(currentValue);

      const dayReturnEl = row.querySelector('.holding-day-return-val');
      if (dayReturnEl) {
        dayReturnEl.className = `mover-change holding-day-return-val ${isDayPositive ? 'up' : 'down'}`;
        dayReturnEl.textContent = `${formatCurrency(dayHoldingPnl, true)} (${isDayPositive ? '+' : ''}${dayPct.toFixed(2)}%)`;
      }

      const pnlEl = row.querySelector('.holding-pnl-val');
      if (pnlEl) {
        pnlEl.className = `mover-change holding-pnl-val ${isPositive ? 'up' : 'down'}`;
        pnlEl.textContent = `${formatCurrency(pnl, true)} (${isPositive ? '+' : ''}${pnlPct}%)`;
      }

      const btnBuy = row.querySelector('.btn-holding-buy');
      if (btnBuy) btnBuy.setAttribute('data-price', newPrice);
      const btnSell = row.querySelector('.btn-holding-sell');
      if (btnSell) btnSell.setAttribute('data-price', newPrice);
    });

    updateWalletSummaryUI();
  }

  // View 3: Orders (Direct from PostgreSQL)
  function renderOrdersTable(filter = 'all') {
    const tbody = document.getElementById('orders-table-body');
    if (!tbody) return;

    const filtered = filter === 'all' ? orders : orders.filter(o => o.orderStatus === filter);

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 3rem 1.5rem; color: var(--text-muted);">
            <div style="font-size: 1.6rem; margin-bottom: 0.5rem;">📝</div>
            <div style="font-weight: 600; color: var(--text-main); margin-bottom: 0.25rem;">No ${filter === 'all' ? '' : filter.toLowerCase() + ' '}orders found</div>
            <div style="font-size: 0.8rem;">Every executed trade and limit order handshakes with PostgreSQL and logs here.</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(o => {
      const dateStr = o.createdAt ? new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Just now';
      const isBuy = o.orderType === 'BUY';
      const statusClass = (o.orderStatus || 'EXECUTED').toLowerCase();

      let actionCell = `<span style="color: var(--text-muted); font-size: 0.75rem;">Filled</span>`;
      if (o.orderStatus === 'PENDING') {
        actionCell = `<button type="button" class="btn-cancel-order" data-order-id="${o.orderId}">Cancel</button>`;
      } else if (o.orderStatus === 'CANCELLED') {
        actionCell = `<span style="color: var(--text-muted); font-size: 0.75rem;">Refunded</span>`;
      } else if (o.orderStatus === 'REJECTED') {
        actionCell = `<span style="color: var(--market-red); font-size: 0.75rem;">Rejected</span>`;
      }

      return `
        <tr class="clickable-order-row" data-symbol="${o.stockSymbol}">
          <td style="color: var(--text-muted); font-size: 0.8rem;">${dateStr}</td>
          <td><strong style="color: ${isBuy ? 'var(--market-green)' : 'var(--market-red)'}">${o.orderType}</strong></td>
          <td>
            <strong>${o.stockSymbol}</strong>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${o.stockName || ''}</div>
          </td>
          <td><span class="info-tag tag-simulated">Delivery</span></td>
          <td>${o.quantity}</td>
          <td><strong>${formatCurrency(o.orderPrice)}</strong></td>
          <td><span class="status-badge ${statusClass}">${o.orderStatus}</span></td>
          <td class="text-right" onclick="event.stopPropagation();">${actionCell}</td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.clickable-order-row').forEach(row => {
      row.addEventListener('click', () => {
        const sym = row.getAttribute('data-symbol');
        openStockTerminal(sym);
      });
    });

    tbody.querySelectorAll('.btn-cancel-order').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const orderId = btn.getAttribute('data-order-id');
        btn.disabled = true;
        btn.textContent = 'Cancelling...';
        try {
          const res = await fetch(`${API_BASE}/orders/${orderId}/cancel?userId=${userId}`, {
            method: 'POST',
            headers: authHeaders({ 'Accept': 'application/json' })
          });
          if (res.ok) {
            const data = await res.json();
            liveUser.walletBalance = Number(data.remainingWalletBalance);
            showToast(`Order #${orderId} cancelled. Funds refunded to wallet.`, 'info');
            await fetchRealUserDetails();
            await fetchBackendOrders();
          } else {
            const errData = await res.json().catch(() => ({}));
            showToast(errData.message || 'Could not cancel order', 'error');
            btn.disabled = false;
            btn.textContent = 'Cancel';
          }
        } catch (err) {
          console.error('Cancel order error:', err);
          showToast('Failed to cancel order on backend', 'error');
          btn.disabled = false;
          btn.textContent = 'Cancel';
        }
      });
    });
  }

  const orderPills = document.querySelectorAll('.order-filter-pill');
  orderPills.forEach(pill => {
    pill.addEventListener('click', () => {
      orderPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      renderOrdersTable(pill.getAttribute('data-filter'));
    });
  });

  // View 4: Watchlist (Direct from PostgreSQL)
  function renderWatchlistTable() {
    const tbody = document.getElementById('watchlist-table-body');
    const tag = document.getElementById('watchlist-count-tag');
    if (!tbody) return;

    if (tag) tag.textContent = `${watchlist.length} Securities`;

    if (watchlist.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 3rem 1.5rem; color: var(--text-muted);">
            <div style="font-size: 1.6rem; margin-bottom: 0.5rem;">⭐</div>
            <div style="font-weight: 600; color: var(--text-main); margin-bottom: 0.25rem;">Your watchlist is empty</div>
            <div style="font-size: 0.8rem; margin-bottom: 1rem;">Click on any stock to open its window and add it to your watchlist.</div>
            <div style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
              <button type="button" class="quick-qty-btn btn-quick-add-wl" data-sym="RELIANCE" data-name="Reliance Industries Ltd.">+ RELIANCE</button>
              <button type="button" class="quick-qty-btn btn-quick-add-wl" data-sym="TCS" data-name="Tata Consultancy Services Ltd.">+ TCS</button>
              <button type="button" class="quick-qty-btn btn-quick-add-wl" data-sym="HDFCBANK" data-name="HDFC Bank Ltd.">+ HDFCBANK</button>
              <button type="button" class="quick-qty-btn btn-quick-add-wl" data-sym="INFY" data-name="Infosys Ltd.">+ INFY</button>
            </div>
          </td>
        </tr>
      `;

      tbody.querySelectorAll('.btn-quick-add-wl').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const sym = btn.getAttribute('data-sym');
          const name = btn.getAttribute('data-name');
          await toggleWatchlistBackend(sym, name, true);
        });
      });
      return;
    }

    const dataObj = marketQuotes && marketQuotes.data ? marketQuotes.data : {};

    tbody.innerHTML = watchlist.map((item) => {
      const live = dataObj[item.stockSymbol];
      const benchmark = BENCHMARK_STOCKS.find(b => b.symbol === item.stockSymbol);
      const price = (live && (live.live_price || live.price)) 
        ? Number(live.live_price || live.price) 
        : (benchmark ? benchmark.price : (lastKnownStockPrices['WL_' + item.stockSymbol] || null));
      const chgPct = (live && live.day_change_percentage !== undefined) 
        ? Number(live.day_change_percentage) 
        : (benchmark ? benchmark.changePct : null);
      const isUp = chgPct !== null ? chgPct >= 0 : true;
      const displayName = benchmark ? benchmark.name : (item.stockName || item.stockSymbol);

      if (price) lastKnownStockPrices['WL_' + item.stockSymbol] = price;

      return `
        <tr class="clickable-wl-row" data-symbol="${item.stockSymbol}">
          <td>
            <div class="stock-cell-wrap">
              <strong class="stock-cell-sym">${item.stockSymbol}</strong>
              <span style="font-size: 0.76rem; color: var(--text-muted);">${displayName}</span>
            </div>
          </td>
          <td><span class="stock-exchange-badge">NSE</span></td>
          <td><strong class="wl-live-price" data-sym="${item.stockSymbol}">${price ? formatCurrency(price) : 'Fetching...'}</strong></td>
          <td>
            <span class="mover-change wl-change-val ${isUp ? 'up' : 'down'}">
              ${chgPct !== null ? `${isUp ? '+' : ''}${chgPct.toFixed(2)}%` : '—'}
            </span>
          </td>
          <td class="text-right" onclick="event.stopPropagation();">
            <div class="cell-actions">
              <button type="button" class="btn-action-buy btn-wl-trade" data-sym="${item.stockSymbol}" data-price="${price || 100}">Trade</button>
              <button type="button" class="btn-action-sell btn-wl-remove" data-sym="${item.stockSymbol}" title="Remove from Watchlist">✕</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.clickable-wl-row').forEach(row => {
      row.addEventListener('click', () => {
        const sym = row.getAttribute('data-symbol');
        openStockTerminal(sym);
      });
    });

    tbody.querySelectorAll('.btn-wl-trade').forEach(b => {
      b.addEventListener('click', () => {
        const sym = b.getAttribute('data-sym');
        const price = parseFloat(b.getAttribute('data-price')) || 100.0;
        openStockTerminal(sym, price, 'BUY');
      });
    });

    tbody.querySelectorAll('.btn-wl-remove').forEach(b => {
      b.addEventListener('click', async () => {
        const sym = b.getAttribute('data-sym');
        await toggleWatchlistBackend(sym, sym, false);
      });
    });
  }

  // In-place Watchlist Live Quote Updater (Flashes prices smoothly)
  function updateWatchlistPricesInPlace(status) {
    if (!status || !status.data || watchlist.length === 0) return;
    const tbody = document.getElementById('watchlist-table-body');
    if (!tbody) return;

    watchlist.forEach(item => {
      const row = tbody.querySelector(`tr[data-symbol="${item.stockSymbol}"]`);
      if (!row) return;

      const live = status.data[item.stockSymbol];
      if (!live || !live.live_price) return;

      const newPrice = Number(live.live_price);
      const chgPct = Number(live.day_change_percentage || 0);
      const isUp = chgPct >= 0;

      const priceEl = row.querySelector('.wl-live-price');
      if (priceEl) {
        const oldPrice = lastKnownStockPrices['WL_' + item.stockSymbol];
        if (oldPrice !== undefined && oldPrice !== newPrice) {
          priceEl.classList.remove('flash-up', 'flash-down');
          void priceEl.offsetWidth;
          priceEl.classList.add(newPrice > oldPrice ? 'flash-up' : 'flash-down');
          setTimeout(() => priceEl.classList.remove('flash-up', 'flash-down'), 1200);
        }
        lastKnownStockPrices['WL_' + item.stockSymbol] = newPrice;
        priceEl.textContent = formatCurrency(newPrice);
      }

      const chgEl = row.querySelector('.wl-change-val');
      if (chgEl) {
        chgEl.className = `mover-change wl-change-val ${isUp ? 'up' : 'down'}`;
        chgEl.textContent = `${isUp ? '+' : ''}${chgPct.toFixed(2)}%`;
      }

      const btnTrade = row.querySelector('.btn-wl-trade');
      if (btnTrade) btnTrade.setAttribute('data-price', newPrice);
    });
  }

  // --------------------------------------------------------------------------
  // 7. Watchlist Backend Handshake (Add / Remove)
  // --------------------------------------------------------------------------
  async function toggleWatchlistBackend(symbol, name, forceAdd = null) {
    const isCurrentlyIn = watchlist.some(w => w.stockSymbol === symbol);
    const shouldAdd = forceAdd !== null ? forceAdd : !isCurrentlyIn;

    try {
      if (shouldAdd) {
        const benchmark = BENCHMARK_STOCKS.find(b => b.symbol === symbol);
        const resolvedName = name || (benchmark ? benchmark.name : symbol);
        const res = await fetch(`${API_BASE}/watchlist`, {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ userId, stockSymbol: symbol, stockName: resolvedName })
        });
        if (res.ok) {
          showToast(`Added ${symbol} to your watchlist`, 'success');
        } else if (res.status === 401) {
          handleUnauthorized();
        }
      } else {
        const res = await fetch(`${API_BASE}/watchlist?userId=${userId}&symbol=${symbol}`, {
          method: 'DELETE',
          headers: authHeaders()
        });
        if (res.ok) {
          showToast(`Removed ${symbol} from watchlist`, 'info');
        } else if (res.status === 401) {
          handleUnauthorized();
        }
      }
      await fetchBackendWatchlist();
      updateWatchlistButtonState();
    } catch (e) {
      console.error('Failed to toggle watchlist:', e);
      showToast('Could not update watchlist in database', 'error');
    }
  }

  function updateWatchlistButtonState() {
    const btn = document.getElementById('modal-btn-watchlist');
    const txt = document.getElementById('modal-watchlist-text');
    if (!btn || !txt) return;

    const isIn = watchlist.some(w => w.stockSymbol === activeStock.symbol);
    btn.classList.toggle('active', isIn);
    txt.textContent = isIn ? 'Saved' : 'Watchlist';
  }

  const modalWlBtn = document.getElementById('modal-btn-watchlist');
  if (modalWlBtn) {
    modalWlBtn.addEventListener('click', async () => {
      await toggleWatchlistBackend(activeStock.symbol, activeStock.name);
    });
  }

  // --------------------------------------------------------------------------
  // 8. Advanced Stock Search & Discovery (Groww-Style)
  // --------------------------------------------------------------------------
  const searchInput = document.getElementById('stock-search-input');
  const searchDropdown = document.getElementById('search-dropdown');
  const searchResultsList = document.getElementById('search-results-list');
  const searchClearBtn = document.getElementById('search-clear-btn');
  const searchFilterPills = document.querySelectorAll('.search-pill');

  const STORAGE_KEY_RECENT_SEARCHES = 'tradefox_recent_searches';
  let activeSearchSector = 'all';
  let activeSearchIndex = -1;

  function getRecentSearches() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_RECENT_SEARCHES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  function saveRecentSearch(symbol) {
    if (!symbol) return;
    const isRealStock = BENCHMARK_STOCKS.some(s => s.symbol.toUpperCase() === symbol.toUpperCase());
    if (!isRealStock) return;
    try {
      let recents = getRecentSearches().filter(s => s !== symbol);
      recents.unshift(symbol);
      if (recents.length > 6) recents = recents.slice(0, 6);
      localStorage.setItem(STORAGE_KEY_RECENT_SEARCHES, JSON.stringify(recents));
    } catch (e) {
      console.warn('Could not save recent search:', e);
    }
  }

  function clearAllRecentSearches() {
    localStorage.removeItem(STORAGE_KEY_RECENT_SEARCHES);
    renderDefaultSearchMenu();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  }

  function highlightMatches(text, query) {
    if (!query) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return text.replace(regex, '<span class="search-match-highlight">$1</span>');
  }

  function renderDefaultSearchMenu() {
    if (!searchResultsList) return;
    const recents = getRecentSearches();
    const dataObj = marketQuotes && marketQuotes.data ? marketQuotes.data : {};

    const trendingSymbols = ['RELIANCE', 'TCS', 'TATAMOTORS', 'HDFCBANK', 'ZOMATO', 'HAL', 'INFY'];

    let html = '';

    // 1. Recent Searches (if any)
    if (recents.length > 0) {
      html += `
        <div class="dropdown-header">
          <span>Recent Searches</span>
          <button type="button" class="btn-clear-recent" id="btn-clear-recent-searches">Clear All</button>
        </div>
        <div class="search-chips-wrap">
          ${recents.map(sym => {
            const live = dataObj[sym];
            const chgPct = live && live.day_change_percentage !== undefined ? Number(live.day_change_percentage) : null;
            const isUp = chgPct !== null ? chgPct >= 0 : true;
            return `
              <button type="button" class="search-trending-chip btn-search-chip" data-sym="${sym}">
                <span class="chip-sym">${sym}</span>
                ${chgPct !== null ? `<span class="chip-chg" style="color: ${isUp ? 'var(--market-green)' : 'var(--market-red)'}; font-size: 0.68rem;">${isUp ? '+' : ''}${chgPct.toFixed(1)}%</span>` : ''}
              </button>
            `;
          }).join('')}
        </div>
      `;
    }

    // 2. Trending Stocks
    html += `
      <div class="dropdown-header">Trending Stocks</div>
      <div class="search-chips-wrap">
        ${trendingSymbols.map(sym => {
          const live = dataObj[sym];
          const chgPct = live && live.day_change_percentage !== undefined ? Number(live.day_change_percentage) : null;
          const isUp = chgPct !== null ? chgPct >= 0 : true;
          return `
            <button type="button" class="search-trending-chip btn-search-chip" data-sym="${sym}">
              <span class="chip-sym">${sym}</span>
              ${chgPct !== null ? `<span class="chip-chg" style="color: ${isUp ? 'var(--market-green)' : 'var(--market-red)'}; font-size: 0.68rem;">${isUp ? '+' : ''}${chgPct.toFixed(1)}%</span>` : ''}
            </button>
          `;
        }).join('')}
      </div>
    `;

    // 3. Featured Market Movers
    html += `
      <div class="dropdown-header">Popular Securities</div>
      ${BENCHMARK_STOCKS.slice(0, 5).map((item, idx) => renderSearchItemHtml(item, '', idx)).join('')}
    `;

    searchResultsList.innerHTML = html;
    bindSearchItemEvents();

    const btnClearRecents = document.getElementById('btn-clear-recent-searches');
    if (btnClearRecents) {
      btnClearRecents.addEventListener('click', (e) => {
        e.stopPropagation();
        clearAllRecentSearches();
      });
    }
  }

  function renderSearchItemHtml(item, query, index) {
    const dataObj = marketQuotes && marketQuotes.data ? marketQuotes.data : {};
    const live = dataObj[item.symbol];
    const price = live && live.live_price ? Number(live.live_price) : item.price;
    const chgPct = (live && live.day_change_percentage !== undefined)
      ? Number(live.day_change_percentage)
      : parseFloat(item.change);
    const isUp = chgPct >= 0;
    const isWatchlist = watchlist.some(w => w.stockSymbol === item.symbol);

    const symHtml = highlightMatches(item.symbol, query);
    const nameHtml = highlightMatches(item.name, query);

    return `
      <div class="search-item ${index === activeSearchIndex ? 'selected' : ''}" data-sym="${item.symbol}" data-index="${index}">
        <div class="search-item-left">
          <div class="search-sym-row">
            <span class="search-item-sym">${symHtml}</span>
            <span class="search-badge-exch">NSE</span>
            <span class="search-badge-sec">${item.sector}</span>
          </div>
          <span class="search-item-name">${nameHtml}</span>
        </div>
        <div class="search-item-right">
          <div class="search-item-pricing">
            <span class="search-item-price">${formatCurrency(price)}</span>
            <span class="search-item-change ${isUp ? 'up' : 'down'}">
              ${isUp ? '+' : ''}${chgPct.toFixed(2)}%
            </span>
          </div>
          <div class="search-item-actions" onclick="event.stopPropagation();">
            <button type="button" class="search-btn-star ${isWatchlist ? 'active' : ''}" data-sym="${item.symbol}" data-name="${item.name}" title="${isWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}">★</button>
            <button type="button" class="search-btn-trade" data-sym="${item.symbol}" data-price="${price}">Trade</button>
          </div>
        </div>
      </div>
    `;
  }

  function bindSearchItemEvents() {
    if (!searchResultsList) return;

    // Row clicks
    searchResultsList.querySelectorAll('.search-item').forEach(row => {
      row.addEventListener('click', () => {
        const sym = row.getAttribute('data-sym');
        saveRecentSearch(sym);
        openStockTerminal(sym);
        searchDropdown.classList.add('hidden');
        if (searchInput) searchInput.value = '';
        if (searchClearBtn) searchClearBtn.classList.add('hidden');
      });
    });

    // Chip clicks (recent & trending)
    searchResultsList.querySelectorAll('.btn-search-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const sym = chip.getAttribute('data-sym');
        saveRecentSearch(sym);
        openStockTerminal(sym);
        searchDropdown.classList.add('hidden');
        if (searchInput) searchInput.value = '';
        if (searchClearBtn) searchClearBtn.classList.add('hidden');
      });
    });

    // Quick Watchlist toggle inside search
    searchResultsList.querySelectorAll('.search-btn-star').forEach(star => {
      star.addEventListener('click', async (e) => {
        e.stopPropagation();
        const sym = star.getAttribute('data-sym');
        const name = star.getAttribute('data-name');
        await toggleWatchlistBackend(sym, name);
        const isNowIn = watchlist.some(w => w.stockSymbol === sym);
        star.classList.toggle('active', isNowIn);
      });
    });

    // Quick Trade button inside search
    searchResultsList.querySelectorAll('.search-btn-trade').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sym = btn.getAttribute('data-sym');
        const price = parseFloat(btn.getAttribute('data-price')) || 100.0;
        saveRecentSearch(sym);
        openStockTerminal(sym, price, 'BUY');
        searchDropdown.classList.add('hidden');
        if (searchInput) searchInput.value = '';
        if (searchClearBtn) searchClearBtn.classList.add('hidden');
      });
    });
  }

  let searchDebounceTimer = null;

  function renderSearchResultsUI(results, q) {
    if (results.length > 0) {
      searchResultsList.innerHTML = `
        <div class="dropdown-header">
          <span>Results (${results.length})</span>
          ${activeSearchSector !== 'all' ? `<span style="font-size: 0.68rem; color: var(--primary);">Filtered by ${activeSearchSector}</span>` : ''}
        </div>
        ${results.map((item, idx) => renderSearchItemHtml(item, q, idx)).join('')}
      `;
      bindSearchItemEvents();
    } else {
      searchResultsList.innerHTML = `
        <div style="padding: 2.25rem 1rem; text-align: center;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.7;">🔍</div>
          <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-main); margin-bottom: 0.35rem;">No stocks found for "${escapeHtml(q)}"</div>
          <div style="font-size: 0.8rem; color: var(--text-muted); max-width: 280px; margin: 0 auto; line-height: 1.4;">
            No listed security matches this query. Please search by symbol or company name (e.g. RELIANCE, TCS, TATAPOWER).
          </div>
        </div>
      `;
    }
  }

  function performStockSearch(query) {
    if (!searchResultsList) return;
    const q = query.trim().toUpperCase();

    activeSearchIndex = -1;

    if (q.length === 0) {
      if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
      renderDefaultSearchMenu();
      return;
    }

    // Filter by query and active sector filter
    let results = BENCHMARK_STOCKS.filter(stock => {
      if (activeSearchSector !== 'all' && stock.sector.toLowerCase() !== activeSearchSector.toLowerCase()) {
        return false;
      }

      const sym = stock.symbol.toUpperCase();
      const name = stock.name.toUpperCase();
      const sec = stock.sector.toUpperCase();
      const tags = (stock.tags || []).map(t => t.toUpperCase()).join(' ');

      return sym.includes(q) || name.includes(q) || sec.includes(q) || tags.includes(q);
    });

    // Smart Ranking:
    // 1. Exact symbol match
    // 2. Symbol starts with query
    // 3. Name starts with query
    // 4. Symbol contains query
    // 5. Name contains query
    results.sort((a, b) => {
      const aSym = a.symbol.toUpperCase();
      const bSym = b.symbol.toUpperCase();

      if (aSym === q) return -1;
      if (bSym === q) return 1;

      const aPrefix = aSym.startsWith(q);
      const bPrefix = bSym.startsWith(q);
      if (aPrefix && !bPrefix) return -1;
      if (!aPrefix && bPrefix) return 1;

      const aNamePrefix = a.name.toUpperCase().startsWith(q);
      const bNamePrefix = b.name.toUpperCase().startsWith(q);
      if (aNamePrefix && !bNamePrefix) return -1;
      if (!aNamePrefix && bNamePrefix) return 1;

      return aSym.localeCompare(bSym);
    });

    renderSearchResultsUI(results, q);

    // Hybrid Backend Search expansion (debounced 200ms)
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    if (q.length >= 2) {
      searchDebounceTimer = setTimeout(async () => {
        try {
          const res = await fetch(`${API_BASE}/market/stocks/search?q=${encodeURIComponent(q)}&limit=10`);
          if (res.ok) {
            const backendResults = await res.json();
            // Ensure search input hasn't changed while awaiting response
            if (searchInput && searchInput.value.trim().toUpperCase() === q) {
              backendResults.forEach(b => {
                const existing = BENCHMARK_STOCKS.find(s => s.symbol.toUpperCase() === b.stockSymbol.toUpperCase());
                if (!existing) {
                  BENCHMARK_STOCKS.push({
                    symbol: b.stockSymbol,
                    name: b.stockName,
                    price: 100.0,
                    change: '+0.00%',
                    sector: 'Equity',
                    tags: [b.stockSymbol.toLowerCase()]
                  });
                }
                if (!results.some(r => r.symbol.toUpperCase() === b.stockSymbol.toUpperCase())) {
                  results.push({
                    symbol: b.stockSymbol,
                    name: b.stockName,
                    price: 100.0,
                    change: '+0.00%',
                    sector: 'Equity',
                    tags: []
                  });
                }
              });
              renderSearchResultsUI(results, q);
            }
          }
        } catch (e) {
          // Fall back gracefully to local index results
        }
      }, 200);
    }
  }

  // Filter pills event handling
  searchFilterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      searchFilterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeSearchSector = pill.getAttribute('data-filter');
      performStockSearch(searchInput ? searchInput.value : '');
    });
  });

  // Clear button event handling
  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
        searchClearBtn.classList.add('hidden');
        performStockSearch('');
      }
    });
  }

  if (searchInput && searchDropdown) {
    let debounceTimer = null;

    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      if (searchClearBtn) {
        searchClearBtn.classList.toggle('hidden', q.length === 0);
      }
      searchDropdown.classList.remove('hidden');
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => performStockSearch(q), 120);
    });

    searchInput.addEventListener('focus', () => {
      searchDropdown.classList.remove('hidden');
      performStockSearch(searchInput.value);
    });

    // Keyboard Navigation for Search (Arrow keys, Enter, Esc)
    searchInput.addEventListener('keydown', (e) => {
      const items = searchResultsList ? searchResultsList.querySelectorAll('.search-item') : [];

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (items.length === 0) return;
        activeSearchIndex = (activeSearchIndex + 1) % items.length;
        updateSelectedSearchRow(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (items.length === 0) return;
        activeSearchIndex = (activeSearchIndex - 1 + items.length) % items.length;
        updateSelectedSearchRow(items);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeSearchIndex >= 0 && items[activeSearchIndex]) {
          items[activeSearchIndex].click();
        } else if (items.length > 0) {
          items[0].click();
        } else if (searchInput.value.trim()) {
          const q = searchInput.value.trim().toUpperCase();
          showToast(`No stock found for "${q}". Only listed exchange securities can be traded.`, 'error');
        }
      } else if (e.key === 'Escape') {
        searchDropdown.classList.add('hidden');
        searchInput.blur();
      }
    });

    function updateSelectedSearchRow(items) {
      items.forEach((item, idx) => {
        const isSel = idx === activeSearchIndex;
        item.classList.toggle('selected', isSel);
        if (isSel) {
          item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      });
    }

    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
        searchDropdown.classList.add('hidden');
      }
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
        searchDropdown.classList.remove('hidden');
        performStockSearch(searchInput.value);
      } else if (e.key === 'Escape') {
        searchDropdown.classList.add('hidden');
        closeStockTerminal();
      }
    });
  }

  // --------------------------------------------------------------------------
  // 9. Interactive Stock Terminal Window (Graph + Technicals + Order Handshake)
  // --------------------------------------------------------------------------
  const orderModalBackdrop = document.getElementById('order-modal-backdrop');
  const modalCloseBtn = document.getElementById('modal-close-btn');

  // Header Elements
  const modalStockSymbol = document.getElementById('modal-stock-symbol');
  const modalStockExchange = document.getElementById('modal-stock-exchange');
  const modalStockSector = document.getElementById('modal-stock-sector');
  const modalStockFullname = document.getElementById('modal-stock-fullname');
  const modalStockLtp = document.getElementById('modal-stock-ltp');
  const modalStockChange = document.getElementById('modal-stock-change');

  // Technical Elements
  const techOpen = document.getElementById('tech-open');
  const techPrevClose = document.getElementById('tech-prev-close');
  const techVolume = document.getElementById('tech-volume');
  const techUpperCircuit = document.getElementById('tech-upper-circuit');
  const techLowerCircuit = document.getElementById('tech-lower-circuit');
  const techMarketCap = document.getElementById('tech-market-cap');
  const techPe = document.getElementById('tech-pe');
  const techBeta = document.getElementById('tech-beta');

  const techDayLow = document.getElementById('tech-day-low');
  const techDayHigh = document.getElementById('tech-day-high');
  const markerDay = document.getElementById('marker-day');
  const trackDayFill = document.getElementById('track-day-fill');

  const tech52wLow = document.getElementById('tech-52w-low');
  const tech52wHigh = document.getElementById('tech-52w-high');
  const marker52w = document.getElementById('marker-52w');
  const track52wFill = document.getElementById('track-52w-fill');

  // Chart Canvas Elements
  const chartCanvas = document.getElementById('stock-chart-canvas');
  const chartTooltip = document.getElementById('chart-tooltip');
  const tooltipTime = document.getElementById('tooltip-time');
  const tooltipPrice = document.getElementById('tooltip-price');
  const tfButtons = document.querySelectorAll('.tf-btn');

  // Trading Form Elements
  const orderForm = document.getElementById('order-form');
  const orderModeBuy = document.getElementById('order-mode-buy');
  const orderModeSell = document.getElementById('order-mode-sell');
  const orderQtyInput = document.getElementById('order-qty');
  const orderPriceInput = document.getElementById('order-price-val');
  const orderPriceLabel = document.getElementById('order-price-label');
  const execTypeRadios = document.querySelectorAll('input[name="executionType"]');
  const execTypeMarketRadio = document.getElementById('exec-type-market');
  const execTypeLimitRadio = document.getElementById('exec-type-limit');
  const quickLimitChips = document.getElementById('quick-limit-chips');
  const limitOrderHint = document.getElementById('limit-order-hint');
  const limitHintText = document.getElementById('limit-hint-text');
  const quickLimitBtns = document.querySelectorAll('.quick-limit-btn');
  let activeExecutionType = 'MARKET'; // 'MARKET' or 'LIMIT'

  const modalCalcRequired = document.getElementById('modal-calc-required');
  const modalCalcAvailable = document.getElementById('modal-calc-available');
  const modalInsufficientWarn = document.getElementById('modal-insufficient-warn');
  const btnExecuteOrder = document.getElementById('btn-execute-order');
  const btnResetMarketPrice = document.getElementById('btn-reset-market-price');
  const btnQtyMinus = document.getElementById('btn-qty-minus');
  const btnQtyPlus = document.getElementById('btn-qty-plus');
  const quickQtyButtons = document.querySelectorAll('.quick-qty-btn');
  const holdingAvailNote = document.getElementById('holding-avail-note');
  const btnQuickTradeModal = document.getElementById('btn-quick-trade-modal');

  async function openStockTerminal(symbol, initialPrice = null, mode = 'BUY') {
    const cleanSym = symbol ? symbol.trim().toUpperCase() : '';
    if (!cleanSym) return;

    let benchmarkItem = BENCHMARK_STOCKS.find(s => s.symbol.toUpperCase() === cleanSym);
    const liveItem = marketQuotes && marketQuotes.data && marketQuotes.data[cleanSym];

    activeStock.symbol = cleanSym;
    activeStock.name = benchmarkItem ? benchmarkItem.name : (liveItem ? liveItem.name : cleanSym);
    activeStock.range = '1D';
    activeOrderMode = mode;

    orderModalBackdrop.classList.remove('hidden');

    // Display temporary loading placeholders
    modalStockSymbol.textContent = cleanSym;
    modalStockExchange.textContent = 'NSE';
    modalStockSector.textContent = benchmarkItem ? benchmarkItem.sector : 'Equity';
    modalStockFullname.textContent = benchmarkItem ? benchmarkItem.name : (liveItem ? liveItem.name : 'Loading company details...');
    if (initialPrice) modalStockLtp.textContent = formatCurrency(initialPrice);

    // If opening in SELL mode (e.g. clicking Exit on a holding), prefill quantity to available holding
    if (mode === 'SELL') {
      const h = holdings.find(item => item.stockSymbol === cleanSym);
      if (h && h.quantity > 0 && orderQtyInput) {
        orderQtyInput.value = h.quantity;
      }
    } else {
      if (orderQtyInput) orderQtyInput.value = 1;
    }

    setOrderMode(mode);
    updateWatchlistButtonState();

    // 1. Fetch full technicals from backend
    try {
      const res = await fetch(`${API_BASE}/market/stocks/details?symbol=${cleanSym}`);
      if (!res.ok) {
        const qRes = await fetch(`${API_BASE}/market/stocks?name=${cleanSym}`);
        if (!qRes.ok && !benchmarkItem && !liveItem) {
          closeStockTerminal();
          showToast(`Stock "${cleanSym}" does not exist in exchange directory`, 'error');
          return;
        }
      } else {
        const details = await res.json();
        activeStock.name = details.name;
        activeStock.exchange = details.exchange;
        activeStock.price = Number(details.price);
        activeStock.dayChange = Number(details.dayChange);
        activeStock.dayChangePercentage = Number(details.dayChangePercentage);
        activeStock.direction = details.direction;

        if (!benchmarkItem) {
          benchmarkItem = {
            symbol: details.symbol,
            name: details.name,
            price: Number(details.price),
            change: `${details.dayChangePercentage >= 0 ? '+' : ''}${Number(details.dayChangePercentage).toFixed(2)}%`,
            sector: details.sector || 'Equity',
            tags: [details.symbol.toLowerCase()]
          };
          BENCHMARK_STOCKS.push(benchmarkItem);
        }

      modalStockSymbol.textContent = details.symbol;
      modalStockFullname.textContent = details.name;
      modalStockExchange.textContent = details.exchange;
      modalStockSector.textContent = details.sector;
      modalStockLtp.textContent = formatCurrency(details.price);

      const isUp = details.dayChange >= 0;
      modalStockChange.textContent = `${formatCurrency(details.dayChange, true)} (${isUp ? '+' : ''}${Number(details.dayChangePercentage).toFixed(2)}%)`;
      modalStockChange.className = `terminal-stock-change ${isUp ? 'up' : 'down'}`;

        if (techOpen) techOpen.textContent = formatCurrency(details.openPrice);
        if (techPrevClose) techPrevClose.textContent = formatCurrency(details.prevClose);
        if (techVolume) techVolume.textContent = Number(details.volume).toLocaleString('en-IN') + ' shares';
        if (techUpperCircuit) techUpperCircuit.textContent = formatCurrency(details.upperCircuit);
        if (techLowerCircuit) techLowerCircuit.textContent = formatCurrency(details.lowerCircuit);
        if (techMarketCap) techMarketCap.textContent = details.marketCap;
        if (techPe) techPe.textContent = details.peRatio;
        if (techBeta) techBeta.textContent = details.beta;

        // Sliders
        const dLow = Number(details.dayLow);
        const dHigh = Number(details.dayHigh);
        const p = Number(details.price);
        if (techDayLow) techDayLow.textContent = formatCurrency(dLow);
        if (techDayHigh) techDayHigh.textContent = formatCurrency(dHigh);
        if (dHigh > dLow) {
          const pct = Math.max(0, Math.min(100, ((p - dLow) / (dHigh - dLow)) * 100));
          if (markerDay) markerDay.style.left = `${pct}%`;
          if (trackDayFill) trackDayFill.style.width = `${pct}%`;
        }

        const yLow = Number(details.yearLow52);
        const yHigh = Number(details.yearHigh52);
        if (tech52wLow) tech52wLow.textContent = formatCurrency(yLow);
        if (tech52wHigh) tech52wHigh.textContent = formatCurrency(yHigh);
        if (yHigh > yLow) {
          const yPct = Math.max(0, Math.min(100, ((p - yLow) / (yHigh - yLow)) * 100));
          if (marker52w) marker52w.style.left = `${yPct}%`;
          if (track52wFill) track52wFill.style.width = `${yPct}%`;
        }

        // Set order price input to live price
        if (orderPriceInput) orderPriceInput.value = details.price.toFixed(2);
      }
    } catch (e) {
      console.warn('Could not load stock details:', e);
      closeStockTerminal();
      showToast(`Could not load details for ${cleanSym}`, 'error');
      return;
    }

    // 2. Fetch Chart Candles from Backend
    await loadChartCandles(cleanSym, '1D');

    // 3. Update Available Holdings & Recalculate
    setExecutionType(activeExecutionType || 'MARKET');
    updateHoldingAvailabilityNote();
    recalculateOrder();
    updateWatchlistButtonState();
  }

  function closeStockTerminal() {
    orderModalBackdrop.classList.add('hidden');
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeStockTerminal);

  function updateActiveTerminalLiveQuote(status) {
    if (!orderModalBackdrop || orderModalBackdrop.classList.contains('hidden')) return;
    if (!status || !status.data || !activeStock || !activeStock.symbol) return;

    const live = status.data[activeStock.symbol];
    if (!live || !live.live_price) return;

    const newPrice = Number(live.live_price);
    const oldPrice = activeStock.price;

    if (oldPrice !== newPrice) {
      if (modalStockLtp) {
        modalStockLtp.classList.remove('flash-up', 'flash-down');
        void modalStockLtp.offsetWidth;
        modalStockLtp.classList.add(newPrice > oldPrice ? 'flash-up' : 'flash-down');
        setTimeout(() => modalStockLtp.classList.remove('flash-up', 'flash-down'), 1200);
        modalStockLtp.textContent = formatCurrency(newPrice);
      }

      activeStock.price = newPrice;
      activeStock.dayChange = Number(live.day_change || 0);
      activeStock.dayChangePercentage = Number(live.day_change_percentage || 0);

      if (modalStockChange) {
        const isUp = activeStock.dayChange >= 0;
        modalStockChange.textContent = `${formatCurrency(activeStock.dayChange, true)} (${isUp ? '+' : ''}${Number(activeStock.dayChangePercentage).toFixed(2)}%)`;
        modalStockChange.className = `terminal-stock-change ${isUp ? 'up' : 'down'}`;
      }

      // If user hasn't edited the price input manually, keep it synced
      if (orderPriceInput && (parseFloat(orderPriceInput.value) === oldPrice || !orderPriceInput.value)) {
        orderPriceInput.value = newPrice.toFixed(2);
        recalculateOrder();
      }

      // Update Day Range Slider if available
      const dHigh = live.high ? Number(live.high) : null;
      const dLow = live.low ? Number(live.low) : null;
      if (dHigh && dLow && dHigh > dLow) {
        if (techDayHigh) techDayHigh.textContent = formatCurrency(dHigh);
        if (techDayLow) techDayLow.textContent = formatCurrency(dLow);
        const pct = Math.max(0, Math.min(100, ((newPrice - dLow) / (dHigh - dLow)) * 100));
        if (markerDay) markerDay.style.left = `${pct}%`;
        if (trackDayFill) trackDayFill.style.width = `${pct}%`;
      }
    }
  }

  // Timeframe pills
  tfButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tfButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const range = btn.getAttribute('data-range');
      activeStock.range = range;
      loadChartCandles(activeStock.symbol, range);
    });
  });

  // Load and Render Canvas Chart
  async function loadChartCandles(symbol, range = '1D') {
    try {
      const res = await fetch(`${API_BASE}/market/stocks/chart?symbol=${symbol}&range=${range}`);
      if (res.ok) {
        activeChartCandles = await res.json();
        drawInteractiveChart(activeChartCandles);
      }
    } catch (e) {
      console.warn('Could not load chart candles:', e);
    }
  }

  function drawInteractiveChart(candles) {
    if (!chartCanvas || !candles || candles.length === 0) return;

    const ctx = chartCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = chartCanvas.getBoundingClientRect();

    chartCanvas.width = rect.width * dpr;
    chartCanvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padding = { top: 20, right: 20, bottom: 30, left: 20 };

    ctx.clearRect(0, 0, w, h);

    const prices = candles.map(c => Number(c.price || c.close));
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const range = (maxPrice - minPrice) || 1;

    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    // Draw horizontal grid lines
    ctx.strokeStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#2A2E39' : '#E8ECEF';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    for (let i = 0; i <= 3; i++) {
      const y = padding.top + (chartH * (i / 3));
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      const priceVal = maxPrice - (range * (i / 3));
      ctx.fillStyle = '#8B949E';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(priceVal.toFixed(2), w - padding.right, y - 4);
    }
    ctx.setLineDash([]);

    // Curve Coordinates
    const points = candles.map((c, i) => {
      const x = padding.left + (chartW * (i / (candles.length - 1)));
      const p = Number(c.price || c.close);
      const y = padding.top + chartH - ((p - minPrice) / range) * chartH;
      return { x, y, price: p, time: c.time };
    });

    // Check if overall change is positive or negative
    const isPositive = points[points.length - 1].price >= points[0].price;
    const strokeColor = isPositive ? '#00D09C' : '#EB5B56';

    // Area Gradient
    const gradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
    if (isPositive) {
      gradient.addColorStop(0, 'rgba(0, 208, 156, 0.28)');
      gradient.addColorStop(1, 'rgba(0, 208, 156, 0.00)');
    } else {
      gradient.addColorStop(0, 'rgba(235, 91, 86, 0.28)');
      gradient.addColorStop(1, 'rgba(235, 91, 86, 0.00)');
    }

    // Draw Fill
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.lineTo(points[points.length - 1].x, h - padding.bottom);
    ctx.lineTo(points[0].x, h - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw Line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // X-axis timestamps
    ctx.fillStyle = '#8B949E';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(points[0].time, padding.left, h - 8);

    ctx.textAlign = 'center';
    const midIdx = Math.floor(points.length / 2);
    ctx.fillText(points[midIdx].time, points[midIdx].x, h - 8);

    ctx.textAlign = 'right';
    ctx.fillText(points[points.length - 1].time, w - padding.right, h - 8);

    // Interactive Hover Crosshair
    chartCanvas.onmousemove = (e) => {
      const mouseRect = chartCanvas.getBoundingClientRect();
      const mouseX = e.clientX - mouseRect.left;

      if (mouseX < padding.left || mouseX > w - padding.right) {
        if (chartTooltip) chartTooltip.classList.add('hidden');
        return;
      }

      // Find closest point
      let closest = points[0];
      let minDiff = Infinity;
      for (const pt of points) {
        const diff = Math.abs(pt.x - mouseX);
        if (diff < minDiff) {
          minDiff = diff;
          closest = pt;
        }
      }

      // Redraw line + crosshair
      drawInteractiveChart(candles);

      ctx.save();
      ctx.strokeStyle = '#00D09C';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(closest.x, padding.top);
      ctx.lineTo(closest.x, h - padding.bottom);
      ctx.stroke();

      // Pulsing circle
      ctx.beginPath();
      ctx.arc(closest.x, closest.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = strokeColor;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();
      ctx.restore();

      // Tooltip
      if (chartTooltip && tooltipTime && tooltipPrice) {
        chartTooltip.classList.remove('hidden');
        tooltipTime.textContent = closest.time;
        tooltipPrice.textContent = formatCurrency(closest.price);
      }
    };

    chartCanvas.onmouseleave = () => {
      if (chartTooltip) chartTooltip.classList.add('hidden');
      drawInteractiveChart(candles);
    };
  }

  // --------------------------------------------------------------------------
  // 10. Trading Panel Logic & Order Execution Handshake
  // --------------------------------------------------------------------------
  function setExecutionType(type) {
    activeExecutionType = type;
    if (type === 'MARKET') {
      if (execTypeMarketRadio) execTypeMarketRadio.checked = true;
      if (orderPriceLabel) orderPriceLabel.textContent = 'Price (₹) — Market LTP';
      if (quickLimitChips) quickLimitChips.classList.add('hidden');
      if (limitOrderHint) limitOrderHint.classList.add('hidden');
      if (orderPriceInput) {
        orderPriceInput.value = (activeStock.price || 100.0).toFixed(2);
        orderPriceInput.readOnly = true;
        orderPriceInput.style.opacity = '0.85';
      }
    } else {
      if (execTypeLimitRadio) execTypeLimitRadio.checked = true;
      if (orderPriceLabel) orderPriceLabel.textContent = 'Limit Trigger Price (₹)';
      if (quickLimitChips) quickLimitChips.classList.remove('hidden');
      if (limitOrderHint) limitOrderHint.classList.remove('hidden');
      if (orderPriceInput) {
        orderPriceInput.readOnly = false;
        orderPriceInput.style.opacity = '1';
      }
    }
    updateLimitHintText();
    updateExecuteButtonText();
    recalculateOrder();
  }

  function updateLimitHintText() {
    if (!limitHintText) return;
    const price = parseFloat(orderPriceInput.value) || activeStock.price || 100.0;
    if (activeOrderMode === 'BUY') {
      limitHintText.innerHTML = `💡 <strong>Limit BUY:</strong> If live price is &gt; ₹${price.toFixed(2)}, order is held as <strong>PENDING</strong> and executes automatically when price drops to ₹${price.toFixed(2)}. Margin is reserved.`;
    } else {
      limitHintText.innerHTML = `💡 <strong>Limit SELL:</strong> If live price is &lt; ₹${price.toFixed(2)}, order is held as <strong>PENDING</strong> and executes automatically when price rises to ₹${price.toFixed(2)}.`;
    }
  }

  function updateExecuteButtonText() {
    if (!btnExecuteOrder) return;
    const price = parseFloat(orderPriceInput.value) || activeStock.price || 100.0;
    const isBuy = activeOrderMode === 'BUY';
    const tag = isBuy ? 'BUY' : 'SELL';
    if (activeExecutionType === 'MARKET') {
      btnExecuteOrder.textContent = `${isBuy ? '🟢' : '🔴'} ${tag} ${activeStock.symbol} (Market)`;
    } else {
      btnExecuteOrder.textContent = `${isBuy ? '🟢' : '🔴'} Set Limit ${tag} @ ${formatCurrency(price)}`;
    }
  }

  function setOrderMode(mode) {
    activeOrderMode = mode;
    if (mode === 'BUY') {
      orderModeBuy.classList.add('active');
      orderModeSell.classList.remove('active');
      btnExecuteOrder.className = 'btn-execute-order buy';
    } else {
      orderModeSell.classList.add('active');
      orderModeBuy.classList.remove('active');
      btnExecuteOrder.className = 'btn-execute-order sell';
    }
    updateLimitHintText();
    updateExecuteButtonText();
    updateHoldingAvailabilityNote();
    recalculateOrder();
  }

  function updateHoldingAvailabilityNote() {
    if (!holdingAvailNote) return;
    const currentHolding = holdings.find(h => h.stockSymbol === activeStock.symbol);
    const shares = currentHolding ? currentHolding.quantity : 0;

    if (activeOrderMode === 'SELL') {
      holdingAvailNote.classList.remove('hidden');
      holdingAvailNote.innerHTML = `Holding: <strong>${shares}</strong> shares`;
    } else {
      holdingAvailNote.classList.add('hidden');
    }
  }

  function recalculateOrder() {
    const qty = parseInt(orderQtyInput.value, 10) || 1;
    const price = parseFloat(orderPriceInput.value) || activeStock.price || 100.0;
    const required = qty * price;

    if (modalCalcRequired) modalCalcRequired.textContent = formatCurrency(required);
    if (modalCalcAvailable) modalCalcAvailable.textContent = formatCurrency(liveUser.walletBalance);

    updateLimitHintText();
    updateExecuteButtonText();

    if (modalInsufficientWarn) {
      if (activeOrderMode === 'BUY' && required > liveUser.walletBalance) {
        modalInsufficientWarn.classList.remove('hidden');
        modalInsufficientWarn.textContent = '⚠️ Insufficient balance to execute this trade';
        btnExecuteOrder.disabled = true;
        btnExecuteOrder.style.opacity = '0.6';
      } else if (activeOrderMode === 'SELL') {
        const currentHolding = holdings.find(h => h.stockSymbol === activeStock.symbol);
        const availableShares = currentHolding ? currentHolding.quantity : 0;
        if (qty > availableShares) {
          modalInsufficientWarn.classList.remove('hidden');
          modalInsufficientWarn.textContent = `⚠️ You only hold ${availableShares} shares of ${activeStock.symbol}`;
          btnExecuteOrder.disabled = true;
          btnExecuteOrder.style.opacity = '0.6';
        } else {
          modalInsufficientWarn.classList.add('hidden');
          btnExecuteOrder.disabled = false;
          btnExecuteOrder.style.opacity = '1';
        }
      } else {
        modalInsufficientWarn.classList.add('hidden');
        btnExecuteOrder.disabled = false;
        btnExecuteOrder.style.opacity = '1';
      }
    }
  }

  if (orderModeBuy) orderModeBuy.addEventListener('click', () => setOrderMode('BUY'));
  if (orderModeSell) orderModeSell.addEventListener('click', () => setOrderMode('SELL'));
  if (orderQtyInput) orderQtyInput.addEventListener('input', recalculateOrder);
  if (orderPriceInput) orderPriceInput.addEventListener('input', recalculateOrder);

  execTypeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      setExecutionType(radio.value);
    });
  });

  quickLimitBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const offset = parseFloat(btn.getAttribute('data-offset')) || 0;
      const targetPrice = (activeStock.price * (1 + offset)).toFixed(2);
      if (orderPriceInput) {
        orderPriceInput.value = targetPrice;
      }
      recalculateOrder();
    });
  });

  if (btnQtyMinus) {
    btnQtyMinus.addEventListener('click', () => {
      let cur = parseInt(orderQtyInput.value, 10) || 1;
      if (cur > 1) orderQtyInput.value = cur - 1;
      recalculateOrder();
    });
  }

  if (btnQtyPlus) {
    btnQtyPlus.addEventListener('click', () => {
      let cur = parseInt(orderQtyInput.value, 10) || 1;
      orderQtyInput.value = cur + 1;
      recalculateOrder();
    });
  }

  quickQtyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const add = parseInt(btn.getAttribute('data-qty'), 10) || 10;
      let cur = parseInt(orderQtyInput.value, 10) || 0;
      orderQtyInput.value = cur + add;
      recalculateOrder();
    });
  });

  if (btnResetMarketPrice) {
    btnResetMarketPrice.addEventListener('click', () => {
      if (orderPriceInput) orderPriceInput.value = activeStock.price.toFixed(2);
      recalculateOrder();
    });
  }

  if (btnQuickTradeModal) {
    btnQuickTradeModal.addEventListener('click', () => {
      openStockTerminal('RELIANCE', 2548.60, 'BUY');
    });
  }

  // Submit Order Handshake to Backend & PostgreSQL
  if (orderForm) {
    orderForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const qty = parseInt(orderQtyInput.value, 10) || 1;
      let price = parseFloat(orderPriceInput.value) || activeStock.price;

      if (activeExecutionType === 'MARKET') {
        const live = marketQuotes && marketQuotes.data && marketQuotes.data[activeStock.symbol];
        if (live && live.live_price) {
          activeStock.price = Number(live.live_price);
        }
        price = activeStock.price;
      }

      btnExecuteOrder.disabled = true;
      btnExecuteOrder.textContent = 'Executing in Database...';

      try {
        const payload = {
          userId: userId,
          stockSymbol: activeStock.symbol,
          stockName: activeStock.name || activeStock.symbol,
          orderType: activeOrderMode,
          executionType: activeExecutionType,
          price: price,
          marketPrice: activeStock.price,
          quantity: qty
        };

        const res = await fetch(`${API_BASE}/orders`, {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.message || errData.error || (res.status === 401 ? 'Session expired or unauthorized' : 'Order failed on backend');
          showToast(`Order Rejected: ${errMsg}`, 'error');
          if (res.status === 401) {
            handleUnauthorized();
          }
          btnExecuteOrder.disabled = false;
          updateExecuteButtonText();
          return;
        }

        const orderResult = await res.json();
        const execPrice = Number(orderResult.price) || price;
        lastKnownStockPrices['HOLDING_' + activeStock.symbol] = execPrice;

        // Update local user wallet balance
        liveUser.walletBalance = Number(orderResult.remainingWalletBalance);

        if (orderResult.orderStatus === 'PENDING') {
          showToast(`Limit Order Placed! #${orderResult.orderId} is PENDING until ${activeStock.symbol} reaches ${formatCurrency(price)}.`, 'info');
        } else {
          showToast(`Order Executed! ${activeOrderMode} ${qty} ${activeStock.symbol} @ ${formatCurrency(price)} (Order #${orderResult.orderId})`, 'success');
        }

        // Handshake refresh with database
        await fetchRealUserDetails();
        await fetchBackendHoldings();
        await fetchBackendOrders();

        updateHoldingAvailabilityNote();
        recalculateOrder();
        closeStockTerminal();
      } catch (err) {
        console.error('Order submission error:', err);
        showToast('Connection to backend failed', 'error');
      } finally {
        btnExecuteOrder.disabled = false;
        updateExecuteButtonText();
      }
    });
  }

  // --------------------------------------------------------------------------
  // 11. Theme Switching
  // --------------------------------------------------------------------------
  const themeToggle = document.getElementById('theme-toggle');
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem(STORAGE_KEY_THEME, t);
    if (activeChartCandles.length > 0) drawInteractiveChart(activeChartCandles);
  }

  function initTheme() {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    if (saved) {
      applyTheme(saved);
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(prefersDark ? 'dark' : 'light');
    }
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') || 'light';
      const nxt = cur === 'light' ? 'dark' : 'light';
      applyTheme(nxt);
      showToast(`Switched to ${nxt} theme`, 'info');
    });
  }
  initTheme();

  // --------------------------------------------------------------------------
  // 12. Toast System
  // --------------------------------------------------------------------------
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00D09C" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EB5B56" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `${iconSvg}<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(() => toast.remove(), 250);
    }, 4000);
  }

  // --------------------------------------------------------------------------
  // 13. Application Initialization
  // --------------------------------------------------------------------------
  await fetchRealUserDetails();
  await fetchBackendHoldings();
  await fetchBackendOrders();
  await fetchBackendWatchlist();
  await fetchMarketQuotes();
  setInterval(fetchMarketQuotes, 60000);
});
