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
  prompt: `You are an expert statistician. You are to interpret the results of a one-way ANOVA test.

The user is comparing the means of the numeric variable '{{{valueVar}}}' across different groups defined by the categorical variable '{{{groupVar}}}'.

Here are the results:
- F-statistic: {{{fStat}}}
- p-value: {{{pValue}}}

Based on these results, provide a concise, easy-to-understand interpretation.
- Start by stating the conclusion: is there a statistically significant difference in the means of '{{{valueVar}}}' across the groups of '{{{groupVar}}}'? (Use a significance level of alpha = 0.05).
- Explain what the p-value means in this context.
- Explain what the F-statistic represents in simple terms.
- Keep the entire interpretation to 2-3 short paragraphs.
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
