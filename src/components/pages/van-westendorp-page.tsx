
'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DollarSign, ArrowLeft, Save, Laptop, LayoutDashboard, BarChart2, Users, EyeIcon, TrendingUp, Link as LinkIcon, QrCode, Download, Copy, Lightbulb, Zap, ShieldAlert, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Label as RechartsLabel } from 'recharts';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// --- PSM Analysis Logic ---
function findIntersection(x1: number[], y1: number[], x2: number[], y2: number[]): { x: number; y: number } | null {
    for (let i = 0; i < x1.length - 1; i++) {
        const p1 = { x: x1[i], y: y1[i] };
        const p2 = { x: x1[i+1], y: y1[i+1] };
        for (let j = 0; j < x2.length - 1; j++) {
            const p3 = { x: x2[j], y: y2[j] };
            const p4 = { x: x2[j+1], y: y2[j+1] };

            const denominator = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
            if (denominator === 0) continue;

            const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denominator;
            const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denominator;

            if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
                return {
                    x: p1.x + ua * (p2.x - p1.x),
                    y: p1.y + ua * (p2.y - p1.y)
                };
            }
        }
    }
    return null;
}

const runPsmAnalysis = (responses: any[]) => {
    if (responses.length < 10) {
        return { error: "At least 10 responses are recommended for a stable PSM analysis." };
    }

    const prices = {
        tooCheap: responses.map(r => r.answers.tooCheap).filter(Boolean).map(Number),
        cheap: responses.map(r => r.answers.cheap).filter(Boolean).map(Number),
        expensive: responses.map(r => r.answers.expensive).filter(Boolean).map(Number),
        tooExpensive: responses.map(r => r.answers.tooExpensive).filter(Boolean).map(Number),
    };

    const allPrices = [...prices.tooCheap, ...prices.cheap, ...prices.expensive, ...prices.tooExpensive].sort((a, b) => a - b);
    const uniquePrices = [...new Set(allPrices)];

    const cumulativePercentages = uniquePrices.map(price => {
        const n = responses.length;
        return {
            price,
            tooCheap: (prices.tooCheap.filter(p => p >= price).length / n) * 100,
            cheap: (prices.cheap.filter(p => p >= price).length / n) * 100,
            expensive: (prices.expensive.filter(p => p <= price).length / n) * 100,
            tooExpensive: (prices.tooExpensive.filter(p => p <= price).length / n) * 100,
        };
    });

    const notTooCheap = cumulativePercentages.map(p => ({...p, notTooCheap: 100 - p.tooCheap }));
    const notExpensive = cumulativePercentages.map(p => ({...p, notExpensive: 100 - p.expensive }));
    
    // Find intersections
    const opp = findIntersection(
        notTooCheap.map(p => p.price), notTooCheap.map(p => p.notTooCheap),
        notExpensive.map(p => p.price), notExpensive.map(p => p.notExpensive)
    );

    const pme = findIntersection(
        cumulativePercentages.map(p => p.price), cumulativePercentages.map(p => p.tooExpensive),
        cumulativePercentages.map(p => p.price), cumulativePercentages.map(p => p.cheap)
    );

    const mdp = findIntersection(
        cumulativePercentages.map(p => p.price), cumulativePercentages.map(p => p.tooCheap),
        cumulativePercentages.map(p => p.price), cumulativePercentages.map(p => p.expensive)
    );
     
    const ipp = findIntersection(
        cumulativePercentages.map(p => p.price), cumulativePercentages.map(p => p.tooExpensive),
        cumulativePercentages.map(p => p.price), cumulativePercentages.map(p => p.tooCheap)
    );

    return {
        chartData: cumulativePercentages,
        intersections: { opp, pme, mdp, ipp },
    };
};


