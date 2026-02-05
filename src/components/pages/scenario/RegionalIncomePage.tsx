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
import {
  DollarSign, Upload, ArrowRight, CheckCircle2, XCircle,
  Shield, Info, HelpCircle, FileSpreadsheet, FileText, Download,
  TrendingUp, TrendingDown, Settings, Activity, AlertTriangle, ChevronRight,
  BarChart3, Calendar, Users, MapPin, BookOpen, ArrowUpRight, ArrowDownRight,
  Home, Wallet, PiggyBank, Scale,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

// ============================================================
// Statistical Terms Glossary
// ============================================================
const incomeTermDefinitions: Record<string, string> = {
  "Gross Income": "Total income before any deductions or taxes. Includes wages, salaries, bonuses, and other earnings.",
  "Net Income": "Income after taxes and deductions. Also called take-home pay or disposable income.",
  "Disposable Income": "Income available for spending and saving after taxes. Key measure of household purchasing power.",
  "Per Capita Income": "Average income per person, calculated by dividing total income by population. Allows regional comparison.",
  "Household Income": "Combined gross income of all members of a household. Standard unit for income analysis.",
  "Median Income": "Middle value when all incomes are ordered. Less affected by outliers than mean income.",
  "Mean Income": "Average income calculated by dividing total income by number of units. Can be skewed by high earners.",
  "Income Quintile": "Division of population into five equal groups by income. Used to analyze income distribution.",
  "Income Decile": "Division of population into ten equal groups by income. Provides finer distribution analysis.",
  "Gini Coefficient": "Measure of income inequality from 0 (perfect equality) to 1 (perfect inequality). Higher values indicate more inequality.",
  "Income Gap": "Difference between high and low income groups. Often measured as ratio of top to bottom quintile.",
  "Poverty Line": "Minimum income level below which a person is considered poor. Varies by country and region.",
  "Poverty Rate": "Percentage of population living below the poverty line. Key indicator of economic hardship.",
  "Relative Poverty": "Income below a percentage (often 50%) of median income. Measures inequality rather than absolute deprivation.",
  "Absolute Poverty": "Income insufficient to meet basic needs (food, shelter, clothing). Based on fixed threshold.",
  "Middle Class": "Income group between lower and upper classes. Often defined as 75-200% of median income.",
  "Income Mobility": "Ability to move between income levels over time. Measures economic opportunity.",
  "Wage Growth": "Percentage change in wages over time. Can be nominal (unadjusted) or real (inflation-adjusted).",
  "Real Income": "Income adjusted for inflation. Shows actual purchasing power changes over time.",
  "Nominal Income": "Income in current currency without inflation adjustment. May overstate growth during inflation.",
  "Cost of Living": "Amount needed to maintain a certain standard of living. Varies significantly by region.",
  "Purchasing Power Parity": "Adjustment for different price levels across regions. Enables meaningful income comparison.",
  "Income Elasticity": "Responsiveness of demand to income changes. Higher for luxury goods, lower for necessities.",
  "Transfer Income": "Income from government programs (welfare, pensions, subsidies). Not earned through labor.",
  "Market Income": "Income from labor and capital before government transfers. Shows pre-redistribution earnings."
};

interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface RegionIncome {
  region: string;
  population: number;
  mean_income: number;
  median_income: number;
  per_capita_income: number;
  gini: number;
  poverty_rate: number;
  yoy_growth: number | null;
  cost_of_living_index: number;
}

interface IncomeDistribution {
  quintile: string;
  income_share: number;
  avg_income: number;
  population_share: number;
}

interface IncomeResult {
  success: boolean;
  overall_metrics: {
    total_income: number;
    mean_income: number;
    median_income: number;
    per_capita_income: number;
    gini_coefficient: number;
    poverty_rate: number;
    income_gap_ratio: number;
    yoy_growth: number;
  };
  temporal_analysis: {
    periods: string[];
    mean_incomes: number[];
    median_incomes: number[];
    gini_trend: number[];
    growth_rates: number[];
  };
  regional_analysis: RegionIncome[];
  distribution_analysis: {
    quintiles: IncomeDistribution[];
    deciles: IncomeDistribution[];
  };
  inequality_analysis: {
    gini: number;
    palma_ratio: number;
    p90_p10_ratio: number;
    top_10_share: number;
    bottom_40_share: number;
  };
  visualizations: {
    regional_map?: string;
    distribution_chart?: string;
    trend_chart?: string;
    inequality_chart?: string;
    lorenz_curve?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    analysis_period: string;
    mean_income: number;
    median_income: number;
    gini: number;
    poverty_rate: number;
    yoy_growth: number;
    highest_region: string;
    lowest_region: string;
    income_gap_status: string;
    inequality_level: string;
  };
}

const ANALYSIS_FOCUS = [
  { value: "regional", label: "Regional Comparison", desc: "Compare across regions" },
  { value: "distribution", label: "Distribution Analysis", desc: "Quintiles & deciles" },
  { value: "inequality", label: "Inequality Analysis", desc: "Gini & income gaps" },
  { value: "trend", label: "Trend Analysis", desc: "Changes over time" },
];

const generateSampleData = (): DataRow[] => {
  const data: DataRow[] = [];
  const regions = ["Seoul", "Busan", "Incheon", "Daegu", "Gwangju", "Daejeon", "Ulsan", "Sejong", "Gyeonggi", "Gangwon", "Chungbuk", "Chungnam", "Jeonbuk", "Jeonnam", "Gyeongbuk", "Gyeongnam", "Jeju"];
  const years = [2019, 2020, 2021, 2022, 2023, 2024];
  const incomeTypes = ["Wage", "Business", "Property", "Transfer"];
  const householdSizes = [1, 2, 3, 4, 5];
  
  const baseIncomes: { [key: string]: number } = {
    "Seoul": 6800, "Busan": 5200, "Incheon": 5500, "Daegu": 5000,
    "Gwangju": 4800, "Daejeon": 5300, "Ulsan": 6200, "Sejong": 5800,
    "Gyeonggi": 5900, "Gangwon": 4300, "Chungbuk": 4500, "Chungnam": 4700,
    "Jeonbuk": 4200, "Jeonnam": 4000, "Gyeongbuk": 4400, "Gyeongnam": 4800, "Jeju": 4600
  };
  
  const populations: { [key: string]: number } = {
    "Seoul": 9700000, "Busan": 3400000, "Incheon": 2900000, "Daegu": 2400000,
    "Gwangju": 1500000, "Daejeon": 1500000, "Ulsan": 1100000, "Sejong": 350000,
    "Gyeonggi": 13500000, "Gangwon": 1500000, "Chungbuk": 1600000, "Chungnam": 2100000,
    "Jeonbuk": 1800000, "Jeonnam": 1800000, "Gyeongbuk": 2600000, "Gyeongnam": 3300000, "Jeju": 670000
  };

  const costOfLiving: { [key: string]: number } = {
    "Seoul": 115, "Busan": 98, "Incheon": 100, "Daegu": 95,
    "Gwangju": 92, "Daejeon": 95, "Ulsan": 100, "Sejong": 98,
    "Gyeonggi": 105, "Gangwon": 88, "Chungbuk": 85, "Chungnam": 87,
    "Jeonbuk": 82, "Jeonnam": 80, "Gyeongbuk": 84, "Gyeongnam": 90, "Jeju": 95
  };

  for (const year of years) {
    const yearGrowth = 1 + (year - 2019) * 0.025;
    const covidImpact = year === 2020 ? 0.97 : year === 2021 ? 0.99 : 1.0;

    for (const region of regions) {
      const baseIncome = baseIncomes[region] * yearGrowth * covidImpact;
      const pop = populations[region];
      const households = Math.round(pop / 2.5);
      
      // Generate income distribution (log-normal-like)
      for (let q = 1; q <= 5; q++) {
        const quintileFactor = q === 1 ? 0.35 : q === 2 ? 0.65 : q === 3 ? 1.0 : q === 4 ? 1.5 : q === 5 ? 2.8 : 1.0;
        const quintileIncome = baseIncome * quintileFactor * (0.95 + Math.random() * 0.1);
        
        for (const incomeType of incomeTypes) {
          const typeFactor = incomeType === "Wage" ? 0.65 : incomeType === "Business" ? 0.20 : incomeType === "Property" ? 0.10 : 0.05;
          const typeIncome = quintileIncome * typeFactor;
          
          for (const hhSize of householdSizes) {
            const sizeFactor = 1 + (hhSize - 1) * 0.3;
            const hhIncome = typeIncome * sizeFactor * (0.9 + Math.random() * 0.2);
            
            const sampleCount = Math.round(households * 0.2 * (1 / householdSizes.length) * 0.1);
            
            if (sampleCount > 0) {
              data.push({
                year,
                region,
                quintile: `Q${q}`,
                income_type: incomeType,
                household_size: hhSize,
                gross_income: Math.round(hhIncome * 10000),
                net_income: Math.round(hhIncome * 10000 * 0.82),
                population: Math.round(pop * 0.2 / householdSizes.length),
                households: sampleCount,
                cost_of_living_index: costOfLiving[region],
              });
            }
          }
        }
      }
    }
  }
  return data;
};

// ============================================================
// Reusable UI Components
// ============================================================

const GlossaryModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-2xl max-h-[80vh]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />Income Analysis Glossary</DialogTitle>
        <DialogDescription>Definitions of income and inequality terms</DialogDescription>
      </DialogHeader>
      <ScrollArea className="h-[60vh] pr-4">
        <div className="space-y-4">
          {Object.entries(incomeTermDefinitions).map(([term, def]) => (
            <div key={term} className="border-b pb-3"><h4 className="font-semibold">{term}</h4><p className="text-sm text-muted-foreground mt-1">{def}</p></div>
          ))}
        </div>
      </ScrollArea>
    </DialogContent>
  </Dialog>
);

