'use server';

// ─── Yahoo Finance API via query1/v8 (no API key needed) ───

interface FinanceSyncInput {
  orgId: string;
  tickers: string[];
  analysisTypes: string[];
  period: string;
}

interface FileResult {
  fileName: string;
  rows: number;
  csv: string;
  dataType: string;
  description: string;
  columns: string[];
  columnTypes: string[];
}

// ─── Yahoo Finance Auth (crumb + cookie) ───
let cachedCrumb: string | null = null;
let cachedCookie: string | null = null;
let crumbExpiry = 0;

async function getYahooCrumb(): Promise<{ crumb: string; cookie: string }> {
  if (cachedCrumb && cachedCookie && Date.now() < crumbExpiry) {
    return { crumb: cachedCrumb, cookie: cachedCookie };
  }
  // Step 1: Get cookies from fc.yahoo.com
  const initRes = await fetch('https://fc.yahoo.com', {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    redirect: 'manual',
  });
  const setCookies = initRes.headers.getSetCookie?.() || [];
  const cookie = setCookies.map(c => c.split(';')[0]).join('; ');

  // Step 2: Get crumb using cookies
  const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': cookie },
  });
  const crumb = await crumbRes.text();

  cachedCrumb = crumb;
  cachedCookie = cookie;
  crumbExpiry = Date.now() + 30 * 60 * 1000; // 30 min cache
  return { crumb, cookie };
}

async function fetchYahooChart(ticker: string, range: string): Promise<any> {
  const { crumb, cookie } = await getYahooCrumb();
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${range}&interval=1d&includePrePost=false&crumb=${encodeURIComponent(crumb)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': cookie },
  });
  const data = await res.json();
  if (data.chart?.error) throw new Error(data.chart.error.description);
  return data.chart?.result?.[0] || null;
}

async function fetchYahooQuoteSummary(ticker: string, modules: string[]): Promise<any> {
  const { crumb, cookie } = await getYahooCrumb();
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=${modules.join(',')}&crumb=${encodeURIComponent(crumb)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': cookie },
  });
  const data = await res.json();
  if (data.quoteSummary?.error) throw new Error(data.quoteSummary.error.description);
  return data.quoteSummary?.result?.[0] || {};
}

function extractVal(obj: any): number | null {
  if (obj == null) return null;
  if (typeof obj === 'number') return obj;
  if (obj.raw !== undefined) return obj.raw;
  if (obj.fmt !== undefined) return parseFloat(obj.fmt);
  return null;
}

/**
 * Fetch Yahoo Finance data, generate auto-mapped CSVs, return to client.
 * Client handles Firestore writes (same pattern as SNS).
 */
