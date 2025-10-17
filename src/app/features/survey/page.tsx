
'use client';
import React, { useState } from 'react';
import { FeaturePageHeader } from '@/components/feature-page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Target, Handshake, DollarSign, Users, ClipboardList, Network, Eye, CaseSensitive, CheckSquare, CircleDot, ChevronDown, ThumbsUp, Star, Share2, AlignLeft, Grid3x3, Replace, Phone, Mail, Sigma, ArrowDownUp } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { motion, AnimatePresence } from 'framer-motion';
import { PlaceHolderImages } from '@/lib/placeholder-images';


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

const questionTypes = [
    { category: 'Selection', type: 'Single Choice', icon: CircleDot, description: 'Respondent selects only one option', useCase: 'Gender, preferred product, yes/no questions' },
    { category: 'Selection', type: 'Multiple Choice', icon: CheckSquare, description: 'Respondent can select multiple options', useCase: 'Features used, multiple preferences' },
    { category: 'Selection', type: 'Dropdown', icon: ChevronDown, description: 'Compact list where only one option is chosen', useCase: 'Country, age group, profession' },
    { category: 'Selection', type: 'Best/Worst Choice', icon: ThumbsUp, description: 'Choose most and least preferred options', useCase: 'Preference trade-off, brand ranking' },
    { category: 'Text Input', type: 'Text (Long)', icon: AlignLeft, description: 'Open-ended text responses', useCase: 'Feedback, opinions, explanations' },
    { category: 'Text Input', type: 'Short Text', icon: CaseSensitive, description: 'Short open text responses', useCase: 'Name, title, short comment' },
    { category: 'Text Input', type: 'Number', icon: Sigma, description: 'Numeric entry field', useCase: 'Age, income, quantity' },
    { category: 'Text Input', type: 'Phone', icon: Phone, description: 'Phone number input', useCase: 'Contact information' },
    { category: 'Text Input', type: 'Email', icon: Mail, description: 'Email address input', useCase: 'Respondent identification, follow-up' },
    { category: 'Rating & Scale', type: 'Star Rating', icon: Star, description: '1–5 or 1–7 star satisfaction rating', useCase: 'Service satisfaction, app feedback' },
    { category: 'Rating & Scale', type: 'NPS Score', icon: Share2, description: '0–10 scale for recommendation likelihood', useCase: 'Net Promoter Score calculation' },
    { category: 'Rating & Scale', type: 'Likert Scale', icon: ClipboardList, description: 'Agreement/disagreement scale (e.g., 1–5)', useCase: 'Attitude or opinion measurement' },
    { category: 'Rating & Scale', type: 'Semantic Differential', icon: Replace, description: 'Bipolar adjective scale (e.g., Modern ↔ Traditional)', useCase: 'Brand or perception evaluation' },
    { category: 'Advanced / Analytical', type: 'Matrix Grid', icon: Grid3x3, description: 'Multi-row and column structured questions', useCase: 'Multiple related items with same scale' },
];

const FeatureCard = ({ icon: Icon, title, description, onMouseEnter, onMouseLeave }: { icon: React.ElementType; title: string; description: string; onMouseEnter: () => void; onMouseLeave: () => void; }) => {
    return (
        <div 
            className="relative p-4 rounded-lg bg-muted/50 text-center h-48 flex flex-col items-center justify-center cursor-pointer"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div className="flex justify-center mb-2">
                <Icon className="h-10 w-10 text-primary" />
            </div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
        </div>
    );
};


