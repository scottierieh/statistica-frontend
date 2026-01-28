'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Target, TrendingUp, Activity, Zap, CheckCircle, AlertCircle, Info, Plus, Minus, Dices, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { produce } from 'immer';

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const EXAMPLE_PROBLEMS = [
    {
        name: 'Supply',
        objective_function: '(x[0] - demand)**2 + x[1]**2',
        scenarios: [
            { name: 'High Demand', probability: '0.3', parameters: 'demand:120' },
            { name: 'Normal', probability: '0.5', parameters: 'demand:100' },
            { name: 'Low Demand', probability: '0.2', parameters: 'demand:80' }
        ],
        variables: [
            { name: 'production', min_value: '0', max_value: '200' },
            { name: 'inventory', min_value: '0', max_value: '50' }
        ],
        risk_aversion: 0.5,
        n_samples: '1000'
    },
    {
        name: 'Portfolio',
        objective_function: '-(x[0]*return_1 + x[1]*return_2) + 0.5*(x[0]**2 + x[1]**2)',
        scenarios: [
            { name: 'Bull Market', probability: '0.4', parameters: 'return_1:0.15,return_2:0.12' },
            { name: 'Stable', probability: '0.4', parameters: 'return_1:0.08,return_2:0.06' },
            { name: 'Bear Market', probability: '0.2', parameters: 'return_1:-0.05,return_2:-0.03' }
        ],
        variables: [
            { name: 'asset_1', min_value: '0', max_value: '100' },
            { name: 'asset_2', min_value: '0', max_value: '100' }
        ],
        risk_aversion: 0.7,
        n_samples: '1500'
    },
];

interface ScenarioInput {
    id: string;
    name: string;
    probability: string;
    parameters: string; // format: "param1:value1,param2:value2"
}

interface VariableInput {
    id: string;
    name: string;
    min_value: string;
    max_value: string;
}

interface VariableDetail {
    name: string;
    min_value: number;
    max_value: number;
    optimal_value: number;
    range: number;
    selected: boolean;
}

interface StochasticResult {
    success: boolean;
    expected_value: number;
    worst_case_value: number;
    best_case_value: number;
    value_at_risk: number;
    conditional_value_at_risk: number;
    best_solution: number[];
    scenario_outcomes: Record<string, number>;
    selected_variables: string[];
    variable_details: VariableDetail[];
    variable_details_by_range: VariableDetail[];
    problem: {
        n_variables: number;
        n_scenarios: number;
        risk_aversion: number;
        n_samples: number;
        n_selected: number;
    };
    plots: {
        scenarios?: string;
        distribution?: string;
        convergence?: string;
    };
    interpretation: {
        key_insights: { title: string; description: string; status: string }[];
        recommendations: string[];
    };
}

