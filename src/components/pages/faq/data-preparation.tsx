'use client';

export default function DataPreparationPage() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
        <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">Data Preparation</h1>
        <p className="text-lg text-muted-foreground mb-8">Preparing your data for analysis.</p>

        <h3 id="data-preparation-is-key" className="text-xl font-semibold mt-6 mb-3 scroll-mt-20">Data Preparation is Key</h3>
        <p>Good analysis starts with good data. The <strong>Data Preparation</strong> section allows you to upload, view, and clean your dataset before analysis.</p>

        <h3 id="uploading-data" className="text-xl font-semibold mt-6 mb-3 scroll-mt-20">Uploading Data</h3>
        <ul>
            <li>You can upload data from <strong>CSV, TSV, and Excel (.xlsx, .xls)</strong> files.</li>
            <li>Drag and drop your file onto the designated area or click to browse.</li>
            <li>The system automatically detects headers and data types.</li>
        </ul>

        <h3 id="data-preview" className="text-xl font-semibold mt-6 mb-3 scroll-mt-20">Data Preview</h3>
        <p>Once uploaded, you'll see a preview of your dataset, including:</p>
        <ul>
            <li><strong>File Name and Dimensions:</strong> See the name of your file, number of rows, and number of columns.</li>
            <li><strong>Variable Summary:</strong> A quick count of numeric and categorical variables detected.</li>
            <li><strong>Data Table:</strong> A scrollable view of the first 100 rows of your data.</li>
        </ul>

        <h3 id="basic-cleaning" className="text-xl font-semibold mt-6 mb-3 scroll-mt-20">Basic Cleaning</h3>
        <p>From the data preview screen, you can perform basic cleaning operations like clearing the dataset to start over. For more advanced cleaning, use the <strong>DataPrep</strong> tool from the main dashboard.</p>
    </article>
  );
}
