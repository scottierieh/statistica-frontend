'use server';

/**
 * @fileOverview Generates a summary report of the calculated statistics and visualizations.
 *
 * - generateSummaryReport - A function that handles the summary report generation.
 * - GenerateSummaryReportInput - The input type for the generateSummaryReport function.
 * - GenerateSummaryReportOutput - The return type for the generateSummaryReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSummaryReportInputSchema = z.object({
  analysisType: z.string().describe('The type of statistical analysis performed (e.g., "reliability", "correlation").'),
  statistics: z.string().describe('The calculated statistics as a JSON string.'),
  visualizations: z.string().optional().describe('A description of the visualizations, if any.'),
});
export type GenerateSummaryReportInput = z.infer<typeof GenerateSummaryReportInputSchema>;

const GenerateSummaryReportOutputSchema = z.object({
  report: z.string().describe('The generated summary report.'),
});
export type GenerateSummaryReportOutput = z.infer<typeof GenerateSummaryReportOutputSchema>;

export async function generateSummaryReport(input: GenerateSummaryReportInput): Promise<GenerateSummaryReportOutput> {
  return generateSummaryReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSummaryReportPrompt',
  input: {schema: GenerateSummaryReportInputSchema},
  output: {schema: GenerateSummaryReportOutputSchema},
  prompt: `You are an expert data analyst and strategic consultant. Your role is to analyze the provided data summary for a "{{analysisType}}" analysis and suggest potential actions or decisions.

Generate a comprehensive report that includes:
1.  **Statistical Findings**: A summary of the most important statistical results.
2.  **Actionable Insights**: Key insights derived from the findings.
3.  **Recommendations**: Concrete recommendations for decision-making.

When reporting statistical values, **strictly adhere to APA style** (e.g., *F*(1, 28) = 4.58, *p* = .042; *r* = .33, *p* < .001).

Structure your report clearly with these sections in well-structured paragraphs. Ensure each paragraph is separated by a line break for readability.

{{#ifCond analysisType '==' 'reliability'}}
**Reliability Analysis Specifics:**
-   **Cronbach's Alpha (α):** Interpret the main alpha value (e.g., α >= 0.9 is Excellent, >= 0.8 is Good, >= 0.7 is Acceptable, etc.).
-   **Item-Total Statistics:** Focus on 'Corrected Item-Total Correlation' (values < 0.3 are problematic) and 'Alpha if Item Deleted'.
-   **Recommendation:** Explicitly recommend which items, if any, should be considered for removal to improve scale reliability, based on whether 'Alpha if Item Deleted' is significantly higher than the overall alpha.
{{/ifCond}}

Data Summary:
- Statistics: {{{statistics}}}
- Visualizations: {{{visualizations}}}

Your Report:
`,
});

const generateSummaryReportFlow = ai.defineFlow(
  {
    name: 'generateSummaryReportFlow',
    inputSchema: GenerateSummaryReportInputSchema,
    outputSchema: GenerateSummaryReportOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
