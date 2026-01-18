'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateSemFromDiagramInputSchema = z.object({
  diagramDataUri: z.string().describe("A diagram of a Structural Equation Model, as a data URI."),
});
export type GenerateSemFromDiagramInput = z.infer<typeof GenerateSemFromDiagramInputSchema>;

const GenerateSemFromDiagramOutputSchema = z.object({
  semSyntax: z.string().describe("The generated SEM model syntax in lavaan format."),
  explanation: z.string().describe("A brief explanation of the generated syntax and the identified relationships."),
});
export type GenerateSemFromDiagramOutput = z.infer<typeof GenerateSemFromDiagramOutputSchema>;

export async function generateSemFromDiagram(input: GenerateSemFromDiagramInput): Promise<GenerateSemFromDiagramOutput> {
  return generateSemFromDiagramFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSemFromDiagramPrompt',
  input: { schema: GenerateSemFromDiagramInputSchema },
  output: { schema: GenerateSemFromDiagramOutputSchema },
  prompt: `You are an expert statistician specializing in Structural Equation Modeling.
Analyze the provided diagram image and translate it into lavaan model syntax.

Image of the SEM diagram: {{media url=diagramDataUri}}

- Identify latent variables (usually represented by ovals/circles).
- Identify observed variables (usually represented by squares/rectangles).
- Identify paths:
  - Regressions (single-headed arrows -> '~').
  - Covariances (double-headed arrows -> '~~').
  - Latent variable definitions (single-headed arrows from latent to observed -> '=~').
- Generate the model syntax strictly in lavaan format.
- Provide a brief explanation of the model you have defined based on the paths you identified.
- If the image is not a structural equation model diagram, state that clearly and do not generate syntax.
`,
});

const generateSemFromDiagramFlow = ai.defineFlow(
  {
    name: 'generateSemFromDiagramFlow',
    inputSchema: GenerateSemFromDiagramInputSchema,
    outputSchema: GenerateSemFromDiagramOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
