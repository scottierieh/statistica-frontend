'use client';
import { useState, useMemo, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { calculateDescriptiveStats } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Sigma } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DescriptiveStatsPageProps {
    data: DataSet;
    allHeaders: string[];
    numericHeaders: string[];
}

const formatValue = (value: any) => {
    if (typeof value === 'number') {
        if (Number.isInteger(value)) return value.toString();
        return value.toFixed(3);
    }
    if (Array.isArray(value)) {
        const formattedValues = value.map(v => typeof v === 'number' ? v.toFixed(2) : String(v));
        if (formattedValues.length > 3) {
            return `${formattedValues.slice(0,3).join(', ')}...`;
        }
        return formattedValues.join(', ');
    }
    if (value === 'N/A' || value === undefined || value === null || (typeof value === 'number' && isNaN(value))) {
        return '-';
    }
    return String(value);
}

const StatCard = ({ title, data, isNumeric }: { title: string; data: any; isNumeric: boolean }) => (
  <Card>
    <CardHeader>
      <CardTitle className="font-headline">{title}</CardTitle>
      <CardDescription>{isNumeric ? "숫자형" : "범주형"}</CardDescription>
    </CardHeader>
    <CardContent>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {Object.entries(data).map(([key, value]) => {
          const formattedKey = key
            .replace('p25', '25분위')
            .replace('p75', '75분위')
            .replace('iqr', 'IQR')
            .replace('stdDev', '표준편차')
            .replace('mean', '평균')
            .replace('median', '중앙값')
            .replace('variance', '분산')
            .replace('min', '최소값')
            .replace('max', '최대값')
            .replace('range', '범위')
            .replace('count', '개수')
            .replace('mode', '최빈값')
            .replace('skewness', '왜도')
            .replace('kurtosis', '첨도')
            .replace('unique', '고유값 수');
            
          return (
            <>
              <dt className="capitalize text-muted-foreground">{formattedKey}</dt>
              <dd className="font-mono text-right flex justify-end items-center gap-1">
                  {Array.isArray(value) && value.length > 0 ? (
                      <div className="flex flex-wrap gap-1 justify-end">
                          {(value as any[]).map((v, i) => <Badge key={i} variant="secondary">{formatValue(v)}</Badge>)}
                      </div>
                  ) : (
                      formatValue(value)
                  )}
              </dd>
            </>
          )
        })}
      </dl>
    </CardContent>
  </Card>
);

export default function DescriptiveStatsPage({ data, allHeaders, numericHeaders }: DescriptiveStatsPageProps) {
  const [selectedHeaders, setSelectedHeaders] = useState<string[]>(allHeaders);
  const [stats, setStats] = useState<Record<string, any> | null>(null);
  
  const handleSelectionChange = (header: string, checked: boolean) => {
    setSelectedHeaders(prev => 
      checked ? [...prev, header] : prev.filter(h => h !== header)
    );
  };

  const handleAnalysis = useCallback(() => {
    const result = calculateDescriptiveStats(data, selectedHeaders);
    setStats(result);
  }, [data, selectedHeaders]);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">기술 통계 분석 설정</CardTitle>
          <CardDescription>분석할 변수들을 선택한 후 '분석 실행' 버튼을 클릭하세요.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
            <ScrollArea className="h-48 border rounded-md p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {allHeaders.map(header => (
                  <div key={header} className="flex items-center space-x-2">
                    <Checkbox
                      id={`stats-${header}`}
                      checked={selectedHeaders.includes(header)}
                      onCheckedChange={(checked) => handleSelectionChange(header, checked as boolean)}
                    />
                    <label htmlFor={`stats-${header}`} className="text-sm font-medium leading-none">
                      {header}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
           <Button onClick={handleAnalysis} className="w-full md:w-auto self-end">
              <Sigma className="mr-2"/>
              분석 실행
            </Button>
        </CardContent>
      </Card>
      
      {stats ? (
        <ScrollArea className="h-full">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pr-4">
              {Object.keys(stats).length > 0 ? (
                Object.keys(stats).map((header) => (
                    <StatCard key={header} title={header} data={stats[header]} isNumeric={numericHeaders.includes(header)} />
                ))
              ) : (
                <div className="col-span-full text-center text-muted-foreground">
                    <p>결과가 없습니다.</p>
                </div>
              )}
            </div>
        </ScrollArea>
      ) : (
        <div className="text-center text-muted-foreground py-10">
          <p>분석할 변수를 선택하고 '분석 실행' 버튼을 클릭하세요.</p>
        </div>
      )}
    </div>
  )
}
