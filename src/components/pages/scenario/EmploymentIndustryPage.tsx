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
  Building2, Upload, ArrowRight, CheckCircle2, XCircle,
  Shield, Info, HelpCircle, FileSpreadsheet, FileText, Download,
  TrendingUp, TrendingDown, Settings, Activity, AlertTriangle, ChevronRight,
  BarChart3, Calendar, Users, MapPin, Factory, Briefcase, BookOpen,
  ArrowUpRight, ArrowDownRight, Layers, PieChart, Cpu, Truck,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-995604437166.asia-northeast3.run.app";

// ============================================================
// Statistical Terms Glossary
// ============================================================
const industryTermDefinitions: Record<string, string> = {
  "Employment": "Total number of people engaged in paid work. Includes full-time and part-time workers.",
  "Industry": "Classification of economic activity by type of goods produced or services provided.",
  "Primary Sector": "Industries that extract raw materials: agriculture, mining, fishing, forestry. Declining share in developed economies.",
  "Secondary Sector": "Industries that process raw materials: manufacturing, construction. Core of industrial economies.",
  "Tertiary Sector": "Service industries: retail, finance, healthcare, education. Dominant in developed economies.",
  "Quaternary Sector": "Knowledge-based services: IT, R&D, consulting. Growing rapidly in modern economies.",
  "Industrial Structure": "Distribution of economic activity and employment across different sectors and industries.",
  "Structural Change": "Shift in the relative importance of industries over time. Driven by technology and demand changes.",
  "Deindustrialization": "Decline in manufacturing's share of employment and GDP. Common in advanced economies.",
  "Servicification": "Growing importance of services in the economy. Includes both consumer and business services.",
  "Employment Share": "Percentage of total employment in a specific industry or sector.",
  "Value Added": "Contribution of an industry to GDP. Revenue minus intermediate inputs.",
  "Labor Productivity": "Output per worker or per hour worked. Key measure of economic efficiency.",
  "Industry Concentration": "Degree to which employment or output is dominated by few firms or regions.",
  "Specialization Index": "Measure of how specialized a region is in particular industries relative to the national average.",
  "Location Quotient (LQ)": "Ratio of local industry share to national share. LQ > 1 indicates specialization.",
  "Shift-Share Analysis": "Decomposes regional employment change into national, industry, and local components.",
  "Employment Multiplier": "Total jobs created (direct + indirect) per job in a specific industry.",
  "Occupational Structure": "Distribution of employment by occupation type (professional, technical, manual, etc.).",
  "Skill Intensity": "Proportion of high-skilled workers in an industry. Indicator of knowledge intensity.",
  "Formal vs Informal Employment": "Formal: registered, regulated jobs. Informal: unregistered, often precarious work.",
  "Self-Employment": "Working for oneself rather than an employer. Includes entrepreneurs and gig workers.",
  "Wage Employment": "Working for an employer in exchange for wages or salary. Most common form of employment.",
  "Industry Classification": "Standard system for categorizing economic activities (e.g., ISIC, NAICS, KSIC).",
  "Economic Diversification": "Spreading economic activity across multiple industries. Reduces vulnerability to shocks."
};

interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface IndustryData {
  industry: string;
  sector: string;
  employment: number;
  employment_share: number;
  yoy_change: number;
  yoy_growth_rate: number;
  value_added: number | null;
  productivity: number | null;
  avg_wage: number | null;
}

interface SectorSummary {
  sector: string;
  employment: number;
  employment_share: number;
  n_industries: number;
  yoy_change: number;
  growth_rate: number;
}

interface IndustryResult {
  success: boolean;
  overall_metrics: {
    total_employment: number;
    n_industries: number;
    n_sectors: number;
    primary_share: number;
    secondary_share: number;
    tertiary_share: number;
    yoy_employment_change: number;
    yoy_growth_rate: number;
    largest_industry: string;
    fastest_growing: string;
  };
  sector_analysis: SectorSummary[];
  industry_analysis: IndustryData[];
  temporal_analysis: {
    periods: string[];
    total_employment: number[];
    sector_trends: { [sector: string]: number[] };
  };
  regional_analysis: {
    region: string;
    employment: number;
    dominant_industry: string;
    specialization_index: number;
  }[];
  structural_change: {
    from_period: string;
    to_period: string;
    sector_shifts: { sector: string; change: number }[];
    growing_industries: string[];
    declining_industries: string[];
  };
  visualizations: {
    sector_composition?: string;
    industry_ranking?: string;
    trend_chart?: string;
    structural_change?: string;
    regional_map?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    analysis_period: string;
    total_employment: number;
    dominant_sector: string;
    dominant_sector_share: number;
    structural_trend: string;
    employment_trend: string;
    top_growing_industry: string;
    top_declining_industry: string;
  };
}

