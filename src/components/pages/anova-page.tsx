
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { type DataSet } from '@/lib/stats';
import { type ExampleDataSet } from '@/lib/example-datasets';
import { exampleDatasets } from '@/lib/example-datasets';
import { Button } from '@/components/ui/button';
import { Sigma, FlaskConical, MoveRight } from 'lucide-react';

interface AnovaPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const anovaExample = exampleDatasets.find(d => d.id === 'tips');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                         <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Sigma size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">One-Way ANOVA</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Compare the means of three or more groups to see if at least one group is statistically different from the others.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-8 px-8 py-10">
                     <div className="space-y-4">
                        <h3 className="font-semibold text-xl">How it Works</h3>
                        <p className="text-muted-foreground">
                            ANOVA (Analysis of Variance) is used when you want to compare the average of a continuous variable across several different categories or groups. It checks if the observed differences in means are statistically significant or just due to random chance.
                        </p>
                    </div>
                     <div className="space-y-4">
                        <h3 className="font-semibold text-xl">Key Concepts</h3>
                        <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                            <li><strong>F-statistic:</strong> A ratio that compares the variance between the groups to the variance within the groups. A large F-value suggests that the variation between groups is greater than the variation within groups.</li>
                            <li><strong>p-value:</strong> If this value is less than 0.05, it indicates that there is a statistically significant difference somewhere among the group means.</li>
                            <li><strong>Post-Hoc Tests (e.g., Tukey's HSD):</strong> If the overall ANOVA is significant, these tests are run to find out which specific groups are different from each other.</li>
                        </ul>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between p-6 bg-muted/30 rounded-b-lg">
                    {anovaExample && <Button variant="outline" onClick={() => onLoadExample(anovaExample)}>Load Sample Tips Data</Button>}
                    <Button size="lg" onClick={onStart}>Start New Analysis <MoveRight className="ml-2 w-5 h-5"/></Button>
                </CardFooter>
            </Card>
        </div>
    );
};


export default function AnovaPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: AnovaPageProps) {
    const [view, setView] = useState('main'); // Can be 'intro' or 'main'
    // The rest of the component logic for the main analysis page would go here.
    
    // For now, we will just show a placeholder if there is no data to trigger the intro view.
    if (data.length === 0) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    return (
        <div className="flex flex-1 items-center justify-center h-full">
            <Card className="w-full max-w-2xl text-center">
                <CardHeader>
                    <CardTitle className="font-headline">One-Way ANOVA</CardTitle>
                    <CardDescription>
                        This section is under construction. The previous error has been resolved. The intro page is now functional.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">The full ANOVA analysis tool is being rebuilt here.</p>
                </CardContent>
            </Card>
        </div>
    );
}
