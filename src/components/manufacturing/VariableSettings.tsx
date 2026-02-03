'use client';

import { useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { Loader2, UploadCloud, Database, Settings2, Play, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import Papa from 'papaparse';
import { exampleDatasets } from '@/lib/manufacturing-example-datasets';
import type { AnalysisConfig, AnalysisResults } from './ManufacturingLayout';

interface VariableSettingsProps {
    config: AnalysisConfig;
    updateConfig: (updates: Partial<AnalysisConfig>) => void;
    analysisResult: AnalysisResults | null;
    setAnalysisResult: (result: AnalysisResults | null) => void;
    isAnalyzing: boolean;
    setIsAnalyzing: (analyzing: boolean) => void;
}

export default function VariableSettings({ 
    config, 
    updateConfig, 
    analysisResult,
    setAnalysisResult,
    isAnalyzing,
    setIsAnalyzing
}: VariableSettingsProps) {
    const { toast } = useToast();
    const manufacturingExample = exampleDatasets.find(ex => ex.id === 'manufacturing-process');

    const processData = useCallback((dataToProcess: any[], fileName: string) => {
        if (dataToProcess.length > 0) {
            const firstRow = dataToProcess[0];
            const allHeaders = Object.keys(firstRow);
            const numeric = allHeaders.filter(h => typeof firstRow[h] === 'number');
            
            updateConfig({
                data: dataToProcess,
                numericHeaders: numeric,
                spcVariable: numeric[0] || '',
                regressionTarget: numeric.length > 1 ? numeric[1] : '',
                regressionFeatures: numeric.slice(2, 5),
            });
            
            setAnalysisResult(null);
            toast({ title: "Data Loaded", description: `${fileName}: ${dataToProcess.length} records, ${numeric.length} numeric variables` });
        }
    }, [updateConfig, setAnalysisResult, toast]);

    const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            complete: (results) => {
                processData(results.data as any[], file.name);
            },
            error: (error) => {
                toast({ variant: 'destructive', title: 'Error', description: error.message });
            }
        });
    }, [processData, toast]);

    const onLoadExample = useCallback(() => {
        if (manufacturingExample) {
            const parsed = Papa.parse(manufacturingExample.data, { header: true, dynamicTyping: true });
            processData(parsed.data as any[], manufacturingExample.name);
        }
    }, [manufacturingExample, processData]);

    const runAnalysis = useCallback(async () => {
        if (config.data.length === 0 || !config.spcVariable) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please load data and select SPC variable' });
            return;
        }
        
        setIsAnalyzing(true);
        try {
            const response = await fetch('/api/analysis/manufacturing-stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: config.data,
                    spc_variable: config.spcVariable,
                    regression_target: config.regressionTarget || undefined,
                    regression_features: config.regressionFeatures.length > 0 ? config.regressionFeatures : undefined,
                    usl: config.usl ? parseFloat(config.usl) : undefined,
                    lsl: config.lsl ? parseFloat(config.lsl) : undefined
                })
            });
            
            if (!response.ok) throw new Error((await response.json()).error || 'Analysis failed');
            
            const result: AnalysisResults = await response.json();
            setAnalysisResult(result);
            
            if (result.spc_violations.total_critical > 0) {
                toast({ variant: 'destructive', title: 'Alert', description: `${result.spc_violations.total_critical} control limit violation(s) detected!` });
            } else {
                toast({ title: 'Analysis Complete', description: 'All analyses have been updated.' });
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsAnalyzing(false);
        }
    }, [config, setAnalysisResult, setIsAnalyzing, toast]);

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Variable Settings</h2>
                <p className="text-gray-500 mt-1">Configure your data source and analysis parameters</p>
            </div>

            {/* Data Upload Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-gray-500" />
                        Data Source
                    </CardTitle>
                    <CardDescription>Upload your manufacturing data or load sample dataset</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="file-upload">Upload CSV File</Label>
                            <Input 
                                id="file-upload" 
                                type="file" 
                                accept=".csv" 
                                onChange={handleFileUpload}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Or Use Sample Data</Label>
                            {manufacturingExample && (
                                <Button onClick={onLoadExample} variant="outline" className="w-full">
                                    <UploadCloud className="mr-2 h-4 w-4" />
                                    Load Sample Dataset
                                </Button>
                            )}
                        </div>
                    </div>

                    {config.data.length > 0 && (
                        <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <div>
                                <p className="font-medium text-green-800">Data Loaded Successfully</p>
                                <p className="text-sm text-green-600">
                                    {config.data.length.toLocaleString()} records • {config.numericHeaders.length} numeric variables
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Variable Configuration */}
            {config.data.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings2 className="h-5 w-5 text-gray-500" />
                            Analysis Variables
                        </CardTitle>
                        <CardDescription>Select variables for SPC and predictive analysis</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* SPC Variable */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    SPC Variable
                                    <Badge variant="destructive" className="text-xs">Required</Badge>
                                </Label>
                                <Select 
                                    value={config.spcVariable} 
                                    onValueChange={(val) => updateConfig({ spcVariable: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select variable" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {config.numericHeaders.map(h => (
                                            <SelectItem key={h} value={h}>{h}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-gray-400">
                                    Primary process variable to monitor with control charts
                                </p>
                            </div>

                            {/* Specification Limits */}
                            <div className="space-y-2">
                                <Label>Specification Limits (Optional)</Label>
                                <div className="flex gap-2">
                                    <Input 
                                        placeholder="LSL (Lower)" 
                                        value={config.lsl} 
                                        onChange={(e) => updateConfig({ lsl: e.target.value })}
                                    />
                                    <Input 
                                        placeholder="USL (Upper)" 
                                        value={config.usl} 
                                        onChange={(e) => updateConfig({ usl: e.target.value })}
                                    />
                                </div>
                                <p className="text-xs text-gray-400">
                                    Required for accurate capability analysis (Cp, Cpk)
                                </p>
                            </div>
                        </div>

                        <Separator />

                        {/* Predictive Analysis Variables */}
                        <div className="space-y-4">
                            <h4 className="font-medium text-gray-900">Predictive Analysis (Optional)</h4>
                            
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Prediction Target</Label>
                                    <Select 
                                        value={config.regressionTarget || "__none__"} 
                                        onValueChange={(val) => updateConfig({ regressionTarget: val === "__none__" ? "" : val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select target" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">None</SelectItem>
                                            {config.numericHeaders
                                                .filter(h => h !== config.spcVariable)
                                                .map(h => (
                                                    <SelectItem key={h} value={h}>{h}</SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-gray-400">
                                        Outcome variable to predict (e.g., defect_rate)
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Predictor Features</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full justify-start">
                                                {config.regressionFeatures.length > 0 
                                                    ? `${config.regressionFeatures.length} features selected` 
                                                    : "Select features"}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-80">
                                            <div className="space-y-2">
                                                <h4 className="font-medium text-sm">Select Predictor Variables</h4>
                                                <Separator />
                                                <ScrollArea className="h-48">
                                                    {config.numericHeaders
                                                        .filter(h => h !== config.regressionTarget && h !== config.spcVariable)
                                                        .map(h => (
                                                            <div key={h} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                                                                <Checkbox 
                                                                    id={h} 
                                                                    checked={config.regressionFeatures.includes(h)} 
                                                                    onCheckedChange={checked => {
                                                                        updateConfig({
                                                                            regressionFeatures: checked 
                                                                                ? [...config.regressionFeatures, h]
                                                                                : config.regressionFeatures.filter(f => f !== h)
                                                                        });
                                                                    }}
                                                                />
                                                                <Label htmlFor={h} className="text-sm cursor-pointer">{h}</Label>
                                                            </div>
                                                        ))}
                                                </ScrollArea>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                    <p className="text-xs text-gray-400">
                                        Variables that may influence the target
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Run Analysis Button */}
                        <div className="flex items-center justify-between">
                            <div>
                                {analysisResult && (
                                    <p className="text-sm text-gray-500">
                                        Last analysis: {new Date(analysisResult.timestamp).toLocaleString()}
                                    </p>
                                )}
                            </div>
                            <Button 
                                onClick={runAnalysis} 
                                disabled={isAnalyzing || !config.spcVariable}
                                size="lg"
                            >
                                {isAnalyzing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Running Analysis...
                                    </>
                                ) : (
                                    <>
                                        <Play className="mr-2 h-4 w-4" />
                                        Run Analysis
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Available Variables Preview */}
            {config.data.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileSpreadsheet className="h-5 w-5 text-gray-500" />
                            Available Variables
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {config.numericHeaders.map(header => (
                                <Badge 
                                    key={header} 
                                    variant={
                                        header === config.spcVariable ? "default" :
                                        header === config.regressionTarget ? "secondary" :
                                        config.regressionFeatures.includes(header) ? "outline" : "secondary"
                                    }
                                    className="text-xs"
                                >
                                    {header}
                                    {header === config.spcVariable && " (SPC)"}
                                    {header === config.regressionTarget && " (Target)"}
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}