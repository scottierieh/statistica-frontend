'use server';

/**
 * @fileOverview Interprets the results of a Difference-in-Differences (DiD) analysis.
 *
 * This flow is deprecated. The interpretation logic has been moved to the Python backend.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InterpretDidInputSchema = z.object({
  didCoefficient: z.number().describe('The coefficient of the interaction term (DiD estimator).'),
  didPValue: z.number().describe('The p-value of the interaction term.'),
  tValue: z.number().describe("The t-statistic for the DiD coefficient."),
  df: z.number().describe("The residual degrees of freedom for the model."),
  treatmentPreMean: z.number().describe("The mean of the outcome for the treatment group before the intervention."),
  treatmentPostMean: z.number().describe("The mean of the outcome for the treatment group after the intervention."),
  controlPreMean: z.number().describe("The mean of the outcome for the control group before the intervention."),
  controlPostMean: z.number().describe("The mean of the outcome for the control group after the intervention."),
});
export type InterpretDidInput = z.infer<typeof InterpretDidInputSchema>;

const InterpretDidOutputSchema = z.object({
  interpretation: z.string().describe('A human-readable interpretation of the DiD results.'),
});
export type InterpretDidOutput = z.infer<typeof InterpretDidOutputSchema>;

export async function interpretDid(input: InterpretDidInput): Promise<InterpretDidOutput> {
  // This function is deprecated.
  return Promise.resolve({ interpretation: "This AI flow is deprecated and should not be called." });
}

const interpretDidFlow = ai.defineFlow(
  {
    name: 'interpretDidFlow',
    inputSchema: InterpretDidInputSchema,
    outputSchema: InterpretDidOutputSchema,
  },
  async input => {
    // This flow is deprecated.
    return { interpretation: "This AI flow is deprecated and should not be called." };
  }
);
