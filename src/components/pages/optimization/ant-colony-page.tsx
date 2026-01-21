"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Waypoints, MapPin, Play, Plus, Trash2, ArrowRight, CheckCircle2,
  AlertCircle, Info, HelpCircle, FileSpreadsheet, Download, TrendingUp,
  Settings, Activity, ChevronRight, Route, Navigation, BarChart3, GitCompare,
  Map, Loader2, RefreshCw, Clock, MousePointer, Pencil, List
} from "lucide-react";

// Leaflet imports (dynamic import for SSR)
import dynamic from 'next/dynamic';

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ============ TYPES ============
interface City {
  name: string;
  lat: number;
  lng: number;
  state?: string;
}

interface ACOParams {
  n_ants: number;
  n_iterations: number;
  alpha: number;
  beta: number;
  evaporation_rate: number;
  q: number;
}

interface SegmentDistance {
  from: string;
  to: string;
  distance: number;
}

interface KeyInsight {
  title: string;
  description: string;
  status: "positive" | "neutral" | "warning";
}

interface ACOResult {
  success: boolean;
  results: {
    best_path: string[];
    best_path_indices: number[];
    ordered_cities: City[];
    total_distance: number;
    num_cities: number;
    segment_distances: SegmentDistance[];
  };
  visualizations: {
    map_html?: string;
    convergence_chart?: string;
    pheromone_heatmap?: string;
    distance_matrix?: string;
    segment_chart?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    algorithm: string;
    n_ants: number;
    n_iterations: number;
    alpha: number;
    beta: number;
    evaporation_rate: number;
    total_distance: number;
    solve_time_ms: number;
  };
}

interface PresetOption {
  name: string;
  city_count: number;
  cities: City[];
}

interface ComparisonResult {
  config_id: number;
  params: Partial<ACOParams>;
  best_distance: number;
  best_path: string[];
  solve_time_ms: number;
}

// ============ CONSTANTS ============
const DEFAULT_PARAMS: ACOParams = {
  n_ants: 20,
  n_iterations: 100,
  alpha: 1.0,
  beta: 2.0,
  evaporation_rate: 0.5,
  q: 100
};

const CITY_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

// ============ DYNAMIC MAP COMPONENT (No SSR) ============
const MapComponent = dynamic(
  () => import('./MapPicker'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-[400px] rounded-lg border bg-muted/20 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }
);

// ============ UTILITY COMPONENTS ============
const MetricCard: React.FC<{
  value: string | number;
  label: string;
  icon?: React.FC<{ className?: string }>;
  highlight?: boolean;
}> = ({ value, label, icon: Icon, highlight }) => (
  <div className={`text-center p-4 rounded-lg border ${highlight ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/20'}`}>
    {Icon && <Icon className={`w-5 h-5 mx-auto mb-2 ${highlight ? 'text-primary' : 'text-muted-foreground'}`} />}
    <p className={`text-2xl font-semibold ${highlight ? 'text-primary' : ''}`}>{value}</p>
    <p className="text-xs text-muted-foreground mt-1">{label}</p>
  </div>
);

const FindingBox: React.FC<{ finding: string }> = ({ finding }) => (
  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Key Finding</p>
    <p className="font-medium text-foreground">{finding}</p>
  </div>
);

