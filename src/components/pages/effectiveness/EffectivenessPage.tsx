
'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, TrendingUp, TrendingDown, HelpCircle, CheckCircle, 
  BookOpen, Activity, Info, Sparkles, Minus, FlaskConical, Calculator, XCircle, Download,
  FileSpreadsheet, ImageIcon, ChevronDown, Settings, FileSearch,
  Target, Layers, GitCompare, Scale
} from 'lucide-react';
import { type ExampleDataSet, exampleDatasets } from '@/lib/example-datasets';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface DescriptiveStats {
  overall: { n: number; mean: number; std: number; median: number; min: number; max: number; q1: number; q3: number; se: number };
  by_group: { [key: string]: { n: number; mean: number; std: number; median: number; min: number; max: number; se: number } };
  by_time: { [key: string]: { n: number; mean: number; std: number; median: number; se: number } };
  by_group_time: { [key: string]: { [key: string]: { n: number; mean: number; std: number; se: number } } };
  plot: string | null;
}

interface PrePostComparison {
  overall: {
    pre_mean: number; post_mean: number; pre_std: number; post_std: number;
    difference: number; percent_change: number | null;
    test_statistic: number; p_value: number; test_used: string; effect_size: number;
    effect_interpretation: string; significant: boolean; pre_n: number; post_n: number;
    pre_label: string; post_label: string;
  } | null;
  by_group: { [key: string]: any };
  plot: string | null;
}

interface DIDAnalysis {
  did_estimate: number | null; did_se: number | null; did_pvalue: number | null;
  did_ci_lower: number | null; did_ci_upper: number | null; significant: boolean; r_squared: number;
  cell_means: { control_pre: number; control_post: number; treatment_pre: number; treatment_post: number };
  control_change: number; treatment_change: number; control_label: string; treatment_label: string;
  plot: string | null; error?: string;
}

interface TrendAnalysis {
  overall_trend: {
    slope: number; intercept: number; r_squared: number; p_value: number; std_err: number;
    trend_direction: string; significant: boolean; time_points: string[]; means: number[];
  } | null;
  by_group: { [key: string]: any };
  plot: string | null; error?: string;
}

interface SensitivityAnalysis {
  base_model: { did_estimate: number; did_pvalue: number; significant: boolean; r_squared: number } | null;
  with_covariates: { did_estimate: number; did_pvalue: number; significant: boolean; r_squared: number; covariates_used: string[] } | null;
  robustness_check: { did_estimate: number; did_pvalue: number; significant: boolean; n_excluded: number; method: string } | null;
  plot: string | null; error?: string;
}

interface EvidencePoint { 
  interpretation: string; 
  statistic: string; 
  significant: boolean; 
}

interface OverallConclusion {
  conclusion: string; 
  conclusion_text: string; 
  confidence_level: string;
  evidence_points: EvidencePoint[]; 
  recommendation: string;
}

interface EffectivenessResults {
  descriptive_stats: DescriptiveStats;
  pre_post_comparison: PrePostComparison | null;
  did_analysis: DIDAnalysis | null;
  trend_analysis: TrendAnalysis | null;
  sensitivity_analysis: SensitivityAnalysis | null;
  effect_size_analysis: { plot: string | null } | null;
  overall_conclusion: OverallConclusion;
  summary_statistics: { 
    n_total: number; 
    n_valid: number; 
    outcome_var: string; 
    time_var: string | null; 
    group_var: string | null; 
    covariates: string[] 
  };
}

const SectionNumber = ({ num }: { num: number }) => (
  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
    {num}
  </div>
);

