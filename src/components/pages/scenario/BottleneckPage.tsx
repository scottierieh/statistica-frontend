"use client";

import React, { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Filter, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle, Shield, Info, HelpCircle,
  FileText, FileImage, Download, TrendingUp, Settings, Activity, AlertTriangle, ChevronRight,
  Target, BarChart3, Clock, Zap, Layers, Timer, Gauge,
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

interface DataRow { [key: string]: string | number | null; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface BottleneckResult {
  success: boolean;
  results: {
    cycle_time_analysis: {
      process_stats: Array<{
        process: string; count: number; mean: number; std: number;
        min: number; max: number; median: number; cv: number;
      }>;
      bottleneck_process: string;
      bottleneck_time: number;
      total_processes: number;
      avg_cycle_time: number;
      total_cycle_time: number;
    };
    throughput_analysis?: {
      throughput_stats: Array<{ process: string; mean: number; total: number; }>;
      bottleneck_process: string;
      bottleneck_throughput: number;
      system_throughput: number;
    };
    queue_analysis?: {
      queue_stats: Array<{ process: string; mean_queue: number; }>;
      max_queue_process: string;
      max_queue: number;
      total_wip: number;
      avg_wip: number;
    };
    utilization_analysis?: {
      utilization_data: Array<{ process: string; utilization: number; spare_capacity: number; }>;
      highest_util_process: string;
      highest_utilization: number;
      avg_utilization: number;
      critical_count: number;
    };
    constraints: Array<{
      type: string; process: string; metric: string;
      value: number; unit: string; severity: string; recommendation: string;
    }>;
  };
  visualizations: { [key: string]: string };
  key_insights: KeyInsight[];
  summary: {
    primary_bottleneck: string;
    bottleneck_cycle_time: number;
    total_cycle_time: number;
    avg_cycle_time: number;
    process_count: number;
    constraint_count: number;
    critical_constraints: number;
    highest_utilization: number | null;
  };
}

const generateSampleData = (): DataRow[] => {
  const processes = ["Receiving", "Inspection", "Assembly", "Testing", "Packaging", "Shipping"];
  const data: DataRow[] = [];
  
  // Base cycle times (Assembly is the bottleneck)
  const baseTimes: { [key: string]: number } = {
    "Receiving": 5,
    "Inspection": 8,
    "Assembly": 25,  // Bottleneck
    "Testing": 12,
    "Packaging": 6,
    "Shipping": 4
  };
  
  const capacities: { [key: string]: number } = {
    "Receiving": 100,
    "Inspection": 80,
    "Assembly": 40,  // Limited capacity
    "Testing": 60,
    "Packaging": 90,
    "Shipping": 100
  };
  
  for (let day = 1; day <= 30; day++) {
    for (const process of processes) {
      const baseTime = baseTimes[process];
      const capacity = capacities[process];
      
      // Add some variation
      const cycleTime = baseTime + (Math.random() - 0.5) * baseTime * 0.3;
      const throughput = capacity * (0.7 + Math.random() * 0.25);
      const queue = process === "Assembly" ? 15 + Math.random() * 20 : 
                   process === "Testing" ? 8 + Math.random() * 10 : 
                   2 + Math.random() * 5;
      
      data.push({
        date: `2024-01-${day.toString().padStart(2, '0')}`,
        process: process,
        cycle_time: parseFloat(cycleTime.toFixed(2)),
        throughput: Math.round(throughput),
        capacity: capacity,
        queue_length: Math.round(queue),
        resource_id: `${process.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 3) + 1}`
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

export default function ProcessBottleneckPage() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<BottleneckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [processCol, setProcessCol] = useState("");
  const [cycleTimeCol, setCycleTimeCol] = useState("");
  const [throughputCol, setThroughputCol] = useState("");
  const [queueCol, setQueueCol] = useState("");
  const [capacityCol, setCapacityCol] = useState("");
  const [timestampCol, setTimestampCol] = useState("");
  const [targetCycleTime, setTargetCycleTime] = useState("");

  const numCols = columns.filter(c => {
    const v = data[0]?.[c];
    return typeof v === "number" || !isNaN(Number(v));
  });

  const loadSample = useCallback(() => {
    const d = generateSampleData();
    setData(d);
    setColumns(Object.keys(d[0]));
    setProcessCol("process");
    setCycleTimeCol("cycle_time");
    setThroughputCol("throughput");
    setQueueCol("queue_length");
    setCapacityCol("capacity");
    setTimestampCol("date");
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
      const payload: any = {
        data,
        process_col: processCol,
        cycle_time_col: cycleTimeCol
      };
      if (throughputCol) payload.throughput_col = throughputCol;
      if (queueCol) payload.queue_col = queueCol;
      if (capacityCol) payload.capacity_col = capacityCol;
      if (timestampCol) payload.timestamp_col = timestampCol;
      if (targetCycleTime) payload.target_cycle_time = parseFloat(targetCycleTime);
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/bottleneck`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Analysis failed"); }
      setResults(await res.json()); setStep(4);
    } catch (err) { setError(err instanceof Error ? err.message : "Analysis failed"); }
    finally { setLoading(false); }
  };

  const downloadPNG = (k: string) => {
    if (!results?.visualizations[k]) return;
    const a = document.createElement("a");
    a.href = `data:image/png;base64,${results.visualizations[k]}`;
    a.download = `bottleneck_${k}.png`;
    a.click();
  };

  // Step 1: Intro
  if (step === 1) return (
    <div className="container mx-auto py-8 px-4 max-w-6xl space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
          <Filter className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Process Bottleneck Diagnosis</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Identify constraints limiting your process throughput using cycle time analysis, queue metrics, and utilization data.
        </p>
      </div>
      <div className="grid md:grid-cols-4 gap-4">
        {[
          { icon: Timer, title: "Cycle Time Analysis", desc: "Find slowest stages" },
          { icon: Layers, title: "Queue Analysis", desc: "WIP buildup detection" },
          { icon: Gauge, title: "Utilization", desc: "Capacity constraints" },
          { icon: Target, title: "Constraints", desc: "Prioritized recommendations" },
        ].map(i => (
          <Card key={i.title} className="border-2 hover:border-primary/50">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-2">
                <i.icon className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-base">{i.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-sm text-muted-foreground">{i.desc}</CardContent>
          </Card>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button size="lg" onClick={loadSample} className="gap-2">
          <Activity className="w-5 h-5" />Load Sample Data
        </Button>
        <Button size="lg" variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
          <Upload className="w-5 h-5" />Upload Process Data
        </Button>
        <input ref={fileRef} type="file" accept=".csv,.xlsx" onChange={uploadFile} className="hidden" />
      </div>
    </div>
  );

  // Step 2: Config
  if (step === 2) return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <ProgressBar currentStep={step} hasResults={!!results} onStepClick={setStep} />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />Configure Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Process/Stage Column *</Label>
              <Select value={processCol} onValueChange={setProcessCol}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cycle Time Column *</Label>
              <Select value={cycleTimeCol} onValueChange={setCycleTimeCol}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{numCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          
          <Separator />
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Throughput Column</Label>
              <Select value={throughputCol || "__none__"} onValueChange={v => setThroughputCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">-- None --</SelectItem>{numCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Queue/WIP Column</Label>
              <Select value={queueCol || "__none__"} onValueChange={v => setQueueCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">-- None --</SelectItem>{numCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Capacity Column</Label>
              <Select value={capacityCol || "__none__"} onValueChange={v => setCapacityCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="For utilization" /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">-- None --</SelectItem>{numCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Timestamp Column</Label>
              <Select value={timestampCol || "__none__"} onValueChange={v => setTimestampCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="For trend analysis" /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">-- None --</SelectItem>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target Cycle Time</Label>
              <Input 
                type="number" 
                placeholder="Optional target" 
                value={targetCycleTime}
                onChange={e => setTargetCycleTime(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <Button onClick={() => setStep(3)} className="gap-2">Continue<ArrowRight className="w-4 h-4" /></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Step 3: Validation
  if (step === 3) {
    const checks = [
      { name: "Data Loaded", passed: data.length >= 5, msg: `${data.length} records` },
      { name: "Process Column", passed: !!processCol, msg: processCol || "Required" },
      { name: "Cycle Time Column", passed: !!cycleTimeCol, msg: cycleTimeCol || "Required" },
    ];
    
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <ProgressBar currentStep={step} hasResults={!!results} onStepClick={setStep} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" />Validation</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {checks.map((c, i) => (
              <div key={i} className={`flex items-center justify-between p-4 rounded-lg ${c.passed ? "bg-primary/5" : "bg-rose-50"}`}>
                <div className="flex items-center gap-3">
                  {c.passed ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-rose-500" />}
                  <div><p className="font-medium">{c.name}</p><p className="text-sm text-muted-foreground">{c.msg}</p></div>
                </div>
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

  // Step 4: Summary
  if (step === 4 && results) {
    const { summary: s } = results;
    
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <ProgressBar currentStep={step} hasResults={!!results} onStepClick={setStep} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-primary" />Bottleneck Analysis Results</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gradient-to-r from-rose-500 to-orange-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm">Primary Bottleneck</p>
                  <p className="text-3xl font-bold">{s.primary_bottleneck}</p>
                  <Badge className="mt-2 bg-white/20">Cycle Time: {s.bottleneck_cycle_time.toFixed(1)} units</Badge>
                </div>
                <div className="text-right">
                  <p className="text-white/80 text-sm">Total Cycle Time</p>
                  <p className="text-3xl font-bold">{s.total_cycle_time.toFixed(1)}</p>
                  <p className="text-white/80 text-sm">{s.process_count} processes</p>
                </div>
              </div>
            </div>
            
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { l: "Avg Cycle Time", v: s.avg_cycle_time.toFixed(1) },
                { l: "Processes", v: s.process_count.toString() },
                { l: "Constraints", v: s.constraint_count.toString() },
                { l: "Critical", v: s.critical_constraints.toString() },
              ].map(i => (
                <div key={i.l} className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-muted-foreground">{i.l}</p>
                  <p className="text-xl font-bold">{i.v}</p>
                </div>
              ))}
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold">Key Insights</h4>
              {results.key_insights.map((ins, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${ins.status === "positive" ? "bg-green-50" : ins.status === "warning" ? "bg-amber-50" : "bg-slate-50"}`}>
                  {ins.status === "positive" ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : ins.status === "warning" ? <AlertTriangle className="w-5 h-5 text-amber-600" /> : <Info className="w-5 h-5 text-blue-600" />}
                  <div><p className="font-medium">{ins.title}</p><p className="text-sm text-muted-foreground">{ins.description}</p></div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end pt-4">
              <Button onClick={() => setStep(5)} className="gap-2">Understand<ArrowRight className="w-4 h-4" /></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 5: Why
  if (step === 5 && results) {
    const exps = [
      { n: 1, t: "Cycle Time Analysis", c: "Measures time each process takes. The process with highest average cycle time is the primary bottleneck." },
      { n: 2, t: "Theory of Constraints", c: "System throughput is limited by the slowest process. Improving non-bottlenecks won't improve overall throughput." },
      { n: 3, t: "Queue Buildup", c: "High WIP before a process indicates it can't keep up with upstream output - a classic bottleneck signal." },
      { n: 4, t: "Utilization", c: "Processes at >95% utilization are capacity-constrained. They need more resources to increase throughput." },
    ];
    
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <ProgressBar currentStep={step} hasResults={!!results} onStepClick={setStep} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><HelpCircle className="w-5 h-5 text-primary" />Understanding Bottlenecks</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              {exps.map(e => (
                <div key={e.n} className="bg-muted/30 rounded-xl p-5 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">{e.n}</div>
                  <div><p className="font-semibold">{e.t}</p><p className="text-sm text-muted-foreground mt-1">{e.c}</p></div>
                </div>
              ))}
            </div>
            
            <div className="bg-sky-50 rounded-xl p-5">
              <h4 className="font-semibold mb-3">Bottleneck Improvement Priority</h4>
              <div className="grid grid-cols-4 gap-4 text-center">
                {[
                  { r: "1st", l: "Exploit", c: "Maximize bottleneck output" },
                  { r: "2nd", l: "Subordinate", c: "Align other processes" },
                  { r: "3rd", l: "Elevate", c: "Add capacity if needed" },
                  { r: "4th", l: "Repeat", c: "Find new bottleneck" },
                ].map(g => (
                  <div key={g.r} className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="font-bold text-primary">{g.r}</p>
                    <p className="font-semibold text-sm">{g.l}</p>
                    <p className="text-xs text-muted-foreground">{g.c}</p>
                  </div>
                ))}
              </div>
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

  // Step 6: Report
  if (step === 6 && results) {
    const { results: r, summary: s, visualizations: v } = results;
    
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl space-y-6">
        <ProgressBar currentStep={step} hasResults={!!results} onStepClick={setStep} />
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Filter, l: "Bottleneck", v: s.primary_bottleneck },
            { icon: Timer, l: "Bottleneck Time", v: s.bottleneck_cycle_time.toFixed(1) },
            { icon: Clock, l: "Total Cycle", v: s.total_cycle_time.toFixed(1) },
            { icon: AlertTriangle, l: "Constraints", v: s.constraint_count.toString() },
          ].map(i => (
            <Card key={i.l}><CardContent className="pt-6 text-center"><i.icon className="w-8 h-8 mx-auto text-primary mb-2" /><p className="text-sm text-muted-foreground">{i.l}</p><p className="text-lg font-bold">{i.v}</p></CardContent></Card>
          ))}
        </div>
        
        <Card>
          <CardHeader><CardTitle>Visualizations</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="bottleneck">
              <TabsList className="flex flex-wrap">
                {v.bottleneck_chart && <TabsTrigger value="bottleneck">Bottleneck</TabsTrigger>}
                {v.cycle_time_chart && <TabsTrigger value="cycle_time">Cycle Times</TabsTrigger>}
                {v.utilization_chart && <TabsTrigger value="utilization">Utilization</TabsTrigger>}
                {v.constraint_chart && <TabsTrigger value="constraint">Constraints</TabsTrigger>}
              </TabsList>
              {Object.entries(v).map(([k, val]) => val && (
                <TabsContent key={k} value={k.replace('_chart', '')} className="mt-4">
                  <div className="relative">
                    <img src={`data:image/png;base64,${val}`} alt={k} className="w-full rounded-lg" />
                    <Button size="sm" variant="outline" className="absolute top-2 right-2" onClick={() => downloadPNG(k)}><Download className="w-4 h-4" /></Button>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader><CardTitle>Cycle Time by Process</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Process</TableHead>
                  <TableHead className="text-right">Avg Time</TableHead>
                  <TableHead className="text-right">Std Dev</TableHead>
                  <TableHead className="text-right">CV%</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.cycle_time_analysis.process_stats.map((p, i) => (
                  <TableRow key={p.process} className={p.process === s.primary_bottleneck ? "bg-rose-50" : ""}>
                    <TableCell className="font-medium">
                      {p.process}
                      {p.process === s.primary_bottleneck && <Badge className="ml-2 bg-rose-500">Bottleneck</Badge>}
                    </TableCell>
                    <TableCell className="text-right font-bold">{p.mean.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{p.std.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{p.cv.toFixed(1)}%</TableCell>
                    <TableCell>
                      <Badge variant={p.cv > 30 ? "destructive" : p.cv > 20 ? "secondary" : "default"}>
                        {p.cv > 30 ? "High Variation" : p.cv > 20 ? "Moderate" : "Stable"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        {r.constraints && r.constraints.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Identified Constraints</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Severity</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Process</TableHead>
                    <TableHead>Metric</TableHead>
                    <TableHead>Recommendation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.constraints.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Badge className={c.severity === 'critical' ? 'bg-rose-500' : c.severity === 'high' ? 'bg-amber-500' : 'bg-blue-500'}>
                          {c.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{c.type}</TableCell>
                      <TableCell>{c.process}</TableCell>
                      <TableCell>{c.value.toFixed(1)} {c.unit}</TableCell>
                      <TableCell className="text-sm">{c.recommendation}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        
        {r.utilization_analysis && (
          <Card>
            <CardHeader><CardTitle>Resource Utilization</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Process</TableHead>
                    <TableHead className="text-right">Utilization</TableHead>
                    <TableHead className="text-right">Spare Capacity</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.utilization_analysis.utilization_data.map((u: any) => (
                    <TableRow key={u.process}>
                      <TableCell className="font-medium">{u.process}</TableCell>
                      <TableCell className="text-right font-bold">{u.utilization.toFixed(0)}%</TableCell>
                      <TableCell className="text-right">{u.spare_capacity?.toFixed(0) || "—"}</TableCell>
                      <TableCell>
                        <Badge className={u.utilization >= 95 ? 'bg-rose-500' : u.utilization >= 80 ? 'bg-amber-500' : u.utilization >= 50 ? 'bg-green-500' : 'bg-slate-400'}>
                          {u.utilization >= 95 ? 'Critical' : u.utilization >= 80 ? 'High' : u.utilization >= 50 ? 'Normal' : 'Under-used'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        
        <Card>
          <CardHeader><CardTitle>Export</CardTitle></CardHeader>
          <CardContent className="flex gap-3">
            <Button variant="outline" className="gap-2" onClick={() => downloadPNG("bottleneck_chart")}><FileImage className="w-4 h-4" />PNG</Button>
            <Button variant="outline" disabled className="gap-2"><FileText className="w-4 h-4" />Excel (Soon)</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}