const MetricCard: React.FC<{ value: string | number; label: string; icon?: React.FC<{ className?: string }>; highlight?: boolean; warning?: boolean; trend?: number }> = ({ value, label, icon: Icon, highlight, warning, trend }) => (
  <div className={`text-center p-4 rounded-lg border ${warning ? 'border-destructive/30 bg-destructive/5' : highlight ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/20'}`}>
    {Icon && <Icon className={`w-5 h-5 mx-auto mb-2 ${warning ? 'text-destructive' : highlight ? 'text-primary' : 'text-muted-foreground'}`} />}
    <p className={`text-2xl font-semibold ${warning ? 'text-destructive' : highlight ? 'text-primary' : ''}`}>{value}</p>
    <p className="text-xs text-muted-foreground mt-1">{label}</p>
    {trend !== undefined && (
      <div className={`flex items-center justify-center gap-1 mt-1 text-xs ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{Math.abs(trend).toFixed(1)}%
      </div>
    )}
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
          <FileText className="w-4 h-4 text-muted-foreground" /><span className="text-sm font-medium">Data Preview</span>
          <Badge variant="secondary" className="text-xs">{data.length} records</Badge>
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>
      </div>
      {expanded && (
        <div className="max-h-64 overflow-auto">
          <Table><TableHeader><TableRow>{columns.slice(0, 8).map(col => <TableHead key={col} className="text-xs">{col}</TableHead>)}</TableRow></TableHeader>
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
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4"><DollarSign className="w-6 h-6 text-primary" /></div>
        <h1 className="text-2xl font-semibold">Regional Income Level Analysis</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Analyze income distribution, regional disparities, and inequality metrics for policy planning and resource allocation.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { icon: MapPin, title: "Regional Comparison", desc: "Income across regions" },
          { icon: Scale, title: "Inequality Analysis", desc: "Gini & distribution" },
          { icon: TrendingUp, title: "Trend Tracking", desc: "Income growth patterns" },
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
                {["Income data (gross or net)", "Region identifier", "Population or household count", "Optional: quintile, income type"].map((req) => (
                  <li key={req} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />{req}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-primary mb-3">Results</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["Mean & median income", "Gini coefficient", "Regional rankings", "Income distribution"].map((res) => (
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

export default function IncomePage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<IncomeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);

  // Configuration
  const [periodCol, setPeriodCol] = useState<string>("");
  const [regionCol, setRegionCol] = useState<string>("");
  const [grossIncomeCol, setGrossIncomeCol] = useState<string>("");
  const [netIncomeCol, setNetIncomeCol] = useState<string>("");
  const [populationCol, setPopulationCol] = useState<string>("");
  const [householdsCol, setHouseholdsCol] = useState<string>("");
  const [quintileCol, setQuintileCol] = useState<string>("");
  const [incomeTypeCol, setIncomeTypeCol] = useState<string>("");
  const [costOfLivingCol, setCostOfLivingCol] = useState<string>("");
  const [analysisFocus, setAnalysisFocus] = useState<string>("regional");
  const [analysisPeriod, setAnalysisPeriod] = useState<string>("");

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    setColumns(Object.keys(sampleData[0]));
    setPeriodCol("year");
    setRegionCol("region");
    setGrossIncomeCol("gross_income");
    setNetIncomeCol("net_income");
    setPopulationCol("population");
    setHouseholdsCol("households");
    setQuintileCol("quintile");
    setIncomeTypeCol("income_type");
    setCostOfLivingCol("cost_of_living_index");
    setAnalysisPeriod("2019-2024");
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

  const numericColumns = columns.filter(col => { const s = data[0]?.[col]; return typeof s === "number" || !isNaN(Number(s)); });
  const categoricalColumns = columns.filter(col => { const s = data[0]?.[col]; return typeof s === "string" && isNaN(Number(s)); });

  const getValidationChecks = useCallback((): ValidationCheck[] => [
    { name: "Data Loaded", passed: data.length > 0, message: data.length > 0 ? `${data.length} records` : "No data" },
    { name: "Region Column", passed: !!regionCol, message: regionCol ? `Using: ${regionCol}` : "Select region column" },
    { name: "Income Data", passed: !!grossIncomeCol || !!netIncomeCol, message: grossIncomeCol || netIncomeCol ? `Using: ${grossIncomeCol || netIncomeCol}` : "Select income column" },
    { name: "Population/Households", passed: !!populationCol || !!householdsCol, message: populationCol || householdsCol ? `Using: ${populationCol || householdsCol}` : "Recommended" },
    { name: "Sufficient Data", passed: data.length >= 50, message: data.length >= 100 ? `${data.length} records (good)` : `${data.length} records` },
  ], [data, regionCol, grossIncomeCol, netIncomeCol, populationCol, householdsCol]);

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const payload = {
        data, period_col: periodCol || null, region_col: regionCol,
        gross_income_col: grossIncomeCol || null, net_income_col: netIncomeCol || null,
        population_col: populationCol || null, households_col: householdsCol || null,
        quintile_col: quintileCol || null, income_type_col: incomeTypeCol || null,
        cost_of_living_col: costOfLivingCol || null,
        analysis_focus: analysisFocus, analysis_period: analysisPeriod || "Analysis Period",
      };
      const res = await fetch(`${FASTAPI_URL}/api/analysis/income`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Analysis failed"); }
      const result: IncomeResult = await res.json();
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
    const regions = results.regional_analysis;
    const headers = "Region,Mean Income,Median Income,Per Capita,Gini,Poverty Rate\n";
    const rows = regions.map(r => `${r.region},${r.mean_income.toLocaleString()},${r.median_income.toLocaleString()},${r.per_capita_income.toLocaleString()},${r.gini.toFixed(3)},${r.poverty_rate.toFixed(1)}%`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "income_results.csv"; a.click();
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const b64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!b64) return;
    const a = document.createElement("a"); a.href = `data:image/png;base64,${b64}`; a.download = `income_${chartKey}.png`; a.click();
  };

  const formatCurrency = (n: number) => `₩${(n / 10000).toFixed(0)}만`;

  const renderStep2Config = () => (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Settings className="w-5 h-5 text-primary" />Configure Analysis</CardTitle><CardDescription>Set up income analysis parameters</CardDescription></CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />Location & Time</h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Region Column *</Label><Select value={regionCol} onValueChange={setRegionCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{categoricalColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Period Column</Label><Select value={periodCol} onValueChange={setPeriodCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Analysis Period</Label><Input value={analysisPeriod} onChange={e => setAnalysisPeriod(e.target.value)} placeholder="e.g., 2019-2024" /></div>
          </div>
        </div>
        <Separator />
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2"><Wallet className="w-4 h-4 text-primary" />Income Data</h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Gross Income</Label><Select value={grossIncomeCol} onValueChange={setGrossIncomeCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numericColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Net Income</Label><Select value={netIncomeCol} onValueChange={setNetIncomeCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numericColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Cost of Living Index</Label><Select value={costOfLivingCol} onValueChange={setCostOfLivingCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numericColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
          </div>
        </div>
        <Separator />
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Population & Breakdown</h4>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="space-y-2"><Label>Population</Label><Select value={populationCol} onValueChange={setPopulationCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numericColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Households</Label><Select value={householdsCol} onValueChange={setHouseholdsCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numericColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Quintile</Label><Select value={quintileCol} onValueChange={setQuintileCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{categoricalColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Income Type</Label><Select value={incomeTypeCol} onValueChange={setIncomeTypeCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{categoricalColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Analysis Focus</Label><Select value={analysisFocus} onValueChange={setAnalysisFocus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ANALYSIS_FOCUS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent></Select></div>
          </div>
        </div>
        <div className="flex justify-end pt-4"><Button onClick={() => setCurrentStep(3)} className="gap-2">Continue<ArrowRight className="w-4 h-4" /></Button></div>
      </CardContent>
    </Card>
  );

  const renderStep3Validation = () => {
    const checks = getValidationChecks();
    const canRun = checks.slice(0, 3).every(c => c.passed);
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Shield className="w-5 h-5 text-primary" />Validation</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">{checks.map((c, i) => (
            <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${c.passed ? 'border-border' : 'border-destructive/30 bg-destructive/5'}`}>
              <div className="flex items-center gap-3">{c.passed ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <XCircle className="w-5 h-5 text-destructive" />}<div><p className="font-medium text-sm">{c.name}</p><p className="text-xs text-muted-foreground">{c.message}</p></div></div>
              <Badge variant={c.passed ? "secondary" : "destructive"} className="text-xs">{c.passed ? "Pass" : "Warning"}</Badge>
            </div>
          ))}</div>
          {error && <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5"><p className="text-sm text-destructive">{error}</p></div>}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(2)}>Back</Button>
            <Button onClick={runAnalysis} disabled={loading || !canRun} className="gap-2">{loading ? <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Analyzing...</> : <>Run Analysis<ArrowRight className="w-4 h-4" /></>}</Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderStep4Summary = () => {
    if (!results) return null;
    const { summary, overall_metrics } = results;
    const finding = `Mean income: ${formatCurrency(summary.mean_income)}, Median: ${formatCurrency(summary.median_income)}. Gini: ${summary.gini.toFixed(3)} (${summary.inequality_level}). ${summary.highest_region} highest, ${summary.lowest_region} lowest income.`;
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Activity className="w-5 h-5 text-primary" />Results</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} status={summary.gini < 0.35 ? "positive" : summary.gini > 0.4 ? "warning" : "neutral"} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={formatCurrency(summary.mean_income)} label="Mean Income" icon={Wallet} highlight trend={summary.yoy_growth} />
            <MetricCard value={formatCurrency(summary.median_income)} label="Median Income" icon={DollarSign} />
            <MetricCard value={summary.gini.toFixed(3)} label="Gini Coefficient" icon={Scale} warning={summary.gini > 0.4} />
            <MetricCard value={`${summary.poverty_rate.toFixed(1)}%`} label="Poverty Rate" icon={Users} warning={summary.poverty_rate > 15} />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5"><p className="text-xs text-muted-foreground mb-1">Highest Income Region</p><p className="text-lg font-semibold">{summary.highest_region}</p></div>
            <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5"><p className="text-xs text-muted-foreground mb-1">Lowest Income Region</p><p className="text-lg font-semibold">{summary.lowest_region}</p></div>
          </div>
          {results.key_insights.map((ins, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${ins.status === "positive" ? "border-primary/30 bg-primary/5" : ins.status === "warning" ? "border-destructive/30 bg-destructive/5" : "border-border"}`}>
              {ins.status === "positive" ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> : ins.status === "warning" ? <AlertTriangle className="w-5 h-5 text-destructive shrink-0" /> : <Info className="w-5 h-5 shrink-0" />}
              <div><p className="font-medium text-sm">{ins.title}</p><p className="text-sm text-muted-foreground">{ins.description}</p></div>
            </div>
          ))}
          <DetailParagraph title="Summary" detail={`■ Mean Income: ${formatCurrency(summary.mean_income)}\n■ Median Income: ${formatCurrency(summary.median_income)}\n■ Per Capita: ${formatCurrency(overall_metrics.per_capita_income)}\n■ Gini Coefficient: ${summary.gini.toFixed(3)}\n■ Poverty Rate: ${summary.poverty_rate.toFixed(1)}%\n■ Income Gap Ratio: ${overall_metrics.income_gap_ratio.toFixed(1)}x\n■ YoY Growth: ${summary.yoy_growth >= 0 ? '+' : ''}${summary.yoy_growth.toFixed(1)}%\n■ Inequality: ${summary.inequality_level}`} />
          <div className="flex justify-end pt-4"><Button onClick={() => setCurrentStep(5)} className="gap-2">Understand Why<ArrowRight className="w-4 h-4" /></Button></div>
        </CardContent>
      </Card>
    );
  };

  const renderStep5Why = () => {
    if (!results) return null;
    const { summary, inequality_analysis } = results;
    const exps = [
      { n: 1, t: "Gini Coefficient", c: `${summary.gini.toFixed(3)}: 0=equality, 1=inequality. ${summary.gini < 0.3 ? 'Low inequality' : summary.gini < 0.4 ? 'Moderate' : 'High inequality'}.` },
      { n: 2, t: "Mean vs Median", c: `Mean ${formatCurrency(summary.mean_income)} > Median ${formatCurrency(summary.median_income)} indicates right-skewed distribution (high earners pull mean up).` },
      { n: 3, t: "Top 10% Share", c: `${(inequality_analysis.top_10_share * 100).toFixed(1)}% of income goes to top 10%. ${inequality_analysis.top_10_share > 0.3 ? 'Concentration at top' : 'Moderate distribution'}.` },
      { n: 4, t: "Regional Gap", c: `${summary.highest_region} vs ${summary.lowest_region}. ${summary.income_gap_status}. Regional policy needed.` },
    ];
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><HelpCircle className="w-5 h-5 text-primary" />Understanding the Analysis</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">{exps.map(e => (
            <div key={e.n} className="p-4 rounded-lg border border-border bg-muted/10">
              <div className="flex items-start gap-3"><div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">{e.n}</div><div><p className="font-medium text-sm">{e.t}</p><p className="text-xs text-muted-foreground mt-1">{e.c}</p></div></div>
            </div>
          ))}</div>
          <div className="grid grid-cols-4 gap-3">{[{ r: "<0.30", l: "Low" }, { r: "0.30-0.35", l: "Moderate" }, { r: "0.35-0.40", l: "High" }, { r: ">0.40", l: "Very High" }].map(g => (
            <div key={g.r} className="p-3 border rounded-lg text-center"><p className="font-semibold text-sm">{g.r}</p><p className="text-xs text-primary">{g.l} Gini</p></div>
          ))}</div>
          <DetailParagraph title="Methodology" detail={`■ Gini Coefficient\nBased on Lorenz curve area\n0 = perfect equality, 1 = perfect inequality\n\n■ Income Gap Ratio\nTop 20% income / Bottom 20% income\nHigher ratio = more inequality\n\n■ Poverty Rate\n% below 50% of median income (relative)\nor below fixed threshold (absolute)\n\n■ Quintile Analysis\nDivide population into 5 equal groups\nQ1 = lowest 20%, Q5 = highest 20%\n\n■ Policy Implications\n• High Gini: Progressive taxation, transfers\n• Regional gaps: Development investment\n• Poverty: Safety net, job programs`} />
          <div className="flex justify-between pt-4"><Button variant="outline" onClick={() => setCurrentStep(4)}>Back</Button><Button onClick={() => setCurrentStep(6)} className="gap-2">View Full Report<ArrowRight className="w-4 h-4" /></Button></div>
        </CardContent>
      </Card>
    );
  };

  const renderStep6Report = () => {
    if (!results) return null;
    const { summary, regional_analysis, distribution_analysis, inequality_analysis, overall_metrics } = results;
    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b"><h1 className="text-xl font-semibold">Regional Income Level Report</h1><p className="text-sm text-muted-foreground">{summary.analysis_period} | {new Date().toLocaleDateString()}</p></div>
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="w-5 h-5 text-green-600" />Executive Summary</CardTitle></CardHeader>
          <CardContent><p className="text-sm leading-relaxed">Income analysis for <strong>{summary.analysis_period}</strong> shows mean income of <strong>{formatCurrency(summary.mean_income)}</strong> and median of <strong>{formatCurrency(summary.median_income)}</strong>. Gini coefficient of <strong>{summary.gini.toFixed(3)}</strong> indicates <strong>{summary.inequality_level}</strong> inequality. <strong>{summary.highest_region}</strong> has highest income while <strong>{summary.lowest_region}</strong> has lowest. Poverty rate: <strong>{summary.poverty_rate.toFixed(1)}%</strong>.</p></CardContent>
        </Card>
        <div className="grid grid-cols-4 gap-3">
          <MetricCard value={formatCurrency(summary.mean_income)} label="Mean Income" icon={Wallet} highlight />
          <MetricCard value={summary.gini.toFixed(3)} label="Gini" icon={Scale} warning={summary.gini > 0.4} />
          <MetricCard value={`${summary.poverty_rate.toFixed(1)}%`} label="Poverty Rate" icon={Users} />
          <MetricCard value={`${overall_metrics.income_gap_ratio.toFixed(1)}x`} label="Income Gap" icon={BarChart3} />
        </div>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Visualizations</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="regional">
              <TabsList className="grid w-full grid-cols-5 mb-4">{["regional", "distribution", "trend", "inequality", "lorenz"].map(t => <TabsTrigger key={t} value={t} className="text-xs">{t}</TabsTrigger>)}</TabsList>
              {[{ k: "regional_map", t: "regional" }, { k: "distribution_chart", t: "distribution" }, { k: "trend_chart", t: "trend" }, { k: "inequality_chart", t: "inequality" }, { k: "lorenz_curve", t: "lorenz" }].map(({ k, t }) => (
                <TabsContent key={k} value={t}>{results.visualizations[k as keyof typeof results.visualizations] && (<div className="relative border rounded-lg overflow-hidden"><img src={`data:image/png;base64,${results.visualizations[k as keyof typeof results.visualizations]}`} alt={k} className="w-full" /><Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => handleDownloadPNG(k)}><Download className="w-4 h-4" /></Button></div>)}</TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Regional Analysis</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Region</TableHead><TableHead className="text-right">Mean</TableHead><TableHead className="text-right">Median</TableHead><TableHead className="text-right">Gini</TableHead><TableHead className="text-right">Poverty</TableHead></TableRow></TableHeader>
              <TableBody>{regional_analysis.slice(0, 12).map(r => (
                <TableRow key={r.region}><TableCell className="font-medium">{r.region}</TableCell><TableCell className="text-right">{formatCurrency(r.mean_income)}</TableCell><TableCell className="text-right">{formatCurrency(r.median_income)}</TableCell><TableCell className="text-right"><Badge variant={r.gini < 0.35 ? "default" : r.gini > 0.4 ? "destructive" : "secondary"} className="text-xs">{r.gini.toFixed(3)}</Badge></TableCell><TableCell className="text-right">{r.poverty_rate.toFixed(1)}%</TableCell></TableRow>
              ))}</TableBody>
            </Table>
          </CardContent>
        </Card>
        {distribution_analysis.quintiles.length > 0 && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Income Distribution (Quintiles)</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Quintile</TableHead><TableHead className="text-right">Avg Income</TableHead><TableHead className="text-right">Income Share</TableHead><TableHead className="text-right">Pop Share</TableHead></TableRow></TableHeader>
                <TableBody>{distribution_analysis.quintiles.map(q => (
                  <TableRow key={q.quintile}><TableCell className="font-medium">{q.quintile}</TableCell><TableCell className="text-right">{formatCurrency(q.avg_income)}</TableCell><TableCell className="text-right">{(q.income_share * 100).toFixed(1)}%</TableCell><TableCell className="text-right">{(q.population_share * 100).toFixed(1)}%</TableCell></TableRow>
                ))}</TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        <Card><CardHeader className="pb-3"><CardTitle className="text-base">Export</CardTitle></CardHeader><CardContent><div className="flex gap-3"><Button variant="outline" onClick={handleDownloadCSV} className="gap-2"><FileSpreadsheet className="w-4 h-4" />CSV</Button><Button variant="outline" onClick={() => handleDownloadPNG("regional_map")} className="gap-2"><Download className="w-4 h-4" />Chart</Button></div></CardContent></Card>
        <div className="flex justify-between"><Button variant="outline" onClick={() => setCurrentStep(5)}>Back</Button><Button variant="outline" onClick={() => setCurrentStep(1)}>New Analysis</Button></div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {currentStep > 1 && (<div className="flex justify-end gap-2 mb-4"><Button variant="ghost" size="sm" onClick={() => setGlossaryModalOpen(true)} className="gap-2"><BookOpen className="w-4 h-4" />Glossary</Button><Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)} className="gap-2"><HelpCircle className="w-4 h-4" />Help</Button></div>)}
      {currentStep > 1 && <ProgressBar currentStep={currentStep} hasResults={!!results} onStepClick={setCurrentStep} />}
      {currentStep > 1 && data.length > 0 && <DataPreview data={data} columns={columns} />}
      {currentStep === 1 && <IntroPage onLoadSample={handleLoadSample} onFileUpload={handleFileUpload} />}
      {currentStep === 2 && renderStep2Config()}
      {currentStep === 3 && renderStep3Validation()}
      {currentStep === 4 && renderStep4Summary()}
      {currentStep === 5 && renderStep5Why()}
      {currentStep === 6 && renderStep6Report()}
      <GlossaryModal isOpen={glossaryModalOpen} onClose={() => setGlossaryModalOpen(false)} />
    </div>
  );
}