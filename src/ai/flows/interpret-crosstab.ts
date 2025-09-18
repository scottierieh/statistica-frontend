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
  df: z.number().describe("The degrees of freedom for the test."),
  pValue: z.number().describe("The calculated p-value."),
  cramersV: z.number().describe("Cramer's V for effect size."),
  phi: z.number().describe("Phi coefficient for effect size, relevant for 2x2 tables."),
  contingencyCoeff: z.number().describe("Contingency coefficient for effect size."),
  contingencyTable: z.string().describe("The contingency table as a JSON string."),
  totalObservations: z.number().describe("The total number of observations (N).")
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
  prompt: `You are an expert statistician. You are to interpret the results of a Chi-squared test for independence based on a crosstabulation in APA style.

The user analyzed the relationship between two categorical variables: '{{{rowVar}}}' and '{{{colVar}}}'.

Here are the key results:
- Chi-squared (χ²) statistic: {{{chi2}}}
- Degrees of Freedom: {{{df}}}
- Total Observations (N): {{{totalObservations}}}
- p-value: {{{pValue}}}
- Cramer's V (effect size): {{{cramersV}}}

Based on these results, provide a concise, easy-to-understand interpretation broken into two clear paragraphs.
- **Paragraph 1: Main Finding.** Start with a sentence stating the purpose of the test. Then, report the main finding in a single sentence using APA style. For example: "A chi-square test of independence was conducted to determine whether there is an association between '{{{rowVar}}}' and '{{{colVar}}}'. The analysis revealed a statistically {significant/non-significant} association, χ²({{{df}}}, N = {{{totalObservations}}}) = {{{chi2}}}, p = {{{pValue}}}." (Use p < .05 as the threshold for significance).
- **Paragraph 2: Effect Size and Practical Implications.** In a new paragraph, explain the strength of the association using Cramer's V. General guidelines: <0.1 is negligible, 0.1-0.2 is weak, 0.2-0.4 is moderate, 0.4-0.6 is relatively strong, >0.6 is strong. Briefly explain what this means in practical terms for the relationship between the variables.
- Ensure each section is a distinct paragraph separated by a line break.
- Do not use markdown for emphasis, use plain text.
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