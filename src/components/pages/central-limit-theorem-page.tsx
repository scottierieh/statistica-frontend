
'use client';

import { useState, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, AlertTriangle } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, CartesianGrid, ScatterChart, Scatter, ReferenceLine } from 'recharts';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Skeleton } from '../ui/skeleton';
import { jStat } from 'jstat';

interface SimulationResult {
    population_distribution: number[];
    sample_means_distribution: number[];
    stats: {
        population_mean: number;
        population_std: number;
        sample_mean_of_means: number;
        actual_se: number;
        theoretical_se: number;
    };
    normality_test: {
        statistic: number;
        p_value: number;
    };
    qq_plot_data: {
        osm: number[];
        osr: number[];
    };
}

const StatCard = ({ title, value, delta, helpText }: { title: string, value: string, delta?: string, helpText?: string }) => (
    <Card className="text-center">
        <CardHeader className="pb-2">
            <CardDescription>{title}</CardDescription>
            <CardTitle className="text-2xl font-bold">{value}</CardTitle>
        </CardHeader>
        {delta && <CardContent><p className={`text-xs ${parseFloat(delta) >=0 ? 'text-green-600' : 'text-red-600'}`}>{delta}</p></CardContent>}
    </Card>
);

export default function CentralLimitTheoremPage() {
    const { toast } = useToast();
    const [distribution, setDistribution] = useState("Uniform");
    const [sampleSize, setSampleSize] = useState(30);
    const [numSamples, setNumSamples] = useState(1000);
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<SimulationResult | null>(null);

    const handleRunSimulation = useCallback(async () => {
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/clt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ distribution, sample_size: sampleSize, num_samples: numSamples }),
            });
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || "Failed to run simulation");
            }
            const result: SimulationResult = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Simulation Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [distribution, sampleSize, numSamples, toast]);

    const histogramData = (data: number[]) => {
        if (!data || data.length === 0) return [];
        const n = data.length;
        const iqr = jStat.percentile(data, 0.75) - jStat.percentile(data, 0.25);
        let binWidth;
        if (iqr > 0) {
            binWidth = 2 * iqr * Math.pow(n, -1/3);
        } else {
            const range = Math.max(...data) - Math.min(...data);
            binWidth = range > 0 ? range / 10 : 1;
        }

        const numBins = binWidth > 0 ? Math.min(50, Math.ceil((Math.max(...data) - Math.min(...data)) / binWidth)) : 10;
        
        if (numBins <= 0 || !isFinite(numBins)) {
            return [];
        }

        const [counts, bins] = jStat.histogram(data, numBins);

        return counts.map((count, i) => ({
            range: `${bins[i].toFixed(2)}-${(bins[i] + (bins[1]-bins[0])).toFixed(2)}`,
            count
        }));
    }

    const populationHistData = useMemo(() => histogramData(analysisResult?.population_distribution || []), [analysisResult]);
    const sampleMeansHistData = useMemo(() => histogramData(analysisResult?.sample_means_distribution || []), [analysisResult]);
    
    const qqData = useMemo(() => {
        if (!analysisResult?.qq_plot_data?.osm) return [];
        return analysisResult.qq_plot_data.osm.map((val, i) => ({ x: val, y: analysisResult.qq_plot_data.osr[i] }));
    }, [analysisResult]);
    

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Central Limit Theorem</CardTitle>
                    <CardDescription>Explore how the distribution of sample means tends towards a normal distribution, regardless of the population's shape.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <Label>Population Distribution</Label>
                            <Select value={distribution} onValueChange={setDistribution}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Uniform">Uniform</SelectItem>
                                    <SelectItem value="Normal">Normal</SelectItem>
                                    <SelectItem value="Exponential">Exponential</SelectItem>
                                    <SelectItem value="Skewed (Gamma)">Skewed (Gamma)</SelectItem>
                                    <SelectItem value="Bimodal">Bimodal</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Sample Size (n): {sampleSize}</Label>
                            <Slider value={[sampleSize]} onValueChange={(v) => setSampleSize(v[0])} min={5} max={200} step={5} />
                        </div>
                        <div>
                            <Label>Number of Samples: {numSamples}</Label>
                            <Slider value={[numSamples]} onValueChange={(v) => setNumSamples(v[0])} min={100} max={5000} step={100} />
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleRunSimulation} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin" />Running...</> : <><Play className="mr-2" />Run Simulation</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full" /></CardContent></Card>}

            {analysisResult && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard title="Population Mean (μ)" value={analysisResult.stats.population_mean.toFixed(3)} />
                        <StatCard title="Sample Mean of Means" value={analysisResult.stats.sample_mean_of_means.toFixed(3)} delta={(analysisResult.stats.sample_mean_of_means - analysisResult.stats.population_mean).toFixed(3)} />
                        <StatCard title="Theoretical SE (σ/√n)" value={analysisResult.stats.theoretical_se.toFixed(3)} />
                        <StatCard title="Actual SE of Means" value={analysisResult.stats.actual_se.toFixed(3)} delta={(analysisResult.stats.actual_se - analysisResult.stats.theoretical_se).toFixed(3)} />
                    </div>

                    <div className="grid lg:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader><CardTitle>Population Distribution</CardTitle></CardHeader>
                            <CardContent><ChartContainer config={{count: {label: 'Freq.'}}} className="h-64"><ResponsiveContainer><BarChart data={populationHistData}><CartesianGrid /><XAxis dataKey="range" angle={-45} textAnchor="end" height={50} /><YAxis /><Tooltip content={<ChartTooltipContent />} /><Bar dataKey="count" fill="hsl(var(--chart-1))" /></BarChart></ResponsiveContainer></ChartContainer></CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Sampling Distribution of the Mean</CardTitle></CardHeader>
                             <CardContent><ChartContainer config={{count: {label: 'Freq.'}}} className="h-64"><ResponsiveContainer><BarChart data={sampleMeansHistData}><CartesianGrid /><XAxis dataKey="range" angle={-45} textAnchor="end" height={50} /><YAxis /><Tooltip content={<ChartTooltipContent />} /><Bar dataKey="count" fill="hsl(var(--chart-2))" /></BarChart></ResponsiveContainer></ChartContainer></CardContent>
                        </Card>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader><CardTitle>Normality & CLT Check</CardTitle></CardHeader>
                            <CardContent>
                                <Alert variant={analysisResult.normality_test.p_value > 0.05 ? 'default' : 'destructive'}>
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Shapiro-Wilk Normality Test</AlertTitle>
                                    <AlertDescription>
                                        The distribution of sample means is <strong>{analysisResult.normality_test.p_value > 0.05 ? 'likely normal' : 'likely not normal'}</strong> (p = {analysisResult.normality_test.p_value.toFixed(4)}).
                                    </AlertDescription>
                                </Alert>
                                <Alert className="mt-4" variant={sampleSize >= 30 ? 'default' : 'destructive'}>
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>CLT Condition (n ≥ 30)</AlertTitle>
                                    <AlertDescription>
                                       The sample size of <strong>{sampleSize}</strong> is {sampleSize >= 30 ? 'sufficient' : 'small'}. A larger sample size generally ensures a more normal sampling distribution.
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>
                        <Card>
                             <CardHeader><CardTitle>Q-Q Plot</CardTitle></CardHeader>
                             <CardContent>
                                <ChartContainer config={{}} className="h-64">
                                    <ResponsiveContainer>
                                        <ScatterChart>
                                            <CartesianGrid />
                                            <XAxis type="number" dataKey="x" name="Theoretical Quantiles" />
                                            <YAxis type="number" dataKey="y" name="Sample Quantiles" />
                                            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent />} />
                                            <Scatter name="Quantiles" data={qqData} fill="hsl(var(--primary))" />
                                            {qqData.length > 0 && <ReferenceLine ifOverflow="extendDomain" x={jStat.mean(qqData.map(p => p.x))} y={jStat.mean(qqData.map(p => p.y))} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />}
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                             </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
