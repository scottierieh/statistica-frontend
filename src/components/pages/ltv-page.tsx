'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, DollarSign, HelpCircle, MoveRight, Settings, FileSearch, TrendingUp, AlertTriangle, CheckCircle, BookOpen, FileText } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface LtvSummary {
    total_customers: number;
    average_ltv: number;
    median_ltv: number;
    total_predicted_revenue: number;
    returning_customers?: number;
    new_customers?: number;
}
interface TopCustomer {
    CustomerID: any;
    predicted_ltv: number;
    frequency: number;
    recency: number;
    monetary_value: number;
}
interface LtvResults {
    summary: LtvSummary;
    top_customers: TopCustomer[];
}

// Overview Component
const LtvOverview = ({ 
    customerIdCol, 
    datetimeCol, 
    monetaryValueCol, 
    predictionMonths,
    dataLength 
}: {
    customerIdCol?: string;
    datetimeCol?: string;
    monetaryValueCol?: string;
    predictionMonths: number;
    dataLength: number;
}) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Customer ID
        if (customerIdCol) {
            overview.push(`Customer ID Column: ${customerIdCol}`);
        } else {
            overview.push('⚠ Select a customer ID column');
        }
        
        // Transaction Date
        if (datetimeCol) {
            overview.push(`Transaction Date Column: ${datetimeCol}`);
        } else {
            overview.push('⚠ Select a transaction date column');
        }
        
        // Monetary Value
        if (monetaryValueCol) {
            overview.push(`Monetary Value Column: ${monetaryValueCol}`);
        } else {
            overview.push('⚠ Select a monetary value column');
        }
        
        // Prediction Period
        overview.push(`Prediction Period: ${predictionMonths} months`);
        
        // Data info
        overview.push(`Total Transactions: ${dataLength}`);
        
        // Usage tip
        overview.push('Tip: Models work best with repeat purchase data');
        
        return overview;
    }, [customerIdCol, datetimeCol, monetaryValueCol, predictionMonths, dataLength]);

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Overview</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-1 text-sm text-muted-foreground">
                    {items.map((item, idx) => (
                        <li key={idx} className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
};

const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const ltvExample = exampleDatasets.find(d => d.id === 'ltv-data');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <DollarSign className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Customer Lifetime Value Prediction</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Forecast future customer value using BG/NBD and Gamma-Gamma models
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingUp className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Identify VIP Customers</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Discover who your most valuable customers will be
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <DollarSign className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Optimize Marketing</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Allocate budget by targeting high-LTV customers
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Settings className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Predictive Models</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Statistical models predict future behavior
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            How It Works
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Customer Lifetime Value (LTV) prediction uses statistical models to forecast the total revenue 
                            a customer will generate over their relationship with your business. The BG/NBD model predicts 
                            purchase frequency while the Gamma-Gamma model estimates transaction values, combining to provide 
                            accurate revenue forecasts.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-primary" />
                                    Required Setup
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Customer ID:</strong> Unique identifier for each customer</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Transaction Date:</strong> Purchase timestamp</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Monetary Value:</strong> Transaction amount</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <FileSearch className="w-4 h-4 text-primary" />
                                    Understanding Results
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Average LTV:</strong> Expected value per customer</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Top customers:</strong> Highest predicted values</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Total revenue:</strong> Forecasted business value</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {ltvExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(ltvExample)} size="lg">
                                {ltvExample.icon && <ltvExample.icon className="mr-2 h-5 w-5" />}
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};


interface LtvPageProps {
    data: DataSet;
    allHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function LtvPage({ data, allHeaders, onLoadExample }: LtvPageProps) {
    const { toast } = useToast();
    const [showIntro, setShowIntro] = useState(data.length === 0);
    const [customerIdCol, setCustomerIdCol] = useState<string | undefined>();
    const [datetimeCol, setDatetimeCol] = useState<string | undefined>();
    const [monetaryValueCol, setMonetaryValueCol] = useState<string | undefined>();
    const [predictionMonths, setPredictionMonths] = useState(12);

    const [analysisResult, setAnalysisResult] = useState<LtvResults | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => data.length > 0 && allHeaders.length >= 3, [data, allHeaders]);

    useEffect(() => {
        setCustomerIdCol(allHeaders.find(h => h.toLowerCase().includes('customer')));
        setDatetimeCol(allHeaders.find(h => h.toLowerCase().includes('date')));
        setMonetaryValueCol(allHeaders.find(h => h.toLowerCase().includes('price') || h.toLowerCase().includes('amount') || h.toLowerCase().includes('value')));
        setAnalysisResult(null);
        setErrorMessage(null);
        setShowIntro(data.length === 0 || allHeaders.length < 3);
    }, [allHeaders, data]);
    
    const handleAnalysis = useCallback(async () => {
        if (!customerIdCol || !datetimeCol || !monetaryValueCol) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select all required columns.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);
        setErrorMessage(null);
        
        try {
            const response = await fetch('/api/analysis/ltv', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data, 
                    customer_id_col: customerIdCol, 
                    datetime_col: datetimeCol, 
                    monetary_value_col: monetaryValueCol, 
                    prediction_months: predictionMonths 
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.error) {
                setErrorMessage(result.error);
                throw new Error(result.error);
            }
            
            setAnalysisResult(result.results);
            toast({ 
                title: 'Analysis Complete', 
                description: `Successfully predicted LTV for ${result.results.summary.total_customers} customers.` 
            });
            
        } catch (e: any) {
            console.error('LTV Analysis Error:', e);
            setErrorMessage(e.message);
            toast({ 
                variant: 'destructive', 
                title: 'Analysis Error', 
                description: 'Failed to predict LTV. Please check the error details below.' 
            });
        } finally {
            setIsLoading(false);
        }
    }, [data, customerIdCol, datetimeCol, monetaryValueCol, predictionMonths, toast]);
    
    if (showIntro || !canRun) {
        return <IntroPage onLoadExample={onLoadExample} />;
    }

    return (
        <div className="space-y-6">
            <Card className="border shadow-sm">
                <CardHeader className="pb-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="font-headline text-xl">LTV Prediction Setup</CardTitle>
                            <CardDescription className="mt-1">Configure variables to predict Customer Lifetime Value</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setShowIntro(true)}>
                            <HelpCircle className="w-5 h-5"/>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Customer ID Column</Label>
                        <Select value={customerIdCol} onValueChange={setCustomerIdCol}>
                            <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                            <SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Transaction Date Column</Label>
                        <Select value={datetimeCol} onValueChange={setDatetimeCol}>
                            <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                            <SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Monetary Value Column</Label>
                        <Select value={monetaryValueCol} onValueChange={setMonetaryValueCol}>
                            <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                            <SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Prediction Period (Months)</Label>
                        <Input type="number" value={predictionMonths} onChange={e => setPredictionMonths(Number(e.target.value))} min="1" max="60" />
                    </div>
                </CardContent>
                
                <CardContent className="pt-0">
                    <LtvOverview
                        customerIdCol={customerIdCol}
                        datetimeCol={datetimeCol}
                        monetaryValueCol={monetaryValueCol}
                        predictionMonths={predictionMonths}
                        dataLength={data.length}
                    />
                </CardContent>
                
                <CardFooter className="flex justify-end pt-4 border-t">
                    <Button onClick={handleAnalysis} disabled={isLoading || !customerIdCol || !datetimeCol || !monetaryValueCol} size="lg" className="gap-2">
                        {isLoading ? (
                            <>
                                <Loader2 className="animate-spin w-4 h-4" />
                                Calculating...
                            </>
                        ) : (
                            <>
                                <Sigma className="w-4 h-4" />
                                Predict LTV
                            </>
                        )}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && (
                <Card className="border shadow-sm">
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-32 w-full" />
                            <Skeleton className="h-64 w-full" />
                        </div>
                    </CardContent>
                </Card>
            )}

            {errorMessage && (
                <Alert variant="destructive" className="border-red-200">
                    <AlertTriangle className="h-5 w-5" />
                    <AlertTitle className="text-base font-semibold">Analysis Failed</AlertTitle>
                    <AlertDescription className="mt-2">
                        <div className="space-y-4">
                            <p className="font-medium">{errorMessage}</p>
                            <div className="mt-4 p-4 bg-destructive/10 rounded-lg">
                                <p className="font-semibold mb-3">Data Requirements:</p>
                                <ul className="list-disc pl-5 space-y-1.5 text-sm">
                                    <li>Minimum 10 valid transactions</li>
                                    <li>At least 5 unique customers</li>
                                    <li>At least 3 customers with repeat purchases</li>
                                    <li>All monetary values must be positive (greater than 0)</li>
                                    <li>Valid date format in the date column</li>
                                    <li>No missing values in key columns</li>
                                </ul>
                            </div>
                            <div className="mt-4 p-4 bg-muted rounded-lg">
                                <p className="text-sm font-semibold mb-2">Troubleshooting Tips:</p>
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                    <li>Check if your data has enough transaction history</li>
                                    <li>Verify that customers have made multiple purchases</li>
                                    <li>Ensure date format is consistent (YYYY-MM-DD recommended)</li>
                                    <li>Remove or fix any negative or zero monetary values</li>
                                    <li>Try using a larger dataset if available</li>
                                </ul>
                            </div>
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            {analysisResult && !errorMessage && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="border shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Average LTV</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold text-primary">${analysisResult.summary.average_ltv.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground mt-2">Per customer over {predictionMonths} months</p>
                            </CardContent>
                        </Card>
                        <Card className="border shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Total Predicted Revenue</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold text-green-600">${analysisResult.summary.total_predicted_revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                <p className="text-xs text-muted-foreground mt-2">Expected total revenue</p>
                            </CardContent>
                        </Card>
                        <Card className="border shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold">{analysisResult.summary.total_customers}</p>
                                <p className="text-xs text-muted-foreground mt-2">Analyzed customers</p>
                            </CardContent>
                        </Card>
                        <Card className="border shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Median LTV</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold text-blue-600">${analysisResult.summary.median_ltv.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground mt-2">Middle value</p>
                            </CardContent>
                        </Card>
                    </div>
                    
                    {/* Customer Insights Alert */}
                    {analysisResult.summary.returning_customers !== undefined && (
                        <Alert className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                            <AlertTitle className="text-base font-semibold">Customer Insights</AlertTitle>
                            <AlertDescription>
                                <div className="grid grid-cols-2 gap-6 mt-3">
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold">Returning Customers: {analysisResult.summary.returning_customers}</p>
                                        <p className="text-xs text-muted-foreground">Customers with repeat purchases</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold">New Customers: {analysisResult.summary.new_customers}</p>
                                        <p className="text-xs text-muted-foreground">Single purchase customers</p>
                                    </div>
                                </div>
                            </AlertDescription>
                        </Alert>
                    )}
                    
                    {/* Top Customers Table */}
                    <Card className="border shadow-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg font-semibold">Top 10 Customers by Predicted LTV ({predictionMonths} months)</CardTitle>
                            <CardDescription>Focus retention efforts on these high-value customers</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[500px]">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="font-semibold">Customer ID</TableHead>
                                            <TableHead className="text-right font-semibold">Predicted LTV</TableHead>
                                            <TableHead className="text-right font-semibold">Purchase Frequency</TableHead>
                                            <TableHead className="text-right font-semibold">Recency (days)</TableHead>
                                            <TableHead className="text-right font-semibold">Avg. Order Value</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {analysisResult.top_customers.map((cust, i) => (
                                            <TableRow key={i} className="hover:bg-muted/50">
                                                <TableCell className="font-medium">{cust.CustomerID}</TableCell>
                                                <TableCell className="font-mono text-right text-green-600 font-semibold text-base">
                                                    ${cust.predicted_ltv.toFixed(2)}
                                                </TableCell>
                                                <TableCell className="font-mono text-right">{cust.frequency.toFixed(0)}</TableCell>
                                                <TableCell className="font-mono text-right">{cust.recency.toFixed(0)}</TableCell>
                                                <TableCell className="font-mono text-right">${cust.monetary_value.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}


