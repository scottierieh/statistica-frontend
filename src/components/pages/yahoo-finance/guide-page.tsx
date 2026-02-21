'use client';
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BookOpen, Globe, Info, TrendingUp, Calculator, ShieldCheck, BarChart3, Brain, Target, Activity } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const phaseDetails = [
  {
    phase: "Phase 1",
    title: "Macro & Sector",
    icon: Globe,
    description: "Analyze the macroeconomic environment and identify strong sectors before selecting individual stocks.",
    pages: [
      { name: "Market Regime Classification", description: "Classifies the current market state (Bull / Bear / Sideways) using macro indicators such as yield curves, credit spreads, and leading economic indices to determine the overall investment stance." },
      { name: "Macro Variable Trends", description: "Tracks key macro variables—GDP growth, inflation (CPI/PPI), interest rates, and unemployment—over time to reveal directional trends that affect equity valuations." },
      { name: "Risk-On / Off Index (VIX)", description: "Monitors the CBOE Volatility Index (VIX) and related fear-greed metrics to gauge market sentiment and determine risk appetite levels for tactical allocation." },
      { name: "Sector Relative Strength", description: "Compares sector-level performance relative to a broad benchmark, ranking sectors by momentum to highlight rotation opportunities and sector leadership changes." },
      { name: "Macro–Stock Correlation", description: "Measures the statistical relationship between selected macro factors and individual stock or sector returns, revealing which equities are most sensitive to macro shifts." },
    ],
  },
  {
    phase: "Phase 2",
    title: "Quant Screening",
    icon: BarChart3,
    description: "Apply multi-factor quantitative models to narrow the investment universe to high-conviction candidates.",
    pages: [
      { name: "Composite Value Score", description: "Aggregates multiple valuation ratios (P/E, P/B, EV/EBITDA, P/FCF) into a single normalized score, ranking stocks from deeply undervalued to overvalued." },
      { name: "Quality Radar", description: "Visualizes a company's quality profile across dimensions such as ROE, debt-to-equity, earnings stability, and cash conversion on a radar chart for quick comparison." },
      { name: "Momentum Quadrant", description: "Plots stocks on a two-axis chart (price momentum vs. earnings momentum) to identify leaders, laggards, and potential reversal candidates." },
      { name: "Triple-Threat Filter", description: "Screens stocks that simultaneously pass value, quality, and momentum thresholds—a combined factor approach that historically outperforms single-factor strategies." },
      { name: "Factor Rotation (Value vs Growth)", description: "Analyzes the cyclical performance gap between Value and Growth factors to guide factor-tilt decisions based on the current market regime." },
    ],
  },
  {
    phase: "Phase 3",
    title: "Financial Modeling",
    icon: Calculator,
    description: "Build and validate bottom-up financial models to understand the economic engine of a business.",
    pages: [
      { name: "Revenue / Cost Driver", description: "Decomposes revenue into volume × price and cost into fixed vs. variable components, enabling scenario analysis on the key levers that drive operating results." },
      { name: "3-Statement Linkage", description: "Visualizes the interconnection between Income Statement, Balance Sheet, and Cash Flow Statement, ensuring model integrity and highlighting circular references." },
      { name: "Cash Flow Bridge", description: "Waterfall chart that walks from Net Income to Operating Cash Flow to Free Cash Flow, isolating each adjustment (D&A, working capital changes, capex) for transparency." },
      { name: "Debt Schedule", description: "Projects outstanding debt balances, interest expense, maturities, and covenant headroom over time, critical for assessing refinancing risk and leverage trajectory." },
      { name: "Working Capital Model", description: "Tracks receivables, inventory, and payables cycles (DSO, DIO, DPO) to forecast cash conversion cycle changes and their impact on free cash flow." },
      { name: "Rolling Forecast", description: "Maintains a continuously updated projection horizon (e.g., 4-quarter rolling) that adjusts for the latest actual results, replacing static annual budgets." },
    ],
  },
  {
    phase: "Phase 4",
    title: "Profitability",
    icon: TrendingUp,
    description: "Deep-dive into margin structures and unit economics to assess earnings quality and scalability.",
    pages: [
      { name: "Contribution Margin & BEP", description: "Calculates the contribution margin per unit and the break-even point in both units and revenue, showing how close the company operates to profitability thresholds." },
      { name: "Unit Economics (LTV vs CAC)", description: "Compares Customer Lifetime Value against Customer Acquisition Cost, a key health metric for subscription and platform businesses indicating long-term profitability." },
      { name: "Product Profitability", description: "Breaks down margins by product line or business segment to identify which offerings create value and which may be candidates for divestiture or restructuring." },
      { name: "Operating Leverage", description: "Measures the sensitivity of operating income to revenue changes (degree of operating leverage), revealing how fixed-cost-heavy the business model is and the profit upside in growth scenarios." },
    ],
  },
  {
    phase: "Phase 5",
    title: "Predictive Analytics",
    icon: Brain,
    description: "Leverage statistical and ML-based models to forecast price, earnings, and risk events.",
    pages: [
      { name: "Target Price Forecasting", description: "Uses regression, time-series (ARIMA/Prophet), or ensemble models to generate a forward-looking price range with confidence intervals for a specified horizon." },
      { name: "Earnings Surprise Probability", description: "Estimates the likelihood that a company will beat or miss consensus EPS by analyzing historical surprise patterns, estimate revisions, and pre-announcement signals." },
      { name: "Bankruptcy Alert", description: "Calculates distress scores (Altman Z-Score, Ohlson O-Score) to flag companies at elevated risk of default or restructuring, serving as an early-warning system." },
      { name: "Volatility Projection", description: "Forecasts future realized volatility using GARCH-family models or implied volatility surfaces, useful for options pricing and position sizing decisions." },
      { name: "Trend Turning Point", description: "Detects potential trend reversals by combining statistical change-point detection with technical pattern recognition, alerting to shifts before they are confirmed by lagging indicators." },
    ],
  },
  {
    phase: "Phase 6",
    title: "Valuation & Investment",
    icon: Target,
    description: "Determine intrinsic value using multiple methodologies and quantify the margin of safety.",
    pages: [
      { name: "DCF Model", description: "Projects free cash flows and discounts them at WACC to arrive at an enterprise value, then bridges to equity value per share with sensitivity tables on growth and discount rate assumptions." },
      { name: "Comparable Analysis (CCA)", description: "Benchmarks the target against peer-group multiples (EV/EBITDA, P/E, P/S) to assess relative valuation, adjusting for size, growth, and profitability differences." },
      { name: "Safety Margin", description: "Compares the estimated intrinsic value against the current market price to calculate the margin of safety, a key risk buffer advocated by value investors." },
      { name: "IRR / NPV Calculator", description: "Computes the Internal Rate of Return and Net Present Value for a given investment cash-flow stream, allowing comparison across projects or acquisition scenarios." },
      { name: "Payback Period", description: "Estimates the time required to recover the initial investment from cumulative cash flows, providing a simple liquidity-focused complement to NPV-based decisions." },
    ],
  },
  {
    phase: "Phase 7",
    title: "Technical Timing",
    icon: Activity,
    description: "Use price-action and volume signals to optimize entry and exit timing.",
    pages: [
      { name: "Moving Average Overlay", description: "Plots SMA and EMA of various periods on the price chart, identifying dynamic support/resistance levels and long-term trend direction at a glance." },
      { name: "EMA Cross Signal", description: "Generates buy/sell signals based on short-period EMA crossing above or below a long-period EMA (e.g., 12/26 or 50/200), a classic trend-following technique." },
      { name: "RSI / Bollinger Bands", description: "Combines the Relative Strength Index (overbought/oversold) with Bollinger Bands (volatility squeeze/expansion) to pinpoint mean-reversion and breakout setups." },
      { name: "MACD Chart", description: "Displays the MACD line, signal line, and histogram to track momentum shifts and divergence patterns that often precede trend reversals." },
      { name: "Volume Profile", description: "Aggregates traded volume at each price level to reveal high-volume nodes (support/resistance) and low-volume gaps where price may move rapidly." },
      { name: "Price-Volume Correlation", description: "Analyzes the co-movement between price changes and volume spikes to confirm trend strength or warn of exhaustion moves on declining volume." },
      { name: "Technical Dashboard", description: "A consolidated view combining key technical indicators, signals, and chart patterns into a single dashboard for quick decision-making across multiple timeframes." },
    ],
  },
  {
    phase: "Phase 8",
    title: "Risk & Strategy",
    icon: ShieldCheck,
    description: "Quantify portfolio risk, stress-test allocations, and optimize the risk-return profile.",
    pages: [
      { name: "Portfolio Correlation", description: "Computes pairwise correlation coefficients between portfolio holdings, visualized as a heatmap to identify concentration risk and diversification gaps." },
      { name: "Variance Contribution", description: "Decomposes total portfolio variance into each holding's marginal contribution, revealing which positions dominate overall risk regardless of their weight." },
      { name: "Value at Risk (VaR)", description: "Estimates the maximum expected loss over a given time horizon at a specified confidence level (e.g., 95% 1-day VaR) using historical, parametric, or Monte Carlo methods." },
      { name: "Maximum Drawdown (MDD)", description: "Measures the largest peak-to-trough decline in portfolio value, a critical metric for understanding worst-case capital erosion and investor pain." },
      { name: "Drawdown Comparison", description: "Overlays drawdown curves of multiple assets or strategies on a single chart, enabling side-by-side comparison of downside behavior during stress periods." },
      { name: "Risk-Return Scatter", description: "Plots each holding or strategy on a risk (std dev) vs. return plane, making it easy to spot efficient positions and those with poor risk-adjusted performance." },
      { name: "Sharpe Ratio Comparison", description: "Ranks assets or portfolios by their Sharpe Ratio (excess return per unit of risk), the industry-standard measure for risk-adjusted performance evaluation." },
    ],
  },
];

