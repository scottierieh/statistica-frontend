'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sigma, AlertTriangle, FileSearch, Settings, MoveRight, HelpCircle, Columns, TrendingUp, Target, CheckCircle, BarChart3, Lightbulb, BookOpen, Info, Grid3x3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import Image from 'next/image';
import type { DataSet } from '@/lib/stats';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';

interface CrosstabResults {
  contingency_table: { [key: string]: { [key: string]: number } };
  chi_squared: {
    statistic: number;
    p_value: number;
    degrees_of_freedom: number;
  };
  cramers_v: number;
  interpretation: string;
  row_totals?: { [key: string]: number };
  col_totals?: { [key: string]: number };
  total?: number;
  n_dropped?: number;
  dropped_rows?: number[];
  expected_frequencies?: number[][];
}

interface FullAnalysisResponse {
  results: CrosstabResults;
  plot?: string;
}

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: CrosstabResults }) => {
    const isSignificant = results.chi_squared.p_value < 0.05;
    
    const getEffectSizeInterpretation = (cramersV: number) => {
        if (cramersV >= 0.5) return 'Large effect';
        if (cramersV >= 0.3) return 'Medium effect';
        if (cramersV >= 0.1) return 'Small effect';
        return 'Negligible';
    };

    const getSignificanceLevel = (p: number) => {
        if (p < 0.001) return 'Highly significant';
        if (p < 0.01) return 'Very significant';
        if (p < 0.05) return 'Significant';
        return 'Not significant';
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Chi-Squared Statistic Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Chi-Squared (χ²)
                            </p>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.chi_squared.statistic.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            df = {results.chi_squared.degrees_of_freedom}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* P-value Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                P-value
                            </p>
                            {isSignificant ? 
                                <CheckCircle className="h-4 w-4 text-green-600" /> : 
                                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            }
                        </div>
                        <p className={`text-2xl font-semibold ${!isSignificant ? 'text-red-600 dark:text-red-400' : ''}`}>
                            {results.chi_squared.p_value < 0.001 ? '<0.001' : results.chi_squared.p_value.toFixed(4)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {getSignificanceLevel(results.chi_squared.p_value)}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Effect Size Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Cramer's V
                            </p>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.cramers_v.toFixed(3)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {getEffectSizeInterpretation(results.cramers_v)}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Sample Size Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Sample Size
                            </p>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.total || Object.values(results.contingency_table).reduce(
                                (acc, row) => acc + Object.values(row).reduce((sum, val) => sum + val, 0), 0
                            )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Total observations
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Overview component
const CrosstabOverview = ({ rowVar, colVar, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Variable selection status
        if (rowVar && colVar) {
            if (rowVar === colVar) {
                overview.push('⚠ Row and Column variables must be different');
            } else {
                overview.push(`Analyzing association between ${rowVar} and ${colVar}`);
            }
        } else {
            overview.push('Select two categorical variables for crosstabulation');
        }

        // Category counts
        if (rowVar && colVar && data.length > 0 && rowVar !== colVar) {
            const rowCategories = new Set(data.map((d: any) => d[rowVar]).filter((v: any) => v != null)).size;
            const colCategories = new Set(data.map((d: any) => d[colVar]).filter((v: any) => v != null)).size;
            overview.push(`Table dimensions: ${rowCategories} × ${colCategories}`);
            
            const expectedFreq = data.length / (rowCategories * colCategories);
            if (expectedFreq < 5) {
                overview.push('⚠ Some cells may have low expected frequencies');
                overview.push('Consider using Fisher\'s exact test for small samples');
            }
        }

        // Sample size
        if (data.length < 20) {
            overview.push(`Sample size: ${data.length} observations (⚠ Very small)`);
        } else if (data.length < 50) {
            overview.push(`Sample size: ${data.length} observations (Small)`);
        } else if (data.length < 100) {
            overview.push(`Sample size: ${data.length} observations (Moderate)`);
        } else {
            overview.push(`Sample size: ${data.length} observations (Good)`);
        }
        
        // Helper function to check if value is missing  
        const isMissing = (value: any) => {
            return value == null || value === '' || 
                   (typeof value === 'string' && value.toLowerCase() === 'nan');
        };

        // Missing value check
        if (rowVar && colVar && data.length > 0) {
            const missingCount = data.filter((row: any) => 
                isMissing(row[rowVar]) || isMissing(row[colVar])
            ).length;
            const validCount = data.length - missingCount;
            
            if (missingCount > 0) {
                overview.push(`⚠ Missing values: ${missingCount} rows will be excluded (${validCount} valid observations)`);
            } else {
                overview.push(`✓ No missing values detected`);
            }
        }
        
        // Test info
        overview.push('Test type: Pearson\'s Chi-Squared Test of Independence');
        overview.push('Null hypothesis: Variables are independent');

        return overview;
    }, [rowVar, colVar, data]);

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Overview</CardTitle>
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

const getSignificanceStars = (p: number | undefined) => {
    if (p === undefined || p === null) return '';
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const crosstabExample = exampleDatasets.find(d => d.id === 'crosstab');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Columns className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Crosstabulation & Chi-Squared</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Analyze relationships between two categorical variables
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Columns className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Contingency Table</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Display frequency distribution across two variables
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <BarChart3 className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Chi-Squared Test</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Test if variables are statistically independent
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Effect Size</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Measure association strength with Cramer's V
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
                            Use crosstabulation to explore relationships between two categorical variables. The contingency 
                            table shows how categories overlap, while the Chi-Squared test determines if the relationship 
                            is statistically significant. This is fundamental for understanding associations in survey data, 
                            customer segmentation, and A/B testing results.
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
                                        <span><strong>Variables:</strong> Two categorical variables</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Expected frequency:</strong> At least 5 per cell (ideally)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Independence:</strong> Observations should be independent</span>
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
                                        <span><strong>P &lt; 0.05:</strong> Variables are associated</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Cramer's V:</strong> 0 = no association, 1 = perfect</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Table:</strong> Examine cell counts for patterns</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {crosstabExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(crosstabExample)} size="lg">
                                <Columns className="mr-2 h-5 w-5" />
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface CrosstabPageProps {
  data: DataSet;
  categoricalHeaders: string[];
  onLoadExample?: (example: ExampleDataSet) => void;
}

export default function CrosstabPage({ data, categoricalHeaders, onLoadExample }: CrosstabPageProps) {
  const { toast } = useToast();
  const [rowVar, setRowVar] = useState<string>('');
  const [colVar, setColVar] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
  const [view, setView] = useState('intro');

  const canRun = useMemo(() => data.length > 0 && categoricalHeaders.length >= 2, [data, categoricalHeaders]);
  
  useEffect(() => {
    if (categoricalHeaders.length > 0) {
      setRowVar(categoricalHeaders[0]);
      if (categoricalHeaders.length > 1) {
        setColVar(categoricalHeaders[1]);
      } else {
        setColVar('');
      }
    }
    setAnalysisResult(null);
    setView(canRun ? 'main' : 'intro');
  }, [categoricalHeaders, data, canRun]);

  const handleAnalysis = useCallback(async () => {
    if (!rowVar || !colVar) {
      toast({ 
        title: 'Selection Error', 
        description: 'Please select two variables for crosstabulation.', 
        variant: 'destructive' 
      });
      return;
    }

    if (rowVar === colVar) {
      toast({
        title: 'Selection Error',
        description: 'Row and Column variables must be different.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    setAnalysisResult(null);

    try {
      const response = await fetch('/api/analysis/crosstab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          data: data, 
          rowVar, 
          colVar 
        })
      });

      if (!response.ok) {
        const errorText = await response.json();
        throw new Error(errorText.error || 'Failed to analyze data.');
      }
      
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      setAnalysisResult(result);

    } catch (e: any) {
      console.error('Crosstab error:', e);
      toast({ 
        title: 'Analysis Error', 
        description: e.message, 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  }, [rowVar, colVar, data, toast]);
  
  const results = analysisResult?.results;

  // Calculate row and column totals (must be before any conditional returns)
  const rowTotals = useMemo(() => {
    if (!results) return {};
    const totals: { [key: string]: number } = {};
    Object.entries(results.contingency_table).forEach(([rowKey, rowData]) => {
      totals[rowKey] = Object.values(rowData).reduce((sum, val) => sum + val, 0);
    });
    return totals;
  }, [results]);

  const colTotals = useMemo(() => {
    if (!results) return {};
    const totals: { [key: string]: number } = {};
    const firstRow = Object.keys(results.contingency_table)[0];
    if (firstRow) {
      Object.keys(results.contingency_table[firstRow]).forEach(colKey => {
        totals[colKey] = Object.values(results.contingency_table).reduce(
          (sum, row) => sum + (row[colKey] || 0), 0
        );
      });
    }
    return totals;
  }, [results]);

  const grandTotal = useMemo(() => {
    return Object.values(rowTotals).reduce((sum, val) => sum + val, 0);
  }, [rowTotals]);

  // Conditional return must come after all hooks
  if (!canRun && view === 'main') {
    return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample!} />;
  }
  
  if (view === 'intro') {
    return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample!} />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="font-headline">Crosstabulation Setup</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
          </div>
          <CardDescription>Select two categorical variables to analyze their relationship.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Row Variable</Label>
              <Select value={rowVar} onValueChange={setRowVar}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Row Variable..." />
                </SelectTrigger>
                <SelectContent>
                  {categoricalHeaders.map(opt => (
                    <SelectItem 
                      key={opt} 
                      value={opt}
                      disabled={opt === colVar}
                    >
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Column Variable</Label>
              <Select value={colVar} onValueChange={setColVar}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Column Variable..." />
                </SelectTrigger>
                <SelectContent>
                  {categoricalHeaders.map(opt => (
                    <SelectItem 
                      key={opt} 
                      value={opt}
                      disabled={opt === rowVar}
                    >
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Overview component */}
          <CrosstabOverview 
            rowVar={rowVar}
            colVar={colVar}
            data={data}
          />
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button 
            onClick={handleAnalysis} 
            disabled={isLoading || !rowVar || !colVar || rowVar === colVar}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Sigma className="mr-2 h-4 w-4" />
                Run Analysis
              </>
            )}
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

      {results && (
        <div className="space-y-4">
          {/* Data Quality Information */}
          {results.n_dropped !== undefined && results.n_dropped > 0 && (
              <Card>
                  <CardHeader>
                      <CardTitle>Data Quality</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Missing Values Detected</AlertTitle>
                          <AlertDescription>
                              <p className="mb-2">
                                  {results.n_dropped} row{results.n_dropped > 1 ? 's were' : ' was'} excluded from the analysis due to missing values in {rowVar} or {colVar}.
                              </p>
                              {results.dropped_rows && results.dropped_rows.length > 0 && (
                                  <details className="mt-2">
                                      <summary className="cursor-pointer font-medium text-sm hover:underline">
                                          View excluded row indices (0-based)
                                      </summary>
                                      <div className="mt-2 p-2 bg-destructive/10 rounded text-xs font-mono">
                                          {results.dropped_rows.length <= 20 
                                              ? results.dropped_rows.join(', ')
                                              : `${results.dropped_rows.slice(0, 20).join(', ')} ... and ${results.dropped_rows.length - 20} more`
                                          }
                                      </div>
                                  </details>
                              )}
                          </AlertDescription>
                      </Alert>
                  </CardContent>
              </Card>
          )}

          {/* Statistical Summary Cards */}
          <StatisticalSummaryCards results={results} />

          {/* Detailed Analysis - EXACTLY like ANCOVA/Correlation */}
          <Card>
              <CardHeader>
                  <CardTitle className="font-headline flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Detailed Analysis
                  </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                  {(() => {
                      const interpretation = results.interpretation;
                      const sections: { title: string; content: string[]; icon: any }[] = [];
                      
                      const lines = interpretation.split('\n').filter(l => l.trim());
                      let currentSection: typeof sections[0] | null = null;
                      
                      lines.forEach((line) => {
                          const trimmed = line.trim();
                          if (!trimmed) return;
                          
                          if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
                              const title = trimmed.replace(/\*\*/g, '').trim();
                              
                              let icon = Grid3x3;
                              if (title.includes('Overall Analysis')) icon = Grid3x3;
                              else if (title.includes('Statistical Insights')) icon = Info;
                              else if (title.includes('Recommendations')) icon = TrendingUp;
                              
                              currentSection = { title, content: [], icon };
                              sections.push(currentSection);
                          } else if (currentSection) {
                              currentSection.content.push(trimmed);
                          }
                      });
                      
                      return sections.map((section, idx) => {
                          const Icon = section.icon;
                          
                          let gradientClass = '';
                          let borderClass = '';
                          let iconBgClass = '';
                          let iconColorClass = '';
                          let bulletColorClass = '';
                          
                          if (idx === 0) {
                              gradientClass = 'bg-gradient-to-br from-primary/5 to-primary/10';
                              borderClass = 'border-primary/40';
                              iconBgClass = 'bg-primary/10';
                              iconColorClass = 'text-primary';
                              bulletColorClass = 'text-primary';
                          } else if (section.title.includes('Statistical Insights')) {
                              gradientClass = 'bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10';
                              borderClass = 'border-blue-300 dark:border-blue-700';
                              iconBgClass = 'bg-blue-500/10';
                              iconColorClass = 'text-blue-600 dark:text-blue-400';
                              bulletColorClass = 'text-blue-600 dark:text-blue-400';
                          } else {
                              gradientClass = 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10';
                              borderClass = 'border-amber-300 dark:border-amber-700';
                              iconBgClass = 'bg-amber-500/10';
                              iconColorClass = 'text-amber-600 dark:text-amber-400';
                              bulletColorClass = 'text-amber-600 dark:text-amber-400';
                          }
                          
                          return (
                              <div key={idx} className={`${gradientClass} rounded-lg p-6 border ${borderClass}`}>
                                  <div className="flex items-center gap-2 mb-4">
                                      <div className={`p-2 ${iconBgClass} rounded-md`}>
                                          <Icon className={`h-4 w-4 ${iconColorClass}`} />
                                      </div>
                                      <h3 className="font-semibold text-base">{section.title}</h3>
                                  </div>
                                  <div className="space-y-3">
                                      {section.content.map((text, textIdx) => {
                                          if (text.startsWith('→')) {
                                              return (
                                                  <div key={textIdx} className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                                      <span className={`${bulletColorClass} font-bold mt-0.5`}>→</span>
                                                      <div dangerouslySetInnerHTML={{ __html: text.substring(1).trim().replace(/\*\*/g, '') }} />
                                                  </div>
                                              );
                                          } else if (text.startsWith('•') || text.startsWith('-')) {
                                              return (
                                                  <div key={textIdx} className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                                      <span className={`${bulletColorClass} font-bold mt-0.5`}>•</span>
                                                      <div dangerouslySetInnerHTML={{ __html: text.substring(1).trim().replace(/\*\*/g, '') }} />
                                                  </div>
                                              );
                                          }
                                          
                                          return (
                                              <p key={textIdx} className="text-sm text-foreground/80 leading-relaxed" dangerouslySetInnerHTML={{ __html: text.replace(/\*\*/g, '') }} />
                                          );
                                      })}
                                  </div>
                              </div>
                          );
                      });
                  })()}
              </CardContent>
          </Card>

          {/* Test Statistics Table */}
          <Card>
              <CardHeader>
                  <CardTitle>Test Statistics</CardTitle>
                  <CardDescription>Chi-squared test results and effect size</CardDescription>
              </CardHeader>
              <CardContent>
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Statistic</TableHead>
                              <TableHead className="text-right">Value</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          <TableRow>
                              <TableCell className="font-medium">Chi-Squared (χ²)</TableCell>
                              <TableCell className="text-right font-mono">{results.chi_squared.statistic.toFixed(3)}</TableCell>
                          </TableRow>
                          <TableRow>
                              <TableCell className="font-medium">Degrees of Freedom</TableCell>
                              <TableCell className="text-right font-mono">{results.chi_squared.degrees_of_freedom}</TableCell>
                          </TableRow>
                          <TableRow>
                              <TableCell className="font-medium">P-value</TableCell>
                              <TableCell className="text-right font-mono">
                                  {results.chi_squared.p_value < 0.001 ? '<.001' : results.chi_squared.p_value.toFixed(4)}
                                  <span className="ml-2 text-xs">
                                      {getSignificanceStars(results.chi_squared.p_value)}
                                  </span>
                              </TableCell>
                          </TableRow>
                          <TableRow>
                              <TableCell className="font-medium">Cramer's V (Effect Size)</TableCell>
                              <TableCell className="text-right font-mono">{results.cramers_v.toFixed(3)}</TableCell>
                          </TableRow>
                      </TableBody>
                  </Table>
              </CardContent>
              <CardFooter>
                  <p className='text-sm text-muted-foreground'>
                      Significance: *** p &lt; 0.001, ** p &lt; 0.01, * p &lt; 0.05
                  </p>
              </CardFooter>
          </Card>

          {/* Visualization */}
          {analysisResult.plot && (
              <Card>
                  <CardHeader>
                      <CardTitle>Distribution</CardTitle>
                      <CardDescription>Grouped bar chart showing the relationship</CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                      <Image 
                          src={analysisResult.plot} 
                          alt="Crosstabulation Visualization" 
                          width={800}
                          height={500}
                          className="rounded-md"
                      />
                  </CardContent>
              </Card>
          )}

          {/* Contingency Table */}
          <Card>
            <CardHeader>
              <CardTitle>Contingency Table</CardTitle>
              <CardDescription>
                Observed frequencies: {rowVar} × {colVar}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="count">
                <TabsList className="grid w-full grid-cols-4 mb-4">
                  <TabsTrigger value="count">Count</TabsTrigger>
                  <TabsTrigger value="row">Row %</TabsTrigger>
                  <TabsTrigger value="col">Column %</TabsTrigger>
                  <TabsTrigger value="total">% of Total</TabsTrigger>
                </TabsList>

                {/* Count Tab */}
                <TabsContent value="count">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-bold">{rowVar} \ {colVar}</TableHead>
                          {Object.keys(results.contingency_table[Object.keys(results.contingency_table)[0]]).map(col => (
                            <TableHead key={col} className="text-center font-bold">{col}</TableHead>
                          ))}
                          <TableHead className="text-center font-bold">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(results.contingency_table).map(([rowKey, rowData]) => (
                          <TableRow key={rowKey}>
                            <TableCell className="font-semibold">{rowKey}</TableCell>
                            {Object.values(rowData).map((cellValue, index) => (
                              <TableCell key={index} className="text-center font-mono">
                                {cellValue}
                              </TableCell>
                            ))}
                            <TableCell className="text-center font-mono font-semibold">
                              {rowTotals[rowKey]}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t-2">
                          <TableCell className="font-bold">Total</TableCell>
                          {Object.values(colTotals).map((total, index) => (
                            <TableCell key={index} className="text-center font-mono font-semibold">
                              {total}
                            </TableCell>
                          ))}
                          <TableCell className="text-center font-mono font-bold">
                            {grandTotal}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                {/* Row % Tab */}
                <TabsContent value="row">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-bold">{rowVar} \ {colVar}</TableHead>
                          {Object.keys(results.contingency_table[Object.keys(results.contingency_table)[0]]).map(col => (
                            <TableHead key={col} className="text-center font-bold">{col}</TableHead>
                          ))}
                          <TableHead className="text-center font-bold">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(results.contingency_table).map(([rowKey, rowData]) => {
                          const rowTotal = rowTotals[rowKey];
                          return (
                            <TableRow key={rowKey}>
                              <TableCell className="font-semibold">{rowKey}</TableCell>
                              {Object.values(rowData).map((cellValue, index) => {
                                const percentage = rowTotal > 0 ? (cellValue / rowTotal * 100).toFixed(1) : '0.0';
                                return (
                                  <TableCell key={index} className="text-center font-mono">
                                    {percentage}%
                                  </TableCell>
                                );
                              })}
                              <TableCell className="text-center font-mono font-semibold">
                                100.0%
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        <TableRow className="border-t-2">
                          <TableCell className="font-bold">Total</TableCell>
                          {Object.keys(results.contingency_table[Object.keys(results.contingency_table)[0]]).map((colKey, index) => {
                            const colTotal = colTotals[colKey];
                            const percentage = grandTotal > 0 ? (colTotal / grandTotal * 100).toFixed(1) : '0.0';
                            return (
                              <TableCell key={index} className="text-center font-mono font-semibold">
                                {percentage}%
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center font-mono font-bold">
                            100.0%
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                {/* Column % Tab */}
                <TabsContent value="col">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-bold">{rowVar} \ {colVar}</TableHead>
                          {Object.keys(results.contingency_table[Object.keys(results.contingency_table)[0]]).map(col => (
                            <TableHead key={col} className="text-center font-bold">{col}</TableHead>
                          ))}
                          <TableHead className="text-center font-bold">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(results.contingency_table).map(([rowKey, rowData]) => (
                          <TableRow key={rowKey}>
                            <TableCell className="font-semibold">{rowKey}</TableCell>
                            {Object.entries(rowData).map(([colKey, cellValue], index) => {
                              const colTotal = colTotals[colKey];
                              const percentage = colTotal > 0 ? (cellValue / colTotal * 100).toFixed(1) : '0.0';
                              return (
                                <TableCell key={index} className="text-center font-mono">
                                  {percentage}%
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-center font-mono font-semibold">
                              {(() => {
                                const rowTotal = rowTotals[rowKey];
                                const percentage = grandTotal > 0 ? (rowTotal / grandTotal * 100).toFixed(1) : '0.0';
                                return `${percentage}%`;
                              })()}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t-2">
                          <TableCell className="font-bold">Total</TableCell>
                          {Object.keys(results.contingency_table[Object.keys(results.contingency_table)[0]]).map((colKey, index) => (
                            <TableCell key={index} className="text-center font-mono font-semibold">
                              100.0%
                            </TableCell>
                          ))}
                          <TableCell className="text-center font-mono font-bold">
                            100.0%
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                {/* % of Total Tab */}
                <TabsContent value="total">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-bold">{rowVar} \ {colVar}</TableHead>
                          {Object.keys(results.contingency_table[Object.keys(results.contingency_table)[0]]).map(col => (
                            <TableHead key={col} className="text-center font-bold">{col}</TableHead>
                          ))}
                          <TableHead className="text-center font-bold">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(results.contingency_table).map(([rowKey, rowData]) => (
                          <TableRow key={rowKey}>
                            <TableCell className="font-semibold">{rowKey}</TableCell>
                            {Object.values(rowData).map((cellValue, index) => {
                              const percentage = grandTotal > 0 ? (cellValue / grandTotal * 100).toFixed(1) : '0.0';
                              return (
                                <TableCell key={index} className="text-center font-mono">
                                  {percentage}%
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-center font-mono font-semibold">
                              {(() => {
                                const rowTotal = rowTotals[rowKey];
                                const percentage = grandTotal > 0 ? (rowTotal / grandTotal * 100).toFixed(1) : '0.0';
                                return `${percentage}%`;
                              })()}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t-2">
                          <TableCell className="font-bold">Total</TableCell>
                          {Object.keys(results.contingency_table[Object.keys(results.contingency_table)[0]]).map((colKey, index) => {
                            const colTotal = colTotals[colKey];
                            const percentage = grandTotal > 0 ? (colTotal / grandTotal * 100).toFixed(1) : '0.0';
                            return (
                              <TableCell key={index} className="text-center font-mono font-semibold">
                                {percentage}%
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center font-mono font-bold">
                            100.0%
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter>
              <p className='text-sm text-muted-foreground'>
                Row %: Within-row percentage | Column %: Within-column percentage | % of Total: Percentage of grand total
              </p>
            </CardFooter>
          </Card>
        </div>
      )}
      
      {!results && !isLoading && (
        <div className="text-center text-muted-foreground py-10">
          <Columns className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2">Select variables and click 'Run Analysis' to see the crosstabulation.</p>
        </div>
      )}
    </div>
  );
}

