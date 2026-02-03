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
  ShieldAlert, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle,
  Shield, Info, HelpCircle, FileSpreadsheet, FileText,
  Download, TrendingUp, Settings, Activity, ChevronRight,
  Target, BarChart3, Play, Zap, AlertTriangle, Percent,
  Eye, Search, Filter, Clock, MapPin, CreditCard,
  Fingerprint, Bell, Lock, Skull, Flag, Radar,  BookOpen, BookMarked 
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-995604437166.asia-northeast3.run.app";

// ============ TYPES ============
interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface AnomalyRecord {
  id: string | number;
  anomaly_score: number;
  is_anomaly: boolean;
  risk_level: 'critical' | 'high' | 'medium' | 'low';
  top_contributing_features: string[];
}

interface FeatureImportance {
  feature: string;
  importance: number;
  mean_normal: number;
  mean_anomaly: number;
}

interface FDSResult {
  success: boolean;
  results: {
    summary: {
      total_records: number;
      anomaly_count: number;
      anomaly_rate: number;
      critical_count: number;
      high_count: number;
      medium_count: number;
      low_count: number;
      avg_anomaly_score: number;
      threshold: number;
    };
    anomalies: AnomalyRecord[];
    all_scores: { id: string | number; score: number; is_anomaly: boolean }[];
    feature_importance: FeatureImportance[];
    risk_distribution: { level: string; count: number; percent: number }[];
  };
  visualizations: {
    score_distribution?: string;
    feature_importance?: string;
    scatter_plot?: string;
    anomaly_heatmap?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    method: string;
    anomaly_rate: number;
    critical_count: number;
    top_feature: string;
    solve_time_ms: number;
  };
}

// ============ CONSTANTS ============
const DETECTION_METHODS = [
  { value: "iforest", label: "Isolation Forest", desc: "Tree-based, fast for high-dim", icon: Filter },
  { value: "lof", label: "Local Outlier Factor", desc: "Density-based local anomalies", icon: MapPin },
  { value: "knn", label: "KNN Detector", desc: "Distance to k-nearest neighbors", icon: Radar },
  { value: "ocsvm", label: "One-Class SVM", desc: "Support vector boundary", icon: Target },
  { value: "ecod", label: "ECOD", desc: "Empirical CDF based, fast", icon: BarChart3 },
  { value: "copod", label: "COPOD", desc: "Copula-based, parameter-free", icon: Zap },
];

const RISK_COLORS = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#22c55e',
};

