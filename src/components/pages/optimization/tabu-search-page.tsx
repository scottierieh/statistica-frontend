'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Ban } from 'lucide-react';

export default function TabuSearchPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Ban />Tabu Search</CardTitle>
                <CardDescription>This feature is currently under construction.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">A metaheuristic search method employing local search methods used for mathematical optimization.</p>
            </CardContent>
        </Card>
    );
}
