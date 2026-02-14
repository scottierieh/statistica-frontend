'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
    ResponsiveContainer, 
    BarChart, 
    XAxis, 
    YAxis, 
    Tooltip, 
    Bar,
    CartesianGrid
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Download, Star, Activity, Target, TrendingUp, Users } from 'lucide-react';
import { ChartBaseProps } from './constants';

interface RatingData {
  mean: number;
  median: number;
  std: number;
  count: number;
  min: number;
  max: number;
  range: number;
  mode: number | null;
  cv: number;
  values: number[];
}

interface RatingChartProps extends ChartBaseProps {
  data: RatingData;
}

const StatisticalDescription = ({ data }: { data: RatingData }) => {
    const descriptions = useMemo(() => {
        const items = [];
        
        items.push({
            icon: <TrendingUp className="w-4 h-4 text-blue-500" />,
            title: "Central Tendency",
            text: `Mean: ${data.mean.toFixed(2)}, Median: ${data.median.toFixed(2)}, Mode: ${data.mode}`
        });
        
        items.push({
            icon: <Activity className="w-4 h-4 text-green-500" />,
            title: "Variability",
            text: `Std Dev: ${data.std.toFixed(2)}, Range: ${data.range.toFixed(2)} (${data.min.toFixed(2)} to ${data.max.toFixed(2)})`
        });
        
        const cvText = data.cv > 30 ? "High variation" : data.cv > 15 ? "Moderate variation" : "Low variation";
        items.push({
            icon: <Target className="w-4 h-4 text-purple-500" />,
            title: "Relative Variability",
            text: `CV: ${data.cv.toFixed(1)}% (${cvText})`
        });
        
        return items;
    }, [data]);
    
    return (
        <div className="space-y-3">
            {descriptions.map((desc, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="mt-0.5">{desc.icon}</div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground">{desc.title}</p>
                        <p className="text-sm font-semibold mt-0.5">{desc.text}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default function RatingChart({ data, title, onDownload }: RatingChartProps) {
    const starCounts = useMemo(() => {
        const counts = Array(5).fill(0);
        data.values.forEach((v: number) => {
            if (v >= 1 && v <= 5) {
                counts[v - 1]++;
            }
        });
        return counts.map((count, i) => ({
            star: i + 1,
            label: `${i+1} Star`,
            count,
            percentage: (count / data.count) * 100
        }));
    }, [data]);
    
    return (
        <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                <div className="flex justify-between items-start">
                    <div className="space-y-1.5">
                        <CardTitle className="text-xl font-semibold flex items-center gap-2">
                            {title}
                            <Badge variant="outline" className="ml-2 font-normal">Rating</Badge>
                        </CardTitle>
                        <CardDescription className="text-sm">Star rating distribution analysis</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onDownload}>
                        <Download className="w-4 h-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <div className="flex flex-col items-center justify-center bg-muted/30 rounded-lg p-8">
                        <p className="text-sm text-muted-foreground mb-2">Average Rating</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-bold text-amber-500">{data.mean.toFixed(2)}</span>
                            <span className="text-xl text-amber-500/80">/ 5</span>
                        </div>
                        <div className="flex gap-1 mt-3">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`w-6 h-6 ${i < Math.round(data.mean) ? 'fill-amber-400 text-amber-400' : 'fill-gray-300 text-gray-300'}`}/>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-3">Based on {data.count} responses</p>
                    </div>
                    
                    <ChartContainer config={{}} className="w-full h-64">
                        <ResponsiveContainer>
                            <BarChart data={starCounts}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="label" />
                                <YAxis />
                                <Tooltip content={<ChartTooltipContent formatter={(value, name) => [`${value} (${starCounts.find(s => s.count === value)?.percentage.toFixed(1)}%)`, 'Count']} />} />
                                <Bar dataKey="count" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </div>
                
                <div className="space-y-4">
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-3 bg-muted/30">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Star className="w-4 h-4" />
                                Rating Distribution
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-3">
                            {[...starCounts].reverse().map((item) => (
                                <div key={item.star} className="flex items-center gap-3">
                                    <div className="flex items-center gap-1 w-20">
                                        {[...Array(item.star)].map((_, i) => (
                                            <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                                        ))}
                                    </div>
                                    <Progress value={item.percentage} className="flex-1 h-2" />
                                    <div className="text-sm font-medium w-16 text-right">
                                        {item.count} <span className="text-muted-foreground">({item.percentage.toFixed(0)}%)</span>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                    
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-3 bg-muted/30">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Activity className="w-4 h-4" />
                                Statistical Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-3">
                            <StatisticalDescription data={data} />
                        </CardContent>
                    </Card>
                </div>
            </CardContent>
        </Card>
    );
}

