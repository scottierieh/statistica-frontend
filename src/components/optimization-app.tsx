'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
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
  FileText,
  Loader2,
  TrendingUp,
  Landmark,
  Megaphone,
  Package,
  Factory,
  Users,
  ArrowLeftRight,
  Target,
  BarChart3,
  Zap,
  Layers,
  Activity,
  UserX,
  Filter,
  DollarSign,
  FlaskConical,
  Search,
  Check,
  TestTube,
  BookOpen,
  Building,
  Award,
  Truck,
  Percent,
  Container,
  GitBranch,
  BrainCircuit,
  Repeat,
  Component,
  ArrowDown,
  Settings2,
  Feather,
  Smile,
  Scaling,
  AreaChart,
  LineChart,
  Car,
  ChevronsUpDown,
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
  Thermometer,
  Waypoints,
  Ban,
  Rocket,
  Wind,
  MessageSquare,
  Palette
} from 'lucide-react';


import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';
import { ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  type DataSet,
  parseData,
  unparseData,
} from '@/lib/stats';
import { useToast } from '@/hooks/use-toast';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import DataUploader from './data-uploader';
import DataPreview from './data-preview';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';

// Import scenario pages
import LinearProgrammingPage from '@/components/pages/optimization/linear-programming-page';
import GoalProgrammingPage from '@/components/pages/optimization/goal-programming-page';
import TransportationProblemPage from '@/components/pages/optimization/transportation-problem-page';
import IntegerProgrammingPage from '@/components/pages/optimization/integer-programming-page';
import GradientDescentPage from '@/components/pages/optimization/gradient-descent-page';
import NonLinearProgrammingPage from '@/components/pages/optimization/nonlinear-programming-page';
import DynamicProgrammingPage from '@/components/pages/optimization/dynamic-programming-page';
import ConvexOptimizationPage from '@/components/pages/optimization/convex-optimization-page';
import GeneticAlgorithmPage from './pages/optimization/genetic-algorithm-page';
import ParticleSwarmPage from './pages/optimization/particle-swarm-page';
import SimulatedAnnealingPage from './pages/optimization/simulated-annealing-page';
import AntColonyPage from './pages/optimization/ant-colony-page';
import TabuSearchPage from './pages/optimization/tabu-search-page';
import SgdPage from './pages/optimization/sgd-page';
import AdamPage from './pages/optimization/adam-page';
import RmspropPage from './pages/optimization/rmsprop-page';
import AdagradPage from './pages/optimization/adagrad-page';
import BayesianOptimizationPage from './pages/optimization/bayesian-optimization-page';
import SentimentAnalysisPage from './pages/optimization/sentiment-analysis-page';
import TopicModelingPage from './pages/optimization/topic-modeling-page';
import WordCloudPage from './pages/optimization/word-cloud-page';


const analysisCategories = [
    {
        name: 'Deterministic Optimization',
        icon: Settings2,
        items: [
            { id: 'linear-programming', label: 'Linear Programming (LP)', icon: TrendingUp },
            { id: 'integer-programming', label: 'Integer Programming (IP)', icon: Sigma },
            { id: 'nonlinear-programming', label: 'Non-linear Programming (NLP)', icon: TrendingUp, disabled: true },
            { id: 'goal-programming', label: 'Goal Programming', icon: Award },
            { id: 'transportation-problem', label: 'Transportation Problem', icon: Truck },
            { id: 'gradient-descent', label: 'Gradient Descent', icon: ArrowDown },
            { id: 'dynamic-programming', label: 'Dynamic Programming (DP)', icon: Repeat, disabled: false },
            { id: 'convex-optimization', label: 'Convex Optimization', icon: Component, disabled: false },
        ]
    },
    {
        name: 'Metaheuristics',
        icon: Feather,
        items: [
            { id: 'genetic-algorithm', label: 'Genetic Algorithm (GA)', icon: GitBranch, disabled: false },
            { id: 'particle-swarm', label: 'Particle Swarm (PSO)', icon: Users, disabled: false },
            { id: 'simulated-annealing', label: 'Simulated Annealing (SA)', icon: Thermometer, disabled: false },
            { id: 'ant-colony', label: 'Ant Colony Optimization (ACO)', icon: Waypoints, disabled: false },
            { id: 'tabu-search', label: 'Tabu Search', icon: Ban, disabled: false },
        ]
    },
    {
        name: 'Neural Network & ML',
        icon: BrainCircuit,
        items: [
            { id: 'sgd', label: 'SGD', icon: TrendingDown, disabled: false },
            { id: 'adam', label: 'Adam', icon: Rocket, disabled: false },
            { id: 'rmsprop', label: 'RMSProp', icon: Wind, disabled: false },
            { id: 'adagrad', label: 'Adagrad', icon: Scaling, disabled: false },
            { id: 'bayesian-optimization', label: 'Bayesian Optimization', icon: BrainCircuit, disabled: false },
        ]
    },
    {
        name: 'Natural Language Processing',
        icon: MessageSquare,
        items: [
            { id: 'sentiment-analysis', label: 'Sentiment Analysis', icon: Smile, disabled: false },
            { id: 'topic-modeling', label: 'Topic Modeling', icon: Layers, disabled: false },
            { id: 'word-cloud', label: 'Word Cloud', icon: Palette, disabled: false },
        ]
    }
];

