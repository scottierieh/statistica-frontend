'use client';
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Plus, Trash2, Component, TrendingUp, TrendingDown, Target, Wallet } from 'lucide-react';
import { produce } from 'immer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface Asset {
    id: string;
    name: string;
    expected_return: string;
    volatility: string;
}

interface PortfolioResult {
    optimal_weights: { [key: string]: number };
    portfolio_return: number;
    portfolio_volatility: number;
}

export default function ConvexOptimizationPage() {
    const { toast } = useToast();
    
    const [assets, setAssets] = useState<Asset[]>([
        { id: 'asset-1', name: 'Stock A', expected_return: '0.12', volatility: '0.20' },
        { id: 'asset-2', name: 'Stock B', expected_return: '0.10', volatility: '0.18' },
        { id: 'asset-3', name: 'Bonds', expected_return: '0.04', volatility: '0.05' },
    ]);
    const [correlationMatrix, setCorrelationMatrix] = useState<string[][]>([
        ['1', '0.2', '0.1'],
        ['0.2', '1', '0.3'],
        ['0.1', '0.3', '1'],
    ]);
    const [targetReturn, setTargetReturn] = useState('0.10');

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<PortfolioResult | null>(null);

    const updateMatrixSize = (size: number) => {
        setCorrelationMatrix(current => {
            const newMatrix = Array(size).fill(0).map(() => Array(size).fill('0'));
            for(let i=0; i<size; i++) newMatrix[i][i] = '1';
            for(let i=0; i<Math.min(size, current.length); i++) {
                for(let j=0; j<Math.min(size, current[i].length); j++) {
                    newMatrix[i][j] = current[i][j];
                }
            }
            return newMatrix;
        });
    };
    
    const addAsset = () => {
        setAssets(prev => [...prev, { id: `asset-${Date.now()}`, name: `Asset ${prev.length + 1}`, expected_return: '0.08', volatility: '0.15' }]);
        updateMatrixSize(assets.length + 1);
    };
    
    const removeAsset = (index: number) => {
        setAssets(prev => prev.filter((_, i) => i !== index));
        updateMatrixSize(assets.length - 1);
    };

    const handleAssetChange = (index: number, field: keyof Asset, value: string) => {
        setAssets(produce(draft => { draft[index][field] = value }));
    };

    const handleCorrelationChange = (rowIndex: number, colIndex: number, value: string) => {
        setCorrelationMatrix(produce(draft => {
            draft[rowIndex][colIndex] = value;
            if (rowIndex !== colIndex) draft[colIndex][rowIndex] = value; // Symmetric matrix
        }));
    };

    const handleSolve = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const payload = {
                assets: assets.map(a => ({
                    name: a.name,
                    expected_return: parseFloat(a.expected_return),
                    volatility: parseFloat(a.volatility)
                })),
                correlation_matrix: correlationMatrix.map(row => row.map(Number)),
                target_return: parseFloat(targetReturn)
            };
            
            if (payload.assets.some(a => isNaN(a.expected_return) || isNaN(a.volatility))) throw new Error("Asset data must be valid numbers.");
            if (payload.correlation_matrix.flat().some(isNaN)) throw new Error("Correlation matrix must contain valid numbers.");
            if (isNaN(payload.target_return)) throw new Error("Target return must be a valid number.");

            const response = await fetch('/api/analysis/convex-optimization', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const res = await response.json();
            if (!response.ok || res.error) throw new Error(res.error || 'Failed to solve.');
            
            setResult(res.results);
            toast({ title: "Success", description: "Portfolio optimized successfully." });

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Component />Convex Optimization: Portfolio Theory</CardTitle>
                    <CardDescription>Optimize asset allocation to minimize risk for a target rate of return, based on Markowitz Portfolio Theory.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label className="font-semibold">Assets</Label>
                        <Table>
                            <TableHeader><TableRow><TableHead>Asset Name</TableHead><TableHead>Expected Return (%)</TableHead><TableHead>Volatility (Std. Dev %)</TableHead><TableHead /></TableRow></TableHeader>
                            <TableBody>
                                {assets.map((asset, i) => (
                                    <TableRow key={asset.id}>
                                        <TableCell><Input value={asset.name} onChange={e => handleAssetChange(i, 'name', e.target.value)} /></TableCell>
                                        <TableCell><Input type="number" value={asset.expected_return} onChange={e => handleAssetChange(i, 'expected_return', e.target.value)} /></TableCell>
                                        <TableCell><Input type="number" value={asset.volatility} onChange={e => handleAssetChange(i, 'volatility', e.target.value)} /></TableCell>
                                        <TableCell><Button variant="ghost" size="icon" onClick={() => removeAsset(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <Button variant="outline" size="sm" onClick={addAsset}><Plus className="mr-2"/> Add Asset</Button>
                    </div>
                    
                    <div className="space-y-2">
                        <Label className="font-semibold">Correlation Matrix</Label>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead/>
                                        {assets.map((a, i) => <TableHead key={i}>{a.name}</TableHead>)}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {correlationMatrix.map((row, i) => (
                                        <TableRow key={i}>
                                            <TableHead>{assets[i].name}</TableHead>
                                            {row.map((val, j) => (
                                                <TableCell key={j}>
                                                    <Input type="number" value={val} disabled={i === j} onChange={e => handleCorrelationChange(i, j, e.target.value)} />
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    <div className="p-4 border rounded-lg bg-muted/50 max-w-sm">
                        <Label>Target Return (%)</Label>
                        <Input type="number" value={targetReturn} onChange={e => setTargetReturn(e.target.value)} placeholder="e.g., 0.10 for 10%" className="mt-1"/>
                    </div>

                    <Button onClick={handleSolve} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Play className="mr-2 h-4 w-4"/>}
                        Optimize
                    </Button>
                </CardContent>
            </Card>

            {result && (
                <Card>
                    <CardHeader><CardTitle>Optimal Portfolio</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="p-4 border rounded-lg bg-primary/10"><p className="text-sm text-primary font-semibold">Expected Return</p><p className="text-3xl font-bold">{(result.portfolio_return * 100).toFixed(2)}%</p></div>
                            <div className="p-4 border rounded-lg bg-muted/50"><p className="text-sm text-muted-foreground">Portfolio Volatility</p><p className="text-3xl font-bold">{(result.portfolio_volatility * 100).toFixed(2)}%</p></div>
                            <div className="p-4 border rounded-lg bg-muted/50"><p className="text-sm text-muted-foreground">Sharpe Ratio</p><p className="text-3xl font-bold">{(result.portfolio_return / result.portfolio_volatility).toFixed(2)}</p></div>
                        </div>

                        <Plot
                            data={[{
                                labels: Object.keys(result.optimal_weights),
                                values: Object.values(result.optimal_weights).map(v => v * 100),
                                type: 'pie',
                                hole: 0.4,
                            }]}
                            layout={{
                                title: 'Optimal Asset Allocation',
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
