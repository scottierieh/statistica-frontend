import { BookOpen, BrainCircuit, ClipboardList, UserCircle, CreditCard, Wrench, MessageSquare, LucideIcon } from 'lucide-react';

export interface FaqArticle {
    slug: string;
    title: string;
    description: string;
    content: string;
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
                title: "How does Statistica work?", 
                description: "An overview of the analysis process from data upload to insight generation.",
                content: `
This comprehensive guide will help you get started with Statistica. We recommend you take the following steps as a priority, as these will unlock further features and functionality for you and your team to get the most out of Statistica.

### We've broken it up into sections:

1.  **Uploading Your Data:** Learn how to prepare and upload your datasets in CSV or Excel format.
2.  **Selecting an Analysis:** Browse over 40+ statistical methods and choose the one that fits your research question.
3.  **Configuring Parameters:** Set up your analysis by selecting variables and configuring model settings.
4.  **Interpreting Results:** Understand the output, including statistical tables, charts, and AI-powered interpretations.
5.  **Exporting and Sharing:** Download your results as reports, images, or raw data to share with your team.
                `
            },
            { 
                slug: "uploading-first-dataset",
                title: "Uploading your first dataset", 
                description: "Step-by-step guide to formatting and uploading your CSV or Excel files.",
                content: "Detailed content about uploading datasets goes here."
            },
            { 
                slug: "creating-first-survey",
                title: "Creating your first survey", 
                description: "Learn how to use the survey builder and add different question types.",
                content: "Detailed content about creating surveys goes here."
            },
            { 
                slug: "understanding-the-dashboard",
                title: "Understanding the dashboard", 
                description: "A tour of the main dashboard and where to find key features.",
                content: "Detailed content about the dashboard goes here."
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
                description: "An overview of the Standard Analysis environment.",
                content: "Content for Overview goes here."
            },
            { 
                slug: "recommendation",
                title: "Recommendation", 
                description: "How to use the analysis recommendation feature.",
                content: "Content for Recommendation goes here."
            },
            { 
                slug: "data-preparation",
                title: "Data Preparation", 
                description: "Preparing your data for analysis.",
                content: "Content for Data Preparation goes here."
            },
            { 
                slug: "standard-analysis-running",
                title: "Standard Analysis", 
                description: "Running various statistical analyses.",
                content: "Content for Standard Analysis goes here."
            },
            { 
                slug: "results",
                title: "Results", 
                description: "Understanding and interpreting your analysis results.",
                content: "Content for Results goes here."
            },
            { 
                slug: "examples",
                title: "Examples", 
                description: "Walkthroughs using example datasets.",
                content: "Content for Examples goes here."
            },
            { 
                slug: "export-sharing",
                title: "Export & Sharing", 
                description: "How to export and share your findings.",
                content: "Content for Export & Sharing goes here."
            },
            { 
                slug: "help-faq",
                title: "Help & FAQ", 
                description: "Frequently asked questions about Standard Analysis.",
                content: "Content for Help & FAQ goes here."
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
                description: "A step-by-step guide to creating attributes and levels for CBC.",
                content: "Detailed guide on setting up Conjoint Analysis goes here."
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
                description: "A guide to updating your account security settings.",
                content: "Step-by-step instructions for changing your password go here."
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
                description: "A detailed comparison of features available in each plan.",
                content: "A detailed feature comparison table goes here."
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
                description: "Common reasons for analysis failures and how to fix them.",
                content: "Troubleshooting steps for when analysis results fail to appear."
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
                description: "The best ways to get in touch for quick assistance.",
                content: "Information on how to reach our support team via email, chat, or phone."
            },
        ]
    },
];
