// components/tools/SearchTool.tsx
// Location search (Geocoding)

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { GeoPoint } from '@/types/map-analysis';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  MapPin,
  Clock,
  X,
  Star,
  StarOff,
  Navigation,
  Loader2,
  CornerDownLeft,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  displayName: string;
  shortName: string;
  point: GeoPoint;
  type: string;
  boundingBox?: [number, number, number, number]; // [south, north, west, east]
}

interface SearchHistoryItem {
  query: string;
  result: SearchResult;
  timestamp: number;
  isFavorite: boolean;
}

interface SearchToolProps {
  onLocationSelect: (point: GeoPoint, zoom?: number) => void;
  onMarkerPlace: (point: GeoPoint, label: string) => void;
  mapCenter?: GeoPoint;
}

export default function SearchTool({
  onLocationSelect,
  onMarkerPlace,
  mapCenter,
}: SearchToolProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [reverseResult, setReverseResult] = useState<string | null>(null);
  const [isReversing, setIsReversing] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ─────────────────────────────────────────
  // Forward Geocoding (address → coordinates)
  // ─────────────────────────────────────────
  const searchLocation = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          q: searchQuery,
          format: 'json',
          addressdetails: '1',
          limit: '8',
          'accept-language': 'ko,en',
        });

        // Bias towards map center if available
        if (mapCenter) {
          params.set('viewbox', `${mapCenter.lng - 0.5},${mapCenter.lat + 0.5},${mapCenter.lng + 0.5},${mapCenter.lat - 0.5}`);
          params.set('bounded', '0');
        }

        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?${params}`,
          {
            headers: {
              'User-Agent': 'MapAnalysisTool/1.0',
            },
          }
        );
        const data = await res.json();

        const parsed: SearchResult[] = data.map((item: any) => ({
          id: item.place_id?.toString() ?? `${item.lat}_${item.lon}`,
          displayName: item.display_name,
          shortName: extractShortName(item),
          point: { lat: parseFloat(item.lat), lng: parseFloat(item.lon) },
          type: item.type ?? item.class ?? 'place',
          boundingBox: item.boundingbox?.map(Number) as [number, number, number, number],
        }));

        setResults(parsed);

        if (parsed.length === 0) {
          setError('No results found. Try a different search term.');
        }
      } catch (err) {
        setError('Search failed. Please check your connection.');
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [mapCenter]
  );

  // Debounced auto-search
  const handleInputChange = (value: string) => {
    setQuery(value);
    setShowHistory(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length >= 2) {
      debounceRef.current = setTimeout(() => searchLocation(value), 400);
    } else {
      setResults([]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    searchLocation(query);
  };

  // ─────────────────────────────────────────
  // Reverse Geocoding (coordinates → address)
  // ─────────────────────────────────────────
  const reverseGeocode = useCallback(async (point: GeoPoint) => {
    setIsReversing(true);
    setReverseResult(null);

    try {
      const params = new URLSearchParams({
        lat: point.lat.toString(),
        lon: point.lng.toString(),
        format: 'json',
        'accept-language': 'ko,en',
        zoom: '18',
      });

      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?${params}`,
        { headers: { 'User-Agent': 'MapAnalysisTool/1.0' } }
      );
      const data = await res.json();
      setReverseResult(data.display_name ?? 'Unknown location');
    } catch {
      setReverseResult('Failed to reverse geocode');
    } finally {
      setIsReversing(false);
    }
  }, []);

  // ─────────────────────────────────────────
  // Select a result
  // ─────────────────────────────────────────
  const selectResult = (result: SearchResult) => {
    // Calculate zoom from bounding box
    let zoom = 15;
    if (result.boundingBox) {
      const [south, north, west, east] = result.boundingBox;
      const latSpan = north - south;
      const lngSpan = east - west;
      const maxSpan = Math.max(latSpan, lngSpan);
      if (maxSpan > 10) zoom = 5;
      else if (maxSpan > 1) zoom = 8;
      else if (maxSpan > 0.1) zoom = 12;
      else if (maxSpan > 0.01) zoom = 15;
      else zoom = 17;
    }

    onLocationSelect(result.point, zoom);
    onMarkerPlace(result.point, result.shortName);

    // Add to history
    setHistory((prev) => {
      const filtered = prev.filter((h) => h.result.id !== result.id);
      return [
        { query, result, timestamp: Date.now(), isFavorite: false },
        ...filtered,
      ].slice(0, 20);
    });

    setResults([]);
    setQuery('');
  };

  // ─────────────────────────────────────────
  // History management
  // ─────────────────────────────────────────
  const toggleFavorite = (id: string) => {
    setHistory((prev) =>
      prev.map((h) =>
        h.result.id === id ? { ...h, isFavorite: !h.isFavorite } : h
      )
    );
  };

  const removeHistory = (id: string) => {
    setHistory((prev) => prev.filter((h) => h.result.id !== id));
  };

  const clearHistory = () => {
    setHistory((prev) => prev.filter((h) => h.isFavorite));
  };

  const favorites = history.filter((h) => h.isFavorite);
  const recent = history.filter((h) => !h.isFavorite);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <Search className="h-4 w-4" />
        <span className="text-sm font-medium">Location Search</span>
      </div>

      <div className="px-3 py-3 space-y-3 flex-1 flex flex-col">
        {/* Search input */}
        <form onSubmit={handleSubmit} className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => {
              if (!query && history.length > 0) setShowHistory(true);
            }}
            placeholder="Search address or place..."
            className="pl-9 pr-16 h-9 text-sm"
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  inputRef.current?.focus();
                }}
                className="p-1 hover:bg-muted rounded"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
            <button
              type="submit"
              className="p-1 hover:bg-muted rounded text-primary"
            >
              {isSearching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CornerDownLeft className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <p className="text-xs text-destructive px-1">{error}</p>
        )}

        <ScrollArea className="flex-1">
          {/* Search Results */}
          {results.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Results ({results.length})
              </Label>
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => selectResult(r)}
                  className="w-full flex items-start gap-2 px-2 py-2 rounded-md text-left hover:bg-muted/50 transition-colors group"
                >
                  <MapPin className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate">
                      {r.shortName}
                    </div>
                    <div className="text-[10px] text-muted-foreground line-clamp-2">
                      {r.displayName}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Badge variant="outline" className="text-[9px] px-1 py-0">
                        {r.type}
                      </Badge>
                      <span className="text-[9px] text-muted-foreground font-mono">
                        {r.point.lat.toFixed(4)}, {r.point.lng.toFixed(4)}
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0 mt-1" />
                </button>
              ))}
            </div>
          )}

          {/* History (shown when input focused + empty) */}
          {showHistory && results.length === 0 && !query && (
            <div className="space-y-3">
              {/* Favorites */}
              {favorites.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    ★ Favorites
                  </Label>
                  {favorites.map((h) => (
                    <HistoryItem
                      key={h.result.id}
                      item={h}
                      onSelect={() => selectResult(h.result)}
                      onToggleFavorite={() => toggleFavorite(h.result.id)}
                      onRemove={() => removeHistory(h.result.id)}
                    />
                  ))}
                </div>
              )}

              {/* Recent */}
              {recent.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Recent
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearHistory}
                      className="h-5 text-[10px] px-1"
                    >
                      Clear
                    </Button>
                  </div>
                  {recent.slice(0, 10).map((h) => (
                    <HistoryItem
                      key={h.result.id}
                      item={h}
                      onSelect={() => selectResult(h.result)}
                      onToggleFavorite={() => toggleFavorite(h.result.id)}
                      onRemove={() => removeHistory(h.result.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reverse Geocoding */}
          {results.length === 0 && !showHistory && !query && (
            <div className="space-y-3">
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Reverse Geocode
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  Get the address of the current map center.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => mapCenter && reverseGeocode(mapCenter)}
                  disabled={!mapCenter || isReversing}
                  className="w-full h-8 text-xs"
                >
                  {isReversing ? (
                    <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                  ) : (
                    <Navigation className="h-3.5 w-3.5 mr-2" />
                  )}
                  Get address at map center
                </Button>

                {reverseResult && (
                  <div className="rounded-md border bg-muted/30 p-2 text-xs">
                    <div className="flex items-start gap-1.5">
                      <MapPin className="h-3 w-3 text-primary flex-shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{reverseResult}</span>
                    </div>
                    {mapCenter && (
                      <div className="text-[10px] text-muted-foreground font-mono mt-1 pl-4.5">
                        {mapCenter.lat.toFixed(6)}, {mapCenter.lng.toFixed(6)}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              {/* Quick search suggestions */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Quick Search
                </Label>
                <div className="flex flex-wrap gap-1">
                  {[
                    'Times Square',
                    'Central Park',
                    'Brooklyn Bridge',
                    'Pangyo Station',
                    'Haeundae Beach',
                    'Jeju Airport',
                  ].map((q) => (
                    <Button
                      key={q}
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-2"
                      onClick={() => {
                        setQuery(q);
                        searchLocation(q);
                      }}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// History Item
// ─────────────────────────────────────────
function HistoryItem({
  item,
  onSelect,
  onToggleFavorite,
  onRemove,
}: {
  item: SearchHistoryItem;
  onSelect: () => void;
  onToggleFavorite: () => void;
  onRemove: () => void;
}) {
  const timeAgo = getTimeAgo(item.timestamp);

  return (
    <div className="flex items-center gap-1 group">
      <button
        onClick={onSelect}
        className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-left hover:bg-muted/50 transition-colors min-w-0"
      >
        <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-xs truncate">{item.result.shortName}</div>
          <div className="text-[10px] text-muted-foreground">{timeAgo}</div>
        </div>
      </button>
      <button
        onClick={onToggleFavorite}
        className="p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {item.isFavorite ? (
          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
        ) : (
          <StarOff className="h-3 w-3 text-muted-foreground" />
        )}
      </button>
      <button
        onClick={onRemove}
        className="p-1 hover:bg-destructive/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="h-3 w-3 text-destructive" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────
function extractShortName(item: any): string {
  const addr = item.address ?? {};
  const parts = [
    addr.amenity,
    addr.building,
    addr.shop,
    addr.tourism,
    addr.road,
    addr.neighbourhood,
    addr.suburb,
    addr.city ?? addr.town ?? addr.village,
  ].filter(Boolean);
  return parts.length > 0 ? parts.slice(0, 3).join(', ') : item.display_name?.split(',')[0] ?? 'Unknown';
}

function getTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}