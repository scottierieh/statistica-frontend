
import { BookOpen, BrainCircuit, ClipboardList, UserCircle, CreditCard, Wrench, MessageSquare, LucideIcon } from 'lucide-react';

export interface FaqArticle {
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
            { title: "How does Statistica work?", description: "An overview of the analysis process from data upload to insight generation." },
            { title: "Uploading your first dataset", description: "Step-by-step guide to formatting and uploading your CSV or Excel files." },
            { title: "Creating your first survey", description: "Learn how to use the survey builder and add different question types." },
            { title: "Understanding the dashboard", description: "A tour of the main dashboard and where to find key features." },
        ]
    },
    {
        slug: "statistical-analysis",
        icon: BrainCircuit,
        title: "Statistical Analysis",
        description: "Interpreting results, choosing tests, and understanding assumptions.",
         articles: [
            { title: "Which statistical test should I use?", description: "A guide to selecting the appropriate analysis based on your data and research question." },
            { title: "Interpreting p-values and confidence intervals", description: "Understanding the key metrics of statistical significance." },
            { title: "Assumptions of linear regression", description: "Learn about the requirements for running a valid regression analysis." },
            { title: "What is Cronbach's Alpha?", description: "Understanding how to measure the reliability of your survey scale." },
        ]
    },
    {
        slug: "survey-features",
        icon: ClipboardList,
        title: "Survey & Features",
        description: "Details on question types, advanced analysis, and survey distribution.",
        articles: [
            { title: "How to set up a Conjoint Analysis survey", description: "A step-by-step guide to creating attributes and levels for CBC." },
            { title: "Using skip logic and branching", description: "Learn how to create dynamic surveys that adapt to user responses." },
            { title: "Distributing your survey via link or email", description: "Best practices for getting your survey in front of your audience." },
        ]
    },
    {
        slug: "account",
        icon: UserCircle,
        title: "Account",
        description: "Settings, security, and profile management.",
        articles: [
            { title: "How do I change my password?", description: "A guide to updating your account security settings." },
            { title: "Updating your email address", description: "Keep your contact information up to date." },
            { title: "Where can I find my API key?", description: "Instructions for developers on accessing API credentials." },
        ]
    },
    {
        slug: "plans-billing",
        icon: CreditCard,
        title: "Plans & Billing",
        description: "Pricing, invoices, payment options, and refunds.",
        articles: [
            { title: "What is the difference between Free and Pro plans?", description: "A detailed comparison of features available in each plan." },
            { title: "How to upgrade or downgrade your plan", description: "Managing your subscription level to fit your needs." },
            { title: "Where can I find my invoices?", description: "Accessing and downloading your billing history." },
        ]
    },
    {
        slug: "technical-issues",
        icon: Wrench,
        title: "Technical Issues",
        description: "Troubleshooting, error messages, and performance tips.",
        articles: [
            { title: "Why are my analysis results not showing?", description: "Common reasons for analysis failures and how to fix them." },
            { title: "The page is loading slowly, what can I do?", description: "Tips for improving application performance, especially with large datasets." },
            { title: "I'm seeing an 'Assumption Not Met' warning", description: "What this means and which alternative tests you can use." },
        ]
    },
    {
        slug: "contact-support",
        icon: MessageSquare,
        title: "Contact Support",
        description: "Get help from our support team and provide feedback.",
        articles: [
            { title: "How to contact the support team", description: "The best ways to get in touch for quick assistance." },
            { title: "Reporting a bug or issue", description: "How to provide details that help us solve your problem faster." },
            { title: "Suggesting a new feature", description: "We love hearing your ideas! Here's how to submit them." },
        ]
    },
];
