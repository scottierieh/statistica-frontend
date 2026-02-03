"use client";

import React, { useState, useCallback, useRef } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Layers, Upload, ArrowRight, CheckCircle2, XCircle, AlertCircle, Star,
  Shield, Info, HelpCircle, FileCode, FileSpreadsheet, FileText, FileImage,
  Download, TrendingUp, Settings, Activity, AlertTriangle, ChevronRight,
  Target, BarChart3, Circle, Shuffle,
} from "lucide-react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "https://statistica-api-995604437166.asia-northeast3.run.app";

interface DataRow { [key: string]: string | number | null; }
interface ValidationCheck { name: string; passed: boolean; message: string; }
interface KeyInsight { title: string; description: string; status: "positive" | "neutral" | "warning"; }

interface ComponentInfo {
  id: number;
  weight: number;
  mean: number[];
  n_samples: number;
  percentage: number;
}

interface GMMResult {
  success: boolean;
  gmm_results: {
    n_components: number;
    covariance_type: string;
    converged: boolean;
    n_iter: number;
    bic: number;
    aic: number;
    log_likelihood: number;
    silhouette_score: number | null;
    labels: number[];
    probabilities: number[][];
    components: ComponentInfo[];
    weights: number[];
    means: number[][];
  };
  selection_results?: {
    optimal_bic: number;
    optimal_aic: number;
    optimal_silhouette: number;
    recommended: number;
    bic_scores: number[];
    aic_scores: number[];
    silhouette_scores: number[];
    n_range: number[];
  };
  cluster_assignments: Array<{ index: number; cluster: number; probability: number }>;
  visualizations: {
    cluster_scatter?: string;
    component_weights?: string;
    density_plot?: string;
    bic_aic_chart?: string;
    probability_heatmap?: string;
    silhouette_plot?: string;
  };
  key_insights: KeyInsight[];
  summary: {
    n_components: number;
    silhouette_score: number | null;
    bic: number;
    aic: number;
    converged: boolean;
    total_samples: number;
  };
  feature_cols: string[];
}

const COVARIANCE_TYPES = [
  { value: "full", label: "Full", desc: "Each component has its own covariance matrix" },
  { value: "tied", label: "Tied", desc: "All components share the same covariance" },
  { value: "diag", label: "Diagonal", desc: "Diagonal covariance (features independent)" },
  { value: "spherical", label: "Spherical", desc: "Single variance per component" },
];

const generateSampleData = (): DataRow[] => {
  const data: DataRow[] = [];
  // Generate 3 clusters
  const clusters = [
    { mean: [25, 50], std: [3, 5], n: 80 },
    { mean: [45, 30], std: [4, 4], n: 60 },
    { mean: [35, 70], std: [5, 6], n: 60 },
  ];
  
  let id = 1;
  clusters.forEach((cluster, clusterIdx) => {
    for (let i = 0; i < cluster.n; i++) {
      data.push({
        id: id++,
        feature1: parseFloat((cluster.mean[0] + (Math.random() - 0.5) * cluster.std[0] * 2).toFixed(2)),
        feature2: parseFloat((cluster.mean[1] + (Math.random() - 0.5) * cluster.std[1] * 2).toFixed(2)),
        feature3: parseFloat((Math.random() * 100).toFixed(2)),
        true_cluster: `Group_${String.fromCharCode(65 + clusterIdx)}`,
      });
    }
  });
  
  // Shuffle
  return data.sort(() => Math.random() - 0.5);
};

