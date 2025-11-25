'use client';
import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Sigma, Loader2, Play, FileJson, Asterisk, HelpCircle, Settings, FileSearch, Bot, Download, Activity, Info, TrendingUp, Target, CheckCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { BookOpen } from 'lucide-react';
import Papa from 'papaparse';
import { Badge } from '../ui/badge';

interface LpResult {
    primal_solution?: number[];
    solution?: number[]; // For MILP
    primal_optimal_value?: number;
    optimal_value?: number; // For MILP
    success: boolean;
    message?: string;
    interpretation?: string;
    plot?: string;
    sensitivity?: {
        slack: number[];
        shadow_prices_ub: number[];
        shadow_prices_eq: number[];
    };
    dual_problem?: {
        objective: string;
        c: number[];
        A: number[][];
        b: number[];
        constraint_types: string[];
    };
    dual_solution?: {
        solution: number[];
        optimal_value: number;
    };
}

interface FullAnalysisResponse extends LpResult {
    interpretations?: {
        overall_analysis: string;
        optimization_insights: string[];
        recommendations: string;
    };
}

// Statistical Summary Cards Component
const OptimizationSummaryCards = ({ result, numVars, numConstraints }: { result: LpResult, numVars: number, numConstraints: number }) => {
    const primalSolution = result.primal_solution ?? result.solution;
    const optimalValue = result.primal_optimal_value ?? result.optimal_value;
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Optimal Value Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Optimal Value
                            </p>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold text-primary">
                            {optimalValue?.toFixed(2) ?? 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Objective function Z*
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Variables Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Variables
                            </p>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {numVars}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Decision variables
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Constraints Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Constraints
                            </p>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {numConstraints}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Resource limitations
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Status Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Status
                            </p>
                            {result.success ? 
                                <CheckCircle className="h-4 w-4 text-green-600" /> :
                                <Info className="h-4 w-4 text-red-600" />
                            }
                        </div>
                        <p className="text-2xl font-semibold">
                            {result.success ? 'Optimal' : 'Failed'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Solution found
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Analysis Overview Component
const OptimizationOverview = ({ numVars, numConstraints, objective, problemType }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        overview.push(`${numVars} decision variable${numVars > 1 ? 's' : ''}`);
        overview.push(`${numConstraints} constraint${numConstraints > 1 ? 's' : ''}`);
        overview.push(`Objective: ${objective === 'maximize' ? 'Maximize' : 'Minimize'}`);
        overview.push(`Type: ${problemType === 'lp' ? 'Linear Programming' : 'Integer Programming'}`);
        overview.push('Method: Simplex algorithm');
        overview.push('Finds optimal resource allocation');
        overview.push('Best for: Production planning, resource optimization');

        return overview;
    }, [numVars, numConstraints, objective, problemType]);

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Overview</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-1 text-sm text-muted-foreground">
                    {items.map((item, idx) => (
                        <li key={idx} className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
};

// Generate interpretations
const generateLpInterpretations = (result: LpResult, objective: string, c: number[], decisionVars: string[]) => {
    const insights: string[] = [];
    
    const primalSolution = result.primal_solution ?? result.solution;
    const optimalValue = result.primal_optimal_value ?? result.optimal_value;
    
    // Overall analysis
    let overall = '';
    if (result.success && primalSolution && optimalValue !== undefined) {
        overall = `<strong>Optimal solution found successfully.</strong> The ${objective === 'maximize' ? 'maximum' : 'minimum'} value of the objective function is ${optimalValue.toFixed(2)}. This represents the best possible outcome given your constraints. The optimal resource allocation has been determined for all ${primalSolution.length} decision variables.`;
    } else {
        overall = `<strong>No feasible solution exists.</strong> The problem constraints are incompatible, meaning there is no combination of variable values that satisfies all constraints simultaneously. This could indicate: (1) Constraints are too restrictive, (2) Conflicting requirements exist, (3) Problem setup needs revision.`;
    }
    
    // Solution values insight
    if (result.success && primalSolution) {
        const nonZeroVars = primalSolution.filter(v => Math.abs(v) > 0.0001);
        const zeroVars = primalSolution.length - nonZeroVars.length;
        
        insights.push(`<strong>Decision Variables:</strong> Out of ${primalSolution.length} variables, ${nonZeroVars.length} have non-zero optimal values. ${zeroVars > 0 ? `${zeroVars} variable${zeroVars > 1 ? 's are' : ' is'} set to zero, indicating ${zeroVars > 1 ? 'they are' : 'it is'} not used in the optimal solution.` : 'All variables are actively used in the optimal solution.'}`);
        
        // Identify most important variables
        const contributions = primalSolution.map((val, i) => ({
            var: decisionVars[i],
            value: val,
            contribution: Math.abs(val * c[i])
        }));
        const sortedContributions = contributions.sort((a, b) => b.contribution - a.contribution);
        const topVar = sortedContributions[0];
        
        if (topVar.contribution > 0) {
            insights.push(`<strong>Key Variable:</strong> ${topVar.var} = ${topVar.value.toFixed(4)} makes the largest contribution (${topVar.contribution.toFixed(2)}) to the objective function. This variable is the most critical in achieving the optimal outcome.`);
        }
    }
    
    // Objective value insight
    if (result.success && optimalValue !== undefined) {
        const objType = objective === 'maximize' ? 'maximum profit/benefit' : 'minimum cost';
        insights.push(`<strong>Objective Value:</strong> Z* = ${optimalValue.toFixed(2)} represents the ${objType} achievable under the given constraints. This is the best possible outcome - no other feasible solution can ${objective === 'maximize' ? 'exceed' : 'undercut'} this value.`);
    }
    
    // Sensitivity insight
    if (result.sensitivity) {
        const activeConstraints = result.sensitivity.slack?.filter(s => Math.abs(s) < 0.0001).length ?? 0;
        const totalConstraints = result.sensitivity.slack?.length ?? 0;
        
        if (activeConstraints > 0) {
            insights.push(`<strong>Binding Constraints:</strong> ${activeConstraints} out of ${totalConstraints} constraints are binding (fully utilized). These represent bottleneck resources. Relaxing these constraints would improve the optimal value.`);
        } else if (totalConstraints > 0) {
            insights.push(`<strong>Constraint Slack:</strong> All constraints have slack, meaning resources are not fully utilized. The optimal solution is determined by variable bounds rather than resource constraints.`);
        }
    }
    
    // Recommendations
    let recommendations = '';
    if (!result.success) {
        recommendations = 'No feasible solution exists. Actions needed: (1) Review constraint compatibility - some constraints may contradict each other, (2) Check if constraint values (right-hand sides) are realistic, (3) Verify constraint inequality directions (≤, ≥, =) are correct, (4) Consider relaxing one or more constraints, (5) Add slack variables to convert strict inequalities, (6) Re-examine the problem formulation to ensure it accurately represents your real-world situation. An infeasible problem often indicates missing information or conflicting requirements.';
    } else if (primalSolution && primalSolution.some(v => Math.abs(v) < 0.0001)) {
        const unusedCount = primalSolution.filter(v => Math.abs(v) < 0.0001).length;
        recommendations = `${unusedCount} variable${unusedCount > 1 ? 's are' : ' is'} not used in the optimal solution (set to zero). Consider: (1) These variables may represent unprofitable activities or inefficient resource uses, (2) Review if these variables are necessary in your model, (3) Check if objective function coefficients accurately reflect true values/costs, (4) Examine if constraints are limiting the use of these variables, (5) Sensitivity analysis can reveal how much coefficients need to change before these variables enter the solution. For business decisions, zero-valued variables suggest activities or products to avoid or discontinue.`;
    } else if (result.sensitivity && result.sensitivity.slack) {
        const hasSlack = result.sensitivity.slack.some(s => Math.abs(s) > 0.0001);
        if (hasSlack) {
            recommendations = 'Some constraints have slack (unused capacity). Opportunities: (1) Identify which resources are underutilized, (2) Consider reducing resource acquisition for constraints with high slack to cut costs, (3) Reallocate excess resources to other uses or time periods, (4) For binding constraints, investigate the value of acquiring more resources (shadow prices indicate this value), (5) Perform "what-if" analysis by tightening slack constraints to see impact on objective, (6) Review if slack resources represent hidden costs that should be minimized. Efficient operations typically have most strategic constraints near binding.';
        } else {
            recommendations = 'All constraints are binding (fully utilized). This indicates: (1) Highly efficient resource usage - no waste, (2) System is at full capacity, (3) Acquiring additional resources would directly improve the objective (check shadow prices for value), (4) Small changes in constraint values will significantly impact optimal value, (5) System is sensitive to disruptions - no buffer capacity, (6) Consider building some slack for flexibility and robustness. While efficient, zero slack can make operations vulnerable to uncertainties.';
        }
    } else {
        recommendations = 'Optimal solution found successfully. Implement this solution for best results. Next steps: (1) Validate that the optimal values are practically implementable in your context, (2) Perform sensitivity analysis to understand how changes in parameters affect the solution, (3) Consider robust optimization if parameters are uncertain, (4) Document assumptions and communicate constraints clearly to stakeholders, (5) Monitor actual performance against predicted optimal value, (6) Update the model periodically as conditions change. Linear programming provides mathematically optimal solutions, but real-world implementation may require rounding or adjustments.';
    }
    
    return {
        overall_analysis: overall,
        optimization_insights: insights,
        recommendations: recommendations
    };
};

// Enhanced Intro Page
const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: () => void }) => {
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Sigma className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Linear Programming</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Mathematical optimization for resource allocation and decision making
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Objective</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Maximize profit or minimize cost
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Constraints</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Resource limitations and requirements
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <CheckCircle className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Solution</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Optimal variable values
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use Linear Programming
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Linear programming is a mathematical technique for finding the best outcome (maximum profit or 
                            minimum cost) in a model with linear relationships. It's widely used in business, engineering, 
                            and economics for resource allocation, production planning, supply chain optimization, diet 
                            planning, and financial portfolio management. The Simplex algorithm efficiently finds the optimal 
                            solution by moving along the edges of the feasible region to the best vertex.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-primary" />
                                    Requirements
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Objective:</strong> Linear function to optimize</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Variables:</strong> Decision variables (≥0)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Constraints:</strong> Linear inequalities/equalities</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Feasibility:</strong> Solution space exists</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <FileSearch className="w-4 h-4 text-primary" />
                                    Understanding Results
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Optimal Value:</strong> Best objective outcome</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Solution:</strong> Variable values achieving optimum</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Slack:</strong> Unused resource capacity</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Shadow Prices:</strong> Value of additional resources</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center gap-4 pt-2">
                        <Button onClick={onLoadExample} variant="outline" size="lg">
                            <FileJson className="mr-2 h-5 w-5" />
                            Load Example
                        </Button>
                        <Button onClick={onStart} size="lg">
                            <Sigma className="mr-2 h-5 w-5" />
                            Start Optimizing
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default function LinearProgrammingPage() {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [numVars, setNumVars] = useState(2);
    const [numConstraints, setNumConstraints] = useState(2);
    const [objective, setObjective] = useState<'maximize' | 'minimize'>('maximize');
    const [problemType, setProblemType] = useState<'lp' | 'integer' | 'milp'>('lp');
    
    const [c, setC] = useState<number[]>([3, 2]);
    const [A, setA] = useState<number[][]>([[1, 1], [1, 0]]);
    const [b, setB] = useState<number[]>([4, 2]);
    const [constraintTypes, setConstraintTypes] = useState<string[]>(['<=', '<=']);
    const [variableTypes, setVariableTypes] = useState<string[]>(['continuous', 'continuous']);

    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);

    const decisionVars = React.useMemo(() => {
        if (numVars === 2) return ['x', 'y'];
        return Array.from({ length: numVars }, (_, i) => `x${i + 1}`);
    }, [numVars]);

    const handleBoardCreation = () => {
        const vars = Math.max(1, numVars);
        const constraints = Math.max(1, numConstraints);
        setC(Array(vars).fill(0));
        setA(Array(constraints).fill(null).map(() => Array(vars).fill(0)));
        setB(Array(constraints).fill(0));
        setConstraintTypes(Array(constraints).fill('<='));
        setVariableTypes(Array(vars).fill('continuous'));
        setAnalysisResult(null);
    };

    const handleLoadExample = () => {
        setNumVars(2);
        setNumConstraints(2);
        setObjective('maximize');
        setProblemType('lp');
        setC([3, 2]); 
        setA([[1, 1], [1, 0]]);
        setB([4, 2]);
        setConstraintTypes(['<=', '<=']);
        setVariableTypes(['continuous', 'continuous']);
        setAnalysisResult(null);
        setView('main');
        toast({ title: "Sample Data Loaded", description: "Example optimization problem has been set up." });
    };

    const handleMatrixChange = (val: string, i: number, j: number, type: 'A' | 'b' | 'c') => {
        const numVal = parseFloat(val) || 0;
        if (type === 'A') {
            const newA = [...A];
            newA[i][j] = numVal;
            setA(newA);
        } else if (type === 'b') {
            const newB = [...b];
            newB[i] = numVal;
            setB(newB);
        } else if (type === 'c') {
            const newC = [...c];
            newC[j] = numVal;
            setC(newC);
        }
    };
    
    const handleConstraintTypeChange = (i: number, value: string) => {
        const newTypes = [...constraintTypes];
        newTypes[i] = value;
        setConstraintTypes(newTypes);
    };
    
    const handleVariableTypeChange = (j: number, value: string) => {
        const newTypes = [...variableTypes];
        newTypes[j] = value;
        setVariableTypes(newTypes);
    };
    
    const handleAnalysis = useCallback(async () => {
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/linear-programming', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ c, A, b, constraint_types: constraintTypes, objective, problem_type: problemType, variable_types: variableTypes })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            // Generate interpretations
            const interpretations = generateLpInterpretations(result, objective, c, decisionVars);
            result.interpretations = interpretations;
            
            setAnalysisResult(result);
            
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [c, A, b, objective, problemType, variableTypes, constraintTypes, decisionVars, toast]);

    const handleDownloadResults = useCallback(() => {
        if (!analysisResult || !analysisResult.success) {
            toast({ title: "No Data to Download", description: "No optimal solution available." });
            return;
        }
        
        const primalSolution = analysisResult.primal_solution ?? analysisResult.solution;
        const optimalValue = analysisResult.primal_optimal_value ?? analysisResult.optimal_value;
        
        const exportData = decisionVars.map((varName, i) => ({
            variable: varName,
            optimal_value: primalSolution?.[i] ?? 0,
            objective_coefficient: c[i]
        }));
        
        exportData.push({
            variable: 'Z* (Optimal)',
            optimal_value: optimalValue ?? 0,
            objective_coefficient: 0
        });
        
        const csv = Papa.unparse(exportData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'linear_programming_solution.csv';
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "Download Started", description: "LP solution is being downloaded." });
    }, [analysisResult, decisionVars, c, toast]);

    const getObjectiveFunctionString = () => {
        return `${objective === 'maximize' ? 'Max' : 'Min'} Z = ` + c.map((val, j) => `${val}·${decisionVars[j]}`).join(' + ');
    };
    
    const getConstraintString = (i: number) => {
        return A[i].map((val, j) => `${val}·${decisionVars[j]}`).join(' + ') + ` ${constraintTypes[i]} ${b[i]}`;
    };

    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={handleLoadExample} />;
    }
    
    const primalSolution = analysisResult?.primal_solution ?? analysisResult?.solution;
    const optimalValue = analysisResult?.primal_optimal_value ?? analysisResult?.optimal_value;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Linear Programming Board</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>
                        Define your variables and constraints to find the optimal solution.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex flex-wrap items-center gap-4 p-4 border rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                           <Label htmlFor="num-vars">Variables:</Label>
                           <Input id="num-vars" type="number" value={numVars} onChange={e => setNumVars(parseInt(e.target.value))} min="1" className="w-20"/>
                        </div>
                        <div className="flex items-center gap-2">
                            <Label htmlFor="num-constraints">Constraints:</Label>
                            <Input id="num-constraints" type="number" value={numConstraints} onChange={e => setNumConstraints(parseInt(e.target.value))} min="1" className="w-20"/>
                        </div>
                        <Button onClick={handleBoardCreation}>
                            <Asterisk className="mr-2 h-4 w-4" />Create Board
                        </Button>
                        <Button variant="outline" onClick={handleLoadExample}>
                           <FileJson className="mr-2 h-4 w-4" /> Load Example
                        </Button>
                    </div>
                    
                    <div className="space-y-6 pt-4">
                        <div>
                            <h3 className="font-semibold">Problem Setup</h3>
                            <div className="mt-4 p-4 border rounded-lg space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div>
                                        <Label>Objective Function</Label>
                                         <Select value={objective} onValueChange={(v) => setObjective(v as any)}>
                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="maximize">Maximize</SelectItem>
                                                <SelectItem value="minimize">Minimize</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Problem Type</Label>
                                         <Select value={problemType} onValueChange={(v) => setProblemType(v as any)}>
                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="lp">Standard LP</SelectItem>
                                                <SelectItem value="integer">Integer Programming (MILP)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-end gap-2">
                                    {c.map((val, j) => (
                                        <div key={j} className="flex-1 min-w-[100px]">
                                            <Label htmlFor={`c${j}`}>{decisionVars[j]} Coeff:</Label>
                                            <Input id={`c${j}`} type="number" value={val} onChange={e => handleMatrixChange(e.target.value, 0, j, 'c')} />
                                        </div>
                                    ))}
                                </div>
                                {problemType === 'integer' && (
                                    <div className="mt-4">
                                        <Label>Variable Types</Label>
                                        <div className="flex flex-wrap gap-4 mt-2">
                                            {variableTypes.map((vType, j) => (
                                                <div key={j}>
                                                    <Label htmlFor={`vtype${j}`}>{decisionVars[j]}</Label>
                                                    <Select value={vType} onValueChange={value => handleVariableTypeChange(j, value)}>
                                                        <SelectTrigger id={`vtype${j}`}><SelectValue/></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="continuous">Continuous</SelectItem>
                                                            <SelectItem value="integer">Integer</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="mt-4">
                                     <Label>Constraints</Label>
                                     <div className="grid grid-cols-1 gap-2 mt-2">
                                        {A.map((row, i) => (
                                            <div key={i} className="flex flex-wrap items-center gap-2 p-2 rounded-md bg-muted/20">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {row.map((val, j) => (
                                                        <div key={j} className="flex items-center gap-1">
                                                            <Input id={`a${i+1}${j+1}`} type="number" value={val} onChange={e => handleMatrixChange(e.target.value, i, j, 'A')} className="w-20"/>
                                                            <Label>· {decisionVars[j]}</Label>
                                                            {j < decisionVars.length - 1 && <span className="mx-1 font-semibold">+</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="w-[80px]">
                                                     <Select value={constraintTypes[i]} onValueChange={(v) => handleConstraintTypeChange(i, v)}>
                                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                                        <SelectContent><SelectItem value="<=">≤</SelectItem><SelectItem value="==">=</SelectItem><SelectItem value=">=">≥</SelectItem></SelectContent>
                                                    </Select>
                                                </div>
                                                <Input id={`b${i+1}`} type="number" value={b[i]} onChange={e => handleMatrixChange(e.target.value, i, 0, 'b')} className="w-24"/>
                                            </div>
                                        ))}
                                     </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Overview */}
                        <OptimizationOverview 
                            numVars={numVars}
                            numConstraints={numConstraints}
                            objective={objective}
                            problemType={problemType}
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <div className="flex gap-2">
                        {analysisResult?.success && (
                            <Button variant="outline" onClick={handleDownloadResults}>
                                <Download className="mr-2 h-4 w-4" />
                                Export Solution
                            </Button>
                        )}
                    </div>
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Calculating...</> : <><Play className="mr-2"/>Solve</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && (
                <Card>
                    <CardContent className="p-6 flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <p className="text-muted-foreground">Solving optimization problem...</p>
                    </CardContent>
                </Card>
            )}

            {analysisResult && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    {analysisResult.success && (
                        <OptimizationSummaryCards 
                            result={analysisResult} 
                            numVars={numVars}
                            numConstraints={numConstraints}
                        />
                    )}

                    {/* Interpretation */}
                    <div className="grid gap-6 lg:grid-cols-3">
                        <div className="lg:col-span-3">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="font-headline">Interpretation</CardTitle>
                                    <CardDescription>Analysis of the optimization results.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 text-sm">
                                    {analysisResult.interpretation && (
                                        <Alert variant={analysisResult.success ? 'default' : 'destructive'}>
                                            <AlertTitle>Summary of Results</AlertTitle>
                                            <AlertDescription dangerouslySetInnerHTML={{ __html: analysisResult.interpretation.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                                        </Alert>
                                    )}
                                    <div className="mt-4">
                                        <strong className="text-foreground">Overall Analysis:</strong>
                                        <p className="text-muted-foreground mt-1" dangerouslySetInnerHTML={{ __html: analysisResult.interpretations?.overall_analysis || '' }} />
                                    </div>
                                    <div>
                                        <strong className="text-foreground">Recommendations:</strong>
                                        <p className="text-muted-foreground mt-1">
                                            {analysisResult.interpretations?.recommendations}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Optimization Insights */}
                    {analysisResult.interpretations?.optimization_insights && analysisResult.interpretations.optimization_insights.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Optimization Insights</CardTitle>
                                <CardDescription>Detailed analysis of the solution.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {analysisResult.interpretations.optimization_insights.map((insight, index) => (
                                        <Alert key={index} variant="default">
                                            <Info className="h-4 w-4" />
                                            <AlertDescription dangerouslySetInnerHTML={{ __html: insight }} />
                                        </Alert>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Optimal Solution</CardTitle>
                                {analysisResult.success ? (
                                    <CardDescription>The optimal values for the decision variables.</CardDescription>
                                ) : <CardDescription className="text-destructive">No optimal solution found.</CardDescription>}
                            </CardHeader>
                            <CardContent>
                                {analysisResult.success ? (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-primary/10 rounded-lg">
                                            <p className="text-sm text-muted-foreground mb-1">Optimal Value</p>
                                            <p className="text-3xl font-bold text-primary">Z* = {optimalValue?.toFixed(4)}</p>
                                        </div>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Variable</TableHead>
                                                    <TableHead className="text-right">Optimal Value</TableHead>
                                                    <TableHead className="text-right">Contribution</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {primalSolution?.map((s, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell><strong>{decisionVars[i]}</strong></TableCell>
                                                        <TableCell className="font-mono text-right">{s.toFixed(4)}</TableCell>
                                                        <TableCell className="font-mono text-right">{(s * c[i]).toFixed(4)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <Alert variant="destructive">
                                        <AlertTitle>Infeasible Problem</AlertTitle>
                                        <AlertDescription>{analysisResult.message}</AlertDescription>
                                    </Alert>
                                )}
                            </CardContent>
                        </Card>
                        {analysisResult.plot && (
                             <Card>
                                <CardHeader>
                                    <CardTitle className="font-headline">Feasible Region Plot</CardTitle>
                                    <CardDescription>Visual representation of constraints and optimal point.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                     <Image src={analysisResult.plot} alt="Feasible Region Plot" width={600} height={600} className="w-full rounded-md border" />
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            )}
            
            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <Sigma className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Configure your problem and click &apos;Solve&apos; to find the optimal solution.</p>
                </div>
            )}
        </div>
    );
}