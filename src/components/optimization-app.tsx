'use client';

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Sigma, Loader2, PlayCircle, FileJson } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface SimplexIteration {
    title: string;
    tableau: number[][];
}

interface AnalysisResult {
    solution: { [key: string]: number };
    optimal_value: number;
    objective_function_str: string;
    constraints_str: string[];
    iterations: SimplexIteration[];
}

const defaultProblem = {
    c: [3, 2],
    A: [[1, 1], [1, 0], [0, 1]],
    b: [4, 2, 3]
};

export default function OptimizationApp() {
    const { toast } = useToast();
    const [numVars, setNumVars] = useState(2);
    const [numConstraints, setNumConstraints] = useState(3);
    
    const [c, setC] = useState<number[]>(defaultProblem.c);
    const [A, setA] = useState<number[][]>(defaultProblem.A);
    const [b, setB] = useState<number[]>(defaultProblem.b);

    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    
    const handleBoardCreate = () => {
        setC(Array(numVars).fill(0));
        setA(Array(numConstraints).fill(0).map(() => Array(numVars).fill(0)));
        setB(Array(numConstraints).fill(0));
        setAnalysisResult(null);
    };

    const loadExample = () => {
        setNumVars(2);
        setNumConstraints(3);
        setC(defaultProblem.c);
        setA(defaultProblem.A);
        setB(defaultProblem.b);
        setAnalysisResult(null);
    };

    const handleInputChange = (type: 'c' | 'A' | 'b', index: number, subIndex?: number, value?: string) => {
        const numValue = value !== undefined ? parseFloat(value) : 0;
        if (isNaN(numValue)) return;

        if (type === 'c') {
            const newC = [...c];
            newC[index] = numValue;
            setC(newC);
        } else if (type === 'b') {
            const newB = [...b];
            newB[index] = numValue;
            setB(newB);
        } else if (type === 'A' && subIndex !== undefined) {
            const newA = A.map(row => [...row]);
            newA[index][subIndex] = numValue;
            setA(newA);
        }
    };
    
    const runAnalysis = useCallback(async () => {
        setIsLoading(true);
        setAnalysisResult(null);
        try {
            const response = await fetch('/api/analysis/linear-programming', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ c, A, b })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to run analysis');
            }
            
            const data = await response.json();
            if(data.error) throw new Error(data.error);

            setAnalysisResult(data.results);

        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Analysis Failed',
                description: error.message
            });
        } finally {
            setIsLoading(false);
        }
    }, [c, A, b, toast]);

    const tableHeaders = useMemo(() => {
        const headers = ['행/열'];
        for (let i = 1; i <= numVars; i++) headers.push(`x${i}`);
        for (let i = 1; i <= numConstraints; i++) headers.push(`s${i}`);
        headers.push('RHS');
        return headers;
    }, [numVars, numConstraints]);

    return (
        <div className="p-4 md:p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">선형계획법 (Simplex 알고리즘) 보드</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Label htmlFor="num-vars">변수 개수:</Label>
                        <Input id="num-vars" type="number" value={numVars} onChange={e => setNumVars(Number(e.target.value))} className="w-20" min="1"/>
                    </div>
                    <div className="flex items-center gap-2">
                        <Label htmlFor="num-constraints">제약 개수:</Label>
                        <Input id="num-constraints" type="number" value={numConstraints} onChange={e => setNumConstraints(Number(e.target.value))} className="w-20" min="1"/>
                    </div>
                    <Button onClick={handleBoardCreate}>입력 보드 만들기</Button>
                    <Button onClick={loadExample} variant="outline">예제 불러오기</Button>
                    <Button onClick={runAnalysis} disabled={isLoading}>
                         {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                        단계별 단순형 실행
                    </Button>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">문제 설정</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label>목표식 계수 (Max Z)</Label>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {Array.from({ length: numVars }).map((_, i) => (
                                    <div key={`c${i}`} className="flex items-center gap-1">
                                        <Label htmlFor={`c${i+1}`} className="text-sm">c{i+1}:</Label>
                                        <Input id={`c${i+1}`} type="number" value={c[i] ?? ''} onChange={e => handleInputChange('c', i, undefined, e.target.value)} className="w-20 h-8"/>
                                    </div>
                                ))}
                            </div>
                        </div>
                         <div>
                            <Label>제약식 (Σ aᵢⱼxⱼ ≤ bᵢ)</Label>
                            <div className="space-y-2 mt-2">
                                {Array.from({ length: numConstraints }).map((_, i) => (
                                    <div key={`con${i}`} className="flex flex-wrap items-center gap-2">
                                         {Array.from({ length: numVars }).map((_, j) => (
                                             <div key={`a${i}${j}`} className="flex items-center gap-1">
                                                <Label htmlFor={`a${i+1}${j+1}`} className="text-sm">a{i+1}{j+1}:</Label>
                                                <Input id={`a${i+1}${j+1}`} type="number" value={A[i]?.[j] ?? ''} onChange={e => handleInputChange('A', i, j, e.target.value)} className="w-20 h-8"/>
                                            </div>
                                         ))}
                                          <div className="flex items-center gap-1">
                                            <Label htmlFor={`b${i+1}`} className="text-sm">b{i+1}:</Label>
                                            <Input id={`b${i+1}`} type="number" value={b[i] ?? ''} onChange={e => handleInputChange('b', i, undefined, e.target.value)} className="w-20 h-8"/>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <div className="space-y-6">
                     <Card>
                        <CardHeader><CardTitle className="text-lg">목표식</CardTitle></CardHeader>
                        <CardContent>
                            <p className="font-mono text-lg">{analysisResult?.objective_function_str || 'Max Z = ' + c.map((val, i) => `${val}·x${i+1}`).join(' + ')}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle className="text-lg">제약식</CardTitle></CardHeader>
                        <CardContent>
                            <ul className="list-disc pl-5 space-y-1 font-mono">
                                {(analysisResult?.constraints_str || A.map((row, i) => `${row.map((val, j) => `${val}·x${j+1}`).join(' + ')} ≤ ${b[i]}`)).map((con, i) => (
                                    <li key={i}>{con}</li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
            
            {analysisResult && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle className="text-lg">최적해 & 최적값</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                             <p><strong>해:</strong> {Object.entries(analysisResult.solution).map(([key, val]) => `${key}=${val.toFixed(6)}`).join(', ')}</p>
                             <p><strong>최적값 Z*:</strong> {analysisResult.optimal_value.toFixed(6)}</p>
                             <p><strong>방정식:</strong> Z = {c.map((val, i) => `${val}·(${analysisResult.solution[`x${i+1}`]?.toFixed(6) || 0})`).join(' + ')} = {analysisResult.optimal_value.toFixed(6)}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="text-lg">단계별 Simplex 계산</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            {analysisResult.iterations.map((iter, index) => (
                                <div key={index}>
                                    <h4 className="font-semibold mb-2">{iter.title}</h4>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    {tableHeaders.map(h => <TableHead key={h}>{h}</TableHead>)}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {iter.tableau.map((row, rIndex) => (
                                                    <TableRow key={rIndex}>
                                                        <TableCell>{rIndex < numConstraints ? `제약${rIndex+1}` : 'Z'}</TableCell>
                                                        {row.map((cell, cIndex) => <TableCell key={cIndex} className="font-mono">{cell.toFixed(6)}</TableCell>)}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
