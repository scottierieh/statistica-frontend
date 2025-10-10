
'use client';

import React, { useState } from 'react';
import { Check, Info, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';


const PricingSection: React.FC = () => {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

    const plans = {
        survey: {
            monthly: { price: 49, id: 'price_survey_monthly' },
            yearly: { price: 490, id: 'price_survey_yearly' },
            features: [
                'Unlimited Surveys',
                'Unlimited Questions',
                'Advanced Question Types (Conjoint, AHP)',
                'Customizable Themes',
                'Response Analytics Dashboard',
                'Data Export (CSV, Excel)',
            ],
            title: "Survey Pro",
            description: "Advanced tools for insightful feedback."
        },
        statistica: {
            monthly: { price: 49, id: 'price_statistica_monthly' },
            yearly: { price: 490, id: 'price_statistica_yearly' },
            features: [
                'All Statistical Analyses (40+)',
                'Advanced Data Visualizations',
                'AI-Powered Insights & Reports',
                'No Watermarks on Exports',
                'High-Performance Python Backend',
                'Load Custom Datasets',
            ],
            title: "Statistica Pro",
            description: "Unlock the full power of your data."
        },
        bundle: {
            monthly: { price: 79, id: 'price_bundle_monthly' },
            yearly: { price: 790, id: 'price_bundle_yearly' },
            features: [
                'Includes everything in Survey Pro',
                'Includes everything in Statistica Pro',
                'Seamless Integration Between Tools',
                'Priority Support',
                'Early Access to New Features',
                'Best Value'
            ],
            title: "Full Access Bundle",
            description: "The complete toolkit for experts."
        }
    };

    return (
        <section className="py-12 md:py-20 lg:py-24 bg-gradient-to-b from-slate-50 to-white">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">Find the Right Plan for You</h1>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                        Start for free, then upgrade to unlock powerful features for professional-grade analysis and surveying.
                    </p>
                </div>

                <div className="flex items-center justify-center space-x-4 mb-10">
                    <Label htmlFor="billing-cycle" className={cn(billingCycle === 'monthly' ? 'text-primary' : 'text-muted-foreground')}>
                        Monthly
                    </Label>
                    <Switch
                        id="billing-cycle"
                        checked={billingCycle === 'yearly'}
                        onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
                    />
                    <Label htmlFor="billing-cycle" className={cn(billingCycle === 'yearly' ? 'text-primary' : 'text-muted-foreground')}>
                        Yearly <span className="text-green-500 font-semibold">(Save 20%)</span>
                    </Label>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                    {Object.entries(plans).map(([key, plan]) => {
                        const price = billingCycle === 'yearly' ? plan.yearly.price : plan.monthly.price;
                        const period = billingCycle === 'yearly' ? '/year' : '/month';
                        const isBundle = key === 'bundle';
                        
                        return (
                            <Card key={key} className={cn("flex flex-col shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300", isBundle && "border-2 border-primary ring-4 ring-primary/10")}>
                                {isBundle && <div className="absolute top-0 right-4 -mt-3 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">BEST VALUE</div>}
                                <CardHeader className="text-center pb-4">
                                    <CardTitle className="text-2xl font-bold mb-2">{plan.title}</CardTitle>
                                    <CardDescription>{plan.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 flex flex-col justify-between">
                                    <div className="text-center mb-8">
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={billingCycle}
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 10 }}
                                                transition={{ duration: 0.2 }}
                                                className="flex justify-center items-baseline"
                                            >
                                                <span className="text-4xl font-extrabold tracking-tight">${price}</span>
                                                <span className="ml-1 text-xl font-medium text-muted-foreground">{period}</span>
                                            </motion.div>
                                        </AnimatePresence>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold mb-4 text-center">What's Included:</h3>
                                        <ul className="space-y-3 text-sm text-gray-700">
                                            {plan.features.map((feature, i) => (
                                                 <li key={i} className="flex items-start">
                                                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </CardContent>
                                <CardFooter className="mt-8">
                                    <Button className={cn("w-full text-lg py-6", isBundle && "bg-primary hover:bg-primary/90")}>
                                        Get Started
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        )
                    })}
                </div>
            </div>
        </section>
    );
};

export default PricingSection;
