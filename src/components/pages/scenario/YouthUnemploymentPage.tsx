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
  Briefcase, Upload, ArrowRight, CheckCircle2, XCircle,
  Shield, Info, HelpCircle, FileSpreadsheet, FileText, Download,
  TrendingUp, TrendingDown, Settings, Activity, AlertTriangle, ChevronRight,
  BarChart3, Calendar, Users, MapPin, BookOpen, ArrowUpRight, ArrowDownRight,
  GraduationCap, Building2, Clock,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

// ============================================================
// Statistical Terms Glossary
// ============================================================
const unemploymentTermDefinitions: Record<string, string> = {
  "Unemployment Rate": "Percentage of the labor force that is unemployed and actively seeking work. Calculated as (Unemployed / Labor Force) × 100.",
  "Labor Force": "Total number of people employed plus unemployed who are actively seeking work. Excludes those not looking for work.",
  "Labor Force Participation Rate": "Percentage of working-age population that is in the labor force. Measures economic engagement.",
  "Employed": "People who worked at least one hour for pay during the reference period, or were temporarily absent from work.",
  "Unemployed": "People without work who are available for work and actively seeking employment during the reference period.",
  "Employment Rate": "Percentage of working-age population that is employed. Also called employment-to-population ratio.",
  "Underemployment": "Workers employed part-time who want full-time work, or those in jobs below their skill level.",
  "Discouraged Workers": "People who want work but have stopped searching because they believe no jobs are available for them.",
  "Hidden Unemployment": "Underemployment plus discouraged workers. Not captured in official unemployment rate.",
  "Youth Unemployment": "Unemployment rate for people aged 15-24. Often higher than overall rate due to limited experience.",
  "Long-term Unemployment": "Unemployment lasting 27 weeks (6 months) or longer. Indicates structural labor market issues.",
  "Frictional Unemployment": "Short-term unemployment from job transitions. Normal and often voluntary (job searching, relocation).",
  "Structural Unemployment": "Mismatch between worker skills and job requirements. Caused by technological change or industry shifts.",
  "Cyclical Unemployment": "Unemployment caused by economic downturns. Rises during recessions, falls during expansions.",
  "Seasonal Unemployment": "Regular, predictable unemployment due to seasonal patterns in certain industries (tourism, agriculture).",
  "Natural Rate of Unemployment": "The unemployment rate when the economy is at full employment. Includes frictional and structural unemployment.",
  "Full Employment": "Economic condition where all available labor resources are being used efficiently. Some unemployment still exists.",
  "Job Vacancy Rate": "Number of unfilled job openings as percentage of total positions. Indicates labor demand.",
  "Beveridge Curve": "Inverse relationship between unemployment rate and job vacancy rate. Shows labor market efficiency.",
  "NAIRU": "Non-Accelerating Inflation Rate of Unemployment. Unemployment rate consistent with stable inflation.",
  "Okun's Law": "Empirical relationship between unemployment and GDP. Each 1% increase in unemployment reduces GDP by about 2%.",
  "Hysteresis": "Phenomenon where temporary unemployment becomes permanent due to skill erosion and stigma effects.",
  "Active Labor Market Policies": "Government programs to help unemployed find work: training, job search assistance, subsidies.",
  "Unemployment Insurance": "Government program providing temporary income to eligible unemployed workers.",
  "Jobless Claims": "Weekly count of new applications for unemployment benefits. Leading indicator of labor market health."
};

interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface RegionUnemployment {
  region: string;
  unemployment_rate: number;
  labor_force: number;
  employed: number;
  unemployed: number;
  participation_rate: number;
  employment_rate: number;
  yoy_change: number | null;
}

interface DemographicUnemployment {
  segment: string;
  unemployment_rate: number;
  labor_force: number;
  unemployed: number;
  share_of_unemployed: number;
}

