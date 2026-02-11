// components/tools/ToolPanel.tsx
// 통합 도구 패널 - 도구 ON/OFF 토글 + 활성 도구 렌더링

'use client';

import React, { useState, useMemo } from 'react';
import type {
  ToolId,
  GeoPoint,
  MapDataRow,
  FilterConfig,
  RadiusAnalysis,
  TimeSeriesFrame,
  RouteResult,
} from '@/types/map-analysis';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Filter,
  Circle,
  Clock,
  Route,
  Search,
  Layers,
  Layers2,
  Map,
  Hexagon,
  Pentagon,
  Waypoints,
  Grid3x3,
  Scan,
  ShieldAlert,
  CircleDot,
  Trophy,
  Table2,
  Navigation,
  FileText,
  Upload,
  MousePointer,
  SplitSquareHorizontal,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  Wrench,
  HelpCircle,
  Timer,
  Locate,
  MoveRight,
  Camera,
  Flame,
  CircleDashed,
  Combine,
  FlaskConical,
  Grip,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Tool components
import FilterTool from './FilterTool';
import RadiusTool from './RadiusTool';
import TimeSeriesSlider from './TimeSeriesSlider';
import RouteTool from './RouteTool';
import SearchTool from './SearchTool';
import VoronoiTool from './VoronoiTool';
import ConvexHullTool from './ConvexHullTool';
import type { HullResult } from './ConvexHullTool';
import SpiderMapTool from './SpiderMapTool';
import type { SpiderMapResult } from './SpiderMapTool';
import GridHexTool from './GridHexTool';
import type { GridHexResult } from './GridHexTool';
import DBSCANTool from './DBSCANTool';
import type { DBSCANResult } from './DBSCANTool';
import OutlierTool from './OutlierTool';
import type { OutlierResult } from './OutlierTool';
import CannibalizationTool from './CannibalizationTool';
import type { CannibalizationResult } from './CannibalizationTool';
import LocationScoreTool from './LocationScoreTool';
import type { LocationScoreResult } from './LocationScoreTool';
import ODMatrixTool from './ODMatrixTool';
import type { ODMatrixResult } from './ODMatrixTool';
import TSPTool from './TSPTool';
import type { TSPResult } from './TSPTool';
import BivariateMapTool from './BivariateMapTool';
import type { BivariateResult } from './BivariateMapTool';
import DataTableTool from './DataTableTool';
import IsochroneTool from './IsochroneTool';
import type { IsochroneResult } from './IsochroneTool';
import NearestFacilityTool from './NearestFacilityTool';
import type { NearestFacilityResult } from './NearestFacilityTool';
import FlowMapTool from './FlowMapTool';
import type { FlowMapResult } from './FlowMapTool';
import ScreenshotTool from './ScreenshotTool';
import HeatmapTool from './HeatmapTool';
import type { HeatmapResult } from './HeatmapTool';
import BufferZoneTool from './BufferZoneTool';
import type { BufferZoneResult } from './BufferZoneTool';
import SpatialJoinTool from './SpatialJoinTool';
import type { SpatialJoinResult } from './SpatialJoinTool';
import GuideTool from './GuideTool';
import ReportTool from './ReportTool';

// ─────────────────────────────────────────
// Tool definitions
// ─────────────────────────────────────────
interface ToolDef {
  id: ToolId;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  description: string;
  category: 'analysis' | 'visualization' | 'utility';
  requiresData: boolean;
}

