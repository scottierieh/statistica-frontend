
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    FlaskConical,
    Target,
    Layers,
    BookOpen,
    HelpCircle,
    CheckCircle,
    ArrowLeftRight,
    Users,
    TrendingUp,
    Zap,
    Activity,
    UserX,
    Filter,
    DollarSign,
    BarChart3,
    Landmark,
    Megaphone,
    Package,
    Factory,
    Milestone,
    Database,
    Play,
    FileText
} from 'lucide-react';
import { type ExampleDataSet, exampleDatasets } from '@/lib/example-datasets';

interface ScenarioIntroPageProps {
    onLoadExample: (example: ExampleDataSet) => void;
}

const scenarioCategories = [
    {
        name: 'Policy / Institution',
        icon: Landmark,
        description: "Analyze the impact and distribution of policies and institutional changes.",
        items: [
            { name: "Pre/Post Policy Comparison", icon: ArrowLeftRight },
            { name: "Target Group Impact", icon: Target },
            { name: "Effectiveness Analysis", icon: CheckCircle },
        ]
    },
    {
        name: 'Marketing / Growth',
        icon: Megaphone,
        description: "Evaluate campaign performance and understand customer behavior.",
        items: [
            { name: "Campaign Performance", icon: TrendingUp },
            { name: "Segment Effectiveness", icon: Users },
            { name: "Channel Efficiency", icon: Zap },
        ]
    },
    {
        name: 'Product / Service',
        icon: Package,
        description: "Diagnose user engagement, feature adoption, and churn.",
        items: [
            { name: "Feature Adoption", icon: Layers },
            { name: "Engagement Change", icon: Activity },
            { name: "Churn & Drop-off", icon: UserX },
        ]
    },
    {
        name: 'Operations / Process',
        icon: Factory,
        description: "Identify bottlenecks and analyze cost-efficiency.",
        items: [
            { name: "Process Bottleneck", icon: Filter },
            { name: "Process Stability", icon: Activity },
            { name: "Cost Efficiency", icon: DollarSign },
        ]
    },
    {
        name: 'HR / Organization',
        icon: Users,
        description: "Analyze HR policies, attrition rates, and performance structures.",
        items: [
            { name: "HR Policy Outcomes", icon: Users },
            { name: "Attrition & Retention", icon: UserX },
            { name: "Performance Structure", icon: BarChart3 },
        ]
    },
];

const WORKFLOW_STEPS = [
    { id: 1, icon: Layers, label: 'Select Scenario', description: 'Choose a scenario that matches your business or research question (e.g., "Evaluate Campaign Performance").' },
    { id: 2, icon: Database, label: 'Prepare Data', description: 'Upload the relevant dataset. The system will guide you on the required variables for the chosen scenario.' },
    { id: 3, icon: Play, label: 'Run Automated Analysis', description: 'The platform automatically executes a series of statistical analyses (like T-Tests, Regression, or DID) tailored to answer your question.' },
    { id: 4, icon: FileText, label: 'Get Actionable Conclusion', description: 'Receive a synthesized report that provides a clear conclusion and actionable recommendations, not just raw statistical outputs.' }
];

const industryApplications = [
    {
        industry: 'Public Sector & Research',
        icon: Landmark,
        applications: [
            { method: 'Effectiveness Analysis', use: 'Measure the causal impact of a new educational program on student scores.' },
            { method: 'Pre/Post Comparison', use: 'Evaluate changes in public health metrics before and after a new regulation.' },
        ]
    },
    {
        industry: 'Marketing',
        icon: Megaphone,
        applications: [
            { method: 'Campaign Performance', use: 'Determine if a recent marketing campaign led to a significant lift in sales.' },
            { method: 'Channel Efficiency', use: 'Compare the conversion rates of users from organic search vs. paid ads.' },
        ]
    },
    {
        industry: 'Human Resources (HR)',
        icon: Users,
        applications: [
            { method: 'Attrition & Retention Analysis', use: 'Identify the key drivers of employee turnover in different departments.' },
            { method: 'HR Policy Outcomes', use: 'Assess if a new wellness program has improved employee satisfaction scores.' },
        ]
    },
     {
        industry: 'Product Management',
        icon: Package,
        applications: [
            { method: 'Feature Adoption Analysis', use: 'Analyze if a new feature is being adopted differently by various user segments.' },
            { method: 'Churn & Drop-off Diagnosis', use: 'Pinpoint where users are dropping off in your onboarding funnel.' },
        ]
    },
];


