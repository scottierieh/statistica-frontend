'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Lightbulb, FileType, CheckCircle, Zap, HelpCircle, 
    BookOpen, Download, FileSpreadsheet, ImageIcon, 
    Shield, Target, Layers, Plus, X, Check, XCircle
} from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import Papa from 'papaparse';

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'https://statistica-api-577472426399.us-central1.run.app';

interface Insight {
    type: 'warning' | 'info';
    title: string;
    description: string;
}

interface FactorResult {
    name: string;
    items: string[];
    n_items: number;
    cronbach_alpha: number | null;
    composite_reliability: number | null;
    ave: number | null;
    sqrt_ave: number | null;
    factor_loadings: { [key: string]: number };
    item_total_correlations: { [key: string]: number };
    alpha_if_deleted: { [key: string]: number | null };
    valid_alpha: boolean;
    valid_cr: boolean;
    valid_ave: boolean;
}

interface FornellLarckerResult {
    factor_1: string;
    factor_2: string;
    correlation: number;
    sqrt_ave_1: number;
    sqrt_ave_2: number;
    valid: boolean;
}

interface HTMTResult {
    factor_1: string;
    factor_2: string;
    htmt: number;
    valid_085: boolean;
    valid_090: boolean;
}

interface AnalysisResult {
    n_observations: number;
    n_factors: number;
    n_items: number;
    kmo: number;
    bartlett_chi_square: number;
    bartlett_p_value: number;
    rotation: string;
    factor_results: FactorResult[];
    factor_correlation: number[][];
    fornell_larcker: FornellLarckerResult[];
    fornell_larcker_valid: boolean;
    htmt: HTMTResult[];
    overall_validity: {
        internal_consistency: boolean;
        composite_reliability: boolean;
        convergent_validity: boolean;
        discriminant_validity_fl: boolean;
        discriminant_validity_htmt: boolean | null;
    };
    variance_explained: number[];
    cumulative_variance: number[];
    insights: Insight[];
    recommendations: string[];
    plots: {
        reliability_summary: string;
        loadings_heatmap: string;
        fornell_larcker?: string;
        htmt?: string;
    };
    error?: string;
}