const TOOL_DEFINITIONS: ToolDef[] = [
  {
    id: 'search',
    label: 'Location Search',
    shortLabel: 'Search',
    icon: Search,
    description: 'Search locations & reverse geocoding',
    category: 'utility',
    requiresData: false,
  },
  {
    id: 'filter',
    label: 'Filter & Slider',
    shortLabel: 'Filter',
    icon: Filter,
    description: 'Filter data by conditions',
    category: 'analysis',
    requiresData: true,
  },
  {
    id: 'radius',
    label: 'Radius Analysis',
    shortLabel: 'Radius',
    icon: Circle,
    description: 'Analyze points within radius',
    category: 'analysis',
    requiresData: true,
  },
  {
    id: 'timeseries',
    label: 'Time Series',
    shortLabel: 'Time',
    icon: Clock,
    description: 'Time series animation',
    category: 'visualization',
    requiresData: true,
  },
  {
    id: 'route',
    label: 'Route Measure',
    shortLabel: 'Route',
    icon: Route,
    description: 'Measure route distance & time',
    category: 'utility',
    requiresData: false,
  },
  {
    id: 'cluster',
    label: 'Clustering',
    shortLabel: 'Cluster',
    icon: Layers,
    description: 'Marker clustering ON/OFF',
    category: 'visualization',
    requiresData: true,
  },
  {
    id: 'choropleth',
    label: 'Choropleth',
    shortLabel: 'Choro',
    icon: Map,
    description: 'Choropleth color map',
    category: 'visualization',
    requiresData: true,
  },
  {
    id: 'dualmap',
    label: 'Dual Map',
    shortLabel: 'Dual',
    icon: SplitSquareHorizontal,
    description: 'Side-by-side comparison map',
    category: 'visualization',
    requiresData: true,
  },
  {
    id: 'voronoi',
    label: 'Voronoi Territory',
    shortLabel: 'Voronoi',
    icon: Hexagon,
    description: 'Territory division analysis',
    category: 'analysis',
    requiresData: true,
  },
  {
    id: 'convexhull',
    label: 'Convex Hull',
    shortLabel: 'Hull',
    icon: Pentagon,
    description: 'Data boundary & area calculation',
    category: 'analysis',
    requiresData: true,
  },
  {
    id: 'spider',
    label: 'Spider Map',
    shortLabel: 'Spider',
    icon: Waypoints,
    description: 'Radial connections from center',
    category: 'analysis',
    requiresData: true,
  },
  {
    id: 'gridhex',
    label: 'Grid / Hex Bin',
    shortLabel: 'Grid',
    icon: Grid3x3,
    description: 'Density binning by grid or hex',
    category: 'visualization',
    requiresData: true,
  },
  {
    id: 'dbscan',
    label: 'DBSCAN Clustering',
    shortLabel: 'DBSCAN',
    icon: Scan,
    description: 'Density-based auto clustering',
    category: 'analysis',
    requiresData: true,
  },
  {
    id: 'outlier',
    label: 'Outlier Detection',
    shortLabel: 'Outlier',
    icon: ShieldAlert,
    description: 'Detect spatial & statistical outliers',
    category: 'analysis',
    requiresData: true,
  },
  {
    id: 'cannibalization',
    label: 'Cannibalization',
    shortLabel: 'Cannibal',
    icon: CircleDot,
    description: 'Detect overlapping coverage areas',
    category: 'analysis',
    requiresData: true,
  },
  {
    id: 'locationscore',
    label: 'Location Score',
    shortLabel: 'Score',
    icon: Trophy,
    description: 'Weighted multi-criteria scoring',
    category: 'analysis',
    requiresData: true,
  },
  {
    id: 'odmatrix',
    label: 'OD Matrix',
    shortLabel: 'OD',
    icon: Table2,
    description: 'Origin-Destination distance matrix',
    category: 'utility',
    requiresData: true,
  },
  {
    id: 'tsp',
    label: 'TSP Route',
    shortLabel: 'TSP',
    icon: Navigation,
    description: 'Optimal route visiting all points',
    category: 'utility',
    requiresData: true,
  },
  {
    id: 'bivariate',
    label: 'Bivariate Map',
    shortLabel: 'BiVar',
    icon: Layers,
    description: 'Two-variable color visualization',
    category: 'visualization',
    requiresData: true,
  },
  {
    id: 'isochrone',
    label: 'Isochrone',
    shortLabel: 'Isochrone',
    icon: Timer,
    description: 'Driving time reachability area',
    category: 'analysis',
    requiresData: false,
  },
  {
    id: 'nearestfacility',
    label: 'Nearest Facility',
    shortLabel: 'Nearest',
    icon: Locate,
    description: 'Find closest facility per point',
    category: 'analysis',
    requiresData: true,
  },
  {
    id: 'flowmap',
    label: 'Flow Map',
    shortLabel: 'Flow',
    icon: MoveRight,
    description: 'Movement flows between locations',
    category: 'visualization',
    requiresData: true,
  },
  {
    id: 'heatmap',
    label: 'Heatmap',
    shortLabel: 'Heatmap',
    icon: Flame,
    description: 'Density heat visualization',
    category: 'visualization',
    requiresData: true,
  },
  {
    id: 'bufferzone',
    label: 'Buffer Zone',
    shortLabel: 'Buffer',
    icon: CircleDashed,
    description: 'Circular coverage areas per point',
    category: 'analysis',
    requiresData: true,
  },
  {
    id: 'spatialjoin',
    label: 'Spatial Join',
    shortLabel: 'SpatialJ',
    icon: Combine,
    description: 'Count points within areas',
    category: 'analysis',
    requiresData: true,
  },
  {
    id: 'popup',
    label: 'Detail Popup',
    shortLabel: 'Popup',
    icon: MousePointer,
    description: 'Detail popup on marker click',
    category: 'visualization',
    requiresData: true,
  },
  {
    id: 'report',
    label: 'Report & Export',
    shortLabel: 'Export',
    icon: FileText,
    description: 'Export analysis results',
    category: 'utility',
    requiresData: false,
  },
  {
    id: 'screenshot',
    label: 'Screenshot',
    shortLabel: 'Screenshot',
    icon: Camera,
    description: 'Capture map as image',
    category: 'utility',
    requiresData: false,
  },
  {
    id: 'datatable',
    label: 'Data Table',
    shortLabel: 'Data',
    icon: Table2,
    description: 'Browse and inspect data',
    category: 'utility',
    requiresData: true,
  },
  {
    id: 'guide',
    label: 'Guide & Help',
    shortLabel: 'Guide',
    icon: HelpCircle,
    description: 'How to use each tool',
    category: 'utility',
    requiresData: false,
  },
];

