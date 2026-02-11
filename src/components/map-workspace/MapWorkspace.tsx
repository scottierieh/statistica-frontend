// components/map-workspace/MapWorkspace.tsx
// Main map workspace

'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import type {
  GeoPoint,
  MapDataRow,
  FilterConfig,
  RadiusAnalysis,
  TimeSeriesFrame,
  RouteResult,
  MapViewState,
} from '@/types/map-analysis';
import {
  applyFilters,
  clusterPoints,
  getBounds,
  formatNumber,
} from '@/lib/map-utils';
import ToolPanel from '@/components/tools/ToolPanel';
import { Badge } from '@/components/ui/badge';
import { Upload } from 'lucide-react';

// ─────────────────────────────────────────
// Leaflet Map - dynamic import (NO SSR)
// ─────────────────────────────────────────
const LeafletMap = dynamic(
  () => import('./LeafletMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-muted animate-pulse flex items-center justify-center text-muted-foreground text-sm">
        Loading map...
      </div>
    ),
  }
);

// ─────────────────────────────────────────
// Props
// ─────────────────────────────────────────
interface MapWorkspaceProps {
  data: MapDataRow[];
  allHeaders: string[];
  numericHeaders: string[];
  categoricalHeaders: string[];
  fileName: string;
  onFileSelected: (file: File) => void;
  onClearData: () => void;
  isUploading: boolean;
}

// ─────────────────────────────────────────
// NYC Sample Dataset
// ─────────────────────────────────────────
const SAMPLE_CSV_NYC = `name,latitude,longitude,category,revenue,employees,rating,opened
Times Square Store,40.7580,-73.9855,Flagship,2850000,45,4.7,2019-03-15
SoHo Boutique,40.7234,-73.9985,Boutique,1920000,22,4.5,2020-06-01
Brooklyn Heights Cafe,40.6960,-73.9936,Cafe,680000,12,4.3,2021-01-20
Upper East Side,40.7736,-73.9566,Premium,3100000,38,4.8,2018-09-10
Chelsea Market Pop-up,40.7424,-74.0061,Pop-up,520000,8,4.1,2023-04-05
Williamsburg Hub,40.7081,-73.9571,Flagship,1750000,28,4.4,2020-11-12
Harlem Express,40.8116,-73.9465,Express,430000,6,3.9,2022-07-18
Midtown East,40.7549,-73.9724,Premium,2680000,35,4.6,2019-01-22
West Village,40.7358,-74.0036,Boutique,1280000,18,4.5,2021-05-30
Astoria Queens,40.7720,-73.9310,Standard,780000,14,4.0,2022-02-14
Financial District,40.7075,-74.0089,Express,950000,11,4.2,2020-08-25
East Village Lounge,40.7265,-73.9815,Cafe,620000,10,4.4,2021-09-03
Park Slope,40.6710,-73.9812,Standard,870000,15,4.3,2020-04-17
Upper West Side,40.7870,-73.9754,Premium,2450000,32,4.7,2018-12-01
LIC Waterfront,40.7425,-73.9580,Flagship,1680000,25,4.2,2022-03-08
Tribeca Loft,40.7163,-74.0086,Boutique,2100000,20,4.6,2019-07-14
Murray Hill,40.7489,-73.9780,Standard,620000,9,3.8,2023-01-10
Bushwick Creative,40.6944,-73.9213,Pop-up,340000,5,4.0,2023-06-22
Flatiron,40.7411,-73.9897,Premium,2780000,36,4.8,2018-06-05
Greenwich Village,40.7336,-74.0027,Cafe,710000,11,4.3,2021-03-28
Roosevelt Island,40.7620,-73.9510,Express,380000,7,3.7,2023-08-15
Hell's Kitchen,40.7638,-73.9918,Standard,920000,16,4.1,2022-05-09
Dumbo Brooklyn,40.7033,-73.9884,Boutique,1540000,19,4.5,2020-10-01
East Harlem,40.7957,-73.9389,Express,350000,6,3.6,2023-02-28
Nolita,40.7233,-73.9952,Cafe,840000,13,4.4,2021-08-14
Jackson Heights,40.7497,-73.8830,Standard,560000,10,3.9,2022-11-20
Crown Heights,40.6694,-73.9422,Pop-up,290000,4,3.8,2023-09-01
Battery Park,40.7033,-74.0170,Express,480000,8,4.0,2022-04-12
Gramercy,40.7382,-73.9860,Premium,1950000,24,4.5,2019-10-18
Union Square,40.7359,-73.9911,Flagship,2350000,30,4.6,2019-05-20
Prospect Heights,40.6773,-73.9685,Cafe,590000,9,4.2,2021-12-05
Kips Bay,40.7420,-73.9802,Standard,510000,8,3.7,2023-03-14
Red Hook,40.6734,-74.0100,Pop-up,270000,4,3.9,2023-07-30
Cobble Hill,40.6860,-73.9957,Boutique,980000,14,4.3,2021-06-18
Meatpacking District,40.7409,-74.0078,Flagship,2100000,27,4.7,2019-08-22
Greenpoint,40.7274,-73.9514,Standard,720000,12,4.1,2022-01-15
Lower East Side,40.7150,-73.9843,Cafe,650000,10,4.2,2021-04-09
Morningside Heights,40.8075,-73.9626,Express,320000,5,3.5,2023-05-17
Sunset Park,40.6467,-74.0090,Standard,440000,7,3.8,2022-09-28
Fort Greene,40.6872,-73.9762,Cafe,580000,9,4.1,2021-10-23`;

