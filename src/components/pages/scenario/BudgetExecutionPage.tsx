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
import { Slider } from "@/components/ui/slider";
import {
  MapPin, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle,
  Shield, Info, HelpCircle, FileSpreadsheet, FileText, Download,
  TrendingUp, Settings, Activity, AlertTriangle, ChevronRight, Target,
  BarChart3, Calendar, DollarSign, PieChart, ArrowUpRight, ArrowDownRight, Percent,
  Users, Building, Landmark, Calculator, Clock, BookOpen,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

// ============================================================
// Statistical Terms Glossary for Regional Budget Execution Analysis
// ============================================================
const budgetTermDefinitions: Record<string, string> = {
  "Budget Execution Rate": "The percentage of allocated budget that has been actually spent. Calculated as (Executed Amount / Allocated Budget) × 100. Higher rates indicate better budget utilization.",
  "Allocated Budget": "The total amount of funds officially assigned to a region or department for a specific fiscal period. Represents planned spending capacity.",
  "Executed Amount": "The actual amount of budget that has been spent or committed. Reflects real expenditure against the allocated budget.",
  "Carryover Budget": "Unspent funds from previous fiscal periods that are transferred to the current period. May indicate planning issues or project delays.",
  "Supplementary Budget": "Additional budget allocated during the fiscal year beyond the original allocation. Often used for emergencies or new priorities.",
  "Fiscal Year": "The 12-month period used for government accounting and budgeting. May differ from calendar year depending on jurisdiction.",
  "Budget Variance": "The difference between planned (allocated) and actual (executed) budget amounts. Positive variance means underspending; negative means overspending.",
  "Execution Efficiency": "A measure of how effectively budget resources are converted into outputs or outcomes. Considers both spending rate and results achieved.",
  "Per Capita Spending": "Budget execution divided by population. Allows fair comparison across regions with different population sizes.",
  "Regional Disparity": "Differences in budget allocation or execution across geographic regions. High disparity may indicate inequitable resource distribution.",
  "Benchmark Comparison": "Comparing a region's performance against a standard, average, or best-performing peer. Helps identify improvement opportunities.",
  "Year-over-Year (YoY) Change": "The percentage change in a metric compared to the same period in the previous year. Shows trends and growth patterns.",
  "Quarter-over-Quarter (QoQ)": "Comparison of metrics between consecutive fiscal quarters. Useful for tracking seasonal patterns and short-term trends.",
  "Budget Category": "Classification of budget items by function (e.g., education, healthcare, infrastructure). Enables sector-specific analysis.",
  "Capital Expenditure (CapEx)": "Budget spent on long-term assets like buildings, equipment, and infrastructure. Typically has multi-year impact.",
  "Operating Expenditure (OpEx)": "Budget spent on day-to-day operations including salaries, utilities, and supplies. Recurring annual costs.",
  "Commitment Rate": "Percentage of budget that has been legally committed through contracts or orders, even if not yet paid. Leading indicator of execution.",
  "Absorption Capacity": "A region's ability to effectively spend allocated funds. Low absorption may indicate administrative or planning constraints.",
  "Fund Utilization": "How well available funds are being used for intended purposes. Considers both quantity (rate) and quality (outcomes) of spending.",
  "Disbursement": "The actual release or payment of funds from the treasury to implementing agencies or beneficiaries.",
  "Budget Lapse": "Allocated funds that expire unused at the end of the fiscal period. Represents lost spending opportunity.",
  "Reallocation": "Transfer of budget from one category, project, or region to another. May require administrative or legislative approval.",
  "Performance-Based Budgeting": "Budget allocation linked to expected outputs and outcomes rather than just inputs. Promotes accountability and efficiency.",
  "Zero-Based Budgeting": "Budgeting approach requiring justification of all expenses from zero each period, rather than incremental adjustments.",
  "Fiscal Decentralization": "Transfer of budget authority and resources from central to regional or local governments. Affects regional budget autonomy."
};

interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface RegionMetric {
  region: string;
  allocated_budget: number;
  executed_amount: number;
  execution_rate: number;
  population: number | null;
  per_capita_spending: number | null;
  yoy_change: number | null;
  rank: number;
  category_breakdown: { [key: string]: number };
}

interface CategoryAnalysis {
  category: string;
  total_allocated: number;
  total_executed: number;
  execution_rate: number;
  top_region: string;
  bottom_region: string;
}

interface BudgetResult {
  success: boolean;
  regional_analysis: {
    regions: RegionMetric[];
    total_allocated: number;
    total_executed: number;
    overall_execution_rate: number;
    disparity_index: number;
  };
  category_analysis: CategoryAnalysis[];
  temporal_analysis: {
    periods: string[];
    execution_rates: { [region: string]: number[] };
    overall_trend: number[];
  };
  benchmark_analysis: {
    average_execution_rate: number;
    median_execution_rate: number;
    std_deviation: number;
    above_average_regions: string[];
    below_average_regions: string[];
  };
  visualizations: {
    regional_comparison?: string;
    execution_heatmap?: string;
    category_breakdown?: string;
    temporal_trend?: string;
    disparity_chart?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    n_regions: number;
    n_categories: number;
    fiscal_period: string;
    total_allocated: number;
    total_executed: number;
    overall_execution_rate: number;
    best_performing_region: string;
    worst_performing_region: string;
    disparity_index: number;
  };
}

const ANALYSIS_TYPES = [
  { value: "execution_rate", label: "Execution Rate Analysis", desc: "Compare budget execution rates across regions" },
  { value: "per_capita", label: "Per Capita Analysis", desc: "Normalize by population for fair comparison" },
  { value: "category", label: "Category Breakdown", desc: "Analyze by budget categories" },
  { value: "temporal", label: "Temporal Trends", desc: "Track changes over time periods" },
];

const BENCHMARK_OPTIONS = [
  { value: "national_average", label: "National Average", desc: "Compare against national mean" },
  { value: "top_performer", label: "Top Performer", desc: "Compare against best region" },
  { value: "target", label: "Target Rate", desc: "Compare against specified target" },
];

const generateSampleData = (): DataRow[] => {
  const data: DataRow[] = [];
  const regions = [
    "Seoul", "Busan", "Incheon", "Daegu", "Daejeon", 
    "Gwangju", "Ulsan", "Sejong", "Gyeonggi", "Gangwon",
    "Chungbuk", "Chungnam", "Jeonbuk", "Jeonnam", "Gyeongbuk", 
    "Gyeongnam", "Jeju"
  ];
  const categories = ["Education", "Healthcare", "Infrastructure", "Welfare", "Administration", "Culture"];
  const periods = ["2023-Q1", "2023-Q2", "2023-Q3", "2023-Q4", "2024-Q1", "2024-Q2"];
  const populations: { [key: string]: number } = {
    "Seoul": 9700000, "Busan": 3400000, "Incheon": 2900000, "Daegu": 2400000,
    "Daejeon": 1500000, "Gwangju": 1400000, "Ulsan": 1100000, "Sejong": 380000,
    "Gyeonggi": 13500000, "Gangwon": 1500000, "Chungbuk": 1600000, "Chungnam": 2100000,
    "Jeonbuk": 1800000, "Jeonnam": 1800000, "Gyeongbuk": 2600000, "Gyeongnam": 3300000, "Jeju": 670000
  };

  for (const region of regions) {
    for (const period of periods) {
      for (const category of categories) {
        const baseAllocation = 10000000000 + Math.random() * 50000000000; // 100억 ~ 600억
        const executionRate = 0.6 + Math.random() * 0.35; // 60% ~ 95%
        const executed = baseAllocation * executionRate;
        
        // Add some regional variation
        const regionalFactor = region === "Seoul" || region === "Gyeonggi" ? 1.5 : 
                              region === "Sejong" ? 0.7 : 1.0;
        
        data.push({
          region,
          period,
          category,
          population: populations[region],
          allocated_budget: Math.round(baseAllocation * regionalFactor),
          executed_amount: Math.round(executed * regionalFactor),
          carryover: Math.round(Math.random() * 1000000000),
          supplementary: Math.round(Math.random() * 500000000),
          commitment_rate: parseFloat((executionRate + 0.05).toFixed(3)),
        });
      }
    }
  }
  return data;
};

// ============================================================
// Reusable UI Components
// ============================================================

const GlossaryModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Budget Execution Analysis Glossary
          </DialogTitle>
          <DialogDescription>
            Definitions of budget and fiscal management terms
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-4">
            {Object.entries(budgetTermDefinitions).map(([term, definition]) => (
              <div key={term} className="border-b pb-3">
                <h4 className="font-semibold">{term}</h4>
                <p className="text-sm text-muted-foreground mt-1">{definition}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

const MetricCard: React.FC<{ value: string | number; label: string; icon?: React.FC<{ className?: string }>; highlight?: boolean; warning?: boolean }> = ({ value, label, icon: Icon, highlight, warning }) => (
  <div className={`text-center p-4 rounded-lg border ${warning ? 'border-destructive/30 bg-destructive/5' : highlight ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/20'}`}>
    {Icon && <Icon className={`w-5 h-5 mx-auto mb-2 ${warning ? 'text-destructive' : highlight ? 'text-primary' : 'text-muted-foreground'}`} />}
    <p className={`text-2xl font-semibold ${warning ? 'text-destructive' : highlight ? 'text-primary' : ''}`}>{value}</p>
    <p className="text-xs text-muted-foreground mt-1">{label}</p>
  </div>
);

const FindingBox: React.FC<{ finding: string; status?: "positive" | "warning" | "neutral" }> = ({ finding, status = "neutral" }) => (
  <div className={`border rounded-lg p-4 mb-6 ${status === "positive" ? "bg-primary/5 border-primary/20" : status === "warning" ? "bg-destructive/5 border-destructive/20" : "bg-muted/10 border-border"}`}>
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
          <Badge variant="secondary" className="text-xs">{data.length} records</Badge>
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>
      </div>
      {expanded && (
        <div className="max-h-64 overflow-auto">
          <Table>
            <TableHeader><TableRow>{columns.slice(0, 8).map(col => <TableHead key={col} className="text-xs">{col}</TableHead>)}</TableRow></TableHeader>
            <TableBody>{data.slice(0, 8).map((row, i) => <TableRow key={i}>{columns.slice(0, 8).map(col => <TableCell key={col} className="text-xs py-1.5">{row[col] !== null ? String(row[col]) : '-'}</TableCell>)}</TableRow>)}</TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

const ProgressBar: React.FC<{ currentStep: number; hasResults: boolean; onStepClick: (step: number) => void }> = ({ currentStep, hasResults, onStepClick }) => {
  const steps = [{ num: 1, label: "Intro" }, { num: 2, label: "Config" }, { num: 3, label: "Validation" }, { num: 4, label: "Summary" }, { num: 5, label: "Why" }, { num: 6, label: "Report" }];
  return (
    <div className="flex items-center justify-center gap-0.5 mb-8 flex-wrap">
      {steps.map((step, idx) => {
        const isCompleted = step.num < currentStep;
        const isCurrent = step.num === currentStep;
        const isAccessible = step.num <= 3 || hasResults;
        return (
          <React.Fragment key={step.num}>
            <button onClick={() => isAccessible && onStepClick(step.num)} disabled={!isAccessible}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all ${isCurrent ? "bg-primary text-primary-foreground" : isCompleted ? "bg-primary/10 text-primary" : isAccessible ? "bg-muted text-muted-foreground hover:bg-muted/80" : "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"}`}>
              {step.label}
            </button>
            {idx < steps.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/30" />}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const IntroPage: React.FC<{ onLoadSample: () => void; onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ onLoadSample, onFileUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4"><MapPin className="w-6 h-6 text-primary" /></div>
        <h1 className="text-2xl font-semibold">Regional Budget Execution Comparison</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Analyze and compare budget execution rates across regions to identify performance gaps and optimize resource allocation.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { icon: BarChart3, title: "Execution Analysis", desc: "Compare spending rates across regions" },
          { icon: Target, title: "Benchmark Comparison", desc: "Measure against targets & peers" },
          { icon: TrendingUp, title: "Trend Tracking", desc: "Monitor temporal patterns" },
        ].map((item) => (
          <div key={item.title} className="p-5 rounded-lg border border-border bg-muted/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><item.icon className="w-5 h-5 text-primary" /></div>
              <div><p className="font-medium">{item.title}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
            </div>
          </div>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Info className="w-5 h-5 text-primary" />When to Use This Analysis</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary mb-3">Requirements</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["Region identifier column", "Allocated budget amounts", "Executed/spent amounts", "Optional: time periods, categories"].map((req) => (
                  <li key={req} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />{req}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-primary mb-3">Results</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["Regional execution rate rankings", "Category-wise breakdown", "Benchmark comparisons", "Disparity analysis & insights"].map((res) => (
                  <li key={res} className="flex items-start gap-2"><TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />{res}</li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={onLoadSample} className="gap-2"><Activity className="w-4 h-4" />Load Sample Data</Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2"><Upload className="w-4 h-4" />Upload Your Data</Button>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={onFileUpload} className="hidden" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
// ============================================================
// Main Component (Part 2)
// ============================================================

export default function BudgetExecutionPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<BudgetResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);

  // Configuration state
  const [regionCol, setRegionCol] = useState<string>("");
  const [allocatedCol, setAllocatedCol] = useState<string>("");
  const [executedCol, setExecutedCol] = useState<string>("");
  const [periodCol, setPeriodCol] = useState<string>("");
  const [categoryCol, setCategoryCol] = useState<string>("");
  const [populationCol, setPopulationCol] = useState<string>("");
  const [analysisType, setAnalysisType] = useState<string>("execution_rate");
  const [benchmarkType, setBenchmarkType] = useState<string>("national_average");
  const [targetRate, setTargetRate] = useState<string>("85");
  const [fiscalPeriod, setFiscalPeriod] = useState<string>("");

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    setColumns(Object.keys(sampleData[0]));
    setRegionCol("region");
    setAllocatedCol("allocated_budget");
    setExecutedCol("executed_amount");
    setPeriodCol("period");
    setCategoryCol("category");
    setPopulationCol("population");
    setFiscalPeriod("FY 2023-2024");
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

  const numericColumns = columns.filter(col => {
    const sample = data[0]?.[col];
    return typeof sample === "number" || !isNaN(Number(sample));
  });

  const categoricalColumns = columns.filter(col => {
    const sample = data[0]?.[col];
    return typeof sample === "string" && isNaN(Number(sample));
  });

  const getValidationChecks = useCallback((): ValidationCheck[] => [
    { name: "Data Loaded", passed: data.length > 0, message: data.length > 0 ? `${data.length} records loaded` : "No data loaded" },
    { name: "Region Column", passed: !!regionCol, message: regionCol ? `Using: ${regionCol}` : "Select region identifier" },
    { name: "Allocated Budget", passed: !!allocatedCol, message: allocatedCol ? `Using: ${allocatedCol}` : "Select allocated budget column" },
    { name: "Executed Amount", passed: !!executedCol, message: executedCol ? `Using: ${executedCol}` : "Select executed amount column" },
    { name: "Sufficient Data", passed: data.length >= 10, message: data.length >= 50 ? `${data.length} records (excellent)` : data.length >= 10 ? `${data.length} records (acceptable)` : `Only ${data.length} records (need ≥10)` },
  ], [data, regionCol, allocatedCol, executedCol]);

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const payload = {
        data,
        region_col: regionCol,
        allocated_col: allocatedCol,
        executed_col: executedCol,
        period_col: periodCol || null,
        category_col: categoryCol || null,
        population_col: populationCol || null,
        analysis_type: analysisType,
        benchmark_type: benchmarkType,
        target_rate: benchmarkType === "target" ? parseFloat(targetRate) / 100 : null,
        fiscal_period: fiscalPeriod || "Current Period",
      };
      const res = await fetch(`${FASTAPI_URL}/api/analysis/budget-execution`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Analysis failed");
      }
      const result: BudgetResult = await res.json();
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
    const regions = results.regional_analysis.regions;
    const headers = "Region,Allocated,Executed,Execution Rate,Rank\n";
    const rows = regions.map(r => 
      `${r.region},${r.allocated_budget},${r.executed_amount},${(r.execution_rate * 100).toFixed(1)}%,${r.rank}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "budget_execution_results.csv";
    a.click();
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const base64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!base64) return;
    const a = document.createElement("a");
    a.href = `data:image/png;base64,${base64}`;
    a.download = `budget_${chartKey}.png`;
    a.click();
  };

  // Step 2: Configuration
  const renderStep2Config = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Settings className="w-5 h-5 text-primary" />Configure Analysis</CardTitle>
        <CardDescription>Set up regional budget execution comparison parameters</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2"><Landmark className="w-4 h-4 text-primary" />Fiscal Information</h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fiscal Period</Label>
              <Input value={fiscalPeriod} onChange={(e) => setFiscalPeriod(e.target.value)} placeholder="e.g., FY 2024" />
            </div>
            <div className="space-y-2">
              <Label>Analysis Type</Label>
              <Select value={analysisType} onValueChange={setAnalysisType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ANALYSIS_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />Required Columns</h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Region *</Label>
              <Select value={regionCol} onValueChange={setRegionCol}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{categoricalColumns.map((col) => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Allocated Budget *</Label>
              <Select value={allocatedCol} onValueChange={setAllocatedCol}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{numericColumns.map((col) => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Executed Amount *</Label>
              <Select value={executedCol} onValueChange={setExecutedCol}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{numericColumns.map((col) => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2"><Settings className="w-4 h-4 text-primary" />Optional Columns</h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Time Period</Label>
              <Select value={periodCol} onValueChange={setPeriodCol}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{columns.map((col) => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryCol} onValueChange={setCategoryCol}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{categoricalColumns.map((col) => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Population</Label>
              <Select value={populationCol} onValueChange={setPopulationCol}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{numericColumns.map((col) => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2"><Target className="w-4 h-4 text-primary" />Benchmark Settings</h4>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Benchmark Type</Label>
              <Select value={benchmarkType} onValueChange={setBenchmarkType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BENCHMARK_OPTIONS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {benchmarkType === "target" && (
              <div className="space-y-2">
                <Label>Target Execution Rate (%)</Label>
                <Input type="number" value={targetRate} onChange={(e) => setTargetRate(e.target.value)} placeholder="85" />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={() => setCurrentStep(3)} className="gap-2">Continue<ArrowRight className="w-4 h-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );

  // Step 3: Validation
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
                  <div><p className="font-medium text-sm">{check.name}</p><p className="text-xs text-muted-foreground">{check.message}</p></div>
                </div>
                <Badge variant={check.passed ? "secondary" : "destructive"} className="text-xs">{check.passed ? "Pass" : "Warning"}</Badge>
              </div>
            ))}
          </div>
          {error && <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5"><p className="text-sm text-destructive">{error}</p></div>}
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

  // Step 4: Summary
  const renderStep4Summary = () => {
    if (!results) return null;
    const { summary, regional_analysis, benchmark_analysis } = results;
    const finding = `Overall execution rate: ${(summary.overall_execution_rate * 100).toFixed(1)}%. Best: ${summary.best_performing_region}. Regional disparity index: ${summary.disparity_index.toFixed(2)}.`;

    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Activity className="w-5 h-5 text-primary" />Results</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} status={summary.overall_execution_rate >= 0.85 ? "positive" : summary.overall_execution_rate >= 0.7 ? "neutral" : "warning"} />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={summary.n_regions} label="Regions" icon={MapPin} highlight />
            <MetricCard value={`${(summary.overall_execution_rate * 100).toFixed(1)}%`} label="Avg Execution" icon={Percent} highlight={summary.overall_execution_rate >= 0.85} />
            <MetricCard value={`₩${(summary.total_executed / 1e12).toFixed(1)}T`} label="Total Executed" icon={DollarSign} />
            <MetricCard value={summary.disparity_index.toFixed(2)} label="Disparity Index" icon={BarChart3} warning={summary.disparity_index > 0.2} />
          </div>

          {/* Top/Bottom Performers */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground mb-1">Best Performer</p>
              <p className="text-lg font-semibold">{summary.best_performing_region}</p>
              <p className="text-sm text-primary">{((regional_analysis.regions.find(r => r.region === summary.best_performing_region)?.execution_rate || 0) * 100).toFixed(1)}% execution rate</p>
            </div>
            <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
              <p className="text-xs text-muted-foreground mb-1">Needs Improvement</p>
              <p className="text-lg font-semibold">{summary.worst_performing_region}</p>
              <p className="text-sm text-destructive">{((regional_analysis.regions.find(r => r.region === summary.worst_performing_region)?.execution_rate || 0) * 100).toFixed(1)}% execution rate</p>
            </div>
          </div>

          {/* Key Insights */}
          {results.key_insights.map((ins, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${ins.status === "positive" ? "border-primary/30 bg-primary/5" : ins.status === "warning" ? "border-destructive/30 bg-destructive/5" : "border-border"}`}>
              {ins.status === "positive" ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> : ins.status === "warning" ? <AlertTriangle className="w-5 h-5 text-destructive shrink-0" /> : <Info className="w-5 h-5 shrink-0" />}
              <div><p className="font-medium text-sm">{ins.title}</p><p className="text-sm text-muted-foreground">{ins.description}</p></div>
            </div>
          ))}

          <DetailParagraph title="Summary Interpretation" detail={`This regional budget execution analysis compared ${summary.n_regions} regions for ${summary.fiscal_period}.

■ Overall Performance
• Total Allocated: ₩${(summary.total_allocated / 1e12).toFixed(2)} trillion
• Total Executed: ₩${(summary.total_executed / 1e12).toFixed(2)} trillion
• Overall Execution Rate: ${(summary.overall_execution_rate * 100).toFixed(1)}%
• ${summary.overall_execution_rate >= 0.85 ? 'Strong execution performance' : summary.overall_execution_rate >= 0.7 ? 'Moderate execution - room for improvement' : 'Low execution rate - requires attention'}

■ Regional Disparity
• Disparity Index: ${summary.disparity_index.toFixed(3)}
• ${summary.disparity_index < 0.1 ? 'Low disparity - relatively balanced execution' : summary.disparity_index < 0.2 ? 'Moderate disparity across regions' : 'High disparity - significant regional gaps'}
• Best Performer: ${summary.best_performing_region}
• Needs Improvement: ${summary.worst_performing_region}

■ Benchmark Analysis
• Average: ${(benchmark_analysis.average_execution_rate * 100).toFixed(1)}%
• Median: ${(benchmark_analysis.median_execution_rate * 100).toFixed(1)}%
• Std Deviation: ${(benchmark_analysis.std_deviation * 100).toFixed(1)}%
• Above Average: ${benchmark_analysis.above_average_regions.length} regions
• Below Average: ${benchmark_analysis.below_average_regions.length} regions`} />

          <div className="flex justify-end pt-4">
            <Button onClick={() => setCurrentStep(5)} className="gap-2">Understand Why<ArrowRight className="w-4 h-4" /></Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Step 5: Why
  const renderStep5Why = () => {
    if (!results) return null;
    const { summary } = results;

    const exps = [
      { n: 1, t: "Execution Rate", c: `Calculated as (Executed / Allocated) × 100. Overall: ${(summary.overall_execution_rate * 100).toFixed(1)}%.` },
      { n: 2, t: "Disparity Index", c: `Coefficient of variation across regions. Value of ${summary.disparity_index.toFixed(2)} indicates ${summary.disparity_index < 0.15 ? 'low' : 'moderate to high'} regional variation.` },
      { n: 3, t: "Benchmark", c: `Regions compared against ${benchmarkType === 'national_average' ? 'national average' : benchmarkType === 'top_performer' ? 'best performer' : 'target rate'}.` },
      { n: 4, t: "Rankings", c: `${summary.n_regions} regions ranked by execution rate. Identifies leaders and laggards.` },
    ];

    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><HelpCircle className="w-5 h-5 text-primary" />Understanding the Analysis</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            {exps.map(e => (
              <div key={e.n} className="p-4 rounded-lg border border-border bg-muted/10">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">{e.n}</div>
                  <div><p className="font-medium text-sm">{e.t}</p><p className="text-xs text-muted-foreground mt-1">{e.c}</p></div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-3">
            {[{ r: ">90%", l: "Excellent" }, { r: "80-90%", l: "Good" }, { r: "70-80%", l: "Fair" }, { r: "<70%", l: "Poor" }].map(g => (
              <div key={g.r} className="p-3 border rounded-lg text-center">
                <p className="font-semibold text-sm">{g.r}</p>
                <p className="text-xs text-primary">{g.l}</p>
              </div>
            ))}
          </div>

          <DetailParagraph title="Budget Execution Methodology" detail={`■ How Execution Rate is Calculated
Budget Execution Rate = (Executed Amount / Allocated Budget) × 100%

This measures the proportion of allocated funds actually spent during the fiscal period.

■ Disparity Index (Coefficient of Variation)
CV = Standard Deviation / Mean

Measures relative variability across regions:
• CV < 0.10: Low disparity (uniform execution)
• CV 0.10-0.20: Moderate disparity
• CV > 0.20: High disparity (uneven execution)

■ Factors Affecting Execution
• Administrative capacity and staffing
• Project readiness and planning quality
• Procurement and contracting efficiency
• External factors (weather, supply chains)
• Policy changes or budget revisions

■ Limitations
• High execution ≠ effective spending (quality matters)
• Timing effects (end-of-year rushing)
• Different regional contexts and needs
• Carryover and supplementary budgets may affect comparisons`} />

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(4)}>Back to Summary</Button>
            <Button onClick={() => setCurrentStep(6)} className="gap-2">View Full Report<ArrowRight className="w-4 h-4" /></Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Step 6: Full Report
  const renderStep6Report = () => {
    if (!results) return null;
    const { summary, regional_analysis, category_analysis, benchmark_analysis } = results;

    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b">
          <h1 className="text-xl font-semibold">Regional Budget Execution Report</h1>
          <p className="text-sm text-muted-foreground">{summary.fiscal_period} | {summary.n_regions} Regions | {new Date().toLocaleDateString()}</p>
        </div>

        {/* Executive Summary */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="w-5 h-5 text-blue-600" />Executive Summary</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">
              Regional budget execution analysis for <strong>{summary.fiscal_period}</strong> covering <strong>{summary.n_regions} regions</strong>.
              Total allocated budget of <strong>₩{(summary.total_allocated / 1e12).toFixed(2)} trillion</strong> with <strong>₩{(summary.total_executed / 1e12).toFixed(2)} trillion</strong> executed,
              achieving an overall execution rate of <strong>{(summary.overall_execution_rate * 100).toFixed(1)}%</strong>.
              <strong> {summary.best_performing_region}</strong> leads with the highest execution rate, while <strong>{summary.worst_performing_region}</strong> requires improvement.
              Regional disparity index of <strong>{summary.disparity_index.toFixed(2)}</strong> indicates {summary.disparity_index < 0.15 ? 'relatively balanced' : 'notable variation in'} execution across regions.
            </p>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-3">
          <MetricCard value={`${(summary.overall_execution_rate * 100).toFixed(1)}%`} label="Execution Rate" icon={Percent} highlight />
          <MetricCard value={summary.n_regions} label="Regions" icon={MapPin} />
          <MetricCard value={`₩${(summary.total_executed / 1e12).toFixed(1)}T`} label="Executed" icon={DollarSign} />
          <MetricCard value={summary.disparity_index.toFixed(2)} label="Disparity" icon={BarChart3} warning={summary.disparity_index > 0.2} />
        </div>

        {/* Visualizations */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Visualizations</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="regional">
              <TabsList className="grid w-full grid-cols-5 mb-4">
                {["regional", "heatmap", "category", "temporal", "disparity"].map(t => <TabsTrigger key={t} value={t} className="text-xs">{t}</TabsTrigger>)}
              </TabsList>
              {[
                { k: "regional_comparison", t: "regional" },
                { k: "execution_heatmap", t: "heatmap" },
                { k: "category_breakdown", t: "category" },
                { k: "temporal_trend", t: "temporal" },
                { k: "disparity_chart", t: "disparity" }
              ].map(({ k, t }) => (
                <TabsContent key={k} value={t}>
                  {results.visualizations[k as keyof typeof results.visualizations] && (
                    <div className="relative border rounded-lg overflow-hidden">
                      <img src={`data:image/png;base64,${results.visualizations[k as keyof typeof results.visualizations]}`} alt={k} className="w-full" />
                      <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => handleDownloadPNG(k)}><Download className="w-4 h-4" /></Button>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Regional Rankings Table */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Regional Rankings</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead className="text-right">Allocated</TableHead>
                  <TableHead className="text-right">Executed</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regional_analysis.regions.slice(0, 10).map((r) => (
                  <TableRow key={r.region}>
                    <TableCell className="font-medium">#{r.rank}</TableCell>
                    <TableCell className="font-medium">{r.region}</TableCell>
                    <TableCell className="text-right">₩{(r.allocated_budget / 1e9).toFixed(1)}B</TableCell>
                    <TableCell className="text-right">₩{(r.executed_amount / 1e9).toFixed(1)}B</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={r.execution_rate >= 0.85 ? "default" : r.execution_rate >= 0.7 ? "secondary" : "destructive"} className="text-xs">
                        {(r.execution_rate * 100).toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.execution_rate >= 0.85 ? <CheckCircle2 className="w-4 h-4 text-primary" /> : r.execution_rate >= 0.7 ? <AlertCircle className="w-4 h-4 text-yellow-500" /> : <XCircle className="w-4 h-4 text-destructive" />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <DetailParagraph title="Regional Performance Interpretation" detail={`■ Performance Tiers
• Excellent (>90%): Strong execution capacity
• Good (80-90%): Meeting expectations
• Fair (70-80%): Room for improvement
• Poor (<70%): Requires immediate attention

■ Top Performers
${benchmark_analysis.above_average_regions.slice(0, 5).map(r => `• ${r}`).join('\n')}

■ Below Average
${benchmark_analysis.below_average_regions.slice(0, 5).map(r => `• ${r}`).join('\n')}

■ Recommendations
• Share best practices from top performers
• Identify bottlenecks in low-performing regions
• Consider capacity building programs
• Review allocation methodology for equity`} />
          </CardContent>
        </Card>

        {/* Category Analysis */}
        {category_analysis.length > 0 && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Category Analysis</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Allocated</TableHead>
                    <TableHead className="text-right">Executed</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead>Top Region</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {category_analysis.map((c) => (
                    <TableRow key={c.category}>
                      <TableCell className="font-medium">{c.category}</TableCell>
                      <TableCell className="text-right">₩{(c.total_allocated / 1e9).toFixed(1)}B</TableCell>
                      <TableCell className="text-right">₩{(c.total_executed / 1e9).toFixed(1)}B</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={c.execution_rate >= 0.85 ? "default" : "secondary"} className="text-xs">
                          {(c.execution_rate * 100).toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.top_region}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Export */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Export</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleDownloadCSV} className="gap-2"><FileSpreadsheet className="w-4 h-4" />CSV</Button>
              <Button variant="outline" onClick={() => handleDownloadPNG("regional_comparison")} className="gap-2"><Download className="w-4 h-4" />Chart</Button>
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

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {currentStep > 1 && (
        <div className="flex justify-end gap-2 mb-4">
          <Button variant="ghost" size="sm" onClick={() => setGlossaryModalOpen(true)} className="gap-2">
            <BookOpen className="w-4 h-4" />Glossary
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)} className="gap-2">
            <HelpCircle className="w-4 h-4" />Help
          </Button>
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

      <GlossaryModal 
        isOpen={glossaryModalOpen}
        onClose={() => setGlossaryModalOpen(false)}
      />
    </div>
  );
}