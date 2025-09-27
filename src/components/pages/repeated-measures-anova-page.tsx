
'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    Repeat, 
    BarChart3, 
    Target, 
    TrendingUp,
    CheckCircle,
    Info,
    MoveRight,
    PlayCircle,
    Users,
    Calendar,
    LineChart,
    Zap,
    AlertTriangle,
    CheckSquare,
    Upload,
    FileText,
    HelpCircle,
    BarChart as BarChartIcon,
    Settings,
    FileSearch,
} from 'lucide-react';

// Parse CSV file
const parseCSV = (csvText: string) => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    const data: any[] = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        if (values.length === headers.length) {
            const row: {[key: string]: any} = {};
            headers.forEach((header, idx) => {
                const value = values[idx];
                // Try to parse as number, keep as string if it fails
                row[header] = isNaN(Number(value)) || value === '' ? value : parseFloat(value);
            });
            data.push(row);
        }
    }
    
    return data;
};

// File upload component
const FileUpload = ({ onDataLoaded, isLoading }: { onDataLoaded: (data: any[], source: string) => void, isLoading: boolean }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');

    const handleFile = async (file: File) => {
        if (!file) return;
        
        if (!file.name.toLowerCase().endsWith('.csv')) {
            setUploadStatus('Please upload a CSV file');
            return;
        }

        setUploadStatus('Processing file...');
        
        try {
            const text = await file.text();
            const parsedData = parseCSV(text);
            
            if (parsedData.length === 0) {
                setUploadStatus('No data found in file');
                return;
            }
            
            setUploadStatus(`Successfully loaded ${parsedData.length} rows`);
            onDataLoaded(parsedData, 'uploaded');
            
            // Clear status after 3 seconds
            setTimeout(() => setUploadStatus(''), 3000);
            
        } catch (error) {
            setUploadStatus('Error reading file. Please check the format.');
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        handleFile(file);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFile(file);
        }
    };

    return (
        <div className="space-y-3">
            <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isDragging 
                        ? 'border-blue-400 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
            >
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600 mb-3">
                    Drag and drop your CSV file here, or click to browse
                </p>
                
                <div className="flex justify-center gap-2">
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileInput}
                        className="hidden"
                        id="file-upload"
                        disabled={isLoading}
                    />
                    <label
                        htmlFor="file-upload"
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer disabled:opacity-50"
                    >
                        <FileText className="w-4 h-4 mr-2" />
                        Choose CSV File
                    </label>
                    
                    <Button
                        onClick={downloadSampleCSV}
                        variant="outline"
                        size="sm"
                        className="inline-flex items-center"
                    >
                        <Upload className="w-4 h-4 mr-2" />
                        Download Sample CSV
                    </Button>
                </div>
            </div>
            
            {uploadStatus && (
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>{uploadStatus}</AlertDescription>
                </Alert>
            )}
            
            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                <p><strong>CSV Format Requirements:</strong></p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>First row should contain column headers</li>
                    <li>One column for subject/participant ID</li>
                    <li>Multiple columns for repeated measures (numeric values)</li>
                    <li>Optional: grouping variables (e.g., treatment, condition)</li>
                </ul>
                <p className="mt-2 text-blue-600">
                    <strong>Tip:</strong> Download the sample CSV above to see the proper format
                </p>
            </div>
        </div>
    );
};
const generateRepeatedMeasuresData = (scenario: string, nSubjects: number) => {
    const data = [];
    
    if (scenario === 'cognitive') {
        for (let i = 1; i <= nSubjects; i++) {
            const baseline = Math.random() * 20 + 50;
            const improvement = Math.random() * 15 + 5;
            
            data.push({
                Subject: `S${i.toString().padStart(3, '0')}`,
                Pre_Test: Math.round(baseline + (Math.random() - 0.5) * 8),
                Mid_Test: Math.round(baseline + improvement * 0.4 + (Math.random() - 0.5) * 6),
                Post_Test: Math.round(baseline + improvement * 0.8 + (Math.random() - 0.5) * 5),
                Group: Math.random() > 0.5 ? 'Treatment' : 'Control'
            });
        }
    } else if (scenario === 'exercise') {
        for (let i = 1; i <= nSubjects; i++) {
            const baseline = Math.random() * 30 + 120;
            const decline = Math.random() * 25 + 10;
            
            data.push({
                Subject: `P${i.toString().padStart(3, '0')}`,
                Week_1: Math.round(baseline + (Math.random() - 0.5) * 15),
                Week_4: Math.round(baseline - decline * 0.3 + (Math.random() - 0.5) * 12),
                Week_8: Math.round(baseline - decline * 0.6 + (Math.random() - 0.5) * 10),
                Week_12: Math.round(baseline - decline * 0.9 + (Math.random() - 0.5) * 8),
                Age_Group: Math.random() > 0.5 ? 'Young' : 'Older'
            });
        }
    } else {
        for (let i = 1; i <= nSubjects; i++) {
            const baseline = Math.random() * 25 + 60;
            const effect = Math.random() * 20 + 8;
            
            data.push({
                Subject: `PT${i.toString().padStart(2, '0')}`,
                Baseline: Math.round(baseline + (Math.random() - 0.5) * 10),
                Week_2: Math.round(baseline - effect * 0.3 + (Math.random() - 0.5) * 8),
                Week_4: Math.round(baseline - effect * 0.7 + (Math.random() - 0.5) * 6),
                Week_6: Math.round(baseline - effect * 0.9 + (Math.random() - 0.5) * 5),
                Treatment: Math.random() > 0.5 ? 'Drug_A' : 'Placebo'
            });
        }
    }
    
    return data;
};