export default function StochasticProgrammingPage() {
    const { toast } = useToast();

    const [objectiveFunction, setObjectiveFunction] = useState('(x[0] - demand)**2 + x[1]**2');
    const [scenarios, setScenarios] = useState<ScenarioInput[]>([
        { id: '1', name: 'High Demand', probability: '0.3', parameters: 'demand:120' },
        { id: '2', name: 'Normal', probability: '0.5', parameters: 'demand:100' },
        { id: '3', name: 'Low Demand', probability: '0.2', parameters: 'demand:80' }
    ]);
    const [variables, setVariables] = useState<VariableInput[]>([
        { id: '1', name: 'production', min_value: '0', max_value: '200' },
        { id: '2', name: 'inventory', min_value: '0', max_value: '50' }
    ]);
    const [riskAversion, setRiskAversion] = useState(0.5);
    const [nSamples, setNSamples] = useState('1000');

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<StochasticResult | null>(null);

    const addScenario = () => {
        setScenarios(prev => [...prev, {
            id: Date.now().toString(),
            name: `Scenario ${prev.length + 1}`,
            probability: '0.1',
            parameters: 'param:1.0'
        }]);
    };

    const removeScenario = (id: string) => {
        if (scenarios.length > 2) {
            setScenarios(prev => prev.filter(s => s.id !== id));
        }
    };

    const addVariable = () => {
        setVariables(prev => [...prev, {
            id: Date.now().toString(),
            name: `x${prev.length}`,
            min_value: '0',
            max_value: '100'
        }]);
    };

    const removeVariable = (id: string) => {
        if (variables.length > 1) {
            setVariables(prev => prev.filter(v => v.id !== id));
        }
    };

    const handleExampleSelect = (example: typeof EXAMPLE_PROBLEMS[0]) => {
        setObjectiveFunction(example.objective_function);
        setScenarios(example.scenarios.map((s, i) => ({
            id: (i + 1).toString(),
            ...s
        })));
        setVariables(example.variables.map((v, i) => ({
            id: (i + 1).toString(),
            ...v
        })));
        setRiskAversion(example.risk_aversion);
        setNSamples(example.n_samples);
        setResult(null);
    };

    const parseParameters = (paramStr: string): Record<string, number> => {
        const params: Record<string, number> = {};
        const pairs = paramStr.split(',');
        for (const pair of pairs) {
            const [key, value] = pair.split(':');
            if (key && value) {
                params[key.trim()] = parseFloat(value.trim());
            }
        }
        return params;
    };

    const handleOptimize = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const parsedScenarios = scenarios
                .filter(s => s.name && s.probability && s.parameters)
                .map(s => ({
                    name: s.name,
                    probability: parseFloat(s.probability),
                    parameters: parseParameters(s.parameters)
                }));

            const parsedVariables = variables
                .filter(v => v.min_value && v.max_value)
                .map(v => ({
                    name: v.name,
                    min_value: parseFloat(v.min_value),
                    max_value: parseFloat(v.max_value)
                }));

            if (parsedScenarios.length < 2) {
                throw new Error("At least 2 scenarios required.");
            }

            if (parsedVariables.length === 0) {
                throw new Error("At least one variable required.");
            }

            const payload = {
                objective_function: objectiveFunction,
                scenarios: parsedScenarios,
                variables: parsedVariables,
                risk_aversion: riskAversion,
                n_samples: parseInt(nSamples)
            };

            const response = await fetch(`${FASTAPI_URL}/api/analysis/stochastic-programming`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.detail || 'Stochastic optimization failed');
            }

            const res: StochasticResult = await response.json();
            setResult(res);

            toast({
                title: "Optimization Complete",
                description: `Expected value: ${res.expected_value.toFixed(4)}`
            });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    const totalProb = scenarios.reduce((sum, s) => sum + (parseFloat(s.probability) || 0), 0);

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-4">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                    <Dices className="w-6 h-6 text-primary" />
                    Stochastic Programming
                </h1>
                <p className="text-sm text-muted-foreground">
                    Optimization under uncertainty using scenario-based approach
                </p>
            </div>

            {/* Input Card */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-medium">Uncertainty Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* Parameters & Examples */}
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Samples</Label>
                            <Input
                                type="number"
                                value={nSamples}
                                onChange={e => setNSamples(e.target.value)}
                                className="w-24 h-9 font-mono"
                                min="100"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Scenarios</Label>
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => scenarios.length > 2 && setScenarios(prev => prev.slice(0, -1))} disabled={scenarios.length <= 2}>
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-8 text-center font-mono">{scenarios.length}</span>
                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={addScenario} disabled={scenarios.length >= 10}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Variables</Label>
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => variables.length > 1 && setVariables(prev => prev.slice(0, -1))} disabled={variables.length <= 1}>
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-8 text-center font-mono">{variables.length}</span>
                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={addVariable} disabled={variables.length >= 10}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                            <span className={totalProb === 1.0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                Total Prob: {totalProb.toFixed(2)}
                            </span>
                        </div>

                        <div className="flex-1" />

                        <div className="flex flex-wrap gap-1.5">
                            {EXAMPLE_PROBLEMS.map(ex => (
                                <button
                                    key={ex.name}
                                    onClick={() => handleExampleSelect(ex)}
                                    className="px-2.5 py-1 text-xs border rounded-md hover:bg-muted transition-colors"
                                >
                                    {ex.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    {/* Objective Function */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Objective Function</Label>
                        <Input
                            value={objectiveFunction}
                            onChange={e => setObjectiveFunction(e.target.value)}
                            className="font-mono"
                            placeholder="e.g., (x[0] - demand)**2 + x[1]**2"
                        />
                        <p className="text-xs text-muted-foreground">
                            Use scenario parameters (e.g., demand, return_1) and variables x[0], x[1], etc.
                        </p>
                    </div>

                    <Separator />

                    {/* Scenarios Table */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Scenarios</Label>
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[25%]">Name</TableHead>
                                        <TableHead className="w-[15%]">Probability</TableHead>
                                        <TableHead className="w-[50%]">Parameters</TableHead>
                                        <TableHead className="w-10"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {scenarios.map((scenario, index) => (
                                        <TableRow key={scenario.id}>
                                            <TableCell className="p-1">
                                                <Input
                                                    value={scenario.name}
                                                    onChange={e => setScenarios(produce(draft => { draft[index].name = e.target.value }))}
                                                    className="h-9"
                                                    placeholder="Scenario"
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Input
                                                    type="number"
                                                    value={scenario.probability}
                                                    onChange={e => setScenarios(produce(draft => { draft[index].probability = e.target.value }))}
                                                    className="h-9 w-20 font-mono"
                                                    step="0.1"
                                                    min="0"
                                                    max="1"
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Input
                                                    value={scenario.parameters}
                                                    onChange={e => setScenarios(produce(draft => { draft[index].parameters = e.target.value }))}
                                                    className="h-9 font-mono text-sm"
                                                    placeholder="param1:100,param2:50"
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 hover:bg-destructive/10"
                                                    onClick={() => removeScenario(scenario.id)}
                                                    disabled={scenarios.length <= 2}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Parameters format: param1:value1,param2:value2. Probabilities must sum to 1.0.
                        </p>
                    </div>

                    <Separator />

                    {/* Variables Table */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Decision Variables</Label>
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[40%]">Name</TableHead>
                                        <TableHead>Min Value</TableHead>
                                        <TableHead>Max Value</TableHead>
                                        <TableHead className="text-right">Range</TableHead>
                                        <TableHead className="w-10"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {variables.map((variable, index) => {
                                        const min = parseFloat(variable.min_value) || 0;
                                        const max = parseFloat(variable.max_value) || 0;
                                        const range = max - min;
                                        return (
                                            <TableRow key={variable.id}>
                                                <TableCell className="p-1">
                                                    <Input
                                                        value={variable.name}
                                                        onChange={e => setVariables(produce(draft => { draft[index].name = e.target.value }))}
                                                        className="h-9"
                                                    />
                                                </TableCell>
                                                <TableCell className="p-1">
                                                    <Input
                                                        type="number"
                                                        value={variable.min_value}
                                                        onChange={e => setVariables(produce(draft => { draft[index].min_value = e.target.value }))}
                                                        className="h-9 w-20 font-mono"
                                                        step="0.1"
                                                    />
                                                </TableCell>
                                                <TableCell className="p-1">
                                                    <Input
                                                        type="number"
                                                        value={variable.max_value}
                                                        onChange={e => setVariables(produce(draft => { draft[index].max_value = e.target.value }))}
                                                        className="h-9 w-20 font-mono"
                                                        step="0.1"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-sm text-muted-foreground">
                                                    {range.toFixed(1)}
                                                </TableCell>
                                                <TableCell className="p-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 hover:bg-destructive/10"
                                                        onClick={() => removeVariable(variable.id)}
                                                        disabled={variables.length <= 1}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    <Separator />

                    {/* Risk Aversion Slider */}
                    <div className="space-y-4">
                        <Label className="text-sm font-medium">Risk Aversion</Label>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Expected Value Focus</span>
                                <span className="text-sm font-mono font-semibold">{riskAversion.toFixed(2)}</span>
                                <span className="text-xs text-muted-foreground">Worst Case Focus</span>
                            </div>
                            <Slider
                                value={[riskAversion * 100]}
                                onValueChange={(v) => setRiskAversion(v[0] / 100)}
                                min={0}
                                max={100}
                                step={1}
                                className="w-full"
                            />
                            <p className="text-xs text-muted-foreground text-center">
                                {riskAversion < 0.3 ? 'Risk-seeking (optimizes expected value)' :
                                 riskAversion > 0.7 ? 'Risk-averse (protects against worst case)' :
                                 'Balanced approach'}
                            </p>
                        </div>
                    </div>

                    <Button onClick={handleOptimize} disabled={isLoading} className="w-full h-10">
                        {isLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Optimizing...</>
                        ) : (
                            <><Play className="mr-2 h-4 w-4" />Optimize Under Uncertainty</>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Results */}
            {result && (
                <>
                    {/* Metrics */}
                    <div className="grid grid-cols-4 gap-3">
                        <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Expected Value</p>
                                        <p className="text-lg font-semibold font-mono">{result.expected_value.toFixed(4)}</p>
                                    </div>
                                    <Target className="w-4 h-4 text-primary" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">VaR (95%)</p>
                                        <p className="text-lg font-semibold font-mono">
                                            {result.value_at_risk.toFixed(4)}
                                        </p>
                                    </div>
                                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">CVaR</p>
                                        <p className="text-lg font-semibold font-mono">
                                            {result.conditional_value_at_risk.toFixed(4)}
                                        </p>
                                    </div>
                                    <Activity className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Range</p>
                                        <p className="text-sm font-semibold">
                                            [{result.best_case_value.toFixed(2)}, {result.worst_case_value.toFixed(2)}]
                                        </p>
                                    </div>
                                    <Zap className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Robust Solution */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-medium">Robust Solution</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-2">Decision Variables</p>
                                <div className="flex flex-wrap gap-2">
                                    {result.best_solution.map((value, index) => (
                                        <Badge key={index} variant="default" className="text-sm">
                                            {result.variable_details[index]?.name || `x${index}`} = {value.toFixed(4)}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-2">Scenario Outcomes</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(result.scenario_outcomes).map(([name, value]) => (
                                        <div key={name} className="p-2 bg-muted/50 rounded flex items-center justify-between">
                                            <span className="text-sm">{name}</span>
                                            <span className="font-mono text-sm font-semibold">{value.toFixed(4)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Analysis Insights */}
                    {result.interpretation && (
                        <Card className="border-primary/20">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-medium flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    Risk Analysis
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {result.interpretation.key_insights.map((insight, idx) => (
                                    <div key={idx} className="flex gap-3">
                                        <div className="mt-1">
                                            {insight.status === 'positive' ? (
                                                <CheckCircle className="w-5 h-5 text-primary" />
                                            ) : insight.status === 'warning' ? (
                                                <AlertCircle className="w-5 h-5 text-primary/60" />
                                            ) : (
                                                <Info className="w-5 h-5 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium">{insight.title}</p>
                                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{insight.description}</p>
                                        </div>
                                    </div>
                                ))}

                                {result.interpretation.recommendations.length > 0 && (
                                    <>
                                        <Separator className="my-4" />
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground mb-2">Notes</p>
                                            <ul className="space-y-1.5">
                                                {result.interpretation.recommendations.map((rec, idx) => (
                                                    <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                                                        <span className="text-primary">•</span>
                                                        <span>{rec}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Visualizations */}
                    {result.plots && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-medium">Visualizations</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="scenarios" className="w-full">
                                    <TabsList className="w-full justify-start h-9 p-1 bg-muted/50">
                                        {result.plots.scenarios && (
                                            <TabsTrigger value="scenarios" className="text-xs">Scenarios</TabsTrigger>
                                        )}
                                        {result.plots.distribution && (
                                            <TabsTrigger value="distribution" className="text-xs">Distribution</TabsTrigger>
                                        )}
                                        {result.plots.convergence && (
                                            <TabsTrigger value="convergence" className="text-xs">Convergence</TabsTrigger>
                                        )}
                                    </TabsList>

                                    {result.plots.scenarios && (
                                        <TabsContent value="scenarios" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.scenarios}`}
                                                    alt="Scenario Comparison"
                                                    width={800}
                                                    height={500}
                                                    className="w-full"
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-2 text-center">
                                                Objective values across different scenarios (color intensity = probability)
                                            </p>
                                        </TabsContent>
                                    )}

                                    {result.plots.distribution && (
                                        <TabsContent value="distribution" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.distribution}`}
                                                    alt="Outcome Distribution"
                                                    width={800}
                                                    height={500}
                                                    className="w-full"
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-2 text-center">
                                                Probability distribution of outcomes with risk metrics (Expected, VaR, CVaR)
                                            </p>
                                        </TabsContent>
                                    )}

                                    {result.plots.convergence && (
                                        <TabsContent value="convergence" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.convergence}`}
                                                    alt="Convergence"
                                                    width={800}
                                                    height={500}
                                                    className="w-full"
                                                />
                                            </div>
                                        </TabsContent>
                                    )}
                                </Tabs>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}