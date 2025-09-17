'use server';

/**
 * @fileOverview Interprets the results of a Crosstabulation (Chi-squared test).
 *
 * - interpretCrosstab - A function that provides an interpretation of the analysis.
 * - InterpretCrosstabInput - The input type for the function.
 * - InterpretCrosstabOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InterpretCrosstabInputSchema = z.object({
  rowVar: z.string().describe("The name of the row variable."),
  colVar: z.string().describe('The name of the column variable.'),
  chi2: z.number().describe("The calculated Chi-squared statistic."),
  pValue: z.number().describe("The calculated p-value."),
  cramersV: z.number().describe("Cramer's V for effect size."),
  contingencyTable: z.string().describe("The contingency table as a JSON string."),
});
export type InterpretCrosstabInput = z.infer<typeof InterpretCrosstabInputSchema>;

const InterpretCrosstabOutputSchema = z.object({
  interpretation: z.string().describe('A human-readable interpretation of the crosstabulation results.'),
});
export type InterpretCrosstabOutput = z.infer<typeof InterpretCrosstabOutputSchema>;

export async function interpretCrosstab(input: InterpretCrosstabInput): Promise<InterpretCrosstabOutput> {
  return interpretCrosstabFlow(input);
}

const prompt = ai.definePrompt({
  name: 'interpretCrosstabPrompt',
  input: {schema: InterpretCrosstabInputSchema},
  output: {schema: InterpretCrosstabOutputSchema},
  prompt: `You are an expert statistician. You are to interpret the results of a Chi-squared test for independence based on a crosstabulation.

The user analyzed the relationship between two categorical variables: '{{{rowVar}}}' and '{{{colVar}}}'.

Here are the key results:
- Chi-squared (χ²) statistic: {{{chi2}}}
- p-value: {{{pValue}}}
- Cramer's V (effect size): {{{cramersV}}}
- Contingency Table: {{{contingencyTable}}}

Based on these results, provide a concise, easy-to-understand interpretation.
- Start by stating the conclusion: is there a statistically significant association between '{{{rowVar}}}' and '{{{colVar}}}'? (Use a significance level of alpha = 0.05).
- Explain what this association (or lack thereof) means in the context of the variables.
- Explain the strength of the association using Cramer's V (e.g., weak, moderate, strong). General guidelines: <0.1 is negligible, 0.1-0.2 is weak, 0.2-0.4 is moderate, 0.4-0.6 is relatively strong, >0.6 is strong.
- If the association is significant, briefly point out which cells in the contingency table seem to contribute most to this relationship (where observed counts differ most from what would be expected by chance).
- Keep the entire interpretation to 2-3 short paragraphs.
- Do not use markdown, just plain text.
`, 
});

const interpretCrosstabFlow = ai.defineFlow(
  {
    name: 'interpretCrosstabFlow',
    inputSchema: InterpretCrosstabInputSchema,
    outputSchema: InterpretCrosstabOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