const StatCard = ({ label, value, sublabel, icon: Icon }: { label: string; value: string | number; sublabel?: string; icon?: any }) => (
  <Card>
    <CardContent className="p-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </div>
        <p className="text-2xl font-semibold">{value}</p>
        {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
      </div>
    </CardContent>
  </Card>
);

const ConclusionBadge = ({ conclusion }: { conclusion: string }) => {
  const config: { [key: string]: { color: string; icon: any; bg: string } } = {
    'EFFECTIVE': { color: 'text-primary', icon: CheckCircle, bg: 'bg-primary/10' },
    'LIKELY EFFECTIVE': { color: 'text-primary', icon: TrendingUp, bg: 'bg-primary/10' },
    'NO CLEAR EFFECT': { color: 'text-muted-foreground', icon: Minus, bg: 'bg-muted' }
  };
  const { color, icon: Icon, bg } = config[conclusion] || config['NO CLEAR EFFECT'];
  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${bg}`}>
      <Icon className={`h-5 w-5 ${color}`} />
      <span className={`font-bold ${color}`}>{conclusion}</span>
    </div>
  );
};

const AnalysisOverview = ({ 
  outcomeVar, 
  timeVar, 
  groupVar, 
  covariates, 
  data 
}: { 
  outcomeVar: string | undefined; 
  timeVar: string | undefined; 
  groupVar: string | undefined; 
  covariates: string[]; 
  data: DataSet; 
}) => {
  const items = useMemo(() => {
    const overview = [];
    if (!outcomeVar) overview.push('⚠ Select outcome variable'); 
    else overview.push(`Outcome: ${outcomeVar}`);
    if (!timeVar) overview.push('⚠ Select time variable'); 
    else overview.push(`Time: ${timeVar}`);
    if (!groupVar) overview.push('ℹ No group variable (DID unavailable)'); 
    else overview.push(`Group: ${groupVar}`);
    if (covariates.length > 0) overview.push(`Covariates: ${covariates.join(', ')}`);
    overview.push(`Sample size: ${data.length}`);
    return overview;
  }, [outcomeVar, timeVar, groupVar, covariates, data]);
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Info className="h-4 w-4" /> Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1 text-sm text-muted-foreground">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start">
              <span className="mr-2">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void; onLoadExample: (e: ExampleDataSet) => void }) => {
  const example = exampleDatasets.find(d => d.id === 'effectiveness-analysis' || d.analysisTypes.includes('effectiveness'));
  
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <FlaskConical className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="font-headline text-3xl">Effectiveness Analysis</CardTitle>
          <CardDescription className="text-base mt-2">Comprehensive intervention effectiveness evaluation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Core Question */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-5 text-center">
            <p className="text-sm text-muted-foreground mb-2">Core Question</p>
            <p className="text-xl font-semibold text-primary">&quot;Did the intervention cause the observed change?&quot;</p>
          </div>

          {/* Why This Analysis */}
          <div className="bg-muted/30 rounded-lg p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" /> Why This Analysis?
            </h3>
            <p className="text-sm text-muted-foreground">
              Simply observing a change before and after an intervention is not enough. 
              The change could be due to external factors, natural trends, or random variation. 
              This analysis uses multiple statistical methods to determine whether the observed change 
              can be <strong>causally attributed</strong> to the intervention.
            </p>
          </div>

          {/* 6 Analysis Roles */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" /> Six Analyses, One Conclusion
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold">1</div>
                <div>
                  <p className="font-medium text-sm">Descriptive Statistics</p>
                  <p className="text-xs text-muted-foreground">Understand data distribution</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold">2</div>
                <div>
                  <p className="font-medium text-sm">Pre-Post Comparison</p>
                  <p className="text-xs text-muted-foreground">Measure change magnitude</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold">3</div>
                <div>
                  <p className="font-medium text-sm">Effect Size</p>
                  <p className="text-xs text-muted-foreground">Assess practical significance</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold">4</div>
                <div>
                  <p className="font-medium text-sm">Trend Analysis</p>
                  <p className="text-xs text-muted-foreground">Detect time patterns</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-primary/10 border border-primary/30 rounded-lg md:col-span-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">5</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">Difference-in-Differences (DID)</p>
                    <Badge variant="default" className="text-xs">Key Analysis</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Isolate causal effect by comparing treatment vs control groups over time</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg md:col-span-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold">6</div>
                <div>
                  <p className="font-medium text-sm">Sensitivity Analysis</p>
                  <p className="text-xs text-muted-foreground">Verify robustness across different model specifications</p>
                </div>
              </div>
            </div>
          </div>

          {/* How Conclusion is Derived */}
          <div className="bg-muted/30 rounded-lg p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" /> How the Conclusion is Derived
            </h3>
            <div className="flex items-center justify-between text-sm">
              <div className="text-center flex-1">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
                  <span className="text-xs">1-4</span>
                </div>
                <p className="text-xs text-muted-foreground">Supporting Evidence</p>
              </div>
              <div className="text-muted-foreground">→</div>
              <div className="text-center flex-1">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center mx-auto mb-2 text-primary-foreground">
                  <span className="text-xs">5</span>
                </div>
                <p className="text-xs text-muted-foreground">Causal Test (DID)</p>
              </div>
              <div className="text-muted-foreground">→</div>
              <div className="text-center flex-1">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
                  <span className="text-xs">6</span>
                </div>
                <p className="text-xs text-muted-foreground">Robustness Check</p>
              </div>
              <div className="text-muted-foreground">→</div>
              <div className="text-center flex-1">
                <div className="w-10 h-10 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center mx-auto mb-2">
                  <CheckCircle className="w-5 h-5 text-primary" />
                </div>
                <p className="text-xs font-medium">Final Conclusion</p>
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-2 gap-3">
            {example && (
              <Button variant="outline" onClick={() => onLoadExample(example)} size="lg">
                <FlaskConical className="mr-2 h-5 w-5" />Load Example
              </Button>
            )}
            <Button onClick={onStart} size="lg">
              <Sparkles className="mr-2 h-5 w-5" />Start Analysis
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface EffectivenessPageProps { 
  data: DataSet; 
  numericHeaders: string[]; 
  categoricalHeaders: string[]; 
  onLoadExample: (example: ExampleDataSet) => void; 
  onAnalysisComplete?: (stats: any, openChat?: boolean) => void; 
}

export default function EffectivenessPage({ 
  data, 
  numericHeaders, 
  categoricalHeaders, 
  onLoadExample, 
  onAnalysisComplete 
}: EffectivenessPageProps) {
  const { toast } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<'intro' | 'main'>('intro');
  const [outcomeVar, setOutcomeVar] = useState<string | undefined>();
  const [timeVar, setTimeVar] = useState<string | undefined>();
  const [groupVar, setGroupVar] = useState<string | undefined>();
  const [covariates, setCovariates] = useState<string[]>([]);
  const [results, setResults] = useState<EffectivenessResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 1, [data, numericHeaders]);

  useEffect(() => {
    setOutcomeVar(undefined); setTimeVar(undefined); setGroupVar(undefined); setCovariates([]); setResults(null);
    setView(canRun ? 'main' : 'intro');
  }, [data, canRun]);

  const handleCovariateChange = (header: string, checked: boolean) => { 
    setCovariates(prev => checked ? [...prev, header] : prev.filter(h => h !== header)); 
  };

  const handleAnalysis = useCallback(async () => {
    if (!outcomeVar) { 
      toast({ variant: 'destructive', title: 'Error', description: 'Select outcome variable.' }); 
      return; 
    }
    
    setIsLoading(true); 
    setResults(null);
    
    try {
      const response = await fetch('/api/analysis/effectiveness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          data, 
          outcome: outcomeVar, 
          time: timeVar, 
          group: groupVar, 
          covariates 
        })
      });
      
      if (!response.ok) { 
        const err = await response.json().catch(() => ({})); 
        throw new Error(err.detail || err.error || `HTTP error! ${response.status}`); 
      }
      
      const result: EffectivenessResults = await response.json();
      if ((result as any).error) {
        throw new Error((result as any).error);
      }
      
      setResults(result); 
      onAnalysisComplete?.(result, false);
      toast({ title: 'Analysis Complete', description: 'Results are ready.' });
    } catch (e: any) { 
      console.error('Analysis error:', e);
      toast({ variant: 'destructive', title: 'Analysis Error', description: e.message }); 
      setResults(null); 
    } finally { 
      setIsLoading(false); 
    }
  }, [data, outcomeVar, timeVar, groupVar, covariates, toast, onAnalysisComplete]);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    try { 
      const canvas = await html2canvas(resultsRef.current, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#ffffff' 
      }); 
      const link = document.createElement('a'); 
      link.download = `Effectiveness_${new Date().toISOString().split('T')[0]}.png`; 
      link.href = canvas.toDataURL('image/png', 1.0); 
      link.click(); 
      toast({ title: "Download complete" }); 
    } catch { 
      toast({ variant: 'destructive', title: "Download failed" }); 
    } finally { 
      setIsDownloading(false); 
    }
  }, [toast]);

  const handleDownloadCSV = useCallback(() => {
    if (!results) return;
    let csv = "EFFECTIVENESS ANALYSIS\n";
    csv += `Outcome: ${outcomeVar}\nTime: ${timeVar}\nGroup: ${groupVar}\n\n`;
    if (results.pre_post_comparison?.overall) { 
      const pp = results.pre_post_comparison.overall; 
      csv += "PRE-POST\n" + Papa.unparse([{ 
        pre_mean: pp.pre_mean, 
        post_mean: pp.post_mean, 
        difference: pp.difference, 
        p_value: pp.p_value, 
        effect_size: pp.effect_size 
      }]) + "\n\n"; 
    }
    if (results.did_analysis && !results.did_analysis.error) { 
      csv += "DID\n" + Papa.unparse([{ 
        did_estimate: results.did_analysis.did_estimate, 
        p_value: results.did_analysis.did_pvalue, 
        significant: results.did_analysis.significant 
      }]) + "\n"; 
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); 
    const link = document.createElement('a'); 
    link.href = URL.createObjectURL(blob); 
    link.download = `Effectiveness_${new Date().toISOString().split('T')[0]}.csv`; 
    link.click(); 
    toast({ title: "Download Started" });
  }, [results, outcomeVar, timeVar, groupVar, toast]);

  if (view === 'intro' || (!canRun && view === 'main')) {
    return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
  }

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FlaskConical className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-headline">Effectiveness Analysis Setup</CardTitle>
                <CardDescription>Configure variables</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setView('intro')}>
              <HelpCircle className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Outcome <span className="text-destructive">*</span></Label>
              <Select value={outcomeVar} onValueChange={setOutcomeVar}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Time Variable</Label>
              <Select value={timeVar || 'none'} onValueChange={v => setTimeVar(v === 'none' ? undefined : v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {[...categoricalHeaders, ...numericHeaders].map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Group Variable</Label>
              <Select value={groupVar || 'none'} onValueChange={v => setGroupVar(v === 'none' ? undefined : v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {[...categoricalHeaders, ...numericHeaders].map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Covariates</Label>
              <ScrollArea className="h-24 border rounded-md p-2">
                {numericHeaders.filter(h => h !== outcomeVar).map(header => (
                  <div key={header} className="flex items-center space-x-2 py-1">
                    <Checkbox 
                      id={`cov-${header}`} 
                      checked={covariates.includes(header)} 
                      onCheckedChange={c => handleCovariateChange(header, c as boolean)} 
                    />
                    <label htmlFor={`cov-${header}`} className="text-xs">{header}</label>
                  </div>
                ))}
              </ScrollArea>
            </div>
          </div>
          <AnalysisOverview 
            outcomeVar={outcomeVar} 
            timeVar={timeVar} 
            groupVar={groupVar} 
            covariates={covariates} 
            data={data} 
          />
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleAnalysis} disabled={!outcomeVar || isLoading} size="lg">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...
              </>
            ) : (
              <>
                <Calculator className="mr-2 h-4 w-4" />Run Analysis
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {isLoading && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="font-medium">Running analysis...</p>
            </div>
            <Skeleton className="h-48 w-full mt-4" />
          </CardContent>
        </Card>
      )}

      {results && !isLoading && (
        <>
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Download as</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDownloadCSV}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>
                  {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                  PNG
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div ref={resultsRef} data-results-container className="space-y-6 bg-background p-4 rounded-lg">
            <div className="text-center py-4 border-b">
              <h2 className="text-2xl font-bold">Effectiveness Analysis Report</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Outcome: {outcomeVar} | Time: {timeVar || 'N/A'} | Group: {groupVar || 'N/A'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Sample Size" value={results.summary_statistics.n_total} sublabel="Total observations" icon={Layers} />
              <StatCard label="Valid N" value={results.summary_statistics.n_valid} sublabel="After removing missing" icon={CheckCircle} />
              {results.pre_post_comparison?.overall && (
                <>
                  <StatCard 
                    label="Effect Size (d)" 
                    value={results.pre_post_comparison.overall.effect_size.toFixed(3)} 
                    sublabel={results.pre_post_comparison.overall.effect_interpretation} 
                    icon={Scale} 
                  />
                  <StatCard 
                    label="Pre-Post p-value" 
                    value={results.pre_post_comparison.overall.p_value < 0.001 ? '<0.001' : results.pre_post_comparison.overall.p_value.toFixed(4)} 
                    sublabel={results.pre_post_comparison.overall.significant ? 'Significant' : 'Not Significant'} 
                    icon={Target} 
                  />
                </>
              )}
            </div>

            {/* Section 1: Descriptive */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <SectionNumber num={1} />
                  <div>
                    <CardTitle className="text-lg">Descriptive Statistics</CardTitle>
                    <CardDescription>Data distribution</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Statistic</TableHead>
                          <TableHead className="text-right">Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow><TableCell>N</TableCell><TableCell className="text-right font-mono">{results.descriptive_stats.overall.n}</TableCell></TableRow>
                        <TableRow><TableCell>Mean</TableCell><TableCell className="text-right font-mono">{results.descriptive_stats.overall.mean.toFixed(3)}</TableCell></TableRow>
                        <TableRow><TableCell>SD</TableCell><TableCell className="text-right font-mono">{results.descriptive_stats.overall.std.toFixed(3)}</TableCell></TableRow>
                        <TableRow><TableCell>SE</TableCell><TableCell className="text-right font-mono">{results.descriptive_stats.overall.se.toFixed(3)}</TableCell></TableRow>
                        <TableRow><TableCell>Median</TableCell><TableCell className="text-right font-mono">{results.descriptive_stats.overall.median.toFixed(3)}</TableCell></TableRow>
                        <TableRow><TableCell>Min</TableCell><TableCell className="text-right font-mono">{results.descriptive_stats.overall.min.toFixed(3)}</TableCell></TableRow>
                        <TableRow><TableCell>Max</TableCell><TableCell className="text-right font-mono">{results.descriptive_stats.overall.max.toFixed(3)}</TableCell></TableRow>
                      </TableBody>
                    </Table>
                    {Object.keys(results.descriptive_stats.by_group_time).length > 0 && (
                      <>
                        <h4 className="font-semibold text-sm mt-4">By Group × Time</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Group</TableHead>
                              {Object.keys(Object.values(results.descriptive_stats.by_group_time)[0] || {}).map(t => (
                                <TableHead key={t} className="text-center">{t}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(results.descriptive_stats.by_group_time).map(([g, times]) => (
                              <TableRow key={g}>
                                <TableCell className="font-medium">{g}</TableCell>
                                {Object.entries(times).map(([t, s]: [string, any]) => (
                                  <TableCell key={t} className="text-center">
                                    {s.mean.toFixed(2)} <span className="text-xs text-muted-foreground">(n={s.n})</span>
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </>
                    )}
                    <div className="bg-muted/30 rounded-lg p-3 text-sm text-muted-foreground">
                      <strong>Interpretation:</strong> {outcomeVar} has {results.descriptive_stats.overall.n} observations with mean {results.descriptive_stats.overall.mean.toFixed(2)} (SD = {results.descriptive_stats.overall.std.toFixed(2)}).
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    {results.descriptive_stats.plot ? (
                      <Image src={results.descriptive_stats.plot} alt="Descriptive" width={500} height={350} className="rounded-md border" />
                    ) : (
                      <div className="text-muted-foreground text-sm">No plot available</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Pre-Post */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <SectionNumber num={2} />
                  <div>
                    <CardTitle className="text-lg">Pre-Post Comparison</CardTitle>
                    <CardDescription>Before-after significance test</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {results.pre_post_comparison?.overall ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead className="text-right">N</TableHead>
                            <TableHead className="text-right">Mean</TableHead>
                            <TableHead className="text-right">SD</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">Pre ({results.pre_post_comparison.overall.pre_label})</TableCell>
                            <TableCell className="text-right font-mono">{results.pre_post_comparison.overall.pre_n}</TableCell>
                            <TableCell className="text-right font-mono">{results.pre_post_comparison.overall.pre_mean.toFixed(3)}</TableCell>
                            <TableCell className="text-right font-mono">{results.pre_post_comparison.overall.pre_std.toFixed(3)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Post ({results.pre_post_comparison.overall.post_label})</TableCell>
                            <TableCell className="text-right font-mono">{results.pre_post_comparison.overall.post_n}</TableCell>
                            <TableCell className="text-right font-mono">{results.pre_post_comparison.overall.post_mean.toFixed(3)}</TableCell>
                            <TableCell className="text-right font-mono">{results.pre_post_comparison.overall.post_std.toFixed(3)}</TableCell>
                          </TableRow>
                          <TableRow className="bg-muted/30">
                            <TableCell className="font-bold">Difference</TableCell>
                            <TableCell className="text-right">—</TableCell>
                            <TableCell className="text-right font-mono font-bold">
                              {results.pre_post_comparison.overall.difference > 0 ? '+' : ''}{results.pre_post_comparison.overall.difference.toFixed(3)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={results.pre_post_comparison.overall.significant ? 'default' : 'destructive'}>
                                p = {results.pre_post_comparison.overall.p_value < 0.001 ? '<.001' : results.pre_post_comparison.overall.p_value.toFixed(3)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                      <div className="bg-muted/30 rounded-lg p-3 text-sm text-muted-foreground">
                        <strong>Interpretation:</strong> {outcomeVar} {results.pre_post_comparison.overall.difference > 0 ? 'increased' : 'decreased'} by {Math.abs(results.pre_post_comparison.overall.difference).toFixed(2)} ({results.pre_post_comparison.overall.percent_change?.toFixed(1)}%), which is {results.pre_post_comparison.overall.significant ? 'statistically significant' : 'not statistically significant'}.
                      </div>
                    </div>
                    <div className="flex items-center justify-center">
                      {results.pre_post_comparison.plot ? (
                        <Image src={results.pre_post_comparison.plot} alt="Pre-Post" width={500} height={350} className="rounded-md border" />
                      ) : (
                        <div className="text-muted-foreground text-sm">No plot available</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Select time variable.</p>
                )}
              </CardContent>
            </Card>

            {/* Section 3: Effect Size */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <SectionNumber num={3} />
                  <div>
                    <CardTitle className="text-lg">Effect Size</CardTitle>
                    <CardDescription>Cohen&apos;s d</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {results.pre_post_comparison?.overall ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <p className="text-xs text-muted-foreground">Negligible</p>
                          <p className="font-mono">&lt; 0.2</p>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <p className="text-xs text-muted-foreground">Small</p>
                          <p className="font-mono">0.2-0.5</p>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <p className="text-xs text-muted-foreground">Medium</p>
                          <p className="font-mono">0.5-0.8</p>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <p className="text-xs text-muted-foreground">Large</p>
                          <p className="font-mono">≥ 0.8</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-center py-4">
                        <p className="text-sm text-muted-foreground mb-2">Cohen&apos;s d</p>
                        <p className="text-4xl font-bold mb-2">{results.pre_post_comparison.overall.effect_size.toFixed(3)}</p>
                        <Badge 
                          variant={Math.abs(results.pre_post_comparison.overall.effect_size) >= 0.5 ? 'default' : 'secondary'} 
                          className="text-base px-3 py-1 capitalize"
                        >
                          {results.pre_post_comparison.overall.effect_interpretation}
                        </Badge>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3 text-sm text-muted-foreground">
                        <strong>Interpretation:</strong> The effect size is {results.pre_post_comparison.overall.effect_interpretation}, indicating {Math.abs(results.pre_post_comparison.overall.effect_size) >= 0.5 ? 'a practically meaningful' : 'a limited practical'} difference.
                      </div>
                    </div>
                    <div className="flex items-center justify-center">
                      {results.effect_size_analysis?.plot ? (
                        <Image src={results.effect_size_analysis.plot} alt="Effect Size" width={500} height={300} className="rounded-md border" />
                      ) : (
                        <div className="text-muted-foreground text-sm">No plot available</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Pre-post comparison required.</p>
                )}
              </CardContent>
            </Card>

            {/* Section 4: Trend */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <SectionNumber num={4} />
                  <div>
                    <CardTitle className="text-lg">Trend Analysis</CardTitle>
                    <CardDescription>Change over time</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {results.trend_analysis?.overall_trend ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Parameter</TableHead>
                            <TableHead className="text-right">Value</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell>Slope</TableCell>
                            <TableCell className="text-right font-mono">{results.trend_analysis.overall_trend.slope.toFixed(4)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Intercept</TableCell>
                            <TableCell className="text-right font-mono">{results.trend_analysis.overall_trend.intercept.toFixed(4)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>R²</TableCell>
                            <TableCell className="text-right font-mono">{results.trend_analysis.overall_trend.r_squared.toFixed(4)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>p-value</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={results.trend_analysis.overall_trend.significant ? 'default' : 'destructive'}>
                                {results.trend_analysis.overall_trend.p_value < 0.001 ? '<.001' : results.trend_analysis.overall_trend.p_value.toFixed(4)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-muted/30">
                            <TableCell className="font-bold">Direction</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {results.trend_analysis.overall_trend.trend_direction === 'increasing' ? (
                                  <TrendingUp className="h-4 w-4 text-primary" />
                                ) : results.trend_analysis.overall_trend.trend_direction === 'decreasing' ? (
                                  <TrendingDown className="h-4 w-4 text-destructive" />
                                ) : (
                                  <Minus className="h-4 w-4" />
                                )}
                                <span className="capitalize">{results.trend_analysis.overall_trend.trend_direction}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                      <div className="bg-muted/30 rounded-lg p-3 text-sm text-muted-foreground">
                        <strong>Interpretation:</strong> {outcomeVar} shows {results.trend_analysis.overall_trend.trend_direction === 'flat' ? 'no clear' : `a ${results.trend_analysis.overall_trend.trend_direction}`} trend over time{results.trend_analysis.overall_trend.significant ? ' (statistically significant)' : ''}.
                      </div>
                    </div>
                    <div className="flex items-center justify-center">
                      {results.trend_analysis.plot ? (
                        <Image src={results.trend_analysis.plot} alt="Trend" width={500} height={350} className="rounded-md border" />
                      ) : (
                        <div className="text-muted-foreground text-sm">No plot available</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Select time variable.</p>
                )}
              </CardContent>
            </Card>

            {/* Section 5: DID */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <SectionNumber num={5} />
                  <div>
                    <CardTitle className="text-lg">Difference-in-Differences (DID)</CardTitle>
                    <CardDescription>Causal effect estimation</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {results.did_analysis && !results.did_analysis.error && results.did_analysis.did_estimate !== null ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead></TableHead>
                            <TableHead className="text-center">Pre</TableHead>
                            <TableHead className="text-center">Post</TableHead>
                            <TableHead className="text-center">Change</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">Treatment ({results.did_analysis.treatment_label})</TableCell>
                            <TableCell className="text-center font-mono">{results.did_analysis.cell_means.treatment_pre.toFixed(3)}</TableCell>
                            <TableCell className="text-center font-mono">{results.did_analysis.cell_means.treatment_post.toFixed(3)}</TableCell>
                            <TableCell className="text-center font-mono text-primary font-semibold">
                              {results.did_analysis.treatment_change > 0 ? '+' : ''}{results.did_analysis.treatment_change.toFixed(3)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Control ({results.did_analysis.control_label})</TableCell>
                            <TableCell className="text-center font-mono">{results.did_analysis.cell_means.control_pre.toFixed(3)}</TableCell>
                            <TableCell className="text-center font-mono">{results.did_analysis.cell_means.control_post.toFixed(3)}</TableCell>
                            <TableCell className="text-center font-mono">
                              {results.did_analysis.control_change > 0 ? '+' : ''}{results.did_analysis.control_change.toFixed(3)}
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-primary/5">
                            <TableCell className="font-bold" colSpan={3}>DID Effect</TableCell>
                            <TableCell className="text-center font-bold text-primary text-lg">
                              {results.did_analysis.did_estimate.toFixed(3)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-center p-3 bg-muted/30 rounded-lg">
                          <p className="text-xs text-muted-foreground">Estimate (β)</p>
                          <p className="font-bold font-mono">{results.did_analysis.did_estimate.toFixed(3)}</p>
                        </div>
                        <div className="text-center p-3 bg-muted/30 rounded-lg">
                          <p className="text-xs text-muted-foreground">p-value</p>
                          <p className={`font-bold font-mono ${results.did_analysis.significant ? 'text-primary' : 'text-destructive'}`}>
                            {results.did_analysis.did_pvalue! < 0.001 ? '<.001' : results.did_analysis.did_pvalue?.toFixed(4)}
                          </p>
                        </div>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3 text-sm text-muted-foreground">
                        <strong>Interpretation:</strong> The causal effect of {groupVar} on {outcomeVar} is {results.did_analysis.did_estimate.toFixed(2)}, which is {results.did_analysis.significant ? 'statistically significant' : 'not statistically significant'}.
                      </div>
                    </div>
                    <div className="flex items-center justify-center">
                      {results.did_analysis.plot ? (
                        <Image src={results.did_analysis.plot} alt="DID" width={500} height={350} className="rounded-md border" />
                      ) : (
                        <div className="text-muted-foreground text-sm">No plot available</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    {results.did_analysis?.error || 'Select time and group variables.'}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Section 6: Sensitivity */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <SectionNumber num={6} />
                  <div>
                    <CardTitle className="text-lg">Sensitivity Analysis</CardTitle>
                    <CardDescription>Robustness verification</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {results.sensitivity_analysis?.base_model ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Model</TableHead>
                            <TableHead className="text-right">DID</TableHead>
                            <TableHead className="text-right">p-value</TableHead>
                            <TableHead className="text-center">Sig.</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">Base</TableCell>
                            <TableCell className="text-right font-mono">{results.sensitivity_analysis.base_model.did_estimate.toFixed(3)}</TableCell>
                            <TableCell className="text-right font-mono">
                              {results.sensitivity_analysis.base_model.did_pvalue < 0.001 ? '<.001' : results.sensitivity_analysis.base_model.did_pvalue.toFixed(4)}
                            </TableCell>
                            <TableCell className="text-center">
                              {results.sensitivity_analysis.base_model.significant ? (
                                <CheckCircle className="h-4 w-4 text-primary mx-auto" />
                              ) : (
                                <XCircle className="h-4 w-4 text-destructive mx-auto" />
                              )}
                            </TableCell>
                          </TableRow>
                          {results.sensitivity_analysis.with_covariates && (
                            <TableRow>
                              <TableCell className="font-medium">With Covariates</TableCell>
                              <TableCell className="text-right font-mono">{results.sensitivity_analysis.with_covariates.did_estimate.toFixed(3)}</TableCell>
                              <TableCell className="text-right font-mono">
                                {results.sensitivity_analysis.with_covariates.did_pvalue < 0.001 ? '<.001' : results.sensitivity_analysis.with_covariates.did_pvalue.toFixed(4)}
                              </TableCell>
                              <TableCell className="text-center">
                                {results.sensitivity_analysis.with_covariates.significant ? (
                                  <CheckCircle className="h-4 w-4 text-primary mx-auto" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-destructive mx-auto" />
                                )}
                              </TableCell>
                            </TableRow>
                          )}
                          {results.sensitivity_analysis.robustness_check && (
                            <TableRow>
                              <TableCell className="font-medium">Robust (Trimmed)</TableCell>
                              <TableCell className="text-right font-mono">{results.sensitivity_analysis.robustness_check.did_estimate.toFixed(3)}</TableCell>
                              <TableCell className="text-right font-mono">
                                {results.sensitivity_analysis.robustness_check.did_pvalue < 0.001 ? '<.001' : results.sensitivity_analysis.robustness_check.did_pvalue.toFixed(4)}
                              </TableCell>
                              <TableCell className="text-center">
                                {results.sensitivity_analysis.robustness_check.significant ? (
                                  <CheckCircle className="h-4 w-4 text-primary mx-auto" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-destructive mx-auto" />
                                )}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                      <div className="bg-muted/30 rounded-lg p-3 text-sm text-muted-foreground">
                        <strong>Interpretation:</strong> Results are {results.sensitivity_analysis.base_model.significant === results.sensitivity_analysis.robustness_check?.significant ? 'consistent' : 'inconsistent'} across model specifications, {results.sensitivity_analysis.base_model.significant === results.sensitivity_analysis.robustness_check?.significant ? 'supporting' : 'questioning'} the robustness of findings.
                      </div>
                    </div>
                    <div className="flex items-center justify-center">
                      {results.sensitivity_analysis.plot ? (
                        <Image src={results.sensitivity_analysis.plot} alt="Sensitivity" width={500} height={300} className="rounded-md border" />
                      ) : (
                        <div className="text-muted-foreground text-sm">No plot available</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">DID analysis required.</p>
                )}
              </CardContent>
            </Card>

            {/* Overall Conclusion */}
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Overall Conclusion</CardTitle>
                    <CardDescription>Summary report</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Report Style Summary */}
                <div className="prose prose-sm max-w-none">
                  <div className="bg-muted/20 rounded-lg p-5 space-y-4">
                    <div>
                      <h4 className="font-semibold text-base mb-2">1. Purpose of Analysis</h4>
                      <p className="text-sm text-muted-foreground">
                        This analysis was conducted to evaluate whether <strong>{groupVar || 'the intervention'}</strong> had a significant effect on <strong>{outcomeVar}</strong>. 
                        Using data from {results.summary_statistics.n_total} observations, we examined changes across {timeVar ? `time periods (${timeVar})` : 'conditions'} 
                        {groupVar ? ` comparing ${groupVar} groups` : ''}.
                      </p>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h4 className="font-semibold text-base mb-2">2. Key Findings</h4>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        {results.pre_post_comparison?.overall && (
                          <li className="flex items-start gap-2">
                            {results.pre_post_comparison.overall.significant ? (
                              <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                            )}
                            <span>
                              <strong>Pre-Post Change:</strong> {outcomeVar} {results.pre_post_comparison.overall.difference > 0 ? 'increased' : 'decreased'} by {Math.abs(results.pre_post_comparison.overall.difference).toFixed(2)} ({results.pre_post_comparison.overall.percent_change?.toFixed(1)}%), {results.pre_post_comparison.overall.significant ? 'statistically significant' : 'not statistically significant'} (p {results.pre_post_comparison.overall.p_value < 0.001 ? '< .001' : `= ${results.pre_post_comparison.overall.p_value.toFixed(3)}`}).
                            </span>
                          </li>
                        )}
                        {results.pre_post_comparison?.overall && (
                          <li className="flex items-start gap-2">
                            {Math.abs(results.pre_post_comparison.overall.effect_size) >= 0.5 ? (
                              <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                            )}
                            <span>
                              <strong>Effect Size:</strong> Cohen&apos;s d = {results.pre_post_comparison.overall.effect_size.toFixed(2)} ({results.pre_post_comparison.overall.effect_interpretation}), indicating {Math.abs(results.pre_post_comparison.overall.effect_size) >= 0.5 ? 'practically meaningful' : 'limited practical'} impact.
                            </span>
                          </li>
                        )}
                        {results.did_analysis && !results.did_analysis.error && results.did_analysis.did_estimate !== null && (
                          <li className="flex items-start gap-2">
                            {results.did_analysis.significant ? (
                              <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                            )}
                            <span>
                              <strong>Causal Effect (DID):</strong> The treatment effect is {results.did_analysis.did_estimate.toFixed(2)}, {results.did_analysis.significant ? 'statistically significant' : 'not statistically significant'} (p {results.did_analysis.did_pvalue! < 0.001 ? '< .001' : `= ${results.did_analysis.did_pvalue?.toFixed(3)}`}). This {results.did_analysis.significant ? 'supports' : 'does not support'} a causal relationship.
                            </span>
                          </li>
                        )}
                        {results.trend_analysis?.overall_trend && (
                          <li className="flex items-start gap-2">
                            {results.trend_analysis.overall_trend.significant ? (
                              <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                            )}
                            <span>
                              <strong>Trend:</strong> {outcomeVar} shows {results.trend_analysis.overall_trend.trend_direction === 'flat' ? 'no clear trend' : `a ${results.trend_analysis.overall_trend.trend_direction} trend`} over time{results.trend_analysis.overall_trend.significant ? ' (significant)' : ''}.
                            </span>
                          </li>
                        )}
                      </ul>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h4 className="font-semibold text-base mb-2">3. Conclusion</h4>
                      <div className="flex items-center gap-3 mb-3">
                        <ConclusionBadge conclusion={results.overall_conclusion.conclusion} />
                        <span className="text-sm text-muted-foreground">
                          Confidence: {results.overall_conclusion.confidence_level === 'high' ? 'High' : results.overall_conclusion.confidence_level === 'low' ? 'Low' : 'Medium'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{results.overall_conclusion.conclusion_text}</p>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h4 className="font-semibold text-base mb-2">4. Recommendation</h4>
                      <p className="text-sm text-muted-foreground">{results.overall_conclusion.recommendation}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {!results && !isLoading && (
        <div className="text-center text-muted-foreground py-10">
          <FlaskConical className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-2">Configure variables and click &apos;Run Analysis&apos;.</p>
        </div>
      )}
    </div>
  );
}
