'use client';

import { 
    BookOpen, Rocket, LayoutDashboard, Wrench, Sigma, Target, Network, Lightbulb, HelpCircle, LucideIcon, Settings, CreditCard, Users 
} from 'lucide-react';

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
        slug: "getting-started",
        icon: Rocket,
        title: "Getting Started",
        description: "An introduction to the platform, from creating an account to understanding the core workflow.",
        articles: [
            { slug: "platform-overview", title: "Platform Overview", description: "A high-level look at what our platform does." },
            { slug: "sign-up", title: "Sign Up & Login", description: "Creating and accessing your account." },
        ]
    },
    {
        slug: "data-preparation",
        icon: Wrench,
        title: "DataPrep",
        description: "Cleaning and preparing your data for analysis.",
        articles: [
            { slug: "data-prep-overview", title: "DataPrep Overview", description: "An introduction to the Data Preparation tool." },
            { slug: "data-prep-loading", title: "Loading Data", description: "How to upload and import your datasets." },
            { slug: "data-prep-editing", title: "Editing Data", description: "Manipulating rows, columns, and cells." },
            { slug: "data-prep-cleaning", title: "Cleaning Data", description: "Handling duplicates and missing values." },
            { slug: "data-prep-transforming", title: "Transforming Data", description: "Applying normalization, encoding, and functions." },
            { slug: "data-prep-merging-export", title: "Merging & Export", description: "Combining datasets and exporting results." },
            { slug: "data-prep-tips", title: "Tips & Shortcuts", description: "Work faster with keyboard shortcuts and tips." }
        ]
    },
    {
        slug: "statistical-analysis",
        icon: Sigma,
        title: "Standard Analysis",
        description: "Learn how to use the Standard Analysis tool from start to finish.",
        articles: [
            { slug: "overview", title: "Overview", description: "What is Standard Analysis and when should you use it?" },
            { slug: "analysis-categories", title: "Analysis Categories", description: "Browse the different types of available analyses." },
            { slug: "analysis-recommendation", title: "AI Analysis Recommendation", description: "Get AI-powered suggestions for which analysis to run." },
            { slug: "data-preparation", title: "Data Requirements", description: "How to upload and prepare your data for analysis." },
            { slug: "running-an-analysis", title: "Running an Analysis", description: "A step-by-step guide to configuring and executing analyses." },
            { slug: "understanding-results", title: "Understanding Results", description: "How to interpret the three layers of results: Summary, Reasoning, and Statistics." },
            { slug: "exporting-and-sharing", title: "Export & Sharing", description: "How to download and share your findings in different formats." },
            { slug: "guide-terminology", title: "Glossary & Terminology", description: "Using built-in analysis guides and statistical term definitions." },
        ]
    },
    {
        slug: "strategic-decision-analysis",
        icon: Target,
        title: "Strategic Decision Analysis",
        description: "Leverage optimization and simulation to make data-driven strategic decisions.",
        articles: [
            { slug: "strategic-overview", title: "Overview", description: "What is Strategic Decision-Making and how does it work?" },
            { slug: "use-cases-by-domain", title: "Domains & Use Cases", description: "Examples in logistics, finance, marketing, and operations." },
            { slug: "strategic-data-requirements", title: "Data Requirements", description: "How to structure your data for optimization problems." },
            { slug: "optimization-methods", title: "Running an Analysis", description: "Understanding LP, IP, NLP, and metaheuristics." },
            { slug: "interpreting-solutions", title: "Understanding Results", description: "How to read optimal solutions and sensitivity reports." },
            { slug: "strategic-best-practices", title: "Best Practices", description: "Tips for formulating and solving decision problems." }
        ]
    },
    {
        slug: "sem",
        icon: Network,
        title: "Structural Equation Modeling",
        description: "Model complex, multi-variable relationships.",
        articles: [
            { slug: "sem-overview", title: "Overview", description: "What is SEM and when to use it." },
            { slug: "path-diagram-upload", title: "Path Diagram Upload", description: "Generating a model from a visual diagram." },
            { slug: "model-estimation", title: "Model Estimation", description: "Understanding estimators like ML, GLS, and WLS." },
            { slug: "sem-result-interpretation", title: "Result Interpretation", description: "Making sense of fit indices and path coefficients." },
            { slug: "sem-model-diagnostics", title: "Model Diagnostics", description: "Checking for model fit and potential issues." }
        ]
    },
    {
        slug: "settings",
        icon: Settings,
        title: "Settings",
        description: "Manage your profile, security, and payment methods.",
        articles: [
            { slug: "profile-management", title: "Account Settings", description: "Updating your personal information." },
            { slug: "team-settings", title: "Team Settings", description: "Inviting and managing team members." },
            { slug: "payment-settings", title: "Payment Settings", description: "Manage billing details and payment methods." },
            { slug: "security-data-policy", title: "Security & Data Policy", description: "Managing your security settings and our data policy." }
        ]
    },
    {
        slug: "subscription-plans",
        icon: CreditCard,
        title: "Subscription & Plans",
        description: "Manage your subscription, change plans, and understand our policies.",
        articles: [
            { slug: "plan-features", title: "Plan Features", description: "Compare features across different subscription plans." },
            { slug: "change-plan", title: "Change Plan", description: "How to upgrade, downgrade, or cancel your plan." },
            { slug: "refund-policy", title: "Refund Policy", description: "Our policy on refunds and credits." }
        ]
    },
    {
        slug: "faq-and-troubleshooting",
        icon: HelpCircle,
        title: "FAQ & Troubleshooting",
        description: "Find solutions to common issues and answers to frequently asked questions.",
        articles: [
             { slug: "common-errors", title: "Analysis Errors", description: "Why your analysis might fail and how to fix it." },
             { slug: "data-issues", title: "Data Issues", description: "Resolving common data formatting and quality problems." },
             { slug: "billing-issues", title: "Billing Issues", description: "Understanding and managing your subscription." },
        ]
    }
];
