'use server';
/**
 * @fileOverview A 3D PCA plot interpretation AI agent.
 *
 * - interpretPca3d - A function that handles the 3D PCA plot interpretation.
 * - InterpretPca3dInput - The input type for the interpretPca3d function.
 * - InterpretPca3dOutput - The return type for the interpretPca3d function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InterpretPca3dInputSchema = z.object({
  explainedVariance: z.array(z.number()).describe("The explained variance ratio for the first three principal components."),
  targetGroups: z.array(z.string()).describe("The names of the groups (classes) being plotted."),
});
export type InterpretPca3dInput = z.infer<typeof InterpretPca3dInputSchema>;

const InterpretPca3dOutputSchema = z.object({
  interpretation: z.string().describe('A human-readable interpretation of the 3D PCA plot.'),
});
export type InterpretPca3dOutput = z.infer<typeof InterpretPca3dOutputSchema>;

export async function interpretPca3d(input: InterpretPca3dInput): Promise<InterpretPca3dOutput> {
  return interpretPca3dFlow(input);
}

const prompt = ai.definePrompt({
  name: 'interpretPca3dPrompt',
  input: {schema: InterpretPca3dInputSchema},
  output: {schema: InterpretPca3dOutputSchema},
  prompt: `You are a data scientist interpreting a 3D Principal Component Analysis (PCA) plot for a user.

The plot visualizes how well the first three principal components separate the data into the following groups: {{{targetGroups}}}.

The explained variance for the three components is:
- PC1: {{{explainedVariance.[0]}}}
- PC2: {{{explainedVariance.[1]}}}
- PC3: {{{explainedVariance.[2]}}}
The total explained variance is {{{explainedVariance.reduce((a, b) => a + b, 0)}}}.

Based on this information, provide a concise interpretation of the 3D PCA plot. Address the following points in separate paragraphs:
1.  **Explained Variance:** Briefly explain what the total explained variance means. A higher percentage (e.g., > 70%) is generally good, indicating the 3D plot captures a large portion of the original data's variability.
2.  **Group Separation:** Describe how well the components separate the groups. Are the clusters for each group distinct and far apart, or do they overlap significantly? Good separation means the original features can effectively distinguish between the groups. Poor separation suggests the groups are not easily distinguishable based on the chosen features.
3.  **Conclusion:** Provide a concluding thought on the effectiveness of PCA for visualizing the separability of these groups.

Keep the language clear and accessible to someone who is not a statistics expert.
`,
});

const interpretPca3dFlow = ai.defineFlow(
  {
    name: 'interpretPca3dFlow',
    inputSchema: InterpretPca3dInputSchema,
    outputSchema: InterpretPca3dOutputSchema,
  },
  async input => {
    // Modify the input to be compatible with the prompt, which expects an array for explainedVariance.
    const modifiedInput = {
      ...input,
      explainedVariance: [input.explainedVariance[0], input.explainedVariance[1], input.explainedVariance[2]],
    };

    const {output} = await prompt(modifiedInput);
    return output!;
  }
);
