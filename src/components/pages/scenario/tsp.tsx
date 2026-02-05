"use client";

import React, { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  MapPin, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle,
  Shield, Info, HelpCircle, FileSpreadsheet, FileText,
  Download, TrendingUp, Settings, Activity, ChevronRight,
  Route, Navigation, Target, BarChart3, Play, Zap,
  Clock, Ruler, CircleDot, Map, Compass, LocateFixed, BookOpen
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

// ============ TYPES ============
interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface Location {
  location_id: string;
  name?: string;
  x: number;
  y: number;
  order?: number;
}

interface TSPResult {
  success: boolean;
  results: {
    route: Location[];
    total_distance: number;
    num_locations: number;
    distances: number[];
    metrics: {
      avg_leg_distance: number;
      min_leg_distance: number;
      max_leg_distance: number;
      improvement_vs_naive: number;
    };
  };
  visualizations: {
    route_map?: string;
    distance_chart?: string;
    leg_analysis?: string;
    comparison_chart?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    algorithm: string;
    num_locations: number;
    total_distance: number;
    solve_time_ms: number;
  };
}

// ============ CONSTANTS ============
const ALGORITHMS = [
  { value: "automatic", label: "Automatic", desc: "Let OR-Tools choose best strategy", icon: Zap },
  { value: "greedy", label: "Greedy", desc: "Nearest neighbor heuristic", icon: Navigation },
  { value: "christofides", label: "Christofides", desc: "1.5-approximation algorithm", icon: Route },
  { value: "savings", label: "Savings", desc: "Clarke-Wright savings", icon: TrendingUp },
];

const NODE_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

// ============ SAMPLE DATA ============
const generateSampleData = (): DataRow[] => {
  const cities = [
    { name: 'Headquarters', x: 50, y: 50 },
    { name: 'Client A', x: 20, y: 80 },
    { name: 'Client B', x: 80, y: 90 },
    { name: 'Client C', x: 90, y: 40 },
    { name: 'Client D', x: 70, y: 10 },
    { name: 'Client E', x: 30, y: 20 },
    { name: 'Warehouse', x: 10, y: 50 },
    { name: 'Client F', x: 60, y: 70 },
    { name: 'Client G', x: 40, y: 30 },
    { name: 'Client H', x: 85, y: 65 },
    { name: 'Client I', x: 15, y: 35 },
    { name: 'Client J', x: 55, y: 85 },
  ];
  
  return cities.map((city, idx) => ({
    location_id: `LOC_${String(idx + 1).padStart(3, '0')}`,
    name: city.name,
    x_coord: city.x,
    y_coord: city.y,
    priority: idx === 0 ? 'High' : (Math.random() > 0.7 ? 'High' : 'Normal'),
  }));
};

// ============ UTILITY COMPONENTS ============
const MetricCard: React.FC<{ 
  value: string | number; 
  label: string; 
  negative?: boolean; 
  highlight?: boolean; 
  icon?: React.FC<{ className?: string }> 
}> = ({ value, label, negative, highlight, icon: Icon }) => (
  <div className={`text-center p-4 rounded-lg border ${
    negative ? 'border-destructive/30 bg-destructive/5' : 
    highlight ? 'border-primary/30 bg-primary/5' : 
    'border-border bg-muted/20'
  }`}>
    {Icon && <Icon className={`w-5 h-5 mx-auto mb-2 ${highlight ? 'text-primary' : 'text-muted-foreground'}`} />}
    <p className={`text-2xl font-semibold ${negative ? 'text-destructive' : highlight ? 'text-primary' : ''}`}>{value}</p>
    <p className="text-xs text-muted-foreground mt-1">{label}</p>
  </div>
);

const FindingBox: React.FC<{ finding: string }> = ({ finding }) => (
  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Key Finding</p>
    <p className="font-medium text-foreground">{finding}</p>
  </div>
);

const DetailParagraph: React.FC<{ title?: string; detail: string }> = ({ title, detail }) => (
  <div className="mt-6 p-4 rounded-lg border border-border bg-muted/10">
    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">{title || "Detailed Analysis"}</p>
    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{detail}</p>
  </div>
);

const DataPreview: React.FC<{ data: DataRow[]; columns: string[] }> = ({ data, columns }) => {
  const [expanded, setExpanded] = useState(false);
  
  const downloadCSV = () => {
    const header = columns.join(',');
    const rows = data.map(row => columns.map(col => {
      const val = row[col];
      if (val === null || val === undefined) return '';
      if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
      return val;
    }).join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tsp_locations.csv';
    a.click();
  };
  
  if (data.length === 0) return null;
  
  return (
    <div className="mb-6 border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-muted/20">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 hover:text-primary transition-colors">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Data Preview</span>
          <Badge variant="secondary" className="text-xs">{data.length} locations</Badge>
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={downloadCSV}>
          <Download className="w-3 h-3" />Download
        </Button>
      </div>
      {expanded && (
        <div className="max-h-64 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.slice(0, 5).map(col => (
                  <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 10).map((row, i) => (
                <TableRow key={i}>
                  {columns.slice(0, 5).map(col => (
                    <TableCell key={col} className="text-xs py-1.5">
                      {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.length > 10 && (
            <p className="text-xs text-muted-foreground p-2 text-center">
              Showing first 10 of {data.length} locations
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const ProgressBar: React.FC<{ 
  currentStep: number; 
  hasResults: boolean; 
  onStepClick: (step: number) => void 
}> = ({ currentStep, hasResults, onStepClick }) => {
  const steps = [
    { num: 1, label: "Intro" },
    { num: 2, label: "Config" },
    { num: 3, label: "Validation" },
    { num: 4, label: "Summary" },
    { num: 5, label: "Why" },
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
                isCurrent
                  ? "bg-primary text-primary-foreground"
                  : isCompleted
                    ? "bg-primary/10 text-primary"
                    : isAccessible
                      ? "bg-muted text-muted-foreground hover:bg-muted/80"
                      : "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
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

const RouteStopCard: React.FC<{ 
  location: Location; 
  index: number;
  distance?: number;
  isStart?: boolean;
  isEnd?: boolean;
}> = ({ location, index, distance, isStart, isEnd }) => {
  const color = NODE_COLORS[index % NODE_COLORS.length];
  
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${
      isStart ? 'border-green-500/30 bg-green-500/5' :
      isEnd ? 'border-blue-500/30 bg-blue-500/5' :
      'border-border bg-muted/10'
    }`}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
           style={{ backgroundColor: color }}>
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{location.name || location.location_id}</p>
        <p className="text-xs text-muted-foreground">
          ({location.x.toFixed(1)}, {location.y.toFixed(1)})
        </p>
      </div>
      {distance !== undefined && (
        <div className="text-right">
          <p className="font-semibold text-sm">{distance.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">units</p>
        </div>
      )}
      {isStart && <Badge variant="outline" className="text-xs text-green-600">Start</Badge>}
      {isEnd && <Badge variant="outline" className="text-xs text-blue-600">End</Badge>}
    </div>
  );
};

const StatisticalGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Route className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Traveling Salesman Problem Guide</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              What is TSP?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The Traveling Salesman Problem (TSP) is a classic optimization problem in computer science and operations 
              research. Given a list of locations and the distances between each pair, the goal is to find the shortest 
              possible route that visits each location exactly once and returns to the starting point. Despite its simple 
              formulation, TSP is NP-hard, meaning there's no known polynomial-time algorithm to find the optimal solution 
              for large instances.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Problem Complexity
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Computational Complexity</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Classification:</strong> NP-hard combinatorial optimization problem<br/>
                  <strong>Solution space:</strong> (n-1)! / 2 possible tours for n cities<br/>
                  <strong>Example:</strong> 10 cities = 181,440 possible tours; 20 cities = 60+ quintillion tours<br/>
                  <strong>Implication:</strong> Exact solutions infeasible for large instances
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Exact vs. Approximate Solutions</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Exact methods:</strong> Guarantee optimal solution but exponential time complexity<br/>
                  <strong>Practical limit:</strong> ~100 cities with branch-and-bound, cutting planes<br/>
                  <strong>Heuristics:</strong> Fast approximate solutions, typically within 1-5% of optimal<br/>
                  <strong>Metaheuristics:</strong> Balance solution quality and computation time
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Solution Algorithms
            </h3>
            <div className="space-y-4">
              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">1. Nearest Neighbor (Greedy)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Method:</strong> Start at a city, always visit nearest unvisited city<br/>
                  <strong>Time complexity:</strong> O(n²)<br/>
                  <strong>Quality:</strong> Typically 15-25% worse than optimal<br/>
                  <strong>Use case:</strong> Quick initial solution, small instances
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">2. Christofides Algorithm</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Method:</strong> MST + minimum weight perfect matching + Eulerian circuit<br/>
                  <strong>Guarantee:</strong> At most 1.5× optimal (for metric TSP)<br/>
                  <strong>Time complexity:</strong> O(n³)<br/>
                  <strong>Quality:</strong> Best approximation guarantee for polynomial-time algorithm
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">3. 2-opt Local Search</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Method:</strong> Iteratively remove crossing edges and reconnect<br/>
                  <strong>Process:</strong> Swap pairs of edges until no improvement<br/>
                  <strong>Quality:</strong> Significant improvement over greedy (5-10% from optimal)<br/>
                  <strong>Use case:</strong> Refining initial solutions, medium instances
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">4. OR-Tools (Used Here)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Method:</strong> Guided Local Search with multiple neighborhood operators<br/>
                  <strong>Strategy:</strong> Combines cheapest insertion, 2-opt, 3-opt, Lin-Kernighan<br/>
                  <strong>Quality:</strong> Near-optimal solutions (typically within 2-3% of optimal)<br/>
                  <strong>Speed:</strong> Highly optimized C++ implementation, scales to thousands of cities
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Key Metrics Explained
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Total Distance</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Definition:</strong> Sum of all edge lengths in the tour<br/>
                  <strong>Objective:</strong> Minimize this metric<br/>
                  <strong>Calculation:</strong> Euclidean distance: √[(x₂-x₁)² + (y₂-y₁)²]<br/>
                  <strong>Interpretation:</strong> Lower is better; compare against naive sequential route
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Average Leg Distance</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Formula:</strong> Total distance / Number of legs<br/>
                  <strong>Purpose:</strong> Indicates typical segment length<br/>
                  <strong>Use:</strong> Time estimation, route feasibility assessment<br/>
                  <strong>Benchmark:</strong> Should be similar across legs in well-balanced tour
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Min/Max Leg Distance</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Purpose:</strong> Identify shortest and longest segments<br/>
                  <strong>Analysis:</strong> Large variance suggests uneven geographic distribution<br/>
                  <strong>Action:</strong> Very long legs may indicate isolated locations<br/>
                  <strong>Consideration:</strong> Break or reassign extremely long legs if possible
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Improvement vs. Naive</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Baseline:</strong> Sequential visit in original data order<br/>
                  <strong>Formula:</strong> (Naive distance - Optimized distance) / Naive distance × 100%<br/>
                  <strong>Typical range:</strong> 15-40% improvement for random distributions<br/>
                  <strong>Interpretation:</strong> Higher = greater optimization benefit
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Solve Time</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Definition:</strong> Time taken to find the solution<br/>
                  <strong>Scaling:</strong> Generally increases with problem size<br/>
                  <strong>Trade-off:</strong> Longer solving = potentially better solution<br/>
                  <strong>Practical limit:</strong> Set time limits for very large instances
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Interpretation Guidelines
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Good Solution:</strong> 20%+ improvement over naive, balanced leg distances</p>
              <p><strong>Excellent Solution:</strong> 35%+ improvement, no extremely long isolated legs</p>
              <p><strong>Visual Check:</strong> Route should avoid crossing edges on a map</p>
              <p><strong>Leg Variance:</strong> High variance suggests clustered locations with outliers</p>
              <p><strong>Practical Feasibility:</strong> Longest leg should be completable in available time</p>
              <p><strong>Re-optimization:</strong> Consider if locations change significantly</p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Common Pitfalls & Limitations
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• <strong>Symmetric vs. Asymmetric:</strong> TSP assumes distance(A→B) = distance(B→A)</p>
              <p>• <strong>Triangle Inequality:</strong> Direct route assumed shorter than any detour</p>
              <p>• <strong>Static Problem:</strong> All locations known upfront; real-world may have dynamic changes</p>
              <p>• <strong>No Time Windows:</strong> Basic TSP ignores scheduling constraints</p>
              <p>• <strong>Distance Metric:</strong> Euclidean may not reflect actual travel (roads, terrain)</p>
              <p>• <strong>Local Optimum:</strong> Heuristics may find good but not globally optimal solutions</p>
              <p>• <strong>Scaling Issues:</strong> Computation time grows rapidly with problem size</p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Map className="w-4 h-4" />
              TSP Variants
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Multiple TSP (mTSP)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Multiple salesmen/vehicles cover all cities. Related to Vehicle Routing Problem (VRP).
                  More complex than single TSP, requires load balancing considerations.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">TSP with Time Windows</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Each location must be visited within a specified time window. Common in delivery scheduling.
                  Significantly more constrained than basic TSP.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Asymmetric TSP</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Distance from A to B differs from B to A (one-way streets, elevation changes).
                  More complex than symmetric TSP, fewer solution algorithms available.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Generalized TSP</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Cities grouped into clusters, visit exactly one city per cluster.
                  Useful when multiple service options exist at each location.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Best Practices
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Data Preparation</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Use accurate coordinates (GPS recommended)</li>
                  <li>• Remove duplicate locations</li>
                  <li>• Verify all locations are reachable</li>
                  <li>• Consider geographic constraints</li>
                  <li>• Normalize coordinate scales if needed</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Algorithm Selection</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Small instances (n less than 20): Any algorithm works</li>
                  <li>• Medium (20-100): Use OR-Tools or 2-opt</li>
                  <li>• Large (100-1000): Guided local search</li>
                  <li>• Very large (1000+): Consider clustering first</li>
                  <li>• Real-time: Nearest neighbor + quick 2-opt</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Solution Validation</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Verify all locations visited exactly once</li>
                  <li>• Check for crossing edges (visual inspection)</li>
                  <li>• Compare against baseline (random, greedy)</li>
                  <li>• Run multiple times, pick best solution</li>
                  <li>• Validate with domain experts</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Implementation</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Add buffer time for unexpected delays</li>
                  <li>• Provide turn-by-turn navigation</li>
                  <li>• Allow manual route adjustments</li>
                  <li>• Monitor actual vs. planned performance</li>
                  <li>• Re-optimize when locations change</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Compass className="w-4 h-4" />
              Real-World Applications
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Logistics:</strong> Delivery route planning, package sorting, warehouse picking paths</p>
              <p><strong>Manufacturing:</strong> PCB drilling sequences, robot arm movement, job scheduling</p>
              <p><strong>Transportation:</strong> School bus routes, garbage collection, meter reading</p>
              <p><strong>Tourism:</strong> Multi-city tour itineraries, museum visit sequences</p>
              <p><strong>Field Service:</strong> Technician dispatch, sales representative visits, inspections</p>
              <p><strong>Biology:</strong> DNA sequencing, protein folding studies</p>
              <p><strong>Astronomy:</strong> Telescope observation scheduling</p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Performance Optimization
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">For Small Instances (n less than 50)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Use exact methods or simple heuristics. Solution quality matters more than speed.
                  Christofides algorithm provides good approximation guarantee.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">For Medium Instances (50-500)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  OR-Tools with default settings works well. Consider 2-opt or 3-opt local search.
                  Run multiple times with different random seeds, pick best solution.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">For Large Instances (500+)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Use clustering to create smaller sub-problems. Apply hierarchical approach:
                  solve cluster assignment, then optimize routes within clusters. Consider
                  Lin-Kernighan-Helsgaun (LKH) for best-known heuristic performance.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <LocateFixed className="w-4 h-4" />
              Distance Calculation Methods
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Euclidean Distance (Default)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Formula:</strong> d = √[(x₂-x₁)² + (y₂-y₁)²]<br/>
                  <strong>Pros:</strong> Simple, fast, satisfies triangle inequality<br/>
                  <strong>Cons:</strong> Doesn't account for roads, obstacles, elevation<br/>
                  <strong>Best for:</strong> Aerial routes (drones), theoretical analysis, grid-based problems
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Manhattan Distance</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Formula:</strong> d = |x₂-x₁| + |y₂-y₁|<br/>
                  <strong>Use case:</strong> Grid-based movement (city blocks)<br/>
                  <strong>Example:</strong> Urban delivery with rectilinear street grids
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Haversine (GPS Coordinates)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Purpose:</strong> Great-circle distance on Earth's surface<br/>
                  <strong>Accuracy:</strong> Accounts for Earth's curvature<br/>
                  <strong>Best for:</strong> Long-distance routing with lat/lng coordinates
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Road Network Distance</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Source:</strong> Google Maps API, OpenStreetMap, etc.<br/>
                  <strong>Accuracy:</strong> Reflects actual drivable routes<br/>
                  <strong>Limitation:</strong> Slow for large distance matrices, API costs
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-primary">Remember:</strong> TSP provides mathematically optimal or near-optimal 
              routes based on distance alone. Real-world factors like traffic, time windows, driver preferences, and 
              operational constraints may require manual adjustments. Use TSP solutions as a strong starting point, 
              then refine with practical considerations. The goal is operational efficiency, not just mathematical 
              optimality. Always validate solutions with people who will execute the routes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


const IntroPage: React.FC<{ 
  onLoadSample: () => void; 
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void 
}> = ({ onLoadSample, onFileUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Route className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">Traveling Salesman Problem (TSP)</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Find the shortest route that visits all locations exactly once and returns to the starting point.
          Essential for delivery routing, sales visits, and tour planning.
        </p>
      </div>
      
      {/* 👇 새로운 3개 카드 */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Navigation className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Shortest Path</p>
              <p className="text-xs text-muted-foreground">Optimal route finding</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Compass className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Circuit Completion</p>
              <p className="text-xs text-muted-foreground">Return to start</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Smart Algorithms</p>
              <p className="text-xs text-muted-foreground">Heuristic optimization</p>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-5 h-5 text-primary" />
            When to Use TSP Optimization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary mb-3">Use Cases</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Sales representative visits",
                  "Delivery route planning",
                  "Tourist itinerary optimization",
                  "Inspection route planning",
                  "Drone flight path planning",
                ].map((use) => (
                  <li key={use} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {use}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-primary mb-3">Required Data</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Location ID (unique identifier)",
                  "X coordinate (longitude/position)",
                  "Y coordinate (latitude/position)",
                  "Name (optional, for display)",
                ].map((req) => (
                  <li key={req} className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={onLoadSample} className="gap-2">
              <Activity className="w-4 h-4" />
              Load Sample Data
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
              <Upload className="w-4 h-4" />
              Upload Your Data
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={onFileUpload}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ============ MAIN COMPONENT START ============
export default function TSPPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<TSPResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  
  // Configuration
  const [algorithm, setAlgorithm] = useState<string>("automatic");
  const [locationIdCol, setLocationIdCol] = useState<string>("");
  const [nameCol, setNameCol] = useState<string>("");
  const [xCol, setXCol] = useState<string>("");
  const [yCol, setYCol] = useState<string>("");
  const [returnToStart, setReturnToStart] = useState<boolean>(true);

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    setColumns(Object.keys(sampleData[0]));
    setLocationIdCol("location_id");
    setNameCol("name");
    setXCol("x_coord");
    setYCol("y_coord");
    setCurrentStep(2);
    setResults(null);
    setError(null);
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      setLoading(true);
      const res = await fetch(`${FASTAPI_URL}/api/data/upload`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const result = await res.json();
      setData(result.data);
      setColumns(result.columns);
      setCurrentStep(2);
      setResults(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const getValidationChecks = useCallback((): ValidationCheck[] => {
    const checks: ValidationCheck[] = [
      {
        name: "Data Loaded",
        passed: data.length > 0,
        message: data.length > 0 ? `${data.length} locations loaded` : "No data loaded"
      },
      {
        name: "Location ID Column",
        passed: !!locationIdCol,
        message: locationIdCol ? `Using: ${locationIdCol}` : "Select location ID column"
      },
      {
        name: "X Coordinate Column",
        passed: !!xCol,
        message: xCol ? `Using: ${xCol}` : "Select X coordinate column"
      },
      {
        name: "Y Coordinate Column",
        passed: !!yCol,
        message: yCol ? `Using: ${yCol}` : "Select Y coordinate column"
      },
      {
        name: "Minimum Locations",
        passed: data.length >= 3,
        message: data.length >= 3 ? `${data.length} locations (OK)` : "Need at least 3 locations"
      },
    ];
    
    return checks;
  }, [data, locationIdCol, xCol, yCol]);

  const runOptimization = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        data,
        location_id_col: locationIdCol,
        name_col: nameCol || null,
        x_col: xCol,
        y_col: yCol,
        algorithm: algorithm,
        return_to_start: returnToStart,
      };
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/tsp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Optimization failed");
      }
      
      const result: TSPResult = await res.json();
      setResults(result);
      setCurrentStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Optimization failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!results) return;
    const route = results.results.route;
    
    const rows: string[] = ['Order,Location ID,Name,X,Y,Distance to Next'];
    route.forEach((loc, idx) => {
      const dist = results.results.distances[idx] || 0;
      rows.push(`${idx + 1},${loc.location_id},${loc.name || ''},${loc.x},${loc.y},${dist.toFixed(2)}`);
    });
    
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tsp_route.csv';
    a.click();
  };

  const handleDownloadWord = async () => {
    if (!results) return;
    try {
      const res = await fetch(`/api/export/tsp-docx`, {  // FASTAPI_URL 제거
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          results, 
          algorithm,
          returnToStart
        })
      });
      if (!res.ok) throw new Error("Report generation failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `tsp_optimization_report_${new Date().toISOString().split('T')[0]}.docx`;
      a.click();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Report failed");
    }
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const base64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!base64) return;
    const a = document.createElement('a');
    a.href = `data:image/png;base64,${base64}`;
    a.download = `tsp_${chartKey}.png`;
    a.click();
  };

  // ============ STEP 2: CONFIG ============
  const renderStep2Config = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5 text-primary" />
          Configure TSP
        </CardTitle>
        <CardDescription>
          Algorithm: {ALGORITHMS.find(a => a.value === algorithm)?.label}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Column Mapping */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Column Mapping
          </h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Location ID *</Label>
              <Select value={locationIdCol || "__none__"} onValueChange={v => setLocationIdCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Select --</SelectItem>
                  {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Name (optional)</Label>
              <Select value={nameCol || "__none__"} onValueChange={v => setNameCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Optional --</SelectItem>
                  {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>X Coordinate *</Label>
              <Select value={xCol || "__none__"} onValueChange={v => setXCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Select --</SelectItem>
                  {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Y Coordinate *</Label>
              <Select value={yCol || "__none__"} onValueChange={v => setYCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Select --</SelectItem>
                  {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Options */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            Route Options
          </h4>
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
            <input
              type="checkbox"
              id="returnToStart"
              checked={returnToStart}
              onChange={(e) => setReturnToStart(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="returnToStart" className="text-sm">
              <span className="font-medium">Return to Start</span>
              <p className="text-xs text-muted-foreground">Complete the circuit back to the starting location</p>
            </label>
          </div>
        </div>
        
        {/* Data Preview */}
        {data.length > 0 && (
          <>
            <Separator />
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Data Summary
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-3 rounded-lg border border-border bg-muted/10 text-center">
                  <p className="text-2xl font-semibold">{data.length}</p>
                  <p className="text-xs text-muted-foreground">Locations</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/10 text-center">
                  <p className="text-2xl font-semibold">{data.length - 1}</p>
                  <p className="text-xs text-muted-foreground">Legs</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/10 text-center">
                  <p className="text-2xl font-semibold">{returnToStart ? 'Yes' : 'No'}</p>
                  <p className="text-xs text-muted-foreground">Round Trip</p>
                </div>
              </div>
            </div>
          </>
        )}
        
        <div className="flex justify-end pt-4">
          <Button onClick={() => setCurrentStep(3)} className="gap-2">
            Continue to Validation
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // ============ STEP 3: VALIDATION ============
  const renderStep3Validation = () => {
    const checks = getValidationChecks();
    const canRun = checks.every(c => c.passed);
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="w-5 h-5 text-primary" />
            Data Validation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            {checks.map((check, idx) => (
              <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${
                check.passed ? 'border-border' : 'border-destructive/30 bg-destructive/5'
              }`}>
                <div className="flex items-center gap-3">
                  {check.passed ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <XCircle className="w-5 h-5 text-destructive" />}
                  <div>
                    <p className="font-medium text-sm">{check.name}</p>
                    <p className="text-xs text-muted-foreground">{check.message}</p>
                  </div>
                </div>
                <Badge variant={check.passed ? "secondary" : "destructive"} className="text-xs">
                  {check.passed ? "Pass" : "Required"}
                </Badge>
              </div>
            ))}
          </div>
          
          <div className="p-4 rounded-lg border border-border bg-muted/10">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Configuration Summary</p>
                <p className="text-muted-foreground">
                  {`Algorithm: ${ALGORITHMS.find(a => a.value === algorithm)?.label} • `}
                  {`${data.length} locations • ${returnToStart ? 'Round trip' : 'One way'}`}
                </p>
              </div>
            </div>
          </div>
          
          {error && (
            <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}
          
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(2)}>Back to Config</Button>
            <Button onClick={runOptimization} disabled={loading || !canRun} className="gap-2">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Optimizing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run Optimization
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };
  // ============ STEP 4: SUMMARY ============
  const renderStep4Summary = () => {
    if (!results) return null;
    
    const { summary, results: r, key_insights } = results;
    
    const finding = `Optimal route found visiting ${r.num_locations} locations. Total distance: ${r.total_distance.toFixed(1)} units. Average leg: ${r.metrics.avg_leg_distance.toFixed(1)} units. ${r.metrics.improvement_vs_naive > 0 ? `${r.metrics.improvement_vs_naive.toFixed(0)}% improvement vs naive approach.` : ''}`;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
            TSP Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={r.total_distance.toFixed(1)} label="Total Distance" icon={Ruler} highlight />
            <MetricCard value={r.num_locations} label="Locations" icon={MapPin} />
            <MetricCard value={r.distances.length} label="Legs" icon={Route} />
            <MetricCard value={`${summary.solve_time_ms}ms`} label="Solve Time" icon={Clock} />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={r.metrics.avg_leg_distance.toFixed(1)} label="Avg Leg" />
            <MetricCard value={r.metrics.min_leg_distance.toFixed(1)} label="Min Leg" />
            <MetricCard value={r.metrics.max_leg_distance.toFixed(1)} label="Max Leg" />
            <MetricCard value={`${r.metrics.improvement_vs_naive.toFixed(0)}%`} label="Improvement" icon={TrendingUp} />
          </div>
          
          {/* Route */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Route className="w-4 h-4 text-primary" />
              Optimal Route
            </h4>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {r.route.map((location, idx) => (
                <RouteStopCard 
                  key={idx} 
                  location={location} 
                  index={idx}
                  distance={r.distances[idx]}
                  isStart={idx === 0}
                  isEnd={idx === r.route.length - 1}
                />
              ))}
            </div>
          </div>
          
          {/* Key Insights */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Key Insights</h4>
            {key_insights.map((insight, idx) => (
              <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${
                insight.status === "positive" ? "border-primary/30 bg-primary/5" :
                insight.status === "warning" ? "border-destructive/30 bg-destructive/5" :
                "border-border bg-muted/10"
              }`}>
                {insight.status === "positive" ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> :
                 insight.status === "warning" ? <AlertCircle className="w-5 h-5 text-destructive shrink-0" /> :
                 <Info className="w-5 h-5 text-muted-foreground shrink-0" />}
                <div>
                  <p className="font-medium text-sm">{insight.title}</p>
                  <p className="text-sm text-muted-foreground">{insight.description}</p>
                </div>
              </div>
            ))}
          </div>
          
          <DetailParagraph
            title="Summary Interpretation"
            detail={`This TSP optimization was solved using Google OR-Tools routing library.

■ Problem Overview

• Locations: ${r.num_locations}
• Algorithm: ${summary.algorithm}
• Route Type: ${returnToStart ? 'Round trip (returns to start)' : 'One way'}

■ Solution Quality

• Total Distance: ${r.total_distance.toFixed(2)} units
• Number of Legs: ${r.distances.length}
• Average Leg Distance: ${r.metrics.avg_leg_distance.toFixed(2)} units

■ Leg Analysis

• Shortest Leg: ${r.metrics.min_leg_distance.toFixed(2)} units
• Longest Leg: ${r.metrics.max_leg_distance.toFixed(2)} units
• Variance: ${(r.metrics.max_leg_distance - r.metrics.min_leg_distance).toFixed(2)} units

■ Efficiency

${r.metrics.improvement_vs_naive > 0 ?
`This solution is ${r.metrics.improvement_vs_naive.toFixed(1)}% better than a naive sequential visit.` :
'This is the optimal route found by the algorithm.'}`}
          />
          
          <div className="flex justify-end pt-4">
            <Button onClick={() => setCurrentStep(5)} className="gap-2">
              Understand Results
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ============ STEP 5: WHY ============
  const renderStep5Why = () => {
    if (!results) return null;
    
    const { results: r } = results;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <HelpCircle className="w-5 h-5 text-primary" />
            Understanding the Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding="The Traveling Salesman Problem finds the shortest route visiting all locations exactly once. It's NP-hard, so we use heuristics and metaheuristics for practical solutions." />
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">How TSP Optimization Works</h4>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { num: 1, title: "Distance Matrix", content: "Calculate distances between all pairs of locations. For n locations, this creates an n×n matrix." },
                { num: 2, title: "Initial Solution", content: "Generate a starting route using heuristics like nearest neighbor or cheapest insertion." },
                { num: 3, title: "Local Search", content: "Improve the solution using techniques like 2-opt, 3-opt, or Lin-Kernighan to swap edges." },
                { num: 4, title: "Metaheuristics", content: "Apply simulated annealing, genetic algorithms, or guided local search to escape local optima." },
              ].map((exp) => (
                <div key={exp.num} className="p-4 rounded-lg border border-border bg-muted/10">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">{exp.num}</div>
                    <div>
                      <p className="font-medium text-sm">{exp.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{exp.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <Separator />
          
          {/* Route Analysis */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Leg-by-Leg Analysis</h4>
            <div className="space-y-3">
              {r.route.slice(0, 6).map((location, idx) => {
                if (idx >= r.distances.length) return null;
                const distance = r.distances[idx];
                const isLongest = distance === r.metrics.max_leg_distance;
                const isShortest = distance === r.metrics.min_leg_distance;
                
                return (
                  <div key={idx} className={`p-4 rounded-lg border ${
                    isLongest ? 'border-amber-500/30 bg-amber-500/5' :
                    isShortest ? 'border-green-500/30 bg-green-500/5' :
                    'border-border bg-muted/10'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Leg {idx + 1}: {location.name || location.location_id}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {r.route[idx + 1]?.name || r.route[idx + 1]?.location_id || 'Start'}
                        </span>
                        {isLongest && <Badge variant="outline" className="text-xs text-amber-600">Longest</Badge>}
                        {isShortest && <Badge variant="outline" className="text-xs text-green-600">Shortest</Badge>}
                      </div>
                      <p className="font-semibold">{distance.toFixed(1)} units</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isLongest ? 'This is the longest leg. Consider if intermediate stops could reduce overall distance.' :
                       isShortest ? 'Efficient short hop between nearby locations.' :
                       'Standard leg within the optimized route.'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
          
          <DetailParagraph
            title="Strategic Recommendations"
            detail={`Based on the TSP optimization results, here are recommendations.

■ 1. Route Implementation

Visit order:
${r.route.slice(0, 8).map((loc, i) => `${i + 1}. ${loc.name || loc.location_id} (${loc.x.toFixed(1)}, ${loc.y.toFixed(1)})`).join('\n')}
${r.route.length > 8 ? `... and ${r.route.length - 8} more stops` : ''}

■ 2. Time Estimation

Assuming average speed of 30 units/hour:
• Total travel time: ${(r.total_distance / 30).toFixed(1)} hours
• Add service time at each location for total trip duration

■ 3. Longest Leg Analysis

Longest leg: ${r.metrics.max_leg_distance.toFixed(1)} units
${r.metrics.max_leg_distance > r.metrics.avg_leg_distance * 2 ?
`This leg is significantly longer than average.
Consider:
• Adding an intermediate stop
• Reassigning this visit to another route
• Checking if the location is geographically isolated` :
'The longest leg is within acceptable range.'}

■ 4. Route Variations

For practical implementation:
• Allow flexibility for time windows
• Consider traffic patterns
• Plan for unexpected delays
• Have contingency for cancellations

■ 5. Optimization Tips

• Re-optimize if locations change
• Consider splitting into multiple routes for many locations
• Use real-time traffic data if available
• Account for service time at each stop`}
          />
          
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(4)}>Back to Summary</Button>
            <Button onClick={() => setCurrentStep(6)} className="gap-2">
              View Full Report
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ============ STEP 6: REPORT ============
  const renderStep6Report = () => {
    if (!results) return null;
    
    const { summary, results: r, key_insights, visualizations } = results;

    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b border-border">
          <h1 className="text-xl font-semibold">TSP Optimization Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {summary.algorithm} | {new Date().toLocaleDateString()}
          </p>
        </div>
        
        {/* Executive Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MetricCard value={r.total_distance.toFixed(1)} label="Total Distance" highlight />
              <MetricCard value={r.num_locations} label="Locations" />
              <MetricCard value={`${r.metrics.improvement_vs_naive.toFixed(0)}%`} label="Improvement" />
              <MetricCard value={`${summary.solve_time_ms}ms`} label="Solve Time" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Found optimal route visiting {r.num_locations} locations with total distance of {r.total_distance.toFixed(1)} units.
              Average leg distance: {r.metrics.avg_leg_distance.toFixed(1)} units.
              {r.metrics.improvement_vs_naive > 0 && ` Achieved ${r.metrics.improvement_vs_naive.toFixed(0)}% improvement over naive approach.`}
            </p>
          </CardContent>
        </Card>
        
        {/* Key Insights */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Key Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {key_insights.map((ins, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${
                ins.status === "warning" ? "border-destructive/30 bg-destructive/5" :
                ins.status === "positive" ? "border-primary/30 bg-primary/5" :
                "border-border bg-muted/10"
              }`}>
                {ins.status === "warning" ? <AlertCircle className="w-4 h-4 text-destructive mt-0.5" /> :
                 ins.status === "positive" ? <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" /> :
                 <Info className="w-4 h-4 text-muted-foreground mt-0.5" />}
                <div>
                  <p className="font-medium text-sm">{ins.title}</p>
                  <p className="text-sm text-muted-foreground">{ins.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        
        {/* Visualizations */}
        {visualizations && Object.keys(visualizations).some(k => visualizations[k as keyof typeof visualizations]) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Visualizations</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={Object.keys(visualizations).find(k => visualizations[k as keyof typeof visualizations])}>
                <TabsList className="mb-4 flex-wrap">
                  {visualizations.route_map && <TabsTrigger value="route_map" className="text-xs">Route Map</TabsTrigger>}
                  {visualizations.distance_chart && <TabsTrigger value="distance_chart" className="text-xs">Distances</TabsTrigger>}
                  {visualizations.leg_analysis && <TabsTrigger value="leg_analysis" className="text-xs">Leg Analysis</TabsTrigger>}
                  {visualizations.comparison_chart && <TabsTrigger value="comparison_chart" className="text-xs">Comparison</TabsTrigger>}
                </TabsList>
                {Object.entries(visualizations).map(([key, value]) => value && (
                  <TabsContent key={key} value={key}>
                    <div className="relative border border-border rounded-lg overflow-hidden">
                      <img src={`data:image/png;base64,${value}`} alt={key} className="w-full" />
                      <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => handleDownloadPNG(key)}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        )}
        
        {/* Route Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Route Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Coordinates</TableHead>
                  <TableHead className="text-right">Distance to Next</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.route.map((location, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-medium">{location.name || location.location_id}</TableCell>
                    <TableCell>({location.x.toFixed(1)}, {location.y.toFixed(1)})</TableCell>
                    <TableCell className="text-right">
                      {r.distances[idx] !== undefined ? `${r.distances[idx].toFixed(1)}` : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/20 font-medium">
                  <TableCell colSpan={3}>Total Distance</TableCell>
                  <TableCell className="text-right">{r.total_distance.toFixed(1)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-muted-foreground" />
            Disclaimer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg border border-border bg-muted/10">
            <p className="text-sm text-muted-foreground leading-relaxed">
              This analysis is a decision-making support tool based on statistical models and historical data. 
              Results are probabilistic estimates and actual outcomes may vary due to data quality, market conditions, 
              and other external factors. This information does not guarantee specific results, and all decisions 
              based on this analysis remain the sole responsibility of the user.
            </p>
          </div>
        </CardContent>
      </Card>


        {/* Export */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Export</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleDownloadCSV} className="gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                CSV (Route)
              </Button>
              <Button variant="outline" onClick={handleDownloadWord} className="gap-2">
                <FileText className="w-4 h-4" />
                Word Report
              </Button>
              {Object.entries(visualizations || {}).map(([key, value]) => value && (
                <Button key={key} variant="outline" onClick={() => handleDownloadPNG(key)} className="gap-2">
                  <Download className="w-4 h-4" />
                  {key.replace(/_/g, ' ')}
                </Button>
              ))}
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

  // ============ RENDER ============
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {currentStep > 1 && (
        <div className="flex justify-end mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowGuide(true)} 
            className="gap-2"
          >
            <BookOpen className="w-4 h-4" />
            Guide
          </Button>
        </div>
      )}
      
      <StatisticalGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
      
      {currentStep > 1 && (
        <ProgressBar currentStep={currentStep} hasResults={!!results} onStepClick={setCurrentStep} />
      )}
      
      {currentStep > 1 && data.length > 0 && (
        <DataPreview data={data} columns={columns} />
      )}
      
 {currentStep === 1 && (
  <IntroPage 
    onLoadSample={handleLoadSample} 
    onFileUpload={handleFileUpload} 
  />
)}
      {currentStep === 2 && renderStep2Config()}
      {currentStep === 3 && renderStep3Validation()}
      {currentStep === 4 && renderStep4Summary()}
      {currentStep === 5 && renderStep5Why()}
      {currentStep === 6 && renderStep6Report()}
    </div>
  );
}
