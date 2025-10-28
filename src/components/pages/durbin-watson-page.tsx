
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2 } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import RegressionPage from './regression-page';

interface DurbinWatsonPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    activeAnalysis: string;
}

// This component now acts as a wrapper for the main RegressionPage,
// potentially with some specific instructions or defaults for Durbin-Watson.
export default function DurbinWatsonTestPage({ data, numericHeaders, onLoadExample, activeAnalysis }: DurbinWatsonPageProps) {

    const [regressionData, setRegressionData] = useState<DataSet>(data);
    const [regressionNumericHeaders, setRegressionNumericHeaders] = useState<string[]>(numericHeaders);

    const handleLoadExample = (example: ExampleDataSet) => {
        onLoadExample(example);
    }
    
    // You could provide specific instructions for Durbin-Watson here
    // For now, it just renders the main regression page.
    
    return (
        <RegressionPage 
            data={regressionData} 
            numericHeaders={regressionNumericHeaders} 
            categoricalHeaders={[]} 
            allHeaders={regressionNumericHeaders} 
            onLoadExample={handleLoadExample}
            activeAnalysis={activeAnalysis} 
            onGenerateReport={() => {}}
        />
    );
}

