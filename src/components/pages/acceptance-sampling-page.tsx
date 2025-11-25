'use client';
import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Sigma, Loader2, HelpCircle, CheckCircle, AlertTriangle, Target, Activity, TrendingUp, Info, BarChart, BookOpen, Download, Bot, CheckCircle2, Shield } from 'lucide-react';
import Image from 'next/image';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import Papa from 'papaparse';

interface OcData {
    defect_rates: number[];
    acceptance_probs: number[];
}

interface AnalysisResults {
    oc_curve_data: OcData;
    producers_risk_alpha: number | null;
    consumers_risk_beta: number | null;
}

interface FullAnalysisResponse {
    results: AnalysisResults;
    plot: string;
    interpretations?: {
        overall_analysis: string;
        test_insights: string[];
        recommendations: string[];
    };
}

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results, aql, ltpd }: { results: AnalysisResults, aql: number, ltpd: number }) => {
    const alphaPercent = (results.producers_risk_alpha || 0) * 100;
    const betaPercent = (results.consumers_risk_beta || 0) * 100;
    const qualityLevel = alphaPercent <= 5 && betaPercent <= 10 ? 'Good' : 'Review Plan';
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Producer's Risk Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Producer's Risk (α)
                            </p>
                            <Shield className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className={`text-2xl font-semibold font-mono ${alphaPercent <= 5 ? 'text-green-600' : 'text-yellow-600'}`}>
                            {alphaPercent.toFixed(2)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                            @ AQL {(aql * 100).toFixed(1)}%
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Consumer's Risk Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Consumer's Risk (β)
                            </p>
                            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className={`text-2xl font-semibold font-mono ${betaPercent <= 10 ? 'text-green-600' : 'text-red-600'}`}>
                            {betaPercent.toFixed(2)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                            @ LTPD {(ltpd * 100).toFixed(1)}%
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Plan Quality Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Plan Quality
                            </p>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {qualityLevel}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {alphaPercent <= 5 && betaPercent <= 10 ? 'Acceptable risks' : 'High risks'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Discrimination Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Discrimination
                            </p>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold font-mono">
                            {((ltpd / aql)).toFixed(1)}x
                        </p>
                        <p className="text-xs text-muted-foreground">
                            LTPD/AQL ratio
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Overview Component
const SamplingOverview = ({ lotSize, sampleSize, acceptanceNumber, aql, ltpd }: {
    lotSize: number;
    sampleSize: number;
    acceptanceNumber: number;
    aql: number;
    ltpd: number;
}) => {
    const items = useMemo(() => {
        const overview = [];
        
        overview.push(`Sampling Plan: n=${sampleSize}, c=${acceptanceNumber} from N=${lotSize}`);
        overview.push(`Inspection rate: ${((sampleSize/lotSize)*100).toFixed(2)}% of lot`);
        overview.push(`AQL (Acceptable Quality Level): ${(aql*100).toFixed(1)}% defect rate`);
        overview.push(`LTPD (Lot Tolerance Percent Defective): ${(ltpd*100).toFixed(1)}% defect rate`);
        overview.push(`Discrimination ratio: ${(ltpd/aql).toFixed(1)}x (LTPD/AQL)`);
        
        if (sampleSize / lotSize > 0.1) {
            overview.push('⚠ Sample size >10% of lot - consider finite population correction');
        }
        
        if (acceptanceNumber === 0) {
            overview.push('Zero acceptance plan - very strict (reject if any defects found)');
        } else if (acceptanceNumber >= sampleSize * 0.1) {
            overview.push('⚠ High acceptance number - plan may be too lenient');
        }
        
        overview.push('Target: α ≤ 5% (producer\'s risk), β ≤ 10% (consumer\'s risk)');
        
        return overview;
    }, [lotSize, sampleSize, acceptanceNumber, aql, ltpd]);

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Analysis Overview</CardTitle>
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

// Generate interpretations
const generateSamplingInterpretations = (
    results: AnalysisResults, 
    sampleSize: number, 
    acceptanceNumber: number,
    aql: number,
    ltpd: number
) => {
    const insights: string[] = [];
    const alphaPercent = (results.producers_risk_alpha || 0) * 100;
    const betaPercent = (results.consumers_risk_beta || 0) * 100;
    
    // Overall analysis
    let overall = '';
    if (alphaPercent <= 5 && betaPercent <= 10) {
        overall = `<strong>Sampling plan is well-balanced.</strong> Producer's risk (α) of ${alphaPercent.toFixed(2)}% at AQL=${(aql*100).toFixed(1)}% and consumer's risk (β) of ${betaPercent.toFixed(2)}% at LTPD=${(ltpd*100).toFixed(1)}% are both within acceptable industry standards (α≤5%, β≤10%). This plan protects both the producer from rejecting good lots and the consumer from accepting bad lots. The sampling plan (n=${sampleSize}, c=${acceptanceNumber}) effectively discriminates between acceptable and unacceptable quality levels.`;
    } else if (alphaPercent > 5 && betaPercent <= 10) {
        overall = `<strong>Plan favors consumer protection over producer.</strong> Producer's risk (α) of ${alphaPercent.toFixed(2)}% at AQL=${(aql*100).toFixed(1)}% exceeds the typical 5% threshold, meaning good lots have a higher chance of rejection. However, consumer's risk (β) of ${betaPercent.toFixed(2)}% at LTPD=${(ltpd*100).toFixed(1)}% is acceptable. This plan is more conservative, potentially increasing producer costs through rejection of acceptable lots, but strongly protecting consumers from defective products.`;
    } else if (alphaPercent <= 5 && betaPercent > 10) {
        overall = `<strong>Plan favors producer protection over consumer.</strong> Consumer's risk (β) of ${betaPercent.toFixed(2)}% at LTPD=${(ltpd*100).toFixed(1)}% exceeds the typical 10% threshold, meaning bad lots have a higher chance of acceptance. Producer's risk (α) of ${alphaPercent.toFixed(2)}% at AQL=${(aql*100).toFixed(1)}% is acceptable. This plan may be too lenient, allowing defective lots to pass more often than desired, which could harm consumers and damage reputation.`;
    } else {
        overall = `<strong>Sampling plan needs adjustment.</strong> Both producer's risk (α) of ${alphaPercent.toFixed(2)}% at AQL=${(aql*100).toFixed(1)}% and consumer's risk (β) of ${betaPercent.toFixed(2)}% at LTPD=${(ltpd*100).toFixed(1)}% exceed acceptable thresholds. This plan fails to adequately protect either party, likely rejecting too many good lots while also accepting too many bad lots. The sampling parameters (n=${sampleSize}, c=${acceptanceNumber}) need revision to improve discrimination between quality levels.`;
    }
    
    // Producer's risk insight
    if (alphaPercent <= 5) {
        insights.push(`<strong>Producer's Risk (Type I Error):</strong> α = ${alphaPercent.toFixed(2)}% at AQL=${(aql*100).toFixed(1)}%. This acceptable risk means that when the producer submits lots with ${(aql*100).toFixed(1)}% defect rate (acceptable quality), only ${alphaPercent.toFixed(2)}% of such good lots will be incorrectly rejected. This protects the producer from unnecessary rejections and associated costs.`);
    } else {
        insights.push(`<strong>High Producer's Risk (Type I Error):</strong> α = ${alphaPercent.toFixed(2)}% at AQL=${(aql*100).toFixed(1)}% exceeds the 5% target. Good lots with ${(aql*100).toFixed(1)}% defect rate will be rejected ${alphaPercent.toFixed(2)}% of the time. This increases producer costs through false rejections. Consider increasing acceptance number (c) or sample size (n) to reduce this risk.`);
    }
    
    // Consumer's risk insight
    if (betaPercent <= 10) {
        insights.push(`<strong>Consumer's Risk (Type II Error):</strong> β = ${betaPercent.toFixed(2)}% at LTPD=${(ltpd*100).toFixed(1)}%. This acceptable risk means that when the producer submits lots with ${(ltpd*100).toFixed(1)}% defect rate (unacceptable quality), only ${betaPercent.toFixed(2)}% of such bad lots will be incorrectly accepted. This adequately protects consumers from receiving defective products.`);
    } else {
        insights.push(`<strong>High Consumer's Risk (Type II Error):</strong> β = ${betaPercent.toFixed(2)}% at LTPD=${(ltpd*100).toFixed(1)}% exceeds the 10% target. Bad lots with ${(ltpd*100).toFixed(1)}% defect rate will be accepted ${betaPercent.toFixed(2)}% of the time. This exposes consumers to defective products. Consider decreasing acceptance number (c) or increasing sample size (n) to reduce this risk.`);
    }
    
    // Discrimination ratio insight
    const ratio = ltpd / aql;
    if (ratio < 2) {
        insights.push(`<strong>Poor Discrimination:</strong> LTPD/AQL ratio of ${ratio.toFixed(1)} is very low (<2), indicating the plan cannot effectively distinguish between acceptable and unacceptable quality. The AQL and LTPD are too close together. Either widen the gap between them or increase sample size substantially to improve discrimination capability.`);
    } else if (ratio < 5) {
        insights.push(`<strong>Moderate Discrimination:</strong> LTPD/AQL ratio of ${ratio.toFixed(1)} provides moderate discrimination between acceptable (${(aql*100).toFixed(1)}%) and unacceptable (${(ltpd*100).toFixed(1)}%) quality levels. The plan can distinguish between these quality levels reasonably well, though increasing sample size would improve discrimination further.`);
    } else {
        insights.push(`<strong>Good Discrimination:</strong> LTPD/AQL ratio of ${ratio.toFixed(1)} (>5) provides strong discrimination between acceptable (${(aql*100).toFixed(1)}%) and unacceptable (${(ltpd*100).toFixed(1)}%) quality levels. The wide gap between AQL and LTPD makes it easier for the sampling plan to correctly classify lots, resulting in clearer accept/reject decisions.`);
    }
    
    // Acceptance number insight
    if (acceptanceNumber === 0) {
        insights.push(`<strong>Zero Acceptance Plan:</strong> c=0 is a very strict plan that rejects the lot if ANY defects are found in the sample. This plan is appropriate for critical applications where even a single defect is unacceptable (e.g., medical devices, safety equipment). However, it results in high producer's risk unless sample sizes are very small.`);
    } else {
        const acceptanceRate = (acceptanceNumber / sampleSize) * 100;
        insights.push(`<strong>Acceptance Number:</strong> c=${acceptanceNumber} allows up to ${acceptanceNumber} defect(s) in the sample of n=${sampleSize} (${acceptanceRate.toFixed(1)}% of sample). ${
            acceptanceRate > 10 ? 'This high acceptance rate may be too lenient for quality-critical applications.' :
            acceptanceRate > 5 ? 'This moderate acceptance rate balances strictness with practical inspection costs.' :
            'This low acceptance rate indicates a strict plan suitable for high-quality requirements.'
        }`);
    }
    
    // Sample size insight
    const inspectionRate = (sampleSize / 1000) * 100; // Assuming lot size context
    insights.push(`<strong>Sample Size:</strong> n=${sampleSize} represents the number of items inspected from each lot. ${
        sampleSize < 30 ? 'Small sample sizes (<30) provide limited information and may not detect defects reliably, especially at low defect rates.' :
        sampleSize < 100 ? 'Moderate sample size provides reasonable detection capability for typical defect rates.' :
        'Large sample size provides high confidence in accept/reject decisions but increases inspection costs.'
    } Larger samples improve discrimination but increase inspection costs.`);
    
    // Recommendations
    let recommendations: string[] = [];
    if (alphaPercent <= 5 && betaPercent <= 10) {
        recommendations = [
            '<strong>Maintain current plan:</strong> Both risks are acceptable—continue using this sampling plan',
            '<strong>Monitor actual results:</strong> Track actual defect rates and adjust plan if product quality changes significantly',
            '<strong>Document procedures:</strong> Standardize sampling methodology, acceptance criteria, and defect definitions',
            '<strong>Train inspectors:</strong> Ensure consistent application of acceptance criteria across all inspections',
            '<strong>Consider automation:</strong> For high-volume inspection, automated optical inspection may improve efficiency',
            '<strong>Periodic review:</strong> Re-evaluate plan quarterly or when process capabilities change'
        ];
    } else if (alphaPercent > 5 && betaPercent <= 10) {
        recommendations = [
            `<strong>Reduce producer's risk:</strong> Increase acceptance number (c) from ${acceptanceNumber} to ${acceptanceNumber + 1} to reduce false rejections`,
            '<strong>Alternative: Increase sample size:</strong> Larger n provides more information, reducing both risks',
            '<strong>Review AQL:</strong> If α is high, verify that AQL reflects actual acceptable quality level',
            '<strong>Cost analysis:</strong> Calculate costs of false rejections vs. inspection to optimize plan',
            '<strong>Negotiation:</strong> Work with customer to adjust quality requirements if current standards are unrealistic',
            '<strong>Process improvement:</strong> Focus on reducing defect rates to make sampling plan more effective'
        ];
    } else if (alphaPercent <= 5 && betaPercent > 10) {
        recommendations = [
            `<strong>Reduce consumer's risk:</strong> Decrease acceptance number (c) from ${acceptanceNumber} to ${Math.max(0, acceptanceNumber - 1)} or increase sample size`,
            '<strong>Tighten inspection:</strong> Consider 100% inspection or tightened sampling for critical lots',
            '<strong>Supplier qualification:</strong> Work with suppliers to improve incoming quality before sampling',
            '<strong>Review LTPD:</strong> Verify that LTPD reflects true unacceptable quality level from customer perspective',
            '<strong>Liability consideration:</strong> High β exposes company to defective products—assess legal/reputation risks',
            '<strong>Two-stage sampling:</strong> Implement double or multiple sampling to reduce risks while controlling costs'
        ];
    } else {
        recommendations = [
            '<strong>URGENT: Revise sampling plan:</strong> Both risks are unacceptable—plan is ineffective',
            `<strong>Increase sample size significantly:</strong> Try n=${Math.round(sampleSize * 1.5)} to improve discrimination`,
            `<strong>Adjust acceptance number:</strong> Review c=${acceptanceNumber} in context of new sample size`,
            '<strong>Redesign approach:</strong> Consider ANSI/ASQ Z1.4 (formerly MIL-STD-105E) for standard plans',
            '<strong>Use sampling tables:</strong> Consult standard sampling tables (e.g., Dodge-Romig) for validated plans',
            '<strong>Seek expertise:</strong> Consult with quality engineer or statistician to design optimal sampling plan'
        ];
    }
    
    return {
        overall_analysis: overall,
        test_insights: insights,
        recommendations: recommendations
    };
};

const IntroPage = ({ onStart }: { onStart: () => void }) => {
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Shield className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Acceptance Sampling</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Determine optimal sampling plans to balance producer and consumer risks using OC curves
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Shield className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Risk Management</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Balance producer's risk (rejecting good lots) and consumer's risk (accepting bad lots)
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">OC Curves</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Visualize plan performance across different defect rates with operating characteristic curves
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Plan Optimization</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Find optimal sample size and acceptance number for your quality requirements
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use Acceptance Sampling
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Acceptance sampling is used when 100% inspection is impractical or too costly. It provides a 
                            statistical basis for accepting or rejecting lots based on sample inspection. The Operating 
                            Characteristic (OC) curve shows the probability of accepting lots at various defect rates, 
                            helping you understand plan performance and risks.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-primary" />
                                    Key Parameters
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>n:</strong> Sample size (items inspected)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>c:</strong> Acceptance number (max defects)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>AQL:</strong> Acceptable quality level</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>LTPD:</strong> Lot tolerance % defective</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-primary" />
                                    Risk Targets
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>α ≤ 5%:</strong> Producer's risk target</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>β ≤ 10%:</strong> Consumer's risk target</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>OC Curve:</strong> Shows plan performance</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center pt-2">
                        <Button onClick={onStart} size="lg">
                            <Shield className="mr-2 h-5 w-5" />
                            Get Started
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default function AcceptanceSamplingPage() {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [lotSize, setLotSize] = useState(1000);
    const [sampleSize, setSampleSize] = useState(50);
    const [acceptanceNumber, setAcceptanceNumber] = useState(1);
    const [aql, setAql] = useState(0.01);
    const [ltpd, setLtpd] = useState(0.05);

    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);

    const handleAnalysis = useCallback(async () => {
        if (sampleSize <= 0 || acceptanceNumber < 0) {
            toast({ variant: 'destructive', title: 'Invalid Input', description: 'Sample size must be positive and acceptance number non-negative.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/acceptance-sampling', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    lotSize, 
                    sampleSize, 
                    acceptanceNumber,
                    aql: aql,
                    ltpd: ltpd
                }),
            });
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || "Failed to run analysis");
            }
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            
            // Generate interpretations
            const interpretations = generateSamplingInterpretations(
                result.results,
                sampleSize,
                acceptanceNumber,
                aql,
                ltpd
            );
            
            const fullResult: FullAnalysisResponse = {
                results: result.results,
                plot: result.plot,
                interpretations: interpretations
            };
            
            setAnalysisResult(fullResult);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [lotSize, sampleSize, acceptanceNumber, aql, ltpd, toast]);

    const handleDownloadResults = useCallback(() => {
        if (!analysisResult) return;
        
        const results = analysisResult.results;
        const exportData = results.oc_curve_data.defect_rates.map((rate, idx) => ({
            defect_rate: rate,
            acceptance_probability: results.oc_curve_data.acceptance_probs[idx],
        }));
        
        const csv = Papa.unparse(exportData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'acceptance_sampling_oc_curve.csv';
        link.click();
        URL.revokeObjectURL(url);
        
        toast({ title: 'Download Started', description: 'OC curve data is being downloaded.' });
    }, [analysisResult, toast]);

    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} />;
    }

    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Acceptance Sampling Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}>
                            <HelpCircle className="w-5 h-5"/>
                        </Button>
                    </div>
                    <CardDescription>Define sampling plan parameters and quality levels</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="lotSize">Lot Size (N)</Label>
                            <Input 
                                id="lotSize"
                                type="number" 
                                value={lotSize} 
                                onChange={e => setLotSize(Number(e.target.value))} 
                                min="1" 
                            />
                        </div>
                        <div>
                            <Label htmlFor="sampleSize">Sample Size (n)</Label>
                            <Input 
                                id="sampleSize"
                                type="number" 
                                value={sampleSize} 
                                onChange={e => setSampleSize(Number(e.target.value))} 
                                min="1" 
                            />
                        </div>
                        <div>
                            <Label htmlFor="acceptanceNumber">Acceptance Number (c)</Label>
                            <Input 
                                id="acceptanceNumber"
                                type="number" 
                                value={acceptanceNumber} 
                                onChange={e => setAcceptanceNumber(Number(e.target.value))} 
                                min="0" 
                            />
                        </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="aql">AQL (Acceptable Quality Level)</Label>
                            <Input 
                                id="aql"
                                type="number" 
                                value={aql} 
                                onChange={e => setAql(Number(e.target.value))} 
                                min="0" 
                                max="1" 
                                step="0.01" 
                            />
                            <p className="text-xs text-muted-foreground mt-1">Producer's risk point (e.g., 0.01 = 1%)</p>
                        </div>
                        <div>
                            <Label htmlFor="ltpd">LTPD (Lot Tolerance % Defective)</Label>
                            <Input 
                                id="ltpd"
                                type="number" 
                                value={ltpd} 
                                onChange={e => setLtpd(Number(e.target.value))} 
                                min="0" 
                                max="1" 
                                step="0.01" 
                            />
                            <p className="text-xs text-muted-foreground mt-1">Consumer's risk point (e.g., 0.05 = 5%)</p>
                        </div>
                    </div>
                    
                    {/* Overview Component */}
                    <SamplingOverview
                        lotSize={lotSize}
                        sampleSize={sampleSize}
                        acceptanceNumber={acceptanceNumber}
                        aql={aql}
                        ltpd={ltpd}
                    />
                </CardContent>
                <CardFooter className="flex justify-between">
                    <div className="flex gap-2">
                        {results && (
                            <>
                                <Button variant="outline" onClick={handleDownloadResults}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Export Data
                                </Button>
                            </>
                        )}
                    </div>
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin" />Calculating...</> : <><Sigma className="mr-2" />Calculate</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && (
                <Card>
                    <CardContent className="p-6 flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <p className="text-muted-foreground">Generating OC curve...</p>
                        <Skeleton className="h-96 w-full" />
                    </CardContent>
                </Card>
            )}

            {analysisResult && results && (
                <div className="space-y-6">
                    {/* Statistical Summary Cards */}
                    <StatisticalSummaryCards results={results} aql={aql} ltpd={ltpd} />

                    {/* Analysis Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Analysis Summary</CardTitle>
                            <CardDescription>Sampling plan risk assessment</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Alert variant={
                                ((results.producers_risk_alpha || 0) * 100) <= 5 && 
                                ((results.consumers_risk_beta || 0) * 100) <= 10 
                                    ? 'default' 
                                    : 'destructive'
                            }>
                                {((results.producers_risk_alpha || 0) * 100) <= 5 && 
                                 ((results.consumers_risk_beta || 0) * 100) <= 10 ? 
                                    <CheckCircle2 className="h-4 w-4" /> : 
                                    <AlertTriangle className="h-4 w-4" />
                                }
                                <AlertTitle>
                                    {((results.producers_risk_alpha || 0) * 100) <= 5 && 
                                     ((results.consumers_risk_beta || 0) * 100) <= 10
                                        ? 'Sampling Plan Acceptable'
                                        : 'Sampling Plan Needs Adjustment'}
                                </AlertTitle>
                                <AlertDescription>
                                    Producer's Risk: {((results.producers_risk_alpha || 0) * 100).toFixed(2)}% @ AQL {(aql * 100).toFixed(1)}% | 
                                    Consumer's Risk: {((results.consumers_risk_beta || 0) * 100).toFixed(2)}% @ LTPD {(ltpd * 100).toFixed(1)}%
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>

                    {/* Detailed Analysis */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline flex items-center gap-2">
                                <Shield className="h-5 w-5 text-primary" />
                                Detailed Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Overall Analysis */}
                            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/40">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-primary/10 rounded-md">
                                        <Target className="h-4 w-4 text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-base">Plan Assessment</h3>
                                </div>
                                <div 
                                    className="text-sm text-foreground/80 leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: analysisResult.interpretations?.overall_analysis || '' }}
                                />
                            </div>

                            {/* Key Insights */}
                            {analysisResult.interpretations?.test_insights && analysisResult.interpretations.test_insights.length > 0 && (
                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-blue-500/10 rounded-md">
                                            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <h3 className="font-semibold text-base">Key Insights</h3>
                                    </div>
                                    <ul className="space-y-3">
                                        {analysisResult.interpretations.test_insights.map((insight, idx) => (
                                            <li 
                                                key={idx}
                                                className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed"
                                            >
                                                <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                                                <div dangerouslySetInnerHTML={{ __html: insight }} />
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Recommendations */}
                            {analysisResult.interpretations?.recommendations && analysisResult.interpretations.recommendations.length > 0 && (
                                <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 rounded-lg p-6 border border-amber-300 dark:border-amber-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-amber-500/10 rounded-md">
                                            <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <h3 className="font-semibold text-base">Recommendations</h3>
                                    </div>
                                    <ul className="space-y-3">
                                        {analysisResult.interpretations.recommendations.map((rec, idx) => (
                                            <li 
                                                key={idx}
                                                className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed"
                                            >
                                                <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                                                <div dangerouslySetInnerHTML={{ __html: rec }} />
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* OC Curve */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Operating Characteristic (OC) Curve</CardTitle>
                            <CardDescription>
                                Probability of accepting lots at various defect rates
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Image 
                                src={analysisResult.plot} 
                                alt="OC Curve" 
                                width={1000} 
                                height={600} 
                                className="w-3/4 mx-auto rounded-sm border" 
                            />
                        </CardContent>
                        <CardFooter>
                            <p className="text-xs text-muted-foreground">
                                The OC curve shows acceptance probability vs. lot quality. Steeper curves indicate better discrimination between good and bad lots.
                            </p>
                        </CardFooter>
                    </Card>
                </div>
            )}
            
            {!isLoading && !results && (
                <div className="text-center text-muted-foreground py-10">
                    <Shield className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2">Configure sampling plan parameters and click &apos;Calculate&apos; to generate OC curve.</p>
                </div>
            )}
        </div>
    );
}


