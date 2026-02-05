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
  ArrowLeftRight, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle,
  Shield, Info, HelpCircle, FileSpreadsheet, FileText, Download,
  TrendingUp, TrendingDown, Settings, Activity, AlertTriangle, ChevronRight,
  BarChart3, Calendar, Users, MapPin, Home, Building, BookOpen, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

// ============================================================
// Statistical Terms Glossary
// ============================================================
const migrationTermDefinitions: Record<string, string> = {
  "Internal Migration": "Movement of people within national boundaries, from one region to another. Distinct from international migration across countries.",
  "In-Migration": "Movement of people into a region from other regions within the same country. Increases the destination region's population.",
  "Out-Migration": "Movement of people out of a region to other regions within the same country. Decreases the origin region's population.",
  "Net Migration": "The difference between in-migration and out-migration. Positive means population gain; negative means population loss.",
  "Gross Migration": "Total volume of migration movements (in-migration + out-migration). Measures overall mobility regardless of direction.",
  "Migration Rate": "Number of migrants per 1,000 population. Allows comparison across regions of different sizes.",
  "Net Migration Rate": "Net migration divided by population, multiplied by 1,000. Shows relative population change from migration.",
  "Migration Flow": "The directed movement of people from one specific origin to one specific destination. Represented as origin-destination pairs.",
  "Origin Region": "The region from which migrants depart. Source of out-migration flows.",
  "Destination Region": "The region to which migrants move. Receiver of in-migration flows.",
  "Migration Corridor": "A well-established path of migration between two regions, often with sustained high volume over time.",
  "Push Factors": "Conditions in origin regions that encourage people to leave: unemployment, low wages, poor services, environmental issues.",
  "Pull Factors": "Conditions in destination regions that attract migrants: job opportunities, higher wages, better services, quality of life.",
  "Return Migration": "Movement of migrants back to their region of origin. May indicate changing conditions or lifecycle events.",
  "Chain Migration": "Migration pattern where earlier migrants facilitate subsequent migration of family, friends, or community members.",
  "Migration Turnover": "The sum of in-migration and out-migration rates. Indicates overall population churning in a region.",
  "Migration Effectiveness": "Ratio of net migration to gross migration. Higher values mean migration is more one-directional.",
  "Metropolitan Migration": "Migration involving metropolitan areas, either as origin or destination. Often dominant in urbanization patterns.",
  "Rural-Urban Migration": "Movement from rural areas to urban centers. Major driver of urbanization in developing regions.",
  "Counter-Urbanization": "Migration from urban areas to rural or suburban areas. Reversal of traditional rural-urban flow.",
  "Age-Selective Migration": "Pattern where certain age groups (often young adults) migrate more than others. Affects age structure of regions.",
  "Brain Drain": "Out-migration of highly educated or skilled individuals. Can negatively impact origin region's development.",
  "Brain Gain": "In-migration of highly educated or skilled individuals. Benefits destination region's human capital.",
  "Migration Balance": "Another term for net migration. Positive balance = net gain; negative balance = net loss.",
  "Circulation": "Short-term, repetitive, or cyclical movement that doesn't involve permanent change of residence."
};

interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface RegionMigration {
  region: string;
  population: number;
  in_migration: number;
  out_migration: number;
  net_migration: number;
  net_migration_rate: number;
  gross_migration: number;
  migration_effectiveness: number;
}

interface MigrationFlow {
  origin: string;
  destination: string;
  flow_count: number;
  flow_share: number;
}

interface MigrationResult {
  success: boolean;
  overall_metrics: {
    total_migrants: number;
    total_in_migration: number;
    total_out_migration: number;
    net_gainers: number;
    net_losers: number;
    avg_migration_rate: number;
  };
  regional_analysis: RegionMigration[];
  flow_analysis: {
    top_flows: MigrationFlow[];
    flow_matrix: { [origin: string]: { [dest: string]: number } };
  };
  temporal_analysis: {
    periods: string[];
    total_migration: number[];
    net_migration_trend: { [region: string]: number[] };
  };
  demographic_analysis: {
    by_age: { age_group: string; migration_count: number; share: number }[];
    by_reason: { reason: string; count: number; share: number }[];
  };
  visualizations: {
    regional_balance?: string;
    flow_map?: string;
    temporal_trend?: string;
    top_corridors?: string;
    demographic_chart?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    analysis_period: string;
    total_migrants: number;
    n_regions: number;
    top_gainer: string;
    top_gainer_net: number;
    top_loser: string;
    top_loser_net: number;
    largest_flow_origin: string;
    largest_flow_dest: string;
    urbanization_trend: string;
  };
}