interface FactorDefinition {
    name: string;
    items: string[];
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const example = exampleDatasets.find(d => d.id === 'survey' || d.id === 'well-being-survey');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Shield className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Reliability & Validity Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Assess construct reliability (CR, α) and validity (AVE, HTMT)
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Reliability</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Cronbach's α, Composite Reliability (CR)
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Layers className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Convergent</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    AVE, Factor Loadings
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Shield className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Discriminant</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Fornell-Larcker, HTMT
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            About Reliability & Validity
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Essential for validating survey instruments and measurement models in SEM/PLS analysis. 
                            Ensures that your constructs are internally consistent and distinct from each other.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                    Thresholds
                                </h4>
                                <ul className="space-y-1 text-sm text-muted-foreground">
                                    <li><span className="font-mono bg-muted px-1">α ≥ 0.7</span> Internal consistency</li>
                                    <li><span className="font-mono bg-muted px-1">CR ≥ 0.7</span> Composite reliability</li>
                                    <li><span className="font-mono bg-muted px-1">AVE ≥ 0.5</span> Convergent validity</li>
                                    <li><span className="font-mono bg-muted px-1">HTMT &lt; 0.85</span> Discriminant validity</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                                    Requirements
                                </h4>
                                <ul className="space-y-1 text-sm text-muted-foreground">
                                    <li>• Minimum 50 observations</li>
                                    <li>• At least 2 factors defined</li>
                                    <li>• 3+ items per factor recommended</li>
                                    <li>• Numeric (Likert-scale) data</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {example && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(example)} size="lg">
                                <Shield className="mr-2 h-5 w-5" />
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface ReliabilityValidityPageProps {
    data: DataSet;
    numericHeaders: string[];
    allHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function ReliabilityValidityPage({ data, numericHeaders, allHeaders, onLoadExample }: ReliabilityValidityPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    const [factors, setFactors] = useState<FactorDefinition[]>([
        { name: 'Factor1', items: [] }
    ]);
    const [rotation, setRotation] = useState('promax');
    
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [view, setView] = useState('intro');

    const canRun = useMemo(() => data.length >= 50 && numericHeaders.length >= 4, [data, numericHeaders]);

    useEffect(() => {
        setFactors([{ name: 'Factor1', items: [] }]);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders, canRun]);

    // Get all assigned items
    const assignedItems = useMemo(() => {
        return factors.flatMap(f => f.items);
    }, [factors]);

    // Get available items (not yet assigned)
    const availableItems = useMemo(() => {
        return numericHeaders.filter(h => !assignedItems.includes(h));
    }, [numericHeaders, assignedItems]);

    const addFactor = () => {
        setFactors(prev => [...prev, { name: `Factor${prev.length + 1}`, items: [] }]);
    };

    const removeFactor = (index: number) => {
        if (factors.length > 1) {
            setFactors(prev => prev.filter((_, i) => i !== index));
        }
    };

    const updateFactorName = (index: number, name: string) => {
        setFactors(prev => prev.map((f, i) => i === index ? { ...f, name } : f));
    };

    const addItemToFactor = (factorIndex: number, item: string) => {
        setFactors(prev => prev.map((f, i) => 
            i === factorIndex ? { ...f, items: [...f.items, item] } : f
        ));
    };

    const removeItemFromFactor = (factorIndex: number, item: string) => {
        setFactors(prev => prev.map((f, i) => 
            i === factorIndex ? { ...f, items: f.items.filter(it => it !== item) } : f
        ));
    };

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true);
        toast({ title: "Generating image..." });
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `Reliability_Validity_${new Date().toISOString().split('T')[0]}.png`;
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
        if (!analysisResult) return;
        
        let csvContent = "=== RELIABILITY & VALIDITY ANALYSIS ===\n";
        csvContent += `Observations,${analysisResult.n_observations}\n`;
        csvContent += `Factors,${analysisResult.n_factors}\n`;
        csvContent += `KMO,${analysisResult.kmo.toFixed(3)}\n\n`;
        
        csvContent += "=== RELIABILITY METRICS ===\n";
        csvContent += Papa.unparse(analysisResult.factor_results.map(f => ({
            Factor: f.name,
            Items: f.n_items,
            'Cronbach α': f.cronbach_alpha?.toFixed(3),
            'CR': f.composite_reliability?.toFixed(3),
            'AVE': f.ave?.toFixed(3),
            '√AVE': f.sqrt_ave?.toFixed(3),
            'Valid α': f.valid_alpha ? 'Yes' : 'No',
            'Valid CR': f.valid_cr ? 'Yes' : 'No',
            'Valid AVE': f.valid_ave ? 'Yes' : 'No'
        }))) + "\n\n";
        
        if (analysisResult.fornell_larcker.length > 0) {
            csvContent += "=== FORNELL-LARCKER ===\n";
            csvContent += Papa.unparse(analysisResult.fornell_larcker.map(fl => ({
                'Factor 1': fl.factor_1,
                'Factor 2': fl.factor_2,
                'Correlation': fl.correlation.toFixed(3),
                '√AVE 1': fl.sqrt_ave_1.toFixed(3),
                '√AVE 2': fl.sqrt_ave_2.toFixed(3),
                'Valid': fl.valid ? 'Yes' : 'No'
            }))) + "\n\n";
        }
        
        if (analysisResult.htmt.length > 0) {
            csvContent += "=== HTMT ===\n";
            csvContent += Papa.unparse(analysisResult.htmt.map(h => ({
                'Factor 1': h.factor_1,
                'Factor 2': h.factor_2,
                'HTMT': h.htmt.toFixed(3),
                'Valid (<0.85)': h.valid_085 ? 'Yes' : 'No'
            })));
        }
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Reliability_Validity_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: "CSV Downloaded" });
    }, [analysisResult, toast]);

    const runAnalysis = useCallback(async () => {
        // Validate
        const validFactors = factors.filter(f => f.items.length >= 2);
        if (validFactors.length < 1) {
            toast({ variant: 'destructive', title: 'Please assign at least 2 items to each factor' });
            return;
        }
        
        setIsLoading(true);
        setAnalysisResult(null);
    
        try {
            // Create factor definitions
            const factorDefinitions: { [key: string]: string[] } = {};
            validFactors.forEach(f => {
                factorDefinitions[f.name] = f.items;
            });
            
            const response = await fetch(`${FASTAPI_URL}/api/analysis/construct-validity`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data,
                    factor_definitions: factorDefinitions,
                    rotation: rotation
                })
            });
            
            if (!response.ok) {
                const errorResult = await response.json().catch(() => ({}));
                let errorMsg = `HTTP error! status: ${response.status}`;
                if (typeof errorResult.detail === 'string') {
                    errorMsg = errorResult.detail;
                } else if (Array.isArray(errorResult.detail)) {
                    errorMsg = errorResult.detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
                } else if (errorResult.error) {
                    errorMsg = typeof errorResult.error === 'string' ? errorResult.error : JSON.stringify(errorResult.error);
                }
                throw new Error(errorMsg);
            }

            const result: AnalysisResult = await response.json();
            if ((result as any).error) {
                const errMsg = typeof (result as any).error === 'string' ? (result as any).error : JSON.stringify((result as any).error);
                throw new Error(errMsg);
            }
            
            setAnalysisResult(result);
            toast({ title: 'Analysis Complete', description: 'Reliability and validity metrics calculated.' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally { 
            setIsLoading(false); 
        }
    }, [data, factors, rotation, toast]);

 
