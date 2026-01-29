'use client';

import { BookOpen, BrainCircuit, ClipboardList, UserCircle, CreditCard, Wrench, MessageSquare, LucideIcon, Sigma } from 'lucide-react';

export interface FaqArticle {
    slug: string;
    title: string;
    description: string;
}

export interface FaqCategory {
    slug: string;
    icon: LucideIcon;
    title: string;
    description: string;
    articles: FaqArticle[];
}

export const faqData: FaqCategory[] = [
    {
        slug: "standard-analysis-guide",
        icon: BookOpen,
        title: "Standard Analysis Guide",
        description: "Learn how to use the Standard Analysis tool from start to finish.",
        articles: [
            { 
                slug: "overview",
                title: "Overview", 
                description: "What is Standard Analysis and when should you use it?"
            },
            { 
                slug: "analysis-recommendation",
                title: "Recommendation", 
                description: "Let AI suggest the best analysis for your data and goals."
            },
            { 
                slug: "data-preparation",
                title: "Data Preparation", 
                description: "How to upload and prepare your data for analysis."
            },
            { 
                slug: "running-an-analysis",
                title: "Running an Analysis", 
                description: "A step-by-step guide to configuring and executing analyses."
            },
            { 
                slug: "understanding-results",
                title: "Understanding Results", 
                description: "How to interpret the three layers of results: Summary, Reasoning, and Statistics."
            },
            { 
                slug: "exporting-and-sharing",
                title: "Export & Sharing", 
                description: "How to download and share your findings in different formats."
            },
            { 
                slug: "guide-terminology",
                title: "Guides & Terminology", 
                description: "Using built-in analysis guides and statistical term definitions."
            },
        ]
    },
    {
        slug: "strategic-decision-guide",
        icon: Sigma,
        title: "📊 Strategic Decision Guide",
        description: "Leverage optimization and simulation to make data-driven strategic decisions.",
        articles: [
            {
                slug: "strategic-overview",
                title: "Overview",
                description: "What is Strategic Decision-Making and how does it work?"
            },
            {
                slug: "use-cases-by-domain",
                title: "Use Cases by Domain",
                description: "Examples in logistics, finance, marketing, and operations."
            },
            {
                slug: "strategic-data-requirements",
                title: "Data Requirements",
                description: "How to structure your data for optimization problems."
            },
            {
                slug: "optimization-methods",
                title: "Optimization Methods",
                description: "Understanding LP, IP, NLP, and metaheuristics."
            },
            {
                slug: "interpreting-solutions",
                title: "Interpreting Solutions",
                description: "How to read optimal solutions and sensitivity reports."
            },
            {
                slug: "strategic-best-practices",
                title: "Best Practices",
                description: "Tips for formulating and solving decision problems."
            }
        ]
    },
    {
        slug: "troubleshooting",
        icon: Wrench,
        title: "Troubleshooting & FAQ",
        description: "Find solutions to common issues and answers to frequently asked questions.",
        articles: [
             { 
                slug: "common-errors",
                title: "Common Analysis Errors", 
                description: "Why your analysis might fail and how to fix it."
            },
        ]
    }
];
