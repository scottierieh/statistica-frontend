'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

export default function NonLinearProgrammingPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp/>Non-linear Programming (NLP)</CardTitle>
                <CardDescription>This feature is currently under construction.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">A tool for solving optimization problems with non-linear objective functions or constraints is coming soon.</p>
            </CardContent>
        </Card>
    );
}
