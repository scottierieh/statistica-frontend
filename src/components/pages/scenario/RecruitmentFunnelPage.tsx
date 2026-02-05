"use client";

import React, { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  UserPlus, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle, Shield, Info, HelpCircle,
  FileText, FileImage, Download, TrendingUp, Settings, Activity, AlertTriangle, ChevronRight,
  Target, BarChart3, Users, Clock, Filter, Briefcase, Building2, Calendar,
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

interface DataRow { [key: string]: string | number | null; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface RecruitmentResult {
  success: boolean;
  results: {
    funnel: {
      stages: Array<{ stage: string; count: number; conversion_rate: number; dropoff_rate: number; cumulative_rate: number; }>;
      total_applicants: number; total_hired: number; overall_conversion_rate: number;
      biggest_dropoff_stage: string; biggest_dropoff_rate: number;
    };
    source_analysis?: Array<{ source: string; total_candidates: number; hired: number; conversion_rate: number; pct_of_total: number; }>;
    position_analysis?: Array<{ position: string; total_candidates: number; hired: number; conversion_rate: number; }>;
    time_metrics?: {
      time_to_hire: { mean_days: number; median_days: number; min_days: number; max_days: number; } | null;
      volume_trend: Array<{ month: string; applications: number; }>;
    };
    status_analysis?: {
      status_breakdown: Array<{ status: string; count: number; pct: number; }>;
      hired_count: number; rejected_count: number; withdrawn_count: number;
      hired_pct: number; rejected_pct: number; withdrawn_pct: number;
    };
  };
  visualizations: { [key: string]: string };
  key_insights: KeyInsight[];
  summary: {
    total_candidates: number; total_hired: number; overall_conversion_rate: number;
    time_to_hire_avg: number | null; top_source: string | null; biggest_dropoff: string | null;
  };
}

const generateSampleData = (): DataRow[] => {
  const sources = ["LinkedIn", "Indeed", "Referral", "Company Website", "Recruiter", "Job Fair"];
  const positions = ["Software Engineer", "Data Analyst", "Product Manager", "Designer", "Sales Rep"];
  const stages = ["Applied", "Screening", "Phone Interview", "Technical Interview", "Onsite", "Offer", "Hired"];
  const statuses = ["In Progress", "Hired", "Rejected", "Withdrawn"];
  
  const data: DataRow[] = [];
  const baseDate = new Date("2024-01-01");
  
  for (let i = 0; i < 500; i++) {
    const source = sources[Math.floor(Math.random() * sources.length)];
    const position = positions[Math.floor(Math.random() * positions.length)];
    
    // Determine how far candidate progresses
    let maxStageIdx = 0;
    let cumProb = 1;
    const stageProbs = [0.7, 0.6, 0.5, 0.4, 0.7, 0.9]; // Conversion at each stage
    
    for (let s = 0; s < stages.length - 1; s++) {
      if (Math.random() < cumProb * stageProbs[s]) {
        maxStageIdx = s + 1;
        cumProb *= stageProbs[s];
      } else {
        break;
      }
    }
    
    const stage = stages[maxStageIdx];
    
    // Determine status
    let status: string;
    if (stage === "Hired") {
      status = "Hired";
    } else if (Math.random() < 0.1) {
      status = "Withdrawn";
    } else if (maxStageIdx < stages.length - 1) {
      status = Math.random() < 0.3 ? "In Progress" : "Rejected";
    } else {
      status = "In Progress";
    }
    
    // Dates
    const applyDate = new Date(baseDate);
    applyDate.setDate(applyDate.getDate() + Math.floor(Math.random() * 365));
    
    let hireDate: Date | null = null;
    if (status === "Hired") {
      hireDate = new Date(applyDate);
      hireDate.setDate(hireDate.getDate() + 20 + Math.floor(Math.random() * 40));
    }
    
    data.push({
      candidate_id: `CAN${(i + 1).toString().padStart(4, '0')}`,
      source,
      position,
      department: position === "Software Engineer" ? "Engineering" : position === "Sales Rep" ? "Sales" : "Operations",
      stage,
      status,
      apply_date: applyDate.toISOString().split('T')[0],
      hire_date: hireDate ? hireDate.toISOString().split('T')[0] : null
    });
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

export default function RecruitmentFunnelPage() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<RecruitmentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [candidateIdCol, setCandidateIdCol] = useState("");
  const [stageCol, setStageCol] = useState("");
  const [sourceCol, setSourceCol] = useState("");
  const [positionCol, setPositionCol] = useState("");
  const [statusCol, setStatusCol] = useState("");
  const [applyDateCol, setApplyDateCol] = useState("");
  const [hireDateCol, setHireDateCol] = useState("");

  const loadSample = useCallback(() => {
    const d = generateSampleData();
    setData(d);
    setColumns(Object.keys(d[0]));
    setCandidateIdCol("candidate_id");
    setStageCol("stage");
    setSourceCol("source");
    setPositionCol("position");
    setStatusCol("status");
    setApplyDateCol("apply_date");
    setHireDateCol("hire_date");
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
      const payload: any = { data };
      if (candidateIdCol) payload.candidate_id_col = candidateIdCol;
      if (stageCol) payload.stage_col = stageCol;
      if (sourceCol) payload.source_col = sourceCol;
      if (positionCol) payload.position_col = positionCol;
      if (statusCol) payload.status_col = statusCol;
      if (applyDateCol) payload.apply_date_col = applyDateCol;
      if (hireDateCol) payload.hire_date_col = hireDateCol;
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/recruitment-funnel`, {
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
    a.download = `recruitment_${k}.png`;
    a.click();
  };

  // Step 1: Intro
  if (step === 1) return (
    <div className="container mx-auto py-8 px-4 max-w-6xl space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
          <UserPlus className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Recruitment Funnel Analysis</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Analyze your hiring pipeline, identify bottlenecks, measure source effectiveness, and optimize time-to-hire.
        </p>
      </div>
      <div className="grid md:grid-cols-4 gap-4">
        {[
          { icon: Filter, title: "Funnel Analysis", desc: "Stage conversion rates" },
          { icon: Target, title: "Source ROI", desc: "Best recruiting channels" },
          { icon: Clock, title: "Time-to-Hire", desc: "Speed metrics" },
          { icon: BarChart3, title: "Drop-off Analysis", desc: "Where candidates leave" },
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
          <Upload className="w-5 h-5" />Upload Recruitment Data
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
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Stage Column *</Label>
              <Select value={stageCol || "__none__"} onValueChange={v => setStageCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status Column</Label>
              <Select value={statusCol || "__none__"} onValueChange={v => setStatusCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Hired/Rejected/etc" /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">-- None --</SelectItem>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Source Column</Label>
              <Select value={sourceCol || "__none__"} onValueChange={v => setSourceCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">-- None --</SelectItem>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          
          <Separator />
          
          <div className="grid md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Candidate ID</Label>
              <Select value={candidateIdCol || "__none__"} onValueChange={v => setCandidateIdCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">-- None --</SelectItem>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Position</Label>
              <Select value={positionCol || "__none__"} onValueChange={v => setPositionCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">-- None --</SelectItem>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Apply Date</Label>
              <Select value={applyDateCol || "__none__"} onValueChange={v => setApplyDateCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="For time metrics" /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">-- None --</SelectItem>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Hire Date</Label>
              <Select value={hireDateCol || "__none__"} onValueChange={v => setHireDateCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="For time-to-hire" /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">-- None --</SelectItem>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
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
      { name: "Data Loaded", passed: data.length >= 10, msg: `${data.length} records` },
      { name: "Stage Column", passed: !!stageCol, msg: stageCol || "Required for funnel" },
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
    const cr = s.overall_conversion_rate;
    const grad = cr >= 10 ? "from-green-500 to-emerald-600" : cr >= 5 ? "from-blue-500 to-indigo-600" : "from-amber-500 to-orange-600";
    
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <ProgressBar currentStep={step} hasResults={!!results} onStepClick={setStep} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-primary" />Recruitment Funnel Results</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className={`bg-gradient-to-r ${grad} rounded-xl p-6 text-white`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm">Overall Conversion Rate</p>
                  <p className="text-4xl font-bold">{cr.toFixed(1)}%</p>
                  <Badge className="mt-2 bg-white/20">{s.total_hired} hired from {s.total_candidates}</Badge>
                </div>
                <div className="text-right">
                  {s.time_to_hire_avg && (
                    <>
                      <p className="text-white/80 text-sm">Avg Time-to-Hire</p>
                      <p className="text-3xl font-bold">{s.time_to_hire_avg.toFixed(0)} days</p>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { l: "Candidates", v: s.total_candidates.toLocaleString() },
                { l: "Hired", v: s.total_hired.toLocaleString() },
                { l: "Top Source", v: s.top_source || "N/A" },
                { l: "Biggest Dropoff", v: s.biggest_dropoff || "N/A" },
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
    const { results: r } = results;
    const exps = [
      { n: 1, t: "Funnel Conversion", c: `Each stage shows % of candidates passing to next stage. Overall: ${r.funnel.overall_conversion_rate.toFixed(1)}% application-to-hire.` },
      { n: 2, t: "Drop-off Rate", c: `Identifies where candidates exit. Biggest loss at ${r.funnel.biggest_dropoff_stage || 'N/A'} (${r.funnel.biggest_dropoff_rate?.toFixed(1) || 0}%).` },
      { n: 3, t: "Source Effectiveness", c: `Compares hiring channels by volume and quality (hire rate).` },
      { n: 4, t: "Time-to-Hire", c: `Days from application to offer acceptance. Industry avg: 30-45 days.` },
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
            
            <div className="bg-sky-50 rounded-xl p-5">
              <h4 className="font-semibold mb-3">Benchmark Guidelines</h4>
              <div className="grid grid-cols-4 gap-4 text-center">
                {[
                  { r: "≥10%", l: "Excellent", c: "bg-green-100 text-green-700" },
                  { r: "5-10%", l: "Good", c: "bg-blue-100 text-blue-700" },
                  { r: "2-5%", l: "Average", c: "bg-amber-100 text-amber-700" },
                  { r: "<2%", l: "Low", c: "bg-rose-100 text-rose-700" },
                ].map(g => (
                  <div key={g.r} className={`rounded-lg p-3 ${g.c}`}><p className="font-bold">{g.r}</p><p className="text-xs">{g.l} Hire Rate</p></div>
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
            { icon: Users, l: "Candidates", v: s.total_candidates.toLocaleString() },
            { icon: UserPlus, l: "Hired", v: s.total_hired.toLocaleString() },
            { icon: Target, l: "Hire Rate", v: `${s.overall_conversion_rate.toFixed(1)}%` },
            { icon: Clock, l: "Time-to-Hire", v: s.time_to_hire_avg ? `${s.time_to_hire_avg.toFixed(0)}d` : "N/A" },
          ].map(i => (
            <Card key={i.l}><CardContent className="pt-6 text-center"><i.icon className="w-8 h-8 mx-auto text-primary mb-2" /><p className="text-sm text-muted-foreground">{i.l}</p><p className="text-xl font-bold">{i.v}</p></CardContent></Card>
          ))}
        </div>
        
        <Card>
          <CardHeader><CardTitle>Visualizations</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="funnel">
              <TabsList className="flex flex-wrap">
                <TabsTrigger value="funnel">Funnel</TabsTrigger>
                {v.source_chart && <TabsTrigger value="source">Sources</TabsTrigger>}
                {v.time_chart && <TabsTrigger value="time">Time Metrics</TabsTrigger>}
                {v.status_chart && <TabsTrigger value="status">Outcomes</TabsTrigger>}
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
          <CardHeader><CardTitle>Funnel Stages</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Candidates</TableHead>
                  <TableHead className="text-right">Conversion</TableHead>
                  <TableHead className="text-right">Drop-off</TableHead>
                  <TableHead className="text-right">Cumulative</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.funnel.stages.map((stage, i) => (
                  <TableRow key={stage.stage}>
                    <TableCell className="font-medium">{stage.stage}</TableCell>
                    <TableCell className="text-right">{stage.count.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Badge className={stage.conversion_rate >= 70 ? "bg-green-500" : stage.conversion_rate >= 50 ? "bg-blue-500" : "bg-amber-500"}>
                        {stage.conversion_rate.toFixed(0)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={stage.dropoff_rate > 40 ? "text-rose-600 font-bold" : ""}>{stage.dropoff_rate.toFixed(1)}%</span>
                    </TableCell>
                    <TableCell className="text-right">{stage.cumulative_rate.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        {r.source_analysis && (
          <Card>
            <CardHeader><CardTitle>Source Performance</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Candidates</TableHead>
                    <TableHead className="text-right">Hired</TableHead>
                    <TableHead className="text-right">Hire Rate</TableHead>
                    <TableHead className="text-right">% of Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.source_analysis.map(src => (
                    <TableRow key={src.source}>
                      <TableCell className="font-medium">{src.source}</TableCell>
                      <TableCell className="text-right">{src.total_candidates}</TableCell>
                      <TableCell className="text-right">{src.hired ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        {src.conversion_rate !== null ? (
                          <Badge className={src.conversion_rate >= 10 ? "bg-green-500" : src.conversion_rate >= 5 ? "bg-blue-500" : "bg-amber-500"}>
                            {src.conversion_rate.toFixed(1)}%
                          </Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right">{src.pct_of_total.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        
        {r.time_metrics?.time_to_hire && (
          <Card>
            <CardHeader><CardTitle>Time-to-Hire Metrics</CardTitle></CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                {[
                  { l: "Average", v: `${r.time_metrics.time_to_hire.mean_days.toFixed(0)} days`, c: "bg-blue-50 text-blue-700" },
                  { l: "Median", v: `${r.time_metrics.time_to_hire.median_days.toFixed(0)} days`, c: "bg-green-50 text-green-700" },
                  { l: "Fastest", v: `${r.time_metrics.time_to_hire.min_days.toFixed(0)} days`, c: "bg-emerald-50 text-emerald-700" },
                  { l: "Slowest", v: `${r.time_metrics.time_to_hire.max_days.toFixed(0)} days`, c: "bg-amber-50 text-amber-700" },
                ].map(m => (
                  <div key={m.l} className={`rounded-lg p-4 text-center ${m.c}`}>
                    <p className="text-sm">{m.l}</p>
                    <p className="text-2xl font-bold">{m.v}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {r.status_analysis && (
          <Card>
            <CardHeader><CardTitle>Candidate Outcomes</CardTitle></CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">Hired</p>
                  <p className="text-2xl font-bold text-green-700">{r.status_analysis.hired_count}</p>
                  <p className="text-sm text-green-600">{r.status_analysis.hired_pct.toFixed(1)}%</p>
                </div>
                <div className="bg-rose-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-bold text-rose-700">{r.status_analysis.rejected_count}</p>
                  <p className="text-sm text-rose-600">{r.status_analysis.rejected_pct.toFixed(1)}%</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">Withdrawn</p>
                  <p className="text-2xl font-bold text-amber-700">{r.status_analysis.withdrawn_count}</p>
                  <p className="text-sm text-amber-600">{r.status_analysis.withdrawn_pct.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        <Card>
          <CardHeader><CardTitle>Export</CardTitle></CardHeader>
          <CardContent className="flex gap-3">
            <Button variant="outline" className="gap-2" onClick={() => downloadPNG("funnel_chart")}><FileImage className="w-4 h-4" />PNG</Button>
            <Button variant="outline" disabled className="gap-2"><FileText className="w-4 h-4" />Excel (Soon)</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}