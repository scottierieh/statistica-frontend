
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, DollarSign, AlertTriangle, LineChart as LineChartIcon, BarChart as BarChartIcon, Brain } from 'lucide-react';
import type { Survey, SurveyResponse } from '@/types/survey';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Skeleton } from '../ui/skeleton';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { ResponsiveContainer, LineChart, XAxis, YAxis, Tooltip, Legend, Line, CartesianGrid, Bar, BarChart } from 'recharts';


interface GaborGrangerResults {
    optimal_revenue_price: number;
    optimal_profit_price?: number;
    max_revenue: number;
    max_profit?: number;
    demand_curve: { price: number; likelihood: number; revenue: number; profit?: number }[];
    cliff_price: number;
    acceptable_range: [number, number] | null;
    price_elasticity: { price_from: number, price_to: number, elasticity: number }[];
    interpretation: string;
}

interface FullAnalysisResponse {
    results: GaborGrangerResults;
    error?: string;
}

interface GaborGrangerPageProps {
    survey: Survey;
    responses: SurveyResponse[];
}

const StatCard = ({ title, value, unit = '$' }: { title: string, value: number | undefined | null, unit?: string }) => (
    <div className="p-4 bg-muted rounded-lg text-center">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value !== undefined && value !== null ? `${unit}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : 'N/A'}</p>
    </div>
);

export default function GaborGrangerAnalysisPage({ survey, responses }: GaborGrangerPageProps) {
    const { toast } = useToast();
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [unitCost, setUnitCost] = useState<number | undefined>();

    const handleAnalysis = useCallback(async (cost?: number) => {
        if (!survey || !responses || responses.length === 0) {
            setError("No response data available for this survey.");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);
        if (cost === undefined) {
             setAnalysisResult(null);
        }

        const gaborGrangerQuestions = survey.questions.filter(q => q.type === 'single' && q.title.toLowerCase().includes('if this product was sold for'));

        if (gaborGrangerQuestions.length === 0) {
            setError("No Gabor-Granger style questions found in the survey.");
            setIsLoading(false);
            return;
        }

        const analysisData: { respondent_id: string; price: number; purchase_intent: number }[] = [];
        responses.forEach(resp => {
            gaborGrangerQuestions.forEach(q => {
                const answer = (resp.answers as any)[q.id];
                const priceMatch = q.title.match(/\$?([\d,]+)/);
                if (answer && priceMatch) {
                    analysisData.push({
                        respondent_id: resp.id,
                        price: Number(priceMatch[1].replace(/,/g, '')),
                        purchase_intent: answer === 'Yes, I would buy' ? 1 : 0,
                    });
                }
            });
        });

        if (analysisData.length === 0) {
            setError("Could not extract valid data for Gabor-Granger analysis from responses.");
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/analysis/gabor-granger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: analysisData,
                    price_col: 'price',
                    purchase_intent_col: 'purchase_intent',
                    unit_cost: cost
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if (result.error) throw new Error(result.error);

            setAnalysisResult(result);
            if(cost !== undefined) {
                 toast({ title: 'Analysis Updated', description: 'Profit calculations have been added.' });
            } else {
                 toast({ title: 'Analysis Complete', description: 'Gabor-Granger analysis finished.' });
            }

        } catch (e: any) {
            setError(e.message);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [survey, responses, toast]);
    
    useEffect(() => {
        handleAnalysis();
    }, [handleAnalysis]);
    
    const handleUnitCostAnalysis = () => {
        handleAnalysis(unitCost);
    };

    if (isLoading && !analysisResult) {
        return <Card><CardContent className="p-6 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /><p>Running Gabor-Granger analysis...</p></CardContent></Card>;
    }
    if (error) {
        return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
    }
    if (!analysisResult) {
        return <Card><CardContent className="p-6 text-center text-muted-foreground">No analysis results to display.</CardContent></Card>;
    }
    
    const { results } = analysisResult;
    const chartData = results.demand_curve.map(d => ({...d, likelihood_pct: d.likelihood * 100}));
    const elasticityData = results.price_elasticity.map(e => ({...e, range: `${e.price_from}-${e.price_to}`}));

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Analysis Configuration</CardTitle>
                </CardHeader>
                <CardContent className="flex items-end gap-4">
                     <div className="max-w-xs">
                        <Label htmlFor="unit-cost">Unit Cost (Optional)</Label>
                        <Input 
                            id="unit-cost"
                            type="number"
                            placeholder="Enter cost per unit"
                            value={unitCost === undefined ? '' : unitCost}
                            onChange={e => setUnitCost(e.target.value === '' ? undefined : Number(e.target.value))}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Provide a unit cost to calculate profit-optimal pricing.</p>
                    </div>
                     <Button onClick={handleUnitCostAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/>Recalculating...</> : <>Recalculate with Cost</>}
                    </Button>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Key Price Points</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     <StatCard title="Optimal Price (Revenue)" value={results.optimal_revenue_price} />
                     <StatCard title="Max Revenue Index" value={results.max_revenue} unit="" />
                     <StatCard title="Optimal Price (Profit)" value={results.optimal_profit_price} />
                     {results.max_profit !== undefined && <StatCard title="Max Profit Index" value={results.max_profit} unit="" />}
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Interpretation</CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert>
                        <Brain className="h-4 w-4" />
                        <AlertTitle>Strategic Insights</AlertTitle>
                        <AlertDescription className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: results.interpretation.replace(/\n/g, '<br />') }} />
                    </Alert>
                </CardContent>
            </Card>

             <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><LineChartIcon /> Demand, Revenue, and Profit Curves</CardTitle></CardHeader>
                <CardContent>
                    <ChartContainer config={{}} className="w-full h-96">
                      <ResponsiveContainer>
                        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="price" name="Price" unit="$" />
                          <YAxis yAxisId="left" stroke="#3b82f6" label={{ value: 'Purchase Likelihood (%)', angle: -90, position: 'insideLeft' }} />
                          <YAxis yAxisId="right" orientation="right" stroke="#ef4444" label={{ value: 'Revenue / Profit Index', angle: 90, position: 'insideRight' }} />
                          <Tooltip content={<ChartTooltipContent formatter={(value, name) => `${(value as number).toFixed(name === 'likelihood_pct' ? 1 : 2)}${name === 'likelihood_pct' ? '%' : ''}`} />} />
                          <Legend />
                          <Line yAxisId="left" type="monotone" dataKey="likelihood_pct" name="Demand Curve" stroke="#3b82f6" strokeWidth={2} />
                          <Line yAxisId="right" type="monotone" dataKey="revenue" name="Revenue Curve" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" />
                          {results.demand_curve.some(d => d.profit !== undefined) && (
                            <Line yAxisId="right" type="monotone" dataKey="profit" name="Profit Curve" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" />
                          )}
                        </RechartsLineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>
            
             <div className="grid md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader><CardTitle>Demand Curve Data</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Price</TableHead>
                                    <TableHead className="text-right">Purchase Likelihood</TableHead>
                                    <TableHead className="text-right">Revenue Index</TableHead>
                                    {results.demand_curve.some(r => r.profit !== undefined) && <TableHead className="text-right">Profit Index</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {results.demand_curve.map((row) => (
                                    <TableRow key={row.price}>
                                        <TableCell>${row.price.toLocaleString()}</TableCell>
                                        <TableCell className="text-right font-mono">{(row.likelihood * 100).toFixed(1)}%</TableCell>
                                        <TableCell className="text-right font-mono">{row.revenue.toFixed(2)}</TableCell>
                                        {row.profit !== undefined && <TableCell className="text-right font-mono">{row.profit.toFixed(2)}</TableCell>}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><BarChartIcon /> Price Elasticity by Range</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                         <ChartContainer config={{elasticity: {label: 'Elasticity'}}} className="w-full h-80">
                            <ResponsiveContainer>
                                <BarChart data={elasticityData} layout="vertical" margin={{ left: 60, right: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" />
                                    <YAxis type="category" dataKey="range" width={80} />
                                    <Tooltip content={<ChartTooltipContent />} />
                                    <ReferenceLine x={-1} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                                    <Bar dataKey="elasticity" name="Elasticity">
                                        {elasticityData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.elasticity < -1 ? "hsl(var(--destructive))" : "hsl(var(--primary))"} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                         </ChartContainer>
                         <div className="overflow-y-auto h-80">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Price Range</TableHead>
                                        <TableHead className="text-right">Elasticity</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {elasticityData.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{item.range}</TableCell>
                                            <TableCell className="text-right font-mono">{item.elasticity.toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

```
- src/lib/example-datasets/gabor-granger-data.ts
```ts

export const gaborGrangerData = `price,purchase_intent
5,1
10,1
15,1
20,1
25,0
30,0
5,1
10,1
15,0
20,0
25,0
30,0
5,1
10,1
15,1
20,1
25,0
30,0
5,1
10,1
15,1
20,0
25,0
30,0
5,1
10,1
15,1
20,1
25,1
30,0
`;
```
- src/lib/example-datasets.ts
```ts
import { Car, Coffee, Database, ShieldCheck, LucideIcon, BookOpen, Users, BrainCircuit, Network, TrendingUp, FlaskConical, Binary, Copy, Sigma, BarChart, Columns, Target, Component, HeartPulse, Feather, GitBranch, Smile, Scaling, AreaChart, LineChart, Layers, Map, Repeat, ScanSearch, Atom, MessagesSquare, Share2, GitCommit, DollarSign, ThumbsUp, ClipboardList, Handshake } from "lucide-react";
import { likertScaleData } from "./example-datasets/likert-scale-data";
import { studentPerformanceData } from "./example-datasets/student-performance";
import { workStressData } from "./example-datasets/work-stress-data";
import { stressSupportData } from "./example-datasets/stress-support-data";
import { nonparametricData } from "./example-datasets/nonparametric-data";
import { customerSegmentsData } from "./example-datasets/customer-segments";
import { manovaData } from "./example-datasets/manova-data";
import { tTestData } from "./example-datasets/t-test-data";
import { regressionData } from "./example-datasets/regression-data";
import { conjointSmartphoneData } from "./example-datasets/conjoint-smartphone-data";
import { ipaRestaurantData } from "./example-datasets/ipa-restaurant-data";
import { admissionData } from "./example-datasets/admission-data";
import { survivalData } from "./example-datasets/survival-data";
import { twoWayAnovaData } from "./example-datasets/two-way-anova-data";
import { abTestData } from "./example-datasets/ab-test-data";
import { gbmClassificationData, gbmRegressionData } from "./example-datasets/gbm-data";
import { metaAnalysisData } from "./example-datasets/meta-analysis-data";
import { timeSeriesData } from "./example-datasets/time-series-data";
import { rmAnovaData } from "./example-datasets/rm-anova-data";
import { crosstabData } from "./example-datasets/crosstab-data";
import { nonlinearRegressionData } from "./example-datasets/nonlinear-regression-data";
import { snaData } from "./example-datasets/sna-data";
import { restaurantReviewsData } from "./example-datasets/restaurant-reviews-data";
import { deaBankData } from "./example-datasets/dea-data";
import { cbcData } from "./example-datasets/cbc-data";
import { ahpData } from "./example-datasets/ahp-data";
import { didData } from "./example-datasets/did-data";
import { delphiData } from "./example-datasets/delphi-data";
import { mcnemarData } from './example-datasets/mcnemar-data';
import { turfData } from './example-datasets/turf-data';
import { gaborGrangerData } from './example-datasets/gabor-granger-data';


// This will be generated by a python script
// const abTestData = `group,time_on_site
// A,152.17
// A,133.58
// A,128.59
// ...
// `;


// The definition for AnalysisType was moved to statistica-app.tsx to avoid circular dependencies.
// Let's define it here locally for this file's purpose.
type AnalysisType = 'stats' | 'correlation' | 'one-way-anova' | 'two-way-anova' | 'ancova' | 'manova' | 'reliability' | 'visuals' | 'discriminant' | 'efa' | 'mediation' | 'moderation' | 'nonparametric' | 'hca' | 't-test' | 'regression' | 'logistic-regression' | 'glm' | 'kmeans' | 'kmedoids' | 'hdbscan' | 'frequency' | 'crosstab' | 'sem' | 'conjoint' | 'cbc' | 'ipa' | 'pca' | 'survival' | 'wordcloud' | 'gbm' | 'sentiment' | 'meta-analysis' | 'mds' | 'rm-anova' | 'dbscan' | 'nonlinear-regression' | 'sna' | 'topic-modeling' | 'dea' | 'ahp' | 'did' | 'delphi' | 'survey' | 'van-westendorp' | 'gabor-granger' | 'maxdiff' | 'binomial-test' | 'mixed-model' | 'rm-anova-pingouin' | 'classifier-comparison' | 'turf' | string;


export interface ExampleDataSet {
    id: string;
    name: string;
    description: string;
    icon: LucideIcon;
    analysisTypes: AnalysisType[];
    recommendedAnalysis?: AnalysisType;
    data: string;
}

const irisData = `sepal.length,sepal.width,petal.length,petal.width,variety
5.1,3.5,1.4,.2,Setosa
4.9,3,1.4,.2,Setosa
4.7,3.2,1.3,.2,Setosa
7,3.2,4.7,1.4,Versicolor
6.4,3.2,4.5,1.5,Versicolor
6.9,3.1,4.9,1.5,Versicolor
6.5,3,5.2,2,Virginica
6.3,3.4,5.6,2.4,Virginica
5.8,2.7,5.1,1.9,Virginica
`;

const tipsData = `total_bill,tip,sex,smoker,day,time,size
16.99,1.01,Female,No,Sun,Dinner,2
10.34,1.66,Male,No,Sun,Dinner,3
21.01,3.5,Male,No,Sun,Dinner,3
23.68,3.31,Male,No,Sun,Dinner,2
24.59,3.61,Female,No,Sun,Dinner,4
25.29,4.71,Male,No,Sun,Dinner,4
8.77,2,Male,No,Sun,Dinner,2
26.88,3.12,Male,No,Sun,Dinner,4
15.04,1.96,Male,No,Sun,Dinner,2
14.78,3.22,Male,No,Sun,Dinner,2
`;


export const exampleDatasets: ExampleDataSet[] = [
    {
        id: 'gabor-granger-data',
        name: 'Willingness to Pay',
        description: 'Simulated responses for a Gabor-Granger pricing study.',
        icon: DollarSign,
        analysisTypes: ['gabor-granger'],
        data: gaborGrangerData,
    },
    {
        id: 'dea-bank-data',
        name: 'Bank Branch Efficiency',
        description: 'Inputs and outputs for multiple bank branches. Ideal for Data Envelopment Analysis.',
        icon: BarChart,
        analysisTypes: ['dea', 'stats'],
        data: deaBankData,
    },
     {
        id: 'sna-emails',
        name: 'Email Communication Network',
        description: 'A list of emails sent between individuals in a small organization.',
        icon: Network,
        analysisTypes: ['sna'],
        data: snaData,
    },
    {
        id: 'cbc-data',
        name: 'CBC data',
        description: 'A list of emails sent between individuals in a small organization.',
        icon: Network,
        analysisTypes: ['cbcData'],
        data: cbcData,
    },
    {
        id: 'topic-modeling-reviews',
        name: 'Restaurant Reviews',
        description: 'A collection of 30 customer reviews for text analysis and topic modeling.',
        icon: MessagesSquare,
        analysisTypes: ['topic-modeling', 'sentiment', 'wordcloud'],
        data: restaurantReviewsData,
    },
     {
        id: 'nonlinear-regression',
        name: 'Dose-Response Curve',
        description: 'Simulated data showing response to different doses of a substance.',
        icon: Atom,
        analysisTypes: ['nonlinear-regression', 'stats', 'visuals'],
        recommendedAnalysis: 'nonlinear-regression',
        data: nonlinearRegressionData,
    },
    {
        id: 'time-series',
        name: 'Yearly Sales Data',
        description: 'Yearly sales data, suitable for long-term trend analysis.',
        icon: AreaChart,
        analysisTypes: ['stats', 'trend-analysis', 'seasonal-decomposition', 'moving-average', 'exponential-smoothing', 'arima', 'acf-pacf'],
        data: timeSeriesData,
    },
    {
        id: 'meta-analysis',
        name: 'Meta-Analysis',
        description: 'Sample data for meta-analysis, not loaded from a file.',
        icon: Users,
        analysisTypes: ['meta-analysis'],
        data: metaAnalysisData,
    },
     {
        id: 'ahp',
        name: 'AHP Example',
        description: 'Sample setup for Analytic Hierarchy Process, not loaded from a file.',
        icon: Share2,
        analysisTypes: ['ahp'],
        data: ahpData,
    },
    {
        id: 'crosstab',
        name: 'Market Research',
        description: 'Customer satisfaction data across different product categories and regions.',
        icon: Columns,
        analysisTypes: ['crosstab', 'stats', 'frequency'],
        recommendedAnalysis: 'crosstab',
        data: crosstabData,
    },  
     {
        id: 'turf-analysis',
        name: 'Soda Flavor Preferences',
        description: 'Customer preferences for different soda flavors, ideal for TURF analysis.',
        icon: ThumbsUp,
        analysisTypes: ['turf'],
        data: turfData,
    },
    {
        id: 'rm-anova',
        name: 'Athlete Performance',
        description: 'Performance scores over time for two groups. Ideal for Repeated Measures ANOVA.',
        icon: Repeat,
        analysisTypes: ['rm-anova'],
        data: rmAnovaData,
        recommendedAnalysis: 'repeated-measures-anova'
    },
    {
        id: 'gbm-regression',
        name: 'GBM Regression',
        description: 'House price prediction data, ideal for Gradient Boosting Regression.',
        icon: GitBranch,
        analysisTypes: ['gbm', 'regression', 'stats'],
        data: gbmRegressionData,
    },
    {
        id: 'gbm-classification',
        name: 'GBM Classification',
        description: 'Loan approval prediction data, ideal for Gradient Boosting Classification.',
        icon: GitBranch,
        analysisTypes: ['gbm', 'logistic-regression', 'stats', 'glm'],
        data: gbmClassificationData,
    },
    {
        id: 'ab-test-data',
        name: 'A/B Test Conversion',
        description: 'Time on site for two different website designs. Ideal for A/B testing.',
        icon: FlaskConical,
        analysisTypes: ['t-test', 'stats', 'mann-whitney', 'homogeneity'],
        data: abTestData,
    },
    {
        id: 'two-way-anova',
        name: 'Teaching Method Efficacy',
        description: 'Student scores based on teaching method and gender.',
        icon: Copy,
        analysisTypes: ['two-way-anova', 'stats'],
        recommendedAnalysis: 'two-way-anova',
        data: twoWayAnovaData,
    },
    {
        id: 'survival-churn',
        name: 'Customer Churn',
        description: 'Customer tenure and churn status. Ideal for Survival Analysis.',
        icon: HeartPulse,
        analysisTypes: ['survival', 'stats', 'glm','crosstab'],
        recommendedAnalysis: 'survival',
        data: survivalData,
    },
    {
        id: 'admission-data',
        name: 'University Admissions',
        description: 'GRE scores, GPA, and university rank for student admissions.',
        icon: BookOpen,
        analysisTypes: ['stats', 'logistic-regression', 'correlation', 'glm', 'discriminant'],
        data: admissionData,
    },
     {
        id: 'ipa-restaurant',
        name: 'Restaurant Satisfaction',
        description: 'Customer satisfaction ratings for various aspects of a restaurant experience.',
        icon: Target,
        analysisTypes: ['stats', 'ipa', 'regression'],
        data: ipaRestaurantData
    },
    {
        id: 'conjoint-smartphone',
        name: 'Smartphone Preferences',
        description: 'Simulated user ratings for smartphones with different attributes.',
        icon: Network,
        analysisTypes: ['conjoint', 'stats'],
        data: conjointSmartphoneData
    },
    {
        id: 't-test-suite',
        name: 'T-Test Suite',
        description: 'Data for one-sample, independent, and paired t-tests.',
        icon: Sigma,
        analysisTypes: ['stats', 't-test'],
        data: tTestData,
    },
    {
        id: 'regression-suite',
        name: 'Linear Regression',
        description: 'A simple dataset with a clear linear relationship for regression.',
        icon: TrendingUp,
        analysisTypes: ['stats', 'regression', 'correlation', 'glm', 'nonlinear-regression'],
        data: regressionData,
    },
    {
        id: 'manova-groups',
        name: 'Treatment Groups',
        description: 'Comparing multiple measures across three experimental groups.',
        icon: Users,
        analysisTypes: ['stats', 'manova'],
        data: manovaData,
    },
    {
        id: 'customer-segments',
        name: 'Customer Segments',
        description: 'Age, income, and spending data for customer segmentation.',
        icon: Binary,
        analysisTypes: ['stats', 'hca', 'kmeans', 'correlation', 'pca', 'kmedoids','dbscan','hdbscan','mds'],
        data: customerSegmentsData,
    },

    {
        id: 'stress-support',
        name: 'Stress & Social Support',
        description: 'How social support moderates the effect of stress on performance.',
        icon: TrendingUp,
        analysisTypes: ['stats', 'moderation'],
        data: stressSupportData,
    },
    {
        id: 'work-stress',
        name: 'Work Stress & Performance',
        description: 'Job stress, exhaustion, and performance data. Ideal for Mediation Analysis.',
        icon: Network,
        analysisTypes: ['mediation'],
        data: workStressData,
    },
    {
        id: 'well-being-survey',
        name: 'Well-being Survey',
        description: 'Survey data for Anxiety, Depression, and Stress. Ideal for Reliability, EFA, and PCA.',
        icon: ShieldCheck,
        analysisTypes: ['stats', 'reliability', 'efa', 'pca'],
        data: likertScaleData,
    },
    {
        id: 'nonparametric-suite',
        name: 'Non-Parametric Suite',
        description: 'A unified dataset for Mann-Whitney, Wilcoxon, Kruskal-Wallis, and Friedman tests.',
        icon: FlaskConical,
        analysisTypes: ['stats', 'nonparametric', 'mann-whitney', 'wilcoxon', 'kruskal-wallis', 'friedman', 'mcnemar'],
        data: nonparametricData,
    },
     {
        id: 'mcnemar-test',
        name: 'Ad Campaign Efficacy',
        description: 'Purchase intent before and after an ad campaign. Ideal for McNemar\'s Test.',
        icon: Handshake,
        analysisTypes: ['mcnemar'],
        recommendedAnalysis: 'mcnemar',
        data: mcnemarData,
    },
    {
        id: 'iris',
        name: 'Iris Flowers',
        description: 'Sepal and petal measurements for three species of iris flowers.',
        icon: Users,
        analysisTypes: ['stats', 'correlation', 'one-way-anova', 'visuals', 'discriminant', 'kmeans', 'frequency',  'pca', 'normality', 'homogeneity', 'manova'],
        data: irisData
    },
    {
        id: 'tips',
        name: 'Restaurant Tips',
        description: 'Tips received by a server, along with customer and bill info.',
        icon: Coffee,
        analysisTypes: ['stats', 'one-way-anova', 'two-way-anova', 'visuals', 'frequency', 'normality', 'homogeneity', 't-test'],
        data: tipsData
    },
    {
        id: 'student-performance',
        name: 'Student Performance',
        description: 'Study hours, attendance, and previous scores vs. final exam scores.',
        icon: BookOpen,
        analysisTypes: ['stats', 'visuals', 'ancova', 'normality', 'homogeneity', 'regression'],
        data: studentPerformanceData,
        recommendedAnalysis: 'ancova'
    }
]
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
    dynamicTyping: true,
  });

  if (result.errors.length > 0) {
    console.error("Parsing errors:", result.errors);
    // Optionally throw an error for the first critical error
    const firstError = result.errors[0];
    if (firstError && firstError.code !== 'UndetectableDelimiter') {
       throw new Error(`CSV Parsing Error: ${firstError.message} on row ${firstError.row}`);
    }
  }

  if (!result.data || result.data.length === 0) {
    throw new Error("No parsable data rows found in the file.");
  }
  
  const rawHeaders = (result.meta.fields || []).filter(h => h && h.trim() !== '');
  const data: DataSet = result.data as DataSet;

  const numericHeaders: string[] = [];
  const categoricalHeaders: string[] = [];

  rawHeaders.forEach(header => {
    if (!header) return;
    const values = data.map(row => row[header]).filter(val => val !== null && val !== undefined && val !== '');
    
    // Heuristic to determine if a column is numeric
    const isNumericColumn = values.length > 0 && values.every(val => typeof val === 'number' && isFinite(val));

    if (isNumericColumn) {
        numericHeaders.push(header);
    } else {
        categoricalHeaders.push(header);
    }
  });

  // Ensure types are correct, PapaParse does a good job but we can enforce it.
  const sanitizedData = data.map(row => {
    const newRow: DataPoint = {};
    rawHeaders.forEach(header => {
      if (!header) return;
      const value = row[header];
      if (numericHeaders.includes(header)) {
        if (typeof value === 'number' && isFinite(value)) {
            newRow[header] = value;
        } else if (typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value))) {
            newRow[header] = parseFloat(value);
        } else {
            newRow[header] = NaN; // Use NaN for non-numeric values in numeric columns
        }
      } else { // Categorical
        newRow[header] = (value === null || value === undefined) ? '' : String(value);
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
  profiles?: any[];
}
```