interface UnemploymentResult {
  success: boolean;
  overall_metrics: {
    unemployment_rate: number;
    labor_force: number;
    employed: number;
    unemployed: number;
    participation_rate: number;
    employment_rate: number;
    yoy_change: number;
    youth_unemployment: number | null;
    long_term_share: number | null;
  };
  temporal_analysis: {
    periods: string[];
    unemployment_rates: number[];
    employment_rates: number[];
    participation_rates: number[];
    labor_force: number[];
  };
  regional_analysis: RegionUnemployment[];
  demographic_analysis: {
    by_age: DemographicUnemployment[];
    by_gender: DemographicUnemployment[];
    by_education: DemographicUnemployment[];
  };
  duration_analysis: {
    buckets: string[];
    counts: number[];
    shares: number[];
    avg_duration_weeks: number;
  };
  visualizations: {
    trend_chart?: string;
    regional_comparison?: string;
    demographic_chart?: string;
    duration_chart?: string;
    decomposition_chart?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    analysis_period: string;
    unemployment_rate: number;
    labor_force: number;
    unemployed: number;
    yoy_change: number;
    trend_direction: string;
    highest_region: string;
    lowest_region: string;
    highest_demographic: string;
    labor_market_status: string;
  };
}

const ANALYSIS_FOCUS = [
  { value: "trend", label: "Trend Analysis", desc: "Track rates over time" },
  { value: "regional", label: "Regional Comparison", desc: "Compare across regions" },
  { value: "demographic", label: "Demographic Analysis", desc: "Age, gender, education" },
  { value: "duration", label: "Duration Analysis", desc: "Unemployment duration" },
];