export default function MapWorkspace({
  data,
  allHeaders,
  numericHeaders,
  categoricalHeaders,
  fileName,
  onFileSelected,
  onClearData,
  isUploading,
}: MapWorkspaceProps) {
  // ─── Map view state ───
  const [mapView, setMapView] = useState<MapViewState>({
    center: { lat: 40.7128, lng: -74.006 },
    zoom: 11,
  });
  const [flyTo, setFlyTo] = useState<{ center: GeoPoint; zoom: number } | null>(null);

  // ─── Filter state ───
  const [filters, setFilters] = useState<FilterConfig[]>([]);

  // ─── Radius state ───
  const [radiusCenter, setRadiusCenter] = useState<GeoPoint | null>(null);
  const [radiusAnalysis, setRadiusAnalysis] = useState<RadiusAnalysis | null>(null);

  // ─── Time series state ───
  const [currentTimeFrame, setCurrentTimeFrame] = useState<TimeSeriesFrame | null>(null);
  const [allTimeFrames, setAllTimeFrames] = useState<TimeSeriesFrame[]>([]);

  // ─── Route state ───
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [routeWaypoints, setRouteWaypoints] = useState<GeoPoint[]>([]);

  // ─── Search state ───
  const [searchMarkers, setSearchMarkers] = useState<{ point: GeoPoint; label: string }[]>([]);

  // ─── Voronoi state ───
  const [voronoiCenters, setVoronoiCenters] = useState<any[]>([]);
  const [voronoiAssignments, setVoronoiAssignments] = useState<Map<number, MapDataRow[]>>(new Map());
  const [voronoiColors, setVoronoiColors] = useState<any[]>([]);

  // ─── Convex Hull state ───
  const [convexHulls, setConvexHulls] = useState<any[]>([]);

  // ─── Spider Map state ───
  const [spiderResult, setSpiderResult] = useState<any>(null);

  // ─── Grid/Hex Bin state ───
  const [gridHexResult, setGridHexResult] = useState<any>(null);

  // ─── DBSCAN state ───
  const [dbscanResult, setDBSCANResult] = useState<any>(null);

  // ─── Outlier state ───
  const [outlierResult, setOutlierResult] = useState<any>(null);

  // ─── Cannibalization state ───
  const [cannibalizationResult, setCannibalizationResult] = useState<any>(null);

  // ─── Location Score state ───
  const [locationScoreResult, setLocationScoreResult] = useState<any>(null);

  // ─── OD Matrix state ───
  const [odMatrixResult, setODMatrixResult] = useState<any>(null);

  // ─── TSP state ───
  const [tspResult, setTSPResult] = useState<any>(null);

  // ─── Bivariate state ───
  const [bivariateResult, setBivariateResult] = useState<any>(null);

  // ─── Isochrone state ───
  const [isochroneResult, setIsochroneResult] = useState<any>(null);

  // ─── Nearest Facility state ───
  const [nearestFacilityResult, setNearestFacilityResult] = useState<any>(null);

  // ─── Flow Map state ───
  const [flowMapResult, setFlowMapResult] = useState<any>(null);

  // ─── Heatmap state ───
  const [heatmapResult, setHeatmapResult] = useState<any>(null);

  // ─── Buffer Zone state ───
  const [bufferZoneResult, setBufferZoneResult] = useState<any>(null);

  // ─── Spatial Join state ───
  const [spatialJoinResult, setSpatialJoinResult] = useState<any>(null);

  // ─── Clear all analysis results ───
  const clearAnalysis = useCallback((keepToolId?: string) => {
    const clearMap: Record<string, () => void> = {
      radius: () => { setRadiusCenter(null); setRadiusAnalysis(null); },
      timeseries: () => { setCurrentTimeFrame(null); setAllTimeFrames([]); },
      route: () => { setRouteResult(null); setRouteWaypoints([]); },
      search: () => { setSearchMarkers([]); },
      voronoi: () => { setVoronoiCenters([]); setVoronoiAssignments(new Map()); setVoronoiColors([]); },
      hull: () => { setConvexHulls([]); },
      spider: () => { setSpiderResult(null); },
      gridhex: () => { setGridHexResult(null); },
      dbscan: () => { setDBSCANResult(null); },
      outlier: () => { setOutlierResult(null); },
      cannibalization: () => { setCannibalizationResult(null); },
      locationscore: () => { setLocationScoreResult(null); },
      odmatrix: () => { setODMatrixResult(null); },
      tsp: () => { setTSPResult(null); },
      bivariate: () => { setBivariateResult(null); },
      isochrone: () => { setIsochroneResult(null); },
      nearestfacility: () => { setNearestFacilityResult(null); },
      flowmap: () => { setFlowMapResult(null); },
      heatmap: () => { setHeatmapResult(null); },
      bufferzone: () => { setBufferZoneResult(null); },
      spatialjoin: () => { setSpatialJoinResult(null); },
    };
    Object.entries(clearMap).forEach(([key, clear]) => {
      if (key !== keepToolId) clear();
    });
  }, []);

  // ─── Map interaction ───
  const [isMapSelectMode, setIsMapSelectMode] = useState(false);
  const [lastMapClick, setLastMapClick] = useState<GeoPoint | null>(null);

  // ─── Toggle tools ───
  const [enabledToggles, setEnabledToggles] = useState<Record<string, boolean>>({
    cluster: false,
    choropleth: false,
    dualmap: false,
    popup: true,
  });

  // ─── Filtered data ───
  const filteredData = useMemo(
    () => (filters.length > 0 ? applyFilters(data, filters) : data),
    [data, filters]
  );

  // ─── Display data ───
  const displayData = useMemo(() => {
    if (currentTimeFrame) {
      return currentTimeFrame.points.map((p, i) => ({
        id: `tf_${i}`,
        lat: p.lat,
        lng: p.lng,
        _weight: currentTimeFrame.weights?.[i] ?? 1,
      })) as MapDataRow[];
    }
    return filteredData;
  }, [filteredData, currentTimeFrame]);

  // ─── Clusters ───
  const clusters = useMemo(() => {
    if (!enabledToggles.cluster || displayData.length === 0) return null;
    const gridSize = mapView.zoom > 14 ? 0.002 : mapView.zoom > 11 ? 0.005 : 0.01;
    return clusterPoints(displayData, gridSize);
  }, [displayData, enabledToggles.cluster, mapView.zoom]);

  // ─── Auto-fit bounds ───
  useEffect(() => {
    if (data.length > 0) {
      const bounds = getBounds(data.map((d) => ({ lat: d.lat, lng: d.lng })));
      setFlyTo({ center: bounds.center, zoom: 11 });
      setMapView((prev) => ({ ...prev, center: bounds.center }));
    }
  }, [data]);

  // ─── Callbacks ───
  const handleMapClick = useCallback(
    (point: GeoPoint) => {
      if (isMapSelectMode) {
        setLastMapClick({ ...point });
      }
    },
    [isMapSelectMode]
  );

  const handleMapMove = useCallback((center: GeoPoint, zoom: number) => {
    setMapView({ center, zoom });
  }, []);

  const handleLocationSelect = useCallback((point: GeoPoint, zoom?: number) => {
    setFlyTo({ center: point, zoom: zoom ?? 15 });
  }, []);

  const handleSearchMarkerPlace = useCallback((point: GeoPoint, label: string) => {
    setSearchMarkers((prev) => [...prev.slice(-9), { point, label }]);
  }, []);

  const handleToggleChange = useCallback((id: string, enabled: boolean) => {
    setEnabledToggles((prev) => ({ ...prev, [id]: enabled }));
  }, []);

  // ─── Drag & Drop (whole workspace) ───
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    if (e.dataTransfer.types.includes('Files')) setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragOver(false);
  };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    dragCounter.current = 0;
    const file = e.dataTransfer.files?.[0];
    if (file && /\.(csv|tsv|xlsx|xls)$/i.test(file.name)) onFileSelected(file);
  };

  return (
    <div
      className="flex h-full w-full overflow-hidden rounded-lg border bg-background relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Full-screen drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-[2000] bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center p-8 rounded-2xl border-2 border-dashed border-primary bg-primary/5">
            <div className="text-4xl mb-3">📂</div>
            <div className="text-lg font-semibold text-primary">Drop your data file</div>
            <div className="text-sm text-muted-foreground mt-1">CSV, TSV, Excel (.xlsx, .xls)</div>
          </div>
        </div>
      )}

      {/* Tool Panel */}
      <ToolPanel
        data={data}
        filteredData={filteredData}
        allHeaders={allHeaders}
        numericHeaders={numericHeaders}
        categoricalHeaders={categoricalHeaders}
        fileName={fileName}
        onFileSelected={onFileSelected}
        onClearData={onClearData}
        isUploading={isUploading}
        filters={filters}
        onFiltersChange={setFilters}
        radiusCenter={radiusCenter}
        onRadiusCenterChange={setRadiusCenter}
        radiusAnalysis={radiusAnalysis}
        onRadiusAnalysisResult={setRadiusAnalysis}
        onTimeFrameChange={setCurrentTimeFrame}
        onAllTimeFrames={setAllTimeFrames}
        onRouteResult={setRouteResult}
        onRouteWaypoints={setRouteWaypoints}
        onLocationSelect={handleLocationSelect}
        onSearchMarkerPlace={handleSearchMarkerPlace}
        mapCenter={mapView.center}
        onVoronoiCentersChange={setVoronoiCenters}
        onVoronoiCellAssignments={setVoronoiAssignments}
        onVoronoiCellColors={setVoronoiColors}
        onHullsChange={setConvexHulls}
        onSpiderChange={setSpiderResult}
        onGridHexChange={setGridHexResult}
        onDBSCANChange={setDBSCANResult}
        onOutlierChange={setOutlierResult}
        onCannibalizationChange={setCannibalizationResult}
        onLocationScoreChange={setLocationScoreResult}
        onODMatrixChange={setODMatrixResult}
        onTSPChange={setTSPResult}
        onBivariateChange={setBivariateResult}
        onIsochroneChange={setIsochroneResult}
        onNearestFacilityChange={setNearestFacilityResult}
        onFlowMapChange={setFlowMapResult}
        onHeatmapChange={setHeatmapResult}
        onBufferZoneChange={setBufferZoneResult}
        onSpatialJoinChange={setSpatialJoinResult}
        onClearAnalysis={clearAnalysis}
        isMapSelectMode={isMapSelectMode}
        onMapSelectModeChange={setIsMapSelectMode}
        lastMapClick={lastMapClick}
        enabledToggles={enabledToggles}
        onToggleChange={handleToggleChange}
      />

      {/* Map Area */}
      <div className="flex-1 relative min-h-[500px]">
        <LeafletMap
          center={mapView.center}
          zoom={mapView.zoom}
          flyTo={flyTo}
          displayData={displayData}
          clusters={clusters}
          currentTimeFrame={currentTimeFrame}
          radiusCenter={radiusCenter}
          radiusAnalysis={radiusAnalysis}
          routeResult={routeResult}
          routeWaypoints={routeWaypoints}
          searchMarkers={searchMarkers}
          voronoiCenters={voronoiCenters}
          voronoiAssignments={voronoiAssignments}
          voronoiColors={voronoiColors}
          convexHulls={convexHulls}
          spiderResult={spiderResult}
          gridHexResult={gridHexResult}
          dbscanResult={dbscanResult}
          outlierResult={outlierResult}
          cannibalizationResult={cannibalizationResult}
          locationScoreResult={locationScoreResult}
          odMatrixResult={odMatrixResult}
          tspResult={tspResult}
          bivariateResult={bivariateResult}
          isochroneResult={isochroneResult}
          nearestFacilityResult={nearestFacilityResult}
          flowMapResult={flowMapResult}
          heatmapResult={heatmapResult}
          bufferZoneResult={bufferZoneResult}
          spatialJoinResult={spatialJoinResult}
          enabledToggles={enabledToggles}
          isMapSelectMode={isMapSelectMode}
          onMapClick={handleMapClick}
          onMapMove={handleMapMove}
        />

        {/* Empty state — guide overlay when no data */}
        {data.length === 0 && !isDragOver && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center pointer-events-none">
            <div className="text-center p-8 rounded-2xl bg-background/85 backdrop-blur-md shadow-xl border max-w-sm pointer-events-auto">
              <div className="text-5xl mb-4">📍</div>
              <h2 className="text-lg font-bold mb-2">Welcome to Map Analysis</h2>
              <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                Upload your data file to get started.
                Drop it anywhere on this screen, or click the upload button on the left.
              </p>
              <div className="flex flex-col gap-2">
                <label className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium cursor-pointer hover:bg-primary/90 transition-colors">
                  <Upload className="h-4 w-4" />
                  Choose File
                  <input
                    type="file"
                    accept=".csv,.tsv,.xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onFileSelected(file);
                      e.target.value = '';
                    }}
                  />
                </label>
                <button
                  onClick={() => {
                    const csv = SAMPLE_CSV_NYC;
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const file = new File([blob], 'NYC_Sample_Data.csv', { type: 'text/csv' });
                    onFileSelected(file);
                  }}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
                >
                  🗽 Try Sample Data (NYC)
                </button>
                <p className="text-[11px] text-muted-foreground">
                  Supports CSV, TSV, Excel (.xlsx)
                </p>
              </div>
              <div className="mt-5 pt-4 border-t">
                <p className="text-[11px] text-muted-foreground mb-2">Your file should include:</p>
                <div className="flex justify-center gap-4 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>Latitude column</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span>Longitude column</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Overlays */}
        <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-2">
          {displayData.length > 0 && (
            <Badge variant="secondary" className="text-xs bg-background/90 backdrop-blur shadow-sm">
              {displayData.length.toLocaleString()} points
            </Badge>
          )}
          {filters.length > 0 && (
            <Badge variant="outline" className="text-xs bg-background/90 backdrop-blur shadow-sm">
              {filters.length} filters active
            </Badge>
          )}
          {currentTimeFrame && (
            <Badge className="text-xs shadow-sm">▶ {currentTimeFrame.label}</Badge>
          )}
          {routeResult && (
            <Badge variant="secondary" className="text-xs bg-background/90 backdrop-blur shadow-sm">
              🛣 {routeResult.distanceKm.toFixed(1)}km · {Math.round(routeResult.durationMin)}min
            </Badge>
          )}
        </div>

        {isMapSelectMode && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000]">
            <Badge className="text-xs shadow-lg animate-pulse bg-primary">
              🎯 Click on map to select point
            </Badge>
          </div>
        )}

        <div className="absolute bottom-3 right-3 z-[1000]">
          <Badge variant="outline" className="text-[10px] font-mono bg-background/90 backdrop-blur shadow-sm">
            {mapView.center.lat.toFixed(4)}, {mapView.center.lng.toFixed(4)} · z{mapView.zoom}
          </Badge>
        </div>
      </div>
    </div>
  );
}