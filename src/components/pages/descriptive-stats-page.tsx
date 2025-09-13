'use client';
import React from 'react';
import { useState, useMemo, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { calculateDescriptiveStats } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Sigma } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';

interface DescriptiveStatsPageProps {
    data: DataSet;
    allHeaders: string[];
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

const formatValue = (value: any) => {
    if (typeof value === 'number') {
        if (Number.isInteger(value)) return value.toString();
        return value.toFixed(3);
    }
    if (Array.isArray(value)) {
        const formattedValues = value.map(v => typeof v === 'number' ? v.toFixed(2) : String(v));
        if (formattedValues.length > 3) {
            return `${formattedValues.slice(0,3).join(', ')}...`;
        }
        return formattedValues.join(', ');
    }
    if (value === 'N/A' || value === undefined || value === null || (typeof value === 'number' && isNaN(value))) {
        return '-';
    }
    return String(value);
}

const StatCard = ({ title, data, isNumeric }: { title: string; data: any; isNumeric: boolean }) => (
  <Card>
    <CardHeader>
      <CardTitle className="font-headline">{title}</CardTitle>
      <CardDescription>{isNumeric ? "Numeric" : "Categorical"}</CardDescription>
    </CardHeader>
    <CardContent>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {Object.entries(data).map(([key, value]) => {
          const formattedKey = key
            .replace('p25', '25th Pctl.')
            .replace('p75', '75th Pctl.')
            .replace('iqr', 'IQR')
            .replace('stdDev', 'Std. Dev.')
            .replace('mean', 'Mean')
            .replace('median', 'Median')
            .replace('variance', 'Variance')
            .replace('min', 'Min')
            .replace('max', 'Max')
            .replace('range', 'Range')
            .replace('count', 'Count')
            .replace('mode', 'Mode')
            .replace('skewness', 'Skewness')
            .replace('kurtosis', 'Kurtosis')
            .replace('unique', 'Unique Values');
            
          return (
            <React.Fragment key={key}>
              <dt className="capitalize text-muted-foreground">{formattedKey}</dt>
              <dd className="font-mono text-right flex justify-end items-center gap-1">
                  {Array.isArray(value) && value.length > 0 ? (
                      <div className="flex flex-wrap gap-1 justify-end">
                          {(value as any[]).map((v, i) => <Badge key={i} variant="secondary">{formatValue(v)}</Badge>)}
                      </div>
                  ) : (
                      formatValue(value)
                  )}
              </dd>
            </React.Fragment>
          )
        })}
      </dl>
    </CardContent>
  </Card>
);

export default function DescriptiveStatsPage({ data, allHeaders, numericHeaders, onLoadExample }: DescriptiveStatsPageProps) {
  const [selectedHeaders, setSelectedHeaders] = useState<string[]>(allHeaders);
  const [stats, setStats] = useState<Record<string, any> | null>(null);
  
  const handleSelectionChange = (header: string, checked: boolean) => {
    setSelectedHeaders(prev => 
      checked ? [...prev, header] : prev.filter(h => h !== header)
    );
  };

  const handleAnalysis = useCallback(() => {
    const result = calculateDescriptiveStats(data, selectedHeaders);
    setStats(result);
  }, [data, selectedHeaders]);

  const canRun = useMemo(() => data.length > 0, [data]);

  if (!canRun) {
      const statsExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('stats'));
      return (
        <div className="flex flex-1 items-center justify-center">
            <Card className="w-full max-w-2xl text-center">
                <CardHeader>
                    <CardTitle className="font-headline">Descriptive Statistics</CardTitle>
                    <CardDescription>
                        To get started, please upload data or select an example dataset.
                    </CardDescription>
                </CardHeader>
                 <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {statsExamples.map((ex) => {
                            const Icon = ex.icon;
                            return (
                            <Card key={ex.id} className="text-left hover:shadow-md transition-shadow">
                                <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                                        <Icon className="h-6 w-6 text-secondary-foreground" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base font-semibold">{ex.name}</CardTitle>
                                        <CardDescription className="text-xs">{ex.description}</CardDescription>
                                    </div>
                                </CardHeader>
                                <CardFooter>
                                    <Button onClick={() => onLoadExample(ex)} className="w-full" size="sm">
                                        Load this data
                                    </Button>
                                </CardFooter>
                            </Card>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
      )
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Descriptive Statistics Setup</CardTitle>
          <CardDescription>Select the variables to analyze, then click 'Run Analysis'.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
            <ScrollArea className="h-48 border rounded-md p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {allHeaders.map(header => (
                  <div key={header} className="flex items-center space-x-2">
                    <Checkbox
                      id={`stats-${header}`}
                      checked={selectedHeaders.includes(header)}
                      onCheckedChange={(checked) => handleSelectionChange(header, checked as boolean)}
                    />
                    <label htmlFor={`stats-${header}`} className="text-sm font-medium leading-none">
                      {header}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
           <Button onClick={handleAnalysis} className="w-full md:w-auto self-end">
              <Sigma className="mr-2"/>
              Run Analysis
            </Button>
        </CardContent>
      </Card>
      
      {stats ? (
        <ScrollArea className="h-full">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pr-4">
              {Object.keys(stats).length > 0 ? (
                Object.keys(stats).map((header) => (
                    <StatCard key={header} title={header} data={stats[header]} isNumeric={numericHeaders.includes(header)} />
                ))
              ) : (
                <div className="col-span-full text-center text-muted-foreground">
                    <p>No results to display.</p>
                </div>
              )}
            </div>
        </ScrollArea>
      ) : (
        <div className="text-center text-muted-foreground py-10">
          <p>Select variables and click 'Run Analysis' to see the results.</p>
        </div>
      )}
    </div>
  )
}
