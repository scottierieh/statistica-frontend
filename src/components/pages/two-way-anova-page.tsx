
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
import jsPDF from 'jspdf';


// Import export pages
import TwoWayAnovaPPTXExportPage from './TwoWayAnovaPPTXExportPage';

interface AnovaRow {
    Source: string;
    sum_sq: number;
    df: number;
    MS: number;
    F: number;
    'p-value': number;
    'η²p': number;
}

interface MarginalMeansRow {
    [key: string]: string | number;
    mean: number;
    std: number;
    sem: number;
    count: number;
}

interface NormalityResult {
    statistic: number | null;
    p_value: number | null;
    normal: boolean | null;
}

interface AssumptionResult {
    test: string;
    statistic: number;
    p_value: number;
    assumption_met: boolean;
    f_statistic?: number;
    df1?: number;
    df2?: number;
}

interface PostHocResult {
    group1: string;
    group2: string;
    meandiff: number;
    p_adj: number;
    lower: number;
    upper: number;
    reject: boolean;
}

interface SimpleMainEffect {
    effect: string;
    factor_varied: string;
    factor_fixed: string;
    fixed_level: string;
    f_statistic: number;
    p_value: number;
    eta_squared: number;
    significant: boolean;
}

interface TwoWayAnovaResults {
    anova_table: AnovaRow[];
    descriptive_stats_table: { [key: string]: { [key: string]: number } };
    marginal_means: {
        factor_a: MarginalMeansRow[];
        factor_b: MarginalMeansRow[];
    };
    assumptions: {
        normality: { [key: string]: NormalityResult };
        homogeneity: AssumptionResult;
    };
    posthoc_results?: PostHocResult[];
    simple_main_effects?: SimpleMainEffect[];
    interpretation: string;
    dropped_rows?: number[];
    n_dropped?: number;
    n_used?: number;
    n_original?: number;
}

