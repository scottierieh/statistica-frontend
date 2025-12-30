'use server';

import {ai} from '@/ai/genkit';
import {z} from 'zod';

// Define the structure for a single recommendation
const RecommendationSchema = z.object({
  analysis_name: z.string().describe("The name of the recommended statistical analysis (e.g., 'T-Test', 'Correlation', 'ANOVA')."),
  reason: z.string().describe("A brief, clear explanation of why this analysis is suitable for the given data structure and user description."),
  required_variables: z.array(z.string()).describe("A list of example variable names from the data summary that would be used for this analysis."),
});

const RecommendAnalysisInputSchema = z.object({
  dataSummary: z.string().describe("A JSON string describing the columns of a dataset, including name, type, and basic statistics."),
  dataDescription: z.string().optional().describe("The user's own description of what the data is about. This provides crucial context."),
});
export type RecommendAnalysisInput = z.infer<typeof RecommendAnalysisInputSchema>;

const RecommendAnalysisOutputSchema = z.object({
  recommendations: z.array(RecommendationSchema).describe("An array of 3-5 recommended statistical analyses."),
});
export type RecommendAnalysisOutput = z.infer<typeof RecommendAnalysisOutputSchema>;

export async function recommendAnalysis(input: RecommendAnalysisInput): Promise<RecommendAnalysisOutput> {
  return recommendAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recommendAnalysisPrompt',
  input: {schema: RecommendAnalysisInputSchema},
  output: {schema: RecommendAnalysisOutputSchema},
  prompt: `You are an expert data analyst and statistical consultant. Your role is to analyze a summary of a dataset AND the user's description of it, then recommend the most appropriate statistical analyses.

**User's Data Description:**
{{{dataDescription}}}

**Data Summary (column names, types, and stats):**
{{{dataSummary}}}

**Instructions:**
1.  **Integrate Context:** Use the user's data description to understand the context and purpose of the data. This is more important than the raw column names.
2.  **Infer Research Questions:** Based on the data summary and the user's description, infer potential research questions.
3.  **Recommend Analyses:** Suggest 3 to 5 relevant statistical analyses that would answer these questions. For example:
    - If the user describes a "pre-test vs. post-test" study and there are two related numeric columns, recommend a "Paired Samples T-Test".
    - If the description mentions "customer satisfaction survey with demographics" and there are numeric 'satisfaction' columns and a categorical 'region' column, recommend "One-Way ANOVA".
    - If the description is "tracking sales over time", recommend "Time Series Analysis".
4.  **Provide a Clear 'Reason':** For each recommendation, explain concisely why it's suitable, connecting it to the user's description.
5.  **List 'required_variables':** List the actual variable names from the data summary that would be used for this analysis.
`,
});

const recommendAnalysisFlow = ai.defineFlow(
  {
    name: 'recommendAnalysisFlow',
    inputSchema: RecommendAnalysisInputSchema,
    outputSchema: RecommendAnalysisOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

