import { BookOpen, BrainCircuit, ClipboardList, UserCircle, CreditCard, Wrench, MessageSquare, LucideIcon } from 'lucide-react';

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
        icon: BookOpen,
        title: "Getting Started",
        description: "Everything you need to know to get started with our platform.",
        articles: [
            { 
                slug: "how-statistica-works",
                title: "How does Standard Analysis work?", 
                description: "An overview of the analysis process from data upload to insight generation."
            },
        ]
    },
    {
        slug: "standard-analysis",
        icon: BrainCircuit,
        title: "Standard Analysis",
        description: "A guide to using the Standard Analysis tool.",
        articles: [
            { 
                slug: "overview",
                title: "Overview", 
                description: "An overview of the Standard Analysis environment."
            },
            { 
                slug: "analysis-recommendation",
                title: "Recommendation", 
                description: "How to use the analysis recommendation feature."
            },
            { 
                slug: "data-preparation",
                title: "Data Preparation", 
                description: "Preparing your data for analysis."
            },
            { 
                slug: "running-an-analysis",
                title: "Standard Analysis", 
                description: "Running various statistical analyses."
            },
            { 
                slug: "understanding-results",
                title: "Results", 
                description: "Understanding and interpreting your analysis results."
            },
            { 
                slug: "example-based-analysis",
                title: "Examples", 
                description: "Walkthroughs using example datasets."
            },
            { 
                slug: "exporting-and-sharing",
                title: "Export & Sharing", 
                description: "How to export and share your findings."
            },
            { 
                slug: "troubleshooting-faq",
                title: "Help & FAQ", 
                description: "Frequently asked questions about Standard Analysis."
            },
        ]
    },
    {
        slug: "survey-features",
        icon: ClipboardList,
        title: "Survey & Features",
        description: "Details on question types, advanced analysis, and survey distribution.",
        articles: [
            { 
                slug: "setup-conjoint-analysis",
                title: "How to set up a Conjoint Analysis survey", 
                description: "A step-by-step guide to creating attributes and levels for CBC."
            },
        ]
    },
    {
        slug: "account",
        icon: UserCircle,
        title: "Account",
        description: "Settings, security, and profile management.",
        articles: [
            { 
                slug: "change-password",
                title: "How do I change my password?", 
                description: "A guide to updating your account security settings."
            },
        ]
    },
    {
        slug: "plans-billing",
        icon: CreditCard,
        title: "Plans & Billing",
        description: "Pricing, invoices, payment options, and refunds.",
        articles: [
            { 
                slug: "plan-differences",
                title: "What is the difference between Free and Pro plans?", 
                description: "A detailed comparison of features available in each plan."
            },
        ]
    },
    {
        slug: "technical-issues",
        icon: Wrench,
        title: "Technical Issues",
        description: "Troubleshooting, error messages, and performance tips.",
        articles: [
            { 
                slug: "results-not-showing",
                title: "Why are my analysis results not showing?", 
                description: "Common reasons for analysis failures and how to fix them."
            },
        ]
    },
    {
        slug: "contact-support",
        icon: MessageSquare,
        title: "Contact Support",
        description: "Get help from our support team and provide feedback.",
        articles: [
            { 
                slug: "how-to-contact-support",
                title: "How to contact the support team", 
                description: "The best ways to get in touch for quick assistance."
            },
        ]
    },
];
