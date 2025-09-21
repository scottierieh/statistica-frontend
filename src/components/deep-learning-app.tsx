
'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { BrainCircuit, UploadCloud, File, CheckCircle, ChevronRight, Loader2, Bot, Sparkles, Building, Heart, ShoppingCart } from 'lucide-react';
import DataUploader from './data-uploader';
import DataPreview from './data-preview';
import { useToast } from '@/hooks/use-toast';
import { DataSet, parseData, unparseData } from '@/lib/stats';
import * as XLSX from 'xlsx';
import { AnimatePresence, motion } from 'framer-motion';
import DnnClassificationPage from './pages/dnn-classification-page';
import { exampleDatasets } from '@/lib/example-datasets';


type AnalysisStep = 'select-type' | 'configure';
type AnalysisType = 'classification' | 'regression' | 'clustering' | 'nlp' | 'computer-vision';
type DomainType = 'marketing' | 'finance' | 'healthcare' | 'general';

interface AnalysisCardProps {
    title: string;
    description: string;
    icon: React.ElementType;
    type: AnalysisType;
    onSelect: (type: AnalysisType) => void;
    disabled?: boolean;
}

const AnalysisSelectionCard: React.FC<AnalysisCardProps> = ({ title, description, icon: Icon, type, onSelect, disabled }) => (
    <Card 
      className={cn(
        "transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1",
        disabled ? 'opacity-50 cursor-not-allowed bg-muted/50' : 'cursor-pointer'
      )} 
      onClick={() => !disabled && onSelect(type)}
    >
        <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
                <Icon className="h-5 w-5 text-primary"/>
                {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
    </Card>
);

const DomainRecommendation = ({ headers }: { headers: string[] }) => {
    const recommendation = useMemo(() => {
        const lowerCaseHeaders = headers.map(h => h.toLowerCase());
        
        const marketingKeywords = ['campaign', 'channel', 'conversion', 'cpc', 'ctr', 'customer', 'ltv', 'revenue', 'session'];
        const financeKeywords = ['asset', 'liability', 'equity', 'revenue', 'profit', 'stock', 'trade', 'portfolio', 'loan', 'credit'];
        const healthcareKeywords = ['patient', 'diagnosis', 'treatment', 'bmi', 'blood_pressure', 'heart_rate', 'medical', 'hospital', 'doctor'];

        const scores: { [key in DomainType]: number } = {
            marketing: lowerCaseHeaders.filter(h => marketingKeywords.some(k => h.includes(k))).length,
            finance: lowerCaseHeaders.filter(h => financeKeywords.some(k => h.includes(k))).length,
            healthcare: lowerCaseHeaders.filter(h => healthcareKeywords.some(k => h.includes(k))).length,
            general: 1 // a small base score
        };

        const topDomain = Object.keys(scores).reduce((a, b) => scores[a as DomainType] > scores[b as DomainType] ? a : b) as DomainType;

        const reasons: { [key in DomainType]?: string[] } = {
            marketing: lowerCaseHeaders.filter(h => marketingKeywords.some(k => h.includes(k))),
            finance: lowerCaseHeaders.filter(h => financeKeywords.some(k => h.includes(k))),
            healthcare: lowerCaseHeaders.filter(h => healthcareKeywords.some(k => h.includes(k))),
        };

        const domainInfo = {
            marketing: { icon: ShoppingCart, label: 'Marketing & Sales' },
            finance: { icon: Building, label: 'Finance & Trading' },
            healthcare: { icon: Heart, label: 'Healthcare & Medical' },
            general: { icon: BrainCircuit, label: 'General Purpose' },
        };

        return {
            domain: topDomain,
            reason: `Detected keywords: ${reasons[topDomain]?.slice(0,3).join(', ')}`,
            ...domainInfo[topDomain]
        };
    }, [headers]);

    const { icon: Icon, label, reason } = recommendation;

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><Bot className="h-5 w-5 text-primary" /> AI Domain Recommendation</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-6 w-6 text-primary"/>
                    </div>
                    <div>
                        <p className="font-semibold text-primary">{label}</p>
                        <p className="text-sm text-muted-foreground">{reason}</p>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};


export default function DeepLearningApp() {
    const [step, setStep] = useState<AnalysisStep>('select-type');
    const [analysisType, setAnalysisType] = useState<AnalysisType | null>(null);

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
            toast({ title: 'Success', description: `Loaded "${name}" with ${newData.length} rows.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'File Processing Error', description: error.message });
            setData([]); setAllHeaders([]); setFileName('');
        } finally {
            setIsUploading(false);
        }
    }, [toast]);

    const handleFileSelected = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => processData(e.target?.result as string, file.name);
        reader.onerror = () => toast({ variant: 'destructive', title: 'File Read Error' });
        if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
            reader.readAsArrayBuffer(file);
            reader.onload = (e) => {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, {type: 'array'});
                const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]);
                processData(csv, file.name);
            }
        } else {
            reader.readAsText(file);
        }
    }, [processData, toast]);

    const handleClearData = () => {
        setData([]); setAllHeaders([]); setFileName('');
    };

    const hasData = data.length > 0;

    const handleAnalysisSelect = (type: AnalysisType) => {
        setAnalysisType(type);
    };

    const handleNextStep = () => {
        if (analysisType) {
            setStep('configure');
        }
    };
    
    const handleLoadExampleData = (example: any) => {
        processData(example.data, example.name);
    }

    const renderContent = () => {
        if (step === 'select-type') {
            return (
                 <motion.div key="select-type" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline text-2xl">Start a New Analysis</CardTitle>
                            <CardDescription>First, upload your dataset. Then, choose the type of analysis you want to perform.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <DataUploader onFileSelected={handleFileSelected} loading={isUploading} />
                                {hasData && <DataPreview fileName={fileName} data={data} headers={allHeaders} onDownload={()=>{}} onClearData={handleClearData} />}
                            </div>
                            
                            {hasData && <DomainRecommendation headers={allHeaders} />}

                            <div className={cn("transition-opacity duration-500", hasData ? 'opacity-100' : 'opacity-20 pointer-events-none')}>
                                <h3 className="text-lg font-semibold mb-4">Select Analysis Type</h3>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    <AnalysisSelectionCard title="Classification" description="Predict a category (e.g., churn, fraud)." icon={BrainCircuit} type="classification" onSelect={handleAnalysisSelect} />
                                    <AnalysisSelectionCard title="Regression" description="Predict a continuous value (e.g., price, sales)." icon={BrainCircuit} type="regression" onSelect={handleAnalysisSelect} />
                                    <AnalysisSelectionCard title="Clustering" description="Group similar data points together (e.g., customer segments)." icon={BrainCircuit} type="clustering" onSelect={handleAnalysisSelect} />
                                    <AnalysisSelectionCard title="Natural Language (NLP)" description="Analyze and understand text data." icon={BrainCircuit} type="nlp" onSelect={() => {}} disabled />
                                    <AnalysisSelectionCard title="Computer Vision (CV)" description="Analyze and understand image data." icon={BrainCircuit} type="computer-vision" onSelect={() => {}} disabled />
                                </div>
                                {analysisType && <div className="mt-4 text-center text-sm font-medium text-primary">Selected: {analysisType}</div>}
                            </div>
                        </CardContent>
                         <CardFooter className="flex justify-end">
                            <Button onClick={handleNextStep} disabled={!analysisType || !hasData}>
                                Next <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                </motion.div>
            );
        }

        if (step === 'configure') {
            switch(analysisType) {
                case 'classification':
                    return <DnnClassificationPage 
                                data={data} 
                                numericHeaders={numericHeaders} 
                                categoricalHeaders={categoricalHeaders} 
                                onLoadExample={handleLoadExampleData} 
                                onFileSelected={handleFileSelected}
                                isUploading={isUploading}
                            />
                default:
                    return (
                        <Card>
                            <CardHeader><CardTitle>Configuration Not Available</CardTitle></CardHeader>
                            <CardContent><p>Configuration for '{analysisType}' is not yet implemented.</p><Button onClick={() => setStep('select-type')}>Back</Button></CardContent>
                        </Card>
                    );
            }
        }
    };


    return (
        <div className="p-4 md:p-6 space-y-8">
            <AnimatePresence mode="wait">
                {renderContent()}
            </AnimatePresence>
        </div>
    );
}

