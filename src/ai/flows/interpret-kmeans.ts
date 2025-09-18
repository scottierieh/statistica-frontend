'use server';

/**
 * @fileOverview Interprets the results of K-Means clustering validation metrics.
 *
 * - interpretKmeans - A function that provides an interpretation of the cluster validation scores.
 * - InterpretKmeansInput - The input type for the interpretKmeans function.
 * - InterpretKmeansOutput - The return type for the interpretKmeans function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InterpretKmeansInputSchema = z.object({
  silhouetteScore: z.number().describe("The Silhouette Score. Ranges from -1 to 1. Closer to 1 is better."),
  calinskiHarabaszScore: z.number().describe("The Calinski-Harabasz Score. Higher is better."),
  daviesBouldinScore: z.number().describe("The Davies-Bouldin Score. Closer to 0 is better."),
});
export type InterpretKmeansInput = z.infer<typeof InterpretKmeansInputSchema>;

const InterpretKmeansOutputSchema = z.object({
  interpretation: z.string().describe('A human-readable interpretation of the K-Means validation metrics.'),
});
export type InterpretKmeansOutput = z.infer<typeof InterpretKmeansOutputSchema>;

export async function interpretKmeans(input: InterpretKmeansInput): Promise<InterpretKmeansOutput> {
  return interpretKmeansFlow(input);
}

const prompt = ai.definePrompt({
  name: 'interpretKmeansPrompt',
  input: {schema: InterpretKmeansInputSchema},
  output: {schema: InterpretKmeansOutputSchema},
  prompt: `You are an expert data scientist. You are to provide a concise interpretation of K-Means cluster validation metrics.

Here are the key metrics:
- Silhouette Score: {{{silhouetteScore}}}
- Calinski-Harabasz Score: {{{calinskiHarabaszScore}}}
- Davies-Bouldin Score: {{{daviesBouldinScore}}}

Provide a paragraph that explains what these metrics mean in simple terms and assesses the quality of the clustering based on the provided values.
- Explain that the **Silhouette Score** (closer to 1 is better) measures how similar an object is to its own cluster compared to other clusters.
- Explain that the **Calinski-Harabasz Score** (higher is better) is the ratio of between-cluster dispersion to within-cluster dispersion.
- Explain that the **Davies-Bouldin Score** (closer to 0 is better) measures the average similarity between each cluster and its most similar one.
- Based on the scores, provide an overall judgement (e.g., "These scores suggest a well-defined clustering structure," or "The clustering structure appears to be weak/ambiguous.").
- Keep the entire interpretation to a single, readable paragraph. Do not use markdown.
`,
});

const interpretKmeansFlow = ai.defineFlow(
  {
    name: 'interpretKmeansFlow',
    inputSchema: InterpretKmeansInputSchema,
    outputSchema: InterpretKmeansOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
