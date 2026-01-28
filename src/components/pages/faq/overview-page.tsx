'use client';

export default function OverviewPage() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
        <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">Overview</h1>
        <p className="text-lg text-muted-foreground mb-8">An overview of the Standard Analysis environment.</p>
        
        <h3 id="screen-layout" className="text-xl font-semibold mt-6 mb-3 scroll-mt-20">Screen Layout Overview</h3>
        <p>The Standard Analysis screen is divided into three main sections:</p>
        <ul>
            <li><strong>Left Sidebar:</strong> This is where you select your desired analysis from a categorized list.</li>
            <li><strong>Main Content Area:</strong> This is where you configure your analysis and view the results.</li>
            <li><strong>Data Preview Panel:</strong> Displays a summary and preview of your currently loaded dataset.</li>
        </ul>

        <h3 id="step-workflow" className="text-xl font-semibold mt-6 mb-3 scroll-mt-20">Step-Based Workflow</h3>
        <p>The process follows a logical flow from data to insight:</p>
        <ol>
            <li>Load your data.</li>
            <li>Choose an analysis from the sidebar.</li>
            <li>Configure the analysis settings in the main area.</li>
            <li>Run the analysis.</li>
            <li>Review the results and AI-powered report.</li>
        </ol>

        <h3 id="common-rules" className="text-xl font-semibold mt-6 mb-3 scroll-mt-20">Common Rules Across All Analyses</h3>
        <p>To ensure valid results, most analyses share common requirements:</p>
        <ul>
            <li><strong>Data Types:</strong> Statistical tests require specific types of variables (e.g., numeric, categorical). The tool will guide you by only allowing appropriate variables to be selected for each role.</li>
            <li><strong>Missing Data:</strong> Rows with missing values in the selected variables are automatically excluded from the analysis (listwise deletion).</li>
            <li><strong>Minimum Sample Size:</strong> Many tests require a minimum number of data points to be statistically valid. The tool will warn you if your dataset is too small.</li>
        </ul>
    </article>
  );
}
