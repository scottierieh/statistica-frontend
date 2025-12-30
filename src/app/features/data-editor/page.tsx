
'use client';
import React, { useState, useEffect } from 'react';
import { FeaturePageHeader } from '@/components/feature-page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileUp, Database, Wand2, Shield, Clock, MousePointer, Undo2, Download, Sparkles, Check, X, ArrowRight, Zap, Target, TrendingUp, Eye, EyeOff, AlertTriangle, CheckCircle2, Timer, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// Hero Feature Cards with rotating showcase - Rectangular horizontal layout
const FeatureCard = ({ icon: Icon, title, description, onMouseEnter, onMouseLeave, isActive }: { icon: React.ElementType; title: string; description: string; onMouseEnter: () => void; onMouseLeave: () => void; isActive: boolean; }) => {
    return (
        <div 
            className={cn(
                "relative p-5 rounded-lg bg-muted/50 flex items-center gap-4 cursor-pointer transition-all duration-300 flex-1",
                isActive ? "border-2 border-primary bg-primary/5 shadow-lg" : "border-2 border-transparent"
            )}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div className="flex-shrink-0">
                <Icon className="h-10 w-10 text-primary" />
            </div>
            <div className="text-left">
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
        </div>
    );
};

// Before/After Comparison Component
const BeforeAfterCard = ({ 
    title, 
    beforeItems, 
    afterItems,
    icon: Icon
}: { 
    title: string; 
    beforeItems: string[]; 
    afterItems: string[];
    icon: React.ElementType;
}) => {
    return (
        <Card className="overflow-hidden">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Icon className="w-5 h-5 text-primary" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
                    {/* Before */}
                    <div className="space-y-2">
                        <Badge variant="outline" className="mb-2 text-red-600 border-red-300 bg-red-50">Before</Badge>
                        {beforeItems.map((item, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                                <X className="w-4 h-4 text-red-400 flex-shrink-0" />
                                <span>{item}</span>
                            </div>
                        ))}
                    </div>
                    
                    {/* Arrow */}
                    <div className="flex items-center justify-center">
                        <ArrowRight className="w-6 h-6 text-primary" />
                    </div>
                    
                    {/* After */}
                    <div className="space-y-2">
                        <Badge variant="outline" className="mb-2 text-primary border-primary/30 bg-primary/5">After</Badge>
                        {afterItems.map((item, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                                <Check className="w-4 h-4 text-primary flex-shrink-0" />
                                <span>{item}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

// Workflow Step Component
const WorkflowStep = ({ 
    step, 
    title, 
    description, 
    icon: Icon,
    isLast = false 
}: { 
    step: number; 
    title: string; 
    description: string; 
    icon: React.ElementType;
    isLast?: boolean;
}) => {
    return (
        <div className="flex gap-4">
            <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary">
                    <Icon className="w-6 h-6 text-primary" />
                </div>
                {!isLast && <div className="w-0.5 h-full bg-primary/20 mt-2" />}
            </div>
            <div className="pb-8">
                <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs">Step {step}</Badge>
                    <h4 className="font-semibold">{title}</h4>
                </div>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
        </div>
    );
};

// Stats Counter Component
const StatCard = ({ value, label, icon: Icon }: { value: string; label: string; icon: React.ElementType }) => {
    return (
        <div className="text-center p-6 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
            <Icon className="w-8 h-8 text-primary mx-auto mb-2" />
            <div className="text-3xl font-bold text-primary">{value}</div>
            <div className="text-sm text-muted-foreground">{label}</div>
        </div>
    );
};

// Capability Pill Component
const CapabilityPill = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => {
    return (
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border shadow-sm hover:shadow-md transition-shadow">
            <Icon className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">{label}</span>
        </div>
    );
};


export default function DataPreprocessingFeaturePage() {
    const features = {
        'missing': { icon: Eye, title: 'Live Stats', description: 'Live statistics, automatically detects data types, and highlights missing values in real time.', image: PlaceHolderImages.find(img => img.id === "missing-value") },
        'transform': { icon: TrendingUp, title: 'Data Transformation', description: 'Log, Z-score, Min-Max scaling—select and apply in one click.', image: PlaceHolderImages.find(img => img.id === "data-transformation") },
        'quality': { icon: AlertTriangle, title: 'Data Quality', description: 'Auto-detect and fill with mean, median, mode, or time-series methods.', image: PlaceHolderImages.find(img => img.id === "data-quality") },
    };
    
    const featureKeys = Object.keys(features);
    const [activeFeature, setActiveFeature] = useState(featureKeys[0]);
    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
        if (isHovering) return;
        const interval = setInterval(() => {
            setActiveFeature(current => {
                const currentIndex = featureKeys.indexOf(current);
                const nextIndex = (currentIndex + 1) % featureKeys.length;
                return featureKeys[nextIndex];
            });
        }, 5000);
        return () => clearInterval(interval);
    }, [isHovering, featureKeys]);


    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            <FeaturePageHeader title="Data Editor" />
            <main className="flex-1 p-4 md:p-8 lg:p-12">
                <div className="max-w-6xl mx-auto space-y-12">
                    
                    {/* Hero Section */}
                    <Card>
                        <CardHeader className="text-center">
                            <CardTitle className="text-4xl font-headline">
                                From Messy Data to Analysis-Ready
                                <br />
                                <span className="text-primary">In Minutes, Not Hours</span>
                            </CardTitle>
                            <CardDescription className="text-lg text-muted-foreground mt-2 max-w-2xl mx-auto">
                                Stop wrestling with spreadsheets. Clean, transform, and prepare your data 
                                with an intuitive visual interface—no coding required.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-2 gap-8">
                                {/* 3 rectangular cards in vertical stack - fills full height */}
                                <div className="flex flex-col gap-4 h-[400px]">
                                    {Object.entries(features).map(([key, feature]) => (
                                        <FeatureCard
                                            key={key}
                                            icon={feature.icon}
                                            title={feature.title}
                                            description={feature.description}
                                            onMouseEnter={() => { setActiveFeature(key); setIsHovering(true); }}
                                            onMouseLeave={() => setIsHovering(false)}
                                            isActive={activeFeature === key}
                                        />
                                    ))}
                                </div>
                                <div className="h-[400px] relative w-full overflow-hidden rounded-xl border shadow-lg">
                                    <AnimatePresence>
                                        {activeFeature && features[activeFeature as keyof typeof features].image && (
                                            <motion.div
                                                key={activeFeature}
                                                initial={{ opacity: 0, scale: 1.05 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 1.05 }}
                                                transition={{ duration: 0.5, ease: "easeInOut" }}
                                                className="absolute inset-0"
                                            >
                                                <Image
                                                    src={features[activeFeature as keyof typeof features].image!.imageUrl}
                                                    alt={features[activeFeature as keyof typeof features].image!.description}
                                                    fill
                                                    objectFit="cover"
                                                    className="rounded-xl"
                                                    priority
                                                />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stats Section */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard icon={Zap} value="0" label="Lines of Code Needed" />
                        <StatCard icon={Layers} value="6+" label="Missing Value Methods" />
                        <StatCard icon={Target} value="8" label="Transform Functions" />
                        <StatCard icon={Timer} value="<1 min" label="Upload to Clean Export" />
                    </div>

                    {/* Pain Points / Before-After Section */}
                    <div>
                        <h2 className="text-2xl font-bold text-center mb-8">
                            Why Data Editor?
                        </h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            <BeforeAfterCard 
                                icon={AlertTriangle}
                                title="Missing Values"
                                beforeItems={[
                                    "Manually searching for empty cells",
                                    "Writing formulas for each column",
                                    "Inconsistent fill methods"
                                ]}
                                afterItems={[
                                    "Auto-detected and highlighted",
                                    "One-click mean/median/mode fill",
                                    "Forward/backward fill for time series"
                                ]}
                            />
                            <BeforeAfterCard 
                                icon={TrendingUp}
                                title="Data Transformation"
                                beforeItems={[
                                    "Complex Excel formulas",
                                    "Manual normalization calculations",
                                    "Risk of formula errors"
                                ]}
                                afterItems={[
                                    "Select columns, pick transform, done",
                                    "Z-score & Min-Max in one click",
                                    "Preview before applying"
                                ]}
                            />
                            <BeforeAfterCard 
                                icon={Eye}
                                title="Data Quality"
                                beforeItems={[
                                    "Scrolling through thousands of rows",
                                    "No overview of data health",
                                    "Hidden data type issues"
                                ]}
                                afterItems={[
                                    "Instant column statistics",
                                    "Missing value count at a glance",
                                    "Auto data type detection"
                                ]}
                            />
                            <BeforeAfterCard 
                                icon={Timer}
                                title="Workflow Speed"
                                beforeItems={[
                                    "Switching between tools constantly",
                                    "Copy-paste between Excel and Python",
                                    "Hours of manual work per dataset"
                                ]}
                                afterItems={[
                                    "All-in-one visual interface",
                                    "No coding, no context switching",
                                    "Minutes from raw to clean"
                                ]}
                            />
                        </div>
                    </div>

                    {/* Workflow Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl text-center">How It Works</CardTitle>
                            <CardDescription className="text-center">
                                Four simple steps to analysis-ready data
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="max-w-2xl mx-auto">
                            <WorkflowStep 
                                step={1}
                                icon={FileUp}
                                title="Upload Your Data"
                                description="Drag & drop your CSV file or load sample data to get started instantly. Your data appears in an editable spreadsheet view."
                            />
                            <WorkflowStep 
                                step={2}
                                icon={Eye}
                                title="Review Data Quality"
                                description="Toggle statistics view to see missing values, data types, ranges, and means for each column. Problem areas are highlighted automatically."
                            />
                            <WorkflowStep 
                                step={3}
                                icon={Wand2}
                                title="Clean & Transform"
                                description="Select columns, choose your operation—fill missing values, normalize, or transform—and apply with one click. Undo anytime."
                            />
                            <WorkflowStep 
                                step={4}
                                icon={Download}
                                title="Export & Analyze"
                                description="Download your cleaned dataset as CSV, ready for statistical analysis, machine learning, or visualization."
                                isLast
                            />
                        </CardContent>
                    </Card>

                    {/* Capabilities Cloud */}
                    <div className="text-center">
                        <h2 className="text-2xl font-bold mb-6">Everything You Need for Data Preparation</h2>
                        <div className="flex flex-wrap justify-center gap-3">
                            <CapabilityPill icon={Sparkles} label="Mean/Median/Mode Fill" />
                            <CapabilityPill icon={ArrowRight} label="Forward & Backward Fill" />
                            <CapabilityPill icon={TrendingUp} label="Log Transform" />
                            <CapabilityPill icon={Target} label="Z-Score Normalization" />
                            <CapabilityPill icon={Layers} label="Min-Max Scaling" />
                            <CapabilityPill icon={MousePointer} label="Inline Cell Editing" />
                            <CapabilityPill icon={Database} label="Add/Remove Rows" />
                            <CapabilityPill icon={Layers} label="Add/Remove Columns" />
                            <CapabilityPill icon={Eye} label="Live Column Statistics" />
                            <CapabilityPill icon={AlertTriangle} label="Missing Value Highlight" />
                            <CapabilityPill icon={Zap} label="Auto Type Detection" />
                            <CapabilityPill icon={Download} label="One-Click CSV Export" />
                        </div>
                    </div>

                    {/* CTA Section */}
                    <Card className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/20">
                        <CardContent className="text-center py-12">
                            <h2 className="text-2xl font-bold mb-3">Ready to Clean Your Data?</h2>
                            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                                Transform messy datasets into analysis-ready data in minutes.
                            </p>
                            <Button size="lg" className="gap-2">
                                <Sparkles className="w-4 h-4" />
                                Get Started
                            </Button>
                        </CardContent>
                    </Card>
                    
                </div>
            </main>
        </div>
    );
}

