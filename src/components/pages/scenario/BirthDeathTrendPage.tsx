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
  Baby, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle,
  Shield, Info, HelpCircle, FileSpreadsheet, FileText, Download,
  TrendingUp, TrendingDown, Settings, Activity, AlertTriangle, ChevronRight, Target,
  BarChart3, Calendar, Users, Heart, Skull, BookOpen, MapPin,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-995604437166.asia-northeast3.run.app";

// ============================================================
// Statistical Terms Glossary
// ============================================================
const demographicTermDefinitions: Record<string, string> = {
  "Crude Birth Rate (CBR)": "Number of live births per 1,000 population in a given year. A basic measure of fertility that doesn't account for age structure.",
  "Crude Death Rate (CDR)": "Number of deaths per 1,000 population in a given year. Affected by population age structure.",
  "Total Fertility Rate (TFR)": "Average number of children a woman would have over her lifetime at current age-specific fertility rates. TFR of 2.1 is replacement level.",
  "Replacement Level Fertility": "The TFR (approximately 2.1) at which a population exactly replaces itself from one generation to the next, without migration.",
  "Natural Increase Rate": "The difference between birth rate and death rate, expressed per 1,000 population. Positive means population growth; negative means decline.",
  "Infant Mortality Rate (IMR)": "Number of deaths of infants under age 1 per 1,000 live births. Key indicator of healthcare quality and socioeconomic development.",
  "Life Expectancy": "Average number of years a person is expected to live from birth, given current mortality rates. Varies by sex and region.",
  "Age-Specific Fertility Rate": "Number of births per 1,000 women in a specific age group. Shows fertility patterns across reproductive ages.",
  "Age-Specific Mortality Rate": "Number of deaths per 1,000 people in a specific age group. Reveals mortality patterns across the lifespan.",
  "Population Pyramid": "Graphical representation of age and sex distribution of a population. Shape indicates growth patterns and demographic trends.",
  "Dependency Ratio": "Ratio of dependents (0-14 and 65+) to working-age population (15-64). Higher ratios indicate greater economic burden.",
  "Aging Index": "Ratio of elderly population (65+) to youth population (0-14) × 100. Values over 100 indicate an aging society.",
  "Demographic Transition": "The shift from high birth/death rates to low birth/death rates as a country develops economically.",
  "Below-Replacement Fertility": "TFR below 2.1, leading to eventual population decline without immigration. Common in developed countries.",
  "Mortality Decline": "Long-term decrease in death rates due to improved healthcare, nutrition, sanitation, and living standards.",
  "Fertility Decline": "Long-term decrease in birth rates due to education, urbanization, contraception access, and changing social norms.",
  "Population Momentum": "Continued population growth even after fertility falls to replacement level, due to young age structure.",
  "Cohort": "A group of people sharing a common demographic experience (e.g., born in the same year). Used for longitudinal analysis.",
  "Period Effect": "Factors affecting all age groups at a particular time (e.g., pandemic, economic crisis).",
  "Neonatal Mortality": "Deaths within first 28 days of life per 1,000 live births. Reflects quality of prenatal and delivery care.",
  "Maternal Mortality Ratio": "Number of maternal deaths per 100,000 live births. Critical indicator of women's health and healthcare access.",
  "Cause-Specific Mortality": "Death rate from a specific cause (e.g., cancer, heart disease). Important for health policy planning.",
  "Standardized Mortality Ratio": "Ratio of observed to expected deaths, adjusted for age. Allows comparison across populations with different age structures.",
  "Population Projection": "Forecast of future population size and structure based on assumptions about fertility, mortality, and migration.",
  "Demographic Dividend": "Economic growth potential from shifts in age structure, particularly a larger working-age population relative to dependents."
};

interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface RegionalDemographic {
  region: string;
  population: number;
  births: number;
  deaths: number;
  birth_rate: number;
  death_rate: number;
  natural_increase: number;
  tfr: number | null;
  imr: number | null;
}

