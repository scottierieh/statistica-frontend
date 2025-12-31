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

**Available Statistical Analyses:**
You MUST choose from the following list of available analyses:
- Descriptive Statistics
- Frequency Analysis
- T-Tests (One-Sample, Independent, Paired)
- ANOVA (One-Way, Two-Way)
- Correlation
- Simple & Multiple Linear Regression
- Logistic Regression
- Chi-Squared Test (Crosstab)
- Reliability Analysis (Cronbach's Alpha)
- Factor Analysis (EFA, PCA)
- Mediation & Moderation Analysis
- Cluster Analysis (K-Means, Hierarchical)
- Time Series Analysis (Decomposition, ARIMA)
- Survival Analysis
- Non-parametric tests (Mann-Whitney, Wilcoxon, Kruskal-Wallis, Friedman)
- Conjoint Analysis (CBC)
- MaxDiff Analysis
- TURF Analysis
- Structural Equation Modeling (SEM)
- Importance-Performance Analysis (IPA)
- Data Envelopment Analysis (DEA)
- Net Promoter Score (NPS) Analysis

**Instructions:**
1.  **Analyze Context:** Use the user's data description and goals to understand the purpose of the data.
2.  **Examine Data Structure:** Review the data summary to understand variable types (numeric, categorical).
3.  **Recommend from List:** Suggest 3 to 5 relevant statistical analyses **strictly from the "Available Statistical Analyses" list above**.
4.  **Provide Rationale:** For each recommendation, explain concisely why it is suitable, connecting it to both the data structure and the user's goals.
5.  **Specify Variables:** List the actual variable names from the data summary that would be required for each recommended analysis.
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
