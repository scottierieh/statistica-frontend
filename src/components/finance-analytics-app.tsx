'use client';


import React, { useState, useMemo, useCallback } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
  SidebarTrigger,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenu,
  SidebarGroupLabel,
  SidebarFooter
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Search,
  ChevronDown,
  BookOpen,
  BarChart,
  TrendingUp,
  Layers,
  AlertTriangle,
  ScatterChart,
  Crosshair,
  Target,
  BarChart2,
  LineChart,
  AreaChart,
  Activity,
  DollarSign,
  Shield,
  Compass,
  Globe,
  Briefcase,
  PieChart,
  Zap,
  Grid3X3,
  Combine,
  ArrowUpDown,
  Table,
  Star,
  CandlestickChart,
  LayoutDashboard,
  Filter,
  Settings,
  TrendingDown,
  Cpu,
  FlaskConical,
  Calculator,
  Clock,
  AlertCircle,
  Shuffle,
  BarChart3,
  SlidersHorizontal,
  GitFork,
  Banknote,
  RefreshCw,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  type DataSet,
  parseData,
  unparseData,
} from '@/lib/stats';
import { useToast } from '@/hooks/use-toast';
import DataUploader from './data-uploader';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import NextLink from 'next/link';

// ============================================
// Page Component Imports
// ============================================

// --- Phase 1: Macro & Sector ---
import MacroRegimeDashboardPage from './pages/yahoo-finance/macro-regime-dashboard-page';
import MacroVariableTrendsPage from './pages/yahoo-finance/macro-variable-trends-page';
import StockVsVixPage from './pages/yahoo-finance/stock-vs-vix-page';
import SectorMomentumPage from './pages/yahoo-finance/sector-momentum-page';
import StockVsMacroCorrelationPage from './pages/yahoo-finance/stock-vs-macro-correlation-page';

// --- Phase 2: Quant Screening ---
import CompositeValueScorePage from './pages/yahoo-finance/composite-value-score-page';
import QualityRadarPage from './pages/yahoo-finance/quality-radar-page';
import MomentumQuadrantPage from './pages/yahoo-finance/momentum-quadrant-page';
import CompositeScorecardPage from './pages/yahoo-finance/composite-scorecard-page';
import ValueMomentumComboPage from './pages/yahoo-finance/value-momentum-combo-page';

// --- Phase 3: Financial Planning & Modeling ---
import GrowthCompPage from './pages/yahoo-finance/growth-comp-page';
import MarginAnalysisPage from './pages/yahoo-finance/margin-analysis-page';
import ReturnSummaryPage from './pages/yahoo-finance/return-summary-page';
import LeverageAnalysisPage from './pages/yahoo-finance/leverage-analysis-page';
import MarginEfficiencyPage from './pages/yahoo-finance/margin-efficiency-page';
import RollingVolatilityPage from './pages/yahoo-finance/rolling-volatility-page';

// --- Phase 4: Profitability & Unit Economics ---
import ProfitabilityCompPage from './pages/yahoo-finance/profitability-comp-page';
import GrowthProfitMatrixPage from './pages/yahoo-finance/growth-profit-matrix-page';
import SectorAvgRoePage from './pages/yahoo-finance/sector-avg-roe-page';
import CompositeQualityScorePage from './pages/yahoo-finance/composite-quality-score-page';

// --- Phase 5: Predictive Analytics ---
import TopBottomReturnsPage from './pages/yahoo-finance/top-bottom-returns-page';
import NormalDistOverlayPage from './pages/yahoo-finance/normal-dist-overlay-page';
import MomentumReversalPage from './pages/yahoo-finance/momentum-reversal-page';
import VixRegimePage from './pages/yahoo-finance/vix-regime-page';
import RollingCorrelationMacroPage from './pages/yahoo-finance/rolling-correlation-macro-page';