// handleDownloadDOCX 함수 추가
const handleDownloadDOCX = useCallback(async () => {
    if (!analysisResult) return;
    toast({ title: "Generating Word..." });
    try {
        const response = await fetch('/api/export/construct-validity-docx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                results: analysisResult,
                factors,
                sampleSize: data.length
            })
        });
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Reliability_Validity_${new Date().toISOString().split('T')[0]}.docx`;
        link.click();
        toast({ title: "Download Complete" });
    } catch (e) {
        toast({ variant: 'destructive', title: "Failed" });
    }
}, [analysisResult, factors, data.length, toast]);

    
    
    if (view === 'intro' || (!canRun && view === 'main')) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    const ValidityBadge = ({ valid, label }: { valid: boolean | null, label: string }) => (
        <Badge variant={valid ? 'default' : 'destructive'} className={valid ? 'bg-green-600' : ''}>
            {valid ? <Check className="w-3 h-3 mr-1"/> : <XCircle className="w-3 h-3 mr-1"/>}
            {label}
        </Badge>
    );

    const renderResults = () => {
        if (!analysisResult) return null;
        
        const ov = analysisResult.overall_validity;
        
        return (
            <div className="space-y-6">
                {/* Overall Validity Summary */}
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
                    <CardHeader>
                        <CardTitle>Overall Validity Assessment</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-3">
                            <ValidityBadge valid={ov.internal_consistency} label="Internal Consistency (α)" />
                            <ValidityBadge valid={ov.composite_reliability} label="Composite Reliability" />
                            <ValidityBadge valid={ov.convergent_validity} label="Convergent Validity (AVE)" />
                            <ValidityBadge valid={ov.discriminant_validity_fl} label="Discriminant (Fornell-Larcker)" />
                            {ov.discriminant_validity_htmt !== null && (
                                <ValidityBadge valid={ov.discriminant_validity_htmt} label="Discriminant (HTMT)" />
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Summary Cards */}
                <div className="grid md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-muted-foreground">KMO</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <span className={`text-3xl font-bold ${analysisResult.kmo >= 0.7 ? 'text-green-600' : analysisResult.kmo >= 0.6 ? 'text-amber-600' : 'text-rose-600'}`}>
                                {analysisResult.kmo.toFixed(3)}
                            </span>
                            <p className="text-xs text-muted-foreground mt-1">
                                {analysisResult.kmo >= 0.8 ? 'Meritorious' : analysisResult.kmo >= 0.7 ? 'Middling' : analysisResult.kmo >= 0.6 ? 'Mediocre' : 'Poor'}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-muted-foreground">Bartlett's Test</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <span className={`text-xl font-bold ${analysisResult.bartlett_p_value < 0.05 ? 'text-green-600' : 'text-rose-600'}`}>
                                p {analysisResult.bartlett_p_value < 0.001 ? '< 0.001' : `= ${analysisResult.bartlett_p_value.toFixed(3)}`}
                            </span>
                            <p className="text-xs text-muted-foreground mt-1">χ² = {analysisResult.bartlett_chi_square.toFixed(2)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-muted-foreground">Factors</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <span className="text-3xl font-bold text-blue-600">{analysisResult.n_factors}</span>
                            <p className="text-xs text-muted-foreground mt-1">{analysisResult.n_items} items total</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-muted-foreground">Variance Explained</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <span className="text-3xl font-bold text-purple-600">
                                {(analysisResult.cumulative_variance[analysisResult.cumulative_variance.length - 1] * 100).toFixed(1)}%
                            </span>
                        </CardContent>
                    </Card>
                </div>

                {/* Key Insights */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lightbulb className="h-5 w-5 text-blue-500"/>
                            Key Insights
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-2 gap-4">
                            {analysisResult.insights.map((insight, i) => (
                                <div key={i} className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-4 border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-start gap-2">
                                        {insight.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5"/> : <CheckCircle className="w-4 h-4 text-green-500 mt-0.5"/>}
                                        <div>
                                            <strong>{insight.title}</strong>
                                            <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Visualizations */}
                <Tabs defaultValue="reliability">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="reliability">Reliability Summary</TabsTrigger>
                        <TabsTrigger value="loadings">Factor Loadings</TabsTrigger>
                        {analysisResult.plots.fornell_larcker && <TabsTrigger value="fornell">Fornell-Larcker</TabsTrigger>}
                        {analysisResult.plots.htmt && <TabsTrigger value="htmt">HTMT</TabsTrigger>}
                    </TabsList>
                    <TabsContent value="reliability">
                        <Card>
                            <CardContent className="pt-4">
                                <img src={`data:image/png;base64,${analysisResult.plots.reliability_summary}`} alt="Reliability" className="w-full rounded border"/>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="loadings">
                        <Card>
                            <CardContent className="pt-4">
                                <img src={`data:image/png;base64,${analysisResult.plots.loadings_heatmap}`} alt="Loadings" className="w-full rounded border"/>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    {analysisResult.plots.fornell_larcker && (
                        <TabsContent value="fornell">
                            <Card>
                                <CardContent className="pt-4">
                                    <img src={`data:image/png;base64,${analysisResult.plots.fornell_larcker}`} alt="Fornell-Larcker" className="w-full rounded border"/>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    )}
                    {analysisResult.plots.htmt && (
                        <TabsContent value="htmt">
                            <Card>
                                <CardContent className="pt-4">
                                    <img src={`data:image/png;base64,${analysisResult.plots.htmt}`} alt="HTMT" className="w-full rounded border"/>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    )}
                </Tabs>

                {/* Factor Details */}
                <Card>
                    <CardHeader>
                        <CardTitle>Factor Reliability Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Factor</TableHead>
                                    <TableHead className="text-center">Items</TableHead>
                                    <TableHead className="text-center">Cronbach's α</TableHead>
                                    <TableHead className="text-center">CR</TableHead>
                                    <TableHead className="text-center">AVE</TableHead>
                                    <TableHead className="text-center">√AVE</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {analysisResult.factor_results.map((f, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium">{f.name}</TableCell>
                                        <TableCell className="text-center">{f.n_items}</TableCell>
                                        <TableCell className="text-center">
                                            <span className={`font-mono ${f.valid_alpha ? 'text-green-600' : 'text-rose-600'}`}>
                                                {f.cronbach_alpha?.toFixed(3) ?? '-'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className={`font-mono ${f.valid_cr ? 'text-green-600' : 'text-rose-600'}`}>
                                                {f.composite_reliability?.toFixed(3) ?? '-'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className={`font-mono ${f.valid_ave ? 'text-green-600' : 'text-rose-600'}`}>
                                                {f.ave?.toFixed(3) ?? '-'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center font-mono">
                                            {f.sqrt_ave?.toFixed(3) ?? '-'}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {f.valid_alpha && f.valid_cr && f.valid_ave ? (
                                                <Badge className="bg-green-600"><Check className="w-3 h-3 mr-1"/>Valid</Badge>
                                            ) : (
                                                <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1"/>Issues</Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Item Analysis */}
                {analysisResult.factor_results.map((factor, fi) => (
                    <Card key={fi}>
                        <CardHeader>
                            <CardTitle className="text-lg">{factor.name} - Item Analysis</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead className="text-right">Loading</TableHead>
                                        <TableHead className="text-right">Item-Total r</TableHead>
                                        <TableHead className="text-right">α if Deleted</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {factor.items.map((item, ii) => {
                                        const loading = factor.factor_loadings[item];
                                        const itemTotal = factor.item_total_correlations[item];
                                        const alphaIfDel = factor.alpha_if_deleted[item];
                                        const loadingOk = Math.abs(loading) >= 0.5;
                                        const itemTotalOk = itemTotal >= 0.3;
                                        
                                        return (
                                            <TableRow key={ii}>
                                                <TableCell className="font-medium">{item}</TableCell>
                                                <TableCell className="text-right">
                                                    <span className={`font-mono ${loadingOk ? 'text-green-600' : 'text-amber-600'}`}>
                                                        {loading?.toFixed(3)}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span className={`font-mono ${itemTotalOk ? 'text-green-600' : 'text-amber-600'}`}>
                                                        {itemTotal?.toFixed(3)}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {alphaIfDel?.toFixed(3) ?? '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {loadingOk && itemTotalOk ? (
                                                        <Badge variant="outline" className="text-green-600 border-green-600">Good</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-amber-600 border-amber-600">Review</Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                ))}

                {/* Discriminant Validity Tables */}
                {analysisResult.fornell_larcker.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Fornell-Larcker Criterion</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Factor Pair</TableHead>
                                        <TableHead className="text-right">Correlation</TableHead>
                                        <TableHead className="text-right">√AVE (Factor 1)</TableHead>
                                        <TableHead className="text-right">√AVE (Factor 2)</TableHead>
                                        <TableHead className="text-center">Valid</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {analysisResult.fornell_larcker.map((fl, i) => (
                                        <TableRow key={i} className={fl.valid ? '' : 'bg-rose-50 dark:bg-rose-950/20'}>
                                            <TableCell className="font-medium">{fl.factor_1} ↔ {fl.factor_2}</TableCell>
                                            <TableCell className="text-right font-mono">{fl.correlation.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">{fl.sqrt_ave_1.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">{fl.sqrt_ave_2.toFixed(3)}</TableCell>
                                            <TableCell className="text-center">
                                                {fl.valid ? <Check className="w-5 h-5 text-green-600 mx-auto"/> : <XCircle className="w-5 h-5 text-rose-600 mx-auto"/>}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {analysisResult.htmt.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>HTMT (Heterotrait-Monotrait Ratio)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Factor Pair</TableHead>
                                        <TableHead className="text-right">HTMT</TableHead>
                                        <TableHead className="text-center">&lt; 0.85</TableHead>
                                        <TableHead className="text-center">&lt; 0.90</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {analysisResult.htmt.map((h, i) => (
                                        <TableRow key={i} className={h.valid_085 ? '' : 'bg-rose-50 dark:bg-rose-950/20'}>
                                            <TableCell className="font-medium">{h.factor_1} ↔ {h.factor_2}</TableCell>
                                            <TableCell className="text-right font-mono">{h.htmt.toFixed(3)}</TableCell>
                                            <TableCell className="text-center">
                                                {h.valid_085 ? <Check className="w-5 h-5 text-green-600 mx-auto"/> : <XCircle className="w-5 h-5 text-rose-600 mx-auto"/>}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {h.valid_090 ? <Check className="w-5 h-5 text-green-600 mx-auto"/> : <XCircle className="w-5 h-5 text-rose-600 mx-auto"/>}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {/* Recommendations */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary"/>
                            Recommendations
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {analysisResult.recommendations.map((rec, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                    <span className="text-primary">•</span>{rec}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Reliability & Validity Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}>
                            <HelpCircle className="w-5 h-5"/>
                        </Button>
                    </div>
                    <CardDescription>Define factors and assign items to analyze construct reliability and validity.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Factor Definitions */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">Factor Definitions</Label>
                            <Button variant="outline" size="sm" onClick={addFactor}>
                                <Plus className="w-4 h-4 mr-1"/>Add Factor
                            </Button>
                        </div>
                        
                        <div className="space-y-4">
                            {factors.map((factor, fi) => (
                                <Card key={fi} className="border-2">
                                    <CardHeader className="py-3">
                                        <div className="flex items-center gap-3">
                                            <Input 
                                                value={factor.name} 
                                                onChange={(e) => updateFactorName(fi, e.target.value)}
                                                className="max-w-48 font-semibold"
                                            />
                                            <Badge variant="outline">{factor.items.length} items</Badge>
                                            {factors.length > 1 && (
                                                <Button variant="ghost" size="sm" onClick={() => removeFactor(fi)}>
                                                    <X className="w-4 h-4 text-destructive"/>
                                                </Button>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="py-2">
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {factor.items.map((item, ii) => (
                                                <Badge key={ii} variant="secondary" className="pl-2 pr-1 py-1">
                                                    {item}
                                                    <Button variant="ghost" size="sm" className="h-4 w-4 p-0 ml-1" onClick={() => removeItemFromFactor(fi, item)}>
                                                        <X className="w-3 h-3"/>
                                                    </Button>
                                                </Badge>
                                            ))}
                                        </div>
                                        <Select onValueChange={(v) => addItemToFactor(fi, v)}>
                                            <SelectTrigger className="w-full max-w-xs">
                                                <SelectValue placeholder="Add item..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableItems.map(item => (
                                                    <SelectItem key={item} value={item}>{item}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Options */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Rotation</Label>
                            <Select value={rotation} onValueChange={setRotation}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="promax">Promax (Oblique)</SelectItem>
                                    <SelectItem value="varimax">Varimax (Orthogonal)</SelectItem>
                                    <SelectItem value="oblimin">Oblimin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Available Items</Label>
                            <p className="text-sm text-muted-foreground">{availableItems.length} unassigned / {numericHeaders.length} total</p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={runAnalysis} disabled={isLoading || factors.every(f => f.items.length < 2)}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Analyzing...</> : <><Zap className="mr-2 h-4 w-4"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && (
                <Card>
                    <CardContent className="p-6 text-center">
                        <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto" />
                        <p className="text-muted-foreground mt-2">Calculating reliability and validity metrics...</p>
                    </CardContent>
                </Card>
            )}

            {analysisResult && (
                <>
                    <Card className="border-primary/50 bg-primary/5">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Download className="h-5 w-5 text-primary" />
                                <div><p className="font-medium">Export Report</p></div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={handleDownloadCSV}>
                                    <FileSpreadsheet className="mr-2 h-4 w-4"/>CSV Spreadsheet
                                </Button>
                                <Button onClick={handleDownloadPNG} disabled={isDownloading}>
                                    {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ImageIcon className="mr-2 h-4 w-4"/>}PNG Image
                                </Button>
                                <Button variant="outline" onClick={handleDownloadDOCX}>
                                    <FileType className="mr-2 h-4 w-4"/>Word Document
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <div ref={resultsRef} className="space-y-6 bg-background">
                        <div className="text-center py-4 border-b">
                            <h2 className="text-2xl font-bold">Reliability & Validity Report</h2>
                            <p className="text-sm text-muted-foreground">{analysisResult.n_factors} factors, {analysisResult.n_items} items, n = {analysisResult.n_observations}</p>
                        </div>
                        {renderResults()}
                    </div>
                </>
            )}

            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <Shield className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Define factors and assign items to begin analysis</p>
                </div>
            )}
        </div>
    );
}

