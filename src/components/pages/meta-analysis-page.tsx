
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Sigma, Loader2, BarChart, LineChart, PieChart, Users, Search } from 'lucide-react';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { ResponsiveContainer, BarChart as RechartsBarChart, LineChart as RechartsLineChart, ScatterChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Bar, Line, Scatter, ReferenceLine, Cell } from 'recharts';
import { exampleDatasets } from '@/lib/example-datasets';
import { Badge } from '../ui/badge';

interface StudyInput {
  id: number;
  name: string;
  effectSize: string;
  standardError: string;
  sampleSize: string;
}

interface AnalysisResults {
    fixedEffect: ModelResult;
    randomEffect: ModelResult;
    heterogeneity: HeterogeneityResult;
    publicationBias: PublicationBiasResult;
    sensitivity: SensitivityResult[];
    studies: AnalyzedStudy[];
}
interface ModelResult { pooledEffect: number; standardError: number; lowerCI: number; upperCI: number; zValue: number; pValue: number; }
interface HeterogeneityResult { qStatistic: number; df: number; qPValue: number; iSquared: number; tauSquared: number; }
interface PublicationBiasResult { intercept: number; pValue: number; significant: boolean; }
interface SensitivityResult { excluded_study: string; fixed_effect: number; random_effect: number; }
interface AnalyzedStudy { name: string; effectSize: number; standardError: number; sampleSize: number; weight: number; variance: number; random_weight: number; }

const StepIndicator = ({ currentStep }: { currentStep: number }) => {
    const steps = ['Setup', 'Data Input', 'Results', 'Visualization'];
    return (
        <div className="flex justify-center items-center gap-4 mb-8">
            {steps.map((step, index) => (
                <div key={index} className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${currentStep > index + 1 ? 'bg-green-500 text-white' : currentStep === index + 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        {index + 1}
                    </div>
                    <span className={`${currentStep >= index + 1 ? 'text-foreground' : 'text-muted-foreground'}`}>{step}</span>
                    {index < steps.length - 1 && <div className="w-12 h-0.5 bg-border" />}
                </div>
            ))}
        </div>
    );
};

const ForestPlot = ({ studies, fixed, random }: { studies: AnalyzedStudy[], fixed: ModelResult, random: ModelResult }) => {
    const chartData = [
        ...studies.map(s => ({ 
            name: s.name, 
            es: s.effectSize, 
            ci: [s.effectSize - 1.96 * s.standardError, s.effectSize + 1.96 * s.standardError], 
            weight: random.pooledEffect ? (1 / (s.variance + random.standardError**2)) : s.weight
        })),
        { name: 'Fixed Effect', es: fixed.pooledEffect, ci: [fixed.lowerCI, fixed.upperCI], weight: studies.reduce((s, st) => s + st.weight, 0) },
        { name: 'Random Effect', es: random.pooledEffect, ci: [random.lowerCI, random.upperCI], weight: studies.reduce((s, st) => s + (1 / (st.variance + random.standardError**2)), 0) },
    ].reverse();

    return (
        <ChartContainer config={{}} className="w-full h-[400px]">
            <ResponsiveContainer>
                <ScatterChart margin={{ top: 20, right: 30, left: 100, bottom: 20 }}>
                    <CartesianGrid />
                    <XAxis type="number" dataKey="es" name="Effect Size" />
                    <YAxis type="category" dataKey="name" width={150} tick={{fontSize: 12}} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <ReferenceLine x={0} stroke="#888" strokeDasharray="3 3" />
                    <Scatter data={chartData} fill="hsl(var(--primary))">
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.name.includes('Effect') ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'} />
                        ))}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>
        </ChartContainer>
    )
}

