'use client';
import { useState, useMemo, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { calculateCorrelationMatrix } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Sigma } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CorrelationPageProps {
    data: DataSet;
    numericHeaders: string[];
}

export default function CorrelationPage({ data, numericHeaders }: CorrelationPageProps) {
  const [selectedHeaders, setSelectedHeaders] = useState<string[]>(numericHeaders.slice(0, 5));
  const [results, setResults] = useState<{ headers: string[], matrix: (number | null)[][] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectionChange = (header: string, checked: boolean) => {
    setSelectedHeaders(prev => 
      checked ? [...prev, header] : prev.filter(h => h !== header)
    );
  };
  
  const handleAnalysis = useCallback(() => {
    if (selectedHeaders.length < 2) {
      alert("Please select at least two numeric variables for correlation analysis.");
      return;
    }
    setIsLoading(true);
    // Simulate async operation if needed, or just calculate
    const matrix = calculateCorrelationMatrix(data, selectedHeaders);
    setResults({ headers: selectedHeaders, matrix });
    setIsLoading(false);
  }, [data, selectedHeaders]);

  const canRun = useMemo(() => {
    return data.length > 0 && numericHeaders.length >= 2;
  }, [data, numericHeaders]);

  if (!canRun) {
    return (
      <div className="flex flex-1 items-center justify-center">
          <Card className="w-full max-w-lg text-center">
              <CardHeader>
                  <CardTitle className="font-headline">상관 관계 분석</CardTitle>
                  <CardDescription>
                      상관 관계 분석을 수행하려면 최소 2개 이상의 숫자형 변수가 포함된 데이터를 업로드해야 합니다.
                  </CardDescription>
              </CardHeader>
          </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">상관 관계 분석 설정</CardTitle>
          <CardDescription>분석할 숫자형 변수들을 선택한 후 '분석 실행' 버튼을 클릭하세요. (2개 이상 선택)</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
            <ScrollArea className="h-48 border rounded-md p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {numericHeaders.map(header => (
                  <div key={header} className="flex items-center space-x-2">
                    <Checkbox
                      id={`corr-${header}`}
                      checked={selectedHeaders.includes(header)}
                      onCheckedChange={(checked) => handleSelectionChange(header, checked as boolean)}
                    />
                    <label htmlFor={`corr-${header}`} className="text-sm font-medium leading-none">
                      {header}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
           <Button onClick={handleAnalysis} className="w-full md:w-auto self-end" disabled={selectedHeaders.length < 2}>
              <Sigma className="mr-2"/>
              분석 실행
            </Button>
        </CardContent>
      </Card>
      
      {isLoading && <Card><CardHeader><CardTitle>Loading...</CardTitle></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>}

      {results && !isLoading && (
        <Card>
          <CardHeader>
              <CardTitle className="font-headline">상관 행렬</CardTitle>
              <CardDescription>피어슨 상관 계수 (-1: 완전 음의 상관, 1: 완전 양의 상관)</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-auto max-h-[70vh] w-full">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead></TableHead>
                            {results.headers.map(h => <TableHead key={h} className="text-center">{h}</TableHead>)}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {results.headers.map((h1, i) => (
                            <TableRow key={h1}>
                                <TableHead>{h1}</TableHead>
                                {results.headers.map((h2, j) => {
                                    const value = results.matrix[i]?.[j];
                                    const isSignificant = value !== null && !isNaN(value) && Math.abs(value) > 0.5;
                                    const colorClass = !isNaN(value as number) && value !== null
                                        ? value > 0 ? `bg-sky-100/50 dark:bg-sky-900/50` : `bg-red-100/50 dark:bg-red-900/50`
                                        : '';
                                    const opacity = !isNaN(value as number) && value !== null ? Math.abs(value!) * 0.7 + 0.3 : 1;
                                    
                                    return (
                                        <TableCell key={h2} className={`text-center font-mono transition-colors ${colorClass}`} style={{opacity: opacity}}>
                                          <Badge variant={isSignificant ? 'default' : 'secondary'} className="w-20 justify-center">
                                            {value !== null && value !== undefined ? isNaN(value) ? 'N/A' : value.toFixed(3) : '-'}
                                          </Badge>
                                        </TableCell>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
      {!results && !isLoading && (
        <div className="text-center text-muted-foreground py-10">
          <p>분석할 변수를 선택하고 '분석 실행' 버튼을 클릭하세요.</p>
        </div>
      )}
    </div>
  )
}