// ============ SAMPLE DATA ============
const generateSampleData = (): DataRow[] => {
  const data: DataRow[] = [];
  
  for (let i = 1; i <= 1000; i++) {
    const isAnomaly = Math.random() < 0.05;
    
    let amount = Math.abs(Math.random() * 500 + 50);
    let frequency = Math.floor(Math.random() * 5) + 1;
    let hour = Math.floor(Math.random() * 14) + 8;
    let distance = Math.random() * 50;
    let deviceAge = Math.floor(Math.random() * 365) + 30;
    let velocity = Math.random() * 100 + 10;
    
    if (isAnomaly) {
      const anomalyType = Math.random();
      if (anomalyType < 0.25) {
        amount = Math.random() * 8000 + 3000;
      } else if (anomalyType < 0.45) {
        hour = Math.random() < 0.5 ? Math.floor(Math.random() * 5) : Math.floor(Math.random() * 3) + 22;
      } else if (anomalyType < 0.65) {
        frequency = Math.floor(Math.random() * 25) + 20;
      } else if (anomalyType < 0.85) {
        distance = Math.random() * 800 + 300;
        velocity = Math.random() * 500 + 200;
      } else {
        deviceAge = Math.floor(Math.random() * 3);
      }
    }
    
    data.push({
      transaction_id: `TXN-${String(i).padStart(6, '0')}`,
      amount: parseFloat(amount.toFixed(2)),
      frequency_24h: frequency,
      hour_of_day: hour,
      distance_km: parseFloat(distance.toFixed(1)),
      device_age_days: deviceAge,
      velocity_score: parseFloat(velocity.toFixed(1)),
      is_international: Math.random() < (isAnomaly ? 0.5 : 0.08) ? 1 : 0,
      failed_attempts: isAnomaly ? Math.floor(Math.random() * 4) + 1 : Math.floor(Math.random() * 2),
    });
  }
  
  return data;
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
    {Icon && <Icon className={`w-5 h-5 mx-auto mb-2 ${highlight ? 'text-primary' : negative ? 'text-destructive' : 'text-muted-foreground'}`} />}
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
    a.download = 'fds_data.csv';
    a.click();
  };
  
  if (data.length === 0) return null;
  
  return (
    <div className="mb-6 border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-muted/20">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 hover:text-primary transition-colors">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Data Preview</span>
          <Badge variant="secondary" className="text-xs">{data.length} records</Badge>
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
                {columns.slice(0, 8).map(col => (
                  <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 15).map((row, i) => (
                <TableRow key={i}>
                  {columns.slice(0, 8).map(col => (
                    <TableCell key={col} className="text-xs py-1.5">
                      {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.length > 15 && (
            <p className="text-xs text-muted-foreground p-2 text-center">
              Showing first 15 of {data.length} rows
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

const RiskBadge: React.FC<{ level: string }> = ({ level }) => {
  const config: { [key: string]: { bg: string; text: string; icon: React.FC<{ className?: string }> } } = {
    critical: { bg: 'bg-red-500', text: 'Critical', icon: Skull },
    high: { bg: 'bg-orange-500', text: 'High', icon: AlertTriangle },
    medium: { bg: 'bg-amber-500', text: 'Medium', icon: AlertCircle },
    low: { bg: 'bg-green-500', text: 'Low', icon: CheckCircle2 },
  };
  
  const c = config[level] || config.low;
  const Icon = c.icon;
  
  return (
    <Badge className={`${c.bg} text-white gap-1`}>
      <Icon className="w-3 h-3" />
      {c.text}
    </Badge>
  );
};

const AnomalyScoreBar: React.FC<{ score: number; threshold: number }> = ({ score, threshold }) => {
  const percent = Math.min(score * 100, 100);
  const isAnomaly = score >= threshold;
  
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className={isAnomaly ? 'text-red-500 font-medium' : 'text-muted-foreground'}>
          {(score * 100).toFixed(1)}%
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden relative">
        <div 
          className={`h-full rounded-full transition-all ${isAnomaly ? 'bg-red-500' : 'bg-green-500'}`}
          style={{ width: `${percent}%` }}
        />
        <div 
          className="absolute top-0 h-full w-0.5 bg-gray-600"
          style={{ left: `${threshold * 100}%` }}
        />
      </div>
    </div>
  );
};

const FeatureBar: React.FC<{ feature: FeatureImportance; maxImportance: number }> = ({ feature, maxImportance }) => {
  const width = (feature.importance / maxImportance) * 100;
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{feature.feature}</span>
        <span className="text-muted-foreground">{(feature.importance * 100).toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${width}%` }}
        />
      </div>
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
            <BookMarked className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Anomaly Detection Guide</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              What is Anomaly Detection?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Anomaly detection identifies data points that deviate significantly from normal patterns. In fraud detection, 
              these are transactions or behaviors that are unusual compared to typical activity. The algorithms assign 
              anomaly scores (0-1) where higher scores indicate greater deviation and potential fraud risk.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Detection Algorithms (PyOD Library)
            </h3>
            <div className="space-y-4">
              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">1. Isolation Forest (iForest) - Recommended</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>How it works:</strong> Builds random decision trees. Anomalies are easier to isolate (require fewer splits)<br/>
                  <strong>Complexity:</strong> O(n log n) - very fast<br/>
                  <strong>Pros:</strong> Excellent for high-dimensional data, handles large datasets well, low memory<br/>
                  <strong>Cons:</strong> May miss local anomalies in dense regions<br/>
                  <strong>Best for:</strong> Transaction fraud, network intrusion, general-purpose anomaly detection
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">2. Local Outlier Factor (LOF)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>How it works:</strong> Compares local density of a point to its neighbors. Points in sparse regions are anomalies<br/>
                  <strong>Complexity:</strong> O(n²) - can be slow for large datasets<br/>
                  <strong>Pros:</strong> Excellent for finding local anomalies, good with clustered data<br/>
                  <strong>Cons:</strong> Slow on large datasets, sensitive to k parameter<br/>
                  <strong>Best for:</strong> Credit card fraud (geographic clusters), identity verification
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">3. KNN Detector</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>How it works:</strong> Anomaly score = average distance to k nearest neighbors<br/>
                  <strong>Complexity:</strong> O(n²) with naive implementation<br/>
                  <strong>Pros:</strong> Simple, interpretable, no training required<br/>
                  <strong>Cons:</strong> Slow for large datasets, sensitive to feature scaling<br/>
                  <strong>Best for:</strong> Smaller datasets (below 10K records), when interpretability matters
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">4. One-Class SVM</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>How it works:</strong> Learns a boundary around normal data. Points outside boundary are anomalies<br/>
                  <strong>Complexity:</strong> O(n²) to O(n³) depending on kernel<br/>
                  <strong>Pros:</strong> Works well with few features, theoretically sound<br/>
                  <strong>Cons:</strong> Slow, requires careful parameter tuning, struggles with high dimensions<br/>
                  <strong>Best for:</strong> Low-dimensional problems (below 10 features), well-separated anomalies
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">5. ECOD (Empirical Cumulative Distribution)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>How it works:</strong> Uses empirical CDF to measure outlier-ness per feature, then combines<br/>
                  <strong>Complexity:</strong> O(n log n) - very fast<br/>
                  <strong>Pros:</strong> Parameter-free, interpretable, works well with multimodal data<br/>
                  <strong>Cons:</strong> May miss complex interaction patterns<br/>
                  <strong>Best for:</strong> Quick baseline, when you want parameter-free detection
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">6. COPOD (Copula-Based Outlier Detection)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>How it works:</strong> Uses copula theory to model dependencies between features<br/>
                  <strong>Complexity:</strong> O(n log n) - very fast<br/>
                  <strong>Pros:</strong> Parameter-free, handles correlations well, interpretable<br/>
                  <strong>Cons:</strong> Assumes continuous distributions<br/>
                  <strong>Best for:</strong> When features are correlated, quick detection needed
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Key Concepts
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Anomaly Score</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Range:</strong> 0-1 (0% to 100%)<br/>
                  <strong>Meaning:</strong> Higher score = more anomalous = higher fraud risk<br/>
                  <strong>Interpretation:</strong> 0-30% = normal, 30-50% = suspicious, 50-70% = high risk, 70%+ = critical<br/>
                  <strong>Note:</strong> Scores are relative to the dataset, not absolute probabilities
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Contamination Rate</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Definition:</strong> Expected proportion of anomalies in dataset<br/>
                  <strong>Common values:</strong> 1-5% for fraud (most transactions are legitimate)<br/>
                  <strong>Effect:</strong> Higher contamination = more anomalies flagged = lower threshold<br/>
                  <strong>How to set:</strong> Use historical fraud rate if known, otherwise start with 5% and tune
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Detection Threshold</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Auto-calculated:</strong> Based on contamination rate (e.g., 95th percentile if contamination=5%)<br/>
                  <strong>Manual override:</strong> Can set custom threshold based on business needs<br/>
                  <strong>Trade-off:</strong> Lower threshold = catch more fraud but more false positives<br/>
                  <strong>Tuning:</strong> Start with auto, then adjust based on false positive rate
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Feature Importance</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>What it shows:</strong> Which features contribute most to anomaly scores<br/>
                  <strong>Interpretation:</strong> High importance = feature values deviate significantly in anomalies<br/>
                  <strong>Use case:</strong> Identify fraud patterns (e.g., unusual amounts, timing, locations)<br/>
                  <strong>Note:</strong> Calculated by comparing feature distributions in normal vs anomalous records
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Flag className="w-4 h-4" />
              Risk Level Classification
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Score-based classification:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• <strong className="text-red-500">Critical (above 90%):</strong> Extremely unusual, very high fraud likelihood - immediate review required</li>
                <li>• <strong className="text-orange-500">High (70-90%):</strong> Highly suspicious, strong fraud indicators - priority investigation</li>
                <li>• <strong className="text-amber-500">Medium (50-70%):</strong> Moderately unusual, possible fraud - enhanced monitoring</li>
                <li>• <strong className="text-green-500">Low (below 50% but flagged):</strong> Slightly unusual but above threshold - routine review</li>
              </ul>
              
              <p className="mt-3"><strong>Recommended Actions by Risk Level:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• <strong>Critical:</strong> Block transaction, immediate manual review, contact customer</li>
                <li>• <strong>High:</strong> Hold for review, request additional verification, alert fraud team</li>
                <li>• <strong>Medium:</strong> Enhanced monitoring, may require step-up authentication</li>
                <li>• <strong>Low:</strong> Log for analysis, routine monitoring, no immediate action</li>
              </ul>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Feature Engineering for Fraud Detection
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Effective features for fraud detection:</strong></p>
              
              <p className="mt-2"><strong>Transaction Features:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• <strong>Amount:</strong> Very high or very low (e.g., $9,999 to avoid reporting)</li>
                <li>• <strong>Round numbers:</strong> $5,000, $10,000 (suspicious pattern)</li>
                <li>• <strong>Time of day:</strong> Late night transactions</li>
                <li>• <strong>Day of week:</strong> Unusual weekend activity</li>
              </ul>
              
              <p className="mt-2"><strong>Behavioral Features:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• <strong>Frequency:</strong> Transactions per hour/day (velocity)</li>
                <li>• <strong>Sequence:</strong> Multiple small transactions followed by large one</li>
                <li>• <strong>Failed attempts:</strong> Multiple declined transactions before success</li>
                <li>• <strong>Account age:</strong> New accounts are higher risk</li>
              </ul>
              
              <p className="mt-2"><strong>Geographic Features:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• <strong>Distance:</strong> Transaction location far from registered address</li>
                <li>• <strong>Velocity:</strong> Transactions in multiple cities in short time (impossible travel)</li>
                <li>• <strong>International:</strong> Sudden international transactions</li>
                <li>• <strong>High-risk countries:</strong> Transactions from fraud hotspots</li>
              </ul>
              
              <p className="mt-2"><strong>Device/Channel Features:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• <strong>Device fingerprint:</strong> New or suspicious devices</li>
                <li>• <strong>IP address:</strong> VPN/proxy usage, IP location mismatches</li>
                <li>• <strong>Browser/OS:</strong> Unusual combinations</li>
                <li>• <strong>Channel switch:</strong> Sudden change from app to web</li>
              </ul>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Common Pitfalls & Solutions
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Issue: Too Many False Positives</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Problem:</strong> Legitimate transactions flagged as fraud<br/>
                  <strong>Causes:</strong> Threshold too low, wrong contamination rate<br/>
                  <strong>Solutions:</strong> Increase threshold, lower contamination rate, add more features, use feedback to retrain
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Issue: Missing Known Fraud</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Problem:</strong> Fraudulent transactions not detected<br/>
                  <strong>Causes:</strong> Threshold too high, similar to normal patterns<br/>
                  <strong>Solutions:</strong> Lower threshold, add more discriminative features, try different algorithm (LOF for local patterns)
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Issue: Poor Feature Importance</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Problem:</strong> All features have low importance<br/>
                  <strong>Causes:</strong> Poor feature engineering, features not discriminative<br/>
                  <strong>Solutions:</strong> Add behavioral features (velocity, patterns), include derived features (ratios, deviations)
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Issue: Concept Drift</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Problem:</strong> Model performance degrades over time<br/>
                  <strong>Causes:</strong> Fraud patterns evolve, normal behavior changes<br/>
                  <strong>Solutions:</strong> Retrain monthly with recent data, monitor anomaly rate trends, use online learning
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Best Practices
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Data Preparation</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Scale features (standardization or min-max)</li>
                  <li>• Handle missing values (imputation or removal)</li>
                  <li>• Remove duplicates and data quality issues</li>
                  <li>• Include sufficient normal data (unsupervised learning)</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Algorithm Selection</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Start with Isolation Forest (good default)</li>
                  <li>• Use LOF for geographic/clustered fraud</li>
                  <li>• Try multiple algorithms and ensemble results</li>
                  <li>• Consider data size (LOF slow on large data)</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Threshold Tuning</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Start with auto-calculated threshold</li>
                  <li>• Tune based on false positive rate acceptable to business</li>
                  <li>• Use different thresholds for different risk levels</li>
                  <li>• Monitor and adjust based on feedback</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Production Deployment</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Start in shadow mode (score but don't block)</li>
                  <li>• Gradually increase blocking based on confidence</li>
                  <li>• Implement feedback loop (confirmed fraud)</li>
                  <li>• Set up monitoring and alerting</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Evaluation & Monitoring
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Metrics to track:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• <strong>True Positive Rate (Recall):</strong> % of actual fraud detected</li>
                <li>• <strong>False Positive Rate:</strong> % of legitimate transactions flagged (should be low 1-3%)</li>
                <li>• <strong>Precision:</strong> % of flagged transactions that are actually fraud</li>
                <li>• <strong>F1 Score:</strong> Balance between precision and recall</li>
              </ul>
              
              <p className="mt-3"><strong>Operational monitoring:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• Track anomaly rate over time (should be stable)</li>
                <li>• Monitor false positive feedback from customers</li>
                <li>• Review confirmed fraud cases that were missed</li>
                <li>• Track feature importance shifts (indicates changing patterns)</li>
                <li>• Set up alerts for unusual spikes in anomalies</li>
              </ul>
              
              <p className="mt-3"><strong>When to retrain:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• Monthly or quarterly schedule</li>
                <li>• When false positive rate increases significantly</li>
                <li>• After major fraud pattern changes detected</li>
                <li>• When new fraud types emerge</li>
              </ul>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-primary">Important Note:</strong> Anomaly detection is unsupervised - it finds unusual 
              patterns but cannot guarantee they are fraud. Always combine with rules-based systems, maintain human review 
              for high-risk transactions, and continuously improve with feedback. The goal is to flag suspicious activity 
              for investigation, not to make final fraud determinations automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};



// ============ INTRO PAGE ============
const IntroPage: React.FC<{ 
  method: string;
  setMethod: (method: string) => void;
  onLoadSample: () => void; 
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void 
}> = ({ method, setMethod, onLoadSample, onFileUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  return (
    <div className="space-y-8">
      {/* 제목 */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <ShieldAlert className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">FDS - Anomaly Detection</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Detect fraudulent transactions and anomalies using PyOD algorithms.
          Identify suspicious patterns with machine learning.
        </p>
      </div>
      
      {/* ❌ Algorithm 선택 카드 삭제 */}
      
      {/* 3개 핵심 카드 추가 */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Radar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Anomaly Scoring</p>
              <p className="text-xs text-muted-foreground">0-100% risk scores</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Flag className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Risk Classification</p>
              <p className="text-xs text-muted-foreground">4 risk levels</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Search className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Feature Analysis</p>
              <p className="text-xs text-muted-foreground">Identify key drivers</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* About Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-5 h-5 text-primary" />
            About Anomaly Detection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary mb-3">What You'll Get</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Anomaly scores for each record",
                  "Risk level classification",
                  "Feature importance analysis",
                  "Top contributing factors per anomaly",
                  "Visual score distribution",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-primary mb-3">Required Data</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "ID column (transaction, user, etc.)",
                  "Numeric feature columns",
                  "No missing values (will be imputed)",
                  "Min 100 records recommended",
                  "More features = better detection",
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
      
      {/* 버튼 */}
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
export default function FDSAnomalyDetectionPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<FDSResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false); 
  
  // Configuration
  const [method, setMethod] = useState<string>("iforest");
  const [idCol, setIdCol] = useState<string>("");
  const [featureCols, setFeatureCols] = useState<string[]>([]);
  const [contamination, setContamination] = useState<number>(0.05);
  const [threshold, setThreshold] = useState<number | null>(null);

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    const cols = Object.keys(sampleData[0]);
    setColumns(cols);
    setIdCol("transaction_id");
    setFeatureCols(cols.filter(c => c !== 'transaction_id'));
    setContamination(0.05);
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

  const toggleFeature = (col: string) => {
    if (featureCols.includes(col)) {
      setFeatureCols(featureCols.filter(c => c !== col));
    } else {
      setFeatureCols([...featureCols, col]);
    }
  };

  const getValidationChecks = useCallback((): ValidationCheck[] => {
    return [
      {
        name: "Data Loaded",
        passed: data.length > 0,
        message: data.length > 0 ? `${data.length} records loaded` : "No data loaded"
      },
      {
        name: "ID Column",
        passed: !!idCol,
        message: idCol ? `Using: ${idCol}` : "Select ID column"
      },
      {
        name: "Feature Columns",
        passed: featureCols.length >= 2,
        message: featureCols.length >= 2 ? `${featureCols.length} features selected` : "Select at least 2 features"
      },
      {
        name: "Sufficient Data",
        passed: data.length >= 50,
        message: data.length >= 50 ? `${data.length} records (OK)` : "Recommend at least 50 records"
      },
    ];
  }, [data, idCol, featureCols]);

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        data,
        id_col: idCol,
        feature_cols: featureCols,
        method: method,
        contamination: contamination,
        threshold: threshold,
      };
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/fds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Analysis failed");
      }
      
      const result: FDSResult = await res.json();
      setResults(result);
      setCurrentStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!results) return;
    const { anomalies } = results.results;
    
    const rows: string[] = ['ID,Anomaly Score,Is Anomaly,Risk Level,Top Features'];
    anomalies.forEach(a => {
      rows.push(`${a.id},${a.anomaly_score.toFixed(4)},${a.is_anomaly},${a.risk_level},"${a.top_contributing_features.join('; ')}"`);
    });
    
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'fds_anomalies.csv';
    a.click();
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const base64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!base64) return;
    const a = document.createElement('a');
    a.href = `data:image/png;base64,${base64}`;
    a.download = `fds_${chartKey}.png`;
    a.click();
  };

  // ============ STEP 2: CONFIG ============
  const renderStep2Config = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5 text-primary" />
          Configure Anomaly Detection
        </CardTitle>
        <CardDescription>Set up detection parameters</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 👇 Detection Algorithm 선택 추가 */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            Detection Algorithm
          </h4>
          <div className="grid md:grid-cols-3 gap-3">
            {DETECTION_METHODS.map((m) => (
              <button
                key={m.value}
                onClick={() => setMethod(m.value)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  method === m.value
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <m.icon className="w-5 h-5 text-primary" />
                  <p className="font-medium text-sm">{m.label}</p>
                  {m.value === 'iforest' && (
                    <Badge variant="secondary" className="text-xs">Popular</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <Separator />
        
        {/* Feature Columns */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Feature Columns ({featureCols.length} selected)
          </h4>
          <p className="text-xs text-muted-foreground">Click to toggle. Select numeric features for detection.</p>
          <div className="flex flex-wrap gap-2">
            {columns.filter(c => c !== idCol).map((col) => (
              <button
                key={col}
                onClick={() => toggleFeature(col)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  featureCols.includes(col)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-primary/20"
                }`}
              >
                {col}
              </button>
            ))}
          </div>
        </div>
        
        <Separator />
        
        {/* Detection Parameters */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            Detection Parameters
          </h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Expected Contamination Rate</Label>
              <Select value={String(contamination)} onValueChange={v => setContamination(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.01">1% (Very Few Anomalies)</SelectItem>
                  <SelectItem value="0.03">3%</SelectItem>
                  <SelectItem value="0.05">5% (Default)</SelectItem>
                  <SelectItem value="0.10">10%</SelectItem>
                  <SelectItem value="0.15">15% (Many Anomalies)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Expected % of anomalies in data</p>
            </div>
            <div className="space-y-2">
              <Label>Custom Threshold (Optional)</Label>
              <Input 
                type="number" 
                value={threshold ?? ''} 
                onChange={(e) => setThreshold(e.target.value ? Number(e.target.value) : null)}
                placeholder="Auto-calculated"
                step="0.01"
                min="0"
                max="1"
              />
              <p className="text-xs text-muted-foreground">Override auto threshold (0-1)</p>
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

  // ============ STEP 3: VALIDATION ============
  const renderStep3Validation = () => {
    const checks = getValidationChecks();
    const canRun = checks.slice(0, 3).every(c => c.passed);
    
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
                  {`Algorithm: ${DETECTION_METHODS.find(m => m.value === method)?.label} • `}
                  {`Contamination: ${(contamination * 100).toFixed(0)}% • `}
                  {`${featureCols.length} features`}
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
            <Button onClick={runAnalysis} disabled={loading || !canRun} className="gap-2">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Detecting...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run Detection
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
    
    const finding = `Detected ${r.summary.anomaly_count} anomalies (${(r.summary.anomaly_rate * 100).toFixed(2)}%) out of ${r.summary.total_records} records. ${r.summary.critical_count} critical, ${r.summary.high_count} high risk. Top contributing feature: ${summary.top_feature}.`;

    const maxImportance = Math.max(...r.feature_importance.map(f => f.importance));

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
            Anomaly Detection Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} />
          
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard 
              value={r.summary.anomaly_count} 
              label="Anomalies Detected" 
              icon={AlertTriangle}
              negative={r.summary.anomaly_count > 0}
            />
            <MetricCard 
              value={`${(r.summary.anomaly_rate * 100).toFixed(2)}%`} 
              label="Anomaly Rate" 
              icon={Percent}
            />
            <MetricCard 
              value={r.summary.critical_count} 
              label="Critical Risk" 
              icon={Skull}
              negative={r.summary.critical_count > 0}
            />
            <MetricCard 
              value={r.summary.high_count} 
              label="High Risk" 
              icon={Flag}
              negative={r.summary.high_count > 0}
            />
          </div>
          
          {/* Risk Distribution */}
          <div className="p-4 rounded-lg border border-border bg-muted/10">
            <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Risk Distribution
            </h4>
            <div className="grid grid-cols-4 gap-2">
              {r.risk_distribution.map((rd) => (
                <div key={rd.level} className="text-center p-3 rounded-lg" style={{ 
                  backgroundColor: `${RISK_COLORS[rd.level as keyof typeof RISK_COLORS]}15` 
                }}>
                  <p className="text-2xl font-bold" style={{ color: RISK_COLORS[rd.level as keyof typeof RISK_COLORS] }}>
                    {rd.count}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">{rd.level}</p>
                  <p className="text-xs text-muted-foreground">{rd.percent.toFixed(1)}%</p>
                </div>
              ))}
            </div>
          </div>
          
          {/* Feature Importance */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Feature Importance (Anomaly Contribution)
            </h4>
            <div className="space-y-3">
              {r.feature_importance.slice(0, 8).map((feat) => (
                <FeatureBar key={feat.feature} feature={feat} maxImportance={maxImportance} />
              ))}
            </div>
          </div>
          
          {/* Top Anomalies */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              Top Anomalies (Highest Risk)
            </h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Top Contributing Features</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.anomalies.slice(0, 10).map((a) => (
                  <TableRow key={String(a.id)}>
                    <TableCell className="font-mono text-xs">{String(a.id)}</TableCell>
                    <TableCell>
                      <AnomalyScoreBar score={a.anomaly_score} threshold={r.summary.threshold} />
                    </TableCell>
                    <TableCell>
                      <RiskBadge level={a.risk_level} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {a.top_contributing_features.slice(0, 3).join(', ')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {r.anomalies.length > 10 && (
              <p className="text-xs text-muted-foreground text-center">
                Showing top 10 of {r.anomalies.length} anomalies
              </p>
            )}
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
            detail={`Anomaly detection using ${DETECTION_METHODS.find(m => m.value === method)?.label} algorithm.

■ Detection Summary

• Total Records Analyzed: ${r.summary.total_records.toLocaleString()}
• Anomalies Detected: ${r.summary.anomaly_count} (${(r.summary.anomaly_rate * 100).toFixed(2)}%)
• Detection Threshold: ${(r.summary.threshold * 100).toFixed(2)}%
• Average Anomaly Score: ${(r.summary.avg_anomaly_score * 100).toFixed(2)}%

■ Risk Breakdown

• Critical: ${r.summary.critical_count} (score > 90%)
• High: ${r.summary.high_count} (score 70-90%)
• Medium: ${r.summary.medium_count} (score 50-70%)
• Low: ${r.summary.low_count} (score < 50% but flagged)

■ Top Contributing Features

${r.feature_importance.slice(0, 5).map((f, i) => `${i + 1}. ${f.feature}: ${(f.importance * 100).toFixed(1)}% importance`).join('\n')}

■ Recommended Actions

${r.summary.critical_count > 0 
  ? '⚠️ URGENT: Review critical risk records immediately for potential fraud.'
  : '✓ No critical risk anomalies detected.'}

${r.summary.anomaly_rate > 0.1 
  ? '⚠️ High anomaly rate (>10%) may indicate systemic issues or model tuning needed.'
  : '✓ Anomaly rate within expected range.'}`}
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
            Understanding Anomaly Detection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding="Anomaly detection identifies data points that deviate significantly from normal patterns. Higher anomaly scores indicate greater deviation and potential risk." />
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Detection Algorithms (PyOD)</h4>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { num: 1, title: "Isolation Forest", content: "Isolates anomalies by randomly selecting features and split values. Anomalies require fewer splits to isolate. Fast and effective for high-dimensional data." },
                { num: 2, title: "Local Outlier Factor", content: "Compares local density of a point to its neighbors. Points with lower density than neighbors are anomalies. Good for clustered data." },
                { num: 3, title: "KNN Detector", content: "Uses distance to k-nearest neighbors as anomaly score. Points far from their neighbors are anomalies. Simple but effective." },
                { num: 4, title: "ECOD / COPOD", content: "Statistical methods using empirical CDF or copulas. Parameter-free and very fast. Good baseline detectors." },
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
          
          {/* Risk Level Explanation */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Risk Level Classification</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { level: 'critical', range: '> 90%', action: 'Immediate review', color: RISK_COLORS.critical },
                { level: 'high', range: '70-90%', action: 'Priority review', color: RISK_COLORS.high },
                { level: 'medium', range: '50-70%', action: 'Monitor closely', color: RISK_COLORS.medium },
                { level: 'low', range: '< 50%', action: 'Routine check', color: RISK_COLORS.low },
              ].map((r) => (
                <div key={r.level} className="p-3 rounded-lg border text-center" style={{ borderColor: r.color }}>
                  <p className="font-bold capitalize" style={{ color: r.color }}>{r.level}</p>
                  <p className="text-xs text-muted-foreground">{r.range}</p>
                  <p className="text-xs mt-1">{r.action}</p>
                </div>
              ))}
            </div>
          </div>
          
          <DetailParagraph
            title="Investigation Recommendations"
            detail={`Based on the anomaly detection results:

■ Immediate Actions

${r.summary.critical_count > 0 ? `1. Review ${r.summary.critical_count} critical risk records immediately
2. Cross-reference with other data sources
3. Consider temporary holds if transactions` : '1. No critical items requiring immediate action'}

■ Feature Analysis

Top contributing feature "${r.feature_importance[0]?.feature}" suggests:
${r.feature_importance[0]?.feature.toLowerCase().includes('amount') 
  ? '• Unusual transaction amounts detected\n• Check for round number patterns\n• Compare against historical limits'
  : r.feature_importance[0]?.feature.toLowerCase().includes('time') || r.feature_importance[0]?.feature.toLowerCase().includes('hour')
  ? '• Unusual timing patterns detected\n• Check for after-hours activity\n• Review geographic consistency'
  : r.feature_importance[0]?.feature.toLowerCase().includes('frequency')
  ? '• Unusual frequency patterns detected\n• Check for velocity anomalies\n• Review burst patterns'
  : '• Review values for this feature\n• Compare normal vs anomaly distributions\n• Consider business context'}

■ Model Tuning Suggestions

${r.summary.anomaly_rate > 0.15 
  ? '• Anomaly rate > 15%: Consider lowering contamination parameter\n• May indicate model is too sensitive'
  : r.summary.anomaly_rate < 0.01
  ? '• Anomaly rate < 1%: Consider increasing contamination parameter\n• May be missing some anomalies'
  : '• Anomaly rate looks reasonable\n• Monitor for drift over time'}

■ Ongoing Monitoring

1. Set up alerts for critical/high risk scores
2. Regularly retrain model with confirmed labels
3. Track false positive rate
4. Review feature importance changes over time`}
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
          <h1 className="text-xl font-semibold">Anomaly Detection Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {DETECTION_METHODS.find(m => m.value === method)?.label} | {new Date().toLocaleDateString()}
          </p>
        </div>
        
        {/* Executive Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MetricCard value={r.summary.anomaly_count} label="Anomalies" negative={r.summary.anomaly_count > 0} />
              <MetricCard value={`${(summary.anomaly_rate * 100).toFixed(2)}%`} label="Anomaly Rate" />
              <MetricCard value={summary.critical_count} label="Critical" negative={summary.critical_count > 0} />
              <MetricCard value={`${summary.solve_time_ms}ms`} label="Detection Time" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Analyzed {r.summary.total_records.toLocaleString()} records using {DETECTION_METHODS.find(m => m.value === method)?.label}.
              Detected {r.summary.anomaly_count} anomalies with {r.summary.critical_count} critical and {r.summary.high_count} high risk.
              Primary anomaly indicator: {summary.top_feature}.
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
                  {visualizations.score_distribution && <TabsTrigger value="score_distribution" className="text-xs">Score Distribution</TabsTrigger>}
                  {visualizations.feature_importance && <TabsTrigger value="feature_importance" className="text-xs">Features</TabsTrigger>}
                  {visualizations.scatter_plot && <TabsTrigger value="scatter_plot" className="text-xs">Scatter</TabsTrigger>}
                  {visualizations.anomaly_heatmap && <TabsTrigger value="anomaly_heatmap" className="text-xs">Heatmap</TabsTrigger>}
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
        
        {/* Anomalies Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Detected Anomalies ({r.anomalies.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Top Features</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.anomalies.slice(0, 20).map((a) => (
                  <TableRow key={String(a.id)}>
                    <TableCell className="font-mono text-xs">{String(a.id)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {(a.anomaly_score * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      <RiskBadge level={a.risk_level} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {a.top_contributing_features.slice(0, 3).join(', ')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {r.anomalies.length > 20 && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Showing 20 of {r.anomalies.length} anomalies. Download CSV for full list.
              </p>
            )}
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
                CSV (Anomalies)
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
          <Button variant="outline" onClick={() => setCurrentStep(1)}>New Detection</Button>
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
          method={method}
          setMethod={setMethod}
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