const InterpretationSection = ({ results, settings }: { results: AnalysisResults, settings: any }) => {
    const { randomEffect, heterogeneity, publicationBias, studies } = results;

    const getEffectSizeInterpretation = (effectSize: number, type: string) => {
        const absEffect = Math.abs(effectSize);
        if (type === 'correlation') {
            if (absEffect >= 0.5) return "large";
            if (absEffect >= 0.3) return "medium";
            if (absEffect >= 0.1) return "small";
            return "negligible";
        }
        // Assuming Cohen's d or similar
        if (absEffect >= 0.8) return "large";
        if (absEffect >= 0.5) return "medium";
        if (absEffect >= 0.2) return "small";
        return "negligible";
    };

    const getHeterogeneityInterpretation = (iSquared: number) => {
        if (iSquared > 75) return "high";
        if (iSquared > 50) return "substantial";
        if (iSquared > 25) return "moderate";
        return "low";
    };

    const effectSizeInterp = getEffectSizeInterpretation(randomEffect.pooledEffect, settings.effectSizeType);
    const heterogeneityInterp = getHeterogeneityInterpretation(heterogeneity.iSquared);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Search />
                    Interpretation
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-1">
                    <h4 className="font-semibold">Pooled Effect Size</h4>
                    <p className="text-sm text-muted-foreground">
                        The overall pooled effect size under the random-effects model is <strong>{randomEffect.pooledEffect.toFixed(3)}</strong>, which is considered a <strong>{effectSizeInterp}</strong> effect.
                    </p>
                </div>

                 <div className="space-y-1">
                    <h4 className="font-semibold">Statistical Significance</h4>
                    <p className="text-sm text-muted-foreground">
                        The effect is <strong>{randomEffect.pValue < 0.05 ? 'statistically significant' : 'not statistically significant'}</strong> (p = {randomEffect.pValue.toFixed(4)}), with the 95% confidence interval ranging from {randomEffect.lowerCI.toFixed(3)} to {randomEffect.upperCI.toFixed(3)}.
                    </p>
                </div>

                <div className="space-y-1">
                    <h4 className="font-semibold">Heterogeneity</h4>
                    <p className="text-sm text-muted-foreground">
                        There is <strong>{heterogeneityInterp}</strong> heterogeneity among the studies (I² = {heterogeneity.iSquared.toFixed(1)}%). This suggests that {heterogeneityInterp === 'low' ? 'most of the variability is due to sampling error rather than true differences between studies.' : 'a significant portion of the variability is due to true differences between study outcomes.'}
                    </p>
                </div>

                 <div className="space-y-1">
                    <h4 className="font-semibold">Publication Bias</h4>
                    <p className="text-sm text-muted-foreground">
                        Egger's test intercept is {publicationBias.intercept.toFixed(4)}. Based on this, publication bias is <strong>{publicationBias.significant ? 'suspected' : 'not detected'}</strong>.
                    </p>
                </div>
                
                 <div className="space-y-2">
                    <h4 className="font-semibold">Recommendations</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                        {heterogeneity.iSquared > 50 ? (
                            <li>Given the {heterogeneityInterp} heterogeneity, the random-effects model is appropriate. Consider subgroup analysis to explore the source of variation.</li>
                        ) : (
                            <li>With low heterogeneity, both fixed and random-effects models provide similar results, increasing confidence in the findings.</li>
                        )}
                        {publicationBias.significant && <li>Publication bias is suspected. Interpret results with caution and consider searching for unpublished studies (grey literature).</li>}
                        {studies.length < 10 && <li>The number of studies is small, which may limit the generalizability of these findings.</li>}
                    </ul>
                </div>

            </CardContent>
        </Card>
    );
}

