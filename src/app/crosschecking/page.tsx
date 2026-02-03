'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckSquare, Search, Download, FileText, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import { Badge } from '@/components/ui/badge';
import { allAnalysisData, type AnalysisValidation } from '@/lib/cross-checking-data';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

type SortField = 'name' | 'category' | null;
type SortDirection = 'asc' | 'desc';

// GitHub Raw URL base
const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/scottierieh/statistica/refs/heads/main";

// Cross-check MD file URL mapping by analysis id
const getCrossCheckUrl = (analysisId: string): string => {
  const mdFiles: Record<string, string> = {
    'descriptive-stats': `${GITHUB_RAW_BASE}/crosscheck/descriptive.md`,
    // Add more mappings as cross-checks are completed
  };
  return mdFiles[analysisId] || '';
};

// Technical documentation MD file URL mapping by analysis id
const getTechnicalDocsUrl = (analysisId: string): string => {
  const mdFiles: Record<string, string> = {
    'descriptive-stats': `${GITHUB_RAW_BASE}/docs/descriptive-stats.md`,
    'frequency-analysis': `${GITHUB_RAW_BASE}/docs/frequency-analysis.md`,
    'variability-analysis': `${GITHUB_RAW_BASE}/docs/variability-analysis.md`,
    'normality-test': `${GITHUB_RAW_BASE}/docs/normality-test.md`,
    'homogeneity-test': `${GITHUB_RAW_BASE}/docs/homogeneity-test.md`,
    'outlier-detection': `${GITHUB_RAW_BASE}/docs/outlier-detection.md`,
    'linearity-check': `${GITHUB_RAW_BASE}/docs/linearity-check.md`,
    'autocorrelation-test': `${GITHUB_RAW_BASE}/docs/autocorrelation-test.md`,
    'influence-diagnostics': `${GITHUB_RAW_BASE}/docs/influence-diagnostics.md`,
    'one-sample-ttest': `${GITHUB_RAW_BASE}/docs/one-sample-ttest.md`,
    'independent-samples-ttest': `${GITHUB_RAW_BASE}/docs/independent-samples-ttest.md`,
    'paired-samples-ttest': `${GITHUB_RAW_BASE}/docs/paired-samples-ttest.md`,
    'one-way-anova': `${GITHUB_RAW_BASE}/docs/one-way-anova.md`,
    'two-way-anova': `${GITHUB_RAW_BASE}/docs/two-way-anova.md`,
    'ancova': `${GITHUB_RAW_BASE}/docs/ancova.md`,
    'manova': `${GITHUB_RAW_BASE}/docs/manova.md`,
    'repeated-measures-anova': `${GITHUB_RAW_BASE}/docs/repeated-measures-anova.md`,
    'Two-repeated-measures-anova': `${GITHUB_RAW_BASE}/docs/two-way-repeated-measures-anova.md`,
    'mann-whitney': `${GITHUB_RAW_BASE}/docs/mann-whitney.md`,
    'wilcoxon': `${GITHUB_RAW_BASE}/docs/wilcoxon.md`,
    'kruskal-wallis': `${GITHUB_RAW_BASE}/docs/kruskal-wallis.md`,
    'friedman': `${GITHUB_RAW_BASE}/docs/friedman.md`,
    'correlation': `${GITHUB_RAW_BASE}/docs/correlation.md`,
    'crosstab': `${GITHUB_RAW_BASE}/docs/crosstab.md`,
    'regression-simple': `${GITHUB_RAW_BASE}/docs/regression-simple.md`,
    'regression-multiple': `${GITHUB_RAW_BASE}/docs/regression-multiple.md`,
    'regression-polynomial': `${GITHUB_RAW_BASE}/docs/regression-polynomial.md`,
    'logistic-regression': `${GITHUB_RAW_BASE}/docs/logistic-regression.md`,
    'lasso-regression': `${GITHUB_RAW_BASE}/docs/lasso-regression.md`,
    'ridge-regression': `${GITHUB_RAW_BASE}/docs/ridge-regression.md`,
    'robust-regression': `${GITHUB_RAW_BASE}/docs/robust-regression.md`,
    'glm': `${GITHUB_RAW_BASE}/docs/glm.md`,
    'relative-importance': `${GITHUB_RAW_BASE}/docs/relative-importance.md`,
    'feature-importance': `${GITHUB_RAW_BASE}/docs/feature-importance.md`,
    'discriminant': `${GITHUB_RAW_BASE}/docs/discriminant.md`,
    'decision-tree': `${GITHUB_RAW_BASE}/docs/decision-tree.md`,
    'gbm': `${GITHUB_RAW_BASE}/docs/gbm.md`,
    'random-forest': `${GITHUB_RAW_BASE}/docs/random-forest.md`,
    'xgboost': `${GITHUB_RAW_BASE}/docs/xgboost.md`,
    'svm': `${GITHUB_RAW_BASE}/docs/svm.md`,
    'knn': `${GITHUB_RAW_BASE}/docs/knn.md`,
    'naive-bayes': `${GITHUB_RAW_BASE}/docs/naive-bayes.md`,
    'survival': `${GITHUB_RAW_BASE}/docs/survival.md`,
    'cross-validation': `${GITHUB_RAW_BASE}/docs/cross-validation.md`,
    'did': `${GITHUB_RAW_BASE}/docs/did.md`,
    'psm': `${GITHUB_RAW_BASE}/docs/psm.md`,
    'rdd': `${GITHUB_RAW_BASE}/docs/rdd.md`,
    'iv': `${GITHUB_RAW_BASE}/docs/iv.md`,
    'var': `${GITHUB_RAW_BASE}/docs/var.md`,
    'gmm': `${GITHUB_RAW_BASE}/docs/gmm.md`,
    'dsge': `${GITHUB_RAW_BASE}/docs/dsge.md`,
    'reliability': `${GITHUB_RAW_BASE}/docs/reliability.md`,
    'efa': `${GITHUB_RAW_BASE}/docs/efa.md`,
    'cfa': `${GITHUB_RAW_BASE}/docs/cfa.md`,
    'pca': `${GITHUB_RAW_BASE}/docs/pca.md`,
    'mds': `${GITHUB_RAW_BASE}/docs/mds.md`,
    'mediation': `${GITHUB_RAW_BASE}/docs/mediation.md`,
    'moderation': `${GITHUB_RAW_BASE}/docs/moderation.md`,
    'sem': `${GITHUB_RAW_BASE}/docs/sem.md`,
    'sna': `${GITHUB_RAW_BASE}/docs/sna.md`,
    'kmeans': `${GITHUB_RAW_BASE}/docs/kmeans.md`,
    'kmedoids': `${GITHUB_RAW_BASE}/docs/kmedoids.md`,
    'dbscan': `${GITHUB_RAW_BASE}/docs/dbscan.md`,
    'hdbscan': `${GITHUB_RAW_BASE}/docs/hdbscan.md`,
    'hca': `${GITHUB_RAW_BASE}/docs/hca.md`,
    'trend-analysis': `${GITHUB_RAW_BASE}/docs/trend-analysis.md`,
    'seasonal-decomposition': `${GITHUB_RAW_BASE}/docs/seasonal-decomposition.md`,
    'rolling-statistics': `${GITHUB_RAW_BASE}/docs/rolling-statistics.md`,
    'structural-break': `${GITHUB_RAW_BASE}/docs/structural-break.md`,
    'change-point': `${GITHUB_RAW_BASE}/docs/change-point.md`,
    'acf-pacf': `${GITHUB_RAW_BASE}/docs/acf-pacf.md`,
    'stationarity': `${GITHUB_RAW_BASE}/docs/stationarity.md`,
    'ljung-box': `${GITHUB_RAW_BASE}/docs/ljung-box.md`,
    'arch-lm-test': `${GITHUB_RAW_BASE}/docs/arch-lm-test.md`,
    'exponential-smoothing': `${GITHUB_RAW_BASE}/docs/exponential-smoothing.md`,
    'arima': `${GITHUB_RAW_BASE}/docs/arima.md`,
    'forecast-evaluation': `${GITHUB_RAW_BASE}/docs/forecast-evaluation.md`,
    'demand-forecasting': `${GITHUB_RAW_BASE}/docs/demand-forecasting.md`,
    'forecast-horizon': `${GITHUB_RAW_BASE}/docs/forecast-horizon.md`,
  };
  return mdFiles[analysisId] || '';
};

