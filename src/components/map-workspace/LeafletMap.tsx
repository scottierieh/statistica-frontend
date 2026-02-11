// components/map-workspace/LeafletMap.tsx
// Leaflet map component (client-side only)

'use client';

import React, { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Circle,
  Polyline,
  Polygon,
  Rectangle,
  Popup,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import type {
  GeoPoint,
  MapDataRow,
  RadiusAnalysis,
  TimeSeriesFrame,
  RouteResult,
  ClusterGroup,
} from '@/types/map-analysis';
import { formatNumber } from '@/lib/map-utils';
import HeatmapLayer from './HeatmapLayer';

// ─────────────────────────────────────────
// Props
// ─────────────────────────────────────────
interface LeafletMapProps {
  center: GeoPoint;
  zoom: number;
  flyTo: { center: GeoPoint; zoom: number } | null;
  displayData: MapDataRow[];
  clusters: ClusterGroup[] | null;
  currentTimeFrame: TimeSeriesFrame | null;
  radiusCenter: GeoPoint | null;
  radiusAnalysis: RadiusAnalysis | null;
  routeResult: RouteResult | null;
  routeWaypoints: GeoPoint[];
  searchMarkers: { point: GeoPoint; label: string }[];
  voronoiCenters: any[];
  voronoiAssignments: Map<number, MapDataRow[]>;
  voronoiColors: any[];
  convexHulls: any[];
  spiderResult: any;
  gridHexResult: any;
  dbscanResult: any;
  outlierResult: any;
  cannibalizationResult: any;
  locationScoreResult: any;
  odMatrixResult: any;
  tspResult: any;
  bivariateResult: any;
  isochroneResult: any;
  nearestFacilityResult: any;
  flowMapResult: any;
  heatmapResult: any;
  bufferZoneResult: any;
  spatialJoinResult: any;
  enabledToggles: Record<string, boolean>;
  isMapSelectMode: boolean;
  onMapClick: (point: GeoPoint) => void;
  onMapMove: (center: GeoPoint, zoom: number) => void;
}

// ─────────────────────────────────────────
// Map event handler (inside MapContainer)
// ─────────────────────────────────────────
function MapEvents({
  onClick,
  onMoveEnd,
}: {
  onClick: (point: GeoPoint) => void;
  onMoveEnd: (center: GeoPoint, zoom: number) => void;
}) {
  useMapEvents({
    click(e) {
      onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
    moveend(e) {
      const map = e.target;
      const c = map.getCenter();
      onMoveEnd({ lat: c.lat, lng: c.lng }, map.getZoom());
    },
  });
  return null;
}

// ─────────────────────────────────────────
// Fly-to controller (inside MapContainer)
// ─────────────────────────────────────────
function FlyToController({
  flyTo,
}: {
  flyTo: { center: GeoPoint; zoom: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (flyTo) {
      map.flyTo([flyTo.center.lat, flyTo.center.lng], flyTo.zoom, {
        duration: 0.8,
      });
    }
  }, [flyTo, map]);

  return null;
}

// ─────────────────────────────────────────
// Popup content for data points
// ─────────────────────────────────────────
function PopupContent({ row }: { row: MapDataRow }) {
  const entries = Object.entries(row).filter(
    ([k]) => !['id', 'lat', 'lng', '_weight'].includes(k)
  );

  return (
    <div style={{ fontSize: '12px', maxWidth: '250px' }}>
      <table style={{ width: '100%' }}>
        <tbody>
          {entries.slice(0, 10).map(([key, value]) => (
            <tr key={key} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: '2px 6px 2px 0', fontWeight: 600, color: '#666', whiteSpace: 'nowrap' }}>
                {key}
              </td>
              <td style={{ padding: '2px 0', textAlign: 'right', fontFamily: 'monospace' }}>
                {typeof value === 'number' ? formatNumber(value) : String(value ?? '')}
              </td>
            </tr>
          ))}
          {entries.length > 10 && (
            <tr>
              <td colSpan={2} style={{ padding: '2px 0', textAlign: 'center', color: '#aaa' }}>
                +{entries.length - 10} more fields
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div style={{ fontSize: '10px', color: '#aaa', marginTop: '4px', fontFamily: 'monospace' }}>
        {row.lat.toFixed(5)}, {row.lng.toFixed(5)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// Main LeafletMap
// ─────────────────────────────────────────
export default function LeafletMap({
  center,
  zoom,
  flyTo,
  displayData,
  clusters,
  currentTimeFrame,
  radiusCenter,
  radiusAnalysis,
  routeResult,
  routeWaypoints,
  searchMarkers,
  voronoiCenters,
  voronoiAssignments,
  voronoiColors,
  convexHulls,
  spiderResult,
  gridHexResult,
  dbscanResult,
  outlierResult,
  cannibalizationResult,
  locationScoreResult,
  odMatrixResult,
  tspResult,
  bivariateResult,
  isochroneResult,
  nearestFacilityResult,
  flowMapResult,
  heatmapResult,
  bufferZoneResult,
  spatialJoinResult,
  enabledToggles,
  isMapSelectMode,
  onMapClick,
  onMapMove,
}: LeafletMapProps) {
  const [tileStyle, setTileStyle] = useState('positron');

  const TILE_STYLES: Record<string, { url: string; attribution: string; label: string; preview: string }> = {
    positron: {
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      label: 'Light',
      preview: '☀️',
    },
    dark: {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      label: 'Dark',
      preview: '🌙',
    },
    osm: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      label: 'Standard',
      preview: '🗺️',
    },
    toner: {
      url: 'https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://stadiamaps.com/">Stadia</a> &copy; <a href="https://stamen.com/">Stamen</a>',
      label: 'Mono',
      preview: '⬜',
    },
    voyager: {
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      label: 'Voyager',
      preview: '🎨',
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
      label: 'Satellite',
      preview: '🛰️',
    },
  };

  const currentTile = TILE_STYLES[tileStyle];

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer key={tileStyle} url={currentTile.url} attribution={currentTile.attribution} />

        {/* ─── Heatmap Layer ─── */}
        {heatmapResult && heatmapResult.visible && (
          <HeatmapLayer
            points={heatmapResult.points}
            radius={heatmapResult.radius}
            blur={heatmapResult.blur}
            maxZoom={heatmapResult.maxZoom}
            gradient={heatmapResult.gradient}
          />
        )}

        {/* Events */}
        <MapEvents onClick={onMapClick} onMoveEnd={onMapMove} />

      {/* Fly to */}
      <FlyToController flyTo={flyTo} />

      {/* ─── Data Points ─── */}
      {!clusters && !currentTimeFrame &&
        displayData.map((row) => (
          <CircleMarker
            key={row.id}
            center={[row.lat, row.lng]}
            radius={5}
            pathOptions={{
              fillColor: '#3b82f6',
              fillOpacity: 0.7,
              color: '#1d4ed8',
              weight: 1,
            }}
          >
            {enabledToggles.popup && (
              <Popup>
                <PopupContent row={row} />
              </Popup>
            )}
          </CircleMarker>
        ))}

      {/* ─── Cluster Layer ─── */}
      {clusters &&
        clusters.map((cluster, i) => (
          <CircleMarker
            key={`cluster_${i}`}
            center={[cluster.center.lat, cluster.center.lng]}
            radius={Math.min(8 + Math.sqrt(cluster.count) * 3, 40)}
            pathOptions={{
              fillColor:
                cluster.count > 10
                  ? '#ef4444'
                  : cluster.count > 5
                    ? '#f97316'
                    : '#3b82f6',
              fillOpacity: 0.7,
              color: '#fff',
              weight: 2,
            }}
          >
            <Popup>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', fontSize: '18px' }}>{cluster.count}</div>
                <div style={{ fontSize: '11px', color: '#888' }}>points in cluster</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

      {/* ─── Time Series Heatmap ─── */}
      {currentTimeFrame &&
        currentTimeFrame.points.map((p, i) => {
          const maxW = currentTimeFrame.weights
            ? Math.max(...currentTimeFrame.weights, 1)
            : 1;
          const w = currentTimeFrame.weights?.[i] ?? 1;
          const opacity = 0.2 + (w / maxW) * 0.5;
          const radius = 8 + (w / maxW) * 20;
          return (
            <CircleMarker
              key={`heat_${i}`}
              center={[p.lat, p.lng]}
              radius={radius}
              pathOptions={{
                fillColor: '#ef4444',
                fillOpacity: opacity,
                stroke: false,
              }}
            />
          );
        })}

      {/* ─── Radius Circle ─── */}
      {radiusCenter && radiusAnalysis && (
        <>
          <Circle
            center={[radiusCenter.lat, radiusCenter.lng]}
            radius={radiusAnalysis.radiusMeters}
            pathOptions={{
              fillColor: '#3b82f6',
              fillOpacity: 0.1,
              color: '#3b82f6',
              weight: 2,
              dashArray: '6 4',
            }}
          />
          <CircleMarker
            center={[radiusCenter.lat, radiusCenter.lng]}
            radius={6}
            pathOptions={{
              fillColor: '#ef4444',
              fillOpacity: 1,
              color: '#fff',
              weight: 2,
            }}
          >
            <Popup>
              <div style={{ fontSize: '12px' }}>
                <div style={{ fontWeight: 'bold' }}>Radius Center</div>
                <div>
                  {radiusAnalysis.stats.totalPoints} points within{' '}
                  {radiusAnalysis.radiusMeters}m
                </div>
              </div>
            </Popup>
          </CircleMarker>
        </>
      )}

      {/* ─── Route Path (OSRM) ─── */}
      {routeResult && routeResult.path.length > 0 && (
        <Polyline
          positions={routeResult.path.map((p) => [p.lat, p.lng] as [number, number])}
          pathOptions={{
            color: '#6366f1',
            weight: 4,
            opacity: 0.8,
          }}
        />
      )}

      {/* ─── Route Straight Line (before OSRM) ─── */}
      {routeWaypoints.length >= 2 && !routeResult && (
        <Polyline
          positions={routeWaypoints.map((p) => [p.lat, p.lng] as [number, number])}
          pathOptions={{
            color: '#9ca3af',
            weight: 2,
            dashArray: '8 6',
            opacity: 0.6,
          }}
        />
      )}

      {/* ─── Route Waypoints ─── */}
      {routeWaypoints.map((wp, i) => (
        <CircleMarker
          key={`wp_${i}`}
          center={[wp.lat, wp.lng]}
          radius={8}
          pathOptions={{
            fillColor:
              i === 0
                ? '#22c55e'
                : i === routeWaypoints.length - 1
                  ? '#ef4444'
                  : '#3b82f6',
            fillOpacity: 1,
            color: '#fff',
            weight: 2,
          }}
        >
          <Popup>
            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
              {i === 0 ? 'Start' : i === routeWaypoints.length - 1 ? 'End' : `Stop ${i}`}
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {/* ─── Search Markers ─── */}
      {searchMarkers.map((sm, i) => (
        <CircleMarker
          key={`search_${i}`}
          center={[sm.point.lat, sm.point.lng]}
          radius={8}
          pathOptions={{
            fillColor: '#f97316',
            fillOpacity: 0.9,
            color: '#fff',
            weight: 2,
          }}
        >
          <Popup>
            <div style={{ fontSize: '12px', fontWeight: 500 }}>{sm.label}</div>
          </Popup>
        </CircleMarker>
      ))}

      {/* ─── Voronoi Centers ─── */}
      {voronoiCenters
        .filter((c) => c.point)
        .map((vc) => {
          const color = voronoiColors[vc.colorIdx] ?? { border: '#3b82f6' };
          return (
            <CircleMarker
              key={`vor_c_${vc.id}`}
              center={[vc.point.lat, vc.point.lng]}
              radius={10}
              pathOptions={{
                fillColor: color.border,
                fillOpacity: 1,
                color: '#fff',
                weight: 3,
              }}
            >
              <Popup>
                <div style={{ fontSize: '12px' }}>
                  <div style={{ fontWeight: 'bold' }}>{vc.label}</div>
                  <div style={{ color: '#888' }}>Voronoi Center</div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

      {/* ─── Voronoi Assigned Points ─── */}
      {voronoiAssignments.size > 0 &&
        Array.from(voronoiAssignments.entries()).map(([idx, rows]) => {
          const vc = voronoiCenters.filter((c) => c.point)[idx];
          if (!vc) return null;
          const color = voronoiColors[vc.colorIdx] ?? { border: '#3b82f6' };
          return rows.map((row) => (
            <CircleMarker
              key={`vor_pt_${row.id}`}
              center={[row.lat, row.lng]}
              radius={4}
              pathOptions={{
                fillColor: color.border,
                fillOpacity: 0.5,
                color: color.border,
                weight: 1,
              }}
            />
          ));
        })}

      {/* ─── Convex Hull Polygons ─── */}
      {convexHulls &&
        convexHulls
          .filter((h: any) => h.visible && h.hull.length >= 3)
          .map((hull: any) => {
            const colors = [
              { fill: 'rgba(59,130,246,0.12)', stroke: '#3b82f6' },
              { fill: 'rgba(239,68,68,0.12)', stroke: '#ef4444' },
              { fill: 'rgba(34,197,94,0.12)', stroke: '#22c55e' },
              { fill: 'rgba(168,85,247,0.12)', stroke: '#a855f7' },
              { fill: 'rgba(249,115,22,0.12)', stroke: '#f97316' },
              { fill: 'rgba(236,72,153,0.12)', stroke: '#ec4899' },
              { fill: 'rgba(20,184,166,0.12)', stroke: '#14b8a6' },
              { fill: 'rgba(234,179,8,0.12)', stroke: '#eab308' },
            ];
            const c = colors[hull.colorIdx % colors.length];
            return (
              <Polygon
                key={`hull_${hull.id}`}
                positions={hull.hull.map((p: any) => [p.lat, p.lng] as [number, number])}
                pathOptions={{
                  fillColor: c.stroke,
                  fillOpacity: 0.12,
                  color: c.stroke,
                  weight: 2.5,
                  dashArray: '6 4',
                }}
              >
                <Popup>
                  <div style={{ fontSize: '12px' }}>
                    <div style={{ fontWeight: 'bold' }}>{hull.label}</div>
                    <div>{hull.pointCount} points</div>
                    <div>{hull.areaKm2 < 1 ? `${(hull.areaKm2 * 1e6).toFixed(0)} m²` : `${hull.areaKm2.toFixed(2)} km²`}</div>
                  </div>
                </Popup>
              </Polygon>
            );
          })}

      {/* ─── Spatial Join Areas ─── */}
      {spatialJoinResult && spatialJoinResult.visible && (
        <>
          {spatialJoinResult.areas.map((area: any) => (
            <React.Fragment key={`sj_${area.id}`}>
              <Polygon
                positions={area.polygon}
                pathOptions={{
                  fillColor: area.color,
                  fillOpacity: area.pointCount > 0 ? 0.15 + Math.min(area.pointCount / 20, 0.3) : 0.05,
                  color: area.color,
                  weight: 1.5,
                  opacity: 0.6,
                }}
              >
                <Popup>
                  <div style={{ fontSize: '11px' }}>
                    <div style={{ fontWeight: 'bold' }}>{area.label}</div>
                    <div>{area.pointCount} points inside</div>
                    {Object.entries(area.aggregations).map(([k, v]: [string, any]) => (
                      <div key={k}>{k}: {typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 1 }) : v}</div>
                    ))}
                  </div>
                </Popup>
              </Polygon>
              {area.pointCount > 0 && (
                <CircleMarker
                  center={[area.center.lat, area.center.lng]}
                  radius={Math.max(6, Math.min(14, 6 + area.pointCount))}
                  pathOptions={{ fillColor: area.color, fillOpacity: 0.8, color: '#fff', weight: 2 }}
                >
                  <Popup>
                    <div style={{ fontSize: '11px', fontWeight: 'bold' }}>
                      {area.label}: {area.pointCount} pts
                    </div>
                  </Popup>
                </CircleMarker>
              )}
            </React.Fragment>
          ))}
        </>
      )}

      {/* ─── Buffer Zones ─── */}
      {bufferZoneResult && bufferZoneResult.visible && (
        <>
          {bufferZoneResult.buffers.map((b: any, i: number) => (
            <Polygon
              key={`buf_${i}`}
              positions={b.polygon}
              pathOptions={{
                fillColor: b.color,
                fillOpacity: 0.12,
                color: b.color,
                weight: 1.5,
                opacity: 0.5,
              }}
            >
              <Popup>
                <div style={{ fontSize: '11px' }}>
                  <div style={{ fontWeight: 'bold' }}>{b.row.name || b.row.id}</div>
                  <div>Radius: {b.radiusM >= 1000 ? (b.radiusM / 1000).toFixed(1) + ' km' : b.radiusM + ' m'}</div>
                  <div>Overlaps: {b.overlappingWith}</div>
                </div>
              </Popup>
            </Polygon>
          ))}
          {bufferZoneResult.buffers.map((b: any, i: number) => (
            <CircleMarker
              key={`bufc_${i}`}
              center={[b.center.lat, b.center.lng]}
              radius={4}
              pathOptions={{ fillColor: b.color, fillOpacity: 0.9, color: '#fff', weight: 1.5 }}
            />
          ))}
        </>
      )}

      {/* ─── Isochrone Bands ─── */}
      {isochroneResult && isochroneResult.visible && (
        <>
          {/* Bands (largest first for proper layering) */}
          {isochroneResult.bands.map((band: any) => (
            band.polygon.length >= 3 && (
              <Polygon
                key={`iso_${band.minutes}`}
                positions={band.polygon}
                pathOptions={{
                  fillColor: band.color,
                  fillOpacity: 0.15,
                  color: band.color,
                  weight: 2,
                  opacity: 0.6,
                }}
              >
                <Popup>
                  <div style={{ fontSize: '12px' }}>
                    <div style={{ fontWeight: 'bold' }}>{band.minutes} min driving</div>
                    <div>{band.reachablePoints.length} points reachable</div>
                  </div>
                </Popup>
              </Polygon>
            )
          ))}
          {/* Center marker */}
          <CircleMarker
            center={[isochroneResult.center.lat, isochroneResult.center.lng]}
            radius={8}
            pathOptions={{ fillColor: '#000', fillOpacity: 0.9, color: '#fff', weight: 3 }}
          >
            <Popup>
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Isochrone Center</div>
            </Popup>
          </CircleMarker>
        </>
      )}

      {/* ─── Nearest Facility Lines ─── */}
      {nearestFacilityResult && nearestFacilityResult.visible && (
        <>
          {nearestFacilityResult.matches.map((m: any, i: number) => (
            <React.Fragment key={`nf_${i}`}>
              <Polyline
                positions={[
                  [m.source.lat, m.source.lng],
                  [m.facility.lat, m.facility.lng],
                ]}
                pathOptions={{ color: '#6366f1', weight: 1.5, opacity: 0.4, dashArray: '4 4' }}
              />
              <CircleMarker
                center={[m.source.lat, m.source.lng]}
                radius={5}
                pathOptions={{ fillColor: '#3b82f6', fillOpacity: 0.8, color: '#fff', weight: 1.5 }}
              >
                <Popup>
                  <div style={{ fontSize: '11px' }}>
                    <div style={{ fontWeight: 'bold' }}>🔵 {m.source.name || m.source.id}</div>
                    <div>→ {m.facility.name || m.facility.id}</div>
                    <div>{m.distanceM >= 1000 ? (m.distanceM / 1000).toFixed(2) + ' km' : Math.round(m.distanceM) + ' m'}</div>
                  </div>
                </Popup>
              </CircleMarker>
              <CircleMarker
                center={[m.facility.lat, m.facility.lng]}
                radius={6}
                pathOptions={{ fillColor: '#ef4444', fillOpacity: 0.8, color: '#fff', weight: 1.5 }}
              >
                <Popup>
                  <div style={{ fontSize: '11px' }}>
                    <div style={{ fontWeight: 'bold' }}>🔴 {m.facility.name || m.facility.id}</div>
                  </div>
                </Popup>
              </CircleMarker>
            </React.Fragment>
          ))}
        </>
      )}

      {/* ─── Flow Map ─── */}
      {flowMapResult && flowMapResult.visible && (
        <>
          {flowMapResult.flows.map((f: any, i: number) => {
            const thickness = Math.max(1.5, (f.value / flowMapResult.maxValue) * 6);
            const opacity = 0.3 + (f.value / flowMapResult.maxValue) * 0.5;
            return (
              <Polyline
                key={`flow_${i}`}
                positions={f.curvePoints}
                pathOptions={{
                  color: `hsl(${210 + (1 - f.value / flowMapResult.maxValue) * 120}, 70%, 50%)`,
                  weight: thickness,
                  opacity,
                }}
              >
                <Popup>
                  <div style={{ fontSize: '11px' }}>
                    <div style={{ fontWeight: 'bold' }}>{f.from.name || f.from.id} → {f.to.name || f.to.id}</div>
                    <div>Value: {f.value.toLocaleString()}</div>
                    <div>{f.distanceM >= 1000 ? (f.distanceM / 1000).toFixed(1) + ' km' : Math.round(f.distanceM) + ' m'}</div>
                  </div>
                </Popup>
              </Polyline>
            );
          })}
          {/* Origin/dest markers */}
          {(() => {
            const origins = new Set<string>();
            const dests = new Set<string>();
            return flowMapResult.flows.map((f: any, i: number) => {
              const els: React.ReactNode[] = [];
              if (!origins.has(f.from.id)) {
                origins.add(f.from.id);
                els.push(
                  <CircleMarker key={`fo_${i}`} center={[f.from.lat, f.from.lng]} radius={6}
                    pathOptions={{ fillColor: '#22c55e', fillOpacity: 0.9, color: '#fff', weight: 2 }}>
                    <Popup><div style={{ fontSize: '11px', fontWeight: 'bold' }}>🟢 {f.from.name || f.from.id}</div></Popup>
                  </CircleMarker>
                );
              }
              if (!dests.has(f.to.id)) {
                dests.add(f.to.id);
                els.push(
                  <CircleMarker key={`fd_${i}`} center={[f.to.lat, f.to.lng]} radius={5}
                    pathOptions={{ fillColor: '#ef4444', fillOpacity: 0.9, color: '#fff', weight: 2 }}>
                    <Popup><div style={{ fontSize: '11px', fontWeight: 'bold' }}>🔴 {f.to.name || f.to.id}</div></Popup>
                  </CircleMarker>
                );
              }
              return els;
            });
          })()}
        </>
      )}

      {/* ─── TSP Route ─── */}
      {tspResult && tspResult.visible && (
        <>
          {/* Actual road route polyline */}
          {tspResult.routeGeometry && tspResult.routeGeometry.length > 0 && (
            <Polyline
              positions={tspResult.routeGeometry}
              pathOptions={{ color: '#6366f1', weight: 4, opacity: 0.85 }}
            />
          )}
          {/* Fallback: straight-line segments if no geometry */}
          {!tspResult.routeGeometry && tspResult.segments.length > 0 && (
            <Polyline
              positions={[
                ...tspResult.segments.map((s: any) => [s.from.lat, s.from.lng] as [number, number]),
                ...(tspResult.segments.length > 0
                  ? [[tspResult.segments[tspResult.segments.length - 1].to.lat, tspResult.segments[tspResult.segments.length - 1].to.lng] as [number, number]]
                  : []),
              ]}
              pathOptions={{ color: '#6366f1', weight: 3, opacity: 0.8, dashArray: '8 4' }}
            />
          )}
          {/* Stop markers */}
          {tspResult.tour.map((row: any, i: number) => (
            <CircleMarker
              key={`tsp_${i}`}
              center={[row.lat, row.lng]}
              radius={i === 0 ? 9 : 6}
              pathOptions={{
                fillColor: i === 0 ? '#22c55e' : i === tspResult.tour.length - 1 && !tspResult.returnToStart ? '#ef4444' : '#6366f1',
                fillOpacity: 0.9,
                color: '#fff',
                weight: 2,
              }}
            >
              <Popup>
                <div style={{ fontSize: '12px' }}>
                  <div style={{ fontWeight: 'bold' }}>Stop #{i + 1}{i === 0 ? ' (Start)' : ''}</div>
                  {row.name && <div>{row.name}</div>}
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </>
      )}

      {/* ─── Bivariate Map ─── */}
      {bivariateResult && bivariateResult.visible && (
        <>
          {bivariateResult.points.map((p: any, i: number) => (
            <CircleMarker
              key={`biv_${i}`}
              center={[p.row.lat, p.row.lng]}
              radius={5}
              pathOptions={{
                fillColor: p.color,
                fillOpacity: 0.85,
                color: '#fff',
                weight: 1,
              }}
            >
              <Popup>
                <div style={{ fontSize: '12px' }}>
                  {p.row.name && <div style={{ fontWeight: 'bold' }}>{p.row.name}</div>}
                  <div>{bivariateResult.xColumn}: {p.xValue.toLocaleString()}</div>
                  <div>{bivariateResult.yColumn}: {p.yValue.toLocaleString()}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </>
      )}

      {/* ─── OD Matrix Lines ─── */}
      {odMatrixResult && odMatrixResult.visible && odMatrixResult.lines && (
        <>
          {odMatrixResult.lines.map((line: any, i: number) => {
            const t = line.colorValue;
            const r = Math.round(59 + (239 - 59) * t);
            const g = Math.round(130 + (68 - 130) * t);
            const b = Math.round(246 + (68 - 246) * t);
            return (
              <Polyline
                key={`od_${i}`}
                positions={[[line.from.lat, line.from.lng], [line.to.lat, line.to.lng]]}
                pathOptions={{ color: `rgb(${r},${g},${b})`, weight: 1, opacity: 0.3 }}
              />
            );
          })}
          {/* Origin markers */}
          {odMatrixResult.origins.map((o: any, i: number) => (
            <CircleMarker
              key={`od_o_${i}`}
              center={[o.lat, o.lng]}
              radius={6}
              pathOptions={{ fillColor: '#3b82f6', fillOpacity: 0.9, color: '#fff', weight: 2 }}
            />
          ))}
          {/* Destination markers (if different from origins) */}
          {odMatrixResult.destinations !== odMatrixResult.origins &&
            odMatrixResult.destinations.map((d: any, i: number) => (
              <CircleMarker
                key={`od_d_${i}`}
                center={[d.lat, d.lng]}
                radius={6}
                pathOptions={{ fillColor: '#ef4444', fillOpacity: 0.9, color: '#fff', weight: 2 }}
              />
            ))}
        </>
      )}

      {/* ─── Location Score Points ─── */}
      {locationScoreResult && locationScoreResult.visible && (
        <>
          {locationScoreResult.points.map((p: any) => {
            const score = p.totalScore;
            const color = score >= 80 ? '#22c55e' : score >= 60 ? '#84cc16' : score >= 40 ? '#eab308' : score >= 20 ? '#f97316' : '#ef4444';
            const size = 4 + (score / 100) * 6; // 4~10
            return (
              <CircleMarker
                key={`score_${p.row.id}`}
                center={[p.row.lat, p.row.lng]}
                radius={size}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: 0.85,
                  color: '#fff',
                  weight: 1.5,
                }}
              >
                <Popup>
                  <div style={{ fontSize: '12px' }}>
                    <div style={{ fontWeight: 'bold' }}>
                      #{p.rank} — Score: {score.toFixed(1)}
                    </div>
                    {p.row.name && <div>{p.row.name}</div>}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </>
      )}

      {/* ─── Cannibalization Circles & Overlap ─── */}
      {cannibalizationResult && cannibalizationResult.visible && (
        <>
          {/* Coverage circles */}
          {cannibalizationResult.circles.map((c: any, i: number) => (
            <Circle
              key={`cannibal_circle_${i}`}
              center={[c.center.lat, c.center.lng]}
              radius={c.radiusM}
              pathOptions={{
                fillColor: c.color,
                fillOpacity: 0.08,
                color: c.color,
                weight: 1.5,
                dashArray: '4 4',
              }}
            />
          ))}
          {/* Store center markers */}
          {cannibalizationResult.circles.map((c: any, i: number) => (
            <CircleMarker
              key={`cannibal_store_${i}`}
              center={[c.center.lat, c.center.lng]}
              radius={6}
              pathOptions={{
                fillColor: c.color,
                fillOpacity: 0.9,
                color: '#fff',
                weight: 2,
              }}
            />
          ))}
          {/* Overlap connection lines */}
          {cannibalizationResult.pairs.map((pair: any, i: number) => {
            const sevColors: Record<string, string> = {
              low: '#22c55e', medium: '#eab308', high: '#f97316', critical: '#ef4444'
            };
            const color = sevColors[pair.severity] || '#ef4444';
            const midLat = (pair.storeA.lat + pair.storeB.lat) / 2;
            const midLng = (pair.storeA.lng + pair.storeB.lng) / 2;
            return (
              <React.Fragment key={`cannibal_overlap_${i}`}>
                <Polyline
                  positions={[
                    [pair.storeA.lat, pair.storeA.lng],
                    [pair.storeB.lat, pair.storeB.lng],
                  ]}
                  pathOptions={{
                    color,
                    weight: Math.max(2, pair.overlapPercent / 15),
                    opacity: 0.7,
                    dashArray: '6 3',
                  }}
                >
                  <Popup>
                    <div style={{ fontSize: '12px' }}>
                      <div style={{ fontWeight: 'bold', color }}>{pair.severity.toUpperCase()} overlap</div>
                      <div>{pair.overlapPercent.toFixed(1)}% overlap</div>
                      <div>Distance: {pair.distance >= 1000 ? `${(pair.distance/1000).toFixed(1)}km` : `${Math.round(pair.distance)}m`}</div>
                      <div>{pair.sharedPoints.length} shared points</div>
                    </div>
                  </Popup>
                </Polyline>
              </React.Fragment>
            );
          })}
        </>
      )}

      {/* ─── Outlier Detection ─── */}
      {outlierResult && outlierResult.visible && (
        <>
          {outlierResult.points
            .filter((p: any) => (outlierResult.showOutliersOnly ? p.isOutlier : true))
            .map((p: any, i: number) => (
              <CircleMarker
                key={`outlier_${i}`}
                center={[p.row.lat, p.row.lng]}
                radius={p.isOutlier ? 7 : 4}
                pathOptions={{
                  fillColor: p.isOutlier ? '#ef4444' : '#3b82f6',
                  fillOpacity: p.isOutlier ? 0.9 : 0.4,
                  color: p.isOutlier ? '#dc2626' : '#93c5fd',
                  weight: p.isOutlier ? 2 : 0.5,
                }}
              >
                {p.isOutlier && (
                  <Popup>
                    <div style={{ fontSize: '12px' }}>
                      <div style={{ fontWeight: 'bold', color: '#ef4444' }}>⚠ Outlier (#{p.rank})</div>
                      <div>Score: {typeof p.score === 'number' ? p.score.toFixed(2) : p.score}</div>
                      {p.row.name && <div>{p.row.name}</div>}
                    </div>
                  </Popup>
                )}
              </CircleMarker>
            ))}
        </>
      )}

      {/* ─── DBSCAN Clusters ─── */}
      {dbscanResult && (
        <>
          {/* Cluster points */}
          {dbscanResult.clusters
            .filter((c: any) => c.visible)
            .map((cluster: any) =>
              cluster.points.map((row: any, i: number) => (
                <CircleMarker
                  key={`dbscan_${cluster.id}_${i}`}
                  center={[row.lat, row.lng]}
                  radius={5}
                  pathOptions={{
                    fillColor: cluster.color,
                    fillOpacity: 0.8,
                    color: '#fff',
                    weight: 1,
                  }}
                />
              ))
            )}
          {/* Cluster centers */}
          {dbscanResult.clusters
            .filter((c: any) => c.visible)
            .map((cluster: any, i: number) => (
              <CircleMarker
                key={`dbscan_center_${cluster.id}`}
                center={[cluster.center.lat, cluster.center.lng]}
                radius={10}
                pathOptions={{
                  fillColor: cluster.color,
                  fillOpacity: 1,
                  color: '#fff',
                  weight: 3,
                }}
              >
                <Popup>
                  <div style={{ fontSize: '12px' }}>
                    <div style={{ fontWeight: 'bold' }}>Cluster {i + 1}</div>
                    <div>{cluster.count} points</div>
                    <div>Radius: {cluster.radius >= 1000 ? `${(cluster.radius/1000).toFixed(1)}km` : `${Math.round(cluster.radius)}m`}</div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          {/* Noise points */}
          {dbscanResult.showNoise &&
            dbscanResult.noise.map((row: any, i: number) => (
              <CircleMarker
                key={`dbscan_noise_${i}`}
                center={[row.lat, row.lng]}
                radius={3}
                pathOptions={{
                  fillColor: dbscanResult.noiseColor,
                  fillOpacity: 0.4,
                  color: dbscanResult.noiseColor,
                  weight: 0.5,
                }}
              />
            ))}
        </>
      )}

      {/* ─── Grid / Hex Bin Cells ─── */}
      {gridHexResult && gridHexResult.visible && gridHexResult.cells.length > 0 && (
        <>
          {gridHexResult.cells.map((cell: any) => {
            const scheme: Record<string, string[]> = {
              heat: ['#ffffcc','#ffeda0','#fed976','#feb24c','#fd8d3c','#fc4e2a','#e31a1c','#b10026'],
              blues: ['#f7fbff','#deebf7','#c6dbef','#9ecae1','#6baed6','#4292c6','#2171b5','#084594'],
              greens: ['#f7fcf5','#e5f5e0','#c7e9c0','#a1d99b','#74c476','#41ab5d','#238b45','#005a32'],
              purples: ['#fcfbfd','#efedf5','#dadaeb','#bcbddc','#9e9ac8','#807dba','#6a51a3','#4a1486'],
              viridis: ['#440154','#46327e','#365c8d','#277f8e','#1fa187','#4ac16d','#9fda3a','#fde725'],
              plasma: ['#0d0887','#5b02a3','#9a179b','#cb4678','#eb7852','#fbb32f','#eff821'],
            };
            const stops = scheme[gridHexResult.colorScheme] ?? scheme.heat;
            const idx = Math.min(Math.floor(cell.normalizedValue * (stops.length - 1)), stops.length - 1);
            const color = stops[Math.max(0, idx)];

            // Grid mode: Rectangle
            if (gridHexResult.mode === 'grid' && cell.bounds) {
              return (
                <Rectangle
                  key={`grid_${cell.id}`}
                  bounds={[
                    [cell.bounds.minLat, cell.bounds.minLng],
                    [cell.bounds.maxLat, cell.bounds.maxLng],
                  ]}
                  pathOptions={{
                    fillColor: color,
                    fillOpacity: 0.65,
                    color: '#fff',
                    weight: 0.5,
                  }}
                >
                  <Popup>
                    <div style={{ fontSize: '12px' }}>
                      <div style={{ fontWeight: 'bold' }}>{cell.count} points</div>
                      {gridHexResult.aggregation !== 'count' && (
                        <div>{gridHexResult.aggregation}: {cell.value.toLocaleString()}</div>
                      )}
                    </div>
                  </Popup>
                </Rectangle>
              );
            }

            // Hex mode: Polygon
            if (cell.vertices) {
              return (
                <Polygon
                  key={`hex_${cell.id}`}
                  positions={cell.vertices.map((v: any) => [v.lat, v.lng] as [number, number])}
                  pathOptions={{
                    fillColor: color,
                    fillOpacity: 0.65,
                    color: '#fff',
                    weight: 0.5,
                  }}
                >
                  <Popup>
                    <div style={{ fontSize: '12px' }}>
                      <div style={{ fontWeight: 'bold' }}>{cell.count} points</div>
                      {gridHexResult.aggregation !== 'count' && (
                        <div>{gridHexResult.aggregation}: {cell.value.toLocaleString()}</div>
                      )}
                    </div>
                  </Popup>
                </Polygon>
              );
            }
            return null;
          })}
        </>
      )}

      {/* ─── Spider Map Lines ─── */}
      {spiderResult && spiderResult.visible && spiderResult.lines.length > 0 && (
        <>
          {/* Center marker */}
          <CircleMarker
            center={[spiderResult.center.lat, spiderResult.center.lng]}
            radius={8}
            pathOptions={{
              fillColor: '#000',
              fillOpacity: 0.9,
              color: '#fff',
              weight: 3,
            }}
          >
            <Popup>
              <div style={{ fontSize: '12px' }}>
                <div style={{ fontWeight: 'bold' }}>Spider Center</div>
                <div>{spiderResult.lines.length} connections</div>
              </div>
            </Popup>
          </CircleMarker>
          {/* Connection lines */}
          {spiderResult.lines.map((line: any, i: number) => {
            const presets = [
              { from: [59,130,246], to: [239,68,68] },
              { from: [34,197,94], to: [239,68,68] },
              { from: [59,130,246], to: [234,179,8] },
              { from: [168,85,247], to: [249,115,22] },
            ];
            const g = presets[0]; // default gradient
            const t = line.colorValue;
            const r = Math.round(g.from[0] + (g.to[0] - g.from[0]) * t);
            const gv = Math.round(g.from[1] + (g.to[1] - g.from[1]) * t);
            const b = Math.round(g.from[2] + (g.to[2] - g.from[2]) * t);
            const color = `rgb(${r},${gv},${b})`;
            return (
              <Polyline
                key={`spider_${i}`}
                positions={[
                  [line.from.lat, line.from.lng],
                  [line.to.lat, line.to.lng],
                ]}
                pathOptions={{
                  color,
                  weight: 1.5,
                  opacity: 0.6,
                }}
              />
            );
          })}
        </>
      )}

    </MapContainer>

      {/* ─── Tile Style Switcher ─── */}
      <TileStyleSwitcher
        styles={TILE_STYLES}
        active={tileStyle}
        onChange={setTileStyle}
      />
    </div>
  );
}

// ─────────────────────────────────────────
// Tile Style Switcher UI (top-right overlay)
// ─────────────────────────────────────────
function TileStyleSwitcher({
  styles,
  active,
  onChange,
}: {
  styles: Record<string, { url: string; label: string; preview: string }>;
  active: string;
  onChange: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div
      style={{
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 1000,
      }}
    >
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          border: '2px solid rgba(0,0,0,0.15)',
          background: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
        }}
        title="Map Style"
      >
        🗺️
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          style={{
            marginTop: 4,
            background: 'white',
            borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.1)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            overflow: 'hidden',
            minWidth: 140,
          }}
        >
          {Object.entries(styles).map(([id, style]) => (
            <button
              key={id}
              onClick={() => {
                onChange(id);
                setIsOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                background: active === id ? 'rgba(59,130,246,0.1)' : 'transparent',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: active === id ? 600 : 400,
                color: active === id ? '#2563eb' : '#333',
                borderLeft: active === id ? '3px solid #3b82f6' : '3px solid transparent',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                if (active !== id) e.currentTarget.style.background = 'rgba(0,0,0,0.04)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = active === id ? 'rgba(59,130,246,0.1)' : 'transparent';
              }}
            >
              <span style={{ fontSize: 16 }}>{style.preview}</span>
              <span>{style.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}