'use client';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Flame, Star, Target, TrendingDown, Sparkles, Sigma, HelpCircle, Settings, FileSearch, CheckCircle, Download, Info, Lightbulb, BookOpen, FileSpreadsheet, ImageIcon, Database, Settings2, ChevronRight, ChevronLeft, Check, CheckCircle2, FileText, AlertTriangle, ChevronDown, FileCode, FileType, Layers, BarChart3 } from 'lucide-react';
import type { DataSet } from '@/lib/stats';
import { Badge } from '../../ui/badge';
import { ScrollArea } from '../../ui/scroll-area';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Checkbox } from '../../ui/checkbox';
import { Skeleton } from '../../ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'https://statistica-api-577472426399.us-central1.run.app';

interface IpaMatrixItem {
    attribute: string;
    
    importance: number;
    performance: number;
    quadrant: string;
    priority_score: number;
    gap: number;
    r_squared?: number;
    relative_importance?: number;
}

interface RegressionSummary {
    r2: number;
    adj_r2: number;
    beta_coefficients: { attribute: string, beta: number }[];
}

interface IpaResults {
    ipa_matrix: IpaMatrixItem[];
    regression_summary: RegressionSummary;
}

interface FullAnalysisResponse {
    results: IpaResults;
    main_plot: string;
    dashboard_plot: string;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const STEPS = [
    { id: 1, label: 'Variables' },
    { id: 2, label: 'Settings' },
    { id: 3, label: 'Validation' },
    { id: 4, label: 'Summary' },
    { id: 5, label: 'Reasoning' },
    { id: 6, label: 'Statistics' }
];

// Interactive Scatter Plot Component
const InteractiveScatterPlot = ({ data }: { data: IpaMatrixItem[] }) => {
    const [hoveredPoint, setHoveredPoint] = useState<string | null>(null);
    const [selectedPoint, setSelectedPoint] = useState<string | null>(null);

    const width = 800;
    const height = 600;
    const padding = { top: 40, right: 40, bottom: 60, left: 80 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    const importanceValues = data.map(d => d.importance);
    const performanceValues = data.map(d => d.performance);
    
    const minImportance = Math.min(...importanceValues);
    const maxImportance = Math.max(...importanceValues);
    const minPerformance = Math.min(...performanceValues);
    const maxPerformance = Math.max(...performanceValues);

    const importanceRange = maxImportance - minImportance;
    const performanceRange = maxPerformance - minPerformance;
    const importancePadding = importanceRange * 0.1;
    const performancePadding = performanceRange * 0.1;

    const midImportance = 0;
    const midPerformance = data.reduce((sum, d) => sum + d.performance, 0) / data.length;

    const scaleX = (importance: number) => 
        padding.left + ((importance - minImportance + importancePadding) / (importanceRange + 2 * importancePadding)) * plotWidth;
    
    const scaleY = (performance: number) => 
        padding.top + plotHeight - ((performance - minPerformance + performancePadding) / (performanceRange + 2 * performancePadding)) * plotHeight;

    const midX = scaleX(midImportance);
    const midY = scaleY(midPerformance);

    const quadrantInfo: Record<string, { color: string; bgColor: string }> = {
        'Q1: Keep Up Good Work': { color: '#16a34a', bgColor: '#ecfdf5' },
        'Q2: Concentrate Here': { color: '#dc2626', bgColor: '#fef2f2' },
        'Q3: Low Priority': { color: '#64748b', bgColor: '#f8fafc' },
        'Q4: Possible Overkill': { color: '#f59e0b', bgColor: '#fffbeb' },
    };

    const selectedItem = selectedPoint ? data.find(d => d.attribute === selectedPoint) : null;
    const hoveredItem = hoveredPoint ? data.find(d => d.attribute === hoveredPoint) : null;
    const displayItem = selectedItem || hoveredItem;

    return (
        <div className="relative">
            <svg width={width} height={height} className="border rounded-lg bg-white">
                <rect x={padding.left} y={padding.top} width={midX - padding.left} height={midY - padding.top} fill={quadrantInfo['Q4: Possible Overkill'].bgColor} />
                <rect x={midX} y={padding.top} width={width - padding.right - midX} height={midY - padding.top} fill={quadrantInfo['Q1: Keep Up Good Work'].bgColor} />
                <rect x={padding.left} y={midY} width={midX - padding.left} height={height - padding.bottom - midY} fill={quadrantInfo['Q3: Low Priority'].bgColor} />
                <rect x={midX} y={midY} width={width - padding.right - midX} height={height - padding.bottom - midY} fill={quadrantInfo['Q2: Concentrate Here'].bgColor} />

                <text x={midX - (midX - padding.left) / 2} y={padding.top + 20} textAnchor="middle" className="text-xs font-semibold fill-amber-600">✨ Possible Overkill</text>
                <text x={midX + (width - padding.right - midX) / 2} y={padding.top + 20} textAnchor="middle" className="text-xs font-semibold fill-green-700">⭐ Keep Up Good Work</text>
                <text x={midX - (midX - padding.left) / 2} y={height - padding.bottom - 10} textAnchor="middle" className="text-xs font-semibold fill-slate-600">📉 Low Priority</text>
                <text x={midX + (width - padding.right - midX) / 2} y={height - padding.bottom - 10} textAnchor="middle" className="text-xs font-semibold fill-red-700">🔥 Concentrate Here</text>

                <line x1={midX} y1={padding.top} x2={midX} y2={height - padding.bottom} stroke="#94a3b8" strokeWidth="2" strokeDasharray="5,5" />
                <line x1={padding.left} y1={midY} x2={width - padding.right} y2={midY} stroke="#94a3b8" strokeWidth="2" strokeDasharray="5,5" />
                <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#1e293b" strokeWidth="2" />
                <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#1e293b" strokeWidth="2" />

                <text x={width / 2} y={height - 20} textAnchor="middle" className="text-sm font-semibold fill-slate-700">Importance →</text>
                <text x={20} y={height / 2} textAnchor="middle" transform={`rotate(-90, 20, ${height / 2})`} className="text-sm font-semibold fill-slate-700">Performance →</text>

                {data.map((item) => {
                    const x = scaleX(item.importance);
                    const y = scaleY(item.performance);
                    const isHovered = hoveredPoint === item.attribute;
                    const isSelected = selectedPoint === item.attribute;
                    const quadrantColor = quadrantInfo[item.quadrant]?.color || '#64748b';
                    
                    return (
                        <g key={item.attribute}>
                            <circle cx={x} cy={y} r={isSelected ? 10 : isHovered ? 8 : 6} fill={quadrantColor} stroke={isSelected ? '#1e293b' : isHovered ? '#475569' : 'white'} strokeWidth={isSelected ? 3 : isHovered ? 2 : 1.5} className="cursor-pointer transition-all" onMouseEnter={() => setHoveredPoint(item.attribute)} onMouseLeave={() => setHoveredPoint(null)} onClick={() => setSelectedPoint(selectedPoint === item.attribute ? null : item.attribute)} opacity={isHovered || isSelected ? 1 : 0.8} />
                            {(isHovered || isSelected) && <text x={x} y={y - 15} textAnchor="middle" className="text-xs font-semibold fill-slate-900 pointer-events-none" style={{ textShadow: '0 0 3px white, 0 0 3px white' }}>{item.attribute}</text>}
                        </g>
                    );
                })}
            </svg>
            {displayItem && (
                <Card className="absolute top-4 right-4 w-64 shadow-lg">
                    <CardHeader className="pb-3"><CardTitle className="text-sm">{displayItem.attribute}</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-xs">
                        <div className="flex justify-between"><span className="text-muted-foreground">Quadrant:</span><Badge className={`text-xs ${displayItem.quadrant === 'Q1: Keep Up Good Work' ? 'bg-green-100 text-green-800' : displayItem.quadrant === 'Q2: Concentrate Here' ? 'bg-red-100 text-red-800' : displayItem.quadrant === 'Q3: Low Priority' ? 'bg-slate-100 text-slate-800' : 'bg-amber-100 text-amber-800'}`}>{displayItem.quadrant.split(': ')[1]}</Badge></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Performance:</span><span className="font-mono font-semibold">{displayItem.performance.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Importance:</span><span className="font-mono font-semibold">{displayItem.importance.toFixed(3)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Gap:</span><span className={`font-mono font-semibold ${displayItem.gap < 0 ? 'text-red-600' : 'text-green-600'}`}>{displayItem.gap > 0 ? '+' : ''}{displayItem.gap.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Priority:</span><span className="font-mono font-semibold">{displayItem.priority_score.toFixed(2)}</span></div>
                    </CardContent>
                </Card>
            )}
            <div className="mt-2 text-xs text-muted-foreground text-center">Hover over points for details • Click to pin information</div>
        </div>
    );
};

// Quadrant Summary Cards
const QuadrantSummaryCards = ({ results }: { results: IpaResults }) => {
    const quadrantCounts = useMemo(() => {
        const counts: Record<string, number> = { 'Q1: Keep Up Good Work': 0, 'Q2: Concentrate Here': 0, 'Q3: Low Priority': 0, 'Q4: Possible Overkill': 0 };
        results.ipa_matrix.forEach(item => { counts[item.quadrant] = (counts[item.quadrant] || 0) + 1; });
        return counts;
    }, [results]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-red-200 bg-red-50/50"><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-red-800">Concentrate Here</p><Flame className="h-5 w-5 text-red-600" /></div><p className="text-3xl font-bold text-red-900">{quadrantCounts['Q2: Concentrate Here']}</p><p className="text-xs text-red-700">High priority</p></div></CardContent></Card>
            <Card className="border-green-200 bg-green-50/50"><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-green-800">Keep Up Good Work</p><Star className="h-5 w-5 text-green-600" /></div><p className="text-3xl font-bold text-green-900">{quadrantCounts['Q1: Keep Up Good Work']}</p><p className="text-xs text-green-700">Maintain excellence</p></div></CardContent></Card>
            <Card className="border-slate-200 bg-slate-50/50"><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-800">Low Priority</p><TrendingDown className="h-5 w-5 text-slate-600" /></div><p className="text-3xl font-bold text-slate-900">{quadrantCounts['Q3: Low Priority']}</p><p className="text-xs text-slate-700">Monitor only</p></div></CardContent></Card>
            <Card className="border-amber-200 bg-amber-50/50"><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-amber-800">Possible Overkill</p><Sparkles className="h-5 w-5 text-amber-600" /></div><p className="text-3xl font-bold text-amber-900">{quadrantCounts['Q4: Possible Overkill']}</p><p className="text-xs text-amber-700">Consider reallocation</p></div></CardContent></Card>
        </div>
    );
};

// Intro Page
const IntroPage = ({ onLoadExample }: { onLoadExample: (e: any) => void }) => {
    const ipaExample = exampleDatasets.find(d => d.id === 'ipa-restaurant');
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Target className="w-8 h-8 text-primary" /></div></div>
                    <CardTitle className="font-headline text-3xl">Key Driver Analysis (IPA)</CardTitle>
                    <CardDescription className="text-base mt-2">Prioritize improvement areas by mapping attributes based on importance and performance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                        <Card className="border-2 border-red-200 bg-red-50/30"><CardHeader><Flame className="w-6 h-6 text-red-600 mb-2" /><CardTitle className="text-lg">Concentrate Here</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">High importance, low performance - your top priorities</p></CardContent></Card>
                        <Card className="border-2 border-green-200 bg-green-50/30"><CardHeader><Star className="w-6 h-6 text-green-600 mb-2" /><CardTitle className="text-lg">Keep Up Good Work</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">High importance, high performance - maintain strengths</p></CardContent></Card>
                        <Card className="border-2 border-slate-200 bg-slate-50/30"><CardHeader><TrendingDown className="w-6 h-6 text-slate-600 mb-2" /><CardTitle className="text-lg">Low Priority</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Low importance, low performance - don't waste resources</p></CardContent></Card>
                        <Card className="border-2 border-amber-200 bg-amber-50/30"><CardHeader><Sparkles className="w-6 h-6 text-amber-600 mb-2" /><CardTitle className="text-lg">Possible Overkill</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Low importance, high performance - consider reallocation</p></CardContent></Card>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><Info className="w-5 h-5" />When to Use IPA</h3>
                        <p className="text-sm text-muted-foreground mb-4">Use IPA for strategic resource allocation decisions. Perfect for customer satisfaction surveys, employee engagement studies, and product feature prioritization.</p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div><h4 className="font-semibold text-sm mb-2"><Settings className="w-4 h-4 text-primary inline mr-1" />Requirements</h4><ul className="space-y-1 text-sm text-muted-foreground"><li><CheckCircle className="w-4 h-4 text-green-600 inline mr-1" />Overall satisfaction variable</li><li><CheckCircle className="w-4 h-4 text-green-600 inline mr-1" />3+ performance attributes</li><li><CheckCircle className="w-4 h-4 text-green-600 inline mr-1" />30+ responses minimum</li></ul></div>
                            <div><h4 className="font-semibold text-sm mb-2"><FileSearch className="w-4 h-4 text-primary inline mr-1" />Results</h4><ul className="space-y-1 text-sm text-muted-foreground"><li><CheckCircle className="w-4 h-4 text-green-600 inline mr-1" />IPA Matrix visualization</li><li><CheckCircle className="w-4 h-4 text-green-600 inline mr-1" />Importance from regression</li><li><CheckCircle className="w-4 h-4 text-green-600 inline mr-1" />Priority scores</li></ul></div>
                        </div>
                    </div>
                    {ipaExample && <div className="flex justify-center pt-2"><Button onClick={() => onLoadExample(ipaExample)} size="lg"><Target className="mr-2 h-5 w-5" />Load Restaurant Survey Example</Button></div>}
                </CardContent>
            </Card>
        </div>
    );
};

interface IpaPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    onGenerateReport?: (stats: any, viz: string | null) => void;
}

export default function IpaPage({ data, numericHeaders, onLoadExample }: IpaPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);

    const [view, setView] = useState('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);

    const [dependentVar, setDependentVar] = useState<string | undefined>();
    const [independentVars, setIndependentVars] = useState<string[]>([]);

    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const availableIVs = useMemo(() => numericHeaders.filter(h => h !== dependentVar), [numericHeaders, dependentVar]);
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);

    const validationChecks = useMemo(() => {
        const checks = [];
        checks.push({ label: 'Dependent variable selected', passed: !!dependentVar, message: dependentVar ? `Selected: ${dependentVar}` : 'Please select overall satisfaction' });
        checks.push({ label: 'Attributes selected', passed: independentVars.length >= 3, message: independentVars.length >= 3 ? `${independentVars.length} attributes selected` : `${independentVars.length} selected (3+ recommended)` });
        checks.push({ label: 'Sufficient responses', passed: data.length >= 30, message: data.length >= 30 ? `${data.length} responses (30+ recommended)` : `${data.length} responses insufficient` });
        checks.push({ label: 'Good sample size', passed: data.length >= 100, message: data.length >= 100 ? 'Excellent sample size' : 'More responses would improve reliability' });
        return checks;
    }, [dependentVar, independentVars, data.length]);

    const allChecksPassed = validationChecks.slice(0, 3).every(c => c.passed);
    const goToStep = (step: Step) => { setCurrentStep(step); if (step > maxReachedStep) setMaxReachedStep(step); };
    const nextStep = () => { if (currentStep < 6) goToStep((currentStep + 1) as Step); };
    const prevStep = () => { if (currentStep > 1) goToStep((currentStep - 1) as Step); };

    useEffect(() => {
        const overallSat = numericHeaders.find(h => h.toLowerCase().includes('overall'));
        setDependentVar(overallSat || numericHeaders[numericHeaders.length - 1]);
        setView(canRun ? 'main' : 'intro');
        setCurrentStep(1); setMaxReachedStep(1);
    }, [numericHeaders, canRun]);

    useEffect(() => { setIndependentVars(availableIVs); setAnalysisResult(null); }, [availableIVs]);

    const handleIVChange = (header: string, checked: boolean) => {
        setIndependentVars(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (!dependentVar || independentVars.length < 1) { toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select variables.' }); return; }
        setIsLoading(true); setAnalysisResult(null);
        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/ipa`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, dependentVar, independentVars }) });
            if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'API error'); }
            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            setAnalysisResult(result);
            goToStep(4);
        } catch (e: any) { toast({ title: "Analysis Error", description: e.message, variant: "destructive" }); }
        finally { setIsLoading(false); }
    }, [data, dependentVar, independentVars, toast]);

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) { toast({ variant: 'destructive', title: 'No results to download' }); return; }
        setIsDownloading(true);
        toast({ title: "Generating image..." });
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `IPA_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            toast({ title: "Download complete" });
        } catch { toast({ variant: 'destructive', title: "Download failed" }); }
        finally { setIsDownloading(false); }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult?.results) return;
        const summaryData = analysisResult.results.ipa_matrix.map(item => ({
            Attribute: item.attribute,
            Quadrant: item.quadrant,
            Performance: item.performance.toFixed(4),
            Importance: item.importance.toFixed(4),
            Gap: item.gap.toFixed(4),
            Priority_Score: item.priority_score.toFixed(4)
        }));
        let csvContent = "IPA ANALYSIS RESULTS\n" + Papa.unparse(summaryData) + "\n\nMODEL SUMMARY\nR-squared," + analysisResult.results.regression_summary.r2.toFixed(4) + "\nAdj R-squared," + analysisResult.results.regression_summary.adj_r2.toFixed(4);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `IPA_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "CSV Downloaded" });
    }, [analysisResult, toast]);

    const quadrantCounts = useMemo(() => {
        if (!analysisResult?.results) return { q1: 0, q2: 0, q3: 0, q4: 0 };
        return {
            q1: analysisResult.results.ipa_matrix.filter(item => item.quadrant === 'Q1: Keep Up Good Work').length,
            q2: analysisResult.results.ipa_matrix.filter(item => item.quadrant === 'Q2: Concentrate Here').length,
            q3: analysisResult.results.ipa_matrix.filter(item => item.quadrant === 'Q3: Low Priority').length,
            q4: analysisResult.results.ipa_matrix.filter(item => item.quadrant === 'Q4: Possible Overkill').length,
        };
    }, [analysisResult]);

    const topPriorities = useMemo(() => {
        if (!analysisResult?.results) return [];
        return analysisResult.results.ipa_matrix.filter(item => item.quadrant === 'Q2: Concentrate Here').sort((a, b) => b.priority_score - a.priority_score).slice(0, 3);
    }, [analysisResult]);

    const topStrengths = useMemo(() => {
        if (!analysisResult?.results) return [];
        return analysisResult.results.ipa_matrix.filter(item => item.quadrant === 'Q1: Keep Up Good Work').sort((a, b) => b.importance - a.importance).slice(0, 3);
    }, [analysisResult]);

    if (view === 'intro' || !canRun) return <IntroPage onLoadExample={onLoadExample} />;

    const results = analysisResult?.results;
    const hasCriticalIssues = quadrantCounts.q2 > 0;

    const ProgressBar = () => (
        <div className="w-full mb-8"><div className="flex items-center justify-between">
            {STEPS.map((step) => {
                const isCompleted = step.id < currentStep; const isCurrent = step.id === currentStep; const isClickable = step.id <= maxReachedStep;
                return (<button key={step.id} onClick={() => isClickable && goToStep(step.id as Step)} disabled={!isClickable} className={`flex flex-col items-center gap-2 flex-1 ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 border-2 ${isCurrent ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-lg' : isCompleted ? 'bg-primary/80 text-primary-foreground border-primary/80' : 'bg-background border-muted-foreground/30 text-muted-foreground'}`}>{isCompleted && !isCurrent ? <Check className="w-5 h-5" /> : step.id}</div>
                    <span className={`text-xs font-medium hidden sm:block ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>{step.label}</span>
                </button>);
            })}
        </div></div>
    );

    return (
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex justify-between items-center"><div><h1 className="text-2xl font-bold">Key Driver Analysis (IPA)</h1><p className="text-muted-foreground mt-1">Importance-Performance Analysis</p></div><Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button></div>
            <ProgressBar />
            <div className="min-h-[500px]">
                {/* Step 1: Variables */}
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-6 h-6 text-primary" /></div><div><CardTitle>Select Variables</CardTitle><CardDescription>Choose dependent and independent variables</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3"><Label className="text-sm font-medium">Overall Satisfaction (Dependent)</Label><Select value={dependentVar} onValueChange={setDependentVar}><SelectTrigger className="h-11"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                            <div className="space-y-3"><Label className="text-sm font-medium">Performance Attributes (Independent)</Label><ScrollArea className="h-40 border rounded-md p-4"><div className="grid grid-cols-2 gap-2">{availableIVs.map(h => (<div key={h} className="flex items-center space-x-2"><Checkbox id={`iv-${h}`} checked={independentVars.includes(h)} onCheckedChange={c => handleIVChange(h, c as boolean)} /><Label htmlFor={`iv-${h}`} className="text-sm">{h}</Label></div>))}</div></ScrollArea></div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl"><Info className="w-5 h-5 text-muted-foreground shrink-0" /><p className="text-sm text-muted-foreground">Responses: <span className="font-semibold text-foreground">{data.length}</span> | Attributes: <span className="font-semibold text-foreground">{independentVars.length}</span></p></div>
                        </CardContent>
                        <CardFooter className="pt-4"><Button onClick={nextStep} className="ml-auto" size="lg" disabled={!dependentVar}>Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 2: Settings */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Analysis Settings</CardTitle><CardDescription>Review configuration</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3"><h4 className="font-medium text-sm">Configuration Summary</h4><div className="space-y-2 text-sm text-muted-foreground"><p>• <strong className="text-foreground">Dependent:</strong> {dependentVar || 'Not selected'}</p><p>• <strong className="text-foreground">Attributes:</strong> {independentVars.length} selected</p><p>• <strong className="text-foreground">Responses:</strong> {data.length}</p></div></div>
                            <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl"><h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-sky-600" />Analysis Method</h4><p className="text-sm text-muted-foreground">Importance is derived from regression beta coefficients. Performance is the mean rating. Attributes are mapped to quadrants based on their position relative to the averages.</p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 3: Validation */}
                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-primary" /></div><div><CardTitle>Data Validation</CardTitle><CardDescription>Checking requirements</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">{validationChecks.map((check, idx) => (<div key={idx} className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${check.passed ? 'bg-primary/5' : 'bg-amber-50/50 dark:bg-amber-950/20'}`}>{check.passed ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}<div><p className={`font-medium text-sm ${check.passed ? 'text-foreground' : 'text-amber-700 dark:text-amber-300'}`}>{check.label}</p><p className="text-xs text-muted-foreground mt-0.5">{check.message}</p></div></div>))}</div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={handleAnalysis} disabled={isLoading || !allChecksPassed} size="lg">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <><Sigma className="mr-2 h-4 w-4" />Run Analysis</>}</Button></CardFooter>
                    </Card>
                )}

                {/* Step 4: Summary (EFA Style) */}
                {currentStep === 4 && results && (() => {
                    const r2Good = results.regression_summary.r2 >= 0.5;
                    
                    return (
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div><div><CardTitle>Result Summary</CardTitle><CardDescription>Key Driver Analysis for {dependentVar}</CardDescription></div></div></CardHeader>
                            <CardContent className="space-y-6">
                                {/* Key Findings Box */}
                                <div className={`rounded-xl p-6 space-y-4 border ${!hasCriticalIssues ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${!hasCriticalIssues ? 'text-primary' : 'text-amber-600'}`} />Key Findings</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3"><span className={`font-bold ${!hasCriticalIssues ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            Analyzed <strong>{results.ipa_matrix.length}</strong> attributes. Model explains <strong>{(results.regression_summary.r2 * 100).toFixed(1)}%</strong> of satisfaction variance (R² = {results.regression_summary.r2.toFixed(3)}).
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${!hasCriticalIssues ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            {hasCriticalIssues 
                                                ? <><strong className="text-red-600">{quadrantCounts.q2}</strong> attribute(s) require immediate attention (Concentrate Here quadrant).</>
                                                : <>No critical gaps identified. Focus on maintaining your <strong className="text-green-600">{quadrantCounts.q1}</strong> strength(s).</>}
                                        </p></div>
                                        <div className="flex items-start gap-3"><span className={`font-bold ${!hasCriticalIssues ? 'text-primary' : 'text-amber-600'}`}>•</span><p className="text-sm">
                                            Top driver: <strong>{results.regression_summary.beta_coefficients.sort((a, b) => Math.abs(b.beta) - Math.abs(a.beta))[0]?.attribute}</strong> (β = {results.regression_summary.beta_coefficients.sort((a, b) => Math.abs(b.beta) - Math.abs(a.beta))[0]?.beta.toFixed(3)})
                                        </p></div>
                                    </div>
                                </div>

                                {/* Conclusion Box */}
                                <div className={`rounded-xl p-5 border ${!hasCriticalIssues ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'}`}>
                                    <div className="flex items-start gap-3">
                                        {!hasCriticalIssues ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <Flame className="w-6 h-6 text-amber-600" />}
                                        <div>
                                            <p className="font-semibold">{!hasCriticalIssues ? "Well Balanced Performance" : "Action Required"}</p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {!hasCriticalIssues 
                                                    ? "No critical gaps between importance and performance. Continue monitoring and maintaining your strengths."
                                                    : `${quadrantCounts.q2} high-importance attribute(s) are underperforming. Prioritize improvement in these areas for maximum satisfaction impact.`}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Summary Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <Card className="border-red-200"><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Concentrate Here</p><Flame className="h-4 w-4 text-red-600" /></div><p className="text-2xl font-semibold text-red-600">{quadrantCounts.q2}</p><p className="text-xs text-muted-foreground">Critical priorities</p></div></CardContent></Card>
                                    <Card className="border-green-200"><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Keep Up Good Work</p><Star className="h-4 w-4 text-green-600" /></div><p className="text-2xl font-semibold text-green-600">{quadrantCounts.q1}</p><p className="text-xs text-muted-foreground">Strengths</p></div></CardContent></Card>
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">R-Squared</p><BarChart3 className="h-4 w-4 text-muted-foreground" /></div><p className={`text-2xl font-semibold ${r2Good ? 'text-green-600' : 'text-amber-600'}`}>{(results.regression_summary.r2 * 100).toFixed(1)}%</p><p className="text-xs text-muted-foreground">Variance explained</p></div></CardContent></Card>
                                    <Card><CardContent className="p-6"><div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-medium text-muted-foreground">Attributes</p><Layers className="h-4 w-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{results.ipa_matrix.length}</p><p className="text-xs text-muted-foreground">Analyzed</p></div></CardContent></Card>
                                </div>

                                {/* Quality Stars */}
                                <div className="flex items-center justify-center gap-1 py-2">
                                    <span className="text-sm text-muted-foreground mr-2">Model Quality:</span>
                                    {[1, 2, 3, 4, 5].map(star => {
                                        const score = results.regression_summary.r2 >= 0.7 ? 5 : results.regression_summary.r2 >= 0.5 ? 4 : results.regression_summary.r2 >= 0.3 ? 3 : 2;
                                        return <span key={star} className={`text-lg ${star <= score ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}>★</span>;
                                    })}
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 flex justify-end">
                                <Button onClick={nextStep} size="lg">Why This Conclusion?<ChevronRight className="ml-2 w-4 h-4" /></Button>
                            </CardFooter>
                        </Card>
                    );
                })()}

                {/* Step 5: Reasoning */}
                {currentStep === 5 && results && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-6 h-6 text-primary" /></div><div><CardTitle>Why This Conclusion?</CardTitle><CardDescription>Simple explanation of IPA analysis</CardDescription></div></div></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div><div><h4 className="font-semibold mb-1">Importance from Regression</h4><p className="text-sm text-muted-foreground">We used regression analysis to determine how much each attribute contributes to overall satisfaction. The standardized beta coefficients represent importance — higher |β| means stronger influence on satisfaction.</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div><div><h4 className="font-semibold mb-1">Performance from Mean Ratings</h4><p className="text-sm text-muted-foreground">Performance is simply the average rating each attribute received. Higher means better current performance.</p></div></div></div>
                            <div className="bg-muted/30 rounded-xl p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div><div><h4 className="font-semibold mb-1">Quadrant Assignment</h4><p className="text-sm text-muted-foreground"><strong>Concentrate Here:</strong> High importance, low performance — needs improvement<br/><strong>Keep Up Good Work:</strong> High importance, high performance — maintain<br/><strong>Low Priority:</strong> Low importance, low performance — monitor<br/><strong>Possible Overkill:</strong> Low importance, high performance — consider resource reallocation</p></div></div></div>
                            <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 rounded-xl p-5 border border-amber-300 dark:border-amber-700"><h4 className="font-semibold mb-2 flex items-center gap-2"><Target className="w-4 h-4 text-amber-600" />Strategic Implications</h4><p className="text-sm text-muted-foreground">Focus resources on "Concentrate Here" attributes for maximum ROI. These are the attributes customers care about most but where you're underperforming. Improving them will have the biggest impact on overall satisfaction.</p></div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button><Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button></CardFooter>
                    </Card>
                )}

                {/* Step 6: Full Statistics */}
                {currentStep === 6 && results && (
                    <>
                    <div className="flex justify-between items-center mb-4">
                        <div><h2 className="text-lg font-semibold">Statistical Details</h2><p className="text-sm text-muted-foreground">Full IPA matrix and visualizations</p></div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="outline"><Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Download as</DropdownMenuLabel><DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleDownloadCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />CSV Spreadsheet</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>{isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}PNG Image</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem disabled className="text-muted-foreground"><FileText className="mr-2 h-4 w-4" />PDF Report<Badge variant="outline" className="ml-auto text-xs">Soon</Badge></DropdownMenuItem>
                                <DropdownMenuItem disabled className="text-muted-foreground"><FileType className="mr-2 h-4 w-4" />Word Document<Badge variant="outline" className="ml-auto text-xs">Soon</Badge></DropdownMenuItem>
                                <DropdownMenuItem disabled className="text-muted-foreground"><FileCode className="mr-2 h-4 w-4" />Python Script<Badge variant="outline" className="ml-auto text-xs">Soon</Badge></DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div ref={resultsRef} data-results-container className="space-y-6 bg-background p-4 rounded-lg">
                        <div className="text-center py-4 border-b"><h2 className="text-2xl font-bold">Key Driver Analysis (IPA) Report</h2><p className="text-sm text-muted-foreground mt-1">Dependent: {dependentVar} | {independentVars.length} Attributes | {data.length} Responses | {new Date().toLocaleDateString()}</p></div>

                        <QuadrantSummaryCards results={results} />

                        {/* IPA Matrix */}
                        <Card><CardHeader><CardTitle>IPA Matrix</CardTitle><CardDescription>Interactive importance-performance grid</CardDescription></CardHeader><CardContent><InteractiveScatterPlot data={results.ipa_matrix} /></CardContent></Card>

                        {/* Model Summary */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <Card><CardHeader><CardTitle>Model Summary</CardTitle></CardHeader><CardContent className="space-y-4">
                                <div><p className="text-sm text-muted-foreground">R-Squared</p><p className="text-2xl font-bold">{(results.regression_summary.r2 * 100).toFixed(1)}%</p></div>
                                <div><p className="text-sm text-muted-foreground">Adjusted R-Squared</p><p className="text-xl font-semibold">{(results.regression_summary.adj_r2 * 100).toFixed(1)}%</p></div>
                            </CardContent></Card>
                            <Card><CardHeader><CardTitle>Top Drivers (Beta)</CardTitle></CardHeader><CardContent><div className="space-y-2">{results.regression_summary.beta_coefficients.sort((a, b) => Math.abs(b.beta) - Math.abs(a.beta)).slice(0, 5).map((coef, idx) => (<div key={coef.attribute} className="flex items-center justify-between text-sm py-2 px-3 bg-muted/30 rounded"><div className="flex items-center gap-2"><span className="font-bold text-primary">#{idx + 1}</span><span className="font-medium truncate">{coef.attribute}</span></div><span className="font-mono font-semibold">{coef.beta.toFixed(3)}</span></div>))}</div></CardContent></Card>
                        </div>

                        {/* Full Table */}
                        <Card><CardHeader><CardTitle>Attribute Details</CardTitle></CardHeader><CardContent>
                            <Table><TableHeader><TableRow><TableHead>Attribute</TableHead><TableHead>Quadrant</TableHead><TableHead className="text-right">Performance</TableHead><TableHead className="text-right">Importance</TableHead><TableHead className="text-right">Gap</TableHead><TableHead className="text-right">Priority</TableHead></TableRow></TableHeader>
                            <TableBody>{results.ipa_matrix.sort((a, b) => b.priority_score - a.priority_score).map((item) => (<TableRow key={item.attribute}><TableCell className="font-medium">{item.attribute}</TableCell><TableCell><Badge className={`${item.quadrant === 'Q1: Keep Up Good Work' ? 'bg-green-100 text-green-800' : item.quadrant === 'Q2: Concentrate Here' ? 'bg-red-100 text-red-800' : item.quadrant === 'Q3: Low Priority' ? 'bg-slate-100 text-slate-800' : 'bg-amber-100 text-amber-800'}`}>{item.quadrant.split(': ')[1]}</Badge></TableCell><TableCell className="text-right font-mono">{item.performance.toFixed(2)}</TableCell><TableCell className="text-right font-mono">{item.importance.toFixed(3)}</TableCell><TableCell className={`text-right font-mono ${item.gap < 0 ? 'text-red-600' : 'text-green-600'}`}>{item.gap > 0 ? '+' : ''}{item.gap.toFixed(2)}</TableCell><TableCell className="text-right font-mono font-semibold">{item.priority_score.toFixed(2)}</TableCell></TableRow>))}</TableBody></Table>
                        </CardContent></Card>
                    </div>

                    <div className="mt-4 flex justify-start"><Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button></div>
                    </>
                )}

                {isLoading && (<Card><CardContent className="p-6 flex flex-col items-center gap-4"><Loader2 className="h-8 w-8 text-primary animate-spin" /><p className="text-muted-foreground">Performing regression analysis...</p><Skeleton className="h-[400px] w-full" /></CardContent></Card>)}
            </div>
        </div>
    );
}