const ANALYSIS_FOCUS = [
  { value: "structure", label: "Industry Structure", desc: "Sector & industry composition" },
  { value: "trend", label: "Employment Trends", desc: "Changes over time" },
  { value: "regional", label: "Regional Analysis", desc: "Geographic distribution" },
  { value: "change", label: "Structural Change", desc: "Shifts between sectors" },
];

const generateSampleData = (): DataRow[] => {
  const data: DataRow[] = [];
  
  const industries = [
    { name: "Agriculture & Forestry", sector: "Primary", base: 1200000, trend: -0.03 },
    { name: "Fishing", sector: "Primary", base: 80000, trend: -0.02 },
    { name: "Mining", sector: "Primary", base: 50000, trend: -0.04 },
    { name: "Food & Beverages Mfg", sector: "Secondary", base: 420000, trend: 0.01 },
    { name: "Textiles & Apparel", sector: "Secondary", base: 180000, trend: -0.05 },
    { name: "Electronics Mfg", sector: "Secondary", base: 580000, trend: 0.02 },
    { name: "Automobile Mfg", sector: "Secondary", base: 350000, trend: 0.01 },
    { name: "Machinery & Equipment", sector: "Secondary", base: 280000, trend: 0.02 },
    { name: "Chemicals", sector: "Secondary", base: 150000, trend: 0.01 },
    { name: "Construction", sector: "Secondary", base: 1800000, trend: 0.02 },
    { name: "Wholesale Trade", sector: "Tertiary", base: 950000, trend: 0.01 },
    { name: "Retail Trade", sector: "Tertiary", base: 2800000, trend: 0.00 },
    { name: "Transportation & Storage", sector: "Tertiary", base: 1100000, trend: 0.02 },
    { name: "Accommodation & Food", sector: "Tertiary", base: 2200000, trend: 0.03 },
    { name: "Finance & Insurance", sector: "Tertiary", base: 850000, trend: 0.02 },
    { name: "Real Estate", sector: "Tertiary", base: 550000, trend: 0.03 },
    { name: "Professional Services", sector: "Tertiary", base: 1200000, trend: 0.04 },
    { name: "Public Administration", sector: "Tertiary", base: 1100000, trend: 0.01 },
    { name: "Education", sector: "Tertiary", base: 1800000, trend: 0.02 },
    { name: "Healthcare & Social", sector: "Tertiary", base: 2100000, trend: 0.05 },
    { name: "IT & Software", sector: "Quaternary", base: 650000, trend: 0.08 },
    { name: "R&D", sector: "Quaternary", base: 380000, trend: 0.06 },
  ];
  
  const regions = ["Seoul", "Busan", "Incheon", "Daegu", "Gwangju", "Daejeon", "Ulsan", "Gyeonggi", "Gangwon", "Chungbuk", "Chungnam", "Jeonbuk", "Jeonnam", "Gyeongbuk", "Gyeongnam", "Jeju"];
  const years = [2019, 2020, 2021, 2022, 2023, 2024];
  
  const regionFactors: { [key: string]: { [sector: string]: number } } = {
    "Seoul": { "Primary": 0.1, "Secondary": 0.7, "Tertiary": 1.4, "Quaternary": 2.0 },
    "Gyeonggi": { "Primary": 0.3, "Secondary": 1.2, "Tertiary": 1.1, "Quaternary": 1.5 },
    "Busan": { "Primary": 0.4, "Secondary": 0.9, "Tertiary": 1.1, "Quaternary": 0.8 },
    "Ulsan": { "Primary": 0.3, "Secondary": 1.8, "Tertiary": 0.7, "Quaternary": 0.6 },
    "Jeonnam": { "Primary": 2.5, "Secondary": 0.6, "Tertiary": 0.7, "Quaternary": 0.3 },
    "Gangwon": { "Primary": 2.0, "Secondary": 0.5, "Tertiary": 0.9, "Quaternary": 0.4 },
  };

  for (const year of years) {
    const yearFactor = Math.pow(1.01, year - 2019);
    const covidFactor = year === 2020 ? 0.97 : year === 2021 ? 0.99 : 1.0;
    
    for (const industry of industries) {
      const yearlyEmployment = industry.base * yearFactor * covidFactor * Math.pow(1 + industry.trend, year - 2019);
      
      for (const region of regions) {
        const regionFactor = regionFactors[region]?.[industry.sector] || 1.0;
        const regionShare = region === "Seoul" ? 0.20 : region === "Gyeonggi" ? 0.25 : 0.055 / (regions.length - 2);
        
        const employment = Math.round(yearlyEmployment * regionShare * regionFactor * (0.9 + Math.random() * 0.2));
        const productivity = (50 + Math.random() * 100) * (industry.sector === "Quaternary" ? 1.5 : industry.sector === "Tertiary" ? 1.0 : 0.8);
        const avgWage = (3000 + Math.random() * 2000) * (industry.sector === "Quaternary" ? 1.4 : industry.sector === "Secondary" ? 1.1 : 1.0);
        
        data.push({
          year,
          period: `${year}`,
          region,
          industry: industry.name,
          sector: industry.sector,
          employment,
          value_added: Math.round(employment * productivity * 0.1),
          productivity: parseFloat(productivity.toFixed(1)),
          avg_wage: Math.round(avgWage),
        });
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
        <DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />Industry Structure Glossary</DialogTitle>
        <DialogDescription>Definitions of employment and industry terms</DialogDescription>
      </DialogHeader>
      <ScrollArea className="h-[60vh] pr-4">
        <div className="space-y-4">
          {Object.entries(industryTermDefinitions).map(([term, def]) => (
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
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4"><Building2 className="w-6 h-6 text-primary" /></div>
        <h1 className="text-2xl font-semibold">Employment & Industry Structure</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Analyze employment distribution across industries, track structural changes, and understand economic transformation patterns.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { icon: Layers, title: "Sector Analysis", desc: "Primary/Secondary/Tertiary" },
          { icon: TrendingUp, title: "Structural Change", desc: "Shifts over time" },
          { icon: MapPin, title: "Regional Patterns", desc: "Geographic distribution" },
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
                {["Industry classification", "Employment counts", "Time period (optional)", "Region (optional)"].map((req) => (
                  <li key={req} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />{req}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-primary mb-3">Results</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["Sector composition", "Industry rankings", "Structural changes", "Regional specialization"].map((res) => (
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

export default function IndustryPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<IndustryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);

  // Configuration
  const [periodCol, setPeriodCol] = useState<string>("");
  const [industryCol, setIndustryCol] = useState<string>("");
  const [sectorCol, setSectorCol] = useState<string>("");
  const [employmentCol, setEmploymentCol] = useState<string>("");
  const [regionCol, setRegionCol] = useState<string>("");
  const [valueAddedCol, setValueAddedCol] = useState<string>("");
  const [productivityCol, setProductivityCol] = useState<string>("");
  const [wageCol, setWageCol] = useState<string>("");
  const [analysisFocus, setAnalysisFocus] = useState<string>("structure");
  const [analysisPeriod, setAnalysisPeriod] = useState<string>("");

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    setColumns(Object.keys(sampleData[0]));
    setPeriodCol("year");
    setIndustryCol("industry");
    setSectorCol("sector");
    setEmploymentCol("employment");
    setRegionCol("region");
    setValueAddedCol("value_added");
    setProductivityCol("productivity");
    setWageCol("avg_wage");
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
    { name: "Industry Column", passed: !!industryCol, message: industryCol ? `Using: ${industryCol}` : "Select industry column" },
    { name: "Employment Data", passed: !!employmentCol, message: employmentCol ? `Using: ${employmentCol}` : "Select employment column" },
    { name: "Sector (optional)", passed: true, message: sectorCol ? `Using: ${sectorCol}` : "Will auto-classify if missing" },
    { name: "Sufficient Data", passed: data.length >= 20, message: data.length >= 50 ? `${data.length} records (good)` : `${data.length} records` },
  ], [data, industryCol, employmentCol, sectorCol]);

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const payload = {
        data, period_col: periodCol || null, industry_col: industryCol,
        sector_col: sectorCol || null, employment_col: employmentCol,
        region_col: regionCol || null, value_added_col: valueAddedCol || null,
        productivity_col: productivityCol || null, wage_col: wageCol || null,
        analysis_focus: analysisFocus, analysis_period: analysisPeriod || "Analysis Period",
      };
      const res = await fetch(`${FASTAPI_URL}/api/analysis/industry-structure`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Analysis failed"); }
      const result: IndustryResult = await res.json();
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
    const industries = results.industry_analysis;
    const headers = "Industry,Sector,Employment,Share,YoY Change,Growth Rate\n";
    const rows = industries.map(i => `${i.industry},${i.sector},${i.employment},${i.employment_share.toFixed(1)}%,${i.yoy_change.toLocaleString()},${i.yoy_growth_rate.toFixed(1)}%`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "industry_structure_results.csv"; a.click();
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const b64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!b64) return;
    const a = document.createElement("a"); a.href = `data:image/png;base64,${b64}`; a.download = `industry_${chartKey}.png`; a.click();
  };

  const formatNumber = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n.toString();

  const renderStep2Config = () => (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Settings className="w-5 h-5 text-primary" />Configure Analysis</CardTitle><CardDescription>Set up industry structure analysis parameters</CardDescription></CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2"><Factory className="w-4 h-4 text-primary" />Industry Classification</h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Industry Column *</Label><Select value={industryCol} onValueChange={setIndustryCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{categoricalColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Sector Column</Label><Select value={sectorCol} onValueChange={setSectorCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{categoricalColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Period Column</Label><Select value={periodCol} onValueChange={setPeriodCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
          </div>
        </div>
        <Separator />
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Employment Data</h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Employment Count *</Label><Select value={employmentCol} onValueChange={setEmploymentCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numericColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Region</Label><Select value={regionCol} onValueChange={setRegionCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{categoricalColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Analysis Period</Label><Input value={analysisPeriod} onChange={e => setAnalysisPeriod(e.target.value)} placeholder="e.g., 2019-2024" /></div>
          </div>
        </div>
        <Separator />
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Additional Metrics</h4>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="space-y-2"><Label>Value Added</Label><Select value={valueAddedCol} onValueChange={setValueAddedCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numericColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Productivity</Label><Select value={productivityCol} onValueChange={setProductivityCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numericColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Average Wage</Label><Select value={wageCol} onValueChange={setWageCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numericColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
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
    const finding = `Total ${formatNumber(summary.total_employment)} employed across ${overall_metrics.n_industries} industries. ${summary.dominant_sector} dominates with ${summary.dominant_sector_share.toFixed(1)}% share. ${summary.structural_trend}. Top growth: ${summary.top_growing_industry}.`;
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Activity className="w-5 h-5 text-primary" />Results</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} status="neutral" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={formatNumber(summary.total_employment)} label="Total Employment" icon={Users} highlight trend={overall_metrics.yoy_growth_rate} />
            <MetricCard value={overall_metrics.n_industries} label="Industries" icon={Factory} />
            <MetricCard value={`${summary.dominant_sector_share.toFixed(1)}%`} label={summary.dominant_sector} icon={Layers} highlight />
            <MetricCard value={`${overall_metrics.yoy_growth_rate >= 0 ? '+' : ''}${overall_metrics.yoy_growth_rate.toFixed(1)}%`} label="YoY Growth" icon={TrendingUp} warning={overall_metrics.yoy_growth_rate < 0} />
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border text-center"><p className="text-xs text-muted-foreground">Primary</p><p className="text-lg font-semibold">{overall_metrics.primary_share.toFixed(1)}%</p></div>
            <div className="p-3 rounded-lg border text-center"><p className="text-xs text-muted-foreground">Secondary</p><p className="text-lg font-semibold">{overall_metrics.secondary_share.toFixed(1)}%</p></div>
            <div className="p-3 rounded-lg border text-center"><p className="text-xs text-muted-foreground">Tertiary</p><p className="text-lg font-semibold">{overall_metrics.tertiary_share.toFixed(1)}%</p></div>
            <div className="p-3 rounded-lg border text-center bg-primary/5"><p className="text-xs text-muted-foreground">Quaternary</p><p className="text-lg font-semibold text-primary">{(100 - overall_metrics.primary_share - overall_metrics.secondary_share - overall_metrics.tertiary_share).toFixed(1)}%</p></div>
          </div>
          {results.key_insights.map((ins, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${ins.status === "positive" ? "border-primary/30 bg-primary/5" : ins.status === "warning" ? "border-destructive/30 bg-destructive/5" : "border-border"}`}>
              {ins.status === "positive" ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> : ins.status === "warning" ? <AlertTriangle className="w-5 h-5 text-destructive shrink-0" /> : <Info className="w-5 h-5 shrink-0" />}
              <div><p className="font-medium text-sm">{ins.title}</p><p className="text-sm text-muted-foreground">{ins.description}</p></div>
            </div>
          ))}
          <DetailParagraph title="Summary" detail={`■ Total Employment: ${summary.total_employment.toLocaleString()}\n■ Industries: ${overall_metrics.n_industries}\n■ Dominant Sector: ${summary.dominant_sector} (${summary.dominant_sector_share.toFixed(1)}%)\n■ Sector Shares:\n  • Primary: ${overall_metrics.primary_share.toFixed(1)}%\n  • Secondary: ${overall_metrics.secondary_share.toFixed(1)}%\n  • Tertiary: ${overall_metrics.tertiary_share.toFixed(1)}%\n■ YoY Change: ${overall_metrics.yoy_employment_change.toLocaleString()} (${overall_metrics.yoy_growth_rate.toFixed(1)}%)\n■ Top Growing: ${summary.top_growing_industry}\n■ Top Declining: ${summary.top_declining_industry}`} />
          <div className="flex justify-end pt-4"><Button onClick={() => setCurrentStep(5)} className="gap-2">Understand Why<ArrowRight className="w-4 h-4" /></Button></div>
        </CardContent>
      </Card>
    );
  };

  const renderStep5Why = () => {
    if (!results) return null;
    const { summary, overall_metrics } = results;
    const exps = [
      { n: 1, t: "Sector Classification", c: `Primary (agriculture/mining), Secondary (manufacturing), Tertiary (services), Quaternary (knowledge). ${summary.dominant_sector} dominates.` },
      { n: 2, t: "Structural Change", c: `${summary.structural_trend}. Typical pattern: Primary→Secondary→Tertiary as economies develop.` },
      { n: 3, t: "Employment Growth", c: `${overall_metrics.yoy_growth_rate >= 0 ? '+' : ''}${overall_metrics.yoy_growth_rate.toFixed(1)}% YoY. ${summary.top_growing_industry} leading growth.` },
      { n: 4, t: "Industry Dynamics", c: `${overall_metrics.n_industries} industries tracked. Diversification reduces economic vulnerability.` },
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
          <DetailParagraph title="Methodology" detail={`■ Sector Classification\nPrimary: Agriculture, mining, fishing\nSecondary: Manufacturing, construction\nTertiary: Services (retail, finance, etc.)\nQuaternary: Knowledge (IT, R&D)\n\n■ Employment Share\nShare = Industry Employment / Total × 100%\nShows relative importance of each industry\n\n■ Structural Change Analysis\nCompares sector shares over time\nShift-share decomposes into national/industry/regional effects\n\n■ Location Quotient\nLQ = (Local Share) / (National Share)\nLQ > 1: Regional specialization\n\n■ Policy Implications\n• Declining sectors: Transition support\n• Growing sectors: Investment, training\n• Regional gaps: Diversification policies`} />
          <div className="flex justify-between pt-4"><Button variant="outline" onClick={() => setCurrentStep(4)}>Back</Button><Button onClick={() => setCurrentStep(6)} className="gap-2">View Full Report<ArrowRight className="w-4 h-4" /></Button></div>
        </CardContent>
      </Card>
    );
  };

  const renderStep6Report = () => {
    if (!results) return null;
    const { summary, sector_analysis, industry_analysis, overall_metrics } = results;
    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b"><h1 className="text-xl font-semibold">Employment & Industry Structure Report</h1><p className="text-sm text-muted-foreground">{summary.analysis_period} | {new Date().toLocaleDateString()}</p></div>
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="w-5 h-5 text-indigo-600" />Executive Summary</CardTitle></CardHeader>
          <CardContent><p className="text-sm leading-relaxed">Industry structure analysis for <strong>{summary.analysis_period}</strong> shows <strong>{formatNumber(summary.total_employment)}</strong> total employment across <strong>{overall_metrics.n_industries}</strong> industries. <strong>{summary.dominant_sector}</strong> sector dominates with <strong>{summary.dominant_sector_share.toFixed(1)}%</strong> share. Employment changed <strong>{overall_metrics.yoy_growth_rate >= 0 ? '+' : ''}{overall_metrics.yoy_growth_rate.toFixed(1)}%</strong> YoY. <strong>{summary.top_growing_industry}</strong> shows strongest growth while <strong>{summary.top_declining_industry}</strong> is declining. Structural trend: <strong>{summary.structural_trend}</strong>.</p></CardContent>
        </Card>
        <div className="grid grid-cols-4 gap-3">
          <MetricCard value={formatNumber(summary.total_employment)} label="Employment" icon={Users} highlight />
          <MetricCard value={overall_metrics.n_industries} label="Industries" icon={Factory} />
          <MetricCard value={`${summary.dominant_sector_share.toFixed(1)}%`} label={summary.dominant_sector} icon={Layers} />
          <MetricCard value={`${overall_metrics.yoy_growth_rate >= 0 ? '+' : ''}${overall_metrics.yoy_growth_rate.toFixed(1)}%`} label="YoY Growth" icon={TrendingUp} />
        </div>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Visualizations</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="composition">
              <TabsList className="grid w-full grid-cols-5 mb-4">{["composition", "ranking", "trend", "change", "regional"].map(t => <TabsTrigger key={t} value={t} className="text-xs">{t}</TabsTrigger>)}</TabsList>
              {[{ k: "sector_composition", t: "composition" }, { k: "industry_ranking", t: "ranking" }, { k: "trend_chart", t: "trend" }, { k: "structural_change", t: "change" }, { k: "regional_map", t: "regional" }].map(({ k, t }) => (
                <TabsContent key={k} value={t}>{results.visualizations[k as keyof typeof results.visualizations] && (<div className="relative border rounded-lg overflow-hidden"><img src={`data:image/png;base64,${results.visualizations[k as keyof typeof results.visualizations]}`} alt={k} className="w-full" /><Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => handleDownloadPNG(k)}><Download className="w-4 h-4" /></Button></div>)}</TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Sector Summary</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Sector</TableHead><TableHead className="text-right">Employment</TableHead><TableHead className="text-right">Share</TableHead><TableHead className="text-right">Industries</TableHead><TableHead className="text-right">Growth</TableHead></TableRow></TableHeader>
              <TableBody>{sector_analysis.map(s => (
                <TableRow key={s.sector}><TableCell className="font-medium">{s.sector}</TableCell><TableCell className="text-right">{formatNumber(s.employment)}</TableCell><TableCell className="text-right">{s.employment_share.toFixed(1)}%</TableCell><TableCell className="text-right">{s.n_industries}</TableCell><TableCell className="text-right"><Badge variant={s.growth_rate >= 0 ? "default" : "destructive"} className="text-xs">{s.growth_rate >= 0 ? '+' : ''}{s.growth_rate.toFixed(1)}%</Badge></TableCell></TableRow>
              ))}</TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Top Industries by Employment</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Industry</TableHead><TableHead>Sector</TableHead><TableHead className="text-right">Employment</TableHead><TableHead className="text-right">Share</TableHead><TableHead className="text-right">Growth</TableHead></TableRow></TableHeader>
              <TableBody>{industry_analysis.slice(0, 12).map(i => (
                <TableRow key={i.industry}><TableCell className="font-medium">{i.industry}</TableCell><TableCell><Badge variant="outline" className="text-xs">{i.sector}</Badge></TableCell><TableCell className="text-right">{formatNumber(i.employment)}</TableCell><TableCell className="text-right">{i.employment_share.toFixed(1)}%</TableCell><TableCell className="text-right"><Badge variant={i.yoy_growth_rate >= 0 ? "default" : "destructive"} className="text-xs">{i.yoy_growth_rate >= 0 ? '+' : ''}{i.yoy_growth_rate.toFixed(1)}%</Badge></TableCell></TableRow>
              ))}</TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card><CardHeader className="pb-3"><CardTitle className="text-base">Export</CardTitle></CardHeader><CardContent><div className="flex gap-3"><Button variant="outline" onClick={handleDownloadCSV} className="gap-2"><FileSpreadsheet className="w-4 h-4" />CSV</Button><Button variant="outline" onClick={() => handleDownloadPNG("sector_composition")} className="gap-2"><Download className="w-4 h-4" />Chart</Button></div></CardContent></Card>
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