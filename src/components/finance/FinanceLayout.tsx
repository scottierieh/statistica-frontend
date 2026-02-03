'use client';

import { useState } from 'react';
import { 
    Landmark, Settings2, TrendingUp, TrendingDown, BarChart3, PieChart, 
    LineChart, CandlestickChart, DollarSign, Percent, Shield, AlertTriangle,
    Calculator, FileText, Database, ChevronLeft, ChevronRight, 
    Wallet, CreditCard, Building2, Globe, Clock, Target, Layers,
    GitBranch, Activity, Gauge, Scale, BookOpen, Briefcase,
    ArrowLeftRight, Coins, Receipt, FileSpreadsheet, Users, Calendar,
    Zap, Brain, Search, Filter, Lock, Unlock, Home
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

// Import components
import FinanceSettings from './FinanceSettings';
import PortfolioOverview from './PortfolioOverview';
import AssetAllocation from './AssetAllocation';
import PerformanceAnalysis from './PerformanceAnalysis';
import AttributionAnalysis from './AttributionAnalysis';
import Rebalancing from './Rebalancing';
import ValueAtRisk from './ValueAtRisk';
import StressTesting from './StressTesting';
import SensitivityAnalysis from './SensitivityAnalysis';
import CorrelationMatrix from './CorrelationMatrix';
import DrawdownAnalysis from './DrawdownAnalysis';
import BetaVolatility from './BetaVolatility';
import ComingSoon from './ComingSoon';

export interface PortfolioHolding {
    ticker: string;
    name: string;
    sector: string;
    shares: number;
    avgCost: number;
    currentPrice: number;
    marketValue: number;
    costBasis: number;
    unrealizedGain: number;
    unrealizedGainPct: number;
    weight: number;
    dailyChangePct: number;
    ytdReturnPct: number;
}

export interface PortfolioSummary {
    totalValue: number;
    totalCost: number;
    totalGain: number;
    totalGainPct: number;
    dailyChange: number;
    dailyChangePct: number;
    ytdReturn: number;
    ytdReturnPct: number;
    numHoldings: number;
    topPerformer: { ticker: string; returnPct: number };
    worstPerformer: { ticker: string; returnPct: number };
}

export interface SectorAllocation {
    sector: string;
    value: number;
    weight: number;
    holdings: number;
}

export interface FinanceConfig {
    data: any[];
    numericHeaders: string[];
    allHeaders: string[];
    // Time series columns
    dateColumn: string;
    priceColumn: string;
    volumeColumn: string;
    returnsColumn: string;
    benchmarkColumn: string;
    riskFreeRate: string;
    // Portfolio columns
    tickerColumn: string;
    nameColumn: string;
    sectorColumn: string;
    assetClassColumn: string;
    sharesColumn: string;
    avgCostColumn: string;
    currentPriceColumn: string;
    dailyChangeColumn: string;
}

export interface FinanceResults {
    timestamp: string;
    data_points: number;
    portfolio?: {
        holdings: PortfolioHolding[];
        summary: PortfolioSummary;
        sectorAllocation: SectorAllocation[];
    };
}

type MenuItemId = 
    // Settings
    | 'settings'
    // Portfolio Analysis
    | 'portfolio-overview'
    | 'asset-allocation'
    | 'performance'
    | 'attribution'
    | 'rebalancing'
    // Risk Management
    | 'var'
    | 'stress-test'
    | 'sensitivity'
    | 'correlation'
    | 'drawdown'
    | 'beta'
    // Trading & Market
    | 'price-analysis'
    | 'technical'
    | 'momentum'
    | 'volatility'
    | 'liquidity'
    | 'market-regime'
    // Financial Modeling
    | 'dcf'
    | 'monte-carlo'
    | 'black-scholes'
    | 'binomial'
    | 'factor-model'
    | 'regression'
    // Fixed Income
    | 'bond-pricing'
    | 'yield-curve'
    | 'duration'
    | 'credit-spread'
    // Derivatives
    | 'options-pricing'
    | 'greeks'
    | 'payoff'
    | 'implied-vol'
    // Reports
    | 'dashboard'
    | 'risk-report'
    | 'performance-report'
    | 'compliance';

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
            { id: 'settings', label: 'Data Settings', icon: Settings2, implemented: true },
        ]
    },
    {
        id: 'portfolio',
        label: 'Portfolio Analysis',
        icon: Briefcase,
        items: [
            { id: 'portfolio-overview', label: 'Portfolio Overview', icon: Briefcase, implemented: true },
            { id: 'asset-allocation', label: 'Asset Allocation', icon: PieChart, implemented: true },
            { id: 'performance', label: 'Performance Analysis', icon: TrendingUp, implemented: true },
            { id: 'attribution', label: 'Attribution Analysis', icon: GitBranch, implemented: true },
            { id: 'rebalancing', label: 'Rebalancing', icon: Scale, implemented: true },
        ]
    },
    {
        id: 'risk',
        label: 'Risk Management',
        icon: Shield,
        items: [
            { id: 'var', label: 'Value at Risk (VaR)', icon: AlertTriangle, implemented: true },
            { id: 'stress-test', label: 'Stress Testing', icon: Zap, implemented: true },
            { id: 'sensitivity', label: 'Sensitivity Analysis', icon: Activity, implemented: true },
            { id: 'correlation', label: 'Correlation Matrix', icon: GitBranch, implemented: true },
            { id: 'drawdown', label: 'Drawdown Analysis', icon: TrendingDown, implemented: true },
            { id: 'beta', label: 'Beta & Volatility', icon: Gauge, implemented: true },
        ]
    },
    {
        id: 'trading',
        label: 'Trading & Market',
        icon: CandlestickChart,
        items: [
            { id: 'price-analysis', label: 'Price Analysis', icon: LineChart, implemented: false },
            { id: 'technical', label: 'Technical Indicators', icon: BarChart3, implemented: false },
            { id: 'momentum', label: 'Momentum Analysis', icon: TrendingUp, implemented: false },
            { id: 'volatility', label: 'Volatility Analysis', icon: Activity, implemented: false },
            { id: 'liquidity', label: 'Liquidity Analysis', icon: Coins, implemented: false },
            { id: 'market-regime', label: 'Market Regime', icon: Layers, implemented: false },
        ]
    },
    {
        id: 'modeling',
        label: 'Financial Modeling',
        icon: Calculator,
        items: [
            { id: 'dcf', label: 'DCF Valuation', icon: DollarSign, implemented: false },
            { id: 'monte-carlo', label: 'Monte Carlo', icon: Brain, implemented: false },
            { id: 'black-scholes', label: 'Black-Scholes', icon: Calculator, implemented: false },
            { id: 'binomial', label: 'Binomial Model', icon: GitBranch, implemented: false },
            { id: 'factor-model', label: 'Factor Models', icon: Layers, implemented: false },
            { id: 'regression', label: 'Regression Analysis', icon: TrendingUp, implemented: false },
        ]
    },
    {
        id: 'fixed-income',
        label: 'Fixed Income',
        icon: Receipt,
        items: [
            { id: 'bond-pricing', label: 'Bond Pricing', icon: DollarSign, implemented: false },
            { id: 'yield-curve', label: 'Yield Curve', icon: LineChart, implemented: false },
            { id: 'duration', label: 'Duration & Convexity', icon: Clock, implemented: false },
            { id: 'credit-spread', label: 'Credit Spread', icon: ArrowLeftRight, implemented: false },
        ]
    },
    {
        id: 'derivatives',
        label: 'Derivatives',
        icon: Layers,
        items: [
            { id: 'options-pricing', label: 'Options Pricing', icon: Calculator, implemented: false },
            { id: 'greeks', label: 'Greeks Analysis', icon: BookOpen, implemented: false },
            { id: 'payoff', label: 'Payoff Diagrams', icon: LineChart, implemented: false },
            { id: 'implied-vol', label: 'Implied Volatility', icon: Activity, implemented: false },
        ]
    },
    {
        id: 'reports',
        label: 'Reports',
        icon: FileText,
        items: [
            { id: 'dashboard', label: 'Executive Dashboard', icon: BarChart3, implemented: false },
            { id: 'risk-report', label: 'Risk Report', icon: Shield, implemented: false },
            { id: 'performance-report', label: 'Performance Report', icon: FileSpreadsheet, implemented: false },
            { id: 'compliance', label: 'Compliance Report', icon: Lock, implemented: false },
        ]
    },
];

