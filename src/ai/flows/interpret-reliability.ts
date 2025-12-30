'use server';

/**
 * @fileOverview Interprets the results of a reliability analysis (Cronbach's Alpha).
 *
 * This flow is deprecated. The interpretation logic has been moved to the Python backend.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InterpretReliabilityInputSchema = z.object({
  cronbachAlpha: z.number().describe("The calculated Cronbach's Alpha value."),
  numItems: z.number().describe('The number of items in the scale.'),
  numCases: z.number().describe('The number of observations (participants).'),
});
export type InterpretReliabilityInput = z.infer<typeof InterpretReliabilityInputSchema>;

const InterpretReliabilityOutputSchema = z.object({
  interpretation: z.string().describe('A human-readable interpretation of the reliability analysis results.'),
});
export type InterpretReliabilityOutput = z.infer<typeof InterpretReliabilityOutputSchema>;

export async function interpretReliability(input: InterpretReliabilityInput): Promise<InterpretReliabilityOutput> {
  // This function is deprecated.
  // The backend now generates the interpretation directly.
  return Promise.resolve({ interpretation: "This AI flow is deprecated and should not be called." });
}

const interpretReliabilityFlow = ai.defineFlow(
  {
    name: 'interpretReliabilityFlow',
    inputSchema: InterpretReliabilityInputSchema,
    outputSchema: InterpretReliabilityOutputSchema,
  },
  async input => {
    return { interpretation: "This AI flow is deprecated and should not be called." };
  }
);
