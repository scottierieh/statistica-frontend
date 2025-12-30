'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lightbulb, Info, CheckCircle2, AlertCircle, AlertTriangle, Zap, TrendingUp, Gauge, Activity } from 'lucide-react';
import type { AnalysisResults } from './ManufacturingLayout';

interface InsightsPanelProps {
    analysisResult: AnalysisResults | null;
}

interface Insight {
    type: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    recommendation: string;
}

// Insight Card Component
const InsightCard = ({ insight, index }: { insight: Insight; index: number }) => {
    const getPriorityStyles = () => {
        switch (insight.priority) {
            case 'critical':
                return { border: 'border-l-red-500', bg: 'bg-red-50', icon: AlertCircle, iconColor: 'text-red-500' };
            case 'high':
                return { border: 'border-l-orange-500', bg: 'bg-orange-50', icon: AlertTriangle, iconColor: 'text-orange-500' };
            case 'medium':
                return { border: 'border-l-yellow-500', bg: 'bg-yellow-50', icon: Lightbulb, iconColor: 'text-yellow-500' };
            default:
                return { border: 'border-l-blue-500', bg: 'bg-blue-50', icon: Info, iconColor: 'text-blue-500' };
        }
    };

    const getTypeIcon = () => {
        switch (insight.type) {
            case 'spc_alert': return Activity;
            case 'capability': return Gauge;
            case 'correlation': return TrendingUp;
            default: return Lightbulb;
        }
    };

    const styles = getPriorityStyles();
    const Icon = styles.icon;
    const TypeIcon = getTypeIcon();

    return (
        <div className={`p-5 ${styles.bg} border border-l-4 ${styles.border} rounded-lg`}>
            <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg bg-white shadow-sm`}>
                    <Icon className={`h-5 w-5 ${styles.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                        <Badge 
                            variant={insight.priority === 'critical' ? 'destructive' : 'outline'}
                            className="text-xs"
                        >
                            {insight.priority}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                            <TypeIcon className="h-3 w-3 mr-1" />
                            {insight.type.replace('_', ' ')}
                        </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
                    <div className="flex items-start gap-2 p-3 bg-white rounded-lg border">
                        <Zap className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-xs font-medium text-gray-700">Recommended Action</p>
                            <p className="text-sm text-gray-600 mt-0.5">{insight.recommendation}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Summary Stats Card
const SummaryCard = ({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) => (
    <div className={`p-4 rounded-lg border ${color}`}>
        <div className="flex items-center gap-3">
            <Icon className="h-5 w-5" />
            <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-sm opacity-80">{label}</p>
            </div>
        </div>
    </div>
);

export default function InsightsPanel({ analysisResult }: InsightsPanelProps) {
    if (!analysisResult) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">AI Insights</h2>
                    <p className="text-gray-500 mt-1">Automated analysis and recommendations</p>
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

    // Combine all insights
    const allInsights: Insight[] = [
        ...analysisResult.insights,
        ...(analysisResult.defect_regression_model?.insights || [])
    ];

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const sortedInsights = [...allInsights].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Count by priority
    const criticalCount = allInsights.filter(i => i.priority === 'critical').length;
    const highCount = allInsights.filter(i => i.priority === 'high').length;
    const mediumCount = allInsights.filter(i => i.priority === 'medium').length;
    const lowCount = allInsights.filter(i => i.priority === 'low').length;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">AI-Generated Insights</h2>
                    <p className="text-gray-500 mt-1">Automated analysis with actionable recommendations</p>
                </div>
                <Badge variant="outline" className="text-sm">
                    {allInsights.length} Insight{allInsights.length !== 1 ? 's' : ''} Found
                </Badge>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryCard 
                    label="Critical" 
                    value={criticalCount} 
                    icon={AlertCircle}
                    color={criticalCount > 0 ? "bg-red-50 text-red-700 border-red-200" : "bg-gray-50 text-gray-400 border-gray-200"}
                />
                <SummaryCard 
                    label="High Priority" 
                    value={highCount} 
                    icon={AlertTriangle}
                    color={highCount > 0 ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-gray-50 text-gray-400 border-gray-200"}
                />
                <SummaryCard 
                    label="Medium" 
                    value={mediumCount} 
                    icon={Lightbulb}
                    color={mediumCount > 0 ? "bg-yellow-50 text-yellow-700 border-yellow-200" : "bg-gray-50 text-gray-400 border-gray-200"}
                />
                <SummaryCard 
                    label="Low Priority" 
                    value={lowCount} 
                    icon={Info}
                    color={lowCount > 0 ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-gray-50 text-gray-400 border-gray-200"}
                />
            </div>

            {/* Insights List */}
            {sortedInsights.length > 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lightbulb className="h-5 w-5 text-yellow-500" />
                            Detailed Insights
                        </CardTitle>
                        <CardDescription>
                            Review each insight and take recommended actions to improve process performance
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {sortedInsights.map((insight, idx) => (
                                <InsightCard key={idx} insight={insight} index={idx} />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="py-12 text-center">
                        <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900">All Systems Normal</h3>
                        <p className="text-gray-500 mt-2 max-w-md mx-auto">
                            No issues or anomalies detected in the current analysis. Your process is performing within expected parameters.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Analysis Summary */}
            <Card>
                <CardHeader>
                    <CardTitle>Analysis Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-gray-500">Data Points Analyzed</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {analysisResult.data_points.toLocaleString()}
                            </p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-gray-500">SPC Violations</p>
                            <p className={`text-2xl font-bold mt-1 ${
                                analysisResult.spc_violations.total_critical > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                                {analysisResult.spc_violations.total_critical + analysisResult.spc_violations.total_warnings}
                            </p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-gray-500">Process Capability</p>
                            <p className={`text-2xl font-bold mt-1 ${
                                (analysisResult.process_capability.cpk ?? 0) >= 1.33 ? 'text-green-600' : 'text-yellow-600'
                            }`}>
                                {analysisResult.process_capability.cpk?.toFixed(2) || 'N/A'} Cpk
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
