'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingDown } from 'lucide-react';

export default function SgdPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingDown />Stochastic Gradient Descent (SGD)</CardTitle>
                <CardDescription>This feature is currently under construction.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">An iterative method for optimizing an objective function with suitable smoothness properties. Coming soon.</p>
            </CardContent>
        </Card>
    );
}
