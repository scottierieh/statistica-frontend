'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Treemap,
  LabelList,
  Legend,
} from 'recharts';
import dynamic from 'next/dynamic';
import {
  Button,
} from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Zap,
  Sparkles,
  Grid3x3,
  BarChart as BarChartIcon,
  HelpCircle,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { type DataSet } from '@/lib/stats';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ChartContainer, ChartTooltipContent } from '../ui/chart';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Skeleton } from '../ui/skeleton';

const Plot = dynamic(() => import('react-plotly.js').then(mod => mod.default), { ssr: false });

/* ------------------------------- Helpers -------------------------------- */

const getQuantile = (arr: number[], q: number) => {
  if (arr.length === 0) return NaN;
  const sorted = [...arr].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  } else {
    return sorted[base];
  }
};

const getNumericStats = (data: (number | undefined | null)[]) => {
  const cleanData = data.filter((val): val is number => typeof val === 'number' && isFinite(val));
  if (cleanData.length === 0)
    return {
      count: 0,
      missing: data.length,
      mean: NaN,
      stdDev: NaN,
      min: NaN,
      q1: NaN,
      median: NaN,
      q3: NaN,
      max: NaN,
      mode: NaN,
      skewness: NaN,
    };

  const sortedData = [...cleanData].sort((a, b) => a - b);
  const sum = cleanData.reduce((acc, val) => acc + val, 0);
  const meanVal = sum / cleanData.length;
  const stdDevVal = Math.sqrt(
    cleanData.reduce((acc, val) => acc + (val - meanVal) ** 2, 0) / (cleanData.length > 1 ? cleanData.length - 1 : 1)
  );

  const q1 = getQuantile(sortedData, 0.25);
  const medianVal = getQuantile(sortedData, 0.5);
  const q3 = getQuantile(sortedData, 0.75);

  const counts: { [key: string]: number } = {};
  cleanData.forEach(val => {
    const key = String(val);
    counts[key] = (counts[key] || 0) + 1;
  });
  let modeVal: number | null = null;
  let maxCount = 0;
  Object.entries(counts).forEach(([val, count]) => {
    if (count > maxCount) {
      maxCount = count;
      modeVal = parseFloat(val);
    }
  });

  const n = cleanData.length;
  const skew =
    n > 2 && stdDevVal > 0
      ? (n / ((n - 1) * (n - 2))) *
        cleanData.reduce((acc, val) => acc + Math.pow((val - meanVal) / stdDevVal, 3), 0)
      : NaN;

  return {
    count: n,
    missing: data.length - n,
    mean: meanVal,
    stdDev: stdDevVal,
    min: sortedData[0],
    q1,
    median: medianVal,
    q3,
    max: sortedData[n - 1],
    mode: modeVal,
    skewness: skew,
  };
};

const getCategoricalStats = (data: (string | number)[]) => {
  if (data.length === 0) return [];
  const counts: { [key: string]: number } = {};
  let validCount = 0;
  data.forEach(val => {
    if (val === null || val === undefined || val === '') return;
    const key = String(val);
    counts[key] = (counts[key] || 0) + 1;
    validCount++;
  });

  return Object.entries(counts)
    .map(([value, count]) => ({ name: value, count, percentage: (count / validCount) * 100 }))
    .sort((a, b) => b.count - a.count);
};

const generateNumericInsights = (stats: ReturnType<typeof getNumericStats>) => {
  const insights: string[] = [];
  if (isNaN(stats.mean)) return ['Not enough data for insights.'];

  const skewness = stats.skewness;
  if (!isNaN(skewness)) {
    if (Math.abs(skewness) > 1) {
      insights.push(
        `The distribution is <strong>highly ${skewness > 0 ? 'right-skewed' : 'left-skewed'}</strong> (skewness = ${skewness.toFixed(
          2
        )}).`
      );
    } else if (Math.abs(skewness) > 0.5) {
      insights.push(
        `The data is <strong>moderately ${skewness > 0 ? 'right-skewed' : 'left-skewed'}</strong> (skewness = ${skewness.toFixed(
          2
        )}).`
      );
    } else {
      insights.push(`The data appears to be roughly <strong>symmetrical</strong> (skewness = ${skewness.toFixed(2)}).`);
    }
  }

  if (stats.stdDev > 0) {
    const cv = (stats.stdDev / Math.abs(stats.mean)) * 100;
    if (cv > 30) {
      insights.push(
        `The standard deviation (<strong>${stats.stdDev.toFixed(
          2
        )}</strong>) is relatively high compared to the mean, indicating <strong>high variability</strong>.`
      );
    } else {
      insights.push(
        `The data shows <strong>low to moderate variability</strong> with a standard deviation of <strong>${stats.stdDev.toFixed(
          2
        )}</strong>.`
      );
    }
  }

  return insights;
};