interface AgeGroupData {
  age_group: string;
  population: number;
  births: number;
  deaths: number;
  fertility_rate: number | null;
  mortality_rate: number;
}

interface DemographicResult {
  success: boolean;
  overall_metrics: {
    total_population: number;
    total_births: number;
    total_deaths: number;
    crude_birth_rate: number;
    crude_death_rate: number;
    natural_increase_rate: number;
    tfr: number;
    imr: number;
    life_expectancy: number | null;
  };
  temporal_analysis: {
    periods: string[];
    birth_rates: number[];
    death_rates: number[];
    natural_increase: number[];
    tfr_trend: number[];
  };
  regional_analysis: RegionalDemographic[];
  age_analysis: {
    fertility_by_age: AgeGroupData[];
    mortality_by_age: AgeGroupData[];
  };
  projection: {
    years: number[];
    projected_population: number[];
    projected_births: number[];
    projected_deaths: number[];
  };
  visualizations: {
    rate_trends?: string;
    regional_comparison?: string;
    age_distribution?: string;
    projection_chart?: string;
    pyramid_chart?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    analysis_period: string;
    total_population: number;
    birth_rate: number;
    death_rate: number;
    natural_increase: number;
    tfr: number;
    fertility_status: string;
    trend_direction: string;
    highest_birth_region: string;
    lowest_birth_region: string;
  };
}

const ANALYSIS_FOCUS = [
  { value: "trend", label: "Trend Analysis", desc: "Track rates over time" },
  { value: "regional", label: "Regional Comparison", desc: "Compare across regions" },
  { value: "age", label: "Age Structure", desc: "Age-specific analysis" },
  { value: "projection", label: "Population Projection", desc: "Future projections" },
];

