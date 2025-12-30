'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Gauge, Info, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { AnalysisResults } from './ManufacturingLayout';

interface CapabilityAnalysisProps {
    analysisResult: AnalysisResults | null;
}

const formatNumber = (num: number, decimals: number = 2): string => {
    if (num === null || num === undefined || isNaN(num)) return 'N/A';
    return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

// Capability Gauge Component
const CapabilityGauge = ({ value, label }: { value: number | null; label: string }) => {
    const cpk = value ?? 0;
    const percentage = Math.min(100, (cpk / 2) * 100);
    
    const getGaugeColor = () => {
        if (cpk >= 1.67) return '#22c55e';
        if (cpk >= 1.33) return '#84cc16';
        if (cpk >= 1.0) return '#eab308';
        if (cpk >= 0.67) return '#f97316';
        return '#ef4444';
    };

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-36 h-36">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle 
                        cx="50" cy="50" r="40" 
                        fill="none" stroke="#e5e7eb" strokeWidth="12" 
                        strokeLinecap="round" strokeDasharray="188.5" strokeDashoffset="47" 
                    />
                    <circle 
                        cx="50" cy="50" r="40" 
                        fill="none" stroke={getGaugeColor()} strokeWidth="12" 
                        strokeLinecap="round" strokeDasharray="188.5" 
                        strokeDashoffset={188.5 - (percentage * 1.415)} 
                        className="transition-all duration-1000" 
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold" style={{ color: getGaugeColor() }}>
                        {value !== null ? value.toFixed(2) : 'N/A'}
                    </span>
                    <span className="text-sm text-gray-500">{label}</span>
                </div>
            </div>
        </div>
    );
};

// Metric Card Component
const MetricCard = ({ label, value, description }: { label: string; value: string; description?: string }) => (
    <div className="p-4 bg-gray-50 rounded-lg text-center">
        <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
    </div>
);

// Sigma Level Indicator
const SigmaLevelIndicator = ({ level }: { level: number }) => {
    const sigmaLevels = [
        { min: 0, max: 2, label: '1-2σ', color: 'bg-red-500', description: 'Poor' },
        { min: 2, max: 3, label: '2-3σ', color: 'bg-orange-500', description: 'Fair' },
        { min: 3, max: 4, label: '3-4σ', color: 'bg-yellow-500', description: 'Good' },
        { min: 4, max: 5, label: '4-5σ', color: 'bg-lime-500', description: 'Very Good' },
        { min: 5, max: 6, label: '5-6σ', color: 'bg-green-500', description: 'Excellent' },
        { min: 6, max: Infinity, label: '6σ+', color: 'bg-emerald-500', description: 'World Class' },
    ];

    return (
        <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
                <span>1σ</span>
                <span>2σ</span>
                <span>3σ</span>
                <span>4σ</span>
                <span>5σ</span>
                <span>6σ</span>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden bg-gray-200">
                {sigmaLevels.map((s, idx) => (
                    <div 
                        key={idx} 
                        className={`flex-1 ${level >= s.min ? s.color : 'bg-gray-200'} transition-colors`}
                    />
                ))}
            </div>
            <div className="text-center">
                <span className="text-lg font-bold">{level.toFixed(2)}σ</span>
                <span className="text-sm text-gray-500 ml-2">
                    ({sigmaLevels.find(s => level >= s.min && level < s.max)?.description || 'Unknown'})
                </span>
            </div>
        </div>
    );
};

export default function CapabilityAnalysis({ analysisResult }: CapabilityAnalysisProps) {
    if (!analysisResult) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Process Capability</h2>
                    <p className="text-gray-500 mt-1">Capability indices and sigma level analysis</p>
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

    const capability = analysisResult.process_capability;
    const isCapable = (capability.cpk ?? 0) >= 1.33;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Process Capability</h2>
                    <p className="text-gray-500 mt-1">Capability indices and performance metrics</p>
                </div>
                <Badge variant={isCapable ? "default" : "destructive"} className={isCapable ? "bg-green-600" : ""}>
                    {capability.interpretation.toUpperCase()}
                </Badge>
            </div>

            {/* Main Gauges */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardContent className="pt-6">
                        <CapabilityGauge value={capability.cpk} label="Cpk" />
                        <p className="text-xs text-center text-gray-500 mt-2">Process Capability Index</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <CapabilityGauge value={capability.cp} label="Cp" />
                        <p className="text-xs text-center text-gray-500 mt-2">Process Potential Index</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <CapabilityGauge value={capability.cpu} label="CPU" />
                        <p className="text-xs text-center text-gray-500 mt-2">Upper Capability</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <CapabilityGauge value={capability.cpl} label="CPL" />
                        <p className="text-xs text-center text-gray-500 mt-2">Lower Capability</p>
                    </CardContent>
                </Card>
            </div>

            {/* Sigma Level */}
            <Card>
                <CardHeader>
                    <CardTitle>Sigma Level Performance</CardTitle>
                    <CardDescription>Process sigma level based on capability analysis</CardDescription>
                </CardHeader>
                <CardContent>
                    <SigmaLevelIndicator level={capability.sigma_level} />
                </CardContent>
            </Card>

            {/* Detailed Metrics */}
            <Card>
                <CardHeader>
                    <CardTitle>Detailed Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MetricCard 
                            label="Process Mean" 
                            value={formatNumber(capability.mean)} 
                        />
                        <MetricCard 
                            label="Std Deviation" 
                            value={formatNumber(capability.std)} 
                        />
                        <MetricCard 
                            label="Sigma Level" 
                            value={`${capability.sigma_level?.toFixed(2)}σ`} 
                        />
                        <MetricCard 
                            label="Est. PPM Defects" 
                            value={formatNumber(capability.estimated_ppm, 0)} 
                            description="Parts per million"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Interpretation */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {isCapable ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                            <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        )}
                        Interpretation & Recommendation
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert className={isCapable ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
                        <AlertTitle className="text-lg">{capability.description}</AlertTitle>
                        <AlertDescription className="mt-2">{capability.recommendation}</AlertDescription>
                    </Alert>

                    <Separator />

                    {/* Capability Reference Guide */}
                    <div>
                        <h4 className="font-medium text-gray-900 mb-3">Capability Index Reference</h4>
                        <div className="grid grid-cols-5 gap-2 text-xs">
                            <div className="p-2 bg-red-100 rounded text-center">
                                <p className="font-semibold text-red-700">Poor</p>
                                <p className="text-red-600">Cpk &lt; 0.67</p>
                            </div>
                            <div className="p-2 bg-orange-100 rounded text-center">
                                <p className="font-semibold text-orange-700">Marginal</p>
                                <p className="text-orange-600">0.67 - 1.0</p>
                            </div>
                            <div className="p-2 bg-yellow-100 rounded text-center">
                                <p className="font-semibold text-yellow-700">Acceptable</p>
                                <p className="text-yellow-600">1.0 - 1.33</p>
                            </div>
                            <div className="p-2 bg-lime-100 rounded text-center">
                                <p className="font-semibold text-lime-700">Good</p>
                                <p className="text-lime-600">1.33 - 1.67</p>
                            </div>
                            <div className="p-2 bg-green-100 rounded text-center">
                                <p className="font-semibold text-green-700">Excellent</p>
                                <p className="text-green-600">≥ 1.67</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}