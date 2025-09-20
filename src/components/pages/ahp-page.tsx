
'use client';
import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Sigma, Loader2, Plus, Trash2, Network, BarChart, AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { ChartContainer, ChartTooltipContent } from '../ui/chart';
import { ResponsiveContainer, BarChart as RechartsBarChart, XAxis, YAxis, Tooltip, Legend, Bar, Cell } from 'recharts';

interface AHPResult {
  goal: string;
  criteria_analysis: AnalysisBlock;
  alternatives_analysis: { [key: string]: AnalysisBlock };
  synthesis: {
    global_weights: { [key: string]: number };
    ranking: [string, number][];
  };
}

interface AnalysisBlock {
  priority_vector: number[];
  lambda_max: number;
  consistency_index: number;
  consistency_ratio: number;
  is_consistent: boolean;
}

const SAATY_SCALE = [
  { value: 9, label: "9: Absolute" },
  { value: 8, label: "8" },
  { value: 7, label: "7: Very Strong" },
  { value: 6, label: "6" },
  { value: 5, label: "5: Strong" },
  { value: 4, label: "4" },
  { value: 3, label: "3: Moderate" },
  { value: 2, label: "2" },
  { value: 1, label: "1: Equal" },
];

const ComparisonMatrix = ({ title, items, onMatrixChange }: { title: string, items: string[], onMatrixChange: (matrix: number[][]) => void }) => {
  const [matrix, setMatrix] = useState<number[][]>(() => {
    const size = items.length;
    return Array(size).fill(0).map(() => Array(size).fill(1));
  });

  const handleSliderChange = (value: number, i: number, j: number) => {
    const newMatrix = matrix.map(row => [...row]);
    if (value === 1) {
      newMatrix[i][j] = 1;
      newMatrix[j][i] = 1;
    } else if (value > 1) { // Row item is more important
      newMatrix[i][j] = value;
      newMatrix[j][i] = 1 / value;
    } else { // Column item is more important
      newMatrix[i][j] = 1 / (2 - value); // Map [0,1) to (1, inf)
      newMatrix[j][i] = (2 - value);
    }
    setMatrix(newMatrix);
    onMatrixChange(newMatrix);
  };
  
   const getSliderValue = (val: number) => {
      if (val >= 1) return val;
      return 2 - (1/val);
  }

  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        {items.map((item1, i) =>
          items.map((item2, j) => {
            if (i >= j) return null;
            const sliderValue = getSliderValue(matrix[i][j]);
            
            return (
              <div key={`${i}-${j}`} className="mb-4">
                <Label className="flex justify-between text-sm">
                    <span>{item1}</span>
                    <span>{item2}</span>
                </Label>
                <div className="flex items-center gap-4">
                    <Slider
                        min={-8}
                        max={9}
                        step={1}
                        value={[sliderValue > 1 ? sliderValue : 2 - sliderValue]}
                        onValueChange={([val]) => handleSliderChange(val > 1 ? val : (2-val), i, j)}
                        className="w-full"
                    />
                </div>
                 <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Favors {item1} →</span>
                    <span>Favors {item2} ←</span>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};


export default function AhpPage() {
  const { toast } = useToast();
  const [goal, setGoal] = useState("Select the best new car");
  const [criteria, setCriteria] = useState<string[]>(["Price", "Performance", "Style"]);
  const [alternatives, setAlternatives] = useState<string[]>(["Car A", "Car B", "Car C"]);
  
  const [comparisonMatrices, setComparisonMatrices] = useState<any>({});
  
  const [analysisResult, setAnalysisResult] = useState<AHPResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const handleMatrixChange = (key: string, matrix: number[][]) => {
    setComparisonMatrices((prev: any) => ({
      ...prev,
      [key]: matrix,
    }));
  };

  const handleRunAnalysis = async () => {
    setIsLoading(true);
    try {
        const response = await fetch('/api/analysis/ahp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ goal, criteria, alternatives, comparison_matrices: comparisonMatrices })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Analysis failed");
        }
        const result = await response.json();
        setAnalysisResult(result);
        setCurrentStep(1);
    } catch(e: any) {
        toast({ title: "Analysis Error", description: e.message, variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

  const results = analysisResult;
  const isConsistent = results ? results.criteria_analysis.is_consistent && Object.values(results.alternatives_analysis).every(a => a.is_consistent) : true;

  const renderResults = () => {
    if(!results) return null;

    const rankingData = results.synthesis.ranking.map(([name, value]) => ({ name, value }));

    return (
        <div className="space-y-4">
             <Alert variant={isConsistent ? "default" : "destructive"}>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{isConsistent ? "Consistent Judgements" : "Inconsistency Detected"}</AlertTitle>
                <AlertDescription>
                    {isConsistent 
                        ? "All pairwise comparisons meet the consistency threshold (CR < 0.1)." 
                        : "One or more of your comparison matrices are inconsistent (CR >= 0.1). Review your judgements."}
                </AlertDescription>
            </Alert>
            <Card>
                <CardHeader><CardTitle>Final Ranking</CardTitle></CardHeader>
                <CardContent>
                    <ChartContainer config={{value: { label: "Weight" }}} className="w-full h-64">
                         <ResponsiveContainer>
                            <RechartsBarChart data={rankingData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={80} />
                                <Tooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="value" name="Global Weight" fill="hsl(var(--primary))" />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Criteria Weights & Consistency</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Criterion</TableHead><TableHead className="text-right">Weight</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {criteria.map((c, i) => (
                                <TableRow key={c}><TableCell>{c}</TableCell><TableCell className="font-mono text-right">{results.criteria_analysis.priority_vector[i].toFixed(4)}</TableCell></TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <p className="text-sm mt-2 text-muted-foreground">Consistency Ratio (CR): {results.criteria_analysis.consistency_ratio.toFixed(4)}</p>
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="space-y-4">
      {currentStep === 0 && (
         <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><Network /> Analytic Hierarchy Process (AHP)</CardTitle>
                <CardDescription>Structure your decision problem by defining your goal, criteria, and alternatives.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <Label htmlFor="goal">Goal</Label>
                    <Input id="goal" value={goal} onChange={e => setGoal(e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="criteria">Criteria (comma-separated)</Label>
                    <Input id="criteria" value={criteria.join(', ')} onChange={e => setCriteria(e.target.value.split(',').map(s => s.trim()))} />
                </div>
                <div>
                    <Label htmlFor="alternatives">Alternatives (comma-separated)</Label>
                    <Input id="alternatives" value={alternatives.join(', ')} onChange={e => setAlternatives(e.target.value.split(',').map(s => s.trim()))} />
                </div>

                <div className="space-y-4">
                    <h3 className="font-semibold">Pairwise Comparisons</h3>
                    <ComparisonMatrix title="Criteria Comparison" items={criteria} onMatrixChange={(m) => handleMatrixChange('criteria', m)} />
                    {criteria.map(criterion => (
                        <ComparisonMatrix key={criterion} title={`Alternatives Comparison for '${criterion}'`} items={alternatives} onMatrixChange={(m) => handleMatrixChange(`alternatives.${criterion}`, m)} />
                    ))}
                </div>
            </CardContent>
             <CardFooter className="flex justify-end">
                <Button onClick={handleRunAnalysis} disabled={isLoading || criteria.length < 2 || alternatives.length < 2}>
                    {isLoading ? <><Loader2 className="mr-2 animate-spin" /> Analyzing...</> : <><Sigma className="mr-2" />Run Analysis</>}
                </Button>
            </CardFooter>
        </Card>
      )}

      {currentStep === 1 && (
        <div className="space-y-4">
            {isLoading ? <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card> : renderResults()}
            <Button variant="outline" onClick={() => setCurrentStep(0)}>Back to Setup</Button>
        </div>
      )}
    </div>
  );
}

