'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
    ResponsiveContainer, 
    BarChart, 
    XAxis, 
    YAxis, 
    Tooltip, 
    Bar,
    CartesianGrid,
    ReferenceLine
} from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { ChartBaseProps } from './constants';

interface BestWorstData {
  scores: {
    item: string;
    net_score: number;
  }[];
}

interface BestWorstChartProps extends ChartBaseProps {
  data: BestWorstData;
}

export default function BestWorstChart({ data, title, onDownload }: BestWorstChartProps) {
    if (!data?.scores) return null;
    
    const chartData = data.scores.map((s: any) => ({
        name: s.item,
        net: s.net_score,
    })).sort((a: any, b: any) => b.net - a.net);

    return (
        <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                <div className="flex justify-between items-start">
                    <div className="space-y-1.5">
                        <CardTitle className="text-xl font-semibold flex items-center gap-2">
                            {title}
                            <Badge variant="outline" className="ml-2 font-normal">MaxDiff</Badge>
                        </CardTitle>
                        <CardDescription className="text-sm">Best-Worst preference analysis</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onDownload}>
                        <Download className="w-4 h-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div>
                    <ChartContainer config={{}} className="w-full h-96">
                        <ResponsiveContainer>
                            <BarChart data={chartData} layout="vertical" margin={{ left: 100 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 11}}/>
                                <Tooltip />
                                <ReferenceLine x={0} stroke="#666" />
                                <Bar dataKey="net" name="Net Score" fill="#8b5cf6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </div>
                <div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Rank</TableHead>
                                <TableHead>Item</TableHead>
                                <TableHead className="text-right">Net Score</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {chartData.map((item: any, idx: number) => (
                                <TableRow key={idx}>
                                    <TableCell>
                                        <Badge variant={idx < 3 ? "default" : "secondary"}>
                                            #{idx + 1}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell className={`text-right font-mono font-bold ${item.net > 0 ? 'text-green-600' : 'text-red-600'}`}>{item.net.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}


