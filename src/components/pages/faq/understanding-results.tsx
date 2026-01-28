'use client';

export default function UnderstandingResultsPage() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
        <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">Results</h1>
        <p className="text-lg text-muted-foreground mb-8">Understanding and interpreting your analysis results.</p>
        
        <h3 id="understanding-your-results" className="text-xl font-semibold mt-6 mb-3 scroll-mt-20">Understanding Your Results</h3>
        <p>After running an analysis, the results are presented in a structured and easy-to-digest format.</p>

        <h3 id="key-components" className="text-xl font-semibold mt-6 mb-3 scroll-mt-20">Key Components of the Results Page:</h3>
        <ul>
            <li><strong>Summary Cards:</strong> At the top, you'll find key metrics and the main conclusion of the analysis (e.g., "Statistically Significant" or "Not Significant").</li>
            <li><strong>Visualizations:</strong> Interactive charts and graphs are provided to help you visually understand the data and relationships.</li>
            <li><strong>Statistical Tables:</strong> Detailed tables from the analysis (e.g., ANOVA table, coefficient tables) are presented clearly.</li>
            <li><strong>AI-Powered Report:</strong> A narrative summary and interpretation of the findings, written in plain language and following APA style for statistical reporting.</li>
        </ul>

        <h3 id="interactive-elements" className="text-xl font-semibold mt-6 mb-3 scroll-mt-20">Interactive Elements</h3>
        <p>Many charts are interactive. You can hover over data points for more details, zoom in on specific areas, and toggle series on and off through the legend. This allows for deeper exploration of your results.</p>
    </article>
  );
}
