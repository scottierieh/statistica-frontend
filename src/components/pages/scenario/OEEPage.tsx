"use client";

import React, { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Gauge, Upload, ArrowRight, CheckCircle2, XCircle, BookOpen, BookMarked, Shield, Info, HelpCircle,
  FileSpreadsheet, FileText, Download, TrendingUp, Settings, Activity,
  AlertTriangle, ChevronRight, Target, Clock, Zap, Package, Timer, AlertCircle,
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-995604437166.asia-northeast3.run.app";

interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }
interface LossItem { category: string; loss_type: string; time_loss: number; percentage: number; description: string; }

interface OEEMetrics { oee: number; availability: number; performance: number; quality: number; planned_time: number; run_time: number; downtime: number; total_count: number; good_count: number; defect_count: number; ideal_cycle_time: number; speed_loss_time: number; quality_loss_time: number; productive_time: number; }
interface OEEResult {
  success: boolean;
  metrics: OEEMetrics;
  losses: { losses: LossItem[]; total_loss_time: number; availability_loss: number; performance_loss: number; quality_loss: number; };
  targets: { oee: number; availability: number; performance: number; quality: number; };
  benchmarks: { world_class: { oee: number; availability: number; performance: number; quality: number }; };
  visualizations: { gauge_chart?: string; time_breakdown?: string; six_losses?: string; trend_chart?: string; equipment_chart?: string; };
  key_insights: KeyInsight[];
  summary: { oee: number; availability: number; performance: number; quality: number; limiting_factor: string; total_loss_time: number; productive_time: number; };
}

