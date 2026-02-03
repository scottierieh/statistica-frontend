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
import { Input } from "@/components/ui/input";
import {
  Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle, Shield, Info, BookOpen,
  FileText, Download, Settings, Activity, ChevronRight, BookMarked, Target, Gauge, Users, Box
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "https://statistica-api-995604437166.asia-northeast3.run.app";

interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface GageRRResult {
  success: boolean;
  results: {
    n_parts: number;
    n_operators: number;
    n_trials: number;
    grand_mean: number;
    variance_components: {
      part: number;
      repeatability: number;
      reproducibility: number;
      operator: number;
      interaction: number;
      gage_rr: number;
      total: number;
    };
    study_variation: {
      sd_part: number;
      sd_repeatability: number;
      sd_reproducibility: number;
      sd_gage_rr: number;
      sd_total: number;
      sv_part: number;
      sv_repeatability: number;
      sv_reproducibility: number;
      sv_gage_rr: number;
      sv_total: number;
      pct_sv_part: number;
      pct_sv_repeatability: number;
      pct_sv_reproducibility: number;
      pct_sv_gage_rr: number;
      pct_tol_repeatability?: number;
      pct_tol_reproducibility?: number;
      pct_tol_gage_rr?: number;
      tolerance?: number;
    };
    ndc: number;
    assessment: {
      gage_status: string;
      gage_color: string;
      ndc_status: string;
      ndc_color: string;
    };
    p_interaction: number;
  };
  visualizations: {
    variance_components?: string;
    xbar_chart?: string;
    range_chart?: string;
    operator_comparison?: string;
    part_variation?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    analysis_type: string;
    n_parts: number;
    n_operators: number;
    pct_gage_rr: number;
    ndc: number;
    status: string;
  };
}

const generateSampleData = (): DataRow[] => {
  const data: DataRow[] = [];
  const parts = ['Part_A', 'Part_B', 'Part_C', 'Part_D', 'Part_E', 'Part_F', 'Part_G', 'Part_H', 'Part_I', 'Part_J'];
  const operators = ['Operator_1', 'Operator_2', 'Operator_3'];
  const trials = 3;
  
  // True part values
  const partValues: { [key: string]: number } = {
    'Part_A': 10.0, 'Part_B': 10.5, 'Part_C': 11.0, 'Part_D': 11.5, 'Part_E': 12.0,
    'Part_F': 12.5, 'Part_G': 13.0, 'Part_H': 13.5, 'Part_I': 14.0, 'Part_J': 14.5
  };
  
  for (const part of parts) {
    const trueValue = partValues[part];
    for (const operator of operators) {
      const operatorBias = (Math.random() - 0.5) * 0.1;
      for (let trial = 1; trial <= trials; trial++) {
        const repeatError = (Math.random() - 0.5) * 0.15;
        const measurement = trueValue + operatorBias + repeatError;
        data.push({ part, operator, measurement: parseFloat(measurement.toFixed(3)), trial });
      }
    }
  }
  
  return data;
};

const MetricCard: React.FC<{ value: string | number; label: string; icon?: React.FC<{ className?: string }>; highlight?: boolean; status?: string; }> = 
  ({ value, label, icon: Icon, highlight, status }) => (
  <div className={`text-center p-4 rounded-lg border ${
    highlight ? 'border-primary/30 bg-primary/5' :
    status === 'green' ? 'border-primary/30 bg-primary/5' :
    status === 'yellow' ? 'border-border bg-muted/10' :
    status === 'red' ? 'border-destructive/30 bg-destructive/5' :
    'border-border bg-muted/20'
  }`}>
    {Icon && <Icon className="w-5 h-5 mx-auto mb-2 text-primary" />}
    <p className={`text-2xl font-semibold ${highlight ? 'text-primary' : ''}`}>{value}</p>
    <p className="text-xs text-muted-foreground mt-1">{label}</p>
  </div>
);

const FindingBox: React.FC<{ finding: string }> = ({ finding }) => (
  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Key Finding</p>
    <p className="font-medium text-foreground">{finding}</p>
  </div>
);

const DetailParagraph: React.FC<{ title?: string; detail: string }> = ({ title, detail }) => (
  <div className="mt-6 p-4 rounded-lg border border-border bg-muted/10">
    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">{title || "Detailed Analysis"}</p>
    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{detail}</p>
  </div>
);

const DataPreview: React.FC<{ data: DataRow[]; columns: string[] }> = ({ data, columns }) => {
  const [expanded, setExpanded] = useState(false);
  if (data.length === 0) return null;
  return (
    <div className="mb-6 border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-muted/20">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 hover:text-primary transition-colors">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Data Preview</span>
          <Badge variant="secondary" className="text-xs">{data.length} rows × {columns.length} columns</Badge>
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>
      </div>
      {expanded && (
        <div className="max-h-64 overflow-auto">
          <Table>
            <TableHeader><TableRow>{columns.map(col => <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>)}</TableRow></TableHeader>
            <TableBody>{data.slice(0, 10).map((row, i) => <TableRow key={i}>{columns.map(col => <TableCell key={col} className="text-xs py-1.5">{row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}</TableCell>)}</TableRow>)}</TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

const GageRRGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><BookMarked className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">Gage R&R Study Guide</h2></div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="p-6 space-y-6">
          <div><h3 className="font-semibold text-primary mb-3 flex items-center gap-2"><Target className="w-4 h-4" />What is Gage R&R?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">Gage Repeatability & Reproducibility (Gage R&R) evaluates measurement system variation. It determines if your measurement system is adequate by quantifying how much variation comes from the measurement system versus actual parts.</p>
          </div>
          <Separator />
          <div><h3 className="font-semibold text-primary mb-3 flex items-center gap-2"><Activity className="w-4 h-4" />Components</h3>
            <div className="space-y-3">
              {[
                { name: 'Part-to-Part', desc: 'Actual differences between parts. High is good - means parts differ.', icon: Target },
                { name: 'Repeatability', desc: 'Same operator, same part. Low is good - equipment consistent.', icon: Activity },
                { name: 'Reproducibility', desc: 'Different operators. Low is good - operators agree.', icon: Users }
              ].map(({ name, desc, icon: Icon }, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/10">
                  <Icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div><p className="font-medium text-sm">{name}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
                </div>
              ))}
            </div>
          </div>
          <Separator />
          <div><h3 className="font-semibold text-primary mb-3">Acceptance Criteria</h3>
            <div className="space-y-2 text-sm">
              <p>• <strong className="text-primary">&lt;10%:</strong> Acceptable measurement system</p>
              <p>• <strong className="text-muted-foreground">10-30%:</strong> Marginal - depends on application</p>
              <p>• <strong className="text-destructive">&gt;30%:</strong> Unacceptable - needs improvement</p>
              <p className="mt-3"><strong>NDC ≥5:</strong> Excellent, <strong>2-4:</strong> Adequate, <strong>&lt;2:</strong> Poor</p>
            </div>
          </div>
          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground"><strong className="text-primary">Study Design:</strong> 10+ parts, 2-3 operators, 2-3 trials. Randomize order, blind measurements, use production conditions.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProgressBar: React.FC<{ currentStep: number; hasResults: boolean; onStepClick: (step: number) => void }> = ({ currentStep, hasResults, onStepClick }) => {
  const steps = [
    { num: 1, label: "Intro" }, { num: 2, label: "Config" }, { num: 3, label: "Validation" },
    { num: 4, label: "Summary" }, { num: 5, label: "Methodology" }, { num: 6, label: "Report" }
  ];
  return (
    <div className="flex items-center justify-center gap-0.5 mb-8 flex-wrap">
      {steps.map((step, idx) => {
        const isCompleted = step.num < currentStep;
        const isCurrent = step.num === currentStep;
        const isAccessible = step.num <= 3 || hasResults;
        return (
          <React.Fragment key={step.num}>
            <button onClick={() => isAccessible && onStepClick(step.num)} disabled={!isAccessible}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                isCurrent ? "bg-primary text-primary-foreground" : isCompleted ? "bg-primary/10 text-primary" :
                isAccessible ? "bg-muted text-muted-foreground hover:bg-muted/80" : "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
              }`}>
              {step.label}
            </button>
            {idx < steps.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/30" />}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const IntroPage: React.FC<{ onLoadSample: () => void; onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; onShowGuide: () => void }> = ({ onLoadSample, onFileUpload, onShowGuide }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Gauge className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">Gage R&R Analysis</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Measurement System Analysis (MSA) to evaluate repeatability and reproducibility of your measurement process using ANOVA method.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {[
          { icon: Target, title: "Repeatability", desc: "Equipment variation" },
          { icon: Users, title: "Reproducibility", desc: "Operator variation" },
          { icon: Box, title: "Part-to-Part", desc: "Actual variation" }
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="p-5 rounded-lg border border-border bg-muted/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div><p className="font-medium">{title}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
            </div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Info className="w-5 h-5 text-primary" />When to Use</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary mb-3">Requirements</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["5+ parts measured", "2+ operators", "2+ trials per combination", "Numeric measurements"].map(req => (
                  <li key={req} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />{req}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-primary mb-3">Results</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["Gage R&R %", "NDC (discrimination)", "Variance components", "System acceptability"].map(res => (
                  <li key={res} className="flex items-start gap-2">
                    <Activity className="w-4 h-4 text-primary mt-0.5 shrink-0" />{res}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button onClick={onLoadSample} className="gap-2 w-full sm:w-auto"><Activity className="w-4 h-4" />Load Sample Data</Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2 w-full sm:w-auto">
              <Upload className="w-4 h-4" />Upload Your Data
            </Button>
            <Button variant="outline" onClick={onShowGuide} className="gap-2 w-full sm:w-auto">
              <BookOpen className="w-4 h-4" />View Guide
            </Button>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={onFileUpload} className="hidden" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default function GageRRAnalysisPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<GageRRResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  
  const [partCol, setPartCol] = useState<string>("");
  const [operatorCol, setOperatorCol] = useState<string>("");
  const [measurementCol, setMeasurementCol] = useState<string>("");
  const [tolerance, setTolerance] = useState<string>("");

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    setColumns(Object.keys(sampleData[0]));
    setPartCol("part");
    setOperatorCol("operator");
    setMeasurementCol("measurement");
    setTolerance("2.0");
    setCurrentStep(2);
    setResults(null);
    setError(null);
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      setLoading(true);
      const res = await fetch(`${FASTAPI_URL}/api/data/upload`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const result = await res.json();
      setData(result.data);
      setColumns(result.columns);
      setCurrentStep(2);
      setResults(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const getValidationChecks = useCallback((): ValidationCheck[] => {
    const nParts = data.filter((row, idx, self) => self.findIndex(r => r[partCol] === row[partCol]) === idx).length;
    const nOps = data.filter((row, idx, self) => self.findIndex(r => r[operatorCol] === row[operatorCol]) === idx).length;
    
    return [
      { name: "Part Column", passed: !!partCol, message: partCol || "Select part" },
      { name: "Operator Column", passed: !!operatorCol, message: operatorCol || "Select operator" },
      { name: "Measurement Column", passed: !!measurementCol, message: measurementCol || "Select measurement" },
      { name: "Sufficient Parts", passed: nParts >= 5, message: `${nParts} parts (need ≥5)` },
      { name: "Multiple Operators", passed: nOps >= 2, message: `${nOps} operators (need ≥2)` }
    ];
  }, [partCol, operatorCol, measurementCol, data]);

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const payload = {
        data, part_col: partCol, operator_col: operatorCol, measurement_col: measurementCol,
        tolerance: tolerance ? parseFloat(tolerance) : null
      };
      const res = await fetch(`${FASTAPI_URL}/api/analysis/gage-rr-analysis`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Analysis failed");
      }
      const result: GageRRResult = await res.json();
      setResults(result);
      setCurrentStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const base64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!base64) return;
    const a = document.createElement("a");
    a.href = `data:image/png;base64,${base64}`;
    a.download = `gage_rr_${chartKey}.png`;
    a.click();
  };

  const renderStep2Config = () => (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Settings className="w-5 h-5 text-primary" />Configure Analysis</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Part Column</Label>
            <Select value={partCol} onValueChange={setPartCol}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Operator Column</Label>
            <Select value={operatorCol} onValueChange={setOperatorCol}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Measurement Column</Label>
            <Select value={measurementCol} onValueChange={setMeasurementCol}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Tolerance (Optional)</Label>
          <Input type="number" placeholder="Enter tolerance width (e.g., 2.0)" value={tolerance} onChange={(e) => setTolerance(e.target.value)} step={0.1} />
          <p className="text-xs text-muted-foreground">Total specification tolerance for %Tolerance calculations</p>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={() => setCurrentStep(3)} className="gap-2">Continue <ArrowRight className="w-4 h-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep3Validation = () => {
    const checks = getValidationChecks();
    const canRun = checks.every(c => c.passed);

    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Shield className="w-5 h-5 text-primary" />Validation</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            {checks.map((check, idx) => (
              <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${check.passed ? 'border-border' : 'border-destructive/30 bg-destructive/5'}`}>
                <div className="flex items-center gap-3">
                  {check.passed ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <XCircle className="w-5 h-5 text-destructive" />}
                  <div>
                    <p className="font-medium text-sm">{check.name}</p>
                    <p className="text-xs text-muted-foreground">{check.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(2)}>Back</Button>
            <Button onClick={runAnalysis} disabled={loading || !canRun} className="gap-2">
              {loading ? <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Analyzing...</> : <>Run Analysis<ArrowRight className="w-4 h-4" /></>}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Steps 4, 5, 6 will be implemented in next message to save tokens
  const renderStep4Summary = () => {
    if (!results) return null;
    
    const { summary, results: r, key_insights } = results;
    const vc = r.variance_components;
    const sv = r.study_variation;
    const assess = r.assessment;
    
    // Safe number formatter
    const fmt = (num: number | undefined, decimals: number = 1): string => {
      return num !== undefined && num !== null && !isNaN(num) ? num.toFixed(decimals) : '0.0';
    };
    
    const finding = `Analyzed ${summary.n_parts} parts measured by ${summary.n_operators} operators. Gage R&R is ${summary.pct_gage_rr}% of total variation, classified as ${summary.status}. NDC of ${summary.ndc} indicates ${assess.ndc_status.toLowerCase()} discrimination capability.`;

    const getStatusColor = (status: string) => {
      if (status === 'Acceptable') return 'border-primary/30 bg-primary/5';
      if (status === 'Marginal') return 'border-border bg-muted/10';
      return 'border-destructive/30 bg-destructive/5';
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gauge className="w-5 h-5 text-primary" />
            Gage R&R Analysis Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} />

          {/* Primary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard 
              value={`${summary.pct_gage_rr}%`} 
              label="Gage R&R %" 
              icon={Gauge} 
              highlight 
              status={assess.gage_color}
            />
            <MetricCard 
              value={summary.ndc} 
              label="NDC" 
              icon={Target}
              status={assess.ndc_color}
            />
            <MetricCard 
              value={summary.n_parts} 
              label="Parts" 
              icon={Box}
            />
            <MetricCard 
              value={summary.n_operators} 
              label="Operators" 
              icon={Users}
            />
          </div>

          {/* System Assessment */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Measurement System Assessment</h4>
            <div className="grid md:grid-cols-2 gap-3">
              <div className={`p-4 rounded-lg border ${getStatusColor(assess.gage_status)}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Gage R&R Status</p>
                  <Badge variant="outline" className="text-xs">{assess.gage_status}</Badge>
                </div>
                <p className="text-2xl font-semibold mb-1">{summary.pct_gage_rr}%</p>
                <p className="text-xs text-muted-foreground">
                  {assess.gage_status === 'Acceptable' && 'Excellent measurement system - less than 10% variation'}
                  {assess.gage_status === 'Marginal' && 'Acceptable depending on application - 10-30% variation'}
                  {assess.gage_status === 'Unacceptable' && 'System requires improvement - exceeds 30% variation'}
                </p>
              </div>

              <div className={`p-4 rounded-lg border ${getStatusColor(assess.ndc_status)}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Discrimination (NDC)</p>
                  <Badge variant="outline" className="text-xs">{assess.ndc_status}</Badge>
                </div>
                <p className="text-2xl font-semibold mb-1">{summary.ndc} categories</p>
                <p className="text-xs text-muted-foreground">
                  {summary.ndc >= 5 && 'Excellent - can detect fine process variations'}
                  {summary.ndc >= 2 && summary.ndc < 5 && 'Adequate - can detect major process changes'}
                  {summary.ndc < 2 && 'Poor - cannot adequately distinguish between parts'}
                </p>
              </div>
            </div>
          </div>

          {/* Variance Components Breakdown */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Variance Components</h4>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="text-xs text-muted-foreground mb-1">Part-to-Part</p>
                <p className="text-lg font-semibold">{fmt(sv.pct_sv_part)}%</p>
                <p className="text-xs text-muted-foreground mt-1">Actual product variation</p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="text-xs text-muted-foreground mb-1">Repeatability</p>
                <p className="text-lg font-semibold">{fmt(sv.pct_sv_repeatability)}%</p>
                <p className="text-xs text-muted-foreground mt-1">Equipment variation</p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="text-xs text-muted-foreground mb-1">Reproducibility</p>
                <p className="text-lg font-semibold">{fmt(sv.pct_sv_reproducibility)}%</p>
                <p className="text-xs text-muted-foreground mt-1">Operator variation</p>
              </div>
            </div>
          </div>

          {/* Detailed Variance Table */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Detailed Variance Analysis</h4>
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Component</TableHead>
                    <TableHead className="text-xs text-right">Variance</TableHead>
                    <TableHead className="text-xs text-right">% Contribution</TableHead>
                    <TableHead className="text-xs text-right">Std Dev</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-xs font-medium">Part-to-Part</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(vc.part, 4)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(sv.pct_sv_part)}%</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(sv.sd_part, 4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs font-medium">Repeatability</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(vc.repeatability, 4)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(sv.pct_sv_repeatability)}%</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(sv.sd_repeatability, 4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs font-medium">Reproducibility</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(vc.reproducibility, 4)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(sv.pct_sv_reproducibility)}%</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(sv.sd_reproducibility, 4)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-primary/5">
                    <TableCell className="text-xs font-bold">Gage R&R</TableCell>
                    <TableCell className="text-xs text-right font-mono font-bold">{fmt(vc.gage_rr, 4)}</TableCell>
                    <TableCell className="text-xs text-right font-mono font-bold">{fmt(sv.pct_sv_gage_rr)}%</TableCell>
                    <TableCell className="text-xs text-right font-mono font-bold">{fmt(sv.sd_gage_rr, 4)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs font-medium">Total Variation</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(vc.total, 4)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">100.0%</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(Math.sqrt(vc.total || 0), 4)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Tolerance Analysis (if provided) */}
          {sv.tolerance && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Tolerance Analysis</h4>
              <div className="p-4 rounded-lg border border-border bg-muted/10">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Specification Tolerance</p>
                    <p className="text-lg font-semibold">{fmt(sv.tolerance, 3)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Gage R&R % Tolerance</p>
                    <p className="text-lg font-semibold">{fmt(sv.pct_tol_gage_rr)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Assessment</p>
                    <Badge variant={sv.pct_tol_gage_rr && sv.pct_tol_gage_rr < 10 ? "default" : sv.pct_tol_gage_rr && sv.pct_tol_gage_rr < 30 ? "secondary" : "destructive"}>
                      {sv.pct_tol_gage_rr && sv.pct_tol_gage_rr < 10 ? 'Excellent' : sv.pct_tol_gage_rr && sv.pct_tol_gage_rr < 30 ? 'Acceptable' : 'Poor'}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Gage R&R consumes {fmt(sv.pct_tol_gage_rr)}% of total tolerance band. 
                  {sv.pct_tol_gage_rr && sv.pct_tol_gage_rr < 10 && ' Measurement error is minimal relative to specification.'}
                  {sv.pct_tol_gage_rr && sv.pct_tol_gage_rr >= 30 && ' Measurement error significantly impacts usable tolerance.'}
                </p>
              </div>
            </div>
          )}

          {/* Key Insights */}
          {key_insights && key_insights.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Key Insights</h4>
              {key_insights.map((insight, idx) => (
                <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${
                  insight.status === "positive" ? "border-primary/30 bg-primary/5" :
                  insight.status === "warning" ? "border-border bg-muted/10" :
                  "border-border bg-muted/10"
                }`}>
                  {insight.status === "positive" ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> :
                   insight.status === "warning" ? <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0" /> :
                   <Info className="w-5 h-5 text-muted-foreground shrink-0" />}
                  <div>
                    <p className="font-medium text-sm">{insight.title}</p>
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <DetailParagraph
            title="Interpretation Guide"
            detail={`■ Gage R&R Assessment: ${summary.pct_gage_rr}%
${assess.gage_status === 'Acceptable' 
  ? 'Measurement system is acceptable for use. Less than 10% of observed variation comes from the measurement system itself.'
  : assess.gage_status === 'Marginal'
  ? 'Measurement system is marginal (10-30%). May be acceptable depending on application, but improvement is recommended if cost-effective.'
  : 'Measurement system is unacceptable (>30%). More variation comes from measurement error than desired. System must be improved before using for critical decisions.'}

■ Repeatability vs Reproducibility
Repeatability (${sv.pct_sv_repeatability.toFixed(1)}%): Variation when same operator measures same part multiple times.
${sv.pct_sv_repeatability > sv.pct_sv_reproducibility 
  ? 'Repeatability is the dominant issue. Focus on equipment calibration, fixture design, and measurement procedure clarity.'
  : 'Repeatability is acceptable. Equipment performs consistently.'}

Reproducibility (${sv.pct_sv_reproducibility.toFixed(1)}%): Variation between different operators.
${sv.pct_sv_reproducibility > sv.pct_sv_repeatability
  ? 'Reproducibility is the dominant issue. Focus on operator training, standardized procedures, and potentially improved fixtures to reduce operator influence.'
  : 'Reproducibility is acceptable. Operators measure consistently with each other.'}

■ Number of Distinct Categories (NDC): ${summary.ndc}
${summary.ndc >= 5 
  ? 'Excellent discrimination. Measurement system can detect fine variations in the process, suitable for process control and capability studies.'
  : summary.ndc >= 2
  ? 'Adequate discrimination. System can detect large process changes but may miss smaller variations. Consider improvement if finer resolution needed.'
  : 'Poor discrimination. Measurement system cannot adequately distinguish between parts. Improvement required before use.'}

■ Recommendations
${assess.gage_status === 'Acceptable' && summary.ndc >= 5
  ? '• Measurement system is ready for use\n• Maintain current calibration schedule\n• Document measurement procedures\n• Periodic re-qualification recommended'
  : assess.gage_status === 'Marginal'
  ? '• Investigate root causes of measurement variation\n• Consider cost-benefit of improvements\n• May be acceptable for non-critical applications\n• Document limitations and risks'
  : '• Do not use system for critical decisions\n• Investigate equipment, fixtures, and procedures\n• Conduct root cause analysis\n• Re-run study after improvements'
}`}
          />

          <div className="flex justify-end pt-4">
            <Button onClick={() => setCurrentStep(5)} className="gap-2">
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderStep5Methodology = () => {
    if (!results) return null;
    const r = results.results;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="w-5 h-5 text-primary" />
            Gage R&R Methodology (ANOVA Method)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding="Gage R&R uses Analysis of Variance (ANOVA) to decompose total measurement variation into its components: Part-to-Part, Repeatability (Equipment), and Reproducibility (Operator + Interaction)." />

          <div className="space-y-4">
            <h4 className="font-medium text-sm">Analysis Process</h4>
            <div className="space-y-3">
              <div className="p-4 rounded-lg border border-border bg-muted/10">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">1</div>
                  <div className="flex-1">
                    <p className="font-medium text-sm mb-1">Data Collection</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Structured measurement study where each of {r.n_operators} operators measures each of {r.n_parts} parts 
                      {r.n_trials} time(s). Total: {r.n_parts * r.n_operators * r.n_trials} measurements.
                    </p>
                    <div className="p-2 rounded bg-muted/30 border border-border">
                      <p className="text-xs text-muted-foreground">
                        <strong>Design:</strong> Crossed design (all operators measure all parts)<br/>
                        <strong>Randomization:</strong> Measurement order should be randomized<br/>
                        <strong>Blinding:</strong> Operators should not see previous measurements
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border bg-muted/10">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">2</div>
                  <div className="flex-1">
                    <p className="font-medium text-sm mb-1">ANOVA Decomposition</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Total variation partitioned into variance components using two-way ANOVA with interaction.
                    </p>
                    <div className="p-2 rounded bg-muted/30 border border-border">
                      <p className="text-xs text-muted-foreground font-mono space-y-1">
                        <strong>Model:</strong> Y_ijk = μ + P_i + O_j + (PO)_ij + ε_ijk<br/>
                        • Y_ijk = Measurement<br/>
                        • μ = Grand mean<br/>
                        • P_i = Part effect<br/>
                        • O_j = Operator effect<br/>
                        • (PO)_ij = Part × Operator interaction<br/>
                        • ε_ijk = Repeatability error
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border bg-muted/10">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">3</div>
                  <div className="flex-1">
                    <p className="font-medium text-sm mb-1">Variance Component Estimation</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Extract variance components from ANOVA mean squares using Expected Mean Squares (EMS) method.
                    </p>
                    <div className="p-2 rounded bg-muted/30 border border-border">
                      <p className="text-xs text-muted-foreground space-y-1">
                        <strong>Repeatability (Equipment):</strong> σ²_Equipment = MS_Equipment<br/>
                        <strong>Reproducibility (Operator):</strong> From MS_Operator and MS_Interaction<br/>
                        <strong>Part-to-Part:</strong> From MS_Part<br/>
                        <strong>Interaction Test:</strong> p = {r.p_interaction.toFixed(4)} {r.p_interaction < 0.25 ? '(significant)' : '(not significant)'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border bg-muted/10">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">4</div>
                  <div className="flex-1">
                    <p className="font-medium text-sm mb-1">Study Variation Calculation</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Convert variance components to study variation using 5.15 multiplier (99% of distribution).
                    </p>
                    <div className="p-2 rounded bg-muted/30 border border-border">
                      <p className="text-xs text-muted-foreground font-mono space-y-1">
                        SV = 5.15 × σ (captures 99% of variation)<br/>
                        %SV = (σ²_component / σ²_total) × 100%<br/>
                        Gage R&R = √(σ²_Repeatability + σ²_Reproducibility)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border bg-muted/10">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">5</div>
                  <div className="flex-1">
                    <p className="font-medium text-sm mb-1">Number of Distinct Categories (NDC)</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Measures ability to distinguish between parts. Higher NDC means finer discrimination.
                    </p>
                    <div className="p-2 rounded bg-muted/30 border border-border">
                      <p className="text-xs text-muted-foreground font-mono space-y-1">
                        NDC = floor(1.41 × √(σ²_Part / σ²_GageRR))<br/>
                        Current NDC: {r.ndc}<br/>
                        {r.ndc >= 5 && 'Excellent: Can detect 5+ distinct levels'}
                        {r.ndc >= 2 && r.ndc < 5 && 'Adequate: Can detect major changes'}
                        {r.ndc < 2 && 'Poor: Cannot adequately discriminate'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <DetailParagraph
            title="Acceptance Criteria (AIAG Standards)"
            detail={`■ Gage R&R % Study Variation
< 10%: Acceptable measurement system
10-30%: Marginal system - may be acceptable depending on:
  • Application criticality
  • Cost of improvement vs. cost of poor quality
  • Impact on decision-making
> 30%: Unacceptable - improvement required before use

■ Number of Distinct Categories (NDC)
≥ 5: Excellent discrimination - suitable for process control
2-4: Adequate discrimination - can detect major changes
< 2: Poor discrimination - cannot distinguish parts effectively

■ % Tolerance (if specification available)
< 10%: Excellent - minimal impact on tolerance
10-30%: Acceptable - some tolerance consumed by measurement
> 30%: Poor - measurement error consumes significant tolerance

■ Component Analysis
Repeatability > Reproducibility:
• Equipment/fixture issues likely
• Check calibration, maintenance
• Review measurement procedure clarity

Reproducibility > Repeatability:
• Operator consistency issues
• Training needed
• Standardize measurement procedure
• Consider fixtures to reduce operator influence

Both High:
• May need new measurement technology
• Consider automated measurement
• Evaluate if resolution is adequate`}
          />

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Improvement Strategies</h4>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">For High Repeatability</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Calibrate measuring equipment</li>
                  <li>• Maintain equipment regularly</li>
                  <li>• Improve fixture stability</li>
                  <li>• Clarify measurement points</li>
                  <li>• Control environment (temp, humidity)</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">For High Reproducibility</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Standardize operator training</li>
                  <li>• Document procedures clearly</li>
                  <li>• Use visual aids/examples</li>
                  <li>• Improve fixtures to reduce skill</li>
                  <li>• Consider automation</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">For Low NDC</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Increase measurement resolution</li>
                  <li>• Use more precise equipment</li>
                  <li>• Reduce Gage R&R variation</li>
                  <li>• Consider different technology</li>
                  <li>• Evaluate if adequate for needs</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">General Best Practices</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Conduct studies annually</li>
                  <li>• Randomize measurement order</li>
                  <li>• Blind operators to readings</li>
                  <li>• Use representative parts</li>
                  <li>• Document all procedures</li>
                </ul>
              </div>
            </div>
          </div>

          <Card className="border-border bg-muted/10">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm mb-2">Important Considerations</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <strong>Part Selection:</strong> Use parts spanning full process range. Gage R&R heavily influenced by part-to-part variation.</li>
                    <li>• <strong>Sample Size:</strong> Minimum 10 parts, 2 operators, 2 trials recommended. More is better for statistical power.</li>
                    <li>• <strong>Operator Selection:</strong> Use regular production operators, not just experts.</li>
                    <li>• <strong>Measurement Conditions:</strong> Replicate actual production measurement conditions.</li>
                    <li>• <strong>Interpretation:</strong> Gage R&R % is relative to observed part variation. Low variation parts naturally show higher Gage R&R %.</li>
                    <li>• <strong>Limitations:</strong> Study assesses current measurement system only. Changes to equipment, procedure, or operators require new study.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(4)}>Back to Summary</Button>
            <Button onClick={() => setCurrentStep(6)} className="gap-2">
              View Full Report <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderStep6Report = () => {
    if (!results) return null;
    const { visualizations, results: r, summary, key_insights } = results;
    const vc = r.variance_components;
    const sv = r.study_variation;
    const assess = r.assessment;

    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b border-border">
          <h1 className="text-xl font-semibold">Gage R&R Analysis Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            ANOVA Method | {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Executive Summary */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Executive Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <MetricCard value={`${summary.pct_gage_rr}%`} label="Gage R&R" highlight status={assess.gage_color} />
              <MetricCard value={summary.ndc} label="NDC" status={assess.ndc_color} />
              <MetricCard value={summary.n_parts} label="Parts" />
              <MetricCard value={summary.n_operators} label="Operators" />
              <MetricCard value={r.n_trials} label="Trials" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Measurement system analysis of {summary.n_parts} parts by {summary.n_operators} operators with {r.n_trials} trial(s) each. 
              Gage R&R of {summary.pct_gage_rr}% is classified as <strong>{summary.status}</strong>. 
              NDC of {summary.ndc} indicates <strong>{assess.ndc_status.toLowerCase()}</strong> discrimination capability.
              {assess.gage_status === 'Acceptable' && ' System is suitable for intended use.'}
              {assess.gage_status === 'Marginal' && ' System may be acceptable depending on application criticality.'}
              {assess.gage_status === 'Unacceptable' && ' System requires improvement before use.'}
            </p>
          </CardContent>
        </Card>

        {/* Key Insights */}
        {key_insights && key_insights.length > 0 && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Key Insights</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {key_insights.map((ins, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${
                  ins.status === "warning" ? "border-border bg-muted/10" :
                  ins.status === "positive" ? "border-primary/30 bg-primary/5" :
                  "border-border bg-muted/10"
                }`}>
                  {ins.status === "warning" ? <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5" /> :
                   ins.status === "positive" ? <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" /> :
                   <Info className="w-4 h-4 text-muted-foreground mt-0.5" />}
                  <div>
                    <p className="font-medium text-sm">{ins.title}</p>
                    <p className="text-sm text-muted-foreground">{ins.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Variance Components Summary */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Variance Components</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">Std Dev</TableHead>
                  <TableHead className="text-right">Study Var (5.15σ)</TableHead>
                  <TableHead className="text-right">% Contribution</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Part-to-Part</TableCell>
                  <TableCell className="text-right font-mono">{vc.part.toFixed(4)}</TableCell>
                  <TableCell className="text-right font-mono">{Math.sqrt(vc.part).toFixed(4)}</TableCell>
                  <TableCell className="text-right font-mono">{(5.15 * Math.sqrt(vc.part)).toFixed(4)}</TableCell>
                  <TableCell className="text-right font-mono">{sv.pct_sv_part.toFixed(1)}%</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Repeatability</TableCell>
                  <TableCell className="text-right font-mono">{vc.repeatability.toFixed(4)}</TableCell>
                  <TableCell className="text-right font-mono">{sv.sd_repeatability.toFixed(4)}</TableCell>
                  <TableCell className="text-right font-mono">{sv.sv_repeatability.toFixed(4)}</TableCell>
                  <TableCell className="text-right font-mono">{sv.pct_sv_repeatability.toFixed(1)}%</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Reproducibility</TableCell>
                  <TableCell className="text-right font-mono">{vc.reproducibility.toFixed(4)}</TableCell>
                  <TableCell className="text-right font-mono">{sv.sd_reproducibility.toFixed(4)}</TableCell>
                  <TableCell className="text-right font-mono">{sv.sv_reproducibility.toFixed(4)}</TableCell>
                  <TableCell className="text-right font-mono">{sv.pct_sv_reproducibility.toFixed(1)}%</TableCell>
                </TableRow>
                <TableRow className="bg-primary/5">
                  <TableCell className="font-bold">Total Gage R&R</TableCell>
                  <TableCell className="text-right font-mono font-bold">{vc.gage_rr.toFixed(4)}</TableCell>
                  <TableCell className="text-right font-mono font-bold">{sv.sd_gage_rr.toFixed(4)}</TableCell>
                  <TableCell className="text-right font-mono font-bold">{sv.sv_gage_rr.toFixed(4)}</TableCell>
                  <TableCell className="text-right font-mono font-bold">{sv.pct_sv_gage_rr.toFixed(1)}%</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Total Variation</TableCell>
                  <TableCell className="text-right font-mono">{vc.total.toFixed(4)}</TableCell>
                  <TableCell className="text-right font-mono">{Math.sqrt(vc.total).toFixed(4)}</TableCell>
                  <TableCell className="text-right font-mono">{(5.15 * Math.sqrt(vc.total)).toFixed(4)}</TableCell>
                  <TableCell className="text-right font-mono">100.0%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Visualizations */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Visualizations</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue={Object.keys(visualizations).find(k => visualizations[k as keyof typeof visualizations])}>
              <TabsList className="mb-4 flex-wrap">
                {visualizations.variance_components && <TabsTrigger value="variance_components" className="text-xs">Components</TabsTrigger>}
                {visualizations.xbar_chart && <TabsTrigger value="xbar_chart" className="text-xs">Xbar Chart</TabsTrigger>}
                {visualizations.range_chart && <TabsTrigger value="range_chart" className="text-xs">Range Chart</TabsTrigger>}
                {visualizations.operator_comparison && <TabsTrigger value="operator_comparison" className="text-xs">Operators</TabsTrigger>}
                {visualizations.part_variation && <TabsTrigger value="part_variation" className="text-xs">Parts</TabsTrigger>}
              </TabsList>
              {Object.entries(visualizations).map(([key, value]) =>
                value && (
                  <TabsContent key={key} value={key}>
                    <div className="relative border border-border rounded-lg overflow-hidden">
                      <img src={`data:image/png;base64,${value}`} alt={key} className="w-full" />
                      <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => handleDownloadPNG(key)}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </TabsContent>
                )
              )}
            </Tabs>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Recommendations
          </CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assess.gage_status === 'Acceptable' && (
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm mb-1">System Ready for Use</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Measurement system is acceptable for intended application</li>
                    <li>• Maintain current calibration and maintenance schedules</li>
                    <li>• Document measurement procedures for consistency</li>
                    <li>• Conduct annual re-qualification studies</li>
                  </ul>
                </div>
              )}
              {assess.gage_status === 'Marginal' && (
                <>
                  <div className="p-3 rounded-lg border border-border bg-muted/10">
                    <p className="font-medium text-sm mb-1">Improvement Recommended</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Evaluate if acceptable for non-critical applications</li>
                      <li>• Consider cost-benefit of improvement measures</li>
                      <li>• Monitor measurement system performance closely</li>
                      <li>• Implement improvements if cost-effective</li>
                    </ul>
                  </div>
                  {sv.pct_sv_repeatability > sv.pct_sv_reproducibility ? (
                    <div className="p-3 rounded-lg border border-border bg-muted/10">
                      <p className="font-medium text-sm mb-1">Focus: Repeatability</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Calibrate measuring equipment</li>
                        <li>• Improve fixture stability and repeatability</li>
                        <li>• Control environmental factors (temperature, humidity)</li>
                        <li>• Clarify measurement procedure and points</li>
                      </ul>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg border border-border bg-muted/10">
                      <p className="font-medium text-sm mb-1">Focus: Reproducibility</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Standardize operator training procedures</li>
                        <li>• Create clear, visual measurement instructions</li>
                        <li>• Improve fixtures to reduce operator influence</li>
                        <li>• Consider measurement automation</li>
                      </ul>
                    </div>
                  )}
                </>
              )}
              {assess.gage_status === 'Unacceptable' && (
                <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                  <p className="font-medium text-sm mb-1">Immediate Action Required</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Do not use system for critical decision-making</li>
                    <li>• Conduct root cause analysis of variation sources</li>
                    <li>• Investigate equipment, procedures, and training</li>
                    <li>• Consider alternative measurement technology</li>
                    <li>• Re-run study after implementing improvements</li>
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Export Options */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Export Options</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(visualizations).map(([key, value]) =>
                value && (
                  <Button key={key} variant="outline" onClick={() => handleDownloadPNG(key)} className="gap-2">
                    <Download className="w-4 h-4" />
                    {key.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </Button>
                )
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setCurrentStep(5)}>Back to Methodology</Button>
          <Button variant="outline" onClick={() => setCurrentStep(1)}>New Analysis</Button>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {currentStep > 1 && (
        <div className="flex justify-end mb-4">
          <Button variant="ghost" size="sm" onClick={() => setShowGuide(true)} className="gap-2">
            <BookOpen className="w-4 h-4" />Guide
          </Button>
        </div>
      )}
      
      {currentStep > 1 && <ProgressBar currentStep={currentStep} hasResults={!!results} onStepClick={setCurrentStep} />}
      {currentStep > 1 && data.length > 0 && <DataPreview data={data} columns={columns} />}
      
      {currentStep === 1 && <IntroPage onLoadSample={handleLoadSample} onFileUpload={handleFileUpload} onShowGuide={() => setShowGuide(true)} />}
      <GageRRGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
      {currentStep === 2 && renderStep2Config()}
      {currentStep === 3 && renderStep3Validation()}
      {currentStep === 4 && renderStep4Summary()}
      {currentStep === 5 && renderStep5Methodology()}
      {currentStep === 6 && renderStep6Report()}
    </div>
  );
}
