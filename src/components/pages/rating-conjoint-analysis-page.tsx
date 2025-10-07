
'use client';
import React from 'react';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Target, Settings, Brain, BarChart as BarIcon, PieChart as PieIcon, Network, LineChart as LineChartIcon, Activity, HelpCircle, MoveRight, Star, TrendingUp, CheckCircle, Users } from 'lucide-react';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ScatterChart, Scatter, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line, Bar } from 'recharts';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from 'next/image';
import type { Survey, SurveyResponse, Question } from '@/types/survey';
import { Input } from '../ui/input';

interface RatingConjointResults {
    partWorths: { attribute: string, level: string, value: number }[];
    importance: { attribute: string, importance: number }[];
    regression: {
        rSquared: number;
        adjustedRSquared: number;
        predictions: number[];
        intercept: number;
        coefficients: {[key: string]: number};
    };
    targetVariable: string;
    optimalProduct?: {
        config: {[key: string]: string};
        totalUtility: number;
    };
    simulation?: any;
}

interface FullAnalysisResponse {
    results: RatingConjointResults;
    error?: string;
}

interface Scenario {
    name: string;
    [key: string]: string;
}

interface RatingConjointAnalysisPageProps {
    survey: Survey;
    responses: SurveyResponse[];
}

export default function RatingConjointAnalysisPage({ survey, responses }: RatingConjointAnalysisPageProps) {
    const { toast } = useToast();
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Advanced features state
    const [scenarios, setScenarios] = useState<Scenario[]>([
        { name: 'My Product' }, { name: 'Competitor A' }, { name: 'Competitor B' }
    ]);
    const [simulationResult, setSimulationResult] = useState<any>(null);
    const [sensitivityAttribute, setSensitivityAttribute] = useState<string | undefined>();
    
    const conjointQuestion = useMemo(() => survey.questions.find((q: Question) => q.type === 'rating-conjoint'), [survey]);
    const allAttributes = useMemo(() => {
        if (!conjointQuestion || !conjointQuestion.attributes) return {};
        const attributesObj: any = {};
        conjointQuestion.attributes.forEach(attr => {
            attributesObj[attr.name] = {
                name: attr.name,
                type: 'categorical',
                levels: attr.levels,
                includeInAnalysis: true,
            };
        });
        return attributesObj;
    }, [conjointQuestion]);

    const attributeCols = useMemo(() => Object.keys(allAttributes), [allAttributes]);

    const handleAnalysis = useCallback(async (simulationScenarios?: Scenario[]) => {
        if (!conjointQuestion || !responses || responses.length === 0) {
            toast({ variant: 'destructive', title: 'Data Error', description: 'No rating-based conjoint question or responses found for this survey.' });
            setIsLoading(false);
            return;
        }

        const analysisData: any[] = [];
        responses.forEach((resp) => {
            const answer = resp.answers[conjointQuestion.id];
            if (!answer || typeof answer !== 'object') return;
            
            Object.entries(answer).forEach(([profileId, rating]) => {
                const profile = conjointQuestion.profiles?.find((p: any) => p.id === profileId);
                if (profile) {
                    analysisData.push({
                        ...profile,
                        rating: Number(rating)
                    });
                }
            });
        });
        
        if (analysisData.length === 0) {
            toast({ variant: 'destructive', title: 'Data Error', description: 'No valid ratings found in responses.' });
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        if (!simulationScenarios) {
            setAnalysisResult(null);
            setSimulationResult(null);
        }

        const attributesForBackend = attributeCols.reduce((acc, attrName) => {
            if (allAttributes[attrName]) {
                acc[attrName] = { ...allAttributes[attrName], includeInAnalysis: true };
            }
            return acc;
        }, {} as any);

        try {
            const response = await fetch('/api/analysis/conjoint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: analysisData,
                    attributes: attributesForBackend,
                    targetVariable: 'rating',
                    scenarios: simulationScenarios
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if (result.error) throw new Error(result.error);
            
            if (simulationScenarios && result.results.simulation) {
                setSimulationResult(result.results.simulation);
                toast({ title: 'Simulation Complete', description: 'Market shares have been predicted.'});
            } else {
                setAnalysisResult(result);
                toast({ title: 'Analysis Complete', description: 'Rating-based conjoint analysis finished.' });
            }

        } catch (e: any) {
            console.error('Rating Conjoint error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [conjointQuestion, responses, toast, attributeCols, allAttributes]);

    useEffect(() => {
        handleAnalysis();
    }, [handleAnalysis]);
    
    useEffect(() => {
        if (analysisResult && attributeCols.length > 0) {
            setSensitivityAttribute(attributeCols[0]);

            const initialScenarios = [
                { name: 'My Product' }, { name: 'Competitor A' }, { name: 'Competitor B' }
            ].map(sc => {
                const newSc: Scenario = { ...sc };
                attributeCols.forEach((attrName, i) => {
                     newSc[attrName] = allAttributes[attrName].levels[i % allAttributes[attrName].levels.length];
                });
                return newSc;
            });
            setScenarios(initialScenarios);
        }
    }, [analysisResult, attributeCols, allAttributes]);

    const runSimulation = () => {
        handleAnalysis(scenarios);
    };

    const handleScenarioChange = (scenarioIndex: number, attrName: string, value: string) => {
        setScenarios(prev => {
            const newScenarios = [...prev];
            newScenarios[scenarioIndex] = { ...newScenarios[scenarioIndex], [attrName]: value };
            return newScenarios;
        });
    };
    
    const sensitivityData = useMemo(() => {
        if (!analysisResult?.results || !sensitivityAttribute) return [];
        const otherAttributes = attributeCols.filter(attr => attr !== sensitivityAttribute);
        
        return analysisResult.results.partWorths
            .filter(p => p.attribute === sensitivityAttribute)
            .map(p => {
                let otherUtility = 0;
                otherAttributes.forEach(otherAttr => {
                    const baseLevelWorth = analysisResult.results.partWorths.find(pw => pw.attribute === otherAttr && pw.level === allAttributes[otherAttr].levels[0]);
                    otherUtility += baseLevelWorth?.value || 0;
                });
                return {
                    level: p.level,
                    utility: (analysisResult.results.regression.intercept || 0) + p.value + otherUtility,
                };
            });
    }, [analysisResult, sensitivityAttribute, attributeCols, allAttributes]);

    const importanceData = useMemo(() => {
        if (!analysisResult?.results.importance) return [];
        return analysisResult.results.importance.map(({ attribute, importance }) => ({ name: attribute, value: importance })).sort((a,b) => b.value - a.value);
    }, [analysisResult]);

    const partWorthsData = useMemo(() => {
        if (!analysisResult?.results.partWorths) return [];
        return analysisResult.results.partWorths;
    }, [analysisResult]);

    const COLORS = useMemo(() => ['#7a9471', '#b5a888', '#c4956a', '#a67b70', '#8ba3a3', '#6b7565', '#d4c4a8', '#9a8471', '#a8b5a3'], []);
    
    const importanceChartConfig = useMemo(() => {
      if (!analysisResult) return {};
      return importanceData.reduce((acc, item, index) => {
        acc[item.name] = { label: item.name, color: COLORS[index % COLORS.length] };
        return acc;
      }, {} as any);
    }, [analysisResult, importanceData, COLORS]);

    const partWorthChartConfig = { value: { label: "Part-Worth" } };

    if (isLoading && !analysisResult) {
        return (
            <Card>
                <CardContent className="p-6 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-4 text-muted-foreground">Running Rating-based Conjoint analysis...</p>
                </CardContent>
            </Card>
        );
    }
    
    if (!analysisResult?.results) {
        return (
            <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                    <p>No analysis results to display. Ensure there is valid response data for the rating-based conjoint question.</p>
                </CardContent>
            </Card>
        );
    }

    const results = analysisResult.results;
    
    return (
        <div className="space-y-4">
             <Tabs defaultValue="importance" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="importance"><PieIcon className="mr-2"/>Importance</TabsTrigger>
                    <TabsTrigger value="partworths"><BarIcon className="mr-2"/>Part-Worths</TabsTrigger>
                    <TabsTrigger value="optimal"><Star className="mr-2"/>Optimal Product</TabsTrigger>
                    <TabsTrigger value="simulation"><Activity className="mr-2"/>Simulation</TabsTrigger>
                    <TabsTrigger value="sensitivity">Sensitivity</TabsTrigger>
                </TabsList>
                <TabsContent value="importance" className="mt-4">
                    <Card>
                        <CardHeader><CardTitle className='flex items-center gap-2'><PieIcon/>Relative Importance of Attributes</CardTitle></CardHeader>
                        <CardContent>
                            <ChartContainer config={importanceChartConfig} className="w-full h-[300px]">
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={importanceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={p => `${p.name} (${p.value.toFixed(1)}%)`}>
                                            {importanceData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(2)}%`}/>} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="partworths" className="mt-4">
                    <Card>
                        <CardHeader><CardTitle className='flex items-center gap-2'><BarIcon/>Part-Worth Utilities</CardTitle></CardHeader>
                        <CardContent>
                           <div className="grid md:grid-cols-2 gap-4">
                            {attributeCols.map(attr => (
                                <div key={attr}>
                                    <h3 className="font-semibold mb-2">{attr}</h3>
                                     <ChartContainer config={partWorthChartConfig} className="w-full h-[200px]">
                                        <ResponsiveContainer>
                                            <BarChart data={partWorthsData.filter(p => p.attribute === attr)} layout="vertical" margin={{ left: 80 }}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis type="number" />
                                                <YAxis dataKey="level" type="category" width={80} />
                                                <Tooltip content={<ChartTooltipContent />} />
                                                <Bar dataKey="value" name="Part-Worth" fill="hsl(var(--primary))" barSize={30}/>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </ChartContainer>
                                </div>
                            ))}
                           </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="optimal" className="mt-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>Optimal Product Profile</CardTitle>
                            <CardDescription>The combination of attributes that yields the highest predicted preference rating.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {results.optimalProduct ? (
                                <Table>
                                    <TableHeader><TableRow><TableHead>Attribute</TableHead><TableHead>Best Level</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {Object.entries(results.optimalProduct.config).map(([attr, level]) => (
                                            <TableRow key={attr}><TableCell>{attr}</TableCell><TableCell>{level}</TableCell></TableRow>
                                        ))}
                                    </TableBody>
                                    <CardFooter className="text-center justify-center p-4">
                                        <p className="text-lg">Predicted Rating: <strong className="text-primary text-xl">{results.optimalProduct.totalUtility.toFixed(2)}</strong></p>
                                    </CardFooter>
                                </Table>
                            ) : <p>Could not determine optimal profile.</p>}
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="simulation" className="mt-4">
                    <Card>
                        <CardHeader><CardTitle>Market Share Simulation</CardTitle><CardDescription>Build product scenarios to predict market preference.</CardDescription></CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-3 gap-4 mb-4">
                                {scenarios.map((scenario, index) => (
                                    <Card key={index}>
                                        <CardHeader><Input value={scenario.name} onChange={(e) => handleScenarioChange(index, 'name', e.target.value)} /></CardHeader>
                                        <CardContent className="space-y-2">
                                            {attributeCols.map((attrName) => (
                                                <div key={attrName}>
                                                    <Label>{attrName}</Label>
                                                    <Select value={scenario[attrName]} onValueChange={(v) => handleScenarioChange(index, attrName, v)}>
                                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                                        <SelectContent>{allAttributes[attrName].levels.map((l:any) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                            <Button onClick={runSimulation} disabled={isLoading}>{isLoading ? <Loader2 className="animate-spin mr-2"/> : null} Run Simulation</Button>
                            {simulationResult && (
                                <div className="mt-4">
                                    <ChartContainer config={{marketShare: {label: 'Market Share', color: 'hsl(var(--chart-1))'}}} className="w-full h-[300px]">
                                      <ResponsiveContainer>
                                          <BarChart data={simulationResult}>
                                              <CartesianGrid strokeDasharray="3 3" />
                                              <XAxis dataKey="name" />
                                              <YAxis unit="%"/>
                                              <Tooltip content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(2)}%`}/>} />
                                              <Bar dataKey="marketShare" name="Market Share (%)" fill="var(--color-marketShare)" radius={4} />
                                          </BarChart>
                                      </ResponsiveContainer>
                                    </ChartContainer>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="sensitivity" className="mt-4">
                    <Card>
                        <CardHeader><CardTitle>Sensitivity Analysis</CardTitle><CardDescription>See how the overall utility changes as you vary the levels of a single attribute.</CardDescription></CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-2 gap-4 items-center">
                                <div>
                                    <Label>Attribute to Analyze</Label>
                                    <Select value={sensitivityAttribute} onValueChange={setSensitivityAttribute}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>{attributeCols.map(attr => <SelectItem key={attr} value={attr}>{attr}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                 <ChartContainer config={{utility: {label: 'Utility'}}} className="w-full h-[300px]">
                                  <ResponsiveContainer>
                                      <LineChart data={sensitivityData}>
                                          <CartesianGrid strokeDasharray="3 3" />
                                          <XAxis dataKey="level" />
                                          <YAxis />
                                          <Tooltip content={<ChartTooltipContent />} />
                                          <Line type="monotone" dataKey="utility" stroke="hsl(var(--primary))" strokeWidth={2} />
                                      </LineChart>
                                  </ResponsiveContainer>
                                </ChartContainer>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

```
- src/lib/stats.ts
```ts
import Papa from 'papaparse';

export type DataPoint = Record<string, number | string>;
export type DataSet = DataPoint[];

export const parseData = (
  fileContent: string
): { headers: string[]; data: DataSet; numericHeaders: string[]; categoricalHeaders: string[] } => {
  const result = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false, // Turn off dynamicTyping to handle all as strings first
  });

  if (result.errors.length > 0) {
    console.error("Parsing errors:", result.errors);
    const firstError = result.errors[0];
    if (firstError.code !== 'UndetectableDelimiter') {
       throw new Error(`CSV Parsing Error: ${firstError.message} on row ${firstError.row}`);
    }
  }

  if (!result.data || result.data.length === 0) {
    throw new Error("No parsable data rows found in the file.");
  }
  
  const rawHeaders = result.meta.fields || [];
  const rawData: any[] = result.data as any[];

  const numericHeaders: string[] = [];
  const categoricalHeaders: string[] = [];

  rawHeaders.forEach(header => {
    const values = rawData.map(row => row[header]).filter(val => val !== null && val !== undefined && val !== '');
    
    // Improved check for numeric columns
    const isNumericColumn = values.length > 0 && values.every(val => {
        // It's numeric if it's already a number or if it's a string that can be fully parsed to a number
        return typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val)) && val.trim() !== '');
    });

    if (isNumericColumn) {
        numericHeaders.push(header);
    } else {
        categoricalHeaders.push(header);
    }
  });

  // Sanitize data based on determined column types
  const sanitizedData = rawData.map(row => {
    const newRow: DataPoint = {};
    rawHeaders.forEach(header => {
      const value = row[header];
      if (value === null || value === undefined) {
        newRow[header] = ''; // Or handle as you see fit
        return;
      }
      
      if (numericHeaders.includes(header)) {
        const numValue = Number(value);
        newRow[header] = isNaN(numValue) ? '' : numValue;
      } else {
        newRow[header] = String(value);
      }
    });
    return newRow;
  });

  return { headers: rawHeaders, data: sanitizedData, numericHeaders, categoricalHeaders };
};


export const unparseData = (
    { headers, data }: { headers: string[]; data: DataSet }
): string => {
    return Papa.unparse(data, {
        columns: headers,
        header: true,
    });
};


const getColumn = (data: DataSet, column: string): (number | string)[] => {
    return data.map(row => row[column]).filter(val => val !== undefined && val !== null && val !== '');
};

const getNumericColumn = (data: DataSet, column: string): number[] => {
    return data.map(row => row[column]).filter(val => typeof val === 'number' && !isNaN(val)) as number[];
}

const mean = (arr: number[]): number => arr.length === 0 ? NaN : arr.reduce((a, b) => a + b, 0) / arr.length;

const median = (arr: number[]): number => {
    if (arr.length === 0) return NaN;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const variance = (arr: number[]): number => {
    if (arr.length < 2) return NaN;
    const m = mean(arr);
    if(isNaN(m)) return NaN;
    return mean(arr.map(x => Math.pow(x - m, 2)));
};

const stdDev = (arr: number[]): number => Math.sqrt(variance(arr));

const percentile = (arr: number[], p: number): number => {
    if (arr.length === 0) return NaN;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    if(sorted[lower] === undefined || sorted[upper] === undefined) return NaN;
    return sorted[lower] * (upper - index) + sorted[upper] * (index - lower);
};

const mode = (arr: (number|string)[]): (number|string)[] => {
    if (arr.length === 0) return [];
    const counts: {[key: string]: number} = {};
    arr.forEach(val => {
        const key = String(val);
        counts[key] = (counts[key] || 0) + 1;
    });

    let maxFreq = 0;
    for (const key in counts) {
        if (counts[key] > maxFreq) {
            maxFreq = counts[key];
        }
    }

    if (maxFreq <= 1 && new Set(arr).size === arr.length) return []; // No mode if all unique

    const modes = Object.keys(counts)
        .filter(key => counts[key] === maxFreq)
        .map(key => {
            const num = parseFloat(key);
            return isNaN(num) ? key : num;
        });
    
    return modes;
}

const skewness = (arr: number[]): number => {
    if (arr.length < 3) return NaN;
    const m = mean(arr);
    const s = stdDev(arr);
    if (s === 0 || isNaN(s) || isNaN(m)) return 0;
    const n = arr.length;
    return (n / ((n - 1) * (n - 2))) * arr.reduce((acc, val) => acc + Math.pow((val - m) / s, 3), 0);
};

const kurtosis = (arr: number[]): number => {
    if (arr.length < 4) return NaN;
    const m = mean(arr);
    const s = stdDev(arr);
    if (s === 0 || isNaN(s) || isNaN(m)) return 0;
    const n = arr.length;
    const term1 = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3));
    const term2 = arr.reduce((acc, val) => acc + Math.pow((val - m) / s, 4), 0);
    const term3 = (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
    return term1 * term2 - term3; // Excess kurtosis
};

export const findIntersection = (x1: number[], y1: number[], x2: number[], y2: number[]): number | null => {
    for (let i = 0; i < x1.length - 1; i++) {
        for (let j = 0; j < x2.length - 1; j++) {
            const p1 = { x: x1[i], y: y1[i] };
            const p2 = { x: x1[i+1], y: y1[i+1] };
            const p3 = { x: x2[j], y: y2[j] };
            const p4 = { x: x2[j+1], y: y2[j+1] };

            const denominator = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
            if (denominator === 0) continue;

            const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denominator;
            const ub = -((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denominator;

            if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
                return p1.x + ua * (p2.x - p1.x); // Return intersection X value
            }
        }
    }
    return null;
};


export const calculateDescriptiveStats = (data: DataSet, headers: string[]) => {
    const stats: Record<string, any> = {};
    headers.forEach(header => {
        const numericColumn = data.every(row => typeof row[header] === 'number');

        if (numericColumn) {
            const columnData = getNumericColumn(data, header);
            if (columnData.length > 0) {
                const p25 = percentile(columnData, 25);
                const p75 = percentile(columnData, 75);
                stats[header] = {
                    mean: mean(columnData),
                    median: median(columnData),
                    stdDev: stdDev(columnData),
                    variance: variance(columnData),
                    min: Math.min(...columnData),
                    max: Math.max(...columnData),
                    range: Math.max(...columnData) - Math.min(...columnData),
                    iqr: p75 - p25,
                    count: columnData.length,
                    mode: mode(columnData),
                    skewness: skewness(columnData),
                    kurtosis: kurtosis(columnData),
                    p25: p25,
                    p75: p75,
                };
            }
        } else {
             const catColumnData = getColumn(data, header);
             if(catColumnData.length > 0) {
                 stats[header] = {
                     count: catColumnData.length,
                     unique: new Set(catColumnData).size,
                     mode: mode(catColumnData),
                 }
             }
        }
    });
    return stats;
};

// Deprecated: Correlation calculation is now handled by the Python backend.
export const calculateCorrelationMatrix = (data: DataSet, headers: string[]) => {
    return [];
};
```
- src/types/survey.ts
```ts
export interface Survey {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  status: 'draft' | 'active' | 'closed';
  created_date: string;
  startDate?: string;
  endDate?: string;
}

export interface SurveyResponse {
  id: string;
  survey_id: string;
  submittedAt: string; // Changed from submitted_at
  answers: {
    [questionId: string]: any;
  };
}

export interface ConjointAttribute {
  id: string;
  name: string;
  levels: string[];
}

export interface Question {
  id: string;
  type: string;
  title: string;
  text?: string;
  description?: string;
  options?: string[];
  items?: string[];
  columns?: string[];
  scale?: string[];
  required?: boolean;
  content?: string;
  imageUrl?: string;
  rows?: string[];
  // For Conjoint Analysis
  attributes?: ConjointAttribute[];
  profiles?: any[]; // Generated profiles for CBC/Rating
}

```
- tailwind.config.ts
```ts
import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ['Inter', 'sans-serif'],
        headline: ['Space Grotesk', 'sans-serif'],
        code: ['monospace'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': '#7a9471',
          '2': '#b5a888',
          '3': '#c4956a',
          '4': '#a67b70',
          '5': '#8ba3a3',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;

```