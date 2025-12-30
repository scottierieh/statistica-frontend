'use client';

import { useState } from 'react';
import { Factory, Settings2, Activity, Gauge, TrendingUp, Lightbulb, Database, ChevronLeft, ChevronRight, BarChart3, PieChart, GitBranch, Timer, Target, AlertTriangle, FileText, Layers, Clock, Zap, LineChart, FlaskConical, Ruler, ShieldAlert, Users, Server, Calendar, Grid3X3, Home } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

// Import analysis components
import VariableSettings from './VariableSettings';
import SpcAnalysis from './SpcAnalysis';
import CapabilityAnalysis from './CapabilityAnalysis';
import PredictiveAnalysis from './PredictiveAnalysis';
import InsightsPanel from './InsightsPanel';
import ComingSoon from './ComingSoon';

export interface AnalysisConfig {
    data: any[];
    numericHeaders: string[];
    spcVariable: string;
    regressionTarget: string;
    regressionFeatures: string[];
    usl: string;
    lsl: string;
}

export interface AnalysisResults {
    timestamp: string;
    data_points: number;
    spc_x_bar_data: any[];
    spc_r_chart_data: any[];
    spc_statistics: {
        x_bar: { mean: number; ucl: number; lcl: number; std: number };
        r_chart: { mean: number; ucl: number; lcl: number };
    };
    spc_violations: {
        x_bar: any[];
        r_chart: any[];
        total_critical: number;
        total_warnings: number;
    };
    process_capability: {
        cp: number | null;
        cpk: number | null;
        cpu: number | null;
        cpl: number | null;
        sigma_level: number;
        estimated_ppm: number;
        mean: number;
        std: number;
        interpretation: string;
        description: string;
        recommendation: string;
    };
    summary_statistics: Record<string, any>;
    defect_regression_model: {
        individual_models: Record<string, any>;
        multivariate_model: { coefficients: Record<string, number>; r2: number } | null;
        feature_importance: Array<{ feature: string; importance: number; r2: number; direction: string }>;
        insights: any[];
    } | null;
    insights: any[];
}

type MenuItemId = 
    | 'settings' 
    // Quality Control
    | 'spc' 
    | 'capability' 
    | 'histogram'
    | 'pareto'
    | 'correlation'
    | 'scatter'
    | 'imr'
    | 'cusum'
    | 'ewma'
    // Production
    | 'oee'
    | 'downtime'
    | 'cycle'
    | 'yield'
    | 'throughput'
    // Advanced Analytics
    | 'predictive' 
    | 'trend'
    | 'anomaly'
    | 'doe'
    | 'anova'
    | 'msa'
    | 'fmea'
    // Reports
    | 'insights'
    | 'report'
    | 'shift'
    | 'machine'
    | 'daily';

interface MenuItem {
    id: MenuItemId;
    label: string;
    icon: any;
    implemented: boolean;
}

interface MenuCategory {
    id: string;
    label: string;
    icon: any;
    items: MenuItem[];
}