const generateSampleData = (): DataRow[] => {
  const data: DataRow[] = [];
  const regions = ["Seoul", "Busan", "Incheon", "Daegu", "Gwangju", "Daejeon", "Ulsan", "Gyeonggi", "Gangwon", "Chungbuk", "Chungnam", "Jeonbuk", "Jeonnam", "Gyeongbuk", "Gyeongnam", "Jeju"];
  const years = [2019, 2020, 2021, 2022, 2023, 2024];
  const months = [1, 4, 7, 10]; // Quarterly
  const ageGroups = ["15-24", "25-34", "35-44", "45-54", "55-64", "65+"];
  const genders = ["Male", "Female"];
  const educations = ["Below High School", "High School", "College", "University+"];
  const durations = ["<1 month", "1-3 months", "3-6 months", "6-12 months", "12+ months"];

  const baseRates: { [key: string]: number } = {
    "Seoul": 3.8, "Busan": 4.2, "Incheon": 3.9, "Daegu": 4.0,
    "Gwangju": 3.5, "Daejeon": 3.6, "Ulsan": 4.5, "Gyeonggi": 3.7,
    "Gangwon": 3.2, "Chungbuk": 3.0, "Chungnam": 2.8, "Jeonbuk": 2.9,
    "Jeonnam": 2.5, "Gyeongbuk": 3.1, "Gyeongnam": 3.3, "Jeju": 2.8
  };

  const populations: { [key: string]: number } = {
    "Seoul": 9700000, "Busan": 3400000, "Incheon": 2900000, "Daegu": 2400000,
    "Gwangju": 1500000, "Daejeon": 1500000, "Ulsan": 1100000, "Gyeonggi": 13500000,
    "Gangwon": 1500000, "Chungbuk": 1600000, "Chungnam": 2100000, "Jeonbuk": 1800000,
    "Jeonnam": 1800000, "Gyeongbuk": 2600000, "Gyeongnam": 3300000, "Jeju": 670000
  };

  for (const year of years) {
    for (const month of months) {
      // COVID impact in 2020
      const covidFactor = year === 2020 ? 1.4 : year === 2021 ? 1.2 : 1.0;
      // Recovery trend
      const recoveryFactor = year >= 2022 ? 0.95 : 1.0;

      for (const region of regions) {
        const basePop = populations[region];
        const workingAgePop = basePop * 0.72;
        const participationRate = 62 + Math.random() * 5;
        const laborForce = Math.round(workingAgePop * participationRate / 100);

        const baseRate = baseRates[region];
        const seasonalFactor = month === 1 ? 1.1 : month === 7 ? 0.95 : 1.0;
        const unemploymentRate = baseRate * covidFactor * recoveryFactor * seasonalFactor * (0.95 + Math.random() * 0.1);

        const unemployed = Math.round(laborForce * unemploymentRate / 100);
        const employed = laborForce - unemployed;

        for (const ageGroup of ageGroups) {
          // Youth unemployment higher
          const ageFactor = ageGroup === "15-24" ? 2.5 : ageGroup === "25-34" ? 1.2 : ageGroup === "65+" ? 1.3 : 1.0;
          const ageShare = ageGroup === "15-24" ? 0.08 : ageGroup === "25-34" ? 0.20 : ageGroup === "35-44" ? 0.22 : ageGroup === "45-54" ? 0.22 : ageGroup === "55-64" ? 0.18 : 0.10;

          for (const gender of genders) {
            const genderFactor = gender === "Female" ? 1.05 : 1.0;
            const genderShare = gender === "Female" ? 0.48 : 0.52;

            for (const education of educations) {
              const eduFactor = education === "Below High School" ? 1.5 : education === "High School" ? 1.2 : education === "College" ? 1.0 : 0.8;
              const eduShare = education === "Below High School" ? 0.15 : education === "High School" ? 0.35 : education === "College" ? 0.25 : 0.25;

              const segmentLF = Math.round(laborForce * ageShare * genderShare * eduShare);
              const segmentRate = unemploymentRate * ageFactor * genderFactor * eduFactor * (0.9 + Math.random() * 0.2);
              const segmentUnemployed = Math.round(segmentLF * Math.min(segmentRate, 30) / 100);

              // Duration distribution
              const duration = durations[Math.floor(Math.random() * durations.length)];
              const longTermProb = year === 2020 || year === 2021 ? 0.25 : 0.15;
              const actualDuration = Math.random() < longTermProb ? durations[4] : duration;

              if (segmentLF > 0) {
                data.push({
                  period: `${year}-${String(month).padStart(2, '0')}`,
                  year,
                  month,
                  region,
                  age_group: ageGroup,
                  gender,
                  education,
                  duration: actualDuration,
                  labor_force: segmentLF,
                  employed: segmentLF - segmentUnemployed,
                  unemployed: segmentUnemployed,
                  unemployment_rate: parseFloat(segmentRate.toFixed(1)),
                  participation_rate: parseFloat(participationRate.toFixed(1)),
                });
              }
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
        <DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />Unemployment Analysis Glossary</DialogTitle>
        <DialogDescription>Definitions of labor market and unemployment terms</DialogDescription>
      </DialogHeader>
      <ScrollArea className="h-[60vh] pr-4">
        <div className="space-y-4">
          {Object.entries(unemploymentTermDefinitions).map(([term, def]) => (
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
      <div className={`flex items-center justify-center gap-1 mt-1 text-xs ${trend <= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {trend <= 0 ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}{Math.abs(trend).toFixed(1)}%p
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
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4"><Briefcase className="w-6 h-6 text-primary" /></div>
        <h1 className="text-2xl font-semibold">Unemployment Trend Analysis</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Analyze labor market trends, unemployment patterns, and demographic disparities for evidence-based policy making.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { icon: TrendingUp, title: "Trend Analysis", desc: "Track rates over time" },
          { icon: MapPin, title: "Regional Patterns", desc: "Geographic disparities" },
          { icon: Users, title: "Demographics", desc: "Age, gender, education" },
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
                {["Time period identifier", "Unemployment rate or counts", "Labor force data", "Optional: region, demographics"].map((req) => (
                  <li key={req} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />{req}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-primary mb-3">Results</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["Unemployment rate trends", "Regional comparisons", "Demographic breakdowns", "Duration analysis"].map((res) => (
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

export default function UnemploymentPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<UnemploymentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);

  // Configuration
  const [periodCol, setPeriodCol] = useState<string>("");
  const [unemploymentRateCol, setUnemploymentRateCol] = useState<string>("");
  const [laborForceCol, setLaborForceCol] = useState<string>("");
  const [unemployedCol, setUnemployedCol] = useState<string>("");
  const [employedCol, setEmployedCol] = useState<string>("");
  const [regionCol, setRegionCol] = useState<string>("");
  const [ageGroupCol, setAgeGroupCol] = useState<string>("");
  const [genderCol, setGenderCol] = useState<string>("");
  const [educationCol, setEducationCol] = useState<string>("");
  const [durationCol, setDurationCol] = useState<string>("");
  const [analysisFocus, setAnalysisFocus] = useState<string>("trend");
  const [analysisPeriod, setAnalysisPeriod] = useState<string>("");

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    setColumns(Object.keys(sampleData[0]));
    setPeriodCol("period");
    setUnemploymentRateCol("unemployment_rate");
    setLaborForceCol("labor_force");
    setUnemployedCol("unemployed");
    setEmployedCol("employed");
    setRegionCol("region");
    setAgeGroupCol("age_group");
    setGenderCol("gender");
    setEducationCol("education");
    setDurationCol("duration");
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
    { name: "Time Period", passed: !!periodCol, message: periodCol ? `Using: ${periodCol}` : "Select period column" },
    { name: "Unemployment Data", passed: !!unemploymentRateCol || !!unemployedCol, message: unemploymentRateCol || unemployedCol ? `Using: ${unemploymentRateCol || unemployedCol}` : "Select rate or count" },
    { name: "Labor Force", passed: !!laborForceCol, message: laborForceCol ? `Using: ${laborForceCol}` : "Recommended for rates" },
    { name: "Sufficient Data", passed: data.length >= 50, message: data.length >= 100 ? `${data.length} records (good)` : `${data.length} records` },
  ], [data, periodCol, unemploymentRateCol, unemployedCol, laborForceCol]);

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const payload = {
        data, period_col: periodCol, unemployment_rate_col: unemploymentRateCol || null,
        labor_force_col: laborForceCol || null, unemployed_col: unemployedCol || null, employed_col: employedCol || null,
        region_col: regionCol || null, age_group_col: ageGroupCol || null, gender_col: genderCol || null,
        education_col: educationCol || null, duration_col: durationCol || null,
        analysis_focus: analysisFocus, analysis_period: analysisPeriod || "Analysis Period",
      };
      const res = await fetch(`${FASTAPI_URL}/api/analysis/unemployment`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Analysis failed"); }
      const result: UnemploymentResult = await res.json();
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
    const headers = "Region,Unemployment Rate,Labor Force,Unemployed,YoY Change\n";
    const rows = regions.map(r => `${r.region},${r.unemployment_rate.toFixed(1)}%,${r.labor_force},${r.unemployed},${r.yoy_change?.toFixed(1) || 'N/A'}%p`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "unemployment_results.csv"; a.click();
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const b64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!b64) return;
    const a = document.createElement("a"); a.href = `data:image/png;base64,${b64}`; a.download = `unemployment_${chartKey}.png`; a.click();
  };

  const renderStep2Config = () => (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Settings className="w-5 h-5 text-primary" />Configure Analysis</CardTitle><CardDescription>Set up unemployment analysis parameters</CardDescription></CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" />Time & Core Metrics</h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Period Column *</Label><Select value={periodCol} onValueChange={setPeriodCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Unemployment Rate</Label><Select value={unemploymentRateCol} onValueChange={setUnemploymentRateCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numericColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Analysis Period</Label><Input value={analysisPeriod} onChange={e => setAnalysisPeriod(e.target.value)} placeholder="e.g., 2019-2024" /></div>
          </div>
        </div>
        <Separator />
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Labor Force Data</h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Labor Force</Label><Select value={laborForceCol} onValueChange={setLaborForceCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numericColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Unemployed</Label><Select value={unemployedCol} onValueChange={setUnemployedCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numericColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Employed</Label><Select value={employedCol} onValueChange={setEmployedCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numericColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
          </div>
        </div>
        <Separator />
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Breakdown Columns</h4>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="space-y-2"><Label>Region</Label><Select value={regionCol} onValueChange={setRegionCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{categoricalColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Age Group</Label><Select value={ageGroupCol} onValueChange={setAgeGroupCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{categoricalColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Gender</Label><Select value={genderCol} onValueChange={setGenderCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{categoricalColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Education</Label><Select value={educationCol} onValueChange={setEducationCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{categoricalColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Unemployment Duration</Label><Select value={durationCol} onValueChange={setDurationCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{categoricalColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
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
    const finding = `Unemployment rate: ${summary.unemployment_rate.toFixed(1)}% (${summary.yoy_change >= 0 ? '+' : ''}${summary.yoy_change.toFixed(1)}%p YoY). ${summary.unemployed.toLocaleString()} unemployed out of ${summary.labor_force.toLocaleString()} labor force. ${summary.labor_market_status}.`;
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Activity className="w-5 h-5 text-primary" />Results</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} status={summary.unemployment_rate < 4 ? "positive" : summary.unemployment_rate > 6 ? "warning" : "neutral"} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={`${summary.unemployment_rate.toFixed(1)}%`} label="Unemployment Rate" icon={Briefcase} highlight trend={summary.yoy_change} />
            <MetricCard value={summary.unemployed.toLocaleString()} label="Unemployed" icon={Users} warning={summary.unemployed > 1000000} />
            <MetricCard value={summary.labor_force.toLocaleString()} label="Labor Force" icon={Building2} />
            <MetricCard value={`${overall_metrics.participation_rate.toFixed(1)}%`} label="Participation" icon={Activity} />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5"><p className="text-xs text-muted-foreground mb-1">Highest Unemployment</p><p className="text-lg font-semibold">{summary.highest_region}</p><p className="text-sm text-destructive">Highest rate region</p></div>
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5"><p className="text-xs text-muted-foreground mb-1">Lowest Unemployment</p><p className="text-lg font-semibold">{summary.lowest_region}</p><p className="text-sm text-primary">Best performing region</p></div>
          </div>
          {results.key_insights.map((ins, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${ins.status === "positive" ? "border-primary/30 bg-primary/5" : ins.status === "warning" ? "border-destructive/30 bg-destructive/5" : "border-border"}`}>
              {ins.status === "positive" ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> : ins.status === "warning" ? <AlertTriangle className="w-5 h-5 text-destructive shrink-0" /> : <Info className="w-5 h-5 shrink-0" />}
              <div><p className="font-medium text-sm">{ins.title}</p><p className="text-sm text-muted-foreground">{ins.description}</p></div>
            </div>
          ))}
          <DetailParagraph title="Summary" detail={`■ Unemployment Rate: ${summary.unemployment_rate.toFixed(1)}%\n■ YoY Change: ${summary.yoy_change >= 0 ? '+' : ''}${summary.yoy_change.toFixed(1)}%p\n■ Labor Force: ${summary.labor_force.toLocaleString()}\n■ Unemployed: ${summary.unemployed.toLocaleString()}\n■ Employment Rate: ${overall_metrics.employment_rate.toFixed(1)}%\n■ Participation Rate: ${overall_metrics.participation_rate.toFixed(1)}%\n■ Trend: ${summary.trend_direction}\n■ Status: ${summary.labor_market_status}`} />
          <div className="flex justify-end pt-4"><Button onClick={() => setCurrentStep(5)} className="gap-2">Understand Why<ArrowRight className="w-4 h-4" /></Button></div>
        </CardContent>
      </Card>
    );
  };

  const renderStep5Why = () => {
    if (!results) return null;
    const { summary, overall_metrics } = results;
    const exps = [
      { n: 1, t: "Unemployment Rate", c: `${summary.unemployment_rate.toFixed(1)}% = Unemployed / Labor Force. ${summary.unemployment_rate < 4 ? 'Low (healthy)' : summary.unemployment_rate > 6 ? 'High (concern)' : 'Moderate'}.` },
      { n: 2, t: "YoY Change", c: `${summary.yoy_change >= 0 ? '+' : ''}${summary.yoy_change.toFixed(1)}%p vs last year. ${summary.yoy_change < 0 ? 'Improving labor market' : summary.yoy_change > 1 ? 'Deteriorating conditions' : 'Stable'}.` },
      { n: 3, t: "Participation Rate", c: `${overall_metrics.participation_rate.toFixed(1)}% of working-age pop in labor force. Measures economic engagement.` },
      { n: 4, t: "Regional Gap", c: `${summary.highest_region} vs ${summary.lowest_region}. Regional disparities indicate uneven economic development.` },
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
          <div className="grid grid-cols-4 gap-3">{[{ r: "<4%", l: "Low" }, { r: "4-5%", l: "Natural" }, { r: "5-7%", l: "Moderate" }, { r: ">7%", l: "High" }].map(g => (
            <div key={g.r} className="p-3 border rounded-lg text-center"><p className="font-semibold text-sm">{g.r}</p><p className="text-xs text-primary">{g.l}</p></div>
          ))}</div>
          <DetailParagraph title="Methodology" detail={`■ Unemployment Rate\nRate = (Unemployed / Labor Force) × 100%\nUnemployed: Without work, available, actively seeking\n\n■ Labor Force Participation\nLFPR = (Labor Force / Working-Age Pop) × 100%\nShows economic engagement level\n\n■ Types of Unemployment\n• Frictional: Job transitions (normal)\n• Structural: Skills mismatch\n• Cyclical: Economic downturns\n• Seasonal: Predictable patterns\n\n■ Natural Rate\n~4-5% in developed economies\nIncludes frictional + structural\n\n■ Policy Levers\n• Monetary policy (interest rates)\n• Fiscal policy (stimulus/austerity)\n• Active labor market programs\n• Education & training`} />
          <div className="flex justify-between pt-4"><Button variant="outline" onClick={() => setCurrentStep(4)}>Back</Button><Button onClick={() => setCurrentStep(6)} className="gap-2">View Full Report<ArrowRight className="w-4 h-4" /></Button></div>
        </CardContent>
      </Card>
    );
  };

  const renderStep6Report = () => {
    if (!results) return null;
    const { summary, regional_analysis, demographic_analysis, overall_metrics } = results;
    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b"><h1 className="text-xl font-semibold">Unemployment Trend Report</h1><p className="text-sm text-muted-foreground">{summary.analysis_period} | {new Date().toLocaleDateString()}</p></div>
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="w-5 h-5 text-blue-600" />Executive Summary</CardTitle></CardHeader>
          <CardContent><p className="text-sm leading-relaxed">Labor market analysis for <strong>{summary.analysis_period}</strong> shows an unemployment rate of <strong>{summary.unemployment_rate.toFixed(1)}%</strong> ({summary.yoy_change >= 0 ? '+' : ''}{summary.yoy_change.toFixed(1)}%p YoY), with <strong>{summary.unemployed.toLocaleString()}</strong> unemployed out of <strong>{summary.labor_force.toLocaleString()}</strong> labor force. <strong>{summary.highest_region}</strong> has the highest unemployment while <strong>{summary.lowest_region}</strong> performs best. Overall status: <strong>{summary.labor_market_status}</strong>.</p></CardContent>
        </Card>
        <div className="grid grid-cols-4 gap-3">
          <MetricCard value={`${summary.unemployment_rate.toFixed(1)}%`} label="Unemp. Rate" icon={Briefcase} highlight />
          <MetricCard value={`${overall_metrics.employment_rate.toFixed(1)}%`} label="Emp. Rate" icon={Building2} />
          <MetricCard value={`${overall_metrics.participation_rate.toFixed(1)}%`} label="Participation" icon={Users} />
          <MetricCard value={`${summary.yoy_change >= 0 ? '+' : ''}${summary.yoy_change.toFixed(1)}%p`} label="YoY Change" icon={TrendingUp} warning={summary.yoy_change > 0} />
        </div>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Visualizations</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="trend">
              <TabsList className="grid w-full grid-cols-5 mb-4">{["trend", "regional", "demographic", "duration", "decomposition"].map(t => <TabsTrigger key={t} value={t} className="text-xs">{t}</TabsTrigger>)}</TabsList>
              {[{ k: "trend_chart", t: "trend" }, { k: "regional_comparison", t: "regional" }, { k: "demographic_chart", t: "demographic" }, { k: "duration_chart", t: "duration" }, { k: "decomposition_chart", t: "decomposition" }].map(({ k, t }) => (
                <TabsContent key={k} value={t}>{results.visualizations[k as keyof typeof results.visualizations] && (<div className="relative border rounded-lg overflow-hidden"><img src={`data:image/png;base64,${results.visualizations[k as keyof typeof results.visualizations]}`} alt={k} className="w-full" /><Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => handleDownloadPNG(k)}><Download className="w-4 h-4" /></Button></div>)}</TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Regional Analysis</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Region</TableHead><TableHead className="text-right">Rate</TableHead><TableHead className="text-right">Labor Force</TableHead><TableHead className="text-right">Unemployed</TableHead><TableHead className="text-right">YoY</TableHead></TableRow></TableHeader>
              <TableBody>{regional_analysis.slice(0, 12).map(r => (
                <TableRow key={r.region}><TableCell className="font-medium">{r.region}</TableCell><TableCell className="text-right"><Badge variant={r.unemployment_rate < 4 ? "default" : r.unemployment_rate > 5 ? "destructive" : "secondary"} className="text-xs">{r.unemployment_rate.toFixed(1)}%</Badge></TableCell><TableCell className="text-right">{r.labor_force.toLocaleString()}</TableCell><TableCell className="text-right">{r.unemployed.toLocaleString()}</TableCell><TableCell className="text-right">{r.yoy_change !== null ? `${r.yoy_change >= 0 ? '+' : ''}${r.yoy_change.toFixed(1)}%p` : '-'}</TableCell></TableRow>
              ))}</TableBody>
            </Table>
          </CardContent>
        </Card>
        {demographic_analysis.by_age.length > 0 && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Demographic Breakdown</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Age Group</TableHead><TableHead className="text-right">Rate</TableHead><TableHead className="text-right">Unemployed</TableHead><TableHead className="text-right">Share</TableHead></TableRow></TableHeader>
                <TableBody>{demographic_analysis.by_age.map(d => (
                  <TableRow key={d.segment}><TableCell className="font-medium">{d.segment}</TableCell><TableCell className="text-right"><Badge variant={d.unemployment_rate > 10 ? "destructive" : "secondary"} className="text-xs">{d.unemployment_rate.toFixed(1)}%</Badge></TableCell><TableCell className="text-right">{d.unemployed.toLocaleString()}</TableCell><TableCell className="text-right">{(d.share_of_unemployed * 100).toFixed(1)}%</TableCell></TableRow>
                ))}</TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        <Card><CardHeader className="pb-3"><CardTitle className="text-base">Export</CardTitle></CardHeader><CardContent><div className="flex gap-3"><Button variant="outline" onClick={handleDownloadCSV} className="gap-2"><FileSpreadsheet className="w-4 h-4" />CSV</Button><Button variant="outline" onClick={() => handleDownloadPNG("trend_chart")} className="gap-2"><Download className="w-4 h-4" />Chart</Button></div></CardContent></Card>
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