'use client';

import React, { useState, useEffect } from 'react';
import { FeaturePageHeader } from '@/components/feature-page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  MapPin,
  FileUp,
  CheckCircle2,
  Sparkles,
  FlaskConical,
  Layers,
  Wrench,
  Filter,
  Circle,
  Hexagon,
  Scan,
  ShieldAlert,
  CircleDot,
  Trophy,
  Timer,
  Locate,
  CircleDashed,
  Combine,
  Clock,
  MoveRight,
  Flame,
  Grid3x3,
  Camera,
  Navigation,
  Table2,
  Route,
  Search,
  FileText,
  Upload,
  Waypoints,
  Pentagon,
  MousePointerClick,
  BarChart3,
  Target,
  Globe,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────
// Features
// ──────────────────────────────────────────────
const features = {
  analysis: {
    icon: FlaskConical,
    title: 'Spatial Analysis',
    description:
      'From radius queries to DBSCAN clustering—15 analysis tools that reveal hidden patterns in your location data.',
    details: [
      'Radius analysis with point-in-area statistics',
      'DBSCAN density clustering with auto-ε',
      'Voronoi territories & convex hulls',
      'Cannibalization & overlap detection',
      'Location scoring with weighted criteria',
      'Isochrone reachability (OSRM roads)',
      'Nearest facility matching',
      'Buffer zones & spatial join',
    ],
  },
  visualization: {
    icon: Layers,
    title: 'Map Visualization',
    description:
      'Transform raw coordinates into compelling visual stories—heatmaps, flow maps, bivariate color-coding, and more.',
    details: [
      'Density heatmap with 4 color schemes',
      'Flow map with curved arrows & volume encoding',
      'Bivariate 3×3 color matrix',
      'Grid / hex bin aggregation',
      'Marker clustering',
      'Time series animation',
    ],
  },
  routing: {
    icon: Navigation,
    title: 'Routing & Distance',
    description:
      'Real road-network routing powered by OSRM. TSP optimization, OD matrices, and route measurement.',
    details: [
      'TSP optimal route (OSRM driving)',
      'OD distance matrix with CSV export',
      'Point-to-point route measurement',
      'Isochrone driving-time polygons',
      'Detour ratio analysis',
    ],
  },
  utility: {
    icon: Wrench,
    title: 'Data & Export',
    description:
      'Search places, view your data, capture screenshots, and export everything—all without leaving the map.',
    details: [
      'OpenStreetMap location search',
      'Interactive data table with sort & filter',
      'Map screenshot (PNG / JPEG, 2× retina)',
      'CSV export from any analysis',
      'Drag-and-drop file upload',
      'Sample NYC dataset included',
    ],
  },
};

