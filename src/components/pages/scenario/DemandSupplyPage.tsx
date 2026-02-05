"use client";

import React, { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Scale, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle, Shield, Info, HelpCircle,
  FileText, FileImage, Download, Settings, AlertTriangle, ChevronRight, TrendingUp, Package, Target, BarChart3,
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

interface DataRow { [key: string]: string | number | null; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface DemandSupplyResult {
  success: boolean;
  results: {
    gap_analysis: { total_demand: number; total_supply: number; total_gap: number; gap_pct: number; balance_status: string; shortage_count: number; surplus_count: number; };
    service_level: { fill_rate: number; fill_rate_target: number; meets_target: boolean; order_fulfillment_rate: number; stockout_rate: number; };
    product_analysis?: { product_data: any[]; worst_shortage: string; shortage_product_count: number; };
    trend_analysis?: { demand_trend: string; supply_trend: string; trend_data: any[]; };
    inventory_analysis?: { days_of_supply: number; safety_stock: number; reorder_point: number; inventory_status: string; };
    forecast?: { forecasts: any[]; expected_shortage: boolean; };
  };
  visualizations: { [key: string]: string };
  key_insights: KeyInsight[];
  summary: { total_demand: number; total_supply: number; gap: number; gap_pct: number; balance_status: string; fill_rate: number; meets_service_target: boolean; shortage_count: number; n_records: number; };
}

const generateSampleData = (): DataRow[] => {
  const products = ["Product-A", "Product-B", "Product-C", "Product-D", "Product-E"];
  const data: DataRow[] = [];
  
  for (let month = 1; month <= 12; month++) {
    for (const product of products) {
      const baseDemand = product === "Product-A" ? 1000 : product === "Product-B" ? 800 : 500;
      const demand = baseDemand * (0.9 + Math.random() * 0.3) + month * 20;
      const supplyRatio = product === "Product-C" ? 0.85 : 1.0 + Math.random() * 0.1;
      const supply = demand * supplyRatio;
      const inventory = supply * (0.2 + Math.random() * 0.3);
      
      data.push({
        date: `2024-${month.toString().padStart(2, '0')}-15`,
        product: product,
        demand: Math.round(demand),
        supply: Math.round(supply),
        inventory: Math.round(inventory),
        lead_time: Math.floor(3 + Math.random() * 7)
      });
    }
  }
  return data;
};

const ProgressBar: React.FC<{ currentStep: number; hasResults: boolean; onStepClick: (s: number) => void }> = ({ currentStep, hasResults, onStepClick }) => {
  const steps = [{ n: 1, l: "Intro" }, { n: 2, l: "Config" }, { n: 3, l: "Validation" }, { n: 4, l: "Summary" }, { n: 5, l: "Why" }, { n: 6, l: "Report" }];
  return (
    <div className="flex items-center justify-center gap-1 mb-8">
      {steps.map((s, i) => {
        const done = s.n < currentStep, cur = s.n === currentStep, ok = s.n <= 3 || hasResults;
        return (
          <React.Fragment key={s.n}>
            <button onClick={() => ok && onStepClick(s.n)} disabled={!ok}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${cur ? "bg-primary text-primary-foreground" : done ? "bg-primary/20 text-primary" : ok ? "bg-muted" : "opacity-40 cursor-not-allowed bg-muted"}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${cur ? "bg-primary-foreground text-primary" : done ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20"}`}>{done ? "✓" : s.n}</span>
              <span className="text-sm font-medium hidden sm:inline">{s.l}</span>
            </button>
            {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default function DemandSupplyPage() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<DemandSupplyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [demandCol, setDemandCol] = useState("");
  const [supplyCol, setSupplyCol] = useState("");
  const [dateCol, setDateCol] = useState("");
  const [productCol, setProductCol] = useState("");
  const [inventoryCol, setInventoryCol] = useState("");
  const [targetServiceLevel, setTargetServiceLevel] = useState("95");

  const numCols = columns.filter(c => { const v = data[0]?.[c]; return typeof v === "number" || !isNaN(Number(v)); });

  const loadSample = useCallback(() => {
    const d = generateSampleData();
    setData(d);
    setColumns(Object.keys(d[0]));
    setDemandCol("demand");
    setSupplyCol("supply");
    setDateCol("date");
    setProductCol("product");
    setInventoryCol("inventory");
    setStep(2);
    setResults(null);
    setError(null);
  }, []);

  const uploadFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const fd = new FormData(); fd.append("file", file);
    try {
      setLoading(true);
      const res = await fetch(`${FASTAPI_URL}/api/data/upload`, { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const r = await res.json();
      setData(r.data); setColumns(r.columns); setStep(2); setResults(null); setError(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Upload failed"); }
    finally { setLoading(false); }
  }, []);

  const runAnalysis = async () => {
    try {
      setLoading(true); setError(null);
      const payload: any = { data, demand_col: demandCol, supply_col: supplyCol };
      if (dateCol) payload.date_col = dateCol;
      if (productCol) payload.product_col = productCol;
      if (inventoryCol) payload.inventory_col = inventoryCol;
      payload.target_service_level = parseFloat(targetServiceLevel) / 100;
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/demand-supply`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Analysis failed"); }
      setResults(await res.json()); setStep(4);
    } catch (err) { setError(err instanceof Error ? err.message : "Analysis failed"); }
    finally { setLoading(false); }
  };

  const downloadPNG = (k: string) => {
    if (!results?.visualizations[k]) return;
    const a = document.createElement("a"); a.href = `data:image/png;base64,${results.visualizations[k]}`; a.download = `demand_supply_${k}.png`; a.click();
  };

  if (step === 1) return (
    <div className="container mx-auto py-8 px-4 max-w-6xl space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4"><Scale className="w-8 h-8 text-primary" /></div>
        <h1 className="text-3xl font-bold">Demand-Supply Matching</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Analyze demand-supply gaps, service levels, inventory optimization, and forecast imbalances.</p>
      </div>
      <div className="grid md:grid-cols-4 gap-4">
        {[
          { icon: Scale, title: "Gap Analysis", desc: "Supply vs demand balance" },
          { icon: Target, title: "Service Level", desc: "Fill rate & fulfillment" },
          { icon: Package, title: "Inventory", desc: "Safety stock & reorder" },
          { icon: TrendingUp, title: "Forecast", desc: "Predict shortages" },
        ].map(i => (
          <Card key={i.title} className="border-2 hover:border-primary/50">
            <CardHeader className="text-center pb-2"><div className="mx-auto w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-2"><i.icon className="w-5 h-5 text-primary" /></div><CardTitle className="text-base">{i.title}</CardTitle></CardHeader>
            <CardContent className="text-center text-sm text-muted-foreground">{i.desc}</CardContent>
          </Card>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button size="lg" onClick={loadSample} className="gap-2"><Scale className="w-5 h-5" />Load Sample Data</Button>
        <Button size="lg" variant="outline" onClick={() => fileRef.current?.click()} className="gap-2"><Upload className="w-5 h-5" />Upload Data</Button>
        <input ref={fileRef} type="file" accept=".csv,.xlsx" onChange={uploadFile} className="hidden" />
      </div>
    </div>
  );

  if (step === 2) return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <ProgressBar currentStep={step} hasResults={!!results} onStepClick={setStep} />
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-primary" />Configure Analysis</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Demand Column *</Label>
              <Select value={demandCol} onValueChange={setDemandCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Supply Column *</Label>
              <Select value={supplyCol} onValueChange={setSupplyCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <Separator />
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Date Column</Label>
              <Select value={dateCol || "__none__"} onValueChange={v => setDateCol(v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="For trends" /></SelectTrigger><SelectContent><SelectItem value="__none__">-- None --</SelectItem>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Product Column</Label>
              <Select value={productCol || "__none__"} onValueChange={v => setProductCol(v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="For breakdown" /></SelectTrigger><SelectContent><SelectItem value="__none__">-- None --</SelectItem>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Inventory Column</Label>
              <Select value={inventoryCol || "__none__"} onValueChange={v => setInventoryCol(v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="For safety stock" /></SelectTrigger><SelectContent><SelectItem value="__none__">-- None --</SelectItem>{numCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Target Service Level (%)</Label><Input type="number" value={targetServiceLevel} onChange={e => setTargetServiceLevel(e.target.value)} /></div>
          </div>
          <div className="flex justify-end pt-4"><Button onClick={() => setStep(3)} className="gap-2">Continue<ArrowRight className="w-4 h-4" /></Button></div>
        </CardContent>
      </Card>
    </div>
  );

  if (step === 3) {
    const checks = [
      { name: "Data Loaded", passed: data.length >= 3, msg: `${data.length} records` },
      { name: "Demand Column", passed: !!demandCol, msg: demandCol || "Required" },
      { name: "Supply Column", passed: !!supplyCol, msg: supplyCol || "Required" },
    ];
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <ProgressBar currentStep={step} hasResults={!!results} onStepClick={setStep} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" />Validation</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {checks.map((c, i) => (
              <div key={i} className={`flex items-center justify-between p-4 rounded-lg ${c.passed ? "bg-primary/5" : "bg-rose-50"}`}>
                <div className="flex items-center gap-3">{c.passed ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-rose-500" />}<div><p className="font-medium">{c.name}</p><p className="text-sm text-muted-foreground">{c.msg}</p></div></div>
                <Badge variant={c.passed ? "default" : "destructive"}>{c.passed ? "Pass" : "Error"}</Badge>
              </div>
            ))}
            {error && <div className="bg-rose-50 rounded-lg p-4 flex items-start gap-2"><AlertCircle className="w-5 h-5 text-rose-600" /><p className="text-sm text-rose-700">{error}</p></div>}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={runAnalysis} disabled={loading || !checks.every(c => c.passed)} className="gap-2">
                {loading ? <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Analyzing...</> : <>Run Analysis<ArrowRight className="w-4 h-4" /></>}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 4 && results) {
    const { summary: s } = results;
    const statusColor = s.balance_status === 'shortage' ? 'from-rose-500 to-red-600' : s.balance_status === 'surplus' ? 'from-amber-500 to-orange-600' : 'from-green-500 to-emerald-600';
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <ProgressBar currentStep={step} hasResults={!!results} onStepClick={setStep} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Scale className="w-5 h-5 text-primary" />Demand-Supply Results</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className={`bg-gradient-to-r ${statusColor} rounded-xl p-6 text-white`}>
              <div className="flex items-center justify-between">
                <div><p className="text-white/80 text-sm">Balance Status</p><p className="text-3xl font-bold capitalize">{s.balance_status}</p><Badge className="mt-2 bg-white/20">Gap: {s.gap_pct >= 0 ? '+' : ''}{s.gap_pct.toFixed(1)}%</Badge></div>
                <div className="text-right"><p className="text-white/80 text-sm">Fill Rate</p><p className="text-3xl font-bold">{s.fill_rate.toFixed(1)}%</p><p className="text-white/80 text-sm">{s.meets_service_target ? '✓ Target Met' : '✗ Below Target'}</p></div>
              </div>
            </div>
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { l: "Total Demand", v: s.total_demand.toLocaleString() },
                { l: "Total Supply", v: s.total_supply.toLocaleString() },
                { l: "Gap", v: `${s.gap >= 0 ? '+' : ''}${s.gap.toLocaleString()}` },
                { l: "Shortages", v: s.shortage_count.toString() },
              ].map(i => (<div key={i.l} className="bg-slate-50 rounded-xl p-4 text-center"><p className="text-sm text-muted-foreground">{i.l}</p><p className="text-xl font-bold">{i.v}</p></div>))}
            </div>
            <div className="space-y-3"><h4 className="font-semibold">Key Insights</h4>
              {results.key_insights.map((ins, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${ins.status === "positive" ? "bg-green-50" : ins.status === "warning" ? "bg-amber-50" : "bg-slate-50"}`}>
                  {ins.status === "positive" ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : ins.status === "warning" ? <AlertTriangle className="w-5 h-5 text-amber-600" /> : <Info className="w-5 h-5 text-blue-600" />}
                  <div><p className="font-medium">{ins.title}</p><p className="text-sm text-muted-foreground">{ins.description}</p></div>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-4"><Button onClick={() => setStep(5)} className="gap-2">Understand<ArrowRight className="w-4 h-4" /></Button></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 5 && results) {
    const exps = [
      { n: 1, t: "Demand-Supply Gap", c: "Supply - Demand. Negative = shortage (can't meet demand), Positive = surplus (excess inventory risk)." },
      { n: 2, t: "Fill Rate", c: "% of demand fulfilled. Key service metric. Target typically 95%+ for good customer experience." },
      { n: 3, t: "Safety Stock", c: "Buffer inventory to handle demand variability. Calculated using demand std dev and lead time." },
      { n: 4, t: "Reorder Point", c: "Inventory level that triggers replenishment = (Avg demand × Lead time) + Safety stock." },
    ];
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <ProgressBar currentStep={step} hasResults={!!results} onStepClick={setStep} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><HelpCircle className="w-5 h-5 text-primary" />Understanding</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              {exps.map(e => (
                <div key={e.n} className="bg-muted/30 rounded-xl p-5 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">{e.n}</div>
                  <div><p className="font-semibold">{e.t}</p><p className="text-sm text-muted-foreground mt-1">{e.c}</p></div>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(4)}>Back</Button>
              <Button onClick={() => setStep(6)} className="gap-2">Full Report<ArrowRight className="w-4 h-4" /></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 6 && results) {
    const { results: r, summary: s, visualizations: v } = results;
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl space-y-6">
        <ProgressBar currentStep={step} hasResults={!!results} onStepClick={setStep} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Scale, l: "Status", v: s.balance_status },
            { icon: Target, l: "Fill Rate", v: `${s.fill_rate.toFixed(1)}%` },
            { icon: TrendingUp, l: "Gap %", v: `${s.gap_pct >= 0 ? '+' : ''}${s.gap_pct.toFixed(1)}%` },
            { icon: AlertTriangle, l: "Shortages", v: s.shortage_count.toString() },
          ].map(i => (<Card key={i.l}><CardContent className="pt-6 text-center"><i.icon className="w-8 h-8 mx-auto text-primary mb-2" /><p className="text-sm text-muted-foreground">{i.l}</p><p className="text-xl font-bold capitalize">{i.v}</p></CardContent></Card>))}
        </div>
        <Card>
          <CardHeader><CardTitle>Visualizations</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="gap_chart">
              <TabsList>{v.gap_chart && <TabsTrigger value="gap_chart">Gap Analysis</TabsTrigger>}{v.service_chart && <TabsTrigger value="service_chart">Service Level</TabsTrigger>}{v.product_chart && <TabsTrigger value="product_chart">By Product</TabsTrigger>}</TabsList>
              {Object.entries(v).map(([k, val]) => val && (
                <TabsContent key={k} value={k} className="mt-4">
                  <div className="relative"><img src={`data:image/png;base64,${val}`} alt={k} className="w-full rounded-lg" /><Button size="sm" variant="outline" className="absolute top-2 right-2" onClick={() => downloadPNG(k)}><Download className="w-4 h-4" /></Button></div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
        {r.product_analysis && r.product_analysis.product_data && (
          <Card>
            <CardHeader><CardTitle>Gap by Product</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Demand</TableHead><TableHead className="text-right">Supply</TableHead><TableHead className="text-right">Gap</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {r.product_analysis.product_data.slice(0, 10).map((p: any, i: number) => (
                    <TableRow key={i}><TableCell className="font-medium">{p.product}</TableCell><TableCell className="text-right">{p.demand.toLocaleString()}</TableCell><TableCell className="text-right">{p.supply.toLocaleString()}</TableCell><TableCell className="text-right font-bold">{p.gap >= 0 ? '+' : ''}{p.gap.toLocaleString()}</TableCell><TableCell><Badge className={p.status === 'shortage' ? 'bg-rose-500' : p.status === 'surplus' ? 'bg-amber-500' : 'bg-green-500'}>{p.status}</Badge></TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        {r.inventory_analysis && (
          <Card>
            <CardHeader><CardTitle>Inventory Analysis</CardTitle></CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div className={`rounded-lg p-4 text-center ${r.inventory_analysis.inventory_status === 'critical' ? 'bg-rose-50' : r.inventory_analysis.inventory_status === 'low' ? 'bg-amber-50' : 'bg-green-50'}`}>
                  <p className="text-sm text-muted-foreground">Status</p><p className="text-xl font-bold capitalize">{r.inventory_analysis.inventory_status}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 text-center"><p className="text-sm text-muted-foreground">Days of Supply</p><p className="text-xl font-bold">{r.inventory_analysis.days_of_supply.toFixed(1)}</p></div>
                <div className="bg-slate-50 rounded-lg p-4 text-center"><p className="text-sm text-muted-foreground">Safety Stock</p><p className="text-xl font-bold">{r.inventory_analysis.safety_stock.toLocaleString()}</p></div>
                <div className="bg-slate-50 rounded-lg p-4 text-center"><p className="text-sm text-muted-foreground">Reorder Point</p><p className="text-xl font-bold">{r.inventory_analysis.reorder_point.toLocaleString()}</p></div>
              </div>
            </CardContent>
          </Card>
        )}
        {r.forecast && r.forecast.forecasts && (
          <Card>
            <CardHeader><CardTitle>Forecast (Next {r.forecast.forecasts.length} Periods)</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Period</TableHead><TableHead className="text-right">Forecast Demand</TableHead><TableHead className="text-right">Forecast Supply</TableHead><TableHead className="text-right">Expected Gap</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {r.forecast.forecasts.map((f: any) => (
                    <TableRow key={f.period}><TableCell>+{f.period}</TableCell><TableCell className="text-right">{f.forecast_demand.toLocaleString()}</TableCell><TableCell className="text-right">{f.forecast_supply.toLocaleString()}</TableCell><TableCell className="text-right font-bold">{f.forecast_gap >= 0 ? '+' : ''}{f.forecast_gap.toLocaleString()}</TableCell><TableCell><Badge className={f.forecast_status === 'shortage' ? 'bg-rose-500' : f.forecast_status === 'surplus' ? 'bg-amber-500' : 'bg-green-500'}>{f.forecast_status}</Badge></TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader><CardTitle>Export</CardTitle></CardHeader>
          <CardContent className="flex gap-3">
            <Button variant="outline" className="gap-2" onClick={() => downloadPNG("gap_chart")}><FileImage className="w-4 h-4" />PNG</Button>
            <Button variant="outline" disabled className="gap-2"><FileText className="w-4 h-4" />Excel (Soon)</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}