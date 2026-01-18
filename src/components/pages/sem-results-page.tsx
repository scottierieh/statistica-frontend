'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';

// This is a simplified interface based on what the Python script provides.
// It should be kept in sync with the actual response.
interface FitIndices {
  chi_square: number;
  df: number;
  p_value: number;
  cfi: number;
  tli: number;
  rmsea: number;
  srmr: number;
  n: number;
  note?: string;
}

interface PathCoefficient {
  path: string;
  estimate: number;
  std_error: number | null;
  t_value: number | null;
  p_value: number | null;
  significant: boolean | null;
  is_r_squared?: boolean;
}

interface LoadingData {
    loadings: Record<string, number>;
    cronbach_alpha: number;
}

interface Interpretation {
    key_insights: { title: string; description: string }[];
    overall_assessment: string;
}

interface AnalysisResults {
  fit_indices: FitIndices;
  measurement_model: Record<string, LoadingData>;
  structural_model: PathCoefficient[];
  path_diagram: string | null;
  loading_heatmap: string | null;
  correlation_matrix: string | null;
  interpretation: Interpretation;
  estimator: string;
  n_observations: number;
}

interface SEMResultsPageProps {
  results: AnalysisResults;
}

const SEMResultsPage: React.FC<SEMResultsPageProps> = ({ results }) => {
    const { fit_indices, measurement_model, structural_model, path_diagram, loading_heatmap, correlation_matrix, interpretation } = results;

    const isGoodFit = (fit_indices.cfi ?? 0) >= 0.90 && (fit_indices.rmsea ?? 1) <= 0.08;

    return (
        <div ref={null} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
            <div className="text-center py-4 border-b">
                <h2 className="text-2xl font-bold">SEM Analysis Report</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    n = {fit_indices.n} | {results.estimator} estimation | {new Date().toLocaleDateString()}
                </p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        Key Findings & Interpretation
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className={`rounded-xl p-6 space-y-4 border ${isGoodFit ? 'bg-green-50 dark:bg-green-950/20 border-green-300' : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300'}`}>
                        <div className="flex items-start gap-3">
                            {isGoodFit ? <CheckCircle2 className="w-6 h-6 text-green-600" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
                            <div>
                                <p className="font-semibold">{isGoodFit ? "Good Model Fit!" : "Model Fit Needs Improvement"}</p>
                                <p className="text-sm text-muted-foreground mt-1">{interpretation.overall_assessment}</p>
                            </div>
                        </div>
                    </div>
                     <div className="space-y-3">
                        {interpretation.key_insights.map((insight, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <span className={`font-bold ${isGoodFit ? 'text-primary' : 'text-amber-600'}`}>•</span>
                                <p className="text-sm"><strong>{insight.title}:</strong> {insight.description}</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Visualizations</CardTitle></CardHeader>
                <CardContent>
                    <Tabs defaultValue="path" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="path">Path Diagram</TabsTrigger>
                            <TabsTrigger value="loadings">Loadings</TabsTrigger>
                            <TabsTrigger value="corr">Correlations</TabsTrigger>
                        </TabsList>
                        <TabsContent value="path" className="mt-4">{path_diagram ? <Image src={`data:image/png;base64,${path_diagram}`} alt="Path Diagram" width={800} height={600} className="w-full rounded-md border" /> : <p className="text-center text-muted-foreground py-8">No path diagram</p>}</TabsContent>
                        <TabsContent value="loadings" className="mt-4">{loading_heatmap ? <Image src={`data:image/png;base64,${loading_heatmap}`} alt="Loading Heatmap" width={800} height={500} className="w-full rounded-md border" /> : <p className="text-center text-muted-foreground py-8">No loading heatmap</p>}</TabsContent>
                        <TabsContent value="corr" className="mt-4">{correlation_matrix ? <Image src={`data:image/png;base64,${correlation_matrix}`} alt="Correlation Matrix" width={800} height={500} className="w-full rounded-md border" /> : <p className="text-center text-muted-foreground py-8">No correlation matrix</p>}</TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Model Fit Indices</CardTitle></CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-center">
                        {[{ label: 'χ²', value: fit_indices.chi_square?.toFixed(2) }, { label: 'df', value: fit_indices.df }, { label: 'CFI', value: fit_indices.cfi?.toFixed(3) }, { label: 'TLI', value: fit_indices.tli?.toFixed(3) }, { label: 'RMSEA', value: fit_indices.rmsea?.toFixed(3) }, { label: 'SRMR', value: fit_indices.srmr?.toFixed(3) }].map((item, i) => (
                            <div key={i} className="p-3 bg-muted/50 rounded-lg">
                                <p className="text-xs text-muted-foreground">{item.label}</p>
                                <p className="text-lg font-semibold">{item.value}</p>
                            </div>
                        ))}
                    </div>
                    {fit_indices.note && <p className="text-xs text-muted-foreground mt-2 text-center">{fit_indices.note}</p>}
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Measurement Model (Factor Loadings)</CardTitle></CardHeader>
                <CardContent>
                    <ScrollArea className="h-[250px]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Latent Variable</TableHead>
                                    <TableHead>Indicator</TableHead>
                                    <TableHead className="text-right">Loading</TableHead>
                                    <TableHead className="text-right">Cronbach α</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Object.entries(measurement_model).map(([latent, data]) => (
                                    data.loadings && Object.entries(data.loadings).map(([ind, load], i) => (
                                        <TableRow key={`${latent}-${ind}`}>
                                            <TableCell className="font-medium">{i === 0 ? latent : ''}</TableCell>
                                            <TableCell>{ind}</TableCell>
                                            <TableCell className="text-right font-mono">
                                                <span className={Math.abs(load) >= 0.7 ? 'text-green-600 font-semibold' : Math.abs(load) >= 0.5 ? '' : 'text-amber-600'}>
                                                    {load.toFixed(3)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {i === 0 ? data.cronbach_alpha?.toFixed(3) : ''}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Structural Model (Path Coefficients)</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Path</TableHead>
                                <TableHead className="text-right">β</TableHead>
                                <TableHead className="text-right">SE</TableHead>
                                <TableHead className="text-right">t</TableHead>
                                <TableHead className="text-right">p</TableHead>
                                <TableHead className="text-right">Sig.</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {structural_model.filter(p => !p.is_r_squared).map((p, i) => (
                                <TableRow key={i} className={p.significant ? 'bg-green-50 dark:bg-green-950/20' : ''}>
                                    <TableCell className="font-medium">{p.path}</TableCell>
                                    <TableCell className="text-right font-mono">{p.estimate?.toFixed(3)}</TableCell>
                                    <TableCell className="text-right font-mono">{p.std_error?.toFixed(3) ?? '-'}</TableCell>
                                    <TableCell className="text-right font-mono">{p.t_value?.toFixed(2) ?? '-'}</TableCell>
                                    <TableCell className="text-right font-mono">
                                        <span className={p.significant ? 'text-green-600 font-semibold' : ''}>
                                            {p.p_value != null ? (p.p_value < 0.001 ? '< .001' : p.p_value.toFixed(3)) : '-'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {p.significant ? <Badge className="bg-green-100 text-green-800">Yes</Badge> : <Badge variant="outline">No</Badge>}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default SEMResultsPage;
