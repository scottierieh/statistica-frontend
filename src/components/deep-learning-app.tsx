
'use client';

import { useState, useCallback } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenu,
} from '@/components/ui/sidebar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BrainCircuit, Cpu, Binary, Search, Share2, Layers, Bot, Image as ImageIcon } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import DnnClassificationPage from './pages/dnn-classification-page';
import DataUploader from './data-uploader';
import { useToast } from '@/hooks/use-toast';
import { type DataSet, parseData } from '@/lib/stats';
import type { ExampleDataSet } from '@/lib/example-datasets';
import * as XLSX from 'xlsx';


const deepLearningMenu = [
  {
    category: 'Classification',
    icon: Cpu,
    methods: [
      { id: 'dnn', label: 'Deep Neural Network (DNN)' },
      { id: 'cnn', label: 'Convolutional Neural Network (CNN)' },
      { id: 'rnn', label: 'Recurrent Neural Network (RNN)' },
      { id: 'transformer-class', label: 'Transformer-based Classification' }
    ]
  },
  {
    category: 'Prediction',
    icon: Share2,
    methods: [
      { id: 'lstm-gru', label: 'Time Series Forecasting (LSTM, GRU)' },
      { id: 'seq2seq', label: 'Sequence-to-Sequence (Seq2Seq)' },
      { id: 'deep-regression', label: 'Deep Regression Networks' }
    ]
  },
  {
    category: 'Clustering',
    icon: Binary,
    methods: [
      { id: 'autoencoder-cluster', label: 'Deep Autoencoder Clustering' },
      { id: 'dec', label: 'Deep Embedded Clustering (DEC)' },
      { id: 'vae-cluster', label: 'VAE Clustering' }
    ]
  },
  {
    category: 'Pattern Learning',
    icon: Share2,
    methods: [
      { id: 'rnn-transformer-pattern', label: 'Sequence Pattern Modeling' },
      { id: 'rl-behavior', label: 'Reinforcement Learning' }
    ]
  },
  {
    category: 'Outlier Detection',
    icon: Search,
    methods: [
      { id: 'autoencoder-anomaly', label: 'Autoencoder Anomaly Detection' },
      { id: 'gan-anomaly', label: 'GAN-based Anomaly Detection' },
      { id: 'deep-ensemble-anomaly', label: 'Deep Ensemble Anomaly Detection' }
    ]
  },
  {
    category: 'Dimensionality Reduction',
    icon: Layers,
    methods: [
      { id: 'autoencoder', label: 'Autoencoder' },
      { id: 'vae', label: 'Variational Autoencoder (VAE)' },
      { id: 'deep-embedding', label: 'Deep Embedding Learning' }
    ]
  },
  {
    category: 'Text Mining',
    icon: Bot,
    methods: [
      { id: 'word-embeddings', label: 'Word Embeddings (Word2Vec, GloVe)' },
      { id: 'transformer-text', label: 'Transformer Models (BERT, GPT)' },
      { id: 'deep-sentiment', label: 'Deep Learning-based Sentiment/Topic Analysis' }
    ]
  },
  {
    category: 'Image & Speech Mining',
    icon: ImageIcon,
    methods: [
      { id: 'cnn-feature', label: 'CNN for Feature Extraction' },
      { id: 'gan', label: 'Generative Adversarial Networks (GAN)' },
      { id: 'rnn-transformer-speech', label: 'RNN/Transformer for Speech Recognition' }
    ]
  }
];

const pageComponents: { [key: string]: React.FC<any> } = {
  'dnn': DnnClassificationPage,
};


