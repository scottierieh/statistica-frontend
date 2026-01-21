'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Loader2, HelpCircle, GitBranch, CheckCircle, BookOpen, Info, Lightbulb, 
  Download, FileSpreadsheet, ImageIcon, Database, Settings2, ChevronRight, 
  ChevronLeft, Check, CheckCircle2, FileText, Sparkles, AlertTriangle, 
  ChevronDown, ArrowRight, Target, Activity, Code, Upload, FileUp
} from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '@/components/ui/tabs';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel 
} from '@/components/ui/dropdown-menu';

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ============ Type Definitions ============
interface LoadingData {
  indicators: string[];
  loadings: Record<string, number>;
  eigenvalue: number;
  variance_explained: number;
  cronbach_alpha: number;
}

interface PathCoefficient {
  path: string;
  from: string;
  to: string;
  estimate: number;
  std_error: number | null;
  t_value: number | null;
  p_value: number | null;
  significant: boolean | null;
  is_r_squared?: boolean;
}

interface FitIndices {
  chi_square: number;
  df: number;
  p_value: number;
  cfi: number;
  tli: number;
  rmsea: number;
  srmr: number;
  aic: number;
  bic: number;
  n: number;
  note?: string;
}

interface KeyInsight {
  title: string;
  description: string;
}

interface Interpretation {
  key_insights: KeyInsight[];
  n_latent_vars: number;
  n_significant_paths: number;
  overall_assessment: string;
}

interface AnalysisResults {
  parsed_model: {
    latent_vars: Record<string, string[]>;
    regressions: Array<{ dv: string; ivs: string[] }>;
    covariances: Array<[string, string]>;
  };
  measurement_model: Record<string, LoadingData>;
  structural_model: PathCoefficient[];
  fit_indices: FitIndices;
  path_diagram: string | null;
  loading_heatmap: string | null;
  correlation_matrix: string | null;
  interpretation: Interpretation;
  estimator: string;
  n_observations: number;
}

// ============ Constants ============
type Step = 1 | 2 | 3 | 4 | 5 | 6;

const STEPS = [
  { id: 1, label: '데이터' },
  { id: 2, label: '모델' },
  { id: 3, label: '설정' },
  { id: 4, label: '검증' },
  { id: 5, label: '결과' },
  { id: 6, label: '통계' }
];

const EXAMPLE_MODEL = `# Measurement Model (latent =~ indicators)
VisualAbility =~ x1 + x2 + x3
TextualAbility =~ x4 + x5 + x6
SpeedAbility =~ x7 + x8 + x9

# Structural Model (regression paths)
TextualAbility ~ VisualAbility
SpeedAbility ~ TextualAbility + VisualAbility`;

// Holzinger & Swineford 1939 스타일 샘플 데이터
const generateSampleData = (): DataSet => {
  const data: DataSet = [];
  for (let i = 0; i < 301; i++) {
    // 잠재변수 생성
    const visual = Math.random() * 2 - 1;
    const textual = Math.random() * 2 - 1;
    const speed = Math.random() * 2 - 1;
    
    data.push({
      x1: +(visual * 0.8 + Math.random() * 0.5 + 3).toFixed(2),
      x2: +(visual * 0.7 + Math.random() * 0.6 + 4).toFixed(2),
      x3: +(visual * 0.6 + Math.random() * 0.7 + 2).toFixed(2),
      x4: +(textual * 0.85 + Math.random() * 0.4 + 3).toFixed(2),
      x5: +(textual * 0.75 + Math.random() * 0.5 + 4).toFixed(2),
      x6: +(textual * 0.65 + Math.random() * 0.6 + 2).toFixed(2),
      x7: +(speed * 0.7 + Math.random() * 0.6 + 5).toFixed(2),
      x8: +(speed * 0.8 + Math.random() * 0.5 + 6).toFixed(2),
      x9: +(speed * 0.75 + Math.random() * 0.55 + 5).toFixed(2),
    });
  }
  return data;
};

