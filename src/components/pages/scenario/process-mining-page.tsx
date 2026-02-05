"use client";

import React, { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle, Info, BookOpen,
  FileText, Download, Settings, Activity, Workflow, GitBranch, Clock,
  TrendingUp, Users, Target, BookMarked, AlertTriangle, Zap, BarChart3, ChevronRight, Shield,
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "https://statistica-api-dm6treznqq-du.a.run.app";

interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }

const generateSampleData = (): DataRow[] => {
  const data: DataRow[] = [];
  const activities = ['Submit Application', 'Initial Review', 'Document Check', 'Approval Review', 'Final Approval', 'Complete'];
  
  for (let i = 1; i <= 50; i++) {
    let timestamp = new Date('2024-01-01');
    const numActivities = 4 + Math.floor(Math.random() * 3);
    
    for (let j = 0; j < numActivities; j++) {
      timestamp = new Date(timestamp.getTime() + (Math.random() * 3600000 * 24));
      data.push({
        case_id: `Case_${i}`,
        activity: activities[j],
        timestamp: timestamp.toISOString(),
        resource: `User_${Math.floor(Math.random() * 5) + 1}`
      });
    }
  }
  return data;
};

const MetricCard: React.FC<{ value: string | number; label: string; icon?: any; highlight?: boolean; status?: string }> = 
  ({ value, label, icon: Icon, highlight, status }) => (
  <div className={`text-center p-4 rounded-lg border ${
    highlight ? 'border-primary/30 bg-primary/5' : 
    status === 'green' ? 'border-primary/30 bg-primary/5' :
    status === 'yellow' ? 'border-border bg-muted/20' :
    status === 'red' ? 'border-destructive/30 bg-destructive/5' :
    'border-border bg-muted/20'
  }`}>
    {Icon && <Icon className="w-5 h-5 mx-auto mb-2 text-primary" />}
    <p className={`text-2xl font-semibold ${highlight ? 'text-primary' : ''}`}>{value}</p>
    <p className="text-xs text-muted-foreground mt-1">{label}</p>
  </div>
);

const FindingBox: React.FC<{ finding: string }> = ({ finding }) => (
  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Key Finding</p>
    <p className="font-medium text-foreground">{finding}</p>
  </div>
);