const CATEGORIES = [
  { key: 'analysis', label: 'Analysis', icon: FlaskConical },
  { key: 'visualization', label: 'Visualization', icon: Layers },
  { key: 'utility', label: 'Utility', icon: FileText },
] as const;

// ─────────────────────────────────────────
// Tool Panel Props (all state bridges)
// ─────────────────────────────────────────
export interface ToolPanelProps {
  // Data
  data: MapDataRow[];
  filteredData: MapDataRow[];
  allHeaders: string[];
  numericHeaders: string[];
  categoricalHeaders: string[];
  fileName: string;

  // Upload
  onFileSelected: (file: File) => void;
  onClearData: () => void;
  isUploading: boolean;

  // Filter state
  filters: FilterConfig[];
  onFiltersChange: (filters: FilterConfig[]) => void;

  // Radius state
  radiusCenter: GeoPoint | null;
  onRadiusCenterChange: (center: GeoPoint | null) => void;
  radiusAnalysis: RadiusAnalysis | null;
  onRadiusAnalysisResult: (result: RadiusAnalysis | null) => void;

  // Time series state
  onTimeFrameChange: (frame: TimeSeriesFrame | null) => void;
  onAllTimeFrames: (frames: TimeSeriesFrame[]) => void;

  // Route state
  onRouteResult: (result: RouteResult | null) => void;
  onRouteWaypoints: (points: GeoPoint[]) => void;

  // Search state
  onLocationSelect: (point: GeoPoint, zoom?: number) => void;
  onSearchMarkerPlace: (point: GeoPoint, label: string) => void;
  mapCenter?: GeoPoint;

  // Voronoi state
  onVoronoiCentersChange: (centers: any[]) => void;
  onVoronoiCellAssignments: (assignments: Map<number, MapDataRow[]>) => void;
  onVoronoiCellColors: (colors: any[]) => void;

  // Convex Hull state
  onHullsChange: (hulls: HullResult[]) => void;

  // Spider Map state
  onSpiderChange: (result: SpiderMapResult | null) => void;

  // Grid/Hex Bin state
  onGridHexChange: (result: GridHexResult | null) => void;

  // DBSCAN state
  onDBSCANChange: (result: DBSCANResult | null) => void;

  // Outlier Detection state
  onOutlierChange: (result: OutlierResult | null) => void;

  // Cannibalization state
  onCannibalizationChange: (result: CannibalizationResult | null) => void;

  // Location Score state
  onLocationScoreChange: (result: LocationScoreResult | null) => void;

  // OD Matrix state
  onODMatrixChange: (result: ODMatrixResult | null) => void;

  // TSP state
  onTSPChange: (result: TSPResult | null) => void;

  // Bivariate state
  onBivariateChange: (result: BivariateResult | null) => void;

  // Isochrone state
  onIsochroneChange: (result: IsochroneResult | null) => void;

  // Nearest Facility state
  onNearestFacilityChange: (result: NearestFacilityResult | null) => void;

