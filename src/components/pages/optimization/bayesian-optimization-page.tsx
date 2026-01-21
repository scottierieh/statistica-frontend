'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BrainCircuit } from 'lucide-react';

export default function BayesianOptimizationPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BrainCircuit />Bayesian Optimization</CardTitle>
                <CardDescription>This feature is currently under construction.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">A sequential design strategy for global optimization of black-box functions. Ideal for hyperparameter tuning. Coming soon.</p>
            </CardContent>
        </Card>
    );
}
