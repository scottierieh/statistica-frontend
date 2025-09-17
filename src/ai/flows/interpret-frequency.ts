'use server';

/**
 * @fileOverview Interprets the results of a Frequency Analysis.
 *
 * - interpretFrequency - A function that provides an interpretation of the analysis.
 * - InterpretFrequencyInput - The input type for the function.
 * - InterpretFrequencyOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InterpretFrequencyInputSchema = z.object({
  variableName: z.string().describe("The name of the variable being analyzed."),
  totalCount: z.number().describe("The total number of valid observations."),
  uniqueCategories: z.number().describe("The number of unique categories found."),
  topCategory: z.string().describe("The most frequent category (the mode)."),
  topCategoryFrequency: z.number().describe("The frequency of the most frequent category."),
  topCategoryPercentage: z.number().describe("The percentage of the most frequent category."),
});
export type InterpretFrequencyInput = z.infer<typeof InterpretFrequencyInputSchema>;

const InterpretFrequencyOutputSchema = z.object({
  interpretation: z.string().describe('A human-readable interpretation of the frequency analysis results.'),
});
export type InterpretFrequencyOutput = z.infer<typeof InterpretFrequencyOutputSchema>;

export async function interpretFrequency(input: InterpretFrequencyInput): Promise<InterpretFrequencyOutput> {
  return interpretFrequencyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'interpretFrequencyPrompt',
  input: {schema: InterpretFrequencyInputSchema},
  output: {schema: InterpretFrequencyOutputSchema},
  prompt: `You are an expert data analyst. You are to interpret the results of a frequency analysis for the categorical variable '{{{variableName}}}'.

Here are the key results:
- Total Observations: {{{totalCount}}}
- Unique Categories: {{{uniqueCategories}}}
- Mode (Most Frequent Category): '{{{topCategory}}}'
- Mode Frequency: {{{topCategoryFrequency}}} ({{topCategoryPercentage}}%)

Based on these results, provide a concise, easy-to-understand interpretation in a single paragraph.
- Start by stating the total number of valid responses and unique categories.
- Clearly identify the mode (most common category) and report its frequency and percentage in APA style (e.g., *n* = {{{topCategoryFrequency}}}, {{topCategoryPercentage}}%).
- Comment on the distribution. For example, is it evenly distributed, or does one category dominate?
- Keep the entire interpretation to one paragraph.
- Do not use markdown, just plain text.
`,
});

const interpretFrequencyFlow = ai.defineFlow(
  {
    name: 'interpretFrequencyFlow',
    inputSchema: InterpretFrequencyInputSchema,
    outputSchema: InterpretFrequencyOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
