'use server';

/**
 * @fileOverview Interprets the results of an ANOVA test.
 *
 * - interpretAnova - A function that provides an interpretation of ANOVA results.
 * - InterpretAnovaInput - The input type for the interpretAnova function.
 * - InterpretAnovaOutput - The return type for the interpretAnova function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InterpretAnovaInputSchema = z.object({
  fStat: z.number().describe('The F-statistic from the ANOVA test.'),
  dfBetween: z.number().describe('The degrees of freedom between groups.'),
  dfWithin: z.number().describe('The degrees of freedom within groups.'),
  pValue: z.number().describe('The p-value from the ANOVA test.'),
  groupVar: z.string().describe('The name of the categorical grouping variable.'),
  valueVar: z.string().describe('The name of the numeric value variable.'),
});
export type InterpretAnovaInput = z.infer<typeof InterpretAnovaInputSchema>;

const InterpretAnovaOutputSchema = z.object({
  interpretation: z.string().describe('A human-readable interpretation of the ANOVA results.'),
});
export type InterpretAnovaOutput = z.infer<typeof InterpretAnovaOutputSchema>;

export async function interpretAnova(input: InterpretAnovaInput): Promise<InterpretAnovaOutput> {
  return interpretAnovaFlow(input);
}

const prompt = ai.definePrompt({
  name: 'interpretAnovaPrompt',
  input: {schema: InterpretAnovaInputSchema},
  output: {schema: InterpretAnovaOutputSchema},
  prompt: `You are an expert statistician. You are to interpret the results of a one-way ANOVA test in APA style.

The user is comparing the means of the numeric variable '{{{valueVar}}}' across different groups defined by the categorical variable '{{{groupVar}}}'.

Here are the results:
- F-statistic: {{{fStat}}}
- Degrees of Freedom: ({{{dfBetween}}}, {{{dfWithin}}})
- p-value: {{{pValue}}}

Based on these results, provide a concise, easy-to-understand interpretation broken into clear paragraphs.
- **Paragraph 1:** Start with a clear topic sentence summarizing the main finding. Then, state the conclusion in APA style, including the F-statistic, degrees of freedom, and p-value. For example: A one-way ANOVA revealed a statistically significant difference in the means of '{{{valueVar}}}' across the groups of '{{{groupVar}}}', *F*({{{dfBetween}}}, {{{dfWithin}}}) = {{{fStat}}}, *p* = {{{pValue}}}.
- **Paragraph 2:** In a new paragraph, explain what the p-value and F-statistic represent in this context in simple terms.
- **Paragraph 3:** Provide a concluding sentence about the practical implication of the finding.
- Ensure each section is a distinct paragraph separated by a line break.
- Do not use markdown, just plain text.
`, 
});

const interpretAnovaFlow = ai.defineFlow(
  {
    name: 'interpretAnovaFlow',
    inputSchema: InterpretAnovaInputSchema,
    outputSchema: InterpretAnovaOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
