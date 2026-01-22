'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldAlert, Play } from "lucide-react";
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface CvaResult {
  cva: number;
  dva: number;
  xva: number;
  base_npv: number;
  adjusted_npv: number;
  ee_profile: number[];
  ene_profile: number[];
  time_grid: number[];
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

export default function CreditRiskPage() {
    const { toast } = useToast();

    // State for inputs
    const [spotPrice, setSpotPrice] = useState('100');
    const [strikePrice, setStrikePrice] = useState('100');
    const [volatility, setVolatility] = useState('0.2');
    const [riskFreeRate, setRiskFreeRate] = useState('0.05');
    const [maturityYears, setMaturityYears] = useState('1');
    const [optionType, setOptionType] = useState('call');
    
    const [hazardRateCp, setHazardRateCp] = useState('0.02');
    const [recoveryRateCp, setRecoveryRateCp] = useState('0.4');
    const [hazardRateOwn, setHazardRateOwn] = useState('0.01');
    
    const [timeSteps, setTimeSteps] = useState('52');
    const [numPaths, setNumPaths] = useState('1000');

    // State for results
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<CvaResult | null>(null);

    const handleCalculate = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const payload = {
                spot_price: parseFloat(spotPrice),
                strike_price: parseFloat(strikePrice),
                volatility: parseFloat(volatility),
                risk_free_rate: parseFloat(riskFreeRate),
                maturity_years: parseInt(maturityYears),
                option_type: optionType,
                hazard_rate_cp: parseFloat(hazardRateCp),
                recovery_rate_cp: parseFloat(recoveryRateCp),
                hazard_rate_own: parseFloat(hazardRateOwn),
                time_steps: parseInt(timeSteps),
                num_paths: parseInt(numPaths),
            };

            const response = await fetch('/api/analysis/credit-risk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const res = await response.json();
            if (!response.ok || res.error) {
                throw new Error(res.error || "Failed to calculate CVA/DVA.");
            }

            setResult(res.results);
            toast({ title: "Calculation Complete", description: `CVA: ${formatCurrency(res.results.cva)} | DVA: ${formatCurrency(res.results.dva)}` });

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldAlert className="w-6 h-6 text-primary" />
                        Credit & Debt Value Adjustment (CVA/DVA)
                    </CardTitle>
                    <CardDescription>
                        Calculate CVA and DVA for a European option using Monte Carlo simulation.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Input Sections */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-4 p-4 border rounded-lg">
                            <h3 className="font-semibold text-sm">Option Parameters</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div><Label>Spot Price</Label><Input value={spotPrice} onChange={e => setSpotPrice(e.target.value)} /></div>
                                <div><Label>Strike Price</Label><Input value={strikePrice} onChange={e => setStrikePrice(e.target.value)} /></div>
                                <div><Label>Volatility (σ)</Label><Input value={volatility} onChange={e => setVolatility(e.target.value)} /></div>
                                <div><Label>Risk-Free Rate (r)</Label><Input value={riskFreeRate} onChange={e => setRiskFreeRate(e.target.value)} /></div>
                                <div><Label>Maturity (Yrs)</Label><Input type="number" value={maturityYears} onChange={e => setMaturityYears(e.target.value)} /></div>
                                <div>
                                    <Label>Type</Label>
                                    <Select value={optionType} onValueChange={setOptionType}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="call">Call</SelectItem><SelectItem value="put">Put</SelectItem></SelectContent></Select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 p-4 border rounded-lg">
                            <h3 className="font-semibold text-sm">Risk Parameters</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div><Label>CP Hazard Rate (λ)</Label><Input value={hazardRateCp} onChange={e => setHazardRateCp(e.target.value)} /></div>
                                <div><Label>CP Recovery (R)</Label><Input value={recoveryRateCp} onChange={e => setRecoveryRateCp(e.target.value)} /></div>
                                <div><Label>Own Hazard Rate (λ)</Label><Input value={hazardRateOwn} onChange={e => setHazardRateOwn(e.target.value)} /></div>
                            </div>
                        </div>

                        <div className="space-y-4 p-4 border rounded-lg">
                            <h3 className="font-semibold text-sm">Simulation Parameters</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div><Label>Time Steps</Label><Input type="number" value={timeSteps} onChange={e => setTimeSteps(e.target.value)} /></div>
                                <div><Label>Monte Carlo Paths</Label><Input type="number" value={numPaths} onChange={e => setNumPaths(e.target.value)} /></div>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleCalculate} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                        Calculate
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && (
                <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            )}

            {result && (
                <Card>
                    <CardHeader>
                        <CardTitle>Analysis Results</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                            <MetricCard label="Risk-Free NPV" value={formatCurrency(result.base_npv)} />
                            <MetricCard label="CVA" value={formatCurrency(result.cva)} negative />
                            <MetricCard label="DVA" value={formatCurrency(result.dva)} positive />
                            <MetricCard label="Adjusted NPV (XVA)" value={formatCurrency(result.adjusted_npv)} highlight />
                        </div>

                        <Plot
                            data={[
                                { x: result.time_grid, y: result.ee_profile, type: 'scatter', mode: 'lines', name: 'Expected Exposure (EE)', line: { color: '#ef4444' } },
                                { x: result.time_grid, y: result.ene_profile, type: 'scatter', mode: 'lines', name: 'Expected Negative Exposure (ENE)', line: { color: '#3b82f6' } },
                            ]}
                            layout={{
                                title: 'Expected Exposure Profiles Over Time',
                                xaxis: { title: 'Time (Years)' },
                                yaxis: { title: 'Exposure ($)' },
                                autosize: true,
                                height: 400
                            }}
                            useResizeHandler
                            className="w-full"
                        />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

const MetricCard: React.FC<{ label: string; value: string; positive?: boolean; negative?: boolean; highlight?: boolean; }> = ({ label, value, positive, negative, highlight }) => (
    <div className={`p-4 border rounded-lg ${highlight ? 'bg-primary/10' : 'bg-muted/50'}`}>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold ${positive ? 'text-green-600' : negative ? 'text-red-600' : ''}`}>
            {positive && '+'}
            {negative && '-'}
            {value}
        </p>
    </div>
);