export default function SurveyFeaturePage() {
    const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);

    const featureDetails: {[key: string]: any} = {
        'templates': {
            image: PlaceHolderImages.find(img => img.imageHint === 'dashboard integration')
        },
        'analytics': {
            image: PlaceHolderImages.find(img => img.imageHint === 'data abstract')
        },
        'design': {
            image: PlaceHolderImages.find(img => img.imageHint === 'team meeting')
        }
    };

    const groupedAnalysisMethods = analysisMethods.reduce((acc, method) => {
        if (!acc[method.category]) {
            acc[method.category] = [];
        }
        acc[method.category].push(method);
        return acc;
    }, {} as Record<string, typeof analysisMethods>);
    
    const groupedQuestionTypes = questionTypes.reduce((acc, q) => {
        if (!acc[q.category]) {
            acc[q.category] = [];
        }
        acc[q.category].push(q);
        return acc;
    }, {} as Record<string, typeof questionTypes>);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            <FeaturePageHeader title="Survey" />
            <main className="flex-1 p-4 md:p-8 lg:p-12">
                <div className="max-w-6xl mx-auto">
                    <Card className="mb-8">
                        <CardHeader className="text-center">
                            <CardTitle className="text-4xl font-headline">Integrated Survey &amp; Analysis Platform</CardTitle>
                            <CardDescription className="text-lg text-muted-foreground mt-2">
                                From survey design to advanced market research—all in one place.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 text-center">
                                <FeatureCard
                                    icon={Target}
                                    title="Purpose-Built Templates"
                                    description="Utilize expert-designed templates for complex analyses like Conjoint, TURF, and IPA."
                                    onMouseEnter={() => setHoveredFeature('templates')}
                                    onMouseLeave={() => setHoveredFeature(null)}
                                />
                                <FeatureCard
                                    icon={Handshake}
                                    title="Advanced Analytics"
                                    description="Seamlessly transition from data collection to sophisticated analysis without leaving the platform."
                                     onMouseEnter={() => setHoveredFeature('analytics')}
                                    onMouseLeave={() => setHoveredFeature(null)}
                                />
                                <FeatureCard
                                    icon={ClipboardList}
                                    title="Intuitive Design"
                                    description="A user-friendly interface that makes powerful market research techniques accessible to everyone."
                                    onMouseEnter={() => setHoveredFeature('design')}
                                    onMouseLeave={() => setHoveredFeature(null)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                    
                    <div className="mt-8 h-[400px] relative w-full overflow-hidden rounded-xl border shadow-lg">
                        <AnimatePresence>
                            {hoveredFeature && featureDetails[hoveredFeature]?.image ? (
                                <motion.div
                                    key={hoveredFeature}
                                    initial={{ opacity: 0, scale: 1.05 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.05 }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                    className="absolute inset-0"
                                >
                                    <Image
                                        src={featureDetails[hoveredFeature].image.imageUrl}
                                        alt={featureDetails[hoveredFeature].image.description}
                                        layout="fill"
                                        objectFit="cover"
                                        className="rounded-xl"
                                    />
                                    <div className="absolute inset-0 bg-black/20 rounded-xl" />
                                </motion.div>
                            ) : (
                                <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                                    <p className="text-muted-foreground">Hover over a feature above to see an image.</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                    
                    <Tabs defaultValue="questionTypes" className="w-full mt-8">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="questionTypes">Question Types</TabsTrigger>
                            <TabsTrigger value="analysisTypes">Analysis Types</TabsTrigger>
                        </TabsList>
                        <TabsContent value="questionTypes">
                            <Card className="mt-6">
                                <CardHeader>
                                    <CardTitle>Available Survey Question Types</CardTitle>
                                    <CardDescription>A wide range of question formats to collect the data you need.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-1/6">Category</TableHead>
                                                <TableHead className="w-1/6">Question Type</TableHead>
                                                <TableHead className="w-1/3">Description</TableHead>
                                                <TableHead className="w-1/3">Use Case</TableHead>
                                                <TableHead className="text-center">Preview</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.entries(groupedQuestionTypes).map(([category, types]) => (
                                                <React.Fragment key={category}>
                                                    {types.map((q, index) => (
                                                        <TableRow key={q.type}>
                                                            {index === 0 && (
                                                                <TableCell rowSpan={types.length} className="align-middle font-semibold">
                                                                    {category}
                                                                </TableCell>
                                                            )}
                                                            <TableCell><div className="flex items-center gap-2"><q.icon className="w-4 h-4 text-muted-foreground"/> {q.type}</div></TableCell>
                                                            <TableCell>{q.description}</TableCell>
                                                            <TableCell>{q.useCase}</TableCell>
                                                            <TableCell className="text-center">
                                                                <Dialog>
                                                                    <DialogTrigger asChild>
                                                                        <Button variant="ghost" size="icon"><Eye className="w-4 h-4" /></Button>
                                                                    </DialogTrigger>
                                                                    <DialogContent className="max-w-3xl">
                                                                        <DialogHeader><DialogTitle>{q.type} - Example</DialogTitle></DialogHeader>
                                                                        <div className="flex justify-center p-4">
                                                                            <Image src={`https://picsum.photos/seed/${q.type.replace(/\s+/g, '-')}/800/400`} alt={`Example for ${q.type}`} width={800} height={400} className="rounded-lg border" />
                                                                        </div>
                                                                    </DialogContent>
                                                                </Dialog>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </React.Fragment>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="analysisTypes">
                            <Card className="mt-6">
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
                                                <TableHead className="text-center">Preview</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.entries(groupedAnalysisMethods).map(([category, methods]) => (
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
                                                            <TableCell className="text-center">
                                                                <Dialog>
                                                                    <DialogTrigger asChild>
                                                                        <Button variant="ghost" size="icon"><Eye className="w-4 h-4" /></Button>
                                                                    </DialogTrigger>
                                                                    <DialogContent className="max-w-3xl">
                                                                        <DialogHeader><DialogTitle>{method.method} - Example Result</DialogTitle></DialogHeader>
                                                                        <div className="flex justify-center p-4">
                                                                            <Image src={`https://picsum.photos/seed/${method.method.replace(/\s+/g, '-')}/800/600`} alt={`Example result for ${method.method}`} width={800} height={600} className="rounded-lg border" />
                                                                        </div>
                                                                    </DialogContent>
                                                                </Dialog>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </React.Fragment>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </main>
        </div>
    );
}
