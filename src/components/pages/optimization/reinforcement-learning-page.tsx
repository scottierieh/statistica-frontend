'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Brain, TrendingUp, Zap, CheckCircle, AlertCircle, Info, Target, Upload, Database, Gamepad2 } from 'lucide-react';
import Image from 'next/image';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const ENVIRONMENTS = [
    {
        id: 'grid_world',
        name: 'Grid World',
        description: '5×5 grid with obstacles. Navigate to goal while avoiding walls.',
        difficulty: 'Easy',
        icon: '🎯',
        features: ['Deterministic', 'Discrete', 'Small state space'],
        grid: [
            ['S', '□', '□', '□', '□'],
            ['□', '□', 'X', '□', '□'],
            ['□', '□', 'X', 'X', '□'],
            ['□', '□', '□', 'X', '□'],
            ['□', '□', '□', '□', 'G']
        ]
    },
    {
        id: 'frozen_lake',
        name: 'Frozen Lake',
        description: '4×4 slippery ice grid. Avoid holes to reach the goal.',
        difficulty: 'Medium',
        icon: '🧊',
        features: ['Stochastic', 'High risk', 'Slippery surface'],
        grid: [
            ['S', '□', '□', '□'],
            ['□', 'X', '□', 'X'],
            ['□', '□', '□', 'X'],
            ['X', '□', '□', 'G']
        ]
    },
    {
        id: 'cliff_walking',
        name: 'Cliff Walking',
        description: '4×12 grid with cliff. High penalty for falling off the edge.',
        difficulty: 'Hard',
        icon: '⛰️',
        features: ['High penalties', 'Risk-aware', 'Strategic planning'],
        grid: [
            ['□', '□', '□', '□', '□', '□', '□', '□', '□', '□', '□', '□'],
            ['□', '□', '□', '□', '□', '□', '□', '□', '□', '□', '□', '□'],
            ['□', '□', '□', '□', '□', '□', '□', '□', '□', '□', '□', '□'],
            ['S', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'G']
        ]
    }
];

const ALGORITHMS = [
    {
        id: 'q_learning',
        name: 'Q-Learning',
        description: 'Off-policy TD learning. Learns optimal policy aggressively.',
        type: 'Off-Policy',
        bestFor: 'Deterministic environments'
    },
    {
        id: 'sarsa',
        name: 'SARSA',
        description: 'On-policy TD learning. More conservative and safer.',
        type: 'On-Policy',
        bestFor: 'Stochastic/risky environments'
    },
    {
        id: 'expected_sarsa',
        name: 'Expected SARSA',
        description: 'Balances exploration and exploitation. Lower variance.',
        type: 'Hybrid',
        bestFor: 'General purpose'
    }
];

const EXAMPLE_CSV = `state,action,reward,next_state,done
0,3,-1,1,0
1,3,-1,2,0
2,3,-1,3,0
3,3,-1,4,0
4,1,-1,9,0
9,1,-1,14,0
14,1,-1,19,0
19,1,100,24,1`;

interface RLResult {
    success: boolean;
    mode: string;
    final_reward: number;
    avg_reward: number;
    episodes_trained: number;
    convergence_episode: number | null;
    policy_info: {
        n_states: number;
        n_actions: number;
        max_q_value: number;
        min_q_value: number;
    };
    environment_info: {
        name: string;
        description: string;
        n_states: number;
        n_actions: number;
        start_state: number;
        goal_state: number;
    };
    training_stats: {
        algorithm: string;
        learning_rate: number;
        discount_factor: number;
        initial_epsilon: number;
        epsilon_decay: number;
        best_reward: number;
        worst_reward: number;
        avg_steps: number;
    };
    data_sample?: {
        sample_experiences: any[];
        total_experiences: number;
        n_episodes: number;
    };
    plots: {
        learning_curve?: string;
        policy?: string;
        reward_distribution?: string;
    };
    interpretation: {
        key_insights: { title: string; description: string; status: string }[];
        recommendations: string[];
    };
}

