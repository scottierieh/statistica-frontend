// types/map-analysis.ts
// All shared types for the Map Analysis workspace

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface MapDataRow {
  id: string;
  lat: number;
  lng: number;
  [key: string]: any;
}

export interface FilterConfig {
  column: string;
  type: 'range' | 'category' | 'search';
  min?: number;
  max?: number;
  selectedCategories?: string[];
  searchTerm?: string;
}

export interface RadiusAnalysis {
  center: GeoPoint;
  radiusMeters: number;
  pointsInside: MapDataRow[];
  stats: Record<string, number>;
}

export interface TimeSeriesFrame {
  label: string;       // e.g. "2024-01", "08:00"
  points: GeoPoint[];
  weights?: number[];
}

export interface RouteResult {
  path: GeoPoint[];
  distanceKm: number;
  durationMin: number;
}

export interface VoronoiCell {
  centerId: string;
  polygon: GeoPoint[];
  pointCount: number;
}

export interface ClusterGroup {
  center: GeoPoint;
  count: number;
  markers: MapDataRow[];
}

export type ToolId =
  | 'filter'
  | 'radius'
  | 'timeseries'
  | 'route'
  | 'search'
  | 'cluster'
  | 'choropleth'
  | 'dualmap'
  | 'voronoi'
  | 'convexhull'
  | 'spider'
  | 'gridhex'
  | 'dbscan'
  | 'outlier'
  | 'cannibalization'
  | 'locationscore'
  | 'odmatrix'
  | 'tsp'
  | 'bivariate'
  | 'isochrone'
  | 'nearestfacility'
  | 'flowmap'
  | 'screenshot'
  | 'heatmap'
  | 'bufferzone'
  | 'spatialjoin'
  | 'datatable'
  | 'guide'
  | 'report'
  | 'upload'
  | 'popup';

export interface ToolState {
  id: ToolId;
  label: string;
  icon: string;       // lucide icon name
  enabled: boolean;
  description: string;
}

export interface MapViewState {
  center: GeoPoint;
  zoom: number;
  bounds?: {
    ne: GeoPoint;
    sw: GeoPoint;
  };
}

export interface ChoroplethRegion {
  name: string;
  code: string;
  value: number;
  geometry: any;       // GeoJSON geometry
}