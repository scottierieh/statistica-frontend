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
  Calendar, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle,
  Shield, Info, HelpCircle, FileSpreadsheet, FileText, BookMarked,
  Download, TrendingUp, Settings, Activity, ChevronRight, AlertTriangle, 
  Clock, Cog, Factory, Layers, Timer, Play, Pause, BookOpen, 
  Target, BarChart3, Cpu, Zap, GitBranch, Box
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-995604437166.asia-northeast3.run.app";

interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface TaskAssignment {
  job_id: string;
  task_id: number;
  machine_id: string;
  start_time: number;
  end_time: number;
  duration: number;
}

interface MachineSchedule {
  machine_id: string;
  tasks: TaskAssignment[];
  total_working_time: number;
  idle_time: number;
  utilization: number;
}

interface JobSchedule {
  job_id: string;
  tasks: TaskAssignment[];
  start_time: number;
  end_time: number;
  flow_time: number;
}

interface SchedulingResult {
  success: boolean;
  results: {
    makespan: number;
    total_flow_time: number;
    avg_flow_time: number;
    machine_schedules: MachineSchedule[];
    job_schedules: JobSchedule[];
    task_assignments: TaskAssignment[];
    metrics: {
      total_jobs: number;
      total_machines: number;
      total_tasks: number;
      avg_utilization: number;
      max_utilization: number;
      min_utilization: number;
      idle_time_total: number;
    };
  };
  visualizations: {
    gantt_chart?: string;
    machine_utilization?: string;
    job_flow_times?: string;
    machine_timeline?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    problem_type: string;
    num_jobs: number;
    num_machines: number;
    makespan: number;
    solve_time_ms: number;
  };
}

const PROBLEM_TYPES = [
  { value: "job_shop", label: "Job Shop", desc: "Each job requires specific machine sequence", icon: Factory },
  { value: "flow_shop", label: "Flow Shop", desc: "All jobs follow the same machine order", icon: GitBranch },
  { value: "flexible_job_shop", label: "Flexible Job Shop", desc: "Jobs can choose from multiple machines", icon: Layers },
];

const MACHINE_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

