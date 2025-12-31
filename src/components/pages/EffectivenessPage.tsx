'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
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

interface EvidencePoint { interpretation: string; statistic: string; significant: boolean; }

interface OverallConclusion {
  conclusion: string; conclusion_text: string; confidence_level: string;
  evidence_points: EvidencePoint[]; recommendation: string;
}

interface EffectivenessResults {
  descriptive_stats: DescriptiveStats;
  pre_post_comparison: PrePostComparison | null;
  did_analysis: DIDAnalysis | null;
  trend_analysis: TrendAnalysis | null;
  sensitivity_analysis: SensitivityAnalysis | null;
  effect_size_analysis: { plot: string | null } | null;
  overall_conclusion: OverallConclusion;
  summary_statistics: { n_total: number; n_valid: number; outcome_var: string; time_var: string | null; group_var: string | null; covariates: string[] };
}

const SectionNumber = ({ num }: { num: number }) => (
  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">{num}</div>
);

const StatCard = ({ label, value, sublabel, icon: Icon }: { label: string; value: string | number; sublabel?: string; icon?: any }) => (
  <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">{label}</p>{Icon && <Icon className="h-4 w-4 text-muted-foreground" />}</div><p className="text-2xl font-semibold">{value}</p>{sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}</div></CardContent></Card>
);

