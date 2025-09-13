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

Generate a report that not only summarizes the data but also provides actionable insights and recommendations for decision-making. Structure your report clearly with a summary, key insights, and concrete recommendations.

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
