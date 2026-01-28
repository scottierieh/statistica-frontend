'use client';

export default function ExportingSharingPage() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
        <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">Export & Sharing</h1>
        <p className="text-lg text-muted-foreground mb-8">How to export and share your findings.</p>

        <h3 id="exporting-your-work" className="text-xl font-semibold mt-6 mb-3 scroll-mt-20">Exporting Your Work</h3>
        <p>You can easily export your results for use in reports, presentations, or publications.</p>

        <h3 id="available-options" className="text-xl font-semibold mt-6 mb-3 scroll-mt-20">Available Export Options:</h3>
        <ul>
            <li><strong>PNG Image:</strong> From the main results page, click the <strong>Download PNG</strong> button to save a high-resolution image of the entire report, including charts and tables. This is perfect for dropping into a slide deck.</li>
            <li><strong>CSV Data:</strong> From the <strong>Data Preparation</strong> view, you can download the currently loaded (and potentially cleaned) dataset as a CSV file.</li>
            <li><strong>AI Report as TXT:</strong> When you generate an AI summary report, you can download its content as a plain text file for easy copying and pasting.</li>
        </ul>

        <h3 id="sharing-with-team" className="text-xl font-semibold mt-6 mb-3 scroll-mt-20">Sharing with Your Team</h3>
        <p>To share your full analysis setup and results with colleagues, you can save the analysis state (coming soon) or use the export features to share the outputs.</p>
    </article>
  );
}