const ProgressBar: React.FC<{
  currentStep: number;
  hasResults: boolean;
  onStepClick: (step: number) => void;
}> = ({ currentStep, hasResults, onStepClick }) => {
  const steps = [
    { num: 1, label: "Intro" },
    { num: 2, label: "Cities" },
    { num: 3, label: "Params" },
    { num: 4, label: "Results" },
    { num: 5, label: "Analysis" },
    { num: 6, label: "Report" },
  ];

  return (
    <div className="flex items-center justify-center gap-0.5 mb-8 flex-wrap">
      {steps.map((step, idx) => {
        const isCompleted = step.num < currentStep;
        const isCurrent = step.num === currentStep;
        const isAccessible = step.num <= 3 || hasResults;

        return (
          <React.Fragment key={step.num}>
            <button
              onClick={() => isAccessible && onStepClick(step.num)}
              disabled={!isAccessible}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                isCurrent ? "bg-primary text-primary-foreground" :
                isCompleted ? "bg-primary/10 text-primary" :
                isAccessible ? "bg-muted text-muted-foreground hover:bg-muted/80" :
                "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
              }`}
            >
              {step.label}
            </button>
            {idx < steps.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/30" />}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const CityCard: React.FC<{
  city: City;
  index: number;
  onRemove: () => void;
  onChange: (field: keyof City, value: string | number) => void;
}> = ({ city, index, onRemove, onChange }) => (
  <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/10">
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
      style={{ backgroundColor: CITY_COLORS[index % CITY_COLORS.length] }}
    >
      {index + 1}
    </div>
    <div className="flex-1 grid grid-cols-4 gap-2">
      <Input value={city.name} onChange={(e) => onChange('name', e.target.value)} placeholder="City Name" className="col-span-2" />
      <Input type="number" value={city.lat} onChange={(e) => onChange('lat', parseFloat(e.target.value) || 0)} placeholder="Lat" step="0.0001" />
      <Input type="number" value={city.lng} onChange={(e) => onChange('lng', parseFloat(e.target.value) || 0)} placeholder="Lng" step="0.0001" />
    </div>
    <Button variant="ghost" size="icon" onClick={onRemove}>
      <Trash2 className="w-4 h-4 text-destructive" />
    </Button>
  </div>
);

const RouteStepCard: React.FC<{ segment: SegmentDistance; index: number; total: number }> = ({ segment, index, total }) => (
  <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/10">
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0" style={{ backgroundColor: CITY_COLORS[index % CITY_COLORS.length] }}>
      {index + 1}
    </div>
    <div className="flex-1">
      <p className="font-medium text-sm">{segment.from} → {segment.to}</p>
      <p className="text-xs text-muted-foreground">Segment {index + 1} of {total}</p>
    </div>
    <div className="text-right">
      <p className="font-semibold text-sm">{segment.distance.toFixed(0)} mi</p>
    </div>
  </div>
);

// ============ MAIN COMPONENT ============
export default function AntColonyPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [cities, setCities] = useState<City[]>([]);
  const [params, setParams] = useState<ACOParams>(DEFAULT_PARAMS);
  const [results, setResults] = useState<ACOResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presets, setPresets] = useState<Record<string, PresetOption>>({});
  
  // City input mode: 'map' or 'list'
  const [inputMode, setInputMode] = useState<'map' | 'list'>('map');
  
  // Comparison mode
  const [compareMode, setCompareMode] = useState(false);
  const [paramSets, setParamSets] = useState<ACOParams[]>([DEFAULT_PARAMS]);
  const [comparisonResults, setComparisonResults] = useState<{
    results: ComparisonResult[];
    best_config: ComparisonResult;
    comparison_chart: string;
  } | null>(null);

  useEffect(() => {
    fetch(`${FASTAPI_URL}/api/analysis/presets`)
      .then(res => res.json())
      .then(data => setPresets(data.presets || {}))
      .catch(err => console.error('Failed to load presets:', err));
  }, []);

  const handleSelectPreset = useCallback((key: string) => {
    if (presets[key]) {
      setCities(presets[key].cities);
      setCurrentStep(2);
      setResults(null);
      setError(null);
    }
  }, [presets]);

  const handleCustomStart = useCallback(() => {
    setCities([]);
    setInputMode('map');
    setCurrentStep(2);
    setResults(null);
    setError(null);
  }, []);

  // Map click handler - add city
  const handleMapClick = useCallback((lat: number, lng: number) => {
    const cityNum = cities.length + 1;
    setCities(prev => [...prev, { 
      name: `City ${cityNum}`, 
      lat: parseFloat(lat.toFixed(4)), 
      lng: parseFloat(lng.toFixed(4)) 
    }]);
  }, [cities.length]);

  // Marker drag handler - update city position
  const handleMarkerDrag = useCallback((index: number, lat: number, lng: number) => {
    setCities(prev => prev.map((city, i) => 
      i === index ? { ...city, lat: parseFloat(lat.toFixed(4)), lng: parseFloat(lng.toFixed(4)) } : city
    ));
  }, []);

  const addCity = useCallback(() => {
    setCities(prev => [...prev, { name: `City ${prev.length + 1}`, lat: 39.8283, lng: -98.5795 }]);
  }, []);

  const removeCity = useCallback((index: number) => {
    setCities(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateCity = useCallback((index: number, field: keyof City, value: string | number) => {
    setCities(prev => prev.map((city, i) => i === index ? { ...city, [field]: value } : city));
  }, []);

  const clearAllCities = useCallback(() => {
    setCities([]);
  }, []);

  const runOptimization = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${FASTAPI_URL}/api/analysis/ant-colony`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cities, params }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Optimization failed");
      }
      const result: ACOResult = await res.json();
      setResults(result);
      setCurrentStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Optimization failed");
    } finally {
      setLoading(false);
    }
  };

  const runComparison = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${FASTAPI_URL}/api/analysis/ant-colony/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cities, param_sets: paramSets }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Comparison failed");
      }
      const result = await res.json();
      setComparisonResults({
        results: result.comparison_results,
        best_config: result.best_config,
        comparison_chart: result.comparison_chart
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comparison failed");
    } finally {
      setLoading(false);
    }
  };

  const addParamSet = () => setParamSets(prev => [...prev, { ...DEFAULT_PARAMS }]);
  const updateParamSet = (index: number, field: keyof ACOParams, value: number) => {
    setParamSets(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };
  const removeParamSet = (index: number) => setParamSets(prev => prev.filter((_, i) => i !== index));

  const handleDownloadCSV = () => {
    if (!results) return;
    const rows: string[] = ['Order,City,State,Latitude,Longitude'];
    results.results.ordered_cities.forEach((city, i) => {
      rows.push(`${i + 1},${city.name},${city.state || ''},${city.lat},${city.lng}`);
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'aco_optimal_route.csv';
    a.click();
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const base64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!base64 || chartKey === 'map_html') return;
    const a = document.createElement('a');
    a.href = `data:image/png;base64,${base64}`;
    a.download = `aco_${chartKey}.png`;
    a.click();
  };

  // ============ STEP 1: INTRO ============
  const renderStep1Intro = () => (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Waypoints className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">Ant Colony Optimization</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Find the shortest route visiting all cities exactly once. 
          <span className="text-primary font-medium"> Click on the map to add cities!</span>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Map className="w-5 h-5 text-primary" />
            Quick Start with Preset Cities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {Object.entries(presets).map(([key, preset]) => (
              <button key={key} onClick={() => handleSelectPreset(key)}
                className="p-4 rounded-lg border border-border bg-muted/10 hover:border-primary/50 hover:bg-primary/5 transition-all text-left">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{preset.name}</p>
                    <p className="text-xs text-muted-foreground">{preset.city_count} cities</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {preset.cities.slice(0, 4).map((city, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{city.name}</Badge>
                  ))}
                  {preset.cities.length > 4 && <Badge variant="outline" className="text-xs">+{preset.cities.length - 4} more</Badge>}
                </div>
              </button>
            ))}
          </div>
          <Separator className="my-4" />
          <Button onClick={handleCustomStart} className="w-full gap-2">
            <MousePointer className="w-4 h-4" />
            Click on Map to Add Cities
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-5 h-5 text-primary" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-border bg-muted/10 text-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <MousePointer className="w-5 h-5 text-primary" />
              </div>
              <p className="font-medium text-sm">1. Click Map</p>
              <p className="text-xs text-muted-foreground mt-1">Click anywhere on the map to add cities</p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-muted/10 text-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Settings className="w-5 h-5 text-primary" />
              </div>
              <p className="font-medium text-sm">2. Set Parameters</p>
              <p className="text-xs text-muted-foreground mt-1">Adjust ACO algorithm settings</p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-muted/10 text-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Route className="w-5 h-5 text-primary" />
              </div>
              <p className="font-medium text-sm">3. Get Route</p>
              <p className="text-xs text-muted-foreground mt-1">View the optimal path on the map</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ============ STEP 2: CITIES (with Map Picker) ============
  const renderStep2Cities = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="w-5 h-5 text-primary" />
          Select Cities
        </CardTitle>
        <CardDescription>
          Click on the map to add cities, or switch to list mode for manual entry.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode Toggle & Controls */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{cities.length} cities</Badge>
            {cities.length >= 3 && <Badge variant="outline" className="text-primary">Ready</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-lg overflow-hidden">
              <button
                onClick={() => setInputMode('map')}
                className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                  inputMode === 'map' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 hover:bg-muted'
                }`}
              >
                <MousePointer className="w-3.5 h-3.5" />
                Map
              </button>
              <button
                onClick={() => setInputMode('list')}
                className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                  inputMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 hover:bg-muted'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                List
              </button>
            </div>
            <Select onValueChange={handleSelectPreset}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Load preset" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(presets).map(([key, preset]) => (
                  <SelectItem key={key} value={key}>{preset.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {cities.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearAllCities}>
                <Trash2 className="w-4 h-4 mr-1" />Clear
              </Button>
            )}
          </div>
        </div>

        {/* Map Mode */}
        {inputMode === 'map' && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
              <div className="flex items-center gap-2 text-sm">
                <MousePointer className="w-4 h-4 text-primary" />
                <span><strong>Click</strong> on the map to add cities. <strong>Drag</strong> markers to reposition.</span>
              </div>
            </div>
            <MapComponent
              cities={cities}
              onMapClick={handleMapClick}
              onMarkerDrag={handleMarkerDrag}
              onRemoveCity={removeCity}
            />
          </div>
        )}

        {/* List Mode */}
        {inputMode === 'list' && (
          <div className="space-y-2">
            <div className="max-h-80 overflow-y-auto space-y-2">
              {cities.map((city, index) => (
                <CityCard
                  key={index}
                  city={city}
                  index={index}
                  onRemove={() => removeCity(index)}
                  onChange={(field, value) => updateCity(index, field, value)}
                />
              ))}
            </div>
            <Button variant="outline" onClick={addCity} className="w-full gap-2">
              <Plus className="w-4 h-4" />Add City Manually
            </Button>
          </div>
        )}

        {/* City List Summary (in map mode) */}
        {inputMode === 'map' && cities.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Added Cities</h4>
            <div className="flex flex-wrap gap-2">
              {cities.map((city, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="pl-2 pr-1 py-1 flex items-center gap-1"
                >
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white mr-1"
                    style={{ backgroundColor: CITY_COLORS[idx % CITY_COLORS.length] }}
                  >
                    {idx + 1}
                  </span>
                  {city.name}
                  <button
                    onClick={() => removeCity(idx)}
                    className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {cities.length < 3 && (
          <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <p className="text-sm text-destructive">At least 3 cities required. Add {3 - cities.length} more.</p>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button onClick={() => setCurrentStep(3)} disabled={cities.length < 3} className="gap-2">
            Continue to Parameters<ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // ============ STEP 3: PARAMS ============
  const renderStep3Params = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5 text-primary" />ACO Parameters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3">
            <GitCompare className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-sm">Compare Multiple Configurations</p>
              <p className="text-xs text-muted-foreground">Run ACO with different parameters</p>
            </div>
          </div>
          <Switch checked={compareMode} onCheckedChange={setCompareMode} />
        </div>

        {!compareMode ? (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center justify-between"><span>Number of Ants</span><Badge variant="secondary">{params.n_ants}</Badge></Label>
                <Slider value={[params.n_ants]} onValueChange={([v]) => setParams(p => ({ ...p, n_ants: v }))} min={5} max={100} step={5} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center justify-between"><span>Iterations</span><Badge variant="secondary">{params.n_iterations}</Badge></Label>
                <Slider value={[params.n_iterations]} onValueChange={([v]) => setParams(p => ({ ...p, n_iterations: v }))} min={10} max={500} step={10} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center justify-between"><span>α (Pheromone)</span><Badge variant="secondary">{params.alpha.toFixed(1)}</Badge></Label>
                <Slider value={[params.alpha * 10]} onValueChange={([v]) => setParams(p => ({ ...p, alpha: v / 10 }))} min={1} max={50} step={1} />
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center justify-between"><span>β (Distance)</span><Badge variant="secondary">{params.beta.toFixed(1)}</Badge></Label>
                <Slider value={[params.beta * 10]} onValueChange={([v]) => setParams(p => ({ ...p, beta: v / 10 }))} min={1} max={50} step={1} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center justify-between"><span>ρ (Evaporation)</span><Badge variant="secondary">{params.evaporation_rate.toFixed(2)}</Badge></Label>
                <Slider value={[params.evaporation_rate * 100]} onValueChange={([v]) => setParams(p => ({ ...p, evaporation_rate: v / 100 }))} min={10} max={90} step={5} />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {paramSets.map((pSet, idx) => (
              <div key={idx} className="p-4 rounded-lg border border-border bg-muted/10">
                <div className="flex items-center justify-between mb-3">
                  <Badge>Config {idx + 1}</Badge>
                  {paramSets.length > 1 && <Button variant="ghost" size="sm" onClick={() => removeParamSet(idx)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
                </div>
                <div className="grid grid-cols-5 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Ants</Label><Input type="number" value={pSet.n_ants} onChange={(e) => updateParamSet(idx, 'n_ants', parseInt(e.target.value) || 10)} className="h-8" /></div>
                  <div className="space-y-1"><Label className="text-xs">Iter</Label><Input type="number" value={pSet.n_iterations} onChange={(e) => updateParamSet(idx, 'n_iterations', parseInt(e.target.value) || 50)} className="h-8" /></div>
                  <div className="space-y-1"><Label className="text-xs">α</Label><Input type="number" step="0.1" value={pSet.alpha} onChange={(e) => updateParamSet(idx, 'alpha', parseFloat(e.target.value) || 1)} className="h-8" /></div>
                  <div className="space-y-1"><Label className="text-xs">β</Label><Input type="number" step="0.1" value={pSet.beta} onChange={(e) => updateParamSet(idx, 'beta', parseFloat(e.target.value) || 2)} className="h-8" /></div>
                  <div className="space-y-1"><Label className="text-xs">ρ</Label><Input type="number" step="0.05" value={pSet.evaporation_rate} onChange={(e) => updateParamSet(idx, 'evaporation_rate', parseFloat(e.target.value) || 0.5)} className="h-8" /></div>
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={addParamSet} className="w-full gap-2"><Plus className="w-4 h-4" />Add Configuration</Button>
          </div>
        )}

        {error && <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5"><AlertCircle className="w-4 h-4 text-destructive inline mr-2" /><span className="text-sm text-destructive">{error}</span></div>}

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => setCurrentStep(2)}>Back to Cities</Button>
          <Button onClick={compareMode ? runComparison : runOptimization} disabled={loading} className="gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{compareMode ? 'Comparing...' : 'Optimizing...'}</> : <><Play className="w-4 h-4" />{compareMode ? 'Run Comparison' : 'Find Optimal Route'}</>}
          </Button>
        </div>

        {compareMode && comparisonResults && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium">Comparison Results</h4>
            {comparisonResults.comparison_chart && <img src={`data:image/png;base64,${comparisonResults.comparison_chart}`} alt="Comparison" className="w-full rounded-lg border" />}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="font-medium text-sm">Best: Config #{comparisonResults.best_config.config_id}</p>
              <p className="text-sm text-muted-foreground">{comparisonResults.best_config.best_distance.toFixed(0)} miles • {comparisonResults.best_config.solve_time_ms}ms</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // ============ STEP 4: RESULTS ============
  const renderStep4Results = () => {
    if (!results) return null;
    const { results: r, summary, key_insights } = results;

    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Route className="w-5 h-5 text-primary" />Optimal Route Found</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={`Optimal route: ${r.total_distance.toFixed(0)} miles visiting ${r.num_cities} cities in ${summary.solve_time_ms}ms.`} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={`${r.total_distance.toFixed(0)}`} label="Total Miles" icon={Navigation} highlight />
            <MetricCard value={r.num_cities} label="Cities" icon={MapPin} />
            <MetricCard value={`${summary.solve_time_ms}ms`} label="Solve Time" icon={Clock} />
            <MetricCard value={summary.n_iterations} label="Iterations" icon={RefreshCw} />
          </div>

          {results.visualizations.map_html && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2"><Map className="w-4 h-4 text-primary" />Interactive Map</h4>
              <div className="w-full h-[500px] rounded-lg border overflow-hidden" dangerouslySetInnerHTML={{ __html: results.visualizations.map_html }} />
            </div>
          )}

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Route Segments</h4>
            <div className="grid md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
              {r.segment_distances.map((seg, idx) => <RouteStepCard key={idx} segment={seg} index={idx} total={r.segment_distances.length} />)}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Key Insights</h4>
            {key_insights.map((ins, idx) => (
              <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${ins.status === "positive" ? "border-primary/30 bg-primary/5" : ins.status === "warning" ? "border-destructive/30 bg-destructive/5" : "border-border bg-muted/10"}`}>
                {ins.status === "positive" ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> : ins.status === "warning" ? <AlertCircle className="w-5 h-5 text-destructive shrink-0" /> : <Info className="w-5 h-5 text-muted-foreground shrink-0" />}
                <div><p className="font-medium text-sm">{ins.title}</p><p className="text-sm text-muted-foreground">{ins.description}</p></div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4"><Button onClick={() => setCurrentStep(5)} className="gap-2">View Analysis<ArrowRight className="w-4 h-4" /></Button></div>
        </CardContent>
      </Card>
    );
  };

  // ============ STEP 5: ANALYSIS ============
  const renderStep5Analysis = () => {
    if (!results) return null;
    const { visualizations } = results;

    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><BarChart3 className="w-5 h-5 text-primary" />Detailed Analysis</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="convergence">
            <TabsList className="mb-4">
              <TabsTrigger value="convergence">Convergence</TabsTrigger>
              <TabsTrigger value="pheromone">Pheromone</TabsTrigger>
              <TabsTrigger value="distances">Distances</TabsTrigger>
              <TabsTrigger value="segments">Segments</TabsTrigger>
            </TabsList>
            <TabsContent value="convergence">
              {visualizations.convergence_chart && (
                <div className="relative">
                  <img src={`data:image/png;base64,${visualizations.convergence_chart}`} alt="Convergence" className="w-full rounded-lg border" />
                  <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => handleDownloadPNG('convergence_chart')}><Download className="w-4 h-4" /></Button>
                </div>
              )}
            </TabsContent>
            <TabsContent value="pheromone">
              {visualizations.pheromone_heatmap && (
                <div className="relative">
                  <img src={`data:image/png;base64,${visualizations.pheromone_heatmap}`} alt="Pheromone" className="w-full rounded-lg border" />
                  <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => handleDownloadPNG('pheromone_heatmap')}><Download className="w-4 h-4" /></Button>
                </div>
              )}
            </TabsContent>
            <TabsContent value="distances">
              {visualizations.distance_matrix && (
                <div className="relative">
                  <img src={`data:image/png;base64,${visualizations.distance_matrix}`} alt="Distance Matrix" className="w-full rounded-lg border" />
                  <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => handleDownloadPNG('distance_matrix')}><Download className="w-4 h-4" /></Button>
                </div>
              )}
            </TabsContent>
            <TabsContent value="segments">
              {visualizations.segment_chart && (
                <div className="relative">
                  <img src={`data:image/png;base64,${visualizations.segment_chart}`} alt="Segments" className="w-full rounded-lg border" />
                  <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => handleDownloadPNG('segment_chart')}><Download className="w-4 h-4" /></Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(4)}>Back</Button>
            <Button onClick={() => setCurrentStep(6)} className="gap-2">View Report<ArrowRight className="w-4 h-4" /></Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ============ STEP 6: REPORT ============
  const renderStep6Report = () => {
    if (!results) return null;
    const { results: r, summary, key_insights, visualizations } = results;

    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b"><h1 className="text-xl font-semibold">ACO Route Optimization Report</h1><p className="text-sm text-muted-foreground">{r.num_cities} Cities | {new Date().toLocaleDateString()}</p></div>
        
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Executive Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MetricCard value={`${r.total_distance.toFixed(0)} mi`} label="Total Distance" highlight />
              <MetricCard value={r.num_cities} label="Cities" />
              <MetricCard value={`${summary.solve_time_ms}ms`} label="Solve Time" />
              <MetricCard value={summary.n_iterations} label="Iterations" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Optimal Route</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>City</TableHead><TableHead>State</TableHead><TableHead className="text-right">To Next (mi)</TableHead></TableRow></TableHeader>
              <TableBody>
                {r.ordered_cities.map((city, idx) => (
                  <TableRow key={idx}><TableCell>{idx + 1}</TableCell><TableCell>{city.name}</TableCell><TableCell>{city.state || '-'}</TableCell><TableCell className="text-right">{r.segment_distances[idx]?.distance.toFixed(0) || '-'}</TableCell></TableRow>
                ))}
                <TableRow className="bg-muted/20 font-medium"><TableCell colSpan={3}>Total</TableCell><TableCell className="text-right">{r.total_distance.toFixed(0)} mi</TableCell></TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Visualizations</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="map">
              <TabsList className="mb-4"><TabsTrigger value="map">Map</TabsTrigger><TabsTrigger value="convergence">Convergence</TabsTrigger></TabsList>
              <TabsContent value="map">{visualizations.map_html && <div className="w-full h-[400px] rounded-lg border overflow-hidden" dangerouslySetInnerHTML={{ __html: visualizations.map_html }} />}</TabsContent>
              <TabsContent value="convergence">{visualizations.convergence_chart && <img src={`data:image/png;base64,${visualizations.convergence_chart}`} alt="Convergence" className="w-full rounded-lg border" />}</TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Export</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleDownloadCSV} className="gap-2"><FileSpreadsheet className="w-4 h-4" />CSV</Button>
              <Button variant="outline" onClick={() => handleDownloadPNG('convergence_chart')} className="gap-2"><Download className="w-4 h-4" />Convergence</Button>
              <Button variant="outline" onClick={() => handleDownloadPNG('segment_chart')} className="gap-2"><Download className="w-4 h-4" />Segments</Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setCurrentStep(5)}>Back</Button>
          <Button variant="outline" onClick={() => setCurrentStep(1)}>New Optimization</Button>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {currentStep > 1 && <div className="flex justify-end mb-4"><Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)} className="gap-2"><HelpCircle className="w-4 h-4" />Help</Button></div>}
      {currentStep > 1 && <ProgressBar currentStep={currentStep} hasResults={!!results} onStepClick={setCurrentStep} />}
      {currentStep === 1 && renderStep1Intro()}
      {currentStep === 2 && renderStep2Cities()}
      {currentStep === 3 && renderStep3Params()}
      {currentStep === 4 && renderStep4Results()}
      {currentStep === 5 && renderStep5Analysis()}
      {currentStep === 6 && renderStep6Report()}
    </div>
  );
}