// ──────────────────────────────────────────────
// FeatureCard
// ──────────────────────────────────────────────
const FeatureCard = ({
  feature,
  featureKey,
  isActive,
  onMouseEnter,
  onMouseLeave,
}: {
  feature: (typeof features)[keyof typeof features];
  featureKey: string;
  isActive: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) => {
  const Icon = feature.icon;

  return (
    <div
      className={cn(
        'p-5 rounded-lg cursor-pointer transition-all duration-200 border',
        isActive ? 'bg-primary/5 border-primary' : 'bg-white border-border hover:border-primary/50'
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold mb-1">{feature.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// Steps
// ──────────────────────────────────────────────
const steps = [
  {
    number: '1',
    title: 'Upload Data',
    description: 'Drop a CSV/Excel with lat/lng columns, or try the NYC sample',
    icon: FileUp,
  },
  {
    number: '2',
    title: 'Choose Analysis',
    description: 'Pick from 31 tools organized in 3 categories',
    icon: FlaskConical,
  },
  {
    number: '3',
    title: 'Explore Results',
    description: 'Interactive map with real-time stats & visualizations',
    icon: Globe,
  },
  {
    number: '4',
    title: 'Export & Share',
    description: 'Download CSV, capture screenshots, or generate reports',
    icon: Camera,
  },
];

// ──────────────────────────────────────────────
// Capabilities
// ──────────────────────────────────────────────
const capabilities = [
  {
    category: 'Spatial Analysis',
    icon: FlaskConical,
    items: [
      'Radius Analysis',
      'Voronoi Diagram',
      'Convex Hull',
      'Spider Map',
      'DBSCAN Clustering',
      'Outlier Detection',
      'Cannibalization',
      'Location Score',
      'Isochrone',
      'Nearest Facility',
      'Buffer Zone',
      'Spatial Join',
    ],
  },
  {
    category: 'Visualization',
    icon: Layers,
    items: [
      'Heatmap',
      'Flow Map',
      'Bivariate Map',
      'Grid / Hex Bin',
      'Marker Clustering',
      'Time Series',
      'Choropleth',
    ],
  },
  {
    category: 'Routing & Distance',
    icon: Navigation,
    items: [
      'TSP Route (OSRM)',
      'OD Matrix',
      'Route Measure',
      'Isochrone Polygons',
    ],
  },
  {
    category: 'Utility',
    icon: Wrench,
    items: [
      'Location Search',
      'Data Table Viewer',
      'Filter & Query',
      'Screenshot Export',
      'Report & CSV Export',
      'Guide & Help',
    ],
  },
];

// ──────────────────────────────────────────────
// Demo panels
// ──────────────────────────────────────────────
const AnalysisDemo = () => (
  <div className="h-full flex flex-col p-4">
    <div className="flex items-center gap-2 mb-3 pb-2 border-b">
      <div className="w-2 h-2 rounded-full bg-green-500" />
      <div className="text-sm font-semibold">DBSCAN Clustering</div>
      <div className="ml-auto flex gap-1 text-xs text-muted-foreground">
        <span className="px-2 py-0.5 bg-slate-100 rounded">40 points</span>
      </div>
    </div>
    <div className="flex-1 space-y-2 overflow-y-auto">
      {[
        { label: 'ε (radius)', value: '350m', auto: true },
        { label: 'Min points', value: '3', auto: false },
      ].map((param, i) => (
        <motion.div
          key={param.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex items-center gap-2 text-xs"
        >
          <span className="w-20 text-muted-foreground">{param.label}</span>
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: i === 0 ? '55%' : '30%' }}
              transition={{ delay: 0.3 + i * 0.2, duration: 0.6 }}
            />
          </div>
          <span className="font-mono w-12 text-right">{param.value}</span>
          {param.auto && (
            <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[9px]">Auto</span>
          )}
        </motion.div>
      ))}

      <div className="mt-3 pt-3 border-t">
        <div className="text-xs font-medium mb-2">Results</div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Clusters', value: '5', color: 'bg-blue-500' },
            { label: 'Noise', value: '3', color: 'bg-red-500' },
            { label: 'Largest', value: '12 pts', color: 'bg-green-500' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="rounded-lg border p-2 text-center"
            >
              <div className={cn('w-2 h-2 rounded-full mx-auto mb-1', stat.color)} />
              <div className="text-sm font-bold">{stat.value}</div>
              <div className="text-[9px] text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mt-2 space-y-1">
        {['Cluster A — Manhattan (8 pts)', 'Cluster B — Brooklyn (12 pts)', 'Cluster C — Queens (6 pts)', 'Cluster D — SoHo (5 pts)', 'Cluster E — UWS (4 pts)'].map((c, i) => (
          <motion.div
            key={c}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 + i * 0.06 }}
            className="flex items-center gap-2 text-[10px] p-1.5 rounded border"
          >
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6'][i] }}
            />
            <span>{c}</span>
          </motion.div>
        ))}
      </div>
    </div>
  </div>
);

const VisualizationDemo = () => (
  <div className="h-full flex flex-col p-4">
    <div className="flex items-center gap-2 mb-3 pb-2 border-b">
      <Flame className="w-4 h-4 text-orange-500" />
      <div className="text-sm font-semibold">Heatmap</div>
    </div>

    <div className="flex-1 space-y-3 overflow-y-auto">
      {[
        { label: 'Radius', value: '25px' },
        { label: 'Blur', value: '15px' },
        { label: 'Weight', value: 'revenue' },
      ].map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.1 }}
          className="flex items-center gap-2 text-xs"
        >
          <span className="w-14 text-muted-foreground">{s.label}</span>
          <div className="flex-1 h-2 bg-slate-100 rounded-full">
            <div className="h-full bg-orange-400 rounded-full" style={{ width: `${40 + i * 20}%` }} />
          </div>
          <span className="font-mono w-16 text-right">{s.value}</span>
        </motion.div>
      ))}

      <div className="mt-2">
        <div className="text-xs font-medium mb-2">Color Scheme</div>
        <div className="space-y-1.5">
          {[
            { label: 'Blue → Red', colors: '#313695,#4575b4,#fee090,#f46d43,#a50026' },
            { label: 'Green → Red', colors: '#1a9850,#66bd63,#fee08b,#f46d43,#d73027' },
            { label: 'Thermal', colors: '#000004,#932667,#dd513a,#fca50a,#fcffa4' },
          ].map((g, i) => (
            <motion.div
              key={g.label}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className={cn(
                'flex items-center gap-2 p-1.5 rounded border cursor-pointer',
                i === 0 ? 'border-primary bg-primary/5' : 'hover:bg-muted'
              )}
            >
              <div
                className="h-3 flex-1 rounded"
                style={{ background: `linear-gradient(to right, ${g.colors})` }}
              />
              <span className="text-[9px] w-16 text-right text-muted-foreground">{g.label}</span>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-3 p-3 rounded-lg bg-slate-50 border"
      >
        <div className="text-[10px] text-muted-foreground text-center">
          🔥 40 weighted points rendered on map
        </div>
      </motion.div>
    </div>
  </div>
);

const RoutingDemo = () => (
  <div className="h-full flex flex-col p-4">
    <div className="flex items-center gap-2 mb-3 pb-2 border-b">
      <Navigation className="w-4 h-4 text-purple-500" />
      <div className="text-sm font-semibold">TSP Optimal Route</div>
      <div className="ml-auto text-xs text-muted-foreground px-2 py-0.5 bg-slate-100 rounded">OSRM</div>
    </div>
    <div className="flex-1 space-y-3 overflow-y-auto">
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Distance', value: '28.4 km', sub: 'road' },
          { label: 'Duration', value: '52 min', sub: 'estimated' },
          { label: 'Stops', value: '12', sub: 'optimized' },
          { label: 'Detour', value: '1.4×', sub: 'vs straight' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08 }}
            className="rounded-lg border p-2 text-center"
          >
            <div className="text-xs font-bold">{s.value}</div>
            <div className="text-[9px] text-muted-foreground">{s.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="text-xs font-medium mt-2">Route Order</div>
      <div className="space-y-1">
        {[
          { name: 'Times Square', dist: '—', color: '#22c55e' },
          { name: 'Midtown East', dist: '2.1 km', color: '#8b5cf6' },
          { name: 'Murray Hill', dist: '1.3 km', color: '#8b5cf6' },
          { name: 'Flatiron', dist: '1.8 km', color: '#8b5cf6' },
          { name: 'SoHo Boutique', dist: '1.5 km', color: '#8b5cf6' },
          { name: 'Financial Dist.', dist: '2.8 km', color: '#ef4444' },
        ].map((stop, i) => (
          <motion.div
            key={stop.name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.06 }}
            className="flex items-center gap-2 text-[10px] p-1.5 rounded border"
          >
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: stop.color }} />
            <span className="flex-1 truncate">{stop.name}</span>
            <span className="text-muted-foreground font-mono">{stop.dist}</span>
          </motion.div>
        ))}
      </div>
    </div>
  </div>
);

