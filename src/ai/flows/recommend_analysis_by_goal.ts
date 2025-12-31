'use server';

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const RecommendationSchema = z.object({
  analysis_name: z.string().describe("The name of the recommended statistical analysis (e.g., 'T-Test', 'Correlation', 'ANOVA')."),
  reason: z.string().describe("A brief, clear explanation of why this analysis is suitable for the given research goal."),
  required_variables: z.array(z.string()).describe("A list of the types of variables needed (e.g., '1 Categorical', '2 Numeric')."),
});

const RecommendAnalysisByGoalInputSchema = z.object({
  researchGoal: z.string().describe("The user's description of their research objective or question."),
});
export type RecommendAnalysisByGoalInput = z.infer<typeof RecommendAnalysisByGoalInputSchema>;

const RecommendAnalysisByGoalOutputSchema = z.object({
  recommendations: z.array(RecommendationSchema).describe("An array of 3-5 recommended statistical analyses."),
});
export type RecommendAnalysisByGoalOutput = z.infer<typeof RecommendAnalysisByGoalOutputSchema>;

export async function recommendAnalysisByGoal(input: RecommendAnalysisByGoalInput): Promise<RecommendAnalysisByGoalOutput> {
  return recommendAnalysisByGoalFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recommendAnalysisByGoalPrompt',
  input: {schema: RecommendAnalysisByGoalInputSchema},
  output: {schema: RecommendAnalysisByGoalOutputSchema},
  prompt: `You are an expert data analyst and statistical consultant. Your role is to analyze a user's research goal and recommend the most appropriate statistical analyses.

**User's Research Goal:**
"{{{researchGoal}}}"

**Instructions:**
1.  **Analyze the Goal:** Carefully interpret the user's objective. Identify the core task (e.g., comparing groups, finding relationships, predicting outcomes).
2.  **Recommend 3-5 Analyses:** Suggest a list of the most relevant statistical tests.
3.  **Provide a Clear 'Reason':** For each recommendation, explain *why* it's suitable in simple terms.
4.  **List 'required_variables':** Specify the *types* and *number* of variables needed for each analysis. For example: "1 Categorical (2 groups), 1 Numeric" or "2+ Numeric".

**Example:**
If the user's goal is "See if there is a difference in test scores between male and female students", you might recommend:
-   **analysis_name**: "Independent Samples T-Test"
-   **reason**: "This test is used to compare the average scores between two independent groups (male and female)."
-   **required_variables**: ["1 Categorical (2 groups)", "1 Numeric"]

Your response must be strictly in the format defined by the output schema.
`,
});

const recommendAnalysisByGoalFlow = ai.defineFlow(
  {
    name: 'recommendAnalysisByGoalFlow',
    inputSchema: RecommendAnalysisByGoalInputSchema,
    outputSchema: RecommendAnalysisByGoalOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
