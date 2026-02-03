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
  Factory, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle,
  Shield, Info, HelpCircle, FileSpreadsheet, FileText,
  Download, TrendingUp, Settings, Activity, ChevronRight,
  Target, BarChart3, Play, Zap, Ruler, Percent,
  AlertTriangle, Award, Gauge, LineChart, Bell, BookOpen, BookMarked
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-995604437166.asia-northeast3.run.app";

// ============ TYPES ============
interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface CapabilityIndices {
  cp: number;
  cpk: number;
  cpl: number;
  cpu: number;
  pp: number;
  ppk: number;
  ppl: number;
  ppu: number;
  cpm?: number;
}

interface ProcessStats {
  mean: number;
  std_within: number;
  std_overall: number;
  min: number;
  max: number;
  range: number;
  n: number;
  subgroup_size: number;
  num_subgroups: number;
}

interface DefectMetrics {
  ppm_total: number;
  ppm_below_lsl: number;
  ppm_above_usl: number;
  percent_out_of_spec: number;
  sigma_level: number;
  yield_percent: number;
}

interface ProcessCapabilityResult {
  success: boolean;
  results: {
    indices: CapabilityIndices;
    stats: ProcessStats;
    defects: DefectMetrics;
    specifications: {
      usl: number;
      lsl: number;
      target?: number;
      tolerance: number;
    };
    normality: {
      shapiro_stat: number;
      shapiro_p: number;
      is_normal: boolean;
    };
    assessment: {
      short_term: string;
      long_term: string;
      recommendation: string;
    };
  };
  visualizations: {
    histogram?: string;
    capability_chart?: string;
    control_chart?: string;
    probability_plot?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    cpk: number;
    ppk: number;
    sigma_level: number;
    assessment: string;
    solve_time_ms: number;
  };
}

// ============ CONSTANTS ============
const CAPABILITY_THRESHOLDS = {
  excellent: 1.67,
  good: 1.33,
  adequate: 1.0,
  poor: 0.67,
};

const COLORS = {
  inSpec: '#22c55e',
  outSpec: '#ef4444',
  target: '#3b82f6',
  lsl: '#f59e0b',
  usl: '#f59e0b',
  distribution: '#8b5cf6',
};

