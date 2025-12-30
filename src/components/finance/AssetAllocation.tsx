'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
    PieChart, Info, TrendingUp, TrendingDown, Target, AlertTriangle,
    Building2, Cpu, Heart, Zap, ShoppingCart, Landmark, Droplets, Package
} from 'lucide-react';
import { 
    ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, 
    Tooltip, Treemap, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import type { FinanceConfig, FinanceResults, SectorAllocation } from './FinanceLayout';

interface AssetAllocationProps {
    config: FinanceConfig;
    analysisResult: FinanceResults | null;
}

const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

const formatPercent = (value: number): string => {
    return `${value.toFixed(1)}%`;
};

// Sector Icons mapping
const sectorIcons: Record<string, any> = {
    'Technology': Cpu,
    'Financials': Landmark,
    'Healthcare': Heart,
    'Energy': Zap,
    'Consumer Discretionary': ShoppingCart,
    'Consumer Staples': Package,
    'Industrials': Building2,
    'Materials': Droplets,
};

const getSectorIcon = (sector: string) => {
    return sectorIcons[sector] || Building2;
};

// Colors for charts
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

// Donut Chart Component
const AllocationDonutChart = ({ data }: { data: SectorAllocation[] }) => {
    const totalValue = data.reduce((sum, d) => sum + d.value, 0);
    
    return (
        <div className="relative">
            <ResponsiveContainer width="100%" height={350}>
                <RechartsPieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={130}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="sector"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), 'Value']}
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                </RechartsPieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                    <p className="text-sm text-gray-500">Total Value</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalValue)}</p>
                </div>
            </div>
        </div>
    );
};

