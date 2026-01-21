'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Component } from 'lucide-react';

export default function ConvexOptimizationPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Component />Convex Optimization</CardTitle>
                <CardDescription>This feature is currently under construction.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Solvers for convex problems (e.g., Quadratic Programming, Second-Order Cone Programming) are coming soon.</p>
            </CardContent>
        </Card>
    );
}
