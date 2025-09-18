'use server';

/**
 * @fileOverview Interprets the results of a clustering analysis.
 *
 * - interpretClustering - A function that provides an interpretation of clustering results.
 * - InterpretClusteringInput - The input type for the interpretClustering function.
 * - InterpretClusteringOutput - The return type for the interpretClustering function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const InterpretClusteringInputSchema = z.object({
  modelType: z.string().describe("The type of clustering model used (e.g., K-Means, DBSCAN, HDBSCAN)."),
  nClusters: z.number().describe("The number of clusters found."),
  nNoise: z.number().describe("The number of points classified as noise."),
  totalSamples: z.number().describe("The total number of data samples."),
  clusterProfiles: z.string().describe("A JSON string representing the profiles (centroids, sizes) of each cluster."),
});
export type InterpretClusteringInput = z.infer<typeof InterpretClusteringInputSchema>;

const InterpretClusteringOutputSchema = z.object({
  interpretation: z.string().describe('A human-readable interpretation of the clustering results.'),
});
export type InterpretClusteringOutput = z.infer<typeof InterpretClusteringOutputSchema>;

export async function interpretClustering(input: InterpretClusteringInput): Promise<InterpretClusteringOutput> {
  return interpretClusteringFlow(input);
}

const prompt = ai.definePrompt({
  name: 'interpretClusteringPrompt',
  input: {schema: InterpretClusteringInputSchema},
  output: {schema: InterpretClusteringOutputSchema},
  prompt: `You are an expert data scientist providing an interpretation of a {{{modelType}}} clustering analysis.

Here are the key results:
- Number of Clusters: {{{nClusters}}}
- Noise Points: {{{nNoise}}} (out of {{{totalSamples}}} total samples)
- Cluster Profiles (mean values for each variable): {{{clusterProfiles}}}

Based on these results, provide a concise, easy-to-understand interpretation.
- **Overall Quality:** Start by assessing the overall quality. For density-based models like DBSCAN/HDBSCAN, comment on the number of clusters found versus the amount of noise. A high percentage of noise might indicate the data is not well-suited for clustering or that parameters need tuning.
- **Cluster Profiles:** For each major cluster, describe its defining characteristics based on the provided profiles. For example, "Cluster 1, which contains 25% of the data, is characterized by high income and high spending but low age." Highlight the 2-3 most distinctive features for each cluster.
- **Actionable Insights:** Briefly suggest a potential business application or insight based on one or two of the most interesting clusters. For example, "Cluster 2, with its high income and frequent purchases, represents a prime target for a premium loyalty program."
- Ensure each section is a distinct paragraph separated by a line break.
- Use markdown for emphasis (e.g., **bold** for key terms, *italics* for variable names).
`, 
});

const interpretClusteringFlow = ai.defineFlow(
  {
    name: 'interpretClusteringFlow',
    inputSchema: InterpretClusteringInputSchema,
    outputSchema: InterpretClusteringOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
