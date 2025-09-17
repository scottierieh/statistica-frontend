'use server';

/**
 * @fileOverview Interprets the results of a Confirmatory Factor Analysis (CFA).
 *
 * - interpretCfa - A function that provides an interpretation of CFA results.
 * - InterpretCfaInput - The input type for the interpretCfa function.
 * - InterpretCfaOutput - The return type for the interpretCfa function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InterpretCfaInputSchema = z.object({
  fitIndices: z.string().describe("A summary of the model fit indices (e.g., CFI, TLI, RMSEA, SRMR)."),
  factorLoadings: z.string().describe("A summary of the factor loadings, indicating which items load onto which factors."),
  convergentValidity: z.string().describe("A summary of Composite Reliability (CR) and Average Variance Extracted (AVE) values."),
  discriminantValidity: z.string().describe("A summary of the Fornell-Larcker criterion results."),
});
export type InterpretCfaInput = z.infer<typeof InterpretCfaInputSchema>;

const InterpretCfaOutputSchema = z.object({
  interpretation: z.string().describe('A human-readable interpretation of the CFA results.'),
});
export type InterpretCfaOutput = z.infer<typeof InterpretCfaOutputSchema>;

export async function interpretCfa(input: InterpretCfaInput): Promise<InterpretCfaOutput> {
  return interpretCfaFlow(input);
}

const prompt = ai.definePrompt({
  name: 'interpretCfaPrompt',
  input: {schema: InterpretCfaInputSchema},
  output: {schema: InterpretCfaOutputSchema},
  prompt: `You are an expert statistician specializing in Structural Equation Modeling. You are to interpret the results of a Confirmatory Factor Analysis (CFA).

The user has tested a measurement model. Here are the key results:
- Model Fit: {{{fitIndices}}}
- Factor Loadings Summary: {{{factorLoadings}}}
- Convergent Validity (CR & AVE): {{{convergentValidity}}}
- Discriminant Validity (Fornell-Larcker): {{{discriminantValidity}}}

Based on these results, provide a concise, easy-to-understand interpretation.
- Start with an overall assessment of the model fit. Use common fit index cutoff criteria (e.g., CFI/TLI > .90, RMSEA < .08, SRMR < .08).
- Evaluate the convergent validity based on the factor loadings, CR (> 0.7), and AVE (> 0.5) values.
- Evaluate the discriminant validity based on the Fornell-Larcker criterion (the square root of AVE for a construct should be greater than its correlation with other constructs).
- Provide a concluding summary of the measurement model's quality.
- Keep the entire interpretation to 3-4 short paragraphs.
- Do not use markdown, just plain text.
`, 
});

const interpretCfaFlow = ai.defineFlow(
  {
    name: 'interpretCfaFlow',
    inputSchema: InterpretCfaInputSchema,
    outputSchema: InterpretCfaOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