export default function ScenarioGuidePage({ onLoadExample }: ScenarioIntroPageProps) {
    const effectivenessExample = exampleDatasets.find(ex => ex.id === 'effectiveness-analysis');

    return (
        <div className="flex flex-1 items-center justify-center p-6 bg-slate-50">
            <Card className="w-full max-w-5xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <FlaskConical className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Scenario Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Diagnose problems and evaluate effectiveness through targeted analysis workflows.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="procedure">
                        <TabsList className="grid w-full grid-cols-4">
                             <TabsTrigger value="procedure">Analysis Procedure</TabsTrigger>
                            <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
                            <TabsTrigger value="use-cases">Use Cases</TabsTrigger>
                             <TabsTrigger value="what-is">What is It?</TabsTrigger>
                        </TabsList>
                        <TabsContent value="procedure" className="pt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Standard Analysis Procedure</CardTitle>
                                    <CardDescription>Our platform follows a structured, step-by-step process to guide you from data to insight. Here’s how it works.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-8">
                                        {WORKFLOW_STEPS.map((step, index) => (
                                            <div key={step.id} className="grid md:grid-cols-[auto,1fr] gap-6 items-start">
                                                <div className="flex flex-col items-center">
                                                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold">
                                                        {step.id}
                                                    </div>
                                                    {index < WORKFLOW_STEPS.length - 1 && (
                                                        <div className="w-0.5 flex-1 bg-border mt-2"></div>
                                                    )}
                                                </div>
                                                <div className="space-y-4 pt-1">
                                                    <div>
                                                        <h3 className="font-semibold text-lg mb-1 flex items-center gap-2"><step.icon className="w-5 h-5"/>{step.label}</h3>
                                                        <p className="text-muted-foreground">{step.description}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="what-is" className="pt-6">
                             <div className="bg-muted/30 rounded-lg p-6 space-y-4">
                                <h3 className="font-semibold text-xl mb-3 flex items-center gap-2">
                                  <HelpCircle className="w-6 h-6 text-primary" /> What is Scenario Analysis?
                                </h3>
                                <p className="text-muted-foreground">
                                    Scenario Analysis provides pre-built workflows for common business and research questions. Instead of choosing individual statistical tests, you select a scenario that matches your problem.
                                </p>
                                <p className="text-muted-foreground">
                                    The platform then automatically runs a series of appropriate analyses (like T-Tests, Difference-in-Differences, or regression) and presents the findings in the context of your specific question, providing a clear, actionable conclusion.
                                </p>
                                <div className="pt-4">
                                    {effectivenessExample && (
                                        <Button onClick={() => onLoadExample(effectivenessExample)} size="lg">
                                            <FlaskConical className="mr-2 h-5 w-5" />
                                            Load Example & Get Started
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="scenarios" className="pt-6">
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {scenarioCategories.map(category => {
                                const Icon = category.icon;
                                return (
                                    <Card key={category.name} className="hover:shadow-md transition-shadow">
                                        <CardHeader>
                                            <div className="flex items-center gap-3 mb-2">
                                                <Icon className="w-6 h-6 text-primary" />
                                                <CardTitle className="text-base">{category.name}</CardTitle>
                                            </div>
                                            <CardDescription className="text-xs">{category.description}</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <ul className="space-y-2">
                                                {category.items.map(item => (
                                                    <li key={item.name} className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <item.icon className="w-4 h-4 text-primary/80" />
                                                        <span>{item.name}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                            </div>
                        </TabsContent>
                         <TabsContent value="use-cases" className="pt-6">
                            <div className="space-y-8">
                                {industryApplications.map(industry => {
                                    const Icon = industry.icon;
                                    return (
                                    <div key={industry.industry}>
                                        <h3 className="text-xl font-bold font-headline mb-4 flex items-center gap-3">
                                            <Icon className="w-6 h-6 text-primary" />
                                            {industry.industry}
                                        </h3>
                                        <div className="grid md:grid-cols-2 gap-4">
                                        {industry.applications.map(app => (
                                            <Card key={app.method} className="flex flex-col">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-base">{app.method}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="flex-1">
                                                <p className="text-sm text-muted-foreground">{app.use}</p>
                                            </CardContent>
                                            </Card>
                                        ))}
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
};
