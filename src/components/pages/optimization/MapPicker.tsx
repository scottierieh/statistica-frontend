"use client";

import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface City {
  name: string;
  lat: number;
  lng: number;
  state?: string;
}

interface MapPickerProps {
  cities: City[];
  onMapClick: (lat: number, lng: number) => void;
  onMarkerDrag: (index: number, lat: number, lng: number) => void;
  onRemoveCity: (index: number) => void;
}

const CITY_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

// Custom numbered marker icon
const createNumberedIcon = (number: number, color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        color: white;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 14px;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      ">${number}</div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

// Component to handle map click events
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Draggable marker component
function DraggableMarker({
  city,
  index,
  onMarkerDrag,
  onRemoveCity,
}: {
  city: City;
  index: number;
  onMarkerDrag: (index: number, lat: number, lng: number) => void;
  onRemoveCity: (index: number) => void;
}) {
  const markerRef = useRef<L.Marker>(null);
  const color = CITY_COLORS[index % CITY_COLORS.length];

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const latlng = marker.getLatLng();
        onMarkerDrag(index, latlng.lat, latlng.lng);
      }
    },
  };

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={[city.lat, city.lng]}
      ref={markerRef}
      icon={createNumberedIcon(index + 1, color)}
    >
      <Popup>
        <div className="text-center min-w-[120px]">
          <p className="font-bold text-sm mb-1">{index + 1}. {city.name}</p>
          <p className="text-xs text-gray-600 mb-2">
            {city.lat.toFixed(4)}, {city.lng.toFixed(4)}
          </p>
          <button
            onClick={() => onRemoveCity(index)}
            className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
          >
            Remove
          </button>
        </div>
      </Popup>
    </Marker>
  );
}

export default function MapPicker({
  cities,
  onMapClick,
  onMarkerDrag,
  onRemoveCity,
}: MapPickerProps) {
  // Calculate center and bounds
  const getCenter = (): [number, number] => {
    if (cities.length === 0) {
      return [39.8283, -98.5795]; // Center of USA
    }
    const avgLat = cities.reduce((sum, c) => sum + c.lat, 0) / cities.length;
    const avgLng = cities.reduce((sum, c) => sum + c.lng, 0) / cities.length;
    return [avgLat, avgLng];
  };

  // Create polyline for connecting cities in order
  const getPolylinePositions = (): [number, number][] => {
    if (cities.length < 2) return [];
    const positions: [number, number][] = cities.map(c => [c.lat, c.lng]);
    // Close the loop if 3+ cities
    if (cities.length >= 3) {
      positions.push([cities[0].lat, cities[0].lng]);
    }
    return positions;
  };

  return (
    <div className="relative">
      <MapContainer
        center={getCenter()}
        zoom={cities.length === 0 ? 4 : 5}
        style={{ height: '400px', width: '100%', borderRadius: '8px' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapClickHandler onMapClick={onMapClick} />
        
        {/* Draw connecting lines */}
        {cities.length >= 2 && (
          <Polyline
            positions={getPolylinePositions()}
            color="#3b82f6"
            weight={3}
            opacity={0.6}
            dashArray="10, 10"
          />
        )}
        
        {/* Render markers */}
        {cities.map((city, index) => (
          <DraggableMarker
            key={index}
            city={city}
            index={index}
            onMarkerDrag={onMarkerDrag}
            onRemoveCity={onRemoveCity}
          />
        ))}
      </MapContainer>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-[1000]">
        <p className="text-xs font-medium mb-1">Instructions</p>
        <ul className="text-xs text-gray-600 space-y-0.5">
          <li>• Click to add city</li>
          <li>• Drag marker to move</li>
          <li>• Click marker to remove</li>
        </ul>
      </div>
      
      {/* City count badge */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg z-[1000]">
        <p className="text-sm font-medium">{cities.length} cities</p>
      </div>
    </div>
  );
}