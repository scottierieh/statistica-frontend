'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SimpleTestResult {
    sum: number;
    average: number;
}

export default function SimpleTestPage() {
    const { toast } = useToast();
    const [numbers, setNumbers] = useState('1, 2, 3, 4, 5');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<SimpleTestResult | null>(null);

    const handleAnalysis = async () => {
        setIsLoading(true);
        setResult(null);

        const numberArray = numbers.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));

        if (numberArray.length === 0) {
            toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please enter a comma-separated list of numbers.' });
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/analysis/simple-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ numbers: numberArray }),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }
            
            const analysisResult = await response.json();
            setResult(analysisResult.results);
            toast({ title: 'Success', description: 'Analysis complete.' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Simple Test Analysis</CardTitle>
                <CardDescription>
                    A simple test to confirm the FastAPI backend connection. This will calculate the sum and average of the provided numbers.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="numbers-input">Comma-separated numbers</Label>
                    <Input
                        id="numbers-input"
                        value={numbers}
                        onChange={(e) => setNumbers(e.target.value)}
                        placeholder="e.g., 1, 2, 3, 4, 5"
                    />
                </div>
            </CardContent>
            <CardFooter className="flex justify-end">
                <Button onClick={handleAnalysis} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    Run Test
                </Button>
            </CardFooter>

            {result && (
                <CardContent>
                    <h3 className="font-semibold mb-2">Results</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <Card>
                            <CardHeader><CardTitle>Sum</CardTitle></CardHeader>
                            <CardContent><p className="text-2xl font-bold">{result.sum}</p></CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Average</CardTitle></CardHeader>
                            <CardContent><p className="text-2xl font-bold">{result.average.toFixed(2)}</p></CardContent>
                        </Card>
                    </div>
                </CardContent>
            )}
        </Card>
    );
}
