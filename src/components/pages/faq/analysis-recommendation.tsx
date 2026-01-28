'use client';

export default function AnalysisRecommendationPage() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
        <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">Recommendation</h1>
        <p className="text-lg text-muted-foreground mb-8">How to use the analysis recommendation feature.</p>
        
        <h3 id="using-the-recommendation-feature" className="text-xl font-semibold mt-6 mb-3 scroll-mt-20">Using the Recommendation Feature</h3>
        <p>If you're unsure which statistical test is right for your data, the <strong>Recommendation</strong> feature can help. It uses AI to suggest the most appropriate analyses based on your data's structure and your research goals.</p>

        <h3 id="how-it-works" className="text-xl font-semibold mt-6 mb-3 scroll-mt-20">How It Works</h3>
        <ol>
            <li><strong>Upload Data:</strong> The recommendation engine first needs to understand your data. Upload your dataset in the <strong>Data Preparation</strong> step.</li>
            <li><strong>Describe Your Goal (Optional but Recommended):</strong> Briefly describe what you want to find out. For example: <em>"I want to see if my marketing campaign increased sales."</em> or <em>"What factors predict customer churn?"</em></li>
            <li><strong>Get Recommendations:</strong> The AI will analyze your variables (numeric, categorical) and your stated goal to provide a list of 3-5 suitable statistical tests.</li>
        </ol>

        <h3 id="interpreting-recommendations" className="text-xl font-semibold mt-6 mb-3 scroll-mt-20">Interpreting Recommendations</h3>
        <p>Each recommendation includes:</p>
        <ul>
            <li><strong>Analysis Name:</strong> The name of the test (e.g., "Independent Samples T-Test").</li>
            <li><strong>Simple Rationale:</strong> A clear, non-technical explanation of <em>why</em> the test is suitable, often with an analogy.</li>
            <li><strong>Required Variables:</strong> The types and names of variables from your dataset needed for the analysis.</li>
        </ul>
        <p>This feature helps bridge the gap between having data and knowing how to analyze it correctly.</p>
    </article>
  );
}
