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
import { Checkbox } from "@/components/ui/checkbox";
import {
  DollarSign, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle, Shield,
  FileText, Download, Settings, ChevronRight, TrendingUp, Users,
  Lightbulb, Target, BarChart3, PieChart, Zap
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-995604437166.asia-northeast3.run.app";

interface DataRow { [key: string]: string | number | null; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }
interface ReportStep { title: string; question: string; finding: string; detail: string; }

interface ROIAnalysisResult {
  success: boolean;
  results: { overview: any; channel?: any; correlation?: any; blockers?: any; optimization?: any; };
  visualizations: { [key: string]: string };
  key_insights: KeyInsight[];
  report: { step1_overview: ReportStep; step2_channel: ReportStep; step3_correlation: ReportStep; step4_blockers: ReportStep; step5_optimization: ReportStep; };
  summary: { total_cost: number; total_performance: number; overall_roi: number; n_records: number; n_channels: number | null; best_channel: string | null; primary_blocker: string | null; };
}

const generateSampleData = (): DataRow[] => {
  const channels = ["Google Ads", "Facebook", "Instagram", "LinkedIn", "Email", "Organic"];
  const campaigns = ["Brand Awareness", "Lead Gen", "Conversion", "Retargeting"];
  const data: DataRow[] = [];
  
  const channelData: Record<string, { baseCost: number; roi: number; adRatio: number; laborBase: number }> = {
    "Google Ads": { baseCost: 5000, roi: 1.2, adRatio: 0.75, laborBase: 800 },
    "Facebook": { baseCost: 3000, roi: 1.1, adRatio: 0.80, laborBase: 500 },
    "Instagram": { baseCost: 2500, roi: 0.95, adRatio: 0.85, laborBase: 400 },
    "LinkedIn": { baseCost: 4000, roi: 0.85, adRatio: 0.70, laborBase: 900 },
    "Email": { baseCost: 1000, roi: 1.8, adRatio: 0.20, laborBase: 600 },
    "Organic": { baseCost: 500, roi: 2.5, adRatio: 0.10, laborBase: 1200 }
  };
  
  const campaignMultiplier: Record<string, { cost: number; perf: number }> = {
    "Brand Awareness": { cost: 1.2, perf: 0.8 },
    "Lead Gen": { cost: 1.0, perf: 1.1 },
    "Conversion": { cost: 0.9, perf: 1.3 },
    "Retargeting": { cost: 0.8, perf: 1.2 }
  };

  for (const channel of channels) {
    const ch = channelData[channel];
    for (const campaign of campaigns) {
      const cm = campaignMultiplier[campaign];
      const cost = Math.round(ch.baseCost * cm.cost);
      const performance = Math.round(cost * ch.roi * cm.perf);
      data.push({
        channel, campaign,
        cost,
        performance,
        impressions: Math.round(cost * 80),
        clicks: Math.round(cost * 1.2),
        ad_spend: Math.round(cost * ch.adRatio),
        labor_cost: Math.round(ch.laborBase * cm.cost)
      });
    }
  }
  return data;
};

const QuestionBanner: React.FC<{ question: string }> = ({ question }) => (
  <div className="text-center py-5 mb-6 border-b border-border">
    <p className="text-base text-muted-foreground italic">"{question}"</p>
  </div>
);

const MetricCard: React.FC<{ value: string | number; label: string; negative?: boolean; highlight?: boolean }> = ({ value, label, negative, highlight }) => (
  <div className={`text-center p-4 rounded-lg border ${negative ? 'border-destructive/30 bg-destructive/5' : highlight ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/20'}`}>
    <p className={`text-2xl font-semibold ${negative ? 'text-destructive' : highlight ? 'text-primary' : ''}`}>{value}</p>
    <p className="text-xs text-muted-foreground mt-1">{label}</p>
  </div>
);

const FindingBox: React.FC<{ finding: string }> = ({ finding }) => (
  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Key Finding</p>
    <p className="font-medium text-foreground">{finding}</p>
  </div>
);

const DetailParagraph: React.FC<{ detail?: string }> = ({ detail }) => detail ? (
  <div className="mt-6 p-4 rounded-lg border border-border bg-muted/10">
    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Analysis</p>
    <p className="text-sm text-muted-foreground leading-relaxed">{detail}</p>
  </div>
) : null;

const DataPreview: React.FC<{ data: DataRow[]; columns: string[] }> = ({ data, columns }) => {
  const [expanded, setExpanded] = useState(false);
  const downloadCSV = () => {
    const header = columns.join(',');
    const rows = data.map(row => columns.map(col => {
      const val = row[col];
      if (val === null || val === undefined) return '';
      if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
      return val;
    }).join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'roi_data.csv';
    a.click();
  };
  if (data.length === 0) return null;
  return (
    <div className="mb-6 border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-muted/20">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 hover:text-primary transition-colors">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Data Preview</span>
          <Badge variant="secondary" className="text-xs">{data.length} rows × {columns.length} cols</Badge>
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={downloadCSV}><Download className="w-3 h-3" />Download</Button>
      </div>
      {expanded && (
        <div className="max-h-64 overflow-auto">
          <Table>
            <TableHeader><TableRow>{columns.map(col => <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>)}</TableRow></TableHeader>
            <TableBody>
              {data.slice(0, 50).map((row, i) => (
                <TableRow key={i}>{columns.map(col => <TableCell key={col} className="text-xs py-1.5">{row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}</TableCell>)}</TableRow>
              ))}
            </TableBody>
          </Table>
          {data.length > 50 && <p className="text-xs text-muted-foreground text-center py-2 bg-muted/10">Showing 50 of {data.length} rows</p>}
        </div>
      )}
    </div>
  );
};

const ProgressBar: React.FC<{ currentStep: number; hasResults: boolean; onStepClick: (s: number) => void }> = ({ currentStep, hasResults, onStepClick }) => {
  const steps = [
    { n: 1, l: "Intro" }, { n: 2, l: "Config" }, { n: 3, l: "Validate" },
    { n: 4, l: "Overview" }, { n: 5, l: "Channel" }, { n: 6, l: "Correlate" },
    { n: 7, l: "Blockers" }, { n: 8, l: "Optimize" }, { n: 9, l: "Report" }
  ];
  return (
    <div className="flex items-center justify-center gap-0.5 mb-8 flex-wrap">
      {steps.map((s, i) => {
        const done = s.n < currentStep;
        const cur = s.n === currentStep;
        const ok = s.n <= 3 || hasResults;
        return (
          <React.Fragment key={s.n}>
            <button onClick={() => ok && onStepClick(s.n)} disabled={!ok}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all ${cur ? "bg-primary text-primary-foreground" : done ? "bg-primary/10 text-primary" : ok ? "bg-muted text-muted-foreground hover:bg-muted/80" : "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"}`}>
              {s.l}
            </button>
            {i < steps.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/30" />}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default function ROIAnalysisPage() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<ROIAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [costCol, setCostCol] = useState("");
  const [performanceCol, setPerformanceCol] = useState("");
  const [channelCol, setChannelCol] = useState("");
  const [additionalCostCols, setAdditionalCostCols] = useState<string[]>([]);

  const numCols = columns.filter(c => {
    if (!data || data.length === 0) return false;
    const v = data[0]?.[c];
    if (v === null || v === undefined || v === "") return false;
    if (typeof v === "number") return true;
    if (typeof v === "string") return v.trim() !== "" && !isNaN(Number(v.trim()));
    return false;
  });

  const loadSample = useCallback(() => {
    const d = generateSampleData();
    setData(d); setColumns(Object.keys(d[0]));
    setCostCol("cost"); setPerformanceCol("performance"); setChannelCol("channel");
    setAdditionalCostCols(["ad_spend", "labor_cost"]);
    setStep(2); setResults(null); setError(null);
  }, []);

  const uploadFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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

  const toggleAdditionalCost = (col: string) => setAdditionalCostCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);

  const runAnalysis = async () => {
    try {
      setLoading(true); setError(null);
      const payload: any = { data, cost_col: costCol, performance_col: performanceCol };
      if (channelCol) payload.channel_col = channelCol;
      if (additionalCostCols.length > 0) payload.additional_cost_cols = additionalCostCols;
      const res = await fetch(`${FASTAPI_URL}/api/analysis/roi-analysis`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
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
    a.download = `roi_${k}.png`; a.click();
  };

  // Step 1: Intro
  if (step === 1) return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <div className="text-center mb-10">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <DollarSign className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold mb-2">ROI Performance Analysis</h1>
        <p className="text-muted-foreground">5-step framework for cost efficiency and budget optimization</p>
      </div>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">1</div>
            <div><p className="font-medium">Cost & Performance</p><p className="text-xs text-muted-foreground">Overall Status</p></div>
          </div>
          <p className="text-sm text-muted-foreground italic mb-3">"What is our overall ROI status?"</p>
          <p className="text-sm text-muted-foreground mb-3">Total cost, performance, ROI distribution and tier breakdown.</p>
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">ROI</Badge>
            <Badge variant="secondary" className="text-xs">Distribution</Badge>
            <Badge variant="secondary" className="text-xs">Tiers</Badge>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">2</div>
            <div><p className="font-medium">Channel ROI</p><p className="text-xs text-muted-foreground">Segment Comparison</p></div>
          </div>
          <p className="text-sm text-muted-foreground italic mb-3">"Which channels deliver best ROI?"</p>
          <p className="text-sm text-muted-foreground mb-3">Compare ROI across channels with statistical testing.</p>
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">Ranking</Badge>
            <Badge variant="secondary" className="text-xs">ANOVA</Badge>
            <Badge variant="secondary" className="text-xs">Efficiency</Badge>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">3</div>
            <div><p className="font-medium">Cost Correlation</p><p className="text-xs text-muted-foreground">Input-Output Analysis</p></div>
          </div>
          <p className="text-sm text-muted-foreground italic mb-3">"How does spending relate to results?"</p>
          <p className="text-sm text-muted-foreground mb-3">Measure correlation between cost inputs and performance.</p>
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">Pearson</Badge>
            <Badge variant="secondary" className="text-xs">Spearman</Badge>
            <Badge variant="secondary" className="text-xs">Scatter</Badge>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">4</div>
            <div><p className="font-medium">Efficiency Blockers</p><p className="text-xs text-muted-foreground">Problem Identification</p></div>
          </div>
          <p className="text-sm text-muted-foreground italic mb-3">"What's hurting our cost efficiency?"</p>
          <p className="text-sm text-muted-foreground mb-3">Identify factors negatively impacting ROI through regression.</p>
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">Regression</Badge>
            <Badge variant="secondary" className="text-xs">Residuals</Badge>
            <Badge variant="secondary" className="text-xs">Outliers</Badge>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">5</div>
            <div><p className="font-medium">Budget Optimization</p><p className="text-xs text-muted-foreground">Scenario Planning</p></div>
          </div>
          <p className="text-sm text-muted-foreground italic mb-3">"How can we optimize budget allocation?"</p>
          <p className="text-sm text-muted-foreground mb-3">Simulate budget scenarios and find optimal allocation.</p>
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">Simulation</Badge>
            <Badge variant="secondary" className="text-xs">Scenarios</Badge>
            <Badge variant="secondary" className="text-xs">Recommend</Badge>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-primary/30 bg-primary/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">✓</div>
            <div><p className="font-medium">ROI Report</p><p className="text-xs text-muted-foreground">Executive Summary</p></div>
          </div>
          <p className="text-sm text-muted-foreground italic mb-3">"What are the key takeaways?"</p>
          <p className="text-sm text-muted-foreground mb-3">Consolidated findings with actionable recommendations.</p>
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">Insights</Badge>
            <Badge variant="secondary" className="text-xs">Charts</Badge>
            <Badge variant="secondary" className="text-xs">Export</Badge>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3 justify-center">
            <Button onClick={loadSample} className="gap-2"><DollarSign className="w-4 h-4" />Load Sample Data</Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2"><Upload className="w-4 h-4" />Upload CSV/Excel</Button>
            <input ref={fileRef} type="file" accept=".csv,.xlsx" onChange={uploadFile} className="hidden" />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Step 2: Config
  if (step === 2) return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <ProgressBar currentStep={step} hasResults={!!results} onStepClick={setStep} />
      <DataPreview data={data} columns={columns} />
      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Settings className="w-5 h-5 text-primary" />Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cost Column *</Label>
              <Select value={costCol} onValueChange={setCostCol}>
                <SelectTrigger><SelectValue placeholder="Select cost..." /></SelectTrigger>
                <SelectContent>{numCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Performance Column *</Label>
              <Select value={performanceCol} onValueChange={setPerformanceCol}>
                <SelectTrigger><SelectValue placeholder="Select performance..." /></SelectTrigger>
                <SelectContent>{numCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>Channel/Segment Column</Label>
            <Select value={channelCol || "__none__"} onValueChange={v => setChannelCol(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select channel..." /></SelectTrigger>
              <SelectContent><SelectItem value="__none__">-- None --</SelectItem>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>Additional Cost Columns</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {numCols.filter(c => c !== costCol && c !== performanceCol).map(col => (
                <div key={col} className="flex items-center space-x-2">
                  <Checkbox id={`ac-${col}`} checked={additionalCostCols.includes(col)} onCheckedChange={() => toggleAdditionalCost(col)} />
                  <label htmlFor={`ac-${col}`} className="text-sm cursor-pointer">{col}</label>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => setStep(3)} className="gap-2">Continue<ArrowRight className="w-4 h-4" /></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Step 3: Validation
  if (step === 3) {
    const getMissingInfo = () => {
      const missingCols: { col: string; count: number; pct: number }[] = [];
      const relevantCols = [costCol, performanceCol, channelCol, ...additionalCostCols].filter(Boolean);
      for (const col of relevantCols) {
        const missingCount = data.filter(row => {
          const val = row[col];
          return val === null || val === undefined || val === '' || (typeof val === 'number' && isNaN(val));
        }).length;
        if (missingCount > 0) missingCols.push({ col, count: missingCount, pct: (missingCount / data.length) * 100 });
      }
      return missingCols;
    };
    const missingInfo = getMissingInfo();
    const hasMissing = missingInfo.length > 0;
    const totalMissing = missingInfo.reduce((sum, m) => sum + m.count, 0);
    const checks = [
      { name: "Data", passed: data.length >= 3, msg: `${data.length} rows` },
      { name: "Cost Column", passed: !!costCol, msg: costCol || "Required" },
      { name: "Performance Column", passed: !!performanceCol, msg: performanceCol || "Required" },
      { name: "Missing Values", passed: !hasMissing, msg: hasMissing ? `${totalMissing} missing` : "No missing", warning: true },
    ];
    const canRun = checks.filter(c => !c.warning).every(c => c.passed);
    return (
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <ProgressBar currentStep={step} hasResults={!!results} onStepClick={setStep} />
        <DataPreview data={data} columns={columns} />
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Shield className="w-5 h-5 text-primary" />Validation</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {checks.map((c, i) => (
              <div key={i} className={`flex items-center justify-between p-3 rounded border ${c.passed ? 'border-border' : c.warning ? 'border-amber-500/30 bg-amber-500/5' : 'border-destructive/30 bg-destructive/5'}`}>
                <div className="flex items-center gap-2">
                  {c.passed ? <CheckCircle2 className="w-4 h-4 text-primary" /> : c.warning ? <AlertCircle className="w-4 h-4 text-amber-500" /> : <XCircle className="w-4 h-4 text-destructive" />}
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="text-xs text-muted-foreground">({c.msg})</span>
                </div>
                <Badge variant={c.passed ? "secondary" : "destructive"} className={`text-xs ${c.warning && !c.passed ? 'bg-amber-500/20 text-amber-700 hover:bg-amber-500/20' : ''}`}>{c.passed ? "OK" : c.warning ? "Warning" : "Required"}</Badge>
              </div>
            ))}
            {hasMissing && (
              <div className="p-3 rounded border border-amber-500/30 bg-amber-500/5 text-sm">
                <p className="font-medium text-amber-700 mb-2">Missing Values:</p>
                {missingInfo.map(m => <div key={m.col} className="flex justify-between text-muted-foreground"><span>{m.col}</span><span>{m.count} ({m.pct.toFixed(1)}%)</span></div>)}
              </div>
            )}
            {error && <div className="p-3 rounded border border-destructive/30 bg-destructive/5 text-sm text-destructive">{error}</div>}
            <div className="flex justify-between pt-3">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={runAnalysis} disabled={loading || !canRun} className="gap-2">
                {loading ? <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Analyzing...</> : <>Run Analysis<ArrowRight className="w-4 h-4" /></>}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 4: Overview
  if (step === 4 && results) {
    const o = results.results.overview;
    const r = results.report?.step1_overview;
    return (
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <ProgressBar currentStep={step} hasResults={!!results} onStepClick={setStep} />
        <DataPreview data={data} columns={columns} />
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><PieChart className="w-5 h-5 text-primary" />1. Cost & Performance Overview</CardTitle></CardHeader>
          <CardContent>
            <QuestionBanner question={r?.question || "What is our overall ROI status?"} />
            <FindingBox finding={r?.finding || ""} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <MetricCard value={`${o.overall_roi?.toFixed(1)}%`} label="Overall ROI" highlight={o.overall_roi >= 100} negative={o.overall_roi < 100} />
              <MetricCard value={o.total_cost?.toLocaleString()} label="Total Cost" />
              <MetricCard value={o.total_performance?.toLocaleString()} label="Total Performance" />
              <MetricCard value={o.n_records} label="Records" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <MetricCard value={`${o.avg_roi?.toFixed(1)}%`} label="Avg ROI" />
              <MetricCard value={`${o.median_roi?.toFixed(1)}%`} label="Median ROI" />
              <MetricCard value={`${o.min_roi?.toFixed(1)}%`} label="Min ROI" negative={o.min_roi < 50} />
              <MetricCard value={`${o.max_roi?.toFixed(1)}%`} label="Max ROI" highlight />
            </div>
            {results.visualizations.overview_chart && (
              <div className="relative border rounded-lg overflow-hidden mb-4">
                <img src={`data:image/png;base64,${results.visualizations.overview_chart}`} alt="Overview" className="w-full" />
                <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => downloadPNG("overview_chart")}><Download className="w-4 h-4" /></Button>
              </div>
            )}
            <DetailParagraph detail={r?.detail} />
            <div className="flex justify-end pt-4"><Button onClick={() => setStep(5)} className="gap-2">Next<ArrowRight className="w-4 h-4" /></Button></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 5: Channel ROI
  if (step === 5 && results) {
    const ch = results.results.channel;
    const r = results.report?.step2_channel;
    return (
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <ProgressBar currentStep={step} hasResults={!!results} onStepClick={setStep} />
        <DataPreview data={data} columns={columns} />
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5 text-primary" />2. ROI by Channel</CardTitle></CardHeader>
          <CardContent>
            <QuestionBanner question={r?.question || "Which channels deliver best ROI?"} />
            <FindingBox finding={r?.finding || ""} />
            {ch ? (
              <>
                <div className="grid md:grid-cols-2 gap-3 mb-4">
                  <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                    <p className="text-xs text-muted-foreground mb-1">Best Channel</p>
                    <p className="text-xl font-semibold text-primary">{ch.best_channel.channel}</p>
                    <p className="text-sm text-muted-foreground">ROI: {ch.best_channel.roi?.toFixed(1)}%</p>
                  </div>
                  <div className={`p-4 rounded-lg border ${ch.roi_gap > 50 ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-muted/20'}`}>
                    <p className="text-xs text-muted-foreground mb-1">Needs Improvement</p>
                    <p className={`text-xl font-semibold ${ch.roi_gap > 50 ? 'text-destructive' : ''}`}>{ch.worst_channel.channel}</p>
                    <p className="text-sm text-muted-foreground">ROI: {ch.worst_channel.roi?.toFixed(1)}%</p>
                  </div>
                </div>
                <div className="flex justify-between p-3 rounded border border-border bg-muted/20 mb-4">
                  <span className="text-sm text-muted-foreground">ROI Gap</span>
                  <span className="font-medium">{ch.roi_gap?.toFixed(1)}%</span>
                </div>
                {ch.statistical_test?.p_value !== null && (
                  <div className={`p-3 rounded border text-sm mb-4 ${ch.statistical_test.significant_difference ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
                    <span className="text-muted-foreground">Statistical: </span>
                    <span className="font-medium">{ch.statistical_test.significant_difference ? 'Significant' : 'Not Significant'} (p={ch.statistical_test.p_value?.toFixed(4)})</span>
                  </div>
                )}
                {results.visualizations.channel_chart && (
                  <div className="relative border rounded-lg overflow-hidden mb-4">
                    <img src={`data:image/png;base64,${results.visualizations.channel_chart}`} alt="Channel" className="w-full" />
                    <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => downloadPNG("channel_chart")}><Download className="w-4 h-4" /></Button>
                  </div>
                )}
                <Table>
                  <TableHeader><TableRow><TableHead>Rank</TableHead><TableHead>Channel</TableHead><TableHead className="text-right">ROI</TableHead><TableHead className="text-right">Cost Share</TableHead><TableHead className="text-right">Efficiency</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {ch.channel_data.map((c: any) => (
                      <TableRow key={c.channel}>
                        <TableCell className="text-muted-foreground">#{c.rank}</TableCell>
                        <TableCell className="font-medium">{c.channel}</TableCell>
                        <TableCell className={`text-right ${c.roi >= 100 ? 'text-primary' : c.roi < 50 ? 'text-destructive' : ''}`}>{c.roi?.toFixed(1)}%</TableCell>
                        <TableCell className="text-right">{c.cost_share?.toFixed(1)}%</TableCell>
                        <TableCell className="text-right">{c.efficiency?.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            ) : <p className="text-center py-8 text-muted-foreground">Channel column not configured.</p>}
            <DetailParagraph detail={r?.detail} />
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(4)}>Back</Button>
              <Button onClick={() => setStep(6)} className="gap-2">Next<ArrowRight className="w-4 h-4" /></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 6: Correlation
  if (step === 6 && results) {
    const cor = results.results.correlation;
    const r = results.report?.step3_correlation;
    return (
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <ProgressBar currentStep={step} hasResults={!!results} onStepClick={setStep} />
        <DataPreview data={data} columns={columns} />
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />3. Cost-Performance Correlation</CardTitle></CardHeader>
          <CardContent>
            <QuestionBanner question={r?.question || "How does spending relate to results?"} />
            <FindingBox finding={r?.finding || ""} />
            {cor?.correlations?.length > 0 ? (
              <>
                {cor.strongest_correlation && (
                  <div className="p-4 rounded-lg border border-border bg-muted/20 mb-4">
                    <p className="text-xs text-muted-foreground mb-1">Strongest Correlation</p>
                    <div className="flex justify-between items-center">
                      <p className="text-xl font-semibold text-primary">{cor.strongest_correlation.cost_variable}</p>
                      <div className="text-right">
                        <p className="font-mono text-lg">r = {cor.strongest_correlation.pearson_r?.toFixed(3)}</p>
                        <p className="text-xs text-muted-foreground">{cor.strongest_correlation.strength} {cor.strongest_correlation.direction}</p>
                      </div>
                    </div>
                  </div>
                )}
                {results.visualizations.correlation_chart && (
                  <div className="relative border rounded-lg overflow-hidden mb-4">
                    <img src={`data:image/png;base64,${results.visualizations.correlation_chart}`} alt="Correlation" className="w-full" />
                    <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => downloadPNG("correlation_chart")}><Download className="w-4 h-4" /></Button>
                  </div>
                )}
                <Table>
                  <TableHeader><TableRow><TableHead>Cost Variable</TableHead><TableHead className="text-right">Pearson r</TableHead><TableHead className="text-center">Strength</TableHead><TableHead className="text-center">Sig.</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {cor.correlations.map((c: any) => (
                      <TableRow key={c.cost_variable}>
                        <TableCell className="font-medium">{c.cost_variable}</TableCell>
                        <TableCell className={`text-right font-mono ${c.direction === 'positive' ? 'text-primary' : 'text-destructive'}`}>{c.pearson_r?.toFixed(3)}</TableCell>
                        <TableCell className="text-center text-muted-foreground text-sm">{c.strength}</TableCell>
                        <TableCell className="text-center">{c.significant ? <CheckCircle2 className="w-4 h-4 text-primary mx-auto" /> : <span className="text-muted-foreground">-</span>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            ) : <p className="text-center py-8 text-muted-foreground">No correlation data available.</p>}
            <DetailParagraph detail={r?.detail} />
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(5)}>Back</Button>
              <Button onClick={() => setStep(7)} className="gap-2">Next<ArrowRight className="w-4 h-4" /></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  // Step 7: Blockers
  if (step === 7 && results) {
    const b = results.results.blockers;
    const r = results.report?.step4_blockers;
    return (
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <ProgressBar currentStep={step} hasResults={!!results} onStepClick={setStep} />
        <DataPreview data={data} columns={columns} />
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Zap className="w-5 h-5 text-primary" />4. Efficiency Blockers</CardTitle></CardHeader>
          <CardContent>
            <QuestionBanner question={r?.question || "What's hurting our cost efficiency?"} />
            <FindingBox finding={r?.finding || ""} />
            {b && !b.error ? (
              <>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <MetricCard value={`${(b.r_squared * 100)?.toFixed(1)}%`} label="R² Score" />
                  <MetricCard value={b.n_blockers} label="Blockers Found" negative={b.n_blockers > 0} />
                  <MetricCard value={b.inefficient_count} label="Inefficient Items" negative={b.inefficient_count > 0} />
                </div>
                {b.blockers?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">Identified Blockers</p>
                    {b.blockers.map((blocker: any, i: number) => (
                      <div key={i} className="flex justify-between items-center p-3 rounded border border-destructive/30 bg-destructive/5 mb-2">
                        <div>
                          <p className="font-medium text-sm">{blocker.factor}</p>
                          <p className="text-xs text-muted-foreground">p-value: {blocker.p_value?.toFixed(4)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-destructive">{blocker.coefficient?.toFixed(3)}</p>
                          <p className="text-xs text-muted-foreground">Impact on ROI</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {results.visualizations.blockers_chart && (
                  <div className="relative border rounded-lg overflow-hidden mb-4">
                    <img src={`data:image/png;base64,${results.visualizations.blockers_chart}`} alt="Blockers" className="w-full" />
                    <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => downloadPNG("blockers_chart")}><Download className="w-4 h-4" /></Button>
                  </div>
                )}
                {b.inefficient_by_channel?.length > 0 && (
                  <div className="p-3 rounded border border-border bg-muted/20">
                    <p className="text-sm font-medium mb-2">Inefficient Items by Channel</p>
                    {b.inefficient_by_channel.map((item: any) => (
                      <div key={item.channel} className="flex justify-between text-sm">
                        <span>{item.channel}</span>
                        <span className="text-destructive">{item.count} items</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : <p className="text-center py-8 text-muted-foreground">{b?.error || "Blocker analysis not available."}</p>}
            <DetailParagraph detail={r?.detail} />
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(6)}>Back</Button>
              <Button onClick={() => setStep(8)} className="gap-2">Next<ArrowRight className="w-4 h-4" /></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 8: Optimization
  if (step === 8 && results) {
    const opt = results.results.optimization;
    const r = results.report?.step5_optimization;
    return (
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <ProgressBar currentStep={step} hasResults={!!results} onStepClick={setStep} />
        <DataPreview data={data} columns={columns} />
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Target className="w-5 h-5 text-primary" />5. Budget Optimization</CardTitle></CardHeader>
          <CardContent>
            <QuestionBanner question={r?.question || "How can we optimize budget allocation?"} />
            <FindingBox finding={r?.finding || ""} />
            {opt ? (
              <>
                <div className="p-4 rounded-lg border border-border bg-muted/20 mb-4">
                  <p className="text-xs text-muted-foreground mb-2">Current State</p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div><p className="text-lg font-semibold">{opt.current_state.total_cost?.toLocaleString()}</p><p className="text-xs text-muted-foreground">Total Cost</p></div>
                    <div><p className="text-lg font-semibold">{opt.current_state.total_performance?.toLocaleString()}</p><p className="text-xs text-muted-foreground">Total Perf</p></div>
                    <div><p className={`text-lg font-semibold ${opt.current_state.current_roi >= 100 ? 'text-primary' : 'text-destructive'}`}>{opt.current_state.current_roi?.toFixed(1)}%</p><p className="text-xs text-muted-foreground">Current ROI</p></div>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <p className="text-sm font-medium">Scenarios</p>
                  {opt.scenarios?.map((s: any, i: number) => (
                    <div key={i} className={`flex justify-between items-center p-3 rounded border ${s.roi_change > 0 ? 'border-primary/30 bg-primary/5' : 'border-destructive/30 bg-destructive/5'}`}>
                      <div>
                        <p className="font-medium text-sm">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.cost_change}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${s.roi_change > 0 ? 'text-primary' : 'text-destructive'}`}>{s.expected_roi?.toFixed(1)}% ROI</p>
                        <p className="text-xs text-muted-foreground">({s.roi_change > 0 ? '+' : ''}{s.roi_change?.toFixed(1)}%)</p>
                      </div>
                    </div>
                  ))}
                </div>
                {results.visualizations.optimization_chart && (
                  <div className="relative border rounded-lg overflow-hidden mb-4">
                    <img src={`data:image/png;base64,${results.visualizations.optimization_chart}`} alt="Optimization" className="w-full" />
                    <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => downloadPNG("optimization_chart")}><Download className="w-4 h-4" /></Button>
                  </div>
                )}
                {opt.recommendations?.length > 0 && (
                  <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Recommendations</p>
                        <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                          {opt.recommendations.map((rec: string, i: number) => <li key={i}>• {rec}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : <p className="text-center py-8 text-muted-foreground">Optimization not available.</p>}
            <DetailParagraph detail={r?.detail} />
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(7)}>Back</Button>
              <Button onClick={() => setStep(9)} className="gap-2">View Report<ArrowRight className="w-4 h-4" /></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 9: Report
  if (step === 9 && results) {
    const { summary: s, key_insights: insights, report: rpt, visualizations: v } = results;
    return (
      <div className="container mx-auto py-8 px-4 max-w-3xl space-y-6">
        <ProgressBar currentStep={step} hasResults={!!results} onStepClick={setStep} />
        <DataPreview data={data} columns={columns} />
        
        <div className="text-center py-4 border-b">
          <h1 className="text-xl font-semibold">ROI Performance Report</h1>
          <p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString()}</p>
        </div>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Executive Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard value={`${s.overall_roi?.toFixed(1)}%`} label="Overall ROI" highlight={s.overall_roi >= 100} negative={s.overall_roi < 100} />
              <MetricCard value={s.total_cost?.toLocaleString()} label="Total Cost" />
              <MetricCard value={s.total_performance?.toLocaleString()} label="Total Performance" />
              {s.best_channel && <div className="text-center p-4 rounded-lg border border-primary/30 bg-primary/5"><p className="text-lg font-semibold text-primary truncate">{s.best_channel}</p><p className="text-xs text-muted-foreground mt-1">Best Channel</p></div>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Key Insights</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {insights.map((ins, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded border ${ins.status === "warning" ? "border-destructive/30 bg-destructive/5" : ins.status === "positive" ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20"}`}>
                {ins.status === "warning" ? <AlertCircle className="w-4 h-4 text-destructive mt-0.5" /> : <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" />}
                <div><p className="font-medium text-sm">{ins.title}</p><p className="text-sm text-muted-foreground">{ins.description}</p></div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Detailed Analysis</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {rpt && Object.entries(rpt).map(([key, step]) => (
              <div key={key} className="border-b pb-5 last:border-0 last:pb-0">
                <h3 className="font-medium text-sm mb-2">{(step as ReportStep).title}</h3>
                <p className="text-sm text-primary italic mb-2">"{(step as ReportStep).question}"</p>
                <p className="text-sm font-medium mb-2">{(step as ReportStep).finding}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{(step as ReportStep).detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Charts</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="overview_chart">
              <TabsList className="mb-4">
                {v.overview_chart && <TabsTrigger value="overview_chart" className="text-xs">Overview</TabsTrigger>}
                {v.channel_chart && <TabsTrigger value="channel_chart" className="text-xs">Channel</TabsTrigger>}
                {v.correlation_chart && <TabsTrigger value="correlation_chart" className="text-xs">Correlation</TabsTrigger>}
                {v.blockers_chart && <TabsTrigger value="blockers_chart" className="text-xs">Blockers</TabsTrigger>}
                {v.optimization_chart && <TabsTrigger value="optimization_chart" className="text-xs">Optimization</TabsTrigger>}
              </TabsList>
              {Object.entries(v).map(([k, val]) => val && (
                <TabsContent key={k} value={k}>
                  <div className="relative border rounded-lg overflow-hidden">
                    <img src={`data:image/png;base64,${val}`} alt={k} className="w-full" />
                    <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => downloadPNG(k)}><Download className="w-4 h-4" /></Button>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(8)}>Back</Button>
          <Button variant="outline" onClick={() => setStep(1)}>New Analysis</Button>
        </div>
      </div>
    );
  }

  return null;
}