// Horizontal Bar Chart Component
const AllocationBarChart = ({ data }: { data: SectorAllocation[] }) => {
    const sortedData = [...data].sort((a, b) => b.weight - a.weight);
    
    return (
        <ResponsiveContainer width="100%" height={350}>
            <BarChart data={sortedData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={10} />
                <YAxis type="category" dataKey="sector" fontSize={11} width={75} tick={{ fill: '#374151' }} />
                <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Weight']}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Bar dataKey="weight" radius={[0, 4, 4, 0]}>
                    {sortedData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

// Radar Chart for Diversification Analysis
const DiversificationRadar = ({ data }: { data: SectorAllocation[] }) => {
    // Normalize data for radar (max 100)
    const maxWeight = Math.max(...data.map(d => d.weight));
    const radarData = data.map(d => ({
        sector: d.sector.length > 10 ? d.sector.substring(0, 10) + '...' : d.sector,
        weight: d.weight,
        ideal: 100 / data.length, // Equal weight as "ideal"
    }));

    return (
        <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="sector" fontSize={10} tick={{ fill: '#6b7280' }} />
                <PolarRadiusAxis angle={30} domain={[0, 'auto']} fontSize={10} />
                <Radar name="Current" dataKey="weight" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                <Radar name="Equal Weight" dataKey="ideal" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeDasharray="5 5" />
                <Legend />
                <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
            </RadarChart>
        </ResponsiveContainer>
    );
};

// Sector Card Component
const SectorCard = ({ sector, index }: { sector: SectorAllocation; index: number }) => {
    const Icon = getSectorIcon(sector.sector);
    const color = COLORS[index % COLORS.length];
    
    return (
        <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div 
                        className="p-2 rounded-lg" 
                        style={{ backgroundColor: `${color}20` }}
                    >
                        <Icon className="h-5 w-5" style={{ color }} />
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-900">{sector.sector}</h4>
                        <p className="text-sm text-gray-500">{sector.holdings} holding{sector.holdings > 1 ? 's' : ''}</p>
                    </div>
                </div>
                <Badge variant="outline" style={{ borderColor: color, color }}>
                    {formatPercent(sector.weight)}
                </Badge>
            </div>
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Market Value</span>
                    <span className="font-medium">{formatCurrency(sector.value)}</span>
                </div>
                <Progress value={sector.weight} className="h-2" style={{ '--progress-color': color } as any} />
            </div>
        </div>
    );
};

// Concentration Analysis Component
const ConcentrationAnalysis = ({ data }: { data: SectorAllocation[] }) => {
    const sortedData = [...data].sort((a, b) => b.weight - a.weight);
    const top3Weight = sortedData.slice(0, 3).reduce((sum, d) => sum + d.weight, 0);
    const herfindahlIndex = data.reduce((sum, d) => sum + Math.pow(d.weight / 100, 2), 0);
    const effectiveSectors = 1 / herfindahlIndex;
    
    // Concentration risk level
    let concentrationLevel: 'Low' | 'Medium' | 'High';
    let concentrationColor: string;
    if (top3Weight < 50) {
        concentrationLevel = 'Low';
        concentrationColor = 'text-green-600';
    } else if (top3Weight < 70) {
        concentrationLevel = 'Medium';
        concentrationColor = 'text-yellow-600';
    } else {
        concentrationLevel = 'High';
        concentrationColor = 'text-red-600';
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-sm text-gray-500">Top 3 Concentration</p>
                    <p className={`text-2xl font-bold ${concentrationColor}`}>{formatPercent(top3Weight)}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-sm text-gray-500">Effective Sectors</p>
                    <p className="text-2xl font-bold text-gray-900">{effectiveSectors.toFixed(1)}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-sm text-gray-500">Concentration Risk</p>
                    <p className={`text-2xl font-bold ${concentrationColor}`}>{concentrationLevel}</p>
                </div>
            </div>
            
            <Alert className={
                concentrationLevel === 'High' ? 'border-red-200 bg-red-50' :
                concentrationLevel === 'Medium' ? 'border-yellow-200 bg-yellow-50' :
                'border-green-200 bg-green-50'
            }>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Diversification Assessment</AlertTitle>
                <AlertDescription>
                    {concentrationLevel === 'High' && 'Your portfolio is highly concentrated. Consider diversifying across more sectors to reduce risk.'}
                    {concentrationLevel === 'Medium' && 'Your portfolio has moderate concentration. Monitor sector exposure and consider rebalancing if any sector exceeds target allocation.'}
                    {concentrationLevel === 'Low' && 'Your portfolio is well-diversified across sectors. Continue to monitor for any significant shifts in allocation.'}
                </AlertDescription>
            </Alert>
        </div>
    );
};

export default function AssetAllocation({ config, analysisResult }: AssetAllocationProps) {
    if (!analysisResult || !analysisResult.portfolio) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Asset Allocation</h2>
                    <p className="text-gray-500 mt-1">Portfolio breakdown by sector and asset class</p>
                </div>
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>No Portfolio Data</AlertTitle>
                    <AlertDescription>
                        Please load portfolio data and run analysis in the Data Settings page first.
                        Use the "Sample Portfolio Holdings" dataset to get started.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const { holdings, summary, sectorAllocation } = analysisResult.portfolio;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Asset Allocation</h2>
                    <p className="text-gray-500 mt-1">{sectorAllocation.length} sectors • {summary.numHoldings} total holdings</p>
                </div>
                <Badge variant="outline">
                    {formatCurrency(summary.totalValue)} Total
                </Badge>
            </div>

            {/* Main Charts */}
            <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PieChart className="h-5 w-5 text-gray-500" />
                            Allocation by Sector
                        </CardTitle>
                        <CardDescription>Portfolio value distribution</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AllocationDonutChart data={sectorAllocation} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-gray-500" />
                            Sector Weights
                        </CardTitle>
                        <CardDescription>Percentage allocation by sector</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AllocationBarChart data={sectorAllocation} />
                    </CardContent>
                </Card>
            </div>

            {/* Diversification Analysis */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-gray-500" />
                        Concentration Analysis
                    </CardTitle>
                    <CardDescription>Portfolio diversification and concentration metrics</CardDescription>
                </CardHeader>
                <CardContent>
                    <ConcentrationAnalysis data={sectorAllocation} />
                </CardContent>
            </Card>

            {/* Radar Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Diversification Radar</CardTitle>
                    <CardDescription>Current allocation vs equal-weight distribution</CardDescription>
                </CardHeader>
                <CardContent>
                    <DiversificationRadar data={sectorAllocation} />
                </CardContent>
            </Card>

            {/* Sector Cards Grid */}
            <Card>
                <CardHeader>
                    <CardTitle>Sector Breakdown</CardTitle>
                    <CardDescription>Detailed view of each sector allocation</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sectorAllocation.map((sector, index) => (
                            <SectorCard key={sector.sector} sector={sector} index={index} />
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Allocation Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Allocation Summary Table</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-2 font-semibold text-gray-600">Sector</th>
                                    <th className="text-right py-3 px-2 font-semibold text-gray-600">Holdings</th>
                                    <th className="text-right py-3 px-2 font-semibold text-gray-600">Market Value</th>
                                    <th className="text-right py-3 px-2 font-semibold text-gray-600">Weight</th>
                                    <th className="text-left py-3 px-2 font-semibold text-gray-600">Allocation</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sectorAllocation.map((sector, idx) => (
                                    <tr key={sector.sector} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                                        <td className="py-3 px-2">
                                            <div className="flex items-center gap-2">
                                                <div 
                                                    className="w-3 h-3 rounded-full" 
                                                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                                />
                                                <span className="font-medium">{sector.sector}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-2 text-right">{sector.holdings}</td>
                                        <td className="py-3 px-2 text-right font-medium">{formatCurrency(sector.value)}</td>
                                        <td className="py-3 px-2 text-right font-medium">{formatPercent(sector.weight)}</td>
                                        <td className="py-3 px-2 w-32">
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div 
                                                    className="h-2 rounded-full" 
                                                    style={{ 
                                                        width: `${sector.weight}%`,
                                                        backgroundColor: COLORS[idx % COLORS.length]
                                                    }}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-gray-300 font-semibold">
                                    <td className="py-3 px-2">Total</td>
                                    <td className="py-3 px-2 text-right">{summary.numHoldings}</td>
                                    <td className="py-3 px-2 text-right">{formatCurrency(summary.totalValue)}</td>
                                    <td className="py-3 px-2 text-right">100.0%</td>
                                    <td className="py-3 px-2"></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}