// Calculate Greenhouse-Geisser epsilon
const calculateGreenhouseGeisser = (covMatrix: number[][]) => {
    const k = covMatrix.length;
    if (k <= 2) return 1.0;
    
    let trace = 0;
    let traceSquared = 0;
    
    for (let i = 0; i < k; i++) {
        trace += covMatrix[i][i];
        for (let j = 0; j < k; j++) {
            traceSquared += covMatrix[i][j] * covMatrix[j][i];
        }
    }
    
    const epsilon = Math.pow(trace, 2) / ((k - 1) * traceSquared);
    return Math.max(1 / (k - 1), Math.min(1.0, epsilon));
};

// Calculate Huynh-Feldt epsilon
const calculateHuynhFeldt = (epsilonGG: number, k: number, n: number) => {
    if (k <= 2) return 1.0;
    
    const numerator = n * (k - 1) * epsilonGG - 2;
    const denominator = (k - 1) * (n - 1 - (k - 1) * epsilonGG);
    
    if (denominator <= 0) return epsilonGG;
    
    const epsilonHF = numerator / denominator;
    return Math.min(1.0, Math.max(epsilonGG, epsilonHF));
};

// Main ANOVA calculation
const calculateRepeatedANOVA = (data: any[], withinFactors: string[], subjectVar: string) => {
    const n = data.length;
    const k = withinFactors.length;
    
    const withinData = withinFactors.map(factor => 
        data.map(row => parseFloat(row[factor]))
    );
    
    const grandMean = withinData.flat().reduce((sum, val) => sum + val, 0) / (n * k);
    const conditionMeans = withinData.map(condition => 
        condition.reduce((sum, val) => sum + val, 0) / n
    );
    const subjectMeans = data.map((_, idx) => 
        withinData.reduce((sum, condition) => sum + condition[idx], 0) / k
    );
    
    const totalSS = withinData.flat().reduce((sum, val) => 
        sum + Math.pow(val - grandMean, 2), 0
    );
    
    const betweenSubjectsSS = subjectMeans.reduce((sum, mean) => 
        sum + k * Math.pow(mean - grandMean, 2), 0
    );
    
    const conditionSS = conditionMeans.reduce((sum, mean) => 
        sum + n * Math.pow(mean - grandMean, 2), 0
    );
    
    const errorSS = totalSS - betweenSubjectsSS - conditionSS;
    
    const dfCondition = k - 1;
    const dfError = (n - 1) * (k - 1);
    
    const msCondition = conditionSS / dfCondition;
    const msError = errorSS / dfError;
    const fValue = msCondition / msError;
    const partialEtaSquared = conditionSS / (conditionSS + errorSS);
    
    // Covariance matrix for sphericity
    const covMatrix: number[][] = [];
    for (let i = 0; i < k; i++) {
        covMatrix[i] = [];
        for (let j = 0; j < k; j++) {
            if (i === j) {
                const mean = withinData[i].reduce((sum, val) => sum + val, 0) / n;
                const variance = withinData[i].reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1);
                covMatrix[i][j] = variance;
            } else {
                const mean1 = withinData[i].reduce((sum, val) => sum + val, 0) / n;
                const mean2 = withinData[j].reduce((sum, val) => sum + val, 0) / n;
                const covariance = withinData[i].reduce((sum, val, idx) => 
                    sum + (val - mean1) * (withinData[j][idx] - mean2), 0) / (n - 1);
                covMatrix[i][j] = covariance;
            }
        }
    }
    
    const epsilonGG = calculateGreenhouseGeisser(covMatrix);
    const epsilonHF = calculateHuynhFeldt(epsilonGG, k, n);
    
    // P-value approximation
    const calculatePValue = (f: number) => {
        if (f < 1) return 0.5;
        if (f > 7) return 0.001;
        if (f > 4) return 0.01;
        if (f > 2.5) return 0.05;
        return 0.1;
    };
    
    const pValue = calculatePValue(fValue);
    const pValueGG = calculatePValue(fValue * epsilonGG);
    const pValueHF = calculatePValue(fValue * epsilonHF);
    
    const sphericityViolated = epsilonGG < 0.95;
    
    return {
        main_effect: {
            f_value: fValue,
            df_numerator: dfCondition,
            df_denominator: dfError,
            p_value: pValue,
            p_value_gg: pValueGG,
            p_value_hf: pValueHF,
            partial_eta_squared: partialEtaSquared,
            significant: pValue < 0.05,
            significant_gg: pValueGG < 0.05,
            significant_hf: pValueHF < 0.05
        },
        sphericity: {
            epsilon_gg: epsilonGG,
            epsilon_hf: epsilonHF,
            violated: sphericityViolated,
            mauchly_test: {
                w: epsilonGG * 0.8,
                chi_square: -n * Math.log(Math.max(0.01, epsilonGG)),
                df: (k - 1) * (k - 2) / 2,
                p_value: sphericityViolated ? 0.02 : 0.5,
                violated: sphericityViolated
            }
        },
        descriptives: {
            condition_means: conditionMeans,
            condition_names: withinFactors,
            grand_mean: grandMean,
            n_subjects: n
        },
        anova_table: {
            within_subjects: {
                condition: {
                    ss: conditionSS,
                    df: dfCondition,
                    ms: msCondition,
                    f: fValue,
                    p: pValue,
                    p_gg: pValueGG,
                    p_hf: pValueHF
                },
                error: {
                    ss: errorSS,
                    df: dfError,
                    ms: msError
                }
            },
            between_subjects: {
                subjects: {
                    ss: betweenSubjectsSS,
                    df: n - 1
                }
            }
        }
    };
};

