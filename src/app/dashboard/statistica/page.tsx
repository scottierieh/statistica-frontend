'use client';

import { Button } from "@/components/ui/button";
import { ArrowLeft, Calculator, Compass, BrainCircuit, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import StatisticaApp from '@/components/statistica-app';
import DashboardClientLayout from "@/components/dashboard-client-layout";
import { UserNav } from "@/components/user-nav";
import { useState } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const EXPLORE_FEATURES = [
    'Descriptive Statistics',
    'Assumption Testing',
    'Group Comparison (T-Test, ANOVA)',
    'Correlation & Regression',
    'Econometrics (DID, PSM, RDD, IV)',
];

const MODEL_FEATURES = [
    'Classification (Random Forest, XGBoost, SVM)',
    'Clustering (K-Means, DBSCAN, GMM)',
    'Time Series (ARIMA, Forecasting)',
    'Factor Analysis (EFA, CFA, PCA)',
    'Path Analysis (Mediation, SEM)',
];

interface ModeCardProps {
    title: string;
    description: string;
    icon: React.ElementType;
    onClick: () => void;
    features: string[];
}

const ModeCard = ({ title, description, icon: Icon, onClick, features }: ModeCardProps) => {
    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    return (
        <motion.div
            variants={cardVariants}
            className="h-full"
            whileTap={{ scale: 0.98 }}
        >
            <div onClick={onClick} className="block h-full outline-none cursor-pointer">
                <Card className={cn(
                    "group relative flex h-full flex-col overflow-hidden rounded-xl border-border bg-card p-6 shadow-sm transition-all duration-300",
                    "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 hover:ring-1 hover:ring-primary/50"
                )}>
                    {/* Primary Gradient Hover Effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                    <div className="relative z-10 flex flex-1 flex-col items-start text-left">
                        {/* Icon Box */}
                        <div className={cn(
                            "mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border transition-all duration-300",
                            "border-primary/20 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110"
                        )}>
                            <Icon className="h-7 w-7" />
                        </div>

                        {/* Title Area */}
                        <div className="flex w-full items-center justify-between">
                            <CardTitle className="mb-2 text-xl font-bold tracking-tight text-foreground">
                                {title}
                            </CardTitle>
                            <ArrowUpRight className="h-5 w-5 text-muted-foreground opacity-0 transition-all duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-primary group-hover:opacity-100" />
                        </div>

                        <CardDescription className="text-sm leading-relaxed text-muted-foreground mb-4">
                            {description}
                        </CardDescription>

                        {/* Feature List */}
                        <ul className="space-y-1.5 mt-auto">
                            {features.map((feature, index) => (
                                <li key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <div className="h-1 w-1 rounded-full bg-primary/60" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </Card>
            </div>
        </motion.div>
    );
};

export default function StatisticaPage() {
    const [view, setView] = useState<'hub' | 'explore' | 'model'>('hub');

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.08 },
        },
    };

    if (view !== 'hub') {
        return (
            <DashboardClientLayout>
                <div className="flex flex-col min-h-screen bg-background">
                    <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-card">
                        <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={() => setView('hub')}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Selection
                            </Button>
                        </div>
                        <div className="flex-1 flex justify-center">
                            <Link href="/" className="flex items-center justify-center gap-2">
                                <Calculator className="h-6 w-6 text-primary" />
                                <h1 className="text-xl font-headline font-bold">Standard Analytics</h1>
                            </Link>
                        </div>
                        <div className="w-[180px] flex justify-end">
                            <UserNav />
                        </div>
                    </header>
                    <main className="flex-1 overflow-auto">
                        <div className="max-w-7xl mx-auto">
                            <StatisticaApp mode={view} />
                        </div>
                    </main>
                </div>
            </DashboardClientLayout>
        );
    }

    return (
        <DashboardClientLayout>
            <div className="flex flex-col min-h-screen bg-background">
                <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
                    <div className="w-full max-w-6xl mx-auto flex items-center">
                        <div className="flex-1 flex justify-start items-center gap-4">
                            <Button variant="outline" asChild>
                                <Link href="/dashboard">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Back to Dashboard
                                </Link>
                            </Button>
                        </div>
                        <Link href="/" className="flex items-center justify-center gap-2">
                            <Calculator className="h-6 w-6 text-primary" />
                            <h1 className="text-xl font-headline font-bold">Standard Analytics</h1>
                        </Link>
                        <div className="flex-1 flex justify-end items-center gap-4">
                            <UserNav />
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-6 md:p-10">
                    <div className="mx-auto max-w-4xl">
                        <motion.div initial="hidden" animate="visible" variants={containerVariants}>
                            <div className="mb-10 text-center">
                                <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                                    Choose Your Analysis Path
                                </h2>
                                <p className="mt-2 text-lg text-muted-foreground">
                                    Select a mode to begin your statistical analysis journey.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <ModeCard
                                    title="Explore"
                                    description="Data exploration and hypothesis testing for understanding your data's story."
                                    icon={Compass}
                                    onClick={() => setView('explore')}
                                    features={EXPLORE_FEATURES}
                                />
                                <ModeCard
                                    title="Model"
                                    description="Predictive modeling and advanced analytics for data-driven decisions."
                                    icon={BrainCircuit}
                                    onClick={() => setView('model')}
                                    features={MODEL_FEATURES}
                                />
                            </div>
                        </motion.div>
                    </div>
                </main>
            </div>
        </DashboardClientLayout>
    );
}
