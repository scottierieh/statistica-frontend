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
  statistics: z.string().describe('The calculated statistics as a string.'),
  visualizations: z.string().describe('The visualizations as a string.'),
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
  prompt: `You are an expert data analyst and strategic consultant. Your role is to analyze the provided data summary and suggest potential actions or decisions that could be made based on this data.

Generate a comprehensive report that includes:
1.  **Statistical Findings**: A summary of the most important statistical results.
2.  **Actionable Insights**: Key insights derived from the findings.
3.  **Recommendations**: Concrete recommendations for decision-making.

When reporting statistical values, **strictly adhere to APA style** (e.g., *F*(1, 28) = 4.58, *p* = .042; *r* = .33, *p* < .001).

Structure your report clearly with these sections in well-structured paragraphs. Ensure each paragraph is separated by a line break for readability.

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
