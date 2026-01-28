'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
  SidebarTrigger,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenu,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Target,
  TrendingUp,
  Activity,
  Zap,
  Layers,
  Users,
  Map,
  Timer,
  Package,
  Sigma,
  GitBranch,
  BrainCircuit,
  Repeat,
  MapIcon,
  Component,
  ArrowDown,
  Settings2,
  Feather,
  Smile,
  Scaling,
  AreaChart,
  LineChart,
  Car,
  TrendingDown,
  BarChart2,
  Calculator,
  Brain,
  Link2,
  ScatterChart,
  ShieldCheck,
  Scissors,
  FileSearch,
  CheckSquare,
  Clock,
  Filter,
  Download,
  Bot,
  BookOpen,
  Building,
  Award,
  Truck,
  Percent,
  Container,
  Search,
  MapPin,
  Radio,
  LayoutGrid,
  Share2,
  Scale,
  Dice5,
  Gamepad2,
  Puzzle,
  SlidersHorizontal,
  Thermometer,
  Waypoints,
  Ban,
  Rocket,
  Wind,
  MessageSquare,
  Palette,
  Flag,
  Hash
} from 'lucide-react';


import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';
import { ChevronDown } from 'lucide-react';
import {
  type DataSet,
  parseData,
} from '@/lib/stats';
import { useToast } from '@/hooks/use-toast';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import DataPreview from './data-preview';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';

// Import scenario pages
import LinearProgrammingPage from '@/components/pages/optimization/linear-programming-page';
import IntegerProgrammingPage from '@/components/pages/optimization/integer-programming-page';
import NonLinearProgrammingPage from '@/components/pages/optimization/nonlinear-programming-page';
import GoalProgrammingPage from '@/components/pages/optimization/goal-programming-page';
import TransportationProblemPage from '@/components/pages/optimization/transportation-problem-page';
import GradientDescentPage from '@/components/pages/optimization/gradient-descent-page';
import DynamicProgrammingPage from '@/components/pages/optimization/dynamic-programming-page';
import dynamic from 'next/dynamic';

const ConvexOptimizationPage = dynamic(
  () => import('@/components/pages/optimization/convex-optimization-page'),
  { ssr: false, loading: () => <div>Loading...</div> }
);


// 2. Metaheuristics (기존 목록)
import GeneticAlgorithmPage from './pages/optimization/genetic-algorithm-page';
import ParticleSwarmPage from './pages/optimization/particle-swarm-page';
import SimulatedAnnealingPage from './pages/optimization/simulated-annealing-page';
import AntColonyPage from './pages/optimization/ant-colony-page';
import TabuSearchPage from './pages/optimization/tabu-search-page';

// 3. Spatial Optimization (새로 추가됨)
import PMedianPage from './pages/optimization/p-median-page';
import MCLPPage from './pages/optimization/mclp-page';
import LocationAllocationPage from './pages/optimization/location-allocation-page';
import NetworkOptimizationPage from './pages/optimization/network-optimization-page';

// 4. Multi-Objective & Robust (새로 추가됨)
import ParetoOptimizationPage from './pages/optimization/pareto-optimization-page';
import StochasticProgrammingPage from './pages/optimization/stochastic-programming-page';
import RobustOptimizationPage from './pages/optimization/robust-optimization-page';
import ChanceConstrainedPage from './pages/optimization/chance-constrained-page';

// 5. Neural Network & ML (기존 목록 + RL 추가)
import SgdPage from './pages/optimization/sgd-page';
import AdamPage from './pages/optimization/adam-page';
import RmspropPage from './pages/optimization/rmsprop-page';
import AdagradPage from './pages/optimization/adagrad-page';
import BayesianOptimizationPage from './pages/optimization/bayesian-optimization-page';
import ReinforcementLearningPage from './pages/optimization/reinforcement-learning-page'; 
import HyperparameterTuningPage from './pages/optimization/hyperparameter-tuning-page'; 