const menuCategories: MenuCategory[] = [
    {
        id: 'settings',
        label: 'Settings',
        icon: Settings2,
        items: [
            { id: 'settings', label: 'Variable Settings', icon: Settings2, implemented: true },
        ]
    },
    {
        id: 'quality',
        label: 'Quality Control',
        icon: Activity,
        items: [
            { id: 'spc', label: 'SPC Analysis', icon: Activity, implemented: true },
            { id: 'capability', label: 'Capability', icon: Gauge, implemented: true },
            { id: 'histogram', label: 'Histogram', icon: BarChart3, implemented: false },
            { id: 'pareto', label: 'Pareto Analysis', icon: PieChart, implemented: false },
            { id: 'scatter', label: 'Scatter Plot', icon: GitBranch, implemented: false },
            { id: 'correlation', label: 'Correlation Matrix', icon: Grid3X3, implemented: false },
            { id: 'imr', label: 'I-MR Chart', icon: Activity, implemented: false },
            { id: 'cusum', label: 'CUSUM Chart', icon: TrendingUp, implemented: false },
            { id: 'ewma', label: 'EWMA Chart', icon: TrendingUp, implemented: false },
        ]
    },
    {
        id: 'production',
        label: 'Production',
        icon: Factory,
        items: [
            { id: 'oee', label: 'OEE Dashboard', icon: Layers, implemented: false },
            { id: 'downtime', label: 'Downtime Analysis', icon: Timer, implemented: false },
            { id: 'cycle', label: 'Cycle Time Analysis', icon: Clock, implemented: false },
            { id: 'yield', label: 'Yield Analysis', icon: Target, implemented: false },
            { id: 'throughput', label: 'Throughput', icon: Zap, implemented: false },
        ]
    },
    {
        id: 'advanced',
        label: 'Advanced Analytics',
        icon: TrendingUp,
        items: [
            { id: 'predictive', label: 'Predictive', icon: TrendingUp, implemented: true },
            { id: 'trend', label: 'Trend Analysis', icon: LineChart, implemented: false },
            { id: 'anomaly', label: 'Anomaly Detection', icon: AlertTriangle, implemented: false },
            { id: 'doe', label: 'DOE', icon: FlaskConical, implemented: false },
            { id: 'anova', label: 'ANOVA', icon: BarChart3, implemented: false },
            { id: 'msa', label: 'MSA (Gage R&R)', icon: Ruler, implemented: false },
            { id: 'fmea', label: 'FMEA Support', icon: ShieldAlert, implemented: false },
        ]
    },
    {
        id: 'reports',
        label: 'Reports',
        icon: FileText,
        items: [
            { id: 'insights', label: 'AI Insights', icon: Lightbulb, implemented: true },
            { id: 'report', label: 'Summary Report', icon: FileText, implemented: false },
            { id: 'shift', label: 'Shift Comparison', icon: Users, implemented: false },
            { id: 'machine', label: 'Machine Comparison', icon: Server, implemented: false },
            { id: 'daily', label: 'Daily/Weekly Report', icon: Calendar, implemented: false },
        ]
    },
];