// ============ Intro Page Component ============
const IntroPage = ({ 
  onLoadExample, 
  onUploadData 
}: { 
  onLoadExample: () => void;
  onUploadData: (data: DataSet, headers: string[]) => void;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const headers = Object.keys(results.data[0] as object);
          onUploadData(results.data as DataSet, headers);
          toast({ title: '데이터 업로드 완료', description: `${results.data.length}개 행, ${headers.length}개 열` });
        }
      },
      error: (error) => {
        toast({ variant: 'destructive', title: '파일 읽기 실패', description: error.message });
      }
    });
  };

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <GitBranch className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="font-headline text-3xl">구조방정식 모형 (SEM)</CardTitle>
          <CardDescription className="text-base mt-2">
            잠재변수와 관측변수 간의 복잡한 관계를 분석합니다
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-2">
              <CardHeader>
                <Activity className="w-6 h-6 text-primary mb-2" />
                <CardTitle className="text-lg">잠재변수</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  관측 지표로부터 잠재 구성개념 모델링
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-2">
              <CardHeader>
                <GitBranch className="w-6 h-6 text-primary mb-2" />
                <CardTitle className="text-lg">경로분석</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  변수 간 방향성 관계 검증
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-2">
              <CardHeader>
                <Target className="w-6 h-6 text-primary mb-2" />
                <CardTitle className="text-lg">적합도 지수</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  CFI, RMSEA, SRMR로 모형 평가
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Syntax Guide */}
          <div className="bg-muted/50 rounded-lg p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              모형 구문 (lavaan 스타일)
            </h3>
            <pre className="text-xs bg-background p-4 rounded-lg border overflow-x-auto">
{`# 측정모형 (Measurement Model)
Factor1 =~ item1 + item2 + item3
Factor2 =~ item4 + item5 + item6

# 구조모형 (Structural Model)
Factor2 ~ Factor1`}
            </pre>
            <div className="grid md:grid-cols-2 gap-6 text-sm mt-4">
              <div>
                <h4 className="font-semibold mb-2">연산자</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li><code className="bg-muted px-1 rounded">=~</code> 잠재변수 정의</li>
                  <li><code className="bg-muted px-1 rounded">~</code> 회귀 경로</li>
                  <li><code className="bg-muted px-1 rounded">~~</code> 공분산</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">요구사항</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <span>요인당 3개 이상 지표</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <span>표본 크기 ≥ 200</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv,.xlsx,.xls"
              className="hidden"
            />
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-5 w-5" />
              데이터 업로드
            </Button>
            <Button onClick={onLoadExample} size="lg">
              <Database className="mr-2 h-5 w-5" />
              예제 데이터 로드
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ============ Main Component ============
export default function SEMAnalysisPage() {
  const { toast } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);
  
  // State
  const [view, setView] = useState<'intro' | 'main'>('intro');
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
  
  // Data State
  const [data, setData] = useState<DataSet>([]);
  const [allHeaders, setAllHeaders] = useState<string[]>([]);
  
  // Model State
  const [modelSpec, setModelSpec] = useState('');
  const [estimator, setEstimator] = useState('ML');
  const [missing, setMissing] = useState('listwise');
  
  // Analysis State
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResults | null>(null);

  // Computed
  const canRun = useMemo(() => data.length >= 50 && allHeaders.length >= 4, [data, allHeaders]);

  const parsedModelPreview = useMemo(() => {
    const lines = modelSpec.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
    const latentCount = lines.filter(l => l.includes('=~')).length;
    const pathCount = lines.filter(l => l.includes('~') && !l.includes('=~') && !l.includes('~~')).length;
    const covCount = lines.filter(l => l.includes('~~')).length;
    return { latentCount, pathCount, covCount, isValid: latentCount > 0 || pathCount > 0 };
  }, [modelSpec]);

  const validationChecks = useMemo(() => [
    { 
      label: '모형 구문', 
      passed: parsedModelPreview.isValid, 
      message: parsedModelPreview.isValid 
        ? `잠재변수 ${parsedModelPreview.latentCount}개, 경로 ${parsedModelPreview.pathCount}개` 
        : '유효한 모형 구문을 입력하세요' 
    },
    { 
      label: '표본 크기', 
      passed: data.length >= 100, 
      message: data.length >= 200 
        ? `n = ${data.length} (양호)` 
        : data.length >= 100 
          ? `n = ${data.length} (최소 충족)` 
          : `n = ${data.length} (100개 이상 필요)` 
    },
    { 
      label: '변수 수', 
      passed: allHeaders.length >= 4, 
      message: `${allHeaders.length}개 변수 사용 가능` 
    },
  ], [parsedModelPreview, data.length, allHeaders.length]);

  const allChecksPassed = validationChecks.slice(0, 2).every(c => c.passed);

  // Navigation
  const goToStep = (step: Step) => {
    setCurrentStep(step);
    if (step > maxReachedStep) setMaxReachedStep(step);
  };
  
  const nextStep = () => {
    if (currentStep < 6) goToStep((currentStep + 1) as Step);
  };
  
  const prevStep = () => {
    if (currentStep > 1) goToStep((currentStep - 1) as Step);
  };

  // Handlers
  const handleLoadExample = useCallback(() => {
    const sampleData = generateSampleData();
    const headers = Object.keys(sampleData[0]);
    setData(sampleData);
    setAllHeaders(headers);
    setModelSpec(EXAMPLE_MODEL);
    setView('main');
    setCurrentStep(1);
    toast({ title: '예제 데이터 로드됨', description: '301개 샘플, 9개 변수' });
  }, [toast]);

  const handleUploadData = useCallback((uploadedData: DataSet, headers: string[]) => {
    setData(uploadedData);
    setAllHeaders(headers);
    setView('main');
    setCurrentStep(1);
  }, []);

  const handleDownloadPNG = useCallback(async () => {
    if (!resultsRef.current) return;
    setIsDownloading(true);
    toast({ title: "이미지 생성 중..." });
    try {
      const canvas = await html2canvas(resultsRef.current, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#ffffff' 
      });
      const link = document.createElement('a');
      link.download = `SEM_Report_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      toast({ title: "다운로드 완료" });
    } catch {
      toast({ variant: 'destructive', title: "다운로드 실패" });
    } finally {
      setIsDownloading(false);
    }
  }, [toast]);

  const handleDownloadCSV = useCallback(() => {
    if (!analysisResult) return;
    let csv = `SEM ANALYSIS REPORT\nGenerated,${new Date().toISOString()}\n\nFIT INDICES\n`;
    const fit = analysisResult.fit_indices;
    csv += `CFI,${fit.cfi?.toFixed(3)}\nTLI,${fit.tli?.toFixed(3)}\nRMSEA,${fit.rmsea?.toFixed(3)}\nSRMR,${fit.srmr?.toFixed(3)}\nChi-square,${fit.chi_square?.toFixed(2)}\ndf,${fit.df}\n\n`;
    csv += `PATH COEFFICIENTS\n` + Papa.unparse(
      analysisResult.structural_model
        .filter(p => !p.is_r_squared)
        .map(p => ({
          path: p.path,
          estimate: p.estimate?.toFixed(3),
          se: p.std_error?.toFixed(3),
          t: p.t_value?.toFixed(2),
          p: p.p_value?.toFixed(4),
          sig: p.significant ? 'Yes' : 'No'
        }))
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `SEM_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: "CSV 다운로드 완료" });
  }, [analysisResult, toast]);

  const handleAnalysis = useCallback(async () => {
    if (!modelSpec.trim()) {
      toast({ variant: 'destructive', title: '오류', description: '모형 구문을 입력하세요.' });
      return;
    }
    setIsLoading(true);
    setAnalysisResult(null);
    
    try {
      const res = await fetch(`${FASTAPI_URL}/api/multivariate/sem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, model_spec: modelSpec, estimator, missing })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || '분석 실패');
      }
      
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      
      setAnalysisResult(result);
      goToStep(5);
      toast({ 
        title: '분석 완료', 
        description: `CFI = ${result.fit_indices.cfi?.toFixed(3)}` 
      });
    } catch (e: any) {
      toast({ variant: 'destructive', title: '오류', description: e.message });
    } finally {
      setIsLoading(false);
    }
  }, [data, modelSpec, estimator, missing, toast]);

  const loadExampleModel = () => {
    setModelSpec(EXAMPLE_MODEL);
    toast({ title: '예제 모형 로드됨' });
  };

  // Reset on data change
  useEffect(() => {
    setAnalysisResult(null);
    if (!canRun && view === 'main') {
      // Keep in main view but reset steps
    }
    setMaxReachedStep(1);
  }, [allHeaders, canRun]);

  // ============ Render ============
  if (view === 'intro') {
    return (
      <IntroPage 
        onLoadExample={handleLoadExample} 
        onUploadData={handleUploadData} 
      />
    );
  }

  const results = analysisResult;

  // Progress Bar Component
  const ProgressBar = () => (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between">
        {STEPS.map((step) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isClickable = step.id <= maxReachedStep;
          
          return (
            <button
              key={step.id}
              onClick={() => isClickable && goToStep(step.id as Step)}
              disabled={!isClickable}
              className={`flex flex-col items-center gap-2 flex-1 ${
                isClickable ? 'cursor-pointer' : 'cursor-not-allowed'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 border-2 ${
                isCurrent 
                  ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-lg' 
                  : isCompleted 
                    ? 'bg-primary/80 text-primary-foreground border-primary/80' 
                    : 'bg-background border-muted-foreground/30 text-muted-foreground'
              }`}>
                {isCompleted && !isCurrent ? <Check className="w-5 h-5" /> : step.id}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${
                isCurrent ? 'text-primary' : 'text-muted-foreground'
              }`}>
                {step.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">구조방정식 모형 (SEM)</h1>
          <p className="text-muted-foreground mt-1">잠재변수 분석</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setView('intro')}>
          <HelpCircle className="w-5 h-5" />
        </Button>
      </div>

      <ProgressBar />

      <div className="min-h-[500px]">
        {/* Step 1: Data Overview */}
        {currentStep === 1 && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Database className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle>데이터 확인</CardTitle>
                  <CardDescription>분석에 사용할 데이터를 확인합니다</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Data Summary */}
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">표본 크기</p>
                    <p className="text-2xl font-bold text-primary">{data.length}</p>
                    <p className="text-xs text-muted-foreground">
                      {data.length >= 200 ? '✓ 양호' : data.length >= 100 ? '△ 최소' : '✗ 부족'}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">변수 수</p>
                    <p className="text-2xl font-bold text-primary">{allHeaders.length}</p>
                    <p className="text-xs text-muted-foreground">개 컬럼</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">데이터 상태</p>
                    <p className="text-2xl font-bold text-green-600">✓</p>
                    <p className="text-xs text-muted-foreground">준비됨</p>
                  </CardContent>
                </Card>
              </div>

              {/* Variable List */}
              <div className="p-4 bg-muted/50 rounded-xl">
                <h4 className="font-medium text-sm mb-3">사용 가능한 변수</h4>
                <div className="flex flex-wrap gap-2">
                  {allHeaders.map(h => (
                    <Badge key={h} variant="outline" className="text-xs">{h}</Badge>
                  ))}
                </div>
              </div>

              {/* Data Preview */}
              <div className="p-4 bg-muted/50 rounded-xl">
                <h4 className="font-medium text-sm mb-3">데이터 미리보기 (처음 5행)</h4>
                <ScrollArea className="h-40">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {allHeaders.slice(0, 8).map(h => (
                          <TableHead key={h} className="text-xs">{h}</TableHead>
                        ))}
                        {allHeaders.length > 8 && <TableHead className="text-xs">...</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.slice(0, 5).map((row, i) => (
                        <TableRow key={i}>
                          {allHeaders.slice(0, 8).map(h => (
                            <TableCell key={h} className="text-xs font-mono">
                              {typeof row[h] === 'number' ? row[h].toFixed(2) : row[h]}
                            </TableCell>
                          ))}
                          {allHeaders.length > 8 && <TableCell className="text-xs">...</TableCell>}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </CardContent>
            <CardFooter className="pt-4">
              <Button onClick={nextStep} className="ml-auto" size="lg">
                다음
                <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 2: Model Specification */}
        {currentStep === 2 && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Code className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle>모형 구문</CardTitle>
                  <CardDescription>lavaan 스타일로 SEM 모형을 정의합니다</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>모형 구문 (Model Syntax)</Label>
                  <Button variant="outline" size="sm" onClick={loadExampleModel}>
                    <Lightbulb className="w-4 h-4 mr-1" />
                    예제 로드
                  </Button>
                </div>
                <Textarea
                  value={modelSpec}
                  onChange={(e) => setModelSpec(e.target.value)}
                  placeholder={`# 측정모형 (Measurement Model)
F1 =~ x1 + x2 + x3
F2 =~ x4 + x5 + x6

# 구조모형 (Structural Model)
F2 ~ F1`}
                  className="font-mono text-sm h-48"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-xl">
                  <h4 className="font-medium text-sm mb-2">사용 가능한 변수</h4>
                  <ScrollArea className="h-32">
                    <div className="flex flex-wrap gap-1">
                      {allHeaders.map(h => (
                        <Badge key={h} variant="outline" className="text-xs cursor-pointer hover:bg-primary/10"
                          onClick={() => {
                            navigator.clipboard.writeText(h);
                            toast({ title: `'${h}' 복사됨` });
                          }}
                        >
                          {h}
                        </Badge>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                <div className="p-4 bg-muted/50 rounded-xl">
                  <h4 className="font-medium text-sm mb-2">모형 미리보기</h4>
                  <div className="space-y-1 text-sm">
                    <p>잠재변수: <span className="font-semibold">{parsedModelPreview.latentCount}개</span></p>
                    <p>회귀경로: <span className="font-semibold">{parsedModelPreview.pathCount}개</span></p>
                    <p>공분산: <span className="font-semibold">{parsedModelPreview.covCount}개</span></p>
                    <p>상태: {parsedModelPreview.isValid 
                      ? <span className="text-green-600 font-semibold">✓ 유효</span> 
                      : <span className="text-amber-600 font-semibold">△ 불완전</span>}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-4 flex justify-between">
              <Button variant="ghost" onClick={prevStep}>
                <ChevronLeft className="mr-2 w-4 h-4" />
                이전
              </Button>
              <Button onClick={nextStep} size="lg" disabled={!parsedModelPreview.isValid}>
                다음
                <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 3: Settings */}
        {currentStep === 3 && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Settings2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle>분석 설정</CardTitle>
                  <CardDescription>SEM 추정 방법을 설정합니다</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Estimator Selection */}
                <div className="space-y-3">
                  <Label>추정 방법 (Estimator)</Label>
                  <Select value={estimator} onValueChange={setEstimator}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ML">Maximum Likelihood (ML)</SelectItem>
                      <SelectItem value="GLS">Generalized Least Squares (GLS)</SelectItem>
                      <SelectItem value="WLS">Weighted Least Squares (WLS)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Missing Data Handling */}
                <div className="space-y-3">
                  <Label>결측치 처리 (Missing Data)</Label>
                  <Select value={missing} onValueChange={setMissing}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="listwise">Listwise Deletion</SelectItem>
                      <SelectItem value="fiml">FIML (Full Information ML)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Configuration Summary */}
              <div className="p-5 bg-muted/50 rounded-xl space-y-3">
                <h4 className="font-medium text-sm">설정 요약</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• <strong className="text-foreground">추정 방법:</strong> {estimator}</p>
                  <p>• <strong className="text-foreground">결측치 처리:</strong> {missing}</p>
                  <p>• <strong className="text-foreground">표본 크기:</strong> n = {data.length}</p>
                  <p>• <strong className="text-foreground">변수 수:</strong> {allHeaders.length}개</p>
                </div>
              </div>

              {/* Info Box */}
              <div className="p-5 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-sky-600" />
                  추정 방법 안내
                </h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>ML:</strong> 기본값. 정규분포 데이터에 적합</p>
                  <p><strong>GLS:</strong> 비정규성에 더 강건함</p>
                  <p><strong>WLS:</strong> 순서형/범주형 데이터에 적합</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-4 flex justify-between">
              <Button variant="ghost" onClick={prevStep}>
                <ChevronLeft className="mr-2 w-4 h-4" />
                이전
              </Button>
              <Button onClick={nextStep} size="lg">
                다음
                <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 4: Validation */}
        {currentStep === 4 && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle>검증</CardTitle>
                  <CardDescription>분석 요건을 확인합니다</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                {validationChecks.map((check, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${
                      check.passed 
                        ? 'bg-primary/5' 
                        : 'bg-amber-50/50 dark:bg-amber-950/20'
                    }`}
                  >
                    {check.passed 
                      ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" /> 
                      : <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    }
                    <div>
                      <p className={`font-medium text-sm ${
                        check.passed 
                          ? 'text-foreground' 
                          : 'text-amber-700 dark:text-amber-300'
                      }`}>
                        {check.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{check.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="pt-4 flex justify-between">
              <Button variant="ghost" onClick={prevStep}>
                <ChevronLeft className="mr-2 w-4 h-4" />
                이전
              </Button>
              <Button 
                onClick={handleAnalysis} 
                disabled={isLoading || !allChecksPassed} 
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    분석 중...
                  </>
                ) : (
                  <>
                    SEM 분석 실행
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 5: Results Summary */}
        {currentStep === 5 && results && (() => {
          const fit = results.fit_indices;
          const isGoodFit = (fit.cfi ?? 0) >= 0.90 && (fit.rmsea ?? 1) <= 0.08;
          
          return (
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>분석 결과 요약</CardTitle>
                    <CardDescription>
                      {results.interpretation.n_latent_vars}개 잠재변수, n = {results.n_observations}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Key Findings */}
                <div className={`rounded-xl p-6 space-y-4 border ${
                  isGoodFit 
                    ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' 
                    : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'
                }`}>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Sparkles className={`w-5 h-5 ${isGoodFit ? 'text-primary' : 'text-amber-600'}`} />
                    주요 발견
                  </h3>
                  <div className="space-y-3">
                    {results.interpretation.key_insights.slice(0, 3).map((insight, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className={`font-bold ${isGoodFit ? 'text-primary' : 'text-amber-600'}`}>•</span>
                        <p className="text-sm">
                          <strong>{insight.title}:</strong> {insight.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fit Assessment */}
                <div className={`rounded-xl p-5 border ${
                  isGoodFit 
                    ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' 
                    : 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700'
                }`}>
                  <div className="flex items-start gap-3">
                    {isGoodFit 
                      ? <CheckCircle2 className="w-6 h-6 text-primary" /> 
                      : <AlertTriangle className="w-6 h-6 text-amber-600" />
                    }
                    <div>
                      <p className="font-semibold">
                        {isGoodFit ? "모형 적합도 양호!" : "모형 적합도 개선 필요"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {isGoodFit 
                          ? `CFI = ${fit.cfi?.toFixed(3)}, RMSEA = ${fit.rmsea?.toFixed(3)}. 모형이 데이터에 적절히 적합합니다.` 
                          : `CFI = ${fit.cfi?.toFixed(3)}, RMSEA = ${fit.rmsea?.toFixed(3)}. 모형 수정을 고려하세요.`
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Fit Index Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className={(fit.cfi ?? 0) >= 0.95 ? 'border-green-200' : ''}>
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground">CFI</p>
                      <p className={`text-xl font-bold ${
                        (fit.cfi ?? 0) >= 0.95 ? 'text-green-600' 
                        : (fit.cfi ?? 0) >= 0.90 ? 'text-blue-600' 
                        : 'text-amber-600'
                      }`}>
                        {fit.cfi?.toFixed(3)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(fit.cfi ?? 0) >= 0.95 ? '우수' : (fit.cfi ?? 0) >= 0.90 ? '양호' : '미흡'}
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className={(fit.rmsea ?? 1) <= 0.05 ? 'border-green-200' : ''}>
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground">RMSEA</p>
                      <p className={`text-xl font-bold ${
                        (fit.rmsea ?? 1) <= 0.05 ? 'text-green-600' 
                        : (fit.rmsea ?? 1) <= 0.08 ? 'text-blue-600' 
                        : 'text-amber-600'
                      }`}>
                        {fit.rmsea?.toFixed(3)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(fit.rmsea ?? 1) <= 0.05 ? '우수' : (fit.rmsea ?? 1) <= 0.08 ? '양호' : '미흡'}
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground">SRMR</p>
                      <p className="text-xl font-bold">{fit.srmr?.toFixed(3)}</p>
                      <p className="text-xs text-muted-foreground">
                        {(fit.srmr ?? 1) <= 0.08 ? '양호' : '미흡'}
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground">χ² / df</p>
                      <p className="text-xl font-bold">
                        {((fit.chi_square ?? 0) / (fit.df || 1)).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {((fit.chi_square ?? 0) / (fit.df || 1)) <= 3 ? '양호' : '미흡'}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
              <CardFooter className="pt-4 flex justify-end">
                <Button onClick={nextStep} size="lg">
                  상세 통계 보기
                  <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          );
        })()}

        {/* Step 6: Full Statistics */}
        {currentStep === 6 && results && (
          <>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-semibold">상세 통계</h2>
                <p className="text-sm text-muted-foreground">전체 SEM 분석 결과</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    내보내기
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>다운로드 형식</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDownloadCSV}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>
                    {isDownloading 
                      ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                      : <ImageIcon className="mr-2 h-4 w-4" />
                    }
                    PNG 이미지
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
              {/* Report Header */}
              <div className="text-center py-4 border-b">
                <h2 className="text-2xl font-bold">SEM 분석 보고서</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  n = {results.n_observations} | {results.estimator} 추정 | {new Date().toLocaleDateString('ko-KR')}
                </p>
              </div>

              {/* Visualizations */}
              <Card>
                <CardHeader>
                  <CardTitle>시각화</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="path" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="path">경로 다이어그램</TabsTrigger>
                      <TabsTrigger value="loadings">요인적재량</TabsTrigger>
                      <TabsTrigger value="corr">상관행렬</TabsTrigger>
                    </TabsList>
                    <TabsContent value="path" className="mt-4">
                      {results.path_diagram ? (
                        <Image
                          src={`data:image/png;base64,${results.path_diagram}`}
                          alt="Path Diagram"
                          width={800}
                          height={600}
                          className="w-full rounded-md border"
                        />
                      ) : (
                        <p className="text-center text-muted-foreground py-8">
                          경로 다이어그램을 생성할 수 없습니다
                        </p>
                      )}
                    </TabsContent>
                    <TabsContent value="loadings" className="mt-4">
                      {results.loading_heatmap ? (
                        <Image
                          src={`data:image/png;base64,${results.loading_heatmap}`}
                          alt="Loading Heatmap"
                          width={800}
                          height={500}
                          className="w-full rounded-md border"
                        />
                      ) : (
                        <p className="text-center text-muted-foreground py-8">
                          요인적재량 히트맵을 생성할 수 없습니다
                        </p>
                      )}
                    </TabsContent>
                    <TabsContent value="corr" className="mt-4">
                      {results.correlation_matrix ? (
                        <Image
                          src={`data:image/png;base64,${results.correlation_matrix}`}
                          alt="Correlation Matrix"
                          width={800}
                          height={500}
                          className="w-full rounded-md border"
                        />
                      ) : (
                        <p className="text-center text-muted-foreground py-8">
                          상관행렬을 생성할 수 없습니다
                        </p>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Fit Indices */}
              <Card>
                <CardHeader>
                  <CardTitle>적합도 지수 (Fit Indices)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-center">
                    {[
                      { label: 'χ²', value: results.fit_indices.chi_square?.toFixed(2) },
                      { label: 'df', value: results.fit_indices.df },
                      { label: 'CFI', value: results.fit_indices.cfi?.toFixed(3) },
                      { label: 'TLI', value: results.fit_indices.tli?.toFixed(3) },
                      { label: 'RMSEA', value: results.fit_indices.rmsea?.toFixed(3) },
                      { label: 'SRMR', value: results.fit_indices.srmr?.toFixed(3) }
                    ].map((item, i) => (
                      <div key={i} className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="text-lg font-semibold">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Measurement Model */}
              <Card>
                <CardHeader>
                  <CardTitle>측정모형 (Factor Loadings)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[250px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>잠재변수</TableHead>
                          <TableHead>지표</TableHead>
                          <TableHead className="text-right">적재량</TableHead>
                          <TableHead className="text-right">Cronbach α</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(results.measurement_model).map(([latent, data]) =>
                          data.loadings && Object.entries(data.loadings).map(([ind, load], i) => (
                            <TableRow key={`${latent}-${ind}`}>
                              <TableCell className="font-medium">
                                {i === 0 ? latent : ''}
                              </TableCell>
                              <TableCell>{ind}</TableCell>
                              <TableCell className="text-right font-mono">
                                <span className={
                                  Math.abs(load) >= 0.7 
                                    ? 'text-green-600 font-semibold' 
                                    : Math.abs(load) >= 0.5 
                                      ? '' 
                                      : 'text-amber-600'
                                }>
                                  {load.toFixed(3)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {i === 0 ? data.cronbach_alpha?.toFixed(3) : ''}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Structural Model */}
              <Card>
                <CardHeader>
                  <CardTitle>구조모형 (Path Coefficients)</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>경로</TableHead>
                        <TableHead className="text-right">β</TableHead>
                        <TableHead className="text-right">SE</TableHead>
                        <TableHead className="text-right">t</TableHead>
                        <TableHead className="text-right">p</TableHead>
                        <TableHead className="text-right">유의</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.structural_model
                        .filter(p => !p.is_r_squared)
                        .map((p, i) => (
                          <TableRow 
                            key={i} 
                            className={p.significant ? 'bg-green-50 dark:bg-green-950/20' : ''}
                          >
                            <TableCell className="font-medium">{p.path}</TableCell>
                            <TableCell className="text-right font-mono">
                              {p.estimate?.toFixed(3)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {p.std_error?.toFixed(3) ?? '-'}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {p.t_value?.toFixed(2) ?? '-'}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              <span className={p.significant ? 'text-green-600 font-semibold' : ''}>
                                {p.p_value != null 
                                  ? (p.p_value < 0.001 ? '< .001' : p.p_value.toFixed(3)) 
                                  : '-'
                                }
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              {p.significant 
                                ? <Badge className="bg-green-100 text-green-800">Yes</Badge> 
                                : <Badge variant="outline">No</Badge>
                              }
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            <div className="mt-4 flex justify-start">
              <Button variant="ghost" onClick={prevStep}>
                <ChevronLeft className="mr-2 w-4 h-4" />
                이전
              </Button>
            </div>
          </>
        )}

        {/* Loading State */}
        {isLoading && (
          <Card>
            <CardContent className="p-6 flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-muted-foreground">SEM 분석 실행 중...</p>
              <Skeleton className="h-[400px] w-full" />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