const analysisCategories = [
  {
      name: 'Deterministic Optimization',
      icon: Settings2,
      items: [
          { id: 'linear-programming', label: 'Linear Programming (LP)', icon: TrendingUp, component: LinearProgrammingPage },
          { id: 'integer-programming', label: 'Integer Programming (IP)', icon: Sigma, component: IntegerProgrammingPage },
          { id: 'nonlinear-programming', label: 'Non-linear Programming (NLP)', icon: TrendingDown, component: NonLinearProgrammingPage },
          { id: 'goal-programming', label: 'Goal Programming', icon: Award, component: GoalProgrammingPage },
          { id: 'transportation-problem', label: 'Transportation Problem', icon: Truck, component: TransportationProblemPage },
          { id: 'gradient-descent', label: 'Gradient Descent', icon: ArrowDown, component: GradientDescentPage },
          { id: 'dynamic-programming', label: 'Dynamic Programming (DP)', icon: Repeat, component: DynamicProgrammingPage },
          { id: 'convex-optimization', label: 'Convex Optimization', icon: Component, component: ConvexOptimizationPage },
      ]
  },
  {
      name: 'Metaheuristics',
      icon: Feather,
      items: [
          { id: 'genetic-algorithm', label: 'Genetic Algorithm (GA)', icon: GitBranch, component: GeneticAlgorithmPage },
          { id: 'particle-swarm', label: 'Particle Swarm (PSO)', icon: Users, component: ParticleSwarmPage },
          { id: 'simulated-annealing', label: 'Simulated Annealing (SA)', icon: Thermometer, component: SimulatedAnnealingPage },
          { id: 'ant-colony', label: 'Ant Colony Optimization (ACO)', icon: Waypoints, component: AntColonyPage },
          { id: 'tabu-search', label: 'Tabu Search', icon: Ban, component: TabuSearchPage },
      ]
  },
  {
      name: 'Spatial Optimization',
      icon: MapIcon,
      items: [
          { id: 'p-median', label: 'P-Median Problem', icon: MapPin, component: PMedianPage },
          { id: 'mclp', label: 'Maximal Covering (MCLP)', icon: Radio, component: MCLPPage },
          { id: 'location-allocation', label: 'Location-Allocation', icon: LayoutGrid, component: LocationAllocationPage },
          { id: 'network-optimization', label: 'Network Optimization', icon: Share2, component: NetworkOptimizationPage },
      ]
  },
  {
      name: 'Multi-Objective & Robust',
      icon: Layers,
      items: [
          { id: 'pareto-optimization', label: 'Pareto Optimization', icon: Scale, component: ParetoOptimizationPage },
          { id: 'stochastic-programming', label: 'Stochastic Programming', icon: Dice5, component: StochasticProgrammingPage },
          { id: 'robust-optimization', label: 'Robust Optimization', icon: ShieldCheck, component: RobustOptimizationPage },
          { id: 'chance-constrained', label: 'Chance-Constrained', icon: Percent, component: ChanceConstrainedPage },
      ]
  },
  {
      name: 'Neural Network & ML',
      icon: BrainCircuit,
      items: [
          { id: 'sgd', label: 'SGD', icon: TrendingDown, component: SgdPage },
          { id: 'adam', label: 'Adam', icon: Rocket, component: AdamPage },
          { id: 'rmsprop', label: 'RMSProp', icon: Wind, component: RmspropPage },
          { id: 'adagrad', label: 'Adagrad', icon: Scaling, component: AdagradPage },
          { id: 'bayesian-optimization', label: 'Bayesian Optimization', icon: BrainCircuit, component: BayesianOptimizationPage },
          { id: 'reinforcement-learning', label: 'Reinforcement Learning (RL)', icon: Gamepad2, component: ReinforcementLearningPage },
          { id: 'hyperparameter-tuning', label: 'Hyperparameter Tuning', icon: SlidersHorizontal, component: HyperparameterTuningPage },
      ]
  },
];

const analysisPages: Record<string, React.ComponentType<any>> = analysisCategories
  .flatMap(category => category.items)
  .reduce((acc, item) => {
    acc[item.id] = item.component;
    return acc;
  }, {} as Record<string, React.ComponentType<any>>);


