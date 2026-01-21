'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Thermometer } from 'lucide-react';

export default function SimulatedAnnealingPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Thermometer />Simulated Annealing (SA)</CardTitle>
                <CardDescription>This feature is currently under construction.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">A probabilistic technique for approximating the global optimum of a given function, inspired by annealing in metallurgy.</p>
            </CardContent>
        </Card>
    );
}
