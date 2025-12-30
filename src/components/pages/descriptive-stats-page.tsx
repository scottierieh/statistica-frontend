'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

interface DescriptiveStatsPageProps {
  data: any[];
  numericHeaders: string[];
  categoricalHeaders: string[];
  onGenerateReport: (stats: any, viz: string | null) => void;
}

export default function DescriptiveStatisticsPage({
  data,
  numericHeaders,
  categoricalHeaders,
  onGenerateReport,
}: DescriptiveStatsPageProps) {
  const { toast } = useToast();
  const [selectedVars, setSelectedVars] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const availableVars = useMemo(() => [...numericHeaders, ...categoricalHeaders], [numericHeaders, categoricalHeaders]);
  const hasData = data.length > 0;

  const handleRunAnalysis = useCallback(async () => {
    if (selectedVars.length === 0) {
      toast({ variant: 'destructive', title: 'No variables selected', description: 'Please select at least one variable to analyze.' });
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch('/api/analysis/descriptive-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, variables: selectedVars, groupBy }),
      });
      if (!response.ok) throw new Error('Analysis failed');
      const result = await response.json();
      setAnalysisResult(result.results);
      onGenerateReport(result.results, null);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsLoading(false);
    }
  }, [data, selectedVars, groupBy, toast, onGenerateReport]);
  
  if (!hasData) {
    return (
        <Card className="flex-1">
            <CardHeader>
                <CardTitle>Descriptive Statistics</CardTitle>
                <CardDescription>No data loaded. Please upload a dataset in the "Overview" tab.</CardDescription>
            </CardHeader>
        </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Descriptive Statistics</CardTitle>
          <CardDescription>Generate summary statistics for your data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Variables to Analyze</Label>
              <Select onValueChange={(value) => setSelectedVars([value])}>
                <SelectTrigger><SelectValue placeholder="Select a variable..." /></SelectTrigger>
                <SelectContent>
                  {availableVars.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Group By (Optional)</Label>
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger><SelectValue placeholder="Select a group..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleRunAnalysis} disabled={isLoading || selectedVars.length === 0}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Run Analysis
          </Button>
        </CardContent>
      </Card>
      
      {analysisResult && Object.entries(analysisResult).map(([varName, result]: [string, any]) => (
        <Card key={varName}>
          <CardHeader>
            <CardTitle>{varName}</CardTitle>
            <CardDescription>Analysis results for the selected variable.</CardDescription>
          </CardHeader>
          <CardContent>
            {result.type === 'numeric' && (
              <>
                <Table>
                  <TableBody>
                    {Object.entries(result.stats).map(([key, value]) => (
                      <TableRow key={key}>
                        <TableCell className="font-medium">{key}</TableCell>
                        <TableCell>{typeof value === 'number' ? value.toFixed(2) : String(value)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {result.plots?.histogram && (
                  <div className="mt-4">
                    <h3 className="font-semibold mb-2">Distribution</h3>
                    <Image src={`data:image/png;base64,${result.plots.histogram}`} alt="Histogram" width={500} height={300} />
                  </div>
                )}
              </>
            )}
            {result.type === 'categorical' && (
              <>
                <div className="grid grid-cols-4 gap-4 mb-4">
                  {Object.entries(result.summary).map(([key, value]) => (
                     <div key={key} className="bg-slate-100 p-2 rounded-lg">
                        <p className="text-xs text-slate-500">{key}</p>
                        <p className="text-lg font-bold">{value}</p>
                     </div>
                  ))}
                </div>
                <Table>
                  <TableHeader><TableRow><TableHead>Value</TableHead><TableHead>Frequency</TableHead><TableHead>Percentage</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {result.table.map((row: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell>{row.Value}</TableCell>
                        <TableCell>{row.Frequency}</TableCell>
                        <TableCell>{row.Percentage.toFixed(2)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {result.plots?.bar && (
                  <div className="mt-4">
                    <h3 className="font-semibold mb-2">Frequency</h3>
                    <Image src={`data:image/png;base64,${result.plots.bar}`} alt="Bar chart" width={500} height={300} />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
