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
                content: `
### What is Standard Analysis?

**Standard Analysis** is your primary workspace for conducting a wide range of statistical analyses. It's designed to guide you from raw data to insightful conclusions without writing any code. Whether you're comparing groups, exploring relationships, or building predictive models, this is your starting point.

### When to Use Standard Analysis

Use this tool when you have a structured dataset (like a CSV or Excel file) and a specific research question in mind. It's ideal for:

*   **Academic Research:** Testing hypotheses and analyzing experimental data.
*   **Business Intelligence:** Understanding customer behavior, market trends, and operational efficiency.
*   **Data Exploration:** Quickly running multiple analyses to uncover patterns in your data.

### Overall Analysis Flow

The environment is designed around a simple, step-by-step process:

1.  **Data Upload:** Start by uploading your dataset.
2.  **Data Recognition:** The tool automatically identifies variable types (numeric, categorical).
3.  **Analysis Selection:** Choose from over 40+ statistical methods.
4.  **Variable Configuration:** Assign variables from your dataset to roles in the analysis (e.g., dependent, independent).
5.  **Run & Review:** Execute the analysis and review the results, complete with tables, charts, and AI-powered interpretations.

### Quick Start with Sample Data

Not sure where to begin? Click the **Load Example Data** button on the data upload screen. This will populate the tool with a sample dataset and pre-select a relevant analysis, allowing you to see the entire workflow in action instantly.
                `
            },
            { 
                slug: "recommendation",
                title: "Recommendation", 
                description: "How to use the analysis recommendation feature.",
                content: `
### Using the Recommendation Feature

If you're unsure which statistical test is right for your data, the **Recommendation** feature can help. It uses AI to suggest the most appropriate analyses based on your data's structure and your research goals.

### How It Works

1.  **Upload Data:** The recommendation engine first needs to understand your data. Upload your dataset in the **Data Preparation** step.
2.  **Describe Your Goal (Optional but Recommended):** Briefly describe what you want to find out. For example: *"I want to see if my marketing campaign increased sales."* or *"What factors predict customer churn?"*
3.  **Get Recommendations:** The AI will analyze your variables (numeric, categorical) and your stated goal to provide a list of 3-5 suitable statistical tests.

### Interpreting Recommendations

Each recommendation includes:

*   **Analysis Name:** The name of the test (e.g., "Independent Samples T-Test").
*   **Simple Rationale:** A clear, non-technical explanation of *why* the test is suitable, often with an analogy.
*   **Required Variables:** The types and names of variables from your dataset needed for the analysis.

This feature helps bridge the gap between having data and knowing how to analyze it correctly.
                `
            },
            { 
                slug: "data-preparation",
                title: "Data Preparation", 
                description: "Preparing your data for analysis.",
                content: `
### Data Preparation is Key

Good analysis starts with good data. The **Data Preparation** section allows you to upload, view, and clean your dataset before analysis.

### Uploading Data

*   You can upload data from **CSV, TSV, and Excel (.xlsx, .xls)** files.
*   Drag and drop your file onto the designated area or click to browse.
*   The system automatically detects headers and data types.

### Data Preview

Once uploaded, you'll see a preview of your dataset, including:

*   **File Name and Dimensions:** See the name of your file, number of rows, and number of columns.
*   **Variable Summary:** A quick count of numeric and categorical variables detected.
*   **Data Table:** A scrollable view of the first 100 rows of your data.

### Basic Cleaning

From the data preview screen, you can perform basic cleaning operations like clearing the dataset to start over. For more advanced cleaning, use the **DataPrep** tool from the main dashboard.
                `
            },
            { 
                slug: "standard-analysis-running",
                title: "Standard Analysis", 
                description: "Running various statistical analyses.",
                content: `
### Running Your Analysis

This is the core of the Standard Analysis tool.

### 1. Select an Analysis

Use the sidebar menu to navigate through categories and select a specific statistical test. Analyses are grouped logically (e.g., Comparison, Relationship, Predictive) to help you find the right one.

### 2. Configure Variables

Once you select an analysis, a configuration panel will appear. Here you will:

*   **Assign Variables:** Drag and drop variables from your dataset into the required roles (e.g., Dependent Variable, Independent Variable(s), Grouping Variable).
*   **Set Parameters:** Adjust analysis-specific settings, such as the confidence level for a t-test or the number of factors for an EFA.

The tool will validate your selections in real-time, providing feedback if a variable type is unsuitable for a specific role.

### 3. Execute and View Results

Click the **"Run Analysis"** button to execute the test. The results, including statistical tables, charts, and an AI-generated interpretation, will appear in the main content area.
                `
            },
            { 
                slug: "results",
                title: "Results", 
                description: "Understanding and interpreting your analysis results.",
                content: `
### Understanding Your Results

After running an analysis, the results are presented in a structured and easy-to-digest format.

### Key Components of the Results Page:

*   **Summary Cards:** At the top, you'll find key metrics and the main conclusion of the analysis (e.g., "Statistically Significant" or "Not Significant").
*   **Visualizations:** Interactive charts and graphs are provided to help you visually understand the data and relationships.
*   **Statistical Tables:** Detailed tables from the analysis (e.g., ANOVA table, coefficient tables) are presented clearly.
*   **AI-Powered Report:** A narrative summary and interpretation of the findings, written in plain language and following APA style for statistical reporting.

### Interactive Elements

Many charts are interactive. You can hover over data points for more details, zoom in on specific areas, and toggle series on and off through the legend. This allows for deeper exploration of your results.
                `
            },
            { 
                slug: "examples",
                title: "Examples", 
                description: "Walkthroughs using example datasets.",
                content: `
### Learning with Examples

The best way to learn is by doing. The Standard Analysis tool includes a variety of pre-loaded example datasets to help you get started quickly.

### How to Load an Example

1.  From the **Data Preparation** screen, click the **"Load Example Data"** button.
2.  A list of available datasets will appear, each with a name, description, and an icon representing its typical use case (e.g., "A/B Test Data", "Customer Segments").
3.  Clicking on a dataset will instantly load it into the tool and automatically select a recommended analysis for that data.

This allows you to see a complete, end-to-end analysis workflow and explore how different statistical tests are applied to different types of data.
                `
            },
            { 
                slug: "export-sharing",
                title: "Export & Sharing", 
                description: "How to export and share your findings.",
                content: `
### Exporting Your Work

You can easily export your results for use in reports, presentations, or publications.

### Available Export Options:

*   **PNG Image:** From the main results page, click the **Download PNG** button to save a high-resolution image of the entire report, including charts and tables. This is perfect for dropping into a slide deck.
*   **CSV Data:** From the **Data Preparation** view, you can download the currently loaded (and potentially cleaned) dataset as a CSV file.
*   **AI Report as TXT:** When you generate an AI summary report, you can download its content as a plain text file for easy copying and pasting.

### Sharing with Your Team

To share your full analysis setup and results with colleagues, you can save the analysis state (coming soon) or use the export features to share the outputs.
                `
            },
            { 
                slug: "help-faq",
                title: "Help & FAQ", 
                description: "Frequently asked questions about Standard Analysis.",
                content: `
### Frequently Asked Questions

**Q: Why are some analysis options disabled?**

A: An analysis will be disabled if your currently loaded dataset does not meet its minimum requirements. For example, a T-Test requires at least one numeric variable and one categorical variable with two groups. Hover over a disabled analysis to see what's needed.

**Q: My analysis failed. What should I do?**

A: Failures are most often caused by data issues. Check for:
*   **Missing Values:** Ensure the columns you're analyzing don't have too many empty cells.
*   **Incorrect Variable Types:** A variable with text in it cannot be used in a numeric-only role.
*   **Insufficient Data:** Some tests require a minimum number of data points per group.

**Q: How do I interpret the p-value?**

A: The p-value helps you determine the statistical significance of your results. A common threshold is 0.05.
*   **p < 0.05:** The result is statistically significant. You can reject the null hypothesis. This means the observed effect is unlikely to be due to random chance.
*   **p ≥ 0.05:** The result is not statistically significant. You fail to reject the null hypothesis. This means the observed effect could be due to random chance.
                `
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
