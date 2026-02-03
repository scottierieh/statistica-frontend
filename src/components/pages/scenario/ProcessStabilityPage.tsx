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
  Activity, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle, Shield, Info, HelpCircle,
  FileText, FileImage, Download, Settings, AlertTriangle, ChevronRight, Target, BarChart3, TrendingUp,
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-995604437166.asia-northeast3.run.app";

interface DataRow { [key: string]: string | number | null; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface StabilityResult {
  success: boolean;
  results: {
    stability: { mean: number; std: number; ucl: number; lcl: number; is_stable: boolean; violation_count: number; violations: any[]; };
    quality: { n: number; mean: number; std: number; min: number; max: number; cpk?: number; yield_pct?: number; out_of_spec_pct?: number; };
    variance?: { group_stats: any[]; f_statistic: number; p_value: number; significant_difference: boolean; };
    trend?: { direction: string; slope: number; p_value: number; is_significant: boolean; total_change_pct: number; };
  };
  visualizations: { [key: string]: string };
  key_insights: KeyInsight[];
  summary: { n_observations: number; mean: number; std: number; is_stable: boolean; violation_count: number; cpk: number | null; yield_pct: number | null; has_trend: boolean; };
}

const generateSampleData = (): DataRow[] => {
  const data: DataRow[] = [];
  const machines = ["Machine-A", "Machine-B", "Machine-C"];
  const target = 100;
  
  for (let day = 1; day <= 30; day++) {
    for (let i = 0; i < 10; i++) {
      const machine = machines[Math.floor(Math.random() * machines.length)];
      const baseValue = target + (machine === "Machine-B" ? 2 : 0);
      const value = baseValue + (Math.random() - 0.5) * 10 + (day > 20 ? 3 : 0);
      
      data.push({
        date: `2024-01-${day.toString().padStart(2, '0')}`,
        measurement: parseFloat(value.toFixed(2)),
        machine: machine,
        operator: `OP-${Math.floor(Math.random() * 3) + 1}`,
        shift: Math.floor(i / 3) + 1
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

export default function ProcessStabilityPage() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<StabilityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [valueCol, setValueCol] = useState("");
  const [timestampCol, setTimestampCol] = useState("");
  const [groupCol, setGroupCol] = useState("");
  const [target, setTarget] = useState("");
  const [usl, setUsl] = useState("");
  const [lsl, setLsl] = useState("");

  const numCols = columns.filter(c => { const v = data[0]?.[c]; return typeof v === "number" || !isNaN(Number(v)); });

  const loadSample = useCallback(() => {
    const d = generateSampleData();
    setData(d);
    setColumns(Object.keys(d[0]));
    setValueCol("measurement");
    setTimestampCol("date");
    setGroupCol("machine");
    setTarget("100");
    setUsl("110");
    setLsl("90");
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
      const payload: any = { data, value_col: valueCol };
      if (timestampCol) payload.timestamp_col = timestampCol;
      if (groupCol) payload.group_col = groupCol;
      if (target) payload.target = parseFloat(target);
      if (usl) payload.usl = parseFloat(usl);
      if (lsl) payload.lsl = parseFloat(lsl);
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/stability`, {
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
    const a = document.createElement("a"); a.href = `data:image/png;base64,${results.visualizations[k]}`; a.download = `stability_${k}.png`; a.click();
  };

  if (step === 1) return (
    <div className="container mx-auto py-8 px-4 max-w-6xl space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4"><Activity className="w-8 h-8 text-primary" /></div>
        <h1 className="text-3xl font-bold">Process Stability & Quality</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Analyze process stability, detect control limit violations, and measure quality capability.</p>
      </div>
      <div className="grid md:grid-cols-4 gap-4">
        {[
          { icon: Activity, title: "Run Charts", desc: "Control limit analysis" },
          { icon: Target, title: "Capability", desc: "Cpk/Ppk calculation" },
          { icon: BarChart3, title: "Group Analysis", desc: "ANOVA comparison" },
          { icon: TrendingUp, title: "Trend Detection", desc: "Process drift" },
        ].map(i => (
          <Card key={i.title} className="border-2 hover:border-primary/50">
            <CardHeader className="text-center pb-2"><div className="mx-auto w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-2"><i.icon className="w-5 h-5 text-primary" /></div><CardTitle className="text-base">{i.title}</CardTitle></CardHeader>
            <CardContent className="text-center text-sm text-muted-foreground">{i.desc}</CardContent>
          </Card>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button size="lg" onClick={loadSample} className="gap-2"><Activity className="w-5 h-5" />Load Sample Data</Button>
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
            <div className="space-y-2"><Label>Value Column *</Label>
              <Select value={valueCol} onValueChange={setValueCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Timestamp Column</Label>
              <Select value={timestampCol || "__none__"} onValueChange={v => setTimestampCol(v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent><SelectItem value="__none__">-- None --</SelectItem>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Group Column</Label>
              <Select value={groupCol || "__none__"} onValueChange={v => setGroupCol(v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="For ANOVA" /></SelectTrigger><SelectContent><SelectItem value="__none__">-- None --</SelectItem>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Target Value</Label><Input type="number" placeholder="Optional" value={target} onChange={e => setTarget(e.target.value)} /></div>
          </div>
          <Separator />
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Upper Spec Limit (USL)</Label><Input type="number" placeholder="For Cpk" value={usl} onChange={e => setUsl(e.target.value)} /></div>
            <div className="space-y-2"><Label>Lower Spec Limit (LSL)</Label><Input type="number" placeholder="For Cpk" value={lsl} onChange={e => setLsl(e.target.value)} /></div>
          </div>
          <div className="flex justify-end pt-4"><Button onClick={() => setStep(3)} className="gap-2">Continue<ArrowRight className="w-4 h-4" /></Button></div>
        </CardContent>
      </Card>
    </div>
  );

  if (step === 3) {
    const checks = [
      { name: "Data Loaded", passed: data.length >= 5, msg: `${data.length} records` },
      { name: "Value Column", passed: !!valueCol, msg: valueCol || "Required" },
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
    const grad = s.is_stable ? "from-green-500 to-emerald-600" : "from-rose-500 to-orange-600";
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <ProgressBar currentStep={step} hasResults={!!results} onStepClick={setStep} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-primary" />Stability Results</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className={`bg-gradient-to-r ${grad} rounded-xl p-6 text-white`}>
              <div className="flex items-center justify-between">
                <div><p className="text-white/80 text-sm">Process Status</p><p className="text-3xl font-bold">{s.is_stable ? "STABLE" : "UNSTABLE"}</p><Badge className="mt-2 bg-white/20">{s.violation_count} violations</Badge></div>
                <div className="text-right">{s.cpk !== null && <><p className="text-white/80 text-sm">Cpk</p><p className="text-3xl font-bold">{s.cpk.toFixed(2)}</p></>}</div>
              </div>
            </div>
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { l: "Observations", v: s.n_observations.toString() },
                { l: "Mean", v: s.mean.toFixed(2) },
                { l: "Std Dev", v: s.std.toFixed(2) },
                { l: "Yield", v: s.yield_pct ? `${s.yield_pct.toFixed(1)}%` : "N/A" },
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
      { n: 1, t: "Control Limits", c: "UCL/LCL are ±3σ from mean. Points outside indicate special cause variation." },
      { n: 2, t: "Run Rules", c: "Nelson rules detect patterns: trends, runs, cycling that indicate process instability." },
      { n: 3, t: "Cpk", c: "Process capability index. Cpk ≥ 1.33 is excellent, ≥ 1.0 is acceptable, < 1.0 needs improvement." },
      { n: 4, t: "ANOVA", c: "Tests if group means differ significantly (p < 0.05 indicates significant difference)." },
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
            { icon: Activity, l: "Status", v: s.is_stable ? "Stable" : "Unstable" },
            { icon: Target, l: "Cpk", v: s.cpk?.toFixed(2) || "N/A" },
            { icon: BarChart3, l: "Mean", v: s.mean.toFixed(2) },
            { icon: AlertTriangle, l: "Violations", v: s.violation_count.toString() },
          ].map(i => (<Card key={i.l}><CardContent className="pt-6 text-center"><i.icon className="w-8 h-8 mx-auto text-primary mb-2" /><p className="text-sm text-muted-foreground">{i.l}</p><p className="text-xl font-bold">{i.v}</p></CardContent></Card>))}
        </div>
        <Card>
          <CardHeader><CardTitle>Visualizations</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="run_chart">
              <TabsList>{v.run_chart && <TabsTrigger value="run_chart">Run Chart</TabsTrigger>}{v.histogram && <TabsTrigger value="histogram">Histogram</TabsTrigger>}{v.group_chart && <TabsTrigger value="group_chart">Groups</TabsTrigger>}</TabsList>
              {Object.entries(v).map(([k, val]) => val && (
                <TabsContent key={k} value={k} className="mt-4">
                  <div className="relative"><img src={`data:image/png;base64,${val}`} alt={k} className="w-full rounded-lg" /><Button size="sm" variant="outline" className="absolute top-2 right-2" onClick={() => downloadPNG(k)}><Download className="w-4 h-4" /></Button></div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Control Limits</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                {[
                  { l: "Upper Control Limit (UCL)", v: r.stability.ucl.toFixed(3) },
                  { l: "Center Line (Mean)", v: r.stability.mean.toFixed(3) },
                  { l: "Lower Control Limit (LCL)", v: r.stability.lcl.toFixed(3) },
                  { l: "Standard Deviation", v: r.stability.std.toFixed(3) },
                ].map(row => (<TableRow key={row.l}><TableCell>{row.l}</TableCell><TableCell className="text-right font-bold">{row.v}</TableCell></TableRow>))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        {r.quality.cpk !== undefined && (
          <Card>
            <CardHeader><CardTitle>Quality Metrics</CardTitle></CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className={`rounded-lg p-4 text-center ${r.quality.cpk >= 1.33 ? "bg-green-50" : r.quality.cpk >= 1.0 ? "bg-amber-50" : "bg-rose-50"}`}>
                  <p className="text-sm text-muted-foreground">Cpk</p><p className={`text-3xl font-bold ${r.quality.cpk >= 1.33 ? "text-green-700" : r.quality.cpk >= 1.0 ? "text-amber-700" : "text-rose-700"}`}>{r.quality.cpk.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{r.quality.cpk >= 1.33 ? "Excellent" : r.quality.cpk >= 1.0 ? "Acceptable" : "Needs Improvement"}</p>
                </div>
                {r.quality.yield_pct !== undefined && (
                  <div className="bg-blue-50 rounded-lg p-4 text-center"><p className="text-sm text-muted-foreground">Yield</p><p className="text-3xl font-bold text-blue-700">{r.quality.yield_pct.toFixed(1)}%</p></div>
                )}
                {r.quality.out_of_spec_pct !== undefined && (
                  <div className="bg-rose-50 rounded-lg p-4 text-center"><p className="text-sm text-muted-foreground">Out of Spec</p><p className="text-3xl font-bold text-rose-700">{r.quality.out_of_spec_pct.toFixed(2)}%</p></div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader><CardTitle>Export</CardTitle></CardHeader>
          <CardContent className="flex gap-3">
            <Button variant="outline" className="gap-2" onClick={() => downloadPNG("run_chart")}><FileImage className="w-4 h-4" />PNG</Button>
            <Button variant="outline" disabled className="gap-2"><FileText className="w-4 h-4" />Excel (Soon)</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}