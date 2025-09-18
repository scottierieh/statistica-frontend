
'use server';

/**
 * @fileOverview Interprets the results of a Correlation Analysis.
 *
 * This flow is deprecated. The interpretation logic has been moved to the Python backend.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InterpretCorrelationInputSchema = z.object({
  correlationMatrix: z.string().describe("The correlation matrix as a JSON string."),
  pValueMatrix: z.string().describe("The p-value matrix as a JSON string."),
  variables: z.array(z.string()).describe("The list of variables analyzed."),
  method: z.string().describe("The correlation method used (e.g., Pearson, Spearman)."),
});
export type InterpretCorrelationInput = z.infer<typeof InterpretCorrelationInputSchema>;

const InterpretCorrelationOutputSchema = z.object({
  interpretation: z.string().describe('A human-readable interpretation of the correlation results.'),
});
export type InterpretCorrelationOutput = z.infer<typeof InterpretCorrelationOutputSchema>;

export async function interpretCorrelation(input: InterpretCorrelationInput): Promise<InterpretCorrelationOutput> {
  // This function is deprecated.
  // The backend now generates the interpretation directly.
  return Promise.resolve({ interpretation: "This AI flow is deprecated and should not be called." });
}

const interpretCorrelationFlow = ai.defineFlow(
  {
    name: 'interpretCorrelationFlow',
    inputSchema: InterpretCorrelationInputSchema,
    outputSchema: InterpretCorrelationOutputSchema,
  },
  async input => {
    return { interpretation: "This AI flow is deprecated and should not be called." };
  }
);
