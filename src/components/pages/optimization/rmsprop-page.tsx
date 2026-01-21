'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Wind } from 'lucide-react';

export default function RmspropPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Wind />RMSProp Optimizer</CardTitle>
                <CardDescription>This feature is currently under construction.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">An unpublished, adaptive learning rate method proposed by Geoff Hinton in his Coursera class. Coming soon.</p>
            </CardContent>
        </Card>
    );
}
