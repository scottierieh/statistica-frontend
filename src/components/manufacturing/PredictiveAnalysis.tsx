'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Info, BarChart3 } from 'lucide-react';
import { ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, Bar, BarChart, Cell } from 'recharts';
import type { AnalysisConfig, AnalysisResults } from './ManufacturingLayout';

interface PredictiveAnalysisProps {
    config: AnalysisConfig;
    analysisResult: AnalysisResults | null;
}

const formatNumber = (num: number, decimals: number = 4): string => {
    if (num === null || num === undefined || isNaN(num)) return 'N/A';
    return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

// Feature Importance Chart
const FeatureImportanceChart = ({ features }: { features: Array<{ feature: string; r2: number; direction: string }> }) => {
    const data = features.slice(0, 8).map(f => ({
        name: f.feature.length > 15 ? f.feature.substring(0, 15) + '...' : f.feature,
        fullName: f.feature,
        importance: Math.abs(f.r2) * 100,
        direction: f.direction,
        r2: f.r2
    }));

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                <XAxis 
                    type="number" 
                    domain={[0, 100]} 
                    tickFormatter={(v) => `${v}%`} 
                    fontSize={10} 
                    tick={{ fill: '#6b7280' }} 
                />
                <YAxis 
                    type="category" 
                    dataKey="name" 
                    fontSize={11} 
                    width={100} 
                    tick={{ fill: '#374151' }} 
                />
                <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value: number, name: string, props: any) => [
                        `R² = ${(props.payload.r2 * 100).toFixed(1)}%`,
                        props.payload.fullName
                    ]}
                />
                <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.direction === 'positive' ? '#ef4444' : '#22c55e'} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

// Model Coefficient Card
const CoefficientCard = ({ feature, model }: { feature: string; model: any }) => (
    <div className={`p-4 rounded-lg border ${model.is_significant ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900">{feature}</h4>
            {model.is_significant && (
                <Badge variant="outline" className="text-xs border-blue-500 text-blue-600">
                    Significant
                </Badge>
            )}
        </div>
        
        <div className="space-y-2 text-sm">
            <div className="flex justify-between">
                <span className="text-gray-500">Coefficient</span>
                <span className={`font-mono font-medium ${model.coefficient > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {model.coefficient > 0 ? '+' : ''}{formatNumber(model.coefficient)}
                </span>
            </div>
            <div className="flex justify-between">
                <span className="text-gray-500">R² Score</span>
                <span className="font-mono">{(model.r2 * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
                <span className="text-gray-500">Correlation</span>
                <span className="font-mono">{formatNumber(model.correlation, 3)}</span>
            </div>
            <div className="flex justify-between">
                <span className="text-gray-500">P-value</span>
                <span className={`font-mono ${model.p_value < 0.05 ? 'text-green-600' : 'text-gray-500'}`}>
                    {model.p_value < 0.001 ? '<0.001' : formatNumber(model.p_value)}
                </span>
            </div>
        </div>

        <Separator className="my-3" />
        
        <p className="text-xs text-gray-500">
            {model.relationship === 'positive' ? '↑' : '↓'} 1 unit increase = {model.coefficient > 0 ? '+' : ''}{formatNumber(model.coefficient)} change
        </p>
    </div>
);

export default function PredictiveAnalysis({ config, analysisResult }: PredictiveAnalysisProps) {
    if (!analysisResult) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Predictive Analysis</h2>
                    <p className="text-gray-500 mt-1">Regression models and feature importance</p>
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

    if (!analysisResult.defect_regression_model) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Predictive Analysis</h2>
                    <p className="text-gray-500 mt-1">Regression models and feature importance</p>
                </div>
                <Card>
                    <CardContent className="py-12 text-center">
                        <BarChart3 className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900">No Predictive Analysis Available</h3>
                        <p className="text-gray-500 mt-2 max-w-md mx-auto">
                            To enable predictive analysis, select a prediction target and predictor features in the Variable Settings page.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const regression = analysisResult.defect_regression_model;
    const significantCount = Object.values(regression.individual_models).filter((m: any) => m.is_significant).length;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Predictive Analysis</h2>
                    <p className="text-gray-500 mt-1">
                        Predicting <span className="font-medium">{config.regressionTarget}</span> using {config.regressionFeatures.length} features
                    </p>
                </div>
                <Badge variant="outline">
                    {significantCount} Significant Factor{significantCount !== 1 ? 's' : ''}
                </Badge>
            </div>

            {/* Feature Importance */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-500" />
                        Feature Importance
                    </CardTitle>
                    <CardDescription>
                        How strongly each variable influences {config.regressionTarget} (based on R² score)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <FeatureImportanceChart features={regression.feature_importance} />
                    <div className="flex justify-center gap-8 mt-4 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-red-500 rounded" />
                            <span className="text-gray-600">Increases {config.regressionTarget}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-green-500 rounded" />
                            <span className="text-gray-600">Decreases {config.regressionTarget}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Multivariate Model */}
            {regression.multivariate_model && (
                <Card>
                    <CardHeader>
                        <CardTitle>Multivariate Regression Model</CardTitle>
                        <CardDescription>
                            Combined model using all selected features
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-500">Model Fit (R² Score)</span>
                                <span className="text-2xl font-bold">
                                    {(regression.multivariate_model.r2 * 100).toFixed(1)}%
                                </span>
                            </div>
                            <Progress value={regression.multivariate_model.r2 * 100} className="h-2" />
                            <p className="text-xs text-gray-400 mt-2">
                                The model explains {(regression.multivariate_model.r2 * 100).toFixed(1)}% of the variance in {config.regressionTarget}
                            </p>
                        </div>

                        <Separator />

                        <div>
                            <h4 className="font-medium text-gray-900 mb-3">Model Coefficients</h4>
                            <div className="space-y-2">
                                {Object.entries(regression.multivariate_model.coefficients).map(([feature, coef]) => (
                                    <div key={feature} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                        <span className="text-sm text-gray-700">{feature}</span>
                                        <span className={`font-mono font-medium ${(coef as number) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {(coef as number) > 0 ? '+' : ''}{formatNumber(coef as number)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Individual Models */}
            <Card>
                <CardHeader>
                    <CardTitle>Individual Factor Analysis</CardTitle>
                    <CardDescription>
                        Detailed regression statistics for each predictor variable
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(regression.individual_models)
                            .sort(([, a]: any, [, b]: any) => b.r2 - a.r2)
                            .map(([feature, model]) => (
                                <CoefficientCard key={feature} feature={feature} model={model} />
                            ))}
                    </div>
                </CardContent>
            </Card>

            {/* Statistical Significance Guide */}
            <Card>
                <CardHeader>
                    <CardTitle>Understanding the Results</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <h4 className="font-semibold text-gray-900">R² Score</h4>
                            <p className="text-gray-600 mt-1">
                                Indicates how much of the variance in the target is explained by the feature. Higher is better (0-100%).
                            </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <h4 className="font-semibold text-gray-900">P-value</h4>
                            <p className="text-gray-600 mt-1">
                                Values below 0.05 indicate statistical significance - the relationship is unlikely due to chance.
                            </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <h4 className="font-semibold text-gray-900">Coefficient</h4>
                            <p className="text-gray-600 mt-1">
                                The expected change in target for each unit increase in the feature. Positive = increases target.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}