export default function ReinforcementLearningPage() {
    const { toast } = useToast();

    const [mode, setMode] = useState<'simulation' | 'offline'>('simulation');
    const [environment, setEnvironment] = useState<'grid_world' | 'frozen_lake' | 'cliff_walking'>('grid_world');
    const [algorithm, setAlgorithm] = useState<'q_learning' | 'sarsa' | 'expected_sarsa'>('q_learning');
    const [episodes, setEpisodes] = useState(500);
    const [learningRate, setLearningRate] = useState(0.1);
    const [discountFactor, setDiscountFactor] = useState(0.95);
    const [epsilon, setEpsilon] = useState(0.1);
    const [epsilonDecay, setEpsilonDecay] = useState(0.995);
    const [file, setFile] = useState<File | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<RLResult | null>(null);

    const selectedEnv = ENVIRONMENTS.find(e => e.id === environment);
    const selectedAlgo = ALGORITHMS.find(a => a.id === algorithm);

    const handleDownloadExample = () => {
        const blob = new Blob([EXAMPLE_CSV], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'rl_example_data.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
            title: "Downloaded",
            description: "Example CSV file"
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleTrain = async () => {
        if (mode === 'offline' && !file) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please upload a CSV file' });
            return;
        }

        setIsLoading(true);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('mode', mode);
            formData.append('algorithm', algorithm);
            formData.append('learning_rate', learningRate.toString());
            formData.append('discount_factor', discountFactor.toString());
            formData.append('epsilon', epsilon.toString());
            formData.append('epsilon_decay', epsilonDecay.toString());
            formData.append('episodes', episodes.toString());
            
            if (mode === 'simulation') {
                formData.append('environment', environment);
            } else {
                formData.append('file', file!);
            }

            const response = await fetch(`${FASTAPI_URL}/api/analysis/reinforcement-learning`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.detail || 'Training failed');
            }

            const res: RLResult = await response.json();
            setResult(res);

            toast({
                title: "Training Complete",
                description: `Final reward: ${res.final_reward.toFixed(2)}`
            });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 p-4">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                    <Brain className="w-6 h-6 text-primary" />
                    Reinforcement Learning
                </h1>
                <p className="text-sm text-muted-foreground">
                    Train agents in simulated environments or from your own experience data
                </p>
            </div>

            {/* Mode Selection */}
            <Card className="border-primary/20">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium">Training Mode</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setMode('simulation')}
                            className={`p-4 rounded-lg border-2 transition-all text-left ${
                                mode === 'simulation'
                                    ? 'border-primary bg-primary/10 shadow-md'
                                    : 'border-border bg-background hover:border-primary/50'
                            }`}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Gamepad2 className="w-5 h-5" />
                                <h3 className="font-semibold">Simulation</h3>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Train in pre-built environments (Grid World, Frozen Lake, Cliff Walking)
                            </p>
                            <div className="flex gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">No data needed</Badge>
                                <Badge variant="outline" className="text-xs">Interactive</Badge>
                            </div>
                        </button>

                        <button
                            onClick={() => setMode('offline')}
                            className={`p-4 rounded-lg border-2 transition-all text-left ${
                                mode === 'offline'
                                    ? 'border-primary bg-primary/10 shadow-md'
                                    : 'border-border bg-background hover:border-primary/50'
                            }`}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Database className="w-5 h-5" />
                                <h3 className="font-semibold">Offline Learning</h3>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Learn from your own CSV data (state, action, reward, next_state, done)
                            </p>
                            <div className="flex gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">CSV upload</Badge>
                                <Badge variant="outline" className="text-xs">Real data</Badge>
                            </div>
                        </button>
                    </div>
                </CardContent>
            </Card>

            {/* Simulation Mode */}
            {mode === 'simulation' && (
                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            Choose Environment
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                            {ENVIRONMENTS.map(env => (
                                <button
                                    key={env.id}
                                    onClick={() => setEnvironment(env.id as any)}
                                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                                        environment === env.id
                                            ? 'border-primary bg-primary/10 shadow-md'
                                            : 'border-border bg-background hover:border-primary/50'
                                    }`}
                                >
                                    <div className="text-3xl mb-2">{env.icon}</div>
                                    <h3 className="font-semibold mb-1">{env.name}</h3>
                                    <p className="text-xs text-muted-foreground mb-2">{env.description}</p>
                                    
                                    {/* Grid Preview */}
                                    <div className="my-3 p-2 bg-muted/30 rounded border">
                                        <div className="grid gap-0.5" style={{
                                            gridTemplateColumns: `repeat(${env.grid[0].length}, minmax(0, 1fr))`
                                        }}>
                                            {env.grid.flat().map((cell, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`aspect-square flex items-center justify-center text-xs font-bold rounded ${
                                                        cell === 'S' ? 'bg-blue-500 text-white' :
                                                        cell === 'G' ? 'bg-green-500 text-white' :
                                                        cell === 'X' ? 'bg-red-500 text-white' :
                                                        cell === 'C' ? 'bg-orange-500 text-white' :
                                                        'bg-gray-200'
                                                    }`}
                                                >
                                                    {cell === '□' ? '' : cell}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {env.features.map(feature => (
                                            <Badge key={feature} variant="outline" className="text-xs">
                                                {feature}
                                            </Badge>
                                        ))}
                                    </div>
                                    <Badge className="text-xs" variant={
                                        env.difficulty === 'Easy' ? 'default' : 
                                        env.difficulty === 'Medium' ? 'secondary' : 'destructive'
                                    }>
                                        {env.difficulty}
                                    </Badge>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Offline Mode */}
            {mode === 'offline' && (
                <Card className="border-primary/20 bg-gradient-to-br from-purple-50 to-purple-100">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            Upload Experience Data
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">CSV File</Label>
                            <div className="flex items-center gap-3">
                                <Input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    className="flex-1"
                                />
                                {file && (
                                    <Badge variant="outline" className="text-xs">
                                        <Upload className="w-3 h-3 mr-1" />
                                        {file.name}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Required columns: state, action, reward, next_state, done
                            </p>
                        </div>

                        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-purple-900">CSV Format Example</p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDownloadExample}
                                    className="h-7"
                                >
                                    Download Example
                                </Button>
                            </div>
                            <div className="bg-white p-2 rounded border text-xs font-mono overflow-x-auto">
                                <pre>{EXAMPLE_CSV}</pre>
                            </div>
                            <ul className="text-xs text-purple-800 space-y-1">
                                <li>• <strong>state</strong>: Current state ID (integer)</li>
                                <li>• <strong>action</strong>: Action taken (0=up, 1=down, 2=left, 3=right)</li>
                                <li>• <strong>reward</strong>: Reward received (float)</li>
                                <li>• <strong>next_state</strong>: Next state ID (integer)</li>
                                <li>• <strong>done</strong>: Episode ended (0=False, 1=True)</li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Configuration */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-medium">Training Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* Algorithm Selection */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Learning Algorithm</Label>
                        <div className="grid grid-cols-3 gap-3">
                            {ALGORITHMS.map(algo => (
                                <button
                                    key={algo.id}
                                    onClick={() => setAlgorithm(algo.id as any)}
                                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                                        algorithm === algo.id
                                            ? 'border-primary bg-primary/10'
                                            : 'border-border bg-background hover:border-primary/50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="font-semibold text-sm">{algo.name}</h3>
                                        <Badge variant="outline" className="text-xs">{algo.type}</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-2">{algo.description}</p>
                                    <p className="text-xs text-primary">Best for: {algo.bestFor}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    {/* Hyperparameters */}
                    <div className="space-y-4">
                        <Label className="text-sm font-medium">Hyperparameters</Label>
                        
                        <div className="grid grid-cols-2 gap-6">
                            {mode === 'simulation' && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs text-muted-foreground">Episodes</Label>
                                        <span className="text-sm font-mono font-semibold">{episodes}</span>
                                    </div>
                                    <Slider
                                        value={[episodes]}
                                        onValueChange={(v) => setEpisodes(v[0])}
                                        min={100}
                                        max={2000}
                                        step={100}
                                        className="w-full"
                                    />
                                    <p className="text-xs text-muted-foreground">Training episodes</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs text-muted-foreground">Learning Rate (α)</Label>
                                    <span className="text-sm font-mono font-semibold">{learningRate.toFixed(3)}</span>
                                </div>
                                <Slider
                                    value={[learningRate * 100]}
                                    onValueChange={(v) => setLearningRate(v[0] / 100)}
                                    min={1}
                                    max={100}
                                    step={1}
                                    className="w-full"
                                />
                                <p className="text-xs text-muted-foreground">How quickly agent learns</p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs text-muted-foreground">Discount Factor (γ)</Label>
                                    <span className="text-sm font-mono font-semibold">{discountFactor.toFixed(2)}</span>
                                </div>
                                <Slider
                                    value={[discountFactor * 100]}
                                    onValueChange={(v) => setDiscountFactor(v[0] / 100)}
                                    min={80}
                                    max={99}
                                    step={1}
                                    className="w-full"
                                />
                                <p className="text-xs text-muted-foreground">Future rewards importance</p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs text-muted-foreground">Exploration (ε)</Label>
                                    <span className="text-sm font-mono font-semibold">{epsilon.toFixed(2)}</span>
                                </div>
                                <Slider
                                    value={[epsilon * 100]}
                                    onValueChange={(v) => setEpsilon(v[0] / 100)}
                                    min={0}
                                    max={50}
                                    step={1}
                                    className="w-full"
                                />
                                <p className="text-xs text-muted-foreground">Random exploration rate</p>
                            </div>
                        </div>
                    </div>

                    <Button onClick={handleTrain} disabled={isLoading} className="w-full h-10">
                        {isLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Training Agent...</>
                        ) : (
                            <><Play className="mr-2 h-4 w-4" />Start Training</>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Results */}
            {result && (
                <>
                    {/* Metrics */}
                    <div className="grid grid-cols-4 gap-3">
                        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Final Reward</p>
                                        <p className="text-xl font-bold text-green-700">{result.final_reward.toFixed(2)}</p>
                                    </div>
                                    <TrendingUp className="w-5 h-5 text-green-600" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Avg Reward</p>
                                        <p className="text-xl font-semibold">{result.avg_reward.toFixed(2)}</p>
                                    </div>
                                    <Zap className="w-5 h-5 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Episodes</p>
                                        <p className="text-xl font-semibold">{result.episodes_trained}</p>
                                    </div>
                                    <Brain className="w-5 h-5 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Mode</p>
                                        <p className="text-lg font-semibold capitalize">{result.mode}</p>
                                    </div>
                                    {result.mode === 'simulation' ? (
                                        <Gamepad2 className="w-5 h-5 text-muted-foreground" />
                                    ) : (
                                        <Database className="w-5 h-5 text-muted-foreground" />
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Data Sample (Offline Mode) */}
                    {result.mode === 'offline' && result.data_sample && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-medium">Training Data Sample</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex gap-4 text-sm">
                                        <Badge variant="outline">
                                            {result.data_sample.total_experiences} experiences
                                        </Badge>
                                        <Badge variant="outline">
                                            {result.data_sample.n_episodes} episodes
                                        </Badge>
                                        <Badge variant="outline">
                                            {result.environment_info.n_states} states
                                        </Badge>
                                        <Badge variant="outline">
                                            {result.environment_info.n_actions} actions
                                        </Badge>
                                    </div>
                                    <div className="border rounded-lg overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-muted/50">
                                                <TableRow>
                                                    <TableHead className="text-xs">State</TableHead>
                                                    <TableHead className="text-xs">Action</TableHead>
                                                    <TableHead className="text-xs">Reward</TableHead>
                                                    <TableHead className="text-xs">Next State</TableHead>
                                                    <TableHead className="text-xs">Done</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {result.data_sample.sample_experiences.map((exp, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell className="font-mono text-xs">{exp.state}</TableCell>
                                                        <TableCell className="font-mono text-xs">{exp.action}</TableCell>
                                                        <TableCell className="font-mono text-xs">{exp.reward}</TableCell>
                                                        <TableCell className="font-mono text-xs">{exp.next_state}</TableCell>
                                                        <TableCell className="font-mono text-xs">{exp.done ? '✓' : '✗'}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <p className="text-xs text-muted-foreground text-center">
                                        Showing first 10 experiences from uploaded data
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Analysis Insights */}
                    {result.interpretation && (
                        <Card className="border-primary/20">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-medium flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    Analysis Insights
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {result.interpretation.key_insights.map((insight, idx) => (
                                    <div key={idx} className="flex gap-3">
                                        <div className="mt-1">
                                            {insight.status === 'positive' ? (
                                                <CheckCircle className="w-5 h-5 text-primary" />
                                            ) : insight.status === 'warning' ? (
                                                <AlertCircle className="w-5 h-5 text-yellow-500" />
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
                                <CardTitle className="text-base font-medium">Learning Progress</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="curve" className="w-full">
                                    <TabsList className="w-full justify-start h-9 p-1 bg-muted/50">
                                        {result.plots.learning_curve && (
                                            <TabsTrigger value="curve" className="text-xs">Learning Curve</TabsTrigger>
                                        )}
                                        {result.plots.policy && (
                                            <TabsTrigger value="policy" className="text-xs">Policy</TabsTrigger>
                                        )}
                                        {result.plots.reward_distribution && (
                                            <TabsTrigger value="distribution" className="text-xs">Distribution</TabsTrigger>
                                        )}
                                    </TabsList>

                                    {result.plots.learning_curve && (
                                        <TabsContent value="curve" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.learning_curve}`}
                                                    alt="Learning Curve"
                                                    width={1000}
                                                    height={500}
                                                    className="w-full"
                                                />
                                            </div>
                                        </TabsContent>
                                    )}

                                    {result.plots.policy && (
                                        <TabsContent value="policy" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.policy}`}
                                                    alt="Learned Policy"
                                                    width={900}
                                                    height={700}
                                                    className="w-full"
                                                />
                                            </div>
                                        </TabsContent>
                                    )}

                                    {result.plots.reward_distribution && (
                                        <TabsContent value="distribution" className="mt-4">
                                            <div className="rounded-lg overflow-hidden border">
                                                <Image
                                                    src={`data:image/png;base64,${result.plots.reward_distribution}`}
                                                    alt="Reward Distribution"
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