  // Flow Map state
  onFlowMapChange: (result: FlowMapResult | null) => void;

  // Heatmap state
  onHeatmapChange: (result: HeatmapResult | null) => void;

  // Buffer Zone state
  onBufferZoneChange: (result: BufferZoneResult | null) => void;

  // Spatial Join state
  onSpatialJoinChange: (result: SpatialJoinResult | null) => void;

  // Clear all analysis results (called on tool switch/close)
  onClearAnalysis: (keepToolId?: string) => void;

  // Map interaction state
  isMapSelectMode: boolean;
  onMapSelectModeChange: (mode: boolean) => void;
  lastMapClick: GeoPoint | null;

  // Tool toggle state (for tools without panels: cluster, choropleth, dualmap, popup)
  enabledToggles: Record<string, boolean>;
  onToggleChange: (id: string, enabled: boolean) => void;
}

export default function ToolPanel(props: ToolPanelProps) {
  const [activeToolId, setActiveToolId] = useState<ToolId | null>(null);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [panelWidth, setPanelWidth] = useState(288); // default w-72 = 288px
  const isResizing = React.useRef(false);
  const startX = React.useRef(0);
  const startWidth = React.useRef(0);

  // Resize handlers
  const handleResizeStart = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = panelWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = ev.clientX - startX.current;
      const newWidth = Math.max(220, Math.min(600, startWidth.current + delta));
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [panelWidth]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [flyoutCategory, setFlyoutCategory] = useState<string | null>(null);
  const dragCounter = React.useRef(0);

  const hasData = props.data.length > 0;

  // ─── Drag & Drop ───
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounter.current = 0;
    const file = e.dataTransfer.files?.[0];
    if (file && /\.(csv|tsv|xlsx|xls)$/i.test(file.name)) {
      props.onFileSelected(file);
    }
  };

  const activeTools = useMemo(() => {
    const list: string[] = [];
    if (props.filters.length > 0) list.push('filter');
    if (props.radiusAnalysis) list.push('radius');
    if (props.enabledToggles.cluster) list.push('cluster');
    if (props.enabledToggles.choropleth) list.push('choropleth');
    if (props.enabledToggles.dualmap) list.push('dualmap');
    if (props.enabledToggles.popup) list.push('popup');
    return list;
  }, [props.filters, props.radiusAnalysis, props.enabledToggles]);

  const selectTool = (id: ToolId) => {
    // Toggle tools (cluster, choropleth, dualmap, popup) don't have panels
    const toggleOnly: ToolId[] = ['cluster', 'choropleth', 'dualmap', 'popup'];
    if (toggleOnly.includes(id)) {
      props.onToggleChange(id, !props.enabledToggles[id]);
      return;
    }
    // Panel tools — clear previous analysis when switching
    if (activeToolId === id) {
      // Closing current tool
      setActiveToolId(null);
      setTimeout(() => props.onClearAnalysis(), 0);
    } else {
      // Switching to new tool
      setActiveToolId(id);
      setPanelWidth(id === 'datatable' ? 384 : 288);
      setTimeout(() => props.onClearAnalysis(id), 0);
    }
    setIsPanelCollapsed(false);
  };

  const activeDef = TOOL_DEFINITIONS.find((t) => t.id === activeToolId);

  // ─────────────────────────────────────────
  // Render active tool panel content
  // ─────────────────────────────────────────
  const renderToolContent = () => {
    switch (activeToolId) {
      case 'filter':
        return (
          <FilterTool
            data={props.data}
            filters={props.filters}
            onFiltersChange={props.onFiltersChange}
          />
        );

      case 'radius':
        return (
          <RadiusTool
            data={props.filteredData}
            selectedCenter={props.radiusCenter}
            onCenterChange={props.onRadiusCenterChange}
            onAnalysisResult={props.onRadiusAnalysisResult}
            isSelectMode={props.isMapSelectMode}
            onSelectModeChange={props.onMapSelectModeChange}
            onMapClick={props.lastMapClick}
          />
        );

      case 'timeseries':
        return (
          <TimeSeriesSlider
            data={props.filteredData}
            onFrameChange={props.onTimeFrameChange}
            onAllFrames={props.onAllTimeFrames}
          />
        );

      case 'route':
        return (
          <RouteTool
            data={props.data}
            onRouteResult={props.onRouteResult}
            onWaypoints={props.onRouteWaypoints}
            isSelectMode={props.isMapSelectMode}
            onSelectModeChange={props.onMapSelectModeChange}
            onMapClick={props.lastMapClick}
          />
        );

      case 'search':
        return (
          <SearchTool
            onLocationSelect={props.onLocationSelect}
            onMarkerPlace={props.onSearchMarkerPlace}
            mapCenter={props.mapCenter}
          />
        );

      case 'voronoi':
        return (
          <VoronoiTool
            data={props.filteredData}
            onCentersChange={props.onVoronoiCentersChange}
            onCellAssignments={props.onVoronoiCellAssignments}
            onCellColors={props.onVoronoiCellColors}
            isSelectMode={props.isMapSelectMode}
            onSelectModeChange={props.onMapSelectModeChange}
            onMapClick={props.lastMapClick}
          />
        );

      case 'convexhull':
        return (
          <ConvexHullTool
            data={props.filteredData}
            onHullsChange={props.onHullsChange}
          />
        );

      case 'spider':
        return (
          <SpiderMapTool
            data={props.filteredData}
            onSpiderChange={props.onSpiderChange}
            isSelectMode={props.isMapSelectMode}
            onSelectModeChange={props.onMapSelectModeChange}
            onMapClick={props.lastMapClick}
          />
        );

      case 'gridhex':
        return (
          <GridHexTool
            data={props.filteredData}
            onResultChange={props.onGridHexChange}
          />
        );

      case 'dbscan':
        return (
          <DBSCANTool
            data={props.filteredData}
            onResultChange={props.onDBSCANChange}
          />
        );

      case 'outlier':
        return (
          <OutlierTool
            data={props.filteredData}
            onResultChange={props.onOutlierChange}
          />
        );

      case 'cannibalization':
        return (
          <CannibalizationTool
            data={props.filteredData}
            onResultChange={props.onCannibalizationChange}
          />
        );

      case 'locationscore':
        return (
          <LocationScoreTool
            data={props.filteredData}
            onResultChange={props.onLocationScoreChange}
          />
        );

      case 'odmatrix':
        return (
          <ODMatrixTool
            data={props.filteredData}
            onResultChange={props.onODMatrixChange}
          />
        );

      case 'tsp':
        return (
          <TSPTool
            data={props.filteredData}
            onResultChange={props.onTSPChange}
          />
        );

      case 'bivariate':
        return (
          <BivariateMapTool
            data={props.filteredData}
            onResultChange={props.onBivariateChange}
          />
        );

      case 'isochrone':
        return (
          <IsochroneTool
            data={props.filteredData}
            onResultChange={props.onIsochroneChange}
            lastMapClick={props.lastMapClick}
            isMapSelectMode={props.isMapSelectMode}
            onMapSelectModeChange={props.onMapSelectModeChange}
          />
        );

      case 'nearestfacility':
        return (
          <NearestFacilityTool
            data={props.data}
            filteredData={props.filteredData}
            allHeaders={props.allHeaders}
            categoricalHeaders={props.categoricalHeaders}
            onResultChange={props.onNearestFacilityChange}
          />
        );

      case 'flowmap':
        return (
          <FlowMapTool
            data={props.data}
            filteredData={props.filteredData}
            allHeaders={props.allHeaders}
            categoricalHeaders={props.categoricalHeaders}
            numericHeaders={props.numericHeaders}
            onResultChange={props.onFlowMapChange}
          />
        );

      case 'report':
        return (
          <ReportTool
            data={props.data}
            filteredData={props.filteredData}
            filters={props.filters}
            radiusAnalysis={props.radiusAnalysis}
            activeTools={activeTools}
            fileName={props.fileName}
          />
        );

      case 'screenshot':
        return <ScreenshotTool fileName={props.fileName} />;

      case 'heatmap':
        return (
          <HeatmapTool
            data={props.data}
            filteredData={props.filteredData}
            numericHeaders={props.numericHeaders}
            onResultChange={props.onHeatmapChange}
          />
        );

      case 'bufferzone':
        return (
          <BufferZoneTool
            data={props.data}
            filteredData={props.filteredData}
            numericHeaders={props.numericHeaders}
            categoricalHeaders={props.categoricalHeaders}
            onResultChange={props.onBufferZoneChange}
          />
        );

      case 'spatialjoin':
        return (
          <SpatialJoinTool
            data={props.data}
            filteredData={props.filteredData}
            allHeaders={props.allHeaders}
            numericHeaders={props.numericHeaders}
            categoricalHeaders={props.categoricalHeaders}
            onResultChange={props.onSpatialJoinChange}
          />
        );

      case 'datatable':
        return (
          <DataTableTool
            data={props.data}
            filteredData={props.filteredData}
            allHeaders={props.allHeaders}
            fileName={props.fileName}
          />
        );

      case 'guide':
        return <GuideTool />;

      default:
        return null;
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="flex h-full relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDragOver && (
          <div className="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center backdrop-blur-sm">
            <div className="text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-primary animate-bounce" />
              <div className="text-sm font-medium text-primary">Drop file here</div>
              <div className="text-xs text-muted-foreground">CSV, Excel (.xlsx)</div>
            </div>
          </div>
        )}
        {/* Icon toolbar — compact with flyout menus */}
        <div className="flex flex-col w-20 border-r bg-muted/30 py-3 flex-shrink-0 relative">
          {/* Upload button */}
          <div className="px-1.5 mb-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <label
                  className={cn(
                    'w-[68px] h-[52px] flex items-center justify-center rounded-lg cursor-pointer transition-all relative',
                    hasData
                      ? 'text-green-600 bg-green-500/10'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <input
                    type="file"
                    accept=".csv,.tsv,.xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) props.onFileSelected(file);
                      e.target.value = '';
                    }}
                    disabled={props.isUploading}
                  />
                  {props.isUploading ? (
                    <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload className="h-5 w-5" />
                  )}
                  {hasData && (
                    <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-green-500" />
                  )}
                </label>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {hasData ? (
                  <div>
                    <div className="font-medium">{props.fileName}</div>
                    <div className="text-muted-foreground text-[10px]">{props.data.length} points loaded</div>
                    <div className="text-[10px] mt-0.5">Click to replace data</div>
                  </div>
                ) : (
                  <div>
                    <div className="font-medium">Upload Data</div>
                    <div className="text-muted-foreground text-[10px]">CSV, Excel (.xlsx)</div>
                  </div>
                )}
              </TooltipContent>
            </Tooltip>

            {hasData && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={props.onClearData}
                    className="w-[68px] h-6 flex items-center justify-center rounded text-[10px] text-destructive hover:bg-destructive/10 transition-colors mt-1"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">Clear data</TooltipContent>
              </Tooltip>
            )}
          </div>

          <div className="border-b mx-2.5 mb-2" />

          {/* Category buttons */}
          <div className="flex flex-col gap-1.5 px-1.5">
            {CATEGORIES.map((cat) => {
              const tools = TOOL_DEFINITIONS.filter((t) => t.category === cat.key);
              const isOpen = flyoutCategory === cat.key;
              const activeCount = tools.filter(
                (t) => activeToolId === t.id || props.enabledToggles[t.id]
              ).length;
              const CatIcon = cat.key === 'analysis' ? Search : cat.key === 'visualization' ? Layers2 : Wrench;

              return (
                <button
                  key={cat.key}
                  onClick={() => setFlyoutCategory(isOpen ? null : cat.key)}
                  className={cn(
                    'w-[68px] h-[52px] flex flex-col items-center justify-center gap-1 rounded-lg transition-all relative',
                    isOpen ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  <CatIcon className="h-5 w-5" />
                  <span className="text-[8px] leading-none font-semibold uppercase tracking-wider">
                    {cat.label}
                  </span>
                  {activeCount > 0 && (
                    <div className={cn(
                      'absolute top-1 right-1 w-4 h-4 rounded-full text-[8px] flex items-center justify-center font-bold',
                      isOpen ? 'bg-primary-foreground text-primary' : 'bg-primary text-primary-foreground'
                    )}>
                      {activeCount}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Bottom quick-access buttons */}
          <div className="flex flex-col gap-1.5 px-1.5 pb-3 border-t pt-2 mx-1.5 mt-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => selectTool('datatable')}
                  disabled={!hasData}
                  className={cn(
                    'w-[68px] h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-lg transition-all relative',
                    activeToolId === 'datatable' ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted text-muted-foreground hover:text-foreground',
                    !hasData && 'opacity-30 cursor-not-allowed'
                  )}
                >
                  <Table2 className="h-4 w-4" />
                  <span className="text-[8px] leading-none font-medium">Data</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                <div className="font-medium">Data Table</div>
                <div className="text-muted-foreground text-[10px]">Browse and inspect data</div>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => selectTool('guide')}
                  className={cn(
                    'w-[68px] h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-lg transition-all',
                    activeToolId === 'guide' ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  <HelpCircle className="h-4 w-4" />
                  <span className="text-[8px] leading-none font-medium">Guide</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                <div className="font-medium">Guide & Help</div>
                <div className="text-muted-foreground text-[10px]">How to use each tool</div>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        {flyoutCategory && (
          <>
            {/* Backdrop to close */}
            <div
              className="fixed inset-0 z-30"
              onClick={() => setFlyoutCategory(null)}
            />
            <div className="absolute left-20 top-0 bottom-0 z-40 w-48 bg-background border-r shadow-lg flex flex-col">
              <div className="px-3 py-2.5 border-b bg-muted/20 flex items-center justify-between flex-shrink-0">
                <span className="text-xs font-semibold uppercase tracking-wide">
                  {CATEGORIES.find((c) => c.key === flyoutCategory)?.label}
                </span>
                <button
                  onClick={() => setFlyoutCategory(null)}
                  className="p-0.5 hover:bg-muted rounded"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                <div className="grid grid-cols-2 gap-1.5">
                  {TOOL_DEFINITIONS.filter((t) => t.category === flyoutCategory).map((tool) => {
                    const Icon = tool.icon;
                    const isActive = activeToolId === tool.id;
                    const isToggled = props.enabledToggles[tool.id];
                    const isDisabled = tool.requiresData && !hasData;
                    const toggleOnly: ToolId[] = ['cluster', 'choropleth', 'dualmap', 'popup'];
                    const isToggleType = toggleOnly.includes(tool.id);

                    return (
                      <Tooltip key={tool.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => {
                              if (!isDisabled) {
                                selectTool(tool.id);
                                setFlyoutCategory(null);
                              }
                            }}
                            disabled={isDisabled}
                            className={cn(
                              'flex flex-col items-center justify-center gap-1 p-2.5 rounded-lg transition-all relative border',
                              isActive && 'bg-primary text-primary-foreground border-primary shadow-sm',
                              isToggled && !isActive && 'bg-primary/10 text-primary border-primary/30',
                              !isActive && !isToggled && 'hover:bg-muted text-muted-foreground hover:text-foreground border-transparent hover:border-border',
                              isDisabled && 'opacity-30 cursor-not-allowed'
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            <span className="text-[9px] leading-tight font-medium text-center">
                              {tool.shortLabel}
                            </span>
                            {isToggleType && isToggled && (
                              <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-500" />
                            )}
                            {tool.id === 'filter' && props.filters.length > 0 && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[7px] flex items-center justify-center font-bold">
                                {props.filters.length}
                              </div>
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs">
                          <div className="font-medium">{tool.label}</div>
                          <div className="text-muted-foreground text-[10px]">{tool.description}</div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Tool panel (resizable) */}
        {activeToolId && activeDef && (
          <div
            className={cn(
              'border-r bg-background flex flex-col transition-all relative',
              isPanelCollapsed && 'w-0 overflow-hidden'
            )}
            style={isPanelCollapsed ? undefined : { width: `${panelWidth}px` }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/20 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <activeDef.icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="text-xs font-medium truncate">{activeDef.label}</span>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  onClick={() => setIsPanelCollapsed(true)}
                  className="p-1 hover:bg-muted rounded"
                  title="Collapse panel"
                >
                  <PanelLeftClose className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <button
                  onClick={() => { setActiveToolId(null); setTimeout(() => props.onClearAnalysis(), 0); }}
                  className="p-1 hover:bg-muted rounded"
                  title="Close tool"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Panel content */}
            <div className="flex-1 overflow-hidden">{renderToolContent()}</div>

            {/* Resize handle */}
            {!isPanelCollapsed && (
              <div
                onMouseDown={handleResizeStart}
                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors z-10"
                title="Drag to resize"
              />
            )}
          </div>
        )}

        {/* Collapsed panel re-open handle */}
        {activeToolId && isPanelCollapsed && (
          <button
            onClick={() => setIsPanelCollapsed(false)}
            className="w-5 border-r bg-muted/30 hover:bg-muted flex items-center justify-center transition-colors"
            title="Expand panel"
          >
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
    </TooltipProvider>
  );
}