export default function DeepLearningApp() {
    const [activeMethod, setActiveMethod] = useState<string | null>('dnn');
    const [openCategories, setOpenCategories] = useState<string[]>(deepLearningMenu.map(c => c.category));
    
    // Data state management
    const [data, setData] = useState<DataSet>([]);
    const [allHeaders, setAllHeaders] = useState<string[]>([]);
    const [numericHeaders, setNumericHeaders] = useState<string[]>([]);
    const [categoricalHeaders, setCategoricalHeaders] = useState<string[]>([]);
    const [fileName, setFileName] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const { toast } = useToast();

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
            toast({
              variant: 'destructive',
              title: 'File Processing Error',
              description: error.message || 'Could not parse file. Please check the format.',
            });
            setData([]);
          } finally {
            setIsUploading(false);
          }
    }, [toast]);
      
    const handleFileSelected = useCallback((file: File) => {
        setIsUploading(true);
        const reader = new FileReader();

        reader.onload = (e) => {
            const content = e.target?.result as string;
            if (!content) {
                toast({ variant: 'destructive', title: 'File Read Error', description: 'Could not read file content.' });
                setIsUploading(false);
                return;
            }
            processData(content, file.name);
        };

        reader.onerror = (e) => {
            toast({ variant: 'destructive', title: 'File Read Error', description: 'An error occurred while reading the file.' });
            setIsUploading(false);
        }
        
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
    };

    const toggleCategory = (category: string) => {
        setOpenCategories(prev => 
        prev.includes(category) 
            ? prev.filter(c => c !== category)
            : [...prev, category]
        )
    };
    
    const ActivePageComponent = activeMethod ? pageComponents[activeMethod] : null;

    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full">
                <Sidebar>
                    <SidebarHeader>
                        <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                            <BrainCircuit className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <h1 className="text-xl font-headline font-bold">Deep Learning</h1>
                        </div>
                    </SidebarHeader>
                    <SidebarContent className="flex flex-col gap-2 p-2">
                        <div className="flex-1 overflow-y-auto">
                            {deepLearningMenu.map((category) => {
                                const Icon = category.icon;
                                const isOpen = openCategories.includes(category.category);
                                return (
                                    <Collapsible key={category.category} open={isOpen} onOpenChange={() => toggleCategory(category.category)}>
                                        <CollapsibleTrigger className="w-full">
                                            <div className={cn("flex items-center gap-2 rounded-md p-2 text-sm font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground", isOpen && "bg-sidebar-accent text-sidebar-accent-foreground")}>
                                                <Icon className="h-4 w-4" />
                                                <span>{category.category}</span>
                                                <ChevronDown className={cn("h-4 w-4 ml-auto transition-transform", isOpen ? "rotate-180" : "")} />
                                            </div>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="pl-6 py-1">
                                            <SidebarMenu>
                                                {category.methods.map(method => (
                                                <SidebarMenuItem key={method.id}>
                                                    <SidebarMenuButton
                                                        onClick={() => setActiveMethod(method.id)}
                                                        isActive={activeMethod === method.id}
                                                        className="justify-start w-full h-8 text-xs"
                                                    >
                                                        <span>{method.label}</span>
                                                    </SidebarMenuButton>
                                                </SidebarMenuItem>
                                                ))}
                                            </SidebarMenu>
                                        </CollapsibleContent>
                                    </Collapsible>
                                )
                            })}
                        </div>
                    </SidebarContent>
                </Sidebar>
                <main className="flex-1 p-4 md:p-6 lg:p-8">
                     {ActivePageComponent ? (
                        <ActivePageComponent 
                            data={data}
                            allHeaders={allHeaders}
                            numericHeaders={numericHeaders}
                            categoricalHeaders={categoricalHeaders}
                            onLoadExample={handleLoadExampleData}
                            onFileSelected={handleFileSelected}
                            isUploading={isUploading}
                        />
                    ) : (
                        <div className="flex flex-1 items-center justify-center h-full">
                            <Card className="w-full max-w-3xl text-center">
                                <CardHeader>
                                    <div className="mx-auto bg-secondary p-4 rounded-full mb-4">
                                        <BrainCircuit className="h-12 w-12 text-secondary-foreground" />
                                    </div>
                                    <CardTitle className="font-headline text-3xl">
                                        Deep Learning Workbench
                                    </CardTitle>
                                    <CardDescription>
                                        Select a technique from the sidebar to begin building, training, and deploying your deep learning models.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">Advanced features for model building, data preprocessing, training, and deployment will be available here soon.</p>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </main>
            </div>
        </SidebarProvider>
    );
}
