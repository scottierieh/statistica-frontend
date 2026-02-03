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
  UserX, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle,
  Shield, Info, HelpCircle, FileSpreadsheet, FileText,
  Download, TrendingUp, Settings, Activity, ChevronRight,
  Target, BarChart3, Play, Calendar, Clock,
  Users, TrendingDown, Percent, AlertTriangle,
  Building2, Briefcase, CalendarDays, CalendarClock,
  HeartPulse, Sun, Moon, ThermometerSun, Snowflake, BookOpen, BookMarked, 
  DollarSign, UserCheck, Timer
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "https://statistica-api-995604437166.asia-northeast3.run.app";

// ============ TYPES ============
interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface DepartmentStats {
  department: string;
  total_employees: number;
  total_absences: number;
  absence_rate: number;
  avg_duration: number;
  total_days_lost: number;
  cost_impact: number;
}

interface ReasonBreakdown {
  reason: string;
  count: number;
  pct: number;
  avg_duration: number;
  total_days: number;
}

interface TimePattern {
  period: string;
  absence_rate: number;
  count: number;
}

interface EmployeeRisk {
  employee_id: string;
  department: string;
  absence_count: number;
  total_days: number;
  absence_rate: number;
  risk_level: string;
  trend: string;
}

interface AbsenteeismResult {
  success: boolean;
  results: {
    summary: {
      total_employees: number;
      total_absences: number;
      total_days_lost: number;
      overall_absence_rate: number;
      avg_absence_duration: number;
      estimated_cost: number;
      bradford_factor_avg: number;
    };
    department_stats: DepartmentStats[];
    reason_breakdown: ReasonBreakdown[];
    day_of_week_pattern: TimePattern[];
    monthly_pattern: TimePattern[];
    seasonal_pattern: TimePattern[];
    high_risk_employees: EmployeeRisk[];
    trends: {
      period: string;
      absence_rate: number;
      trend_direction: string;
    }[];
  };
  visualizations: {
    department_comparison?: string;
    reason_pie?: string;
    day_of_week?: string;
    monthly_trend?: string;
    seasonal_heatmap?: string;
    bradford_distribution?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    analysis_period: string;
    highest_absence_dept: string;
    top_reason: string;
    peak_day: string;
    solve_time_ms: number;
  };
}

// ============ CONSTANTS ============
const ABSENCE_REASONS = [
  { id: "sick", label: "Sick Leave", icon: HeartPulse, color: "#ef4444" },
  { id: "personal", label: "Personal Leave", icon: UserCheck, color: "#3b82f6" },
  { id: "family", label: "Family Emergency", icon: Users, color: "#8b5cf6" },
  { id: "medical", label: "Medical Appointment", icon: HeartPulse, color: "#f97316" },
  { id: "vacation", label: "Vacation", icon: Sun, color: "#22c55e" },
  { id: "bereavement", label: "Bereavement", icon: Moon, color: "#64748b" },
  { id: "jury", label: "Jury Duty", icon: Building2, color: "#06b6d4" },
  { id: "other", label: "Other", icon: AlertCircle, color: "#94a3b8" },
];

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ============ SAMPLE DATA ============
const generateSampleData = (): DataRow[] => {
  const departments = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations', 'Customer Support', 'Product'];
  const reasons = ['Sick Leave', 'Personal Leave', 'Family Emergency', 'Medical Appointment', 'Vacation', 'Other'];
  
  const data: DataRow[] = [];
  let recordId = 1;
  
  // Generate 200 employees with varying absence patterns
  for (let empId = 1; empId <= 200; empId++) {
    const dept = departments[Math.floor(Math.random() * departments.length)];
    const baseAbsenceProb = Math.random() * 0.15 + 0.02; // 2-17% absence probability
    
    // Generate absences over 12 months
    for (let month = 1; month <= 12; month++) {
      // Seasonal adjustment
      let seasonalFactor = 1;
      if (month >= 11 || month <= 2) seasonalFactor = 1.4; // Winter: higher
      if (month >= 6 && month <= 8) seasonalFactor = 0.8; // Summer: lower (vacation planned)
      
      // Department-specific factors
      let deptFactor = 1;
      if (dept === 'Customer Support') deptFactor = 1.3;
      if (dept === 'Operations') deptFactor = 1.2;
      if (dept === 'Engineering') deptFactor = 0.9;
      
      const absenceProb = baseAbsenceProb * seasonalFactor * deptFactor;
      
      // Random number of absences this month (0-3)
      const numAbsences = Math.random() < absenceProb * 5 ? Math.floor(Math.random() * 3) + 1 : 0;
      
      for (let a = 0; a < numAbsences; a++) {
        const day = Math.floor(Math.random() * 28) + 1;
        const date = new Date(2024, month - 1, day);
        const dayOfWeek = DAYS_OF_WEEK[date.getDay() === 0 ? 6 : date.getDay() - 1];
        
        // Monday/Friday bias for some absences
        let reason: string;
        const isMondayFriday = date.getDay() === 1 || date.getDay() === 5;
        
        if (isMondayFriday && Math.random() < 0.4) {
          reason = Math.random() < 0.6 ? 'Sick Leave' : 'Personal Leave';
        } else {
          reason = reasons[Math.floor(Math.random() * reasons.length)];
        }
        
        // Duration based on reason
        let duration: number;
        if (reason === 'Sick Leave') {
          duration = Math.random() < 0.7 ? 1 : Math.floor(Math.random() * 3) + 2;
        } else if (reason === 'Vacation') {
          duration = Math.floor(Math.random() * 5) + 3;
        } else if (reason === 'Family Emergency') {
          duration = Math.floor(Math.random() * 3) + 1;
        } else {
          duration = 1;
        }
        
        data.push({
          record_id: recordId++,
          employee_id: `EMP-${String(empId).padStart(4, '0')}`,
          department: dept,
          absence_date: date.toISOString().split('T')[0],
          day_of_week: dayOfWeek,
          month: MONTHS[month - 1],
          reason: reason,
          duration_days: duration,
          planned: reason === 'Vacation' ? 1 : Math.random() < 0.3 ? 1 : 0,
          year: 2024,
        });
      }
    }
  }
  
  return data;
};

