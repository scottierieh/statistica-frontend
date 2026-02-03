'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Activity, LineChart as LineChartIcon, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, CartesianGrid, Line, ComposedChart } from 'recharts';
import type { AnalysisConfig, AnalysisResults } from './ManufacturingLayout';

interface SpcAnalysisProps {
    config: AnalysisConfig;
    analysisResult: AnalysisResults | null;
}

const formatNumber = (num: number, decimals: number = 2): string => {
    if (num === null || num === undefined || isNaN(num)) return 'N/A';
    return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

// SPC Chart Component
const SpcChart = ({ data, title, yAxisLabel, violations = [] }: { 
    data: any[], 
    title: string, 
    yAxisLabel: string, 
    violations?: any[] 
}) => {
    const violationSamples = new Set(violations.map((v: any) => v.sample));
    const chartData = data.map(point => ({ ...point, isViolation: violationSamples.has(point.sample) }));

    return (
        <div className="w-full">
            {title && (
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-gray-800">
                    <LineChartIcon className="h-4 w-4" />
                    {title}
                    {violations.length > 0 && (
                        <Badge variant="destructive" className="ml-2">
                            {violations.length} violation{violations.length > 1 ? 's' : ''}
                        </Badge>
                    )}
                </h3>
            )}
            <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" fontSize={10} tick={{ fill: '#6b7280' }} />
                    <YAxis 
                        fontSize={10} 
                        tick={{ fill: '#6b7280' }} 
                        label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 11 } }} 
                    />
                    <RechartsTooltip 
                        contentStyle={{ 
                            backgroundColor: '#fff', 
                            border: '1px solid #e5e7eb', 
                            borderRadius: '8px', 
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                        }} 
                    />
                    <Legend />
                    <Line type="monotone" dataKey="ucl" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="8 4" name="UCL" dot={false} />
                    <Line type="monotone" dataKey="lcl" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="8 4" name="LCL" dot={false} />
                    <Line type="monotone" dataKey="cl" stroke="#22c55e" strokeWidth={2} strokeDasharray="4 2" name="Center Line" dot={false} />
                    <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#3b82f6" 
                        strokeWidth={2.5} 
                        name="Process Value"
                        dot={(props: any) => {
                            const { cx, cy, payload } = props;
                            if (payload.isViolation) {
                                return <circle cx={cx} cy={cy} r={6} fill="#ef4444" stroke="#fff" strokeWidth={2} />;
                            }
                            return <circle cx={cx} cy={cy} r={3} fill="#3b82f6" />;
                        }} 
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

// Violation Item Component
const ViolationItem = ({ violation }: { violation: any }) => (
    <div className={`p-3 rounded-lg border ${
        violation.severity === 'critical' 
            ? 'bg-red-50 border-red-200' 
            : 'bg-yellow-50 border-yellow-200'
    }`}>
        <div className="flex items-start gap-2">
            {violation.severity === 'critical' ? (
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
            ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
            )}
            <div>
                <p className="text-sm font-medium text-gray-800">
                    Sample {violation.sample}: {violation.rule_name}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">{violation.message}</p>
                <p className="text-xs text-gray-500 mt-1 italic">{violation.action}</p>
            </div>
        </div>
    </div>
);

export default function SpcAnalysis({ config, analysisResult }: SpcAnalysisProps) {
    if (!analysisResult) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">SPC Analysis</h2>
                    <p className="text-gray-500 mt-1">Statistical Process Control charts</p>
                </div>
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>No Analysis Data</AlertTitle>
                    <AlertDescription>
                        Please configure variables and run analysis in the Variable Settings page first.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const totalViolations = analysisResult.spc_violations.total_critical + analysisResult.spc_violations.total_warnings;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">SPC Analysis</h2>
                    <p className="text-gray-500 mt-1">
                        Statistical Process Control for <span className="font-medium">{config.spcVariable}</span>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {totalViolations > 0 ? (
                        <Badge variant="destructive">
                            {totalViolations} Violation{totalViolations > 1 ? 's' : ''} Detected
                        </Badge>
                    ) : (
                        <Badge variant="default" className="bg-green-600">
                            Process In Control
                        </Badge>
                    )}
                </div>
            </div>

            {/* Summary KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-sm text-gray-500">Process Mean (X̄)</p>
                            <p className="text-2xl font-bold mt-1">
                                {formatNumber(analysisResult.spc_statistics.x_bar.mean)}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-sm text-gray-500">Std Deviation</p>
                            <p className="text-2xl font-bold mt-1">
                                {formatNumber(analysisResult.spc_statistics.x_bar.std)}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-sm text-gray-500">Mean Range (R̄)</p>
                            <p className="text-2xl font-bold mt-1">
                                {formatNumber(analysisResult.spc_statistics.r_chart.mean)}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-sm text-gray-500">Critical Violations</p>
                            <p className={`text-2xl font-bold mt-1 ${
                                analysisResult.spc_violations.total_critical > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                                {analysisResult.spc_violations.total_critical}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* X-bar Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>X-bar Control Chart</CardTitle>
                    <CardDescription>
                        Monitors the process mean. Points outside control limits indicate assignable cause variation.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SpcChart 
                        data={analysisResult.spc_x_bar_data} 
                        title="" 
                        yAxisLabel="Sample Mean" 
                        violations={analysisResult.spc_violations.x_bar} 
                    />
                    <Separator className="my-4" />
                    <div className="grid grid-cols-3 gap-4 text-sm text-center">
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-gray-500">Upper Control Limit (UCL)</p>
                            <p className="font-mono text-lg text-red-600 font-semibold">
                                {formatNumber(analysisResult.spc_statistics.x_bar.ucl)}
                            </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-gray-500">Center Line (X̄̄)</p>
                            <p className="font-mono text-lg text-green-600 font-semibold">
                                {formatNumber(analysisResult.spc_statistics.x_bar.mean)}
                            </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-gray-500">Lower Control Limit (LCL)</p>
                            <p className="font-mono text-lg text-red-600 font-semibold">
                                {formatNumber(analysisResult.spc_statistics.x_bar.lcl)}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* R Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>R Control Chart (Range)</CardTitle>
                    <CardDescription>
                        Monitors process variability within subgroups. Increasing range suggests process instability.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SpcChart 
                        data={analysisResult.spc_r_chart_data} 
                        title="" 
                        yAxisLabel="Sample Range" 
                        violations={analysisResult.spc_violations.r_chart} 
                    />
                    <Separator className="my-4" />
                    <div className="grid grid-cols-3 gap-4 text-sm text-center">
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-gray-500">Upper Control Limit (UCL)</p>
                            <p className="font-mono text-lg text-red-600 font-semibold">
                                {formatNumber(analysisResult.spc_statistics.r_chart.ucl)}
                            </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-gray-500">Average Range (R̄)</p>
                            <p className="font-mono text-lg text-green-600 font-semibold">
                                {formatNumber(analysisResult.spc_statistics.r_chart.mean)}
                            </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-gray-500">Lower Control Limit (LCL)</p>
                            <p className="font-mono text-lg text-red-600 font-semibold">
                                {formatNumber(analysisResult.spc_statistics.r_chart.lcl)}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Violations Detail */}
            {totalViolations > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-500" />
                            Control Chart Violations
                        </CardTitle>
                        <CardDescription>
                            Western Electric Rules violations detected in current analysis
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {[...analysisResult.spc_violations.x_bar, ...analysisResult.spc_violations.r_chart]
                                .sort((a, b) => (a.severity === 'critical' ? -1 : 1))
                                .map((violation, idx) => (
                                    <ViolationItem key={idx} violation={violation} />
                                ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}