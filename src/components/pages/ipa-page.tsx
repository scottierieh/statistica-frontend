'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Flame, Star, Target, TrendingDown, Sparkles, Sigma, HelpCircle, MoveRight, Settings, FileSearch, CheckCircle, Download, Bot, Info, AlertCircle } from 'lucide-react';
import type { DataSet } from '@/lib/stats';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Skeleton } from '../ui/skeleton';
import Papa from 'papaparse';

interface IpaMatrixItem {
    attribute: string;
    importance: number;
    performance: number;
    quadrant: string;
    priority_score: number;
    gap: number;
    r_squared?: number;
    relative_importance?: number;
}

interface RegressionSummary {
    r2: number;
    adj_r2: number;
    beta_coefficients: { attribute: string, beta: number }[];
}

interface IpaResults {
    ipa_matrix: IpaMatrixItem[];
    regression_summary: RegressionSummary;
}

interface FullAnalysisResponse {
    results: IpaResults;
    main_plot: string;
    dashboard_plot: string;
}

// ============================================================================
// HELPER COMPONENTS (All defined before main export)
// ============================================================================

// Interactive Scatter Plot Component for IPA Matrix
const InteractiveScatterPlot = ({ data }: { data: IpaMatrixItem[] }) => {
    const [hoveredPoint, setHoveredPoint] = useState<string | null>(null);
    const [selectedPoint, setSelectedPoint] = useState<string | null>(null);

    // Calculate plot dimensions and scales
    const width = 800;
    const height = 600;
    const padding = { top: 40, right: 40, bottom: 60, left: 80 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    // Find min/max for scaling
    const importanceValues = data.map(d => d.importance);
    const performanceValues = data.map(d => d.performance);
    
    const minImportance = Math.min(...importanceValues);
    const maxImportance = Math.max(...importanceValues);
    const minPerformance = Math.min(...performanceValues);
    const maxPerformance = Math.max(...performanceValues);

    // Add padding to ranges
    const importanceRange = maxImportance - minImportance;
    const performanceRange = maxPerformance - minPerformance;
    const importancePadding = importanceRange * 0.1;
    const performancePadding = performanceRange * 0.1;

    // Calculate midpoints for quadrant lines
    const midImportance = (minImportance + maxImportance) / 2;
    const midPerformance = (minPerformance + maxPerformance) / 2;

    // Function to determine quadrant based on actual position
    const getQuadrantFromPosition = (importance: number, performance: number): string => {
        const highImportance = importance >= midImportance;
        const highPerformance = performance >= midPerformance;
        
        if (highImportance && highPerformance) return 'Q1: Keep Up Good Work';
        if (!highImportance && highPerformance) return 'Q2: Concentrate Here';
        if (!highImportance && !highPerformance) return 'Q3: Low Priority';
        return 'Q4: Possible Overkill';
    };

    // Scale functions
    const scaleX = (importance: number) => 
        padding.left + ((importance - minImportance + importancePadding) / (importanceRange + 2 * importancePadding)) * plotWidth;
    
    const scaleY = (performance: number) => 
        padding.top + plotHeight - ((performance - minPerformance + performancePadding) / (performanceRange + 2 * performancePadding)) * plotHeight;

    // Midpoint positions
    const midX = scaleX(midImportance);
    const midY = scaleY(midPerformance);

    // Quadrant colors and labels - matching background and point colors with reduced saturation
    const quadrantInfo: Record<string, { color: string; bgColor: string; label: string; icon: string }> = {
        'Q1: Keep Up Good Work': { color: '#16a34a', bgColor: '#ecfdf5', label: 'Keep Up Good Work', icon: '⭐' }, // Green - lighter
        'Q2: Concentrate Here': { color: '#dc2626', bgColor: '#fef2f2', label: 'Concentrate Here', icon: '🔥' }, // Red - lighter
        'Q3: Low Priority': { color: '#64748b', bgColor: '#f8fafc', label: 'Low Priority', icon: '📉' }, // Gray/Slate - lighter
        'Q4: Possible Overkill': { color: '#f59e0b', bgColor: '#fffbeb', label: 'Possible Overkill', icon: '✨' }, // Amber/Orange - lighter
    };

    const selectedItem = selectedPoint ? data.find(d => d.attribute === selectedPoint) : null;
    const hoveredItem = hoveredPoint ? data.find(d => d.attribute === hoveredPoint) : null;
    const displayItem = selectedItem || hoveredItem;

    return (
        <div className="relative">
            <svg width={width} height={height} className="border rounded-lg bg-white">
                {/* Background quadrants */}
                <rect x={padding.left} y={padding.top} width={midX - padding.left} height={midY - padding.top} fill={quadrantInfo['Q2: Concentrate Here'].bgColor} />
                <rect x={midX} y={padding.top} width={width - padding.right - midX} height={midY - padding.top} fill={quadrantInfo['Q1: Keep Up Good Work'].bgColor} />
                <rect x={padding.left} y={midY} width={midX - padding.left} height={height - padding.bottom - midY} fill={quadrantInfo['Q3: Low Priority'].bgColor} />
                <rect x={midX} y={midY} width={width - padding.right - midX} height={height - padding.bottom - midY} fill={quadrantInfo['Q4: Possible Overkill'].bgColor} />

                {/* Quadrant labels */}
                <text x={midX - (midX - padding.left) / 2} y={padding.top + 20} textAnchor="middle" className="text-xs font-semibold fill-red-700">
                    🔥 Concentrate Here
                </text>
                <text x={midX + (width - padding.right - midX) / 2} y={padding.top + 20} textAnchor="middle" className="text-xs font-semibold fill-green-700">
                    ⭐ Keep Up Good Work
                </text>
                <text x={midX - (midX - padding.left) / 2} y={height - padding.bottom + 15} textAnchor="middle" className="text-xs font-semibold fill-slate-600">
                    📉 Low Priority
                </text>
                <text x={midX + (width - padding.right - midX) / 2} y={height - padding.bottom + 15} textAnchor="middle" className="text-xs font-semibold fill-amber-600">
                    ✨ Possible Overkill
                </text>

                {/* Grid lines */}
                <line x1={midX} y1={padding.top} x2={midX} y2={height - padding.bottom} stroke="#94a3b8" strokeWidth="2" strokeDasharray="5,5" />
                <line x1={padding.left} y1={midY} x2={width - padding.right} y2={midY} stroke="#94a3b8" strokeWidth="2" strokeDasharray="5,5" />

                {/* Axes */}
                <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#1e293b" strokeWidth="2" />
                <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#1e293b" strokeWidth="2" />

                {/* Axis labels */}
                <text x={width / 2} y={height - 20} textAnchor="middle" className="text-sm font-semibold fill-slate-700">
                    Importance →
                </text>
                <text x={20} y={height / 2} textAnchor="middle" transform={`rotate(-90, 20, ${height / 2})`} className="text-sm font-semibold fill-slate-700">
                    Performance →
                </text>

                {/* Data points */}
                {data.map((item) => {
                    const x = scaleX(item.importance);
                    const y = scaleY(item.performance);
                    const isHovered = hoveredPoint === item.attribute;
                    const isSelected = selectedPoint === item.attribute;
                    
                    // Calculate quadrant based on actual position for correct coloring
                    const actualQuadrant = getQuadrantFromPosition(item.importance, item.performance);
                    const quadrantColor = quadrantInfo[actualQuadrant]?.color || '#64748b';
                    
                    return (
                        <g key={item.attribute}>
                            <circle
                                cx={x}
                                cy={y}
                                r={isSelected ? 10 : isHovered ? 8 : 6}
                                fill={quadrantColor}
                                stroke={isSelected ? '#1e293b' : isHovered ? '#475569' : 'white'}
                                strokeWidth={isSelected ? 3 : isHovered ? 2 : 1.5}
                                className="cursor-pointer transition-all"
                                onMouseEnter={() => setHoveredPoint(item.attribute)}
                                onMouseLeave={() => setHoveredPoint(null)}
                                onClick={() => setSelectedPoint(selectedPoint === item.attribute ? null : item.attribute)}
                                opacity={isHovered || isSelected ? 1 : 0.8}
                            />
                            {(isHovered || isSelected) && (
                                <text
                                    x={x}
                                    y={y - 15}
                                    textAnchor="middle"
                                    className="text-xs font-semibold fill-slate-900 pointer-events-none"
                                    style={{ textShadow: '0 0 3px white, 0 0 3px white' }}
                                >
                                    {item.attribute}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>

            {/* Info tooltip */}
            {displayItem && (
                <Card className="absolute top-4 right-4 w-64 shadow-lg">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm">{displayItem.attribute}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Quadrant:</span>
                            <Badge className={`text-xs ${
                                displayItem.quadrant === 'Q1: Keep Up Good Work' ? 'bg-green-100 text-green-800' :
                                displayItem.quadrant === 'Q2: Concentrate Here' ? 'bg-red-100 text-red-800' :
                                displayItem.quadrant === 'Q3: Low Priority' ? 'bg-slate-100 text-slate-800' :
                                'bg-amber-100 text-amber-800'
                            }`}>
                                {displayItem.quadrant.split(': ')[1]}
                            </Badge>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Performance:</span>
                            <span className="font-mono font-semibold">{displayItem.performance.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Importance:</span>
                            <span className="font-mono font-semibold">{displayItem.importance.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Gap:</span>
                            <span className={`font-mono font-semibold ${displayItem.gap < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {displayItem.gap > 0 ? '+' : ''}{displayItem.gap.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Priority Score:</span>
                            <span className="font-mono font-semibold">{displayItem.priority_score.toFixed(2)}</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Instructions */}
            <div className="mt-2 text-xs text-muted-foreground text-center">
                Hover over points for details • Click to pin information
            </div>
        </div>
    );
};

// Quadrant Summary Cards Component
const QuadrantSummaryCards = ({ results }: { results: IpaResults }) => {
    const quadrantCounts = useMemo(() => {
        const counts: Record<string, number> = {
            'Q1: Keep Up Good Work': 0,
            'Q2: Concentrate Here': 0,
            'Q3: Low Priority': 0,
            'Q4: Possible Overkill': 0,
        };
        results.ipa_matrix.forEach(item => {
            counts[item.quadrant] = (counts[item.quadrant] || 0) + 1;
        });
        return counts;
    }, [results]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Concentrate Here - Critical */}
            <Card className="border-red-200 bg-red-50/50">
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-red-800">
                                Concentrate Here
                            </p>
                            <Flame className="h-5 w-5 text-red-600" />
                        </div>
                        <p className="text-3xl font-bold text-red-900">
                            {quadrantCounts['Q2: Concentrate Here']}
                        </p>
                        <p className="text-xs text-red-700">
                            High priority items
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Keep Up Good Work - Strengths */}
            <Card className="border-green-200 bg-green-50/50">
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-green-800">
                                Keep Up Good Work
                            </p>
                            <Star className="h-5 w-5 text-green-600" />
                        </div>
                        <p className="text-3xl font-bold text-green-900">
                            {quadrantCounts['Q1: Keep Up Good Work']}
                        </p>
                        <p className="text-xs text-green-700">
                            Maintain excellence
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Low Priority */}
            <Card className="border-slate-200 bg-slate-50/50">
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-800">
                                Low Priority
                            </p>
                            <TrendingDown className="h-5 w-5 text-slate-600" />
                        </div>
                        <p className="text-3xl font-bold text-slate-900">
                            {quadrantCounts['Q3: Low Priority']}
                        </p>
                        <p className="text-xs text-slate-700">
                            Monitor only
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Possible Overkill */}
            <Card className="border-amber-200 bg-amber-50/50">
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-amber-800">
                                Possible Overkill
                            </p>
                            <Sparkles className="h-5 w-5 text-amber-600" />
                        </div>
                        <p className="text-3xl font-bold text-amber-900">
                            {quadrantCounts['Q4: Possible Overkill']}
                        </p>
                        <p className="text-xs text-amber-700">
                            Consider reallocation
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Analysis Overview Component
const IpaOverview = ({ dependentVar, independentVars, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Variable selection status
        if (!dependentVar) {
            overview.push('Select overall satisfaction variable');
        } else {
            overview.push(`Overall satisfaction: ${dependentVar}`);
        }

        if (independentVars.length === 0) {
            overview.push('Select performance attributes');
        } else {
            overview.push(`${independentVars.length} performance attributes selected`);
        }

        // Data characteristics
        if (data.length < 30) {
            overview.push(`⚠ Limited responses (${data.length}) - results may not be reliable`);
        } else if (data.length < 100) {
            overview.push(`${data.length} responses - adequate for basic analysis`);
        } else {
            overview.push(`${data.length} responses available - good sample size`);
        }

        // Analysis capabilities
        overview.push('Uses regression to derive attribute importance');
        overview.push('Maps attributes into strategic quadrants');
        overview.push('Identifies gaps between importance and performance');
        overview.push('Prioritizes areas for resource allocation');
        overview.push('Best for: Customer satisfaction, employee engagement, product features');

        return overview;
    }, [dependentVar, independentVars, data]);

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Analysis Overview</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-1 text-sm text-muted-foreground">
                    {items.map((item, idx) => (
                        <li key={idx} className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
};

// Enhanced Intro Page
const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const ipaExample = exampleDatasets.find(d => d.id === 'ipa-restaurant');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Target className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Key Driver Analysis (IPA)</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Prioritize improvement areas by mapping attributes based on importance and performance
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Four Quadrants Explanation */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <Card className="border-2 border-red-200 bg-red-50/30">
                            <CardHeader>
                                <Flame className="w-6 h-6 text-red-600 mb-2" />
                                <CardTitle className="text-lg">Concentrate Here</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    High importance, low performance - your top priorities
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2 border-green-200 bg-green-50/30">
                            <CardHeader>
                                <Star className="w-6 h-6 text-green-600 mb-2" />
                                <CardTitle className="text-lg">Keep Up Good Work</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    High importance, high performance - maintain strengths
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2 border-slate-200 bg-slate-50/30">
                            <CardHeader>
                                <TrendingDown className="w-6 h-6 text-slate-600 mb-2" />
                                <CardTitle className="text-lg">Low Priority</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Low importance, low performance - don't waste resources
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2 border-amber-200 bg-amber-50/30">
                            <CardHeader>
                                <Sparkles className="w-6 h-6 text-amber-600 mb-2" />
                                <CardTitle className="text-lg">Possible Overkill</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Low importance, high performance - consider reallocation
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* When to Use & Requirements */}
                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <Info className="w-5 h-5" />
                            When to Use IPA
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Use IPA when you need to make strategic decisions about resource allocation. 
                            It's perfect for customer satisfaction surveys, employee engagement studies, 
                            product feature prioritization, and service quality assessments. IPA helps 
                            answer "What should we improve first?" by combining statistical importance 
                            with actual performance data.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-primary" />
                                    Requirements
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Overall Variable:</strong> Single satisfaction metric</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Attributes:</strong> 3+ performance items</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample Size:</strong> 30+ responses minimum</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Scale:</strong> Numeric rating scale (e.g., 1-5, 1-10)</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <FileSearch className="w-4 h-4 text-primary" />
                                    Understanding Results
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Matrix Plot:</strong> Visual quadrant mapping</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Importance:</strong> Derived from regression</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Performance:</strong> Average ratings</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Priority Score:</strong> Gap-based ranking</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Example Dataset */}
                    {ipaExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(ipaExample)} size="lg">
                                <Target className="mr-2 h-5 w-5" />
                                Load Restaurant Survey Example
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

// Interactive IPA Matrix Component
const InteractiveIpaMatrix = ({ results }: { results: IpaResults }) => {
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);
    const [selectedQuadrant, setSelectedQuadrant] = useState<string | null>(null);

    const filteredItems = useMemo(() => {
        if (!selectedQuadrant) return results.ipa_matrix;
        return results.ipa_matrix.filter(item => item.quadrant === selectedQuadrant);
    }, [results, selectedQuadrant]);

    const quadrantColors = {
        'Q1: Keep Up Good Work': 'bg-green-100 text-green-800 border-green-300',
        'Q2: Concentrate Here': 'bg-red-100 text-red-800 border-red-300',
        'Q3: Low Priority': 'bg-slate-100 text-slate-800 border-slate-300',
        'Q4: Possible Overkill': 'bg-amber-100 text-amber-800 border-amber-300',
    };
    
    const quadrantIcons = {
        'Q1: Keep Up Good Work': <Star className="w-4 h-4 text-green-600" />,
        'Q2: Concentrate Here': <Flame className="w-4 h-4 text-red-600" />,
        'Q3: Low Priority': <TrendingDown className="w-4 h-4 text-slate-600" />,
        'Q4: Possible Overkill': <Sparkles className="w-4 h-4 text-amber-600" />,
    };

    return (
        <div className="space-y-4">
            {/* Quadrant Filter Buttons */}
            <div className="flex flex-wrap gap-2">
                <Button
                    variant={selectedQuadrant === null ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedQuadrant(null)}
                >
                    All Quadrants
                </Button>
                {Object.keys(quadrantColors).map(quadrant => (
                    <Button
                        key={quadrant}
                        variant={selectedQuadrant === quadrant ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedQuadrant(quadrant)}
                        className="gap-2"
                    >
                        {quadrantIcons[quadrant as keyof typeof quadrantIcons]}
                        {quadrant.split(': ')[1]}
                    </Button>
                ))}
            </div>

            {/* Interactive Data Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">
                        {selectedQuadrant ? selectedQuadrant : 'All Attributes'}
                    </CardTitle>
                    <CardDescription>
                        {filteredItems.length} attribute(s) • Hover for details • Click quadrant filters above
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[400px]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Attribute</TableHead>
                                    <TableHead>Quadrant</TableHead>
                                    <TableHead className="text-right">Performance</TableHead>
                                    <TableHead className="text-right">Importance</TableHead>
                                    <TableHead className="text-right">Gap</TableHead>
                                    <TableHead className="text-right">Priority</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredItems
                                    .sort((a, b) => b.priority_score - a.priority_score)
                                    .map((item, idx) => (
                                    <TableRow 
                                        key={item.attribute}
                                        className={`cursor-pointer transition-colors ${
                                            hoveredItem === item.attribute ? 'bg-muted/50' : ''
                                        }`}
                                        onMouseEnter={() => setHoveredItem(item.attribute)}
                                        onMouseLeave={() => setHoveredItem(null)}
                                    >
                                        <TableCell className="font-medium">
                                            {idx < 3 && item.quadrant === 'Q2: Concentrate Here' && (
                                                <Badge variant="destructive" className="mr-2">TOP</Badge>
                                            )}
                                            {item.attribute}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={quadrantColors[item.quadrant as keyof typeof quadrantColors]}>
                                                {quadrantIcons[item.quadrant as keyof typeof quadrantIcons]}
                                                <span className="ml-2">{item.quadrant.split(': ')[0]}</span>
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="w-20 bg-slate-200 rounded-full h-2">
                                                    <div 
                                                        className="bg-blue-500 h-2 rounded-full transition-all"
                                                        style={{ width: `${item.performance * 20}%` }}
                                                    />
                                                </div>
                                                <span>{item.performance.toFixed(2)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            <span className="font-semibold">{item.importance.toFixed(3)}</span>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            <span className={item.gap < 0 ? 'text-red-600' : 'text-green-600'}>
                                                {item.gap > 0 ? '+' : ''}{item.gap.toFixed(2)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-semibold">
                                            {item.priority_score.toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
};

// Top Priorities Alert Component
const TopPrioritiesAlert = ({ results }: { results: IpaResults }) => {
    const topPriorities = useMemo(() => {
        return results.ipa_matrix
            .filter(item => item.quadrant === 'Q2: Concentrate Here')
            .sort((a, b) => b.priority_score - a.priority_score)
            .slice(0, 3);
    }, [results]);

    if (topPriorities.length === 0) {
        return (
            <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>No Critical Issues</AlertTitle>
                <AlertDescription>
                    Great news! No attributes require immediate attention. Continue monitoring your strengths.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <Alert>
            <Flame className="h-4 w-4" />
            <AlertTitle>Top Priorities for Improvement</AlertTitle>
            <AlertDescription>
                <ul className="mt-2 space-y-1">
                    {topPriorities.map((item, idx) => (
                        <li key={item.attribute} className="flex items-start gap-2">
                            <span className="font-semibold">{idx + 1}.</span>
                            <span>
                                <strong>{item.attribute}</strong> - Performance: {item.performance.toFixed(2)}, 
                                Importance: {item.importance.toFixed(3)}, Gap: {item.gap.toFixed(2)}
                            </span>
                        </li>
                    ))}
                </ul>
            </AlertDescription>
        </Alert>
    );
};

// ============================================================================
// MAIN COMPONENT EXPORT
// ============================================================================

interface IpaPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    onGenerateReport?: (stats: any, viz: string | null) => void;
}

export default function IpaPage({ data, numericHeaders, onLoadExample, onGenerateReport }: IpaPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [dependentVar, setDependentVar] = useState<string | undefined>();
    const [independentVars, setIndependentVars] = useState<string[]>([]);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const availableIVs = useMemo(() => numericHeaders.filter(h => h !== dependentVar), [numericHeaders, dependentVar]);
    
    useEffect(() => {
        const overallSat = numericHeaders.find(h => h.toLowerCase().includes('overall'));
        setDependentVar(overallSat || numericHeaders[numericHeaders.length - 1]);
        setView(canRun ? 'main' : 'intro');
    }, [numericHeaders]);

    useEffect(() => {
        setIndependentVars(availableIVs);
        setAnalysisResult(null);
    }, [availableIVs]);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);

    const handleIVChange = (header: string, checked: boolean) => {
        setIndependentVars(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (!dependentVar || independentVars.length < 1) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a dependent variable and at least one independent variable.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/ipa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, dependentVar, independentVars })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'API error');
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            setAnalysisResult(result);
            toast({ title: "Analysis Complete", description: "IPA results are ready." });

        } catch (e: any) {
            toast({ title: "Analysis Error", description: (e as Error).message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [data, dependentVar, independentVars, toast]);

    const handleDownloadData = useCallback(() => {
        if (!analysisResult?.results) {
            toast({ title: "No Data to Download", description: "Analysis results are not available." });
            return;
        }
        
        const csv = Papa.unparse(analysisResult.results.ipa_matrix);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'ipa_analysis_results.csv';
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "Download Started", description: "IPA matrix data is being downloaded." });
    }, [analysisResult, toast]);

    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    const { results, main_plot } = analysisResult || {};

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Key Driver Analysis Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}>
                            <HelpCircle className="w-5 h-5"/>
                        </Button>
                    </div>
                    <CardDescription>Select the dependent and independent variables for the analysis.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>Overall Satisfaction (Dependent Variable)</Label>
                            <Select value={dependentVar} onValueChange={setDependentVar}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Performance Attributes (Independent Variables)</Label>
                            <ScrollArea className="h-32 border rounded-md p-4">
                                <div className="grid grid-cols-2 gap-2">
                                {availableIVs.map(h => (
                                    <div key={h} className="flex items-center space-x-2">
                                        <Checkbox 
                                            id={`iv-${h}`} 
                                            checked={independentVars.includes(h)} 
                                            onCheckedChange={c => handleIVChange(h, c as boolean)} 
                                        />
                                        <Label htmlFor={`iv-${h}`} className="text-sm">{h}</Label>
                                    </div>
                                ))}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>

                    {/* Analysis Overview */}
                    <IpaOverview 
                        dependentVar={dependentVar}
                        independentVars={independentVars}
                        data={data}
                    />
                </CardContent>
                <CardFooter className="flex justify-between">
                    <div className="flex gap-2">
                        {results && (
                            <>
                                {onGenerateReport && (
                                    <Button variant="ghost" onClick={() => onGenerateReport(results, main_plot || null)}>
                                        <Bot className="mr-2"/>AI Report
                                    </Button>
                                )}
                                <Button variant="outline" onClick={handleDownloadData}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Export Data
                                </Button>
                            </>
                        )}
                    </div>
                    <Button onClick={handleAnalysis} disabled={isLoading || !dependentVar || independentVars.length === 0}>
                        {isLoading ? (
                            <><Loader2 className="animate-spin mr-2" /> Analyzing...</>
                        ) : (
                            <><Sigma className="mr-2" /> Run Analysis</>
                        )}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && (
                <Card>
                    <CardContent className="p-6 flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <p className="text-muted-foreground">Performing regression analysis and calculating IPA matrix...</p>
                        <Skeleton className="h-[600px] w-full" />
                    </CardContent>
                </Card>
            )}

            {results && (
                <div className="space-y-6">
                    {/* Quadrant Summary Cards */}
                    <QuadrantSummaryCards results={results} />

                    {/* IPA Results Interpretation */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Analysis Interpretation</CardTitle>
                            <CardDescription>Key insights from your IPA analysis</CardDescription>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <Alert>
                                    <CheckCircle className="h-4 w-4" />
                                    <AlertTitle>Model Quality</AlertTitle>
                                    <AlertDescription>
                                        The regression model explains <strong>{(results.regression_summary.r2 * 100).toFixed(1)}%</strong> of 
                                        the variance in overall satisfaction (R² = {results.regression_summary.r2.toFixed(3)}). 
                                        {results.regression_summary.r2 >= 0.7 ? 
                                            ' This indicates a strong model fit.' :
                                            results.regression_summary.r2 >= 0.5 ?
                                            ' This indicates a moderate model fit.' :
                                            ' Consider including additional factors for better explanatory power.'}
                                    </AlertDescription>
                                </Alert>

                                {results.ipa_matrix.filter(item => item.quadrant === 'Q2: Concentrate Here').length > 0 && (
                                    <Alert>
                                        <Flame className="h-4 w-4 text-red-600" />
                                        <AlertTitle>Priority Actions Required</AlertTitle>
                                        <AlertDescription>
                                            <strong>{results.ipa_matrix.filter(item => item.quadrant === 'Q2: Concentrate Here').length} attribute(s)</strong> fall 
                                            into the "Concentrate Here" quadrant. These are high-importance areas with low performance that 
                                            require immediate attention and resource allocation.
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {results.ipa_matrix.filter(item => item.quadrant === 'Q1: Keep Up Good Work').length > 0 && (
                                    <Alert>
                                        <Star className="h-4 w-4 text-green-600" />
                                        <AlertTitle>Strengths to Maintain</AlertTitle>
                                        <AlertDescription>
                                            <strong>{results.ipa_matrix.filter(item => item.quadrant === 'Q1: Keep Up Good Work').length} attribute(s)</strong> are 
                                            in the "Keep Up Good Work" quadrant. These high-importance, high-performance areas represent 
                                            your competitive strengths. Continue investing to maintain excellence.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>

                            <div className="space-y-4">
                                {results.ipa_matrix.filter(item => item.quadrant === 'Q4: Possible Overkill').length > 0 && (
                                    <Alert>
                                        <Sparkles className="h-4 w-4 text-amber-600" />
                                        <AlertTitle>Resource Reallocation Opportunity</AlertTitle>
                                        <AlertDescription>
                                            <strong>{results.ipa_matrix.filter(item => item.quadrant === 'Q4: Possible Overkill').length} attribute(s)</strong> show 
                                            "Possible Overkill" - high performance in low-importance areas. Consider reallocating 
                                            resources from these attributes to higher-priority areas.
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {results.ipa_matrix.filter(item => item.quadrant === 'Q3: Low Priority').length > 0 && (
                                    <Alert>
                                        <TrendingDown className="h-4 w-4 text-slate-600" />
                                        <AlertTitle>Low Priority Items</AlertTitle>
                                        <AlertDescription>
                                            <strong>{results.ipa_matrix.filter(item => item.quadrant === 'Q3: Low Priority').length} attribute(s)</strong> are 
                                            in the "Low Priority" quadrant. These low-importance, low-performance areas don't require 
                                            immediate attention. Monitor periodically but focus resources elsewhere.
                                        </AlertDescription>
                                    </Alert>
                                )}

                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertTitle>Strategic Recommendations</AlertTitle>
                                    <AlertDescription>
                                        {results.ipa_matrix.filter(item => item.quadrant === 'Q2: Concentrate Here').length > 0 ? (
                                            <>Focus improvement efforts on the "Concentrate Here" attributes first, as they offer the highest 
                                            potential return on investment. These areas significantly impact satisfaction but currently underperform.</>
                                        ) : (
                                            <>With no critical gaps identified, focus on maintaining your strengths in high-importance areas 
                                            while monitoring for any changes in customer priorities or performance levels.</>
                                        )}
                                    </AlertDescription>
                                </Alert>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Top Priorities Alert */}
                    <TopPrioritiesAlert results={results} />

                    {/* Visualization and Interactive Table */}
                    <div className="grid gap-6 lg:grid-cols-3">
                        {/* IPA Matrix Visualization */}
                        <div className="lg:col-span-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="font-headline">IPA Matrix</CardTitle>
                                    <CardDescription>
                                        Importance-Performance grid showing strategic quadrants
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <InteractiveScatterPlot data={results.ipa_matrix} />
                                </CardContent>
                            </Card>
                        </div>

                        {/* Regression Summary */}
                        <div className="lg:col-span-1">
                            <Card className="h-full">
                                <CardHeader>
                                    <CardTitle className="font-headline">Model Summary</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">R-Squared</p>
                                        <p className="text-2xl font-bold">{(results.regression_summary.r2 * 100).toFixed(1)}%</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Model explains {(results.regression_summary.r2 * 100).toFixed(1)}% of variance
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Adjusted R-Squared</p>
                                        <p className="text-xl font-semibold">{(results.regression_summary.adj_r2 * 100).toFixed(1)}%</p>
                                    </div>
                                    <div className="pt-4 border-t">
                                        <p className="text-sm font-medium mb-2">Top Drivers (Beta)</p>
                                        <div className="space-y-2">
                                            {results.regression_summary.beta_coefficients
                                                .sort((a, b) => Math.abs(b.beta) - Math.abs(a.beta))
                                                .slice(0, 5)
                                                .map((coef, idx) => (
                                                    <div key={coef.attribute} className="flex items-center justify-between text-xs py-1.5 px-2 bg-muted/30 rounded">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-primary">#{idx + 1}</span>
                                                            <span className="font-medium truncate">{coef.attribute}</span>
                                                        </div>
                                                        <span className="font-mono font-semibold">{coef.beta.toFixed(3)}</span>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Interactive IPA Matrix Table */}
                    <InteractiveIpaMatrix results={results} />
                </div>
            )}

            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <Target className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Configure variables and run analysis to view IPA matrix.</p>
                </div>
            )}
        </div>
    );
}


