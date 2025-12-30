'use server';

/**
 * @fileOverview Interprets the results of a Crosstabulation (Chi-squared test).
 *
 * This flow is deprecated. The interpretation logic has been moved to the Python backend.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InterpretCrosstabInputSchema = z.object({
  rowVar: z.string().describe("The name of the row variable."),
  colVar: z.string().describe('The name of the column variable.'),
  chi2: z.number().describe("The calculated Chi-squared statistic."),
  df: z.number().describe("The degrees of freedom for the test."),
  pValue: z.number().describe("The calculated p-value."),
  cramersV: z.number().describe("Cramer's V for effect size."),
});
export type InterpretCrosstabInput = z.infer<typeof InterpretCrosstabInputSchema>;

const InterpretCrosstabOutputSchema = z.object({
  interpretation: z.string().describe('A human-readable interpretation of the crosstabulation results.'),
});
export type InterpretCrosstabOutput = z.infer<typeof InterpretCrosstabOutputSchema>;

export async function interpretCrosstab(input: InterpretCrosstabInput): Promise<InterpretCrosstabOutput> {
  // This function is deprecated.
  // The backend now generates the interpretation directly.
  return Promise.resolve({ interpretation: "This AI flow is deprecated and should not be called." });
}

const interpretCrosstabFlow = ai.defineFlow(
  {
    name: 'interpretCrosstabFlow',
    inputSchema: InterpretCrosstabInputSchema,
    outputSchema: InterpretCrosstabOutputSchema,
  },
  async input => {
    // This flow is deprecated.
    return { interpretation: "This AI flow is deprecated and should not be called." };
  }
);
