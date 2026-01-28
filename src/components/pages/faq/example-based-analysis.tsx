'use client';

export default function ExampleBasedAnalysisPage() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
        <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">Examples</h1>
        <p className="text-lg text-muted-foreground mb-8">Walkthroughs using example datasets.</p>

        <h3 id="learning-with-examples" className="text-xl font-semibold mt-6 mb-3 scroll-mt-20">Learning with Examples</h3>
        <p>The best way to learn is by doing. The Standard Analysis tool includes a variety of pre-loaded example datasets to help you get started quickly.</p>

        <h3 id="how-to-load" className="text-xl font-semibold mt-6 mb-3 scroll-mt-20">How to Load an Example</h3>
        <ol>
            <li>From the <strong>Data Preparation</strong> screen, click the <strong>"Load Example Data"</strong> button.</li>
            <li>A list of available datasets will appear, each with a name, description, and an icon representing its typical use case (e.g., "A/B Test Data", "Customer Segments").</li>
            <li>Clicking on a dataset will instantly load it into the tool and automatically select a recommended analysis for that data.</li>
        </ol>
        <p>This allows you to see a complete, end-to-end analysis workflow and explore how different statistical tests are applied to different types of data.</p>
    </article>
  );
}