const UtilityDemo = () => (
  <div className="h-full flex flex-col p-4">
    <div className="flex items-center gap-2 mb-3 pb-2 border-b">
      <Table2 className="w-4 h-4 text-slate-600" />
      <div className="text-sm font-semibold">Data Table</div>
      <div className="ml-auto text-xs text-muted-foreground px-2 py-0.5 bg-slate-100 rounded">40 rows</div>
    </div>

    <div className="flex-1 border rounded overflow-hidden bg-white">
      <div className="grid grid-cols-4 bg-slate-100 border-b sticky top-0">
        {['name', 'category', 'revenue', 'rating'].map((h) => (
          <div key={h} className="px-2 py-1.5 text-[10px] font-semibold border-r last:border-r-0">{h}</div>
        ))}
      </div>
      {[
        ['Times Square', 'Flagship', '$2.85M', '4.7'],
        ['SoHo Boutique', 'Boutique', '$1.92M', '4.5'],
        ['Brooklyn Hts', 'Cafe', '$980K', '4.3'],
        ['Upper East', 'Premium', '$2.10M', '4.6'],
        ['Chelsea Mkt', 'Pop-up', '$720K', '4.2'],
        ['Williamsburg', 'Flagship', '$2.45M', '4.4'],
        ['Harlem Exp.', 'Express', '$540K', '3.9'],
      ].map((row, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.05 }}
          className="grid grid-cols-4 border-b hover:bg-blue-50 transition-colors"
        >
          {row.map((cell, j) => (
            <div
              key={j}
              className={cn(
                'px-2 py-1.5 text-[10px] border-r last:border-r-0 truncate',
                j >= 2 ? 'text-right font-mono' : ''
              )}
            >
              {cell}
            </div>
          ))}
        </motion.div>
      ))}
    </div>

    <div className="mt-2 flex gap-2">
      <div className="flex-1 p-2 rounded bg-slate-50 border text-center text-[9px] text-muted-foreground">
        📊 Sort by any column
      </div>
      <div className="flex-1 p-2 rounded bg-slate-50 border text-center text-[9px] text-muted-foreground">
        🔍 Search across data
      </div>
    </div>
  </div>
);