function PsmSurveyPageContent({ surveyId }: { surveyId: string }) {
    const [surveyTitle, setSurveyTitle] = useState('Untitled PSM Survey');
    const [productName, setProductName] = useState('our new product');
    const [currencySymbol, setCurrencySymbol] = useState('$');
    const [questions, setQuestions] = useState({
        tooExpensive: '',
        expensive: '',
        cheap: '',
        tooCheap: ''
    });

    const [responses, setResponses] = useState<any[]>([]);
    const [views, setViews] = useState(0);
    const [activeTab, setActiveTab] = useState('design');
    const [analysisData, setAnalysisData] = useState<any | null>(null);
    const { toast } = useToast();
    const [isSaved, setIsSaved] = useState(false);
    const [surveyUrl, setSurveyUrl] = useState('');
    const surveyUrlRef = useRef<HTMLInputElement>(null);

    const qrCodeUrl = isSaved && surveyUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(surveyUrl)}` : '';

    const defaultQuestions = {
        tooExpensive: `At what price would you consider ${productName || 'the product'} to be SO EXPENSIVE that you would not consider buying it?`,
        expensive: `At what price would you consider ${productName || 'the product'} to be EXPENSIVE, but you would still consider buying it?`,
        cheap: `At what price would you consider ${productName || 'the product'} to be a BARGAIN — a great buy for the money?`,
        tooCheap: `At what price would you consider ${productName || 'the product'} to be SO CHEAP that you would doubt its quality?`,
    };

    useEffect(() => {
        setQuestions(defaultQuestions);
    }, [productName]);

    useEffect(() => {
        if (surveyId) {
            setSurveyUrl(`${window.location.origin}/survey/view/psm/${surveyId}`);
            const draft = localStorage.getItem(surveyId);
            if (draft) {
                const data = JSON.parse(draft);
                setSurveyTitle(data.title || 'Untitled PSM Survey');
                setProductName(data.productName || 'our new product');
                setCurrencySymbol(data.currencySymbol || '$');
                setQuestions(data.questions || defaultQuestions);
                setIsSaved(true);
            }

            const savedResponses = localStorage.getItem(`${surveyId}_responses`);
            if (savedResponses) setResponses(JSON.parse(savedResponses));

            const savedViews = localStorage.getItem(`${surveyId}_views`);
            if (savedViews) setViews(parseInt(savedViews, 10));
        }
    }, [surveyId]);

    const saveDraft = () => {
        if (!surveyId) return false;
        const draft = { id: surveyId, title: surveyTitle, productName, currencySymbol, questions, type: 'psm' };
        localStorage.setItem(surveyId, JSON.stringify(draft));
        setIsSaved(true);
        toast({ title: "Draft Saved!", description: "Your survey has been saved." });
        return true;
    };
    
    const saveAndTest = () => {
        if (saveDraft()) {
            setTimeout(() => {
                window.open(`/survey/view/psm/${surveyId}`, '_blank');
                setActiveTab('dashboard');
            }, 100);
        }
    };
    
    const copyUrlToClipboard = () => {
        if (surveyUrlRef.current) {
            navigator.clipboard.writeText(surveyUrlRef.current.value);
            toast({ title: 'Copied to Clipboard' });
        }
    };
    
    const downloadQrCode = () => {
        if (qrCodeUrl) {
            fetch(qrCodeUrl)
                .then(response => response.blob())
                .then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${surveyTitle.replace(/\s+/g, '_')}_qr_code.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                });
        }
    };

    const runAnalysis = () => {
        const result = runPsmAnalysis(responses);
        if (result.error) {
            toast({ title: "Analysis Error", description: result.error, variant: "destructive" });
        } else {
            setAnalysisData(result);
            toast({ title: "Analysis Complete", description: "PSM analysis is complete." });
            setActiveTab('analysis');
        }
    };
    
    const handleQuestionChange = (key: keyof typeof questions, value: string) => {
        setQuestions(prev => ({...prev, [key]: value}));
    };

    const renderAnalysis = () => {
        if (!analysisData) return <p className="text-muted-foreground">Click "Run Analysis" to see results.</p>;
        const { chartData, intersections } = analysisData;

        return (
            <div className="space-y-6">
                <Alert>
                     <Brain className="h-4 w-4" />
                    <AlertTitle>How to Read the PSM Chart</AlertTitle>
                    <AlertDescription>
                        The chart shows the cumulative responses for each of the four price questions. The intersections of these lines reveal key psychological price points for your product. The range between the MDP and PME is generally considered an acceptable price range.
                    </AlertDescription>
                </Alert>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="col-span-1 lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Price Sensitivity Meter</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[500px]">
                             <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" dataKey="price" domain={['dataMin', 'dataMax']} label={{ value: "Price", position: 'insideBottom', offset: -10 }} />
                                    <YAxis label={{ value: "Cumulative %", angle: -90, position: 'insideLeft' }} domain={[0, 100]}/>
                                    <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                                    <Legend />
                                    <Line type="monotone" dataKey="tooCheap" name="Too Cheap" stroke="#8884d8" dot={false} />
                                    <Line type="monotone" dataKey="cheap" name="Cheap" stroke="#82ca9d" dot={false} />
                                    <Line type="monotone" dataKey="expensive" name="Expensive" stroke="#ffc658" dot={false} />
                                    <Line type="monotone" dataKey="tooExpensive" name="Too Expensive" stroke="#ff8042" dot={false} />
                                    {intersections.opp && <ReferenceLine x={intersections.opp.x} stroke="green" strokeDasharray="3 3"><RechartsLabel value={`OPP: ${intersections.opp.x.toFixed(2)}`} fill="green" position="top" /></ReferenceLine>}
                                    {intersections.ipp && <ReferenceLine x={intersections.ipp.x} stroke="blue" strokeDasharray="3 3"><RechartsLabel value={`IPP: ${intersections.ipp.x.toFixed(2)}`} fill="blue" position="top" /></ReferenceLine>}
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Key Price Points</CardTitle>
                             <CardDescription>These are the critical price points derived from the analysis.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-green-100 text-green-700 rounded-lg"><DollarSign /></div>
                                <div>
                                    <p className="font-bold">Optimal Price Point (OPP)</p>
                                    <p className="text-2xl font-bold text-green-700">{intersections.opp?.x.toFixed(2) || 'N/A'}</p>
                                    <p className="text-xs text-muted-foreground">The ideal price where an equal number of customers find it 'too expensive' vs. 'too cheap'.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-blue-100 text-blue-700 rounded-lg"><DollarSign /></div>
                                <div>
                                    <p className="font-bold">Indifference Price Point (IPP)</p>
                                    <p className="text-2xl font-bold text-blue-700">{intersections.ipp?.x.toFixed(2) || 'N/A'}</p>
                                    <p className="text-xs text-muted-foreground">The point where an equal number of customers perceive the price as 'cheap' vs. 'expensive'.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                             <CardTitle>Acceptable Price Range</CardTitle>
                             <CardDescription>The range of prices consumers are generally willing to pay.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="flex items-start gap-4">
                                <div className="p-3 bg-red-100 text-red-700 rounded-lg"><DollarSign /></div>
                                <div>
                                    <p className="font-bold">Point of Marginal Expensiveness (PME)</p>
                                    <p className="text-2xl font-bold text-red-700">{intersections.pme?.x.toFixed(2) || 'N/A'}</p>
                                    <p className="text-xs text-muted-foreground">The upper bound of the acceptable range. More customers see it as 'too expensive' than 'cheap'.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-yellow-100 text-yellow-700 rounded-lg"><DollarSign /></div>
                                <div>
                                    <p className="font-bold">Point of Marginal Cheapness (MDP)</p>
                                    <p className="text-2xl font-bold text-yellow-700">{intersections.mdp?.x.toFixed(2) || 'N/A'}</p>
                                    <p className="text-xs text-muted-foreground">The lower bound of the acceptable range. More customers see it as 'too cheap' than 'expensive'.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    };

    return (
        <div className="flex-1 p-8 bg-gradient-to-br from-background to-slate-50">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">PSM Survey (Price Sensitivity)</h1>
                    <p className="text-muted-foreground">Define your product and analyze price sensitivity.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={saveDraft}><Save className="mr-2" />Save Draft</Button>
                    <Button onClick={saveAndTest}><Laptop className="mr-2" />Save & Test</Button>
                    <Button variant="outline" asChild><Link href="/dashboard/survey"><ArrowLeft className="mr-2" />Back to Surveys</Link></Button>
                </div>
            </header>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="design"><DollarSign className="mr-2" />Design</TabsTrigger>
                    <TabsTrigger value="dashboard"><LayoutDashboard className="mr-2" />Dashboard</TabsTrigger>
                    <TabsTrigger value="analysis"><BarChart2 className="mr-2" />Analysis</TabsTrigger>
                </TabsList>
                <TabsContent value="design">
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle>Survey Setup</CardTitle>
                            <CardDescription>Define the product, currency, and questions for your survey.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                             <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="survey-title">Survey Title</Label>
                                    <Input id="survey-title" value={surveyTitle} onChange={e => setSurveyTitle(e.target.value)} placeholder="e.g., Pricing for New Widget" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="product-name">Product/Service Name</Label>
                                    <Input id="product-name" value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g., 'Super Widget'" />
                                </div>
                                 <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="currency-symbol">Currency Symbol</Label>
                                    <Input id="currency-symbol" value={currencySymbol} onChange={e => setCurrencySymbol(e.target.value)} className="w-24" />
                                </div>
                            </div>
                            <Card>
                                <CardHeader>
                                    <CardTitle>PSM Questions</CardTitle>
                                    <CardDescription>These questions will be shown to the user. You can customize the wording.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                     <div className="space-y-2">
                                        <Label htmlFor="q-too-expensive" className="text-destructive">Too Expensive</Label>
                                        <Input id="q-too-expensive" value={questions.tooExpensive} onChange={e => handleQuestionChange('tooExpensive', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="q-expensive" className="text-amber-600">Expensive</Label>
                                        <Input id="q-expensive" value={questions.expensive} onChange={e => handleQuestionChange('expensive', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="q-cheap" className="text-green-600">Cheap (Bargain)</Label>
                                        <Input id="q-cheap" value={questions.cheap} onChange={e => handleQuestionChange('cheap', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="q-too-cheap" className="text-blue-600">Too Cheap</Label>
                                        <Input id="q-too-cheap" value={questions.tooCheap} onChange={e => handleQuestionChange('tooCheap', e.target.value)} />
                                    </div>
                                </CardContent>
                            </Card>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="dashboard">
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle>Survey Dashboard</CardTitle>
                      <CardDescription>An overview of your survey's performance and sharing options.</CardDescription>
                    </CardHeader>
                     <CardContent className="space-y-8">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Views</CardTitle><EyeIcon className="h-4 w-4 text-muted-foreground" /></CardHeader>
                                <CardContent><div className="text-2xl font-bold">{views}</div></CardContent>
                            </Card>
                             <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Responses</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader>
                                <CardContent><div className="text-2xl font-bold">{responses.length}</div></CardContent>
                            </Card>
                             <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Completion Rate</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader>
                                <CardContent><div className="text-2xl font-bold">{views > 0 ? `${((responses.length / views) * 100).toFixed(1)}%` : '0%'}</div></CardContent>
                            </Card>
                             <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Test Survey</CardTitle><Laptop className="h-4 w-4 text-muted-foreground" /></CardHeader>
                                <CardContent><a href={isSaved ? surveyUrl : undefined} target="_blank" rel="noopener noreferrer"><Button disabled={!isSaved} className="w-full">Launch Kiosk</Button></a></CardContent>
                            </Card>
                        </div>
                        <div className="grid gap-6 md:grid-cols-2">
                             <Card>
                                <CardHeader className="flex-row items-center gap-4 space-y-0"><LinkIcon className="w-6 h-6 text-primary" /><div className='flex flex-col'><CardTitle>Shareable Link</CardTitle><CardDescription>This is the public URL for your survey.</CardDescription></div></CardHeader>
                                <CardContent className="flex items-center gap-2"><Input ref={surveyUrlRef} value={surveyUrl} readOnly className="bg-muted" disabled={!isSaved}/><Button variant="outline" size="icon" onClick={copyUrlToClipboard} disabled={!isSaved}><Copy className="w-4 h-4"/></Button></CardContent>
                            </Card>
                             <Card>
                                <CardHeader className="flex-row items-center gap-4 space-y-0"><QrCode className="w-6 h-6 text-primary" /><div className='flex flex-col'><CardTitle>QR Code</CardTitle><CardDescription>Respondents can scan this to open the survey.</CardDescription></div></CardHeader>
                                <CardContent className="flex flex-col items-center gap-4">{qrCodeUrl ? (<div className="p-4 border rounded-lg"><Image src={qrCodeUrl} alt="Survey QR Code" width={150} height={150} /></div>) : (<div className="w-[166px] h-[166px] flex items-center justify-center bg-muted rounded-lg"><p className="text-muted-foreground text-center px-4 text-sm">Save your draft to generate a QR Code.</p></div>)}<Button variant="outline" disabled={!qrCodeUrl} onClick={downloadQrCode}><Download className="mr-2"/>Download QR Code</Button></CardContent>
                            </Card>
                        </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                 <TabsContent value="analysis">
                     <Card className="mt-4">
                        <CardHeader className="flex flex-row justify-between items-start">
                           <div>
                               <CardTitle>Analysis Results</CardTitle>
                               <CardDescription>Price Sensitivity Meter (Van Westendorp)</CardDescription>
                           </div>
                           <Button onClick={runAnalysis} disabled={responses.length === 0}>Run Analysis</Button>
                        </CardHeader>
                        <CardContent>
                            {analysisData ? renderAnalysis() : (
                                <div className="flex items-center justify-center h-full min-h-[400px]">
                                    <p className="text-muted-foreground">No analysis data. Click "Run Analysis" to generate results.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default function PsmSurveyPageWrapper() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PsmSurveyPageContentFromClient />
        </Suspense>
    );
}

function PsmSurveyPageContentFromClient() {
    const searchParams = useSearchParams();
    const surveyId = searchParams.get('id');

    if (!surveyId) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="p-8 text-center">
                    <CardTitle className="text-2xl text-destructive">Survey ID Missing</CardTitle>
                    <CardDescription className="mt-2">
                        No survey ID was provided in the URL. Please go back to the dashboard and create a new survey.
                    </CardDescription>
                    <Button asChild className="mt-6">
                        <Link href="/dashboard">Go to Dashboard</Link>
                    </Button>
                </Card>
            </div>
        );
    }
    return <PsmSurveyPageContent surveyId={surveyId} />;
}
