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
  GraduationCap, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle, Shield, Info, HelpCircle,
  FileText, FileImage, Download, TrendingUp, Settings, Activity, AlertTriangle, ChevronRight,
  Target, BarChart3, Users, DollarSign, Award, BookOpen, Star, Percent,
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

interface DataRow { [key: string]: string | number | null; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface TrainingROIResult {
  success: boolean;
  results: {
    learning_effectiveness?: {
      participants: number; pre_score_mean: number; post_score_mean: number;
      avg_improvement: number; avg_improvement_pct: number; improved_pct: number;
      t_statistic: number; p_value: number; is_significant: boolean;
      cohens_d: number; effect_size: string;
    };
    performance_impact?: {
      participants: number; pre_performance_mean: number; post_performance_mean: number;
      avg_improvement: number; improved_pct: number; is_significant: boolean;
    };
    roi_metrics?: {
      total_cost: number; avg_cost_per_person: number; participant_count: number;
      total_benefit: number | null; roi_pct: number | null; benefit_cost_ratio: number | null;
    };
    by_training_type?: Array<{ training_type: string; participant_count: number; avg_improvement: number; total_cost: number; }>;
    by_department?: Array<{ department: string; participant_count: number; avg_improvement: number; }>;
    satisfaction?: {
      mean_score: number; scale: number; normalized_score: number;
      satisfied_pct: number; satisfied_count: number; neutral_count: number; dissatisfied_count: number;
    };
    completion?: { total_enrolled: number; completed_count: number; completion_rate: number; dropout_rate: number; };
  };
  visualizations: { [key: string]: string };
  key_insights: KeyInsight[];
  summary: {
    total_participants: number; avg_improvement: number | null; improvement_pct: number | null;
    roi_pct: number | null; satisfaction_score: number | null; completion_rate: number | null;
  };
}

const generateSampleData = (): DataRow[] => {
  const trainingTypes = ["Technical Skills", "Leadership", "Communication", "Compliance", "Product Training"];
  const departments = ["Engineering", "Sales", "Marketing", "HR", "Finance", "Operations"];
  const statuses = ["Completed", "Completed", "Completed", "Completed", "In Progress", "Dropped"];
  
  const data: DataRow[] = [];
  
  for (let i = 0; i < 200; i++) {
    const type = trainingTypes[Math.floor(Math.random() * trainingTypes.length)];
    const dept = departments[Math.floor(Math.random() * departments.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    const preScore = 50 + Math.floor(Math.random() * 30);
    const improvement = type === "Technical Skills" ? 15 + Math.random() * 10 :
                       type === "Leadership" ? 12 + Math.random() * 8 :
                       type === "Compliance" ? 20 + Math.random() * 5 :
                       8 + Math.random() * 12;
    const postScore = Math.min(100, preScore + improvement + (Math.random() - 0.5) * 10);
    
    const prePerf = 2.5 + Math.random() * 1.5;
    const postPerf = status === "Completed" ? Math.min(5, prePerf + 0.3 + Math.random() * 0.5) : prePerf;
    
    const cost = type === "Leadership" ? 1500 + Math.random() * 500 :
                 type === "Technical Skills" ? 800 + Math.random() * 400 :
                 300 + Math.random() * 300;
    
    const hours = type === "Leadership" ? 16 + Math.random() * 8 :
                  type === "Technical Skills" ? 20 + Math.random() * 20 :
                  4 + Math.random() * 8;
    
    const satisfaction = status === "Completed" ? 3 + Math.random() * 2 : 2 + Math.random() * 2;
    
    data.push({
      employee_id: `EMP${(i + 1).toString().padStart(4, '0')}`,
      training_name: `${type} - Session ${Math.floor(i / 20) + 1}`,
      training_type: type,
      department: dept,
      pre_score: Math.round(preScore),
      post_score: Math.round(postScore),
      pre_performance: parseFloat(prePerf.toFixed(2)),
      post_performance: parseFloat(postPerf.toFixed(2)),
      training_cost: Math.round(cost),
      training_hours: Math.round(hours),
      satisfaction_rating: parseFloat(satisfaction.toFixed(1)),
      completion_status: status
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

export default function TrainingROIPage() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<TrainingROIResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [employeeIdCol, setEmployeeIdCol] = useState("");
  const [trainingTypeCol, setTrainingTypeCol] = useState("");
  const [preScoreCol, setPreScoreCol] = useState("");
  const [postScoreCol, setPostScoreCol] = useState("");
  const [prePerfCol, setPrePerfCol] = useState("");
  const [postPerfCol, setPostPerfCol] = useState("");
  const [costCol, setCostCol] = useState("");
  const [satisfactionCol, setSatisfactionCol] = useState("");
  const [completionCol, setCompletionCol] = useState("");
  const [departmentCol, setDepartmentCol] = useState("");

  const loadSample = useCallback(() => {
    const d = generateSampleData();
    setData(d);
    setColumns(Object.keys(d[0]));
    setEmployeeIdCol("employee_id");
    setTrainingTypeCol("training_type");
    setPreScoreCol("pre_score");
    setPostScoreCol("post_score");
    setPrePerfCol("pre_performance");
    setPostPerfCol("post_performance");
    setCostCol("training_cost");
    setSatisfactionCol("satisfaction_rating");
    setCompletionCol("completion_status");
    setDepartmentCol("department");
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

  const numCols = columns.filter(c => { const v = data[0]?.[c]; return typeof v === "number" || !isNaN(Number(v)); });

  const runAnalysis = async () => {
    try {
      setLoading(true); setError(null);
      const payload: any = { data };
      if (employeeIdCol) payload.employee_id_col = employeeIdCol;
      if (trainingTypeCol) payload.training_type_col = trainingTypeCol;
      if (preScoreCol) payload.pre_score_col = preScoreCol;
      if (postScoreCol) payload.post_score_col = postScoreCol;
      if (prePerfCol) payload.pre_performance_col = prePerfCol;
      if (postPerfCol) payload.post_performance_col = postPerfCol;
      if (costCol) payload.training_cost_col = costCol;
      if (satisfactionCol) payload.satisfaction_col = satisfactionCol;
      if (completionCol) payload.completion_status_col = completionCol;
      if (departmentCol) payload.department_col = departmentCol;
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/training-roi`, {
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
    a.download = `training_roi_${k}.png`;
    a.click();
  };

  // Step 1: Intro
  if (step === 1) return (
    <div className="container mx-auto py-8 px-4 max-w-6xl space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
          <GraduationCap className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Training ROI Analysis</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Measure training effectiveness, calculate return on investment, and optimize your L&D programs.
        </p>
      </div>
      <div className="grid md:grid-cols-4 gap-4">
        {[
          { icon: TrendingUp, title: "Learning Gain", desc: "Pre vs Post assessment" },
          { icon: DollarSign, title: "ROI Calculation", desc: "Cost-benefit analysis" },
          { icon: Star, title: "Satisfaction", desc: "Participant feedback" },
          { icon: Target, title: "Performance", desc: "Job impact measurement" },
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
          <Upload className="w-5 h-5" />Upload Training Data
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
              <Label>Pre-Training Score *</Label>
              <Select value={preScoreCol || "__none__"} onValueChange={v => setPreScoreCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{numCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Post-Training Score *</Label>
              <Select value={postScoreCol || "__none__"} onValueChange={v => setPostScoreCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{numCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Training Cost</Label>
              <Select value={costCol || "__none__"} onValueChange={v => setCostCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="For ROI" /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">-- None --</SelectItem>{numCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          
          <Separator />
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Training Type</Label>
              <Select value={trainingTypeCol || "__none__"} onValueChange={v => setTrainingTypeCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">-- None --</SelectItem>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={departmentCol || "__none__"} onValueChange={v => setDepartmentCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">-- None --</SelectItem>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Satisfaction Rating</Label>
              <Select value={satisfactionCol || "__none__"} onValueChange={v => setSatisfactionCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">-- None --</SelectItem>{numCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Pre-Performance</Label>
              <Select value={prePerfCol || "__none__"} onValueChange={v => setPrePerfCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">-- None --</SelectItem>{numCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Post-Performance</Label>
              <Select value={postPerfCol || "__none__"} onValueChange={v => setPostPerfCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">-- None --</SelectItem>{numCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Completion Status</Label>
              <Select value={completionCol || "__none__"} onValueChange={v => setCompletionCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
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
      { name: "Data Loaded", passed: data.length >= 5, msg: `${data.length} records` },
      { name: "Pre-Training Score", passed: !!preScoreCol, msg: preScoreCol || "Required" },
      { name: "Post-Training Score", passed: !!postScoreCol, msg: postScoreCol || "Required" },
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
    const imp = s.avg_improvement;
    const grad = imp && imp >= 15 ? "from-green-500 to-emerald-600" : imp && imp >= 10 ? "from-blue-500 to-indigo-600" : "from-amber-500 to-orange-600";
    
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <ProgressBar currentStep={step} hasResults={!!results} onStepClick={setStep} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-primary" />Training ROI Results</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className={`bg-gradient-to-r ${grad} rounded-xl p-6 text-white`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm">Average Score Improvement</p>
                  <p className="text-4xl font-bold">+{imp?.toFixed(1) || "N/A"} pts</p>
                  {s.improvement_pct && <Badge className="mt-2 bg-white/20">+{s.improvement_pct.toFixed(1)}%</Badge>}
                </div>
                <div className="text-right">
                  {s.roi_pct !== null && (
                    <>
                      <p className="text-white/80 text-sm">Training ROI</p>
                      <p className="text-3xl font-bold">{s.roi_pct.toFixed(0)}%</p>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { l: "Participants", v: s.total_participants.toLocaleString() },
                { l: "Completion", v: s.completion_rate ? `${s.completion_rate.toFixed(0)}%` : "N/A" },
                { l: "Satisfaction", v: s.satisfaction_score ? `${s.satisfaction_score.toFixed(0)}%` : "N/A" },
                { l: "ROI", v: s.roi_pct !== null ? `${s.roi_pct.toFixed(0)}%` : "N/A" },
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
    const le = r.learning_effectiveness;
    const exps = [
      { n: 1, t: "Learning Effectiveness", c: le ? `Pre: ${le.pre_score_mean.toFixed(1)} → Post: ${le.post_score_mean.toFixed(1)}. ${le.improved_pct.toFixed(0)}% improved.` : "Not available" },
      { n: 2, t: "Statistical Significance", c: le ? `Paired t-test p=${le.p_value.toFixed(4)}. ${le.is_significant ? "Significant improvement!" : "Not statistically significant."}` : "Not available" },
      { n: 3, t: "Effect Size", c: le ? `Cohen's d = ${le.cohens_d.toFixed(2)} (${le.effect_size}). Measures practical significance.` : "Not available" },
      { n: 4, t: "ROI Formula", c: `ROI = (Benefits - Costs) / Costs × 100%. Benefits estimated from performance improvement.` },
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
              <h4 className="font-semibold mb-3">Effect Size Interpretation</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { r: "<0.5", l: "Small", c: "bg-amber-100 text-amber-700" },
                  { r: "0.5-0.8", l: "Medium", c: "bg-blue-100 text-blue-700" },
                  { r: ">0.8", l: "Large", c: "bg-green-100 text-green-700" },
                ].map(g => (
                  <div key={g.r} className={`rounded-lg p-3 ${g.c}`}><p className="font-bold">d {g.r}</p><p className="text-xs">{g.l} Effect</p></div>
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
            { icon: Users, l: "Participants", v: s.total_participants.toLocaleString() },
            { icon: TrendingUp, l: "Improvement", v: s.avg_improvement ? `+${s.avg_improvement.toFixed(1)}` : "N/A" },
            { icon: Star, l: "Satisfaction", v: s.satisfaction_score ? `${s.satisfaction_score.toFixed(0)}%` : "N/A" },
            { icon: DollarSign, l: "ROI", v: s.roi_pct !== null ? `${s.roi_pct.toFixed(0)}%` : "N/A" },
          ].map(i => (
            <Card key={i.l}><CardContent className="pt-6 text-center"><i.icon className="w-8 h-8 mx-auto text-primary mb-2" /><p className="text-sm text-muted-foreground">{i.l}</p><p className="text-xl font-bold">{i.v}</p></CardContent></Card>
          ))}
        </div>
        
        <Card>
          <CardHeader><CardTitle>Visualizations</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="learning">
              <TabsList className="flex flex-wrap">
                {v.learning_chart && <TabsTrigger value="learning">Learning</TabsTrigger>}
                {v.roi_chart && <TabsTrigger value="roi">ROI</TabsTrigger>}
                {v.satisfaction_chart && <TabsTrigger value="satisfaction">Satisfaction</TabsTrigger>}
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
        
        {r.learning_effectiveness && (
          <Card>
            <CardHeader><CardTitle>Learning Effectiveness</CardTitle></CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <Table>
                  <TableBody>
                    {[
                      { l: "Pre-Training Score", v: r.learning_effectiveness.pre_score_mean.toFixed(1) },
                      { l: "Post-Training Score", v: r.learning_effectiveness.post_score_mean.toFixed(1) },
                      { l: "Average Improvement", v: `+${r.learning_effectiveness.avg_improvement.toFixed(1)} (${r.learning_effectiveness.avg_improvement_pct.toFixed(1)}%)` },
                      { l: "% Improved", v: `${r.learning_effectiveness.improved_pct.toFixed(0)}%` },
                    ].map(row => (
                      <TableRow key={row.l}><TableCell>{row.l}</TableCell><TableCell className="text-right font-medium">{row.v}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Table>
                  <TableBody>
                    {[
                      { l: "Statistical Test", v: `t = ${r.learning_effectiveness.t_statistic.toFixed(2)}` },
                      { l: "P-Value", v: r.learning_effectiveness.p_value.toFixed(4) },
                      { l: "Significant?", v: r.learning_effectiveness.is_significant ? "Yes ✓" : "No" },
                      { l: "Effect Size", v: `${r.learning_effectiveness.effect_size} (d=${r.learning_effectiveness.cohens_d.toFixed(2)})` },
                    ].map(row => (
                      <TableRow key={row.l}><TableCell>{row.l}</TableCell><TableCell className="text-right font-medium">{row.v}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
        
        {r.roi_metrics && (
          <Card>
            <CardHeader><CardTitle>ROI Metrics</CardTitle></CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-rose-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">Total Cost</p>
                  <p className="text-2xl font-bold text-rose-700">${r.roi_metrics.total_cost.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">${r.roi_metrics.avg_cost_per_person.toLocaleString()}/person</p>
                </div>
                {r.roi_metrics.total_benefit !== null && (
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground">Total Benefit</p>
                    <p className="text-2xl font-bold text-green-700">${r.roi_metrics.total_benefit.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Estimated value</p>
                  </div>
                )}
                {r.roi_metrics.roi_pct !== null && (
                  <div className={`rounded-lg p-4 text-center ${r.roi_metrics.roi_pct >= 0 ? "bg-blue-50" : "bg-amber-50"}`}>
                    <p className="text-sm text-muted-foreground">ROI</p>
                    <p className={`text-2xl font-bold ${r.roi_metrics.roi_pct >= 0 ? "text-blue-700" : "text-amber-700"}`}>{r.roi_metrics.roi_pct.toFixed(0)}%</p>
                    <p className="text-xs text-muted-foreground">{r.roi_metrics.benefit_cost_ratio?.toFixed(1)}x benefit-cost</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        
        {r.by_training_type && r.by_training_type.length > 0 && (
          <Card>
            <CardHeader><CardTitle>By Training Type</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Training Type</TableHead>
                    <TableHead className="text-right">Participants</TableHead>
                    <TableHead className="text-right">Improvement</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.by_training_type.map(t => (
                    <TableRow key={t.training_type}>
                      <TableCell className="font-medium">{t.training_type}</TableCell>
                      <TableCell className="text-right">{t.participant_count}</TableCell>
                      <TableCell className="text-right">
                        {t.avg_improvement !== undefined ? (
                          <Badge className={t.avg_improvement >= 15 ? "bg-green-500" : t.avg_improvement >= 10 ? "bg-blue-500" : "bg-amber-500"}>
                            +{t.avg_improvement.toFixed(1)}
                          </Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right">{t.total_cost ? `$${t.total_cost.toLocaleString()}` : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        
        {r.completion && (
          <Card>
            <CardHeader><CardTitle>Completion Rate</CardTitle></CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className={`rounded-lg p-4 text-center ${r.completion.completion_rate >= 80 ? "bg-green-50" : "bg-amber-50"}`}>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                  <p className={`text-3xl font-bold ${r.completion.completion_rate >= 80 ? "text-green-700" : "text-amber-700"}`}>
                    {r.completion.completion_rate.toFixed(0)}%
                  </p>
                  <p className="text-sm text-muted-foreground">{r.completion.completed_count} of {r.completion.total_enrolled}</p>
                </div>
                <div className="bg-rose-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">Dropout Rate</p>
                  <p className="text-3xl font-bold text-rose-700">{r.completion.dropout_rate.toFixed(0)}%</p>
                  <p className="text-sm text-muted-foreground">{r.completion.total_enrolled - r.completion.completed_count} incomplete</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        <Card>
          <CardHeader><CardTitle>Export</CardTitle></CardHeader>
          <CardContent className="flex gap-3">
            <Button variant="outline" className="gap-2" onClick={() => downloadPNG("learning_chart")}><FileImage className="w-4 h-4" />PNG</Button>
            <Button variant="outline" disabled className="gap-2"><FileText className="w-4 h-4" />Excel (Soon)</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}