// --- Phase 6: Valuation & Investment ---
import ValuationMultiplesPage from './pages/yahoo-finance/valuation-multiples-page';
import PerVsPbrScatterPage from './pages/yahoo-finance/per-vs-pbr-scatter-page';
import EvEbitdaRankingPage from './pages/yahoo-finance/ev-ebitda-ranking-page';
import CompositeValueScorePageV2 from './pages/yahoo-finance/composite-value-score-page';
import PerVsMarketCapPage from './pages/yahoo-finance/per-vs-market-cap-page';

// --- Phase 7: Technical Timing ---
import MaOverlayPage from './pages/yahoo-finance/ma-overlay-page';
import BollingerBandsPage from './pages/yahoo-finance/bollinger-bands-page';
import MacdChartPage from './pages/yahoo-finance/macd-chart-page';
import VolumeAnalysisPage from './pages/yahoo-finance/volume-analysis-page';
import EmaCrossSignalPage from './pages/yahoo-finance/ema-cross-signal-page';
import TechnicalDashboardPage from './pages/yahoo-finance/technical-dashboard-page';
import PriceVolumeCorrelationPage from './pages/yahoo-finance/price-volume-correlation-page';

// --- Phase 8: Risk & Strategy ---
import CorrelationHeatmapPage from './pages/yahoo-finance/correlation-heatmap-page';
import VarPage from './pages/yahoo-finance/var-page';
import MddPage from './pages/yahoo-finance/mdd-page';
import DrawdownCompPage from './pages/yahoo-finance/drawdown-comp-page';
import RiskReturnScatterPage from './pages/yahoo-finance/risk-return-scatter-page';
import SharpeRatioCompPage from './pages/yahoo-finance/sharpe-ratio-comp-page';
import VarianceContributionPage from './pages/yahoo-finance/variance-contribution-page';

// --- Overview ---
import GuidePage from './pages/yahoo-finance/guide-page';

// ============================================
// Types
// ============================================

export interface AnalysisPageProps {
  data: DataSet;
  allHeaders: string[];
  numericHeaders: string[];
  categoricalHeaders: string[];
  /**
   * 멀티시트 xlsx 업로드 시 시트명 → DataSet 매핑.
   * 단일 CSV / 단일 시트 xlsx 업로드 시에는 undefined.
   */
  sheets?: Record<string, DataSet>;
  onFileSelected: (file: File) => void;
  isUploading: boolean;
  activeAnalysis: string;
  onAnalysisComplete?: (result: any) => void;
  restoredState?: any;
  fileName: string;
  onClearData: () => void;
  /**
   * 각 페이지 컴포넌트에서 예제 데이터를 로드할 때 호출합니다.
   * 앱 레벨 state(data, headers, fileName)를 동기화하여
   * 예제 데이터와 업로드 데이터가 혼재되는 문제를 방지합니다.
   *
   * @param rows     - 예제 데이터 rows (Record<string, any>[])
   * @param name     - 예제 파일명 (예: 'example_stock_macro.csv')
   */
  onExampleLoaded?: (rows: Record<string, any>[], name: string) => void;
}

interface AnalysisItem {
  id: string;
  label: string;
  icon: React.ElementType;
  component: React.ComponentType<AnalysisPageProps>;
}

interface AnalysisSubCategory {
  name: string;
  items: AnalysisItem[];
}

interface BaseAnalysisCategory {
  name: string;
  icon: React.ElementType;
  phase?: string;
}

interface SingleLevelAnalysisCategory extends BaseAnalysisCategory {
  isSingle?: true;
  items: AnalysisItem[];
  subCategories?: undefined;
}

interface FlatAnalysisCategory extends BaseAnalysisCategory {
  isSingle?: false;
  items: AnalysisItem[];
  subCategories?: undefined;
}

interface MultiLevelAnalysisCategory extends BaseAnalysisCategory {
  isSingle?: false;
  items?: undefined;
  subCategories: AnalysisSubCategory[];
}

type AnalysisCategory =
  | SingleLevelAnalysisCategory
  | FlatAnalysisCategory
  | MultiLevelAnalysisCategory;

// ============================================
// Analysis Categories — 8-Phase Structure
// ============================================