export default function OptimizationApp() {
  const [data, setData] = useState<DataSet>([]);
  const [allHeaders, setAllHeaders] = useState<string[]>([]);
  const [numericHeaders, setNumericHeaders] = useState<string[]>([]);
  const [categoricalHeaders, setCategoricalHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [activeAnalysis, setActiveAnalysis] = useState<string>('linear-programming');
  const [openCategories, setOpenCategories] = useState<string[]>(['Deterministic Optimization', 'Metaheuristics', 'Neural Network & ML', 'Spatial Optimization', 'Multi-Objective & Robust']);
  const [searchTerm, setSearchTerm] = useState('');

  const { toast } = useToast();

  const handleClearData = useCallback(() => {
    setData([]);
    setAllHeaders([]);
    setNumericHeaders([]);
    setCategoricalHeaders([]);
    setFileName('');
  }, []);

  const processData = useCallback((content: string, name: string) => {
    try {
        const { headers: newHeaders, data: newData, numericHeaders: newNumericHeaders, categoricalHeaders: newCategoricalHeaders } = parseData(content);
        
        if (newData.length === 0 || newHeaders.length === 0) {
          throw new Error("No valid data found in the file.");
        }
        setData(newData);
        setAllHeaders(newHeaders);
        setNumericHeaders(newNumericHeaders);
        setCategoricalHeaders(newCategoricalHeaders);
        setFileName(name);
        toast({ title: 'Success', description: `Loaded "${name}" and found ${newData.length} rows.`});

      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'File Processing Error',
          description: error.message || 'Could not parse file. Please check the format.',
        });
        handleClearData();
      }
  }, [toast, handleClearData]);

  const handleLoadExampleData = (example: ExampleDataSet) => {
    processData(example.data, example.name);
    if(example.recommendedAnalysis) {
      setActiveAnalysis(example.recommendedAnalysis);
    }
  };

  const filteredAnalysisCategories = useMemo(() => {
    if (!searchTerm) {
      return analysisCategories;
    }
    const lowercasedFilter = searchTerm.toLowerCase();

    return analysisCategories.map(category => {
      const filteredItems = category.items.filter(item => item.label.toLowerCase().includes(lowercasedFilter));
      return filteredItems.length > 0 ? { ...category, items: filteredItems } : null;
    }).filter(Boolean) as typeof analysisCategories;
  }, [searchTerm]);

  const ActivePageComponent = analysisPages[activeAnalysis] || LinearProgrammingPage;
  const hasData = data.length > 0;

  const toggleCategory = (category: string) => {
    setOpenCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  };

  return (
    <SidebarProvider>
      <div className="flex w-full">
        <Sidebar>
          <SidebarContent className="flex flex-col gap-2 p-2">
             <div className='p-2'>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search scenarios..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
            </div>
            <SidebarMenu>
              {analysisCategories.map(category => (
                <Collapsible key={category.name} open={openCategories.includes(category.name)} onOpenChange={() => toggleCategory(category.name)}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start text-base px-2 font-semibold shadow-md border bg-white text-foreground hover:bg-slate-50">
                      <category.icon className="mr-2 h-5 w-5" />
                      <span>{category.name}</span>
                      <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", openCategories.includes(category.name) && 'rotate-180')} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                     <SidebarMenu>
                        {category.items.map(item => (
                          <SidebarMenuItem key={item.id}>
                            <SidebarMenuButton
                              onClick={() => setActiveAnalysis(item.id)}
                              isActive={activeAnalysis === item.id}
                              disabled={item.disabled}
                            >
                              <item.icon className="h-4 w-4"/>
                              {item.label}
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <SidebarInset>
          <div className="p-4 md:p-6 h-full flex flex-col gap-4">
            
            {hasData && (
              <DataPreview 
                fileName={fileName}
                data={data}
                headers={allHeaders}
                onDownload={() => {}}
                onClearData={handleClearData}
              />
            )}
            
            <ActivePageComponent 
                data={data}
                allHeaders={allHeaders}
                numericHeaders={numericHeaders}
                categoricalHeaders={categoricalHeaders}
                onLoadExample={handleLoadExampleData}
              />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