const IntroPage: React.FC<{ onLoadSample: () => void; onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({ onLoadSample, onFileUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
          <Layers className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Gaussian Mixture Model (GMM)</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Probabilistic clustering using mixture of Gaussian distributions. Identifies hidden subgroups in multimodal data with soft assignments.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {[
          { icon: Circle, title: "Soft Clustering", desc: "Probability-based assignment to multiple clusters", color: "bg-blue-100 dark:bg-blue-900/30" },
          { icon: BarChart3, title: "Model Selection", desc: "Auto-select optimal clusters using BIC/AIC", color: "bg-green-100 dark:bg-green-900/30" },
          { icon: Shuffle, title: "Multimodal Data", desc: "Handle non-spherical, overlapping distributions", color: "bg-amber-100 dark:bg-amber-900/30" },
        ].map((item) => (
          <Card key={item.title} className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader className="text-center pb-2">
              <div className={`mx-auto w-12 h-12 rounded-xl ${item.color} flex items-center justify-center mb-2`}>
                <item.icon className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-sm text-muted-foreground">
              <p>{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Info className="w-5 h-5 text-primary" />When to Use GMM</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-green-600 dark:text-green-400 mb-3">✓ Requirements</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["Continuous numeric features", "At least 10 samples (50+ recommended)", "Suspected multimodal distribution", "Features should be scaled similarly"].map((req) => (
                  <li key={req} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />{req}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-3">→ Results</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["Cluster assignments with probabilities", "Component means and covariances", "BIC/AIC for model selection", "Silhouette score for validation"].map((res) => (
                  <li key={res} className="flex items-start gap-2"><TrendingUp className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />{res}</li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button size="lg" onClick={onLoadSample} className="gap-2"><Activity className="w-5 h-5" />Load Sample Data</Button>
        <Button size="lg" variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2"><Upload className="w-5 h-5" />Upload Your Data</Button>
        <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={onFileUpload} className="hidden" />
      </div>
    </div>
  );
};

const ProgressBar: React.FC<{ currentStep: number; hasResults: boolean; onStepClick: (step: number) => void; }> = ({ currentStep, hasResults, onStepClick }) => {
  const steps = [{ num: 1, label: "Intro" }, { num: 2, label: "Variables" }, { num: 3, label: "Validation" }, { num: 4, label: "Summary" }, { num: 5, label: "Why" }, { num: 6, label: "Report" }];
  return (
    <div className="flex items-center justify-center gap-1 mb-8">
      {steps.map((step, idx) => {
        const isCompleted = step.num < currentStep;
        const isCurrent = step.num === currentStep;
        const isAccessible = step.num <= 3 || hasResults;
        return (
          <React.Fragment key={step.num}>
            <button onClick={() => isAccessible && onStepClick(step.num)} disabled={!isAccessible}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${isCurrent ? "bg-primary text-primary-foreground" : isCompleted ? "bg-primary/20 text-primary hover:bg-primary/30" : isAccessible ? "bg-muted hover:bg-muted/80" : "opacity-40 cursor-not-allowed bg-muted"}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isCurrent ? "bg-primary-foreground text-primary" : isCompleted ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20"}`}>
                {isCompleted ? "✓" : step.num}
              </span>
              <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
            </button>
            {idx < steps.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default function GMMPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<GMMResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [featureCols, setFeatureCols] = useState<string[]>([]);
  const [nComponents, setNComponents] = useState<string>("");
  const [maxComponents, setMaxComponents] = useState<string>("10");
  const [covarianceType, setCovarianceType] = useState<string>("full");
  const [autoSelect, setAutoSelect] = useState<boolean>(true);

  const handleLoadSample = useCallback(() => {
    const sampleData = generateSampleData();
    setData(sampleData);
    setColumns(Object.keys(sampleData[0]));
    setFeatureCols(["feature1", "feature2"]);
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
    setFeatureCols(prev => 
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  const getValidationChecks = useCallback((): ValidationCheck[] => {
    return [
      { name: "Data Loaded", passed: data.length > 0, message: data.length > 0 ? `${data.length} samples loaded` : "No data loaded" },
      { name: "Features Selected", passed: featureCols.length >= 1, message: featureCols.length >= 1 ? `${featureCols.length} features selected` : "Select at least 1 feature" },
      { name: "Minimum Samples", passed: data.length >= 10, message: data.length >= 50 ? `${data.length} samples (excellent)` : data.length >= 10 ? `${data.length} samples (acceptable)` : `Only ${data.length} samples (need ≥10)` },
      { name: "Components Setting", passed: autoSelect || !!nComponents, message: autoSelect ? "Auto-select enabled" : (nComponents ? `Manual: ${nComponents} components` : "Set number or enable auto") },
    ];
  }, [data, featureCols, autoSelect, nComponents]);

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const payload = {
        data,
        feature_cols: featureCols,
        n_components: autoSelect ? null : parseInt(nComponents),
        max_components: parseInt(maxComponents),
        covariance_type: covarianceType,
      };
      const res = await fetch(`${FASTAPI_URL}/api/analysis/gmm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Analysis failed");
      }
      const result: GMMResult = await res.json();
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
    const header = "Index,Cluster,Probability\n";
    const rows = results.cluster_assignments.map(a => `${a.index},${a.cluster},${a.probability.toFixed(4)}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gmm_clusters.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPNG = (chartKey: string) => {
    if (!results?.visualizations) return;
    const base64 = results.visualizations[chartKey as keyof typeof results.visualizations];
    if (!base64) return;
    const a = document.createElement("a");
    a.href = `data:image/png;base64,${base64}`;
    a.download = `gmm_${chartKey}.png`;
    a.click();
  };

  const numericColumns = columns.filter(col => {
    const sample = data[0]?.[col];
    return typeof sample === 'number' || !isNaN(Number(sample));
  });

  const renderStep2Variables = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-primary" />Configure Variables</CardTitle>
        <CardDescription>Select features and clustering parameters</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2"><Target className="w-4 h-4 text-primary" />Select Features</h4>
          <p className="text-sm text-muted-foreground">Choose numeric columns for clustering</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {numericColumns.map((col) => (
              <div key={col} className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${featureCols.includes(col) ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"}`}
                onClick={() => toggleFeature(col)}>
                <Checkbox checked={featureCols.includes(col)} />
                <span className="text-sm font-medium">{col}</span>
              </div>
            ))}
          </div>
          {featureCols.length > 0 && (
            <p className="text-sm text-muted-foreground">Selected: {featureCols.join(", ")}</p>
          )}
        </div>
        <Separator />
        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2"><Layers className="w-4 h-4 text-primary" />Number of Components</h4>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox id="autoSelect" checked={autoSelect} onCheckedChange={(checked) => setAutoSelect(!!checked)} />
              <Label htmlFor="autoSelect">Auto-select (BIC)</Label>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Number of Components {!autoSelect && "*"}</Label>
              <Input type="number" min="1" max="20" value={nComponents} onChange={(e) => setNComponents(e.target.value)} 
                placeholder="e.g., 3" disabled={autoSelect} />
            </div>
            <div className="space-y-2">
              <Label>Max Components (for auto)</Label>
              <Input type="number" min="2" max="20" value={maxComponents} onChange={(e) => setMaxComponents(e.target.value)} 
                disabled={!autoSelect} />
            </div>
          </div>
        </div>
        <Separator />
        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2"><Settings className="w-4 h-4 text-primary" />Covariance Type</h4>
          <div className="grid md:grid-cols-4 gap-3">
            {COVARIANCE_TYPES.map((cov) => (
              <button key={cov.value} onClick={() => setCovarianceType(cov.value)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${covarianceType === cov.value ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"}`}>
                <p className="font-medium">{cov.label}</p>
                <p className="text-xs text-muted-foreground">{cov.desc}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <Button onClick={() => setCurrentStep(3)} className="gap-2">Continue to Validation<ArrowRight className="w-4 h-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep3Validation = () => {
    const checks = getValidationChecks();
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" />Data Validation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            {checks.map((check, idx) => (
              <div key={idx} className={`flex items-center justify-between p-4 rounded-lg ${check.passed ? "bg-primary/5" : "bg-rose-50/50 dark:bg-rose-950/20"}`}>
                <div className="flex items-center gap-3">
                  {check.passed ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-rose-500" />}
                  <div><p className="font-medium">{check.name}</p><p className="text-sm text-muted-foreground">{check.message}</p></div>
                </div>
                <Badge variant={check.passed ? "default" : "destructive"}>{check.passed ? "Pass" : "Warning"}</Badge>
              </div>
            ))}
          </div>
          <div className="bg-sky-50 dark:bg-sky-950/20 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-sky-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-sky-800 dark:text-sky-200">Configuration Summary</p>
                <p className="text-sky-700 dark:text-sky-300">
                  {`Features: ${featureCols.join(", ")} • `}
                  {`Components: ${autoSelect ? "Auto (max " + maxComponents + ")" : nComponents} • `}
                  {`Covariance: ${covarianceType}`}
                </p>
              </div>
            </div>
          </div>
          {error && <div className="bg-rose-50 dark:bg-rose-950/20 rounded-lg p-4"><div className="flex items-start gap-2"><AlertCircle className="w-5 h-5 text-rose-600 mt-0.5" /><p className="text-sm text-rose-700 dark:text-rose-300">{error}</p></div></div>}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(2)}>Back to Variables</Button>
            <Button onClick={runAnalysis} disabled={loading} className="gap-2">
              {loading ? <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Analyzing...</> : <>Run GMM Analysis<ArrowRight className="w-4 h-4" /></>}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderStep4Summary = () => {
    if (!results) return null;
    const { summary, gmm_results } = results;
    const silScore = summary.silhouette_score;
    const gradientColor = silScore !== null && silScore >= 0.5 ? "from-green-500 to-emerald-600" : silScore !== null && silScore >= 0.25 ? "from-blue-500 to-indigo-600" : "from-amber-500 to-orange-600";
    const starRating = silScore !== null ? Math.min(5, Math.max(1, Math.ceil(silScore * 5))) : 3;
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-primary" />Result Summary</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className={`bg-gradient-to-r ${gradientColor} rounded-xl p-6 text-white`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Clusters Identified</p>
                <p className="text-4xl font-bold">{summary.n_components}</p>
                <Badge className="mt-2 bg-white/20 hover:bg-white/30">
                  {summary.total_samples} samples clustered
                </Badge>
              </div>
              <div className="text-right">
                <div className="flex gap-1 mb-2">{[1, 2, 3, 4, 5].map((star) => (<Star key={star} className={`w-5 h-5 ${star <= starRating ? "fill-yellow-300 text-yellow-300" : "text-white/30"}`} />))}</div>
                <p className="text-white/80 text-sm">Silhouette: {silScore?.toFixed(3) || "N/A"}</p>
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            {gmm_results.components.slice(0, 4).map((comp, idx) => (
              <div key={comp.id} className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 text-center">
                <div className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold`}
                  style={{ backgroundColor: `hsl(${(idx * 137) % 360}, 70%, 50%)` }}>
                  {comp.id + 1}
                </div>
                <p className="text-sm text-muted-foreground">Cluster {comp.id + 1}</p>
                <p className="text-xl font-bold">{comp.n_samples}</p>
                <p className="text-xs text-muted-foreground">{comp.percentage.toFixed(1)}%</p>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <h4 className="font-semibold">Key Insights</h4>
            {results.key_insights.map((insight, idx) => (
              <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg ${insight.status === "positive" ? "bg-green-50 dark:bg-green-950/20" : insight.status === "warning" ? "bg-amber-50 dark:bg-amber-950/20" : "bg-slate-50 dark:bg-slate-900/50"}`}>
                {insight.status === "positive" ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" /> : insight.status === "warning" ? <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" /> : <Info className="w-5 h-5 text-blue-600 shrink-0" />}
                <div><p className="font-medium">{insight.title}</p><p className="text-sm text-muted-foreground">{insight.description}</p></div>
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-4"><Button onClick={() => setCurrentStep(5)} className="gap-2">Why This Conclusion<ArrowRight className="w-4 h-4" /></Button></div>
        </CardContent>
      </Card>
    );
  };

  const renderStep5Why = () => {
    if (!results) return null;
    const { summary, gmm_results, selection_results } = results;
    const explanations = [
      { num: 1, title: "Model Selection", content: selection_results ? `BIC-optimal: ${selection_results.optimal_bic} components. AIC-optimal: ${selection_results.optimal_aic}. Selected ${summary.n_components} based on BIC.` : `User specified ${summary.n_components} components.` },
      { num: 2, title: "Silhouette Score", content: summary.silhouette_score !== null ? `Score = ${summary.silhouette_score.toFixed(3)}. ${summary.silhouette_score >= 0.5 ? "Strong" : summary.silhouette_score >= 0.25 ? "Moderate" : "Weak"} cluster separation.` : "Not applicable for single cluster." },
      { num: 3, title: "Convergence", content: `Model ${gmm_results.converged ? "converged" : "did not converge"} in ${gmm_results.n_iter} iterations. BIC = ${summary.bic.toFixed(0)}, AIC = ${summary.aic.toFixed(0)}.` },
      { num: 4, title: "Cluster Balance", content: `Largest cluster: ${Math.max(...gmm_results.components.map(c => c.n_samples))} samples. Smallest: ${Math.min(...gmm_results.components.map(c => c.n_samples))}.` },
    ];
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><HelpCircle className="w-5 h-5 text-primary" />Why This Conclusion</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            {explanations.map((exp) => (
              <div key={exp.num} className="bg-muted/30 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">{exp.num}</div>
                  <div><p className="font-semibold">{exp.title}</p><p className="text-sm text-muted-foreground mt-1">{exp.content}</p></div>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-sky-50 dark:bg-sky-950/20 rounded-xl p-5">
            <h4 className="font-semibold mb-3 flex items-center gap-2"><Target className="w-5 h-5 text-sky-600" />Silhouette Score Guide</h4>
            <div className="grid grid-cols-4 gap-4 text-center">
              {[
                { range: "0.7-1.0", label: "Excellent", color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" },
                { range: "0.5-0.7", label: "Good", color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" },
                { range: "0.25-0.5", label: "Fair", color: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" },
                { range: "<0.25", label: "Poor", color: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300" },
              ].map((g) => (
                <div key={g.range} className={`rounded-lg p-3 ${g.color}`}>
                  <p className="font-bold">{g.range}</p>
                  <p className="text-xs">{g.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(4)}>Back to Summary</Button>
            <Button onClick={() => setCurrentStep(6)} className="gap-2">View Full Report<ArrowRight className="w-4 h-4" /></Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderStep6Report = () => {
    if (!results) return null;
    const { summary, gmm_results } = results;
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Layers, label: "Clusters", value: summary.n_components },
            { icon: Target, label: "Silhouette", value: summary.silhouette_score?.toFixed(3) || "N/A" },
            { icon: BarChart3, label: "BIC", value: summary.bic.toFixed(0) },
            { icon: Activity, label: "Samples", value: summary.total_samples },
          ].map((item) => (
            <Card key={item.label}><CardContent className="pt-6"><div className="text-center"><item.icon className="w-8 h-8 mx-auto text-primary mb-2" /><p className="text-sm text-muted-foreground">{item.label}</p><p className="text-2xl font-bold">{item.value}</p></div></CardContent></Card>
          ))}
        </div>
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-blue-600" />Detailed Analysis (APA Format)</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">
              A Gaussian Mixture Model analysis was conducted on {summary.total_samples} samples using {results.feature_cols.length} features ({results.feature_cols.join(", ")}).
              {results.selection_results ? ` Model selection using BIC identified ${summary.n_components} as the optimal number of components.` : ` The model was fit with ${summary.n_components} user-specified components.`}
              {" "}Using {gmm_results.covariance_type} covariance, the model {gmm_results.converged ? `converged in ${gmm_results.n_iter} iterations` : "did not fully converge"} (BIC = {summary.bic.toFixed(0)}, AIC = {summary.aic.toFixed(0)}).
              {summary.silhouette_score !== null && ` The silhouette score of ${summary.silhouette_score.toFixed(3)} indicates ${summary.silhouette_score >= 0.5 ? "strong" : summary.silhouette_score >= 0.25 ? "moderate" : "weak"} cluster separation.`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" />Visualizations</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="scatter">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="scatter">Clusters</TabsTrigger>
                <TabsTrigger value="weights">Weights</TabsTrigger>
                <TabsTrigger value="density">Density</TabsTrigger>
                <TabsTrigger value="bic" disabled={!results.visualizations.bic_aic_chart}>BIC/AIC</TabsTrigger>
                <TabsTrigger value="silhouette" disabled={!results.visualizations.silhouette_plot}>Silhouette</TabsTrigger>
              </TabsList>
              {[
                { key: "cluster_scatter", tab: "scatter" },
                { key: "component_weights", tab: "weights" },
                { key: "density_plot", tab: "density" },
                { key: "bic_aic_chart", tab: "bic" },
                { key: "silhouette_plot", tab: "silhouette" },
              ].map(({ key, tab }) => (
                <TabsContent key={key} value={tab} className="mt-4">
                  {results.visualizations[key as keyof typeof results.visualizations] && (
                    <div className="relative">
                      <img src={`data:image/png;base64,${results.visualizations[key as keyof typeof results.visualizations]}`} alt={key} className="w-full rounded-lg" />
                      <Button size="sm" variant="outline" className="absolute top-2 right-2" onClick={() => handleDownloadPNG(key)}><Download className="w-4 h-4" /></Button>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Component Statistics</CardTitle><CardDescription>Cluster sizes and mixing weights</CardDescription></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Cluster</TableHead><TableHead>Samples</TableHead><TableHead>Percentage</TableHead><TableHead>Weight</TableHead><TableHead>Mean (first features)</TableHead></TableRow></TableHeader>
              <TableBody>
                {gmm_results.components.map((comp) => (
                  <TableRow key={comp.id}>
                    <TableCell><Badge style={{ backgroundColor: `hsl(${(comp.id * 137) % 360}, 70%, 50%)` }}>{comp.id + 1}</Badge></TableCell>
                    <TableCell>{comp.n_samples}</TableCell>
                    <TableCell>{comp.percentage.toFixed(1)}%</TableCell>
                    <TableCell>{comp.weight.toFixed(4)}</TableCell>
                    <TableCell className="text-sm">[{comp.mean.slice(0, 3).map(m => m.toFixed(2)).join(", ")}{comp.mean.length > 3 ? "..." : ""}]</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Cluster Assignments (Sample)</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Index</TableHead><TableHead>Cluster</TableHead><TableHead>Probability</TableHead></TableRow></TableHeader>
              <TableBody>
                {results.cluster_assignments.slice(0, 10).map((a) => (
                  <TableRow key={a.index}>
                    <TableCell>{a.index}</TableCell>
                    <TableCell><Badge style={{ backgroundColor: `hsl(${((a.cluster - 1) * 137) % 360}, 70%, 50%)` }}>{a.cluster}</Badge></TableCell>
                    <TableCell>{(a.probability * 100).toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {results.cluster_assignments.length > 10 && <p className="text-sm text-muted-foreground mt-2">Showing first 10 of {results.cluster_assignments.length} assignments</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Export</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleDownloadCSV} className="gap-2"><FileSpreadsheet className="w-4 h-4" />CSV (Assignments)</Button>
              <Button variant="outline" onClick={() => handleDownloadPNG("cluster_scatter")} className="gap-2"><FileImage className="w-4 h-4" />PNG</Button>
              <Button variant="outline" disabled className="gap-2"><FileText className="w-4 h-4" />Word (Soon)</Button>
              <Button variant="outline" disabled className="gap-2"><FileCode className="w-4 h-4" />PDF (Soon)</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {currentStep > 1 && <div className="flex justify-end mb-4"><Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)} className="gap-2"><HelpCircle className="w-4 h-4" />Help</Button></div>}
      {currentStep > 1 && <ProgressBar currentStep={currentStep} hasResults={!!results} onStepClick={setCurrentStep} />}
      {currentStep === 1 && <IntroPage onLoadSample={handleLoadSample} onFileUpload={handleFileUpload} />}
      {currentStep === 2 && renderStep2Variables()}
      {currentStep === 3 && renderStep3Validation()}
      {currentStep === 4 && renderStep4Summary()}
      {currentStep === 5 && renderStep5Why()}
      {currentStep === 6 && renderStep6Report()}
    </div>
  );
}