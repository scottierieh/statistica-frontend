'use server';

/**
 * @fileOverview Interprets the results of a reliability analysis (Cronbach's Alpha).
 *
 * - interpretReliability - A function that provides an interpretation of the analysis.
 * - InterpretReliabilityInput - The input type for the function.
 * - InterpretReliabilityOutput - The return type for the function.
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
  return interpretReliabilityFlow(input);
}

const prompt = ai.definePrompt({
  name: 'interpretReliabilityPrompt',
  input: {schema: InterpretReliabilityInputSchema},
  output: {schema: InterpretReliabilityOutputSchema},
  prompt: `You are an expert statistician specializing in psychometrics. You are to interpret the results of a reliability analysis focusing on Cronbach's Alpha.

The user has analyzed a scale with {{{numItems}}} items using data from {{{numCases}}} participants.

Here is the key result:
- Cronbach's Alpha (α): {{{cronbachAlpha}}}

Based on this result, provide a concise, easy-to-understand interpretation.
- Start by stating the conclusion: what is the level of internal consistency reliability for this scale? (e.g., Excellent, Good, Acceptable, Questionable, Poor). Use standard cutoff values ( >.9 Excellent, >.8 Good, >.7 Acceptable, >.6 Questionable, <.6 Poor).
- Explain what Cronbach's Alpha represents in simple terms (i.e., how well the items on the scale measure a single underlying construct).
- Provide a brief recommendation based on the result. For example, if the reliability is low, suggest reviewing or revising items. If it's high, state that the scale is reliable.
- Keep the entire interpretation to 2-3 short paragraphs.
- Do not use markdown, just plain text.
`, 
});

const interpretReliabilityFlow = ai.defineFlow(
  {
    name: 'interpretReliabilityFlow',
    inputSchema: InterpretReliabilityInputSchema,
    outputSchema: InterpretReliabilityOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
