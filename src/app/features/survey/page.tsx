
'use client';
import React from 'react';
import { FeaturePageHeader } from '@/components/feature-page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Target, Handshake, DollarSign, Users, ClipboardList, Network } from 'lucide-react';

const analysisMethods = [
    { category: 'Customer Feedback', method: 'CSAT (Customer Satisfaction Score)', description: 'Measures overall customer satisfaction on a scale (e.g., 1–5 or 1–10)', useCase: 'Evaluating service or product satisfaction in surveys' },
    { category: 'Customer Feedback', method: 'NPS (Net Promoter Score)', description: 'Measures loyalty by asking likelihood to recommend (0–10 scale)', useCase: 'Identifying promoters, passives, and detractors for brand loyalty' },
    { category: 'Conjoint Analysis', method: 'CBC (Choice-Based Conjoint)', description: 'Respondents choose preferred product profiles from sets of options', useCase: 'Product feature prioritization and market simulation' },
    { category: 'Conjoint Analysis', method: 'Rating Conjoint', description: 'Respondents rate each profile individually', useCase: 'Estimating attribute importance using rating data' },
    { category: 'Conjoint Analysis', method: 'Ranking Conjoint', description: 'Respondents rank product profiles', useCase: 'Preference modeling and relative attribute importance' },
    { category: 'Market Analysis', method: 'IPA (Revised Importance-Performance Analysis)', description: 'Plots attributes by importance and performance, adjusted for bias', useCase: 'Prioritizing areas for improvement in service or product' },
    { category: 'Market Analysis', method: 'TURF (Total Unduplicated Reach & Frequency)', description: 'Identifies combination of features/options to maximize reach', useCase: 'Optimizing feature bundles or promotions' },
    { category: 'Pricing & Revenue', method: 'PSM (Price Sensitivity Meter / Van Westendorp)', description: 'Evaluates acceptable price ranges and optimal price points', useCase: 'Pricing strategy and market research' },
    { category: 'Pricing & Revenue', method: 'Gabor-Granger', description: 'Measures willingness to pay at different price points', useCase: 'Pricing decisions and price elasticity estimation' },
    { category: 'Decision Analysis', method: 'AHP (Analytic Hierarchy Process)', description: 'Multi-criteria decision-making with pairwise comparisons', useCase: 'Prioritizing options with multiple criteria (e.g., product selection)' },
    { category: 'Perception & Branding', method: 'Semantic Differential', description: 'Measures perception along bipolar adjective scales', useCase: 'Brand image analysis or perception mapping' },
    { category: 'Brand & Marketing', method: 'Brand Funnel', description: 'Tracks customer journey stages: Awareness → Consideration → Purchase → Loyalty', useCase: 'Identifying drop-off points and optimizing marketing funnels' },
    { category: 'Service Quality', method: 'SERVQUAL', description: 'Measures perceived service quality across 5 dimensions: Reliability, Responsiveness, Assurance, Empathy, Tangibles', useCase: 'Evaluating service performance and customer expectations' },
    { category: 'Service Quality', method: 'SERVPERF', description: 'Measures service quality based on performance only', useCase: 'Simplified service assessment focusing on actual delivery' },
];


export default function SurveyFeaturePage() {
    const groupedMethods = analysisMethods.reduce((acc, method) => {
        if (!acc[method.category]) {
            acc[method.category] = [];
        }
        acc[method.category].push(method);
        return acc;
    }, {} as Record<string, typeof analysisMethods>);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            <FeaturePageHeader title="Survey" />
            <main className="flex-1 p-4 md:p-8 lg:p-12">
                <div className="max-w-6xl mx-auto">
                    <Card className="mb-8">
                        <CardHeader className="text-center">
                            <CardTitle className="text-4xl font-headline">Integrated Survey & Analysis Platform</CardTitle>
                            <CardDescription className="text-lg text-muted-foreground mt-2">
                                From survey design to advanced market analysis—all in one place.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 text-center">
                                <div className="p-4 rounded-lg bg-muted/50">
                                    <Target className="mx-auto h-10 w-10 text-primary mb-2" />
                                    <h3 className="font-semibold">Purpose-Built Templates</h3>
                                    <p className="text-xs text-muted-foreground">Utilize expert-designed templates for complex analyses like Conjoint, TURF, and IPA.</p>
                                </div>
                                <div className="p-4 rounded-lg bg-muted/50">
                                    <Handshake className="mx-auto h-10 w-10 text-primary mb-2" />
                                    <h3 className="font-semibold">Advanced Analytics</h3>
                                    <p className="text-xs text-muted-foreground">Seamlessly transition from data collection to sophisticated analysis without leaving the platform.</p>
                                </div>
                                <div className="p-4 rounded-lg bg-muted/50">
                                    <ClipboardList className="mx-auto h-10 w-10 text-primary mb-2" />
                                    <h3 className="font-semibold">Intuitive Design</h3>
                                    <p className="text-xs text-muted-foreground">A user-friendly interface that makes powerful market research techniques accessible to everyone.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
          
                    <Card>
                        <CardHeader>
                            <CardTitle>Specialized Survey Analysis Types</CardTitle>
                            <CardDescription>A suite of integrated tools for advanced market research and decision analysis.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-1/6">Category</TableHead>
                                        <TableHead className="w-1/6">Analysis Type</TableHead>
                                        <TableHead className="w-1/3">Description</TableHead>
                                        <TableHead className="w-1/3">Use Case</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(groupedMethods).map(([category, methods]) => (
                                        <React.Fragment key={category}>
                                            {methods.map((method, index) => (
                                                <TableRow key={method.method}>
                                                    {index === 0 && (
                                                        <TableCell rowSpan={methods.length} className="align-middle font-semibold">
                                                            {category}
                                                        </TableCell>
                                                    )}
                                                    <TableCell>{method.method}</TableCell>
                                                    <TableCell>{method.description}</TableCell>
                                                    <TableCell>{method.useCase}</TableCell>
                                                </TableRow>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
