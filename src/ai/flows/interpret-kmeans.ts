
'use server';

/**
 * @fileOverview Interprets the results of K-Means clustering validation metrics.
 *
 * - interpretClustering - A function that provides an interpretation of the cluster validation scores.
 * - InterpretClusteringInput - The input type for the interpretClustering function.
 * - InterpretClusteringOutput - The return type for the interpretClustering function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InterpretClusteringInputSchema = z.object({
  modelType: z.string().describe("The type of clustering model used (e.g., K-Means, DBSCAN, HDBSCAN)."),
  nClusters: z.number().describe("The number of clusters found."),
  nNoise: z.number().optional().describe("The number of noise points found (for density-based models)."),
  totalSamples: z.number().describe("The total number of data points."),
  clusterProfiles: z.string().optional().describe("A JSON string representing the mean values of variables for each cluster."),
  silhouetteScore: z.number().optional().describe("The Silhouette Score. Ranges from -1 to 1. Closer to 1 is better."),
  calinskiHarabaszScore: z.number().optional().describe("The Calinski-Harabasz Score. Higher is better."),
  daviesBouldinScore: z.number().optional().describe("The Davies-Bouldin Score. Closer to 0 is better."),
});
export type InterpretClusteringInput = z.infer<typeof InterpretClusteringInputSchema>;

const InterpretClusteringOutputSchema = z.object({
  interpretation: z.string().describe('A human-readable interpretation of the clustering validation metrics.'),
});
export type InterpretClusteringOutput = z.infer<typeof InterpretClusteringOutputSchema>;

export async function interpretClustering(input: InterpretClusteringInput): Promise<InterpretClusteringOutput> {
  return interpretClusteringFlow(input);
}

const prompt = ai.definePrompt({
  name: 'interpretClusteringPrompt',
  input: {schema: InterpretClusteringInputSchema},
  output: {schema: InterpretClusteringOutputSchema},
  prompt: `You are an expert data scientist. You are to provide a concise interpretation of clustering results.

Here are the key metrics for the {{{modelType}}} model:
- Clusters Found: {{{nClusters}}}
{{#if nNoise}}- Noise Points: {{{nNoise}}} ({{eval '({{nNoise}} / {{totalSamples}}) * 100'}})% of total
{{/if}}- Total Samples: {{{totalSamples}}}
- Silhouette Score: {{{silhouetteScore}}}
- Calinski-Harabasz Score: {{{calinskiHarabaszScore}}}
- Davies-Bouldin Score: {{{daviesBouldinScore}}}
- Cluster Profiles (Centroids): {{{clusterProfiles}}}


Provide a paragraph that explains what these metrics mean in simple terms and assesses the quality of the clustering based on the provided values.
- Start with an overall summary of the findings (e.g., number of clusters, noise points).
- If validation scores are available, explain them briefly (Silhouette closer to 1 is better, Calinski-Harabasz higher is better, Davies-Bouldin closer to 0 is better).
- Provide an overall judgement of the clustering quality based on the scores.
- If cluster profiles are provided, briefly describe the key characteristics of 1-2 of the most distinct clusters based on their centroids.
- Keep the entire interpretation to a concise, readable paragraph. Do not use markdown.
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