// ──────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────
export default function MapAnalysisFeaturePage() {
  const featureKeys = Object.keys(features);
  const [activeFeature, setActiveFeature] = useState(featureKeys[0]);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    if (isHovering) return;
    const interval = setInterval(() => {
      setActiveFeature((current) => {
        const idx = featureKeys.indexOf(current);
        return featureKeys[(idx + 1) % featureKeys.length];
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [isHovering, featureKeys]);

  const currentFeature = features[activeFeature as keyof typeof features];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <FeaturePageHeader title="Map Analysis" />

      <main className="flex-1 p-4 md:p-8 lg:p-12">
        <div className="max-w-6xl mx-auto space-y-16">
          {/* HERO */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold mb-4">
              Turn Location Data into
              <br />
              <span className="text-primary">Actionable Insights</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              31 spatial analysis, visualization, and routing tools—all running in your browser.
              Upload a CSV with coordinates and start discovering patterns instantly.
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>31 Analysis Tools</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>OSRM Road Routing</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>100% Client-Side</span>
              </div>
            </div>
          </div>

          {/* KEY FEATURES */}
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">Everything for Spatial Analysis</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                From quick lookups to advanced multi-criteria scoring—one tool for every location question
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 items-start">
              {/* Feature cards */}
              <div className="space-y-3">
                {Object.entries(features).map(([key, feature]) => (
                  <FeatureCard
                    key={key}
                    feature={feature}
                    featureKey={key}
                    isActive={activeFeature === key}
                    onMouseEnter={() => {
                      setActiveFeature(key);
                      setIsHovering(true);
                    }}
                    onMouseLeave={() => setIsHovering(false)}
                  />
                ))}
              </div>

              {/* Interactive demo */}
              <div className="lg:sticky lg:top-8">
                <div className="bg-white rounded-lg border shadow-lg overflow-hidden">
                  <div className="h-96 relative bg-slate-50">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeFeature}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 flex flex-col"
                      >
                        {activeFeature === 'analysis' && <AnalysisDemo />}
                        {activeFeature === 'visualization' && <VisualizationDemo />}
                        {activeFeature === 'routing' && <RoutingDemo />}
                        {activeFeature === 'utility' && <UtilityDemo />}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Feature details */}
                  <div className="p-6 border-t bg-slate-50">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeFeature}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <currentFeature.icon className="w-5 h-5 text-primary" />
                          {currentFeature.title}
                        </h3>
                        <ul className="space-y-2">
                          {currentFeature.details.map((detail, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* HOW IT WORKS */}
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">How It Works</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                From raw CSV to spatial insights in 4 simple steps
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map((step, idx) => (
                <Card key={idx}>
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4 relative">
                        <step.icon className="w-7 h-7 text-primary" />
                        <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                          {step.number}
                        </div>
                      </div>
                      <h3 className="font-semibold mb-2">{step.title}</h3>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                Most analyses complete in under 5 seconds
              </div>
            </div>
          </section>

          {/* CAPABILITIES */}
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">31 Tools at Your Fingertips</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Comprehensive toolkit for every spatial analysis task
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {capabilities.map((capability, idx) => (
                <Card key={idx}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                        <capability.icon className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="font-semibold">{capability.category}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {capability.items.map((item, itemIdx) => (
                        <span
                          key={itemIdx}
                          className="px-3 py-1 bg-muted rounded-full text-sm text-muted-foreground"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* DATA FORMAT */}
          <section>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-8">
                <div className="flex items-start gap-4 mb-6">
                  <Upload className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Simple Data Format</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Just add latitude and longitude columns to any CSV or Excel file
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-lg border overflow-hidden">
                  <div className="grid grid-cols-5 bg-slate-100 border-b text-xs font-semibold">
                    {['name', 'latitude', 'longitude', 'category', 'revenue'].map((h) => (
                      <div key={h} className="px-3 py-2 border-r last:border-r-0">
                        {h}
                        {(h === 'latitude' || h === 'longitude') && (
                          <span className="ml-1 text-primary">*</span>
                        )}
                      </div>
                    ))}
                  </div>
                  {[
                    ['Times Square', '40.7580', '-73.9855', 'Flagship', '2,850,000'],
                    ['SoHo Boutique', '40.7234', '-73.9985', 'Boutique', '1,920,000'],
                    ['Brooklyn Hts', '40.6959', '-73.9946', 'Cafe', '980,000'],
                  ].map((row, i) => (
                    <div key={i} className="grid grid-cols-5 border-b last:border-b-0 text-xs">
                      {row.map((cell, j) => (
                        <div
                          key={j}
                          className={cn(
                            'px-3 py-2 border-r last:border-r-0',
                            j >= 1 && j <= 2 ? 'font-mono text-primary/70' : '',
                            j === 4 ? 'font-mono text-right' : ''
                          )}
                        >
                          {cell}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid md:grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    CSV, Excel (.xlsx) supported
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    Auto-detects lat/lng columns
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    Extra columns become analysis fields
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* CTA */}
          <Card>
            <CardContent className="text-center py-12">
              <h2 className="text-3xl font-bold mb-4">Ready to Explore Your Location Data?</h2>
              <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                Start analyzing with 31 spatial tools—no installation, no sign-up required.
              </p>
              <div className="flex flex-wrap justify-center gap-4 mb-6">
                <Button size="lg" className="gap-2">
                  <Sparkles className="w-5 h-5" />
                  Start Analyzing
                </Button>
                <Button size="lg" variant="outline" className="gap-2">
                  <MapPin className="w-5 h-5" />
                  Try NYC Sample Data
                </Button>
              </div>
              <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Browser-based (no install)
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  40-point NYC sample included
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Export to CSV & PNG
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
