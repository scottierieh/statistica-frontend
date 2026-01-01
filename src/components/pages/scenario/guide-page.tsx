
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
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
    Milestone,
    Database,
    Play,
    Settings2,
    ShieldCheck,
    Sigma,
    Variable,
    Lightbulb,
    Check,
    FileSearch,
    Wand2,
    FileUp,
    Bot,
    Sparkles
} from 'lucide-react';
import { type ExampleDataSet, exampleDatasets } from '@/lib/example-datasets';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { motion } from 'framer-motion';

interface ScenarioIntroPageProps {
    onLoadExample: (example: ExampleDataSet) => void;
}

const WORKFLOW_STEPS = [
    { id: 1, icon: Layers, label: 'Select Scenario', description: 'Choose a scenario that matches your business or research question (e.g., "Evaluate Campaign Performance").' },
    { id: 2, icon: Database, label: 'Prepare Data', description: 'Upload the relevant dataset. The system will guide you on the required variables for the chosen scenario.' },
    { id: 3, icon: Play, label: 'Run Automated Analysis', description: 'The platform automatically executes a series of statistical analyses (like T-Tests, Regression, or DID) tailored to answer your question.' },
    { id: 4, icon: FileText, label: 'Get Actionable Conclusion', description: 'Receive a synthesized report that provides a clear conclusion and actionable recommendations, not just raw statistical outputs.' }
];

