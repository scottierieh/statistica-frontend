'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChartBaseProps } from './constants';

interface NPSData {
  npsScore: number;
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
  interpretation: string;
}

interface NPSChartProps extends ChartBaseProps {
  data: NPSData;
}

export default function NPSChart({ data, title, onDownload }: NPSChartProps) {
    if (!data) return null;
    
    const promoterPct = (data.promoters / data.total) * 100;
    const passivePct = (data.passives / data.total) * 100;
    const detractorPct = (data.detractors / data.total) * 100;
    
    return (
        <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                <div className="flex justify-between items-start">
                    <div className="space-y-1.5">
                        <CardTitle className="text-xl font-semibold flex items-center gap-2">
                            {title}
                            <Badge variant="outline" className="ml-2 font-normal">NPS</Badge>
                        </CardTitle>
                        <CardDescription className="text-sm">Net Promoter Score Analysis</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onDownload}>
                        <Download className="w-4 h-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <div className="flex flex-col items-center justify-center bg-muted/30 rounded-lg p-8">
                        <p className="text-sm text-muted-foreground mb-2">Net Promoter Score</p>
                        <p className={cn(
                            "text-6xl font-bold",
                            data.npsScore > 50 ? "text-green-500" : 
                            data.npsScore > 0 ? "text-blue-500" : 
                            "text-red-500"
                        )}>{data.npsScore.toFixed(0)}</p>
                        <Badge variant="outline" className="mt-3">{data.interpretation}</Badge>
                    </div>
                    
                    <div className="relative h-12 rounded-lg overflow-hidden flex">
                        <div className="bg-red-500 transition-all" style={{width: `${detractorPct}%`}} />
                        <div className="bg-yellow-500 transition-all" style={{width: `${passivePct}%`}} />
                        <div className="bg-green-500 transition-all" style={{width: `${promoterPct}%`}} />
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                        <span>0</span>
                        <span>10</span>
                    </div>
                </div>
                
                <div className="space-y-4">
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-3 bg-muted/30">
                            <CardTitle className="text-sm font-medium">Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-3">
                             <div className="p-4 bg-green-50 dark:bg-green-950/30 border-l-4 border-green-500 rounded-r-lg">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-sm font-medium text-green-900 dark:text-green-100">Promoters (9-10)</p>
                                        <p className="text-2xl font-bold text-green-600">{data.promoters.toFixed(1)}</p>
                                    </div>
                                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                                        {promoterPct.toFixed(1)}%
                                    </Badge>
                                </div>
                            </div>
                            
                            <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 border-l-4 border-yellow-500 rounded-r-lg mt-3">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">Passives (7-8)</p>
                                        <p className="text-2xl font-bold text-yellow-600">{data.passives.toFixed(1)}</p>
                                    </div>
                                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                                        {passivePct.toFixed(1)}%
                                    </Badge>
                                </div>
                            </div>
                            
                            <div className="p-4 bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500 rounded-r-lg mt-3">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-sm font-medium text-red-900 dark:text-red-100">Detractors (0-6)</p>
                                        <p className="text-2xl font-bold text-red-600">{data.detractors.toFixed(1)}</p>
                                    </div>
                                    <Badge variant="secondary" className="bg-red-100 text-red-700">
                                        {detractorPct.toFixed(1)}%
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </CardContent>
        </Card>
    );
}