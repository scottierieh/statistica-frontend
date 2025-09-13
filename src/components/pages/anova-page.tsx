'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { calculateAnova } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { getAnovaInterpretation } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sigma } from 'lucide-react';

interface AnovaPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
}

const AIGeneratedInterpretation = ({ promise }: { promise: Promise<string | null> | null }) => {
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!promise) {
        setInterpretation(null);
        setLoading(false);
        return;
    }
    let isMounted = true;
    setLoading(true);
    promise.then((desc) => {
        if (isMounted) {
            setInterpretation(desc);
            setLoading(false);
        }
    });
    return () => { isMounted = false; };
  }, [promise]);
  
  if (loading) return <Skeleton className="h-24 w-full" />;
  if (!interpretation) return null;

  return <CardDescription className="prose prose-sm dark:prose-invert whitespace-pre-wrap">{interpretation}</CardDescription>;
};

export default function AnovaPage({ data, numericHeaders, categoricalHeaders }: AnovaPageProps) {
    const { toast } = useToast();
    const [groupVar, setGroupVar] = useState(categoricalHeaders[0]);
    const [valueVar, setValueVar] = useState(numericHeaders[0]);
    const [anovaResult, setAnovaResult] = useState<any>(null);
    const [aiPromise, setAiPromise] = useState<Promise<string|null> | null>(null);

    const canRun = useMemo(() => {
      return numericHeaders.length > 0 && categoricalHeaders.length > 0;
    }, [numericHeaders, categoricalHeaders]);

    const handleAnalysis = useCallback(() => {
        if (!groupVar || !valueVar) {
            toast({variant: 'destructive', title: '변수 선택 오류', description: '그룹 변수와 값 변수를 모두 선택해주세요.'});
            return;
        };
        try {
            const result = calculateAnova(data, groupVar, valueVar);
            if (!result) {
                toast({variant: 'destructive', title: 'ANOVA 계산 오류', description: '분산 분석을 계산할 수 없습니다. 그룹에 데이터가 충분한지 확인하세요.'});
                setAnovaResult(null);
                setAiPromise(null);
                return;
            }
            setAnovaResult(result);

            const promise = getAnovaInterpretation({
                fStat: result.fStat,
                pValue: result.pValue,
                groupVar: groupVar,
                valueVar: valueVar
            }).then(res => {
                if (res.success) {
                    return res.interpretation ?? null;
                }
                toast({variant: 'destructive', title: 'AI 해석 오류', description: res.error});
                return null;
            });
            setAiPromise(promise);

        } catch(e: any) {
            console.error(e);
            toast({variant: 'destructive', title: 'ANOVA 오류', description: e.message || '데이터 형식을 확인해주세요.'})
            setAnovaResult(null);
            setAiPromise(null);
        }
    }, [data, groupVar, valueVar, toast]);

    if (!canRun) {
      return (
        <div className="flex flex-1 items-center justify-center">
            <Card className="w-full max-w-lg text-center">
                <CardHeader>
                    <CardTitle className="font-headline">분산 분석 (ANOVA)</CardTitle>
                    <CardDescription>
                        분산 분석을 수행하려면 최소 하나 이상의 숫자형 변수와 하나 이상의 범주형 변수가 포함된 데이터를 업로드해야 합니다.
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
                    <CardTitle className="font-headline">분산 분석 (ANOVA) 설정</CardTitle>
                    <CardDescription>
                        그룹 간 평균 차이를 비교하기 위해 그룹 변수(범주형)와 값 변수(숫자형)를 선택한 후, '분석 실행' 버튼을 클릭하세요.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <div className="grid md:grid-cols-2 gap-4 items-center">
                        <div>
                            <label className="text-sm font-medium mb-1 block">그룹 변수 (범주형)</label>
                            <Select value={groupVar} onValueChange={setGroupVar}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">값 변수 (숫자형)</label>
                            <Select value={valueVar} onValueChange={setValueVar}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                    <Button onClick={handleAnalysis} className="w-full md:w-auto self-end">
                        <Sigma className="mr-2"/>
                        분석 실행
                    </Button>
                </CardContent>
            </Card>

            {anovaResult ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">분산 분석 결과</CardTitle>
                        <AIGeneratedInterpretation promise={aiPromise}/>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader><CardTitle className="text-lg">요약</CardTitle></CardHeader>
                                <CardContent>
                                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                        <dt className="text-muted-foreground">F-통계량</dt>
                                        <dd className="font-mono text-right">{anovaResult.fStat.toFixed(4)}</dd>
                                        <dt className="text-muted-foreground">p-값</dt>
                                        <dd className="font-mono text-right flex justify-end items-center gap-2">
                                            {anovaResult.pValue < 0.0001 ? "< 0.0001" : anovaResult.pValue.toFixed(4)}
                                            {anovaResult.pValue < 0.05 && <Badge variant="destructive">유의함</Badge>}
                                        </dd>
                                    </dl>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle className="text-lg">ANOVA 테이블</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>요인</TableHead>
                                                <TableHead className="text-right">자유도</TableHead>
                                                <TableHead className="text-right">제곱합</TableHead>
                                                <TableHead className="text-right">평균제곱</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell>그룹 간</TableCell>
                                                <TableCell className="text-right font-mono">{anovaResult.dfBetween}</TableCell>
                                                <TableCell className="text-right font-mono">{anovaResult.ssb.toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-mono">{anovaResult.msb.toFixed(2)}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell>그룹 내</TableCell>
                                                <TableCell className="text-right font-mono">{anovaResult.dfWithin}</TableCell>
                                                <TableCell className="text-right font-mono">{anovaResult.ssw.toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-mono">{anovaResult.msw.toFixed(2)}</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                        
                        <div>
                            <h3 className="font-semibold mb-2">그룹별 통계</h3>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>그룹 ({groupVar})</TableHead>
                                        <TableHead className="text-right">개수</TableHead>
                                        <TableHead className="text-right">평균</TableHead>
                                        <TableHead className="text-right">표준편차</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(anovaResult.groupStats).map(([groupName, stats]: [string, any]) => (
                                        <TableRow key={groupName}>
                                            <TableCell>{groupName}</TableCell>
                                            <TableCell className="text-right font-mono">{stats.n}</TableCell>
                                            <TableCell className="text-right font-mono">{stats.mean.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">{stats.stdDev.toFixed(3)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                 <div className="text-center text-muted-foreground py-10">
                    <p>분석할 변수를 선택하고 '분석 실행' 버튼을 클릭하세요.</p>
                </div>
            )}
        </div>
    );
}
