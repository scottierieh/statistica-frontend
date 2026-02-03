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
import { Checkbox } from "@/components/ui/checkbox";
import {
  ClipboardList, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle,
  Shield, Info, HelpCircle, FileSpreadsheet, FileText,
  Download, TrendingUp, Settings, Activity, ChevronRight,
  BarChart3, Users, Layers, Target, Play, ThumbsUp,
  ThumbsDown, Minus, Building, Award, BookOpen, BookMarked, TrendingDown, MessageSquare
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "https://statistica-api-995604437166.asia-northeast3.run.app";

interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface QuestionStats {
  question: string; mean: number; median: number; std: number;
  min: number; max: number; count: number;
  favorable: number; neutral: number; unfavorable: number;
  favorable_pct: number; score_pct: number;
}

interface DeptData {
  department: string; avg_score: number; index_pct: number;
  respondents: number; responses: number;
}

interface TestResult {
  mean: number; benchmark: number; difference: number;
  t_statistic: number; p_value: number; cohens_d: number;
  significant: boolean; direction: string;
}

interface SurveyResult {
  success: boolean;
  results: {
    engagement_index: { index: number; avg_score: number; category: string; total_responses: number; questions_analyzed: number; };
    question_stats: QuestionStats[];
    department_data: DeptData[];
    tenure_data: any[];
    test_results: { [key: string]: TestResult };
    strengths_weaknesses: { strengths: QuestionStats[]; weaknesses: QuestionStats[]; };
    response_count: number;
  };
  visualizations: { engagement_overview?: string; favorable_distribution?: string; engagement_gauge?: string; benchmark_comparison?: string; department_comparison?: string; };
  key_insights: KeyInsight[];
  summary: { analysis_type: string; response_count: number; questions_analyzed: number; engagement_index: number; engagement_category: string; benchmark_score: number; scale_max: number; analyze_time_ms: number; };
}

const ANALYSIS_TYPES = [
  { value: "overall", label: "Overall Analysis", desc: "Comprehensive survey analysis", icon: BarChart3 },
  { value: "trend", label: "Trend Analysis", desc: "Compare over time periods", icon: TrendingUp },
  { value: "benchmark", label: "Benchmark", desc: "Compare against targets", icon: Target },
];

const generateSampleData = (): DataRow[] => {
  const departments = ["Engineering", "Sales", "Marketing", "Operations", "HR", "Finance"];
  const questions = ["Q1_Leadership", "Q2_WorkLifeBalance", "Q3_CareerGrowth", "Q4_Compensation", "Q5_TeamCollaboration", "Q6_Communication", "Q7_Recognition", "Q8_JobSatisfaction"];
  const data: DataRow[] = [];
  
  const deptBias: { [key: string]: number } = { "Engineering": 0.3, "Sales": 0.1, "Marketing": 0.2, "Operations": -0.1, "HR": 0.4, "Finance": 0.0 };
  const questionBias: { [key: string]: number } = { "Q1_Leadership": 0.2, "Q2_WorkLifeBalance": -0.3, "Q3_CareerGrowth": -0.1, "Q4_Compensation": -0.4, "Q5_TeamCollaboration": 0.3, "Q6_Communication": 0.1, "Q7_Recognition": -0.2, "Q8_JobSatisfaction": 0.2 };
  
  for (let i = 0; i < 250; i++) {
    const dept = departments[Math.floor(Math.random() * departments.length)];
    const tenure = Math.floor(Math.random() * 15) + 1;
    const row: DataRow = { respondent_id: `R${String(i + 1).padStart(4, '0')}`, department: dept, tenure_years: tenure, manager: `M${Math.floor(Math.random() * 20) + 1}` };
    
    for (const q of questions) {
      let baseScore = 3.5 + deptBias[dept] + questionBias[q];
      baseScore += (Math.random() - 0.5) * 1.5;
      baseScore = Math.max(1, Math.min(5, baseScore));
      row[q] = Math.round(baseScore * 10) / 10;
    }
    data.push(row);
  }
  return data;
};

const MetricCard: React.FC<{ value: string | number | React.ReactNode; label: string; negative?: boolean; highlight?: boolean; icon?: React.FC<{ className?: string }> }> = ({ value, label, negative, highlight, icon: Icon }) => (
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
    const rows = data.map(row => columns.map(col => { const val = row[col]; if (val === null || val === undefined) return ''; if (typeof val === 'string' && val.includes(',')) return `"${val}"`; return val; }).join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'survey_data.csv'; a.click();
  };
  if (data.length === 0) return null;
  return (
    <div className="mb-6 border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-muted/20">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 hover:text-primary transition-colors">
          <FileText className="w-4 h-4 text-muted-foreground" /><span className="text-sm font-medium">Data Preview</span>
          <Badge variant="secondary" className="text-xs">{data.length} responses</Badge>
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={downloadCSV}><Download className="w-3 h-3" />Download</Button>
      </div>
      {expanded && (
        <div className="max-h-64 overflow-auto">
          <Table><TableHeader><TableRow>{columns.slice(0, 8).map(col => (<TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>))}</TableRow></TableHeader>
            <TableBody>{data.slice(0, 10).map((row, i) => (<TableRow key={i}>{columns.slice(0, 8).map(col => (<TableCell key={col} className="text-xs py-1.5">{row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}</TableCell>))}</TableRow>))}</TableBody>
          </Table>
          {data.length > 10 && <p className="text-xs text-muted-foreground p-2 text-center">Showing first 10 of {data.length} responses</p>}
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
        const isCompleted = step.num < currentStep; const isCurrent = step.num === currentStep; const isAccessible = step.num <= 3 || hasResults;
        return (
          <React.Fragment key={step.num}>
            <button onClick={() => isAccessible && onStepClick(step.num)} disabled={!isAccessible}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all ${isCurrent ? "bg-primary text-primary-foreground" : isCompleted ? "bg-primary/10 text-primary" : isAccessible ? "bg-muted text-muted-foreground hover:bg-muted/80" : "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"}`}>
              {step.label}
            </button>
            {idx < steps.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/30" />}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const EngagementBadge: React.FC<{ index: number; category: string }> = ({ index, category }) => {
  const color = index >= 70 ? 'bg-green-500' : index >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <Badge className={`${color} text-white`}>{index.toFixed(1)}% - {category}</Badge>
  );
};

const QuestionCard: React.FC<{ question: QuestionStats; benchmark: number }> = ({ question, benchmark }) => {
  const isAbove = question.mean >= benchmark;
  return (
    <div className={`p-4 rounded-lg border ${isAbove ? 'border-primary/30 bg-primary/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="font-medium text-sm">{question.question}</p>
        <Badge variant={isAbove ? "default" : "secondary"}>{question.mean.toFixed(2)}</Badge>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="flex items-center gap-1"><ThumbsUp className="w-3 h-3 text-green-600" /><span>{question.favorable} ({question.favorable_pct.toFixed(0)}%)</span></div>
        <div className="flex items-center gap-1"><Minus className="w-3 h-3 text-amber-600" /><span>{question.neutral}</span></div>
        <div className="flex items-center gap-1"><ThumbsDown className="w-3 h-3 text-red-600" /><span>{question.unfavorable}</span></div>
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
            <h2 className="text-lg font-semibold">Employee Engagement Survey Guide</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              What is Employee Engagement?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Employee engagement is the emotional commitment employees have to their organization and its goals. 
              Engaged employees care about their work and their company - they don't just work for a paycheck or the 
              next promotion, but work on behalf of the organization's goals. Engagement surveys measure factors like 
              job satisfaction, motivation, alignment with company values, sense of purpose, and likelihood to recommend 
              the organization as a great place to work.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              The Engagement Index
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                <p className="font-medium text-sm mb-2">How the Engagement Index is Calculated</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Step 1:</strong> Average all survey questions to get mean score (e.g., 3.8 out of 5)<br/>
                  <strong>Step 2:</strong> Normalize to 0-100% scale: (Score - 1) / (Max - 1) × 100%<br/>
                  <strong>Example:</strong> 3.8 on 1-5 scale → (3.8 - 1) / (5 - 1) × 100% = 70%<br/>
                  <strong>Interpretation:</strong> 70% engagement means scores are 70% of the way from minimum to maximum
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Engagement Index Benchmarks</p>
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Index Range</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Interpretation</TableHead>
                      <TableHead>Action Required</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="bg-green-500/5">
                      <TableCell className="font-medium">80-100%</TableCell>
                      <TableCell className="text-green-600">Highly Engaged</TableCell>
                      <TableCell>Exceptional performance, strong culture</TableCell>
                      <TableCell>Maintain momentum, share best practices</TableCell>
                    </TableRow>
                    <TableRow className="bg-green-400/5">
                      <TableCell className="font-medium">70-80%</TableCell>
                      <TableCell className="text-green-600">Engaged</TableCell>
                      <TableCell>Above average, positive environment</TableCell>
                      <TableCell>Continue current initiatives</TableCell>
                    </TableRow>
                    <TableRow className="bg-amber-500/5">
                      <TableCell className="font-medium">50-70%</TableCell>
                      <TableCell className="text-amber-600">Moderately Engaged</TableCell>
                      <TableCell>Average, some concerns present</TableCell>
                      <TableCell>Targeted improvements needed</TableCell>
                    </TableRow>
                    <TableRow className="bg-red-500/5">
                      <TableCell className="font-medium">Below 50%</TableCell>
                      <TableCell className="text-red-600">Disengaged</TableCell>
                      <TableCell>Significant issues, retention risk</TableCell>
                      <TableCell>Urgent intervention required</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Likert Scale Surveys
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Common Likert Scale Formats</p>
                <div className="text-xs text-muted-foreground space-y-2">
                  <p><strong>5-Point Scale (Most Common):</strong><br/>
                  1 = Strongly Disagree<br/>
                  2 = Disagree<br/>
                  3 = Neither Agree nor Disagree (Neutral)<br/>
                  4 = Agree<br/>
                  5 = Strongly Agree</p>
                  
                  <p><strong>7-Point Scale (More Granular):</strong><br/>
                  Adds "Somewhat Disagree" (2) and "Somewhat Agree" (5)<br/>
                  Provides finer distinctions in opinion</p>
                  
                  <p><strong>4-Point or 6-Point (Forced Choice):</strong><br/>
                  Removes neutral option to force respondents to lean positive or negative</p>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Response Categorization</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Favorable (Top Box):</strong> Responses in top 20% of scale<br/>
                  • 5-point scale: 5 only (Strongly Agree)<br/>
                  • 7-point scale: 6-7 (Agree, Strongly Agree)<br/>
                  <strong>Interpretation:</strong> These are your strongest advocates<br/><br/>
                  
                  <strong>Unfavorable (Bottom Box):</strong> Responses in bottom 40% of scale<br/>
                  • 5-point scale: 1-2 (Strongly Disagree, Disagree)<br/>
                  • 7-point scale: 1-3<br/>
                  <strong>Interpretation:</strong> These employees have significant concerns<br/><br/>
                  
                  <strong>Neutral (Middle):</strong> Remaining responses<br/>
                  • 5-point scale: 3-4<br/>
                  <strong>Interpretation:</strong> Ambivalent, could go either way with right intervention
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Key Survey Question Categories
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">1. Job Satisfaction & Purpose</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• "I find my work meaningful and purposeful"</li>
                  <li>• "I am proud to work for this organization"</li>
                  <li>• "I would recommend this company as a great place to work"</li>
                  <li>• "I am satisfied with my job overall"</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">2. Leadership & Management</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• "My manager cares about me as a person"</li>
                  <li>• "I receive regular, constructive feedback"</li>
                  <li>• "Leadership communicates a clear vision"</li>
                  <li>• "I trust senior leadership to make good decisions"</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">3. Growth & Development</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• "I see opportunities for career growth here"</li>
                  <li>• "I receive training needed to do my job well"</li>
                  <li>• "My manager supports my professional development"</li>
                  <li>• "I have clear career path options"</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">4. Recognition & Rewards</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• "I receive recognition when I do good work"</li>
                  <li>• "I am compensated fairly for my contributions"</li>
                  <li>• "Good performance is rewarded here"</li>
                  <li>• "I feel valued by the organization"</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">5. Work-Life Balance & Wellbeing</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• "I can maintain a healthy work-life balance"</li>
                  <li>• "I don't feel burnt out"</li>
                  <li>• "My workload is manageable"</li>
                  <li>• "The company supports employee wellbeing"</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">6. Collaboration & Culture</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• "I work well with my team"</li>
                  <li>• "People collaborate across departments"</li>
                  <li>• "I feel included and valued for who I am"</li>
                  <li>• "We have a culture of respect and trust"</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">7. Resources & Tools</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• "I have the tools and resources to do my job"</li>
                  <li>• "Processes enable rather than hinder my work"</li>
                  <li>• "Technology supports my productivity"</li>
                  <li>• "I have what I need to be successful"</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">8. Communication & Transparency</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• "I am well-informed about company decisions"</li>
                  <li>• "Communication flows effectively across teams"</li>
                  <li>• "I feel comfortable speaking up"</li>
                  <li>• "Leadership is transparent and honest"</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Analyzing Survey Results
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Statistical Measures</p>
                <div className="text-xs text-muted-foreground space-y-2">
                  <p><strong>Mean (Average Score):</strong><br/>
                  Sum of all responses divided by count. Most common metric.<br/>
                  <strong>Example:</strong> Scores {'{'}4, 5, 3, 4, 5{'}'} → Mean = 4.2<br/>
                  <strong>Use:</strong> Primary metric for comparison</p>
                  
                  <p><strong>Median (Middle Value):</strong><br/>
                  Middle score when sorted. Robust to outliers.<br/>
                  <strong>Example:</strong> Scores {'{'}1, 4, 4, 5, 5{'}'} → Median = 4<br/>
                  <strong>Use:</strong> When extreme responses might skew mean</p>
                  
                  <p><strong>Standard Deviation:</strong><br/>
                  Spread of responses around mean. Higher = more disagreement.<br/>
                  <strong>Low SD (below 1.0):</strong> Consensus<br/>
                  <strong>High SD (above 1.5):</strong> Polarized opinions<br/>
                  <strong>Use:</strong> Identify areas with inconsistent experiences</p>
                  
                  <p><strong>Favorable %:</strong><br/>
                  Percentage who selected top box (highest rating).<br/>
                  <strong>Target:</strong> 60%+ favorable is good<br/>
                  <strong>Use:</strong> Easy-to-communicate metric for leadership</p>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Benchmark Comparison</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Internal Benchmark:</strong> Set target score (e.g., 3.5 out of 5)<br/>
                  Questions scoring above benchmark are "strengths"<br/>
                  Questions scoring below are "opportunities for improvement"<br/><br/>
                  
                  <strong>Statistical Significance:</strong> t-tests compare each question to benchmark<br/>
                  • p-value below 0.05: Difference is statistically significant<br/>
                  • p-value above 0.05: Difference could be due to chance<br/>
                  • Cohen's d measures effect size (practical significance)<br/><br/>
                  
                  <strong>External Benchmarks:</strong> Industry/sector averages<br/>
                  • Technology sector: typically 72-75% engagement<br/>
                  • Healthcare: typically 68-70%<br/>
                  • Retail: typically 60-65%<br/>
                  • Manufacturing: typically 65-68%
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Building className="w-4 h-4" />
              Segmentation & Drill-Down Analysis
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Department/Team Comparison</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Purpose:</strong> Identify hotspots and best practice teams<br/>
                  <strong>Action on High-Scoring Depts:</strong> Document what they're doing right, share practices<br/>
                  <strong>Action on Low-Scoring Depts:</strong> Investigate root causes, manager intervention<br/>
                  <strong>Caution:</strong> Small teams (below 5) may not have reliable scores due to sample size
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Tenure Segmentation</p>
                <p className="text-xs text-muted-foreground">
                  <strong>0-1 Years (New Hires):</strong> Onboarding experience, culture fit<br/>
                  Low scores → Onboarding issues, unmet expectations<br/><br/>
                  
                  <strong>1-3 Years (Mid-Tenure):</strong> Growth opportunities, career path<br/>
                  Low scores → "Stuck" feeling, lack of development<br/><br/>
                  
                  <strong>3-5 Years:</strong> Peak productivity, but highest flight risk<br/>
                  Low scores → Career plateau, external opportunities<br/><br/>
                  
                  <strong>5+ Years (Veterans):</strong> Loyalty, institutional knowledge<br/>
                  Low scores → Change fatigue, feeling undervalued
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Manager-Level Analysis</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Manager Effectiveness:</strong> Compare scores by manager (if team sizes permit)<br/>
                  <strong>High Variance:</strong> Manager quality is the issue, not company-wide problems<br/>
                  <strong>Low Variance:</strong> Systemic issues affecting all teams<br/>
                  <strong>Privacy:</strong> Only analyze managers with 5+ direct reports to protect anonymity
                </p>
              </div>

              <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <p className="font-medium text-sm text-amber-600 mb-1">⚠️ Anonymity & Confidentiality</p>
                <p className="text-xs text-muted-foreground">
                  Never report segments with fewer than 5 respondents - risk of identifying individuals.<br/>
                  Aggregate small teams into "Other" category.<br/>
                  Don't cross-tab too many dimensions (e.g., "Female engineers in Sales with 2-3 years tenure")<br/>
                  Communicate to employees that individual responses are anonymous and confidential.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Award className="w-4 h-4" />
              Strengths & Opportunities Framework
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/5">
                <p className="font-medium text-sm text-green-600 mb-2">Strengths (High-Scoring Areas)</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Definition:</strong> Questions scoring significantly above benchmark<br/>
                  <strong>Strategy:</strong> Leverage and protect<br/>
                  <strong>Actions:</strong><br/>
                  1. Celebrate and communicate wins<br/>
                  2. Document what's working (case studies)<br/>
                  3. Share best practices across organization<br/>
                  4. Maintain investment - don't neglect strengths<br/>
                  5. Use as employer brand messaging
                </p>
              </div>

              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                <p className="font-medium text-sm text-red-600 mb-2">Opportunities (Low-Scoring Areas)</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Definition:</strong> Questions scoring significantly below benchmark<br/>
                  <strong>Strategy:</strong> Prioritize and improve<br/>
                  <strong>Actions:</strong><br/>
                  1. Investigate root causes (focus groups, interviews)<br/>
                  2. Develop targeted action plans<br/>
                  3. Assign ownership to leaders<br/>
                  4. Set improvement targets and timelines<br/>
                  5. Communicate actions taken ("you spoke, we listened")
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Prioritization Matrix</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Urgent (Low score + High importance):</strong><br/>
                  • Safety, ethics, discrimination issues → Immediate action<br/>
                  • Manager effectiveness → Training, coaching<br/>
                  • Pay equity → Compensation review<br/><br/>
                  
                  <strong>Important (Low score + Moderate importance):</strong><br/>
                  • Career development → 6-month initiatives<br/>
                  • Work-life balance → Policy review<br/>
                  • Recognition programs → Budget for next year<br/><br/>
                  
                  <strong>Monitor (Moderate score):</strong><br/>
                  • Areas at risk of declining<br/>
                  • Pulse check in 3-6 months<br/><br/>
                  
                  <strong>Maintain (High score):</strong><br/>
                  • Don't fix what isn't broken<br/>
                  • Sustain current investment
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Taking Action: From Insight to Impact
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Step 1: Share Results (Week 1-2)</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• <strong>Executive Team:</strong> Full results, strategic implications</li>
                  <li>• <strong>Managers:</strong> Company-wide + their team's results</li>
                  <li>• <strong>All Employees:</strong> High-level summary, key themes, next steps</li>
                  <li>• <strong>Format:</strong> Town halls, manager cascades, email summaries</li>
                  <li>• <strong>Tone:</strong> Transparent, balanced (acknowledge good and bad), action-oriented</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Step 2: Deep Dive (Week 3-4)</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Conduct focus groups on low-scoring areas</li>
                  <li>• Interview high and low performers</li>
                  <li>• Manager listening sessions with their teams</li>
                  <li>• Ask "Why?" - get to root causes, not just symptoms</li>
                  <li>• Document themes and specific pain points</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Step 3: Action Planning (Week 5-8)</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• <strong>Company-Wide Actions:</strong> 2-3 big initiatives maximum</li>
                  <li>• <strong>Department Actions:</strong> Managers own team-specific issues</li>
                  <li>• <strong>SMART Goals:</strong> Specific, Measurable, Achievable, Relevant, Time-bound</li>
                  <li>• <strong>Assign Ownership:</strong> Named leaders responsible for each action</li>
                  <li>• <strong>Resource:</strong> Budget, time, people needed</li>
                  <li>• <strong>Example:</strong> "Improve work-life balance by implementing flexible hours pilot in Q2, led by HR Director, $50K budget"</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Step 4: Communicate Actions (Week 9-10)</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• <strong>"You Spoke, We Listened":</strong> Show you heard them</li>
                  <li>• Publish action plan - what, who, when</li>
                  <li>• Be honest about trade-offs ("Can't do X now, but will revisit in 2026")</li>
                  <li>• Quick wins + long-term initiatives</li>
                  <li>• Visible progress within 90 days</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-2">Step 5: Execute & Track (Ongoing)</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Monthly check-ins on action plan progress</li>
                  <li>• Quarterly pulse surveys (short, 5-10 questions)</li>
                  <li>• Visible milestones and celebrations</li>
                  <li>• Adjust plans based on progress and feedback</li>
                  <li>• Annual full survey to measure improvement</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Survey Best Practices
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Survey Design</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• <strong>Length:</strong> 30-50 questions (10-15 min completion)</li>
                  <li>• <strong>Scale:</strong> 5-point Likert (most common, balance of granularity)</li>
                  <li>• <strong>Questions:</strong> Clear, unbiased, single-topic</li>
                  <li>• <strong>Open-Ended:</strong> 2-3 optional text fields for qualitative feedback</li>
                  <li>• <strong>Demographics:</strong> Collect segmentation data (dept, tenure)</li>
                  <li>• <strong>Anonymity:</strong> Clearly communicate how responses are protected</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Response Rate</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• <strong>Target:</strong> 70%+ response rate</li>
                  <li>• <strong>Below 50%:</strong> Results may not be representative</li>
                  <li>• <strong>Boost Rates:</strong> Leadership endorsement, reminders, mobile-friendly</li>
                  <li>• <strong>Timing:</strong> Avoid busy seasons, holidays</li>
                  <li>• <strong>Incentives:</strong> Raffles, donations to charity</li>
                  <li>• <strong>Follow-Through:</strong> Past action increases future participation</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Frequency</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• <strong>Annual Survey:</strong> Comprehensive, 40-50 questions</li>
                  <li>• <strong>Quarterly Pulse:</strong> 5-10 questions on specific themes</li>
                  <li>• <strong>Event-Based:</strong> Onboarding, exit, post-major change</li>
                  <li>• <strong>Avoid:</strong> Survey fatigue from too-frequent surveys</li>
                  <li>• <strong>Balance:</strong> Enough time to take action between surveys</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm text-primary mb-1">Common Pitfalls</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• <strong>Survey Fatigue:</strong> Don't over-survey</li>
                  <li>• <strong>No Action:</strong> Worst thing is survey without follow-up</li>
                  <li>• <strong>Defensive Reaction:</strong> Don't blame employees for low scores</li>
                  <li>• <strong>Cherry-Picking:</strong> Share full picture, not just good news</li>
                  <li>• <strong>Analysis Paralysis:</strong> Don't wait for perfect data</li>
                  <li>• <strong>Ignoring Qualitative:</strong> Read open-ended responses</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-primary">Note:</strong> Employee engagement surveys are not report cards - 
              they're diagnostic tools to improve the employee experience. The survey itself doesn't improve engagement; 
              the actions you take in response do. Focus on 2-3 meaningful initiatives rather than 20 small tweaks. 
              Communicate transparently about what you can and can't change. Close the loop - tell employees what you 
              heard and what you're doing about it. Most importantly, track progress over time. Engagement is a journey, 
              not a destination. Sustained improvement in engagement leads to better retention, productivity, innovation, 
              and business outcomes.
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
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4"><ClipboardList className="w-6 h-6 text-primary" /></div>
        <h1 className="text-2xl font-semibold">Employee Engagement Survey Analysis</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Analyze employee survey responses to measure engagement, identify strengths and areas for improvement, and compare results across departments.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {ANALYSIS_TYPES.map((type) => (
          <div key={type.value} className="p-5 rounded-lg border border-border bg-muted/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><type.icon className="w-5 h-5 text-primary" /></div>
              <div><p className="font-medium">{type.label}</p><p className="text-xs text-muted-foreground">{type.desc}</p></div>
            </div>
          </div>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Info className="w-5 h-5 text-primary" />When to Use Survey Analysis</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div><h4 className="font-medium text-primary mb-3">Requirements</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["Survey response data (Likert scale)", "At least 2 survey questions", "Respondent identifier (optional)", "Department column (optional)", "Minimum 5 survey responses"].map((req) => (<li key={req} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />{req}</li>))}
              </ul>
            </div>
            <div><h4 className="font-medium text-primary mb-3">Results</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["Overall engagement index", "Question-by-question analysis", "Department comparison", "Strengths & improvement areas"].map((res) => (<li key={res} className="flex items-start gap-2"><TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />{res}</li>))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={onLoadSample} className="gap-2"><Activity className="w-4 h-4" />Load Sample Data</Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2"><Upload className="w-4 h-4" />Upload Your Data</Button>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={onFileUpload} className="hidden" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default function SurveyAnalysisPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<SurveyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  
  const [respondentCol, setRespondentCol] = useState<string>("");
  const [questionCols, setQuestionCols] = useState<string[]>([]);
  const [departmentCol, setDepartmentCol] = useState<string>("");
  const [tenureCol, setTenureCol] = useState<string>("");
  const [managerCol, setManagerCol] = useState<string>("");
  const [analysisType, setAnalysisType] = useState<string>("overall");
  const [benchmarkScore, setBenchmarkScore] = useState<string>("3.5");
  const [scaleMax, setScaleMax] = useState<string>("5");

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData); setColumns(Object.keys(sampleData[0]));
    const qCols = Object.keys(sampleData[0]).filter(c => c.startsWith('Q'));
    setRespondentCol("respondent_id"); setQuestionCols(qCols); setDepartmentCol("department"); setTenureCol("tenure_years"); setManagerCol("manager");
    setCurrentStep(2); setResults(null); setError(null);
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const formData = new FormData(); formData.append("file", file);
    try {
      setLoading(true);
      const res = await fetch(`${FASTAPI_URL}/api/data/upload`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const result = await res.json();
      setData(result.data); setColumns(result.columns); setCurrentStep(2); setResults(null); setError(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Upload failed"); }
    finally { setLoading(false); }
  }, []);

  const toggleQuestionCol = (col: string) => {
    setQuestionCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
  };

  const getValidationChecks = useCallback((): ValidationCheck[] => {
    const numRecords = data.length;
    const hasQuestions = questionCols.length >= 2;
    const benchmark = parseFloat(benchmarkScore) || 3.5;
    const scale = parseInt(scaleMax) || 5;
    
    return [
      { name: "Data Loaded", passed: data.length > 0, message: data.length > 0 ? `${numRecords} responses loaded` : "No data loaded" },
      { name: "Survey Questions", passed: hasQuestions, message: hasQuestions ? `${questionCols.length} questions selected` : "Select at least 2 questions" },
      { name: "Sufficient Responses", passed: numRecords >= 5, message: numRecords >= 5 ? `${numRecords} responses (sufficient)` : `${numRecords} responses (need 5+)` },
      { name: "Benchmark Score", passed: benchmark > 0 && benchmark <= scale, message: `Benchmark: ${benchmark} / ${scale}` },
      { name: "Scale Configuration", passed: scale >= 3 && scale <= 10, message: `Scale: 1-${scale}` },
    ];
  }, [data, questionCols, benchmarkScore, scaleMax]);

  const runAnalysis = async () => {
    try {
      setLoading(true); setError(null);
      const payload = { data, respondent_col: respondentCol || null, question_cols: questionCols, department_col: departmentCol || null, tenure_col: tenureCol || null, manager_col: managerCol || null, analysis_type: analysisType, benchmark_score: parseFloat(benchmarkScore), scale_max: parseInt(scaleMax) };
      const res = await fetch(`${FASTAPI_URL}/api/analysis/survey`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const errData = await res.json(); throw new Error(errData.detail || "Analysis failed"); }
      const result: SurveyResult = await res.json();
      setResults(result); setCurrentStep(4);
    } catch (err) { setError(err instanceof Error ? err.message : "Analysis failed"); }
    finally { setLoading(false); }
  };

  const handleDownloadCSV = () => {
    if (!results) return;
    const { question_stats } = results.results;
    const rows: string[] = ['Question,Mean,Median,Favorable,Neutral,Unfavorable,Favorable%'];
    question_stats.forEach(q => rows.push(`"${q.question}",${q.mean.toFixed(2)},${q.median.toFixed(2)},${q.favorable},${q.neutral},${q.unfavorable},${q.favorable_pct.toFixed(1)}%`));
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'survey_analysis.csv'; a.click();
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const base64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!base64) return;
    const a = document.createElement('a'); a.href = `data:image/png;base64,${base64}`; a.download = `survey_${chartKey}.png`; a.click();
  };

  const renderStep2Config = () => {
    const numericCols = columns.filter(col => {
      const sample = data.slice(0, 10).map(d => d[col]).filter(v => v !== null && v !== undefined);
      return sample.some(v => !isNaN(Number(v)));
    });
    
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Settings className="w-5 h-5 text-primary" />Configure Analysis</CardTitle><CardDescription>Set up survey analysis parameters</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2"><Target className="w-4 h-4 text-primary" />Analysis Type</h4>
            <div className="grid md:grid-cols-3 gap-3">
              {ANALYSIS_TYPES.map((type) => (
                <button key={type.value} onClick={() => setAnalysisType(type.value)} className={`p-4 rounded-lg border text-left transition-all ${analysisType === type.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                  <type.icon className="w-5 h-5 text-primary mb-2" /><p className="font-medium text-sm">{type.label}</p><p className="text-xs text-muted-foreground">{type.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2"><MessageSquare className="w-4 h-4 text-primary" />Survey Questions *</h4>
            <p className="text-xs text-muted-foreground">Select columns containing survey responses (numeric Likert scale)</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
              {numericCols.map(col => (
                <div key={col} className="flex items-center space-x-2">
                  <Checkbox id={col} checked={questionCols.includes(col)} onCheckedChange={() => toggleQuestionCol(col)} />
                  <label htmlFor={col} className="text-sm cursor-pointer truncate">{col}</label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{questionCols.length} questions selected</p>
          </div>
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2"><Layers className="w-4 h-4 text-primary" />Grouping Columns</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Respondent ID</Label>
                <Select value={respondentCol || "__none__"} onValueChange={v => setRespondentCol(v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="__none__">-- Optional --</SelectItem>{columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-2"><Label>Department</Label>
                <Select value={departmentCol || "__none__"} onValueChange={v => setDepartmentCol(v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="__none__">-- Optional --</SelectItem>{columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-2"><Label>Tenure</Label>
                <Select value={tenureCol || "__none__"} onValueChange={v => setTenureCol(v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="__none__">-- Optional --</SelectItem>{columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-2"><Label>Manager</Label>
                <Select value={managerCol || "__none__"} onValueChange={v => setManagerCol(v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="__none__">-- Optional --</SelectItem>{columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Scale Configuration</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Benchmark Score</Label><Input type="number" min="1" max="10" step="0.1" value={benchmarkScore} onChange={e => setBenchmarkScore(e.target.value)} /></div>
              <div className="space-y-2"><Label>Scale Maximum</Label><Input type="number" min="3" max="10" value={scaleMax} onChange={e => setScaleMax(e.target.value)} /></div>
            </div>
          </div>
          <div className="flex justify-end pt-4"><Button onClick={() => setCurrentStep(3)} className="gap-2">Continue to Validation<ArrowRight className="w-4 h-4" /></Button></div>
        </CardContent>
      </Card>
    );
  };

  const renderStep3Validation = () => {
    const checks = getValidationChecks(); const canRun = checks.every(c => c.passed);
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Shield className="w-5 h-5 text-primary" />Data Validation</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            {checks.map((check, idx) => (
              <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${check.passed ? 'border-border' : 'border-destructive/30 bg-destructive/5'}`}>
                <div className="flex items-center gap-3">{check.passed ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <XCircle className="w-5 h-5 text-destructive" />}<div><p className="font-medium text-sm">{check.name}</p><p className="text-xs text-muted-foreground">{check.message}</p></div></div>
                <Badge variant={check.passed ? "secondary" : "destructive"} className="text-xs">{check.passed ? "Pass" : "Required"}</Badge>
              </div>
            ))}
          </div>
          <div className="p-4 rounded-lg border border-border bg-muted/10">
            <div className="flex items-start gap-2"><Info className="w-5 h-5 text-primary mt-0.5" /><div className="text-sm"><p className="font-medium">Configuration Summary</p><p className="text-muted-foreground">{`Analysis: ${ANALYSIS_TYPES.find(t => t.value === analysisType)?.label} • Questions: ${questionCols.length} • Responses: ${data.length}`}</p></div></div>
          </div>
          {error && <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5"><div className="flex items-start gap-2"><AlertCircle className="w-5 h-5 text-destructive mt-0.5" /><p className="text-sm text-destructive">{error}</p></div></div>}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(2)}>Back to Config</Button>
            <Button onClick={runAnalysis} disabled={loading || !canRun} className="gap-2">{loading ? (<><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Analyzing...</>) : (<><Play className="w-4 h-4" />Run Analysis</>)}</Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderStep4Summary = () => {
    if (!results) return null;
    const { summary, results: r, key_insights } = results;
    const { engagement_index, question_stats, department_data, strengths_weaknesses } = r;
    const benchmark = parseFloat(benchmarkScore);
    
    const finding = `Employee engagement index is ${engagement_index.index.toFixed(1)}% (${engagement_index.category}). Analysis covers ${summary.questions_analyzed} questions from ${summary.response_count} respondents against a benchmark of ${benchmark}/${summary.scale_max}.`;
    
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Activity className="w-5 h-5 text-primary" />Analysis Results</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={`${engagement_index.index.toFixed(1)}%`} label="Engagement Index" icon={Award} highlight />
            <MetricCard value={engagement_index.avg_score.toFixed(2)} label={`Avg Score (/${summary.scale_max})`} icon={BarChart3} />
            <MetricCard value={summary.response_count} label="Respondents" icon={Users} />
            <MetricCard value={summary.questions_analyzed} label="Questions" icon={MessageSquare} />
          </div>
          <div className="flex justify-center"><EngagementBadge index={engagement_index.index} category={engagement_index.category} /></div>
          
          {strengths_weaknesses.strengths.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2"><ThumbsUp className="w-4 h-4 text-green-600" />Top Strengths</h4>
              <div className="grid md:grid-cols-2 gap-3">{strengths_weaknesses.strengths.slice(0, 4).map((q, idx) => (<QuestionCard key={idx} question={q} benchmark={benchmark} />))}</div>
            </div>
          )}
          
          {strengths_weaknesses.weaknesses.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2"><ThumbsDown className="w-4 h-4 text-red-600" />Areas for Improvement</h4>
              <div className="grid md:grid-cols-2 gap-3">{strengths_weaknesses.weaknesses.slice(0, 4).map((q, idx) => (<QuestionCard key={idx} question={q} benchmark={benchmark} />))}</div>
            </div>
          )}
          
          {department_data.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2"><Building className="w-4 h-4 text-primary" />Engagement by Department</h4>
              <div className="grid md:grid-cols-3 gap-3">
                {department_data.slice(0, 6).map((dept, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border ${dept.index_pct >= 70 ? 'border-primary/30 bg-primary/5' : dept.index_pct >= 50 ? 'border-amber-500/30 bg-amber-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{dept.department}</span>
                      <Badge variant="secondary">{dept.index_pct.toFixed(1)}%</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{dept.respondents} respondents • Avg: {dept.avg_score.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Key Insights</h4>
            {key_insights.map((insight, idx) => (
              <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${insight.status === "positive" ? "border-primary/30 bg-primary/5" : insight.status === "warning" ? "border-destructive/30 bg-destructive/5" : "border-border bg-muted/10"}`}>
                {insight.status === "positive" ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> : insight.status === "warning" ? <AlertCircle className="w-5 h-5 text-destructive shrink-0" /> : <Info className="w-5 h-5 text-muted-foreground shrink-0" />}
                <div><p className="font-medium text-sm">{insight.title}</p><p className="text-sm text-muted-foreground">{insight.description}</p></div>
              </div>
            ))}
          </div>
          
          <DetailParagraph title="Summary Interpretation" detail={`This employee engagement survey analysis evaluated ${summary.questions_analyzed} questions from ${summary.response_count} respondents.

■ Survey Analysis Overview

Employee engagement surveys measure how connected, motivated, and committed employees are to their organization and work.

• Engagement Index: Overall score normalized to 0-100%
• Favorable: Responses at 80%+ of scale maximum
• Benchmark: Target score for comparison (${benchmark}/${summary.scale_max})

■ Results Analysis

【Engagement Index】
• Overall Index: ${engagement_index.index.toFixed(1)}%
• Category: ${engagement_index.category}
• Average Score: ${engagement_index.avg_score.toFixed(2)} / ${summary.scale_max}

【Response Distribution】
• Total Responses: ${summary.response_count}
• Questions Analyzed: ${summary.questions_analyzed}
• Total Data Points: ${engagement_index.total_responses}

【Top Performing Areas】
${strengths_weaknesses.strengths.slice(0, 3).map(s => `• ${s.question}: ${s.mean.toFixed(2)} (${s.favorable_pct.toFixed(0)}% favorable)`).join('\n')}

【Areas Needing Attention】
${strengths_weaknesses.weaknesses.slice(0, 3).map(w => `• ${w.question}: ${w.mean.toFixed(2)} (${w.unfavorable} unfavorable)`).join('\n')}

■ Quality Assessment
${engagement_index.index >= 70 ? '✓ Strong engagement levels' : engagement_index.index >= 50 ? '△ Moderate engagement - room for improvement' : '✗ Low engagement - requires immediate attention'}
${summary.response_count >= 50 ? '✓ Adequate sample size for reliable analysis' : '△ Consider increasing response rate'}`} />
          <div className="flex justify-end pt-4"><Button onClick={() => setCurrentStep(5)} className="gap-2">Understand Results<ArrowRight className="w-4 h-4" /></Button></div>
        </CardContent>
      </Card>
    );
  };

  const renderStep5Why = () => {
    if (!results) return null;
    const { results: r, summary } = results;
    const { engagement_index, question_stats, department_data, test_results } = r;
    const benchmark = parseFloat(benchmarkScore);
    
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><HelpCircle className="w-5 h-5 text-primary" />Understanding the Results</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding="Employee engagement surveys provide valuable insights into workforce sentiment, organizational health, and areas requiring attention. Understanding these metrics helps drive meaningful improvements in employee experience." />
          <div className="space-y-3">
            <h4 className="font-medium text-sm">How Survey Analysis Works</h4>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { num: 1, title: "Response Collection", content: "Survey responses are gathered using Likert scales (1-5 or 1-7). Each question measures a specific aspect of engagement or satisfaction." },
                { num: 2, title: "Index Calculation", content: "The engagement index normalizes scores to a 0-100% scale. Higher scores indicate stronger engagement and positive sentiment." },
                { num: 3, title: "Favorable Analysis", content: "Responses are categorized as favorable (top 20%), neutral (middle), or unfavorable (bottom 40%) to identify sentiment distribution." },
                { num: 4, title: "Benchmark Comparison", content: "Statistical tests compare each question against the benchmark to identify significant strengths and gaps." },
              ].map((exp) => (
                <div key={exp.num} className="p-4 rounded-lg border border-border bg-muted/10">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">{exp.num}</div>
                    <div><p className="font-medium text-sm">{exp.title}</p><p className="text-xs text-muted-foreground mt-1 leading-relaxed">{exp.content}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Separator />
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Question-by-Question Analysis</h4>
            <div className="space-y-4">
              {question_stats.slice(0, 6).map((q, idx) => {
                const testResult = test_results[q.question];
                return (
                  <div key={idx} className={`p-4 rounded-lg border ${q.mean >= benchmark ? 'border-primary/30 bg-primary/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{q.question}</span>
                      <Badge variant={q.mean >= benchmark ? "default" : "secondary"}>{q.mean.toFixed(2)}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {q.mean >= benchmark 
                        ? `This area scores above benchmark (${benchmark}). ${q.favorable_pct.toFixed(0)}% favorable responses indicate strong performance.`
                        : `This area scores below benchmark (${benchmark}). ${q.unfavorable} unfavorable responses suggest room for improvement.`
                      }
                      {testResult?.significant && ` The difference is statistically significant (p=${testResult.p_value.toFixed(4)}).`}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
          
          {department_data.length > 0 && (<><Separator /><div className="space-y-3"><h4 className="font-medium text-sm">Department Comparison</h4><div className="space-y-3">{department_data.map((dept, idx) => (<div key={idx} className={`p-4 rounded-lg border ${dept.index_pct >= 70 ? 'border-primary/30 bg-primary/5' : dept.index_pct >= 50 ? 'border-amber-500/30 bg-amber-500/5' : 'border-red-500/30 bg-red-500/5'}`}><div className="flex items-center justify-between mb-2"><span className="font-medium">{dept.department}</span><Badge variant={dept.index_pct >= 70 ? "default" : "secondary"}>{dept.index_pct.toFixed(1)}%</Badge></div><p className="text-xs text-muted-foreground">{dept.index_pct >= 70 ? 'High engagement - maintain current practices and share best practices with other teams.' : dept.index_pct >= 50 ? 'Moderate engagement - identify specific pain points and develop targeted improvements.' : 'Low engagement - prioritize immediate investigation and intervention.'}</p></div>))}</div></div></>)}
          
          <DetailParagraph title="Strategic Recommendations" detail={`Based on the survey analysis, here are recommendations for improving employee engagement.

■ 1. Overall Engagement Health

【Current State】
• Engagement Index: ${engagement_index.index.toFixed(1)}%
• Category: ${engagement_index.category}
${engagement_index.index >= 70 ? '• Status: Strong engagement foundation' : engagement_index.index >= 50 ? '• Status: Moderate engagement with improvement opportunities' : '• Status: Critical attention required'}

■ 2. Priority Actions by Area

【Strengths to Leverage】
${r.strengths_weaknesses.strengths.slice(0, 3).map(s => `• ${s.question}: Build on this strength, share best practices`).join('\n')}

【Areas Requiring Attention】
${r.strengths_weaknesses.weaknesses.slice(0, 3).map(w => `• ${w.question}: Investigate root causes, develop action plan`).join('\n')}

■ 3. Department-Specific Recommendations

${department_data.length > 0 ? department_data.slice(0, 3).map(d => `【${d.department}】 (${d.index_pct.toFixed(1)}%)
${d.index_pct >= 70 ? '• Continue current initiatives, mentor other departments' : d.index_pct >= 50 ? '• Focus groups to identify specific issues' : '• Immediate management intervention needed'}`).join('\n\n') : 'No department data available.'}

■ 4. Action Planning

【Immediate (0-30 days)】
• Share results with leadership team
• Identify quick wins from top-performing areas
• Schedule focus groups for low-scoring areas

【Short-term (30-90 days)】
• Develop action plans for priority areas
• Implement targeted improvements
• Establish regular pulse surveys

【Long-term (90+ days)】
• Track progress against baseline
• Build engagement into performance metrics
• Create feedback loops for continuous improvement`} />
          <div className="flex justify-between pt-4"><Button variant="outline" onClick={() => setCurrentStep(4)}>Back to Summary</Button><Button onClick={() => setCurrentStep(6)} className="gap-2">View Full Report<ArrowRight className="w-4 h-4" /></Button></div>
        </CardContent>
      </Card>
    );
  };

  const renderStep6Report = () => {
    if (!results) return null;
    const { summary, results: r, key_insights, visualizations } = results;
    const { engagement_index, question_stats, department_data } = r;
    
    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b border-border"><h1 className="text-xl font-semibold">Employee Engagement Survey Report</h1><p className="text-sm text-muted-foreground mt-1">{ANALYSIS_TYPES.find(t => t.value === analysisType)?.label} | {new Date().toLocaleDateString()}</p></div>
        
        <Card><CardHeader className="pb-3"><CardTitle className="text-base">Executive Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MetricCard value={`${engagement_index.index.toFixed(1)}%`} label="Engagement Index" highlight />
              <MetricCard value={summary.response_count} label="Respondents" />
              <MetricCard value={summary.questions_analyzed} label="Questions" />
              <MetricCard value={`${summary.analyze_time_ms}ms`} label="Analysis Time" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">Analyzed {summary.questions_analyzed} survey questions from {summary.response_count} respondents. Overall engagement index is {engagement_index.index.toFixed(1)}% ({engagement_index.category}). Average score: {engagement_index.avg_score.toFixed(2)}/{summary.scale_max}.</p>
          </CardContent>
        </Card>
        
        <Card><CardHeader className="pb-3"><CardTitle className="text-base">Key Insights</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {key_insights.map((ins, i) => (<div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${ins.status === "warning" ? "border-destructive/30 bg-destructive/5" : ins.status === "positive" ? "border-primary/30 bg-primary/5" : "border-border bg-muted/10"}`}>{ins.status === "warning" ? <AlertCircle className="w-4 h-4 text-destructive mt-0.5" /> : ins.status === "positive" ? <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" /> : <Info className="w-4 h-4 text-muted-foreground mt-0.5" />}<div><p className="font-medium text-sm">{ins.title}</p><p className="text-sm text-muted-foreground">{ins.description}</p></div></div>))}
          </CardContent>
        </Card>
        
        {visualizations && Object.keys(visualizations).some(k => visualizations[k as keyof typeof visualizations]) && (
          <Card><CardHeader className="pb-3"><CardTitle className="text-base">Visualizations</CardTitle></CardHeader>
            <CardContent>
              <Tabs defaultValue={Object.keys(visualizations).find(k => visualizations[k as keyof typeof visualizations])}>
                <TabsList className="mb-4 flex-wrap">
                  {visualizations.engagement_overview && <TabsTrigger value="engagement_overview" className="text-xs">Overview</TabsTrigger>}
                  {visualizations.engagement_gauge && <TabsTrigger value="engagement_gauge" className="text-xs">Index</TabsTrigger>}
                  {visualizations.favorable_distribution && <TabsTrigger value="favorable_distribution" className="text-xs">Distribution</TabsTrigger>}
                  {visualizations.benchmark_comparison && <TabsTrigger value="benchmark_comparison" className="text-xs">vs Benchmark</TabsTrigger>}
                  {visualizations.department_comparison && <TabsTrigger value="department_comparison" className="text-xs">Departments</TabsTrigger>}
                </TabsList>
                {Object.entries(visualizations).map(([key, value]) => value && (<TabsContent key={key} value={key}><div className="relative border border-border rounded-lg overflow-hidden"><img src={`data:image/png;base64,${value}`} alt={key} className="w-full" /><Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => handleDownloadPNG(key)}><Download className="w-4 h-4" /></Button></div></TabsContent>))}
              </Tabs>
            </CardContent>
          </Card>
        )}
        
        <Card><CardHeader className="pb-3"><CardTitle className="text-base">Question Details</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Question</TableHead><TableHead className="text-right">Mean</TableHead><TableHead className="text-right">Favorable</TableHead><TableHead className="text-right">Neutral</TableHead><TableHead className="text-right">Unfavorable</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {question_stats.map((q) => (<TableRow key={q.question}><TableCell className="font-medium">{q.question}</TableCell><TableCell className="text-right">{q.mean.toFixed(2)}</TableCell><TableCell className="text-right text-green-600">{q.favorable} ({q.favorable_pct.toFixed(0)}%)</TableCell><TableCell className="text-right text-amber-600">{q.neutral}</TableCell><TableCell className="text-right text-red-600">{q.unfavorable}</TableCell><TableCell className="text-right"><Badge variant={q.mean >= parseFloat(benchmarkScore) ? "default" : "secondary"} className={`text-xs ${q.mean >= parseFloat(benchmarkScore) ? 'bg-green-500' : 'bg-amber-500'}`}>{q.mean >= parseFloat(benchmarkScore) ? "Above" : "Below"}</Badge></TableCell></TableRow>))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        {department_data.length > 0 && (
          <Card><CardHeader className="pb-3"><CardTitle className="text-base">Department Analysis</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Department</TableHead><TableHead className="text-right">Respondents</TableHead><TableHead className="text-right">Avg Score</TableHead><TableHead className="text-right">Index</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {department_data.map((d) => (<TableRow key={d.department}><TableCell className="font-medium">{d.department}</TableCell><TableCell className="text-right">{d.respondents}</TableCell><TableCell className="text-right">{d.avg_score.toFixed(2)}</TableCell><TableCell className="text-right">{d.index_pct.toFixed(1)}%</TableCell><TableCell className="text-right"><Badge variant={d.index_pct >= 70 ? "default" : "secondary"} className={`text-xs ${d.index_pct >= 70 ? 'bg-green-500' : d.index_pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}>{d.index_pct >= 70 ? "High" : d.index_pct >= 50 ? "Moderate" : "Low"}</Badge></TableCell></TableRow>))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        
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

        <Card><CardHeader className="pb-3"><CardTitle className="text-base">Export</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleDownloadCSV} className="gap-2"><FileSpreadsheet className="w-4 h-4" />CSV (Results)</Button>
              {Object.entries(visualizations || {}).map(([key, value]) => value && (<Button key={key} variant="outline" onClick={() => handleDownloadPNG(key)} className="gap-2"><Download className="w-4 h-4" />{key.replace(/_/g, ' ')}</Button>))}
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-between"><Button variant="outline" onClick={() => setCurrentStep(5)}>Back</Button><Button variant="outline" onClick={() => setCurrentStep(1)}>New Analysis</Button></div>
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
      {currentStep > 1 && (<ProgressBar currentStep={currentStep} hasResults={!!results} onStepClick={setCurrentStep} />)}
      {currentStep > 1 && data.length > 0 && (<DataPreview data={data} columns={columns} />)}
      {currentStep === 1 && <IntroPage onLoadSample={handleLoadSample} onFileUpload={handleFileUpload} />}
      {currentStep === 2 && renderStep2Config()}
      {currentStep === 3 && renderStep3Validation()}
      {currentStep === 4 && renderStep4Summary()}
      {currentStep === 5 && renderStep5Why()}
      {currentStep === 6 && renderStep6Report()}
    </div>
  );
}