export default function MetaAnalysisPage({ onLoadExample }: { onLoadExample: (example: any) => void }) {
    const { toast } = useToast();
    const [currentStep, setCurrentStep] = useState(1);
    const [numStudies, setNumStudies] = useState(5);
    const [studyInputs, setStudyInputs] = useState<StudyInput[]>([]);
    
    const [analysisSettings, setAnalysisSettings] = useState({
        title: 'My Meta-Analysis',
        effectSizeType: 'cohen_d',
        analysisModel: 'random',
    });
    
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResults | null>(null);

    const createInputs = useCallback((count: number) => {
        const newInputs = Array.from({ length: count }, (_, i) => ({
            id: i,
            name: `Study ${i + 1}`,
            effectSize: '',
            standardError: '',
            sampleSize: ''
        }));
        setStudyInputs(newInputs);
    }, []);
    
    useEffect(() => {
        createInputs(numStudies);
    }, [numStudies, createInputs]);

    const handleLoadSample = () => {
        setNumStudies(6);
        setAnalysisSettings({
            title: "Online Learning Meta-Analysis",
            effectSizeType: "cohen_d",
            analysisModel: 'random',
        });
        const sampleData = [
            { id: 0, name: "Kim et al. (2020)", effectSize: '0.45', standardError: '0.12', sampleSize: '120' },
            { id: 1, name: "Lee et al. (2021)", effectSize: '0.32', standardError: '0.15', sampleSize: '95' },
            { id: 2, name: "Park et al. (2019)", effectSize: '0.67', standardError: '0.18', sampleSize: '80' },
            { id: 3, name: "Choi et al. (2022)", effectSize: '0.28', standardError: '0.11', sampleSize: '150' },
            { id: 4, name: "Jung et al. (2020)", effectSize: '0.52', standardError: '0.14', sampleSize: '110' },
            { id: 5, name: "Song et al. (2021)", effectSize: '0.38', standardError: '0.13', sampleSize: '130' }
        ];
        setStudyInputs(sampleData);
    };

    const handleInputChange = (id: number, field: keyof StudyInput, value: string) => {
        const newInputs = [...studyInputs];
        const study = newInputs.find(s => s.id === id);
        if (study) {
            (study[field] as any) = value;
            setStudyInputs(newInputs);
        }
    };
    
    const runAnalysis = async () => {
        const studies = studyInputs.map(s => ({
            name: s.name,
            effectSize: parseFloat(s.effectSize),
            standardError: parseFloat(s.standardError),
            sampleSize: parseInt(s.sampleSize)
        })).filter(s => !isNaN(s.effectSize) && !isNaN(s.standardError) && !isNaN(s.sampleSize));

        if (studies.length < 2) {
            toast({ title: 'Not enough data', description: 'Please enter data for at least two studies.', variant: 'destructive' });
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('/api/analysis/meta', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studies })
            });

            if (!response.ok) throw new Error('Analysis failed');
            const result = await response.json();
            if(result.error) throw new Error(result.error);
            setAnalysisResult(result.results);
            setCurrentStep(3);
        } catch (error: any) {
            toast({ title: 'Analysis Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const nextMetaStep = (step: number) => {
        setCurrentStep(step);
    };

    return (
        <div className="space-y-4">
            <StepIndicator currentStep={currentStep} />
            
            {currentStep === 1 && (
                <Card>
                    <CardHeader><CardTitle>1. Meta-Analysis Setup</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                           <div><Label>Analysis Title</Label><Input value={analysisSettings.title} onChange={e => setAnalysisSettings(s => ({...s, title: e.target.value}))} /></div>
                           <div><Label>Effect Size Type</Label><Select value={analysisSettings.effectSizeType} onValueChange={(v) => setAnalysisSettings(s => ({...s, effectSizeType: v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="cohen_d">Cohen's d</SelectItem><SelectItem value="hedges_g">Hedges' g</SelectItem><SelectItem value="odds_ratio">Odds Ratio</SelectItem><SelectItem value="correlation">Correlation</SelectItem></SelectContent></Select></div>
                           <div><Label>Number of Studies</Label><Input type="number" value={numStudies} onChange={e => setNumStudies(Math.max(2, parseInt(e.target.value) || 2))} min="2" /></div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="outline" onClick={handleLoadSample}>Load Sample Data</Button>
                        <Button onClick={() => nextMetaStep(2)}>Next: Data Input</Button>
                    </CardFooter>
                </Card>
            )}

            {currentStep === 2 && (
                <Card>
                    <CardHeader><CardTitle>2. Data Input</CardTitle></CardHeader>
                    <CardContent>
                        <ScrollArea className="h-72">
                        {studyInputs.map(study => (
                            <div key={study.id} className="grid grid-cols-4 gap-2 items-center mb-2 border-b pb-2">
                                <Input placeholder="Study Name" value={study.name} onChange={e => handleInputChange(study.id, 'name', e.target.value)} />
                                <Input type="number" placeholder="Effect Size" value={study.effectSize} onChange={e => handleInputChange(study.id, 'effectSize', e.target.value)} />
                                <Input type="number" placeholder="Std. Error" value={study.standardError} onChange={e => handleInputChange(study.id, 'standardError', e.target.value)} />
                                <Input type="number" placeholder="Sample Size" value={study.sampleSize} onChange={e => handleInputChange(study.id, 'sampleSize', e.target.value)} />
                            </div>
                        ))}
                        </ScrollArea>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="outline" onClick={() => nextMetaStep(1)}>Back</Button>
                        <Button onClick={runAnalysis} disabled={isLoading}>{isLoading ? <Loader2 className="animate-spin mr-2"/> : <Sigma className="mr-2"/>}Run Analysis</Button>
                    </CardFooter>
                </Card>
            )}

            {currentStep === 3 && analysisResult && (
                <Card>
                    <CardHeader><CardTitle>3. Analysis Results</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            {analysisResult.fixedEffect && <Card><CardHeader><CardTitle>Fixed-Effect Model</CardTitle></CardHeader><CardContent><p>Pooled Effect: <strong>{analysisResult.fixedEffect.pooledEffect.toFixed(3)}</strong></p><p>95% CI: [{analysisResult.fixedEffect.lowerCI.toFixed(3)}, {analysisResult.fixedEffect.upperCI.toFixed(3)}]</p><p>p-value: {analysisResult.fixedEffect.pValue.toFixed(4)}</p></CardContent></Card>}
                            {analysisResult.randomEffect && <Card><CardHeader><CardTitle>Random-Effects Model</CardTitle></CardHeader><CardContent><p>Pooled Effect: <strong>{analysisResult.randomEffect.pooledEffect.toFixed(3)}</strong></p><p>95% CI: [{analysisResult.randomEffect.lowerCI.toFixed(3)}, {analysisResult.randomEffect.upperCI.toFixed(3)}]</p><p>p-value: {analysisResult.randomEffect.pValue.toFixed(4)}</p></CardContent></Card>}
                        </div>
                        <Card><CardHeader><CardTitle>Heterogeneity</CardTitle></CardHeader><CardContent><p>Q-Statistic: {analysisResult.heterogeneity.qStatistic.toFixed(2)} (p={analysisResult.heterogeneity.qPValue.toFixed(4)})</p><p>I²: {analysisResult.heterogeneity.iSquared.toFixed(1)}%</p><p>τ²: {analysisResult.heterogeneity.tauSquared.toFixed(4)}</p></CardContent></Card>
                        {analysisResult.publicationBias.intercept && (
                            <Card><CardHeader><CardTitle>Publication Bias (Egger's Test)</CardTitle></CardHeader><CardContent><p>Intercept: {analysisResult.publicationBias.intercept.toFixed(4)} (p={analysisResult.publicationBias.pValue.toFixed(4)})</p><p>Bias detected: <Badge variant={analysisResult.publicationBias.significant ? 'destructive' : 'default'}>{analysisResult.publicationBias.significant ? 'Yes' : 'No'}</Badge></p></CardContent></Card>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="outline" onClick={() => nextMetaStep(2)}>Back</Button>
                        <Button onClick={() => nextMetaStep(4)}>Next: Visualization</Button>
                    </CardFooter>
                </Card>
            )}

            {currentStep === 4 && analysisResult && (
                <Card>
                    <CardHeader><CardTitle>4. Visualization & Interpretation</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        <Card><CardHeader><CardTitle>Forest Plot</CardTitle></CardHeader><CardContent><ForestPlot studies={analysisResult.studies} fixed={analysisResult.fixedEffect} random={analysisResult.randomEffect} /></CardContent></Card>
                        <div className="grid md:grid-cols-2 gap-4">
                           <Card><CardHeader><CardTitle>Funnel Plot (Publication Bias)</CardTitle></CardHeader><CardContent><ChartContainer config={{}} className="w-full h-[300px]"><ResponsiveContainer><ScatterChart><CartesianGrid /><XAxis type="number" dataKey="effectSize" name="Effect Size" /><YAxis type="number" dataKey="precision" name="Precision (1/SE)" domain={[0, 'auto']}/><Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent />} /><Scatter data={analysisResult.studies.map(s => ({ effectSize: s.effectSize, precision: 1/s.standardError }))} fill="hsl(var(--primary))" /></ScatterChart></ResponsiveContainer></ChartContainer></CardContent></Card>
                           <Card><CardHeader><CardTitle>Sensitivity Analysis</CardTitle></CardHeader><CardContent><ChartContainer config={{}} className="w-full h-[300px]"><ResponsiveContainer><RechartsLineChart data={analysisResult.sensitivity}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="excluded_study" tick={false}/><YAxis domain={['auto', 'auto']}/><Tooltip content={<ChartTooltipContent />} /><Line type="monotone" dataKey="random_effect" name="Random Effect" stroke="hsl(var(--primary))"/></RechartsLineChart></ResponsiveContainer></ChartContainer></CardContent></Card>
                        </div>
                        <InterpretationSection results={analysisResult} settings={analysisSettings} />
                    </CardContent>
                    <CardFooter className="flex justify-start">
                        <Button variant="outline" onClick={() => nextMetaStep(3)}>Back to Results</Button>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}