const ConclusionBadge = ({ conclusion }: { conclusion: string }) => {
  const config: { [key: string]: { color: string; icon: any; bg: string } } = {
    'EFFECTIVE': { color: 'text-primary', icon: CheckCircle, bg: 'bg-primary/10' },
    'LIKELY EFFECTIVE': { color: 'text-primary', icon: TrendingUp, bg: 'bg-primary/10' },
    'NO CLEAR EFFECT': { color: 'text-muted-foreground', icon: Minus, bg: 'bg-muted' }
  };
  const { color, icon: Icon, bg } = config[conclusion] || config['NO CLEAR EFFECT'];
  return (<div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${bg}`}><Icon className={`h-5 w-5 ${color}`} /><span className={`font-bold ${color}`}>{conclusion}</span></div>);
};

const AnalysisOverview = ({ outcomeVar, timeVar, groupVar, covariates, data }: { outcomeVar: string | undefined; timeVar: string | undefined; groupVar: string | undefined; covariates: string[]; data: DataSet; }) => {
  const items = useMemo(() => {
    const overview = [];
    if (!outcomeVar) overview.push('⚠ Select outcome variable'); else overview.push(`Outcome: ${outcomeVar}`);
    if (!timeVar) overview.push('⚠ Select time variable'); else overview.push(`Time: ${timeVar}`);
    if (!groupVar) overview.push('ℹ No group variable (DID unavailable)'); else overview.push(`Group: ${groupVar}`);
    if (covariates.length > 0) overview.push(`Covariates: ${covariates.join(', ')}`);
    overview.push(`Sample size: ${data.length}`);
    return overview;
  }, [outcomeVar, timeVar, groupVar, covariates, data]);
  return (<Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium flex items-center gap-2"><Info className="h-4 w-4" /> Overview</CardTitle></CardHeader><CardContent><ul className="space-y-1 text-sm text-muted-foreground">{items.map((item, idx) => (<li key={idx} className="flex items-start"><span className="mr-2">•</span><span>{item}</span></li>))}</ul></CardContent></Card>);
};

const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
  const example = exampleDatasets.find(d => d.id === 'effectiveness-analysis');
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><FlaskConical className="w-8 h-8 text-primary" /></div></div>
          <CardTitle className="font-headline text-3xl">Effectiveness Analysis</CardTitle>
          <CardDescription className="text-base mt-2">Comprehensive intervention effectiveness evaluation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-5 text-center">
            <p className="text-sm text-muted-foreground mb-2">Core Question</p>
            <p className="text-xl font-semibold text-primary">&quot;Did the intervention cause the observed change?&quot;</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><HelpCircle className="w-5 h-5 text-primary" /> Why This Analysis?</h3>
            <p className="text-sm text-muted-foreground">
              Simply observing a change before and after an intervention is not enough. The change could be due to external factors, natural trends, or random variation. This analysis uses multiple statistical methods to determine whether the observed change can be <strong>causally attributed</strong> to the intervention.
            </p>
          </div>
          <div className="flex justify-center pt-2 gap-3">
            {example && <Button variant="outline" onClick={() => onLoadExample(example)} size="lg"><FlaskConical className="mr-2 h-5 w-5" />Load Example</Button>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface EffectivenessPageProps { data: DataSet; numericHeaders: string[]; categoricalHeaders: string[]; onLoadExample: (example: ExampleDataSet) => void; onAnalysisComplete?: (stats: any, openChat?: boolean) => void; }

export default function EffectivenessPage({ data, numericHeaders, categoricalHeaders, onLoadExample, onAnalysisComplete }: EffectivenessPageProps) {
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

  const handleCovariateChange = (header: string, checked: boolean) => { setCovariates(prev => checked ? [...prev, header] : prev.filter(h => h !== header)); };

  const handleAnalysis = useCallback(async () => {
    if (!outcomeVar) { toast({ variant: 'destructive', title: 'Error', description: 'Select outcome variable.' }); return; }
    setIsLoading(true); setResults(null);
    try {
      const response = await fetch('/api/analysis/effectiveness', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, outcomeVar, timeVar, groupVar, covariates }) });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || `HTTP error! ${response.status}`); }
      const result: EffectivenessResults = await response.json();
      if ((result as any).error) throw new Error((result as any).error);
      setResults(result); onAnalysisComplete?.(result, false);
    } catch (e: any) { toast({ variant: 'destructive', title: 'Analysis Error', description: e.message }); setResults(null); }
    finally { setIsLoading(false); }
  }, [data, outcomeVar, timeVar, groupVar, covariates, toast, onAnalysisComplete]);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    try { const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }); const link = document.createElement('a'); link.download = `Effectiveness_${new Date().toISOString().split('T')[0]}.png`; link.href = canvas.toDataURL('image/png', 1.0); link.click(); toast({ title: "Download complete" }); }
    catch { toast({ variant: 'destructive', title: "Download failed" }); }
    finally { setIsDownloading(false); }
  }, [toast]);

  const handleDownloadCSV = useCallback(() => {
    if (!results) return;
    let csv = "EFFECTIVENESS ANALYSIS\n";
    csv += `Outcome: ${outcomeVar}\nTime: ${timeVar}\nGroup: ${groupVar}\n\n`;
    if (results.pre_post_comparison?.overall) { const pp = results.pre_post_comparison.overall; csv += "PRE-POST\n" + Papa.unparse([{ pre_mean: pp.pre_mean, post_mean: pp.post_mean, difference: pp.difference, p_value: pp.p_value, effect_size: pp.effect_size }]) + "\n\n"; }
    if (results.did_analysis && !results.did_analysis.error) { csv += "DID\n" + Papa.unparse([{ did_estimate: results.did_analysis.did_estimate, p_value: results.did_analysis.did_pvalue, significant: results.did_analysis.significant }]) + "\n"; }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `Effectiveness_${new Date().toISOString().split('T')[0]}.csv`; link.click(); toast({ title: "Download Started" });
  }, [results, outcomeVar, timeVar, groupVar, toast]);

  if (view === 'intro' || (!canRun && view === 'main')) return <IntroPage onLoadExample={onLoadExample} />;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3"><div className="p-2 bg-primary/10 rounded-lg"><FlaskConical className="h-5 w-5 text-primary" /></div><div><CardTitle className="font-headline">Effectiveness Analysis Setup</CardTitle><CardDescription>Configure variables</CardDescription></div></div>
            <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5" /></Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2"><Label>Outcome <span className="text-destructive">*</span></Label><Select value={outcomeVar} onValueChange={setOutcomeVar}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Time Variable</Label><Select value={timeVar || 'none'} onValueChange={v => setTimeVar(v === 'none' ? undefined : v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{[...categoricalHeaders, ...numericHeaders].map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Group Variable</Label><Select value={groupVar || 'none'} onValueChange={v => setGroupVar(v === 'none' ? undefined : v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{[...categoricalHeaders, ...numericHeaders].map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Covariates</Label><ScrollArea className="h-24 border rounded-md p-2">{numericHeaders.filter(h => h !== outcomeVar).map(header => (<div key={header} className="flex items-center space-x-2 py-1"><Checkbox id={`cov-${header}`} checked={covariates.includes(header)} onCheckedChange={c => handleCovariateChange(header, c as boolean)} /><label htmlFor={`cov-${header}`} className="text-xs">{header}</label></div>))}</ScrollArea></div>
          </div>
          <AnalysisOverview outcomeVar={outcomeVar} timeVar={timeVar} groupVar={groupVar} covariates={covariates} data={data} />
        </CardContent>
        <CardFooter className="flex justify-end"><Button onClick={handleAnalysis} disabled={!outcomeVar || isLoading} size="lg">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <><Calculator className="mr-2 h-4 w-4" />Run Analysis</>}</Button></CardFooter>
      </Card>

      {isLoading && <Card><CardContent className="p-6"><div className="flex items-center gap-3"><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className="font-medium">Running analysis...</p></div><Skeleton className="h-48 w-full mt-4" /></CardContent></Card>}

      {results && !isLoading && (
        <>
          <div className="flex justify-end">
            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48"><DropdownMenuLabel>Download as</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV</DropdownMenuItem><DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG</DropdownMenuItem></DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div ref={resultsRef} data-results-container className="space-y-6 bg-background p-4 rounded-lg">
            <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Effectiveness Analysis Report</h2><p className="text-sm text-muted-foreground mt-1">Outcome: {outcomeVar} | Time: {timeVar || 'N/A'} | Group: {groupVar || 'N/A'}</p></div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Sample Size" value={results.summary_statistics.n_total} sublabel="Total observations" icon={Layers} />
              <StatCard label="Valid N" value={results.summary_statistics.n_valid} sublabel="After removing missing" icon={CheckCircle} />
              {results.pre_post_comparison?.overall && (<><StatCard label="Effect Size (d)" value={results.pre_post_comparison.overall.effect_size.toFixed(3)} sublabel={results.pre_post_comparison.overall.effect_interpretation} icon={Scale} /><StatCard label="Pre-Post p-value" value={results.pre_post_comparison.overall.p_value < 0.001 ? '<0.001' : results.pre_post_comparison.overall.p_value.toFixed(4)} sublabel={results.pre_post_comparison.overall.significant ? 'Significant' : 'Not Significant'} icon={Target} /></>)}
            </div>
            
            <Card className="border-2 border-primary/20"><CardHeader><div className="flex items-center gap-3"><div className="p-2 bg-primary/10 rounded-lg"><Sparkles className="h-5 w-5 text-primary" /></div><div><CardTitle className="text-xl">Overall Conclusion</CardTitle><CardDescription>Summary report</CardDescription></div></div></CardHeader>
              <CardContent className="space-y-6">
                <div className="prose prose-sm max-w-none">
                  <div className="bg-muted/20 rounded-lg p-5 space-y-4">
                    <div className="text-center">
                      <h4 className="font-semibold text-base mb-2">Conclusion</h4>
                      <div className="flex items-center gap-3 mb-3 justify-center">
                        <ConclusionBadge conclusion={results.overall_conclusion.conclusion} />
                        <span className="text-sm text-muted-foreground">Confidence: {results.overall_conclusion.confidence_level === 'high' ? 'High' : results.overall_conclusion.confidence_level === 'low' ? 'Low' : 'Medium'}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{results.overall_conclusion.conclusion_text}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card><CardHeader><div className="flex items-center gap-3"><SectionNumber num={1} /><div><CardTitle className="text-lg">Descriptive Statistics</CardTitle><CardDescription>Data distribution</CardDescription></div></div></CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Table><TableHeader><TableRow><TableHead>Statistic</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader>
                      <TableBody>
                        <TableRow><TableCell>N</TableCell><TableCell className="text-right font-mono">{results.descriptive_stats.overall.n}</TableCell></TableRow>
                        <TableRow><TableCell>Mean</TableCell><TableCell className="text-right font-mono">{results.descriptive_stats.overall.mean.toFixed(3)}</TableCell></TableRow>
                        <TableRow><TableCell>SD</TableCell><TableCell className="text-right font-mono">{results.descriptive_stats.overall.std.toFixed(3)}</TableCell></TableRow>
                        <TableRow><TableCell>Median</TableCell><TableCell className="text-right font-mono">{results.descriptive_stats.overall.median.toFixed(3)}</TableCell></TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex items-center justify-center">
                    {results.descriptive_stats.plot ? <Image src={results.descriptive_stats.plot} alt="Descriptive" width={500} height={350} className="rounded-md border" /> : <div className="text-muted-foreground text-sm">No plot available</div>}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card><CardHeader><div className="flex items-center gap-3"><SectionNumber num={2} /><div><CardTitle className="text-lg">Pre-Post Comparison</CardTitle><CardDescription>Before-after significance test</CardDescription></div></div></CardHeader>
              <CardContent>
                {results.pre_post_comparison?.overall ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <Table><TableHeader><TableRow><TableHead>Time</TableHead><TableHead className="text-right">N</TableHead><TableHead className="text-right">Mean</TableHead><TableHead className="text-right">SD</TableHead></TableRow></TableHeader>
                        <TableBody>
                          <TableRow><TableCell className="font-medium">Pre ({results.pre_post_comparison.overall.pre_label})</TableCell><TableCell className="text-right font-mono">{results.pre_post_comparison.overall.pre_n}</TableCell><TableCell className="text-right font-mono">{results.pre_post_comparison.overall.pre_mean.toFixed(3)}</TableCell><TableCell className="text-right font-mono">{results.pre_post_comparison.overall.pre_std.toFixed(3)}</TableCell></TableRow>
                          <TableRow><TableCell className="font-medium">Post ({results.pre_post_comparison.overall.post_label})</TableCell><TableCell className="text-right font-mono">{results.pre_post_comparison.overall.post_n}</TableCell><TableCell className="text-right font-mono">{results.pre_post_comparison.overall.post_mean.toFixed(3)}</TableCell><TableCell className="text-right font-mono">{results.pre_post_comparison.overall.post_std.toFixed(3)}</TableCell></TableRow>
                          <TableRow className="bg-muted/30"><TableCell className="font-bold">Difference</TableCell><TableCell className="text-right">—</TableCell><TableCell className="text-right font-mono font-bold">{results.pre_post_comparison.overall.difference > 0 ? '+' : ''}{results.pre_post_comparison.overall.difference.toFixed(3)}</TableCell><TableCell className="text-right"><Badge variant={results.pre_post_comparison.overall.significant ? 'default' : 'destructive'}>p = {results.pre_post_comparison.overall.p_value < 0.001 ? '<.001' : results.pre_post_comparison.overall.p_value.toFixed(3)}</Badge></TableCell></TableRow>
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex items-center justify-center">
                      {results.pre_post_comparison.plot ? <Image src={results.pre_post_comparison.plot} alt="Pre-Post" width={500} height={350} className="rounded-md border" /> : <div className="text-muted-foreground text-sm">No plot available</div>}
                    </div>
                  </div>
                ) : <p className="text-muted-foreground text-center py-8">Select time variable.</p>}
              </CardContent>
            </Card>

            <Card><CardHeader><div className="flex items-center gap-3"><SectionNumber num={3} /><div><CardTitle className="text-lg">Difference-in-Differences (DID)</CardTitle><CardDescription>Causal effect estimation</CardDescription></div></div></CardHeader>
              <CardContent>
                {results.did_analysis && !results.did_analysis.error && results.did_analysis.did_estimate !== null ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <Table><TableHeader><TableRow><TableHead></TableHead><TableHead className="text-center">Pre</TableHead><TableHead className="text-center">Post</TableHead><TableHead className="text-center">Change</TableHead></TableRow></TableHeader>
                        <TableBody>
                          <TableRow><TableCell className="font-medium">Treatment ({results.did_analysis.treatment_label})</TableCell><TableCell className="text-center font-mono">{results.did_analysis.cell_means.treatment_pre.toFixed(3)}</TableCell><TableCell className="text-center font-mono">{results.did_analysis.cell_means.treatment_post.toFixed(3)}</TableCell><TableCell className="text-center font-mono text-primary font-semibold">{results.did_analysis.treatment_change > 0 ? '+' : ''}{results.did_analysis.treatment_change.toFixed(3)}</TableCell></TableRow>
                          <TableRow><TableCell className="font-medium">Control ({results.did_analysis.control_label})</TableCell><TableCell className="text-center font-mono">{results.did_analysis.cell_means.control_pre.toFixed(3)}</TableCell><TableCell className="text-center font-mono">{results.did_analysis.cell_means.control_post.toFixed(3)}</TableCell><TableCell className="text-center font-mono">{results.did_analysis.control_change > 0 ? '+' : ''}{results.did_analysis.control_change.toFixed(3)}</TableCell></TableRow>
                          <TableRow className="bg-primary/5"><TableCell className="font-bold" colSpan={3}>DID Effect</TableCell><TableCell className="text-center font-bold text-primary text-lg">{results.did_analysis.did_estimate.toFixed(3)}</TableCell></TableRow>
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex items-center justify-center">
                      {results.did_analysis.plot ? <Image src={results.did_analysis.plot} alt="DID" width={500} height={350} className="rounded-md border" /> : <div className="text-muted-foreground text-sm">No plot available</div>}
                    </div>
                  </div>
                ) : <p className="text-muted-foreground text-center py-8">{results.did_analysis?.error || 'Select time and group variables.'}</p>}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
