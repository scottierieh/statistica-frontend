
'use client';
import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Sigma } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '../ui/skeleton';
import { ChartContainer, ChartTooltipContent } from '../ui/chart';
import { ResponsiveContainer, LineChart, XAxis, YAxis, Tooltip, Legend, Line, CartesianGrid } from 'recharts';

interface RmAnovaResults {
    anova_results: any[];
    posthoc_results: any[] | null;
    simulated_data: any[];
    params: any;
}

export default function RmAnovaSimulationPage() {
    const { toast } = useToast();
    const [nSubjects, setNSubjects] = useState(40);
    const [nGroups, setNGroups] = useState(2);
    const [nTimes, setNTimes] = useState(4);
    const [effectSize, setEffectSize] = useState(0.5);
    const [groupEffect, setGroupEffect] = useState(0.8);

    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<RmAnovaResults | null>(null);

    const handleRunSimulation = useCallback(async () => {
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/simulation/rm-anova', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ n_subjects: nSubjects, n_groups: nGroups, n_times: nTimes, effect_size: effectSize, group_effect: groupEffect }),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Failed to run simulation');
            }
            const result: RmAnovaResults = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);
            toast({ title: 'Success', description: 'RM ANOVA simulation completed.' });

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Simulation Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [nSubjects, nGroups, nTimes, effectSize, groupEffect, toast]);

    const results = analysisResult;
    const chartData = results?.simulated_data.flatMap(subject => 
        Object.keys(subject).filter(k => k.startsWith('Time')).map(timeKey => ({
            Subject: subject.Subject,
            Group: subject.Group,
            Time: timeKey,
            Score: subject[timeKey]
        }))
    );

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">RM ANOVA Simulation</CardTitle>
                    <CardDescription>Simulate data and run a Repeated Measures ANOVA to understand its principles.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="space-y-4">
                            <Label>Total Subjects: {nSubjects}</Label>
                            <Slider value={[nSubjects]} onValueChange={(v) => setNSubjects(v[0])} min={20} max={200} step={10} />
                        </div>
                        <div className="space-y-4">
                            <Label>Number of Groups: {nGroups}</Label>
                            <Slider value={[nGroups]} onValueChange={(v) => setNGroups(v[0])} min={1} max={4} step={1} />
                        </div>
                        <div className="space-y-4">
                            <Label>Number of Time Points: {nTimes}</Label>
                            <Slider value={[nTimes]} onValueChange={(v) => setNTimes(v[0])} min={2} max={10} step={1} />
                        </div>
                    </div>
                     <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <Label>Time Effect Size: {effectSize.toFixed(2)}</Label>
                            <Slider value={[effectSize]} onValueChange={(v) => setEffectSize(v[0])} min={0} max={2} step={0.1} />
                        </div>
                        <div className="space-y-4">
                            <Label>Group Effect Size: {groupEffect.toFixed(2)}</Label>
                            <Slider value={[groupEffect]} onValueChange={(v) => setGroupEffect(v[0])} min={0} max={2} step={0.1} />
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleRunSimulation} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Running...</> : <><Play className="mr-2 h-4 w-4" />Run Simulation</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full" /></CardContent></Card>}

            {results && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Interaction Plot</CardTitle></CardHeader>
                        <CardContent>
                             <ChartContainer config={{}} className="w-full h-96">
                                <ResponsiveContainer>
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="Time" />
                                        <YAxis />
                                        <Tooltip content={<ChartTooltipContent />} />
                                        <Legend />
                                        {Array.from({length: nGroups}, (_, i) => `Group ${i+1}`).map((group, i) => (
                                            <Line key={group} type="monotone" data={chartData?.filter(d => d.Group === group)} dataKey="Score" name={group} stroke={`hsl(var(--chart-${i+1}))`} />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                    </Card>

                    <Card>
                         <CardHeader><CardTitle>ANOVA Results</CardTitle></CardHeader>
                         <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Source</TableHead>
                                        <TableHead>F</TableHead>
                                        <TableHead>p-unc</TableHead>
                                        <TableHead>p-GG-corr</TableHead>
                                        <TableHead>np2</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.anova_results.map((row, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{row.Source}</TableCell>
                                            <TableCell>{row.F?.toFixed(3)}</TableCell>
                                            <TableCell>{row['p-unc']?.toFixed(4)}</TableCell>
                                            <TableCell>{row['p-GG-corr']?.toFixed(4)}</TableCell>
                                            <TableCell>{row.np2?.toFixed(3)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                         </CardContent>
                    </Card>

                     {results.posthoc_results && (
                        <Card>
                             <CardHeader><CardTitle>Post-Hoc Tests (Pairwise T-tests)</CardTitle></CardHeader>
                             <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Contrast</TableHead>
                                            <TableHead>Time</TableHead>
                                            <TableHead>A</TableHead>
                                            <TableHead>B</TableHead>
                                            <TableHead>p-corr</TableHead>
                                            <TableHead>hedges</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.posthoc_results.map((row, i) => (
                                            <TableRow key={i}>
                                                <TableCell>{row.Contrast}</TableCell>
                                                <TableCell>{row.Time}</TableCell>
                                                <TableCell>{row.A}</TableCell>
                                                <TableCell>{row.B}</TableCell>
                                                <TableCell>{row['p-corr']?.toFixed(4)}</TableCell>
                                                <TableCell>{row.hedges?.toFixed(3)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                             </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