export default function FinanceLayout() {
    const [activeMenu, setActiveMenu] = useState<MenuItemId>('settings');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    
    const [config, setConfig] = useState<FinanceConfig>({
        data: [],
        numericHeaders: [],
        allHeaders: [],
        // Time series
        dateColumn: '',
        priceColumn: '',
        volumeColumn: '',
        returnsColumn: '',
        benchmarkColumn: '',
        riskFreeRate: '0.05',
        // Portfolio
        tickerColumn: '',
        nameColumn: '',
        sectorColumn: '',
        assetClassColumn: '',
        sharesColumn: '',
        avgCostColumn: '',
        currentPriceColumn: '',
        dailyChangeColumn: '',
    });
    
    const [analysisResult, setAnalysisResult] = useState<FinanceResults | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const updateConfig = (updates: Partial<FinanceConfig>) => {
        setConfig(prev => ({ ...prev, ...updates }));
    };

    const renderContent = () => {
        switch (activeMenu) {
            case 'settings':
                return (
                    <FinanceSettings 
                        config={config} 
                        updateConfig={updateConfig}
                        analysisResult={analysisResult}
                        setAnalysisResult={setAnalysisResult}
                        isAnalyzing={isAnalyzing}
                        setIsAnalyzing={setIsAnalyzing}
                    />
                );
            // Portfolio Analysis
            case 'portfolio-overview':
                return <PortfolioOverview config={config} analysisResult={analysisResult} />;
            case 'asset-allocation':
                return <AssetAllocation config={config} analysisResult={analysisResult} />;
            case 'performance':
                return <PerformanceAnalysis config={config} analysisResult={analysisResult} />;
            case 'attribution':
                return <AttributionAnalysis config={config} analysisResult={analysisResult} />;
            case 'rebalancing':
                return <Rebalancing config={config} analysisResult={analysisResult} />;
            // Risk Management
            case 'var':
                return <ValueAtRisk config={config} analysisResult={analysisResult} />;
            case 'stress-test':
                return <StressTesting config={config} analysisResult={analysisResult} />;
            case 'sensitivity':
                return <SensitivityAnalysis config={config} analysisResult={analysisResult} />;
            case 'correlation':
                return <CorrelationMatrix config={config} analysisResult={analysisResult} />;
            case 'drawdown':
                return <DrawdownAnalysis config={config} analysisResult={analysisResult} />;
            case 'beta':
                return <BetaVolatility config={config} analysisResult={analysisResult} />;
            // Trading & Market
            case 'price-analysis':
                return <ComingSoon title="Price Analysis" description="Price trends, support/resistance, and pattern recognition" />;
            case 'technical':
                return <ComingSoon title="Technical Indicators" description="Moving averages, RSI, MACD, Bollinger Bands, and more" />;
            case 'momentum':
                return <ComingSoon title="Momentum Analysis" description="Momentum indicators and trend strength analysis" />;
            case 'volatility':
                return <ComingSoon title="Volatility Analysis" description="Historical and implied volatility, GARCH models" />;
            case 'liquidity':
                return <ComingSoon title="Liquidity Analysis" description="Volume analysis, bid-ask spreads, and market impact" />;
            case 'market-regime':
                return <ComingSoon title="Market Regime" description="Market regime detection and regime-switching models" />;
            // Financial Modeling
            case 'dcf':
                return <ComingSoon title="DCF Valuation" description="Discounted Cash Flow analysis and sensitivity tables" />;
            case 'monte-carlo':
                return <ComingSoon title="Monte Carlo Simulation" description="Price path simulation and probability distributions" />;
            case 'black-scholes':
                return <ComingSoon title="Black-Scholes Model" description="European options pricing and sensitivity analysis" />;
            case 'binomial':
                return <ComingSoon title="Binomial Model" description="Binomial tree pricing for American and exotic options" />;
            case 'factor-model':
                return <ComingSoon title="Factor Models" description="Fama-French, CAPM, and custom factor analysis" />;
            case 'regression':
                return <ComingSoon title="Regression Analysis" description="Linear and multivariate regression for financial data" />;
            // Fixed Income
            case 'bond-pricing':
                return <ComingSoon title="Bond Pricing" description="Bond valuation, yield calculations, and price sensitivity" />;
            case 'yield-curve':
                return <ComingSoon title="Yield Curve" description="Yield curve construction, interpolation, and analysis" />;
            case 'duration':
                return <ComingSoon title="Duration & Convexity" description="Modified duration, effective duration, and convexity" />;
            case 'credit-spread':
                return <ComingSoon title="Credit Spread Analysis" description="Credit spread analysis and default probability" />;
            // Derivatives
            case 'options-pricing':
                return <ComingSoon title="Options Pricing" description="Multi-model options pricing and comparison" />;
            case 'greeks':
                return <ComingSoon title="Greeks Analysis" description="Delta, Gamma, Theta, Vega, Rho analysis and visualization" />;
            case 'payoff':
                return <ComingSoon title="Payoff Diagrams" description="Option strategy payoff diagrams and P&L scenarios" />;
            case 'implied-vol':
                return <ComingSoon title="Implied Volatility" description="IV surface, volatility smile, and term structure" />;
            // Reports
            case 'dashboard':
                return <ComingSoon title="Executive Dashboard" description="High-level portfolio and risk summary for executives" />;
            case 'risk-report':
                return <ComingSoon title="Risk Report" description="Comprehensive risk metrics and regulatory reports" />;
            case 'performance-report':
                return <ComingSoon title="Performance Report" description="Detailed performance attribution and benchmark comparison" />;
            case 'compliance':
                return <ComingSoon title="Compliance Report" description="Regulatory compliance and investment guideline monitoring" />;
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
                            <Landmark className="h-5 w-5 text-primary-foreground" />
                        </div>
                        {!sidebarCollapsed && (
                            <div>
                                <h1 className="font-bold text-gray-900">Finance</h1>
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