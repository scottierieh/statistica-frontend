'use client';

export default function TroubleshootingFaqPage() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
        <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">Help & FAQ</h1>
        <p className="text-lg text-muted-foreground mb-8">Frequently asked questions about Standard Analysis.</p>

        <h3 id="faq" className="text-xl font-semibold mt-6 mb-3 scroll-mt-20">Frequently Asked Questions</h3>

        <h4 id="disabled-analysis" className="text-lg font-semibold mt-4 mb-2">Q: Why are some analysis options disabled?</h4>
        <p>A: An analysis will be disabled if your currently loaded dataset does not meet its minimum requirements. For example, a T-Test requires at least one numeric variable and one categorical variable with two groups. Hover over a disabled analysis to see what's needed.</p>

        <h4 id="analysis-failed" className="text-lg font-semibold mt-4 mb-2">Q: My analysis failed. What should I do?</h4>
        <p>A: Failures are most often caused by data issues. Check for:</p>
        <ul>
            <li><strong>Missing Values:</strong> Ensure the columns you're analyzing don't have too many empty cells.</li>
            <li><strong>Incorrect Variable Types:</strong> A variable with text in it cannot be used in a numeric-only role.</li>
            <li><strong>Insufficient Data:</strong> Some tests require a minimum number of data points per group.</li>
        </ul>

        <h4 id="p-value" className="text-lg font-semibold mt-4 mb-2">Q: How do I interpret the p-value?</h4>
        <p>A: The p-value helps you determine the statistical significance of your results. A common threshold is 0.05.</p>
        <ul>
            <li><strong>p &lt; 0.05:</strong> The result is statistically significant. You can reject the null hypothesis. This means the observed effect is unlikely to be due to random chance.</li>
            <li><strong>p ≥ 0.05:</strong> The result is not statistically significant. You fail to reject the null hypothesis. This means the observed effect could be due to random chance.</li>
        </ul>
    </article>
  );
}