const generateCategoricalInsights = (stats: ReturnType<typeof getCategoricalStats>) => {
  if (stats.length === 0) return ['Not enough data for insights.'];
  const mode = stats[0];
  return [
    `The most frequent category is <strong>"${mode.name}"</strong>, appearing in <strong>${mode.percentage.toFixed(
      1
    )}%</strong> of cases.`,
  ];
};

/* -------------------------- Small layout wrapper ------------------------- */

const AnalysisDisplayShell = ({ children, varName }: { children: React.ReactNode; varName: string }) => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/40 rounded-t-lg">
        <CardTitle className="font-headline text-lg">{varName}</CardTitle>
        <CardDescription className="text-muted-foreground">Summary, chart and insights</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">{children}</CardContent>
    </Card>
  );
};

/* --------------------------- Categorical display ------------------------- */

const ChoiceAnalysisDisplay = ({
  chartData,
  tableData,
  insightsData,
  varName,
}: {
  chartData: any;
  tableData: any[];
  insightsData: string[];
  varName: string;
}) => {
  const COLORS = ['#7a9471', '#b5a888', '#c4956a', '#a67b70', '#8ba3a3', '#6b7565', '#d4c4a8', '#9a8471', '#a8b5a3'];
  const [chartType, setChartType] = useState<'bar' | 'pie' | 'treemap'>('bar');

  return (
    <AnalysisDisplayShell varName={varName}>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-base flex justify-between items-center">
              Distribution
              <Tabs value={chartType} onValueChange={(value) => setChartType(value as any)}>
                <TabsList>
                  <TabsTrigger value="bar" className="gap-1">
                    <BarChartIcon className="w-4 h-4" />
                    <span className="sr-only">Bar</span>
                  </TabsTrigger>
                  <TabsTrigger value="pie" className="gap-1">
                    <PieChartIcon className="w-4 h-4" />
                    <span className="sr-only">Pie</span>
                  </TabsTrigger>
                  <TabsTrigger value="treemap" className="gap-1">
                    <Grid3x3 className="w-4 h-4" />
                    <span className="sr-only">Treemap</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ChartContainer config={{}} className="w-full h-[320px]">
              <ResponsiveContainer>
                {chartType === 'bar' ? (
                  <RechartsBarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" dataKey="count" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip content={<ChartTooltipContent />} cursor={{ fill: 'hsl(var(--muted))' }} />
                    <Bar dataKey="count" name="Frequency" radius={4}>
                      <LabelList
                        dataKey="count"
                        position="insideRight"
                        style={{ fill: 'hsl(var(--primary-foreground))', fontSize: 12, fontWeight: 'bold' }}
                      />
                      {chartData.map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </RechartsBarChart>
                ) : chartType === 'pie' ? (
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      label={(p: any) => `${p.name} (${p.percentage.toFixed(1)}%)`}
                    >
                      {chartData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltipContent />} />
                  </PieChart>
                ) : (
                  <Treemap
                    data={chartData}
                    dataKey="count"
                    nameKey="name"
                    aspectRatio={4 / 3}
                    stroke="#fff"
                    content={(props: any) => {
                      const { x, y, width, height, name } = props;
                      return (
                        <g>
                          <rect x={x} y={y} width={width} height={height} fill="hsl(var(--muted))" />
                          <text x={x + 6} y={y + 18} className="text-[12px] fill-foreground">
                            {name}
                          </text>
                        </g>
                      );
                    }}
                  />
                )}
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2 border-b bg-muted/20">
              <CardTitle className="text-base">Summary Statistics</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[220px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Option</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Percentage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.map((item, index) => (
                    <TableRow key={`${item.name}-${index}`}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right font-mono">{item.count}</TableCell>
                      <TableCell className="text-right font-mono">{Number(item.percentage).toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 border-b bg-muted/20">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Key Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {insightsData.map((insight, i) => (
                <Alert key={i} variant="secondary" className="text-sm">
                  <AlertDescription dangerouslySetInnerHTML={{ __html: insight }} />
                </Alert>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AnalysisDisplayShell>
  );
};

/* ---------------------------- Numeric display ---------------------------- */

const NumberAnalysisDisplay = ({
  chartData,
  tableData,
  insightsData,
  varName,
  comparisonData,
}: {
  chartData: any;
  tableData: any;
  insightsData: string[];
  varName: string;
  comparisonData?: any;
}) => {
  const COLORS = ['#7a9471', '#b5a888', '#c4956a', '#a67b70', '#8ba3a3', '#6b7565', '#d4c4a8', '#9a8471', '#a8b5a3'];

  return (
    <AnalysisDisplayShell varName={varName}>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-base">Response Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <div className="w-full h-[320px]">
              <Plot
                data={
                  comparisonData
                    ? [
                        { x: chartData.values, type: 'histogram', name: 'Overall', opacity: 0.7, marker: { color: COLORS[0] } },
                        {
                          x: comparisonData.chartData.values,
                          type: 'histogram',
                          name: comparisonData.filterValue,
                          opacity: 0.7,
                          marker: { color: COLORS[1] },
                        },
                      ]
                    : [{ x: chartData.values, type: 'histogram', marker: { color: COLORS[0] } }]
                }
                layout={{
                  autosize: true,
                  margin: { t: 24, b: 40, l: 40, r: 16 },
                  bargap: 0.1,
                  barmode: 'overlay',
                }}
                style={{ width: '100%', height: '100%' }}
                config={{ displayModeBar: false }}
                useResizeHandler
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2 border-b bg-muted/20">
              <CardTitle className="text-base">Summary Statistics</CardTitle>
            </CardHeader>
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
                  <TableRow>
                    <TableCell>Mean</TableCell>
                    <TableCell className="text-right font-mono">{Number(tableData.mean).toFixed(3)}</TableCell>
                    {comparisonData && (
                      <TableCell className="text-right font-mono">{Number(comparisonData.tableData.mean).toFixed(3)}</TableCell>
                    )}
                  </TableRow>
                  <TableRow>
                    <TableCell>Median</TableCell>
                    <TableCell className="text-right font-mono">{tableData.median}</TableCell>
                    {comparisonData && <TableCell className="text-right font-mono">{comparisonData.tableData.median}</TableCell>}
                  </TableRow>
                  <TableRow>
                    <TableCell>Mode</TableCell>
                    <TableCell className="text-right font-mono">{tableData.mode}</TableCell>
                    {comparisonData && <TableCell className="text-right font-mono">{comparisonData.tableData.mode}</TableCell>}
                  </TableRow>
                  <TableRow>
                    <TableCell>Std. Deviation</TableCell>
                    <TableCell className="text-right font-mono">{Number(tableData.stdDev).toFixed(3)}</TableCell>
                    {comparisonData && (
                      <TableCell className="text-right font-mono">{Number(comparisonData.tableData.stdDev).toFixed(3)}</TableCell>
                    )}
                  </TableRow>
                  <TableRow>
                    <TableCell>Total Responses</TableCell>
                    <TableCell className="text-right font-mono">{tableData.count}</TableCell>
                    {comparisonData && <TableCell className="text-right font-mono">{comparisonData.tableData.count}</TableCell>}
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 border-b bg-muted/20">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Key Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {insightsData.map((insight, i) => (
                <Alert key={i} variant="secondary" className="text-sm">
                  <AlertDescription dangerouslySetInnerHTML={{ __html: insight }} />
                </Alert>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AnalysisDisplayShell>
  );
};

/* ------------------------- Grouped statistics table ---------------------- */

const GroupedStatisticsTable = ({
  data,
  selectedVars,
  groupVar,
}: {
  data: DataSet;
  selectedVars: string[];
  groupVar: string;
}) => {
  const statsByGroup = useMemo(() => {
    const groups = Array.from(new Set(data.map(row => row[groupVar])));
    const result: { [group: string]: { [variable: string]: ReturnType<typeof getNumericStats> } } = {};

    groups.forEach(group => {
      const groupData = data.filter(row => row[groupVar] === group);
      result[String(group)] = {};
      selectedVars.forEach(varName => {
        const columnData = groupData.map(row => row[varName]);
        result[String(group)][varName] = getNumericStats(columnData);
      });
    });
    return result;
  }, [data, selectedVars, groupVar]);

  const metrics: (keyof ReturnType<typeof getNumericStats>)[] = ['count', 'missing', 'mean', 'median', 'stdDev', 'min', 'max', 'skewness'];
  const groups = Object.keys(statsByGroup);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/40">
        <CardTitle className="font-headline">Descriptive Statistics by {groupVar}</CardTitle>
        <CardDescription className="text-muted-foreground">Numeric variables grouped by selected category.</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <ScrollArea className="w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Statistic</TableHead>
                <TableHead className="w-[140px]">{groupVar}</TableHead>
                {selectedVars.map(v => (
                  <TableHead key={v} className="text-right">
                    {v}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map(metric => (
                <React.Fragment key={metric}>
                  {groups.map((group, groupIndex) => (
                    <TableRow key={`${metric}-${group}`}>
                      {groupIndex === 0 && (
                        <TableHead rowSpan={groups.length} className="align-top capitalize">
                          {String(metric).replace(/([A-Z])/g, ' $1').trim()}
                        </TableHead>
                      )}
                      <TableCell className="font-medium">{group}</TableCell>
                      {selectedVars.map(varName => {
                        const statValue = statsByGroup[group]?.[varName]?.[metric];
                        return (
                          <TableCell key={`${metric}-${group}-${varName}`} className="text-right font-mono">
                            {typeof statValue === 'number' && !isNaN(statValue) ? Number(statValue).toFixed(2) : 'NaN'}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

/* ------------------------------- Intro page ------------------------------ */

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void; onLoadExample: (e: any) => void }) => {
  const irisExample = exampleDatasets.find(ex => ex.id === 'iris');
  const tipsExample = exampleDatasets.find(ex => ex.id === 'tips');

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-4xl shadow-2xl overflow-hidden">
        <CardHeader className="text-center p-8 bg-muted/50 border-b">
          <CardTitle className="font-headline text-4xl font-bold">Descriptive Statistics</CardTitle>
          <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
            Summarize and describe the main features of a collection of data. This is the first step in any data analysis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-10 px-8 py-10">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-4">Why Use Descriptive Statistics?</h2>
            <p className="max-w-3xl mx-auto text-muted-foreground">
              Descriptive statistics provide a simple summary of the sample and the measures. They form the basis of virtually every quantitative analysis and help you understand your dataset before moving on to more complex analyses.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tipsExample && (
              <Card
                className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onLoadExample(tipsExample)}
              >
                <div className="mx-auto h-8 w-8 rounded-md bg-secondary" />
                <div>
                  <h4 className="font-semibold">{tipsExample.name}</h4>
                  <p className="text-xs text-muted-foreground">{tipsExample.description}</p>
                </div>
              </Card>
            )}
            {irisExample && (
              <Card
                className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onLoadExample(irisExample)}
              >
                <div className="mx-auto h-8 w-8 rounded-md bg-secondary" />
                <div>
                  <h4 className="font-semibold">{irisExample.name}</h4>
                  <p className="text-xs text-muted-foreground">{irisExample.description}</p>
                </div>
              </Card>
            )}
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="font-semibold text-2xl">Setup Guide</h3>
              <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                <li>
                  <strong>Upload Data:</strong> Provide a dataset in a common format like CSV or Excel.
                </li>
                <li>
                  <strong>Select Variables:</strong> Choose variables to analyze. Detection for numeric/categorical happens automatically.
                </li>
                <li>
                  <strong>Run Analysis:</strong> Click the button to generate statistics and visualizations.
                </li>
              </ol>
            </div>
            <div className="space-y-6">
              <h3 className="font-semibold text-2xl">Results Interpretation</h3>
              <ul className="list-disc pl-5 space-y-3 text-muted-foreground">
                <li>
                  <strong>Numeric:</strong> Mean/median for central tendency, std dev/range for spread.
                </li>
                <li>
                  <strong>Categorical:</strong> See counts and percentages; mode is the most common.
                </li>
                <li>
                  <strong>Visuals:</strong> Histograms for numeric; bar/pie charts for categorical.
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end p-6 bg-muted/30 border-t"></CardFooter>
      </Card>
    </div>
  );
};

/* ------------------------- Main Descriptive page ------------------------- */

interface DescriptiveStatsPageProps {
  data: DataSet;
  allHeaders: string[];
  numericHeaders: string[];
  categoricalHeaders: string[];
  onLoadExample: (example: ExampleDataSet) => void;
}

export default function DescriptiveStatisticsPage({
  data,
  allHeaders,
  numericHeaders,
  categoricalHeaders,
  onLoadExample,
}: DescriptiveStatsPageProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVars, setSelectedVars] = useState<string[]>(allHeaders);
  const [analysisData, setAnalysisData] = useState<any | null>(null);
  const [view, setView] = useState('intro');
  const [groupByVar, setGroupByVar] = useState<string | undefined>();

  useEffect(() => {
    setSelectedVars(allHeaders);
    setAnalysisData(null);
    setView(data.length > 0 ? 'main' : 'intro');
  }, [allHeaders, data]);

  const handleVarSelectionChange = (varName: string, isChecked: boolean) => {
    setSelectedVars(prev => (isChecked ? [...prev, varName] : prev.filter(v => v !== varName)));
  };

  const runAnalysis = useCallback(() => {
    if (selectedVars.length === 0) {
      toast({
        title: 'No Variables Selected',
        description: 'Please select at least one variable to analyze.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);

    setTimeout(() => {
      const results: { [key: string]: any } = {};

      for (const varName of selectedVars) {
        if (!data[0] || !(varName in data[0])) {
          results[varName] = { error: `Variable '${varName}' not found in data.` };
          continue;
        }

        const columnData = data.map((row: any) => row[varName]);
        const isNumeric = numericHeaders.includes(varName);

        if (isNumeric) {
          const stats = getNumericStats(columnData);
          results[varName] = {
            type: 'numeric',
            stats: stats,
            plotData: { values: columnData.filter(v => typeof v === 'number') },
            insights: generateNumericInsights(stats),
          };
        } else {
          const stats = getCategoricalStats(columnData);
          results[varName] = {
            type: 'categorical',
            stats: stats,
            plotData: stats.map(s => ({ name: s.name, count: s.count, percentage: parseFloat(s.percentage as any) })),
            insights: generateCategoricalInsights(stats),
          };
        }
      }
      setAnalysisData(results);
      setIsLoading(false);
      toast({
        title: 'Analysis Complete',
        description: `Descriptive statistics generated for ${selectedVars.length} variable(s).`,
      });
    }, 500);
  }, [data, selectedVars, toast, numericHeaders]);

  const renderIndividualResults = () => {
    if (!analysisData) return null;
    return (
      <div className="space-y-8">
        {selectedVars
          .filter(h => numericHeaders.includes(h))
          .map(header => {
            if (!analysisData[header] || analysisData[header].error) return null;
            const result = analysisData[header];
            return (
              <div key={header}>
                <NumberAnalysisDisplay
                  chartData={result.plotData}
                  tableData={result.stats}
                  insightsData={result.insights}
                  varName={header}
                />
              </div>
            );
          })}
        {selectedVars
          .filter(h => categoricalHeaders.includes(h))
          .map(header => {
            if (!analysisData[header] || analysisData[header].error) return null;
            const result = analysisData[header];
            return (
              <div key={header}>
                <ChoiceAnalysisDisplay
                  chartData={result.plotData}
                  tableData={result.stats}
                  insightsData={result.insights}
                  varName={header}
                />
              </div>
            );
          })}
      </div>
    );
  };

  if (view === 'intro') {
    return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/40">
          <div className="flex justify-between items-start gap-2">
            <div>
              <CardTitle className="font-headline text-xl flex items-center gap-2">
                <BarChartIcon className="w-5 h-5 text-primary" />
                Descriptive Statistics Analysis
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Select the variables you want to analyze from your dataset.
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setView('intro')} title="Help">
              <HelpCircle className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label>Variables for Analysis</Label>
              <ScrollArea className="h-48 border rounded-lg p-3 mt-2 bg-muted/30">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {allHeaders
                    .filter(h => h)
                    .map(h => (
                      <Label key={h} className="flex items-center gap-2 text-sm font-medium">
                        <Checkbox
                          id={`var-${h}`}
                          onCheckedChange={checked => handleVarSelectionChange(h, !!checked)}
                          checked={selectedVars.includes(h)}
                        />
                        {h}
                      </Label>
                    ))}
                </div>
              </ScrollArea>
            </div>
            <div>
              <Label>Group By (Optional)</Label>
              <Select value={groupByVar} onValueChange={v => setGroupByVar(v === 'none' ? undefined : v)}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {categoricalHeaders.filter(h => h).map(h => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">Select a categorical variable to see statistics for each group.</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end border-t bg-muted/20">
          <Button onClick={runAnalysis} disabled={isLoading || selectedVars.length === 0}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
            {isLoading ? 'Running...' : 'Run Analysis'}
          </Button>
        </CardFooter>
      </Card>

      {isLoading && (
        <Card>
          <CardContent className="p-10">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-[220px] w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {analysisData ? (
        groupByVar ? (
          <GroupedStatisticsTable data={data} selectedVars={selectedVars.filter(v => numericHeaders.includes(v))} groupVar={groupByVar} />
        ) : (
          renderIndividualResults()
        )
      ) : (
        !isLoading && (
          <div className="text-center text-muted-foreground py-16 space-y-2">
            <BarChartIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="text-lg font-medium">No analysis yet</p>
            <p className="text-sm">Select variables and click <strong>Run Analysis</strong> to see the results.</p>
          </div>
        )
      )}
    </div>
  );
}

