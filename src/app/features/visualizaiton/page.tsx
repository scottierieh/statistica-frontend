
'use client';

import { FeaturePageHeader } from '@/components/feature-page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

export default function VisualizationFeaturePage() {
    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            <div className="absolute top-4 left-4">
                <Button asChild variant="outline">
                    <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
                </Button>
            </div>
            <FeaturePageHeader title="Visualization" />
            <main className="flex-1 p-4 md:p-8 lg:p-12">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-4xl font-bold font-headline mb-4">Visualization Feature Page</h1>
                    <p className="text-lg text-muted-foreground mb-8">
                        Detailed information about our data visualization tools is coming soon.
                    </p>
                     <Card>
                        <CardContent className="p-6">
                            <div className="bg-muted h-96 rounded-lg flex items-center justify-center">
                                <p>Visualization Feature Content</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