// ============ SAMPLE DATA ============
const generateSampleData = (): DataRow[] => {
  const data: DataRow[] = [];
  const target = 50.0;
  const processStd = 0.8;
  
  // Generate 100 measurements in 20 subgroups of 5
  for (let subgroup = 1; subgroup <= 20; subgroup++) {
    // Slight shift between subgroups to simulate real process variation
    const subgroupShift = (Math.random() - 0.5) * 0.3;
    
    for (let sample = 1; sample <= 5; sample++) {
      const measurement = target + subgroupShift + (Math.random() - 0.5) * 2 * processStd * 1.5;
      
      data.push({
        subgroup: subgroup,
        sample: sample,
        measurement: parseFloat(measurement.toFixed(4)),
        timestamp: new Date(2024, 0, subgroup, 8 + sample).toISOString(),
      });
    }
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
    a.download = 'process_capability_data.csv';
    a.click();
  };
  
  if (data.length === 0) return null;
  
  return (
    <div className="mb-6 border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-muted/20">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 hover:text-primary transition-colors">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Data Preview</span>
          <Badge variant="secondary" className="text-xs">{data.length} measurements</Badge>
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
                {columns.map(col => (
                  <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 15).map((row, i) => (
                <TableRow key={i}>
                  {columns.map(col => (
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

const CapabilityGauge: React.FC<{ 
  value: number; 
  label: string;
  sublabel?: string;
}> = ({ value, label, sublabel }) => {
  const getColor = (val: number) => {
    if (val >= 1.67) return '#22c55e';
    if (val >= 1.33) return '#84cc16';
    if (val >= 1.0) return '#f59e0b';
    if (val >= 0.67) return '#f97316';
    return '#ef4444';
  };
  
  const getAssessment = (val: number) => {
    if (val >= 1.67) return 'Excellent';
    if (val >= 1.33) return 'Good';
    if (val >= 1.0) return 'Adequate';
    if (val >= 0.67) return 'Poor';
    return 'Very Poor';
  };
  
  const color = getColor(value);
  const assessment = getAssessment(value);
  const percentage = Math.min((value / 2) * 100, 100);
  
  return (
    <div className="p-4 rounded-lg border border-border bg-muted/10">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-sm font-medium">{label}</span>
          {sublabel && <span className="text-xs text-muted-foreground ml-1">({sublabel})</span>}
        </div>
        <Badge variant="outline" className="text-xs" style={{ borderColor: color, color }}>
          {assessment}
        </Badge>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${percentage}%`, backgroundColor: color }}
          />
        </div>
        <span className="text-lg font-bold" style={{ color }}>{value.toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-xs mt-1 text-muted-foreground">
        <span>0</span>
        <span className="text-amber-500">1.0</span>
        <span className="text-green-500">1.33</span>
        <span className="text-green-600">2.0</span>
      </div>
    </div>
  );
};

const IndexCard: React.FC<{ 
  index: string; 
  value: number;
  description: string;
  isShortTerm?: boolean;
}> = ({ index, value, description, isShortTerm }) => {
  const getColor = (val: number) => {
    if (val >= 1.33) return 'text-green-500';
    if (val >= 1.0) return 'text-amber-500';
    return 'text-red-500';
  };
  
  return (
    <div className="p-3 rounded-lg border border-border bg-muted/10">
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-sm font-medium">{index}</span>
        <Badge variant="outline" className="text-xs">
          {isShortTerm ? 'Short-term' : 'Long-term'}
        </Badge>
      </div>
      <p className={`text-2xl font-bold ${getColor(value)}`}>{value.toFixed(3)}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
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
            <h2 className="text-lg font-semibold">Process Capability Analysis Guide</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Factory className="w-4 h-4" />
              What is Process Capability?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Process capability analysis measures how well a manufacturing or service process meets customer 
              specifications. It compares the natural variation of your process (what it actually produces) against 
              the tolerance limits (what the customer requires). The result tells you whether your process is capable 
              of consistently meeting requirements without producing defects.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Gauge className="w-4 h-4" />
              Capability Indices Explained
            </h3>
            <div className="space-y-4">
              <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                <p className="font-medium text-sm mb-2">Short-term Indices (Cp, Cpk) - "Within-group" variation</p>
                
                <div className="space-y-3 mt-3">
                  <div className="pl-4 border-l-2 border-primary/30">
                    <p className="font-medium text-xs">Cp (Process Potential)</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <strong>Formula:</strong> Cp = (USL - LSL) / (6σ_within)<br/>
                      <strong>Meaning:</strong> How much of the specification width is consumed by process spread<br/>
                      <strong>Assumption:</strong> Process is perfectly centered at specification midpoint<br/>
                      <strong>Example:</strong> Spec width 4.0, process spread 3.0 → Cp = 4.0/3.0 = 1.33<br/>
                      <strong>Limitation:</strong> Ignores where the process is actually centered
                    </p>
                  </div>

                  <div className="pl-4 border-l-2 border-primary/30">
                    <p className="font-medium text-xs">Cpk (Process Capability)</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <strong>Formula:</strong> Cpk = min[(USL - μ)/(3σ), (μ - LSL)/(3σ)]<br/>
                      <strong>Meaning:</strong> Accounts for both variation AND centering<br/>
                      <strong>Key Insight:</strong> Takes the worse of upper or lower capability<br/>
                      <strong>When Cpk {"<"} Cp:</strong> Process is off-center (not at midpoint)<br/>
                      <strong>When Cpk = Cp:</strong> Process is perfectly centered<br/>
                      <strong>Action:</strong> Use Cpk for decision-making, not Cp
                    </p>
                  </div>

                  <div className="pl-4 border-l-2 border-primary/30">
                    <p className="font-medium text-xs">Cpl and Cpu (One-sided)</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <strong>Cpl:</strong> (μ - LSL) / (3σ) — Capability to meet lower spec<br/>
                      <strong>Cpu:</strong> (USL - μ) / (3σ) — Capability to meet upper spec<br/>
                      <strong>Note:</strong> Cpk = min(Cpl, Cpu) — the limiting factor<br/>
                      <strong>Use:</strong> Identifies which spec limit is at risk
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <p className="font-medium text-sm mb-2">Long-term Indices (Pp, Ppk) - "Overall" variation</p>
                
                <div className="space-y-3 mt-3">
                  <div className="pl-4 border-l-2 border-amber-500/30">
                    <p className="font-medium text-xs">Pp (Process Performance Potential)</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <strong>Formula:</strong> Pp = (USL - LSL) / (6σ_overall)<br/>
                      <strong>Difference from Cp:</strong> Uses overall σ, not within-group σ<br/>
                      <strong>Captures:</strong> All sources of variation including shifts, drifts, time-based changes<br/>
                      <strong>Typically:</strong> Pp {"<"} Cp due to additional long-term variation
                    </p>
                  </div>

                  <div className="pl-4 border-l-2 border-amber-500/30">
                    <p className="font-medium text-xs">Ppk (Process Performance)</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <strong>Formula:</strong> Ppk = min[(USL - μ)/(3σ_overall), (μ - LSL)/(3σ_overall)]<br/>
                      <strong>Meaning:</strong> Real-world capability including all variation<br/>
                      <strong>Use case:</strong> Predicting actual long-term defect rates<br/>
                      <strong>Typically:</strong> Ppk {"<"} Cpk (long-term worse than short-term)
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Cp/Cpk vs Pp/Ppk: When to Use Which?</p>
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aspect</TableHead>
                      <TableHead>Cp/Cpk (Short-term)</TableHead>
                      <TableHead>Pp/Ppk (Long-term)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Variation Source</TableCell>
                      <TableCell>Within subgroups only</TableCell>
                      <TableCell>All variation (within + between)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Time Frame</TableCell>
                      <TableCell>Short-term snapshot</TableCell>
                      <TableCell>Long-term performance</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Assumes</TableCell>
                      <TableCell>Process in statistical control</TableCell>
                      <TableCell>Captures process shifts/drifts</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Use For</TableCell>
                      <TableCell>Process potential, improvement tracking</TableCell>
                      <TableCell>Real-world defect prediction</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Requirement</TableCell>
                      <TableCell>Rational subgrouping needed</TableCell>
                      <TableCell>Overall sample sufficient</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Capability Thresholds and Interpretation
            </h3>
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead>Cpk/Ppk Value</TableHead>
                  <TableHead>Classification</TableHead>
                  <TableHead>Expected PPM</TableHead>
                  <TableHead>Interpretation</TableHead>
                  <TableHead>Action Required</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-green-500/5">
                  <TableCell className="font-medium">≥ 2.0</TableCell>
                  <TableCell className="text-green-600">Excellent</TableCell>
                  <TableCell>~0.002</TableCell>
                  <TableCell>6σ quality level</TableCell>
                  <TableCell>Maintain current process</TableCell>
                </TableRow>
                <TableRow className="bg-green-400/5">
                  <TableCell className="font-medium">1.67-2.0</TableCell>
                  <TableCell className="text-green-600">Excellent</TableCell>
                  <TableCell>~0.6</TableCell>
                  <TableCell>5σ quality, world-class</TableCell>
                  <TableCell>Continue monitoring</TableCell>
                </TableRow>
                <TableRow className="bg-green-300/5">
                  <TableCell className="font-medium">1.33-1.67</TableCell>
                  <TableCell className="text-green-600">Good</TableCell>
                  <TableCell>~64</TableCell>
                  <TableCell>4σ quality, meets requirements</TableCell>
                  <TableCell>Sustain, seek incremental improvement</TableCell>
                </TableRow>
                <TableRow className="bg-amber-500/5">
                  <TableCell className="font-medium">1.0-1.33</TableCell>
                  <TableCell className="text-amber-600">Adequate</TableCell>
                  <TableCell>~2,700</TableCell>
                  <TableCell>Minimally capable</TableCell>
                  <TableCell>Improvement recommended</TableCell>
                </TableRow>
                <TableRow className="bg-orange-500/5">
                  <TableCell className="font-medium">0.67-1.0</TableCell>
                  <TableCell className="text-orange-600">Poor</TableCell>
                  <TableCell>~45,000</TableCell>
                  <TableCell>Not capable, high defect risk</TableCell>
                  <TableCell>Improvement required, 100% inspection</TableCell>
                </TableRow>
                <TableRow className="bg-red-500/5">
                  <TableCell className="font-medium">{"<"} 0.67</TableCell>
                  <TableCell className="text-red-600">Very Poor</TableCell>
                  <TableCell>{">"}300,000</TableCell>
                  <TableCell>Unacceptable</TableCell>
                  <TableCell>Urgent action, process redesign</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <div className="mt-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
              <p className="font-medium text-sm mb-1">Industry Standards:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• <strong>Automotive (IATF 16949):</strong> Cpk ≥ 1.33 for existing process, Cpk ≥ 1.67 for new process</li>
                <li>• <strong>Aerospace:</strong> Cpk ≥ 1.67 typical requirement</li>
                <li>• <strong>Medical Devices:</strong> Cpk ≥ 1.33 minimum, Cpk ≥ 1.67 preferred</li>
                <li>• <strong>General Manufacturing:</strong> Cpk ≥ 1.33 for critical characteristics</li>
                <li>• <strong>Six Sigma Programs:</strong> Target Cpk ≥ 2.0 (6σ level)</li>
              </ul>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Sigma Level and PPM Conversion
            </h3>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Sigma level measures the distance from the process mean to the nearest specification limit, 
                expressed in standard deviations. Higher sigma = better quality = fewer defects.
              </p>

              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead>Sigma Level</TableHead>
                    <TableHead className="text-right">Cpk Equivalent</TableHead>
                    <TableHead className="text-right">PPM Defects</TableHead>
                    <TableHead className="text-right">Yield %</TableHead>
                    <TableHead>Real-World Examples</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">6σ</TableCell>
                    <TableCell className="text-right">2.0</TableCell>
                    <TableCell className="text-right">3.4</TableCell>
                    <TableCell className="text-right">99.99966%</TableCell>
                    <TableCell>Commercial aviation, pacemakers</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">5σ</TableCell>
                    <TableCell className="text-right">1.67</TableCell>
                    <TableCell className="text-right">233</TableCell>
                    <TableCell className="text-right">99.977%</TableCell>
                    <TableCell>Top pharmaceutical manufacturing</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">4σ</TableCell>
                    <TableCell className="text-right">1.33</TableCell>
                    <TableCell className="text-right">6,210</TableCell>
                    <TableCell className="text-right">99.38%</TableCell>
                    <TableCell>Good manufacturing practice</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">3σ</TableCell>
                    <TableCell className="text-right">1.0</TableCell>
                    <TableCell className="text-right">66,807</TableCell>
                    <TableCell className="text-right">93.32%</TableCell>
                    <TableCell>Average process, typical industry</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">2σ</TableCell>
                    <TableCell className="text-right">0.67</TableCell>
                    <TableCell className="text-right">308,537</TableCell>
                    <TableCell className="text-right">69.15%</TableCell>
                    <TableCell>Poor process, frequent problems</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <p className="font-medium text-sm text-amber-600 mb-1">1.5 Sigma Shift</p>
                <p className="text-xs text-muted-foreground">
                  Long-term sigma calculations often include a 1.5σ shift to account for process drift. 
                  This is why "6 Sigma" programs target 3.4 PPM (4.5σ short-term) rather than 0.002 PPM (true 6σ).
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Common Scenarios and Diagnosis
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Scenario 1: Cp {">"} Cpk (Off-Center Process)</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Example:</strong> Cp = 1.8, Cpk = 1.2<br/>
                  <strong>Diagnosis:</strong> Process has sufficient spread (good variation) but is not centered<br/>
                  <strong>Evidence:</strong> Mean is closer to one spec limit than the other<br/>
                  <strong>Solution:</strong> Adjust process mean toward specification midpoint (centering)<br/>
                  <strong>Potential Gain:</strong> Cpk could improve to nearly match Cp (~1.8)<br/>
                  <strong>Action:</strong> Low-cost fix - adjust machine settings, calibration, tooling offset
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Scenario 2: Cp ≈ Cpk {"<"} 1.33 (Centered but Too Much Variation)</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Example:</strong> Cp = 0.9, Cpk = 0.85<br/>
                  <strong>Diagnosis:</strong> Process well-centered but variation too large<br/>
                  <strong>Evidence:</strong> 6σ spread exceeds specification width<br/>
                  <strong>Solution:</strong> Reduce process variation through:<br/>
                  • Better materials (reduce input variation)<br/>
                  • Equipment upgrade (reduce machine variation)<br/>
                  • Process optimization (reduce method variation)<br/>
                  • Operator training (reduce human variation)<br/>
                  <strong>Challenge:</strong> More expensive than centering; requires variation reduction
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Scenario 3: Cpk {">"} Ppk (Process Drifts Over Time)</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Example:</strong> Cpk = 1.5, Ppk = 1.1<br/>
                  <strong>Diagnosis:</strong> Good short-term capability but drifts/shifts occur over time<br/>
                  <strong>Evidence:</strong> Within-subgroup variation smaller than overall variation<br/>
                  <strong>Causes:</strong> Tool wear, temperature changes, material lot variation, setup drift<br/>
                  <strong>Solution:</strong> Implement SPC, frequent adjustments, better process control<br/>
                  <strong>Goal:</strong> Make Ppk approach Cpk (stabilize the process)
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Scenario 4: Cpl ≠ Cpu (One-Sided Risk)</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Example:</strong> Cpl = 1.6, Cpu = 0.9 (Cpk = 0.9)<br/>
                  <strong>Diagnosis:</strong> Process too close to upper spec, plenty of room on lower side<br/>
                  <strong>Evidence:</strong> Most defects will be above USL, not below LSL<br/>
                  <strong>Solution:</strong> Shift mean downward (away from USL toward midpoint)<br/>
                  <strong>Quick Win:</strong> Usually easier to adjust mean than reduce variation
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Prerequisites and Assumptions
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Data Requirements</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• <strong>Sample Size:</strong> Minimum 30 measurements (100+ preferred)</li>
                  <li>• <strong>Time Span:</strong> Should represent typical production conditions</li>
                  <li>• <strong>Subgroups:</strong> 20-25 subgroups of 3-5 samples each for Cp/Cpk</li>
                  <li>• <strong>Measurement:</strong> Continuous variable data (not attribute/count data)</li>
                  <li>• <strong>Stability:</strong> Process should be in statistical control</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Critical Assumptions</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• <strong>Normality:</strong> Data should follow normal distribution</li>
                  <li>• <strong>Independence:</strong> Samples should be independent</li>
                  <li>• <strong>Randomness:</strong> Measurements should be random</li>
                  <li>• <strong>Consistency:</strong> Same measurement system throughout</li>
                  <li>• <strong>Specifications:</strong> USL and LSL must be known and fixed</li>
                </ul>
              </div>
            </div>

            <div className="mt-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
              <p className="font-medium text-sm text-destructive mb-1">⚠️ If Normality Fails:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Check for outliers or data entry errors</li>
                <li>• Consider data transformation (log, Box-Cox)</li>
                <li>• Use non-parametric alternatives</li>
                <li>• Increase sample size (may help approximate normality)</li>
                <li>• Investigate process for special causes</li>
              </ul>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Improvement Strategies by Cpk Level
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                <p className="font-medium text-sm text-red-600">Cpk {"<"} 1.0 - NOT CAPABLE</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Immediate Actions:</strong><br/>
                  1. Implement 100% inspection or sorting<br/>
                  2. Notify quality and production management<br/>
                  3. Determine root causes (centering vs variation)<br/>
                  4. If Cp {">"} Cpk: Center the process immediately<br/>
                  5. If Cp ≈ Cpk: Reduce variation (harder, longer-term)<br/>
                  <strong>Consider:</strong> Process redesign, equipment upgrade, or tighter controls
                </p>
              </div>

              <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <p className="font-medium text-sm text-amber-600">Cpk 1.0-1.33 - MARGINAL</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Improvement Path:</strong><br/>
                  1. Enhanced monitoring with SPC charts<br/>
                  2. Identify and eliminate special causes<br/>
                  3. Tighten process parameter control<br/>
                  4. Review and improve work instructions<br/>
                  5. Increase inspection frequency<br/>
                  <strong>Goal:</strong> Achieve Cpk ≥ 1.33 within 6 months
                </p>
              </div>

              <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/5">
                <p className="font-medium text-sm text-green-600">Cpk ≥ 1.33 - CAPABLE</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Sustaining Actions:</strong><br/>
                  1. Maintain with routine SPC monitoring<br/>
                  2. Document and standardize current methods<br/>
                  3. Periodic capability studies to verify stability<br/>
                  4. Gradual tightening toward 6σ (Cpk ≥ 2.0)<br/>
                  5. Share best practices across organization<br/>
                  <strong>Opportunity:</strong> Widen specs (if customer agrees) or reduce inspection
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
                <p className="font-medium text-sm text-primary mb-1">Study Design</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Conduct when process is stable (in control)</li>
                  <li>• Use representative production conditions</li>
                  <li>• Include multiple operators, shifts, batches</li>
                  <li>• Rational subgrouping (samples close in time/space)</li>
                  <li>• Document all special circumstances</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Analysis & Reporting</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Always check normality before calculating indices</li>
                  <li>• Report both Cp and Cpk (not just one)</li>
                  <li>• Include histogram and control charts</li>
                  <li>• State confidence intervals when critical</li>
                  <li>• Verify measurement system capability (GR&R) first</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Action Planning</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Focus on Cpk, not Cp for decisions</li>
                  <li>• Address centering before variation reduction</li>
                  <li>• Set improvement targets (e.g., Cpk 1.0 → 1.33)</li>
                  <li>• Verify improvements with new capability study</li>
                  <li>• Link to control plan and process FMEA</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Ongoing Management</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Re-study after significant process changes</li>
                  <li>• Annual capability reviews as minimum</li>
                  <li>• Trend Ppk over time (early warning)</li>
                  <li>• Link to customer scorecards and quality KPIs</li>
                  <li>• Use for continuous improvement prioritization</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-primary">Remember:</strong> Process capability is not a one-time study - it's an 
              ongoing management tool. A capable process (Cpk ≥ 1.33) gives you confidence to reduce inspection, 
              increase production rates, and satisfy customers. An incapable process requires immediate action - either 
              center it (quick win) or reduce variation (harder but necessary). Always verify the process is stable 
              before conducting a capability study, and always check normality before trusting the indices. The ultimate 
              goal is not just to measure capability, but to systematically improve it toward Six Sigma levels.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


// ============ INTRO PAGE ============
const IntroPage: React.FC<{ 
  onLoadSample: () => void; 
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void 
}> = ({ onLoadSample, onFileUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const ANALYSIS_TYPES = [
    { value: "short_term", label: "Short-term (Cp/Cpk)", desc: "Within-group variation", icon: Zap },
    { value: "long_term", label: "Long-term (Pp/Ppk)", desc: "Overall variation", icon: LineChart },
    { value: "sigma", label: "Sigma Level", desc: "PPM & yield analysis", icon: Target },
  ];
  
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Factory className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">Process Capability Analysis</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Evaluate how well your process meets customer specifications.
          Calculate Cp, Cpk (short-term) and Pp, Ppk (long-term) indices.
        </p>
      </div>
      
      {/* Analysis Types - 3 column grid */}
      <div className="grid md:grid-cols-3 gap-4">
        {ANALYSIS_TYPES.map((type) => (
          <div key={type.value} className="p-5 rounded-lg border border-border bg-muted/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <type.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{type.label}</p>
                <p className="text-xs text-muted-foreground">{type.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* When to Use */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-5 h-5 text-primary" />
            When to Use Process Capability Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary mb-3">Requirements</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Measurement values column",
                  "Upper Spec Limit (USL)",
                  "Lower Spec Limit (LSL)",
                  "At least 30 samples recommended",
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
                  "Cp, Cpk (short-term capability)",
                  "Pp, Ppk (long-term performance)",
                  "Sigma level and PPM defects",
                  "Normality assessment & charts",
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
      
      {/* Action buttons */}
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
export default function ProcessCapabilityPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<ProcessCapabilityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);  // 👈 이 줄 추가

  // Configuration
  const [measurementCol, setMeasurementCol] = useState<string>("");
  const [subgroupCol, setSubgroupCol] = useState<string>("");
  const [usl, setUsl] = useState<number>(52);
  const [lsl, setLsl] = useState<number>(48);
  const [target, setTarget] = useState<number | null>(50);
  const [subgroupSize, setSubgroupSize] = useState<number>(5);

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    const cols = Object.keys(sampleData[0]);
    setColumns(cols);
    setMeasurementCol("measurement");
    setSubgroupCol("subgroup");
    setUsl(52);
    setLsl(48);
    setTarget(50);
    setSubgroupSize(5);
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
        message: data.length > 0 ? `${data.length} measurements loaded` : "No data loaded"
      },
      {
        name: "Measurement Column",
        passed: !!measurementCol,
        message: measurementCol ? `Using: ${measurementCol}` : "Select measurement column"
      },
      {
        name: "Specification Limits",
        passed: usl > lsl,
        message: usl > lsl ? `LSL: ${lsl}, USL: ${usl}` : "USL must be greater than LSL"
      },
      {
        name: "Sufficient Data",
        passed: data.length >= 30,
        message: data.length >= 30 ? `${data.length} samples (OK)` : "Recommend at least 30 samples"
      },
    ];
    
    if (target !== null) {
      checks.push({
        name: "Target in Range",
        passed: target >= lsl && target <= usl,
        message: target >= lsl && target <= usl ? `Target: ${target}` : "Target should be between LSL and USL"
      });
    }
    
    return checks;
  }, [data, measurementCol, usl, lsl, target]);

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        data,
        measurement_col: measurementCol,
        subgroup_col: subgroupCol || null,
        usl: usl,
        lsl: lsl,
        target: target,
        subgroup_size: subgroupSize,
      };
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/capability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Analysis failed");
      }
      
      const result: ProcessCapabilityResult = await res.json();
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
    const { indices, defects, stats } = results.results;
    
    const rows: string[] = [
      'Metric,Value',
      `Cp,${indices.cp.toFixed(4)}`,
      `Cpk,${indices.cpk.toFixed(4)}`,
      `Cpl,${indices.cpl.toFixed(4)}`,
      `Cpu,${indices.cpu.toFixed(4)}`,
      `Pp,${indices.pp.toFixed(4)}`,
      `Ppk,${indices.ppk.toFixed(4)}`,
      `Ppl,${indices.ppl.toFixed(4)}`,
      `Ppu,${indices.ppu.toFixed(4)}`,
      `Sigma Level,${defects.sigma_level.toFixed(2)}`,
      `PPM Total,${defects.ppm_total.toFixed(0)}`,
      `Yield %,${defects.yield_percent.toFixed(4)}`,
      `Mean,${stats.mean.toFixed(4)}`,
      `Std (Within),${stats.std_within.toFixed(4)}`,
      `Std (Overall),${stats.std_overall.toFixed(4)}`,
    ];
    
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'capability_analysis.csv';
    a.click();
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const base64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!base64) return;
    const a = document.createElement('a');
    a.href = `data:image/png;base64,${base64}`;
    a.download = `capability_${chartKey}.png`;
    a.click();
  };

  // ============ STEP 2: CONFIG ============
  const renderStep2Config = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5 text-primary" />
          Configure Process Capability Study
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Measurement Column */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Measurement Column
          </h4>
          <Select value={measurementCol || "__none__"} onValueChange={v => setMeasurementCol(v === "__none__" ? "" : v)}>
            <SelectTrigger className="w-full md:w-1/2">
              <SelectValue placeholder="Select measurement column..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">-- Select --</SelectItem>
              {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        
        <Separator />
        
        {/* Specification Limits */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Ruler className="w-4 h-4 text-primary" />
            Specification Limits
          </h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Lower Spec Limit (LSL) *</Label>
              <Input 
                type="number" 
                value={lsl} 
                onChange={(e) => setLsl(Number(e.target.value))}
                step="any"
              />
            </div>
            <div className="space-y-2">
              <Label>Target (Optional)</Label>
              <Input 
                type="number" 
                value={target ?? ''} 
                onChange={(e) => setTarget(e.target.value ? Number(e.target.value) : null)}
                placeholder="Optional"
                step="any"
              />
            </div>
            <div className="space-y-2">
              <Label>Upper Spec Limit (USL) *</Label>
              <Input 
                type="number" 
                value={usl} 
                onChange={(e) => setUsl(Number(e.target.value))}
                step="any"
              />
            </div>
          </div>
          {usl > lsl && (
            <p className="text-sm text-muted-foreground">
              Tolerance: {(usl - lsl).toFixed(4)} | Midpoint: {((usl + lsl) / 2).toFixed(4)}
            </p>
          )}
        </div>
        
        <Separator />
        
        {/* Subgroup Settings */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            Subgroup Settings (for Cp/Cpk)
          </h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Subgroup Column (Optional)</Label>
              <Select value={subgroupCol || "__none__"} onValueChange={v => setSubgroupCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Optional..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- None (use size below) --</SelectItem>
                  {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subgroup Size (if no column)</Label>
              <Input 
                type="number" 
                value={subgroupSize} 
                onChange={(e) => setSubgroupSize(Number(e.target.value))}
                min={2}
                max={25}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Subgroups are used to estimate within-group variation for Cp/Cpk calculations.
            If no subgroup column, data will be split into groups of specified size.
          </p>
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
    const canRun = checks.filter(c => c.name !== "Sufficient Data" && c.name !== "Target in Range").every(c => c.passed);
    
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
                  {check.passed ? "Pass" : "Check"}
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
                  {`LSL: ${lsl} | USL: ${usl} | Tolerance: ${(usl - lsl).toFixed(4)}`}
                  {target !== null && ` | Target: ${target}`}
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
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run Analysis
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
    
    const finding = `Process Capability: Cpk = ${r.indices.cpk.toFixed(2)}, Ppk = ${r.indices.ppk.toFixed(2)}. Sigma level: ${r.defects.sigma_level.toFixed(2)}σ. Expected defects: ${r.defects.ppm_total.toFixed(0)} PPM (${r.defects.yield_percent.toFixed(2)}% yield).`;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
            Process Capability Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} />
          
          {/* Main Gauges */}
          <div className="grid md:grid-cols-2 gap-4">
            <CapabilityGauge value={r.indices.cpk} label="Cpk" sublabel="Short-term" />
            <CapabilityGauge value={r.indices.ppk} label="Ppk" sublabel="Long-term" />
          </div>
          
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard 
              value={`${r.defects.sigma_level.toFixed(1)}σ`} 
              label="Sigma Level" 
              icon={Zap}
              highlight={r.defects.sigma_level >= 3}
            />
            <MetricCard 
              value={`${r.defects.ppm_total.toFixed(0)}`} 
              label="PPM Defects" 
              icon={AlertTriangle}
              negative={r.defects.ppm_total > 6210}
            />
            <MetricCard 
              value={`${r.defects.yield_percent.toFixed(2)}%`} 
              label="Yield" 
              icon={Award}
              highlight={r.defects.yield_percent >= 99}
            />
            <MetricCard 
              value={`${r.defects.percent_out_of_spec.toFixed(2)}%`} 
              label="Out of Spec" 
              icon={Bell}
              negative={r.defects.percent_out_of_spec > 1}
            />
          </div>
          
          {/* All Indices */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Gauge className="w-4 h-4 text-primary" />
              Capability Indices
            </h4>
            <div className="grid md:grid-cols-4 gap-3">
              <IndexCard index="Cp" value={r.indices.cp} description="Potential capability" isShortTerm />
              <IndexCard index="Cpk" value={r.indices.cpk} description="Actual capability" isShortTerm />
              <IndexCard index="Cpl" value={r.indices.cpl} description="Lower spec" isShortTerm />
              <IndexCard index="Cpu" value={r.indices.cpu} description="Upper spec" isShortTerm />
            </div>
            <div className="grid md:grid-cols-4 gap-3">
              <IndexCard index="Pp" value={r.indices.pp} description="Potential performance" />
              <IndexCard index="Ppk" value={r.indices.ppk} description="Actual performance" />
              <IndexCard index="Ppl" value={r.indices.ppl} description="Lower spec" />
              <IndexCard index="Ppu" value={r.indices.ppu} description="Upper spec" />
            </div>
          </div>
          
          {/* Process Statistics */}
          <div className="p-4 rounded-lg border border-border bg-muted/10">
            <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Process Statistics
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-lg font-bold">{r.stats.mean.toFixed(4)}</p>
                <p className="text-xs text-muted-foreground">Mean</p>
              </div>
              <div>
                <p className="text-lg font-bold">{r.stats.std_within.toFixed(4)}</p>
                <p className="text-xs text-muted-foreground">σ Within</p>
              </div>
              <div>
                <p className="text-lg font-bold">{r.stats.std_overall.toFixed(4)}</p>
                <p className="text-xs text-muted-foreground">σ Overall</p>
              </div>
              <div>
                <p className="text-lg font-bold">{r.stats.n}</p>
                <p className="text-xs text-muted-foreground">Sample Size</p>
              </div>
            </div>
          </div>
          
          {/* Normality Check */}
          <div className={`p-4 rounded-lg border ${
            r.normality.is_normal ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/30 bg-amber-500/5'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {r.normality.is_normal ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                )}
                <span className="font-medium">Normality Test (Shapiro-Wilk)</span>
              </div>
              <Badge variant={r.normality.is_normal ? "default" : "secondary"} 
                     className={r.normality.is_normal ? "bg-green-500" : ""}>
                {r.normality.is_normal ? 'Normal' : 'Non-normal'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              W = {r.normality.shapiro_stat.toFixed(4)}, p-value = {r.normality.shapiro_p.toFixed(4)}
              {!r.normality.is_normal && ' (p < 0.05 suggests non-normal distribution)'}
            </p>
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
            detail={`Process capability analysis for ${r.stats.n} measurements.

■ Specification Limits

• LSL: ${r.specifications.lsl}
• USL: ${r.specifications.usl}
• Tolerance: ${r.specifications.tolerance}
${r.specifications.target !== undefined ? `• Target: ${r.specifications.target}` : '• Target: Not specified (using midpoint)'}

■ Capability Assessment

• Short-term (Cp/Cpk): ${r.assessment.short_term}
• Long-term (Pp/Ppk): ${r.assessment.long_term}

■ Process Centering

• Process Mean: ${r.stats.mean.toFixed(4)}
• Spec Midpoint: ${((r.specifications.usl + r.specifications.lsl) / 2).toFixed(4)}
• Offset: ${(r.stats.mean - (r.specifications.usl + r.specifications.lsl) / 2).toFixed(4)}

${r.indices.cp > r.indices.cpk * 1.2 
  ? '⚠️ Cp significantly higher than Cpk indicates process is not centered. Centering the process could improve capability.'
  : '✓ Process is well-centered (Cp ≈ Cpk).'}

■ Recommendation

${r.assessment.recommendation}`}
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
            Understanding Process Capability
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding="Process capability compares process variation to specification limits. Higher values mean the process produces fewer defects relative to customer requirements." />
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Key Concepts</h4>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { num: 1, title: "Cp (Potential Capability)", content: "Compares spec width to process spread (6σ). Assumes process is centered. Cp = (USL - LSL) / 6σ" },
                { num: 2, title: "Cpk (Actual Capability)", content: "Accounts for process centering. Cpk = min(Cpl, Cpu). If Cpk < Cp, process is off-center." },
                { num: 3, title: "Pp/Ppk (Performance)", content: "Uses overall σ instead of within-group σ. Captures long-term variation including shifts and drifts." },
                { num: 4, title: "Sigma Level", content: "Distance from mean to nearest spec limit in σ units. 6σ = 3.4 PPM. 3σ = 66,807 PPM." },
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
          
          {/* Formulas */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Formulas</h4>
            <div className="p-4 rounded-lg border border-border bg-muted/10 font-mono text-sm space-y-2">
              <p>Cp = (USL - LSL) / (6 × σ_within)</p>
              <p>Cpk = min[(USL - μ)/(3σ), (μ - LSL)/(3σ)]</p>
              <p>Pp = (USL - LSL) / (6 × σ_overall)</p>
              <p>Ppk = min[(USL - μ)/(3σ_overall), (μ - LSL)/(3σ_overall)]</p>
              <p>σ_within = R̄/d₂ (from subgroups)</p>
              <p>σ_overall = √[Σ(xᵢ - x̄)² / (n-1)]</p>
            </div>
          </div>
          
          {/* Sigma Level Table */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Sigma Level Reference</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sigma</TableHead>
                  <TableHead className="text-right">PPM</TableHead>
                  <TableHead className="text-right">Yield %</TableHead>
                  <TableHead className="text-right">Cpk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { sigma: 2, ppm: 308537, yield: 69.15, cpk: 0.67 },
                  { sigma: 3, ppm: 66807, yield: 93.32, cpk: 1.00 },
                  { sigma: 4, ppm: 6210, yield: 99.38, cpk: 1.33 },
                  { sigma: 5, ppm: 233, yield: 99.977, cpk: 1.67 },
                  { sigma: 6, ppm: 3.4, yield: 99.99966, cpk: 2.00 },
                ].map((row) => (
                  <TableRow key={row.sigma} className={r.defects.sigma_level >= row.sigma - 0.5 && r.defects.sigma_level < row.sigma + 0.5 ? 'bg-primary/10' : ''}>
                    <TableCell className="font-medium">{row.sigma}σ</TableCell>
                    <TableCell className="text-right">{row.ppm.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{row.yield}%</TableCell>
                    <TableCell className="text-right">{row.cpk.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <DetailParagraph
            title="Recommendations"
            detail={`Based on the process capability analysis:

■ Current Status

• Cpk = ${r.indices.cpk.toFixed(2)} (${r.assessment.short_term})
• Ppk = ${r.indices.ppk.toFixed(2)} (${r.assessment.long_term})

${r.indices.cpk >= 1.33 
  ? `✓ CAPABLE: Process meets requirements (Cpk ≥ 1.33)

Maintenance Actions:
1. Continue monitoring with control charts
2. Maintain current process settings
3. Periodic capability studies to detect drift`
  : r.indices.cpk >= 1.0
  ? `⚠️ MARGINAL: Process barely meets requirements

Improvement Actions:
1. ${r.indices.cp > r.indices.cpk * 1.2 ? 'Center the process (mean adjustment)' : 'Reduce process variation'}
2. Investigate sources of variation
3. Implement tighter process controls
4. Consider more frequent sampling`
  : `✗ NOT CAPABLE: Process does not meet requirements

Required Actions:
1. Implement 100% inspection or sorting
2. ${r.indices.cp > r.indices.cpk * 1.2 ? 'URGENT: Center the process' : 'URGENT: Reduce variation'}
3. Root cause analysis for variation
4. Consider process redesign or equipment upgrade`}

■ Cp vs Cpk Analysis

${r.indices.cp > r.indices.cpk * 1.2 
  ? `• Cp (${r.indices.cp.toFixed(2)}) >> Cpk (${r.indices.cpk.toFixed(2)})
• Process is off-center by ${Math.abs(r.stats.mean - (r.specifications.usl + r.specifications.lsl) / 2).toFixed(4)} units
• Centering could improve Cpk to ~${Math.min(r.indices.cp, r.indices.cpk * 1.5).toFixed(2)}`
  : `• Cp (${r.indices.cp.toFixed(2)}) ≈ Cpk (${r.indices.cpk.toFixed(2)})
• Process is well-centered
• To improve, must reduce variation`}

■ Short-term vs Long-term

${r.indices.cpk > r.indices.ppk * 1.2
  ? `• Cpk (${r.indices.cpk.toFixed(2)}) >> Ppk (${r.indices.ppk.toFixed(2)})
• Significant shift/drift between subgroups
• Investigate and control sources of long-term variation`
  : `• Cpk (${r.indices.cpk.toFixed(2)}) ≈ Ppk (${r.indices.ppk.toFixed(2)})
• Process is stable over time
• Short and long-term performance are consistent`}`}
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
          <h1 className="text-xl font-semibold">Process Capability Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            LSL: {r.specifications.lsl} | USL: {r.specifications.usl} | {new Date().toLocaleDateString()}
          </p>
        </div>
        
        {/* Executive Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MetricCard value={summary.cpk.toFixed(2)} label="Cpk" highlight={summary.cpk >= 1.33} />
              <MetricCard value={summary.ppk.toFixed(2)} label="Ppk" highlight={summary.ppk >= 1.33} />
              <MetricCard value={`${summary.sigma_level.toFixed(1)}σ`} label="Sigma Level" />
              <MetricCard value={`${summary.solve_time_ms}ms`} label="Calc Time" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Process capability assessment: <strong>{summary.assessment}</strong>. 
              Cpk of {summary.cpk.toFixed(2)} indicates {summary.cpk >= 1.33 ? 'the process meets requirements' : 'improvement is needed'}.
              Expected yield is {r.defects.yield_percent.toFixed(2)}% with {r.defects.ppm_total.toFixed(0)} PPM defects.
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
                  {visualizations.histogram && <TabsTrigger value="histogram" className="text-xs">Histogram</TabsTrigger>}
                  {visualizations.capability_chart && <TabsTrigger value="capability_chart" className="text-xs">Capability</TabsTrigger>}
                  {visualizations.control_chart && <TabsTrigger value="control_chart" className="text-xs">Control Chart</TabsTrigger>}
                  {visualizations.probability_plot && <TabsTrigger value="probability_plot" className="text-xs">Probability Plot</TabsTrigger>}
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
        
        {/* Indices Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Capability Indices</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Index</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Assessment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { index: 'Cp', type: 'Short-term', value: r.indices.cp },
                  { index: 'Cpk', type: 'Short-term', value: r.indices.cpk },
                  { index: 'Cpl', type: 'Short-term (Lower)', value: r.indices.cpl },
                  { index: 'Cpu', type: 'Short-term (Upper)', value: r.indices.cpu },
                  { index: 'Pp', type: 'Long-term', value: r.indices.pp },
                  { index: 'Ppk', type: 'Long-term', value: r.indices.ppk },
                  { index: 'Ppl', type: 'Long-term (Lower)', value: r.indices.ppl },
                  { index: 'Ppu', type: 'Long-term (Upper)', value: r.indices.ppu },
                ].map((row) => (
                  <TableRow key={row.index}>
                    <TableCell className="font-mono font-medium">{row.index}</TableCell>
                    <TableCell>{row.type}</TableCell>
                    <TableCell className={`text-right font-medium ${
                      row.value >= 1.33 ? 'text-green-500' : row.value >= 1.0 ? 'text-amber-500' : 'text-red-500'
                    }`}>{row.value.toFixed(3)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={row.value >= 1.33 ? "default" : "secondary"} 
                             className={`text-xs ${row.value >= 1.33 ? 'bg-green-500' : ''}`}>
                        {row.value >= 1.67 ? 'Excellent' : row.value >= 1.33 ? 'Good' : row.value >= 1.0 ? 'Adequate' : 'Poor'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
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
                CSV (Indices)
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
          <Button variant="outline" onClick={() => setCurrentStep(1)}>New Study</Button>
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
            onClick={() => setShowGuide(true)}  // 👈 이 줄 수정
            className="gap-2"
          >
            <BookOpen className="w-4 h-4" />  {/* 👈 아이콘 변경 */}
            Guide  {/* 👈 텍스트 변경 */}
          </Button>
        </div>
      )}
      
      <StatisticalGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />  {/* 👈 이 줄 추가 */}
        
      
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