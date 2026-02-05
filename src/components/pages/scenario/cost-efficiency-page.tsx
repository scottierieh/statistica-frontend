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
  DollarSign, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle, Shield, Info, HelpCircle,
  FileText, FileImage, Download, Settings, ChevronRight, TrendingUp, TrendingDown, BarChart3, PieChart, Target,
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

interface DataRow { [key: string]: string | number | null; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface CostEfficiencyResult {
  success: boolean;
  results: {
    cost_breakdown: Array<{ category: string; total_cost: number; pct_of_total: number; avg_cost: number; }>;
    efficiency_by_category?: Array<{ category: string; efficiency: number; cost_per_output: number; }>;
    top_cost_drivers: Array<{ item: string; cost: number; pct: number; }>;
    optimization_opportunities: Array<{ category: string; potential_savings: number; recommendation: string; }>;
  };
  visualizations: { [key: string]: string };
  key_insights: KeyInsight[];
  summary: { 
    total_cost: number;
    avg_cost_per_unit: number;
    cost_variance: number;
    efficiency_score: number;
    potential_savings: number;
  };
}

const generateSampleData = (): DataRow[] => {
  const categories = ["Labor", "Materials", "Equipment", "Overhead", "Utilities", "Maintenance"];
  const departments = ["Production", "Assembly", "QC", "Packaging", "Shipping"];
  const data: DataRow[] = [];
  
  for (let i = 1; i <= 200; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const dept = departments[Math.floor(Math.random() * departments.length)];
    
    let baseCost = category === "Labor" ? 5000 + Math.random() * 3000 :
                   category === "Materials" ? 3000 + Math.random() * 4000 :
                   category === "Equipment" ? 2000 + Math.random() * 2000 :
                   category === "Overhead" ? 1000 + Math.random() * 1500 :
                   category === "Utilities" ? 500 + Math.random() * 1000 :
                   800 + Math.random() * 1200;
    
    const output = 100 + Math.floor(Math.random() * 150);
    const efficiency = 0.6 + Math.random() * 0.35;
    
    data.push({
      id: `COST-${i.toString().padStart(4, '0')}`,
      category: category,
      department: dept,
      cost: parseFloat(baseCost.toFixed(2)),
      output_units: output,
      efficiency_rate: parseFloat(efficiency.toFixed(3)),
      month: `2024-${(Math.floor(i / 20) % 12 + 1).toString().padStart(2, '0')}`
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

export default function CostEfficiencyPage() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<CostEfficiencyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [costCol, setCostCol] = useState("");
  const [categoryCol, setCategoryCol] = useState("");
  const [outputCol, setOutputCol] = useState("");
  const [efficiencyCol, setEfficiencyCol] = useState("");
  const [departmentCol, setDepartmentCol] = useState("");

  const numCols = columns.filter(c => { const v = data[0]?.[c]; return typeof v === "number" || !isNaN(Number(v)); });

  const loadSample = useCallback(() => {
    const d = generateSampleData();
    setData(d);
    setColumns(Object.keys(d[0]));
    setCostCol("cost");
    setCategoryCol("category");
    setOutputCol("output_units");
    setEfficiencyCol("efficiency_rate");
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

  const runAnalysis = async () => {
    try {
      setLoading(true); setError(null);
      const payload: any = { data, cost_col: costCol };
      if (categoryCol) payload.category_col = categoryCol;
      if (outputCol) payload.output_col = outputCol;
      if (efficiencyCol) payload.efficiency_col = efficiencyCol;
      if (departmentCol) payload.department_col = departmentCol;
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/cost-efficiency`, {
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
    const a = document.createElement("a"); a.href = `data:image/png;base64,${results.visualizations[k]}`; a.download = `cost_efficiency_${k}.png`; a.click();
  };

  if (step === 1) return (
    <div className="container mx-auto py-8 px-4 max-w-6xl space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4"><DollarSign className="w-8 h-8 text-primary" /></div>
        <h1 className="text-3xl font-bold">Cost & Efficiency Analysis</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Analyze cost structures, identify inefficiencies, and discover optimization opportunities.</p>
      </div>
      <div className="grid md:grid-cols-4 gap-4">
        {[
          { icon: PieChart, title: "Cost Breakdown", desc: "By category & dept" },
          { icon: BarChart3, title: "Efficiency Metrics", desc: "Cost per output" },
          { icon: TrendingDown, title: "Top Cost Drivers", desc: "Pareto analysis" },
          { icon: Target, title: "Optimization", desc: "Savings opportunities" },
        ].map(i => (
          <Card key={i.title} className="border-2 hover:border-primary/50">
            <CardHeader className="text-center pb-2"><div className="mx-auto w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center mb-2"><i.icon className="w-5 h-5 text-green-600" /></div><CardTitle className="text-base">{i.title}</CardTitle></CardHeader>
            <CardContent className="text-center text-sm text-muted-foreground">{i.desc}</CardContent>
          </Card>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button size="lg" onClick={loadSample} className="gap-2"><DollarSign className="w-5 h-5" />Load Sample Data</Button>
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
            <div className="space-y-2"><Label>Cost Column *</Label>
              <Select value={costCol} onValueChange={setCostCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Category Column</Label>
              <Select value={categoryCol || "__none__"} onValueChange={v => setCategoryCol(v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent><SelectItem value="__none__">-- None --</SelectItem>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <Separator />
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Output/Units Column</Label>
              <Select value={outputCol || "__none__"} onValueChange={v => setOutputCol(v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent><SelectItem value="__none__">-- None --</SelectItem>{numCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Efficiency Column</Label>
              <Select value={efficiencyCol || "__none__"} onValueChange={v => setEfficiencyCol(v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent><SelectItem value="__none__">-- None --</SelectItem>{numCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Department Column</Label>
              <Select value={departmentCol || "__none__"} onValueChange={v => setDepartmentCol(v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent><SelectItem value="__none__">-- None --</SelectItem>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div className="flex justify-end pt-4"><Button onClick={() => setStep(3)} className="gap-2">Continue<ArrowRight className="w-4 h-4" /></Button></div>
        </CardContent>
      </Card>
    </div>
  );

  if (step === 3) {
    const checks = [
      { name: "Data Loaded", passed: data.length >= 5, msg: `${data.length} records` },
      { name: "Cost Column", passed: !!costCol, msg: costCol || "Required" },
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
    const totalCost = s?.total_cost ?? 0;
    const avgCostPerUnit = s?.avg_cost_per_unit ?? 0;
    const efficiencyScore = s?.efficiency_score ?? 0;
    const potentialSavings = s?.potential_savings ?? 0;
    const costVariance = s?.cost_variance ?? 0;
    const effColor = efficiencyScore >= 80 ? 'from-green-500 to-emerald-600' : efficiencyScore >= 60 ? 'from-amber-500 to-orange-600' : 'from-red-500 to-rose-600';
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <ProgressBar currentStep={step} hasResults={!!results} onStepClick={setStep} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-primary" />Cost Efficiency Results</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className={`bg-gradient-to-r ${effColor} rounded-xl p-6 text-white`}>
              <div className="flex items-center justify-between">
                <div><p className="text-white/80 text-sm">Total Cost</p><p className="text-4xl font-bold">${totalCost.toLocaleString()}</p><Badge className="mt-2 bg-white/20">${avgCostPerUnit.toFixed(2)} per unit</Badge></div>
                <div className="text-right"><p className="text-white/80 text-sm">Efficiency Score</p><p className="text-3xl font-bold">{efficiencyScore.toFixed(0)}%</p><p className="text-white/80 text-sm">Potential Savings: ${potentialSavings.toLocaleString()}</p></div>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { l: "Total Cost", v: `$${totalCost.toLocaleString()}`, c: "text-blue-600" },
                { l: "Cost Variance", v: `${costVariance.toFixed(1)}%`, c: costVariance > 20 ? "text-red-600" : "text-green-600" },
                { l: "Potential Savings", v: `$${potentialSavings.toLocaleString()}`, c: "text-green-600" },
              ].map(i => (<div key={i.l} className="bg-slate-50 rounded-xl p-4 text-center"><p className="text-sm text-muted-foreground">{i.l}</p><p className={`text-2xl font-bold ${i.c}`}>{i.v}</p></div>))}
            </div>
            <div className="space-y-3"><h4 className="font-semibold">Key Insights</h4>
              {results.key_insights.map((ins, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${ins.status === "positive" ? "bg-green-50" : ins.status === "warning" ? "bg-amber-50" : "bg-slate-50"}`}>
                  {ins.status === "positive" ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : ins.status === "warning" ? <AlertCircle className="w-5 h-5 text-amber-600" /> : <Info className="w-5 h-5 text-blue-600" />}
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
      { n: 1, t: "Cost Breakdown", c: "Analyzes total costs by category to identify where money is being spent." },
      { n: 2, t: "Efficiency Metrics", c: "Calculates cost per output unit to measure operational efficiency." },
      { n: 3, t: "Pareto Analysis", c: "Identifies top cost drivers (80/20 rule) for targeted optimization." },
      { n: 4, t: "Optimization", c: "Recommends areas where costs can be reduced without impacting quality." },
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
    const totalCost = s?.total_cost ?? 0;
    const avgCostPerUnit = s?.avg_cost_per_unit ?? 0;
    const efficiencyScore = s?.efficiency_score ?? 0;
    const potentialSavings = s?.potential_savings ?? 0;
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl space-y-6">
        <ProgressBar currentStep={step} hasResults={!!results} onStepClick={setStep} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: DollarSign, l: "Total Cost", v: `$${(totalCost / 1000).toFixed(0)}K` },
            { icon: BarChart3, l: "Per Unit", v: `$${avgCostPerUnit.toFixed(2)}` },
            { icon: Target, l: "Efficiency", v: `${efficiencyScore.toFixed(0)}%` },
            { icon: TrendingDown, l: "Savings", v: `$${(potentialSavings / 1000).toFixed(0)}K` },
          ].map(i => (<Card key={i.l}><CardContent className="pt-6 text-center"><i.icon className="w-8 h-8 mx-auto text-primary mb-2" /><p className="text-sm text-muted-foreground">{i.l}</p><p className="text-xl font-bold">{i.v}</p></CardContent></Card>))}
        </div>
        <Card>
          <CardHeader><CardTitle>Visualizations</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="cost_breakdown">
              <TabsList>
                {v.cost_breakdown && <TabsTrigger value="cost_breakdown">Breakdown</TabsTrigger>}
                {v.efficiency_chart && <TabsTrigger value="efficiency_chart">Efficiency</TabsTrigger>}
                {v.pareto_chart && <TabsTrigger value="pareto_chart">Pareto</TabsTrigger>}
              </TabsList>
              {Object.entries(v).map(([k, val]) => val && (
                <TabsContent key={k} value={k} className="mt-4">
                  <div className="relative"><img src={`data:image/png;base64,${val}`} alt={k} className="w-full rounded-lg" /><Button size="sm" variant="outline" className="absolute top-2 right-2" onClick={() => downloadPNG(k)}><Download className="w-4 h-4" /></Button></div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
        {r.cost_breakdown && r.cost_breakdown.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Cost Breakdown by Category</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Category</TableHead><TableHead className="text-right">Total Cost</TableHead><TableHead className="text-right">% of Total</TableHead><TableHead className="text-right">Avg Cost</TableHead></TableRow></TableHeader>
                <TableBody>
                  {r.cost_breakdown.map((row, i) => (
                    <TableRow key={i}><TableCell className="font-medium">{row.category}</TableCell><TableCell className="text-right">${row.total_cost.toLocaleString()}</TableCell><TableCell className="text-right">{row.pct_of_total.toFixed(1)}%</TableCell><TableCell className="text-right">${row.avg_cost.toFixed(2)}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        {r.optimization_opportunities && r.optimization_opportunities.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Optimization Opportunities</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Category</TableHead><TableHead className="text-right">Potential Savings</TableHead><TableHead>Recommendation</TableHead></TableRow></TableHeader>
                <TableBody>
                  {r.optimization_opportunities.map((row, i) => (
                    <TableRow key={i}><TableCell className="font-medium">{row.category}</TableCell><TableCell className="text-right text-green-600 font-bold">${row.potential_savings.toLocaleString()}</TableCell><TableCell className="text-sm">{row.recommendation}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader><CardTitle>Export</CardTitle></CardHeader>
          <CardContent className="flex gap-3">
            <Button variant="outline" className="gap-2" onClick={() => downloadPNG("cost_breakdown")}><FileImage className="w-4 h-4" />PNG</Button>
            <Button variant="outline" disabled className="gap-2"><FileText className="w-4 h-4" />Excel (Soon)</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}