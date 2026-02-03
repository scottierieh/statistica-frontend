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
  Gauge, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle, Shield, Info, HelpCircle,
  FileText, FileImage, Download, Settings, AlertTriangle, ChevronRight, TrendingUp, Factory, Target, Zap,
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-995604437166.asia-northeast3.run.app";

interface DataRow { [key: string]: string | number | null; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface CapacityResult {
  success: boolean;
  results: {
    utilization: { total_capacity: number; total_demand: number; demand_utilization: number; available_capacity: number; available_pct: number; status: string; };
    by_resource?: { resource_data: any[]; bottleneck_count: number; bottleneck_resources: string[]; highest_util_resource: string; highest_utilization: number; };
    trend?: { trend_data: any[]; demand_trend: string; capacity_trend: string; };
    forecast?: { forecasts: any[]; periods_to_constraint: number | null; expansion_needed: boolean; };
    recommendations: Array<{ priority: string; area: string; recommendation: string; action: string; impact: string; }>;
  };
  visualizations: { [key: string]: string };
  key_insights: KeyInsight[];
  summary: { total_capacity: number; total_demand: number; utilization: number; status: string; available_capacity: number; bottleneck_count: number; periods_to_constraint: number | null; n_records: number; };
}

const generateSampleData = (): DataRow[] => {
  const resources = ["Line-A", "Line-B", "Line-C", "Line-D"];
  const products = ["Product-X", "Product-Y", "Product-Z"];
  const data: DataRow[] = [];
  
  for (let month = 1; month <= 12; month++) {
    for (const resource of resources) {
      const baseCapacity = resource === "Line-A" ? 1000 : resource === "Line-B" ? 800 : 600;
      const capacity = baseCapacity;
      const demandGrowth = 1 + (month - 1) * 0.03;
      const baseDemand = resource === "Line-A" ? 850 : resource === "Line-B" ? 750 : 400;
      const demand = Math.round(baseDemand * demandGrowth * (0.9 + Math.random() * 0.2));
      const actual = Math.min(demand, capacity) * (0.9 + Math.random() * 0.1);
      const product = products[Math.floor(Math.random() * products.length)];
      
      data.push({
        date: `2024-${month.toString().padStart(2, '0')}-15`,
        resource: resource,
        product: product,
        capacity: capacity,
        demand: demand,
        actual_output: Math.round(actual)
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

export default function CapacityPlanningPage() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<CapacityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [capacityCol, setCapacityCol] = useState("");
  const [demandCol, setDemandCol] = useState("");
  const [dateCol, setDateCol] = useState("");
  const [resourceCol, setResourceCol] = useState("");
  const [productCol, setProductCol] = useState("");
  const [actualCol, setActualCol] = useState("");
  const [targetUtil, setTargetUtil] = useState("85");

  const numCols = columns.filter(c => { const v = data[0]?.[c]; return typeof v === "number" || !isNaN(Number(v)); });

  const loadSample = useCallback(() => {
    const d = generateSampleData();
    setData(d);
    setColumns(Object.keys(d[0]));
    setCapacityCol("capacity");
    setDemandCol("demand");
    setDateCol("date");
    setResourceCol("resource");
    setProductCol("product");
    setActualCol("actual_output");
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
      const payload: any = { data, capacity_col: capacityCol, demand_col: demandCol };
      if (dateCol) payload.date_col = dateCol;
      if (resourceCol) payload.resource_col = resourceCol;
      if (productCol) payload.product_col = productCol;
      if (actualCol) payload.actual_output_col = actualCol;
      payload.target_utilization = parseFloat(targetUtil) / 100;
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/capacity`, {
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
    const a = document.createElement("a"); a.href = `data:image/png;base64,${results.visualizations[k]}`; a.download = `capacity_${k}.png`; a.click();
  };

  if (step === 1) return (
    <div className="container mx-auto py-8 px-4 max-w-6xl space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4"><Gauge className="w-8 h-8 text-primary" /></div>
        <h1 className="text-3xl font-bold">Capacity Planning</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Analyze production capacity vs demand, identify bottlenecks, and forecast capacity needs.</p>
      </div>
      <div className="grid md:grid-cols-4 gap-4">
        {[
          { icon: Gauge, title: "Utilization", desc: "Capacity usage analysis" },
          { icon: Factory, title: "Resource View", desc: "By machine/line" },
          { icon: TrendingUp, title: "Trend & Forecast", desc: "Future capacity needs" },
          { icon: Target, title: "Recommendations", desc: "Action priorities" },
        ].map(i => (
          <Card key={i.title} className="border-2 hover:border-primary/50">
            <CardHeader className="text-center pb-2"><div className="mx-auto w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-2"><i.icon className="w-5 h-5 text-primary" /></div><CardTitle className="text-base">{i.title}</CardTitle></CardHeader>
            <CardContent className="text-center text-sm text-muted-foreground">{i.desc}</CardContent>
          </Card>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button size="lg" onClick={loadSample} className="gap-2"><Gauge className="w-5 h-5" />Load Sample Data</Button>
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
            <div className="space-y-2"><Label>Capacity Column *</Label>
              <Select value={capacityCol} onValueChange={setCapacityCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Demand Column *</Label>
              <Select value={demandCol} onValueChange={setDemandCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <Separator />
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Date Column</Label>
              <Select value={dateCol || "__none__"} onValueChange={v => setDateCol(v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="For trends" /></SelectTrigger><SelectContent><SelectItem value="__none__">-- None --</SelectItem>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Resource Column</Label>
              <Select value={resourceCol || "__none__"} onValueChange={v => setResourceCol(v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="Machine/Line" /></SelectTrigger><SelectContent><SelectItem value="__none__">-- None --</SelectItem>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Actual Output Column</Label>
              <Select value={actualCol || "__none__"} onValueChange={v => setActualCol(v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent><SelectItem value="__none__">-- None --</SelectItem>{numCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Product Column</Label>
              <Select value={productCol || "__none__"} onValueChange={v => setProductCol(v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent><SelectItem value="__none__">-- None --</SelectItem>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Target Utilization (%)</Label><Input type="number" value={targetUtil} onChange={e => setTargetUtil(e.target.value)} /></div>
          </div>
          <div className="flex justify-end pt-4"><Button onClick={() => setStep(3)} className="gap-2">Continue<ArrowRight className="w-4 h-4" /></Button></div>
        </CardContent>
      </Card>
    </div>
  );

  if (step === 3) {
    const checks = [
      { name: "Data Loaded", passed: data.length >= 3, msg: `${data.length} records` },
      { name: "Capacity Column", passed: !!capacityCol, msg: capacityCol || "Required" },
      { name: "Demand Column", passed: !!demandCol, msg: demandCol || "Required" },
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
    const statusColor = s.status === 'over_capacity' ? 'from-rose-500 to-red-600' : s.status === 'near_capacity' ? 'from-amber-500 to-orange-600' : s.status === 'optimal' ? 'from-green-500 to-emerald-600' : 'from-slate-400 to-slate-500';
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <ProgressBar currentStep={step} hasResults={!!results} onStepClick={setStep} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Gauge className="w-5 h-5 text-primary" />Capacity Analysis Results</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className={`bg-gradient-to-r ${statusColor} rounded-xl p-6 text-white`}>
              <div className="flex items-center justify-between">
                <div><p className="text-white/80 text-sm">Utilization</p><p className="text-4xl font-bold">{s.utilization.toFixed(0)}%</p><Badge className="mt-2 bg-white/20 capitalize">{s.status.replace('_', ' ')}</Badge></div>
                <div className="text-right"><p className="text-white/80 text-sm">Available Capacity</p><p className="text-3xl font-bold">{s.available_capacity.toLocaleString()}</p>{s.bottleneck_count > 0 && <p className="text-white/80 text-sm">{s.bottleneck_count} bottlenecks</p>}</div>
              </div>
            </div>
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { l: "Total Capacity", v: s.total_capacity.toLocaleString() },
                { l: "Total Demand", v: s.total_demand.toLocaleString() },
                { l: "Bottlenecks", v: s.bottleneck_count.toString() },
                { l: "Constraint In", v: s.periods_to_constraint ? `${s.periods_to_constraint} periods` : "None" },
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
      { n: 1, t: "Capacity Utilization", c: "Demand / Capacity × 100. Optimal is 70-85%. Above 90% = risk, below 50% = waste." },
      { n: 2, t: "Bottleneck Resources", c: "Resources at >90% utilization limit overall throughput. Focus improvements here." },
      { n: 3, t: "Capacity Buffer", c: "Available capacity for demand variability. 15-30% buffer recommended." },
      { n: 4, t: "Forecast Horizon", c: "Project when capacity will be constrained based on demand trends." },
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
            { icon: Gauge, l: "Utilization", v: `${s.utilization.toFixed(0)}%` },
            { icon: Factory, l: "Capacity", v: s.total_capacity.toLocaleString() },
            { icon: TrendingUp, l: "Demand", v: s.total_demand.toLocaleString() },
            { icon: AlertTriangle, l: "Bottlenecks", v: s.bottleneck_count.toString() },
          ].map(i => (<Card key={i.l}><CardContent className="pt-6 text-center"><i.icon className="w-8 h-8 mx-auto text-primary mb-2" /><p className="text-sm text-muted-foreground">{i.l}</p><p className="text-xl font-bold">{i.v}</p></CardContent></Card>))}
        </div>
        <Card>
          <CardHeader><CardTitle>Visualizations</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="utilization_chart">
              <TabsList>{v.utilization_chart && <TabsTrigger value="utilization_chart">Utilization</TabsTrigger>}{v.resource_chart && <TabsTrigger value="resource_chart">Resources</TabsTrigger>}{v.trend_chart && <TabsTrigger value="trend_chart">Trend</TabsTrigger>}</TabsList>
              {Object.entries(v).map(([k, val]) => val && (
                <TabsContent key={k} value={k} className="mt-4">
                  <div className="relative"><img src={`data:image/png;base64,${val}`} alt={k} className="w-full rounded-lg" /><Button size="sm" variant="outline" className="absolute top-2 right-2" onClick={() => downloadPNG(k)}><Download className="w-4 h-4" /></Button></div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
        {r.by_resource && (
          <Card>
            <CardHeader><CardTitle>Resource Utilization</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Resource</TableHead><TableHead className="text-right">Capacity</TableHead><TableHead className="text-right">Demand</TableHead><TableHead className="text-right">Utilization</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {r.by_resource.resource_data.map((res: any, i: number) => (
                    <TableRow key={i}><TableCell className="font-medium">{res.resource}</TableCell><TableCell className="text-right">{res.capacity.toLocaleString()}</TableCell><TableCell className="text-right">{res.demand.toLocaleString()}</TableCell><TableCell className="text-right font-bold">{res.utilization.toFixed(0)}%</TableCell><TableCell><Badge className={res.status === 'over_capacity' ? 'bg-rose-500' : res.status === 'critical' ? 'bg-red-400' : res.status === 'high' ? 'bg-amber-500' : res.status === 'optimal' ? 'bg-green-500' : 'bg-slate-400'}>{res.status}</Badge></TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        {r.forecast && r.forecast.forecasts && (
          <Card>
            <CardHeader><CardTitle>Capacity Forecast</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Period</TableHead><TableHead className="text-right">Forecast Demand</TableHead><TableHead className="text-right">Current Capacity</TableHead><TableHead className="text-right">Utilization</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {r.forecast.forecasts.map((f: any) => (
                    <TableRow key={f.period}><TableCell>{f.period}</TableCell><TableCell className="text-right">{f.forecast_demand.toLocaleString()}</TableCell><TableCell className="text-right">{f.current_capacity.toLocaleString()}</TableCell><TableCell className="text-right font-bold">{f.forecast_utilization.toFixed(0)}%</TableCell><TableCell>{f.needs_expansion ? <Badge className="bg-amber-500">Expand</Badge> : <Badge className="bg-green-500">OK</Badge>}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        {r.recommendations && r.recommendations.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Recommendations</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Priority</TableHead><TableHead>Area</TableHead><TableHead>Recommendation</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {r.recommendations.map((rec: any, i: number) => (
                    <TableRow key={i}><TableCell><Badge className={rec.priority === 'critical' ? 'bg-rose-500' : rec.priority === 'high' ? 'bg-amber-500' : rec.priority === 'medium' ? 'bg-blue-500' : 'bg-slate-400'}>{rec.priority}</Badge></TableCell><TableCell className="font-medium">{rec.area}</TableCell><TableCell className="text-sm">{rec.recommendation}</TableCell><TableCell className="text-sm">{rec.action}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader><CardTitle>Export</CardTitle></CardHeader>
          <CardContent className="flex gap-3">
            <Button variant="outline" className="gap-2" onClick={() => downloadPNG("utilization_chart")}><FileImage className="w-4 h-4" />PNG</Button>
            <Button variant="outline" disabled className="gap-2"><FileText className="w-4 h-4" />Excel (Soon)</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}