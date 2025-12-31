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
  TestTube
} from 'lucide-react';
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
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';

// Import newly created pages
import PrePostPolicyPage from './pages/scenario/pre-post-policy-page';
import PolicyTargetImpactPage from './pages/scenario/policy-target-impact-page';
import PolicyDistributionPage from './pages/scenario/policy-distribution-page';
import CampaignPerformancePage from './pages/scenario/campaign-performance-page';
import SegmentEffectivenessPage from './pages/scenario/segment-effectiveness-page';
import ChannelEfficiencyPage from './pages/scenario/channel-efficiency-page';
import FeatureAdoptionPage from './pages/scenario/feature-adoption-page';
import EngagementChangePage from './pages/scenario/engagement-change-page';
import ChurnDiagnosisPage from './pages/scenario/churn-diagnosis-page';
import ProcessBottleneckPage from './pages/scenario/process-bottleneck-page';
import ProcessStabilityPage from './pages/scenario/process-stability-page';
import CostEfficiencyPage from './pages/scenario/cost-efficiency-page';
import HrPolicyOutcomePage from './pages/scenario/hr-policy-outcome-page';
import AttritionAnalysisPage from './pages/scenario/attrition-analysis-page';
import PerformanceStructurePage from './pages/scenario/performance-structure-page';
import EffectivenessPage from './pages/EffectivenessPage';
import SimpleTestPage from './pages/scenario/simple-test-page';

const analysisCategories = [
    {
        name: 'Policy / Institution',
        icon: Landmark,
        items: [
            { id: 'pre-post-policy', label: 'Pre/Post Policy Comparison', component: PrePostPolicyPage, icon: ArrowLeftRight },
            { id: 'policy-target-impact', label: 'Target Group Impact Analysis', component: PolicyTargetImpactPage, icon: Target },
            { id: 'policy-distribution', label: 'Policy Outcome Distribution', component: PolicyDistributionPage, icon: BarChart3 },
            { id: 'effectiveness-analysis', label: 'Policy Effectiveness Analysis', component: EffectivenessPage, icon: Check },
        ],
    },
    {
        name: 'Marketing / Growth',
        icon: Megaphone,
        items: [
            { id: 'campaign-performance', label: 'Campaign Performance Evaluation', component: CampaignPerformancePage, icon: TrendingUp },
            { id: 'segment-effectiveness', label: 'Customer Segment Effectiveness', component: SegmentEffectivenessPage, icon: Users },
            { id: 'channel-efficiency', label: 'Channel Efficiency Diagnosis', component: ChannelEfficiencyPage, icon: Zap },
        ],
    },
    {
        name: 'Product / Service',
        icon: Package,
        items: [
            { id: 'feature-adoption', label: 'Feature Adoption Analysis', component: FeatureAdoptionPage, icon: Layers },
            { id: 'engagement-change', label: 'User Engagement Change Analysis', component: EngagementChangePage, icon: Activity },
            { id: 'churn-diagnosis', label: 'Churn & Drop-off Diagnosis', component: ChurnDiagnosisPage, icon: UserX },
        ],
    },
    {
        name: 'Operations / Process',
        icon: Factory,
        items: [
            { id: 'process-bottleneck', label: 'Process Bottleneck Diagnosis', component: ProcessBottleneckPage, icon: Filter },
            { id: 'process-stability', label: 'Process Stability & Quality', component: ProcessStabilityPage, icon: Activity },
            { id: 'cost-efficiency', label: 'Cost & Efficiency Structure', component: CostEfficiencyPage, icon: DollarSign },
        ],
    },
    {
        name: 'HR / Organization',
        icon: Users,
        items: [
            { id: 'hr-policy-outcome', label: 'HR Policy Outcome Analysis', component: HrPolicyOutcomePage, icon: Users },
            { id: 'attrition-retention', label: 'Attrition & Retention Analysis', component: AttritionAnalysisPage, icon: UserX },
            { id: 'performance-structure', label: 'Performance Structure Diagnosis', component: PerformanceStructurePage, icon: BarChart3 },
        ],
    },
    {
        name: 'Testing',
        icon: TestTube,
        items: [
            { id: 'simple-test', label: 'Simple Sum Analysis', component: SimpleTestPage, icon: TestTube },
        ],
    }
];

const analysisPages: Record<string, React.ComponentType<any>> = analysisCategories
  .flatMap(category => category.items)
  .reduce((acc, item) => {
    acc[item.id] = item.component;
    return acc;
  }, {} as Record<string, React.ComponentType<any>>);


export default function ScenarioApp() {
  const [data, setData] = useState<DataSet>([]);
  const [allHeaders, setAllHeaders] = useState<string[]>([]);
  const [numericHeaders, setNumericHeaders] = useState<string[]>([]);
  const [categoricalHeaders, setCategoricalHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<string>('pre-post-policy');
  const [openCategories, setOpenCategories] = useState<string[]>(['Policy / Institution']);
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

  const ActivePageComponent = analysisPages[activeAnalysis] || (() => <div>Select an analysis</div>);
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
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader>
            <div className='p-2 space-y-2'>
              <DataUploader 
                onFileSelected={handleFileSelected}
                loading={isUploading}
              />
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search analyses..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="flex flex-col gap-2 p-2">
            <SidebarMenu>
              {filteredAnalysisCategories.map(category => (
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
                              >
                                {item.icon && <item.icon className="h-4 w-4"/>}
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
            <header className="flex items-center justify-between md:justify-end">
                <SidebarTrigger />
                <div />
            </header>
            
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
