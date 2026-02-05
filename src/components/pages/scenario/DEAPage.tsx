"use client";

import React, { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Building2, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle,
  Shield, Info, HelpCircle, FileSpreadsheet, FileText,
  Download, TrendingUp, Settings, Activity, ChevronRight,
  Target, BarChart3, Zap, Award, Medal, Crown,
  ArrowDownRight, ArrowUpRight, Layers, GitCompare,
  Factory, LineChart, PieChart, TrendingDown, Scale
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

// ============ TYPES ============
interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface DMUResult {
  dmu: string;
  dmu_index: number;
  efficiency: number | null;
  is_efficient: boolean;
  rank: number;
  lambdas: number[];
  inputs: { [key: string]: number };
  outputs: { [key: string]: number };
  targets?: {
    target_inputs: number[];
    target_outputs: number[];
    input_reduction: number[];
    output_increase: number[];
  };
  scale_efficiency?: number;
  returns_to_scale?: string;
  super_efficiency?: number;
  status: string;
}

interface DEAResult {
  success: boolean;
  results: {
    dmu_results: DMUResult[];
    summary_stats: {
      total_dmus: number;
      efficient_dmus: number;
      inefficient_dmus: number;
      efficiency_rate: number;
      avg_efficiency: number;
      median_efficiency: number;
      min_efficiency: number;
      max_efficiency: number;
      std_efficiency: number;
    };
    model_info: {
      model_type: string;
      orientation: string;
      n_inputs: number;
      n_outputs: number;
      input_cols: string[];
      output_cols: string[];
    };
  };
  visualizations: {
    efficiency_bar?: string;
    efficiency_distribution?: string;
    frontier?: string;
    input_output_comparison?: string;
    ranking?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    model: string;
    total_dmus: number;
    efficient_dmus: number;
    avg_efficiency: number;
    analysis_date: string;
  };
}

// ============ CONSTANTS ============
const DEA_MODELS = [
  { value: "ccr", label: "CCR Model", desc: "Constant Returns to Scale", icon: Scale },
  { value: "bcc", label: "BCC Model", desc: "Variable Returns to Scale", icon: TrendingUp },
  { value: "super", label: "Super-Efficiency", desc: "Rank efficient DMUs", icon: Crown },
];

const ORIENTATIONS = [
  { value: "input", label: "Input-Oriented", desc: "Minimize inputs" },
  { value: "output", label: "Output-Oriented", desc: "Maximize outputs" },
];

// ============ SAMPLE DATA ============
const generateSampleData = (): DataRow[] => {
  // Sample bank branch efficiency data
  const branches = [
    { name: "Branch_A", employees: 20, operating_cost: 150, deposits: 500, loans: 300, transactions: 1200 },
    { name: "Branch_B", employees: 25, operating_cost: 180, deposits: 600, loans: 400, transactions: 1500 },
    { name: "Branch_C", employees: 15, operating_cost: 120, deposits: 400, loans: 250, transactions: 900 },
    { name: "Branch_D", employees: 30, operating_cost: 220, deposits: 700, loans: 450, transactions: 1800 },
    { name: "Branch_E", employees: 18, operating_cost: 140, deposits: 350, loans: 200, transactions: 800 },
    { name: "Branch_F", employees: 22, operating_cost: 170, deposits: 550, loans: 380, transactions: 1400 },
    { name: "Branch_G", employees: 28, operating_cost: 200, deposits: 650, loans: 420, transactions: 1650 },
    { name: "Branch_H", employees: 12, operating_cost: 100, deposits: 300, loans: 180, transactions: 700 },
    { name: "Branch_I", employees: 35, operating_cost: 250, deposits: 800, loans: 500, transactions: 2000 },
    { name: "Branch_J", employees: 16, operating_cost: 130, deposits: 380, loans: 220, transactions: 850 },
    { name: "Branch_K", employees: 24, operating_cost: 185, deposits: 580, loans: 370, transactions: 1350 },
    { name: "Branch_L", employees: 19, operating_cost: 155, deposits: 420, loans: 280, transactions: 1000 },
    { name: "Branch_M", employees: 32, operating_cost: 230, deposits: 720, loans: 480, transactions: 1900 },
    { name: "Branch_N", employees: 14, operating_cost: 115, deposits: 340, loans: 190, transactions: 780 },
    { name: "Branch_O", employees: 26, operating_cost: 195, deposits: 620, loans: 410, transactions: 1550 },
  ];
  
  return branches.map(b => ({
    dmu_name: b.name,
    employees: b.employees,
    operating_cost: b.operating_cost,
    deposits: b.deposits,
    loans: b.loans,
    transactions: b.transactions
  }));
};

// ============ UTILITY COMPONENTS ============
const MetricCard: React.FC<{ 
  value: string | number; 
  label: string; 
  sublabel?: string;
  negative?: boolean; 
  highlight?: boolean;
  icon?: React.FC<{ className?: string }>;
}> = ({ value, label, sublabel, negative, highlight, icon: Icon }) => (
  <div className={`text-center p-4 rounded-lg border ${
    negative ? 'border-destructive/30 bg-destructive/5' : 
    highlight ? 'border-primary/30 bg-primary/5' : 
    'border-border bg-muted/20'
  }`}>
    {Icon && <Icon className={`w-5 h-5 mx-auto mb-2 ${highlight ? 'text-primary' : negative ? 'text-destructive' : 'text-muted-foreground'}`} />}
    <p className={`text-2xl font-semibold ${negative ? 'text-destructive' : highlight ? 'text-primary' : ''}`}>{value}</p>
    <p className="text-xs text-muted-foreground mt-1">{label}</p>
    {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
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
    a.download = 'dea_source_data.csv'; 
    a.click();
  };
  if (data.length === 0) return null;
  return (
    <div className="mb-6 border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-muted/20">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 hover:text-primary transition-colors">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Data Preview</span>
          <Badge variant="secondary" className="text-xs">{data.length.toLocaleString()} rows × {columns.length} columns</Badge>
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
                {columns.slice(0, 8).map(col => (
                  <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 10).map((row, i) => (
                <TableRow key={i}>
                  {columns.slice(0, 8).map(col => (
                    <TableCell key={col} className="text-xs py-1.5">
                      {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.length > 10 && (
            <p className="text-xs text-muted-foreground p-2 text-center">
              Showing first 10 of {data.length.toLocaleString()} rows
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const ProgressBar: React.FC<{ 
  currentStep: number; 
  hasResults: boolean; 
  onStepClick: (step: number) => void 
}> = ({ currentStep, hasResults, onStepClick }) => {
  const steps = [
    { num: 1, label: "Intro" },
    { num: 2, label: "Config" },
    { num: 3, label: "Validation" },
    { num: 4, label: "Summary" },
    { num: 5, label: "Why" },
    { num: 6, label: "Report" },
  ];
  
  return (
    <div className="flex items-center justify-center gap-0.5 mb-8 flex-wrap">
      {steps.map((step, idx) => {
        const isCompleted = step.num < currentStep;
        const isCurrent = step.num === currentStep;
        const isAccessible = step.num <= 3 || hasResults;
        
        return (
          <React.Fragment key={step.num}>
            <button
              onClick={() => isAccessible && onStepClick(step.num)}
              disabled={!isAccessible}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                isCurrent ? "bg-primary text-primary-foreground" :
                isCompleted ? "bg-primary/10 text-primary" :
                isAccessible ? "bg-muted text-muted-foreground hover:bg-muted/80" :
                "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
              }`}
            >
              {step.label}
            </button>
            {idx < steps.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/30" />}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const EfficiencyBadge: React.FC<{ efficiency: number | null }> = ({ efficiency }) => {
  if (efficiency === null) return <Badge variant="outline">N/A</Badge>;
  
  const isEfficient = efficiency >= 0.9999;
  const isNearEfficient = efficiency >= 0.8;
  
  return (
    <Badge 
      variant={isEfficient ? "default" : "secondary"}
      className={`text-xs ${
        isEfficient ? 'bg-green-500' : 
        isNearEfficient ? 'bg-amber-500' : 
        'bg-red-500 text-white'
      }`}
    >
      {(efficiency * 100).toFixed(1)}%
    </Badge>
  );
};

const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
  const colors: { [key: number]: string } = {
    1: 'bg-yellow-500 text-white',
    2: 'bg-gray-400 text-white',
    3: 'bg-amber-700 text-white',
  };
  
  return (
    <Badge variant="outline" className={`text-xs ${colors[rank] || ''}`}>
      #{rank}
    </Badge>
  );
};

// ============ INTRO PAGE ============
const IntroPage: React.FC<{ 
  onLoadSample: () => void; 
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void 
}> = ({ onLoadSample, onFileUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Building2 className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">DEA Efficiency Analysis</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Measure the relative efficiency of Decision Making Units (DMUs) using Data Envelopment Analysis.
          Identify efficient frontiers, benchmark performance, and find improvement opportunities.
        </p>
      </div>
      
      {/* DEA Models - 3 column grid */}
      <div className="grid md:grid-cols-3 gap-4">
        {DEA_MODELS.map((model) => (
          <div key={model.value} className="p-5 rounded-lg border border-border bg-muted/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <model.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{model.label}</p>
                <p className="text-xs text-muted-foreground">{model.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* When to Use */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-5 h-5 text-primary" />
            When to Use DEA Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary mb-3">Requirements</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "DMU identifier column (branches, units, etc.)",
                  "Input variables (resources used)",
                  "Output variables (results produced)",
                  "At least 3 DMUs recommended",
                ].map((req) => (
                  <li key={req} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-primary mb-3">Results</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Efficiency scores (0-100%)",
                  "Efficient frontier identification",
                  "Input/output targets for improvement",
                  "Benchmarking reference units",
                ].map((res) => (
                  <li key={res} className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {res}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Action buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={onLoadSample} className="gap-2">
              <Activity className="w-4 h-4" />
              Load Sample Data
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
              <Upload className="w-4 h-4" />
              Upload Your Data
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={onFileUpload}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ============ MAIN COMPONENT ============
export default function DEAAnalysisPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<DEAResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Configuration
  const [dmuCol, setDmuCol] = useState<string>("");
  const [inputCols, setInputCols] = useState<string[]>([]);
  const [outputCols, setOutputCols] = useState<string[]>([]);
  const [modelType, setModelType] = useState<string>("ccr");
  const [orientation, setOrientation] = useState<string>("input");

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    const cols = Object.keys(sampleData[0]);
    setColumns(cols);
    setDmuCol("dmu_name");
    setInputCols(["employees", "operating_cost"]);
    setOutputCols(["deposits", "loans", "transactions"]);
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

  const toggleInputCol = (col: string) => {
    setInputCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
    setOutputCols(prev => prev.filter(c => c !== col));
  };

  const toggleOutputCol = (col: string) => {
    setOutputCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
    setInputCols(prev => prev.filter(c => c !== col));
  };

  const numericColumns = columns.filter(col => {
    if (col === dmuCol) return false;
    const sample = data[0]?.[col];
    return typeof sample === "number" || !isNaN(Number(sample));
  });

  const getValidationChecks = useCallback((): ValidationCheck[] => {
    return [
      { name: "Data Loaded", passed: data.length > 0, message: data.length > 0 ? `${data.length} DMUs loaded` : "No data loaded" },
      { name: "DMU Column", passed: !!dmuCol, message: dmuCol ? `Using: ${dmuCol}` : "Select DMU identifier column" },
      { name: "Input Variables", passed: inputCols.length >= 1, message: inputCols.length >= 1 ? `${inputCols.length} inputs selected` : "Select at least 1 input" },
      { name: "Output Variables", passed: outputCols.length >= 1, message: outputCols.length >= 1 ? `${outputCols.length} outputs selected` : "Select at least 1 output" },
      { name: "Sufficient DMUs", passed: data.length >= 3, message: data.length >= 3 ? `${data.length} DMUs (OK)` : "Need at least 3 DMUs" },
    ];
  }, [data, dmuCol, inputCols, outputCols]);

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const payload = { data, dmu_col: dmuCol, input_cols: inputCols, output_cols: outputCols, model_type: modelType, orientation };
      const res = await fetch(`${FASTAPI_URL}/api/analysis/dea-efficiency`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Analysis failed");
      }
      const result: DEAResult = await res.json();
      setResults(result);
      setCurrentStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!results) return;
    const dmuResults = results.results.dmu_results;
    const headers = ['DMU', 'Efficiency', 'Rank', 'Is_Efficient', ...inputCols, ...outputCols];
    const rows = dmuResults.map(r => [r.dmu, r.efficiency?.toFixed(4) || '', r.rank, r.is_efficient ? 'Yes' : 'No', ...inputCols.map(col => r.inputs[col]), ...outputCols.map(col => r.outputs[col])].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'dea_results.csv';
    a.click();
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const base64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!base64) return;
    const a = document.createElement('a');
    a.href = `data:image/png;base64,${base64}`;
    a.download = `dea_${chartKey}.png`;
    a.click();
  };

  // ============ STEP 2: CONFIG ============
  const renderStep2Config = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Settings className="w-5 h-5 text-primary" />Configure DEA Analysis</CardTitle>
        <CardDescription>Set up DMU, inputs, outputs, and model parameters</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2"><Target className="w-4 h-4 text-primary" />DEA Model</h4>
          <div className="grid md:grid-cols-3 gap-3">
            {DEA_MODELS.map((model) => (
              <button key={model.value} onClick={() => setModelType(model.value)}
                className={`p-4 rounded-lg border text-left transition-all ${modelType === model.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                <model.icon className="w-5 h-5 text-primary mb-2" />
                <p className="font-medium text-sm">{model.label}</p>
                <p className="text-xs text-muted-foreground">{model.desc}</p>
              </button>
            ))}
          </div>
        </div>
        <Separator />
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2"><GitCompare className="w-4 h-4 text-primary" />Orientation</h4>
          <div className="grid md:grid-cols-2 gap-3">
            {ORIENTATIONS.map((orient) => (
              <button key={orient.value} onClick={() => setOrientation(orient.value)}
                className={`p-4 rounded-lg border text-left transition-all ${orientation === orient.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                {orient.value === 'input' ? <ArrowDownRight className="w-5 h-5 text-primary mb-2" /> : <ArrowUpRight className="w-5 h-5 text-primary mb-2" />}
                <p className="font-medium text-sm">{orient.label}</p>
                <p className="text-xs text-muted-foreground">{orient.desc}</p>
              </button>
            ))}
          </div>
        </div>
        <Separator />
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" />DMU Identifier</h4>
          <Select value={dmuCol || "__none__"} onValueChange={v => setDmuCol(v === "__none__" ? "" : v)}>
            <SelectTrigger className="w-full md:w-1/2"><SelectValue placeholder="Select DMU column..." /></SelectTrigger>
            <SelectContent><SelectItem value="__none__">-- Select --</SelectItem>{columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Separator />
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2"><ArrowDownRight className="w-4 h-4 text-red-500" />Input Variables<Badge variant="secondary" className="text-xs">{inputCols.length} selected</Badge></h4>
            <div className="space-y-2 p-3 border rounded-lg bg-muted/10 max-h-48 overflow-y-auto">
              {numericColumns.map((col) => (
                <div key={col} className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted/50 ${inputCols.includes(col) ? "bg-red-500/10 border border-red-500/30" : ""}`} onClick={() => toggleInputCol(col)}>
                  <Checkbox checked={inputCols.includes(col)} /><span className="text-sm">{col}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2"><ArrowUpRight className="w-4 h-4 text-green-500" />Output Variables<Badge variant="secondary" className="text-xs">{outputCols.length} selected</Badge></h4>
            <div className="space-y-2 p-3 border rounded-lg bg-muted/10 max-h-48 overflow-y-auto">
              {numericColumns.map((col) => (
                <div key={col} className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted/50 ${outputCols.includes(col) ? "bg-green-500/10 border border-green-500/30" : ""}`} onClick={() => toggleOutputCol(col)}>
                  <Checkbox checked={outputCols.includes(col)} /><span className="text-sm">{col}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end pt-4"><Button onClick={() => setCurrentStep(3)} className="gap-2">Continue to Validation<ArrowRight className="w-4 h-4" /></Button></div>
      </CardContent>
    </Card>
  );

  // ============ STEP 3: VALIDATION ============
  const renderStep3Validation = () => {
    const checks = getValidationChecks();
    const canRun = checks.every(c => c.passed);
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Shield className="w-5 h-5 text-primary" />Data Validation</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            {checks.map((check, idx) => (
              <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${check.passed ? 'border-border' : 'border-destructive/30 bg-destructive/5'}`}>
                <div className="flex items-center gap-3">
                  {check.passed ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <XCircle className="w-5 h-5 text-destructive" />}
                  <div><p className="font-medium text-sm">{check.name}</p><p className="text-xs text-muted-foreground">{check.message}</p></div>
                </div>
                <Badge variant={check.passed ? "secondary" : "destructive"} className="text-xs">{check.passed ? "Pass" : "Warning"}</Badge>
              </div>
            ))}
          </div>
          <div className="p-4 rounded-lg border border-border bg-muted/10">
            <div className="flex items-start gap-2"><Info className="w-5 h-5 text-primary mt-0.5" />
              <div className="text-sm"><p className="font-medium">Configuration Summary</p>
                <p className="text-muted-foreground">{`Model: ${DEA_MODELS.find(m => m.value === modelType)?.label} • Orientation: ${orientation} • Inputs: ${inputCols.join(', ')} • Outputs: ${outputCols.join(', ')}`}</p>
              </div>
            </div>
          </div>
          {error && <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5"><div className="flex items-start gap-2"><AlertCircle className="w-5 h-5 text-destructive mt-0.5" /><p className="text-sm text-destructive">{error}</p></div></div>}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(2)}>Back to Config</Button>
            <Button onClick={runAnalysis} disabled={loading || !canRun} className="gap-2">
              {loading ? <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Analyzing...</> : <>Run DEA Analysis<ArrowRight className="w-4 h-4" /></>}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ============ STEP 4: SUMMARY ============
  const renderStep4Summary = () => {
    if (!results) return null;
    const { summary, results: r, key_insights } = results;
    const stats = r.summary_stats;
    const finding = `${stats.efficient_dmus} out of ${stats.total_dmus} DMUs (${stats.efficiency_rate.toFixed(1)}%) are efficient. Average efficiency: ${(stats.avg_efficiency * 100).toFixed(1)}%. ${stats.inefficient_dmus > 0 ? `${stats.inefficient_dmus} DMUs have improvement opportunities.` : 'All DMUs are operating efficiently.'}`;
    const efficientDMUs = r.dmu_results.filter(d => d.is_efficient);
    const inefficientDMUs = r.dmu_results.filter(d => !d.is_efficient).sort((a, b) => (b.efficiency || 0) - (a.efficiency || 0));

    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Activity className="w-5 h-5 text-primary" />DEA Analysis Results</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={stats.total_dmus} label="Total DMUs" icon={Building2} />
            <MetricCard value={stats.efficient_dmus} label="Efficient DMUs" icon={Award} highlight />
            <MetricCard value={`${(stats.avg_efficiency * 100).toFixed(1)}%`} label="Avg Efficiency" icon={BarChart3} highlight={stats.avg_efficiency >= 0.8} />
            <MetricCard value={`${stats.efficiency_rate.toFixed(1)}%`} label="Efficiency Rate" icon={Target} highlight={stats.efficiency_rate >= 30} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={`${(stats.min_efficiency * 100).toFixed(1)}%`} label="Min Efficiency" negative={stats.min_efficiency < 0.5} />
            <MetricCard value={`${(stats.max_efficiency * 100).toFixed(1)}%`} label="Max Efficiency" />
            <MetricCard value={`${(stats.median_efficiency * 100).toFixed(1)}%`} label="Median Efficiency" />
            <MetricCard value={`${(stats.std_efficiency * 100).toFixed(1)}%`} label="Std Deviation" />
          </div>
          {efficientDMUs.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2"><Crown className="w-4 h-4 text-primary" />Efficient DMUs (Frontier)</h4>
              <div className="grid md:grid-cols-4 gap-3">
                {efficientDMUs.slice(0, 8).map((dmu) => (
                  <div key={dmu.dmu} className="p-3 rounded-lg border border-green-500/30 bg-green-500/5">
                    <div className="flex items-center justify-between mb-1"><span className="font-medium text-sm truncate">{dmu.dmu}</span><RankBadge rank={dmu.rank} /></div>
                    <EfficiencyBadge efficiency={dmu.efficiency} />
                  </div>
                ))}
              </div>
            </div>
          )}
          {inefficientDMUs.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2"><TrendingDown className="w-4 h-4 text-amber-500" />Inefficient DMUs</h4>
              <div className="grid md:grid-cols-4 gap-3">
                {inefficientDMUs.slice(0, 8).map((dmu) => (
                  <div key={dmu.dmu} className={`p-3 rounded-lg border ${(dmu.efficiency || 0) >= 0.8 ? 'border-amber-500/30 bg-amber-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                    <div className="flex items-center justify-between mb-1"><span className="font-medium text-sm truncate">{dmu.dmu}</span><RankBadge rank={dmu.rank} /></div>
                    <EfficiencyBadge efficiency={dmu.efficiency} />
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Key Insights</h4>
            {key_insights.map((insight, idx) => (
              <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${insight.status === "positive" ? "border-primary/30 bg-primary/5" : insight.status === "warning" ? "border-destructive/30 bg-destructive/5" : "border-border bg-muted/10"}`}>
                {insight.status === "positive" ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> : insight.status === "warning" ? <AlertCircle className="w-5 h-5 text-destructive shrink-0" /> : <Info className="w-5 h-5 text-muted-foreground shrink-0" />}
                <div><p className="font-medium text-sm">{insight.title}</p><p className="text-sm text-muted-foreground">{insight.description}</p></div>
              </div>
            ))}
          </div>
          <DetailParagraph title="Summary Interpretation" detail={`DEA analysis using ${r.model_info.model_type} model (${r.model_info.orientation}-oriented).

■ Model Configuration
• Model: ${r.model_info.model_type} (${r.model_info.model_type === 'CCR' ? 'Constant Returns to Scale' : 'Variable Returns to Scale'})
• Orientation: ${r.model_info.orientation === 'input' ? 'Input-oriented (minimize inputs)' : 'Output-oriented (maximize outputs)'}
• Inputs: ${r.model_info.input_cols.join(', ')}
• Outputs: ${r.model_info.output_cols.join(', ')}

■ Efficiency Distribution
• Efficient: ${stats.efficient_dmus} (${stats.efficiency_rate.toFixed(1)}%)
• Inefficient: ${stats.inefficient_dmus} (${(100 - stats.efficiency_rate).toFixed(1)}%)
• Average: ${(stats.avg_efficiency * 100).toFixed(2)}%
• Range: ${(stats.min_efficiency * 100).toFixed(2)}% - ${(stats.max_efficiency * 100).toFixed(2)}%

${stats.efficiency_rate >= 30 ? '✓ High efficiency rate indicates good overall performance.' : '⚠️ Low efficiency rate suggests significant improvement opportunities.'}`} />
          <div className="flex justify-end pt-4"><Button onClick={() => setCurrentStep(5)} className="gap-2">Understand Results<ArrowRight className="w-4 h-4" /></Button></div>
        </CardContent>
      </Card>
    );
  };

  // Continue in Part 3...

  // ============ STEP 5: WHY ============
  const renderStep5Why = () => {
    if (!results) return null;
    const { results: r } = results;
    const inefficientDMUs = r.dmu_results.filter(d => !d.is_efficient && d.targets);

    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><HelpCircle className="w-5 h-5 text-primary" />Understanding DEA Results</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding="DEA measures relative efficiency by comparing each DMU to the best performers (efficient frontier). Efficient DMUs (100%) are benchmarks; inefficient DMUs have specific improvement targets." />
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Key Concepts</h4>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { num: 1, title: "Efficiency Score", content: "Ranges from 0% to 100%. Score of 100% means the DMU is on the efficient frontier - no other DMU can produce the same outputs with fewer inputs (or more outputs with same inputs)." },
                { num: 2, title: "Efficient Frontier", content: "The 'envelope' formed by efficient DMUs. All other DMUs are measured relative to this frontier. The frontier represents best practices." },
                { num: 3, title: "Reference Set (Peers)", content: "For inefficient DMUs, the efficient DMUs used as benchmarks. Lambda values (λ) indicate how much each peer contributes to the target." },
                { num: 4, title: "Targets & Slacks", content: "Targets show what an inefficient DMU should achieve to become efficient. Slacks represent additional improvements beyond proportional reduction/increase." },
              ].map((exp) => (
                <div key={exp.num} className="p-4 rounded-lg border border-border bg-muted/10">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">{exp.num}</div>
                    <div><p className="font-medium text-sm">{exp.title}</p><p className="text-xs text-muted-foreground mt-1 leading-relaxed">{exp.content}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Model Comparison</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Returns to Scale</TableHead>
                  <TableHead>Use Case</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className={r.model_info.model_type === 'CCR' ? 'bg-primary/5' : ''}>
                  <TableCell className="font-medium">CCR</TableCell>
                  <TableCell>Constant (CRS)</TableCell>
                  <TableCell>All DMUs operate at optimal scale</TableCell>
                </TableRow>
                <TableRow className={r.model_info.model_type === 'BCC' ? 'bg-primary/5' : ''}>
                  <TableCell className="font-medium">BCC</TableCell>
                  <TableCell>Variable (VRS)</TableCell>
                  <TableCell>DMUs may operate at different scales</TableCell>
                </TableRow>
                <TableRow className={r.model_info.model_type === 'SUPER' ? 'bg-primary/5' : ''}>
                  <TableCell className="font-medium">Super-Efficiency</TableCell>
                  <TableCell>Depends on base</TableCell>
                  <TableCell>Rank efficient DMUs (scores &gt; 100%)</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {inefficientDMUs.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Improvement Targets (Sample)</h4>
                <div className="space-y-3">
                  {inefficientDMUs.slice(0, 3).map((dmu) => (
                    <div key={dmu.dmu} className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium">{dmu.dmu}</span>
                        <EfficiencyBadge efficiency={dmu.efficiency} />
                      </div>
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Input Reductions Needed:</p>
                          {r.model_info.input_cols.map((col, i) => (
                            <p key={col} className="text-red-600">
                              {col}: {dmu.targets?.input_reduction[i]?.toFixed(1)}% reduction
                            </p>
                          ))}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Current → Target:</p>
                          {r.model_info.input_cols.map((col, i) => (
                            <p key={col}>
                              {col}: {dmu.inputs[col]?.toFixed(1)} → {dmu.targets?.target_inputs[i]?.toFixed(1)}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <DetailParagraph title="Interpretation Guide" detail={`■ Reading Efficiency Scores

• 100% (Efficient): DMU is on the frontier. It's a benchmark for others.
• 80-99%: Near-efficient. Minor improvements needed.
• 50-79%: Moderately inefficient. Significant improvement potential.
• Below 50%: Highly inefficient. Major restructuring may be needed.

■ ${r.model_info.orientation === 'input' ? 'Input-Oriented' : 'Output-Oriented'} Interpretation

${r.model_info.orientation === 'input' 
  ? `An efficiency score of 80% means:
- The DMU uses 100% of its current inputs
- But only 80% would be needed to produce the same outputs
- It should reduce ALL inputs by 20% proportionally`
  : `An efficiency score of 80% means:
- The DMU produces 80% of what it could
- With the same inputs, it should produce 125% more outputs
- Focus on increasing all outputs proportionally`}

■ Using Reference Sets (Peers)

Each inefficient DMU has efficient peers (λ > 0). To improve:
1. Identify which efficient DMUs are your peers
2. Study their practices and processes
3. Lambda values indicate importance (higher = more relevant peer)
4. Create a "virtual" best-practice target as weighted combination

■ Action Priorities

1. Focus on DMUs with lowest efficiency first (highest ROI)
2. Compare inefficient DMUs to their specific peers
3. Look for patterns - are certain inputs consistently over-used?
4. Consider if CCR vs BCC gives different results (scale effects)`} />

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(4)}>Back to Summary</Button>
            <Button onClick={() => setCurrentStep(6)} className="gap-2">View Full Report<ArrowRight className="w-4 h-4" /></Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ============ STEP 6: REPORT ============
  const renderStep6Report = () => {
    if (!results) return null;
    const { summary, results: r, key_insights, visualizations } = results;
    const stats = r.summary_stats;

    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b border-border">
          <h1 className="text-xl font-semibold">DEA Efficiency Report</h1>
          <p className="text-sm text-muted-foreground mt-1">{summary.model} | {summary.total_dmus} DMUs | {summary.analysis_date}</p>
        </div>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Executive Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MetricCard value={stats.efficient_dmus} label="Efficient DMUs" highlight />
              <MetricCard value={`${stats.efficiency_rate.toFixed(1)}%`} label="Efficiency Rate" />
              <MetricCard value={`${(stats.avg_efficiency * 100).toFixed(1)}%`} label="Avg Efficiency" />
              <MetricCard value={`${(stats.min_efficiency * 100).toFixed(1)}%`} label="Min Efficiency" negative={stats.min_efficiency < 0.5} />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              DEA analysis evaluated {stats.total_dmus} DMUs using the {r.model_info.model_type} model ({r.model_info.orientation}-oriented).
              {stats.efficient_dmus} DMUs ({stats.efficiency_rate.toFixed(1)}%) achieved full efficiency, forming the efficient frontier.
              Average efficiency is {(stats.avg_efficiency * 100).toFixed(1)}%, ranging from {(stats.min_efficiency * 100).toFixed(1)}% to {(stats.max_efficiency * 100).toFixed(1)}%.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Key Insights</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {key_insights.map((ins, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${ins.status === "warning" ? "border-destructive/30 bg-destructive/5" : ins.status === "positive" ? "border-primary/30 bg-primary/5" : "border-border bg-muted/10"}`}>
                {ins.status === "warning" ? <AlertCircle className="w-4 h-4 text-destructive mt-0.5" /> : ins.status === "positive" ? <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" /> : <Info className="w-4 h-4 text-muted-foreground mt-0.5" />}
                <div><p className="font-medium text-sm">{ins.title}</p><p className="text-sm text-muted-foreground">{ins.description}</p></div>
              </div>
            ))}
          </CardContent>
        </Card>

        {visualizations && Object.keys(visualizations).some(k => visualizations[k as keyof typeof visualizations]) && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Visualizations</CardTitle></CardHeader>
            <CardContent>
              <Tabs defaultValue={Object.keys(visualizations).find(k => visualizations[k as keyof typeof visualizations])}>
                <TabsList className="mb-4 flex-wrap">
                  {visualizations.efficiency_bar && <TabsTrigger value="efficiency_bar" className="text-xs">Efficiency Scores</TabsTrigger>}
                  {visualizations.efficiency_distribution && <TabsTrigger value="efficiency_distribution" className="text-xs">Distribution</TabsTrigger>}
                  {visualizations.frontier && <TabsTrigger value="frontier" className="text-xs">Frontier</TabsTrigger>}
                  {visualizations.ranking && <TabsTrigger value="ranking" className="text-xs">Ranking</TabsTrigger>}
                  {visualizations.input_output_comparison && <TabsTrigger value="input_output_comparison" className="text-xs">Comparison</TabsTrigger>}
                </TabsList>
                {Object.entries(visualizations).map(([key, value]) => value && (
                  <TabsContent key={key} value={key}>
                    <div className="relative border border-border rounded-lg overflow-hidden">
                      <img src={`data:image/png;base64,${value}`} alt={key} className="w-full" />
                      <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => handleDownloadPNG(key)}><Download className="w-4 h-4" /></Button>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">DMU Results</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>DMU</TableHead>
                  <TableHead className="text-right">Efficiency</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  {r.model_info.input_cols.slice(0, 2).map(col => <TableHead key={col} className="text-right">{col}</TableHead>)}
                  {r.model_info.output_cols.slice(0, 2).map(col => <TableHead key={col} className="text-right">{col}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.dmu_results.sort((a, b) => a.rank - b.rank).slice(0, 15).map((dmu) => (
                  <TableRow key={dmu.dmu} className={dmu.is_efficient ? 'bg-green-500/5' : ''}>
                    <TableCell><RankBadge rank={dmu.rank} /></TableCell>
                    <TableCell className="font-medium">{dmu.dmu}</TableCell>
                    <TableCell className="text-right"><EfficiencyBadge efficiency={dmu.efficiency} /></TableCell>
                    <TableCell className="text-center">{dmu.is_efficient ? <Badge variant="default" className="bg-green-500 text-xs">Efficient</Badge> : <Badge variant="secondary" className="text-xs">Inefficient</Badge>}</TableCell>
                    {r.model_info.input_cols.slice(0, 2).map(col => <TableCell key={col} className="text-right">{dmu.inputs[col]?.toLocaleString()}</TableCell>)}
                    {r.model_info.output_cols.slice(0, 2).map(col => <TableCell key={col} className="text-right">{dmu.outputs[col]?.toLocaleString()}</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {r.dmu_results.length > 15 && <p className="text-xs text-muted-foreground mt-2 text-center">Showing top 15 of {r.dmu_results.length} DMUs</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Export</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleDownloadCSV} className="gap-2"><FileSpreadsheet className="w-4 h-4" />CSV (All Results)</Button>
              {Object.entries(visualizations || {}).map(([key, value]) => value && (
                <Button key={key} variant="outline" onClick={() => handleDownloadPNG(key)} className="gap-2"><Download className="w-4 h-4" />{key.replace(/_/g, ' ')}</Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setCurrentStep(5)}>Back</Button>
          <Button variant="outline" onClick={() => setCurrentStep(1)}>New Analysis</Button>
        </div>
      </div>
    );
  };

  // ============ RENDER ============
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {currentStep > 1 && (
        <div className="flex justify-end mb-4">
          <Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)} className="gap-2"><HelpCircle className="w-4 h-4" />Help</Button>
        </div>
      )}
      {currentStep > 1 && <ProgressBar currentStep={currentStep} hasResults={!!results} onStepClick={setCurrentStep} />}
      {currentStep > 1 && data.length > 0 && <DataPreview data={data} columns={columns} />}
      {currentStep === 1 && <IntroPage onLoadSample={handleLoadSample} onFileUpload={handleFileUpload} />}
      {currentStep === 2 && renderStep2Config()}
      {currentStep === 3 && renderStep3Validation()}
      {currentStep === 4 && renderStep4Summary()}
      {currentStep === 5 && renderStep5Why()}
      {currentStep === 6 && renderStep6Report()}
    </div>
  );
}