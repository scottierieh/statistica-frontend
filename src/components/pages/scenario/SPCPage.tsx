"use client";

import React, { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell,  TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  LineChart, Upload, ArrowRight, CheckCircle2, XCircle, Shield, Info, HelpCircle,
  FileSpreadsheet, FileText, Download, TrendingUp, Settings, Activity,
  AlertTriangle, ChevronRight, Target, BarChart3, Layers, Cpu, Zap,  Ruler, BookOpen, BookMarked
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }
interface Violation { point_index: number; value: number; violations: Array<{ rule: number; description: string; severity: string }>; }

interface SPCResult {
  success: boolean;
  chart_data: { [key: string]: any };
  violations: Violation[];
  visualizations: { control_chart?: string; histogram?: string };
  key_insights: KeyInsight[];
  summary: {
    chart_type: string; n_points: number; center_line: number; ucl: number; lcl: number;
    mean: number; std: number; min: number; max: number;
    out_of_control_count: number; out_of_control_rate: number; process_in_control: boolean;
  };
  out_of_control_points: number[];
}

const CHART_TYPES = [
  { value: "xbar_r", label: "X-bar & R", description: "Subgroup mean & range" },
  { value: "xbar_s", label: "X-bar & S", description: "Subgroup mean & std" },
  { value: "i_mr", label: "I-MR", description: "Individual & moving range" },
  { value: "p", label: "p Chart", description: "Proportion defective" },
  { value: "np", label: "np Chart", description: "Number defective" },
  { value: "c", label: "c Chart", description: "Count of defects" },
  { value: "u", label: "u Chart", description: "Defects per unit" },
];

const generateSampleData = (): DataRow[] => {
  const data: DataRow[] = [];
  for (let i = 0; i < 100; i++) {
    let value = 50 + (Math.random() - 0.5) * 4;
    if (i === 25) value += 5;
    if (i === 60) value -= 4;
    if (i >= 70 && i <= 77) value += 1.5;
    data.push({ sample_id: i + 1, measurement: parseFloat(value.toFixed(3)), sample_size: 100, defects: Math.floor(Math.random() * 5), defectives: Math.floor(Math.random() * 3) });
  }
  return data;
};

const MetricCard: React.FC<{ value: string | number; label: string; icon?: React.FC<{ className?: string }>; highlight?: boolean; warning?: boolean }> = ({ value, label, icon: Icon, highlight, warning }) => (
  <div className={`text-center p-4 rounded-lg border ${warning ? 'border-destructive/30 bg-destructive/5' : highlight ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/20'}`}>
    {Icon && <Icon className={`w-5 h-5 mx-auto mb-2 ${warning ? 'text-destructive' : highlight ? 'text-primary' : 'text-muted-foreground'}`} />}
    <p className={`text-2xl font-semibold ${warning ? 'text-destructive' : highlight ? 'text-primary' : ''}`}>{value}</p>
    <p className="text-xs text-muted-foreground mt-1">{label}</p>
  </div>
);

