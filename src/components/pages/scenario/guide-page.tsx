
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
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

export default function ScenarioGuidePage({ onLoadExample }: ScenarioIntroPageProps) {
    const effectivenessExample = exampleDatasets.find(ex => ex.id === 'effectiveness-analysis');

    return (
        <div className="flex flex-1 items-center justify-center p-6 bg-slate-50">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <FlaskConical className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Scenario Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Diagnose problems and evaluate effectiveness through targeted analysis scenarios.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="bg-muted/30 rounded-lg p-5">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <HelpCircle className="w-5 h-5 text-primary" /> What is Scenario Analysis?
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Scenario Analysis provides pre-built workflows for common business and research questions. Instead of choosing individual statistical tests, you select a scenario that matches your problem. The platform then automatically runs the appropriate analyses (like T-Tests, DID, or regression) and presents the findings in the context of your question.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-2xl font-bold text-center mb-6">Explore Analysis Scenarios</h3>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {scenarioCategories.map(category => {
                                const Icon = category.icon;
                                return (
                                    <Card key={category.name} className="hover:shadow-md transition-shadow">
                                        <CardHeader>
                                            <div className="flex items-center gap-3 mb-2">
                                                <Icon className="w-6 h-6 text-primary" />
                                                <CardTitle className="text-lg">{category.name}</CardTitle>
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
                    </div>

                    <div className="text-center pt-4">
                        {effectivenessExample && (
                            <Button onClick={() => onLoadExample(effectivenessExample)} size="lg">
                                <FlaskConical className="mr-2 h-5 w-5" />
                                Load Example Dataset
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
