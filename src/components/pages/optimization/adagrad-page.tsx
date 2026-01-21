'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Scaling } from 'lucide-react';

export default function AdagradPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Scaling />Adagrad Optimizer</CardTitle>
                <CardDescription>This feature is currently under construction.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">An optimizer with parameter-specific learning rates, which are adapted relative to how frequently a parameter gets updated during training. Coming soon.</p>
            </CardContent>
        </Card>
    );
}
