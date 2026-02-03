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
  Truck, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle,
  Shield, Info, HelpCircle, FileSpreadsheet, FileText, BookOpen,
  Download, TrendingUp, Settings, Activity, ChevronRight,
  MapPin, Clock, Package, Route, Navigation, Warehouse,
  Target, BarChart3, Timer, Weight, Play, CircleDot
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-995604437166.asia-northeast3.run.app ";

interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface VehicleRoute {
  vehicle_id: number;
  route_indices: number[];
  route_names: string[];
  total_distance: number;
  total_time: number;
  total_load: number;
  num_stops: number;
}

interface VRPResult {
  success: boolean;
  results: {
    routes: VehicleRoute[];
    total_distance: number;
    total_time: number;
    total_load: number;
    vehicles_used: number;
    unassigned: string[];
    metrics: {
      avg_distance_per_vehicle: number;
      avg_time_per_vehicle: number;
      avg_stops_per_vehicle: number;
      max_distance: number;
      min_distance: number;
      utilization_rate: number;
      distance_balance: number;
    };
  };
  visualizations: {
    route_map?: string;
    vehicle_distances?: string;
    vehicle_loads?: string;
    route_timeline?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    problem_type: string;
    num_locations: number;
    num_vehicles: number;
    depot: string;
    total_distance: number;
    solve_time_ms: number;
  };
}

const PROBLEM_TYPES = [
  { value: "vrp", label: "Basic VRP", desc: "Vehicle Routing Problem", icon: Truck },
  { value: "cvrp", label: "CVRP", desc: "Capacitated VRP", icon: Package },
  //{ value: "vrptw", label: "VRPTW", desc: "VRP with Time Windows", icon: Clock },
];

const VEHICLE_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

// 서울 주요 지역 샘플 데이터
const generateSampleData = (): DataRow[] => {
  const locations = [
    { name: "Depot (Gangnam)", lat: 37.4979, lng: 127.0276, demand: 0, time_start: "08:00", time_end: "20:00" },
    { name: "Hongdae", lat: 37.5563, lng: 126.9220, demand: 15, time_start: "09:00", time_end: "12:00" },
    { name: "Myeongdong", lat: 37.5636, lng: 126.9869, demand: 25, time_start: "10:00", time_end: "14:00" },
    { name: "Itaewon", lat: 37.5345, lng: 126.9946, demand: 10, time_start: "09:00", time_end: "13:00" },
    { name: "Yeouido", lat: 37.5219, lng: 126.9245, demand: 30, time_start: "08:00", time_end: "11:00" },
    { name: "Jamsil", lat: 37.5133, lng: 127.1001, demand: 20, time_start: "11:00", time_end: "15:00" },
    { name: "Sinchon", lat: 37.5598, lng: 126.9425, demand: 12, time_start: "10:00", time_end: "14:00" },
    { name: "Dongdaemun", lat: 37.5712, lng: 127.0095, demand: 18, time_start: "09:00", time_end: "12:00" },
    { name: "Apgujeong", lat: 37.5273, lng: 127.0285, demand: 22, time_start: "10:00", time_end: "15:00" },
    { name: "Seocho", lat: 37.4837, lng: 127.0324, demand: 16, time_start: "08:00", time_end: "12:00" },
    { name: "Mapo", lat: 37.5547, lng: 126.9102, demand: 14, time_start: "09:00", time_end: "13:00" },
    { name: "Songpa", lat: 37.5048, lng: 127.1144, demand: 28, time_start: "10:00", time_end: "16:00" },
    { name: "Nowon", lat: 37.6543, lng: 127.0568, demand: 19, time_start: "08:00", time_end: "11:00" },
    { name: "Gwanak", lat: 37.4784, lng: 126.9516, demand: 11, time_start: "09:00", time_end: "14:00" },
    { name: "Yongsan", lat: 37.5311, lng: 126.9810, demand: 17, time_start: "10:00", time_end: "15:00" },
    { name: "Seongdong", lat: 37.5506, lng: 127.0409, demand: 13, time_start: "11:00", time_end: "16:00" },
    { name: "Gangbuk", lat: 37.6397, lng: 127.0255, demand: 21, time_start: "08:00", time_end: "12:00" },
    { name: "Eunpyeong", lat: 37.6177, lng: 126.9227, demand: 15, time_start: "09:00", time_end: "13:00" },
    { name: "Gangseo", lat: 37.5510, lng: 126.8495, demand: 24, time_start: "08:00", time_end: "14:00" },
    { name: "Guro", lat: 37.4954, lng: 126.8874, demand: 18, time_start: "10:00", time_end: "15:00" },
  ];

  return locations.map((loc, idx) => ({
    location_id: idx,
    name: loc.name,
    latitude: loc.lat,
    longitude: loc.lng,
    demand: loc.demand,
    time_window_start: loc.time_start,
    time_window_end: loc.time_end,
    service_time: idx === 0 ? 0 : 10 + Math.floor(Math.random() * 10),
  }));
};

