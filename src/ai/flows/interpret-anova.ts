'use server';

/**
 * @fileOverview Interprets the results of an ANOVA test.
 *
 * This flow is deprecated. The interpretation logic has been moved to the Python backend.
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
  groupStats: z.string().describe('A JSON string of descriptive statistics for each group.'),
  postHocResults: z.string().optional().describe('A JSON string of post-hoc test results (e.g., Tukey HSD).'),
});
export type InterpretAnovaInput = z.infer<typeof InterpretAnovaInputSchema>;

const InterpretAnovaOutputSchema = z.object({
  interpretation: z.string().describe('A human-readable interpretation of the ANOVA results.'),
});
export type InterpretAnovaOutput = z.infer<typeof InterpretAnovaOutputSchema>;

export async function interpretAnova(input: InterpretAnovaInput): Promise<InterpretAnovaOutput> {
  // This function is deprecated.
  // The backend now generates the interpretation directly.
  return Promise.resolve({ interpretation: "This AI flow is deprecated and should not be called." });
}

const interpretAnovaFlow = ai.defineFlow(
  {
    name: 'interpretAnovaFlow',
    inputSchema: InterpretAnovaInputSchema,
    outputSchema: InterpretAnovaOutputSchema,
  },
  async input => {
     return { interpretation: "This AI flow is deprecated and should not be called." };
  }
);
