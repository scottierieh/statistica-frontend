
import { NextRequest, NextResponse } from 'next/server';

// Helper function to find intersection of two lines (y = m*x + c)
// This is a simplified version and might not be robust for all cases
function findIntersection(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): number | null {
    const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (den === 0) {
        return null; // Parallel lines
    }
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        const intersectionX = x1 + t * (x2 - x1);
        return intersectionX;
    }
    return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { data, too_cheap_col, cheap_col, expensive_col, too_expensive_col } = body;

    if (!data || !too_cheap_col || !cheap_col || !expensive_col || !too_expensive_col) {
      return NextResponse.json({ error: 'Missing required data columns.' }, { status: 400 });
    }

    const prices = Array.from(new Set(data.flatMap((r: any) => [r[too_cheap_col], r[cheap_col], r[expensive_col], r[too_expensive_col]])))
        .map(Number)
        .filter(p => !isNaN(p) && p > 0)
        .sort((a, b) => a - b);
    
    const n = data.length;

    const too_cheap_pct = prices.map(p => data.filter((r:any) => r[too_cheap_col] > p).length / n * 100);
    const cheap_pct = prices.map(p => data.filter((r:any) => r[cheap_col] > p).length / n * 100);
    const expensive_pct = prices.map(p => data.filter((r:any) => r[expensive_col] <= p).length / n * 100);
    const too_expensive_pct = prices.map(p => data.filter((r:any) => r[too_expensive_col] <= p).length / n * 100);

    const not_cheap = cheap_pct;
    const not_expensive = expensive_pct.map(p => 100 - p);

    let opp = null, pme = null, mdp = null, ipp = null;

    for (let i = 0; i < prices.length - 1; i++) {
        if (!opp) opp = findIntersection(prices[i], too_expensive_pct[i], prices[i+1], too_expensive_pct[i+1], prices[i], cheap_pct[i], prices[i+1], cheap_pct[i+1]);
        if (!pme) pme = findIntersection(prices[i], not_cheap[i], prices[i+1], not_cheap[i+1], prices[i], expensive_pct[i], prices[i+1], expensive_pct[i+1]);
        if (!mdp) mdp = findIntersection(prices[i], not_expensive[i], prices[i+1], not_expensive[i+1], prices[i], cheap_pct[i], prices[i+1], cheap_pct[i+1]);
        if (!ipp) ipp = findIntersection(prices[i], too_cheap_pct[i], prices[i+1], too_cheap_pct[i+1], prices[i], not_expensive[i], prices[i+1], not_expensive[i+1]);
    }
    
    const plotData = {
        prices: prices,
        too_cheap: too_cheap_pct,
        cheap: cheap_pct,
        expensive: expensive_pct,
        too_expensive: too_expensive_pct
    };
    
    const results = {
        opp: opp,
        pme: pme,
        mdp: mdp,
        ipp: ipp
    };

    return NextResponse.json({ results, plotData });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