const analysisCategories: AnalysisCategory[] = [
  // --- Overview ---
  {
    name: 'Overview',
    icon: BookOpen,
    isSingle: true,
    items: [
      { id: 'guide', label: 'Overview', icon: BookOpen, component: GuidePage },
    ],
  },

  // ─────────────────────────────────────────
  // Phase 1 · Macro & Sector
  // ─────────────────────────────────────────
  {
    name: 'Phase 1 · Macro & Sector',
    icon: Globe,
    phase: '1',
    items: [
      { id: 'market-regime',          label: 'Market Regime Classification', icon: Layers,      component: MacroRegimeDashboardPage     },
      { id: 'macro-variable-trends',  label: 'Macro Variable Trends',        icon: LineChart,   component: MacroVariableTrendsPage       },
      { id: 'risk-on-off-index',      label: 'Risk-On / Off Index (VIX)',    icon: Activity,    component: StockVsVixPage                },
      { id: 'sector-relative-strength',label: 'Sector Relative Strength',   icon: BarChart2,   component: SectorMomentumPage            },
      { id: 'macro-stock-correlation', label: 'Macro–Stock Correlation',     icon: ScatterChart,component: StockVsMacroCorrelationPage   },
    ],
  },

  // ─────────────────────────────────────────
  // Phase 2 · Quant Screening
  // ─────────────────────────────────────────
  {
    name: 'Phase 2 · Quant Screening',
    icon: Filter,
    phase: '2',
    items: [
      { id: 'composite-value-score', label: 'Composite Value Score',           icon: Star,     component: CompositeValueScorePage  },
      { id: 'quality-radar',         label: 'Quality Radar',                   icon: Compass,  component: QualityRadarPage          },
      { id: 'momentum-quadrant',     label: 'Momentum Quadrant',               icon: Grid3X3,  component: MomentumQuadrantPage      },
      { id: 'triple-threat-filter',  label: 'Triple-Threat Filter',            icon: Target,   component: CompositeScorecardPage    },
      { id: 'factor-rotation',       label: 'Factor Rotation (Value vs Growth)',icon: Shuffle, component: ValueMomentumComboPage    },
    ],
  },

  // ─────────────────────────────────────────
  // Phase 3 · Financial Planning & Modeling
  // ─────────────────────────────────────────
  {
    name: 'Phase 3 · Financial Modeling',
    icon: Calculator,
    phase: '3',
    items: [
      { id: 'revenue-cost-driver',    label: 'Revenue / Cost Driver',    icon: BarChart,        component: GrowthCompPage        },
      { id: 'three-statement-linkage',label: '3-Statement Linkage',      icon: GitFork,         component: MarginAnalysisPage     },
      { id: 'cash-flow-bridge',       label: 'Cash Flow Bridge',         icon: ArrowUpDown,     component: ReturnSummaryPage      },
      { id: 'debt-schedule',          label: 'Debt Schedule',            icon: Banknote,        component: LeverageAnalysisPage   },
      { id: 'working-capital-model',  label: 'Working Capital Model',    icon: SlidersHorizontal,component: MarginEfficiencyPage  },
      { id: 'rolling-forecast',       label: 'Rolling Forecast',         icon: RefreshCw,       component: RollingVolatilityPage  },
    ],
  },

  // ─────────────────────────────────────────
  // Phase 4 · Profitability & Unit Economics
  // ─────────────────────────────────────────
  {
    name: 'Phase 4 · Profitability',
    icon: DollarSign,
    phase: '4',
    items: [
      { id: 'contribution-margin', label: 'Contribution Margin & BEP',    icon: BarChart3,  component: ProfitabilityCompPage     },
      { id: 'unit-economics',      label: 'Unit Economics (LTV vs CAC)',   icon: Zap,        component: GrowthProfitMatrixPage    },
      { id: 'product-profitability',label: 'Product Profitability',        icon: PieChart,   component: SectorAvgRoePage          },
      { id: 'operating-leverage',  label: 'Operating Leverage',            icon: TrendingUp, component: CompositeQualityScorePage },
    ],
  },

  // ─────────────────────────────────────────
  // Phase 5 · Predictive Analytics
  // ─────────────────────────────────────────
  {
    name: 'Phase 5 · Predictive Analytics',
    icon: Cpu,
    phase: '5',
    items: [
      { id: 'target-price-forecasting', label: 'Target Price Forecasting',      icon: Target,       component: TopBottomReturnsPage       },
      { id: 'earnings-surprise-prob',   label: 'Earnings Surprise Probability', icon: FlaskConical, component: NormalDistOverlayPage       },
      { id: 'bankruptcy-alert',         label: 'Bankruptcy Alert',              icon: AlertCircle,  component: MomentumReversalPage        },
      { id: 'volatility-projection',    label: 'Volatility Projection',         icon: Activity,     component: VixRegimePage               },
      { id: 'trend-turning-point',      label: 'Trend Turning Point',           icon: TrendingDown, component: RollingCorrelationMacroPage },
    ],
  },

  // ─────────────────────────────────────────
  // Phase 6 · Valuation & Investment
  // ─────────────────────────────────────────
  {
    name: 'Phase 6 · Valuation & Investment',
    icon: Briefcase,
    phase: '6',
    items: [
      { id: 'dcf-model',           label: 'DCF Model',                  icon: Calculator, component: ValuationMultiplesPage    },
      { id: 'comparable-analysis', label: 'Comparable Analysis (CCA)',  icon: BarChart2,  component: PerVsPbrScatterPage        },
      { id: 'safety-margin',       label: 'Safety Margin',              icon: Shield,     component: EvEbitdaRankingPage        },
      { id: 'irr-npv-calculator',  label: 'IRR / NPV Calculator',       icon: Zap,        component: CompositeValueScorePageV2 },
      { id: 'payback-period',      label: 'Payback Period',             icon: Clock,      component: PerVsMarketCapPage         },
    ],
  },

  // ─────────────────────────────────────────
  // Phase 7 · Technical Timing
  // ─────────────────────────────────────────
  {
    name: 'Phase 7 · Technical Timing',
    icon: CandlestickChart,
    phase: '7',
    subCategories: [
      {
        name: 'Moving Averages',
        items: [
          { id: 'ma-overlay',        label: 'Moving Average Overlay', icon: LineChart, component: MaOverlayPage       },
          { id: 'ema-cross-signal',  label: 'EMA Cross Signal',       icon: Crosshair, component: EmaCrossSignalPage  },
        ],
      },
      {
        name: 'Oscillators & Bands',
        items: [
          { id: 'rsi-bollinger', label: 'RSI / Bollinger Bands', icon: AreaChart, component: BollingerBandsPage },
          { id: 'macd-chart',    label: 'MACD Chart',            icon: BarChart,  component: MacdChartPage      },
        ],
      },
      {
        name: 'Volume & Dashboard',
        items: [
          { id: 'volume-profile',           label: 'Volume Profile',            icon: BarChart2,    component: VolumeAnalysisPage          },
          { id: 'price-volume-correlation', label: 'Price-Volume Correlation',  icon: ScatterChart, component: PriceVolumeCorrelationPage  },
          { id: 'technical-dashboard',      label: 'Technical Dashboard',       icon: LayoutDashboard,component: TechnicalDashboardPage    },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────
  // Phase 8 · Risk & Strategy
  // ─────────────────────────────────────────
  {
    name: 'Phase 8 · Risk & Strategy',
    icon: AlertTriangle,
    phase: '8',
    subCategories: [
      {
        name: 'Correlation & Diversification',
        items: [
          { id: 'portfolio-correlation', label: 'Portfolio Correlation', icon: Grid3X3,  component: CorrelationHeatmapPage    },
          { id: 'variance-contribution', label: 'Variance Contribution', icon: PieChart, component: VarianceContributionPage  },
        ],
      },
      {
        name: 'Downside Risk',
        items: [
          { id: 'var',           label: 'Value at Risk (VaR)',   icon: AlertTriangle, component: VarPage          },
          { id: 'mdd',           label: 'Maximum Drawdown (MDD)',icon: TrendingDown,  component: MddPage          },
          { id: 'drawdown-comp', label: 'Drawdown Comparison',   icon: Activity,      component: DrawdownCompPage },
        ],
      },
      {
        name: 'Simulation & Optimization',
        items: [
          { id: 'risk-return-scatter', label: 'Risk-Return Scatter',    icon: ScatterChart, component: RiskReturnScatterPage },
          { id: 'sharpe-ratio-comp',   label: 'Sharpe Ratio Comparison',icon: BarChart,     component: SharpeRatioCompPage   },
        ],
      },
    ],
  },
];

// ============================================
// Utility Functions
// ============================================

function filterCategoriesBySearch(
  categories: AnalysisCategory[],
  searchTerm: string
): AnalysisCategory[] {
  if (!searchTerm) return categories;
  const lc = searchTerm.toLowerCase();
  return categories
    .map(category => {
      if (category.isSingle) {
        return category.items[0].label.toLowerCase().includes(lc) ? category : null;
      }
      if (category.items) {
        const filtered = category.items.filter(item => item.label.toLowerCase().includes(lc));
        return filtered.length > 0 ? { ...category, items: filtered } : null;
      }
      if (category.subCategories) {
        const filteredSubs = category.subCategories
          .map((sub: AnalysisSubCategory) => {
            const filtered = sub.items.filter(item => item.label.toLowerCase().includes(lc));
            return filtered.length > 0 ? { ...sub, items: filtered } : null;
          })
          .filter(Boolean) as AnalysisSubCategory[];
        return filteredSubs.length > 0 ? { ...category, subCategories: filteredSubs } : null;
      }
      return null;
    })
    .filter(Boolean) as AnalysisCategory[];
}

function getAnalysisComponent(
  categories: AnalysisCategory[],
  analysisId: string
): React.ComponentType<any> | null {
  for (const category of categories) {
    if (category.isSingle) {
      const found = category.items.find(item => item.id === analysisId);
      if (found) return found.component;
    } else if (category.items) {
      const found = category.items.find(item => item.id === analysisId);
      if (found) return found.component;
    } else if (category.subCategories) {
      for (const sub of category.subCategories) {
        const found = sub.items.find(item => item.id === analysisId);
        if (found) return found.component;
      }
    }
  }
  return null;
}

// ============================================
// Main Component
// ============================================

export default function YahooFinanceApp() {
  const [data, setData]                       = useState<DataSet>([]);
  const [allHeaders, setAllHeaders]           = useState<string[]>([]);
  const [numericHeaders, setNumericHeaders]   = useState<string[]>([]);
  const [categoricalHeaders, setCategoricalHeaders] = useState<string[]>([]);
  const [fileName, setFileName]               = useState('');
  const [sheets, setSheets]                   = useState<Record<string, DataSet> | undefined>(undefined);
  const [isUploading, setIsUploading]         = useState(false);
  const [activeAnalysis, setActiveAnalysis]   = useState('guide');
  const [openCategories, setOpenCategories]   = useState<string[]>([]);
  const [searchTerm, setSearchTerm]           = useState('');
  const [analysisResultForChat, setAnalysisResultForChat] = useState<any>(null);

  const { toast } = useToast();

  const filteredAnalysisCategories = useMemo(
    () => filterCategoriesBySearch(analysisCategories, searchTerm),
    [searchTerm]
  );

  const ActivePageComponent = useMemo(
    () => getAnalysisComponent(analysisCategories, activeAnalysis) || GuidePage,
    [activeAnalysis]
  );

  const toggleCategory = (category: string) => {
    setOpenCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  // ── Clear all state ──────────────────────────────────────
  const handleClearData = useCallback(() => {
    setData([]);
    setAllHeaders([]);
    setNumericHeaders([]);
    setCategoricalHeaders([]);
    setFileName('');
    setSheets(undefined);
    setAnalysisResultForChat(null);
    // NOTE: activeAnalysis 를 guide 로 리셋하지 않음.
    // 페이지 컴포넌트가 스스로 Intro 화면을 표시하도록 각 페이지가 처리합니다.
  }, []);

  // ── Reset state then parse new CSV/XLSX content ─────────
  const processData = useCallback(
    (content: string, name: string) => {
      // 먼저 기존 state 초기화 (예제 잔존 데이터 제거)
      setData([]);
      setAllHeaders([]);
      setNumericHeaders([]);
      setCategoricalHeaders([]);
      setFileName('');
      setSheets(undefined);
      setIsUploading(true);

      try {
        const {
          headers: newHeaders,
          data: newData,
          numericHeaders: newNumericHeaders,
          categoricalHeaders: newCategoricalHeaders,
        } = parseData(content);

        if (newData.length === 0 || newHeaders.length === 0) {
          throw new Error('No valid data found in the file.');
        }

        setData(newData);
        setAllHeaders(newHeaders);
        setNumericHeaders(newNumericHeaders);
        setCategoricalHeaders(newCategoricalHeaders);
        setFileName(name);

        toast({
          title: 'File Loaded',
          description: `"${name}" — ${newData.length.toLocaleString()} rows · ${newHeaders.length} columns`,
        });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'File Processing Error',
          description: error.message || 'Could not parse file. Please check the format.',
        });
        handleClearData();
      } finally {
        setIsUploading(false);
      }
    },
    [toast, handleClearData]
  );

  // ── Handle file upload from DataUploader ─────────────────
  const handleFileSelected = useCallback(
    (file: File) => {
      setIsUploading(true);
      const reader = new FileReader();

      reader.onerror = () => {
        toast({ variant: 'destructive', title: 'File Read Error', description: 'An error occurred while reading the file.' });
        setIsUploading(false);
      };

      if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
        reader.onload = e => {
          try {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });

            // Always parse first sheet as primary data (backward-compatible)
            const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]);
            processData(csv, file.name);

            // If multiple sheets exist, parse all and store in `sheets`
            if (workbook.SheetNames.length > 1) {
              const allSheets: Record<string, DataSet> = {};
              for (const name of workbook.SheetNames) {
                const sheetCsv = XLSX.utils.sheet_to_csv(workbook.Sheets[name]);
                try {
                  const { data: sheetData } = parseData(sheetCsv);
                  if (sheetData.length > 0) allSheets[name] = sheetData;
                } catch { /* skip unparseable sheets */ }
              }
              if (Object.keys(allSheets).length > 0) setSheets(allSheets);
            }
          } catch {
            toast({ variant: 'destructive', title: 'Excel Parse Error', description: 'Could not parse Excel file.' });
            setIsUploading(false);
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        reader.onload = e => {
          const content = e.target?.result as string;
          if (!content) {
            toast({ variant: 'destructive', title: 'File Read Error', description: 'Could not read file content.' });
            setIsUploading(false);
            return;
          }
          processData(content, file.name);
        };
        reader.readAsText(file);
      }
    },
    [processData, toast]
  );

  /**
   * 각 페이지 컴포넌트의 "Load Example" 버튼에서 호출됩니다.
   * 예제 rows 를 앱 레벨 state 에 직접 반영하여
   * 업로드 데이터와 예제 데이터가 혼재되는 문제를 방지합니다.
   */
  const handleExampleLoaded = useCallback(
    (rows: Record<string, any>[], name: string) => {
      if (!rows || rows.length === 0) return;

      const headers     = Object.keys(rows[0]);
      const numHeaders  = headers.filter(h => typeof rows[0][h] === 'number');
      const catHeaders  = headers.filter(h => typeof rows[0][h] === 'string');

      setData(rows as DataSet);
      setAllHeaders(headers);
      setNumericHeaders(numHeaders);
      setCategoricalHeaders(catHeaders);
      setFileName(name);
      setAnalysisResultForChat(null);
    },
    []
  );

  const handleDownloadData = useCallback(() => {
    if (data.length === 0) {
      toast({ title: 'No Data to Download', description: 'There is no data currently loaded.' });
      return;
    }
    try {
      const csvContent = unparseData({ headers: allHeaders, data });
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (fileName.replace(/\.[^/.]+$/, '') || 'analysis_data') + '_export.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast({ variant: 'destructive', title: 'Download Error', description: 'Could not prepare data for download.' });
    }
  }, [data, allHeaders, fileName, toast]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">

        {/* ── Sidebar ── */}
        <Sidebar collapsible="offcanvas">
          <SidebarHeader>
          <div className="p-2 pt-16 space-y-4">
          <DataUploader onFileSelected={handleFileSelected} loading={isUploading} />
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search analyses..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9 h-8 text-xs"
                />
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarMenu>
              {filteredAnalysisCategories.map(category =>
                category.isSingle ? (
                  <SidebarMenuItem key={category.name}>
                    <SidebarMenuButton
                      onClick={() => setActiveAnalysis(category.items[0].id)}
                      isActive={activeAnalysis === category.items[0].id}
                    >
                      <category.icon className="w-4 h-4" />
                      <span className="truncate">{category.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : (
                  <Collapsible
                    key={category.name}
                    open={openCategories.includes(category.name)}
                    onOpenChange={() => toggleCategory(category.name)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-sm px-2 font-semibold shadow-sm border-b bg-white text-foreground hover:bg-slate-50 rounded-none h-9"
                      >
                        <category.icon className="mr-2 h-4 w-4" />
                        <span>{category.name}</span>
                        <ChevronDown
                          className={cn(
                            'ml-auto h-3 w-3 transition-transform',
                            openCategories.includes(category.name) && 'rotate-180'
                          )}
                        />
                      </Button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      {category.items ? (
                        <SidebarMenu>
                          {category.items.map((item: AnalysisItem) => (
                            <SidebarMenuItem key={item.id}>
                              <SidebarMenuButton
                                onClick={() => setActiveAnalysis(item.id)}
                                isActive={activeAnalysis === item.id}
                              >
                                {item.icon && <item.icon className="w-4 h-4" />}
                                <span className="truncate">{item.label}</span>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
                        </SidebarMenu>
                      ) : (
                        category.subCategories && (
                          <SidebarMenu>
                            {category.subCategories.map((sub: AnalysisSubCategory, i: number) => (
                              <div key={i}>
                                <SidebarGroupLabel className="text-[10px] font-bold text-muted-foreground/60 px-3 py-2 uppercase tracking-tighter">
                                  {sub.name}
                                </SidebarGroupLabel>
                                {sub.items.map((item: AnalysisItem) => (
                                  <SidebarMenuItem key={item.id}>
                                    <SidebarMenuButton
                                      onClick={() => setActiveAnalysis(item.id)}
                                      isActive={activeAnalysis === item.id}
                                    >
                                      {item.icon && <item.icon className="w-4 h-4" />}
                                      <span className="truncate">{item.label}</span>
                                    </SidebarMenuButton>
                                  </SidebarMenuItem>
                                ))}
                              </div>
                            ))}
                          </SidebarMenu>
                        )
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                )
              )}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NextLink href="/dashboard/settings/team">
                    <Settings className="h-4 w-4" />
                  </NextLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        {/* ── Main Content ── */}
        <SidebarInset>
        <div className="p-4 md:p-6 h-full flex flex-col gap-4">
        <header className="flex items-center justify-between md:justify-end">
              <SidebarTrigger />
              <div />
            </header>

            {/*
              ✅ FIX 1: 앱 레벨 DataPreview 완전 제거.
              각 페이지 컴포넌트가 자체 파일 헤더바를 렌더링하므로 이중 표시를 방지합니다.
              기존 코드:
                {hasData && activeAnalysis !== 'guide' && (
                  <DataPreview ... />
                )}
            */}

            <ActivePageComponent
              data={data}
              allHeaders={allHeaders}
              numericHeaders={numericHeaders}
              categoricalHeaders={categoricalHeaders}
              sheets={sheets}
              onFileSelected={handleFileSelected}
              isUploading={isUploading}
              activeAnalysis={activeAnalysis}
              onAnalysisComplete={setAnalysisResultForChat}
              fileName={fileName}
              onClearData={handleClearData}
              onExampleLoaded={handleExampleLoaded}
            />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}