const DetailParagraph: React.FC<{ title: string; detail: string }> = ({ title, detail }) => (
  <Card className="border-border bg-muted/10">
    <CardContent className="pt-4">
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-sm mb-2">{title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{detail}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const DataPreview: React.FC<{ data: DataRow[] }> = ({ data }) => {
  const [isOpen, setIsOpen] = useState(false);
  if (!data || data.length === 0) return null;
  const preview = data.slice(0, 5);
  const columns = Object.keys(preview[0]);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full p-3 bg-muted/50 hover:bg-muted flex items-center justify-between text-sm font-medium">
        <span>Data Preview ({data.length} rows)</span>
        <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      {isOpen && (
        <div className="overflow-x-auto"><Table><TableHeader><TableRow>{columns.map(col => <TableHead key={col} className="text-xs">{col}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{preview.map((row, i) => <TableRow key={i}>{columns.map(col => <TableCell key={col} className="text-xs">{String(row[col] ?? '')}</TableCell>)}</TableRow>)}</TableBody></Table></div>
      )}
    </div>
  );
};

const ProgressBar: React.FC<{ currentStep: number; totalSteps: number; labels: string[]; hasResults?: boolean }> = 
  ({ currentStep, totalSteps, labels, hasResults }) => (
  <div className="flex items-center justify-center gap-0.5 mb-8 flex-wrap">
    {labels.map((label, idx) => {
      const stepNum = idx + 1;
      const isCompleted = stepNum < currentStep;
      const isCurrent = stepNum === currentStep;
      const isAccessible = stepNum <= 3 || hasResults;
      
      return (
        <React.Fragment key={stepNum}>
          <button
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
            {label}
          </button>
          {idx < labels.length - 1 && (
            <ChevronRight className="w-3 h-3 text-muted-foreground/30" />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

const ProcessMiningGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><BookMarked className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">Process Mining Guide</h2></div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        <div className="p-6 space-y-6">
          <div><h3 className="font-semibold text-primary mb-3 flex items-center gap-2"><Target className="w-4 h-4" />What is Process Mining?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">Process Mining extracts knowledge from event logs to discover, monitor, and improve business processes. It analyzes event data to automatically create process models, identify bottlenecks, detect deviations, and measure performance metrics.</p>
          </div>
          <Separator />
          <div><h3 className="font-semibold text-primary mb-3 flex items-center gap-2"><Activity className="w-4 h-4" />Discovery Algorithms</h3>
            <div className="space-y-4">
              {[
                { name: 'Heuristics Miner', desc: 'Flexible algorithm that handles noisy event logs well. Uses frequency and dependency metrics to discover process models. Best for real-world logs with exceptions and variations.', use: 'Recommended for most use cases' },
                { name: 'Inductive Miner', desc: 'Guarantees sound process models (no deadlocks). Uses recursive partitioning to discover hierarchical process structures. Excellent at handling loops and parallel activities.', use: 'Best for formal process analysis' },
                { name: 'Alpha Miner', desc: 'Basic algorithm for simple processes. Good for learning and understanding process discovery fundamentals. Works well with clean, structured logs.', use: 'Educational or simple processes' },
                { name: 'DFG (Directly-Follows Graph)', desc: 'Simple and fast visualization showing which activities follow which. Easy to understand but doesn\'t capture complex patterns like loops or parallelism.', use: 'Quick overview and exploration' }
              ].map(({ name, desc, use }, i) => (
                <div key={i} className="pl-4 border-l-2 border-primary/30">
                  <p className="font-medium text-sm">{name}</p>
                  <p className="text-sm text-muted-foreground mt-1">{desc}</p>
                  <p className="text-xs text-primary mt-1"><strong>Best for:</strong> {use}</p>
                </div>
              ))}
            </div>
          </div>
          <Separator />
          <div><h3 className="font-semibold text-primary mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4" />Key Metrics</h3>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                { title: 'Case Duration', desc: 'Time from start to end of process. Identifies slow cases and overall process efficiency.' },
                { title: 'Activity Frequency', desc: 'How often each activity occurs. Shows workload distribution and common paths.' },
                { title: 'Bottlenecks', desc: 'Activities or transitions with long waiting times. Critical for process improvement.' },
                { title: 'Variants', desc: 'Different paths through the process. High variant count indicates complexity or lack of standardization.' },
                { title: 'Resource Utilization', desc: 'Which resources (people, systems) perform which activities and their performance.' },
                { title: 'Conformance', desc: 'How closely actual process follows desired or expected process model.' }
              ].map(({ title, desc }, i) => (
                <div key={i} className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">{title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                </div>
              ))}
            </div>
          </div>
          <Separator />
          <div><h3 className="font-semibold text-primary mb-3 flex items-center gap-2"><Zap className="w-4 h-4" />Use Cases</h3>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                { title: 'Process Discovery', items: ['Map actual processes', 'Document as-is state', 'Understand complexity', 'Identify patterns'] },
                { title: 'Performance Analysis', items: ['Find bottlenecks', 'Measure cycle times', 'Track SLA compliance', 'Optimize throughput'] },
                { title: 'Compliance Checking', items: ['Detect violations', 'Audit process adherence', 'Ensure governance', 'Risk management'] },
                { title: 'Process Improvement', items: ['Identify waste', 'Reduce variation', 'Streamline steps', 'Automation opportunities'] }
              ].map(({ title, items }, i) => (
                <div key={i} className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">{title}</p>
                  <ul className="text-xs text-muted-foreground space-y-1">{items.map((item, j) => <li key={j}>• {item}</li>)}</ul>
                </div>
              ))}
            </div>
          </div>
          <Separator />
          <div><h3 className="font-semibold text-primary mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Data Requirements & Best Practices</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• <strong>Minimum Data:</strong> At least 10 cases with multiple events each</p>
              <p>• <strong>Required Fields:</strong> Case ID (unique identifier), Activity (event name), Timestamp (when event occurred)</p>
              <p>• <strong>Optional Fields:</strong> Resource (who/what performed), Cost, Additional attributes</p>
              <p>• <strong>Data Quality:</strong> Clean timestamps, consistent activity names, complete cases</p>
              <p>• <strong>Process Scope:</strong> Focus on end-to-end processes, not isolated activities</p>
              <p>• <strong>Time Period:</strong> Representative sample covering typical process variations</p>
            </div>
          </div>
          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground leading-relaxed"><strong className="text-primary">Note:</strong> Process mining reveals the actual process, which may differ significantly from documented procedures. Use insights to drive continuous improvement, not as criticism of past practices. Focus on systematic issues, not individual performance.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ProcessMiningPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  
  const [caseIdCol, setCaseIdCol] = useState<string>("");
  const [activityCol, setActivityCol] = useState<string>("");
  const [timestampCol, setTimestampCol] = useState<string>("");
  const [algorithm, setAlgorithm] = useState<string>("heuristics");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    setColumns(Object.keys(sampleData[0]));
    setCaseIdCol("case_id");
    setActivityCol("activity");
    setTimestampCol("timestamp");
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

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const payload = { data, case_id_col: caseIdCol, activity_col: activityCol, timestamp_col: timestampCol, algorithm };
      const res = await fetch(`${FASTAPI_URL}/api/analysis/process-mining`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Analysis failed");
      }
      const result = await res.json();
      setResults(result);
      setCurrentStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Workflow className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">Process Mining Analysis</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Discover, analyze, and visualize business processes from event logs. Identify bottlenecks, variants, and optimization opportunities using advanced process mining algorithms.
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {[
          { icon: GitBranch, title: "Process Discovery", desc: "Automatically generate process models from event logs" },
          { icon: Clock, title: "Performance Analysis", desc: "Measure durations, identify bottlenecks" },
          { icon: TrendingUp, title: "Variant Analysis", desc: "Discover different process execution paths" },
          { icon: Users, title: "Resource Analysis", desc: "Analyze who performs which activities" }
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="p-5 rounded-lg border border-border bg-muted/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="font-medium text-sm mb-1">{title}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Info className="w-5 h-5 text-primary" />Data Requirements</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-primary mb-3">Required Columns</h4>
              <div className="space-y-2">
                {[
                  { icon: Target, text: 'Case ID: Unique identifier for each process instance' },
                  { icon: Activity, text: 'Activity: Name of the event/step in the process' },
                  { icon: Clock, text: 'Timestamp: When the activity occurred' }
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Icon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-primary mb-3">What You'll Get</h4>
              <div className="space-y-2">
                {[
                  'Process model visualization',
                  'Performance metrics & bottlenecks',
                  'Process variants analysis',
                  'Activity frequency distribution',
                  'Case duration statistics'
                ].map(text => (
                  <div key={text} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button onClick={handleLoadSample} className="gap-2 w-full sm:w-auto">
              <Activity className="w-4 h-4" />Load Sample Data
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2 w-full sm:w-auto">
              <Upload className="w-4 h-4" />Upload Your Data
            </Button>
            <Button variant="outline" onClick={() => setShowGuide(true)} className="gap-2 w-full sm:w-auto">
              <BookOpen className="w-4 h-4" />View Guide
            </Button>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
          </div>
        </CardContent>
      </Card>

      <ProcessMiningGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );

  const renderStep2 = () => (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Settings className="w-5 h-5 text-primary" />Configure Analysis</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <DataPreview data={data} />
        
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Case ID Column</Label>
            <Select value={caseIdCol} onValueChange={setCaseIdCol}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Unique identifier per case</p>
          </div>
          <div className="space-y-2">
            <Label>Activity Column</Label>
            <Select value={activityCol} onValueChange={setActivityCol}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Activity/event name</p>
          </div>
          <div className="space-y-2">
            <Label>Timestamp Column</Label>
            <Select value={timestampCol} onValueChange={setTimestampCol}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{columns.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Event timestamp</p>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <Label>Discovery Algorithm</Label>
          <div className="grid md:grid-cols-4 gap-3">
            {[
              { value: 'heuristics', title: 'Heuristics Miner', desc: 'Handles noise well', icon: Target },
              { value: 'inductive', title: 'Inductive Miner', desc: 'Sound models', icon: Shield },
              { value: 'alpha', title: 'Alpha Miner', desc: 'Basic discovery', icon: Activity },
              { value: 'dfg', title: 'DFG', desc: 'Direct follows', icon: GitBranch }
            ].map(({ value, title, desc, icon: Icon }) => (
              <div key={value} onClick={() => setAlgorithm(value)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  algorithm === value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}>
                <Icon className="w-5 h-5 text-primary mb-2" />
                <p className="font-semibold text-sm mb-1">{title}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
                {algorithm === value && <Badge variant="default" className="mt-2 text-xs">Selected</Badge>}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            <strong>Tip:</strong> Heuristics Miner is recommended for most real-world event logs as it handles noise and variations well.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => setCurrentStep(1)}>Back</Button>
          <Button onClick={() => setCurrentStep(3)} className="gap-2">Continue <ArrowRight className="w-4 h-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep3 = () => {
    const checks: ValidationCheck[] = [
      { name: "Case ID Column", passed: !!caseIdCol, message: caseIdCol || "Not selected" },
      { name: "Activity Column", passed: !!activityCol, message: activityCol || "Not selected" },
      { name: "Timestamp Column", passed: !!timestampCol, message: timestampCol || "Not selected" },
      { name: "Sufficient Events", passed: data.length >= 10, message: `${data.length} events (need ≥10)` }
    ];
    const canRun = checks.every(c => c.passed);

    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><CheckCircle2 className="w-5 h-5 text-primary" />Validation & Preview</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            {checks.map((check, idx) => (
              <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${
                check.passed ? 'border-border bg-muted/10' : 'border-destructive/30 bg-destructive/5'
              }`}>
                <div className="flex items-center gap-3">
                  {check.passed ? 
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> : 
                    <XCircle className="w-5 h-5 text-destructive shrink-0" />
                  }
                  <div>
                    <p className="font-medium text-sm">{check.name}</p>
                    <p className="text-xs text-muted-foreground">{check.message}</p>
                  </div>
                </div>
                {check.passed && <CheckCircle2 className="w-5 h-5 text-primary" />}
              </div>
            ))}
          </div>

          {canRun && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm mb-1">Ready to Analyze</p>
                    <p className="text-xs text-muted-foreground">
                      Configuration validated. Click "Run Analysis" to discover process patterns using {algorithm} algorithm.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {error && (
            <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm text-destructive mb-1">Analysis Error</p>
                  <p className="text-xs text-destructive">{error}</p>
                </div>
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
                  Run Analysis
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderStep4 = () => {
    if (!results) return null;
    const { summary, results: r, key_insights } = results;
    const metrics = r.metrics;

    const finding = `Analyzed ${summary.n_cases} cases with ${summary.n_events} events across ${summary.n_activities} distinct activities. Discovered ${summary.n_variants} process variants with average case duration of ${summary.avg_duration_hours} hours using ${algorithm} algorithm.`;

    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Workflow className="w-5 h-5 text-primary" />Process Mining Results</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <FindingBox finding={finding} />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={summary.n_cases} label="Total Cases" icon={Users} highlight />
            <MetricCard value={summary.n_events} label="Total Events" icon={Activity} />
            <MetricCard value={summary.n_activities} label="Activities" icon={GitBranch} />
            <MetricCard value={summary.n_variants} label="Variants" icon={TrendingUp} />
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Performance Metrics</h4>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="p-4 rounded-lg border border-border bg-muted/10">
                <p className="text-xs text-muted-foreground mb-1">Average Duration</p>
                <p className="text-2xl font-semibold">{(metrics.avg_case_duration / 3600).toFixed(1)}h</p>
                <p className="text-xs text-muted-foreground mt-1">Per case</p>
              </div>
              <div className="p-4 rounded-lg border border-border bg-muted/10">
                <p className="text-xs text-muted-foreground mb-1">Median Duration</p>
                <p className="text-2xl font-semibold">{(metrics.median_case_duration / 3600).toFixed(1)}h</p>
                <p className="text-xs text-muted-foreground mt-1">Typical case</p>
              </div>
              <div className="p-4 rounded-lg border border-border bg-muted/10">
                <p className="text-xs text-muted-foreground mb-1">Max Duration</p>
                <p className="text-2xl font-semibold">{(metrics.max_case_duration / 3600).toFixed(1)}h</p>
                <p className="text-xs text-muted-foreground mt-1">Longest case</p>
              </div>
            </div>
          </div>

          {r.variants && r.variants.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Top Process Variants</h4>
              <p className="text-xs text-muted-foreground">Most common execution paths through the process</p>
              {r.variants.slice(0, 5).map((v: any) => (
                <div key={v.rank} className="p-4 rounded-lg border border-border bg-muted/10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">#{v.rank}</Badge>
                      <Badge variant="secondary">{v.percentage}% of cases</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{v.frequency} cases</span>
                  </div>
                  <p className="text-sm font-mono text-muted-foreground leading-relaxed">{v.variant}</p>
                </div>
              ))}
            </div>
          )}

          {key_insights && key_insights.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Key Insights</h4>
              {key_insights.map((ins: any, i: number) => (
                <div key={i} className={`flex items-start gap-3 p-4 rounded-lg border ${
                  ins.status === "positive" ? "border-primary/30 bg-primary/5" :
                  ins.status === "warning" ? "border-border bg-muted/10" :
                  "border-border bg-muted/10"
                }`}>
                  {ins.status === "positive" ? 
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" /> :
                    ins.status === "warning" ?
                    <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" /> :
                    <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  }
                  <div>
                    <p className="font-medium text-sm mb-1">{ins.title}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{ins.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <DetailParagraph
            title="Process Complexity Analysis"
            detail={`■ Variant Diversity
${summary.n_variants} unique process paths discovered from ${summary.n_cases} cases (${(summary.n_variants / summary.n_cases * 100).toFixed(1)}% uniqueness).
${summary.n_variants > summary.n_cases * 0.5 ? 'High variant count indicates significant process flexibility or lack of standardization.' : 'Moderate variant count suggests balanced standardization with some flexibility.'}

■ Performance Characteristics
Average case duration: ${summary.avg_duration_hours} hours
${summary.avg_duration_hours > 24 ? 'Extended durations warrant investigation for optimization opportunities.' : 'Duration within typical range for this process type.'}

■ Next Steps
• Review visualizations to understand process flow
• Analyze bottlenecks for improvement opportunities
• Compare variants to identify best practices
• Consider automation for repetitive patterns`}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowGuide(true)} className="gap-2">
              <BookOpen className="w-4 h-4" />View Guide
            </Button>
            <Button onClick={() => setCurrentStep(5)} className="gap-2">
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const handleDownloadPNG = (key: string) => {
    if (!results?.visualizations?.[key]) return;
    const a = document.createElement("a");
    a.href = `data:image/png;base64,${results.visualizations[key]}`;
    a.download = `process_mining_${key}.png`;
    a.click();
  };

  const renderStep5 = () => (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><BookOpen className="w-5 h-5 text-primary" />Process Mining Methodology</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Process Mining extracts knowledge from event logs recorded by information systems. The {algorithm} algorithm was used to discover the process model, analyze performance, and identify improvement opportunities.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium text-sm">Analysis Pipeline</h4>
          <div className="space-y-3">
            {[
              { num: 1, title: 'Event Log Preparation', desc: 'Convert raw data into standardized event log format with case IDs, activities, and timestamps' },
              { num: 2, title: 'Process Discovery', desc: `Applied ${algorithm} algorithm to automatically discover process model from event sequences` },
              { num: 3, title: 'Performance Analysis', desc: 'Calculate case durations, activity frequencies, and throughput metrics' },
              { num: 4, title: 'Variant Analysis', desc: 'Identify different execution paths and their frequencies' },
              { num: 5, title: 'Bottleneck Detection', desc: 'Find transitions with longest waiting times using statistical analysis' }
            ].map(({ num, title, desc }) => (
              <div key={num} className="flex items-start gap-3 p-4 rounded-lg border border-border bg-muted/10">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">
                  {num}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm mb-1">{title}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="font-medium text-sm">Discovery Algorithms Explained</h4>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { title: 'Heuristics Miner', desc: 'Uses frequency and dependency metrics. Handles noise well. Best for real-world logs with exceptions.' },
              { title: 'Inductive Miner', desc: 'Guarantees sound models without deadlocks. Excellent for loops and parallel activities.' },
              { title: 'Alpha Miner', desc: 'Basic algorithm for simple, clean processes. Good for learning and understanding.' },
              { title: 'DFG', desc: 'Directly-Follows Graph. Simple visualization of activity sequences. Fast and intuitive.' }
            ].map(({ title, desc }) => (
              <div key={title} className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">{title}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="font-medium text-sm">Key Metrics Explained</h4>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { title: 'Cases', desc: 'Unique process instances (e.g., orders, applications, tickets)' },
              { title: 'Events', desc: 'Individual activities or steps within each case' },
              { title: 'Activities', desc: 'Distinct types of events that occur in the process' },
              { title: 'Variants', desc: 'Different execution paths through the process' },
              { title: 'Duration', desc: 'Time from first to last event in each case' },
              { title: 'Bottlenecks', desc: 'Transitions with longest average waiting times' }
            ].map(({ title, desc }) => (
              <div key={title} className="p-3 rounded-lg border border-border bg-muted/10">
                <p className="font-medium text-sm mb-1">{title}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <DetailParagraph
          title="Interpretation Guidelines"
          detail={`■ Process Variants
High variant count (>50% of cases unique): Indicates flexible or ad-hoc process. May need standardization.
Low variant count (<10% unique): Indicates standardized process. Look for optimization within standard path.

■ Bottlenecks
Focus on transitions with:
• High frequency AND long duration (affects many cases)
• Critical path activities (block downstream work)
• Resource constraints (limited capacity)

■ Performance Metrics
Compare average vs median duration:
• Large difference indicates outliers or exceptions
• Median more representative of typical performance
• Analyze outliers separately for special handling

■ Continuous Improvement
1. Share findings with process owners
2. Prioritize improvements by impact
3. Test changes with pilot cases
4. Monitor metrics after improvements
5. Re-run analysis quarterly`}
        />

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => setCurrentStep(4)}>Back to Summary</Button>
          <Button onClick={() => setCurrentStep(6)} className="gap-2">
            View Full Report <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep6 = () => {
    if (!results) return null;
    const { visualizations, results: r, summary } = results;

    const validVisualizations = Object.entries(visualizations || {}).filter(([, value]) => value);
    const firstKey = validVisualizations.length > 0 ? validVisualizations[0][0] : '';

    return (
      <div className="space-y-6">
        <div className="text-center py-4 border-b border-border">
          <h1 className="text-xl font-semibold">Process Mining Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {algorithm.charAt(0).toUpperCase() + algorithm.slice(1)} Algorithm | {new Date().toLocaleDateString()}
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Executive Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <MetricCard value={summary.n_cases} label="Cases" icon={Users} />
              <MetricCard value={summary.n_events} label="Events" icon={Activity} />
              <MetricCard value={summary.n_activities} label="Activities" icon={GitBranch} />
              <MetricCard value={summary.n_variants} label="Variants" icon={TrendingUp} />
              <MetricCard value={`${summary.avg_duration_hours}h`} label="Avg Duration" icon={Clock} />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Process mining analysis of {summary.n_cases} cases with {summary.n_events} events revealed {summary.n_variants} distinct process variants. 
              Average case duration is {summary.avg_duration_hours} hours across {summary.n_activities} different activities.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="w-5 h-5 text-primary" />Process Visualizations</CardTitle></CardHeader>
          <CardContent>
            {validVisualizations.length > 0 ? (
              <Tabs defaultValue={firstKey} className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  {validVisualizations.map(([key]) => (
                    <TabsTrigger key={key} value={key} className="text-xs">
                      {key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {validVisualizations.map(([key, value]) => (
                  <TabsContent key={key} value={key} className="space-y-4">
                    <div className="relative border border-border rounded-lg overflow-hidden">
                      <img src={`data:image/png;base64,${value as string}`} alt={key} className="w-full" />
                      <Button size="sm" variant="secondary" className="absolute top-2 right-2 gap-2" onClick={() => handleDownloadPNG(key)}>
                        <Download className="w-4 h-4" />Download
                      </Button>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No visualizations available</p>
            )}
          </CardContent>
        </Card>

        {r.bottlenecks && r.bottlenecks.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Clock className="w-5 h-5 text-primary" />Bottleneck Analysis</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Transitions with longest average waiting times. Focus improvement efforts here for maximum impact.
              </p>
              <div className="space-y-3">
                {r.bottlenecks.slice(0, 5).map((b: any, i: number) => (
                  <div key={i} className="p-4 rounded-lg border border-border bg-muted/10">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm">{b.transition}</p>
                      <Badge variant="secondary">{b.frequency} occurrences</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Average Wait Time</p>
                        <p className="font-semibold">{(b.avg_duration / 3600).toFixed(1)} hours</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Median Wait Time</p>
                        <p className="font-semibold">{(b.median_duration / 3600).toFixed(1)} hours</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Export Options</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {validVisualizations.map(([key]) => (
                <Button key={key} variant="outline" onClick={() => handleDownloadPNG(key)} className="gap-2">
                  <Download className="w-4 h-4" />
                  {key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setCurrentStep(5)}>Back to Methodology</Button>
          <Button variant="outline" onClick={() => setCurrentStep(1)}>New Analysis</Button>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {currentStep > 1 && (
        <ProgressBar 
          currentStep={currentStep} 
          totalSteps={6} 
          labels={['Intro', 'Config', 'Validation', 'Summary', 'Methodology', 'Report']} 
          hasResults={!!results}
        />
      )}
      
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
      {currentStep === 4 && renderStep4()}
      {currentStep === 5 && renderStep5()}
      {currentStep === 6 && renderStep6()}
    </div>
  );
}