interface FullAnalysisResponse {
    results: TwoWayAnovaResults;
    plot: string; // base64 image string
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

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void; onLoadExample: (e: any) => void }) => {
    const anovaExample = exampleDatasets.find(d => d.id === 'two-way-anova');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Users className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Two-Way ANOVA</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Examine effects of two factors and their interaction on a continuous outcome
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Layers className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Two Factors</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Analyze effects of two independent categorical variables simultaneously
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Interaction Effects</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Discover if the effect of one factor depends on the other
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <BarChartIcon className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Main Effects</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Test overall effect of each factor across all levels
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Use Two-Way ANOVA to test effects of two categorical factors on a continuous outcome.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-primary" />
                                    Requirements
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Dependent variable:</strong> Continuous numeric</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Two factors:</strong> Different categorical variables</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Cell size:</strong> At least 3 per combination</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <FileSearch className="w-4 h-4 text-primary" />
                                    Understanding Results
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Main effects:</strong> Overall factor impact</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Interaction:</strong> Non-parallel line patterns</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>η²p:</strong> Proportion of variance explained</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {anovaExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(anovaExample)} size="lg">
                                {anovaExample.icon && <anovaExample.icon className="mr-2 h-5 w-5" />}
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface TwoWayAnovaPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function TwoWayAnovaPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: TwoWayAnovaPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    // View states: 'intro' | 'main' | 'pptx-export' | 'docx-export'
    const [view, setView] = useState<'intro' | 'main' | 'pptx-export' | 'docx-export'>('intro');
    const [dependentVar, setDependentVar] = useState(numericHeaders[0]);
    const [factorA, setFactorA] = useState(categoricalHeaders[0]);
    const [factorB, setFactorB] = useState(categoricalHeaders.length > 1 ? categoricalHeaders[1] : undefined);

    const [analysisResponse, setAnalysisResponse] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const canRun = useMemo(() => {
      return data.length > 0 && numericHeaders.length > 0 && categoricalHeaders.length >= 2;
    }, [data, numericHeaders, categoricalHeaders]);
    
    useEffect(() => {
        setDependentVar(numericHeaders[0] || '');
        setFactorA(categoricalHeaders[0] || '');
        setFactorB(categoricalHeaders[1] || '');
        setAnalysisResponse(null);
        setView(canRun ? 'main' : 'intro');
    }, [categoricalHeaders, numericHeaders, data, canRun]);

    // PDF Download handler
    const handleDownloadPDF = useCallback(async () => {
        if (!resultsRef.current) {
            toast({ variant: 'destructive', title: 'No results to download' });
            return;
        }
    
        setIsDownloading(true);
        toast({ title: "Generating PDF..." });
    
        try {
            const canvas = await html2canvas(resultsRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
            });
            
            const imgData = canvas.toDataURL('image/png');
            const { default: jsPDF } = await import('jspdf');
            
            // 캔버스 크기에 맞춰 PDF 크기 설정 (px to mm 변환)
            const pdfWidth = canvas.width * 0.264583;  // px to mm
            const pdfHeight = canvas.height * 0.264583;
            
            const pdf = new jsPDF({
                orientation: pdfWidth > pdfHeight ? 'l' : 'p',
                unit: 'mm',
                format: [pdfWidth, pdfHeight]  // 커스텀 사이즈
            });
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Two_Way_ANOVA_Report_${new Date().toISOString().split('T')[0]}.pdf`);
            
            toast({ title: "Download complete" });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "Download failed" });
        } finally {
            setIsDownloading(false);
        }
    }, [toast]);

    //python Download handler
    const handleDownloadPython = useCallback(() => {
        if (!analysisResponse) return;
        
        const pythonCode = `# Two-Way ANOVA Analysis
    # Generated: ${new Date().toLocaleDateString()}

import pandas as pd
import numpy as np
from scipy import stats
import statsmodels.api as sm
from statsmodels.formula.api import ols
from statsmodels.stats.multicomp import pairwise_tukeyhsd
from statsmodels.stats.anova import anova_lm
import matplotlib.pyplot as plt
import seaborn as sns

# Load your data
# df = pd.read_csv('your_data.csv')

# Variables
dependent_var = '${dependentVar}'
factor_a = '${factorA}'
factor_b = '${factorB}'

# Two-Way ANOVA
formula = f'{dependent_var} ~ C({factor_a}) + C({factor_b}) + C({factor_a}):C({factor_b})'
model = ols(formula, data=df).fit()
anova_table = anova_lm(model, typ=2)

# Calculate partial eta squared
anova_table['eta_sq_partial'] = anova_table['sum_sq'] / (anova_table['sum_sq'] + anova_table.loc['Residual', 'sum_sq'])

print("=== Two-Way ANOVA Results ===")
print(anova_table)

# Marginal Means
print(f"\\n=== Marginal Means: {factor_a} ===")
print(df.groupby(factor_a)[dependent_var].agg(['mean', 'std', 'sem', 'count']))

print(f"\\n=== Marginal Means: {factor_b} ===")
print(df.groupby(factor_b)[dependent_var].agg(['mean', 'std', 'sem', 'count']))

# Assumptions
# 1. Normality (Shapiro-Wilk)
print("\\n=== Normality Test (Shapiro-Wilk) ===")
for name, group in df.groupby([factor_a, factor_b]):
    if len(group) >= 3:
        stat, p = stats.shapiro(group[dependent_var])
        print(f"{name}: W={stat:.4f}, p={p:.4f}")

# 2. Homogeneity of Variance (Levene's Test)
groups = [group[dependent_var].values for name, group in df.groupby([factor_a, factor_b])]
levene_stat, levene_p = stats.levene(*groups)
print(f"\\n=== Levene's Test ===")
print(f"F={levene_stat:.4f}, p={levene_p:.4f}")

# Interaction Plot
fig, ax = plt.subplots(figsize=(10, 6))
sns.pointplot(data=df, x=factor_a, y=dependent_var, hue=factor_b, ax=ax, errorbar='se')
ax.set_title(f'Interaction Plot: {dependent_var} by {factor_a} and {factor_b}')
plt.legend(title=factor_b)
plt.tight_layout()
plt.savefig('interaction_plot.png', dpi=150)
plt.show()
`;

    const blob = new Blob([pythonCode], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Two_Way_ANOVA_${new Date().toISOString().split('T')[0]}.py`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({ title: 'Python Code Downloaded' });
}, [analysisResponse, dependentVar, factorA, factorB, toast]);



    // CSV Download handler
    const handleDownloadCSV = useCallback(() => {
        if (!analysisResponse?.results) {
            toast({ title: "No Data to Download" });
            return;
        }
        
        const results = analysisResponse.results;
        let csvContent = "TWO-WAY ANOVA RESULTS\n";
        csvContent += `Dependent Variable: ${dependentVar}\n`;
        csvContent += `Factor A: ${factorA}\n`;
        csvContent += `Factor B: ${factorB}\n\n`;
        
        csvContent += "ANOVA TABLE\n";
        const anovaData = results.anova_table.map(row => ({
            Source: row.Source,
            Sum_of_Squares: row.sum_sq,
            df: row.df,
            Mean_Square: row.MS,
            F: row.F,
            p_value: row['p-value'],
            eta_squared_partial: row['η²p']
        }));
        csvContent += Papa.unparse(anovaData) + "\n\n";
        
        if (results.marginal_means?.factor_a) {
            csvContent += `MARGINAL MEANS - ${factorA}\n`;
            csvContent += Papa.unparse(results.marginal_means.factor_a) + "\n\n";
        }
        
        if (results.marginal_means?.factor_b) {
            csvContent += `MARGINAL MEANS - ${factorB}\n`;
            csvContent += Papa.unparse(results.marginal_means.factor_b) + "\n\n";
        }
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const date = new Date().toISOString().split('T')[0];
        link.href = url;
        link.download = `Two_Way_ANOVA_Results_${date}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        
        toast({ title: 'Download Started' });
    }, [analysisResponse, dependentVar, factorA, factorB, toast]);

    const handleAnalysis = useCallback(async () => {
        if (!dependentVar || !factorA || !factorB) {
            toast({variant: 'destructive', title: 'Variable Selection Error'});
            return;
        };
        if (factorA === factorB) {
            toast({variant: 'destructive', title: 'Factor A and Factor B must be different'});
            return;
        }

        setIsLoading(true);
        setAnalysisResponse(null);
        
        try {
            const response = await fetch(`/api/analysis/two-way-anova`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, dependentVar, factorA, factorB })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }
            
            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            setAnalysisResponse(result);

        } catch(e: any) {
            toast({variant: 'destructive', title: 'ANOVA Analysis Error', description: e.message})
            setAnalysisResponse(null);
        } finally {
            setIsLoading(false);
        }
    }, [data, dependentVar, factorA, factorB, toast]);

    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResponse) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/two-way-anova-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    results: analysisResponse.results,
                    dependentVar,
                    factorA,
                    factorB,
                    plot: analysisResponse.plot
                })
            });
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Two_Way_ANOVA_Report_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed" });
        } 
        
    }, [analysisResponse, dependentVar, factorA, factorB, toast]);


    const availableFactorB = useMemo(() => categoricalHeaders.filter(h => h !== factorA), [categoricalHeaders, factorA]);
    
    const results = analysisResponse?.results;
    const interactionRow = results?.anova_table.find(row => row.Source.includes('*'));
    const factorARow = results?.anova_table.find(row => !row.Source.includes('*') && !row.Source.includes('Residuals'));
    const factorBRow = results?.anova_table.find(row => !row.Source.includes('*') && !row.Source.includes('Residuals') && row !== factorARow);
    const isInteractionSignificant = interactionRow && interactionRow['p-value'] <= 0.05;

    const descriptiveTable = useMemo(() => {
        if (!results?.descriptive_stats_table) return null;
        const data = results.descriptive_stats_table;
        const rowLabels = Object.keys(data.mean);
        const colLabels = Object.keys(data.mean[rowLabels[0]]);
        return { rowLabels, colLabels, data };
    }, [results]);

    // Render export pages
    if (view === 'pptx-export' && analysisResponse?.results) {
        return (
            <TwoWayAnovaPPTXExportPage
                results={analysisResponse.results}
                dependentVar={dependentVar}
                factorA={factorA}
                factorB={factorB || ''}
                plotBase64={analysisResponse.plot}
                onBack={() => setView('main')}
            />
        );
    }

   

    if (!canRun && view === 'main') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Two-Way ANOVA Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>
                        Select a dependent variable (numeric) and two factor variables (categorical), then click 'Run Analysis'.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Dependent Variable</label>
                            <Select value={dependentVar} onValueChange={setDependentVar}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                         <div>
                            <label className="text-sm font-medium mb-1 block">Factor A</label>
                            <Select value={factorA} onValueChange={setFactorA}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Factor B</label>
                            <Select value={factorB} onValueChange={setFactorB} disabled={availableFactorB.length === 0}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{availableFactorB.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                    </div>
                    
                    <TwoWayAnovaOverview 
                        dependentVar={dependentVar}
                        factorA={factorA}
                        factorB={factorB}
                        data={data}
                        results={results}
                    />
                </CardContent>
                 <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={!dependentVar || !factorA || !factorB || isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin" /> Running...</> : <><Sigma className="mr-2"/> Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && (
                <Card>
                    <CardContent className="p-6">
                        <Skeleton className="h-96 w-full" />
                    </CardContent>
                </Card>
            )}

            {analysisResponse && results ? (
                <div className="space-y-4">
                    {/* Export Buttons Card - Updated with PPTX and DOCX */}
                    <Card className="border-primary/50 bg-primary/5">
                        <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <Download className="h-5 w-5 text-primary" />
                                    <div>
                                        <p className="font-medium">Export Report</p>
                                        <p className="text-sm text-muted-foreground">Download analysis results in various formats</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button variant="outline" onClick={handleDownloadCSV}>
                                        <FileSpreadsheet className="mr-2 h-4 w-4"/>CSV
                                    </Button>
                                    <Button variant="outline" onClick={handleDownloadPython}>
                                    <Code className="mr-2 h-4 w-4"/>Python
                                </Button>
                                <Button variant="outline" onClick={handleDownloadPDF} disabled={isDownloading}>
                                    {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                                    PDF
                                </Button>
                                    <Button variant="outline" onClick={() => setView('pptx-export')}>
                                        <Presentation className="mr-2 h-4 w-4"/>PowerPoint
                                    </Button>
                                    <Button onClick={handleDownloadDOCX} disabled={isDownloading}>
                                        <FileText className="mr-2 h-4 w-4"/>Word
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                        {/* Report Header */}
                        <div className="text-center py-4 border-b">
                            <h2 className="text-2xl font-bold">Two-Way ANOVA Report</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                DV: {dependentVar} | Factor A: {factorA} | Factor B: {factorB} | Generated: {new Date().toLocaleDateString()}
                            </p>
                        </div>

                        <StatisticalSummaryCards results={results} />

                        {/* Detailed Analysis */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline flex items-center gap-2">
                                    <Sigma className="h-5 w-5 text-primary" />
                                    Detailed Analysis
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/40">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-primary/10 rounded-md">
                                            <BookOpen className="h-4 w-4 text-primary" />
                                        </div>
                                        <h3 className="font-semibold text-base">Overall Analysis</h3>
                                    </div>
                                    <div 
                                        className="text-sm text-foreground/80 leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: results.interpretation.replace(/\*\*/g, '<strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>') }}
                                    />
                                </div>

                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-blue-500/10 rounded-md">
                                            <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <h3 className="font-semibold text-base">Key Insights</h3>
                                    </div>
                                    <ul className="space-y-3">
                                        {interactionRow && (
                                            <li className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                                <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                                                <div>
                                                    <strong>Interaction Effect:</strong> F = {interactionRow.F.toFixed(2)}, p = {interactionRow['p-value'] < 0.001 ? '<0.001' : interactionRow['p-value'].toFixed(4)}, η²p = {typeof interactionRow['η²p'] === 'number' ? interactionRow['η²p'].toFixed(3) : 'N/A'}. {isInteractionSignificant ? 'Significant interaction detected.' : 'No significant interaction.'}
                                                </div>
                                            </li>
                                        )}
                                        {factorARow && (
                                            <li className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                                <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                                                <div>
                                                    <strong>Main Effect of {factorA}:</strong> F = {factorARow.F.toFixed(2)}, p = {factorARow['p-value'] < 0.001 ? '<0.001' : factorARow['p-value'].toFixed(4)}. {factorARow['p-value'] <= 0.05 ? 'Significant.' : 'Not significant.'}
                                                </div>
                                            </li>
                                        )}
                                        {factorBRow && (
                                            <li className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                                <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                                                <div>
                                                    <strong>Main Effect of {factorB}:</strong> F = {factorBRow.F.toFixed(2)}, p = {factorBRow['p-value'] < 0.001 ? '<0.001' : factorBRow['p-value'].toFixed(4)}. {factorBRow['p-value'] <= 0.05 ? 'Significant.' : 'Not significant.'}
                                                </div>
                                            </li>
                                        )}
                                    </ul>
                                </div>

                                <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 rounded-lg p-6 border border-amber-300 dark:border-amber-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-amber-500/10 rounded-md">
                                            <Target className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <h3 className="font-semibold text-base">Recommendations</h3>
                                    </div>
                                    <ul className="space-y-3">
                                        {isInteractionSignificant ? (
                                            <>
                                                <li className="flex items-start gap-3 text-sm text-foreground/80">
                                                    <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                                                    <div>Focus on interpreting the interaction effect</div>
                                                </li>
                                                <li className="flex items-start gap-3 text-sm text-foreground/80">
                                                    <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                                                    <div>Examine simple main effects for specific comparisons</div>
                                                </li>
                                            </>
                                        ) : (
                                            <>
                                                <li className="flex items-start gap-3 text-sm text-foreground/80">
                                                    <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                                                    <div>Interpret main effects independently</div>
                                                </li>
                                                <li className="flex items-start gap-3 text-sm text-foreground/80">
                                                    <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                                                    <div>Examine marginal means for overall factor effects</div>
                                                </li>
                                            </>
                                        )}
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Visualization */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Visualization</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Image 
                                    src={analysisResponse.plot} 
                                    alt="Two-Way ANOVA Plots" 
                                    width={1500} 
                                    height={1200} 
                                    className="w-3/4 mx-auto rounded-md border"
                                />
                            </CardContent>
                        </Card>

                        {/* ANOVA Table */}
                        <Card>
                            <CardHeader>
                                <CardTitle>ANOVA Table</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Source</TableHead>
                                            <TableHead className="text-right">SS</TableHead>
                                            <TableHead className="text-right">df</TableHead>
                                            <TableHead className="text-right">MS</TableHead>
                                            <TableHead className="text-right">F</TableHead>
                                            <TableHead className="text-right">p-value</TableHead>
                                            <TableHead className="text-right">η²p</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.anova_table.map((row, index) => (
                                            <TableRow key={index} className={row.Source.includes('Residuals') ? 'bg-muted/30' : ''}>
                                                <TableCell className="font-medium">{row.Source}</TableCell>
                                                <TableCell className="text-right font-mono">{typeof row.sum_sq === 'number' ? row.sum_sq.toFixed(3) : 'N/A'}</TableCell>
                                                <TableCell className="text-right font-mono">{row.df}</TableCell>
                                                <TableCell className="text-right font-mono">{typeof row.MS === 'number' ? row.MS.toFixed(3) : 'N/A'}</TableCell>
                                                <TableCell className="text-right font-mono">{typeof row.F === 'number' ? row.F.toFixed(3) : ''}</TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {row['p-value'] !== null && row['p-value'] !== undefined ? (
                                                        <>{row['p-value'] < 0.001 ? '<.001' : row['p-value'].toFixed(4)}{getSignificanceStars(row['p-value'])}</>
                                                    ) : ''}
                                                </TableCell>
                                                <TableCell className="text-right font-mono">{typeof row['η²p'] === 'number' ? row['η²p'].toFixed(3) : ''}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                            <CardFooter>
                                <p className='text-sm text-muted-foreground'>*** p &lt; 0.001, ** p &lt; 0.01, * p &lt; 0.05</p>
                            </CardFooter>
                        </Card>

                        {/* Marginal Means */}
                        {results.marginal_means && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Marginal Means</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div>
                                        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4 text-primary" />
                                            {factorA}
                                        </h4>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Level</TableHead>
                                                    <TableHead className="text-right">Mean</TableHead>
                                                    <TableHead className="text-right">Lower CI</TableHead>
                                                    <TableHead className="text-right">Upper CI</TableHead>
                                                    <TableHead className="text-right">SE</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {results.marginal_means.factor_a.map((row, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell className="font-medium">{row.group}</TableCell>
                                                        <TableCell className="text-right font-mono">{typeof row.mean === 'number' ? row.mean.toFixed(3) : 'N/A'}</TableCell>
                                                        <TableCell className="text-right font-mono">{typeof row.lower === 'number' ? row.lower.toFixed(3) : 'N/A'}</TableCell>
                                                        <TableCell className="text-right font-mono">{typeof row.upper === 'number' ? row.upper.toFixed(3) : 'N/A'}</TableCell>
                                                        <TableCell className="text-right font-mono">{typeof row.sem === 'number' ? row.sem.toFixed(3) : 'N/A'}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4 text-primary" />
                                            {factorB}
                                        </h4>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Level</TableHead>
                                                    <TableHead className="text-right">Mean</TableHead>
                                                    <TableHead className="text-right">Lower CI</TableHead>
                                                    <TableHead className="text-right">Upper CI</TableHead>
                                                    <TableHead className="text-right">SE</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {results.marginal_means.factor_b.map((row, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell className="font-medium">{row.group}</TableCell>
                                                        <TableCell className="text-right font-mono">{typeof row.mean === 'number' ? row.mean.toFixed(3) : 'N/A'}</TableCell>
                                                        <TableCell className="text-right font-mono">{typeof row.lower === 'number' ? row.lower.toFixed(3) : 'N/A'}</TableCell>
                                                        <TableCell className="text-right font-mono">{typeof row.upper === 'number' ? row.upper.toFixed(3) : 'N/A'}</TableCell>
                                                        <TableCell className="text-right font-mono">{typeof row.sem === 'number' ? row.sem.toFixed(3) : 'N/A'}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Simple Main Effects */}
                        {results.simple_main_effects && results.simple_main_effects.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Simple Main Effects</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Effect</TableHead>
                                                <TableHead className="text-right">F</TableHead>
                                                <TableHead className="text-right">p-value</TableHead>
                                                <TableHead className="text-right">η²</TableHead>
                                                <TableHead className="text-right">Significant</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {results.simple_main_effects.map((effect, index) => (
                                                <TableRow key={index} className={effect.significant ? 'bg-blue-50 dark:bg-blue-950/20' : ''}>
                                                    <TableCell className="font-medium">{effect.effect}</TableCell>
                                                    <TableCell className="text-right font-mono">{effect.f_statistic?.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">
                                                        {effect.p_value < 0.001 ? '<.001' : effect.p_value?.toFixed(4)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono">{effect.eta_squared?.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant={effect.significant ? "default" : "outline"}>
                                                            {effect.significant ? 'Yes' : 'No'}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}

                        {/* Assumptions */}
                        {results.assumptions && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Assumption Tests</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div>
                                        <h4 className="font-semibold text-sm mb-3">Normality (Shapiro-Wilk)</h4>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Group</TableHead>
                                                    <TableHead className="text-right">W</TableHead>
                                                    <TableHead className="text-right">p-value</TableHead>
                                                    <TableHead className="text-right">Normal</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {Object.entries(results.assumptions.normality).map(([group, test]: [string, any]) => (
                                                    <TableRow key={group}>
                                                        <TableCell className="font-medium">{group}</TableCell>
                                                        <TableCell className="text-right font-mono">{test.statistic?.toFixed(4) || 'N/A'}</TableCell>
                                                        <TableCell className="text-right font-mono">{test.p_value !== null ? (test.p_value < 0.001 ? '<.001' : test.p_value.toFixed(4)) : 'N/A'}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Badge variant={test.normal ? "default" : "secondary"}>
                                                                {test.normal === null ? 'N/A' : test.normal ? 'Yes' : 'No'}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-sm mb-3">Homogeneity (Levene's Test)</h4>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Test</TableHead>
                                                    <TableHead className="text-right">F</TableHead>
                                                    <TableHead className="text-right">p-value</TableHead>
                                                    <TableHead className="text-right">Met</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                <TableRow>
                                                    <TableCell className="font-medium">Levene's Test</TableCell>
                                                    <TableCell className="text-right font-mono">{results.assumptions.homogeneity.f_statistic?.toFixed(4) || 'N/A'}</TableCell>
                                                    <TableCell className="text-right font-mono">{results.assumptions.homogeneity.p_value !== null ? (results.assumptions.homogeneity.p_value < 0.001 ? '<.001' : results.assumptions.homogeneity.p_value.toFixed(4)) : 'N/A'}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant={results.assumptions.homogeneity.assumption_met ? "default" : "secondary"}>
                                                            {results.assumptions.homogeneity.assumption_met ? 'Yes' : 'No'}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Post-hoc */}
                        {results.posthoc_results && results.posthoc_results.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Post-hoc (Tukey HSD)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Group 1</TableHead>
                                                <TableHead>Group 2</TableHead>
                                                <TableHead className="text-right">Mean Diff</TableHead>
                                                <TableHead className="text-right">p-adj</TableHead>
                                                <TableHead className="text-right">Sig.</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {results.posthoc_results.map((row, index) => (
                                                <TableRow key={index} className={row.reject ? 'bg-blue-50 dark:bg-blue-950/20' : ''}>
                                                    <TableCell className="font-medium">{row.group1}</TableCell>
                                                    <TableCell className="font-medium">{row.group2}</TableCell>
                                                    <TableCell className="text-right font-mono">{row.meandiff?.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{row.p_adj < 0.001 ? '<.001' : row.p_adj?.toFixed(4)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant={row.reject ? "default" : "outline"}>{row.reject ? 'Yes' : 'No'}</Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}

                        {/* Descriptive Stats */}
                        {descriptiveTable && (
                            <Card>
                                 <CardHeader>
                                    <CardTitle>Descriptive Statistics</CardTitle>
                                 </CardHeader>
                                 <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{factorA} / {factorB}</TableHead>
                                                {descriptiveTable.colLabels.filter(c => c !== 'Row Mean').map(col => 
                                                    <TableHead key={col} className="text-center">{col}</TableHead>
                                                )}
                                                <TableHead className="text-right font-medium">Row Mean</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {descriptiveTable.rowLabels.filter(r => r !== 'Column Mean').map(rowLabel => (
                                                <TableRow key={rowLabel}>
                                                    <TableCell className="font-medium">{rowLabel}</TableCell>
                                                    {descriptiveTable.colLabels.filter(c => c !== 'Row Mean').map(colLabel => (
                                                        <TableCell key={colLabel} className="text-center font-mono">
                                                            {descriptiveTable.data.mean[rowLabel][colLabel]?.toFixed(2)} 
                                                            <span className="text-muted-foreground text-xs"> (±{descriptiveTable.data.std[rowLabel][colLabel]?.toFixed(2)})</span>
                                                        </TableCell>
                                                    ))}
                                                    <TableCell className="text-right font-mono">{typeof descriptiveTable.data.mean[rowLabel]['Row Mean'] === 'number' ? descriptiveTable.data.mean[rowLabel]['Row Mean'].toFixed(2) : 'N/A'}</TableCell>
                                                </TableRow>
                                            ))}
                                             <TableRow className="font-medium bg-muted/50">
                                                <TableCell>Column Mean</TableCell>
                                                {descriptiveTable.colLabels.filter(c => c !== 'Row Mean').map(colLabel => (
                                                    <TableCell key={colLabel} className="text-center font-mono">{descriptiveTable.data.mean['Column Mean'][colLabel]?.toFixed(2)}</TableCell>
                                                ))}
                                                <TableCell className="text-right font-mono">{typeof descriptiveTable.data.mean['Column Mean']['Row Mean'] === 'number' ? descriptiveTable.data.mean['Column Mean']['Row Mean'].toFixed(2) : 'N/A'}</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            ) : (
                 !isLoading && (
                    <div className="text-center text-muted-foreground py-10">
                        <Layers className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2">Select variables and click 'Run Analysis' to see the results.</p>
                    </div>
                )
            )}
        </div>
    );
}