const RUN_ANALYSIS_STEPS = [
    { id: 1, icon: Variable, label: 'Variables', description: 'Select the dependent and independent variables for your analysis.' },
    { id: 2, icon: Settings2, label: 'Settings', description: 'Configure model-specific parameters, such as alpha levels or post-hoc tests.' },
    { id: 3, icon: ShieldCheck, label: 'Validation', description: 'The system checks your data against the statistical assumptions required for the chosen test.' },
    { id: 4, icon: FileSearch, label: 'Summary', description: 'Review a high-level, business-friendly summary of the key findings. For example: "Price and Quality positively impact Satisfaction."' },
    { id: 5, icon: Lightbulb, label: 'Reasoning', description: 'Understand the "why" behind the summary with simple explanations of the statistical results.' },
    { id: 6, icon: Sigma, label: 'Statistics', description: 'Dive deep into the full statistical output, including tables (e.g., ANOVA, coefficients) and charts.' }
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

    const VisualStep = ({ step }: { step: typeof RUN_ANALYSIS_STEPS[0] }) => {
        return (
            <Card className="overflow-hidden">
                <CardContent className="p-0">
                    <div className="bg-muted h-64 rounded-lg flex items-center justify-center p-4">
                        {step.id === 1 && (
                            <div className="w-full max-w-sm space-y-3">
                                <h4 className="text-sm font-semibold text-center mb-2">Select Variables</h4>
                                <div className="p-3 bg-white rounded-md border shadow-sm">
                                    <Label className="text-xs text-muted-foreground">Dependent Variable</Label>
                                    <div className="flex items-center justify-between mt-1"><span>Satisfaction</span> <Target className="w-4 h-4 text-primary"/></div>
                                </div>
                                <div className="p-3 bg-white rounded-md border shadow-sm">
                                    <Label className="text-xs text-muted-foreground">Independent Variables</Label>
                                    <div className="flex items-center justify-between mt-1"><span>Price, Quality</span><Users className="w-4 h-4 text-primary"/></div>
                                </div>
                            </div>
                        )}
                        {step.id === 2 && (
                            <div className="w-full max-w-sm space-y-3">
                                <h4 className="text-sm font-semibold text-center mb-2">Configure Settings</h4>
                                <div className="flex items-center justify-between p-3 bg-white rounded-md border shadow-sm">
                                    <Label>Alpha Level</Label>
                                    <Badge>0.05</Badge>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-white rounded-md border shadow-sm">
                                    <Label>Post-hoc Test</Label>
                                    <Badge variant="outline">Tukey HSD</Badge>
                                </div>
                            </div>
                        )}
                        {step.id === 3 && (
                            <div className="w-full max-w-sm space-y-3">
                                <h4 className="text-sm font-semibold text-center mb-2">Data Validation</h4>
                                <div className="p-3 bg-white rounded-md border shadow-sm flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"/>
                                    <div>
                                        <p className="font-medium text-sm">Variables selected</p>
                                        <p className="text-xs text-muted-foreground">3 variable(s) selected</p>
                                    </div>
                                </div>
                                <div className="p-3 bg-white rounded-md border shadow-sm flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"/>
                                    <div>
                                        <p className="font-medium text-sm">Data completeness</p>
                                        <p className="text-xs text-muted-foreground">No missing values detected</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        {step.id === 4 && (
                            <div className="w-full max-w-md p-6 bg-white rounded-lg border shadow-sm">
                                <h4 className="font-semibold text-lg flex items-center gap-2 mb-4">
                                    <Sparkles className="w-5 h-5 text-primary" /> Key Findings
                                </h4>
                                <Alert className="border-primary bg-primary/5">
                                    <AlertTitle className="flex items-center gap-2"><CheckCircle className="w-4 h-4"/>Significant Result</AlertTitle>
                                    <AlertDescription>The analysis shows both <strong>Price</strong> and <strong>Quality</strong> have a significant positive impact on <strong>Satisfaction</strong>.</AlertDescription>
                                </Alert>
                            </div>
                        )}
                        {step.id === 5 && (
                            <div className="w-full max-w-md p-6 bg-white rounded-lg border shadow-sm">
                                <h4 className="font-semibold text-lg flex items-center gap-2 mb-4">
                                    <Lightbulb className="w-5 h-5 text-primary" /> Why This Conclusion?
                                </h4>
                                <ul className="text-sm space-y-3 text-muted-foreground">
                                    <li className="flex gap-3"><strong className="text-primary font-bold">1.</strong>Both 'Price' and 'Quality' have p-values less than 0.05, meaning their effect is not due to random chance.</li>
                                    <li className="flex gap-3"><strong className="text-primary font-bold">2.</strong>The model's R-squared value (0.65) shows that 65% of the change in 'Satisfaction' is explained by these two factors.</li>
                                </ul>
                            </div>
                        )}
                        {step.id === 6 && (
                            <div className="w-full max-w-sm space-y-3">
                                <h4 className="text-sm font-semibold text-center mb-2">Full Statistics</h4>
                                <Table className="text-xs bg-white rounded-md border">
                                    <TableHeader><TableRow><TableHead>Variable</TableHead><TableHead>Coefficient</TableHead><TableHead>p-value</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        <TableRow><TableCell>Price</TableCell><TableCell>0.45</TableCell><TableCell>&lt;0.001</TableCell></TableRow>
                                        <TableRow><TableCell>Quality</TableCell><TableCell>0.62</TableCell><TableCell>&lt;0.001</TableCell></TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="space-y-12">
            <section>
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold font-headline mb-3">Analysis Procedure</h2>
                    <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                        A scenario is not a single statistical test, but a workflow of multiple analyses designed to answer a complex business question.
                    </p>
                </div>
                <div className="grid md:grid-cols-2 gap-8 items-center">
                    <div className="space-y-4">
                        <h3 className="font-semibold text-xl">The Power of Automated Workflows</h3>
                        <p className="text-muted-foreground">
                            A single business question often requires multiple statistical tests to answer correctly. For example, to know if a campaign was effective, you need more than just a pre-post comparison. You need to account for external trends and ensure the results are robust.
                        </p>
                        <p className="text-muted-foreground">
                            Scenario Analysis automates this entire workflow, running tests like Difference-in-Differences, Trend Analysis, and Effect Size calculations to give you a reliable, synthesized answer.
                        </p>
                    </div>
                    <Card className="p-6">
                        <div className="space-y-4">
                            {WORKFLOW_STEPS.map((step) => (
                                <div key={step.id} className="flex items-start gap-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        <step.icon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold">{step.label}</h4>
                                        <p className="text-sm text-muted-foreground">{step.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </section>
            
            <section>
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold font-headline mb-3">Inside a Statistica Analysis</h2>
                    <p className="text-lg text-muted-foreground">Every analysis follows a transparent, 6-step journey from setup to final statistics.</p>
                </div>
                <div className="space-y-8">
                     {RUN_ANALYSIS_STEPS.map((step, index) => (
                        <Card key={step.id} className="overflow-hidden">
                            <div className="grid md:grid-cols-2 items-center">
                                <div className={`p-8 space-y-4 ${index % 2 === 0 ? 'md:order-1' : 'md:order-2'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold flex-shrink-0 border-2 border-primary/20">
                                            <step.icon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-primary uppercase">STEP {step.id}</p>
                                            <h4 className="font-bold text-xl">{step.label}</h4>
                                        </div>
                                    </div>
                                    <p className="text-muted-foreground">{step.description}</p>
                                </div>
                                <div className={`bg-muted h-full flex items-center justify-center p-6 ${index % 2 === 0 ? 'md:order-2' : 'md:order-1'}`}>
                                    <VisualStep step={step} />
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </section>
            
            <section>
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold font-headline mb-3">Use Cases by Field</h2>
                    <p className="text-lg text-muted-foreground">How different industries leverage scenario analysis.</p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {industryApplications.map(industry => {
                        const Icon = industry.icon;
                        return (
                            <Card key={industry.industry} className="flex flex-col">
                                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                                    <Icon className="w-6 h-6 text-primary" />
                                    <CardTitle className="text-base">{industry.industry}</CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <ul className="space-y-2">
                                        {industry.applications.map(app => (
                                            <li key={app.method} className="text-sm">
                                                <strong className="font-medium">{app.method}:</strong>
                                                <span className="text-muted-foreground"> {app.use}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </section>

            <div className="text-center pt-8">
                {effectivenessExample && (
                    <Button onClick={() => onLoadExample(effectivenessExample)} size="lg">
                        <FlaskConical className="mr-2 h-5 w-5" />
                        Load Example & Get Started
                    </Button>
                )}
            </div>
        </div>
    );
}
