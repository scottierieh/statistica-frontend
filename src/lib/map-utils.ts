// lib/map-utils.ts
// Core utility functions for map analysis - all pure functions, no dependencies on UI

import type {
  GeoPoint,
  MapDataRow,
  FilterConfig,
  RadiusAnalysis,
  ClusterGroup,
  TimeSeriesFrame,
} from '@/types/map-analysis';

// ─────────────────────────────────────────────
// 1. Haversine Distance (meters between two coordinates)
// ─────────────────────────────────────────────
export function haversineDistance(a: GeoPoint, b: GeoPoint): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// ─────────────────────────────────────────────
// 2. Radius Analysis (filter points within radius)
// ─────────────────────────────────────────────
export function analyzeRadius(
  center: GeoPoint,
  radiusMeters: number,
  data: MapDataRow[],
  numericColumns: string[] = []
): RadiusAnalysis {
  const pointsInside = data.filter(
    (row) => haversineDistance(center, { lat: row.lat, lng: row.lng }) <= radiusMeters
  );

  const stats: Record<string, number> = {
    totalPoints: pointsInside.length,
  };

  // Calculate sum/avg for numeric columns
  for (const col of numericColumns) {
    const values = pointsInside
      .map((r) => parseFloat(r[col]))
      .filter((v) => !isNaN(v));
    if (values.length > 0) {
      stats[`${col}_sum`] = values.reduce((a, b) => a + b, 0);
      stats[`${col}_avg`] = stats[`${col}_sum`] / values.length;
      stats[`${col}_min`] = Math.min(...values);
      stats[`${col}_max`] = Math.max(...values);
    }
  }

  return { center, radiusMeters: radiusMeters, pointsInside, stats };
}

// ─────────────────────────────────────────────
// 3. Data Filtering (apply filters)
// ─────────────────────────────────────────────
export function applyFilters(
  data: MapDataRow[],
  filters: FilterConfig[]
): MapDataRow[] {
  return data.filter((row) => {
    return filters.every((f) => {
      const value = row[f.column];
      switch (f.type) {
        case 'range': {
          const num = parseFloat(value);
          if (isNaN(num)) return false;
          if (f.min !== undefined && num < f.min) return false;
          if (f.max !== undefined && num > f.max) return false;
          return true;
        }
        case 'category': {
          if (!f.selectedCategories || f.selectedCategories.length === 0) return true;
          return f.selectedCategories.includes(String(value));
        }
        case 'search': {
          if (!f.searchTerm) return true;
          return String(value).toLowerCase().includes(f.searchTerm.toLowerCase());
        }
        default:
          return true;
      }
    });
  });
}