const MetricCard: React.FC<{ value: string | number; label: string; negative?: boolean; highlight?: boolean; icon?: React.FC<{ className?: string }> }> = ({ value, label, negative, highlight, icon: Icon }) => (
  <div className={`text-center p-4 rounded-lg border ${negative ? 'border-destructive/30 bg-destructive/5' : highlight ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/20'}`}>
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
    a.download = 'vrp_locations.csv';
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
                {columns.slice(0, 7).map(col => (
                  <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 10).map((row, i) => (
                <TableRow key={i}>
                  {columns.slice(0, 7).map(col => (
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

const ProgressBar: React.FC<{ currentStep: number; hasResults: boolean; onStepClick: (step: number) => void }> = ({ currentStep, hasResults, onStepClick }) => {
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

const RouteCard: React.FC<{ route: VehicleRoute; colorIndex: number }> = ({ route, colorIndex }) => {
  const color = VEHICLE_COLORS[colorIndex % VEHICLE_COLORS.length];
  
  return (
    <div className="p-4 rounded-lg border border-border bg-muted/10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold" style={{ backgroundColor: color }}>
            {route.vehicle_id}
          </div>
          <div>
            <p className="font-medium">Vehicle {route.vehicle_id}</p>
            <p className="text-xs text-muted-foreground">{route.num_stops} stops</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold">{route.total_distance.toFixed(1)} km</p>
          <p className="text-xs text-muted-foreground">{route.total_time} min</p>
        </div>
      </div>
      
      <div className="flex items-center gap-1 flex-wrap">
        {route.route_names.map((name, idx) => (
          <React.Fragment key={idx}>
            <Badge 
              variant={idx === 0 || idx === route.route_names.length - 1 ? "default" : "secondary"} 
              className="text-xs"
              style={idx === 0 || idx === route.route_names.length - 1 ? { backgroundColor: color } : {}}
            >
              {name}
            </Badge>
            {idx < route.route_names.length - 1 && (
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
            )}
          </React.Fragment>
        ))}
      </div>
      
      {route.total_load > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Load</span>
            <span className="font-medium">{route.total_load} units</span>
          </div>
        </div>
      )}
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
            <Truck className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Vehicle Routing Problem Guide</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              What is VRP (Vehicle Routing Problem)?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The Vehicle Routing Problem is a classic combinatorial optimization problem that determines optimal 
              routes for a fleet of vehicles to serve a set of customers. VRP aims to minimize total travel distance 
              or time while satisfying constraints such as vehicle capacity, time windows, and ensuring all customers 
              are served. It's widely used in logistics, delivery services, waste collection, and field service operations.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Problem Variants
            </h3>
            <div className="space-y-4">
              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">1. Basic VRP</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Objective:</strong> Minimize total distance traveled by all vehicles<br/>
                  <strong>Constraints:</strong> Each customer visited exactly once, all routes start/end at depot<br/>
                  <strong>Best for:</strong> Service calls, inspections, simple routing without capacity concerns<br/>
                  <strong>Complexity:</strong> NP-hard, exponential growth with location count
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">2. CVRP (Capacitated VRP)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Objective:</strong> Minimize distance while respecting vehicle capacity limits<br/>
                  <strong>Constraints:</strong> Sum of demands on each route cannot exceed vehicle capacity<br/>
                  <strong>Best for:</strong> Delivery, distribution where customers have specific demand quantities<br/>
                  <strong>Key metric:</strong> Load utilization per vehicle
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">3. VRPTW (VRP with Time Windows)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Objective:</strong> Minimize distance while meeting delivery time windows<br/>
                  <strong>Constraints:</strong> Each customer must be served within their specified time window<br/>
                  <strong>Best for:</strong> Scheduled deliveries, appointments, time-sensitive services<br/>
                  <strong>Complexity:</strong> Most constrained, may result in infeasible solutions
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Optimization Methods
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Exact Methods</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Approach:</strong> Branch-and-bound, dynamic programming, integer programming<br/>
                  <strong>Guarantee:</strong> Finds provably optimal solution<br/>
                  <strong>Limitation:</strong> Only practical for small problems (up to 50-100 locations)<br/>
                  <strong>Time complexity:</strong> Exponential, can take hours or days for larger instances
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Heuristic Methods</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Approach:</strong> Nearest Neighbor, Savings Algorithm, Sweep Algorithm<br/>
                  <strong>Advantage:</strong> Fast, simple to implement<br/>
                  <strong>Quality:</strong> Solutions typically 10-30% from optimal<br/>
                  <strong>Use case:</strong> Quick initial solutions, real-time routing
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Metaheuristics (Used in OR-Tools)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Approach:</strong> Guided Local Search, Simulated Annealing, Tabu Search<br/>
                  <strong>Process:</strong> Start with heuristic solution, iteratively improve using neighborhood search<br/>
                  <strong>Quality:</strong> Near-optimal solutions (typically within 2-5% of optimal)<br/>
                  <strong>Speed:</strong> Scalable to hundreds or thousands of locations
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Key Metrics Explained
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Total Distance</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Definition:</strong> Sum of all distances traveled by all vehicles<br/>
                  <strong>Primary objective:</strong> Minimize this metric for cost reduction<br/>
                  <strong>Typical savings:</strong> Optimization reduces distance by 10-30% vs manual planning<br/>
                  <strong>Cost impact:</strong> Direct correlation with fuel costs and vehicle wear
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Vehicles Used</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Definition:</strong> Number of vehicles actually dispatched from available fleet<br/>
                  <strong>Goal:</strong> Minimize to reduce fixed costs (driver wages, vehicle depreciation)<br/>
                  <strong>Trade-off:</strong> Fewer vehicles = longer routes, potential overtime costs<br/>
                  <strong>Benchmark:</strong> 80-95% fleet utilization is typically healthy
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Average Distance per Vehicle</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Formula:</strong> Total distance / Vehicles used<br/>
                  <strong>Purpose:</strong> Indicates workload balance across fleet<br/>
                  <strong>Ideal:</strong> All vehicles have similar average distances (balanced)<br/>
                  <strong>Warning signs:</strong> Large variance suggests inefficient territory division
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Distance Balance Score</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Formula:</strong> Standard deviation of route distances / Average distance<br/>
                  <strong>Range:</strong> 0 (perfectly balanced) to 1+ (highly unbalanced)<br/>
                  <strong>Good:</strong> Below 0.2 indicates well-balanced routes<br/>
                  <strong>Use:</strong> Ensures fairness in driver workload distribution
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Utilization Rate</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Formula:</strong> (Vehicles used / Total available vehicles) × 100%<br/>
                  <strong>Target:</strong> 80-90% for operational efficiency<br/>
                  <strong>Too low:</strong> Excess fleet capacity, unnecessary fixed costs<br/>
                  <strong>Too high:</strong> No buffer for demand spikes or vehicle breakdowns
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
              <p><strong>Well-Balanced Routes:</strong> Distance balance below 0.2 with similar stop counts per vehicle</p>
              <p><strong>High Utilization:</strong> 85%+ vehicles used indicates right-sized fleet</p>
              <p><strong>Low Utilization:</strong> Below 70% suggests opportunity to reduce fleet size</p>
              <p><strong>Unassigned Locations:</strong> Indicates infeasible solution—relax constraints or add vehicles</p>
              <p><strong>Very Short Routes:</strong> May indicate vehicle could take additional stops</p>
              <p><strong>Very Long Routes:</strong> Consider splitting or adding vehicle to reduce driver fatigue</p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Common Pitfalls & Limitations
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• <strong>Computational Complexity:</strong> Solution time grows exponentially with problem size</p>
              <p>• <strong>Real-World Factors:</strong> Traffic, road networks, driver preferences not fully modeled</p>
              <p>• <strong>Dynamic Changes:</strong> Real-time cancellations, new orders require re-optimization</p>
              <p>• <strong>Driver Breaks:</strong> Required rest periods may not be accounted for in basic models</p>
              <p>• <strong>Multi-Day Routes:</strong> Cannot model routes spanning multiple days natively</p>
              <p>• <strong>Depot Timing:</strong> Assumes unlimited time at depot for loading/unloading</p>
              <p>• <strong>Solution Quality:</strong> Metaheuristics find near-optimal, not guaranteed optimal solutions</p>
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
                  <li>• Use accurate GPS coordinates (lat/lng)</li>
                  <li>• Verify demand quantities are realistic</li>
                  <li>• Include service time at each location</li>
                  <li>• Set realistic time windows (not too tight)</li>
                  <li>• Identify correct depot location</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Parameter Tuning</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Start with basic VRP before adding constraints</li>
                  <li>• Set vehicle capacity 10-15% above max expected demand</li>
                  <li>• Allow 10-20% time buffer for delays</li>
                  <li>• Increase solver time for better solutions</li>
                  <li>• Test with different depot locations</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Implementation</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Validate solutions with drivers before deploying</li>
                  <li>• Provide clear turn-by-turn navigation</li>
                  <li>• Track actual vs planned performance</li>
                  <li>• Re-optimize when reality deviates significantly</li>
                  <li>• Build buffer time for unexpected delays</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Performance Monitoring</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Compare planned vs actual distances/times</li>
                  <li>• Track on-time delivery percentage</li>
                  <li>• Monitor fuel consumption per km</li>
                  <li>• Measure driver satisfaction with routes</li>
                  <li>• Analyze cost per delivery</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Route className="w-4 h-4" />
              Distance Calculation Methods
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Haversine Formula (Great-Circle Distance)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Use:</strong> Calculate distance between GPS coordinates<br/>
                  <strong>Accuracy:</strong> Assumes Earth is a perfect sphere, typically 0.3% error<br/>
                  <strong>Advantage:</strong> Fast, no external API calls required<br/>
                  <strong>Limitation:</strong> Ignores roads, terrain, actual drivable routes
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Road Network Distance (Maps API)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Use:</strong> Actual driving distance via road network<br/>
                  <strong>Accuracy:</strong> Reflects real-world routes, typically 1-2% error<br/>
                  <strong>Advantage:</strong> Most accurate for vehicle routing<br/>
                  <strong>Limitation:</strong> Requires API calls, slower, costs per request
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Euclidean Distance</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Formula:</strong> √[(x₂-x₁)² + (y₂-y₁)²]<br/>
                  <strong>Use:</strong> Warehouse/facility routing in grid layouts<br/>
                  <strong>Advantage:</strong> Simplest calculation<br/>
                  <strong>Limitation:</strong> Only accurate for grid-based or small-area routing
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Solution Quality Assessment
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Excellent Solution:</strong> Distance balance below 0.15, utilization 85-95%, all locations assigned</p>
              <p><strong>Good Solution:</strong> Balance below 0.25, utilization 75-90%, minimal unassigned locations</p>
              <p><strong>Acceptable Solution:</strong> Balance below 0.35, utilization 70-85%, few unassigned locations</p>
              <p><strong>Needs Improvement:</strong> Balance above 0.35, utilization below 70%, or many unassigned locations</p>
              <p><strong>Compare to Baseline:</strong> Current manual routes to quantify improvement percentage</p>
              <p><strong>Sanity Check:</strong> Review longest route—is it reasonable for one shift?</p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Warehouse className="w-4 h-4" />
              When to Re-Optimize
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Daily:</strong> New orders, cancellations, or significant volume changes (±15%)</p>
              <p><strong>Weekly:</strong> New customer locations, driver availability changes</p>
              <p><strong>Monthly:</strong> Territory adjustments, seasonal demand patterns</p>
              <p><strong>Quarterly:</strong> Fleet size changes, depot relocations, capacity updates</p>
              <p><strong>Event-Driven:</strong> Vehicle breakdowns, traffic incidents, customer complaints</p>
              <p><strong>Performance-Driven:</strong> Actual performance deviates more than 20% from plan</p>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-primary">Important:</strong> VRP optimization provides mathematical best-case 
              routes but real-world factors matter. Driver experience, local knowledge, customer relationships, and 
              practical constraints may require manual adjustments. Use optimization as a starting point, then refine 
              with operational input. Track actual performance to validate and improve the model over time. The best 
              solution balances mathematical optimality with operational feasibility.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


const IntroPage: React.FC<{ onLoadSample: () => void; onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ onLoadSample, onFileUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Truck className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">Vehicle Routing Problem (VRP)</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Optimize delivery routes for your fleet. Find the most efficient paths to serve all customers
          while minimizing total distance, time, and operational costs.
        </p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-4">
  <div className="p-5 rounded-lg border border-border bg-muted/10">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <Route className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="font-medium">Route Optimization</p>
        <p className="text-xs text-muted-foreground">Minimize total distance</p>
      </div>
    </div>
  </div>

  <div className="p-5 rounded-lg border border-border bg-muted/10">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <BarChart3 className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="font-medium">Fleet Balancing</p>
        <p className="text-xs text-muted-foreground">Distribute workload</p>
      </div>
    </div>
  </div>

  <div className="p-5 rounded-lg border border-border bg-muted/10">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <Target className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="font-medium">Constraint Handling</p>
        <p className="text-xs text-muted-foreground">Capacity & time windows</p>
      </div>
    </div>
  </div>
</div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-5 h-5 text-primary" />
            When to Use VRP Optimization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary mb-3">Requirements</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Location coordinates (lat/lng)",
                  "Depot (starting point)",
                  "Number of vehicles",
                  "Demand per location (optional)",
                  "Time windows (optional)",
                ].map((req) => (
                  <li key={req} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-primary mb-3">Results</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Optimal route for each vehicle",
                  "Total distance & time",
                  "Load balancing across vehicles",
                  "Unassigned locations (if any)",
                ].map((res) => (
                  <li key={res} className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {res}
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

export default function VRPAnalysisPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<VRPResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false); // 이 줄 추가

  
  // Configuration
  const [nameCol, setNameCol] = useState<string>("");
  const [latCol, setLatCol] = useState<string>("");
  const [lngCol, setLngCol] = useState<string>("");
  const [demandCol, setDemandCol] = useState<string>("");
  const [timeStartCol, setTimeStartCol] = useState<string>("");
  const [timeEndCol, setTimeEndCol] = useState<string>("");
  const [serviceTimeCol, setServiceTimeCol] = useState<string>("");
  
  const [problemType, setProblemType] = useState<string>("vrp");
  const [numVehicles, setNumVehicles] = useState<string>("4");
  const [vehicleCapacity, setVehicleCapacity] = useState<string>("100");
  const [depotIndex, setDepotIndex] = useState<string>("0");
  const [maxDistance, setMaxDistance] = useState<string>("");
  const [maxTime, setMaxTime] = useState<string>("");

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    setColumns(Object.keys(sampleData[0]));
    setNameCol("name");
    setLatCol("latitude");
    setLngCol("longitude");
    setDemandCol("demand");
    setTimeStartCol("time_window_start");
    setTimeEndCol("time_window_end");
    setServiceTimeCol("service_time");
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
    const numLocations = data.length;
    const hasCoordinates = latCol && lngCol;
    const vehicles = parseInt(numVehicles) || 0;
    
    const checks: ValidationCheck[] = [
      {
        name: "Data Loaded",
        passed: data.length > 0,
        message: data.length > 0 ? `${numLocations} locations loaded` : "No data loaded"
      },
      {
        name: "Coordinates",
        passed: !!hasCoordinates,
        message: hasCoordinates ? `Lat: ${latCol}, Lng: ${lngCol}` : "Select latitude and longitude columns"
      },
      {
        name: "Vehicles",
        passed: vehicles >= 1,
        message: vehicles >= 1 ? `${vehicles} vehicles configured` : "Set number of vehicles"
      },
      {
        name: "Sufficient Locations",
        passed: numLocations >= 3,
        message: numLocations >= 10 ? `${numLocations} locations (good)` :
                 numLocations >= 3 ? `${numLocations} locations (minimum)` :
                 "Need at least 3 locations"
      }
    ];
    
    if (problemType === "cvrp") {
      checks.push({
        name: "Demand Column",
        passed: !!demandCol,
        message: demandCol ? `Using: ${demandCol}` : "Select demand column for CVRP"
      });
    }
    
    if (problemType === "vrptw") {
      checks.push({
        name: "Time Windows",
        passed: !!timeStartCol && !!timeEndCol,
        message: timeStartCol && timeEndCol ? `Start: ${timeStartCol}, End: ${timeEndCol}` : "Select time window columns for VRPTW"
      });
    }
    
    return checks;
  }, [data, latCol, lngCol, numVehicles, problemType, demandCol, timeStartCol, timeEndCol]);

  const runOptimization = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const payload: any = {
        data,
        name_col: nameCol || null,
        lat_col: latCol,
        lng_col: lngCol,
        demand_col: demandCol || null,
        time_start_col: timeStartCol || null,
        time_end_col: timeEndCol || null,
        service_time_col: serviceTimeCol || null,
        problem_type: problemType,
        num_vehicles: parseInt(numVehicles),
        vehicle_capacity: parseInt(vehicleCapacity) || 100,
        depot_index: parseInt(depotIndex) || 0,
        max_distance: maxDistance ? parseInt(maxDistance) : null,
        max_time: maxTime ? parseInt(maxTime) : null,
      };
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/vrp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Optimization failed");
      }
      
      const result: VRPResult = await res.json();
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
    const routes = results.results.routes;
    
    const rows: string[] = ['Vehicle,Stop Order,Location,Distance (km),Load'];
    routes.forEach(route => {
      route.route_names.forEach((name, idx) => {
        rows.push(`${route.vehicle_id},${idx + 1},${name},${idx === route.route_names.length - 1 ? route.total_distance.toFixed(2) : ''},${route.total_load}`);
      });
    });
    
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'vrp_routes.csv';
    a.click();
  };
  
  const handleDownloadWord = async () => {
    if (!results) return;
    try {
      const res = await fetch("/api/export/vrp-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          results, 
          problemType,
          numVehicles,
          vehicleCapacity
        })
      });
      if (!res.ok) throw new Error("Report generation failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `vrp_optimization_report_${new Date().toISOString().split('T')[0]}.docx`;
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
    a.download = `vrp_${chartKey}.png`;
    a.click();
  };

  // Step 2: Configuration
  const renderStep2Config = () => {
    const locationNames = data.map((d, idx) => ({ idx, name: d[nameCol] || `Location ${idx}` }));
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="w-5 h-5 text-primary" />
            Configure VRP
          </CardTitle>
          <CardDescription>Set up vehicle routing parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Problem Type */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Problem Type
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Basic VRP */}
              <button
                onClick={() => setProblemType('vrp')}
                className={`p-4 rounded-lg border text-left transition-all ${
                  problemType === 'vrp'
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="w-5 h-5 text-primary" />
                  <p className="font-medium">Basic VRP</p>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Vehicle Routing Problem
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong>No capacity limits.</strong> Best for service calls, inspections, or routes without physical goods.
                </p>
              </button>
  
              {/* CVRP */}
              <button
                onClick={() => setProblemType('cvrp')}
                className={`p-4 rounded-lg border text-left transition-all ${
                  problemType === 'cvrp'
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-5 h-5 text-primary" />
                  <p className="font-medium">CVRP</p>
                  <Badge variant="secondary" className="text-xs">Recommended</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Capacitated VRP
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong>Vehicle capacity limits.</strong> Best for deliveries, distribution where each stop has specific demand.
                </p>
              </button>
            </div>
          </div>
          
          <Separator />
          
          {/* Location Columns */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Location Columns
            </h4>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Name Column</Label>
                <Select value={nameCol || "__none__"} onValueChange={v => setNameCol(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- Optional --</SelectItem>
                    {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Latitude *</Label>
                <Select value={latCol || "__none__"} onValueChange={v => setLatCol(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- Select --</SelectItem>
                    {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Longitude *</Label>
                <Select value={lngCol || "__none__"} onValueChange={v => setLngCol(v === "__none__" ? "" : v)}>
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
          
          {/* Vehicle Settings */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary" />
              Vehicle Settings
            </h4>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Number of Vehicles *</Label>
                <Input type="number" min="1" max="20" value={numVehicles} onChange={e => setNumVehicles(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Vehicle Capacity</Label>
                <Input type="number" min="1" value={vehicleCapacity} onChange={e => setVehicleCapacity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Depot (Start Location)</Label>
                <Select value={depotIndex} onValueChange={setDepotIndex}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {locationNames.map(loc => (
                      <SelectItem key={loc.idx} value={String(loc.idx)}>{String(loc.name)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* CVRP Settings */}
          {problemType === "cvrp" && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  Capacity Settings (CVRP)
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Demand Column *</Label>
                    <Select value={demandCol || "__none__"} onValueChange={v => setDemandCol(v === "__none__" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-- Select --</SelectItem>
                        {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </>
          )}
          
          {/* VRPTW Settings */}
          {problemType === "vrptw" && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Time Window Settings (VRPTW)
                </h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Time Window Start *</Label>
                    <Select value={timeStartCol || "__none__"} onValueChange={v => setTimeStartCol(v === "__none__" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-- Select --</SelectItem>
                        {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Time Window End *</Label>
                    <Select value={timeEndCol || "__none__"} onValueChange={v => setTimeEndCol(v === "__none__" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-- Select --</SelectItem>
                        {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Service Time (min)</Label>
                    <Select value={serviceTimeCol || "__none__"} onValueChange={v => setServiceTimeCol(v === "__none__" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-- Optional --</SelectItem>
                        {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </>
          )}
          
          {/* Constraints */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Timer className="w-4 h-4 text-primary" />
              Optional Constraints
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max Distance per Vehicle (km)</Label>
                <Input type="number" placeholder="No limit" value={maxDistance} onChange={e => setMaxDistance(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Max Time per Vehicle (min)</Label>
                <Input type="number" placeholder="No limit" value={maxTime} onChange={e => setMaxTime(e.target.value)} />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <Button onClick={() => setCurrentStep(3)} className="gap-2">
              Continue to Validation
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Step 3: Validation
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
              <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${check.passed ? 'border-border' : 'border-destructive/30 bg-destructive/5'}`}>
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
                  {`Problem: ${PROBLEM_TYPES.find(t => t.value === problemType)?.label} • `}
                  {`${numVehicles} vehicles • ${data.length} locations • `}
                  {`Capacity: ${vehicleCapacity}`}
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

  // Step 4: Summary
  const renderStep4Summary = () => {
    if (!results) return null;
    
    const { summary, results: r, key_insights } = results;
    const routes = r.routes;
    
    const finding = `Optimal routes found for ${r.vehicles_used} vehicles to serve ${summary.num_locations - 1} locations. Total distance: ${r.total_distance.toFixed(1)} km. ${r.unassigned.length > 0 ? `Warning: ${r.unassigned.length} locations could not be assigned.` : 'All locations successfully assigned.'}`;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
            Optimization Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={r.vehicles_used} label="Vehicles Used" icon={Truck} highlight />
            <MetricCard value={`${r.total_distance.toFixed(1)} km`} label="Total Distance" icon={Route} />
            <MetricCard value={`${r.total_time} min`} label="Total Time" icon={Clock} />
            <MetricCard value={`${r.metrics.utilization_rate.toFixed(0)}%`} label="Utilization" icon={BarChart3} />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={`${r.metrics.avg_distance_per_vehicle.toFixed(1)} km`} label="Avg Distance/Vehicle" />
            <MetricCard value={`${r.metrics.avg_stops_per_vehicle.toFixed(1)}`} label="Avg Stops/Vehicle" />
            <MetricCard value={r.total_load} label="Total Load" icon={Package} />
            <MetricCard value={r.unassigned.length} label="Unassigned" negative={r.unassigned.length > 0} />
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Navigation className="w-4 h-4 text-primary" />
              Vehicle Routes
            </h4>
            <div className="grid gap-3">
              {routes.map((route, idx) => (
                <RouteCard key={route.vehicle_id} route={route} colorIndex={idx} />
              ))}
            </div>
          </div>
          
          {r.unassigned.length > 0 && (
            <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
              <h4 className="font-medium text-sm text-destructive mb-2">Unassigned Locations</h4>
              <div className="flex flex-wrap gap-2">
                {r.unassigned.map((loc, idx) => (
                  <Badge key={idx} variant="destructive">{loc}</Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                These locations could not be assigned due to constraints. Consider adding vehicles or relaxing constraints.
              </p>
            </div>
          )}
          
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
            detail={`This VRP optimization used Google OR-Tools to find efficient routes for ${r.vehicles_used} vehicles serving ${summary.num_locations - 1} customer locations from the depot.

■ VRP (Vehicle Routing Problem) Overview
VRP is a combinatorial optimization problem that aims to find the optimal set of routes for a fleet of vehicles to serve a given set of customers.

• Problem Complexity:
  - VRP is NP-hard, meaning optimal solutions become computationally expensive as problem size grows
  - For ${summary.num_locations} locations, there are potentially ${summary.num_locations}! possible route combinations
  - OR-Tools uses advanced heuristics and metaheuristics to find near-optimal solutions efficiently

• Solution Method:
  - Initial solution: Path Cheapest Arc or Christofides algorithm
  - Improvement: Guided Local Search, Simulated Annealing, or Tabu Search
  - Solve time: ${summary.solve_time_ms}ms

■ Results Analysis

【Distance Metrics】
• Total Distance: ${r.total_distance.toFixed(1)} km across all vehicles
• Average per Vehicle: ${r.metrics.avg_distance_per_vehicle.toFixed(1)} km
• Distance Range: ${r.metrics.min_distance.toFixed(1)} - ${r.metrics.max_distance.toFixed(1)} km
• Balance Score: ${r.metrics.distance_balance.toFixed(2)} (lower is more balanced)

【Utilization】
• Vehicles Used: ${r.vehicles_used} out of ${summary.num_vehicles} available
• Utilization Rate: ${r.metrics.utilization_rate.toFixed(1)}%
• Average Stops: ${r.metrics.avg_stops_per_vehicle.toFixed(1)} per vehicle

${r.total_load > 0 ? `【Load Distribution】
• Total Load: ${r.total_load} units
• Vehicle Capacity: ${vehicleCapacity} units each
• Average Load per Vehicle: ${(r.total_load / r.vehicles_used).toFixed(1)} units` : ''}

■ Optimization Quality Assessment
${r.metrics.distance_balance < 0.2 ? '✓ Routes are well-balanced across vehicles' : '△ Routes could be more evenly distributed'}
${r.unassigned.length === 0 ? '✓ All locations successfully assigned' : `⚠ ${r.unassigned.length} locations could not be assigned`}
${r.metrics.utilization_rate > 80 ? '✓ Good vehicle utilization' : '△ Consider reducing number of vehicles'}`}
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

  // Step 5: Why
  const renderStep5Why = () => {
    if (!results) return null;
    
    const { results: r } = results;
    const routes = r.routes;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <HelpCircle className="w-5 h-5 text-primary" />
            Understanding the Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding="VRP optimization finds the most efficient routes by balancing multiple objectives: minimizing total distance, ensuring all customers are served, respecting vehicle capacities, and distributing workload across the fleet." />
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">How VRP Optimization Works</h4>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { num: 1, title: "Distance Matrix", content: "Calculate distances between all location pairs using Haversine formula (for GPS coordinates) or Euclidean distance. This creates an N×N matrix where N is the number of locations." },
                { num: 2, title: "Initial Solution", content: "Generate a starting solution using heuristics like 'Nearest Neighbor' or 'Savings Algorithm'. This provides a baseline that the optimizer will improve upon." },
                { num: 3, title: "Local Search", content: "Apply improvement techniques like 2-opt (swap edges), Or-opt (move sequences), and CROSS exchange to find better solutions in the neighborhood of the current solution." },
                { num: 4, title: "Metaheuristics", content: "Use Guided Local Search, Simulated Annealing, or Tabu Search to escape local optima and explore the solution space more thoroughly." },
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
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Route-by-Route Analysis</h4>
            <div className="space-y-4">
              {routes.map((route, idx) => {
                const isLongest = route.total_distance === r.metrics.max_distance;
                const isShortest = route.total_distance === r.metrics.min_distance;
                const isOverloaded = route.total_load > parseInt(vehicleCapacity) * 0.9;
                
                return (
                  <div key={route.vehicle_id} className={`p-4 rounded-lg border ${isOverloaded ? 'border-amber-500/30 bg-amber-500/5' : 'border-border bg-muted/10'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{ backgroundColor: VEHICLE_COLORS[idx % VEHICLE_COLORS.length] }}>
                          {route.vehicle_id}
                        </div>
                        <span className="font-medium">Vehicle {route.vehicle_id}</span>
                        {isLongest && <Badge variant="outline" className="text-xs">Longest Route</Badge>}
                        {isShortest && <Badge variant="outline" className="text-xs text-primary">Shortest Route</Badge>}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Distance</p>
                        <p className="font-medium">{route.total_distance.toFixed(1)} km</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Time</p>
                        <p className="font-medium">{route.total_time} min</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Stops</p>
                        <p className="font-medium">{route.num_stops}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Load</p>
                        <p className={`font-medium ${isOverloaded ? 'text-amber-600' : ''}`}>{route.total_load} / {vehicleCapacity}</p>
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      {`This vehicle travels ${route.total_distance.toFixed(1)} km to serve ${route.num_stops - 2} customers (excluding depot). `}
                      {isLongest ? 'Consider redistributing stops to balance workload.' : ''}
                      {isShortest && routes.length > 1 ? 'This vehicle could potentially take on more stops.' : ''}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
          
          <DetailParagraph
            title="Strategic Recommendations"
            detail={`Based on the VRP optimization results, here are recommendations for improving your delivery operations.

■ 1. Fleet Utilization

${r.metrics.utilization_rate < 70 ? `【Under-Utilization Detected】
Current utilization is ${r.metrics.utilization_rate.toFixed(0)}%. Consider:
• Reducing fleet size from ${numVehicles} to ${Math.ceil(r.vehicles_used * 1.1)} vehicles
• This could reduce fixed costs by ${((parseInt(numVehicles) - Math.ceil(r.vehicles_used * 1.1)) / parseInt(numVehicles) * 100).toFixed(0)}%
• Keep 1-2 backup vehicles for demand spikes` : `【Good Utilization】
Fleet utilization at ${r.metrics.utilization_rate.toFixed(0)}% is healthy.
• ${r.vehicles_used} out of ${numVehicles} vehicles are actively used
• Consider this baseline when planning for demand growth`}

■ 2. Route Balance

${r.metrics.distance_balance > 0.3 ? `【Imbalanced Routes】
Distance balance score: ${r.metrics.distance_balance.toFixed(2)} (lower is better)
• Longest route: ${r.metrics.max_distance.toFixed(1)} km
• Shortest route: ${r.metrics.min_distance.toFixed(1)} km
• Gap: ${(r.metrics.max_distance - r.metrics.min_distance).toFixed(1)} km

Recommendations:
• Review territory assignments
• Consider driver fairness in scheduling
• Balance may improve with different depot location` : `【Well-Balanced Routes】
Routes are evenly distributed across vehicles.
• Distance variance is low
• Driver workload is fair
• This supports consistent service levels`}

■ 3. Capacity Planning

${r.total_load > 0 ? `【Load Analysis】
• Total demand: ${r.total_load} units
• Average load per vehicle: ${(r.total_load / r.vehicles_used).toFixed(1)} units
• Capacity per vehicle: ${vehicleCapacity} units
• Average utilization: ${(r.total_load / r.vehicles_used / parseInt(vehicleCapacity) * 100).toFixed(0)}% of capacity

${(r.total_load / r.vehicles_used / parseInt(vehicleCapacity)) > 0.85 ? 'Consider larger vehicles or additional trips for demand growth.' : 'Current capacity is adequate with room for growth.'}` : ''}

■ 4. Implementation Tips

【Driver Instructions】
• Provide turn-by-turn navigation for each route
• Include estimated arrival times at each stop
• Note any time-sensitive deliveries first

【Performance Tracking】
• Compare actual vs. planned distances
• Track delivery completion rates
• Monitor average time per stop

【Re-Optimization Triggers】
• New customer locations added
• Demand pattern changes (>15% variance)
• Vehicle availability changes
• Significant traffic pattern changes

■ 5. Cost Implications

Estimated costs based on industry averages:
• Fuel cost (~$0.15/km): $${(r.total_distance * 0.15).toFixed(2)} per day
• Driver time (~$0.50/min): $${(r.total_time * 0.5).toFixed(2)} per day
• Total variable cost: $${(r.total_distance * 0.15 + r.total_time * 0.5).toFixed(2)} per day

Optimization savings potential:
• Well-optimized routes typically save 10-30% vs. manual planning
• This could represent $${((r.total_distance * 0.15 + r.total_time * 0.5) * 0.2).toFixed(2)} daily savings`}
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

  // Step 6: Report
  const renderStep6Report = () => {
    if (!results) return null;
    
    const { summary, results: r, key_insights, visualizations } = results;
    const routes = r.routes;

    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b border-border">
          <h1 className="text-xl font-semibold">VRP Optimization Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {PROBLEM_TYPES.find(t => t.value === problemType)?.label} | {new Date().toLocaleDateString()}
          </p>
        </div>
        
        {/* Executive Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MetricCard value={r.vehicles_used} label="Vehicles" highlight />
              <MetricCard value={`${r.total_distance.toFixed(1)} km`} label="Total Distance" />
              <MetricCard value={summary.num_locations - 1} label="Deliveries" />
              <MetricCard value={`${summary.solve_time_ms}ms`} label="Solve Time" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Optimized {summary.num_locations - 1} delivery locations across {r.vehicles_used} vehicles
              with a total travel distance of {r.total_distance.toFixed(1)} km.
              Average distance per vehicle: {r.metrics.avg_distance_per_vehicle.toFixed(1)} km.
              Fleet utilization: {r.metrics.utilization_rate.toFixed(0)}%.
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
                  {visualizations.vehicle_distances && <TabsTrigger value="vehicle_distances" className="text-xs">Distances</TabsTrigger>}
                  {visualizations.vehicle_loads && <TabsTrigger value="vehicle_loads" className="text-xs">Loads</TabsTrigger>}
                  {visualizations.route_timeline && <TabsTrigger value="route_timeline" className="text-xs">Timeline</TabsTrigger>}
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
        
        {/* Route Details Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Route Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead className="text-right">Stops</TableHead>
                  <TableHead className="text-right">Distance</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                  <TableHead className="text-right">Load</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routes.map((route, idx) => (
                  <TableRow key={route.vehicle_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{ backgroundColor: VEHICLE_COLORS[idx % VEHICLE_COLORS.length] }}>
                          {route.vehicle_id}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-xs truncate">{route.route_names.join(' → ')}</p>
                    </TableCell>
                    <TableCell className="text-right">{route.num_stops}</TableCell>
                    <TableCell className="text-right font-medium">{route.total_distance.toFixed(1)} km</TableCell>
                    <TableCell className="text-right">{route.total_time} min</TableCell>
                    <TableCell className="text-right">{route.total_load}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/20 font-medium">
                  <TableCell colSpan={2}>Total</TableCell>
                  <TableCell className="text-right">{routes.reduce((sum, r) => sum + r.num_stops, 0)}</TableCell>
                  <TableCell className="text-right">{r.total_distance.toFixed(1)} km</TableCell>
                  <TableCell className="text-right">{r.total_time} min</TableCell>
                  <TableCell className="text-right">{r.total_load}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        {/* Detailed Routes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Detailed Stop Sequence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {routes.map((route, idx) => (
                <div key={route.vehicle_id} className="p-4 rounded-lg border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{ backgroundColor: VEHICLE_COLORS[idx % VEHICLE_COLORS.length] }}>
                      {route.vehicle_id}
                    </div>
                    <span className="font-medium">Vehicle {route.vehicle_id}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {route.route_names.map((name, stopIdx) => (
                      <React.Fragment key={stopIdx}>
                        <div className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                          stopIdx === 0 || stopIdx === route.route_names.length - 1 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}>
                          {stopIdx + 1}. {name}
                        </div>
                        {stopIdx < route.route_names.length - 1 && (
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
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
                CSV (Routes)
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
      
      {currentStep === 1 && <IntroPage onLoadSample={handleLoadSample} onFileUpload={handleFileUpload} />}
      {currentStep === 2 && renderStep2Config()}
      {currentStep === 3 && renderStep3Validation()}
      {currentStep === 4 && renderStep4Summary()}
      {currentStep === 5 && renderStep5Why()}
      {currentStep === 6 && renderStep6Report()}
    </div>
  );
}