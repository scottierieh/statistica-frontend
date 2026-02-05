"use client";

import React, { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle, Shield, Info, HelpCircle,
  FileText, FileImage, Download, Settings, ChevronRight, Target, Zap, BarChart3, Grid3X3,
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

interface DataRow { [key: string]: string | number | null; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface RiskMatrixResult {
  success: boolean;
  results: {
    top_risks: Array<{ rank: number; name: string; probability: number; impact: number; risk_score: number; risk_level: string; }>;
    by_category?: { category_data: any[]; highest_risk_category: string; };
    recommendations: Array<{ priority: string; action: string; description: string; risks_affected: number; }>;
    risk_table: Array<{ [key: string]: any }>;
  };
  visualizations: { [key: string]: string };
  key_insights: KeyInsight[];
  summary: { total_risks: number; critical_count: number; high_count: number; medium_count: number; low_count: number; avg_risk_score: number; max_risk_score: number; };
}

const generateSampleData = (): DataRow[] => {
  const risks = [
    { name: "Data Breach", category: "Security", prob: 3, impact: 5 },
    { name: "System Downtime", category: "Operations", prob: 4, impact: 4 },
    { name: "Supply Chain Disruption", category: "Operations", prob: 3, impact: 4 },
    { name: "Regulatory Non-Compliance", category: "Legal", prob: 2, impact: 5 },
    { name: "Key Personnel Loss", category: "HR", prob: 3, impact: 3 },
    { name: "Market Share Loss", category: "Strategic", prob: 3, impact: 4 },
    { name: "Cyber Attack", category: "Security", prob: 4, impact: 5 },
    { name: "Natural Disaster", category: "Operations", prob: 1, impact: 5 },
    { name: "Budget Overrun", category: "Financial", prob: 4, impact: 3 },
    { name: "Technology Obsolescence", category: "Strategic", prob: 3, impact: 3 },
    { name: "Vendor Failure", category: "Operations", prob: 2, impact: 3 },
    { name: "Reputation Damage", category: "Strategic", prob: 2, impact: 4 },
    { name: "Employee Fraud", category: "Financial", prob: 2, impact: 3 },
    { name: "Product Defect", category: "Operations", prob: 3, impact: 4 },
    { name: "IP Theft", category: "Security", prob: 2, impact: 4 },
  ];
  
  return risks.map((r, i) => ({
    risk_id: i + 1,
    risk_name: r.name,
    category: r.category,
    probability: r.prob,
    impact: r.impact,
    owner: ["IT", "Operations", "Legal", "HR", "Finance"][Math.floor(Math.random() * 5)],
    status: ["Open", "In Progress", "Mitigated"][Math.floor(Math.random() * 3)]
  }));
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

const getRiskBadgeColor = (level: string) => {
  switch (level) {
    case 'Critical': return 'bg-red-500';
    case 'High': return 'bg-orange-500';
    case 'Medium': return 'bg-yellow-500';
    case 'Low': return 'bg-green-500';
    default: return 'bg-slate-500';
  }
};

export default function RiskMatrixPage() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<RiskMatrixResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [riskNameCol, setRiskNameCol] = useState("");
  const [probabilityCol, setProbabilityCol] = useState("");
  const [impactCol, setImpactCol] = useState("");
  const [categoryCol, setCategoryCol] = useState("");

  const numCols = columns.filter(c => { const v = data[0]?.[c]; return typeof v === "number" || !isNaN(Number(v)); });

  const loadSample = useCallback(() => {
    const d = generateSampleData();
    setData(d);
    setColumns(Object.keys(d[0]));
    setRiskNameCol("risk_name");
    setProbabilityCol("probability");
    setImpactCol("impact");
    setCategoryCol("category");
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
        risk_name_col: riskNameCol, 
        probability_col: probabilityCol,
        impact_col: impactCol
      };
      if (categoryCol) payload.category_col = categoryCol;
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/risk-matrix`, {
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
    const a = document.createElement("a"); a.href = `data:image/png;base64,${results.visualizations[k]}`; a.download = `risk_${k}.png`; a.click();
  };

  if (step === 1) return (
    <div className="container mx-auto py-8 px-4 max-w-6xl space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4"><Grid3X3 className="w-8 h-8 text-primary" /></div>
        <h1 className="text-3xl font-bold">Risk Matrix</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Assess and prioritize risks based on probability and impact. Create heat maps and mitigation plans.</p>
      </div>
      <div className="grid md:grid-cols-4 gap-4">
        {[
          { icon: Grid3X3, title: "Heat Map", desc: "Visual risk matrix" },
          { icon: AlertTriangle, title: "Risk Levels", desc: "Critical to Low" },
          { icon: Target, title: "Prioritization", desc: "Rank by score" },
          { icon: Zap, title: "Mitigation", desc: "Action recommendations" },
        ].map(i => (
          <Card key={i.title} className="border-2 hover:border-primary/50">
            <CardHeader className="text-center pb-2"><div className="mx-auto w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-2"><i.icon className="w-5 h-5 text-primary" /></div><CardTitle className="text-base">{i.title}</CardTitle></CardHeader>
            <CardContent className="text-center text-sm text-muted-foreground">{i.desc}</CardContent>
          </Card>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button size="lg" onClick={loadSample} className="gap-2"><Grid3X3 className="w-5 h-5" />Load Sample Data</Button>
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
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Risk Name Column *</Label>
              <Select value={riskNameCol} onValueChange={setRiskNameCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Probability Column * (1-5)</Label>
              <Select value={probabilityCol} onValueChange={setProbabilityCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Impact Column * (1-5)</Label>
              <Select value={impactCol} onValueChange={setImpactCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <Separator />
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Category Column</Label>
              <Select value={categoryCol || "__none__"} onValueChange={v => setCategoryCol(v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent><SelectItem value="__none__">-- None --</SelectItem>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div className="flex justify-end pt-4"><Button onClick={() => setStep(3)} className="gap-2">Continue<ArrowRight className="w-4 h-4" /></Button></div>
        </CardContent>
      </Card>
    </div>
  );

  if (step === 3) {
    const checks = [
      { name: "Data Loaded", passed: data.length >= 1, msg: `${data.length} risks` },
      { name: "Risk Name Column", passed: !!riskNameCol, msg: riskNameCol || "Required" },
      { name: "Probability Column", passed: !!probabilityCol, msg: probabilityCol || "Required" },
      { name: "Impact Column", passed: !!impactCol, msg: impactCol || "Required" },
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
    const criticalPct = s.total_risks > 0 ? (s.critical_count + s.high_count) / s.total_risks * 100 : 0;
    const statusColor = criticalPct > 30 ? 'from-rose-500 to-red-600' : criticalPct > 15 ? 'from-amber-500 to-orange-600' : 'from-green-500 to-emerald-600';
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <ProgressBar currentStep={step} hasResults={!!results} onStepClick={setStep} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Grid3X3 className="w-5 h-5 text-primary" />Risk Matrix Results</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className={`bg-gradient-to-r ${statusColor} rounded-xl p-6 text-white`}>
              <div className="flex items-center justify-between">
                <div><p className="text-white/80 text-sm">Risk Profile</p><p className="text-3xl font-bold">{s.total_risks} Risks</p><Badge className="mt-2 bg-white/20">{s.critical_count} Critical, {s.high_count} High</Badge></div>
                <div className="text-right"><p className="text-white/80 text-sm">Avg Risk Score</p><p className="text-3xl font-bold">{s.avg_risk_score.toFixed(1)}</p><p className="text-white/80 text-sm">out of 25</p></div>
              </div>
            </div>
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { l: "Critical", v: s.critical_count, c: "text-red-600" },
                { l: "High", v: s.high_count, c: "text-orange-600" },
                { l: "Medium", v: s.medium_count, c: "text-yellow-600" },
                { l: "Low", v: s.low_count, c: "text-green-600" },
              ].map(i => (<div key={i.l} className="bg-slate-50 rounded-xl p-4 text-center"><p className="text-sm text-muted-foreground">{i.l}</p><p className={`text-2xl font-bold ${i.c}`}>{i.v}</p></div>))}
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
      { n: 1, t: "Risk Score", c: "Probability × Impact. Scale 1-25. Higher = more critical." },
      { n: 2, t: "Risk Levels", c: "Critical (60%+), High (40-60%), Medium (20-40%), Low (<20%)." },
      { n: 3, t: "Prioritization", c: "Rank risks by score. Address Critical/High first." },
      { n: 4, t: "Mitigation", c: "Reduce probability (prevention) or impact (contingency)." },
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
            { icon: Grid3X3, l: "Total Risks", v: s.total_risks.toString() },
            { icon: AlertTriangle, l: "Critical+High", v: `${s.critical_count + s.high_count}` },
            { icon: Target, l: "Avg Score", v: s.avg_risk_score.toFixed(1) },
            { icon: BarChart3, l: "Max Score", v: s.max_risk_score.toString() },
          ].map(i => (<Card key={i.l}><CardContent className="pt-6 text-center"><i.icon className="w-8 h-8 mx-auto text-primary mb-2" /><p className="text-sm text-muted-foreground">{i.l}</p><p className="text-xl font-bold">{i.v}</p></CardContent></Card>))}
        </div>
        <Card>
          <CardHeader><CardTitle>Visualizations</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="risk_matrix">
              <TabsList>{v.risk_matrix && <TabsTrigger value="risk_matrix">Heat Map</TabsTrigger>}{v.risk_scatter && <TabsTrigger value="risk_scatter">Scatter</TabsTrigger>}{v.distribution && <TabsTrigger value="distribution">Distribution</TabsTrigger>}</TabsList>
              {Object.entries(v).map(([k, val]) => val && (
                <TabsContent key={k} value={k} className="mt-4">
                  <div className="relative"><img src={`data:image/png;base64,${val}`} alt={k} className="w-full rounded-lg" /><Button size="sm" variant="outline" className="absolute top-2 right-2" onClick={() => downloadPNG(k)}><Download className="w-4 h-4" /></Button></div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Top Risks</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Rank</TableHead><TableHead>Risk</TableHead><TableHead className="text-center">Prob</TableHead><TableHead className="text-center">Impact</TableHead><TableHead className="text-center">Score</TableHead><TableHead>Level</TableHead></TableRow></TableHeader>
              <TableBody>
                {r.top_risks.map((risk, i) => (
                  <TableRow key={i}><TableCell className="font-bold">{risk.rank}</TableCell><TableCell className="font-medium">{risk.name}</TableCell><TableCell className="text-center">{risk.probability}</TableCell><TableCell className="text-center">{risk.impact}</TableCell><TableCell className="text-center font-bold">{risk.risk_score}</TableCell><TableCell><Badge className={getRiskBadgeColor(risk.risk_level)}>{risk.risk_level}</Badge></TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        {r.recommendations && r.recommendations.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Recommendations</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Priority</TableHead><TableHead>Action</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Risks</TableHead></TableRow></TableHeader>
                <TableBody>
                  {r.recommendations.map((rec, i) => (
                    <TableRow key={i}><TableCell><Badge className={rec.priority === 'critical' ? 'bg-red-500' : rec.priority === 'high' ? 'bg-orange-500' : 'bg-blue-500'}>{rec.priority}</Badge></TableCell><TableCell className="font-medium">{rec.action}</TableCell><TableCell className="text-sm">{rec.description}</TableCell><TableCell className="text-right">{rec.risks_affected}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader><CardTitle>All Risks</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Risk</TableHead><TableHead className="text-center">Prob</TableHead><TableHead className="text-center">Impact</TableHead><TableHead className="text-center">Score</TableHead><TableHead>Level</TableHead><TableHead className="text-center">Rank</TableHead></TableRow></TableHeader>
              <TableBody>
                {r.risk_table.slice(0, 20).map((risk: any, i: number) => (
                  <TableRow key={i}><TableCell className="font-medium">{risk[riskNameCol]}</TableCell><TableCell className="text-center">{risk[probabilityCol]}</TableCell><TableCell className="text-center">{risk[impactCol]}</TableCell><TableCell className="text-center font-bold">{risk.risk_score}</TableCell><TableCell><Badge className={getRiskBadgeColor(risk.risk_level)}>{risk.risk_level}</Badge></TableCell><TableCell className="text-center">{risk.priority_rank}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
            {r.risk_table.length > 20 && <p className="text-sm text-muted-foreground mt-2">Showing 20 of {r.risk_table.length}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Export</CardTitle></CardHeader>
          <CardContent className="flex gap-3">
            <Button variant="outline" className="gap-2" onClick={() => downloadPNG("risk_matrix")}><FileImage className="w-4 h-4" />PNG</Button>
            <Button variant="outline" disabled className="gap-2"><FileText className="w-4 h-4" />Excel (Soon)</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}