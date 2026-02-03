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
  Users, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle,
  Shield, Info, HelpCircle, FileSpreadsheet, FileText,
  Download, TrendingUp, Settings, Activity, ChevronRight, AlertTriangle,
  UserCheck, Briefcase, Target, BarChart3, Play, Zap,
  DollarSign, Clock, Award, Link2, GitMerge, Workflow,  BookOpen, BookMarked
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-995604437166.asia-northeast3.run.app";

interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface Assignment {
  worker: string;
  task: string;
  cost: number;
  rank?: number;
}

interface AssignmentResult {
  success: boolean;
  results: {
    assignments: Assignment[];
    total_cost: number;
    num_assigned: number;
    num_workers: number;
    num_tasks: number;
    unassigned_workers: string[];
    unassigned_tasks: string[];
    metrics: {
      avg_cost: number;
      min_cost: number;
      max_cost: number;
      cost_variance: number;
      efficiency_score: number;
    };
  };
  visualizations: {
    assignment_matrix?: string;
    cost_distribution?: string;
    worker_assignments?: string;
    efficiency_chart?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    problem_type: string;
    num_workers: number;
    num_tasks: number;
    total_cost: number;
    solve_time_ms: number;
  };
}

const PROBLEM_TYPES = [
  { value: "min_cost", label: "Minimize Cost", desc: "Minimize total assignment cost", icon: DollarSign },
  { value: "max_profit", label: "Maximize Profit", desc: "Maximize total assignment profit", icon: TrendingUp },
  { value: "balanced", label: "Balanced Assignment", desc: "Balance workload across workers", icon: GitMerge },
];

const ASSIGNMENT_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

