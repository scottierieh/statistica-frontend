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
  BarChart3, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle, Shield,
  FileText, FileImage, Download, Settings, ChevronRight, Target, Users,
  Lightbulb, Play, ArrowLeftRight, Zap
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

interface DataRow { [key: string]: string | number | null; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }
interface ReportStep { title: string; question: string; finding: string; detail: string; }

interface KPIAnalysisResult {
  success: boolean;
  results: { current_status: any; group_comparison?: any; correlation?: any; drivers?: any; simulation?: any; };
  visualizations: { [key: string]: string };
  key_insights: KeyInsight[];
  report: { step1_status: ReportStep; step2_comparison: ReportStep; step3_correlation: ReportStep; step4_drivers: ReportStep; step5_simulation: ReportStep; };
  summary: { total_kpis: number; avg_performance: number; has_targets: boolean; achievement_rate: number | null; n_groups: number | null; key_driver: string | null; model_r_squared: number | null; };
}

const generateSampleData = (): DataRow[] => {
  const teams = ["Sales", "Marketing", "Engineering", "Operations", "HR", "Finance"];
  const kpis = ["Revenue Growth", "Customer Acquisition", "Retention Rate", "Productivity", "Quality Score"];
  const data: DataRow[] = [];
  for (const team of teams) {
    for (const kpi of kpis) {
      const baseTarget = kpi === "Revenue Growth" ? 15 : kpi === "Customer Acquisition" ? 100 : 85;
      const teamMultiplier = team === "Sales" ? 1.1 : team === "Engineering" ? 1.05 : team === "HR" ? 0.9 : 1.0;
      const target = baseTarget * (0.9 + Math.random() * 0.2);
      const actual = target * teamMultiplier * (0.7 + Math.random() * 0.5);
      data.push({
        team, kpi_name: kpi,
        actual: Math.round(actual * 10) / 10,
        target: Math.round(target * 10) / 10,
        budget: Math.round(50000 + Math.random() * 100000),
        headcount: Math.floor(5 + Math.random() * 20),
        training_hours: Math.floor(10 + Math.random() * 40)
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

const MetricCard: React.FC<{ value: string | number; label: string; negative?: boolean }> = ({ value, label, negative }) => (
  <div className={`text-center p-4 rounded-lg border ${negative ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-muted/20'}`}>
    <p className={`text-2xl font-semibold ${negative ? 'text-destructive' : 'text-primary'}`}>{value}</p>
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
    a.download = 'kpi_data.csv';
    a.click();
  };

  if (data.length === 0) return null;

  return (
    <div className="mb-6 border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-muted/20">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 hover:text-primary transition-colors"
        >
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Data Preview</span>
          <Badge variant="secondary" className="text-xs">{data.length} rows × {columns.length} cols</Badge>
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={downloadCSV}>
          <Download className="w-3 h-3" />Download
        </Button>
      </div>
      {expanded && (
        <div className="max-h-64 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map(col => <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 50).map((row, i) => (
                <TableRow key={i}>
                  {columns.map(col => (
                    <TableCell key={col} className="text-xs py-1.5">
                      {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.length > 50 && (
            <p className="text-xs text-muted-foreground text-center py-2 bg-muted/10">
              Showing 50 of {data.length} rows
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const ProgressBar: React.FC<{ currentStep: number; hasResults: boolean; onStepClick: (s: number) => void }> = ({ currentStep, hasResults, onStepClick }) => {
  const steps = [
    { n: 1, l: "Intro" }, { n: 2, l: "Config" }, { n: 3, l: "Validate" },
    { n: 4, l: "Status" }, { n: 5, l: "Compare" }, { n: 6, l: "Correlate" },
    { n: 7, l: "Drivers" }, { n: 8, l: "Simulate" }, { n: 9, l: "Report" }
  ];
  return (
    <div className="flex items-center justify-center gap-0.5 mb-8 flex-wrap">
      {steps.map((s, i) => {
        const done = s.n < currentStep;
        const cur = s.n === currentStep;
        const ok = s.n <= 3 || hasResults;
        return (
          <React.Fragment key={s.n}>
            <button
              onClick={() => ok && onStepClick(s.n)}
              disabled={!ok}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                cur ? "bg-primary text-primary-foreground" :
                done ? "bg-primary/10 text-primary" :
                ok ? "bg-muted text-muted-foreground hover:bg-muted/80" : "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
              }`}
            >
              {s.l}
            </button>
            {i < steps.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/30" />}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default function KPIAnalysisPage() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<KPIAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [kpiCol, setKpiCol] = useState("");
  const [targetCol, setTargetCol] = useState("");
  const [groupCol, setGroupCol] = useState("");
  const [kpiNameCol, setKpiNameCol] = useState("");
  const [resourceCols, setResourceCols] = useState<string[]>([]);

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
    setKpiCol("actual"); setTargetCol("target"); setGroupCol("team"); setKpiNameCol("kpi_name");
    setResourceCols(["budget", "headcount", "training_hours"]);
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

  const toggleResourceCol = (col: string) => setResourceCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);

  const runAnalysis = async () => {
    try {
      setLoading(true); setError(null);
      const payload: any = { data, kpi_col: kpiCol };
      if (targetCol) payload.target_col = targetCol;
      if (groupCol) payload.group_col = groupCol;
      if (kpiNameCol) payload.kpi_name_col = kpiNameCol;
      if (resourceCols.length > 0) payload.resource_cols = resourceCols;
      const res = await fetch(`${FASTAPI_URL}/api/analysis/kpi-analysis`, {
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
    a.download = `kpi_${k}.png`; a.click();
  };

  // Step 1: Intro
  if (step === 1) return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <div className="text-center mb-10">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold mb-2">KPI Performance Analysis</h1>
        <p className="text-muted-foreground">5-step framework for systematic performance evaluation</p>
      </div>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">1</div>
            <div>
              <p className="font-medium">Current Status</p>
              <p className="text-xs text-muted-foreground">Performance Overview</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground italic mb-3">"What is the current performance state?"</p>
          <p className="text-sm text-muted-foreground mb-3">Analyze achievement rates, performance distribution, and identify gaps from targets.</p>
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">Achievement</Badge>
            <Badge variant="secondary" className="text-xs">Gap</Badge>
            <Badge variant="secondary" className="text-xs">Distribution</Badge>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">2</div>
            <div>
              <p className="font-medium">Group Comparison</p>
              <p className="text-xs text-muted-foreground">Team/Segment Analysis</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground italic mb-3">"Which groups perform better or worse?"</p>
          <p className="text-sm text-muted-foreground mb-3">Compare performance across teams or segments with statistical significance testing.</p>
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">ANOVA</Badge>
            <Badge variant="secondary" className="text-xs">Ranking</Badge>
            <Badge variant="secondary" className="text-xs">Significance</Badge>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">3</div>
            <div>
              <p className="font-medium">Resource Correlation</p>
              <p className="text-xs text-muted-foreground">Input-Output Analysis</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground italic mb-3">"How do resources relate to performance?"</p>
          <p className="text-sm text-muted-foreground mb-3">Measure correlations between resources (budget, headcount) and performance outcomes.</p>
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">Pearson</Badge>
            <Badge variant="secondary" className="text-xs">Spearman</Badge>
            <Badge variant="secondary" className="text-xs">P-value</Badge>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">4</div>
            <div>
              <p className="font-medium">Key Drivers</p>
              <p className="text-xs text-muted-foreground">Regression Analysis</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground italic mb-3">"What factors drive performance the most?"</p>
          <p className="text-sm text-muted-foreground mb-3">Identify primary drivers using regression and find underperforming groups.</p>
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">OLS</Badge>
            <Badge variant="secondary" className="text-xs">R²</Badge>
            <Badge variant="secondary" className="text-xs">Residuals</Badge>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">5</div>
            <div>
              <p className="font-medium">Simulation</p>
              <p className="text-xs text-muted-foreground">What-If Scenarios</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground italic mb-3">"What if we reallocate resources?"</p>
          <p className="text-sm text-muted-foreground mb-3">Simulate resource changes and predict performance impact with optimization recommendations.</p>
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">Prediction</Badge>
            <Badge variant="secondary" className="text-xs">Optimization</Badge>
            <Badge variant="secondary" className="text-xs">Scenarios</Badge>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-primary/30 bg-primary/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">✓</div>
            <div>
              <p className="font-medium">Final Report</p>
              <p className="text-xs text-muted-foreground">Executive Summary</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground italic mb-3">"What are the key takeaways?"</p>
          <p className="text-sm text-muted-foreground mb-3">Consolidated report with insights, visualizations, and actionable recommendations.</p>
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
            <Button onClick={loadSample} className="gap-2"><BarChart3 className="w-4 h-4" />Load Sample Data</Button>
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
              <Label>Performance Column *</Label>
              <Select value={kpiCol} onValueChange={setKpiCol}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{numCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target Column</Label>
              <Select value={targetCol || "__none__"} onValueChange={v => setTargetCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">-- None --</SelectItem>{numCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <Separator />
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Group Column</Label>
              <Select value={groupCol || "__none__"} onValueChange={v => setGroupCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Team/Dept" /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">-- None --</SelectItem>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>KPI Name Column</Label>
              <Select value={kpiNameCol || "__none__"} onValueChange={v => setKpiNameCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="KPI labels" /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">-- None --</SelectItem>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>Resource Columns</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {numCols.filter(c => c !== kpiCol && c !== targetCol).map(col => (
                <div key={col} className="flex items-center space-x-2">
                  <Checkbox id={`r-${col}`} checked={resourceCols.includes(col)} onCheckedChange={() => toggleResourceCol(col)} />
                  <label htmlFor={`r-${col}`} className="text-sm cursor-pointer">{col}</label>
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
    // 결측치 계산
    const getMissingInfo = () => {
      const missingCols: { col: string; count: number; pct: number }[] = [];
      const relevantCols = [kpiCol, targetCol, groupCol, kpiNameCol, ...resourceCols].filter(Boolean);
      
      for (const col of relevantCols) {
        const missingCount = data.filter(row => {
          const val = row[col];
          return val === null || val === undefined || val === '' || 
                 (typeof val === 'number' && isNaN(val));
        }).length;
        if (missingCount > 0) {
          missingCols.push({ 
            col, 
            count: missingCount, 
            pct: (missingCount / data.length) * 100 
          });
        }
      }
      return missingCols;
    };
    
    const missingInfo = getMissingInfo();
    const hasMissing = missingInfo.length > 0;
    const totalMissing = missingInfo.reduce((sum, m) => sum + m.count, 0);
    
    const checks = [
      { name: "Data", passed: data.length >= 3, msg: `${data.length} rows` },
      { name: "Performance Column", passed: !!kpiCol, msg: kpiCol || "Required" },
      { 
        name: "Missing Values", 
        passed: !hasMissing, 
        msg: hasMissing ? `${totalMissing} missing in ${missingInfo.length} column(s)` : "No missing values",
        warning: true // 경고지만 실행은 가능
      },
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
              <div key={i} className={`flex items-center justify-between p-3 rounded border ${
                c.passed ? 'border-border' : 
                c.warning ? 'border-amber-500/30 bg-amber-500/5' : 
                'border-destructive/30 bg-destructive/5'
              }`}>
                <div className="flex items-center gap-2">
                  {c.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  ) : c.warning ? (
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive" />
                  )}
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="text-xs text-muted-foreground">({c.msg})</span>
                </div>
                <Badge 
                  variant={c.passed ? "secondary" : "destructive"} 
                  className={`text-xs ${c.warning && !c.passed ? 'bg-amber-500/20 text-amber-700 hover:bg-amber-500/20' : ''}`}
                >
                  {c.passed ? "OK" : c.warning ? "Warning" : "Required"}
                </Badge>
              </div>
            ))}
            
            {/* 결측치 상세 정보 */}
            {hasMissing && (
              <div className="p-3 rounded border border-amber-500/30 bg-amber-500/5 text-sm">
                <p className="font-medium text-amber-700 mb-2">Missing Values Detail:</p>
                <div className="space-y-1">
                  {missingInfo.map(m => (
                    <div key={m.col} className="flex justify-between text-muted-foreground">
                      <span>{m.col}</span>
                      <span>{m.count} rows ({m.pct.toFixed(1)}%)</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Analysis will proceed with available data. Missing values may affect results.
                </p>
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
  // Step 4: Status
  if (step === 4 && results) {
    const s = results.results.current_status;
    const r = results.report?.step1_status;
    return (
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <ProgressBar currentStep={step} hasResults={!!results} onStepClick={setStep} />
        <DataPreview data={data} columns={columns} />
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Target className="w-5 h-5 text-primary" />1. Current Status</CardTitle></CardHeader>
          <CardContent>
            <QuestionBanner question={r?.question || "What is the current performance state?"} />
            <FindingBox finding={r?.finding || ""} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {s.has_targets ? (
                <>
                  <MetricCard value={`${s.achievement_rate?.toFixed(1)}%`} label="Achievement Rate" />
                  <MetricCard value={`${s.achieved_count}/${s.total_kpis}`} label="KPIs Met" />
                  <MetricCard value={`${s.avg_achievement_pct?.toFixed(1)}%`} label="Avg Achievement" />
                  <MetricCard value={s.total_gap?.toFixed(1)} label="Total Gap" negative={s.total_gap < 0} />
                </>
              ) : (
                <>
                  <MetricCard value={s.avg_performance?.toFixed(1)} label="Average" />
                  <MetricCard value={s.median_performance?.toFixed(1)} label="Median" />
                  <MetricCard value={s.min_performance?.toFixed(1)} label="Min" />
                  <MetricCard value={s.max_performance?.toFixed(1)} label="Max" />
                </>
              )}
            </div>
            {results.visualizations.status_chart && (
              <div className="relative border rounded-lg overflow-hidden mb-4">
                <img src={`data:image/png;base64,${results.visualizations.status_chart}`} alt="Status" className="w-full" />
                <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => downloadPNG("status_chart")}><Download className="w-4 h-4" /></Button>
              </div>
            )}
            <DetailParagraph detail={r?.detail} />
            <div className="flex justify-end pt-4"><Button onClick={() => setStep(5)} className="gap-2">Next<ArrowRight className="w-4 h-4" /></Button></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 5: Compare
  if (step === 5 && results) {
    const c = results.results.group_comparison;
    const r = results.report?.step2_comparison;
    return (
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <ProgressBar currentStep={step} hasResults={!!results} onStepClick={setStep} />
        <DataPreview data={data} columns={columns} />
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5 text-primary" />2. Group Comparison</CardTitle></CardHeader>
          <CardContent>
            <QuestionBanner question={r?.question || "Which groups are performing better or worse?"} />
            <FindingBox finding={r?.finding || ""} />
            {c ? (
              <>
                <div className="grid md:grid-cols-2 gap-3 mb-4">
                  <div className="p-4 rounded-lg border border-border bg-muted/20">
                    <p className="text-xs text-muted-foreground mb-1">Best Performer</p>
                    <p className="text-xl font-semibold text-primary">{c.best_performer.group}</p>
                    <p className="text-sm text-muted-foreground">Avg: {c.best_performer.avg?.toFixed(1)}</p>
                  </div>
                  <div className={`p-4 rounded-lg border ${c.performance_gap > c.best_performer.avg * 0.2 ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-muted/20'}`}>
                    <p className="text-xs text-muted-foreground mb-1">Needs Improvement</p>
                    <p className={`text-xl font-semibold ${c.performance_gap > c.best_performer.avg * 0.2 ? 'text-destructive' : ''}`}>{c.worst_performer.group}</p>
                    <p className="text-sm text-muted-foreground">Avg: {c.worst_performer.avg?.toFixed(1)}</p>
                  </div>
                </div>
                <div className="flex justify-between p-3 rounded border border-border bg-muted/20 mb-4">
                  <span className="text-sm text-muted-foreground">Performance Gap</span>
                  <span className="font-medium">{c.performance_gap?.toFixed(1)} ({c.gap_pct?.toFixed(1)}%)</span>
                </div>
                {c.statistical_test?.p_value !== null && (
                  <div className={`p-3 rounded border text-sm mb-4 ${c.statistical_test.significant_difference ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
                    <span className="text-muted-foreground">Statistical: </span>
                    <span className="font-medium">{c.statistical_test.significant_difference ? 'Significant' : 'Not Significant'} (p={c.statistical_test.p_value?.toFixed(4)})</span>
                  </div>
                )}
                {results.visualizations.comparison_chart && (
                  <div className="relative border rounded-lg overflow-hidden mb-4">
                    <img src={`data:image/png;base64,${results.visualizations.comparison_chart}`} alt="Comparison" className="w-full" />
                    <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => downloadPNG("comparison_chart")}><Download className="w-4 h-4" /></Button>
                  </div>
                )}
                <Table>
                  <TableHeader><TableRow><TableHead>Rank</TableHead><TableHead>Group</TableHead><TableHead className="text-right">Avg</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {c.group_data.map((g: any) => (
                      <TableRow key={g.group}><TableCell className="text-muted-foreground">#{g.rank}</TableCell><TableCell className="font-medium">{g.group}</TableCell><TableCell className="text-right">{g.avg?.toFixed(1)}</TableCell><TableCell className="text-right">{g.total?.toFixed(0)}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            ) : <p className="text-center py-8 text-muted-foreground">Group column not configured.</p>}
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
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ArrowLeftRight className="w-5 h-5 text-primary" />3. Resource Correlation</CardTitle></CardHeader>
          <CardContent>
            <QuestionBanner question={r?.question || "How do resources relate to performance?"} />
            <FindingBox finding={r?.finding || ""} />
            {cor?.correlations?.length > 0 ? (
              <>
                {cor.strongest_correlation && (
                  <div className="p-4 rounded-lg border border-border bg-muted/20 mb-4">
                    <p className="text-xs text-muted-foreground mb-1">Strongest Correlation</p>
                    <div className="flex justify-between items-center">
                      <p className="text-xl font-semibold text-primary">{cor.strongest_correlation.resource}</p>
                      <div className="text-right">
                        <p className="font-mono text-lg">r = {cor.strongest_correlation.correlation?.toFixed(3)}</p>
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
                  <TableHeader><TableRow><TableHead>Resource</TableHead><TableHead className="text-right">r</TableHead><TableHead className="text-center">Strength</TableHead><TableHead className="text-center">Sig.</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {cor.correlations.map((c: any) => (
                      <TableRow key={c.resource}><TableCell className="font-medium">{c.resource}</TableCell><TableCell className="text-right font-mono">{c.correlation?.toFixed(3)}</TableCell><TableCell className="text-center text-muted-foreground text-sm">{c.strength}</TableCell><TableCell className="text-center">{c.significant ? <CheckCircle2 className="w-4 h-4 text-primary mx-auto" /> : <span className="text-muted-foreground">-</span>}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            ) : <p className="text-center py-8 text-muted-foreground">Resource columns not configured.</p>}
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

  // Step 7: Drivers
  if (step === 7 && results) {
    const d = results.results.drivers;
    const r = results.report?.step4_drivers;
    return (
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <ProgressBar currentStep={step} hasResults={!!results} onStepClick={setStep} />
        <DataPreview data={data} columns={columns} />
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Zap className="w-5 h-5 text-primary" />4. Key Drivers</CardTitle></CardHeader>
          <CardContent>
            <QuestionBanner question={r?.question || "What factors drive performance the most?"} />
            <FindingBox finding={r?.finding || ""} />
            {d && !d.error ? (
              <>
                {d.key_driver && (
                  <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 mb-4">
                    <p className="text-xs text-muted-foreground mb-1">Primary Driver</p>
                    <div className="flex justify-between items-center">
                      <p className="text-xl font-semibold text-primary">{d.key_driver.factor}</p>
                      <p className="text-lg font-mono">{d.key_driver.importance?.toFixed(1)}%</p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <MetricCard value={`${(d.r_squared * 100)?.toFixed(1)}%`} label="R² Score" />
                  <div className="text-center p-4 rounded-lg border border-border bg-muted/20">
                    <p className="text-2xl font-semibold capitalize">{d.model_quality}</p>
                    <p className="text-xs text-muted-foreground mt-1">Model Quality</p>
                  </div>
                  <MetricCard value={d.n_observations} label="Observations" />
                </div>
                {results.visualizations.driver_chart && (
                  <div className="relative border rounded-lg overflow-hidden mb-4">
                    <img src={`data:image/png;base64,${results.visualizations.driver_chart}`} alt="Drivers" className="w-full" />
                    <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => downloadPNG("driver_chart")}><Download className="w-4 h-4" /></Button>
                  </div>
                )}
                <Table>
                  <TableHeader><TableRow><TableHead>Factor</TableHead><TableHead className="text-right">Importance</TableHead><TableHead className="text-center">Direction</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {d.drivers?.map((dr: any) => (
                      <TableRow key={dr.factor}><TableCell className="font-medium">{dr.factor}</TableCell><TableCell className="text-right font-mono">{dr.importance?.toFixed(1)}%</TableCell><TableCell className={`text-center ${dr.direction === 'positive' ? 'text-primary' : 'text-destructive'}`}>{dr.direction === 'positive' ? '↑' : '↓'}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
                {d.underperforming_groups?.length > 0 && (
                  <div className="mt-4 p-3 rounded border border-destructive/30 bg-destructive/5 text-sm">
                    <span className="text-muted-foreground">Underperforming: </span><span className="font-medium">{d.underperforming_groups.join(', ')}</span>
                  </div>
                )}
              </>
            ) : <p className="text-center py-8 text-muted-foreground">{d?.error || "Driver analysis not available."}</p>}
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
  // Step 8: Simulation
  if (step === 8 && results) {
    const sim = results.results.simulation;
    const r = results.report?.step5_simulation;
    return (
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <ProgressBar currentStep={step} hasResults={!!results} onStepClick={setStep} />
        <DataPreview data={data} columns={columns} />
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Play className="w-5 h-5 text-primary" />5. Simulation</CardTitle></CardHeader>
          <CardContent>
            <QuestionBanner question={r?.question || "What if we reallocate resources?"} />
            <FindingBox finding={r?.finding || ""} />
            {sim && !sim.error ? (
              <>
                <div className="p-4 rounded-lg border border-border bg-muted/20 mb-4">
                  <p className="text-xs text-muted-foreground mb-2">Current State</p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div><p className="text-lg font-semibold">{sim.current_state.avg_kpi?.toFixed(1)}</p><p className="text-xs text-muted-foreground">Avg Performance</p></div>
                    <div><p className="text-lg font-semibold">{sim.current_state.total_kpi?.toFixed(0)}</p><p className="text-xs text-muted-foreground">Total</p></div>
                    <div><p className="text-lg font-semibold capitalize">{sim.model_reliability}</p><p className="text-xs text-muted-foreground">Reliability</p></div>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <p className="text-sm font-medium">Scenarios</p>
                  {sim.scenarios?.map((s: any, i: number) => (
                    <div key={i} className={`flex justify-between items-center p-3 rounded border ${s.expected_performance_change > 0 ? 'border-primary/30 bg-primary/5' : 'border-destructive/30 bg-destructive/5'}`}>
                      <div><p className="font-medium text-sm">{s.name}</p><p className="text-xs text-muted-foreground">{s.resource_change}</p></div>
                      <div className="text-right">
                        <p className={`font-semibold ${s.expected_performance_change > 0 ? 'text-primary' : 'text-destructive'}`}>{s.expected_performance_change > 0 ? '+' : ''}{s.expected_performance_change?.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">({s.expected_performance_change_pct > 0 ? '+' : ''}{s.expected_performance_change_pct?.toFixed(1)}%)</p>
                      </div>
                    </div>
                  ))}
                </div>
                {results.visualizations.simulation_chart && (
                  <div className="relative border rounded-lg overflow-hidden mb-4">
                    <img src={`data:image/png;base64,${results.visualizations.simulation_chart}`} alt="Simulation" className="w-full" />
                    <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => downloadPNG("simulation_chart")}><Download className="w-4 h-4" /></Button>
                  </div>
                )}
                {sim.optimal_allocation && (
                  <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div><p className="font-medium text-sm">Recommendation</p><p className="text-sm text-muted-foreground mt-1">{sim.optimal_allocation.recommendation}</p></div>
                    </div>
                  </div>
                )}
              </>
            ) : <p className="text-center py-8 text-muted-foreground">{sim?.error || "Simulation not available."}</p>}
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
          <h1 className="text-xl font-semibold">KPI Performance Report</h1>
          <p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString()}</p>
        </div>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Executive Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard value={s.total_kpis} label="Total KPIs" />
              <MetricCard value={s.avg_performance?.toFixed(1)} label="Avg Performance" />
              {s.achievement_rate !== null && <MetricCard value={`${s.achievement_rate?.toFixed(1)}%`} label="Achievement" />}
              {s.key_driver && <div className="text-center p-4 rounded-lg border border-border bg-muted/20"><p className="text-lg font-semibold text-primary truncate">{s.key_driver}</p><p className="text-xs text-muted-foreground mt-1">Key Driver</p></div>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Key Insights</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {insights.map((ins, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded border ${ins.status === "warning" ? "border-destructive/30 bg-destructive/5" : "border-border bg-muted/20"}`}>
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
            <Tabs defaultValue="status_chart">
              <TabsList className="mb-4">
                {v.status_chart && <TabsTrigger value="status_chart" className="text-xs">Status</TabsTrigger>}
                {v.comparison_chart && <TabsTrigger value="comparison_chart" className="text-xs">Compare</TabsTrigger>}
                {v.correlation_chart && <TabsTrigger value="correlation_chart" className="text-xs">Correlation</TabsTrigger>}
                {v.driver_chart && <TabsTrigger value="driver_chart" className="text-xs">Drivers</TabsTrigger>}
                {v.simulation_chart && <TabsTrigger value="simulation_chart" className="text-xs">Simulation</TabsTrigger>}
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

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Export</CardTitle></CardHeader>
          <CardContent className="flex gap-2 flex-wrap">
            {Object.keys(v).map(k => (
              <Button key={k} variant="outline" size="sm" className="gap-1 text-xs" onClick={() => downloadPNG(k)}><FileImage className="w-3 h-3" />{k.replace('_chart', '')}</Button>
            ))}
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