export async function triggerFinanceSync(input: FinanceSyncInput) {
  const { orgId, tickers, analysisTypes, period } = input;
  const dateStr = new Date().toISOString().split('T')[0];
  const results: FileResult[] = [];

  try {
    // ─── 1. Fetch price history for all tickers ───
    const priceData: Record<string, { dates: string[]; close: number[]; high: number[]; low: number[]; volume: number[] }> = {};

    for (const ticker of tickers) {
      try {
        const chart = await fetchYahooChart(ticker, period);
        if (!chart) continue;
        const timestamps = chart.timestamp || [];
        const quote = chart.indicators?.quote?.[0] || {};
        const adjClose = chart.indicators?.adjclose?.[0]?.adjclose || quote.close || [];

        priceData[ticker] = {
          dates: timestamps.map((ts: number) => new Date(ts * 1000).toISOString().split('T')[0]),
          close: adjClose,
          high: quote.high || [],
          low: quote.low || [],
          volume: quote.volume || [],
        };
      } catch (e) {
        console.warn(`Failed to fetch ${ticker}:`, e);
      }
    }

    // ─── 2. Fetch fundamentals if needed ───
    const needsFundamentals = analysisTypes.some(a =>
      ['value_screening', 'quality', 'portfolio', 'macro'].includes(a)
    );

    const fundamentals: Record<string, any> = {};

    if (needsFundamentals) {
      for (const ticker of tickers) {
        try {
          const summary = await fetchYahooQuoteSummary(ticker, [
            'defaultKeyStatistics', 'financialData', 'summaryDetail', 'assetProfile'
          ]);
          const ks = summary.defaultKeyStatistics || {};
          const fd = summary.financialData || {};
          const sd = summary.summaryDetail || {};
          const ap = summary.assetProfile || {};

          fundamentals[ticker] = {
            sector: ap.sector || 'Unknown',
            industry: ap.industry || 'Unknown',
            marketCap: extractVal(sd.marketCap),
            trailingPE: extractVal(sd.trailingPE),
            forwardPE: extractVal(ks.forwardPE),
            priceToBook: extractVal(ks.priceToBook),
            priceToSales: extractVal(sd.priceToSalesTrailing12Months) ?? extractVal(ks.priceToSalesTrailing12Months),
            enterpriseToEbitda: extractVal(ks.enterpriseToEbitda),
            returnOnEquity: extractVal(fd.returnOnEquity),
            returnOnAssets: extractVal(fd.returnOnAssets),
            debtToEquity: extractVal(fd.debtToEquity),
            operatingMargins: extractVal(fd.operatingMargins),
            profitMargins: extractVal(fd.profitMargins),
            revenueGrowth: extractVal(fd.revenueGrowth),
            earningsGrowth: extractVal(fd.earningsGrowth),
            dividendYield: extractVal(sd.dividendYield),
            beta: extractVal(sd.beta),
          };
        } catch (e) {
          console.warn(`Failed fundamentals for ${ticker}:`, e);
        }
      }
    }

    // ─── 3. Generate CSVs based on analysis types ───

    if (analysisTypes.includes('basic_stats')) {
      const rows = ['ticker,date,close,daily_return,cumulative_return'];
      for (const ticker of tickers) {
        const pd = priceData[ticker];
        if (!pd) continue;
        let cumReturn = 0;
        for (let i = 0; i < pd.dates.length; i++) {
          const dailyReturn = i > 0 && pd.close[i - 1]
            ? ((pd.close[i] - pd.close[i - 1]) / pd.close[i - 1] * 100) : 0;
          cumReturn += dailyReturn;
          rows.push(`${ticker},${pd.dates[i]},${pd.close[i]?.toFixed(2) || ''},${dailyReturn.toFixed(4)},${cumReturn.toFixed(4)}`);
        }
      }
      results.push({
        fileName: `stock_returns_${dateStr}.csv`, rows: rows.length - 1, csv: rows.join('\n'),
        dataType: 'basic_stats', description: `Stock Returns - ${tickers.length} tickers (${period})`,
        columns: ['ticker', 'date', 'close', 'daily_return', 'cumulative_return'],
        columnTypes: ['categorical', 'datetime', 'numeric', 'numeric', 'numeric'],
      });
    }

    if (analysisTypes.includes('value_screening')) {
      const rows = ['ticker,sector,marketCap,PER,PBR,PSR,EV_EBITDA,beta'];
      for (const ticker of tickers) {
        const f = fundamentals[ticker];
        if (!f) continue;
        rows.push(`${ticker},${f.sector},${f.marketCap || ''},${f.trailingPE || ''},${f.priceToBook || ''},${f.priceToSales || ''},${f.enterpriseToEbitda || ''},${f.beta || ''}`);
      }
      results.push({
        fileName: `value_screening_${dateStr}.csv`, rows: rows.length - 1, csv: rows.join('\n'),
        dataType: 'value_screening', description: `Value Screening - ${tickers.length} tickers`,
        columns: ['ticker', 'sector', 'marketCap', 'PER', 'PBR', 'PSR', 'EV_EBITDA', 'beta'],
        columnTypes: ['categorical', 'categorical', 'numeric', 'numeric', 'numeric', 'numeric', 'numeric', 'numeric'],
      });
    }

    if (analysisTypes.includes('momentum')) {
      const rows = ['ticker,sector,return_1m,return_3m,return_6m,return_12m'];
      for (const ticker of tickers) {
        const pd = priceData[ticker];
        if (!pd || pd.close.length < 2) continue;
        const last = pd.close[pd.close.length - 1];
        const calcReturn = (daysAgo: number) => {
          const idx = Math.max(0, pd.close.length - daysAgo);
          const base = pd.close[idx];
          return base ? ((last - base) / base * 100).toFixed(2) : '';
        };
        const sector = fundamentals[ticker]?.sector || '';
        rows.push(`${ticker},${sector},${calcReturn(21)},${calcReturn(63)},${calcReturn(126)},${calcReturn(252)}`);
      }
      results.push({
        fileName: `momentum_screening_${dateStr}.csv`, rows: rows.length - 1, csv: rows.join('\n'),
        dataType: 'momentum', description: `Momentum Screening - ${tickers.length} tickers`,
        columns: ['ticker', 'sector', 'return_1m', 'return_3m', 'return_6m', 'return_12m'],
        columnTypes: ['categorical', 'categorical', 'numeric', 'numeric', 'numeric', 'numeric'],
      });
    }

    if (analysisTypes.includes('quality')) {
      const rows = ['ticker,sector,ROE,ROA,debtToEquity,operatingMargin,profitMargin,revenueGrowth,earningsGrowth'];
      for (const ticker of tickers) {
        const f = fundamentals[ticker];
        if (!f) continue;
        rows.push(`${ticker},${f.sector},${f.returnOnEquity || ''},${f.returnOnAssets || ''},${f.debtToEquity || ''},${f.operatingMargins || ''},${f.profitMargins || ''},${f.revenueGrowth || ''},${f.earningsGrowth || ''}`);
      }
      results.push({
        fileName: `quality_screening_${dateStr}.csv`, rows: rows.length - 1, csv: rows.join('\n'),
        dataType: 'quality', description: `Quality Screening - ${tickers.length} tickers`,
        columns: ['ticker', 'sector', 'ROE', 'ROA', 'debtToEquity', 'operatingMargin', 'profitMargin', 'revenueGrowth', 'earningsGrowth'],
        columnTypes: ['categorical', 'categorical', 'numeric', 'numeric', 'numeric', 'numeric', 'numeric', 'numeric', 'numeric'],
      });
    }

    if (analysisTypes.includes('technical')) {
      const rows = ['ticker,date,close,sma_20,sma_50,sma_200,ema_12,ema_26,macd,rsi,bb_upper,bb_lower,volume'];
      for (const ticker of tickers) {
        const pd = priceData[ticker];
        if (!pd) continue;
        const closes = pd.close;
        const sma = (arr: number[], w: number, i: number) => {
          if (i < w - 1) return null;
          let sum = 0; for (let j = i - w + 1; j <= i; j++) sum += arr[j] || 0; return sum / w;
        };
        const emaArr = (arr: number[], w: number): number[] => {
          const r: number[] = []; const k = 2 / (w + 1);
          for (let i = 0; i < arr.length; i++) { if (i === 0) r.push(arr[0] || 0); else r.push((arr[i] || 0) * k + r[i - 1] * (1 - k)); } return r;
        };
        const rsiArr = (arr: number[]): number[] => {
          const r: number[] = [50]; let ag = 0, al = 0;
          for (let i = 1; i < arr.length; i++) {
            const d = (arr[i] || 0) - (arr[i - 1] || 0); const g = d > 0 ? d : 0; const l = d < 0 ? -d : 0;
            if (i <= 14) { ag += g / 14; al += l / 14; } else { ag = (ag * 13 + g) / 14; al = (al * 13 + l) / 14; }
            r.push(100 - 100 / (1 + (al === 0 ? 100 : ag / al)));
          } return r;
        };
        const ema12 = emaArr(closes, 12), ema26 = emaArr(closes, 26), rsi = rsiArr(closes);
        for (let i = 0; i < pd.dates.length; i++) {
          const s20 = sma(closes, 20, i), s50 = sma(closes, 50, i), s200 = sma(closes, 200, i);
          const macd = ema12[i] - ema26[i];
          const bbStd = s20 != null ? (() => { let s = 0; for (let j = Math.max(0, i - 19); j <= i; j++) s += Math.pow((closes[j] || 0) - (s20 || 0), 2); return Math.sqrt(s / 20); })() : 0;
          const bbU = s20 != null ? s20 + 2 * bbStd : '', bbL = s20 != null ? s20 - 2 * bbStd : '';
          rows.push(`${ticker},${pd.dates[i]},${closes[i]?.toFixed(2) || ''},${s20?.toFixed(2) || ''},${s50?.toFixed(2) || ''},${s200?.toFixed(2) || ''},${ema12[i]?.toFixed(2) || ''},${ema26[i]?.toFixed(2) || ''},${macd?.toFixed(4) || ''},${rsi[i]?.toFixed(2) || ''},${typeof bbU === 'number' ? bbU.toFixed(2) : ''},${typeof bbL === 'number' ? bbL.toFixed(2) : ''},${pd.volume[i] || ''}`);
        }
      }
      results.push({
        fileName: `technical_indicators_${dateStr}.csv`, rows: rows.length - 1, csv: rows.join('\n'),
        dataType: 'technical', description: `Technical Indicators - ${tickers.length} tickers`,
        columns: ['ticker', 'date', 'close', 'sma_20', 'sma_50', 'sma_200', 'ema_12', 'ema_26', 'macd', 'rsi', 'bb_upper', 'bb_lower', 'volume'],
        columnTypes: ['categorical', 'datetime', 'numeric', 'numeric', 'numeric', 'numeric', 'numeric', 'numeric', 'numeric', 'numeric', 'numeric', 'numeric', 'numeric'],
      });
    }

    if (analysisTypes.includes('portfolio')) {
      const allDates = new Set<string>();
      for (const t of tickers) priceData[t]?.dates.forEach(d => allDates.add(d));
      const sorted = Array.from(allDates).sort();
      const header = ['date', ...tickers.map(t => `${t}_return`)].join(',');
      const dataRows = [header];
      for (const date of sorted) {
        const vals = tickers.map(t => {
          const pd = priceData[t]; if (!pd) return '';
          const idx = pd.dates.indexOf(date); if (idx <= 0) return '';
          return ((pd.close[idx] - pd.close[idx - 1]) / pd.close[idx - 1] * 100).toFixed(4);
        });
        dataRows.push([date, ...vals].join(','));
      }
      results.push({
        fileName: `portfolio_returns_${dateStr}.csv`, rows: dataRows.length - 1, csv: dataRows.join('\n'),
        dataType: 'portfolio', description: `Portfolio Returns Matrix - ${tickers.length} tickers`,
        columns: ['date', ...tickers.map(t => `${t}_return`)],
        columnTypes: ['datetime', ...tickers.map(() => 'numeric')],
      });
    }

    if (analysisTypes.includes('macro')) {
      const macroTickers = ['^TNX', 'KRW=X', 'CL=F', 'GC=F', '^VIX'];
      const macroLabels = ['treasury_yield', 'usd_krw', 'oil_price', 'gold_price', 'vix'];
      for (const mt of macroTickers) {
        if (!priceData[mt]) {
          try {
            const chart = await fetchYahooChart(mt, period);
            if (chart) {
              priceData[mt] = {
                dates: (chart.timestamp || []).map((ts: number) => new Date(ts * 1000).toISOString().split('T')[0]),
                close: chart.indicators?.adjclose?.[0]?.adjclose || chart.indicators?.quote?.[0]?.close || [],
                high: [], low: [], volume: [],
              };
            }
          } catch { /* skip */ }
        }
      }
      const ref = tickers[0], refD = priceData[ref];
      if (refD) {
        const rows = [`date,${ref}_return,treasury_yield,usd_krw,oil_price,gold_price,vix`];
        for (let i = 1; i < refD.dates.length; i++) {
          const date = refD.dates[i];
          const ret = ((refD.close[i] - refD.close[i - 1]) / refD.close[i - 1] * 100).toFixed(4);
          const mv = macroTickers.map(mt => { const pd = priceData[mt]; if (!pd) return ''; const idx = pd.dates.indexOf(date); return idx >= 0 ? (pd.close[idx]?.toFixed(2) || '') : ''; });
          rows.push([date, ret, ...mv].join(','));
        }
        results.push({
          fileName: `macro_crossdata_${dateStr}.csv`, rows: rows.length - 1, csv: rows.join('\n'),
          dataType: 'macro', description: `Macro Cross Analysis - ${ref} vs macro indicators`,
          columns: ['date', `${ref}_return`, ...macroLabels],
          columnTypes: ['datetime', 'numeric', 'numeric', 'numeric', 'numeric', 'numeric', 'numeric'],
        });
      }
    }

    return { success: true, results };

  } catch (error: any) {
    console.error("Finance sync error:", error);
    return { success: false, error: error.message, results: [] };
  }
}