const ANALYSIS_FOCUS = [
  { value: "balance", label: "Net Migration Balance", desc: "Regional gains and losses" },
  { value: "flows", label: "Migration Flows", desc: "Origin-destination analysis" },
  { value: "trends", label: "Temporal Trends", desc: "Changes over time" },
  { value: "demographic", label: "Demographic Patterns", desc: "Who is moving" },
];

const generateSampleData = (): DataRow[] => {
  const data: DataRow[] = [];
  const regions = ["Seoul", "Busan", "Incheon", "Daegu", "Gwangju", "Daejeon", "Ulsan", "Sejong", "Gyeonggi", "Gangwon", "Chungbuk", "Chungnam", "Jeonbuk", "Jeonnam", "Gyeongbuk", "Gyeongnam", "Jeju"];
  const years = [2019, 2020, 2021, 2022, 2023, 2024];
  const ageGroups = ["0-19", "20-29", "30-39", "40-49", "50-59", "60+"];
  const reasons = ["Employment", "Education", "Family", "Housing", "Environment", "Other"];
  
  const populations: { [key: string]: number } = {
    "Seoul": 9700000, "Busan": 3400000, "Incheon": 2900000, "Daegu": 2400000,
    "Gwangju": 1500000, "Daejeon": 1500000, "Ulsan": 1100000, "Sejong": 350000,
    "Gyeonggi": 13500000, "Gangwon": 1500000, "Chungbuk": 1600000, "Chungnam": 2100000,
    "Jeonbuk": 1800000, "Jeonnam": 1800000, "Gyeongbuk": 2600000, "Gyeongnam": 3300000, "Jeju": 670000
  };

  // Migration patterns: Seoul losing to Gyeonggi/Sejong, rural areas losing to metros
  const netPatterns: { [key: string]: number } = {
    "Seoul": -0.015, "Busan": -0.005, "Incheon": 0.008, "Daegu": -0.003,
    "Gwangju": 0.002, "Daejeon": 0.001, "Ulsan": -0.004, "Sejong": 0.08,
    "Gyeonggi": 0.012, "Gangwon": -0.002, "Chungbuk": 0.003, "Chungnam": 0.005,
    "Jeonbuk": -0.008, "Jeonnam": -0.01, "Gyeongbuk": -0.006, "Gyeongnam": -0.003, "Jeju": 0.015
  };

  for (const year of years) {
    for (const originRegion of regions) {
      for (const destRegion of regions) {
        if (originRegion === destRegion) continue;
        
        const basePop = populations[originRegion];
        const destPop = populations[destRegion];
        
        // Base flow proportional to populations
        let baseFlow = Math.sqrt(basePop * destPop) / 50000;
        
        // Adjust for known patterns
        if (originRegion === "Seoul" && destRegion === "Gyeonggi") baseFlow *= 3;
        if (originRegion === "Seoul" && destRegion === "Sejong") baseFlow *= 2;
        if ((originRegion === "Jeonnam" || originRegion === "Jeonbuk") && destRegion === "Seoul") baseFlow *= 0.5;
        if (destRegion === "Sejong") baseFlow *= 1.5;
        
        // Year variation
        const yearFactor = 1 + (year - 2019) * 0.02;
        
        for (const ageGroup of ageGroups) {
          // Age-specific migration (20-29 most mobile)
          let ageFactor = 1;
          if (ageGroup === "20-29") ageFactor = 2.5;
          else if (ageGroup === "30-39") ageFactor = 1.8;
          else if (ageGroup === "0-19") ageFactor = 1.2;
          else if (ageGroup === "60+") ageFactor = 0.5;
          
          const reason = reasons[Math.floor(Math.random() * reasons.length)];
          const migrants = Math.round(baseFlow * yearFactor * ageFactor * (0.7 + Math.random() * 0.6));
          
          if (migrants > 0) {
            data.push({
              year,
              origin: originRegion,
              destination: destRegion,
              age_group: ageGroup,
              reason,
              migrants,
              origin_population: populations[originRegion],
              dest_population: populations[destRegion],
            });
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
        <DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" />Migration Analysis Glossary</DialogTitle>
        <DialogDescription>Definitions of population migration terms</DialogDescription>
      </DialogHeader>
      <ScrollArea className="h-[60vh] pr-4">
        <div className="space-y-4">
          {Object.entries(migrationTermDefinitions).map(([term, def]) => (
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
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4"><ArrowLeftRight className="w-6 h-6 text-primary" /></div>
        <h1 className="text-2xl font-semibold">Regional Population Migration</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Analyze internal migration patterns, regional population flows, and demographic shifts for policy planning.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { icon: MapPin, title: "Regional Balance", desc: "Net migration gains/losses" },
          { icon: ArrowLeftRight, title: "Flow Analysis", desc: "Origin-destination patterns" },
          { icon: Users, title: "Demographics", desc: "Who is moving where" },
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
                {["Origin region identifier", "Destination region identifier", "Migration count/volume", "Optional: period, demographics"].map((req) => (
                  <li key={req} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />{req}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-primary mb-3">Results</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["Net migration by region", "Top migration corridors", "Temporal trends", "Demographic breakdown"].map((res) => (
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

export default function MigrationPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<MigrationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);

  // Configuration
  const [periodCol, setPeriodCol] = useState<string>("");
  const [originCol, setOriginCol] = useState<string>("");
  const [destCol, setDestCol] = useState<string>("");
  const [migrantsCol, setMigrantsCol] = useState<string>("");
  const [populationCol, setPopulationCol] = useState<string>("");
  const [ageGroupCol, setAgeGroupCol] = useState<string>("");
  const [reasonCol, setReasonCol] = useState<string>("");
  const [analysisFocus, setAnalysisFocus] = useState<string>("balance");
  const [analysisPeriod, setAnalysisPeriod] = useState<string>("");

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    setColumns(Object.keys(sampleData[0]));
    setPeriodCol("year");
    setOriginCol("origin");
    setDestCol("destination");
    setMigrantsCol("migrants");
    setPopulationCol("origin_population");
    setAgeGroupCol("age_group");
    setReasonCol("reason");
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
    { name: "Origin Region", passed: !!originCol, message: originCol ? `Using: ${originCol}` : "Select origin column" },
    { name: "Destination Region", passed: !!destCol, message: destCol ? `Using: ${destCol}` : "Select destination column" },
    { name: "Migration Count", passed: !!migrantsCol, message: migrantsCol ? `Using: ${migrantsCol}` : "Select migrants count" },
    { name: "Sufficient Data", passed: data.length >= 50, message: data.length >= 100 ? `${data.length} records (good)` : `${data.length} records` },
  ], [data, originCol, destCol, migrantsCol]);

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const payload = {
        data, period_col: periodCol || null, origin_col: originCol, destination_col: destCol,
        migrants_col: migrantsCol, population_col: populationCol || null,
        age_group_col: ageGroupCol || null, reason_col: reasonCol || null,
        analysis_focus: analysisFocus, analysis_period: analysisPeriod || "Analysis Period",
      };
      const res = await fetch(`${FASTAPI_URL}/api/analysis/migration`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Analysis failed"); }
      const result: MigrationResult = await res.json();
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
    const headers = "Region,In-Migration,Out-Migration,Net Migration,Net Rate\n";
    const rows = regions.map(r => `${r.region},${r.in_migration},${r.out_migration},${r.net_migration},${r.net_migration_rate.toFixed(2)}`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "migration_results.csv"; a.click();
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const b64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!b64) return;
    const a = document.createElement("a"); a.href = `data:image/png;base64,${b64}`; a.download = `migration_${chartKey}.png`; a.click();
  };

  const renderStep2Config = () => (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Settings className="w-5 h-5 text-primary" />Configure Analysis</CardTitle><CardDescription>Set up migration analysis parameters</CardDescription></CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />Location Columns</h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Origin Region *</Label><Select value={originCol} onValueChange={setOriginCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{categoricalColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Destination Region *</Label><Select value={destCol} onValueChange={setDestCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{categoricalColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Time Period</Label><Select value={periodCol} onValueChange={setPeriodCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
          </div>
        </div>
        <Separator />
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Migration Data</h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Migrants Count *</Label><Select value={migrantsCol} onValueChange={setMigrantsCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numericColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Population (for rates)</Label><Select value={populationCol} onValueChange={setPopulationCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numericColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Analysis Period</Label><Input value={analysisPeriod} onChange={e => setAnalysisPeriod(e.target.value)} placeholder="e.g., 2019-2024" /></div>
          </div>
        </div>
        <Separator />
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Optional Breakdowns</h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Age Group</Label><Select value={ageGroupCol} onValueChange={setAgeGroupCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{categoricalColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Migration Reason</Label><Select value={reasonCol} onValueChange={setReasonCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{categoricalColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
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
    const finding = `Total ${summary.total_migrants.toLocaleString()} migrants. Top gainer: ${summary.top_gainer} (+${summary.top_gainer_net.toLocaleString()}). Top loser: ${summary.top_loser} (${summary.top_loser_net.toLocaleString()}). Largest flow: ${summary.largest_flow_origin} → ${summary.largest_flow_dest}.`;
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Activity className="w-5 h-5 text-primary" />Results</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} status="neutral" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={summary.total_migrants.toLocaleString()} label="Total Migrants" icon={Users} highlight />
            <MetricCard value={summary.n_regions} label="Regions" icon={MapPin} />
            <MetricCard value={overall_metrics.net_gainers} label="Net Gainers" icon={TrendingUp} highlight />
            <MetricCard value={overall_metrics.net_losers} label="Net Losers" icon={TrendingDown} warning />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5"><p className="text-xs text-muted-foreground mb-1">Biggest Population Gainer</p><p className="text-lg font-semibold">{summary.top_gainer}</p><p className="text-sm text-primary">+{summary.top_gainer_net.toLocaleString()} net migrants</p></div>
            <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5"><p className="text-xs text-muted-foreground mb-1">Biggest Population Loser</p><p className="text-lg font-semibold">{summary.top_loser}</p><p className="text-sm text-destructive">{summary.top_loser_net.toLocaleString()} net migrants</p></div>
          </div>
          {results.key_insights.map((ins, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${ins.status === "positive" ? "border-primary/30 bg-primary/5" : ins.status === "warning" ? "border-destructive/30 bg-destructive/5" : "border-border"}`}>
              {ins.status === "positive" ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> : ins.status === "warning" ? <AlertTriangle className="w-5 h-5 text-destructive shrink-0" /> : <Info className="w-5 h-5 shrink-0" />}
              <div><p className="font-medium text-sm">{ins.title}</p><p className="text-sm text-muted-foreground">{ins.description}</p></div>
            </div>
          ))}
          <DetailParagraph title="Summary" detail={`■ Total Migrants: ${summary.total_migrants.toLocaleString()}\n■ Regions Analyzed: ${summary.n_regions}\n■ Net Gainers: ${overall_metrics.net_gainers} regions\n■ Net Losers: ${overall_metrics.net_losers} regions\n■ Top Gainer: ${summary.top_gainer} (+${summary.top_gainer_net.toLocaleString()})\n■ Top Loser: ${summary.top_loser} (${summary.top_loser_net.toLocaleString()})\n■ Largest Flow: ${summary.largest_flow_origin} → ${summary.largest_flow_dest}\n■ Trend: ${summary.urbanization_trend}`} />
          <div className="flex justify-end pt-4"><Button onClick={() => setCurrentStep(5)} className="gap-2">Understand Why<ArrowRight className="w-4 h-4" /></Button></div>
        </CardContent>
      </Card>
    );
  };

  const renderStep5Why = () => {
    if (!results) return null;
    const { summary, overall_metrics } = results;
    const exps = [
      { n: 1, t: "Net Migration", c: `In-migration minus out-migration. ${summary.top_gainer} gained most; ${summary.top_loser} lost most.` },
      { n: 2, t: "Migration Rate", c: `Migrants per 1,000 population. Avg rate: ${overall_metrics.avg_migration_rate.toFixed(1)}‰ allows size-adjusted comparison.` },
      { n: 3, t: "Flow Analysis", c: `${summary.largest_flow_origin} → ${summary.largest_flow_dest} is the dominant corridor.` },
      { n: 4, t: "Urbanization", c: `${summary.urbanization_trend}. Reflects economic and lifestyle factors.` },
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
          <DetailParagraph title="Migration Methodology" detail={`■ Net Migration Calculation\nNet Migration = In-Migration - Out-Migration\nPositive: Population gain from migration\nNegative: Population loss from migration\n\n■ Migration Rate\nRate = (Migrants / Population) × 1,000\nAllows comparison across different-sized regions\n\n■ Migration Effectiveness\nEffectiveness = |Net| / Gross × 100\nHigher = more one-directional flow\n\n■ Push-Pull Factors\nPush: Unemployment, low wages, poor services\nPull: Jobs, education, quality of life\n\n■ Policy Implications\n• Losing regions: Economic development needed\n• Gaining regions: Infrastructure planning\n• Age-selective: Workforce & aging concerns`} />
          <div className="flex justify-between pt-4"><Button variant="outline" onClick={() => setCurrentStep(4)}>Back</Button><Button onClick={() => setCurrentStep(6)} className="gap-2">View Full Report<ArrowRight className="w-4 h-4" /></Button></div>
        </CardContent>
      </Card>
    );
  };

  const renderStep6Report = () => {
    if (!results) return null;
    const { summary, regional_analysis, flow_analysis, overall_metrics } = results;
    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b"><h1 className="text-xl font-semibold">Regional Population Migration Report</h1><p className="text-sm text-muted-foreground">{summary.analysis_period} | {summary.n_regions} Regions | {new Date().toLocaleDateString()}</p></div>
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="w-5 h-5 text-blue-600" />Executive Summary</CardTitle></CardHeader>
          <CardContent><p className="text-sm leading-relaxed">Migration analysis for <strong>{summary.analysis_period}</strong> shows <strong>{summary.total_migrants.toLocaleString()}</strong> total migrants across <strong>{summary.n_regions} regions</strong>. <strong>{summary.top_gainer}</strong> gained the most population (<strong>+{summary.top_gainer_net.toLocaleString()}</strong>), while <strong>{summary.top_loser}</strong> experienced the largest loss (<strong>{summary.top_loser_net.toLocaleString()}</strong>). The dominant migration corridor is <strong>{summary.largest_flow_origin} → {summary.largest_flow_dest}</strong>. Overall trend: <strong>{summary.urbanization_trend}</strong>.</p></CardContent>
        </Card>
        <div className="grid grid-cols-4 gap-3">
          <MetricCard value={summary.total_migrants.toLocaleString()} label="Total Migrants" icon={Users} highlight />
          <MetricCard value={overall_metrics.net_gainers} label="Gainers" icon={TrendingUp} />
          <MetricCard value={overall_metrics.net_losers} label="Losers" icon={TrendingDown} warning />
          <MetricCard value={`${overall_metrics.avg_migration_rate.toFixed(1)}‰`} label="Avg Rate" icon={BarChart3} />
        </div>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Visualizations</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="balance">
              <TabsList className="grid w-full grid-cols-5 mb-4">{["balance", "flows", "trends", "corridors", "demographic"].map(t => <TabsTrigger key={t} value={t} className="text-xs">{t}</TabsTrigger>)}</TabsList>
              {[{ k: "regional_balance", t: "balance" }, { k: "flow_map", t: "flows" }, { k: "temporal_trend", t: "trends" }, { k: "top_corridors", t: "corridors" }, { k: "demographic_chart", t: "demographic" }].map(({ k, t }) => (
                <TabsContent key={k} value={t}>{results.visualizations[k as keyof typeof results.visualizations] && (<div className="relative border rounded-lg overflow-hidden"><img src={`data:image/png;base64,${results.visualizations[k as keyof typeof results.visualizations]}`} alt={k} className="w-full" /><Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => handleDownloadPNG(k)}><Download className="w-4 h-4" /></Button></div>)}</TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Regional Migration Balance</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Region</TableHead><TableHead className="text-right">In</TableHead><TableHead className="text-right">Out</TableHead><TableHead className="text-right">Net</TableHead><TableHead className="text-right">Rate</TableHead></TableRow></TableHeader>
              <TableBody>{regional_analysis.slice(0, 12).map(r => (
                <TableRow key={r.region}><TableCell className="font-medium">{r.region}</TableCell><TableCell className="text-right text-green-600">+{r.in_migration.toLocaleString()}</TableCell><TableCell className="text-right text-red-600">-{r.out_migration.toLocaleString()}</TableCell><TableCell className="text-right"><Badge variant={r.net_migration >= 0 ? "default" : "destructive"} className="text-xs">{r.net_migration >= 0 ? '+' : ''}{r.net_migration.toLocaleString()}</Badge></TableCell><TableCell className="text-right">{r.net_migration_rate.toFixed(1)}‰</TableCell></TableRow>
              ))}</TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Top Migration Corridors</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Origin</TableHead><TableHead>→</TableHead><TableHead>Destination</TableHead><TableHead className="text-right">Migrants</TableHead><TableHead className="text-right">Share</TableHead></TableRow></TableHeader>
              <TableBody>{flow_analysis.top_flows.slice(0, 10).map((f, i) => (
                <TableRow key={i}><TableCell>{f.origin}</TableCell><TableCell><ArrowRight className="w-4 h-4" /></TableCell><TableCell>{f.destination}</TableCell><TableCell className="text-right">{f.flow_count.toLocaleString()}</TableCell><TableCell className="text-right">{(f.flow_share * 100).toFixed(1)}%</TableCell></TableRow>
              ))}</TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card><CardHeader className="pb-3"><CardTitle className="text-base">Export</CardTitle></CardHeader><CardContent><div className="flex gap-3"><Button variant="outline" onClick={handleDownloadCSV} className="gap-2"><FileSpreadsheet className="w-4 h-4" />CSV</Button><Button variant="outline" onClick={() => handleDownloadPNG("regional_balance")} className="gap-2"><Download className="w-4 h-4" />Chart</Button></div></CardContent></Card>
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