// ─────────────────────────────────────────────
// 4. Simple Grid-based Clustering
// ─────────────────────────────────────────────
export function clusterPoints(
  data: MapDataRow[],
  gridSizeDeg: number = 0.01 // roughly 1km at mid-latitudes
): ClusterGroup[] {
  const buckets = new Map<string, MapDataRow[]>();

  for (const row of data) {
    const gLat = Math.floor(row.lat / gridSizeDeg) * gridSizeDeg;
    const gLng = Math.floor(row.lng / gridSizeDeg) * gridSizeDeg;
    const key = `${gLat.toFixed(6)}_${gLng.toFixed(6)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(row);
  }

  return Array.from(buckets.values()).map((markers) => {
    const avgLat = markers.reduce((s, m) => s + m.lat, 0) / markers.length;
    const avgLng = markers.reduce((s, m) => s + m.lng, 0) / markers.length;
    return {
      center: { lat: avgLat, lng: avgLng },
      count: markers.length,
      markers,
    };
  });
}

// ─────────────────────────────────────────────
// 5. Time Series Grouping
// ─────────────────────────────────────────────
export function groupByTimeSeries(
  data: MapDataRow[],
  timeColumn: string,
  weightColumn?: string
): TimeSeriesFrame[] {
  const groups = new Map<string, { points: GeoPoint[]; weights: number[] }>();

  for (const row of data) {
    const label = String(row[timeColumn] ?? 'unknown');
    if (!groups.has(label)) groups.set(label, { points: [], weights: [] });
    const g = groups.get(label)!;
    g.points.push({ lat: row.lat, lng: row.lng });
    g.weights.push(weightColumn ? parseFloat(row[weightColumn]) || 1 : 1);
  }

  // Sort by label (works for ISO dates, "01", "02", etc.)
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, { points, weights }]) => ({ label, points, weights }));
}

// ─────────────────────────────────────────────
// 6. Voronoi (Simple nearest-center assignment)
//    Full polygon computation needs d3-delaunay on frontend
// ─────────────────────────────────────────────
export function assignNearestCenter(
  data: MapDataRow[],
  centers: GeoPoint[]
): Map<number, MapDataRow[]> {
  const groups = new Map<number, MapDataRow[]>();
  centers.forEach((_, i) => groups.set(i, []));

  for (const row of data) {
    let minDist = Infinity;
    let minIdx = 0;
    centers.forEach((c, i) => {
      const d = haversineDistance({ lat: row.lat, lng: row.lng }, c);
      if (d < minDist) {
        minDist = d;
        minIdx = i;
      }
    });
    groups.get(minIdx)!.push(row);
  }

  return groups;
}

// ─────────────────────────────────────────────
// 7. Column Analysis (auto-detect column types)
// ─────────────────────────────────────────────
export interface ColumnInfo {
  name: string;
  type: 'numeric' | 'categorical' | 'datetime' | 'geo';
  uniqueCount: number;
  min?: number;
  max?: number;
  categories?: string[];
}

export function analyzeColumns(data: MapDataRow[]): ColumnInfo[] {
  if (data.length === 0) return [];

  const columns = Object.keys(data[0]).filter((k) => k !== 'id');
  return columns.map((name) => {
    const values = data.map((r) => r[name]).filter((v) => v != null && v !== '');
    const numericValues = values.map(Number).filter((v) => !isNaN(v));
    const uniqueValues = [...new Set(values.map(String))];

    // Detect geo columns
    if (['lat', 'latitude', 'lng', 'longitude', 'lon'].includes(name.toLowerCase())) {
      return { name, type: 'geo' as const, uniqueCount: uniqueValues.length };
    }

    // Numeric if >70% parse as numbers
    if (numericValues.length > values.length * 0.7) {
      return {
        name,
        type: 'numeric' as const,
        uniqueCount: uniqueValues.length,
        min: Math.min(...numericValues),
        max: Math.max(...numericValues),
      };
    }

    // Try datetime detection
    const dateCount = values.filter((v) => !isNaN(Date.parse(String(v)))).length;
    if (dateCount > values.length * 0.7) {
      return { name, type: 'datetime' as const, uniqueCount: uniqueValues.length };
    }

    // Otherwise categorical
    return {
      name,
      type: 'categorical' as const,
      uniqueCount: uniqueValues.length,
      categories: uniqueValues.length <= 50 ? uniqueValues : uniqueValues.slice(0, 50),
    };
  });
}

// ─────────────────────────────────────────────
// 8. Bounds Calculation (auto-fit map)
// ─────────────────────────────────────────────
export function getBounds(points: GeoPoint[]): {
  center: GeoPoint;
  ne: GeoPoint;
  sw: GeoPoint;
} {
  if (points.length === 0) {
    return {
      center: { lat: 40.7128, lng: -74.006 }, // NYC default
      ne: { lat: 40.9, lng: -73.7 },
      sw: { lat: 40.5, lng: -74.3 },
    };
  }

  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);

  const ne = { lat: Math.max(...lats), lng: Math.max(...lngs) };
  const sw = { lat: Math.min(...lats), lng: Math.min(...lngs) };
  const center = {
    lat: (ne.lat + sw.lat) / 2,
    lng: (ne.lng + sw.lng) / 2,
  };

  return { center, ne, sw };
}

// ─────────────────────────────────────────────
// 9. CSV/Excel Parsing Helper
// ─────────────────────────────────────────────
export function parseCSVToMapData(csvText: string): MapDataRow[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));

  // Find lat/lng columns
  const latCol = headers.findIndex((h) =>
    ['lat', 'latitude', '위도'].includes(h.toLowerCase())
  );
  const lngCol = headers.findIndex((h) =>
    ['lng', 'lon', 'longitude', '경도'].includes(h.toLowerCase())
  );

  return lines.slice(1).map((line, idx) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    const row: MapDataRow = {
      id: `row_${idx}`,
      lat: latCol >= 0 ? parseFloat(values[latCol]) || 0 : 0,
      lng: lngCol >= 0 ? parseFloat(values[lngCol]) || 0 : 0,
    };
    headers.forEach((h, i) => {
      row[h] = values[i] ?? '';
    });
    return row;
  }).filter((r) => r.lat !== 0 && r.lng !== 0);
}

// ─────────────────────────────────────────────
// 10. Generate Circle Points (for radius ring)
// ─────────────────────────────────────────────
export function generateCirclePoints(
  center: GeoPoint,
  radiusMeters: number,
  segments: number = 64
): GeoPoint[] {
  const points: GeoPoint[] = [];
  const R = 6371000;

  for (let i = 0; i <= segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    const dLat = (radiusMeters / R) * Math.cos(angle);
    const dLng =
      (radiusMeters / (R * Math.cos((center.lat * Math.PI) / 180))) *
      Math.sin(angle);
    points.push({
      lat: center.lat + (dLat * 180) / Math.PI,
      lng: center.lng + (dLng * 180) / Math.PI,
    });
  }

  return points;
}

// ─────────────────────────────────────────────
// 11. Color Scale Generator (for choropleth/heatmap)
// ─────────────────────────────────────────────
export function getColorScale(
  value: number,
  min: number,
  max: number,
  palette: 'heat' | 'blue' | 'green' = 'heat'
): string {
  const ratio = max === min ? 0.5 : (value - min) / (max - min);
  const t = Math.max(0, Math.min(1, ratio));

  switch (palette) {
    case 'heat': {
      const r = Math.round(255 * Math.min(1, t * 2));
      const g = Math.round(255 * Math.min(1, (1 - t) * 2));
      return `rgb(${r}, ${g}, 0)`;
    }
    case 'blue': {
      const intensity = Math.round(50 + 205 * t);
      return `rgb(0, ${Math.round(100 - 50 * t)}, ${intensity})`;
    }
    case 'green': {
      const intensity = Math.round(50 + 205 * t);
      return `rgb(0, ${intensity}, ${Math.round(100 - 50 * t)})`;
    }
  }
}

// ─────────────────────────────────────────────
// 12. Export helpers
// ─────────────────────────────────────────────
export function dataToCSV(data: MapDataRow[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = String(row[h] ?? '');
      return val.includes(',') ? `"${val}"` : val;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

export function formatNumber(n: number): string {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n % 1 === 0 ? n.toString() : n.toFixed(2);
}