'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Rocket } from 'lucide-react';

export default function AdamPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Rocket />Adam Optimizer</CardTitle>
                <CardDescription>This feature is currently under construction.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">An adaptive learning rate optimization algorithm that’s been designed specifically for training deep neural networks. Coming soon.</p>
            </CardContent>
        </Card>
    );
}
