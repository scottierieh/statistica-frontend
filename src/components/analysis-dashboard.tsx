'use client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Sigma, Link2, BarChart2 } from 'lucide-react';
import type { DataSet } from '@/lib/stats';
import VisualizationSuite from './visualization-suite';
import { Badge } from '@/components/ui/badge';

interface AnalysisDashboardProps {
  data: DataSet;
  headers: string[];
  stats: Record<string, any>;
  correlationMatrix: (number | null)[][];
}

const formatValue = (value: any) => {
    if (typeof value === 'number') {
        return value.toFixed(3);
    }
    if (Array.isArray(value)) {
        return value.map(v => v.toFixed(2)).join(', ');
    }
    return value;
}

const StatCard = ({ title, data }: { title: string; data: any }) => (
  <Card>
    <CardHeader>
      <CardTitle className="font-headline">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {Object.entries(data).map(([key, value]) => (
          <>
            <dt className="capitalize text-muted-foreground">{key.replace('p25', 'P25').replace('p75', 'P75').replace('iqr', 'IQR')}</dt>
            <dd className="font-mono text-right flex justify-end items-center gap-1">
                {Array.isArray(value) ? (
                    <div className="flex flex-wrap gap-1 justify-end">
                        {(value as any[]).map((v, i) => <Badge key={i} variant="secondary">{formatValue(v)}</Badge>)}
                    </div>
                ) : (
                    formatValue(value)
                )}
            </dd>
          </>
        ))}
      </dl>
    </CardContent>
  </Card>
);

export default function AnalysisDashboard({ data, headers, stats, correlationMatrix }: AnalysisDashboardProps) {
  const isLoading = Object.keys(stats).length === 0;

  return (
    <Tabs defaultValue="stats" className="flex-grow flex flex-col">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="stats"><Sigma className="mr-2" />Descriptive Statistics</TabsTrigger>
        <TabsTrigger value="correlation"><Link2 className="mr-2" />Correlation Analysis</TabsTrigger>
        <TabsTrigger value="visuals"><BarChart2 className="mr-2" />Data Visualization</TabsTrigger>
      </TabsList>

      <TabsContent value="stats" className="flex-grow mt-4">
        <ScrollArea className="h-full">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pr-4">
                {isLoading
                ? headers.map((h) => (
                    <Card key={h}><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><div className="space-y-2">{Array(13).fill(0).map((_,i)=><Skeleton key={i} className="h-4 w-full"/>)}</div></CardContent></Card>
                    ))
                : headers.map((header) => (
                    stats[header] && <StatCard key={header} title={header} data={stats[header]} />
                ))}
            </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="correlation" className="flex-grow mt-4">
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="font-headline">Correlation Matrix</CardTitle>
                <CardDescription>Pearson correlation coefficients between variables. Values range from -1 (total negative correlation) to 1 (total positive correlation).</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[60vh] w-full">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead></TableHead>
                                {headers.map(h => <TableHead key={h} className="text-center">{h}</TableHead>)}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {headers.map((h1, i) => (
                                <TableRow key={h1}>
                                    <TableHead>{h1}</TableHead>
                                    {headers.map((h2, j) => {
                                        const value = correlationMatrix[i]?.[j];
                                        const colorClass = !isNaN(value as number)
                                            ? value! > 0 ? `bg-sky-100/50 dark:bg-sky-900/50` : `bg-red-100/50 dark:bg-red-900/50`
                                            : '';
                                        const opacity = !isNaN(value as number) ? Math.abs(value!) : 0;
                                        return (
                                            <TableCell key={h2} className={`text-center font-mono transition-colors ${colorClass}`} style={{opacity: opacity*0.7 + 0.3}}>
                                                {value !== null ? isNaN(value) ? 'N/A' : value.toFixed(3) : <Skeleton className="h-5 w-12 mx-auto" />}
                                            </TableCell>
                                        )
                                    })}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="visuals" className="flex-grow mt-4">
        <VisualizationSuite data={data} headers={headers} />
      </TabsContent>
    </Tabs>
  );
}
