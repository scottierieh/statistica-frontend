
'use client';

import { useState } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenu,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BrainCircuit, Cpu, Binary, Search, Share2, Layers, Bot, Image as ImageIcon } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

const deepLearningMenu = [
  {
    category: 'Classification',
    icon: Cpu,
    methods: [
      'Deep Neural Network (DNN)',
      'Convolutional Neural Network (CNN)',
      'Recurrent Neural Network (RNN)',
      'Transformer-based Classification'
    ]
  },
  {
    category: 'Prediction',
    icon: Share2,
    methods: [
      'Time Series Forecasting (LSTM, GRU)',
      'Sequence-to-Sequence (Seq2Seq)',
      'Deep Regression Networks'
    ]
  },
  {
    category: 'Clustering',
    icon: Binary,
    methods: [
      'Deep Autoencoder Clustering',
      'Deep Embedded Clustering (DEC)',
      'Variational Autoencoder (VAE) Clustering'
    ]
  },
  {
    category: 'Pattern Learning',
    icon: Share2,
    methods: [
      'Sequence Pattern Modeling (RNN, Transformer)',
      'Reinforcement Learning for Behavior Prediction'
    ]
  },
  {
    category: 'Outlier Detection',
    icon: Search,
    methods: [
      'Autoencoder-based Anomaly Detection',
      'GAN-based Anomaly Detection (AnoGAN)',
      'Deep Ensemble Anomaly Detection'
    ]
  },
  {
    category: 'Dimensionality Reduction',
    icon: Layers,
    methods: [
      'Autoencoder',
      'Variational Autoencoder (VAE)',
      'Deep Embedding Learning'
    ]
  },
  {
    category: 'Text Mining',
    icon: Bot,
    methods: [
      'Word Embeddings (Word2Vec, GloVe)',
      'Transformer Models (BERT, GPT)',
      'Deep Learning-based Sentiment/Topic Analysis'
    ]
  },
  {
    category: 'Image & Speech Mining',
    icon: ImageIcon,
    methods: [
      'CNN for Feature Extraction',
      'Generative Adversarial Networks (GAN)',
      'RNN/Transformer for Speech Recognition'
    ]
  }
];


export default function DeepLearningApp() {
    const [activeMethod, setActiveMethod] = useState<string | null>(null);
    const [openCategories, setOpenCategories] = useState<string[]>(deepLearningMenu.map(c => c.category));

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
                                                <SidebarMenuItem key={method}>
                                                    <SidebarMenuButton
                                                        onClick={() => setActiveMethod(method)}
                                                        isActive={activeMethod === method}
                                                        className="justify-start w-full h-8 text-xs"
                                                    >
                                                        <span>{method}</span>
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
                    <div className="flex flex-1 items-center justify-center h-full">
                        <Card className="w-full max-w-3xl text-center">
                            <CardHeader>
                                <div className="mx-auto bg-secondary p-4 rounded-full mb-4">
                                    <BrainCircuit className="h-12 w-12 text-secondary-foreground" />
                                </div>
                                <CardTitle className="font-headline text-3xl">
                                    {activeMethod ? activeMethod : "Deep Learning Workbench"}
                                </CardTitle>
                                <CardDescription>
                                    {activeMethod 
                                        ? `This tool for ${activeMethod} is currently under construction.`
                                        : "Select a technique from the sidebar to begin building, training, and deploying your deep learning models."
                                    }
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">Advanced features for model building, data preprocessing, training, and deployment will be available here soon.</p>
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>
        </SidebarProvider>
    );
}