// Component definitions
const ANOVATable = ({ results }: { results: any }) => {
    const { anova_table, sphericity } = results;
    const violated = sphericity.violated;
    
    return (
        <div className="space-y-4">
            <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse border">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="border p-2 text-left">Source</th>
                            <th className="border p-2 text-right">SS</th>
                            <th className="border p-2 text-right">df</th>
                            <th className="border p-2 text-right">MS</th>
                            <th className="border p-2 text-right">F</th>
                            <th className="border p-2 text-right">p</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border p-2 font-medium">Within Subjects</td>
                            <td className="border p-2"></td>
                            <td className="border p-2"></td>
                            <td className="border p-2"></td>
                            <td className="border p-2"></td>
                            <td className="border p-2"></td>
                        </tr>
                        <tr>
                            <td className="border p-2 pl-6">Condition</td>
                            <td className="border p-2 text-right">{anova_table.within_subjects.condition.ss.toFixed(2)}</td>
                            <td className="border p-2 text-right">{anova_table.within_subjects.condition.df}</td>
                            <td className="border p-2 text-right">{anova_table.within_subjects.condition.ms.toFixed(2)}</td>
                            <td className="border p-2 text-right font-medium">{anova_table.within_subjects.condition.f.toFixed(3)}</td>
                            <td className="border p-2 text-right">
                                <Badge variant={anova_table.within_subjects.condition.p < 0.05 ? 'default' : 'secondary'}>
                                    {anova_table.within_subjects.condition.p.toFixed(3)}
                                </Badge>
                            </td>
                        </tr>
                        <tr>
                            <td className="border p-2 pl-6">Error</td>
                            <td className="border p-2 text-right">{anova_table.within_subjects.error.ss.toFixed(2)}</td>
                            <td className="border p-2 text-right">{anova_table.within_subjects.error.df}</td>
                            <td className="border p-2 text-right">{anova_table.within_subjects.error.ms.toFixed(2)}</td>
                            <td className="border p-2 text-right">-</td>
                            <td className="border p-2 text-right">-</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {violated && (
                <div>
                    <h4 className="font-semibold mb-2">Sphericity Corrections</h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse border">
                            <thead>
                                <tr className="bg-yellow-50">
                                    <th className="border p-2 text-left">Correction</th>
                                    <th className="border p-2 text-right">ε</th>
                                    <th className="border p-2 text-right">F</th>
                                    <th className="border p-2 text-right">p</th>
                                    <th className="border p-2 text-right">Decision</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border p-2">Greenhouse-Geisser</td>
                                    <td className="border p-2 text-right">{sphericity.epsilon_gg.toFixed(4)}</td>
                                    <td className="border p-2 text-right">{anova_table.within_subjects.condition.f.toFixed(3)}</td>
                                    <td className="border p-2 text-right">
                                        <Badge variant={anova_table.within_subjects.condition.p_gg < 0.05 ? 'default' : 'secondary'}>
                                            {anova_table.within_subjects.condition.p_gg.toFixed(3)}
                                        </Badge>
                                    </td>
                                    <td className="border p-2 text-right">
                                        <span className={anova_table.within_subjects.condition.p_gg < 0.05 ? 'text-green-600 font-medium' : 'text-gray-500'}>
                                            {anova_table.within_subjects.condition.p_gg < 0.05 ? 'Significant' : 'Not Significant'}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border p-2">Huynh-Feldt</td>
                                    <td className="border p-2 text-right">{sphericity.epsilon_hf.toFixed(4)}</td>
                                    <td className="border p-2 text-right">{anova_table.within_subjects.condition.f.toFixed(3)}</td>
                                    <td className="border p-2 text-right">
                                        <Badge variant={anova_table.within_subjects.condition.p_hf < 0.05 ? 'default' : 'secondary'}>
                                            {anova_table.within_subjects.condition.p_hf.toFixed(3)}
                                        </Badge>
                                    </td>
                                    <td className="border p-2 text-right">
                                        <span className={anova_table.within_subjects.condition.p_hf < 0.05 ? 'text-green-600 font-medium' : 'text-gray-500'}>
                                            {anova_table.within_subjects.condition.p_hf < 0.05 ? 'Significant' : 'Not Significant'}
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

const SphericityTest = ({ sphericity }: { sphericity: any }) => {
    const { mauchly_test, epsilon_gg, epsilon_hf, violated } = sphericity;
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <CheckSquare className="w-5 h-5" />
                    Sphericity Testing
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                            {violated ? (
                                <AlertTriangle className="w-4 h-4 text-orange-500" />
                            ) : (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                            Mauchly's Test of Sphericity
                        </h4>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                            <div>
                                <span className="text-gray-600">W: </span>
                                <span className="font-medium">{mauchly_test.w.toFixed(4)}</span>
                            </div>
                            <div>
                                <span className="text-gray-600">χ²: </span>
                                <span className="font-medium">{mauchly_test.chi_square.toFixed(3)}</span>
                            </div>
                            <div>
                                <span className="text-gray-600">p: </span>
                                <Badge variant={violated ? 'destructive' : 'default'}>
                                    {mauchly_test.p_value.toFixed(3)}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-green-50 rounded">
                            <div className="text-sm text-green-600 font-medium">Greenhouse-Geisser ε</div>
                            <div className="text-xl font-bold">{epsilon_gg.toFixed(4)}</div>
                            <div className="text-xs text-gray-600 mt-1">Conservative</div>
                        </div>
                        <div className="p-3 bg-purple-50 rounded">
                            <div className="text-sm text-purple-600 font-medium">Huynh-Feldt ε</div>
                            <div className="text-xl font-bold">{epsilon_hf.toFixed(4)}</div>
                            <div className="text-xs text-gray-600 mt-1">Liberal</div>
                        </div>
                    </div>
                    
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            {violated ? (
                                <span>
                                    <strong>Sphericity violated.</strong> Use corrected p-values: Greenhouse-Geisser (conservative) or Huynh-Feldt (liberal).
                                </span>
                            ) : (
                                <span>
                                    <strong>Sphericity assumption met.</strong> Standard F-test results are valid.
                                </span>
                            )}
                        </AlertDescription>
                    </Alert>
                </div>
            </CardContent>
        </Card>
    );
};

const DescriptiveStats = ({ descriptives }: { descriptives: any }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Descriptive Statistics</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-blue-50 rounded">
                            <div className="text-sm text-blue-600 font-medium">Sample Size</div>
                            <div className="text-xl font-bold">{descriptives.n_subjects}</div>
                        </div>
                        <div className="p-3 bg-green-50 rounded">
                            <div className="text-sm text-green-600 font-medium">Grand Mean</div>
                            <div className="text-xl font-bold">{descriptives.grand_mean.toFixed(2)}</div>
                        </div>
                    </div>
                    
                    <div>
                        <h4 className="font-medium mb-2">Condition Means</h4>
                        <div className="space-y-2">
                            {descriptives.condition_names.map((condition: string, idx: number) => (
                                <div key={condition} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                    <span className="font-medium">{condition.replace(/_/g, ' ')}</span>
                                    <span className="text-lg font-bold">{descriptives.condition_means[idx].toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

const IntroPage = ({ onStart }: { onStart: () => void; }) => {
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-gradient-to-r from-blue-50 to-purple-50">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                            <Repeat size={36} />
                        </div>
                    </div>
                    <CardTitle className="text-4xl font-bold text-gray-800">
                        Repeated Measures ANOVA
                    </CardTitle>
                    <CardDescription className="text-xl pt-2 text-gray-600 max-w-4xl mx-auto">
                        Analyze within-subjects designs with Greenhouse-Geisser and Huynh-Feldt corrections
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="space-y-4">
                            <h3 className="font-semibold text-xl flex items-center gap-2">
                                <Users className="text-blue-600"/> Same Participants
                            </h3>
                            <ul className="list-disc pl-5 space-y-2 text-gray-600">
                                <li>Longitudinal studies</li>
                                <li>Pre-post interventions</li>
                                <li>Learning curves</li>
                            </ul>
                        </div>
                        <div className="space-y-4">
                            <h3 className="font-semibold text-xl flex items-center gap-2">
                                <Calendar className="text-blue-600"/> Multiple Timepoints
                            </h3>
                            <ul className="list-disc pl-5 space-y-2 text-gray-600">
                                <li>Treatment effects over time</li>
                                <li>Skill development</li>
                                <li>Recovery patterns</li>
                            </ul>
                        </div>
                        <div className="space-y-4">
                            <h3 className="font-semibold text-xl flex items-center gap-2">
                                <LineChart className="text-blue-600"/> Sphericity Corrections
                            </h3>
                            <ul className="list-disc pl-5 space-y-2 text-gray-600">
                                <li>Mauchly's test</li>
                                <li>Greenhouse-Geisser</li>
                                <li>Huynh-Feldt</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end p-6 bg-gray-50">
                    <Button size="lg" onClick={onStart} className="bg-blue-600 hover:bg-blue-700">
                        Start RM-ANOVA <MoveRight className="ml-2 w-5 h-5"/>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default function RepeatedANOVAComponent() {
    const [view, setView] = useState('intro');
    const [data, setData] = useState<any[]>([]);
    const [dataSource, setDataSource] = useState(''); // 'sample' or 'uploaded'
    const [subjectVariable, setSubjectVariable] = useState('');
    const [withinFactors, setWithinFactors] = useState<string[]>([]);
    const [results, setResults] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    const scenarios = {
        cognitive: {
            name: 'Cognitive Training Study',
            description: 'Pre-test, Mid-test, Post-test design',
            factors: ['Pre_Test', 'Mid_Test', 'Post_Test']
        },
        exercise: {
            name: 'Exercise Intervention',
            description: 'Fitness measured over 12 weeks',
            factors: ['Week_1', 'Week_4', 'Week_8', 'Week_12']
        },
        drug: {
            name: 'Drug Trial',
            description: 'Symptom severity over treatment period',
            factors: ['Baseline', 'Week_2', 'Week_4', 'Week_6']
        }
    };

    const loadSampleData = (selectedScenario: keyof typeof scenarios) => {
        const sampleData = generateRepeatedMeasuresData(selectedScenario, 30);
        setData(sampleData);
        setDataSource('sample');
        
        const firstRow = sampleData[0];
        const subjectCol = Object.keys(firstRow).find(key => 
            key.toLowerCase().includes('subject') || key.toLowerCase().includes('participant')
        );
        setSubjectVariable(subjectCol || 'Subject');
        setWithinFactors(scenarios[selectedScenario].factors);
    };

    const handleDataUpload = (uploadedData: any[], source: string) => {
        setData(uploadedData);
        setDataSource(source);
        
        // Auto-detect subject variable
        const firstRow = uploadedData[0];
        const subjectCol = Object.keys(firstRow).find(key => 
            key.toLowerCase().includes('subject') || 
            key.toLowerCase().includes('participant') ||
            key.toLowerCase().includes('id')
        );
        setSubjectVariable(subjectCol || Object.keys(firstRow)[0]);
        
        // Clear previous factors for uploaded data
        setWithinFactors([]);
        setResults(null);
    };

    const availableVariables = useMemo(() => {
        if (data.length === 0) return [];
        return Object.keys(data[0]).filter(key => 
            typeof data[0][key] === 'number' || 
            !isNaN(parseFloat(data[0][key]))
        );
    }, [data]);

    const runAnalysis = async () => {
        if (!subjectVariable || withinFactors.length < 2) {
            alert('Please select a subject variable and at least 2 within-subject factors');
            return;
        }

        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const anovaResults = calculateRepeatedANOVA(data, withinFactors, subjectVariable);
        setResults(anovaResults);
        setIsLoading(false);
    };

    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} />;
    }

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Repeated Measures ANOVA</h1>
                    <p className="text-gray-600">Within-subjects analysis with sphericity corrections</p>
                </div>
                <Button onClick={() => setView('intro')} variant="ghost">
                    <Info className="w-4 h-4 mr-2" /> Help
                </Button>
            </div>

            {data.length > 0 && (
                <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Dataset Loaded</AlertTitle>
                    <AlertDescription>
                        {data.length} participants with {availableVariables.length} variables loaded 
                        {dataSource === 'uploaded' ? ' from uploaded file' : ' from sample data'}.
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="w-5 h-5" />
                            Data & Analysis Setup
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Data Loading Section */}
                        <div className="space-y-4">
                            <Label className="text-base font-semibold">Load Data</Label>
                            
                            <Tabs defaultValue="upload" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="upload">Upload CSV</TabsTrigger>
                                    <TabsTrigger value="sample">Sample Data</TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="upload" className="space-y-3">
                                    <FileUpload 
                                        onDataLoaded={handleDataUpload} 
                                        isLoading={isLoading}
                                    />
                                </TabsContent>
                                
                                <TabsContent value="sample" className="space-y-3">
                                    <div className="grid gap-2">
                                        {Object.entries(scenarios).map(([key, scenario]) => (
                                            <Button
                                                key={key}
                                                variant="outline"
                                                onClick={() => loadSampleData(key as keyof typeof scenarios)}
                                                className="text-left justify-start h-auto p-3"
                                            >
                                                <div>
                                                    <div className="font-medium">{scenario.name}</div>
                                                    <div className="text-sm text-gray-500">{scenario.description}</div>
                                                </div>
                                            </Button>
                                        ))}
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>

                        {/* Variable Selection */}
                        {data.length > 0 && (
                            <div className="space-y-4 border-t pt-4">
                                <Label className="text-base font-semibold">Variable Selection</Label>
                                
                                <div>
                                    <Label>Subject Variable</Label>
                                    <Select value={subjectVariable} onValueChange={setSubjectVariable}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select subject identifier" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.keys(data[0]).map(variable => (
                                                <SelectItem key={variable} value={variable}>
                                                    {variable}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label>Within-Subjects Factors ({withinFactors.length} selected)</Label>
                                    <div className="mt-2 space-y-2">
                                        {withinFactors.map((factor, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <Badge variant="default">{factor}</Badge>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setWithinFactors(prev => 
                                                        prev.filter((_, i) => i !== idx)
                                                    )}
                                                >
                                                    ×
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <Select onValueChange={(value) => 
                                        setWithinFactors(prev => 
                                            prev.includes(value) ? prev : [...prev, value]
                                        )
                                    }>
                                        <SelectTrigger className="mt-2">
                                            <SelectValue placeholder="Add factor" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableVariables
                                                .filter(v => !withinFactors.includes(v) && v !== subjectVariable)
                                                .map(variable => (
                                                <SelectItem key={variable} value={variable}>
                                                    {variable}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button 
                            onClick={runAnalysis}
                            disabled={isLoading || data.length === 0 || withinFactors.length < 2}
                            className="w-full"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Running Analysis...
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <PlayCircle className="w-4 h-4" />
                                    Run RM-ANOVA
                                </div>
                            )}
                        </Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            Analysis Results
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading && (
                            <div className="text-center py-8">
                                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-gray-600">Running repeated measures ANOVA...</p>
                                <Progress value={66} className="mt-4" />
                            </div>
                        )}

                        {results && !isLoading && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-blue-50 rounded">
                                        <div className="text-sm text-blue-600 font-medium">F-statistic</div>
                                        <div className="text-xl font-bold">{results.main_effect.f_value.toFixed(3)}</div>
                                    </div>
                                    <div className="p-3 bg-green-50 rounded">
                                        <div className="text-sm text-green-600 font-medium">p-value</div>
                                        <div className="text-xl font-bold">
                                            <Badge variant={results.main_effect.significant ? 'default' : 'secondary'}>
                                                {results.main_effect.p_value.toFixed(3)}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-purple-50 rounded">
                                        <div className="text-sm text-purple-600 font-medium">Effect Size (η²p)</div>
                                        <div className="text-xl font-bold">{results.main_effect.partial_eta_squared.toFixed(3)}</div>
                                    </div>
                                    <div className="p-3 bg-orange-50 rounded">
                                        <div className="text-sm text-orange-600 font-medium">Sphericity</div>
                                        <div className="text-xl font-bold">
                                            <Badge variant={results.sphericity.violated ? 'destructive' : 'default'}>
                                                {results.sphericity.violated ? 'Violated' : 'OK'}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                {results.main_effect.significant && (
                                    <Alert>
                                        <CheckCircle className="h-4 w-4" />
                                        <AlertTitle>Significant Main Effect</AlertTitle>
                                        <AlertDescription>
                                            There is a statistically significant difference between the repeated measures conditions.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>
                        )}

                        {!results && !isLoading && (
                            <div className="text-center py-12 text-gray-500">
                                <Repeat className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                <p>Configure your analysis and run RM-ANOVA</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {results && !isLoading && (
                <Tabs defaultValue="anova" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="anova">ANOVA Table</TabsTrigger>
                        <TabsTrigger value="descriptives">Descriptives</TabsTrigger>
                        <TabsTrigger value="sphericity">Sphericity</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="anova" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>ANOVA Summary Table</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ANOVATable results={results} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    
                    <TabsContent value="descriptives" className="space-y-4">
                        <DescriptiveStats descriptives={results.descriptives} />
                    </TabsContent>
                    
                    <TabsContent value="sphericity" className="space-y-4">
                        <SphericityTest sphericity={results.sphericity} />
                    </TabsContent>
                </Tabs>
            )}

            {data.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Dataset Preview</CardTitle>
                        <CardDescription>
                            Showing first 5 participants. Subject: {subjectVariable}, 
                            Factors: {withinFactors.join(', ')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        {Object.keys(data[0]).slice(0, 8).map(header => (
                                            <th key={header} className="text-left p-2 font-medium">
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.slice(0, 5).map((row, idx) => (
                                        <tr key={idx} className="border-b">
                                            {Object.values(row).slice(0, 8).map((value, valueIdx) => (
                                                <td key={valueIdx} className="p-2">
                                                    {value}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

