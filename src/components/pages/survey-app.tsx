

'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Users, FileSearch, Settings, MoveRight, HelpCircle, BarChart as BarChartIcon, ThumbsUp, Sparkles, Network, Repeat, PieChart as PieChartIcon } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Bar, ResponsiveContainer, Cell } from 'recharts';
import { Badge } from '../ui/badge';
import dynamic from 'next/dynamic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-[300px]" />,
});


const COLORS = ['#7a9471', '#b5a888', '#c4956a', '#a67b70', '#8ba3a3', '#6b7565', '#d4c4a8', '#9a8471', '#a8b5a3'];

// --- Helper Functions for Rating Analysis ---
const mean = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

const getMode = (arr: (string | number)[]): (string | number | null) => {
    if (arr.length === 0) return null;
    const counts: { [key: string]: number } = {};
    arr.forEach(val => { 
        const key = String(val);
        counts[key] = (counts[key] || 0) + 1;
    });
    let mode: string | number | null = null;
    let maxCount = 0;
    Object.entries(counts).forEach(([val, count]) => {
        if (count > maxCount) {
            maxCount = count;
            mode = isNaN(Number(val)) ? val : Number(val);
        }
    });
    return mode;
};

const getMedian = (arr: number[]): number | null => {
    if (arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const standardDeviation = (arr: number[]) => {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    const variance = arr.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / (arr.length - 1);
    return Math.sqrt(variance);
};

const ChoiceAnalysisDisplay = ({ tableData, insightsData, varName, comparisonData }: { tableData: any[], insightsData: string[], varName: string, comparisonData: any }) => {
    const [chartType, setChartType] = useState<'hbar' | 'bar' | 'pie' | 'donut'>('hbar');

    const plotLayout = useMemo(() => {
        const baseLayout = {
            autosize: true,
            margin: { t: 40, b: 40, l: 40, r: 20 },
            xaxis: {
                title: chartType === 'hbar' ? 'Percentage' : '',
            },
            yaxis: {
                title: chartType === 'hbar' ? '' : 'Percentage',
            },
            showlegend: false,
        };
        if (chartType === 'hbar') {
            baseLayout.yaxis = { autorange: 'reversed' as const };
            baseLayout.margin.l = 120;
        }
        if (chartType === 'bar') {
            (baseLayout.xaxis as any).tickangle = -45;
        }
        return baseLayout;
    }, [chartType]);

    const plotData = useMemo(() => {
        const percentages = tableData.map((d: any) => parseFloat(d.percentage));
        const labels = tableData.map((d: any) => d.name);
        const counts = tableData.map((d: any) => d.count);

        if (chartType === 'pie' || chartType === 'donut') {
            return [{
                values: percentages,
                labels: labels,
                type: 'pie',
                hole: chartType === 'donut' ? 0.4 : 0,
                marker: { colors: COLORS },
                textinfo: 'label+percent',
                textposition: 'inside',
            }];
        }
        return [{
            y: chartType === 'hbar' ? labels : percentages,
            x: chartType === 'hbar' ? percentages : labels,
            type: 'bar',
            orientation: chartType === 'hbar' ? 'h' : 'v',
            marker: { color: COLORS[0] },
            text: percentages.map((p: number) => `${p.toFixed(1)}%`),
            textposition: 'auto',
        }];
    }, [chartType, tableData]);

    return (
        <Card>
            <CardHeader><CardTitle>{varName}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex justify-between items-center">
                            Distribution {comparisonData && `vs. ${comparisonData.filterValue}`}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center min-h-[300px]">
                        <Tabs value={chartType} onValueChange={(value) => setChartType(value as any)} className="w-full mb-4">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="hbar"><BarChartIcon className="w-4 h-4 transform -rotate-90" /></TabsTrigger>
                                <TabsTrigger value="bar"><BarChartIcon className="w-4 h-4" /></TabsTrigger>
                                <TabsTrigger value="pie"><PieChartIcon className="w-4 h-4" /></TabsTrigger>
                                <TabsTrigger value="donut"><PieChartIcon className="w-4 h-4" /></TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <div className="w-full h-full">
                           <Plot
                                data={plotData}
                                layout={plotLayout}
                                style={{ width: '100%', height: '100%' }}
                                config={{ displayModeBar: false }}
                                useResizeHandler
                            />
                        </div>
                    </CardContent>
                </Card>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-base">Summary Statistics</CardTitle></CardHeader>
                            <CardContent className="max-h-[200px] overflow-y-auto">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Option</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">Percentage</TableHead></TableRow></TableHeader>
                                    <TableBody>{tableData.map((item, index) => ( <TableRow key={`${item.name}-${index}`}><TableCell>{item.name}</TableCell><TableCell className="text-right">{item.count}</TableCell><TableCell className="text-right">{item.percentage}%</TableCell></TableRow> ))}</TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                        {comparisonData && (
                            <Card>
                                <CardHeader className="pb-2"><CardTitle className="text-base">Group Statistics ({comparisonData.filterValue})</CardTitle></CardHeader>
                                <CardContent className="max-h-[200px] overflow-y-auto">
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Option</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">Percentage</TableHead></TableRow></TableHeader>
                                        <TableBody>{comparisonData.tableData.map((item:any, index:number) => ( <TableRow key={`${item.name}-${index}`}><TableCell>{item.name}</TableCell><TableCell className="text-right">{item.count}</TableCell><TableCell className="text-right">{item.percentage}%</TableCell></TableRow> ))}</TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Insights</CardTitle></CardHeader>
                        <CardContent><ul className="space-y-2 text-sm list-disc pl-4">{insightsData.map((insight, i) => <li key={i} dangerouslySetInnerHTML={{ __html: insight }} />)}</ul></CardContent>
                    </Card>
                </div>
            </div>
        </Card>
    );
};

const NPSAnalysisDisplay = ({ tableData, varName }: { tableData: any, varName: string }) => {
    const { nps, promoters, passives, detractors, promotersP, passivesP, detractorsP } = tableData;

    const npsGroupData = [
        { name: 'Detractors', value: detractorsP, count: detractors, fill: 'hsl(var(--destructive))' },
        { name: 'Passives', value: passivesP, count: passives, fill: 'hsl(var(--muted-foreground))' },
        { name: 'Promoters', value: promotersP, count: promoters, fill: 'hsl(var(--chart-2))' },
    ];

    const npsScoreDistribution = Object.entries(tableData.scoreCounts).map(([score, count]) => ({score: Number(score), count: count as number}));
    
    return (
        <Card>
            <CardHeader><CardTitle>{varName}</CardTitle></CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="flex flex-col items-center justify-center p-6">
                        <CardDescription>NPS Score</CardDescription>
                        <CardTitle className="text-6xl font-bold text-primary">{nps.toFixed(1)}</CardTitle>
                    </Card>
                    <Card className="col-span-2">
                         <CardHeader>
                            <CardTitle className="text-lg">Score Distribution</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={{count: {label: 'Count'}}} className="w-full h-40">
                                <ResponsiveContainer>
                                    <BarChart data={npsScoreDistribution}>
                                        <CartesianGrid vertical={false}/>
                                        <XAxis dataKey="score" />
                                        <YAxis />
                                        <Tooltip content={<ChartTooltipContent />} />
                                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={4} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Respondent Groups</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={{}} className="w-full h-12">
                             <ResponsiveContainer>
                                <BarChart layout="vertical" data={npsGroupData} stackOffset="expand">
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" hide />
                                    <Tooltip content={<ChartTooltipContent formatter={(value, name) => `${(value as number).toFixed(1)}%`}/>} />
                                    <Bar dataKey="value" stackId="a" radius={4}>
                                        {npsGroupData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                         <div className="flex justify-between mt-2 text-sm">
                            <div><span className="font-bold">{detractorsP.toFixed(1)}%</span> Detractors</div>
                            <div><span className="font-bold">{passivesP.toFixed(1)}%</span> Passives</div>
                            <div><span className="font-bold">{promotersP.toFixed(1)}%</span> Promoters</div>
                        </div>
                    </CardContent>
                </Card>
            </CardContent>
        </Card>
    );
};

// ... (keep the rest of the file as is)
const SurveyApp = () => {
    return (
        <Suspense fallback={<div className="flex-1 p-8 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto"/></div>}>
            <GeneralSurveyPageContentFromClient />
        </Suspense>
      )
}

export default SurveyApp;

// ... (keep the rest of the file as is)

function GeneralSurveyPageContentFromClient() {
    const searchParams = useSearchParams();
    const surveyId = searchParams.get('id');
    const template = searchParams.get('template');
    
    return <GeneralSurveyPageContent surveyId={surveyId as string} template={template} />;
}

function GeneralSurveyPageContent({ surveyId, template }: { surveyId: string; template?: string | null }) {
    const [survey, setSurvey] = useState<any>({
        title: 'Untitled Survey',
        description: 'Provide a short explanation for the purpose of this survey.',
        questions: [],
        logic: [],
        theme: {
            primaryColor: 'hsl(221.2 83.1% 60%)',
            layout: 'default',
            logo: null,
            background: null,
            innerBackground: null,
            innerBackgroundOpacity: 0.5,
            decorations: false,
            headerImage: null,
            type: 'default',
            transition: 'slide',
        }
    });
    
    const [cardStyle, setCardStyle] = useState('bg-card');

    const { toast } = useToast();
    const surveyUrlRef = useRef<HTMLInputElement>(null);
    const [responses, setResponses] = useState<any[]>([]);
    const [views, setViews] = useState(0);
    const [activeTab, setActiveTab] = useState('design');
    const [isSaved, setIsSaved] = useState(false);
    const [surveyUrl, setSurveyUrl] = useState('');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [isLoadingQr, setIsLoadingQr] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [retailAnalysisData, setRetailAnalysisData] = useState<any>(null);
    const [servqualAnalysisData, setServqualAnalysisData] = useState<any>(null);
    const [ipaAnalysisData, setIpaAnalysisData] = useState<any>(null);

    const [uploadingImageForQuestionId, setUploadingImageForQuestionId] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loadedTemplate, setLoadedTemplate] = useState(false);
    
    const [dashboardPositions, setDashboardPositions] = useState<{ [key: string]: Position }>({});
    
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
          coordinateGetter: sortableKeyboardCoordinates,
        })
    );
    
    useEffect(() => {
        if (template === 'retail' && !loadedTemplate) {
            setSurvey(prev => ({
                ...prev,
                title: retailTemplate.title,
                description: retailTemplate.description,
                questions: retailTemplate.questions.map(q => ({...q, id: Date.now() + Math.random()})),
                isRetailTemplate: true
            }));
            setLoadedTemplate(true); // Prevent re-loading on re-renders
            toast({ title: "Template Loaded", description: "Retail Customer Survey template has been applied." });
        }
        if (template === 'servqual' && !loadedTemplate) {
            setSurvey(prev => ({
                ...prev,
                title: servqualTemplate.title,
                description: servqualTemplate.description,
                questions: servqualTemplate.questions.map(q => ({...q, id: Date.now() + Math.random()})),
                isServqualTemplate: true,
            }));
            setLoadedTemplate(true);
            toast({ title: "Template Loaded", description: "SERVQUAL Survey template has been applied."});
        }
        if (template === 'ipa' && !loadedTemplate) {
            setSurvey(prev => ({
                ...prev,
                title: ipaTemplate.title,
                description: ipaTemplate.description,
                questions: ipaTemplate.questions.map(q => ({...q, id: Date.now() + Math.random()})),
                isIpaTemplate: true
            }));
            setLoadedTemplate(true);
            toast({ title: "Template Loaded", description: "IPA Survey template has been applied." });
        }
         if (template === 'psm' && !loadedTemplate) {
            setSurvey(prev => ({
                ...prev,
                title: psmTemplate.title,
                description: psmTemplate.description,
                questions: psmTemplate.questions.map(q => ({...q, id: Date.now() + Math.random()})),
                isPsmTemplate: true
            }));
            setLoadedTemplate(true);
            toast({ title: "Template Loaded", description: "Van Westendorp PSM Survey template has been applied." });
        }
    }, [template, loadedTemplate, toast]);

    const questionTypeCategories = {
        'Choice': [
            { id: 'single', icon: CircleDot, label: 'Single Selection', options: ["Option 1", "Option 2"], color: 'text-blue-500' },
            { id: 'multiple', icon: CheckSquare, label: 'Multiple Selection', options: ["Option 1", "Option 2"], color: 'text-green-500' },
            { id: 'dropdown', icon: ChevronDown, label: 'Dropdown', options: ["Option 1", "Option 2"], color: 'text-cyan-500' },
            { id: 'best-worst', icon: ThumbsUp, label: 'Best/Worst Choice', items: ["Item 1", "Item 2", "Item 3", "Item 4"], color: 'text-amber-500' },
        ],
        'Input': [
            { id: 'text', icon: CaseSensitive, label: 'Text Input', color: 'text-slate-500' },
            { id: 'number', icon: Sigma, label: 'Number Input', color: 'text-fuchsia-500' },
            { id: 'phone', icon: Phone, label: 'Phone Input', color: 'text-indigo-500' },
            { id: 'email', icon: Mail, label: 'Email Input', color: 'text-rose-500' },
        ],
        'Scale': [
            { id: 'rating', icon: Star, label: 'Rating', scale: ['1', '2', '3', '4', '5'], color: 'text-yellow-500' },
            { id: 'nps', icon: Share2, label: 'Net Promoter Score', color: 'text-sky-500' },
        ],
        'Structure': [
             { id: 'description', icon: FileText, label: 'Description Block', color: 'text-gray-400' },
             { id: 'matrix', icon: Grid3x3, label: 'Matrix', rows: ['Row 1', 'Row 2'], columns: ['Col 1', 'Col 2'], scale: ['Low', 'High'], color: 'text-purple-500' },
        ]
    };

    const downloadResponsesCSV = () => {
        if (responses.length === 0) {
            toast({
                title: "No Responses",
                description: "There is no data to export.",
                variant: "destructive"
            });
            return;
        }

        const dataForCsv: any[] = [];
        const headers: string[] = ['responseId', 'submittedAt'];

        // Dynamically create headers from questions
        survey.questions.forEach((q: any) => {
            if (q.type === 'best-worst') {
                headers.push(`${q.title} - Best`);
                headers.push(`${q.title} - Worst`);
            } else if (q.type !== 'description') {
                headers.push(q.title);
            }
        });
        
        responses.forEach(response => {
            const row: any = {
                responseId: response.id,
                submittedAt: response.submittedAt
            };
            survey.questions.forEach((q: any) => {
                if (q.type === 'description') return;
                
                const answer = response.answers[q.id];
                
                if (q.type === 'best-worst') {
                    row[`${q.title} - Best`] = answer ? answer.best || '' : '';
                    row[`${q.title} - Worst`] = answer ? answer.worst || '' : '';
                } else if (Array.isArray(answer)) {
                    row[q.title] = answer.join(', ');
                } else {
                    row[q.title] = answer !== undefined ? answer : '';
                }
            });
            dataForCsv.push(row);
        });

        const csv = Papa.unparse(dataForCsv, { columns: headers });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `${survey.title.replace(/\s+/g, '_')}_responses.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    
    const getAnalysisDataForQuestion = (questionId: number, filter: {filterKey: string, filterValue: string | null} | null) => {
        const question = survey.questions.find((q: any) => q.id === questionId);
        if (!question) {
            return { noData: true, chartData: null, tableData: null, insights: [] };
        }
        
        let targetResponses = responses;
        if (filter && filter.filterValue) {
            const filterQuestion = survey.questions.find((q:any) => q.title === filter.filterKey);
            if(filterQuestion) {
                 targetResponses = responses.filter(r => r.answers[filterQuestion.id] === filter.filterValue);
            }
        }
        
        const allAnswers = targetResponses.map(r => r.answers ? r.answers[question.id] : undefined).filter(a => a !== undefined && a !== null && a !== '');
        
        if (allAnswers.length === 0) {
            return { noData: true, chartData: null, tableData: null, insights: ["No responses yet."] };
        }
    
        let chartData: any = {};
        let tableData: any = [];
        let insights: string[] = [];

        switch (question.type) {
            case 'single':
            case 'multiple':
            case 'dropdown': {
                const counts: { [key: string]: number } = {};
                (question.options || []).forEach((opt: string) => { counts[opt] = 0; });
                allAnswers.flat().forEach((ans: any) => { if (counts[ans] !== undefined) counts[ans]++; });
                
                tableData = Object.entries(counts).map(([name, count]) => ({
                    name,
                    count,
                    percentage: responses.length > 0 ? ((count / allAnswers.length) * 100) : 0
                })).sort((a,b) => b.count - a.count);

                const mostSelected = tableData[0];
                insights = [
                    `Most frequent answer: <strong>${mostSelected.name}</strong> (${mostSelected.count} responses, ${mostSelected.percentage.toFixed(1)}%).`,
                    `A total of <strong>${allAnswers.length}</strong> responses were collected for this question.`
                ];

                chartData = tableData;
                break;
            }
            case 'text': {
                const textResponses = allAnswers.filter(a => typeof a === 'string' && a.trim() !== '');

                insights = [`Qualitative data collected.`];
                if (textResponses.length > 0) {
                    insights.push(`First response: <strong>"${textResponses[0]}"</strong>.`);
                }

                chartData = {}; 
                tableData = textResponses;
                break;
            }
            case 'number': {
                const numberResponses = allAnswers.map(Number).filter(n => !isNaN(n));
                const stats = {
                    mean: mean(numberResponses),
                    median: getMedian(numberResponses) || 0,
                    mode: getMode(numberResponses) || 0,
                    stdDev: standardDeviation(numberResponses),
                    min: Math.min(...numberResponses),
                    max: Math.max(...numberResponses),
                    count: numberResponses.length
                };
                chartData = { values: numberResponses };
                tableData = stats;
                insights = [
                    `The average response is <strong>${stats.mean.toFixed(2)}</strong>.`,
                    `Responses range from <strong>${stats.min}</strong> to <strong>${stats.max}</strong>.`,
                    `The standard deviation of <strong>${stats.stdDev.toFixed(2)}</strong> indicates the spread of the data.`
                ];
                break;
            }
             case 'rating': {
                const ratings = allAnswers.filter((a): a is number => typeof a === 'number');
                const avgRating = mean(ratings);
                chartData = { avg: avgRating, count: ratings.length };
                tableData = { 
                    avg: avgRating, 
                    median: getMedian(ratings) || 'N/A', 
                    mode: getMode(ratings) || 'N/A',
                    stdDev: standardDeviation(ratings),
                    count: ratings.length 
                };
                insights = [
                    `Average rating is <strong>${avgRating.toFixed(2)} / ${question.scale?.length || 5}</strong>.`,
                    `The most common rating given was <strong>${getMode(ratings)} star(s)</strong>.`,
                    `<strong>${((ratings.filter(r => r >= 4).length / ratings.length) * 100).toFixed(1)}%</strong> of users gave a high rating (4 or 5 stars).`
                ];
                break;
            }
            case 'best-worst': {
                const bestCounts: { [key: string]: number } = {};
                const worstCounts: { [key: string]: number } = {};
                question.items.forEach((item: string) => { bestCounts[item] = 0; worstCounts[item] = 0; });

                allAnswers.forEach(answer => {
                    if (answer?.best) bestCounts[answer.best]++;
                    if (answer?.worst) worstCounts[answer.worst]++;
                });
                
                tableData = question.items.map((item: string) => ({
                    name: item, best: bestCounts[item], worst: worstCounts[item],
                    score: (bestCounts[item] - worstCounts[item]),
                })).sort((a: any, b: any) => b.score - a.score);
                
                chartData = { y: tableData.map((d: any) => d.name).reverse(), x: tableData.map((d: any) => d.score).reverse(), orientation: 'h' };
                insights = [
                    `Highest preference: <strong>${tableData[0].name}</strong>.`,
                    `Lowest preference: <strong>${tableData[tableData.length-1].name}</strong>.`
                ];
                break;
            }
             case 'nps': {
                const npsScores = allAnswers.map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 10);
                const promoters = npsScores.filter(s => s >= 9).length;
                const passives = npsScores.filter(s => s >= 7 && s <= 8).length;
                const detractors = npsScores.filter(s => s <= 6).length;
                const total = npsScores.length;

                const promotersP = total > 0 ? (promoters / total) * 100 : 0;
                const passivesP = total > 0 ? (passives / total) * 100 : 0;
                const detractorsP = total > 0 ? (detractors / total) * 100 : 0;
                
                const nps = promotersP - detractorsP;

                const scoreCounts: {[key: number]: number} = {};
                for(let i=0; i<=10; i++) scoreCounts[i] = 0;
                npsScores.forEach(s => scoreCounts[s]++);

                chartData = { nps, promotersP, passivesP, detractorsP, scoreCounts };
                tableData = { promoters, passives, detractors, promotersP, passivesP, detractorsP, nps, scoreCounts };
                insights = [
                    `The overall NPS is <strong>${nps.toFixed(1)}</strong>.`,
                    `<strong>${promotersP.toFixed(1)}%</strong> of respondents are Promoters.`,
                    `<strong>${detractorsP.toFixed(1)}%</strong> of respondents are Detractors.`
                ];
                break;
            }
            default:
                return { noData: true, chartData: null, tableData: null, insights: [] };
        }
        return { chartData, tableData, insights };
    };
    
    const addQuestion = (type: string) => {
        let questionConfig;
        Object.values(questionTypeCategories).forEach(category => {
            const found = category.find(t => t.id === type);
            if (found) questionConfig = found;
        });
        if (!questionConfig) return;
        
        const newQuestion:any = {
            id: Date.now(),
            type: type,
            title: `New ${questionConfig.label} Question`,
            required: false,
            content: type === 'description' ? 'Enter your description or instructions here...' : '',
        };
        if ('options' in questionConfig) {
            newQuestion.options = [...questionConfig.options];
        }
        if ('items' in questionConfig) {
            newQuestion.items = [...(questionConfig as any).items];
        }
         if ('columns' in questionConfig) {
            newQuestion.columns = [...(questionConfig as any).columns];
        }
         if ('scale' in questionConfig) {
            newQuestion.scale = [...(questionConfig as any).scale];
        }
        if (type === 'nps') {
            newQuestion.title = 'How likely are you to recommend our product to a friend or colleague?';
        }
        if (type === 'matrix') {
            newQuestion.rows = ['Row 1', 'Row 2'];
        }
        setSurvey((prev: any) => ({ ...prev, questions: [...prev.questions, newQuestion] }));
    };

    const deleteQuestion = (id: number) => {
        setSurvey((prev: any) => {
            const newQuestions = prev.questions.filter((q: any) => q.id !== id);
            const newLogic = prev.logic.filter((l: any) => l.questionId !== id).map((l: any) => ({
                ...l,
                paths: l.paths.filter((p: any) => p.toQuestion !== id)
            }));
            return { ...prev, questions: newQuestions, logic: newLogic };
        });
    }
    
    const updateQuestion = (updatedQuestion: any) => {
        setSurvey((prev: any) => ({
            ...prev,
            questions: prev.questions.map((q: any) => q.id === updatedQuestion.id ? updatedQuestion : q)
        }));
    };

    const addLogicPath = (questionId: number) => {
        const newPath: LogicPath = { id: Date.now(), fromOption: '', toQuestion: 'end' };
        setSurvey((prev: any) => {
            const existingLogicIndex = prev.logic.findIndex((l: any) => l.questionId === questionId);
            if (existingLogicIndex > -1) {
                const updatedLogic = [...prev.logic];
                updatedLogic[existingLogicIndex].paths.push(newPath);
                return { ...prev, logic: updatedLogic };
            } else {
                return { ...prev, logic: [...prev.logic, { questionId, paths: [newPath] }] };
            }
        });
    };

    const removeLogicPath = (questionId: number, pathId: number) => {
        setSurvey((prev: any) => {
            const existingLogicIndex = prev.logic.findIndex((l: any) => l.questionId === questionId);
            if (existingLogicIndex > -1) {
                const updatedLogic = [...prev.logic];
                updatedLogic[existingLogicIndex].paths = updatedLogic[existingLogicIndex].paths.filter((p: any) => p.id !== pathId);
                return { ...prev, logic: updatedLogic };
            }
            return prev;
        });
    };
    
    const handleDragEnd = (event: DragEndEvent) => {
        const {active, over} = event;
    
        if (over && active.id !== over.id) {
          setSurvey((prev: any) => {
            const oldIndex = prev.questions.findIndex((item: any) => item.id === active.id);
            const newIndex = prev.questions.findIndex((item: any) => item.id === over!.id);
            return { ...prev, questions: arrayMove(prev.questions, oldIndex, newIndex) };
          });
        }
      }

    const handleDashboardDragEnd = (event: DragEndEvent) => {
        const { active, delta } = event;
        setDashboardPositions(prev => {
            const currentPosition = prev[active.id as any] || { x: 0, y: 0 };
            const newPosition = {
                x: currentPosition.x + delta.x,
                y: currentPosition.y + delta.y,
            };
            return {
                ...prev,
                [active.id]: newPosition
            };
        });
    };

    const saveAndTest = () => {
        if(saveDraft()) {
            setIsShareModalOpen(true);
        }
    };
    
    const generateQrCode = async () => {
        if (!surveyUrl) return;
        setIsLoadingQr(true);
        try {
            const response = await fetch(`/api/generate-qr-code?data=${encodeURIComponent(surveyUrl)}`);
            if(!response.ok) {
                throw new Error('Failed to generate QR code');
            }
            const result = await response.json();
            setQrCodeUrl(result.image);
        } catch (error) {
             toast({
                title: "QR Code Error",
                description: "Could not generate the QR code.",
                variant: "destructive",
            });
        } finally {
            setIsLoadingQr(false);
        }
    };

    const handleQuestionImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || uploadingImageForQuestionId === null) {
            return;
        }
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
            const imageUrl = reader.result as string;
            setSurvey(prev => ({
                ...prev,
                questions: prev.questions.map((q: any) => 
                    q.id === uploadingImageForQuestionId ? { ...q, imageUrl } : q
                )
            }));
            setUploadingImageForQuestionId(null);
        };
        reader.readAsDataURL(file);
    };
    
    const triggerImageUpload = (questionId: number) => {
        setUploadingImageForQuestionId(questionId);
        fileInputRef.current?.click();
    };


    useEffect(() => {
        if (surveyId) {
            setSurveyUrl(`${window.location.origin}/survey/view/general/${surveyId}`);
            
            const draft = localStorage.getItem(surveyId as string);
            if (draft) {
                const data = JSON.parse(draft);
                setSurvey(prev => ({...prev, ...data}));
                setIsSaved(true);
            }

            const savedResponses = localStorage.getItem(`${surveyId}_responses`);
            if (savedResponses) setResponses(JSON.parse(savedResponses));

            const savedViews = localStorage.getItem(`${surveyId}_views`);
            if (savedViews) setViews(parseInt(savedViews, 10));
        }
    }, [surveyId]);
    
    useEffect(() => {
        if (activeTab === 'dashboard' && surveyUrl && !qrCodeUrl) {
            generateQrCode();
        }
    }, [activeTab, surveyUrl, qrCodeUrl]);

    const copyUrlToClipboard = async () => {
        if (!surveyUrl) return;
        try {
            await navigator.clipboard.writeText(surveyUrl);
            toast({
                title: 'Copied to Clipboard',
                description: 'The survey URL has been copied to your clipboard.',
            });
        } catch (error) {
            console.error("Failed to copy", error);
        }
    };
    
    const downloadQrCode = () => {
        if (qrCodeUrl) {
            const link = document.createElement('a');
            link.href = qrCodeUrl;
            link.download = `${survey.title.replace(/\s+/g, '_')}_qr_code.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };
    
    const saveDraft = () => {
        if (!surveyId) return false;
        const draft = {
            id: surveyId,
            ...survey,
        };
        localStorage.setItem(surveyId as string, JSON.stringify(draft));
        setIsSaved(true);
        toast({
            title: "Draft Saved!",
            description: "Your survey has been saved locally.",
        });
        return true;
    };

    const handleTypeChange = (value: string) => {
        setSurvey((prev: any) => {
            const newTheme = { ...prev.theme, type: value };
            if (value === 'type1') {
                newTheme.primaryColor = 'hsl(340 82% 52%)'; // Rose
                newTheme.layout = 'modern';
                setCardStyle('border rounded-lg bg-background/80 backdrop-blur-sm');
            } else if (value === 'type2') {
                newTheme.primaryColor = 'hsl(142 76% 36%)'; // Forest
                newTheme.layout = 'classic';
                setCardStyle('bg-card');
            } else { // Default
                newTheme.primaryColor = 'hsl(221.2 83.1% 60%)';
                newTheme.layout = 'default';
                setCardStyle('bg-card');
            }
            return { ...prev, theme: newTheme };
        });
    };
    
    const performRetailAnalysis = (data: any[]) => {
        if (!data || data.length === 0) return null;
    
        const flatResponses = data.map(r => r.answers);
    
        const getAnswerByTitle = (title: string) => {
            const question = survey.questions.find((q: any) => q.title === title);
            return question ? flatResponses.map(r => r[question.id]) : [];
        };
    
        const satisfactionScores = getAnswerByTitle('Overall, how satisfied are you with our service?').filter(v => typeof v === 'number');
        const npsScores = getAnswerByTitle('How likely are you to recommend us to a friend or colleague?').filter(v => typeof v === 'number');
        const orderValues = getAnswerByTitle('Approximately, what is your average spend per visit?').filter(v => typeof v === 'number');
        const frequencies = getAnswerByTitle('How many times have you purchased from us in the last 6 months?').filter(v => typeof v === 'number');
        const ageGroups = getAnswerByTitle('Which age group do you belong to?');
    
        const promoters = npsScores.filter(s => s >= 9).length;
        const detractors = npsScores.filter(s => s <= 6).length;
        const totalNps = npsScores.length;
        const npsScore = totalNps > 0 ? ((promoters / totalNps) - (detractors / totalNps)) * 100 : 0;
    
        const kpiData = {
            npsScore: npsScore,
            avgSatisfaction: satisfactionScores.length > 0 ? mean(satisfactionScores) : 0,
            avgOrderValue: orderValues.length > 0 ? mean(orderValues) : 0,
            repurchaseRate: frequencies.length > 0 ? (frequencies.filter(f => f >= 2).length / frequencies.length) * 100 : 0,
        };
        
        const insights = [];
        if (kpiData.npsScore < 0) insights.push({ type: 'critical', title: '🚨 Urgent NPS Improvement Needed', text: `NPS score of ${kpiData.npsScore.toFixed(1)} is very low.`, actions: 'Investigate sources of dissatisfaction from detractors immediately.' });
        else if (kpiData.npsScore < 30) insights.push({ type: 'warning', title: '⚠️ Low NPS Score', text: `NPS score of ${kpiData.npsScore.toFixed(1)} indicates room for improvement.`, actions: 'Analyze passive and detractor feedback to identify key issues.' });
        else insights.push({ type: 'excellent', title: '👍 Strong NPS Score', text: `An NPS of ${kpiData.npsScore.toFixed(1)} is a healthy score.`, actions: 'Leverage promoters for testimonials and referrals.' });

        const ageGroupSatisfaction: {[key: string]: number[]} = {};
        flatResponses.forEach(r => {
            const ageQ = survey.questions.find((q: any) => q.title === 'Which age group do you belong to?');
            const satQ = survey.questions.find((q: any) => q.title === 'Overall, how satisfied are you with our service?');
            if(ageQ && satQ) {
                const age = r[ageQ.id];
                const satisfaction = r[satQ.id];
                if(age && typeof satisfaction === 'number') {
                    if(!ageGroupSatisfaction[age]) ageGroupSatisfaction[age] = [];
                    ageGroupSatisfaction[age].push(satisfaction);
                };
            }
        });
        const avgAgeSatisfaction = Object.entries(ageGroupSatisfaction).map(([age, scores]) => ({ age, avg: mean(scores) }));
        if(avgAgeSatisfaction.length > 1) {
             const topAgeGroup = [...avgAgeSatisfaction].sort((a,b) => b.avg - a.avg)[0];
             insights.push({ type: 'opportunity', title: `🚀 High Satisfaction in ${topAgeGroup.age} Age Group`, text: `The ${topAgeGroup.age} age group shows the highest satisfaction (${topAgeGroup.avg.toFixed(2)}/5).`, actions: 'Tailor marketing campaigns and loyalty programs for this demographic.' });
        }
    
        return { kpiData, insights };
    };
    
    const performServqualAnalysis = () => {
        if(responses.length === 0) return null;
        
        const dimensionAverages: any = {};
        survey.questions.forEach((q: any) => {
            if (q.type !== 'matrix') return;
            const dimension = q.title;
            const expectationScores: number[] = [];
            const perceptionScores: number[] = [];

            q.rows.forEach((row: string) => {
                 responses.forEach(res => {
                    if(res.answers[q.id]?.[row]?.Expectation) {
                        expectationScores.push(res.answers[q.id][row].Expectation);
                    }
                    if(res.answers[q.id]?.[row]?.Perception) {
                        perceptionScores.push(res.answers[q.id][row].Perception);
                    }
                });
            });

            const avgExpectation = expectationScores.length > 0 ? mean(expectationScores) : 0;
            const avgPerception = perceptionScores.length > 0 ? mean(perceptionScores) : 0;
            
            dimensionAverages[dimension] = {
                name: dimension,
                expectation: avgExpectation,
                perception: avgPerception,
                gap: avgPerception - avgExpectation,
            };
        });

        const overallGap = Object.values(dimensionAverages).reduce((sum: number, dim: any) => sum + dim.gap, 0) / Object.keys(dimensionAverages).length;
        
        setServqualAnalysisData({
            dimensionScores: Object.values(dimensionAverages),
            overallGap,
        });
        setActiveTab('servqual-dashboard');
    };
    
    const performIpaAnalysis = () => {
        const validResponses = responses.filter(r => r && r.answers);
        const overallSatisfactionQ = survey.questions.find((q: any) => q.type === 'rating');
        if (!overallSatisfactionQ) {
            toast({ title: "Analysis Error", description: "Could not find the 'Overall Satisfaction' rating question.", variant: "destructive" });
            return;
        }

        const overallScores = validResponses.map(r => r.answers[overallSatisfactionQ.id]).filter((s): s is number => typeof s === 'number');

        if (overallScores.length < 2) {
            toast({ title: "Not Enough Data", description: "At least 2 valid 'Overall Satisfaction' responses are needed.", variant: "destructive" });
            return;
        }

        const matrixQ = survey.questions.find((q: any) => q.type === 'matrix');
        if (!matrixQ) {
            toast({ title: "Analysis Error", description: "Could not find the satisfaction matrix question.", variant: "destructive" });
            return;
        }

        const satisfactionData: { [key: string]: (number|undefined)[] } = {};
        matrixQ.rows.forEach((attr: string) => {
            satisfactionData[attr] = validResponses.map(r => r.answers[matrixQ.id]?.[attr]);
        });
        
        const correlations = matrixQ.rows.map((attr: string) => {
            const attrScores = satisfactionData[attr].map(s => s ? parseFloat(String(s)) : undefined);
            return { name: attr, cor: pearsonCorrelation(attrScores, overallScores) }
        });
        
        const totalCorrelation = correlations.reduce((sum, item) => sum + Math.abs(item.cor), 0);

        const ipaData = matrixQ.rows.map((attr: string) => {
            const corItem = correlations.find(c => c.name === attr);
            const importanceWeight = totalCorrelation > 0 ? Math.abs(corItem?.cor || 0) / totalCorrelation : (1 / matrixQ.rows.length);
            const satisfactionScores = satisfactionData[attr].map(s => s ? parseFloat(String(s)) : undefined).filter((s): s is number => s !== undefined);

            return {
                name: attr,
                satisfaction: mean(satisfactionScores),
                importance: importanceWeight,
            };
        });

        const meanImportance = mean(ipaData.map(d => d.importance));
        const meanSatisfaction = mean(ipaData.map(d => d.satisfaction));

        const quadrants = {
            'Keep Up the Good Work': ipaData.filter(d => d.importance >= meanImportance && d.satisfaction >= meanSatisfaction),
            'Concentrate Here': ipaData.filter(d => d.importance >= meanImportance && d.satisfaction < meanSatisfaction),
            'Low Priority': ipaData.filter(d => d.importance < meanImportance && d.satisfaction < meanSatisfaction),
            'Possible Overkill': ipaData.filter(d => d.importance < meanImportance && d.satisfaction >= meanSatisfaction),
        };

        setIpaAnalysisData({ points: ipaData, meanImportance, meanSatisfaction, quadrants });
        setActiveTab('ipa-dashboard');
    };
    
    const [analysisItems, setAnalysisItems] = useState(survey.questions);
    
    const [filterKey, setFilterKey] = useState<string>('All');
    const [filterValue, setFilterValue] = useState<string | null>(null);
    const demographicQuestions = survey.questions.filter((q:any) => q.type === 'single' || q.type === 'dropdown');

    useEffect(() => {
        setAnalysisItems(survey.questions);
    }, [survey.questions]);


    return (
        <div className="w-full p-4 md:p-8 bg-gradient-to-br from-background to-slate-50">
            <input type="file" ref={fileInputRef} onChange={handleQuestionImageFileChange} className="hidden" accept="image/*" />
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">General Survey</h1>
                    <p className="text-muted-foreground">
                    Design, configure, and analyze your survey.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={saveDraft} disabled={!surveyId}>
                        <Save className="mr-2" />
                        Save Draft
                    </Button>
                    <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
                        <DialogTrigger asChild>
                             <Button onClick={saveAndTest} disabled={!surveyId}>
                                <Share2 className="mr-2" />
                                Share
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                             <DialogHeader>
                                <DialogTitle>Share Your Survey</DialogTitle>
                                <DialogDescription>
                                Your survey is ready. Use the link or QR code to test or share it.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="survey-link">Shareable Link</Label>
                                    <div className="flex items-center gap-2">
                                        <Input id="survey-link" value={surveyUrl} readOnly />
                                        <Button variant="outline" size="icon" onClick={copyUrlToClipboard}>
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div>
                                    <Label>QR Code</Label>
                                    <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
                                        {isLoadingQr ? (
                                            <Loader2 className="w-8 h-8 animate-spin" />
                                        ) : qrCodeUrl ? (
                                            <Image src={qrCodeUrl} alt="Survey QR Code" width={200} height={200} data-ai-hint="QR code"/>
                                        ) : (
                                            <p className="text-muted-foreground">Could not load QR code.</p>
                                        )}
                                        <Button variant="outline" disabled={!qrCodeUrl || isLoadingQr} onClick={downloadQrCode}>
                                            <Download className="mr-2" /> Download
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button className="w-full" asChild>
                                    <a href={surveyUrl} target="_blank" rel="noopener noreferrer">
                                        <Eye className="mr-2" /> Launch Kiosk
                                    </a>
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Button variant="outline" asChild>
                        <Link href="/dashboard/survey">
                            <ArrowLeft className="mr-2" />
                            Back to Surveys
                        </Link>
                    </Button>
                </div>
            </header>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="design"><ClipboardList className="mr-2" />Design</TabsTrigger>
                    <TabsTrigger value="setting"><Settings className="mr-2" />Setting</TabsTrigger>
                    <TabsTrigger value="analysis"><BarChart2 className="mr-2" />Analysis</TabsTrigger>
                    <TabsTrigger value="dashboard"><LayoutDashboard className="mr-2" />Dashboard</TabsTrigger>
                </TabsList>
                <TabsContent value="design">
                    <div className="grid md:grid-cols-12 gap-6 mt-4">
                        <div className="md:col-span-3">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Toolbox</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                     {Object.entries(questionTypeCategories).map(([category, types]) => (
                                        <div key={category}>
                                            <h3 className="text-sm font-semibold text-muted-foreground px-2 my-2">{category}</h3>
                                            {types.map((type) => (
                                                <div key={type.id} className="group relative">
                                                    <Button
                                                        variant="ghost"
                                                        className="w-full justify-start h-12 text-base"
                                                        onClick={() => addQuestion(type.id)}
                                                    >
                                                        <type.icon className={cn("w-6 h-6 mr-3", type.color)} /> 
                                                        <span className="flex-1 text-left">{type.label}</span>
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                    <Separator className="my-4" />
                                    <h3 className="text-sm font-semibold text-muted-foreground px-2 mt-4">OPTIONS</h3>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="ghost" className="w-full justify-start">
                                                <Shuffle className="w-5 h-5 mr-2" /> Question Logic
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-2xl">
                                            <DialogHeader>
                                                <DialogTitle>Question Logic</DialogTitle>
                                                <DialogDescription>
                                                    Define paths to guide users through the survey based on their answers.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto pr-4">
                                                {survey.questions.filter((q: any) => q.type !== 'description' && q.options).length === 0 ? (
                                                    <div className="flex justify-center items-center h-48 border-2 border-dashed rounded-lg">
                                                        <p className="text-muted-foreground text-center">Add some questions with options<br />to start building logic paths.</p>
                                                    </div>
                                                ) : (
                                                    survey.questions.filter((q: any) => q.type !== 'description' && q.options).map((q: any) => {
                                                        const questionLogic = survey.logic.find((l: any) => l.questionId === q.id);
                                                        return (
                                                            <Card key={q.id}>
                                                                <CardHeader>
                                                                    <CardTitle className="text-lg">{q.title}</CardTitle>
                                                                </CardHeader>
                                                                <CardContent className="space-y-4">
                                                                    {questionLogic && questionLogic.paths.map((path: any) => (
                                                                        <div key={path.id} className="flex items-center gap-2">
                                                                            <Label>When answer is</Label>
                                                                            <Select>
                                                                                <SelectTrigger className="w-[150px]">
                                                                                    <SelectValue placeholder="Select option" />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    {q.options.map((opt: string) => (
                                                                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                                                    ))}
                                                                                </SelectContent>
                                                                            </Select>
                                                                            <MoveRight className="w-5 h-5" />
                                                                            <Label>Jump to</Label>
                                                                            <Select>
                                                                                <SelectTrigger className="w-[180px]">
                                                                                    <SelectValue placeholder="Select question" />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    {survey.questions.filter((destQ: any) => destQ.id !== q.id && destQ.type !== 'description').map((destQ: any) => (
                                                                                        <SelectItem key={destQ.id} value={destQ.id.toString()}>{destQ.title}</SelectItem>
                                                                                    ))}
                                                                                    <Separator />
                                                                                    <SelectItem value="end">End of Survey</SelectItem>
                                                                                </SelectContent>
                                                                            </Select>
                                                                            <Button variant="ghost" size="icon" onClick={() => removeLogicPath(q.id, path.id)}>
                                                                                <Trash2 className="w-4 h-4 text-destructive"/>
                                                                            </Button>
                                                                        </div>
                                                                    ))}
                                                                    <Button variant="outline" size="sm" onClick={() => addLogicPath(q.id)}>
                                                                        <PlusCircle className="mr-2 h-4 w-4" /> Add Logic Path
                                                                    </Button>
                                                                </CardContent>
                                                            </Card>
                                                        )
                                                    })
                                                )}
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader>
                                     <CardTitle className="text-lg">Appearance</CardTitle>
                                </CardHeader>
                                <CardContent className="p-2 space-y-4">
                                    <div>
                                        <Label className="text-xs font-semibold mb-2 text-muted-foreground px-1">Survey Type</Label>
                                        <Select onValueChange={handleTypeChange} value={survey.theme?.type || 'default'}>
                                            <SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="default">Default</SelectItem>
                                                <SelectItem value="type1">Type 1</SelectItem>
                                                <SelectItem value="type2">Type 2</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="text-xs font-semibold mb-2 text-muted-foreground px-1">Page Transition</Label>
                                        <Select onValueChange={(value) => setSurvey(produce((draft: any) => { draft.theme.transition = value; }))} value={survey.theme?.transition || 'slide'}>
                                            <SelectTrigger><SelectValue placeholder="Select a transition" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="slide">Slide</SelectItem>
                                                <SelectItem value="fade">Fade</SelectItem>
                                                <SelectItem value="none">None</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardContent>
                             </Card>
                        </div>
                        <div className="md:col-span-9">
                             <Card
                                className="w-full min-h-full bg-cover bg-center"
                                style={{ 
                                    '--survey-primary-color': survey.theme?.primaryColor,
                                    backgroundImage: survey.theme?.background ? `url(${survey.theme.background})` : 'none',
                                } as React.CSSProperties}
                            >
                                <CardContent className="p-4 md:p-8 space-y-6">
                                     <div className={cn("p-4", cardStyle)}>
                                        <div className="text-center mb-4">
                                            {survey.theme?.logo && (
                                                <div className="flex justify-center">
                                                    <Image src={survey.theme.logo} alt="Survey Logo" width={120} height={120} className="max-h-24 w-auto object-contain" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <Label htmlFor="survey-title">Survey Title</Label>
                                            <Input 
                                            id="survey-title" 
                                            placeholder="Enter your survey title" 
                                            className="text-2xl font-bold p-0 border-none focus:ring-0 focus-visible:ring-offset-0 bg-transparent" 
                                            value={survey.title}
                                            onChange={(e) => setSurvey(prev => ({...prev, title: e.target.value}))}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="survey-description">Survey Description</Label>
                                            <Textarea 
                                            id="survey-description" 
                                            placeholder="Provide a short explanation for the purpose of this survey." 
                                            value={survey.description}
                                            onChange={(e) => setSurvey(prev => ({...prev, description: e.target.value}))}
                                            className="bg-transparent"
                                            />
                                            <p className="text-xs text-muted-foreground mt-1">You can add more specific explanations for individual questions.</p>
                                        </div>
                                        <Separator className="my-4" />
                                         <div>
                                            {survey.theme?.headerImage && (
                                                <div className="relative w-full h-48 bg-muted rounded-md mb-2">
                                                    <Image src={survey.theme.headerImage} alt="Header preview" fill objectFit="contain" className="p-2 rounded-md" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <DndContext 
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <SortableContext 
                                            items={survey.questions.map((q: any) => q.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            <div className="space-y-4">
                                                {survey.questions.length === 0 ? (
                                                    <div className="flex flex-col justify-center items-center h-96 border-2 border-dashed rounded-lg">
                                                        <p className="text-muted-foreground mb-4">Add questions from the toolbox to get started.</p>
                                                        <Button onClick={() => addQuestion('single')}>
                                                            <PlusCircle className="mr-2" /> Add Question
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    survey.questions.map((q: any) => {
                                                        const questionComponents: { [key: string]: React.ComponentType<any> } = {
                                                            single: SingleSelectionQuestion,
                                                            multiple: MultipleSelectionQuestion,
                                                            dropdown: DropdownQuestion,
                                                            text: TextQuestion,
                                                            rating: RatingQuestion,
                                                            number: NumberQuestion,
                                                            phone: PhoneQuestion,
                                                            email: EmailQuestion,
                                                            nps: NPSQuestion,
                                                            description: DescriptionBlock,
                                                            'best-worst': BestWorstQuestion,
                                                            matrix: MatrixQuestion
                                                          };
                                                          const QuestionComponent = questionComponents[q.type];
                                                          if (!QuestionComponent) return null;
                                                        return (
                                                            <SortableCard key={q.id} id={q.id}>
                                                                <QuestionComponent
                                                                    question={q}
                                                                    onDelete={deleteQuestion}
                                                                    onUpdate={updateQuestion}
                                                                    onImageUpload={triggerImageUpload}
                                                                    cardClassName={cardStyle}
                                                                />
                                                            </SortableCard>
                                                        )
                                                    })
                                                )}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="setting">
                    <p>Setting tab content goes here.</p>
                </TabsContent>
                <TabsContent value="analysis">
                     <Card className="mt-4">
                        <CardHeader>
                            <CardTitle>Detailed Analysis</CardTitle>
                             <div className="flex items-center gap-2">
                                <Label htmlFor="filter-key">Filter by</Label>
                                <Select value={filterKey} onValueChange={(v) => {setFilterKey(v); setFilterValue(null);}}>
                                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="All">All Respondents</SelectItem>
                                        {demographicQuestions.map((q:any) => <SelectItem key={q.id} value={q.title}>{q.title}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                {filterKey !== 'All' && (
                                    <Select value={filterValue || ''} onValueChange={(v) => setFilterValue(v === 'All' ? null : v)}>
                                        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select value..."/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="All">All</SelectItem>
                                            {(survey.questions.find((q:any) => q.title === filterKey)?.options || []).map((opt:string) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            {responses.length === 0 ? (
                                <div className="flex justify-center items-center h-64 border-2 border-dashed rounded-lg">
                                    <p className="text-muted-foreground">No responses yet. Share your survey to collect data!</p>
                                </div>
                            ) : (
                                survey.questions.filter((q: any) => q.type !== 'description' && q.type !== 'phone' && q.type !== 'email').map((q: any, qIndex: number) => {
                                    const analysisData = getAnalysisDataForQuestion(q.id, null);
                                    const comparisonAnalysisData = filterKey !== 'All' && filterValue ? getAnalysisDataForQuestion(q.id, { filterKey, filterValue }) : null;
                                    
                                    const comparisonChartData = comparisonAnalysisData?.noData ? null : comparisonAnalysisData;
                                    
                                    if (analysisData.noData) return null;
                                    
                                    const questionComponents: { [key: string]: React.ComponentType<any> } = {
                                        single: ChoiceAnalysisDisplay,
                                        multiple: ChoiceAnalysisDisplay,
                                        dropdown: ChoiceAnalysisDisplay,
                                        text: TextAnalysisDisplay,
                                        rating: RatingAnalysisDisplay,
                                        number: NumberAnalysisDisplay,
                                        nps: NPSAnalysisDisplay,
                                        'best-worst': BestWorstAnalysisDisplay,
                                      };
                                      const AnalysisComponent = questionComponents[q.type];

                                    return (
                                        <div key={`analysis-${q.id}`}>
                                            {AnalysisComponent ? (
                                                <AnalysisComponent 
                                                    chartData={analysisData.chartData} 
                                                    tableData={analysisData.tableData} 
                                                    insightsData={analysisData.insights} 
                                                    varName={`${qIndex + 1}. ${q.title}`} 
                                                    question={q} 
                                                    comparisonData={comparisonChartData}
                                                />
                                            ) : (
                                                <p className="text-muted-foreground">Analysis for this question type is not yet implemented.</p>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="dashboard">
                    <Card className="mt-4">
                         <CardHeader>
                            <CardTitle>Analysis Dashboard</CardTitle>
                            <CardDescription>Drag and drop to rearrange your analysis dashboard.</CardDescription>
                         </CardHeader>
                         <CardContent>
                            {responses.length === 0 ? (
                                <div className="flex justify-center items-center h-64 border-2 border-dashed rounded-lg">
                                    <p className="text-muted-foreground">No responses yet to build a dashboard.</p>
                                </div>
                            ) : (
                                <DndContext sensors={sensors} onDragEnd={handleDashboardDragEnd}>
                                    <div className="relative w-full min-h-screen bg-muted/50 rounded-lg border overflow-hidden">
                                        {analysisItems.filter((q: any) => q.type !== 'description' && q.type !== 'phone' && q.type !== 'email').map((q: any, i: number) => {
                                            const { noData, chartData } = getAnalysisDataForQuestion(q.id, null);
                                            if (noData) return null;
                                            
                                             const ChartComponent = () => {
                                                switch (q.type) {
                                                    case 'single': case 'multiple': case 'dropdown':
                                                        return <Plot data={[{ values: chartData.map((d: any) => d.count), labels: chartData.map((d: any) => d.name), type: 'pie', hole: .4, marker: { colors: COLORS } }]} layout={{ autosize: true, margin: { t: 40, b: 20, l: 20, r: 20 }, legend: {orientation: 'h'} }} style={{ width: '100%', height: '100%' }} useResizeHandler/>;
                                                    case 'number':
                                                        return <Plot data={[{ x: chartData.values, type: 'histogram', marker: {color: COLORS[0]} }]} layout={{ autosize: true, margin: { t: 40, b: 40, l: 40, r: 20 }, bargap: 0.1 }} style={{ width: '100%', height: '100%' }} useResizeHandler/>;
                                                    case 'rating':
                                                        return <div className="flex flex-col items-center gap-2"><StarDisplay rating={chartData.avg} total={q.scale?.length || 5} /><p>{chartData.avg.toFixed(2)} / {q.scale?.length || 5}</p></div>;
                                                    case 'nps':
                                                        return <div className="text-5xl font-bold text-primary">{chartData.nps.toFixed(1)}</div>
                                                    case 'text':
                                                        return <p className="text-sm text-muted-foreground p-4">Text analysis visual coming soon.</p>;
                                                    default: return <p>Chart not available.</p>;
                                                }
                                            };
                                            
                                            return (
                                                <DraggableDashboardCard key={q.id} id={q.id} position={dashboardPositions[q.id] || {x: (i % 3) * 320 + 20, y: Math.floor(i / 3) * 320 + 20}}>
                                                     <CardHeader className="p-2 cursor-grab flex-shrink-0" >
                                                        <CardTitle className="truncate text-sm">{q.title}</CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="p-2 flex-1 flex items-center justify-center overflow-hidden">
                                                        <ChartComponent />
                                                    </CardContent>
                                                </DraggableDashboardCard>
                                            )
                                        })}
                                    </div>
                                </DndContext>
                            )}
                         </CardContent>
                    </Card>
                </TabsContent>
                 {survey.isRetailTemplate && (
                    <TabsContent value="retail-dashboard">
                         <Card className="mt-4">
                            <CardHeader>
                                <CardTitle>Retail Analytics Dashboard</CardTitle>
                                <CardDescription>Specialized analysis for your retail customer survey data.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {retailAnalysisData ? <RetailAnalyticsDashboard data={retailAnalysisData} /> : <Button onClick={() => setRetailAnalysisData(performRetailAnalysis(responses))}>Run Retail Analysis</Button>}
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
                 {survey.isServqualTemplate && (
                    <TabsContent value="servqual-dashboard">
                         <Card className="mt-4">
                            <CardHeader>
                                <CardTitle>SERVQUAL Dashboard</CardTitle>
                                <CardDescription>Service quality gap analysis based on expectations and perceptions.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {servqualAnalysisData ? <ServqualAnalyticsDashboard data={servqualAnalysisData} /> : <Button onClick={performServqualAnalysis}>Run SERVQUAL Analysis</Button>}
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
                {survey.isIpaTemplate && (
                    <TabsContent value="ipa-dashboard">
                        <Card className="mt-4">
                            <CardHeader>
                                <CardTitle>IPA Dashboard</CardTitle>
                                <CardDescription>Importance-Performance Analysis results.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {ipaAnalysisData ? <IpaAnalyticsDashboard data={ipaAnalysisData} /> : <Button onClick={performIpaAnalysis} disabled={responses.length < 2}>Run IPA Analysis</Button>}
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
                 {survey.isPsmTemplate && (
                    <TabsContent value="psm-dashboard">
                       <VanWestendorpPage data={responses.map(r => r.answers)} numericHeaders={Object.keys(responses[0]?.answers || {})} onLoadExample={() => {}} />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}

