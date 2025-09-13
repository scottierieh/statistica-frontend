'use server';

/**
 * @fileOverview A data visualization AI agent.
 *
 * - generateDataVisualization - A function that handles the data visualization process.
 * - GenerateDataVisualizationInput - The input type for the generateDataVisualization function.
 * - GenerateDataVisualizationOutput - The return type for the generateDataVisualization function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDataVisualizationInputSchema = z.object({
  dataDescription: z
    .string()
    .describe("The description of the data, and the columns it has."),
  chartType: z.string().describe('The type of chart to generate.'),
  chartTitle: z.string().describe('The title of the chart.'),
  xAxisLabel: z.string().describe('The label for the x-axis.'),
  yAxisLabel: z.string().describe('The label for the y-axis.'),
});
export type GenerateDataVisualizationInput = z.infer<
  typeof GenerateDataVisualizationInputSchema
>;

const GenerateDataVisualizationOutputSchema = z.object({
  visualizationDescription: z
    .string()
    .describe('A description of the visualization.'),
});
export type GenerateDataVisualizationOutput = z.infer<
  typeof GenerateDataVisualizationOutputSchema
>;

export async function generateDataVisualization(
  input: GenerateDataVisualizationInput
): Promise<GenerateDataVisualizationOutput> {
  return generateDataVisualizationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDataVisualizationPrompt',
  input: {schema: GenerateDataVisualizationInputSchema},
  output: {schema: GenerateDataVisualizationOutputSchema},
  prompt: `You are an expert data visualization specialist.

You will generate a description for a data visualization chart.

Use the following as the primary source of information about the data and the chart.

Data Description: {{{dataDescription}}}
Chart Type: {{{chartType}}}
Chart Title: {{{chartTitle}}}
X-Axis Label: {{{xAxisLabel}}}
Y-Axis Label: {{{yAxisLabel}}}`,
});

const generateDataVisualizationFlow = ai.defineFlow(
  {
    name: 'generateDataVisualizationFlow',
    inputSchema: GenerateDataVisualizationInputSchema,
    outputSchema: GenerateDataVisualizationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