const analysisPages: Record<string, React.ComponentType<any>> = {
  'linear-programming': LinearProgrammingPage,
  'goal-programming': GoalProgrammingPage,
  'transportation-problem': TransportationProblemPage,
  'integer-programming': IntegerProgrammingPage,
  'gradient-descent': GradientDescentPage,
  'nonlinear-programming': NonLinearProgrammingPage,
  'dynamic-programming': DynamicProgrammingPage,
  'convex-optimization': ConvexOptimizationPage,
  'genetic-algorithm': GeneticAlgorithmPage,
  'particle-swarm': ParticleSwarmPage,
  'simulated-annealing': SimulatedAnnealingPage,
  'ant-colony': AntColonyPage,
  'tabu-search': TabuSearchPage,
  'sgd': SgdPage,
  'adam': AdamPage,
  'rmsprop': RmspropPage,
  'adagrad': AdagradPage,
  'bayesian-optimization': BayesianOptimizationPage,
  'sentiment-analysis': SentimentAnalysisPage,
  'topic-modeling': TopicModelingPage,
  'word-cloud': WordCloudPage,
};


export default function OptimizationApp() {
  const [data, setData] = useState<DataSet>([]);
  const [allHeaders, setAllHeaders] = useState<string[]>([]);
  const [numericHeaders, setNumericHeaders] = useState<string[]>([]);
  const [categoricalHeaders, setCategoricalHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<string>('linear-programming');
  const [openCategories, setOpenCategories] = useState<string[]>(['Deterministic Optimization', 'Metaheuristics', 'Neural Network & ML', 'Natural Language Processing']);

  const { toast } = useToast();

  const handleClearData = useCallback(() => {
    setData([]);
    setAllHeaders([]);
    setNumericHeaders([]);
    setCategoricalHeaders([]);
    setFileName('');
  }, []);

  const processData = useCallback((content: string, name: string) => {
    setIsUploading(true);
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
        toast({ variant: 'destructive', title: 'File Processing Error', description: error.message });
        handleClearData();
      } finally {
        setIsUploading(false);
      }
  }, [toast, handleClearData]);

  const handleFileSelected = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target?.result as string;
        processData(content, file.name);
    };
    reader.onerror = () => {
        toast({ variant: 'destructive', title: 'File Read Error', description: 'An error occurred while reading the file.' });
    };
    if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
        reader.readAsArrayBuffer(file);
        reader.onload = (e) => {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, {type: 'array'});
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const csv = XLSX.utils.sheet_to_csv(worksheet);
            processData(csv, file.name);
        }
    } else {
        reader.readAsText(file);
    }
  }, [processData, toast]);

  const handleLoadExampleData = (example: ExampleDataSet) => {
    processData(example.data, example.name);
    if(example.recommendedAnalysis) {
      setActiveAnalysis(example.recommendedAnalysis);
    }
  };

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
              <DataUploader 
                onFileSelected={handleFileSelected}
                loading={isUploading}
              />
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