interface DownloadButtonProps {
  url: string;
  fileName: string;
  label: string;
  icon: React.ReactNode;
}

const DownloadButton: React.FC<DownloadButtonProps> = ({ url, fileName, label, icon }) => {
  const { toast } = useToast();
  const hasFile = !!url;

  const handleDownload = async () => {
    if (!url) {
      toast({ variant: 'destructive', title: 'Not Available', description: 'Documentation not available yet' });
      return;
    }
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch');
      
      const text = await response.text();
      const blob = new Blob([text], { type: 'text/markdown' });
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      
      toast({ title: 'Downloaded!', description: 'Documentation file saved' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to download file' });
    }
  };

  if (!hasFile) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={handleDownload}
    >
      {icon}
      {label}
    </Button>
  );
};


export default function CrosscheckingPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // 같은 필드 클릭시 방향 전환
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // 다른 필드 클릭시 해당 필드로 오름차순 정렬
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="ml-1 h-4 w-4 text-muted-foreground" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="ml-1 h-4 w-4" />
      : <ChevronDown className="ml-1 h-4 w-4" />;
  };

  const filteredAndSortedAnalyses = useMemo(() => {
    let result = allAnalysisData;

    // 검색 필터
    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      result = result.filter(analysis =>
        analysis.name.toLowerCase().includes(lowercasedTerm) ||
        analysis.category.toLowerCase().includes(lowercasedTerm) ||
        (analysis.subCategory && analysis.subCategory.toLowerCase().includes(lowercasedTerm))
      );
    }

    // 정렬
    if (sortField) {
      result = [...result].sort((a, b) => {
        let valueA: string;
        let valueB: string;

        if (sortField === 'name') {
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
        } else if (sortField === 'category') {
          valueA = `${a.category}-${a.subCategory || ''}`.toLowerCase();
          valueB = `${b.category}-${b.subCategory || ''}`.toLowerCase();
        } else {
          return 0;
        }

        if (sortDirection === 'asc') {
          return valueA.localeCompare(valueB);
        } else {
          return valueB.localeCompare(valueA);
        }
      });
    }

    return result;
  }, [searchTerm, sortField, sortDirection]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-7xl mx-auto">
        <div className="mb-6">
          <Button asChild variant="outline">
            <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
          </Button>
        </div>
        <Card className="w-full shadow-lg">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <CheckSquare className="w-8 h-8 text-primary" />
              </div>
            </div>
            <div className="text-center">
              <CardTitle className="font-headline text-3xl">Statistical Documentation</CardTitle>
              <CardDescription className="text-base mt-2">
                Cross-checking reports and technical documentation for all statistical analyses.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6 text-center max-w-3xl mx-auto">
              Download cross-checking reports (validated against Python packages) and technical documentation for each analysis method.
            </p>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by analysis name, category, or sub-category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 font-semibold"
                        onClick={() => handleSort('name')}
                      >
                        Analysis Name
                        {getSortIcon('name')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 font-semibold"
                        onClick={() => handleSort('category')}
                      >
                        Category
                        {getSortIcon('category')}
                      </Button>
                    </TableHead>
                    <TableHead>Python Packages</TableHead>
                    <TableHead className="text-center">Cross-check</TableHead>
                    <TableHead className="text-center">Technical Docs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedAnalyses.map((analysis) => (
                    <TableRow key={analysis.id}>
                      <TableCell className="font-medium">{analysis.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline">{analysis.category}</Badge>
                          {analysis.subCategory && (
                            <Badge variant="secondary" className="text-xs">{analysis.subCategory}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {analysis.pythonPackages.map(pkg => (
                            <Badge key={pkg} variant="secondary" className="font-mono text-xs">{pkg}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <DownloadButton
                          url={analysis.hasCrossCheck ? getCrossCheckUrl(analysis.id) : ''}
                          fileName={`${analysis.id}_crosscheck.md`}
                          label="Download"
                          icon={<Download className="mr-2 h-4 w-4" />}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <DownloadButton
                          url={getTechnicalDocsUrl(analysis.id)}
                          fileName={`${analysis.id}_docs.md`}
                          label="Download"
                          icon={<FileText className="mr-2 h-4 w-4" />}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}