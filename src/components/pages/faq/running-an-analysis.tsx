'use client';

export default function RunningAnalysisPage() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
        <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">Standard Analysis</h1>
        <p className="text-lg text-muted-foreground mb-8">Running various statistical analyses.</p>

        <h3 id="running-your-analysis" className="text-xl font-semibold mt-6 mb-3 scroll-mt-20">Running Your Analysis</h3>
        <p>This is the core of the Standard Analysis tool.</p>

        <h4 id="select-analysis" className="text-lg font-semibold mt-4 mb-2">1. Select an Analysis</h4>
        <p>Use the sidebar menu to navigate through categories and select a specific statistical test. Analyses are grouped logically (e.g., Comparison, Relationship, Predictive) to help you find the right one.</p>

        <h4 id="configure-variables" className="text-lg font-semibold mt-4 mb-2">2. Configure Variables</h4>
        <p>Once you select an analysis, a configuration panel will appear. Here you will:</p>
        <ul>
            <li><strong>Assign Variables:</strong> Drag and drop variables from your dataset into the required roles (e.g., Dependent Variable, Independent Variable(s), Grouping Variable).</li>
            <li><strong>Set Parameters:</strong> Adjust analysis-specific settings, such as the confidence level for a t-test or the number of factors for an EFA.</li>
        </ul>
        <p>The tool will validate your selections in real-time, providing feedback if a variable type is unsuitable for a specific role.</p>

        <h4 id="execute-and-view" className="text-lg font-semibold mt-4 mb-2">3. Execute and View Results</h4>
        <p>Click the <strong>"Run Analysis"</strong> button to execute the test. The results, including statistical tables, charts, and an AI-generated interpretation, will appear in the main content area.</p>
    </article>
  );
}
