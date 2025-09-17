'use server';

/**
 * @fileOverview Interprets the results of a correlation analysis.
 *
 * - interpretCorrelation - A function that provides an interpretation of correlation results.
 * - InterpretCorrelationInput - The input type for the interpretCorrelation function.
 * - InterpretCorrelationOutput - The return type for the interpretCorrelation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InterpretCorrelationInputSchema = z.object({
  correlationMatrix: z.string().describe("The correlation matrix as a string."),
  pValueMatrix: z.string().describe("The matrix of p-values for each correlation."),
  strongestCorrelations: z.string().describe("A summary of the strongest positive and negative correlations found."),
  method: z.string().describe("The correlation method used (e.g., Pearson, Spearman).")
});
export type InterpretCorrelationInput = z.infer<typeof InterpretCorrelationInputSchema>;

const InterpretCorrelationOutputSchema = z.object({
  interpretation: z.string().describe('A human-readable interpretation of the correlation results.'),
});
export type InterpretCorrelationOutput = z.infer<typeof InterpretCorrelationOutputSchema>;

export async function interpretCorrelation(input: InterpretCorrelationInput): Promise<InterpretCorrelationOutput> {
  return interpretCorrelationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'interpretCorrelationPrompt',
  input: {schema: InterpretCorrelationInputSchema},
  output: {schema: InterpretCorrelationOutputSchema},
  prompt: `You are an expert statistician. You are to interpret the results of a correlation analysis.

The user performed a correlation analysis using the {{{method}}} method.

Here are the results:
- Strongest Correlations: {{{strongestCorrelations}}}
- Full Correlation Matrix: {{{correlationMatrix}}}
- P-Value Matrix: {{{pValueMatrix}}}

Based on these results, provide a concise, easy-to-understand interpretation.
- Start by summarizing the overall pattern of correlations. Are there many strong relationships, or are they generally weak?
- Highlight the most significant positive and negative correlations, explaining what they mean in simple terms.
- Mention the general strength of the relationships (e.g., small, medium, large based on the absolute r value: >0.1 small, >0.3 medium, >0.5 large).
- Briefly explain the difference between statistical significance (p-value) and the strength of the correlation (r-value).
- Keep the entire interpretation to 2-3 short paragraphs.
- Do not use markdown, just plain text.
`, 
});

const interpretCorrelationFlow = ai.defineFlow(
  {
    name: 'interpretCorrelationFlow',
    inputSchema: InterpretCorrelationInputSchema,
    outputSchema: InterpretCorrelationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
