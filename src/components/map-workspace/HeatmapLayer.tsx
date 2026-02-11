// components/map-workspace/HeatmapLayer.tsx
// React-Leaflet wrapper for leaflet.heat

'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

interface HeatmapLayerProps {
  points: [number, number, number][]; // [lat, lng, intensity]
  radius?: number;
  blur?: number;
  maxZoom?: number;
  gradient?: Record<number, string>;
}

export default function HeatmapLayer({
  points,
  radius = 25,
  blur = 15,
  maxZoom = 17,
  gradient,
}: HeatmapLayerProps) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;

    const heat = (L as any).heatLayer(points, {
      radius,
      blur,
      maxZoom,
      gradient: gradient || undefined,
    });

    heat.addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [map, points, radius, blur, maxZoom, gradient]);

  return null;
}
