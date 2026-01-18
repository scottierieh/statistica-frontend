'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateSemFromDiagramInputSchema = z.object({
  diagramDataUri: z.string().describe("A diagram of a Structural Equation Model, as a data URI."),
});
export type GenerateSemFromDiagramInput = z.infer<typeof GenerateSemFromDiagramInputSchema>;

const GenerateSemFromDiagramOutputSchema = z.object({
  semSyntax: z.string().describe("The generated SEM model syntax in lavaan format, well-structured with comments."),
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
1.  A complete, well-formatted \`lavaan\` model syntax.
2.  A detailed explanation of the model.

Image of the SEM diagram: {{media url=diagramDataUri}}

**INSTRUCTIONS**

**Part 1: Lavaan Model Syntax (\`semSyntax\`)**
- Analyze the diagram to identify all relationships.
- Generate a complete and valid \`lavaan\` model syntax string.

- **IMPORTANT RULES for \`lavaan\` syntax:**
    1.  **Formatting:** Use clear spacing and separate different model parts with comments (e.g., \`# Measurement Model\`). This is crucial for readability.
    2.  **Indicator Variables:** An indicator variable (e.g., \`x1\` in \`F1 =~ x1 + x2\`) must not be used in a structural path's formula. For example, \`Y ~ F1 + x1\` is incorrect if \`x1\` is an indicator of \`F1\`. If the diagram shows a direct path from a predictor to an indicator, model it as a separate regression.
    3.  **Defined Effects (\`:=\`):** When defining indirect or total effects, you MUST only use the parameter labels (e.g., \`a\`, \`b1\`, \`c_prime\`) that you have explicitly assigned to paths in the structural model (e.g., \`Y ~ c_prime*X\`). Do not use variable names in these calculations. For example, \`indirect := a*b\` is correct, but \`indirect := F1*F2\` is not.

- The syntax must include these clearly separated sections where applicable:
    - **Measurement Model:** Latent variables defined by their indicators (\`=~\`). Use \`1*\` to fix the loading of the first indicator for scale identification.
    - **Structural Model:** Regression paths between variables (\`~\`). Assign labels to all paths that will be used for calculating effects (e.g., \`M ~ a*X\`).
    - **Defined Effects:** Define any indirect or total effects using the \`:=\` operator and the path labels.
    - **Covariances:** Specify any correlations between variables, typically between exogenous variables or error terms (\`~~\`).

**Part 2: Detailed Explanation (\`explanation\`)**
- Provide a clear, step-by-step explanation of the generated syntax using Markdown.
- Use APA style when describing relationships (e.g., "Factor1 is predicted by Factor2 (β = ...)") if possible, while explaining the model structure.
- Structure your explanation with the following headings:

#### Measurement Model
Explain which observed variables (indicators) load onto each latent variable. This defines your constructs.

#### Structural Model
Describe the causal regression paths you have modeled between the latent and/or observed variables.

#### Defined Effects
Explain any indirect or total effects you have defined using the \`:=\` operator. Describe what each effect (e.g., 'indirect_effect') represents in the model.

#### Covariances
List any specified correlations, typically between exogenous variables or error terms, and explain their meaning.

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
