'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp, Search, RefreshCw, Loader2, CheckCircle2,
  BarChart3, PieChart, LineChart, ShieldCheck, Plus, X, Zap,
  ArrowRight, LayoutDashboard, Database, FlaskConical, Globe, Clock
} from "lucide-react";
// TODO: Replace with real org system
const TEMP_ORG_ID = 'default_org';
import { useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { triggerFinanceSync } from '@/app/actions-finance';
import { useFinanceData } from '@/contexts/finance-data-context';

const analysisTypes = [
  { id: 'basic_stats', name: 'Basic Statistics', description: 'Returns, volatility, skewness, kurtosis', icon: BarChart3, variables: ['close', 'daily_return', 'cumulative_return'] },
  { id: 'value_screening', name: 'Value Screening', description: 'PER, PBR, PSR, EV/EBITDA ranking', icon: Search, variables: ['PER', 'PBR', 'PSR', 'EV_EBITDA', 'marketCap'] },
  { id: 'momentum', name: 'Momentum', description: '3/6/12 month returns ranking', icon: TrendingUp, variables: ['return_3m', 'return_6m', 'return_12m'] },
  { id: 'quality', name: 'Quality Screening', description: 'ROE, margins, debt ratio', icon: ShieldCheck, variables: ['ROE', 'ROA', 'debtToEquity', 'operatingMargin', 'profitMargin'] },
  { id: 'technical', name: 'Technical Indicators', description: 'SMA, EMA, RSI, MACD, Bollinger', icon: LineChart, variables: ['sma_20', 'sma_50', 'sma_200', 'rsi', 'macd', 'bb_upper', 'bb_lower'] },
  { id: 'portfolio', name: 'Portfolio Analysis', description: 'Correlation, Sharpe, VaR, MDD', icon: PieChart, variables: ['expected_return', 'volatility', 'sharpe_ratio', 'max_drawdown'] },
  { id: 'macro', name: 'Macro Cross Analysis', description: 'Rates, FX, Oil, Gold vs Stocks', icon: Zap, variables: ['stock_return', 'treasury_yield', 'usd_krw', 'oil_price', 'gold_price', 'vix'] },
];

const presetUniverses = [
  { id: 'custom', name: 'Custom Tickers', tickers: [] },
  { id: 'us_tech', name: 'US Tech Giants', tickers: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA'] },
  { id: 'us_finance', name: 'US Financials', tickers: ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'C'] },
  { id: 'kr_top10', name: 'KOSPI Top 10', tickers: ['005930.KS', '000660.KS', '373220.KS', '207940.KS', '005380.KS', '035420.KS', '051910.KS', '006400.KS', '035720.KS', '000270.KS'] },
  { id: 'crypto', name: 'Crypto Major', tickers: ['BTC-USD', 'ETH-USD', 'SOL-USD', 'XRP-USD', 'ADA-USD'] },
  { id: 'commodity', name: 'Commodities', tickers: ['GC=F', 'SI=F', 'CL=F', 'NG=F'] },
];

// ─── PostFetchModal (unchanged) ──────────────────────────────────────────────

function PostFetchModal({ open, onClose, tickers, analysis, analysisCount }: {
  open: boolean; onClose: () => void; tickers: string[]; analysis: string[]; analysisCount: number;
}) {
  const router = useRouter();
  if (!open) return null;

  const destinations = [
    { icon: LayoutDashboard, label: 'Finance Dashboard', description: 'Live charts, signals, and valuation analysis', path: '/dashboard/finance-dashboard', iconBg: 'border-primary/20 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground' },
    { icon: Database, label: 'Shared Data', description: 'View and download saved CSV files', path: '/dashboard/shared-data', iconBg: 'border-primary/20 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground' },
    { icon: FlaskConical, label: 'Finance Analytics', description: 'Statistical analysis, correlation, and modeling', path: '/dashboard/finance-analytics', iconBg: 'border-primary/20 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 px-5 py-4 rounded-t-2xl bg-primary text-primary-foreground">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-base font-bold">Data Sync Complete</p>
            <p className="text-sm text-primary-foreground/70">{tickers.length} tickers · {analysisCount} analysis types</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 transition-all"><X className="w-5 h-5" /></button>
        </div>
        <div className="bg-card border border-t-0 border-border rounded-b-2xl shadow-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-muted/30">
            <div className="flex flex-wrap gap-1.5">
              {tickers.slice(0, 9).map(t => (
                <span key={t} className="px-2.5 py-1 rounded-full bg-muted border border-border text-xs font-mono font-semibold text-foreground">{t}</span>
              ))}
              {tickers.length > 9 && <span className="px-2.5 py-1 rounded-full bg-muted border border-border text-xs font-mono text-muted-foreground">+{tickers.length - 9} more</span>}
            </div>
          </div>
          <div className="p-4 space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 mb-3">Where would you like to go?</p>
            {destinations.map(dest => (
              <button key={dest.path} onClick={() => { const p = new URLSearchParams({ tickers: tickers.join(','), analysis: analysis.join(','), period: 'synced' }); window.open(`${dest.path}?${p.toString()}`, '_blank'); }}
                className={cn("group relative w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card text-left transition-all duration-300", "hover:border-primary/50 hover:shadow-md hover:shadow-primary/5 hover:ring-1 hover:ring-primary/50")}>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className={cn("relative flex h-11 w-11 items-center justify-center rounded-2xl border transition-all duration-300 group-hover:scale-110", dest.iconBg)}>
                  <dest.icon className="w-5 h-5" />
                </div>
                <div className="relative flex-1 min-w-0">
                  <div className="text-base font-bold text-foreground">{dest.label}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">{dest.description}</div>
                </div>
                <ArrowRight className="relative w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 group-hover:text-primary transition-all duration-300 flex-shrink-0" />
              </button>
            ))}
          </div>
          <div className="px-4 pb-4">
            <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all">Stay on this page</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function FinanceApiPage({ title }: { title?: string }) {
  const router = useRouter();
  const db = useFirestore();
  const { toast } = useToast();
  const { setSyncResult } = useFinanceData();

  const [tickers, setTickers] = useState<string[]>([]);
  const [tickerInput, setTickerInput] = useState('');
  const [selectedUniverse, setSelectedUniverse] = useState('custom');
  const [selectedAnalysis, setSelectedAnalysis] = useState<string[]>(analysisTypes.map(a => a.id));
  const [period, setPeriod] = useState('1y');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncHistory, setSyncHistory] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [lastSyncTickers, setLastSyncTickers] = useState<string[]>([]);
  const [lastSyncAnalysis, setLastSyncAnalysis] = useState<string[]>([]);
  const [lastSyncAnalysisCount, setLastSyncAnalysisCount] = useState(0);

  useEffect(() => {
    const preset = presetUniverses.find(u => u.id === selectedUniverse);
    if (preset && preset.id !== 'custom') setTickers(preset.tickers);
  }, [selectedUniverse]);

  const addTicker = () => {
    const ticker = tickerInput.trim().toUpperCase();
    if (ticker && !tickers.includes(ticker)) {
      setTickers([...tickers, ticker]);
      setTickerInput('');
      setSelectedUniverse('custom');
    }
  };

  const removeTicker = (t: string) => {
    setTickers(tickers.filter(x => x !== t));
    setSelectedUniverse('custom');
  };

  const toggleAnalysis = (id: string) => {
    setSelectedAnalysis(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const handleSync = async () => {
    if (tickers.length === 0) { toast({ variant: "destructive", title: "No Tickers", description: "Please add at least one ticker." }); return; }
    if (selectedAnalysis.length === 0) { toast({ variant: "destructive", title: "No Analysis Selected", description: "Please select at least one analysis type." }); return; }
    if (!db) return;

    setIsSyncing(true);
    try {
      const syncParams: any = { orgId: TEMP_ORG_ID, tickers, analysisTypes: selectedAnalysis, period };
      if (period === 'custom' && startDate && endDate) {
        syncParams.startDate = startDate;
        syncParams.endDate = endDate;
      }
      const result = await triggerFinanceSync(syncParams);
      if (!result.success) throw new Error(result.error || 'Sync failed');

      if (result.results) {
        for (const file of result.results) {
          if (file.csv) {
            const fileId = `sync_finance_${file.dataType}_${Date.now()}`;
            await setDoc(doc(db, 'shared-files', fileId), {
              fileName: file.fileName, fileSize: file.csv.length, fileType: '.csv',
              orgId: TEMP_ORG_ID, uploadedBy: 'system_sync', uploadedByEmail: 'automation@statistica.ai',
              description: file.description, createdAt: serverTimestamp(),
              downloadURL: 'data:text/csv;charset=utf-8,' + encodeURIComponent(file.csv),
              autoMapped: true, dataType: file.dataType, columns: file.columns,
              columnTypes: file.columnTypes, sourcePlatform: 'yahoo_finance', syncedAt: new Date().toISOString(),
            });
          }
        }
      }

      setSyncResult({ tickers, analysisTypes: selectedAnalysis, period, syncedAt: new Date().toISOString(), files: result.results ?? [], parsed: {} });
      setSyncHistory(prev => [{ id: Date.now(), tickers: [...tickers], analysis: [...selectedAnalysis], period, syncedAt: new Date().toISOString(), status: 'success' }, ...prev]);

      setLastSyncTickers([...tickers]);
      setLastSyncAnalysis([...selectedAnalysis]);
      setLastSyncAnalysisCount(selectedAnalysis.length);
      setShowModal(true);

    } catch (error: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: error.message });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <PostFetchModal open={showModal} onClose={() => setShowModal(false)} tickers={lastSyncTickers} analysis={lastSyncAnalysis} analysisCount={lastSyncAnalysisCount} />

      <div className="space-y-8 animate-in fade-in duration-500">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">{title || 'Finance API'}</h1>
                <p className="text-sm text-muted-foreground">Connect to Yahoo Finance to fetch stock prices, fundamentals, and market data.</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm gap-1.5 py-1 px-3"><Globe className="w-3.5 h-3.5" /> Yahoo Finance</Badge>
            <Badge className="text-sm gap-1.5 py-1 px-3 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5" /> No Key Required</Badge>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Analysis Types', value: `${analysisTypes.length}`, icon: BarChart3 },
            { label: 'Preset Universes', value: `${presetUniverses.length - 1}`, icon: Database },
            { label: 'Selected Tickers', value: `${tickers.length}`, icon: TrendingUp },
            { label: 'Rate Limit', value: '~2K/hr', icon: RefreshCw },
          ].map(stat => (
            <Card key={stat.label}>
              <CardContent className="py-4 px-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <stat.icon className="w-5 h-5 text-muted-foreground/40" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Tabs ── */}
        <Tabs defaultValue="fetch" className="space-y-5">
          <TabsList className="h-10">
            <TabsTrigger value="fetch" className="text-sm gap-2 px-4"><TrendingUp className="w-4 h-4" /> Fetch Data</TabsTrigger>
            <TabsTrigger value="history" className="text-sm gap-2 px-4"><Clock className="w-4 h-4" /> History</TabsTrigger>
            <TabsTrigger value="info" className="text-sm gap-2 px-4"><ShieldCheck className="w-4 h-4" /> About</TabsTrigger>
          </TabsList>

          {/* ── Fetch Data Tab (Tickers + Analysis combined) ── */}
          <TabsContent value="fetch" className="space-y-5">
            {/* Ticker Selection */}
            <Card>
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h3 className="font-bold text-base">Select Tickers</h3>
                    <p className="text-sm text-muted-foreground">Choose a preset universe or add custom tickers</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Label className="text-sm mb-1.5 block">Preset Universe</Label>
                    <Select value={selectedUniverse} onValueChange={setSelectedUniverse}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {presetUniverses.map(u => <SelectItem key={u.id} value={u.id}>{u.name} {u.tickers.length > 0 && `(${u.tickers.length})`}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label className="text-sm mb-1.5 block">Data Period</Label>
                    <Select value={period} onValueChange={(v) => { setPeriod(v); if (v !== 'custom') { setStartDate(''); setEndDate(''); } }}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[['1mo','1 Month'],['3mo','3 Months'],['6mo','6 Months'],['1y','1 Year'],['2y','2 Years'],['5y','5 Years'],['max','Max'],['custom','Custom Range']].map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {period === 'custom' && (
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Label className="text-sm mb-1.5 block">Start Date</Label>
                      <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-10" />
                    </div>
                    <div className="flex-1">
                      <Label className="text-sm mb-1.5 block">End Date</Label>
                      <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-10" />
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Input placeholder="Enter ticker (e.g. AAPL, 005930.KS)" value={tickerInput} onChange={e => setTickerInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTicker()} className="flex-1 h-10" />
                  <Button onClick={addTicker} disabled={!tickerInput.trim()}><Plus className="w-4 h-4 mr-1.5" /> Add</Button>
                </div>
                {tickers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tickers.map(t => (
                      <Badge key={t} variant="secondary" className="px-2.5 py-1 text-sm font-mono gap-1.5">
                        {t}
                        <button onClick={() => removeTicker(t)} className="ml-1 hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
                      </Badge>
                    ))}
                    <span className="text-xs text-muted-foreground self-center ml-2">{tickers.length} ticker{tickers.length > 1 ? 's' : ''}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Analysis Type Selection */}
            <Card>
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <h3 className="font-bold text-base">Select Analysis Types</h3>
                    <p className="text-sm text-muted-foreground">Variables are auto-mapped based on selection.</p>
                  </div>
                  <button onClick={() => setSelectedAnalysis(selectedAnalysis.length === analysisTypes.length ? [] : analysisTypes.map(a => a.id))} className="text-sm font-semibold text-primary hover:underline flex-shrink-0">
                    {selectedAnalysis.length === analysisTypes.length ? "Deselect All" : "Select All"}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {analysisTypes.map(a => {
                    const isSelected = selectedAnalysis.includes(a.id);
                    return (
                      <button key={a.id} onClick={() => toggleAnalysis(a.id)} className={cn("flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all", isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-muted hover:border-muted-foreground/30")}>
                        <div className="flex items-center gap-2 mb-2">
                          <a.icon className={cn("w-4 h-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                          <span className="font-bold text-sm">{a.name}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />}
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{a.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {a.variables.slice(0, 4).map(v => <Badge key={v} variant="outline" className="text-[10px] px-1.5 h-5 font-mono">{v}</Badge>)}
                          {a.variables.length > 4 && <Badge variant="outline" className="text-[10px] px-1.5 h-5">+{a.variables.length - 4}</Badge>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Fetch Button */}
            <Button className="w-full" size="lg" onClick={handleSync} disabled={isSyncing || tickers.length === 0 || selectedAnalysis.length === 0 || (period === 'custom' && (!startDate || !endDate))}>
              {isSyncing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Fetching from Yahoo Finance...</> : <><RefreshCw className="w-4 h-4 mr-2" />Fetch Data</>}
            </Button>
          </TabsContent>

          {/* ── History Tab ── */}
          <TabsContent value="history">
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="font-bold text-base flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Recent Syncs</h3>
                {syncHistory.length === 0 ? (
                  <div className="text-center py-16">
                    <Clock className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-base text-muted-foreground">No sync history yet.</p>
                    <p className="text-sm text-muted-foreground mt-1">Fetch data from the Fetch Data tab to see results here.</p>
                  </div>
                ) : (
                  syncHistory.map(sync => (
                    <div key={sync.id} className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/50 text-sm cursor-pointer transition-colors"
                      onClick={() => { setLastSyncTickers(sync.tickers); setLastSyncAnalysis(sync.analysis); setLastSyncAnalysisCount(sync.analysis.length); setShowModal(true); }}>
                      <div className="flex items-center gap-3">
                        <Badge variant="default" className="bg-emerald-500 text-xs">Success</Badge>
                        <span className="font-mono">{sync.tickers.length} tickers</span>
                        <span className="text-muted-foreground">•</span>
                        <span>{sync.analysis.length} analysis types</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">{sync.period}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>{new Date(sync.syncedAt).toLocaleTimeString()}</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── About Tab ── */}
          <TabsContent value="info">
            <Card>
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  <h3 className="text-base font-bold uppercase tracking-wider text-muted-foreground">About Yahoo Finance API</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                  <div className="p-4 rounded-lg border bg-muted/30"><p className="font-bold text-foreground mb-1.5">Free & Open</p><p>No API key required. Stocks, ETFs, crypto, commodities, forex all supported.</p></div>
                  <div className="p-4 rounded-lg border bg-muted/30"><p className="font-bold text-foreground mb-1.5">Auto-Mapped Variables</p><p>All variables are pre-defined per analysis type. No manual column mapping needed.</p></div>
                  <div className="p-4 rounded-lg border bg-muted/30"><p className="font-bold text-foreground mb-1.5">Rate Limits</p><p>Yahoo Finance allows ~2,000 requests/hour. Large universes are batched automatically.</p></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}