export default function GuidePage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Finance Analytics Guide</h2>
        <p className="text-lg text-muted-foreground">An 8-phase analysis process for quantitative investing and company valuation</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Globe, title: "Phase 1-2", desc: "Select the investment universe through macro analysis and quantitative screening." },
          { icon: Calculator, title: "Phase 3-4", desc: "Assess a company's fundamental strength through financial modeling and profitability analysis." },
          { icon: TrendingUp, title: "Phase 5-6", desc: "Estimate future performance and price targets, then evaluate intrinsic value." },
          { icon: ShieldCheck, title: "Phase 7-8", desc: "Capture technical timing signals and manage portfolio risk." },
        ].map((p, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <p.icon className="w-8 h-8 text-primary mb-2" />
              <CardTitle className="text-lg">{p.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6 flex gap-4 items-start">
          <Info className="w-6 h-6 text-primary shrink-0 mt-1" />
          <div className="space-y-2">
            <p className="font-bold text-primary">Before You Begin</p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Use the sidebar to fetch real-time market data via the Yahoo Finance API integration, or upload a CSV file to get started.
              The analysis tools for each phase will automatically activate by detecting the column structure of your uploaded data.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Phase Detail Tables */}
      <div className="space-y-6 pt-4">
        <h3 className="text-2xl font-bold tracking-tight">Detailed Phase Breakdown</h3>
        <p className="text-muted-foreground">Each phase contains specialized analysis pages. Click on a phase in the sidebar to navigate directly.</p>

        {phaseDetails.map((phase) => (
          <Card key={phase.phase}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <phase.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{phase.phase} · {phase.title}</CardTitle>
                  <CardDescription className="mt-1">{phase.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[220px]">Page</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {phase.pages.map((page, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium text-sm align-top">{page.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground leading-relaxed">{page.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}