const generateSampleData = (): DataRow[] => {
  const workers = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
  const tasks = ['Task_A', 'Task_B', 'Task_C', 'Task_D', 'Task_E', 'Task_F', 'Task_G', 'Task_H'];
  
  const data: DataRow[] = [];
  
  workers.forEach((worker, wIdx) => {
    tasks.forEach((task, tIdx) => {
      // Generate cost based on worker skill and task complexity
      const baseCost = 10 + Math.floor(Math.random() * 40);
      const skillModifier = (wIdx % 3 === tIdx % 3) ? -10 : 5; // Workers are better at certain task types
      const cost = Math.max(5, baseCost + skillModifier + Math.floor(Math.random() * 10));
      
      data.push({
        worker_id: worker,
        task_id: task,
        cost: cost,
        time_hours: parseFloat((cost / 10 + Math.random() * 2).toFixed(1)),
        skill_match: (wIdx % 3 === tIdx % 3) ? 'High' : (Math.abs(wIdx - tIdx) < 3 ? 'Medium' : 'Low'),
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
    a.download = 'assignment_data.csv';
    a.click();
  };
  
  if (data.length === 0) return null;
  
  return (
    <div className="mb-6 border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-muted/20">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 hover:text-primary transition-colors">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Data Preview</span>
          <Badge variant="secondary" className="text-xs">{data.length} pairs</Badge>
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
              Showing first 10 of {data.length} pairs
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

const AssignmentCard: React.FC<{ assignment: Assignment; index: number }> = ({ assignment, index }) => {
  const color = ASSIGNMENT_COLORS[index % ASSIGNMENT_COLORS.length];
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/10">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold" style={{ backgroundColor: color }}>
        {index + 1}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{assignment.worker}</Badge>
          <ArrowRight className="w-3 h-3 text-muted-foreground" />
          <Badge variant="outline" className="text-xs">{assignment.task}</Badge>
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold">${assignment.cost}</p>
        {assignment.rank && (
          <p className="text-xs text-muted-foreground">Rank #{assignment.rank}</p>
        )}
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
            <h2 className="text-lg font-semibold">Assignment Problem Guide</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              What is the Assignment Problem?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The Assignment Problem is a fundamental combinatorial optimization problem that finds the optimal 
              one-to-one matching between two sets (workers and tasks) to minimize total cost or maximize total profit. 
              It's a special case of the transportation problem and linear programming.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              The Hungarian Algorithm
            </h3>
            <div className="space-y-4">
              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">Algorithm Overview</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Also known as:</strong> Kuhn-Munkres algorithm<br/>
                  <strong>Developed by:</strong> Harold Kuhn (1955), based on earlier work by Hungarian mathematicians<br/>
                  <strong>Complexity:</strong> O(n³) where n is the number of workers/tasks<br/>
                  <strong>Guarantee:</strong> Always finds the optimal solution
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">How It Works (Simplified)</p>
                <p className="text-sm text-muted-foreground mt-1">
                  1. <strong>Cost Matrix:</strong> Create n×n matrix where cell (i,j) = cost of assigning worker i to task j<br/>
                  2. <strong>Row Reduction:</strong> Subtract minimum value from each row<br/>
                  3. <strong>Column Reduction:</strong> Subtract minimum value from each column<br/>
                  4. <strong>Cover Zeros:</strong> Find minimum number of lines to cover all zeros<br/>
                  5. <strong>Optimal Assignment:</strong> If n lines cover all zeros, optimal assignment found. Otherwise, adjust and repeat<br/>
                  6. <strong>Extract Solution:</strong> Select one zero from each row/column as assignments
                </p>
              </div>

              <div className="pl-4 border-l-2 border-primary/30">
                <p className="font-medium text-sm">Why Hungarian Algorithm?</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Unlike greedy approaches that might get stuck in local optima, the Hungarian algorithm 
                  guarantees finding the global optimum. It's efficient enough for practical problems up to 
                  several thousand workers/tasks and is implemented in Google OR-Tools for production use.
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
                <p className="font-medium text-sm">Total Cost/Profit</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Sum of all assignment costs in the optimal solution. This is the value being minimized (cost) 
                  or maximized (profit). For minimization, lower is better; for maximization, higher is better.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Number of Assignments</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total matches made between workers and tasks. In standard assignment problems, this equals 
                  min(workers, tasks). If workers {'>'} tasks, some workers remain unassigned (and vice versa).
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Average Cost per Assignment</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total cost divided by number of assignments. Useful for budgeting and comparing different 
                  scenarios. Lower average cost indicates more efficient resource utilization.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Efficiency Score</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Percentage measure of how well the solution utilizes available resources. Calculated as 
                  (optimal_cost / naive_cost) × 100. Scores above 80% indicate excellent optimization.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Cost Variance</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Statistical measure of cost spread across assignments. Low variance (balanced costs) suggests 
                  fair workload distribution. High variance may indicate skill mismatches or task complexity differences.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Problem Types
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Minimize Cost</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Objective:</strong> Find assignments that minimize total cost<br/>
                  <strong>Use when:</strong> Costs represent expenses, time, distance, or effort<br/>
                  <strong>Example:</strong> Assign delivery drivers to routes to minimize total driving distance
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Maximize Profit</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Objective:</strong> Find assignments that maximize total profit/value<br/>
                  <strong>Use when:</strong> Values represent revenue, productivity, or benefits<br/>
                  <strong>Example:</strong> Assign salespeople to territories to maximize total sales
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Balanced Assignment</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Objective:</strong> Distribute work evenly across workers<br/>
                  <strong>Use when:</strong> Fairness and workload balance are priorities<br/>
                  <strong>Example:</strong> Assign projects to teams to balance total workload hours
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Interpreting Results
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>All workers and tasks assigned:</strong> Perfect matching achieved. Each worker has exactly one task and each task has exactly one worker.</p>
              
              <p><strong>Unassigned workers:</strong> More workers than tasks. Unassigned workers can be used for backup, training, or secondary tasks.</p>
              
              <p><strong>Unassigned tasks:</strong> More tasks than workers. Critical tasks should be prioritized; consider hiring or outsourcing for remaining tasks.</p>
              
              <p><strong>High cost variance:</strong> Some assignments are significantly more expensive than others. Review if this reflects genuine skill differences or if training could help.</p>
              
              <p><strong>Low efficiency score:</strong> Optimization achieved limited improvement over random assignment. May indicate homogeneous costs or need for better cost data.</p>
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
                <p className="font-medium text-sm text-primary mb-1">Issue: No Feasible Solution</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Symptom:</strong> Algorithm fails to find assignment<br/>
                  <strong>Cause:</strong> Missing cost data, invalid constraints<br/>
                  <strong>Solution:</strong> Ensure all worker-task pairs have costs, remove impossible constraints
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Issue: Unexpected Assignments</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Symptom:</strong> Results seem counterintuitive<br/>
                  <strong>Cause:</strong> Cost data doesn't reflect reality, incorrect objective<br/>
                  <strong>Solution:</strong> Validate cost matrix, check if minimizing vs maximizing correctly
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Issue: High Total Cost</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Symptom:</strong> Optimal cost still seems too high<br/>
                  <strong>Cause:</strong> Insufficient workers, mismatched skills<br/>
                  <strong>Solution:</strong> Hire skilled workers, provide training, redesign tasks
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Issue: Many Unassigned</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Symptom:</strong> Many workers or tasks unassigned<br/>
                  <strong>Cause:</strong> Imbalanced numbers of workers vs tasks<br/>
                  <strong>Solution:</strong> This is expected; prioritize critical assignments, plan for extras
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
                  <li>• Ensure all worker-task pairs have costs</li>
                  <li>• Use realistic cost estimates (time, money, effort)</li>
                  <li>• Account for skill levels and experience</li>
                  <li>• Consider training costs for poor matches</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Implementation</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Communicate assignments clearly to workers</li>
                  <li>• Provide training for challenging matches</li>
                  <li>• Monitor actual vs estimated performance</li>
                  <li>• Allow time for workers to adapt to assignments</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Validation</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Verify each assignment makes logical sense</li>
                  <li>• Check for skill mismatches</li>
                  <li>• Ensure no worker has impossible task</li>
                  <li>• Validate total cost is reasonable</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Continuous Improvement</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Update costs based on actual performance</li>
                  <li>• Re-optimize when workers/tasks change</li>
                  <li>• Track worker satisfaction and productivity</li>
                  <li>• Adjust for seasonal or cyclical patterns</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Real-World Applications
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Project Management</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Assign team members to projects based on skills, availability, and project requirements. 
                  Minimize total project cost while maximizing skill utilization.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Logistics & Transportation</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Assign delivery drivers to routes, trucks to warehouses, or shipments to carriers. 
                  Minimize total distance, time, or shipping costs.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Healthcare</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Assign nurses to shifts, patients to hospital rooms, or doctors to clinics. 
                  Balance workload, minimize costs, and ensure adequate coverage.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Manufacturing</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Assign machines to jobs, workers to production lines, or orders to facilities. 
                  Minimize production time and costs while meeting quality requirements.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm">Cloud Computing</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Assign virtual machines to physical servers, tasks to compute nodes, or users to resources. 
                  Optimize resource utilization and minimize response time.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <GitMerge className="w-4 h-4" />
              Advanced Considerations
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Partial Assignments:</strong> When workers ≠ tasks, enable "Allow Partial Assignment" 
              to handle unequal sizes gracefully. Unassigned resources appear in the results.</p>
              
              <p><strong>Multi-Assignment:</strong> This tool handles 1-to-1 matching. For workers handling multiple 
              tasks, use integer programming or create multiple "virtual workers" representing time slots.</p>
              
              <p><strong>Precedence Constraints:</strong> If tasks must be done in order, pre-assign early tasks 
              and optimize only the remaining assignments.</p>
              
              <p><strong>Skill Requirements:</strong> Model skill mismatches as very high costs (effectively forbidding 
              those assignments) rather than removing them entirely.</p>
              
              <p><strong>Dynamic Re-assignment:</strong> When workers become unavailable or new tasks arrive, 
              re-run optimization with updated data. The algorithm is fast enough for real-time updates.</p>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-primary">Mathematical Note:</strong> The Assignment Problem can be formulated 
              as a linear program: minimize Σ(cᵢⱼ × xᵢⱼ) subject to Σxᵢⱼ = 1 for each worker/task and xᵢⱼ ∈ {'{0,1}'}. 
              The Hungarian algorithm solves this efficiently in polynomial time, making it practical for 
              real-world problems with thousands of assignments.
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
          <Users className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">Assignment Problem</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Optimally assign workers to tasks to minimize cost or maximize efficiency.
          Find the best one-to-one matching between resources and jobs.
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
            When to Use Assignment Optimization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary mb-3">Use Cases</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Employee to project assignment",
                  "Machine to job allocation",
                  "Driver to delivery route",
                  "Server to customer request",
                  "Resource allocation problems",
                ].map((use) => (
                  <li key={use} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {use}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-primary mb-3">Requirements</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Worker/Resource ID column",
                  "Task/Job ID column",
                  "Cost/Profit value column",
                  "One row per worker-task pair",
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

export default function AssignmentPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<AssignmentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);  

  // Configuration
  const [workerCol, setWorkerCol] = useState<string>("");
  const [taskCol, setTaskCol] = useState<string>("");
  const [costCol, setCostCol] = useState<string>("");
  
  const [problemType, setProblemType] = useState<string>("min_cost");
  const [allowPartial, setAllowPartial] = useState<boolean>(false);

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    setColumns(Object.keys(sampleData[0]));
    setWorkerCol("worker_id");
    setTaskCol("task_id");
    setCostCol("cost");
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

  const uniqueWorkers = React.useMemo(() => {
    if (!workerCol || data.length === 0) return [];
    return [...new Set(data.map(d => String(d[workerCol])))];
  }, [data, workerCol]);

  const uniqueTasks = React.useMemo(() => {
    if (!taskCol || data.length === 0) return [];
    return [...new Set(data.map(d => String(d[taskCol])))];
  }, [data, taskCol]);

  const getValidationChecks = useCallback((): ValidationCheck[] => {
    const checks: ValidationCheck[] = [
      {
        name: "Data Loaded",
        passed: data.length > 0,
        message: data.length > 0 ? `${data.length} worker-task pairs loaded` : "No data loaded"
      },
      {
        name: "Worker Column",
        passed: !!workerCol,
        message: workerCol ? `${uniqueWorkers.length} workers` : "Select worker column"
      },
      {
        name: "Task Column",
        passed: !!taskCol,
        message: taskCol ? `${uniqueTasks.length} tasks` : "Select task column"
      },
      {
        name: "Cost Column",
        passed: !!costCol,
        message: costCol ? `Using: ${costCol}` : "Select cost/profit column"
      },
      {
        name: "Sufficient Data",
        passed: uniqueWorkers.length >= 2 && uniqueTasks.length >= 2,
        message: uniqueWorkers.length >= 2 && uniqueTasks.length >= 2
          ? `${uniqueWorkers.length} workers × ${uniqueTasks.length} tasks`
          : "Need at least 2 workers and 2 tasks"
      }
    ];
    
    return checks;
  }, [data, workerCol, taskCol, costCol, uniqueWorkers, uniqueTasks]);

  const runOptimization = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        data,
        worker_col: workerCol,
        task_col: taskCol,
        cost_col: costCol,
        problem_type: problemType,
        allow_partial: allowPartial,
      };
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/assignment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Optimization failed");
      }
      
      const result: AssignmentResult = await res.json();
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
    const assignments = results.results.assignments;
    
    const rows: string[] = ['Worker,Task,Cost'];
    assignments.forEach(a => {
      rows.push(`${a.worker},${a.task},${a.cost}`);
    });
    
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'assignment_result.csv';
    a.click();
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const base64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!base64) return;
    const a = document.createElement('a');
    a.href = `data:image/png;base64,${base64}`;
    a.download = `assignment_${chartKey}.png`;
    a.click();
  };

  const handleDownloadWord = async () => {
    if (!results) return;
    try {
      const res = await fetch(`/api/export/assignment-docx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          results, 
          problemType,
          allowPartial
        })
      });
      if (!res.ok) throw new Error("Report generation failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `assignment_report_${new Date().toISOString().split('T')[0]}.docx`;
      a.click();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Report failed");
    }
  };


  // Step 2: Configuration
  const renderStep2Config = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5 text-primary" />
          Configure Assignment
        </CardTitle>
        <CardDescription>Set up assignment problem parameters</CardDescription>
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
            <UserCheck className="w-4 h-4 text-primary" />
            Column Mapping
          </h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Worker/Resource Column *</Label>
              <Select value={workerCol || "__none__"} onValueChange={v => setWorkerCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Select --</SelectItem>
                  {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Task/Job Column *</Label>
              <Select value={taskCol || "__none__"} onValueChange={v => setTaskCol(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Select --</SelectItem>
                  {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cost/Profit Column *</Label>
              <Select value={costCol || "__none__"} onValueChange={v => setCostCol(v === "__none__" ? "" : v)}>
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
            Options
          </h4>
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
            <input
              type="checkbox"
              id="allowPartial"
              checked={allowPartial}
              onChange={(e) => setAllowPartial(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="allowPartial" className="text-sm">
              <span className="font-medium">Allow Partial Assignment</span>
              <p className="text-xs text-muted-foreground">Allow unequal number of workers and tasks</p>
            </label>
          </div>
        </div>
        
        {/* Preview */}
        {uniqueWorkers.length > 0 && uniqueTasks.length > 0 && (
          <>
            <Separator />
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Data Preview
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="text-sm font-medium mb-2">Workers ({uniqueWorkers.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {uniqueWorkers.slice(0, 8).map((worker, idx) => (
                      <Badge key={worker} variant="secondary" className="text-xs">{worker}</Badge>
                    ))}
                    {uniqueWorkers.length > 8 && <Badge variant="outline" className="text-xs">+{uniqueWorkers.length - 8} more</Badge>}
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="text-sm font-medium mb-2">Tasks ({uniqueTasks.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {uniqueTasks.slice(0, 8).map((task, idx) => (
                      <Badge key={task} variant="outline" className="text-xs">{task}</Badge>
                    ))}
                    {uniqueTasks.length > 8 && <Badge variant="outline" className="text-xs">+{uniqueTasks.length - 8} more</Badge>}
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
                  {`${uniqueWorkers.length} workers × ${uniqueTasks.length} tasks`}
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
    
    const finding = `Optimal assignment found: ${r.num_assigned} assignments with total ${problemType === 'max_profit' ? 'profit' : 'cost'} of $${r.total_cost}. Average ${problemType === 'max_profit' ? 'profit' : 'cost'} per assignment: $${r.metrics.avg_cost.toFixed(2)}. Efficiency score: ${r.metrics.efficiency_score.toFixed(1)}%.`;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
            Assignment Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={r.num_assigned} label="Assignments" icon={Link2} highlight />
            <MetricCard value={`$${r.total_cost}`} label={`Total ${problemType === 'max_profit' ? 'Profit' : 'Cost'}`} icon={DollarSign} />
            <MetricCard value={`$${r.metrics.avg_cost.toFixed(2)}`} label="Average" />
            <MetricCard value={`${r.metrics.efficiency_score.toFixed(0)}%`} label="Efficiency" icon={Zap} />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={r.num_workers} label="Workers" icon={Users} />
            <MetricCard value={r.num_tasks} label="Tasks" icon={Briefcase} />
            <MetricCard value={r.unassigned_workers.length} label="Unassigned Workers" negative={r.unassigned_workers.length > 0} />
            <MetricCard value={r.unassigned_tasks.length} label="Unassigned Tasks" negative={r.unassigned_tasks.length > 0} />
          </div>
          
          {/* Assignments */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-primary" />
              Optimal Assignments
            </h4>
            <div className="grid md:grid-cols-2 gap-3">
              {r.assignments.map((assignment, idx) => (
                <AssignmentCard key={idx} assignment={assignment} index={idx} />
              ))}
            </div>
          </div>
          
          {/* Unassigned */}
          {(r.unassigned_workers.length > 0 || r.unassigned_tasks.length > 0) && (
            <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
              <h4 className="font-medium text-sm text-amber-600 mb-2">Unassigned Resources</h4>
              <div className="grid md:grid-cols-2 gap-4">
                {r.unassigned_workers.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Workers</p>
                    <div className="flex flex-wrap gap-1">
                      {r.unassigned_workers.map((w, idx) => (
                        <Badge key={idx} variant="secondary">{w}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {r.unassigned_tasks.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Tasks</p>
                    <div className="flex flex-wrap gap-1">
                      {r.unassigned_tasks.map((t, idx) => (
                        <Badge key={idx} variant="outline">{t}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
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
            detail={`This assignment optimization used the Hungarian Algorithm (Kuhn-Munkres) via Google OR-Tools.

■ Assignment Problem Overview
The Assignment Problem finds the optimal one-to-one matching between workers and tasks that minimizes total cost (or maximizes profit).

• Problem Size:
  - Workers: ${r.num_workers}
  - Tasks: ${r.num_tasks}
  - Possible Combinations: ${r.num_workers * r.num_tasks}

• Solution Quality:
  - Assignments Made: ${r.num_assigned}
  - Total ${problemType === 'max_profit' ? 'Profit' : 'Cost'}: $${r.total_cost}
  - Average per Assignment: $${r.metrics.avg_cost.toFixed(2)}

■ Cost Distribution Analysis

• Minimum Assignment Cost: $${r.metrics.min_cost}
• Maximum Assignment Cost: $${r.metrics.max_cost}
• Cost Range: $${r.metrics.max_cost - r.metrics.min_cost}
• Cost Variance: ${r.metrics.cost_variance.toFixed(2)}

${r.metrics.cost_variance < 50 ? '✓ Costs are well-balanced across assignments' : 
  '△ Significant cost variation - some assignments are more expensive'}

■ Efficiency Analysis

Efficiency Score: ${r.metrics.efficiency_score.toFixed(1)}%

${r.metrics.efficiency_score >= 80 ? 'Excellent - assignments are highly optimized' :
  r.metrics.efficiency_score >= 60 ? 'Good - reasonable optimization achieved' :
  'Room for improvement - consider different constraints'}`}
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
          <FindingBox finding="The Assignment Problem finds the optimal matching where each worker is assigned to exactly one task (and vice versa) to minimize total cost or maximize total profit." />
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">How Assignment Optimization Works</h4>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { num: 1, title: "Cost Matrix", content: "Build a matrix where rows are workers, columns are tasks, and values are costs. This represents all possible assignments." },
                { num: 2, title: "Hungarian Algorithm", content: "Use the Kuhn-Munkres algorithm to find the optimal assignment. Time complexity is O(n³) for n workers/tasks." },
                { num: 3, title: "Optimal Matching", content: "The algorithm finds assignments that minimize total cost while ensuring one-to-one matching between workers and tasks." },
                { num: 4, title: "Validation", content: "Verify that all constraints are satisfied and the solution is indeed optimal for the given objective." },
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
            <h4 className="font-medium text-sm">Assignment-by-Assignment Analysis</h4>
            <div className="space-y-3">
              {r.assignments.slice(0, 6).map((assignment, idx) => {
                const isBestValue = assignment.cost === r.metrics.min_cost;
                const isWorstValue = assignment.cost === r.metrics.max_cost;
                
                return (
                  <div key={idx} className={`p-4 rounded-lg border ${isBestValue ? 'border-green-500/30 bg-green-500/5' : isWorstValue ? 'border-amber-500/30 bg-amber-500/5' : 'border-border bg-muted/10'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{ backgroundColor: ASSIGNMENT_COLORS[idx % ASSIGNMENT_COLORS.length] }}>
                          {idx + 1}
                        </div>
                        <span className="font-medium">{assignment.worker} → {assignment.task}</span>
                        {isBestValue && <Badge variant="outline" className="text-xs text-green-600">Best Value</Badge>}
                        {isWorstValue && <Badge variant="outline" className="text-xs text-amber-600">Highest Cost</Badge>}
                      </div>
                      <p className="font-semibold">${assignment.cost}</p>
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      {isBestValue ? 'This is the most cost-effective assignment in the solution.' :
                       isWorstValue ? 'This assignment has the highest cost but is necessary for optimal overall solution.' :
                       'Standard assignment within the optimal solution.'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
          
          <DetailParagraph
            title="Strategic Recommendations"
            detail={`Based on the assignment optimization results, here are recommendations for implementation.

■ 1. Implementation Priority

Recommended order of assignments:
${r.assignments.slice(0, 5).map((a, i) => `${i + 1}. ${a.worker} → ${a.task} ($${a.cost})`).join('\n')}

■ 2. Cost Analysis

${r.metrics.cost_variance > 100 ? 
`【High Cost Variance Detected】
• Range: $${r.metrics.min_cost} - $${r.metrics.max_cost}
• Consider training workers on expensive tasks
• Review task complexity for high-cost assignments
• Explore task redesign to reduce costs` :
`【Balanced Costs】
• Costs are relatively uniform across assignments
• Current resource allocation is efficient`}

■ 3. Capacity Planning

${r.unassigned_workers.length > 0 ? 
`【Unassigned Workers: ${r.unassigned_workers.length}】
Workers without tasks: ${r.unassigned_workers.join(', ')}

Recommendations:
• Assign to secondary tasks
• Cross-train for other roles
• Consider workload rebalancing` : 
'All workers have been assigned.'}

${r.unassigned_tasks.length > 0 ?
`【Unassigned Tasks: ${r.unassigned_tasks.length}】
Tasks without workers: ${r.unassigned_tasks.join(', ')}

Recommendations:
• Hire additional workers
• Redistribute among existing workers
• Prioritize critical tasks` :
'All tasks have been assigned.'}

■ 4. Performance Tracking

Key metrics to monitor:
• Actual vs. estimated completion time
• Quality of work per assignment
• Worker satisfaction scores
• Task completion rates

■ 5. Re-optimization Triggers

Consider re-running optimization when:
• New workers join or leave
• Task requirements change
• Cost structures are updated
• Seasonal demand shifts`}
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
          <h1 className="text-xl font-semibold">Assignment Optimization Report</h1>
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
              <MetricCard value={r.num_assigned} label="Assignments" highlight />
              <MetricCard value={`$${r.total_cost}`} label="Total Cost" />
              <MetricCard value={summary.num_workers} label="Workers" />
              <MetricCard value={`${summary.solve_time_ms}ms`} label="Solve Time" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Successfully assigned {r.num_assigned} workers to tasks with a total cost of ${r.total_cost}.
              Average cost per assignment: ${r.metrics.avg_cost.toFixed(2)}.
              Efficiency score: {r.metrics.efficiency_score.toFixed(1)}%.
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
                  {visualizations.assignment_matrix && <TabsTrigger value="assignment_matrix" className="text-xs">Matrix</TabsTrigger>}
                  {visualizations.cost_distribution && <TabsTrigger value="cost_distribution" className="text-xs">Costs</TabsTrigger>}
                  {visualizations.worker_assignments && <TabsTrigger value="worker_assignments" className="text-xs">Workers</TabsTrigger>}
                  {visualizations.efficiency_chart && <TabsTrigger value="efficiency_chart" className="text-xs">Efficiency</TabsTrigger>}
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
        
        {/* Assignment Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Assignment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Worker</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.assignments.map((assignment, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{ backgroundColor: ASSIGNMENT_COLORS[idx % ASSIGNMENT_COLORS.length] }}>
                        {idx + 1}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{assignment.worker}</TableCell>
                    <TableCell>{assignment.task}</TableCell>
                    <TableCell className="text-right font-medium">${assignment.cost}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/20 font-medium">
                  <TableCell colSpan={3}>Total</TableCell>
                  <TableCell className="text-right">${r.total_cost}</TableCell>
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
                CSV (Assignments)
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
          <Button variant="outline" onClick={() => setCurrentStep(1)}>New Assignment</Button>
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
