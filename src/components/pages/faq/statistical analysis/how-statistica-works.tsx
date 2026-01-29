'use client';

import FaqArticleLayout, { type Section } from '@/components/faq/FaqArticleLayout';

const SECTIONS: Section[] = [
    { id: 'what-is-standard-analysis', label: "What is Standard Analysis?", level: 2 },
    { id: 'when-to-use', label: "When to Use Standard Analysis", level: 2 },
    { id: 'overall-flow', label: "Overall Analysis Flow", level: 2 },
    { id: 'quick-start', label: "Quick Start with Sample Data", level: 2 },
];

export default function HowStatisticaWorksPage() {
  return (
    <FaqArticleLayout tocItems={SECTIONS}>
        <article className="prose prose-slate dark:prose-invert max-w-none">
            <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">How does Standard Analysis work?</h1>
            <p className="text-lg text-muted-foreground mb-8">An overview of the analysis process from data upload to insight generation.</p>
            
            <h2 id="what-is-standard-analysis" className="text-2xl font-semibold mt-8 mb-4 scroll-mt-20">What is Standard Analysis?</h2>
            <p><strong>Standard Analysis</strong> is your primary workspace for conducting a wide range of statistical analyses. It's designed to guide you from raw data to insightful conclusions without writing any code. Whether you're comparing groups, exploring relationships, or building predictive models, this is your starting point.</p>

            <h2 id="when-to-use" className="text-2xl font-semibold mt-8 mb-4 scroll-mt-20">When to Use Standard Analysis</h2>
            <p>Use this tool when you have a structured dataset (like a CSV or Excel file) and a specific research question in mind. It's ideal for:</p>
            <ul>
                <li><strong>Academic Research:</strong> Testing hypotheses and analyzing experimental data.</li>
                <li><strong>Business Intelligence:</strong> Understanding customer behavior, market trends, and operational efficiency.</li>
                <li><strong>Data Exploration:</strong> Quickly running multiple analyses to uncover patterns in your data.</li>
            </ul>

            <h2 id="overall-flow" className="text-2xl font-semibold mt-8 mb-4 scroll-mt-20">Overall Analysis Flow</h2>
            <p>The environment is designed around a simple, step-by-step process:</p>
            <ol>
                <li><strong>Data Upload:</strong> Start by uploading your dataset.</li>
                <li><strong>Data Recognition:</strong> The tool automatically identifies variable types (numeric, categorical).</li>
                <li><strong>Analysis Selection:</strong> Choose from over 40+ statistical methods.</li>
                <li><strong>Variable Configuration:</strong> Assign variables from your dataset to roles in the analysis (e.g., dependent, independent).</li>
                <li><strong>Run & Review:</strong> Execute the analysis and review the results, complete with tables, charts, and AI-powered interpretations.</li>
            </ol>
            
            <h2 id="quick-start" className="text-2xl font-semibold mt-8 mb-4 scroll-mt-20">Quick Start with Sample Data</h2>
            <p>Not sure where to begin? Click the <strong>Load Example Data</strong> button on the data upload screen. This will populate the tool with a sample dataset and pre-select a relevant analysis, allowing you to see the entire workflow in action instantly.</p>
        </article>
    </FaqArticleLayout>
  );
}
