
'use client';
import { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UploadCloud, Sigma, Apple, Banana, BarChart } from 'lucide-react';
import Image from 'next/image';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface AnalysisResult {
    closest_images: {
        apple: string[];
        banana: string[];
        pineapple: string[];
    };
    histograms: {
        apple: string;
        banana: string;
        pineapple: string;
    };
    mean_images: {
        apple: string;
        banana: string;
        pineapple: string;
    };
    user_image_cluster: string;
}

export default function FruitClusteringPage() {
    const { toast } = useToast();
    const [userImage, setUserImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setUserImage(reader.result as string);
                setAnalysisResult(null); // Clear previous results on new upload
            };
            reader.readAsDataURL(file);
        }
    };

    const runAnalysis = useCallback(async () => {
        if (!userImage) {
            toast({ title: 'No Image', description: 'Please upload an image to analyze.', variant: 'destructive' });
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('/api/analysis/fruit-clustering', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: userImage }),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Failed to run analysis');
            }

            const result = await response.json();
            setAnalysisResult(result);
            toast({ title: 'Analysis Complete', description: `Your image was classified as: ${result.user_image_cluster}` });

        } catch (error: any) {
            toast({ title: 'Analysis Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [userImage, toast]);
    
    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Fruit Image Clustering</CardTitle>
                    <CardDescription>Upload an image of a fruit to see which cluster it belongs to (apple, banana, or pineapple).</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                     <div className="w-full h-64 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50">
                        {userImage ? (
                            <Image src={userImage} alt="Uploaded fruit" width={200} height={200} className="max-h-full w-auto object-contain rounded-md" />
                        ) : (
                            <div className="text-center text-muted-foreground">
                                <UploadCloud className="mx-auto h-12 w-12" />
                                <p>Upload an image</p>
                            </div>
                        )}
                    </div>
                     <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"/>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={runAnalysis} disabled={isLoading || !userImage}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Analyzing...</> : <><Sigma className="mr-2 h-4 w-4"/>Run Clustering</>}
                    </Button>
                </CardFooter>
            </Card>

            {analysisResult && (
                <div className="space-y-4">
                    <Alert>
                        <div className="flex items-center gap-2">
                           {analysisResult.user_image_cluster === 'apple' && <Apple />}
                           {analysisResult.user_image_cluster === 'banana' && <Banana />}
                           <AlertTitle>Your image was classified as: <span className="font-bold capitalize">{analysisResult.user_image_cluster}</span></AlertTitle>
                        </div>
                    </Alert>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle>Mean Images of Fruit Clusters</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Image src={analysisResult.mean_images.apple} alt="Mean Apple" width={200} height={200} className="w-full rounded-md border" />
                            <Image src={analysisResult.mean_images.pineapple} alt="Mean Pineapple" width={200} height={200} className="w-full rounded-md border" />
                            <Image src={analysisResult.mean_images.banana} alt="Mean Banana" width={200} height={200} className="w-full rounded-md border" />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Closest Images in Apple Cluster</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-5 gap-2">
                            {analysisResult.closest_images.apple.map((img, i) => <Image key={i} src={img} alt={`Closest apple ${i}`} width={100} height={100} className="rounded-md border" />)}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

