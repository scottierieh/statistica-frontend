'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles } from 'lucide-react';
import dynamic from 'next/dynamic';
import { COLORS, ChartBaseProps } from './constants';

const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-[300px]" />,
});

export interface NumericData {
  mean: number;
  median: number;
  std: number;
  count: number;
  skewness: number;
  min: number;
  max: number;
  range: number;
  mode: number | null;
  cv: number;
  values: number[];
}

interface ComparisonData {
  filterValue: string;
  chartData: { values: number[] };
  tableData: {
    mean: number;
    median: number;
    mode: number | null;
    stdDev: number;
    count: number;
  };
}

interface NumericChartProps extends ChartBaseProps {
  data: NumericData;
  comparisonData?: ComparisonData;
}

const generateNumericInsights = (data: NumericData): string[] => {
    const insights: string[] = [];
    
    // Central tendency insight
    const meanMedianDiff = Math.abs(data.mean - data.median);
    if (meanMedianDiff < 0.1 * data.std) {
        insights.push(`<strong>Symmetric distribution:</strong> Mean (${data.mean.toFixed(2)}) and median (${data.median.toFixed(2)}) are very close`);
    } else if (data.mean > data.median) {
        insights.push(`<strong>Right-skewed:</strong> Mean (${data.mean.toFixed(2)}) > Median (${data.median.toFixed(2)}), indicating some high outliers`);
    } else {
        insights.push(`<strong>Left-skewed:</strong> Median (${data.median.toFixed(2)}) > Mean (${data.mean.toFixed(2)}), indicating some low outliers`);
    }
    
    // Variability insight
    if (data.cv < 15) {
        insights.push(`<strong>Low variability:</strong> CV = ${data.cv.toFixed(1)}%, responses are quite consistent`);
    } else if (data.cv < 30) {
        insights.push(`<strong>Moderate variability:</strong> CV = ${data.cv.toFixed(1)}%, responses show some spread`);
    } else {
        insights.push(`<strong>High variability:</strong> CV = ${data.cv.toFixed(1)}%, responses are highly diverse`);
    }
    
    // Range insight
    insights.push(`<strong>Response range:</strong> Values span from ${data.min.toFixed(2)} to ${data.max.toFixed(2)} (range = ${data.range.toFixed(2)})`);
    
    return insights;
};

const AnalysisDisplayShell = ({ varName, children }: { varName: string, children: React.ReactNode }) => {
    return (
        <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                <CardTitle className="text-xl font-semibold">{varName}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                {children}
            </CardContent>
        </Card>
    );
};

export default function NumericChart({ data, title, onDownload, comparisonData }: NumericChartProps) {
    return (
      <AnalysisDisplayShell varName={title}>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Response Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center min-h-[300px]">
                        <Plot
                            data={comparisonData ? [
                                { x: data.values, type: 'histogram', name: 'Overall', opacity: 0.7, marker: {color: COLORS[0]} },
                                { x: comparisonData.chartData.values, type: 'histogram', name: comparisonData.filterValue, opacity: 0.7, marker: {color: COLORS[1]} }
                            ] : [{ x: data.values, type: 'histogram', marker: {color: COLORS[0]} }]}
                            layout={{
                                autosize: true,
                                margin: { t: 40, b: 40, l: 40, r: 20 },
                                bargap: 0.1,
                                barmode: 'overlay'
                            }}
                            style={{ width: '100%', height: '100%' }}
                            config={{ displayModeBar: false }}
                            useResizeHandler
                        />
                    </CardContent>
                </Card>
                 <div className="space-y-4">
                    <Card>
                         <CardHeader className="pb-2"><CardTitle className="text-base">Summary Statistics</CardTitle></CardHeader>
                         <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Metric</TableHead>
                                        <TableHead className="text-right">Overall</TableHead>
                                        {comparisonData && <TableHead className="text-right">{comparisonData.filterValue}</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow><TableCell>Mean</TableCell><TableCell className="text-right">{data.mean.toFixed(3)}</TableCell>{comparisonData && <TableCell className="text-right">{comparisonData.tableData.mean.toFixed(3)}</TableCell>}</TableRow>
                                    <TableRow><TableCell>Median</TableCell><TableCell className="text-right">{data.median}</TableCell>{comparisonData && <TableCell className="text-right">{comparisonData.tableData.median}</TableCell>}</TableRow>
                                    <TableRow><TableCell>Mode</TableCell><TableCell className="text-right">{data.mode}</TableCell>{comparisonData && <TableCell className="text-right">{comparisonData.tableData.mode}</TableCell>}</TableRow>
                                    <TableRow><TableCell>Std. Deviation</TableCell><TableCell className="text-right">{data.std.toFixed(3)}</TableCell>{comparisonData && <TableCell className="text-right">{comparisonData.tableData.stdDev.toFixed(3)}</TableCell>}</TableRow>
                                    <TableRow><TableCell>Total Responses</TableCell><TableCell className="text-right">{data.count}</TableCell>{comparisonData && <TableCell className="text-right">{comparisonData.tableData.count}</TableCell>}</TableRow>
                                </TableBody>
                            </Table>
                         </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Insights</CardTitle></CardHeader>
                        <CardContent><ul className="space-y-2 text-sm list-disc pl-4">{generateNumericInsights(data).map((insight, i) => <li key={i} dangerouslySetInnerHTML={{ __html: insight }} />)}</ul></CardContent>
                    </Card>
                </div>
            </div>
      </AnalysisDisplayShell>
    );
}