const generateSampleData = (): DataRow[] => {
  const data: DataRow[] = [];
  const regions = ["Seoul", "Busan", "Incheon", "Daegu", "Gwangju", "Daejeon", "Ulsan", "Sejong", "Gyeonggi", "Gangwon", "Chungbuk", "Chungnam", "Jeonbuk", "Jeonnam", "Gyeongbuk", "Gyeongnam", "Jeju"];
  const years = Array.from({ length: 15 }, (_, i) => 2010 + i);
  const ageGroups = ["0-4", "5-9", "10-14", "15-19", "20-24", "25-29", "30-34", "35-39", "40-44", "45-49", "50-54", "55-59", "60-64", "65-69", "70-74", "75-79", "80+"];
  
  const basePopulations: { [key: string]: number } = {
    "Seoul": 9900000, "Busan": 3500000, "Incheon": 2900000, "Daegu": 2500000,
    "Gwangju": 1500000, "Daejeon": 1500000, "Ulsan": 1200000, "Sejong": 300000,
    "Gyeonggi": 12500000, "Gangwon": 1500000, "Chungbuk": 1600000, "Chungnam": 2100000,
    "Jeonbuk": 1900000, "Jeonnam": 1900000, "Gyeongbuk": 2700000, "Gyeongnam": 3400000, "Jeju": 650000
  };

  for (const year of years) {
    for (const region of regions) {
      const yearFactor = 1 + (year - 2010) * 0.005;
      const basePop = basePopulations[region] * yearFactor;
      
      // Birth rate declining over time (Korea's low fertility)
      const baseBirthRate = 10 - (year - 2010) * 0.35;
      const regionBirthFactor = region === "Sejong" ? 1.4 : region === "Seoul" ? 0.85 : 1.0;
      const birthRate = Math.max(4, baseBirthRate * regionBirthFactor + (Math.random() - 0.5) * 1);
      
      // Death rate relatively stable with slight increase due to aging
      const baseDeathRate = 5 + (year - 2010) * 0.15;
      const regionDeathFactor = region === "Jeonnam" || region === "Gyeongbuk" ? 1.3 : region === "Sejong" ? 0.7 : 1.0;
      const deathRate = baseDeathRate * regionDeathFactor + (Math.random() - 0.5) * 0.5;
      
      const births = Math.round(basePop * birthRate / 1000);
      const deaths = Math.round(basePop * deathRate / 1000);
      
      // TFR declining
      const baseTFR = 1.3 - (year - 2010) * 0.04;
      const tfr = Math.max(0.7, baseTFR * regionBirthFactor + (Math.random() - 0.5) * 0.1);
      
      // IMR improving
      const baseIMR = 3.5 - (year - 2010) * 0.1;
      const imr = Math.max(2, baseIMR + (Math.random() - 0.5) * 0.3);
      
      for (const ageGroup of ageGroups) {
        const agePopShare = ageGroup === "0-4" ? 0.03 : ageGroup === "80+" ? 0.03 : 0.06;
        const agePop = Math.round(basePop * agePopShare * (0.8 + Math.random() * 0.4));
        
        // Age-specific fertility (only 15-49)
        let fertility = null;
        if (["15-19", "20-24", "25-29", "30-34", "35-39", "40-44", "45-49"].includes(ageGroup)) {
          const ageFertility: { [key: string]: number } = {
            "15-19": 1, "20-24": 15, "25-29": 80, "30-34": 100, "35-39": 40, "40-44": 5, "45-49": 0.5
          };
          fertility = ageFertility[ageGroup] * (tfr / 1.2) * (0.9 + Math.random() * 0.2);
        }
        
        // Age-specific mortality
        const ageMortality: { [key: string]: number } = {
          "0-4": 0.5, "5-9": 0.1, "10-14": 0.1, "15-19": 0.3, "20-24": 0.4, "25-29": 0.5,
          "30-34": 0.6, "35-39": 0.9, "40-44": 1.5, "45-49": 2.5, "50-54": 4, "55-59": 6,
          "60-64": 10, "65-69": 16, "70-74": 28, "75-79": 50, "80+": 120
        };
        const mortality = ageMortality[ageGroup] * (0.9 + Math.random() * 0.2);
        
        data.push({
          year,
          region,
          age_group: ageGroup,
          population: agePop,
          births: ageGroup === "25-29" || ageGroup === "30-34" ? Math.round(births * 0.4 / 2) : ageGroup === "20-24" || ageGroup === "35-39" ? Math.round(births * 0.15 / 2) : 0,
          deaths: Math.round(agePop * mortality / 1000),
          birth_rate: birthRate,
          death_rate: deathRate,
          tfr: parseFloat(tfr.toFixed(2)),
          imr: parseFloat(imr.toFixed(1)),
          fertility_rate: fertility ? parseFloat(fertility.toFixed(1)) : null,
          mortality_rate: parseFloat(mortality.toFixed(1)),
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
        <DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />Demographic Analysis Glossary</DialogTitle>
        <DialogDescription>Definitions of birth, mortality, and population terms</DialogDescription>
      </DialogHeader>
      <ScrollArea className="h-[60vh] pr-4">
        <div className="space-y-4">
          {Object.entries(demographicTermDefinitions).map(([term, def]) => (
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
        {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{Math.abs(trend).toFixed(1)}%
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
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4"><Baby className="w-6 h-6 text-primary" /></div>
        <h1 className="text-2xl font-semibold">Birth & Mortality Rate Trends</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Analyze demographic trends including fertility rates, mortality patterns, and population projections for policy planning.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { icon: Baby, title: "Fertility Analysis", desc: "Birth rates & TFR trends" },
          { icon: Heart, title: "Mortality Patterns", desc: "Death rates & life expectancy" },
          { icon: Users, title: "Population Projection", desc: "Future demographic outlook" },
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
                {["Population data by period", "Birth counts or birth rates", "Death counts or death rates", "Optional: region, age group"].map((req) => (
                  <li key={req} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />{req}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-primary mb-3">Results</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["Crude birth & death rates", "Total fertility rate (TFR)", "Natural increase trends", "Regional & age comparisons"].map((res) => (
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

export default function BirthMortalityPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<DemographicResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);

  // Configuration
  const [periodCol, setPeriodCol] = useState<string>("");
  const [populationCol, setPopulationCol] = useState<string>("");
  const [birthsCol, setBirthsCol] = useState<string>("");
  const [deathsCol, setDeathsCol] = useState<string>("");
  const [birthRateCol, setBirthRateCol] = useState<string>("");
  const [deathRateCol, setDeathRateCol] = useState<string>("");
  const [tfrCol, setTfrCol] = useState<string>("");
  const [imrCol, setImrCol] = useState<string>("");
  const [regionCol, setRegionCol] = useState<string>("");
  const [ageGroupCol, setAgeGroupCol] = useState<string>("");
  const [analysisFocus, setAnalysisFocus] = useState<string>("trend");
  const [analysisPeriod, setAnalysisPeriod] = useState<string>("");

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    setColumns(Object.keys(sampleData[0]));
    setPeriodCol("year");
    setPopulationCol("population");
    setBirthsCol("births");
    setDeathsCol("deaths");
    setBirthRateCol("birth_rate");
    setDeathRateCol("death_rate");
    setTfrCol("tfr");
    setImrCol("imr");
    setRegionCol("region");
    setAgeGroupCol("age_group");
    setAnalysisPeriod("2010-2024");
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
    { name: "Data Loaded", passed: data.length > 0, message: data.length > 0 ? `${data.length} records loaded` : "No data" },
    { name: "Period Column", passed: !!periodCol, message: periodCol ? `Using: ${periodCol}` : "Select time period" },
    { name: "Birth Data", passed: !!birthsCol || !!birthRateCol, message: birthsCol || birthRateCol ? `Using: ${birthsCol || birthRateCol}` : "Select births or birth rate" },
    { name: "Death Data", passed: !!deathsCol || !!deathRateCol, message: deathsCol || deathRateCol ? `Using: ${deathsCol || deathRateCol}` : "Select deaths or death rate" },
    { name: "Sufficient Data", passed: data.length >= 50, message: data.length >= 100 ? `${data.length} records (good)` : `${data.length} records` },
  ], [data, periodCol, birthsCol, birthRateCol, deathsCol, deathRateCol]);

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const payload = {
        data, period_col: periodCol, population_col: populationCol || null,
        births_col: birthsCol || null, deaths_col: deathsCol || null,
        birth_rate_col: birthRateCol || null, death_rate_col: deathRateCol || null,
        tfr_col: tfrCol || null, imr_col: imrCol || null,
        region_col: regionCol || null, age_group_col: ageGroupCol || null,
        analysis_focus: analysisFocus, analysis_period: analysisPeriod || "Analysis Period",
      };
      const res = await fetch(`${FASTAPI_URL}/api/analysis/birth-mortality`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Analysis failed"); }
      const result: DemographicResult = await res.json();
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
    const headers = "Region,Population,Births,Deaths,Birth Rate,Death Rate,Natural Increase\n";
    const rows = regions.map(r => `${r.region},${r.population},${r.births},${r.deaths},${r.birth_rate.toFixed(1)},${r.death_rate.toFixed(1)},${r.natural_increase.toFixed(1)}`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "birth_mortality_results.csv"; a.click();
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const b64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!b64) return;
    const a = document.createElement("a"); a.href = `data:image/png;base64,${b64}`; a.download = `demographic_${chartKey}.png`; a.click();
  };

  const renderStep2Config = () => (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Settings className="w-5 h-5 text-primary" />Configure Analysis</CardTitle><CardDescription>Set up demographic trend analysis parameters</CardDescription></CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" />Time & Population</h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Period Column *</Label><Select value={periodCol} onValueChange={setPeriodCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Population</Label><Select value={populationCol} onValueChange={setPopulationCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numericColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Analysis Period</Label><Input value={analysisPeriod} onChange={e => setAnalysisPeriod(e.target.value)} placeholder="e.g., 2010-2024" /></div>
          </div>
        </div>
        <Separator />
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2"><Baby className="w-4 h-4 text-primary" />Birth Data</h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Births (Count)</Label><Select value={birthsCol} onValueChange={setBirthsCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numericColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Birth Rate (per 1000)</Label><Select value={birthRateCol} onValueChange={setBirthRateCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numericColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>TFR</Label><Select value={tfrCol} onValueChange={setTfrCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numericColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
          </div>
        </div>
        <Separator />
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2"><Heart className="w-4 h-4 text-primary" />Death Data</h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Deaths (Count)</Label><Select value={deathsCol} onValueChange={setDeathsCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numericColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Death Rate (per 1000)</Label><Select value={deathRateCol} onValueChange={setDeathRateCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numericColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>IMR</Label><Select value={imrCol} onValueChange={setImrCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numericColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
          </div>
        </div>
        <Separator />
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />Breakdown Columns</h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Region</Label><Select value={regionCol} onValueChange={setRegionCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{categoricalColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Age Group</Label><Select value={ageGroupCol} onValueChange={setAgeGroupCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{categoricalColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Analysis Focus</Label><Select value={analysisFocus} onValueChange={setAnalysisFocus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ANALYSIS_FOCUS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent></Select></div>
          </div>
        </div>
        <div className="flex justify-end pt-4"><Button onClick={() => setCurrentStep(3)} className="gap-2">Continue<ArrowRight className="w-4 h-4" /></Button></div>
      </CardContent>
    </Card>
  );

  const renderStep3Validation = () => {
    const checks = getValidationChecks();
    const canRun = checks.slice(0, 4).every(c => c.passed);
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
    const finding = `Birth rate: ${summary.birth_rate.toFixed(1)}‰, Death rate: ${summary.death_rate.toFixed(1)}‰. Natural increase: ${summary.natural_increase >= 0 ? '+' : ''}${summary.natural_increase.toFixed(1)}‰. TFR: ${summary.tfr.toFixed(2)} (${summary.fertility_status}).`;
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Activity className="w-5 h-5 text-primary" />Results</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} status={summary.natural_increase >= 0 ? "positive" : "warning"} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={`${summary.birth_rate.toFixed(1)}‰`} label="Birth Rate" icon={Baby} highlight />
            <MetricCard value={`${summary.death_rate.toFixed(1)}‰`} label="Death Rate" icon={Skull} />
            <MetricCard value={summary.tfr.toFixed(2)} label="TFR" icon={Users} warning={summary.tfr < 1.5} />
            <MetricCard value={`${summary.natural_increase >= 0 ? '+' : ''}${summary.natural_increase.toFixed(1)}‰`} label="Natural Increase" icon={TrendingUp} highlight={summary.natural_increase >= 0} warning={summary.natural_increase < 0} />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5"><p className="text-xs text-muted-foreground mb-1">Highest Birth Rate</p><p className="text-lg font-semibold">{summary.highest_birth_region}</p></div>
            <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5"><p className="text-xs text-muted-foreground mb-1">Lowest Birth Rate</p><p className="text-lg font-semibold">{summary.lowest_birth_region}</p></div>
          </div>
          {results.key_insights.map((ins, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${ins.status === "positive" ? "border-primary/30 bg-primary/5" : ins.status === "warning" ? "border-destructive/30 bg-destructive/5" : "border-border"}`}>
              {ins.status === "positive" ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> : ins.status === "warning" ? <AlertTriangle className="w-5 h-5 text-destructive shrink-0" /> : <Info className="w-5 h-5 shrink-0" />}
              <div><p className="font-medium text-sm">{ins.title}</p><p className="text-sm text-muted-foreground">{ins.description}</p></div>
            </div>
          ))}
          <DetailParagraph title="Summary" detail={`■ Population: ${summary.total_population.toLocaleString()}\n■ Birth Rate: ${summary.birth_rate.toFixed(1)}‰\n■ Death Rate: ${summary.death_rate.toFixed(1)}‰\n■ Natural Increase: ${summary.natural_increase.toFixed(1)}‰\n■ TFR: ${summary.tfr.toFixed(2)} (${summary.fertility_status})\n■ IMR: ${overall_metrics.imr.toFixed(1)} per 1,000 live births\n■ Trend: ${summary.trend_direction}`} />
          <div className="flex justify-end pt-4"><Button onClick={() => setCurrentStep(5)} className="gap-2">Understand Why<ArrowRight className="w-4 h-4" /></Button></div>
        </CardContent>
      </Card>
    );
  };

  const renderStep5Why = () => {
    if (!results) return null;
    const { summary } = results;
    const exps = [
      { n: 1, t: "Birth Rate", c: `${summary.birth_rate.toFixed(1)}‰ = births per 1,000 population. ${summary.birth_rate < 10 ? 'Very low' : summary.birth_rate < 15 ? 'Low' : 'Moderate'} fertility.` },
      { n: 2, t: "TFR", c: `${summary.tfr.toFixed(2)} children per woman. ${summary.tfr < 2.1 ? 'Below replacement (2.1)' : 'At or above replacement'}. ${summary.fertility_status}.` },
      { n: 3, t: "Natural Increase", c: `Birth rate minus death rate = ${summary.natural_increase.toFixed(1)}‰. ${summary.natural_increase >= 0 ? 'Population growing' : 'Population declining'} naturally.` },
      { n: 4, t: "Trend", c: `${summary.trend_direction}. ${summary.trend_direction === "Declining fertility" ? 'Birth rates falling over time' : summary.trend_direction === "Improving" ? 'Positive demographic changes' : 'Stable patterns'}.` },
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
          <div className="grid grid-cols-4 gap-3">{[{ r: ">2.1", l: "Replacement" }, { r: "1.5-2.1", l: "Below Repl." }, { r: "1.0-1.5", l: "Very Low" }, { r: "<1.0", l: "Ultra Low" }].map(g => (
            <div key={g.r} className="p-3 border rounded-lg text-center"><p className="font-semibold text-sm">{g.r}</p><p className="text-xs text-primary">{g.l} TFR</p></div>
          ))}</div>
          <DetailParagraph title="Demographic Methodology" detail={`■ Crude Birth Rate (CBR)\nCBR = (Live Births / Mid-year Population) × 1,000\n\n■ Crude Death Rate (CDR)\nCDR = (Deaths / Mid-year Population) × 1,000\n\n■ Natural Increase Rate\nNIR = CBR - CDR\nPositive: Population growing\nNegative: Population declining\n\n■ Total Fertility Rate (TFR)\nSum of age-specific fertility rates\nReplacement level ≈ 2.1\n\n■ Policy Implications\n• TFR < 1.5: Rapid aging, labor shortage\n• Negative NIR: Pension/healthcare strain\n• Regional gaps: Resource reallocation needs`} />
          <div className="flex justify-between pt-4"><Button variant="outline" onClick={() => setCurrentStep(4)}>Back</Button><Button onClick={() => setCurrentStep(6)} className="gap-2">View Full Report<ArrowRight className="w-4 h-4" /></Button></div>
        </CardContent>
      </Card>
    );
  };

  const renderStep6Report = () => {
    if (!results) return null;
    const { summary, regional_analysis, overall_metrics } = results;
    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b"><h1 className="text-xl font-semibold">Birth & Mortality Rate Report</h1><p className="text-sm text-muted-foreground">{summary.analysis_period} | {new Date().toLocaleDateString()}</p></div>
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="w-5 h-5 text-blue-600" />Executive Summary</CardTitle></CardHeader>
          <CardContent><p className="text-sm leading-relaxed">Demographic analysis for <strong>{summary.analysis_period}</strong> shows a birth rate of <strong>{summary.birth_rate.toFixed(1)}‰</strong> and death rate of <strong>{summary.death_rate.toFixed(1)}‰</strong>, resulting in natural increase of <strong>{summary.natural_increase >= 0 ? '+' : ''}{summary.natural_increase.toFixed(1)}‰</strong>. TFR of <strong>{summary.tfr.toFixed(2)}</strong> indicates <strong>{summary.fertility_status}</strong>. <strong>{summary.highest_birth_region}</strong> has highest birth rate, while <strong>{summary.lowest_birth_region}</strong> has lowest.</p></CardContent>
        </Card>
        <div className="grid grid-cols-4 gap-3">
          <MetricCard value={`${summary.birth_rate.toFixed(1)}‰`} label="Birth Rate" icon={Baby} highlight />
          <MetricCard value={`${summary.death_rate.toFixed(1)}‰`} label="Death Rate" icon={Skull} />
          <MetricCard value={summary.tfr.toFixed(2)} label="TFR" icon={Users} warning={summary.tfr < 1.5} />
          <MetricCard value={overall_metrics.imr.toFixed(1)} label="IMR" icon={Heart} />
        </div>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Visualizations</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="trends">
              <TabsList className="grid w-full grid-cols-5 mb-4">{["trends", "regional", "age", "projection", "pyramid"].map(t => <TabsTrigger key={t} value={t} className="text-xs">{t}</TabsTrigger>)}</TabsList>
              {[{ k: "rate_trends", t: "trends" }, { k: "regional_comparison", t: "regional" }, { k: "age_distribution", t: "age" }, { k: "projection_chart", t: "projection" }, { k: "pyramid_chart", t: "pyramid" }].map(({ k, t }) => (
                <TabsContent key={k} value={t}>{results.visualizations[k as keyof typeof results.visualizations] && (<div className="relative border rounded-lg overflow-hidden"><img src={`data:image/png;base64,${results.visualizations[k as keyof typeof results.visualizations]}`} alt={k} className="w-full" /><Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => handleDownloadPNG(k)}><Download className="w-4 h-4" /></Button></div>)}</TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Regional Analysis</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Region</TableHead><TableHead className="text-right">Birth Rate</TableHead><TableHead className="text-right">Death Rate</TableHead><TableHead className="text-right">Natural Inc.</TableHead><TableHead className="text-right">TFR</TableHead></TableRow></TableHeader>
              <TableBody>{regional_analysis.slice(0, 12).map(r => (
                <TableRow key={r.region}><TableCell className="font-medium">{r.region}</TableCell><TableCell className="text-right">{r.birth_rate.toFixed(1)}‰</TableCell><TableCell className="text-right">{r.death_rate.toFixed(1)}‰</TableCell><TableCell className="text-right"><Badge variant={r.natural_increase >= 0 ? "default" : "destructive"} className="text-xs">{r.natural_increase >= 0 ? '+' : ''}{r.natural_increase.toFixed(1)}‰</Badge></TableCell><TableCell className="text-right">{r.tfr?.toFixed(2) || '-'}</TableCell></TableRow>
              ))}</TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card><CardHeader className="pb-3"><CardTitle className="text-base">Export</CardTitle></CardHeader><CardContent><div className="flex gap-3"><Button variant="outline" onClick={handleDownloadCSV} className="gap-2"><FileSpreadsheet className="w-4 h-4" />CSV</Button><Button variant="outline" onClick={() => handleDownloadPNG("rate_trends")} className="gap-2"><Download className="w-4 h-4" />Chart</Button></div></CardContent></Card>
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