// ============ UTILITY COMPONENTS ============
const MetricCard: React.FC<{ 
  value: string | number; 
  label: string; 
  sublabel?: string;
  negative?: boolean; 
  highlight?: boolean; 
  icon?: React.FC<{ className?: string }> 
}> = ({ value, label, sublabel, negative, highlight, icon: Icon }) => (
  <div className={`text-center p-4 rounded-lg border ${
    negative ? 'border-destructive/30 bg-destructive/5' : 
    highlight ? 'border-primary/30 bg-primary/5' : 
    'border-border bg-muted/20'
  }`}>
    {Icon && <Icon className={`w-5 h-5 mx-auto mb-2 ${highlight ? 'text-primary' : negative ? 'text-destructive' : 'text-muted-foreground'}`} />}
    <p className={`text-2xl font-semibold ${negative ? 'text-destructive' : highlight ? 'text-primary' : ''}`}>{value}</p>
    <p className="text-xs text-muted-foreground mt-1">{label}</p>
    {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
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

const ProgressBar: React.FC<{ 
  currentStep: number; 
  hasResults: boolean; 
  onStepClick: (step: number) => void 
}> = ({ currentStep, hasResults, onStepClick }) => {
  const steps = [
    { num: 1, label: "Intro" },
    { num: 2, label: "Config" },
    { num: 3, label: "Validation" },
    { num: 4, label: "Results" },
    { num: 5, label: "Patterns" },
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

const RiskBadge: React.FC<{ level: string }> = ({ level }) => {
  const colors: { [key: string]: string } = {
    'Low': 'bg-green-100 text-green-700',
    'Medium': 'bg-yellow-100 text-yellow-700',
    'High': 'bg-orange-100 text-orange-700',
    'Critical': 'bg-red-100 text-red-700',
  };
  
  return (
    <Badge className={`${colors[level] || 'bg-gray-100 text-gray-700'} text-xs`}>
      {level}
    </Badge>
  );
};

const AbsenceRateBar: React.FC<{ rate: number; maxRate?: number }> = ({ rate, maxRate = 10 }) => {
  const pct = Math.min(100, (rate / maxRate) * 100);
  const color = rate <= 3 ? '#22c55e' : rate <= 5 ? '#f59e0b' : '#ef4444';
  
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-medium w-12">{rate.toFixed(1)}%</span>
    </div>
  );
};


const formatCurrency = (value: number): string => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;

// 👇 여기에 DataPreview 컴포넌트 추가
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
    a.download = 'absenteeism_data.csv';
    a.click();
  };
  
  if (data.length === 0) return null;
  
  return (
    <div className="mb-6 border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-muted/20">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 hover:text-primary transition-colors">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Data Preview</span>
          <Badge variant="secondary" className="text-xs">{data.length} absence records</Badge>
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
              {data.slice(0, 15).map((row, i) => (
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

const StatisticalGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Absenteeism Analysis Guide</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <UserX className="w-4 h-4" />
              What is Absenteeism Analysis?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Absenteeism analysis examines patterns of employee absences to identify trends, root causes, and 
              opportunities for intervention. Chronic absenteeism disrupts productivity, increases costs (replacement, 
              overtime, lost output), and can signal deeper organizational issues like low morale, poor management, 
              or unsafe working conditions. This analysis goes beyond simply counting sick days - it reveals patterns 
              by time, department, and individual that help HR and leadership take proactive action.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Percent className="w-4 h-4" />
              The Absence Rate Metric
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                <p className="font-medium text-sm mb-2">Calculating Absence Rate</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Formula:</strong> Absence Rate = (Total Days Lost / Total Available Working Days) × 100%<br/><br/>
                  
                  <strong>Example:</strong><br/>
                  • Employee works 250 days/year (5 days/week × 50 weeks)<br/>
                  • Takes 10 days absence<br/>
                  • Absence Rate = (10 / 250) × 100% = 4.0%<br/><br/>
                  
                  <strong>Department Level:</strong><br/>
                  • 20 employees × 250 days = 5,000 available days<br/>
                  • 200 total absence days<br/>
                  • Department Absence Rate = (200 / 5,000) × 100% = 4.0%
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Benchmarks & Thresholds</p>
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Absence Rate</TableHead>
                      <TableHead>Assessment</TableHead>
                      <TableHead>Industry Standard</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="bg-green-500/5">
                      <TableCell className="font-medium">0-3%</TableCell>
                      <TableCell className="text-green-600">Excellent</TableCell>
                      <TableCell>Best in class</TableCell>
                      <TableCell>Maintain current practices</TableCell>
                    </TableRow>
                    <TableRow className="bg-green-400/5">
                      <TableCell className="font-medium">3-5%</TableCell>
                      <TableCell className="text-green-500">Good</TableCell>
                      <TableCell>Industry average</TableCell>
                      <TableCell>Monitor trends</TableCell>
                    </TableRow>
                    <TableRow className="bg-amber-500/5">
                      <TableCell className="font-medium">5-7%</TableCell>
                      <TableCell className="text-amber-600">Concerning</TableCell>
                      <TableCell>Above average</TableCell>
                      <TableCell>Investigate causes</TableCell>
                    </TableRow>
                    <TableRow className="bg-red-500/5">
                      <TableCell className="font-medium">7%+</TableCell>
                      <TableCell className="text-red-600">Critical</TableCell>
                      <TableCell>Poor performance</TableCell>
                      <TableCell>Urgent intervention</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Note:</strong> Benchmarks vary by industry. Manufacturing/healthcare typically higher 
                  (physically demanding). Office/tech typically lower.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              The Bradford Factor Score
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                <p className="font-medium text-sm mb-2">Understanding Bradford Factor</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Formula:</strong> Bradford Factor = S² × D<br/>
                  Where S = Number of spells (absence instances), D = Total days absent<br/><br/>
                  
                  <strong>Key Insight:</strong> Frequent short absences disrupt more than long single absences<br/><br/>
                  
                  <strong>Example 1:</strong> Employee A<br/>
                  • 1 spell of 10 days (major surgery)<br/>
                  • Bradford = 1² × 10 = 10<br/><br/>
                  
                  <strong>Example 2:</strong> Employee B<br/>
                  • 10 spells of 1 day each (recurring Mondays off)<br/>
                  • Bradford = 10² × 10 = 1,000<br/><br/>
                  
                  <strong>Interpretation:</strong> Employee B's pattern is 100× more disruptive despite same total days lost. 
                  The Bradford Factor captures this disruption.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Bradford Factor Trigger Points</p>
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bradford Score</TableHead>
                      <TableHead>Risk Level</TableHead>
                      <TableHead>Recommended Action</TableHead>
                      <TableHead>Example Pattern</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">0-49</TableCell>
                      <TableCell className="text-green-600">Low</TableCell>
                      <TableCell>No action required</TableCell>
                      <TableCell>1 spell, 7 days (BF=7)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">50-124</TableCell>
                      <TableCell className="text-green-500">Moderate</TableCell>
                      <TableCell>Informal discussion</TableCell>
                      <TableCell>5 spells, 5 days (BF=125)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">125-399</TableCell>
                      <TableCell className="text-amber-600">Elevated</TableCell>
                      <TableCell>Written warning</TableCell>
                      <TableCell>8 spells, 6 days (BF=384)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">400-649</TableCell>
                      <TableCell className="text-orange-600">High</TableCell>
                      <TableCell>Final warning</TableCell>
                      <TableCell>10 spells, 6 days (BF=600)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">650+</TableCell>
                      <TableCell className="text-red-600">Critical</TableCell>
                      <TableCell>Dismissal consideration</TableCell>
                      <TableCell>12 spells, 5 days (BF=720)</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <p className="font-medium text-sm text-amber-600 mb-1">⚠️ Legal & Ethical Considerations</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Use Bradford Factor as a TOOL, not a RULE:</strong><br/>
                  • Always investigate reasons before disciplinary action<br/>
                  • Serious illnesses, disabilities, pregnancy must be accommodated (ADA, FMLA)<br/>
                  • Pattern may indicate workplace issues (bullying, unsafe conditions)<br/>
                  • Document conversations, be consistent, involve HR/legal<br/>
                  • Bradford Factor helps identify who to talk to, not automatic punishment
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Temporal Pattern Analysis
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Day-of-Week Patterns</p>
                <div className="text-xs text-muted-foreground space-y-2">
                  <p><strong>Monday/Friday Spikes ("Long Weekend Syndrome"):</strong><br/>
                  • Indicator: 20-30%+ more absences on Mon/Fri vs Tue-Thu<br/>
                  • Possible causes: Low engagement, burnout, childcare issues, lifestyle conflicts<br/>
                  • Solutions: Flexible scheduling, compressed workweeks, WFH Fridays, engagement initiatives</p>
                  
                  <p><strong>Mid-Week Absences:</strong><br/>
                  • More likely genuine illness or medical appointments<br/>
                  • Lower concern if evenly distributed Tue-Thu</p>
                  
                  <p><strong>Weekend Work Patterns:</strong><br/>
                  • Retail/hospitality: Watch for Sunday absences (burnout)<br/>
                  • 24/7 operations: Ensure equitable weekend rotation</p>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Monthly & Seasonal Patterns</p>
                <div className="text-xs text-muted-foreground space-y-2">
                  <p><strong>Winter (Dec-Feb):</strong><br/>
                  • Flu season, cold/respiratory illness<br/>
                  • Holiday stress, seasonal affective disorder (SAD)<br/>
                  • Action: Flu shot programs, wellness initiatives, adequate sick leave</p>
                  
                  <p><strong>Spring (Mar-May):</strong><br/>
                  • Allergies, spring sports injuries<br/>
                  • Tax season stress (Finance/Accounting)<br/>
                  • Back-to-school prep (childcare gaps)</p>
                  
                  <p><strong>Summer (Jun-Aug):</strong><br/>
                  • Vacation season (planned absences)<br/>
                  • Childcare challenges (school out)<br/>
                  • Heat-related issues (outdoor workers)<br/>
                  • Action: Vacation blackout periods, flexible summer hours, camp subsidies</p>
                  
                  <p><strong>Fall (Sep-Nov):</strong><br/>
                  • Back-to-school adjustment<br/>
                  • Holiday prep stress<br/>
                  • Year-end deadlines</p>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Trend Analysis</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Increasing Trend:</strong> Month-over-month rise in absence rate<br/>
                  • Red flag: Indicates worsening morale, management, or conditions<br/>
                  • Action: Employee surveys, exit interviews, leadership audit<br/><br/>
                  
                  <strong>Decreasing Trend:</strong> Month-over-month decline<br/>
                  • Good sign: Interventions working, culture improving<br/>
                  • Action: Document what's working, sustain momentum<br/><br/>
                  
                  <strong>Stable Trend:</strong> Consistent rate over time<br/>
                  • If low (below 3%): Excellent, maintain<br/>
                  • If high (above 5%): Chronic problem, major intervention needed
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <HeartPulse className="w-4 h-4" />
              Absence Reason Analysis
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Common Absence Reasons & Patterns</p>
                <div className="text-xs text-muted-foreground space-y-2">
                  <p><strong>Sick Leave (Illness/Injury):</strong> 40-50% of absences<br/>
                  • Legitimate health issues<br/>
                  • Watch for: Clusters (contagious illness), recurring patterns (chronic condition)<br/>
                  • Action: Workplace hygiene, ergonomic improvements, wellness programs</p>
                  
                  <p><strong>Personal Leave:</strong> 15-20% of absences<br/>
                  • Family emergencies, appointments, personal matters<br/>
                  • Often unavoidable<br/>
                  • Action: Flexible PTO policies, remote work options</p>
                  
                  <p><strong>Medical Appointments:</strong> 10-15% of absences<br/>
                  • Preventive care, specialist visits<br/>
                  • Often short duration (half day)<br/>
                  • Action: Flexible scheduling, allow make-up hours</p>
                  
                  <p><strong>Family/Childcare:</strong> 10-15% of absences<br/>
                  • Kids sick, school closures, elder care<br/>
                  • Higher in employees with young children<br/>
                  • Action: Backup childcare, family-friendly policies</p>
                  
                  <p><strong>Mental Health:</strong> Growing 5-10%<br/>
                  • Stress, anxiety, depression, burnout<br/>
                  • Often coded as "sick leave"<br/>
                  • Action: EAP programs, mental health days, workload management</p>
                  
                  <p><strong>"Other" / Unspecified:</strong> Red flag if high percentage<br/>
                  • May indicate employees fear stigma or retaliation<br/>
                  • Action: Ensure psychological safety, anonymous reporting</p>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                <p className="font-medium text-sm text-red-600 mb-1">⚠️ Absence Reason Red Flags</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• <strong>High "Other" / "Unspecified":</strong> Employees hiding true reasons (fear culture)</li>
                  <li>• <strong>Vague Descriptions:</strong> "Not feeling well" every Monday (potential pattern abuse)</li>
                  <li>• <strong>Sudden Spikes:</strong> Specific reason jumps 50%+ month-over-month (investigate)</li>
                  <li>• <strong>Department Outliers:</strong> One dept has 3× the "sick leave" (manager issue? conditions?)</li>
                  <li>• <strong>Same Day Patterns:</strong> Multiple employees from same team absent same day (collusion? crisis?)</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Department & Job Level Analysis
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Department Comparison</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Why Department Matters:</strong><br/>
                  Different departments have different absence drivers:<br/><br/>
                  
                  <strong>High Physical Demand:</strong><br/>
                  • Manufacturing, Warehouse, Construction: Higher injury/illness rates<br/>
                  • Benchmark: 5-7% acceptable<br/>
                  • Action: Safety programs, ergonomics, proper equipment<br/><br/>
                  
                  <strong>Customer-Facing / High Stress:</strong><br/>
                  • Customer Support, Retail, Nursing: Burnout, emotional labor<br/>
                  • Benchmark: 4-6% acceptable<br/>
                  • Action: Breaks, stress management, adequate staffing<br/><br/>
                  
                  <strong>Office / Knowledge Work:</strong><br/>
                  • Finance, IT, Marketing: Lower physical risk<br/>
                  • Benchmark: 2-4% expected<br/>
                  • Action: If high, investigate culture/management issues<br/><br/>
                  
                  <strong>Outlier Departments:</strong><br/>
                  • If one dept 2× company average → investigate manager, workload, conditions<br/>
                  • Exit interviews, employee surveys, direct observation
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Job Level Patterns</p>
                <div className="text-xs text-muted-foreground space-y-2">
                  <p><strong>Entry Level / Hourly:</strong><br/>
                  • Higher absence rates (less job security, lower engagement)<br/>
                  • Often can't afford unpaid time off → work while sick<br/>
                  • Action: Paid sick leave, career development, engagement</p>
                  
                  <p><strong>Mid-Level / Salaried:</strong><br/>
                  • Moderate absence rates<br/>
                  • Balance of responsibility and flexibility<br/>
                  • "Presenteeism" risk (work while sick to prove dedication)</p>
                  
                  <p><strong>Senior / Executive:</strong><br/>
                  • Lower recorded absence rates<br/>
                  • More autonomy, work from home flexibility<br/>
                  • But: May work while sick, delaying recovery</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Cost Impact Analysis
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                <p className="font-medium text-sm mb-2">Calculating Absence Costs</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Formula:</strong> Total Cost = (Direct Costs + Indirect Costs) × Days Lost<br/><br/>
                  
                  <strong>Direct Costs:</strong><br/>
                  • Paid sick leave (salary/benefits for absent employee)<br/>
                  • Overtime for covering employees (typically 1.5× regular pay)<br/>
                  • Temporary replacement workers<br/><br/>
                  
                  <strong>Indirect Costs (Often Larger!):</strong><br/>
                  • Lost productivity (work not completed)<br/>
                  • Reduced quality (less experienced cover)<br/>
                  • Training time for temporary coverage<br/>
                  • Administrative time (rescheduling, coordination)<br/>
                  • Morale impact on team (extra burden)<br/>
                  • Customer dissatisfaction (delays, errors)<br/><br/>
                  
                  <strong>Industry Benchmarks:</strong><br/>
                  • Manufacturing: $300-400/day per employee<br/>
                  • Office/Knowledge Work: $350-500/day<br/>
                  • Healthcare: $400-600/day<br/>
                  • Senior positions: $800-1,500/day
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">ROI of Absence Reduction</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Example Calculation:</strong><br/>
                  • Company: 500 employees<br/>
                  • Current absence rate: 6%<br/>
                  • Target absence rate: 4%<br/>
                  • Cost per absence day: $400<br/><br/>
                  
                  <strong>Current State:</strong><br/>
                  500 employees × 250 workdays × 6% = 7,500 days lost<br/>
                  7,500 days × $400 = $3,000,000/year<br/><br/>
                  
                  <strong>Target State:</strong><br/>
                  500 employees × 250 workdays × 4% = 5,000 days lost<br/>
                  5,000 days × $400 = $2,000,000/year<br/><br/>
                  
                  <strong>Savings:</strong> $1,000,000/year<br/><br/>
                  
                  <strong>Investment in Wellness:</strong><br/>
                  • Flu shots, ergonomic chairs, mental health programs: $100K/year<br/>
                  • Net benefit: $900K/year<br/>
                  • ROI: 9:1
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Action Plans & Interventions
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Individual Employee Interventions</p>
                <div className="text-xs text-muted-foreground space-y-2">
                  <p><strong>Bradford 50-124 (Informal Stage):</strong><br/>
                  • Friendly conversation with manager<br/>
                  • Ask if employee needs support (health, personal, workload)<br/>
                  • Offer resources (EAP, flexible schedule, task adjustments)<br/>
                  • Document conversation, monitor for 3 months</p>
                  
                  <p><strong>Bradford 125-399 (Formal Stage):</strong><br/>
                  • Formal meeting with manager + HR<br/>
                  • Review absence records, patterns<br/>
                  • Written warning, improvement plan<br/>
                  • Set expectations, timeline (e.g., below BF 150 in 6 months)<br/>
                  • Offer accommodations if medical/disability-related</p>
                  
                  <p><strong>Bradford 400+ (Final Stage):</strong><br/>
                  • Final warning meeting<br/>
                  • Last chance improvement plan<br/>
                  • Clear consequences (dismissal if no improvement)<br/>
                  • Legal review (ensure compliance with ADA, FMLA, etc.)<br/>
                  • Consider medical retirement, separation agreement</p>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Organizational Interventions</p>
                <div className="text-xs text-muted-foreground space-y-2">
                  <p><strong>Wellness Programs:</strong><br/>
                  • Flu shot clinics, health screenings<br/>
                  • Gym memberships, fitness challenges<br/>
                  • Mental health resources (EAP, counseling)<br/>
                  • Nutrition, stress management workshops</p>
                  
                  <p><strong>Policy Changes:</strong><br/>
                  • Flexible work arrangements (WFH, flexible hours)<br/>
                  • Generous sick leave (reduces presenteeism)<br/>
                  • Return-to-work programs (phased return from long absence)<br/>
                  • Backup childcare, elder care support</p>
                  
                  <p><strong>Workplace Improvements:</strong><br/>
                  • Ergonomic assessments, equipment upgrades<br/>
                  • Safety training, PPE, hazard elimination<br/>
                  • Climate control, air quality, lighting<br/>
                  • Break rooms, relaxation spaces</p>
                  
                  <p><strong>Management Training:</strong><br/>
                  • Absence management best practices<br/>
                  • Return-to-work conversations<br/>
                  • Spotting signs of burnout, mental health issues<br/>
                  • Legal compliance (ADA, FMLA)</p>
                  
                  <p><strong>Culture & Engagement:</strong><br/>
                  • Regular employee surveys, pulse checks<br/>
                  • Recognition programs, career development<br/>
                  • Team building, social connection<br/>
                  • Workload management, realistic deadlines</p>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/5">
                <p className="font-medium text-sm text-green-600 mb-1">✅ Prevention vs Punishment</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Best Practice:</strong> 80% prevention, 20% discipline<br/><br/>
                  
                  <strong>Prevention Focus:</strong><br/>
                  • Invest in wellness, safety, culture BEFORE problems escalate<br/>
                  • Easier to keep people healthy than fix chronic absenteeism<br/>
                  • Creates positive, supportive work environment<br/><br/>
                  
                  <strong>Discipline as Last Resort:</strong><br/>
                  • Only after offering support, accommodations<br/>
                  • For pattern abuse, not genuine illness<br/>
                  • Always with HR/legal guidance
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
                <p className="font-medium text-sm text-primary mb-1">Data Collection</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Standardized absence reporting system</li>
                  <li>• Require reason codes (but protect privacy)</li>
                  <li>• Track both planned and unplanned absences</li>
                  <li>• Record full or partial day (half-day tracking)</li>
                  <li>• Automated tracking integrated with payroll</li>
                  <li>• Return-to-work forms for extended absences</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Analysis Frequency</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Monthly: Review department/company rates</li>
                  <li>• Quarterly: Deep dive into patterns, high-risk employees</li>
                  <li>• Semi-Annual: Benchmark against industry</li>
                  <li>• Annual: Comprehensive report to leadership</li>
                  <li>• Real-Time: Alerts for critical thresholds</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Legal Compliance</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• FMLA (Family Medical Leave Act): 12 weeks unpaid protected leave</li>
                  <li>• ADA (Americans with Disabilities Act): Reasonable accommodations required</li>
                  <li>• Pregnancy Discrimination Act: Maternity protections</li>
                  <li>• State/Local laws: Paid sick leave mandates</li>
                  <li>• Workers' Compensation: Work-related injury/illness protections</li>
                  <li>• Consult HR/Legal before disciplinary action</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Common Mistakes</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Ignoring patterns until crisis</li>
                  <li>• Punitive approach without support</li>
                  <li>• Not tracking reasons (can't identify root causes)</li>
                  <li>• Inconsistent policy enforcement</li>
                  <li>• Failing to accommodate disabilities</li>
                  <li>• Not investing in prevention</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-primary">Note:</strong> Absenteeism is a symptom, not the disease. High 
              absence rates signal deeper issues - poor management, low morale, unsafe conditions, inadequate benefits, 
              burnout, or health crises. The goal is not to eliminate all absences (people get sick!), but to understand 
              patterns, support employees proactively, and create a workplace where people want to show up. Focus on 
              prevention over punishment. A 2% reduction in absenteeism can save hundreds of thousands to millions of 
              dollars annually while improving employee wellbeing and productivity. Use Bradford Factor as a conversation 
              starter, not an automatic disciplinary tool. Always consider the human behind the number.
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
  
  return (
    <div className="space-y-8">
      {/* 제목 */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <UserX className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">Absenteeism Analysis</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Analyze employee absence patterns to identify trends, high-risk areas, and opportunities
          for reducing unplanned absences and associated costs.
        </p>
      </div>
      
      {/* 3개 핵심 카드 */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Pattern Analysis</p>
              <p className="text-xs text-muted-foreground">Temporal trends</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Bradford Factor</p>
              <p className="text-xs text-muted-foreground">Disruption scoring</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Cost Impact</p>
              <p className="text-xs text-muted-foreground">Financial analysis</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* About Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-5 h-5 text-primary" />
            About Absenteeism Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary mb-3">What You'll Learn</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Absence rates by department & reason",
                  "Day-of-week & seasonal patterns",
                  "Bradford Factor risk scores",
                  "High-risk employee identification",
                  "Estimated cost impact",
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
                  "Employee ID column",
                  "Absence date column",
                  "Duration (days) column",
                  "Department (optional)",
                  "Absence reason (optional)",
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

// ============ MAIN COMPONENT ============
export default function AbsenteeismAnalysisPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<AbsenteeismResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);  // 👈 이 줄 추가

  
  // Configuration
  const [employeeCol, setEmployeeCol] = useState<string>("");
  const [dateCol, setDateCol] = useState<string>("");
  const [durationCol, setDurationCol] = useState<string>("");
  const [deptCol, setDeptCol] = useState<string>("");
  const [reasonCol, setReasonCol] = useState<string>("");
  const [costPerDay, setCostPerDay] = useState<number>(350);

  
  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    const cols = Object.keys(sampleData[0]);
    setColumns(cols);
    
    // Auto-configure
    setEmployeeCol("employee_id");
    setDateCol("absence_date");
    setDurationCol("duration_days");
    setDeptCol("department");
    setReasonCol("reason");
    
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
    const uniqueEmployees = new Set(data.map(d => d[employeeCol])).size;
    
    return [
      {
        name: "Data Loaded",
        passed: data.length > 0,
        message: data.length > 0 ? `${data.length} absence records loaded` : "No data"
      },
      {
        name: "Employee ID Column",
        passed: !!employeeCol,
        message: employeeCol ? `Using: ${employeeCol} (${uniqueEmployees} employees)` : "Select employee ID column"
      },
      {
        name: "Date Column",
        passed: !!dateCol,
        message: dateCol ? `Using: ${dateCol}` : "Select absence date column"
      },
      {
        name: "Duration Column",
        passed: !!durationCol,
        message: durationCol ? `Using: ${durationCol}` : "Select duration column"
      },
      {
        name: "Sufficient Data",
        passed: data.length >= 50,
        message: data.length >= 50 
          ? `${data.length} records (sufficient)` 
          : `Need more records (min 50, current: ${data.length})`
      },
    ];
  }, [data, employeeCol, dateCol, durationCol]);

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        data,
        employee_col: employeeCol,
        date_col: dateCol,
        duration_col: durationCol,
        dept_col: deptCol || null,
        reason_col: reasonCol || null,
        cost_per_day: costPerDay,
      };
      
      const res = await fetch(`${FASTAPI_URL}/api/analysis/absenteeism`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Analysis failed");
      }
      
      const result: AbsenteeismResult = await res.json();
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
    const rows: string[] = ['Department,Employees,Absences,Absence Rate,Avg Duration,Days Lost,Cost'];
    results.results.department_stats.forEach(d => {
      rows.push(`${d.department},${d.total_employees},${d.total_absences},${d.absence_rate.toFixed(1)}%,${d.avg_duration.toFixed(1)},${d.total_days_lost},${d.cost_impact.toFixed(0)}`);
    });
    
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'absenteeism_analysis.csv';
    a.click();
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const base64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!base64) return;
    const a = document.createElement('a');
    a.href = `data:image/png;base64,${base64}`;
    a.download = `absenteeism_${chartKey}.png`;
    a.click();
  };

  // ============ STEP 2: CONFIG ============
  const renderStep2Config = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="w-5 h-5 text-primary" />
            Analysis Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Required Columns */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              Required Column Mapping
            </h4>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Employee ID Column *</Label>
                <Select value={employeeCol || "__none__"} onValueChange={v => setEmployeeCol(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- Select --</SelectItem>
                    {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Absence Date Column *</Label>
                <Select value={dateCol || "__none__"} onValueChange={v => setDateCol(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- Select --</SelectItem>
                    {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duration (Days) Column *</Label>
                <Select value={durationCol || "__none__"} onValueChange={v => setDurationCol(v === "__none__" ? "" : v)}>
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
              <Building2 className="w-4 h-4 text-primary" />
              Optional Columns
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Department Column</Label>
                <Select value={deptCol || "__none__"} onValueChange={v => setDeptCol(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- None --</SelectItem>
                    {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Absence Reason Column</Label>
                <Select value={reasonCol || "__none__"} onValueChange={v => setReasonCol(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- None --</SelectItem>
                    {columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Cost Settings */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Cost Settings
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estimated Cost per Absence Day ($)</Label>
                <Input 
                  type="number" 
                  value={costPerDay} 
                  onChange={e => setCostPerDay(Number(e.target.value))}
                  min={0}
                />
                <p className="text-xs text-muted-foreground">
                  Includes lost productivity, overtime, and replacement costs
                </p>
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

  // ============ STEP 3: VALIDATION ============
  const renderStep3Validation = () => {
    const checks = getValidationChecks();
    const canRun = checks.slice(0, 4).every(c => c.passed);
    
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
  // ============ STEP 4: RESULTS ============
  const renderStep4Results = () => {
    if (!results) return null;
    
    const { summary: s, results: r, key_insights } = results;
    
    const finding = `Overall absence rate is ${r.summary.overall_absence_rate.toFixed(1)}% with ` +
      `${r.summary.total_days_lost.toLocaleString()} days lost, estimated cost of ${formatCurrency(r.summary.estimated_cost)}. ` +
      `Highest absence department: ${s.highest_absence_dept}. Most common reason: ${s.top_reason}.`;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
            Absenteeism Analysis Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} />
          
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard 
              value={`${r.summary.overall_absence_rate.toFixed(1)}%`}
              label="Absence Rate" 
              sublabel={r.summary.overall_absence_rate > 4 ? "Above benchmark" : "Within benchmark"}
              icon={Percent}
              negative={r.summary.overall_absence_rate > 5}
              highlight={r.summary.overall_absence_rate <= 3}
            />
            <MetricCard 
              value={r.summary.total_days_lost.toLocaleString()}
              label="Days Lost" 
              sublabel={`${r.summary.total_absences} occurrences`}
              icon={CalendarDays}
            />
            <MetricCard 
              value={formatCurrency(r.summary.estimated_cost)}
              label="Estimated Cost" 
              icon={DollarSign}
              negative
            />
            <MetricCard 
              value={r.summary.avg_absence_duration.toFixed(1)}
              label="Avg Duration (days)" 
              icon={Timer}
            />
          </div>
          
          {/* Bradford Factor */}
          <div className="p-4 rounded-lg border border-border bg-muted/10">
            <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Bradford Factor Analysis
            </h4>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-semibold">{r.summary.bradford_factor_avg.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Average Bradford Factor</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold">{r.high_risk_employees.filter(e => e.risk_level === 'High' || e.risk_level === 'Critical').length}</p>
                <p className="text-xs text-muted-foreground">High-Risk Employees</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold">{r.summary.total_employees}</p>
                <p className="text-xs text-muted-foreground">Total Employees</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Bradford Factor = S² × D (S=spells, D=total days). Higher scores indicate disruptive patterns.
            </p>
          </div>
          
          {/* Department Stats */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Department Comparison
            </h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Employees</TableHead>
                  <TableHead className="text-right">Absences</TableHead>
                  <TableHead>Absence Rate</TableHead>
                  <TableHead className="text-right">Days Lost</TableHead>
                  <TableHead className="text-right">Cost Impact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.department_stats.map((dept) => (
                  <TableRow key={dept.department}>
                    <TableCell className="font-medium">{dept.department}</TableCell>
                    <TableCell className="text-right">{dept.total_employees}</TableCell>
                    <TableCell className="text-right">{dept.total_absences}</TableCell>
                    <TableCell>
                      <AbsenceRateBar rate={dept.absence_rate} />
                    </TableCell>
                    <TableCell className="text-right">{dept.total_days_lost}</TableCell>
                    <TableCell className="text-right">{formatCurrency(dept.cost_impact)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Reason Breakdown */}
          {r.reason_breakdown.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-primary" />
                Absence Reasons
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                {r.reason_breakdown.slice(0, 6).map((reason) => (
                  <div key={reason.reason} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-8 rounded-full bg-primary" style={{ opacity: reason.pct }}></div>
                      <div>
                        <p className="font-medium text-sm">{reason.reason}</p>
                        <p className="text-xs text-muted-foreground">{reason.count} occurrences, avg {reason.avg_duration.toFixed(1)} days</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">{(reason.pct * 100).toFixed(0)}%</Badge>
                  </div>
                ))}
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
          
          <div className="flex justify-end pt-4">
            <Button onClick={() => setCurrentStep(5)} className="gap-2">
              View Patterns
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ============ STEP 5: PATTERNS ============
  const renderStep5Patterns = () => {
    if (!results) return null;
    
    const { results: r } = results;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5 text-primary" />
            Absence Patterns & High-Risk Employees
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding="Understanding absence patterns helps predict and prevent issues. Monday/Friday absences and seasonal spikes often indicate opportunities for intervention." />
          
          {/* Day of Week Pattern */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              Day of Week Pattern
            </h4>
            <div className="grid grid-cols-7 gap-2">
              {r.day_of_week_pattern.map((day) => (
                <div key={day.period} className="text-center p-3 rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground mb-1">{day.period.slice(0, 3)}</p>
                  <p className={`text-lg font-semibold ${day.absence_rate > 5 ? 'text-destructive' : ''}`}>
                    {day.absence_rate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">{day.count}</p>
                </div>
              ))}
            </div>
          </div>
          
          {/* Monthly Pattern */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-primary" />
              Monthly Trend
            </h4>
            <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
              {r.monthly_pattern.map((month) => {
                const intensity = Math.min(1, month.absence_rate / 8);
                return (
                  <div key={month.period} className="text-center p-2 rounded-lg" 
                       style={{ backgroundColor: `rgba(239, 68, 68, ${intensity * 0.3})` }}>
                    <p className="text-xs text-muted-foreground">{month.period}</p>
                    <p className="text-sm font-medium">{month.absence_rate.toFixed(1)}%</p>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Seasonal Pattern */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <ThermometerSun className="w-4 h-4 text-primary" />
              Seasonal Pattern
            </h4>
            <div className="grid md:grid-cols-4 gap-4">
              {r.seasonal_pattern.map((season) => {
                const Icon = season.period === 'Winter' ? Snowflake : 
                             season.period === 'Summer' ? Sun : ThermometerSun;
                return (
                  <div key={season.period} className="flex items-center gap-3 p-4 rounded-lg border border-border">
                    <Icon className={`w-8 h-8 ${
                      season.period === 'Winter' ? 'text-blue-500' :
                      season.period === 'Summer' ? 'text-amber-500' :
                      season.period === 'Spring' ? 'text-green-500' : 'text-orange-500'
                    }`} />
                    <div>
                      <p className="font-medium">{season.period}</p>
                      <p className="text-sm text-muted-foreground">{season.absence_rate.toFixed(1)}% rate</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <Separator />
          
          {/* High Risk Employees */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              High-Risk Employees (Top Bradford Factor)
            </h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Absences</TableHead>
                  <TableHead className="text-right">Days Lost</TableHead>
                  <TableHead className="text-right">Absence Rate</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.high_risk_employees.slice(0, 10).map((emp) => (
                  <TableRow key={emp.employee_id}>
                    <TableCell className="font-mono text-sm">{emp.employee_id}</TableCell>
                    <TableCell>{emp.department}</TableCell>
                    <TableCell className="text-right">{emp.absence_count}</TableCell>
                    <TableCell className="text-right">{emp.total_days}</TableCell>
                    <TableCell className="text-right">{emp.absence_rate.toFixed(1)}%</TableCell>
                    <TableCell><RiskBadge level={emp.risk_level} /></TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {emp.trend === 'increasing' ? '↑ Increasing' : emp.trend === 'decreasing' ? '↓ Decreasing' : '→ Stable'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <DetailParagraph
            title="Pattern Analysis Guide"
            detail={`■ Day of Week Patterns

• Monday/Friday spikes may indicate "long weekend" behavior
• Mid-week absences more likely genuine illness
• Consider flexible work policies if patterns persist

■ Seasonal Patterns

• Winter: Flu season, SAD, holiday stress
• Summer: Childcare gaps, vacation extensions
• Back-to-school: Family adjustment period

■ Bradford Factor Interpretation

• 0-49: No concern
• 50-124: Informal discussion recommended
• 125-399: Formal warning consideration
• 400-649: Final warning consideration
• 650+: Dismissal consideration

■ Recommended Actions

1. Review high-risk employees with HR
2. Implement wellness programs for high-absence departments
3. Consider flexible work arrangements
4. Track patterns over time for intervention timing`}
          />
          
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(4)}>Back to Results</Button>
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
    
    const { summary: s, results: r, visualizations } = results;

    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b border-border">
          <h1 className="text-xl font-semibold">Absenteeism Analysis Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {s.analysis_period} | {new Date().toLocaleDateString()}
          </p>
        </div>
        
        {/* Executive Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MetricCard value={`${r.summary.overall_absence_rate.toFixed(1)}%`} label="Absence Rate" />
              <MetricCard value={r.summary.total_days_lost.toLocaleString()} label="Days Lost" />
              <MetricCard value={formatCurrency(r.summary.estimated_cost)} label="Total Cost" />
              <MetricCard value={r.summary.total_employees.toLocaleString()} label="Employees" />
            </div>
            <p className="text-sm text-muted-foreground">
              Analysis of {r.summary.total_absences} absence records across {r.summary.total_employees} employees.
              Highest absence department: {s.highest_absence_dept}. Peak absence day: {s.peak_day}.
              Most common reason: {s.top_reason}.
            </p>
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
                  {visualizations.department_comparison && <TabsTrigger value="department_comparison" className="text-xs">By Department</TabsTrigger>}
                  {visualizations.reason_pie && <TabsTrigger value="reason_pie" className="text-xs">By Reason</TabsTrigger>}
                  {visualizations.day_of_week && <TabsTrigger value="day_of_week" className="text-xs">Day of Week</TabsTrigger>}
                  {visualizations.monthly_trend && <TabsTrigger value="monthly_trend" className="text-xs">Monthly Trend</TabsTrigger>}
                  {visualizations.bradford_distribution && <TabsTrigger value="bradford_distribution" className="text-xs">Bradford Factor</TabsTrigger>}
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
        
        {/* Department Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Department Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Employees</TableHead>
                  <TableHead className="text-right">Absences</TableHead>
                  <TableHead className="text-right">Absence Rate</TableHead>
                  <TableHead className="text-right">Days Lost</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.department_stats.map((dept) => (
                  <TableRow key={dept.department}>
                    <TableCell className="font-medium">{dept.department}</TableCell>
                    <TableCell className="text-right">{dept.total_employees}</TableCell>
                    <TableCell className="text-right">{dept.total_absences}</TableCell>
                    <TableCell className={`text-right ${dept.absence_rate > 5 ? 'text-destructive' : ''}`}>
                      {dept.absence_rate.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">{dept.total_days_lost}</TableCell>
                    <TableCell className="text-right">{formatCurrency(dept.cost_impact)}</TableCell>
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
                CSV (Department Stats)
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
          <Button variant="outline" onClick={() => setCurrentStep(1)}>New Analysis</Button>
        </div>
      </div>
    );
  };

  // ============ RENDER ============
  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
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
      {currentStep === 4 && renderStep4Results()}
      {currentStep === 5 && renderStep5Patterns()}
      {currentStep === 6 && renderStep6Report()}
    </div>
  );
}