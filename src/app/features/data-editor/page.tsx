
'use client';

import { FeaturePageHeader } from '@/components/feature-page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function DataEditorFeaturePage() {
    const dataEditorImage = PlaceHolderImages.find(img => img.id === 'data-editor-feature'); // Assume you add this ID

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            <div className="absolute top-4 left-4">
                <Button asChild variant="outline">
                    <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
                </Button>
            </div>
            <FeaturePageHeader title="Data Editor" />
            <main className="flex-1 p-4 md:p-8 lg:p-12">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-4xl font-bold font-headline mb-4">Powerful Data Editing</h1>
                    <p className="text-lg text-muted-foreground mb-8">
                        Clean, transform, and prepare your data with an intuitive interface.
                    </p>
                    <Card>
                        <CardContent className="p-6">
                            {dataEditorImage ? (
                                <Image 
                                    src={dataEditorImage.imageUrl} 
                                    alt={dataEditorImage.description}
                                    width={800}
                                    height={500}
                                    className="rounded-lg shadow-lg"
                                    data-ai-hint={dataEditorImage.imageHint}
                                />
                            ) : (
                                <div className="bg-muted h-96 rounded-lg flex items-center justify-center">
                                    <p>Data Editor Feature Image</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