const generateSampleData = (): DataRow[] => {
  const jobs = ['Job_A', 'Job_B', 'Job_C', 'Job_D', 'Job_E', 'Job_F', 'Job_G', 'Job_H'];
  const machines = ['Machine_1', 'Machine_2', 'Machine_3', 'Machine_4'];
  
  const data: DataRow[] = [];
  
  jobs.forEach((job, jobIdx) => {
    const numTasks = 3 + Math.floor(Math.random() * 2); // 3-4 tasks per job
    const machineOrder = [...machines].sort(() => Math.random() - 0.5).slice(0, numTasks);
    
    machineOrder.forEach((machine, taskIdx) => {
      data.push({
        job_id: job,
        task_id: taskIdx + 1,
        machine_id: machine,
        processing_time: 10 + Math.floor(Math.random() * 30), // 10-40 minutes
        priority: jobIdx < 3 ? 'High' : jobIdx < 6 ? 'Medium' : 'Low',
        due_date: 100 + jobIdx * 30,
      });
    });
  });
  
  return data;
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
    a.download = 'scheduling_data.csv';
    a.click();
  };
  
  if (data.length === 0) return null;
  
  return (
    <div className="mb-6 border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-muted/20">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 hover:text-primary transition-colors">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Data Preview</span>
          <Badge variant="secondary" className="text-xs">{data.length} tasks</Badge>
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
                {columns.slice(0, 6).map(col => (
                  <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 10).map((row, i) => (
                <TableRow key={i}>
                  {columns.slice(0, 6).map(col => (
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
              Showing first 10 of {data.length} tasks
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

const GanttBar: React.FC<{ task: TaskAssignment; makespan: number; machineIndex: number }> = ({ task, makespan, machineIndex }) => {
  const left = (task.start_time / makespan) * 100;
  const width = (task.duration / makespan) * 100;
  const color = MACHINE_COLORS[machineIndex % MACHINE_COLORS.length];
  
  return (
    <div
      className="absolute h-6 rounded text-xs flex items-center justify-center text-white font-medium overflow-hidden"
      style={{
        left: `${left}%`,
        width: `${Math.max(width, 2)}%`,
        backgroundColor: color,
        top: '50%',
        transform: 'translateY(-50%)'
      }}
      title={`${task.job_id}: ${task.start_time}-${task.end_time} (${task.duration}min)`}
    >
      {width > 8 && task.job_id}
    </div>
  );
};

const SimpleGantt: React.FC<{ schedules: MachineSchedule[]; makespan: number }> = ({ schedules, makespan }) => {
  if (!schedules || schedules.length === 0) return null;
  
  return (
    <div className="space-y-2">
      {schedules.map((machine, idx) => (
        <div key={machine.machine_id} className="flex items-center gap-2">
          <div className="w-24 text-xs font-medium truncate">{machine.machine_id}</div>
          <div className="flex-1 h-8 bg-muted/30 rounded relative">
            {machine.tasks.map((task, taskIdx) => (
              <GanttBar key={taskIdx} task={task} makespan={makespan} machineIndex={idx} />
            ))}
          </div>
          <div className="w-16 text-xs text-right text-muted-foreground">
            {machine.utilization.toFixed(0)}%
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2 mt-2">
        <div className="w-24"></div>
        <div className="flex-1 flex justify-between text-xs text-muted-foreground">
          <span>0</span>
          <span>{Math.round(makespan / 4)}</span>
          <span>{Math.round(makespan / 2)}</span>
          <span>{Math.round(makespan * 3 / 4)}</span>
          <span>{makespan}</span>
        </div>
        <div className="w-16 text-xs text-right">Util.</div>
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
            <h2 className="text-lg font-semibold">Job Shop Scheduling Guide</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              What is Job Shop Scheduling?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Job shop scheduling optimizes the assignment of jobs to machines to minimize completion time 
              (makespan) while respecting precedence constraints. It's a combinatorial optimization problem 
              widely used in manufacturing, where different jobs require different sequences of operations on 
              different machines.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Problem Types
            </h3>
            <div className="space-y-4">
              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">1. Job Shop Scheduling (JSP)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Characteristics:</strong> Each job has its own specific sequence of machines<br/>
                  <strong>Example:</strong> Job A: M1→M3→M2, Job B: M2→M1→M4<br/>
                  <strong>Complexity:</strong> NP-hard; optimal solution may be intractable for large instances<br/>
                  <strong>Use Case:</strong> Custom manufacturing, specialized production orders
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">2. Flow Shop Scheduling</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Characteristics:</strong> All jobs follow the same machine sequence<br/>
                  <strong>Example:</strong> All jobs: M1→M2→M3→M4<br/>
                  <strong>Complexity:</strong> Still NP-hard but generally easier than JSP<br/>
                  <strong>Use Case:</strong> Assembly lines, production lines with fixed routing
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">3. Flexible Job Shop (FJSP)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Characteristics:</strong> Operations can be performed on alternative machines<br/>
                  <strong>Example:</strong> Task 1 can use M1 OR M2, Task 2 can use M3 OR M4<br/>
                  <strong>Complexity:</strong> More complex than standard JSP<br/>
                  <strong>Use Case:</strong> Modern factories with multi-purpose machines
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
                <p className="font-medium text-sm">Makespan</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total time from start to completion of all jobs. The primary optimization objective. 
                  Lower makespan = faster overall production. Formula: max(completion_time) - min(start_time)
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Flow Time</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Time each job spends in the system from start to finish. Affects work-in-progress (WIP) 
                  inventory and delivery lead times. Formula: completion_time - release_time per job
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Machine Utilization</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Percentage of time a machine is actively working. Target: 70-90%. Above 90% risks 
                  bottlenecks; below 60% indicates excess capacity. Formula: (working_time / makespan) × 100
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Idle Time</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Time when a machine is available but not processing. Caused by job dependencies or 
                  scheduling constraints. Cannot be eliminated entirely in complex schedules.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Tardiness</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Lateness of jobs past their due dates. Critical for customer satisfaction. 
                  Formula: max(0, completion_time - due_date) per job
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              Optimization Algorithms
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>CP-SAT Solver (Used in this tool):</strong> Google OR-Tools Constraint Programming solver. Uses intelligent search and propagation to find optimal/near-optimal solutions efficiently.</p>
              <p><strong>Advantages:</strong> Handles constraints naturally, finds provably optimal solutions for small-medium problems, works well with precedence constraints</p>
              <p><strong>Limitations:</strong> May not find optimal solution for very large problems (100+ jobs/machines) within reasonable time</p>
              <p><strong>Alternative Approaches:</strong> Genetic algorithms (metaheuristic), tabu search, simulated annealing, dispatching rules (greedy heuristics)</p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Interpreting Results
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Good Schedule Indicators:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• Machine utilization 70-90% (balanced workload)</li>
                <li>• No single bottleneck machine at 100% while others idle</li>
                <li>• Jobs complete near their due dates (low tardiness)</li>
                <li>• Minimal gaps between operations on each machine</li>
              </ul>
              <p className="mt-3"><strong>Warning Signs:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• One machine at 95%+ utilization (bottleneck)</li>
                <li>• Other machines below 50% (imbalanced)</li>
                <li>• Large idle gaps indicating poor sequencing</li>
                <li>• Multiple jobs significantly tardy</li>
              </ul>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Common Issues & Solutions
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Issue: Bottleneck Machine</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Symptom:</strong> One machine at 100%, others underutilized<br/>
                  <strong>Solution:</strong> Add capacity (overtime, extra shift), reduce processing time, 
                  move operations to alternative machines if possible
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Issue: High Tardiness</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Symptom:</strong> Many jobs late<br/>
                  <strong>Solution:</strong> Change objective to minimize tardiness, prioritize urgent jobs, 
                  negotiate due dates, reduce makespan
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Issue: Large Idle Times</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Symptom:</strong> Machines waiting frequently<br/>
                  <strong>Solution:</strong> Review job sequences, reduce setup times, overlap operations 
                  where possible, add buffer jobs
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Issue: No Feasible Solution</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Symptom:</strong> Solver cannot find schedule<br/>
                  <strong>Solution:</strong> Check for circular dependencies, verify task sequences, 
                  increase max solve time, relax constraints
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
                  <li>• Use realistic processing times (include setup)</li>
                  <li>• Verify machine sequences are correct</li>
                  <li>• Include all precedence constraints</li>
                  <li>• Consider machine availability windows</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Schedule Execution</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Add buffer time for uncertainties (10-15%)</li>
                  <li>• Monitor progress vs. plan in real-time</li>
                  <li>• Communicate changes immediately</li>
                  <li>• Have contingency plans for disruptions</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Model Validation</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Compare with historical performance</li>
                  <li>• Verify no constraint violations</li>
                  <li>• Check if results are realistic</li>
                  <li>• Test with different scenarios</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Continuous Improvement</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Re-optimize daily/weekly</li>
                  <li>• Track actual vs. planned makespan</li>
                  <li>• Identify recurring bottlenecks</li>
                  <li>• Update processing times from actuals</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              When to Re-Schedule
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Immediate Re-optimization Needed:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• Machine breakdown or unplanned maintenance</li>
                <li>• Rush order with tight deadline inserted</li>
                <li>• Job cancellation or priority change</li>
                <li>• Actual processing time exceeds plan by {'>'} 20%</li>
              </ul>
              <p className="mt-3"><strong>Periodic Re-optimization (Daily/Weekly):</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• New jobs added to backlog</li>
                <li>• Minor schedule drift accumulating</li>
                <li>• Demand forecast updated</li>
                <li>• Resource availability changes</li>
              </ul>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-primary">Important:</strong> Job shop scheduling provides an 
              optimal plan based on given constraints and data. Real-world execution will always deviate 
              due to uncertainties. Use the schedule as a guide, build in buffers, monitor actively, 
              and be prepared to re-optimize as conditions change.
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
          <Calendar className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">Job Shop Scheduling</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Optimize production schedules to minimize makespan and maximize machine utilization.
          Assign jobs to machines in the most efficient sequence.
        </p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-4">
        {PROBLEM_TYPES.map((type) => (
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
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-5 h-5 text-primary" />
            When to Use Job Shop Scheduling
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary mb-3">Requirements</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Job ID (Job identifier)",
                  "Machine ID (Machine identifier)",
                  "Processing Time",
                  "Task Order (optional)",
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
                  "Optimal schedule (Gantt chart)",
                  "Makespan (Total completion time)",
                  "Machine utilization",
                  "Job flow times",
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

export default function SchedulingAnalysisPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<SchedulingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);  

  // Configuration
  const [jobCol, setJobCol] = useState<string>("");
  const [machineCol, setMachineCol] = useState<string>("");
  const [processingTimeCol, setProcessingTimeCol] = useState<string>("");
  const [taskOrderCol, setTaskOrderCol] = useState<string>("");
  const [priorityCol, setPriorityCol] = useState<string>("");
  const [dueDateCol, setDueDateCol] = useState<string>("");
  
  const [problemType, setProblemType] = useState<string>("job_shop");
  const [objective, setObjective] = useState<string>("makespan");
  const [maxTime, setMaxTime] = useState<string>("30");

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    setColumns(Object.keys(sampleData[0]));
    setJobCol("job_id");
    setMachineCol("machine_id");
    setProcessingTimeCol("processing_time");
    setTaskOrderCol("task_id");
    setPriorityCol("priority");
    setDueDateCol("due_date");
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

  const uniqueJobs = React.useMemo(() => {
    if (!jobCol || data.length === 0) return [];
    return [...new Set(data.map(d => String(d[jobCol])))];
  }, [data, jobCol]);

  const uniqueMachines = React.useMemo(() => {
    if (!machineCol || data.length === 0) return [];
    return [...new Set(data.map(d => String(d[machineCol])))];
  }, [data, machineCol]);

  const getValidationChecks = useCallback((): ValidationCheck[] => {
    const checks: ValidationCheck[] = [
      {
        name: "Data Loaded",
        passed: data.length > 0,
        message: data.length > 0 ? `${data.length} tasks loaded` : "No data loaded"
      },
      {
        name: "Job Column",
        passed: !!jobCol,
        message: jobCol ? `${uniqueJobs.length} unique jobs` : "Select job column"
      },
      {
        name: "Machine Column",
        passed: !!machineCol,
        message: machineCol ? `${uniqueMachines.length} machines` : "Select machine column"
      },
      {
        name: "Processing Time",
        passed: !!processingTimeCol,
        message: processingTimeCol ? `Using: ${processingTimeCol}` : "Select processing time column"
      },
      {
        name: "Sufficient Data",
        passed: uniqueJobs.length >= 2 && uniqueMachines.length >= 2,
        message: uniqueJobs.length >= 2 && uniqueMachines.length >= 2 
          ? `${uniqueJobs.length} jobs × ${uniqueMachines.length} machines` 
          : "Need at least 2 jobs and 2 machines"
      }
    ];
    
    return checks;
  }, [data, jobCol, machineCol, processingTimeCol, uniqueJobs, uniqueMachines]);

  const runOptimization = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        data,
        job_col: jobCol,
        machine_col: machineCol,
        processing_time_col: processingTimeCol,
        task_order_col: taskOrderCol || null,
        priority_col: priorityCol || null,
        due_date_col: dueDateCol || null,
        problem_type: problemType,
        objective,
        max_time_seconds: parseInt(maxTime) || 30,
      };
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/scheduling`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Optimization failed");
      }
      
      const result: SchedulingResult = await res.json();
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
    const tasks = results.results.task_assignments;
    
    const rows: string[] = ['Job,Task,Machine,Start,End,Duration'];
    tasks.forEach(t => {
      rows.push(`${t.job_id},${t.task_id},${t.machine_id},${t.start_time},${t.end_time},${t.duration}`);
    });
    
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'schedule.csv';
    a.click();
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const base64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!base64) return;
    const a = document.createElement('a');
    a.href = `data:image/png;base64,${base64}`;
    a.download = `scheduling_${chartKey}.png`;
    a.click();
  };

  // Step 2: Configuration
  const renderStep2Config = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5 text-primary" />
          Configure Scheduling
        </CardTitle>
        <CardDescription>Set up job shop scheduling parameters</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Problem Type */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Problem Type
          </h4>
          <div className="grid md:grid-cols-3 gap-3">
            {PROBLEM_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setProblemType(type.value)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  problemType === type.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <type.icon className="w-5 h-5 text-primary mb-2" />
                <p className="font-medium text-sm">{type.label}</p>
                <p className="text-xs text-muted-foreground">{type.desc}</p>
              </button>
            ))}
          </div>
        </div>
        
        <Separator />
        
        {/* Required Columns */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Cog className="w-4 h-4 text-primary" />
            Required Columns
          </h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Job ID *</Label>
              <Select value={jobCol || "__none__"} onValueChange={v => setJobCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Select --</SelectItem>
                  {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Machine ID *</Label>
              <Select value={machineCol || "__none__"} onValueChange={v => setMachineCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Select --</SelectItem>
                  {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Processing Time *</Label>
              <Select value={processingTimeCol || "__none__"} onValueChange={v => setProcessingTimeCol(v === "__none__" ? "" : v)}>
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
        
        {/* Optional Columns */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Optional Columns
          </h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Task Order</Label>
              <Select value={taskOrderCol || "__none__"} onValueChange={v => setTaskOrderCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Optional --</SelectItem>
                  {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priorityCol || "__none__"} onValueChange={v => setPriorityCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Optional --</SelectItem>
                  {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Select value={dueDateCol || "__none__"} onValueChange={v => setDueDateCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Optional --</SelectItem>
                  {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Objective */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Optimization Objective
          </h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Objective Function</Label>
              <Select value={objective} onValueChange={setObjective}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="makespan">Minimize Makespan (Total completion time)</SelectItem>
                  <SelectItem value="flow_time">Minimize Total Flow Time</SelectItem>
                  <SelectItem value="tardiness">Minimize Tardiness (Late delivery)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Max Solve Time (seconds)</Label>
              <Input type="number" min="5" max="300" value={maxTime} onChange={e => setMaxTime(e.target.value)} />
            </div>
          </div>
        </div>
        
        {/* Preview */}
        {uniqueJobs.length > 0 && uniqueMachines.length > 0 && (
          <>
            <Separator />
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Data Preview
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="text-sm font-medium mb-2">Jobs ({uniqueJobs.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {uniqueJobs.slice(0, 10).map(job => (
                      <Badge key={job} variant="secondary" className="text-xs">{job}</Badge>
                    ))}
                    {uniqueJobs.length > 10 && <Badge variant="outline" className="text-xs">+{uniqueJobs.length - 10} more</Badge>}
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="text-sm font-medium mb-2">Machines ({uniqueMachines.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {uniqueMachines.map((machine, idx) => (
                      <Badge key={machine} className="text-xs" style={{ backgroundColor: MACHINE_COLORS[idx % MACHINE_COLORS.length] }}>
                        {machine}
                      </Badge>
                    ))}
                  </div>
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
                  {`Objective: ${objective} • `}
                  {`${uniqueJobs.length} jobs × ${uniqueMachines.length} machines`}
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
    
    const finding = `Optimal schedule found with makespan of ${r.makespan} minutes. ${summary.num_jobs} jobs scheduled across ${summary.num_machines} machines with ${r.metrics.avg_utilization.toFixed(1)}% average utilization. Solve time: ${summary.solve_time_ms}ms.`;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
            Scheduling Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={`${r.makespan} min`} label="Makespan" icon={Timer} highlight />
            <MetricCard value={summary.num_jobs} label="Jobs" icon={Box} />
            <MetricCard value={summary.num_machines} label="Machines" icon={Cpu} />
            <MetricCard value={`${r.metrics.avg_utilization.toFixed(0)}%`} label="Avg Utilization" icon={BarChart3} />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={`${r.avg_flow_time.toFixed(1)} min`} label="Avg Flow Time" />
            <MetricCard value={r.metrics.total_tasks} label="Total Tasks" />
            <MetricCard value={`${r.metrics.idle_time_total} min`} label="Total Idle Time" negative={r.metrics.idle_time_total > r.makespan * 0.3} />
            <MetricCard value={`${summary.solve_time_ms}ms`} label="Solve Time" />
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Gantt Chart
            </h4>
            <div className="p-4 rounded-lg border border-border bg-muted/10">
              <SimpleGantt schedules={r.machine_schedules} makespan={r.makespan} />
            </div>
          </div>
          
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
            detail={`This job shop scheduling optimization used Google OR-Tools CP-SAT solver.

■ Scheduling Overview
Job Shop Scheduling optimizes the assignment of multiple jobs to multiple machines to minimize the total completion time (Makespan).

• Problem Size:
  - Jobs: ${summary.num_jobs}
  - Machines: ${summary.num_machines}
  - Total Tasks: ${r.metrics.total_tasks}
  - Problem Type: ${PROBLEM_TYPES.find(t => t.value === problemType)?.label}

• Solution Quality:
  - Makespan: ${r.makespan} minutes
  - Average Flow Time: ${r.avg_flow_time.toFixed(1)} minutes
  - Total Flow Time: ${r.total_flow_time} minutes

■ Machine Utilization Analysis

${r.machine_schedules.map(m => `• ${m.machine_id}: ${m.utilization.toFixed(1)}% utilization, ${m.idle_time} min idle`).join('\n')}

Average: ${r.metrics.avg_utilization.toFixed(1)}%
Range: ${r.metrics.min_utilization.toFixed(1)}% - ${r.metrics.max_utilization.toFixed(1)}%

${r.metrics.avg_utilization >= 80 ? '✓ High utilization - machines are being used efficiently' : 
  r.metrics.avg_utilization >= 60 ? '△ Moderate utilization - room for improvement' :
  '⚠ Low utilization - consider reducing machines or adding more jobs'}

■ Job Flow Time Analysis

${r.job_schedules.slice(0, 5).map(j => `• ${j.job_id}: Start=${j.start_time}, End=${j.end_time}, Flow=${j.flow_time}min`).join('\n')}
${r.job_schedules.length > 5 ? `... and ${r.job_schedules.length - 5} more jobs` : ''}`}
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

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <HelpCircle className="w-5 h-5 text-primary" />
            Understanding the Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding="Job Shop Scheduling optimizes the assignment of jobs to machines to minimize total completion time while respecting precedence constraints and machine availability." />
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Key Concepts</h4>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { num: 1, title: "Makespan", content: "The total time from the start of the first job to the completion of the last job. This is the primary optimization objective in most scheduling problems." },
                { num: 2, title: "Flow Time", content: "The time each job spends in the system (completion time - release time). Minimizing average flow time improves customer satisfaction." },
                { num: 3, title: "Machine Utilization", content: "The percentage of time a machine is actively processing jobs. Higher utilization means better resource efficiency." },
                { num: 4, title: "Idle Time", content: "Time when a machine is available but not processing any job. Caused by job dependencies or scheduling gaps." },
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
            <h4 className="font-medium text-sm">Machine-by-Machine Analysis</h4>
            <div className="space-y-3">
              {r.machine_schedules.map((machine, idx) => {
                const isBottleneck = machine.utilization >= r.metrics.max_utilization - 1;
                const isUnderutilized = machine.utilization < r.metrics.avg_utilization * 0.7;
                
                return (
                  <div key={machine.machine_id} className={`p-4 rounded-lg border ${isBottleneck ? 'border-amber-500/30 bg-amber-500/5' : isUnderutilized ? 'border-blue-500/30 bg-blue-500/5' : 'border-border bg-muted/10'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-semibold" style={{ backgroundColor: MACHINE_COLORS[idx % MACHINE_COLORS.length] }}>
                          {idx + 1}
                        </div>
                        <span className="font-medium">{machine.machine_id}</span>
                        {isBottleneck && <Badge variant="outline" className="text-xs text-amber-600">Bottleneck</Badge>}
                        {isUnderutilized && <Badge variant="outline" className="text-xs text-blue-600">Underutilized</Badge>}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Tasks</p>
                        <p className="font-medium">{machine.tasks.length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Working Time</p>
                        <p className="font-medium">{machine.total_working_time} min</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Idle Time</p>
                        <p className="font-medium">{machine.idle_time} min</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Utilization</p>
                        <p className={`font-medium ${machine.utilization >= 80 ? 'text-green-600' : machine.utilization < 50 ? 'text-red-600' : ''}`}>
                          {machine.utilization.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-2">
                      {isBottleneck ? 'This machine determines the makespan. Consider adding capacity or redistributing work.' :
                       isUnderutilized ? 'This machine has spare capacity. Consider moving tasks here if possible.' :
                       'Normal utilization within acceptable range.'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
          
          <DetailParagraph
            title="Strategic Recommendations"
            detail={`Based on the scheduling optimization results, here are recommendations for improving production efficiency.

■ 1. Bottleneck Management

${r.machine_schedules.filter(m => m.utilization >= r.metrics.max_utilization - 1).length > 0 ? 
`【Bottleneck Identified】
The following machines are limiting throughput:
${r.machine_schedules.filter(m => m.utilization >= r.metrics.max_utilization - 1).map(m => `• ${m.machine_id}: ${m.utilization.toFixed(1)}% utilization`).join('\n')}

Recommendations:
• Add capacity to bottleneck machines (overtime, additional shifts)
• Reduce processing times through process improvement
• Redistribute tasks to underutilized machines if possible
• Consider adding parallel machines for bottleneck operations` :
`【No Clear Bottleneck】
Workload is relatively balanced across machines.`}

■ 2. Utilization Improvement

${r.metrics.avg_utilization < 70 ? 
`【Low Overall Utilization: ${r.metrics.avg_utilization.toFixed(1)}%】
Significant idle time detected. Consider:
• Adding more jobs to the schedule
• Reducing batch sizes for more frequent production
• Cross-training operators to reduce changeover times
• Reviewing job sequencing to reduce gaps` :
`【Good Utilization: ${r.metrics.avg_utilization.toFixed(1)}%】
Machines are being used efficiently.`}

■ 3. Flow Time Optimization

Current average flow time: ${r.avg_flow_time.toFixed(1)} minutes

To reduce flow time:
• Prioritize jobs with earliest due dates
• Reduce work-in-progress (WIP) inventory
• Minimize queue times between operations
• Consider cellular manufacturing for related products

■ 4. Schedule Execution Tips

【For Production Planners】
• Review schedule daily for disruptions
• Build in buffer time for unexpected delays
• Communicate schedule changes immediately
• Track actual vs. planned completion times

【For Machine Operators】
• Follow the assigned sequence strictly
• Report delays immediately
• Prepare materials before scheduled start
• Minimize changeover times

■ 5. Continuous Improvement

【Key Metrics to Track】
• Schedule adherence rate (target: >95%)
• Actual vs. planned makespan
• Machine utilization trends
• On-time delivery rate

【Re-optimization Triggers】
• New jobs added or cancelled
• Machine breakdown or maintenance
• Rush orders with tight deadlines
• Significant processing time changes`}
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

    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b border-border">
          <h1 className="text-xl font-semibold">Job Shop Scheduling Report</h1>
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
              <MetricCard value={`${r.makespan} min`} label="Makespan" highlight />
              <MetricCard value={summary.num_jobs} label="Jobs" />
              <MetricCard value={summary.num_machines} label="Machines" />
              <MetricCard value={`${r.metrics.avg_utilization.toFixed(0)}%`} label="Utilization" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Successfully scheduled {summary.num_jobs} jobs across {summary.num_machines} machines
              with a total makespan of {r.makespan} minutes. Average machine utilization is {r.metrics.avg_utilization.toFixed(1)}%
              with {r.metrics.idle_time_total} minutes of total idle time.
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
        
        {/* Gantt Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Schedule (Gantt Chart)</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleGantt schedules={r.machine_schedules} makespan={r.makespan} />
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
                  {visualizations.gantt_chart && <TabsTrigger value="gantt_chart" className="text-xs">Gantt</TabsTrigger>}
                  {visualizations.machine_utilization && <TabsTrigger value="machine_utilization" className="text-xs">Utilization</TabsTrigger>}
                  {visualizations.job_flow_times && <TabsTrigger value="job_flow_times" className="text-xs">Flow Times</TabsTrigger>}
                  {visualizations.machine_timeline && <TabsTrigger value="machine_timeline" className="text-xs">Timeline</TabsTrigger>}
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
        
        {/* Machine Utilization Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Machine Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Machine</TableHead>
                  <TableHead className="text-right">Tasks</TableHead>
                  <TableHead className="text-right">Working</TableHead>
                  <TableHead className="text-right">Idle</TableHead>
                  <TableHead className="text-right">Utilization</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.machine_schedules.map((machine, idx) => (
                  <TableRow key={machine.machine_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: MACHINE_COLORS[idx % MACHINE_COLORS.length] }} />
                        {machine.machine_id}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{machine.tasks.length}</TableCell>
                    <TableCell className="text-right">{machine.total_working_time} min</TableCell>
                    <TableCell className="text-right">{machine.idle_time} min</TableCell>
                    <TableCell className="text-right font-medium">{machine.utilization.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        {/* Task Schedule Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Detailed Task Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Machine</TableHead>
                  <TableHead className="text-right">Start</TableHead>
                  <TableHead className="text-right">End</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.task_assignments.slice(0, 20).map((task, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{task.job_id}</TableCell>
                    <TableCell>{task.task_id}</TableCell>
                    <TableCell>{task.machine_id}</TableCell>
                    <TableCell className="text-right">{task.start_time}</TableCell>
                    <TableCell className="text-right">{task.end_time}</TableCell>
                    <TableCell className="text-right">{task.duration} min</TableCell>
                  </TableRow>
                ))}
                {r.task_assignments.length > 20 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      ... and {r.task_assignments.length - 20} more tasks
                    </TableCell>
                  </TableRow>
                )}
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
                CSV (Schedule)
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
          <Button variant="outline" onClick={() => setCurrentStep(1)}>New Schedule</Button>
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
      
      {currentStep === 1 && <IntroPage onLoadSample={handleLoadSample} onFileUpload={handleFileUpload} />}
      {currentStep === 2 && renderStep2Config()}
      {currentStep === 3 && renderStep3Validation()}
      {currentStep === 4 && renderStep4Summary()}
      {currentStep === 5 && renderStep5Why()}
      {currentStep === 6 && renderStep6Report()}
    </div>
  );
}
