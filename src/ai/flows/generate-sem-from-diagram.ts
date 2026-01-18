'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateSemFromDiagramInputSchema = z.object({
  diagramDataUri: z.string().describe("A diagram of a Structural Equation Model, as a data URI."),
});
export type GenerateSemFromDiagramInput = z.infer<typeof GenerateSemFromDiagramInputSchema>;

const GenerateSemFromDiagramOutputSchema = z.object({
  semSyntax: z.string().describe("The generated SEM model syntax in lavaan format."),
  explanation: z.string().describe("A detailed, structured explanation of the generated model, including measurement model, structural model, covariances, and defined effects."),
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
Your task is to analyze the provided diagram image and generate two things:
1.  A complete \`lavaan\` model syntax.
2.  A detailed explanation of the model.

Image of the SEM diagram: {{media url=diagramDataUri}}

**INSTRUCTIONS**

**Part 1: Lavaan Model Syntax (\`semSyntax\`)**
- Analyze the diagram to identify all relationships.
- Generate a complete and valid \`lavaan\` model syntax string.
- The syntax must include:
    - **Measurement Model:** Latent variables defined by their indicators (\`=~\`).
    - **Structural Model:** Regression paths between variables (\`~\`).
    - **Covariances:** Specified correlations between variables (\`~~\`).
    - **Defined Effects:** Indirect or total effects defined using \`:=\`.

**Part 2: Detailed Explanation (\`explanation\`)**
- Provide a clear, step-by-step explanation of the generated syntax using Markdown.
- Structure your explanation with the following headings:

#### Measurement Model
Explain which observed variables (indicators) load onto each latent variable. This defines your constructs.

#### Structural Model
Describe the regression paths (causal relationships) you have modeled between the variables.

#### Covariances
List any specified correlations, typically between exogenous variables or error terms.

#### Defined Effects
Explain any indirect or total effects you have defined using the \`:=\` operator. This is for interpreting mediation or complex path effects.

**Important:** If the uploaded image is not a valid structural equation model diagram, clearly state that in the \`explanation\` field and return an empty string for the \`semSyntax\` field.
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