const FindingBox: React.FC<{ finding: string; status?: "positive" | "warning" | "neutral" }> = ({ finding, status = "neutral" }) => (
  <div className={`border rounded-lg p-4 mb-6 ${status === "positive" ? "bg-primary/5 border-primary/20" : status === "warning" ? "bg-destructive/5 border-destructive/20" : "bg-muted/10 border-border"}`}>
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

const DataPreview: React.FC<{ data: DataRow[]; columns: string[]; filename?: string }> = ({ data, columns, filename = "data" }) => {
  const [expanded, setExpanded] = useState(false);
  const downloadCSV = () => {
    const header = columns.join(',');
    const rows = data.map(row => columns.map(col => row[col] ?? '').join(','));
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${filename}.csv`; a.click();
  };
  if (data.length === 0) return null;
  return (
    <div className="mb-6 border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-muted/20">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 hover:text-primary transition-colors">
          <FileText className="w-4 h-4 text-muted-foreground" /><span className="text-sm font-medium">Data Preview</span>
          <Badge variant="secondary" className="text-xs">{data.length} rows × {columns.length} cols</Badge>
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={downloadCSV}><Download className="w-3 h-3" />Download</Button>
      </div>
      {expanded && (
        <div className="max-h-64 overflow-auto">
          <Table><TableHeader><TableRow>{columns.slice(0, 6).map(col => <TableHead key={col} className="text-xs">{col}</TableHead>)}</TableRow></TableHeader>
            <TableBody>{data.slice(0, 10).map((row, i) => <TableRow key={i}>{columns.slice(0, 6).map(col => <TableCell key={col} className="text-xs py-1.5">{row[col] !== null ? String(row[col]) : '-'}</TableCell>)}</TableRow>)}</TableBody>
          </Table>
          {data.length > 10 && <p className="text-xs text-muted-foreground text-center py-2">Showing 10 of {data.length} rows</p>}
        </div>
      )}
    </div>
  );
};

const ProgressBar: React.FC<{ currentStep: number; hasResults: boolean; onStepClick: (step: number) => void }> = ({ currentStep, hasResults, onStepClick }) => {
  const steps = [{ num: 1, label: "Intro" }, { num: 2, label: "Config" }, { num: 3, label: "Validation" }, { num: 4, label: "Summary" }, { num: 5, label: "Why" }, { num: 6, label: "Report" }];
  return (
    <div className="flex items-center justify-center gap-0.5 mb-8 flex-wrap">
      {steps.map((step, idx) => {
        const isCompleted = step.num < currentStep, isCurrent = step.num === currentStep, isAccessible = step.num <= 3 || hasResults;
        return (
          <React.Fragment key={step.num}>
            <button onClick={() => isAccessible && onStepClick(step.num)} disabled={!isAccessible}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all ${isCurrent ? "bg-primary text-primary-foreground" : isCompleted ? "bg-primary/10 text-primary" : isAccessible ? "bg-muted text-muted-foreground hover:bg-muted/80" : "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"}`}>{step.label}</button>
            {idx < steps.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/30" />}
          </React.Fragment>
        );
      })}
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
            <h2 className="text-lg font-semibold">SPC Control Charts Guide</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              What is Statistical Process Control (SPC)?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              SPC uses control charts to monitor process performance over time. It distinguishes between common cause variation 
              (inherent to the process) and special cause variation (assignable to specific factors). The goal is to maintain 
              process stability and identify when intervention is needed.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Types of Control Charts
            </h3>
            
            <div className="space-y-4">
              <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                <p className="font-medium text-sm mb-2">Variable Charts (Continuous Data)</p>
                <div className="space-y-3">
                  <div className="pl-3 border-l-2 border-primary/30">
                    <p className="font-medium text-xs">X-bar & R Chart</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <strong>Use:</strong> Monitor process mean (X-bar) and variation (R = Range)<br/>
                      <strong>When:</strong> Subgroup size 2-10, most common chart<br/>
                      <strong>Example:</strong> Manufacturing dimensions measured 5 times per hour<br/>
                      <strong>Calculation:</strong> X-bar = average of subgroup, R = max - min in subgroup
                    </p>
                  </div>

                  <div className="pl-3 border-l-2 border-primary/30">
                    <p className="font-medium text-xs">X-bar & S Chart</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <strong>Use:</strong> Monitor process mean (X-bar) and variation (S = Std Dev)<br/>
                      <strong>When:</strong> Subgroup size above 10 (S more efficient than R)<br/>
                      <strong>Example:</strong> Daily production with 15 samples per batch<br/>
                      <strong>Advantage:</strong> S uses all data points, not just range
                    </p>
                  </div>

                  <div className="pl-3 border-l-2 border-primary/30">
                    <p className="font-medium text-xs">I-MR Chart (Individuals & Moving Range)</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <strong>Use:</strong> Individual measurements, no subgroups<br/>
                      <strong>When:</strong> Expensive tests, slow processes, batch processes<br/>
                      <strong>Example:</strong> Monthly sales, daily chemical composition<br/>
                      <strong>Calculation:</strong> I = individual value, MR = |X_i - X_(i-1)|
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <p className="font-medium text-sm mb-2">Attribute Charts (Count/Proportion Data)</p>
                <div className="space-y-3">
                  <div className="pl-3 border-l-2 border-amber-500/30">
                    <p className="font-medium text-xs">p Chart (Proportion Defective)</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <strong>Use:</strong> Proportion of defective items (pass/fail)<br/>
                      <strong>When:</strong> Variable sample size, percentage focus<br/>
                      <strong>Example:</strong> % of defective PCBs per batch (batch size varies)<br/>
                      <strong>Formula:</strong> p = defectives / sample size
                    </p>
                  </div>

                  <div className="pl-3 border-l-2 border-amber-500/30">
                    <p className="font-medium text-xs">np Chart (Number Defective)</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <strong>Use:</strong> Count of defective items<br/>
                      <strong>When:</strong> Constant sample size, count focus<br/>
                      <strong>Example:</strong> Number of rejected parts in batches of 100<br/>
                      <strong>Note:</strong> Easier to interpret than p chart (actual counts)
                    </p>
                  </div>

                  <div className="pl-3 border-l-2 border-amber-500/30">
                    <p className="font-medium text-xs">c Chart (Count of Defects)</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <strong>Use:</strong> Count of defects per unit (one item can have multiple defects)<br/>
                      <strong>When:</strong> Constant inspection unit size<br/>
                      <strong>Example:</strong> Scratches on a car door, bugs per 1000 lines of code<br/>
                      <strong>Difference:</strong> Counts defects (plural), not defectives
                    </p>
                  </div>

                  <div className="pl-3 border-l-2 border-amber-500/30">
                    <p className="font-medium text-xs">u Chart (Defects per Unit)</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <strong>Use:</strong> Rate of defects per inspection unit<br/>
                      <strong>When:</strong> Variable inspection unit size<br/>
                      <strong>Example:</strong> Defects per square meter (area varies), errors per page<br/>
                      <strong>Formula:</strong> u = total defects / total inspection units
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Control Limit Calculations
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Standard 3-Sigma Limits</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Formula:</strong><br/>
                  UCL (Upper Control Limit) = CL + 3σ<br/>
                  CL (Center Line) = Process Average<br/>
                  LCL (Lower Control Limit) = CL - 3σ
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Why 3-sigma?</strong> Captures 99.73% of natural process variation. 
                  Balance between sensitivity (catching real issues) and false alarms.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Chart-Specific Formulas</p>
                <div className="text-xs text-muted-foreground mt-2 space-y-2">
                  <p><strong>X-bar Chart:</strong> UCL = X̄ + A₂R̄, LCL = X̄ - A₂R̄ (A₂ from constant table)</p>
                  <p><strong>R Chart:</strong> UCL = D₄R̄, LCL = D₃R̄ (D₃, D₄ from constant table)</p>
                  <p><strong>I-MR Chart:</strong> UCL = X̄ + 2.66MR̄, LCL = X̄ - 2.66MR̄</p>
                  <p><strong>p Chart:</strong> UCL/LCL = p̄ ± 3√(p̄(1-p̄)/n) where n = sample size</p>
                  <p><strong>c Chart:</strong> UCL/LCL = c̄ ± 3√c̄ (based on Poisson distribution)</p>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <p className="font-medium text-sm text-amber-600">Rational Subgrouping</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Key Principle:</strong> Group data to maximize variation BETWEEN subgroups and minimize 
                  variation WITHIN subgroups. This helps detect shifts and trends.<br/>
                  <strong>Example:</strong> Group by hour (not mixing morning and afternoon), by operator, by machine
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Western Electric Rules (Out-of-Control Tests)
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">8 Rules for Detecting Special Cause Variation:</p>
              
              <div className="grid md:grid-cols-2 gap-3 mt-3">
                <div className="p-2 rounded-lg border border-red-500/30 bg-red-500/5">
                  <p className="font-medium text-xs text-red-600">Rule 1: Beyond 3σ</p>
                  <p className="text-xs">One point beyond UCL or LCL</p>
                  <p className="text-xs mt-1"><strong>Meaning:</strong> Extreme outlier, immediate investigation</p>
                </div>

                <div className="p-2 rounded-lg border border-orange-500/30 bg-orange-500/5">
                  <p className="font-medium text-xs text-orange-600">Rule 2: 2 of 3 beyond 2σ</p>
                  <p className="text-xs">2 out of 3 consecutive points in Zone A or beyond</p>
                  <p className="text-xs mt-1"><strong>Meaning:</strong> Process shift warning</p>
                </div>

                <div className="p-2 rounded-lg border border-amber-500/30 bg-amber-500/5">
                  <p className="font-medium text-xs text-amber-600">Rule 3: 4 of 5 beyond 1σ</p>
                  <p className="text-xs">4 out of 5 consecutive points in Zone B or beyond</p>
                  <p className="text-xs mt-1"><strong>Meaning:</strong> Process trending away from center</p>
                </div>

                <div className="p-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
                  <p className="font-medium text-xs text-yellow-600">Rule 4: 8 points same side</p>
                  <p className="text-xs">8 consecutive points on same side of center line</p>
                  <p className="text-xs mt-1"><strong>Meaning:</strong> Sustained process shift</p>
                </div>

                <div className="p-2 rounded-lg border border-green-500/30 bg-green-500/5">
                  <p className="font-medium text-xs text-green-600">Rule 5: 6 points trending</p>
                  <p className="text-xs">6 consecutive points increasing or decreasing</p>
                  <p className="text-xs mt-1"><strong>Meaning:</strong> Tool wear, seasonal effect</p>
                </div>

                <div className="p-2 rounded-lg border border-blue-500/30 bg-blue-500/5">
                  <p className="font-medium text-xs text-blue-600">Rule 6: 14 points alternating</p>
                  <p className="text-xs">14 consecutive points alternating up/down</p>
                  <p className="text-xs mt-1"><strong>Meaning:</strong> Systematic alternation, mixture</p>
                </div>

                <div className="p-2 rounded-lg border border-purple-500/30 bg-purple-500/5">
                  <p className="font-medium text-xs text-purple-600">Rule 7: 15 points in Zone C</p>
                  <p className="text-xs">15 consecutive points within 1σ of center line</p>
                  <p className="text-xs mt-1"><strong>Meaning:</strong> Stratification, data manipulation</p>
                </div>

                <div className="p-2 rounded-lg border border-pink-500/30 bg-pink-500/5">
                  <p className="font-medium text-xs text-pink-600">Rule 8: 8 points beyond 1σ</p>
                  <p className="text-xs">8 consecutive points on both sides, none in Zone C</p>
                  <p className="text-xs mt-1"><strong>Meaning:</strong> Bimodal distribution, mixture</p>
                </div>
              </div>

              <div className="mt-3 p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-xs">Zone Definitions:</p>
                <ul className="text-xs mt-1 space-y-1">
                  <li>• <strong>Zone A:</strong> 2σ to 3σ from center line</li>
                  <li>• <strong>Zone B:</strong> 1σ to 2σ from center line</li>
                  <li>• <strong>Zone C:</strong> 0σ to 1σ from center line (closest to CL)</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Common Cause vs Special Cause Variation
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/5">
                <p className="font-medium text-sm text-green-600 mb-2">Common Cause Variation</p>
                <p className="text-xs text-muted-foreground mb-2">
                  <strong>Definition:</strong> Natural, inherent variation in the process
                </p>
                <p className="text-xs text-muted-foreground mb-1"><strong>Characteristics:</strong></p>
                <ul className="text-xs text-muted-foreground space-y-1 ml-3">
                  <li>• Always present</li>
                  <li>• Predictable within limits</li>
                  <li>• Affects all outcomes</li>
                  <li>• Requires system change to reduce</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2"><strong>Examples:</strong> Minor temperature fluctuations, 
                measurement precision, raw material variation within specs</p>
                <p className="text-xs font-medium mt-2">Action: Accept or improve system</p>
              </div>

              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                <p className="font-medium text-sm text-red-600 mb-2">Special Cause Variation</p>
                <p className="text-xs text-muted-foreground mb-2">
                  <strong>Definition:</strong> Assignable variation from specific factors
                </p>
                <p className="text-xs text-muted-foreground mb-1"><strong>Characteristics:</strong></p>
                <ul className="text-xs text-muted-foreground space-y-1 ml-3">
                  <li>• Intermittent or sporadic</li>
                  <li>• Unpredictable when it occurs</li>
                  <li>• Affects specific outcomes</li>
                  <li>• Can be identified and eliminated</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2"><strong>Examples:</strong> Operator error, broken tool, 
                bad batch of material, machine malfunction</p>
                <p className="text-xs font-medium mt-2">Action: Investigate and eliminate</p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Implementing SPC: Best Practices
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Phase 1: Baseline (Establishing Control)</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Collect 20-25 subgroups minimum</li>
                  <li>• Calculate trial control limits</li>
                  <li>• Identify and remove special causes</li>
                  <li>• Recalculate limits until stable</li>
                  <li>• Document baseline process capability</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Phase 2: Monitoring</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Use established limits (don't recalculate)</li>
                  <li>• Plot new data in real-time</li>
                  <li>• React immediately to signals</li>
                  <li>• Document all interventions</li>
                  <li>• Review limits quarterly or after changes</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Data Collection</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Use consistent measurement method</li>
                  <li>• Maintain time order (critical!)</li>
                  <li>• Rational subgrouping strategy</li>
                  <li>• Record contextual information</li>
                  <li>• Ensure measurement system capability (MSA)</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Response Plan</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Define responsibility for each signal</li>
                  <li>• Standard investigation procedure</li>
                  <li>• Root cause analysis tools (5 Whys, Fishbone)</li>
                  <li>• Corrective action tracking</li>
                  <li>• Verification of effectiveness</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Common Mistakes & How to Avoid Them
            </h3>
            <div className="space-y-2">
              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                <p className="font-medium text-sm text-destructive mb-1">❌ Recalculating Limits with Each New Point</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Problem:</strong> Defeats purpose of control chart - you're chasing the process<br/>
                  <strong>Solution:</strong> Establish limits in Phase 1, use same limits in Phase 2. Only recalculate 
                  after verified process changes or quarterly reviews.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                <p className="font-medium text-sm text-destructive mb-1">❌ Ignoring Out-of-Control Signals</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Problem:</strong> Charts become decorations, lose credibility<br/>
                  <strong>Solution:</strong> Every signal requires investigation and documentation. If too many false 
                  alarms, review Western Electric rules sensitivity.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                <p className="font-medium text-sm text-destructive mb-1">❌ Poor Subgrouping</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Problem:</strong> Mixing different conditions in subgroups (morning + afternoon data)<br/>
                  <strong>Solution:</strong> Subgroup by time, operator, machine, etc. to isolate assignable causes. 
                  Within-subgroup variation should be minimal.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                <p className="font-medium text-sm text-destructive mb-1">❌ Using Wrong Chart Type</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Problem:</strong> Using variable chart for attribute data or vice versa<br/>
                  <strong>Solution:</strong> Variables = measured (weight, length). Attributes = counted (pass/fail, defects). 
                  Choose chart based on data type and sample size.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                <p className="font-medium text-sm text-destructive mb-1">❌ Insufficient Baseline Data</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Problem:</strong> Calculating limits from less than 20 subgroups<br/>
                  <strong>Solution:</strong> Collect minimum 20-25 subgroups (100-125 individual readings for X-bar charts) 
                  before calculating limits. Limits will be unreliable otherwise.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Interpreting Results & Taking Action
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/5">
                <p className="font-medium text-sm text-green-600 mb-1">Process IN CONTROL</p>
                <p className="text-xs text-muted-foreground">
                  <strong>What it means:</strong> Only common cause variation present. Process is stable and predictable.<br/>
                  <strong>Actions:</strong><br/>
                  • Continue monitoring<br/>
                  • Calculate process capability (Cp, Cpk) against specifications<br/>
                  • If meeting specs: maintain current process<br/>
                  • If not meeting specs: need fundamental process improvement (not troubleshooting)<br/>
                  • Document as baseline for future comparison
                </p>
              </div>

              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                <p className="font-medium text-sm text-red-600 mb-1">Process OUT OF CONTROL</p>
                <p className="text-xs text-muted-foreground">
                  <strong>What it means:</strong> Special cause variation detected. Process is unstable.<br/>
                  <strong>Actions:</strong><br/>
                  1. <strong>Identify:</strong> Note which rule(s) triggered, when it occurred<br/>
                  2. <strong>Investigate:</strong> What changed? Operator, material, equipment, method?<br/>
                  3. <strong>Correct:</strong> Eliminate special cause if harmful, institutionalize if beneficial<br/>
                  4. <strong>Verify:</strong> Confirm process returns to control<br/>
                  5. <strong>Document:</strong> Record cause and corrective action for learning
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">Process Capability (After Achieving Control)</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Cp (Capability):</strong> (USL - LSL) / 6σ — Process spread vs spec width<br/>
                  <strong>Cpk (Adjusted Capability):</strong> Accounts for process centering<br/>
                  <strong>Interpretation:</strong><br/>
                  • Cpk above 1.33: Capable process (recommended)<br/>
                  • Cpk 1.00-1.33: Marginally capable (monitor closely)<br/>
                  • Cpk below 1.00: Not capable (expect defects)<br/>
                  <strong>Note:</strong> Only calculate capability for in-control processes!
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-primary">Remember:</strong> SPC is not just about plotting data - it's a philosophy 
              of process management. The chart is a communication tool that helps operators and managers distinguish between 
              common cause variation (requiring system changes by management) and special causes (requiring immediate operator 
              action). Don't tamper with a stable process, but always investigate signals. The real power of SPC comes from 
              disciplined response to signals and continuous learning from the data.
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
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4"><LineChart className="w-6 h-6 text-primary" /></div>
        <h1 className="text-2xl font-semibold">SPC Control Charts</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Statistical Process Control helps monitor process stability, detect special cause variation, and maintain consistent quality.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {[{ icon: BarChart3, title: "Variable Charts", desc: "X-bar/R, X-bar/S, I-MR for continuous data" }, { icon: Layers, title: "Attribute Charts", desc: "p, np, c, u charts for count data" }, { icon: AlertTriangle, title: "Western Electric Rules", desc: "8 rules to detect out-of-control" }].map((item) => (
          <div key={item.title} className="p-5 rounded-lg border border-border bg-muted/10">
            <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><item.icon className="w-5 h-5 text-primary" /></div><div><p className="font-medium">{item.title}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div></div>
          </div>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Info className="w-5 h-5 text-primary" />When to Use SPC</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div><h4 className="font-medium text-primary mb-3">Requirements</h4><ul className="space-y-2 text-sm text-muted-foreground">{["Time-ordered process data", "Consistent measurement method", "At least 20-25 subgroups", "Stable measurement system"].map((r) => <li key={r} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />{r}</li>)}</ul></div>
            <div><h4 className="font-medium text-primary mb-3">Results</h4><ul className="space-y-2 text-sm text-muted-foreground">{["Control limits (UCL, CL, LCL)", "Out-of-control point detection", "Western Electric rule violations", "Process stability assessment"].map((r) => <li key={r} className="flex items-start gap-2"><TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />{r}</li>)}</ul></div>
          </div>
        </CardContent>
      </Card>
      <Card><CardContent className="pt-6"><div className="flex flex-col sm:flex-row gap-3 justify-center"><Button onClick={onLoadSample} className="gap-2"><Activity className="w-4 h-4" />Load Sample Data</Button><Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2"><Upload className="w-4 h-4" />Upload Your Data</Button><input ref={fileInputRef} type="file" accept=".csv" onChange={onFileUpload} className="hidden" /></div></CardContent></Card>
    </div>
  );
};

export default function SPCPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<SPCResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false); 

  const [measurementCol, setMeasurementCol] = useState<string>("");
  const [subgroupCol, setSubgroupCol] = useState<string>("");
  const [sampleSizeCol, setSampleSizeCol] = useState<string>("");
  const [chartType, setChartType] = useState<string>("i_mr");
  const [subgroupSize, setSubgroupSize] = useState<string>("5");
  const [sigmaLimit, setSigmaLimit] = useState<string>("3");
  const [useSpecifiedLimits, setUseSpecifiedLimits] = useState(false);
  const [specifiedUCL, setSpecifiedUCL] = useState<string>("");
  const [specifiedLCL, setSpecifiedLCL] = useState<string>("");
  const [specifiedCL, setSpecifiedCL] = useState<string>("");

  const handleLoadSample = useCallback(() => { const d = generateSampleData(); setData(d); setColumns(Object.keys(d[0])); setMeasurementCol("measurement"); setSampleSizeCol("sample_size"); setCurrentStep(2); setResults(null); setError(null); }, []);
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; const text = await file.text(); const lines = text.trim().split('\n'); const headers = lines[0].split(',').map(h => h.trim()); const rows = lines.slice(1).map(line => { const v = line.split(','); const row: DataRow = {}; headers.forEach((h, i) => { const val = v[i]?.trim(); row[h] = val === '' ? null : isNaN(Number(val)) ? val : Number(val); }); return row; }); setData(rows); setColumns(headers); setCurrentStep(2); setResults(null); setError(null); }, []);
  const getValidationChecks = useCallback((): ValidationCheck[] => { const needsSampleSize = ["p", "u"].includes(chartType); return [{ name: "Data Loaded", passed: data.length > 0, message: data.length > 0 ? `${data.length} rows` : "No data" }, { name: "Measurement Column", passed: !!measurementCol, message: measurementCol || "Select column" }, { name: "Minimum Points", passed: data.length >= 20, message: `${data.length} points` }, { name: "Sample Size", passed: !needsSampleSize || !!sampleSizeCol, message: needsSampleSize ? (sampleSizeCol || "Required") : "Not required" }]; }, [data, measurementCol, chartType, sampleSizeCol]);

  const runAnalysis = async () => {
    try { setLoading(true); setError(null);
      const payload = { data, measurement_col: measurementCol, subgroup_col: subgroupCol || null, subgroup_size: parseInt(subgroupSize), chart_type: chartType, sample_size_col: sampleSizeCol || null, sigma_limit: parseFloat(sigmaLimit), use_specified_limits: useSpecifiedLimits, specified_ucl: specifiedUCL ? parseFloat(specifiedUCL) : null, specified_lcl: specifiedLCL ? parseFloat(specifiedLCL) : null, specified_cl: specifiedCL ? parseFloat(specifiedCL) : null };
      const res = await fetch(`${FASTAPI_URL}/api/analysis/spc`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).detail || "Analysis failed");
      setResults(await res.json()); setCurrentStep(4);
    } catch (err) { setError(err instanceof Error ? err.message : "Analysis failed"); } finally { setLoading(false); }
  };

  const handleDownloadCSV = () => { if (!results) return; const s = results.summary; const csv = `Metric,Value\nChart Type,${s.chart_type}\nPoints,${s.n_points}\nCL,${s.center_line}\nUCL,${s.ucl}\nLCL,${s.lcl}\nOOC Count,${s.out_of_control_count}`; const blob = new Blob([csv], { type: "text/csv" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "spc_results.csv"; a.click(); };
  const handleDownloadPNG = (k: string) => { if (!results?.visualizations) return; const b = results.visualizations[k as keyof typeof results.visualizations]; if (!b) return; const a = document.createElement("a"); a.href = `data:image/png;base64,${b}`; a.download = `spc_${k}.png`; a.click(); };

  const renderStep2Config = () => (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Settings className="w-5 h-5 text-primary" />Configuration</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3"><Label className="text-sm font-medium flex items-center gap-2"><Ruler className="w-4 h-4 text-primary" />Chart Type</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">{CHART_TYPES.map((ct) => (<button key={ct.value} onClick={() => setChartType(ct.value)} className={`p-3 rounded-lg border text-left transition-all ${chartType === ct.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}><p className="font-medium text-sm">{ct.label}</p><p className="text-xs text-muted-foreground">{ct.description}</p></button>))}</div>
        </div>
        <Separator />
        <div className="space-y-3"><Label className="text-sm font-medium flex items-center gap-2"><Target className="w-4 h-4 text-primary" />Data Columns</Label>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label className="text-xs">Measurement *</Label><Select value={measurementCol} onValueChange={setMeasurementCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label className="text-xs">Subgroup</Label><Select value={subgroupCol} onValueChange={setSubgroupCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="__none__">-- None --</SelectItem>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            {["p", "u"].includes(chartType) && <div className="space-y-2"><Label className="text-xs">Sample Size *</Label><Select value={sampleSizeCol} onValueChange={setSampleSizeCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>}
          </div>
        </div>
        <Separator />
        <div className="space-y-3"><Label className="text-sm font-medium flex items-center gap-2"><Settings className="w-4 h-4 text-primary" />Settings</Label>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label className="text-xs">Subgroup Size</Label><Input type="number" min="2" max="25" value={subgroupSize} onChange={(e) => setSubgroupSize(e.target.value)} /></div>
            <div className="space-y-2"><Label className="text-xs">Sigma Limit</Label><Select value={sigmaLimit} onValueChange={setSigmaLimit}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="2">2σ</SelectItem><SelectItem value="3">3σ (Standard)</SelectItem><SelectItem value="4">4σ</SelectItem></SelectContent></Select></div>
          </div>
        </div>
        <Separator />
        <div className="space-y-3">
          <div className="flex items-center gap-2"><input type="checkbox" id="useSpecified" checked={useSpecifiedLimits} onChange={(e) => setUseSpecifiedLimits(e.target.checked)} className="rounded" /><Label htmlFor="useSpecified" className="text-sm">Use Specified Control Limits</Label></div>
          {useSpecifiedLimits && <div className="grid md:grid-cols-3 gap-4"><div className="space-y-2"><Label className="text-xs">UCL</Label><Input type="number" step="0.001" value={specifiedUCL} onChange={(e) => setSpecifiedUCL(e.target.value)} /></div><div className="space-y-2"><Label className="text-xs">CL</Label><Input type="number" step="0.001" value={specifiedCL} onChange={(e) => setSpecifiedCL(e.target.value)} /></div><div className="space-y-2"><Label className="text-xs">LCL</Label><Input type="number" step="0.001" value={specifiedLCL} onChange={(e) => setSpecifiedLCL(e.target.value)} /></div></div>}
        </div>
        <div className="flex justify-end pt-4"><Button onClick={() => setCurrentStep(3)} className="gap-2">Continue<ArrowRight className="w-4 h-4" /></Button></div>
      </CardContent>
    </Card>
  );

  const renderStep3Validation = () => { const checks = getValidationChecks(); const canRun = checks.every(c => c.passed); return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Shield className="w-5 h-5 text-primary" />Validation</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">{checks.map((c, i) => (<div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${c.passed ? 'border-border' : 'border-destructive/30 bg-destructive/5'}`}><div className="flex items-center gap-3">{c.passed ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <XCircle className="w-5 h-5 text-destructive" />}<div><p className="font-medium text-sm">{c.name}</p><p className="text-xs text-muted-foreground">{c.message}</p></div></div><Badge variant={c.passed ? "secondary" : "destructive"} className="text-xs">{c.passed ? "Pass" : "Warning"}</Badge></div>))}</div>
        {error && <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5"><p className="text-sm text-destructive">{error}</p></div>}
        <div className="flex justify-between pt-4"><Button variant="outline" onClick={() => setCurrentStep(2)}>Back</Button><Button onClick={runAnalysis} disabled={loading || !canRun} className="gap-2">{loading ? <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Analyzing...</> : <>Run Analysis<ArrowRight className="w-4 h-4" /></>}</Button></div>
      </CardContent>
    </Card>
  );};

  const renderStep4Summary = () => { if (!results) return null; const { summary: s, violations } = results; const inControl = s.process_in_control;
    const finding = inControl ? `Process is IN CONTROL. All ${s.n_points} points within ${sigmaLimit}σ limits.` : `Process OUT OF CONTROL. ${s.out_of_control_count}/${s.n_points} points (${s.out_of_control_rate.toFixed(1)}%) exceed limits.`;
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Activity className="w-5 h-5 text-primary" />Results</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} status={inControl ? "positive" : "warning"} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><MetricCard value={s.n_points} label="Data Points" icon={Activity} highlight /><MetricCard value={s.center_line.toFixed(4)} label="Center Line" icon={Target} /><MetricCard value={s.out_of_control_count} label="OOC Points" icon={AlertTriangle} warning={!inControl} /><MetricCard value={`${s.out_of_control_rate.toFixed(1)}%`} label="OOC Rate" /></div>
          <div className="grid md:grid-cols-3 gap-3"><div className="p-3 rounded-lg border border-primary/30 bg-primary/5 text-center"><p className="text-xs text-muted-foreground">UCL</p><p className="text-xl font-bold text-primary">{s.ucl.toFixed(4)}</p></div><div className="p-3 rounded-lg border border-border bg-muted/10 text-center"><p className="text-xs text-muted-foreground">CL</p><p className="text-xl font-bold">{s.center_line.toFixed(4)}</p></div><div className="p-3 rounded-lg border border-primary/30 bg-primary/5 text-center"><p className="text-xs text-muted-foreground">LCL</p><p className="text-xl font-bold text-primary">{s.lcl.toFixed(4)}</p></div></div>
          {results.key_insights.map((ins, i) => (<div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${ins.status === "positive" ? "border-primary/30 bg-primary/5" : ins.status === "warning" ? "border-destructive/30 bg-destructive/5" : "border-border"}`}>{ins.status === "positive" ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> : ins.status === "warning" ? <AlertTriangle className="w-5 h-5 text-destructive shrink-0" /> : <Info className="w-5 h-5 shrink-0" />}<div><p className="font-medium text-sm">{ins.title}</p><p className="text-sm text-muted-foreground">{ins.description}</p></div></div>))}
          <DetailParagraph title="Summary Interpretation" detail={`A ${CHART_TYPES.find(c => c.value === s.chart_type)?.label} control chart was constructed for ${s.n_points} data points using ${sigmaLimit}σ control limits.

■ Control Limits
• Upper Control Limit (UCL): ${s.ucl.toFixed(4)}
• Center Line (CL): ${s.center_line.toFixed(4)}
• Lower Control Limit (LCL): ${s.lcl.toFixed(4)}

■ Process Statistics
• Mean: ${s.mean.toFixed(4)}, Std Dev: ${s.std.toFixed(4)}
• Range: ${s.min.toFixed(4)} to ${s.max.toFixed(4)}

■ Out-of-Control Assessment
• OOC Points: ${s.out_of_control_count} (${s.out_of_control_rate.toFixed(1)}%)
• Western Electric Violations: ${violations.length}
• Status: ${inControl ? 'IN CONTROL - Only common cause variation' : 'OUT OF CONTROL - Special cause detected'}`} />
          <div className="flex justify-end pt-4"><Button onClick={() => setCurrentStep(5)} className="gap-2">Understand Why<ArrowRight className="w-4 h-4" /></Button></div>
        </CardContent>
      </Card>
    );
  };

  const renderStep5Why = () => { if (!results) return null; const { summary: s, violations } = results;
    const exps = [{ n: 1, t: "Control Limits", c: `UCL=${s.ucl.toFixed(4)}, CL=${s.center_line.toFixed(4)}, LCL=${s.lcl.toFixed(4)} using ${sigmaLimit}σ.` }, { n: 2, t: "Out-of-Control", c: `${s.out_of_control_count} points beyond limits indicate special cause.` }, { n: 3, t: "WE Rules", c: `${violations.length} violations for patterns like runs, trends.` }, { n: 4, t: "Stability", c: s.process_in_control ? "Common cause only. Predictable." : "Special cause present. Investigate." }];
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><HelpCircle className="w-5 h-5 text-primary" />Understanding SPC</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">{exps.map(e => (<div key={e.n} className="p-4 rounded-lg border border-border bg-muted/10"><div className="flex items-start gap-3"><div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">{e.n}</div><div><p className="font-medium text-sm">{e.t}</p><p className="text-xs text-muted-foreground mt-1">{e.c}</p></div></div></div>))}</div>
          <DetailParagraph title="Western Electric Rules" detail={`The Western Electric Rules detect out-of-control conditions:

■ Zone Rules
• Rule 1: 1 point beyond 3σ — Immediate signal
• Rule 2: 2 of 3 points beyond 2σ — Process shift warning
• Rule 3: 4 of 5 points beyond 1σ — Trending away
• Rule 4: 8 points on same side of CL — Sustained shift

■ Pattern Rules
• Rule 5: 6 points increasing/decreasing — Trend
• Rule 6: 14 points alternating — Mixture
• Rule 7: 15 points within 1σ — Stratification
• Rule 8: 8 points beyond 1σ both sides — Bimodal

■ Interpretation
• Single violation: Investigate, may be false alarm
• Multiple violations: Strong indication of special cause`} />
          <div className="flex justify-between pt-4"><Button variant="outline" onClick={() => setCurrentStep(4)}>Back</Button><Button onClick={() => setCurrentStep(6)} className="gap-2">View Report<ArrowRight className="w-4 h-4" /></Button></div>
        </CardContent>
      </Card>
    );
  };

  const renderStep6Report = () => { if (!results) return null; const { summary: s, violations } = results; return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[{ icon: Activity, label: "Points", value: s.n_points }, { icon: Target, label: "CL", value: s.center_line.toFixed(4) }, { icon: AlertTriangle, label: "OOC", value: s.out_of_control_count }, { icon: TrendingUp, label: "Rate", value: `${s.out_of_control_rate.toFixed(1)}%` }].map((m) => (<Card key={m.label}><CardContent className="pt-6"><div className="text-center"><m.icon className="w-8 h-8 mx-auto text-primary mb-2" /><p className="text-sm text-muted-foreground">{m.label}</p><p className="text-2xl font-bold">{m.value}</p></div></CardContent></Card>))}</div>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" />Analysis Summary</CardTitle></CardHeader><CardContent><p className="text-sm leading-relaxed text-muted-foreground">A {CHART_TYPES.find(c => c.value === s.chart_type)?.label} analysis on {s.n_points} points. Limits: UCL={s.ucl.toFixed(4)}, CL={s.center_line.toFixed(4)}, LCL={s.lcl.toFixed(4)} ({sigmaLimit}σ). {s.out_of_control_count > 0 ? `${s.out_of_control_count} OOC points (${s.out_of_control_rate.toFixed(1)}%), ${violations.length} WE violations. Special cause present.` : "All points within limits. Process stable."}</p></CardContent></Card>
      <Card><CardHeader className="pb-3"><CardTitle className="text-base">Visualizations</CardTitle></CardHeader><CardContent><Tabs defaultValue="control"><TabsList className="grid w-full grid-cols-2 mb-4"><TabsTrigger value="control">Control Chart</TabsTrigger><TabsTrigger value="histogram">Histogram</TabsTrigger></TabsList>{[{ k: "control_chart", t: "control" }, { k: "histogram", t: "histogram" }].map(({ k, t }) => (<TabsContent key={k} value={t}>{results.visualizations[k as keyof typeof results.visualizations] && (<div className="relative border rounded-lg overflow-hidden"><img src={`data:image/png;base64,${results.visualizations[k as keyof typeof results.visualizations]}`} alt={k} className="w-full" /><Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => handleDownloadPNG(k)}><Download className="w-4 h-4" /></Button></div>)}</TabsContent>))}</Tabs></CardContent></Card>
      <Card><CardHeader className="pb-3"><CardTitle className="text-base">Control Limits</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Limit</TableHead><TableHead className="text-right">Value</TableHead><TableHead>Description</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell className="font-medium">UCL</TableCell><TableCell className="text-right">{s.ucl.toFixed(4)}</TableCell><TableCell className="text-muted-foreground">Upper Control Limit ({sigmaLimit}σ above)</TableCell></TableRow><TableRow><TableCell className="font-medium">CL</TableCell><TableCell className="text-right">{s.center_line.toFixed(4)}</TableCell><TableCell className="text-muted-foreground">Center Line (Mean)</TableCell></TableRow><TableRow><TableCell className="font-medium">LCL</TableCell><TableCell className="text-right">{s.lcl.toFixed(4)}</TableCell><TableCell className="text-muted-foreground">Lower Control Limit ({sigmaLimit}σ below)</TableCell></TableRow></TableBody></Table></CardContent></Card>
      {violations.length > 0 && <Card><CardHeader className="pb-3"><CardTitle className="text-base">Violations ({violations.length})</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Point</TableHead><TableHead className="text-right">Value</TableHead><TableHead>Rule</TableHead><TableHead>Severity</TableHead></TableRow></TableHeader><TableBody>{violations.slice(0, 10).map((v, i) => (<TableRow key={i}><TableCell>{v.point_index + 1}</TableCell><TableCell className="text-right">{v.value.toFixed(4)}</TableCell><TableCell>{v.violations.map(x => `Rule ${x.rule}`).join(", ")}</TableCell><TableCell><Badge variant={v.violations[0]?.severity === "high" ? "destructive" : "secondary"} className="text-xs">{v.violations[0]?.severity}</Badge></TableCell></TableRow>))}</TableBody></Table></CardContent></Card>}
      <Card><CardHeader className="pb-3"><CardTitle className="text-base">Export</CardTitle></CardHeader><CardContent><div className="flex gap-3"><Button variant="outline" onClick={handleDownloadCSV} className="gap-2"><FileSpreadsheet className="w-4 h-4" />CSV</Button><Button variant="outline" onClick={() => handleDownloadPNG("control_chart")} className="gap-2"><Download className="w-4 h-4" />Chart</Button></div></CardContent></Card>
      <div className="flex justify-between"><Button variant="outline" onClick={() => setCurrentStep(5)}>Back</Button><Button variant="outline" onClick={() => setCurrentStep(1)}>New Analysis</Button></div>
    </div>
  );};

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

      {currentStep > 1 && data.length > 0 && <DataPreview data={data} columns={columns} filename="spc_data" />}
      {currentStep === 1 && <IntroPage onLoadSample={handleLoadSample} onFileUpload={handleFileUpload} />}
      {currentStep === 2 && renderStep2Config()}
      {currentStep === 3 && renderStep3Validation()}
      {currentStep === 4 && renderStep4Summary()}
      {currentStep === 5 && renderStep5Why()}
      {currentStep === 6 && renderStep6Report()}
    </div>
  );
}