const generateSampleData = (): DataRow[] => {
  const data: DataRow[] = [];
  const equipments = ["Machine_A", "Machine_B", "Machine_C"];
  const shifts = ["Morning", "Afternoon", "Night"];
  for (let day = 1; day <= 7; day++) {
    for (const equipment of equipments) {
      for (const shift of shifts) {
        const plannedTime = 480;
        const downtime = Math.floor(Math.random() * 60) + 10;
        const runTime = plannedTime - downtime;
        const idealCycleTime = 0.5;
        const totalCount = Math.floor(runTime / idealCycleTime * (0.85 + Math.random() * 0.15));
        const defects = Math.floor(totalCount * (0.005 + Math.random() * 0.02));
        data.push({ date: `2024-01-${String(day).padStart(2, "0")}`, equipment, shift, planned_time: plannedTime, run_time: runTime, downtime, total_count: totalCount, good_count: totalCount - defects, defect_count: defects, ideal_cycle_time: idealCycleTime });
      }
    }
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
            <h2 className="text-lg font-semibold">OEE Analysis Guide</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Gauge className="w-4 h-4" />
              What is Overall Equipment Effectiveness (OEE)?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              OEE is the gold standard for measuring manufacturing productivity. It identifies the percentage of 
              manufacturing time that is truly productive by multiplying three factors: Availability (uptime), 
              Performance (speed), and Quality (first-pass yield). An OEE score of 100% means you're manufacturing 
              only good parts, as fast as possible, with no stop time. World-class OEE is 85% or higher.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              The OEE Formula
            </h3>
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="font-medium text-center mb-2">OEE = Availability × Performance × Quality</p>
              <p className="text-xs text-muted-foreground text-center">
                All three factors are expressed as percentages and multiplied together
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mt-4">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <p className="font-medium text-sm">Availability</p>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  <strong>Formula:</strong> Run Time / Planned Production Time
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong>Example:</strong> 420 min run time / 480 min planned = 87.5%
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Measures:</strong> Uptime losses from breakdowns, changeovers, startups
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <p className="font-medium text-sm">Performance</p>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  <strong>Formula:</strong> (Ideal Cycle Time × Total Count) / Run Time
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong>Example:</strong> (0.5 min × 800 units) / 420 min = 95.2%
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Measures:</strong> Speed losses from slow cycles, minor stops
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-primary" />
                  <p className="font-medium text-sm">Quality</p>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  <strong>Formula:</strong> Good Count / Total Count
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong>Example:</strong> 784 good / 800 total = 98%
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Measures:</strong> Quality losses from defects, rework, scrap
                </p>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
              <p className="font-medium text-sm text-amber-600 mb-1">Complete Example:</p>
              <p className="text-xs text-muted-foreground">
                Availability: 87.5% × Performance: 95.2% × Quality: 98.0% = <strong>OEE: 81.6%</strong><br/>
                This means 81.6% of your planned production time creates good parts at maximum speed.
              </p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              The Six Big Losses
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              OEE addresses six major sources of productivity loss, grouped by which OEE component they affect:
            </p>

            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                <p className="font-medium text-sm text-red-600 mb-2">Availability Losses (Downtime)</p>
                <div className="space-y-2">
                  <div className="pl-3 border-l-2 border-red-500/30">
                    <p className="font-medium text-xs">1. Equipment Failure (Breakdowns)</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <strong>Description:</strong> Unplanned stops due to equipment malfunction<br/>
                      <strong>Examples:</strong> Motor failure, hydraulic leak, electrical fault<br/>
                      <strong>Typical Impact:</strong> 5-20% of planned time<br/>
                      <strong>Solutions:</strong> Preventive maintenance, TPM, condition monitoring
                    </p>
                  </div>

                  <div className="pl-3 border-l-2 border-red-500/30">
                    <p className="font-medium text-xs">2. Setup and Adjustments</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <strong>Description:</strong> Planned stops for changeovers, warmup, adjustments<br/>
                      <strong>Examples:</strong> Tool changes, product changeovers, startup time<br/>
                      <strong>Typical Impact:</strong> 2-5% of planned time<br/>
                      <strong>Solutions:</strong> SMED (Single-Minute Exchange of Die), quick-change tooling
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <p className="font-medium text-sm text-amber-600 mb-2">Performance Losses (Speed Loss)</p>
                <div className="space-y-2">
                  <div className="pl-3 border-l-2 border-amber-500/30">
                    <p className="font-medium text-xs">3. Idling and Minor Stops</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <strong>Description:</strong> Brief stops under 5 minutes (often not recorded)<br/>
                      <strong>Examples:</strong> Jams, sensor triggers, misfeeds, blocked chutes<br/>
                      <strong>Typical Impact:</strong> 5-10% of run time<br/>
                      <strong>Solutions:</strong> Root cause analysis, 5 Whys, poka-yoke devices
                    </p>
                  </div>

                  <div className="pl-3 border-l-2 border-amber-500/30">
                    <p className="font-medium text-xs">4. Reduced Speed</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <strong>Description:</strong> Running below ideal/designed cycle time<br/>
                      <strong>Examples:</strong> Worn tools, suboptimal feeds/speeds, operator pacing<br/>
                      <strong>Typical Impact:</strong> 5-15% speed reduction<br/>
                      <strong>Solutions:</strong> Optimize process parameters, eliminate bottlenecks
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/5">
                <p className="font-medium text-sm text-blue-600 mb-2">Quality Losses (Defects)</p>
                <div className="space-y-2">
                  <div className="pl-3 border-l-2 border-blue-500/30">
                    <p className="font-medium text-xs">5. Process Defects</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <strong>Description:</strong> Defective parts produced during stable production<br/>
                      <strong>Examples:</strong> Dimensional errors, scratches, contamination<br/>
                      <strong>Typical Impact:</strong> 1-5% of production<br/>
                      <strong>Solutions:</strong> SPC, process capability improvement, error-proofing
                    </p>
                  </div>

                  <div className="pl-3 border-l-2 border-blue-500/30">
                    <p className="font-medium text-xs">6. Startup Rejects</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <strong>Description:</strong> Defects during warmup after startup/changeover<br/>
                      <strong>Examples:</strong> First-piece defects, setup verification failures<br/>
                      <strong>Typical Impact:</strong> 1-3% of production<br/>
                      <strong>Solutions:</strong> Standard work, pre-production verification, training
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              OEE Benchmarks and Targets
            </h3>
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead>OEE Score</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Action Required</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-green-500/5">
                  <TableCell className="font-medium">85%+</TableCell>
                  <TableCell className="text-green-600">World Class</TableCell>
                  <TableCell>Top 10% of manufacturers globally</TableCell>
                  <TableCell>Maintain and share best practices</TableCell>
                </TableRow>
                <TableRow className="bg-green-400/5">
                  <TableCell className="font-medium">65-85%</TableCell>
                  <TableCell className="text-green-600">Good</TableCell>
                  <TableCell>Above average, competitive</TableCell>
                  <TableCell>Continue improvement initiatives</TableCell>
                </TableRow>
                <TableRow className="bg-amber-500/5">
                  <TableCell className="font-medium">50-65%</TableCell>
                  <TableCell className="text-amber-600">Fair</TableCell>
                  <TableCell>Typical for many manufacturers</TableCell>
                  <TableCell>Significant improvement opportunity</TableCell>
                </TableRow>
                <TableRow className="bg-red-500/5">
                  <TableCell className="font-medium">Below 50%</TableCell>
                  <TableCell className="text-red-600">Poor</TableCell>
                  <TableCell>Uncompetitive, major losses</TableCell>
                  <TableCell>Urgent action required</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <div className="mt-4 p-3 rounded-lg border border-border bg-muted/10">
              <p className="font-medium text-sm mb-2">World-Class Component Targets:</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center p-2 rounded bg-primary/5">
                  <p className="text-muted-foreground">Availability</p>
                  <p className="font-bold text-primary">≥90%</p>
                </div>
                <div className="text-center p-2 rounded bg-primary/5">
                  <p className="text-muted-foreground">Performance</p>
                  <p className="font-bold text-primary">≥95%</p>
                </div>
                <div className="text-center p-2 rounded bg-primary/5">
                  <p className="text-muted-foreground">Quality</p>
                  <p className="font-bold text-primary">≥99.9%</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                0.90 × 0.95 × 0.999 = 0.855 = 85.5% OEE
              </p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Calculating OEE: Step-by-Step Example
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Given Data:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Shift Length: 8 hours (480 minutes)</li>
                  <li>• Breaks: 30 minutes (planned, not included)</li>
                  <li>• Planned Production Time: 450 minutes</li>
                  <li>• Downtime: 47 minutes (breakdowns + changeovers)</li>
                  <li>• Run Time: 403 minutes</li>
                  <li>• Ideal Cycle Time: 0.50 minutes per part</li>
                  <li>• Total Parts Produced: 780 parts</li>
                  <li>• Good Parts: 760 parts</li>
                  <li>• Defective Parts: 20 parts</li>
                </ul>
              </div>

              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm">Step 1: Calculate Availability</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Availability = Run Time / Planned Production Time<br/>
                    Availability = 403 min / 450 min = <strong>89.6%</strong>
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm">Step 2: Calculate Performance</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Performance = (Ideal Cycle Time × Total Count) / Run Time<br/>
                    Performance = (0.50 min × 780 parts) / 403 min<br/>
                    Performance = 390 min / 403 min = <strong>96.8%</strong>
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm">Step 3: Calculate Quality</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Quality = Good Count / Total Count<br/>
                    Quality = 760 parts / 780 parts = <strong>97.4%</strong>
                  </p>
                </div>

                <div className="p-4 rounded-lg border-2 border-primary bg-primary/10">
                  <p className="font-medium text-sm">Step 4: Calculate OEE</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    OEE = Availability × Performance × Quality<br/>
                    OEE = 89.6% × 96.8% × 97.4%<br/>
                    <span className="text-base font-bold text-primary">OEE = 84.5%</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    <strong>Interpretation:</strong> This operation is running at 84.5% effectiveness, just below 
                    world-class (85%). The limiting factor is Availability (89.6%), so focus on reducing downtime.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Common OEE Calculation Mistakes
            </h3>
            <div className="space-y-2">
              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                <p className="font-medium text-sm text-destructive mb-1">❌ Including Breaks in Planned Time</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Wrong:</strong> Using 480 min (8-hour shift) as planned time<br/>
                  <strong>Right:</strong> Excluding breaks/lunch → 450 min planned production time<br/>
                  <strong>Why:</strong> OEE measures production time effectiveness, not shift length
                </p>
              </div>

              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                <p className="font-medium text-sm text-destructive mb-1">❌ Using Actual Cycle Time Instead of Ideal</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Wrong:</strong> Calculating performance based on observed average cycle time<br/>
                  <strong>Right:</strong> Using theoretical/ideal/design cycle time from equipment specs<br/>
                  <strong>Why:</strong> Performance measures loss vs. ideal, not self-comparison
                </p>
              </div>

              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                <p className="font-medium text-sm text-destructive mb-1">❌ Cherry-Picking Time Periods</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Wrong:</strong> Calculating OEE only for "good" shifts or excluding problem days<br/>
                  <strong>Right:</strong> Consistent measurement over defined periods (daily, weekly)<br/>
                  <strong>Why:</strong> OEE must reflect reality, not best-case scenarios
                </p>
              </div>

              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                <p className="font-medium text-sm text-destructive mb-1">❌ Not Counting Minor Stops</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Wrong:</strong> Only recording downtime above 5 minutes<br/>
                  <strong>Right:</strong> Performance naturally captures minor stops (reflected in lower total count)<br/>
                  <strong>Why:</strong> Short stops below 5 min show up as reduced performance, not availability
                </p>
              </div>

              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                <p className="font-medium text-sm text-destructive mb-1">❌ Double-Counting Losses</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Wrong:</strong> Subtracting time for defects from run time AND in quality calculation<br/>
                  <strong>Right:</strong> Defects impact Quality factor only, not Run Time<br/>
                  <strong>Why:</strong> Each loss should be counted in only one OEE component
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              OEE Improvement Strategies
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-2">Strategy 1: Focus on the Limiting Factor</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Principle:</strong> Improve the lowest OEE component first for maximum impact<br/>
                  <strong>Example:</strong> If A=75%, P=90%, Q=95%, focus on Availability<br/>
                  <strong>Why:</strong> 10% improvement in Availability (75%→82.5%) gives bigger OEE boost than 
                  10% in Quality (95%→100%): 0.825×0.90×0.95 = 70.5% vs 0.75×0.90×1.0 = 67.5%
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-2">Strategy 2: Attack the Six Big Losses</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Method:</strong> Pareto analysis - which loss categories cost most time?<br/>
                  <strong>Action:</strong> Form focused improvement teams on top 2-3 losses<br/>
                  <strong>Tools:</strong> Root cause analysis (5 Whys, Fishbone), FMEA, kaizen events
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-2">Strategy 3: Implement TPM (Total Productive Maintenance)</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Pillars:</strong> Autonomous maintenance, planned maintenance, quality maintenance<br/>
                  <strong>Impact:</strong> Reduces breakdowns (Availability) and defects (Quality)<br/>
                  <strong>Quick Win:</strong> 5S + visual management + operator-led cleaning/inspection
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-2">Strategy 4: Quick Changeover (SMED)</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Goal:</strong> Reduce changeover time to single-digit minutes<br/>
                  <strong>Method:</strong> Separate internal (machine stopped) from external (during run) work<br/>
                  <strong>Impact:</strong> Can reduce setup from hours to minutes, boosting Availability
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-2">Strategy 5: Standardize and Train</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Actions:</strong> Document best practices, create visual work instructions<br/>
                  <strong>Training:</strong> Ensure all operators trained on standard work<br/>
                  <strong>Impact:</strong> Reduces variation in Performance and Quality
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Best Practices for OEE Implementation
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Data Collection</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Automate data collection where possible (sensors, MES)</li>
                  <li>• If manual, use simple, standardized forms</li>
                  <li>• Capture downtime reasons, not just duration</li>
                  <li>• Record in real-time, not end-of-shift</li>
                  <li>• Validate data quality weekly</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Reporting & Review</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Calculate OEE at shift level minimum</li>
                  <li>• Display real-time OEE on shop floor (Andon)</li>
                  <li>• Daily review of losses with team</li>
                  <li>• Weekly deep-dive on chronic issues</li>
                  <li>• Monthly trend analysis and target setting</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Team Engagement</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Operators own OEE for their equipment</li>
                  <li>• Tie improvement suggestions to OEE impact</li>
                  <li>• Celebrate wins (before/after OEE)</li>
                  <li>• Share best practices across lines/shifts</li>
                  <li>• No blame culture - focus on system improvement</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Continuous Improvement</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Set aggressive but achievable targets (3-5% annual gain)</li>
                  <li>• Run focused kaizen events on worst losses</li>
                  <li>• Standardize improvements to prevent regression</li>
                  <li>• Benchmark against internal best and external world-class</li>
                  <li>• Link OEE to business KPIs (cost, delivery, profit)</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Info className="w-4 h-4" />
              OEE vs Other Metrics
            </h3>
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead>What It Measures</TableHead>
                  <TableHead>When to Use</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">OEE</TableCell>
                  <TableCell>Overall equipment effectiveness (A × P × Q)</TableCell>
                  <TableCell>Comprehensive view of all losses</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Uptime</TableCell>
                  <TableCell>% of time equipment is running</TableCell>
                  <TableCell>Same as Availability component</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">FPY</TableCell>
                  <TableCell>First Pass Yield (good units / total)</TableCell>
                  <TableCell>Same as Quality component</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Utilization</TableCell>
                  <TableCell>% of calendar time in use</TableCell>
                  <TableCell>Planning/scheduling, not efficiency</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">TEEP</TableCell>
                  <TableCell>Total Effective Equipment Performance</TableCell>
                  <TableCell>Like OEE but vs. 24/7 (includes utilization)</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-primary">Remember:</strong> OEE is not just a metric - it's a management system. 
              The real value comes from using OEE to drive structured problem-solving and continuous improvement. 
              Don't just measure it - act on it. Focus improvement efforts on the limiting factor and the biggest 
              losses. Engage operators in improvement - they're closest to the equipment and know the problems best. 
              Finally, be patient: sustainable OEE improvement takes time, typically 3-5 years to reach world-class.
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
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4"><Gauge className="w-6 h-6 text-primary" /></div>
        <h1 className="text-2xl font-semibold">OEE Analysis</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Overall Equipment Effectiveness measures manufacturing productivity by combining Availability, Performance, and Quality.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {[{ icon: Clock, title: "Availability", desc: "Run Time / Planned Production Time" }, { icon: Zap, title: "Performance", desc: "Actual Output / Theoretical Output" }, { icon: Target, title: "Quality", desc: "Good Count / Total Count" }].map((item) => (
          <div key={item.title} className="p-5 rounded-lg border border-border bg-muted/10">
            <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><item.icon className="w-5 h-5 text-primary" /></div><div><p className="font-medium">{item.title}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div></div>
          </div>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Info className="w-5 h-5 text-primary" />When to Use OEE</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div><h4 className="font-medium text-primary mb-3">Requirements</h4><ul className="space-y-2 text-sm text-muted-foreground">{["Planned production time data", "Run time or downtime records", "Production counts (total/good)", "Ideal cycle time or rate"].map((r) => <li key={r} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />{r}</li>)}</ul></div>
            <div><h4 className="font-medium text-primary mb-3">Results</h4><ul className="space-y-2 text-sm text-muted-foreground">{["OEE score (A × P × Q)", "Six Big Losses breakdown", "Limiting factor identification", "World-class benchmark comparison"].map((r) => <li key={r} className="flex items-start gap-2"><TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />{r}</li>)}</ul></div>
          </div>
        </CardContent>
      </Card>
      <Card><CardContent className="pt-6"><div className="flex flex-col sm:flex-row gap-3 justify-center"><Button onClick={onLoadSample} className="gap-2"><Activity className="w-4 h-4" />Load Sample Data</Button><Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2"><Upload className="w-4 h-4" />Upload Your Data</Button><input ref={fileInputRef} type="file" accept=".csv" onChange={onFileUpload} className="hidden" /></div></CardContent></Card>
    </div>
  );
};

export default function OEEPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<OEEResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);  
  const [plannedTimeCol, setPlannedTimeCol] = useState<string>("");
  const [runTimeCol, setRunTimeCol] = useState<string>("");
  const [downtimeCol, setDowntimeCol] = useState<string>("");
  const [totalCountCol, setTotalCountCol] = useState<string>("");
  const [goodCountCol, setGoodCountCol] = useState<string>("");
  const [defectCountCol, setDefectCountCol] = useState<string>("");
  const [idealCycleTimeCol, setIdealCycleTimeCol] = useState<string>("");
  const [timeCol, setTimeCol] = useState<string>("");
  const [equipmentCol, setEquipmentCol] = useState<string>("");
  const [manualPlannedTime, setManualPlannedTime] = useState<string>("480");
  const [manualIdealCycleTime, setManualIdealCycleTime] = useState<string>("0.5");
  const [targetOEE, setTargetOEE] = useState<string>("85");
  const [targetAvailability, setTargetAvailability] = useState<string>("90");
  const [targetPerformance, setTargetPerformance] = useState<string>("95");
  const [targetQuality, setTargetQuality] = useState<string>("99.9");

  const handleLoadSample = useCallback(() => { const d = generateSampleData(); setData(d); setColumns(Object.keys(d[0])); setPlannedTimeCol("planned_time"); setRunTimeCol("run_time"); setTotalCountCol("total_count"); setGoodCountCol("good_count"); setDefectCountCol("defect_count"); setIdealCycleTimeCol("ideal_cycle_time"); setTimeCol("date"); setEquipmentCol("equipment"); setCurrentStep(2); setResults(null); setError(null); }, []);
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; const text = await file.text(); const lines = text.trim().split('\n'); const headers = lines[0].split(',').map(h => h.trim()); const rows = lines.slice(1).map(line => { const v = line.split(','); const row: DataRow = {}; headers.forEach((h, i) => { const val = v[i]?.trim(); row[h] = val === '' ? null : isNaN(Number(val)) ? val : Number(val); }); return row; }); setData(rows); setColumns(headers); setCurrentStep(2); setResults(null); setError(null); }, []);
  const getValidationChecks = useCallback((): ValidationCheck[] => [{ name: "Data Loaded", passed: data.length > 0, message: data.length > 0 ? `${data.length} rows` : "No data" }, { name: "Time Data", passed: !!(plannedTimeCol || manualPlannedTime), message: plannedTimeCol || `Manual: ${manualPlannedTime} min` }, { name: "Production Count", passed: !!totalCountCol, message: totalCountCol || "Select column" }, { name: "Quality Data", passed: !!(goodCountCol || defectCountCol), message: goodCountCol || defectCountCol || "Select column" }], [data, plannedTimeCol, manualPlannedTime, totalCountCol, goodCountCol, defectCountCol]);

  const runAnalysis = async () => {
    try { setLoading(true); setError(null);
      const payload = { data, planned_production_time_col: plannedTimeCol || null, run_time_col: runTimeCol || null, downtime_col: downtimeCol || null, total_count_col: totalCountCol || null, good_count_col: goodCountCol || null, defect_count_col: defectCountCol || null, ideal_cycle_time_col: idealCycleTimeCol || null, time_col: timeCol || null, equipment_col: equipmentCol || null, planned_production_time: manualPlannedTime ? parseFloat(manualPlannedTime) : null, ideal_cycle_time: manualIdealCycleTime ? parseFloat(manualIdealCycleTime) : null, target_oee: parseFloat(targetOEE), target_availability: parseFloat(targetAvailability), target_performance: parseFloat(targetPerformance), target_quality: parseFloat(targetQuality) };
      const res = await fetch(`${FASTAPI_URL}/api/analysis/oee`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).detail || "Analysis failed");
      setResults(await res.json()); setCurrentStep(4);
    } catch (err) { setError(err instanceof Error ? err.message : "Analysis failed"); } finally { setLoading(false); }
  };

  const handleDownloadCSV = () => { if (!results) return; const m = results.metrics; const csv = `Metric,Value\nOEE,${m.oee.toFixed(2)}%\nAvailability,${m.availability.toFixed(2)}%\nPerformance,${m.performance.toFixed(2)}%\nQuality,${m.quality.toFixed(2)}%\nPlanned Time,${m.planned_time}\nRun Time,${m.run_time}\nGood Count,${m.good_count}`; const blob = new Blob([csv], { type: "text/csv" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "oee_results.csv"; a.click(); };
  const handleDownloadPNG = (k: string) => { if (!results?.visualizations) return; const b = results.visualizations[k as keyof typeof results.visualizations]; if (!b) return; const a = document.createElement("a"); a.href = `data:image/png;base64,${b}`; a.download = `oee_${k}.png`; a.click(); };

  const renderStep2Config = () => (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Settings className="w-5 h-5 text-primary" />Configuration</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3"><Label className="text-sm font-medium flex items-center gap-2"><Clock className="w-4 h-4 text-primary" />Time Variables</Label>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label className="text-xs">Planned Time</Label><Select value={plannedTimeCol} onValueChange={setPlannedTimeCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="__none__">-- None --</SelectItem>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>{!plannedTimeCol && <Input type="number" placeholder="Manual (min)" value={manualPlannedTime} onChange={e => setManualPlannedTime(e.target.value)} />}</div>
            <div className="space-y-2"><Label className="text-xs">Run Time</Label><Select value={runTimeCol} onValueChange={setRunTimeCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="__none__">-- None --</SelectItem>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label className="text-xs">Downtime (Alt)</Label><Select value={downtimeCol} onValueChange={setDowntimeCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="__none__">-- None --</SelectItem>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
          </div>
        </div>
        <Separator />
        <div className="space-y-3"><Label className="text-sm font-medium flex items-center gap-2"><Package className="w-4 h-4 text-primary" />Production Variables</Label>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label className="text-xs">Total Count *</Label><Select value={totalCountCol} onValueChange={setTotalCountCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="__none__">-- None --</SelectItem>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label className="text-xs">Good Count</Label><Select value={goodCountCol} onValueChange={setGoodCountCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="__none__">-- None --</SelectItem>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label className="text-xs">Defect Count</Label><Select value={defectCountCol} onValueChange={setDefectCountCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="__none__">-- None --</SelectItem>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
          </div>
        </div>
        <Separator />
        <div className="space-y-3"><Label className="text-sm font-medium flex items-center gap-2"><Zap className="w-4 h-4 text-primary" />Performance</Label>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label className="text-xs">Ideal Cycle Time</Label><Select value={idealCycleTimeCol} onValueChange={setIdealCycleTimeCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="__none__">-- None --</SelectItem>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>{!idealCycleTimeCol && <Input type="number" step="0.01" placeholder="Manual (min/unit)" value={manualIdealCycleTime} onChange={e => setManualIdealCycleTime(e.target.value)} />}</div>
          </div>
        </div>
        <Separator />
        <div className="space-y-3"><Label className="text-sm font-medium flex items-center gap-2"><Settings className="w-4 h-4 text-primary" />Grouping (Optional)</Label>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label className="text-xs">Time Period</Label><Select value={timeCol} onValueChange={setTimeCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="__none__">-- None --</SelectItem>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label className="text-xs">Equipment</Label><Select value={equipmentCol} onValueChange={setEquipmentCol}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="__none__">-- None --</SelectItem>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
          </div>
        </div>
        <Separator />
        <div className="space-y-3"><Label className="text-sm font-medium flex items-center gap-2"><Target className="w-4 h-4 text-primary" />Targets</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2"><Label className="text-xs">OEE (%)</Label><Input type="number" value={targetOEE} onChange={e => setTargetOEE(e.target.value)} /></div>
            <div className="space-y-2"><Label className="text-xs">Availability (%)</Label><Input type="number" value={targetAvailability} onChange={e => setTargetAvailability(e.target.value)} /></div>
            <div className="space-y-2"><Label className="text-xs">Performance (%)</Label><Input type="number" value={targetPerformance} onChange={e => setTargetPerformance(e.target.value)} /></div>
            <div className="space-y-2"><Label className="text-xs">Quality (%)</Label><Input type="number" value={targetQuality} onChange={e => setTargetQuality(e.target.value)} /></div>
          </div>
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

  const renderStep4Summary = () => { if (!results) return null; const { metrics: m, summary: s, losses } = results;
    const finding = `OEE = ${m.oee.toFixed(1)}% (A=${m.availability.toFixed(1)}% × P=${m.performance.toFixed(1)}% × Q=${m.quality.toFixed(1)}%). Limiting factor: ${s.limiting_factor}.`;
    const isGood = m.oee >= 85;
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Activity className="w-5 h-5 text-primary" />Results</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} status={isGood ? "positive" : m.oee >= 65 ? "neutral" : "warning"} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><MetricCard value={`${m.oee.toFixed(1)}%`} label="OEE" icon={Gauge} highlight={isGood} warning={m.oee < 40} /><MetricCard value={`${m.availability.toFixed(1)}%`} label="Availability" icon={Clock} /><MetricCard value={`${m.performance.toFixed(1)}%`} label="Performance" icon={Zap} /><MetricCard value={`${m.quality.toFixed(1)}%`} label="Quality" icon={Target} /></div>
          <div className="grid md:grid-cols-4 gap-3"><div className="p-3 rounded-lg border border-border bg-muted/10 text-center"><p className="text-xs text-muted-foreground">Planned Time</p><p className="text-lg font-bold">{m.planned_time.toFixed(0)} min</p></div><div className="p-3 rounded-lg border border-border bg-muted/10 text-center"><p className="text-xs text-muted-foreground">Run Time</p><p className="text-lg font-bold">{m.run_time.toFixed(0)} min</p></div><div className="p-3 rounded-lg border border-border bg-muted/10 text-center"><p className="text-xs text-muted-foreground">Good Units</p><p className="text-lg font-bold">{m.good_count.toLocaleString()}</p></div><div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-center"><p className="text-xs text-muted-foreground">Total Loss</p><p className="text-lg font-bold text-destructive">{losses.total_loss_time.toFixed(0)} min</p></div></div>
          {results.key_insights.map((ins, i) => (<div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${ins.status === "positive" ? "border-primary/30 bg-primary/5" : ins.status === "warning" ? "border-destructive/30 bg-destructive/5" : "border-border"}`}>{ins.status === "positive" ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> : ins.status === "warning" ? <AlertTriangle className="w-5 h-5 text-destructive shrink-0" /> : <Info className="w-5 h-5 shrink-0" />}<div><p className="font-medium text-sm">{ins.title}</p><p className="text-sm text-muted-foreground">{ins.description}</p></div></div>))}
          <DetailParagraph title="Summary Interpretation" detail={`OEE analysis was conducted on ${data.length} production records.

■ OEE Calculation
OEE = Availability × Performance × Quality
OEE = ${m.availability.toFixed(1)}% × ${m.performance.toFixed(1)}% × ${m.quality.toFixed(1)}% = ${m.oee.toFixed(1)}%

■ Component Breakdown
• Availability: ${m.run_time.toFixed(0)} / ${m.planned_time.toFixed(0)} min = ${m.availability.toFixed(1)}%
• Performance: Speed efficiency = ${m.performance.toFixed(1)}%
• Quality: ${m.good_count} / ${m.total_count} units = ${m.quality.toFixed(1)}%

■ Loss Analysis
• Availability Loss: ${losses.availability_loss.toFixed(0)} min (downtime)
• Performance Loss: ${losses.performance_loss.toFixed(0)} min (speed loss)
• Quality Loss: ${losses.quality_loss.toFixed(0)} min (defects)
• Total Loss: ${losses.total_loss_time.toFixed(0)} min

■ Assessment
• Limiting Factor: ${s.limiting_factor}
• World-Class Benchmark: ≥85% OEE
• Status: ${m.oee >= 85 ? 'WORLD-CLASS' : m.oee >= 65 ? 'GOOD' : m.oee >= 40 ? 'TYPICAL' : 'LOW'}`} />
          <div className="flex justify-end pt-4"><Button onClick={() => setCurrentStep(5)} className="gap-2">Understand Why<ArrowRight className="w-4 h-4" /></Button></div>
        </CardContent>
      </Card>
    );
  };

  const renderStep5Why = () => { if (!results) return null; const { metrics: m, losses } = results;
    const exps = [{ n: 1, t: "OEE Formula", c: `A × P × Q = ${m.availability.toFixed(1)}% × ${m.performance.toFixed(1)}% × ${m.quality.toFixed(1)}% = ${m.oee.toFixed(1)}%` }, { n: 2, t: "Availability", c: `Run/Planned = ${m.run_time.toFixed(0)}/${m.planned_time.toFixed(0)} min. Downtime: ${m.downtime.toFixed(0)} min` }, { n: 3, t: "Performance", c: `Speed efficiency. Loss: ${m.speed_loss_time.toFixed(0)} min` }, { n: 4, t: "Quality", c: `Good/Total = ${m.good_count}/${m.total_count}. Defects: ${m.defect_count}` }];
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><HelpCircle className="w-5 h-5 text-primary" />Understanding OEE</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">{exps.map(e => (<div key={e.n} className="p-4 rounded-lg border border-border bg-muted/10"><div className="flex items-start gap-3"><div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">{e.n}</div><div><p className="font-medium text-sm">{e.t}</p><p className="text-xs text-muted-foreground mt-1">{e.c}</p></div></div></div>))}</div>
          <DetailParagraph title="Six Big Losses Explanation" detail={`OEE addresses the Six Big Losses that reduce equipment effectiveness:

■ Availability Losses (Downtime)
1. Equipment Failure: Unplanned stops due to breakdowns
2. Setup & Adjustments: Changeovers and setup time

■ Performance Losses (Speed)
3. Idling & Minor Stops: Brief stops and interruptions
4. Reduced Speed: Running below optimal cycle time

■ Quality Losses (Defects)
5. Process Defects: Defects during stable production
6. Startup Rejects: Defects during warmup/startup

■ World-Class Benchmarks
• Availability: ≥90%
• Performance: ≥95%
• Quality: ≥99.9%
• OEE: ≥85%

■ Improvement Priority
Focus on the limiting factor (${results.summary.limiting_factor}) first for maximum impact.`} />
          <div className="flex justify-between pt-4"><Button variant="outline" onClick={() => setCurrentStep(4)}>Back</Button><Button onClick={() => setCurrentStep(6)} className="gap-2">View Report<ArrowRight className="w-4 h-4" /></Button></div>
        </CardContent>
      </Card>
    );
  };

  const renderStep6Report = () => { if (!results) return null; const { metrics: m, losses } = results; return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[{ icon: Gauge, label: "OEE", value: `${m.oee.toFixed(1)}%` }, { icon: Timer, label: "Productive", value: `${m.productive_time.toFixed(0)} min` }, { icon: Package, label: "Good Units", value: m.good_count.toLocaleString() }, { icon: AlertTriangle, label: "Loss", value: `${losses.total_loss_time.toFixed(0)} min` }].map((item) => (<Card key={item.label}><CardContent className="pt-6"><div className="text-center"><item.icon className="w-8 h-8 mx-auto text-primary mb-2" /><p className="text-sm text-muted-foreground">{item.label}</p><p className="text-2xl font-bold">{item.value}</p></div></CardContent></Card>))}</div>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" />Analysis Summary</CardTitle></CardHeader><CardContent><p className="text-sm leading-relaxed text-muted-foreground">OEE analysis on {data.length} records. OEE = {m.oee.toFixed(1)}% calculated as Availability ({m.availability.toFixed(1)}%) × Performance ({m.performance.toFixed(1)}%) × Quality ({m.quality.toFixed(1)}%). Limiting factor: {results.summary.limiting_factor}. Total loss: {losses.total_loss_time.toFixed(0)} min. {m.oee >= 85 ? "Meets world-class standard (≥85%)." : `Falls ${(85 - m.oee).toFixed(1)}% short of world-class (85%).`}</p></CardContent></Card>
      <Card><CardHeader className="pb-3"><CardTitle className="text-base">Visualizations</CardTitle></CardHeader><CardContent><Tabs defaultValue="gauge"><TabsList className="grid w-full grid-cols-3 mb-4"><TabsTrigger value="gauge">Gauge</TabsTrigger><TabsTrigger value="breakdown">Breakdown</TabsTrigger><TabsTrigger value="losses">Losses</TabsTrigger></TabsList>{[{ k: "gauge_chart", t: "gauge" }, { k: "time_breakdown", t: "breakdown" }, { k: "six_losses", t: "losses" }].map(({ k, t }) => (<TabsContent key={k} value={t}>{results.visualizations[k as keyof typeof results.visualizations] && (<div className="relative border rounded-lg overflow-hidden"><img src={`data:image/png;base64,${results.visualizations[k as keyof typeof results.visualizations]}`} alt={k} className="w-full" /><Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => handleDownloadPNG(k)}><Download className="w-4 h-4" /></Button></div>)}</TabsContent>))}</Tabs></CardContent></Card>
      <Card><CardHeader className="pb-3"><CardTitle className="text-base">OEE Components</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Component</TableHead><TableHead className="text-right">Actual</TableHead><TableHead className="text-right">Target</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{[{ name: "Availability", val: m.availability, target: results.targets.availability }, { name: "Performance", val: m.performance, target: results.targets.performance }, { name: "Quality", val: m.quality, target: results.targets.quality }, { name: "OEE", val: m.oee, target: results.targets.oee }].map(c => (<TableRow key={c.name}><TableCell className="font-medium">{c.name}</TableCell><TableCell className="text-right">{c.val.toFixed(1)}%</TableCell><TableCell className="text-right">{c.target}%</TableCell><TableCell><Badge variant={c.val >= c.target ? "default" : "secondary"} className="text-xs">{c.val >= c.target ? "Met" : "Below"}</Badge></TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
      <Card><CardHeader className="pb-3"><CardTitle className="text-base">Six Big Losses</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Category</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Time (min)</TableHead><TableHead className="text-right">%</TableHead></TableRow></TableHeader><TableBody>{losses.losses.map((l, i) => (<TableRow key={i}><TableCell><Badge variant={l.category === "Availability" ? "destructive" : l.category === "Performance" ? "default" : "secondary"} className="text-xs">{l.category}</Badge></TableCell><TableCell className="font-medium">{l.loss_type}</TableCell><TableCell className="text-right">{l.time_loss?.toFixed(1) || "0"}</TableCell><TableCell className="text-right">{l.percentage?.toFixed(1) || "0"}%</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
      
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

      
      <Card><CardHeader className="pb-3"><CardTitle className="text-base">Export</CardTitle></CardHeader><CardContent><div className="flex gap-3"><Button variant="outline" onClick={handleDownloadCSV} className="gap-2"><FileSpreadsheet className="w-4 h-4" />CSV</Button><Button variant="outline" onClick={() => handleDownloadPNG("gauge_chart")} className="gap-2"><Download className="w-4 h-4" />Chart</Button></div></CardContent></Card>
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
            onClick={() => setShowGuide(true)}
            className="gap-2"
          >
            <BookOpen className="w-4 h-4" />
            Guide
          </Button>
        </div>
      )}
      
      <StatisticalGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
      
     
      {currentStep > 1 && <ProgressBar currentStep={currentStep} hasResults={!!results} onStepClick={setCurrentStep} />}
      {currentStep > 1 && data.length > 0 && <DataPreview data={data} columns={columns} filename="oee_data" />}
      {currentStep === 1 && <IntroPage onLoadSample={handleLoadSample} onFileUpload={handleFileUpload} />}
      {currentStep === 2 && renderStep2Config()}
      {currentStep === 3 && renderStep3Validation()}
      {currentStep === 4 && renderStep4Summary()}
      {currentStep === 5 && renderStep5Why()}
      {currentStep === 6 && renderStep6Report()}
    </div>
  );
}