export default function ManufacturingLayout() {
    const [activeMenu, setActiveMenu] = useState<MenuItemId>('settings');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    
    const [config, setConfig] = useState<AnalysisConfig>({
        data: [],
        numericHeaders: [],
        spcVariable: '',
        regressionTarget: '',
        regressionFeatures: [],
        usl: '',
        lsl: '',
    });
    
    const [analysisResult, setAnalysisResult] = useState<AnalysisResults | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const updateConfig = (updates: Partial<AnalysisConfig>) => {
        setConfig(prev => ({ ...prev, ...updates }));
    };

    const renderContent = () => {
        switch (activeMenu) {
            case 'settings':
                return (
                    <VariableSettings 
                        config={config} 
                        updateConfig={updateConfig}
                        analysisResult={analysisResult}
                        setAnalysisResult={setAnalysisResult}
                        isAnalyzing={isAnalyzing}
                        setIsAnalyzing={setIsAnalyzing}
                    />
                );
            case 'spc':
                return <SpcAnalysis config={config} analysisResult={analysisResult} />;
            case 'capability':
                return <CapabilityAnalysis analysisResult={analysisResult} />;
            case 'predictive':
                return <PredictiveAnalysis config={config} analysisResult={analysisResult} />;
            case 'insights':
                return <InsightsPanel analysisResult={analysisResult} />;
            // Quality Control - Coming Soon
            case 'histogram':
                return <ComingSoon title="Histogram" description="Data distribution analysis with normality testing" />;
            case 'pareto':
                return <ComingSoon title="Pareto Analysis" description="Identify the vital few causes using 80/20 rule" />;
            case 'scatter':
                return <ComingSoon title="Scatter Plot" description="Visualize relationships between two variables" />;
            case 'correlation':
                return <ComingSoon title="Correlation Matrix" description="Variable correlation heatmap analysis" />;
            case 'imr':
                return <ComingSoon title="I-MR Chart" description="Individual-Moving Range control chart for individual measurements" />;
            case 'cusum':
                return <ComingSoon title="CUSUM Chart" description="Cumulative Sum chart for detecting small process shifts" />;
            case 'ewma':
                return <ComingSoon title="EWMA Chart" description="Exponentially Weighted Moving Average control chart" />;
            // Production - Coming Soon
            case 'oee':
                return <ComingSoon title="OEE Dashboard" description="Overall Equipment Effectiveness (Availability × Performance × Quality)" />;
            case 'downtime':
                return <ComingSoon title="Downtime Analysis" description="Equipment downtime tracking and root cause analysis" />;
            case 'cycle':
                return <ComingSoon title="Cycle Time Analysis" description="Production cycle time monitoring and optimization" />;
            case 'yield':
                return <ComingSoon title="Yield Analysis" description="First pass yield and rolled throughput yield analysis" />;
            case 'throughput':
                return <ComingSoon title="Throughput" description="Production throughput and capacity analysis" />;
            // Advanced Analytics - Coming Soon
            case 'trend':
                return <ComingSoon title="Trend Analysis" description="Time series trend detection and forecasting" />;
            case 'anomaly':
                return <ComingSoon title="Anomaly Detection" description="Automatic outlier and anomaly detection using ML" />;
            case 'doe':
                return <ComingSoon title="Design of Experiments (DOE)" description="Factorial experiments and response surface methodology" />;
            case 'anova':
                return <ComingSoon title="ANOVA" description="Analysis of Variance for comparing group means" />;
            case 'msa':
                return <ComingSoon title="MSA (Gage R&R)" description="Measurement System Analysis - Repeatability & Reproducibility" />;
            case 'fmea':
                return <ComingSoon title="FMEA Support" description="Failure Mode and Effects Analysis documentation" />;
            // Reports - Coming Soon
            case 'report':
                return <ComingSoon title="Summary Report" description="Generate comprehensive PDF analysis reports" />;
            case 'shift':
                return <ComingSoon title="Shift Comparison" description="Compare performance across different shifts" />;
            case 'machine':
                return <ComingSoon title="Machine Comparison" description="Compare performance across different machines" />;
            case 'daily':
                return <ComingSoon title="Daily/Weekly Report" description="Automated daily and weekly performance reports" />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className={cn(
                "bg-white border-r border-gray-200 flex flex-col transition-all duration-300",
                sidebarCollapsed ? "w-16" : "w-64"
            )}>
                {/* Logo */}
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                            <Factory className="h-5 w-5 text-primary-foreground" />
                        </div>
                        {!sidebarCollapsed && (
                            <div>
                                <h1 className="font-bold text-gray-900">Manufacturing</h1>
                                <p className="text-xs text-gray-500">Analytics Platform</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Home Button */}
                <div className="p-2 border-b border-gray-200">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                            <Home className="h-4 w-4" />
                            {!sidebarCollapsed && <span>Back to Workspace</span>}
                        </Button>
                    </Link>
                </div>

                {/* Menu Categories */}
                <nav className="flex-1 overflow-y-auto p-2">
                    {menuCategories.map((category, catIdx) => (
                        <div key={category.id} className="mb-4">
                            {!sidebarCollapsed && (
                                <div className="px-3 py-2">
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        {category.label}
                                    </p>
                                </div>
                            )}
                            {sidebarCollapsed && catIdx > 0 && <Separator className="my-2" />}
                            
                            <div className="space-y-1">
                                {category.items.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = activeMenu === item.id;
                                    const isDisabled = item.id !== 'settings' && config.data.length === 0;
                                    
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => !isDisabled && setActiveMenu(item.id)}
                                            disabled={isDisabled}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                                                isActive ? "bg-primary/10 text-primary" : "text-gray-600 hover:bg-gray-50",
                                                isDisabled && "opacity-50 cursor-not-allowed",
                                                !item.implemented && !isDisabled && "opacity-70"
                                            )}
                                            title={sidebarCollapsed ? item.label : undefined}
                                        >
                                            <Icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-primary")} />
                                            {!sidebarCollapsed && (
                                                <div className="flex-1 flex items-center justify-between min-w-0">
                                                    <span className={cn("text-sm font-medium truncate", isActive && "text-primary")}>
                                                        {item.label}
                                                    </span>
                                                    {!item.implemented && (
                                                        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                                            Soon
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Data Status */}
                {!sidebarCollapsed && (
                    <div className="p-4 border-t border-gray-200">
                        <div className="flex items-center gap-2 text-sm">
                            <Database className={cn("h-4 w-4", config.data.length > 0 ? "text-green-500" : "text-gray-400")} />
                            {config.data.length > 0 ? (
                                <span className="text-gray-600">{config.data.length.toLocaleString()} records</span>
                            ) : (
                                <span className="text-gray-400">No data loaded</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Collapse Button */}
                <div className="p-2 border-t border-gray-200">
                    <Button variant="ghost" size="sm" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="w-full">
                        {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4 mr-2" />Collapse</>}
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <div className="p-6">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
}