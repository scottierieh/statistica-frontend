
'use server';

import {ai} from '@/ai/genkit';
import {z} from 'zod';

// Define the structure for a single recommendation
const RecommendationSchema = z.object({
  analysis_name: z
    .string()
    .describe(
      "The name of the recommended statistical analysis (e.g., 'T-Test', 'Correlation', 'ANOVA')."
    ),
  category: z
    .string()
    .describe(
      "The general category of the analysis from the provided list (e.g., 'Comparison', 'Relationship', 'Predictive')."
    ),
  reason: z
    .string()
    .describe(
      "A brief, clear explanation of why this analysis is suitable for the given data structure and user description."
    ),
  required_variables: z
    .array(z.string())
    .describe(
      'A list of example variable names from the data summary that would be used for this analysis.'
    ),
});

const RecommendAnalysisInputSchema = z.object({
  dataSummary: z
    .string()
    .describe(
      'A JSON string describing the columns of a dataset, including name, type, and basic statistics.'
    ),
  dataDescription: z
    .string()
    .optional()
    .describe(
      "The user's own description of what the data is about and what they want to find out. This provides crucial context."
    ),
});
export type RecommendAnalysisInput = z.infer<
  typeof RecommendAnalysisInputSchema
>;

const RecommendAnalysisOutputSchema = z.object({
  recommendations: z
    .array(RecommendationSchema)
    .describe('An array of 3-5 recommended statistical analyses.'),
});
export type RecommendAnalysisOutput = z.infer<
  typeof RecommendAnalysisOutputSchema
>;

export async function recommendAnalysis(
  input: RecommendAnalysisInput
): Promise<RecommendAnalysisOutput> {
  return recommendAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recommendAnalysisPrompt',
  input: {schema: RecommendAnalysisInputSchema},
  output: {schema: RecommendAnalysisOutputSchema},
  prompt: `You are an expert data analyst and statistical consultant. Your role is to analyze a summary of a dataset AND the user's description of it, then recommend the most appropriate statistical analyses.

**User's Data Description & Goals:**
{{{dataDescription}}}

**Data Summary (column names, types, and stats):**
{{{dataSummary}}}

**Available Statistical Analyses & Categories:**
You MUST choose from the following list of available analyses and provide the corresponding category for each recommendation.
- **Descriptive**: Descriptive Statistics, Frequency Analysis, Variability Analysis
- **Assumptions**: Normality Test, Homogeneity of Variance, Outlier Detection, Linearity Check, Autocorrelation Test, Influence Diagnostics
- **Comparison**: T-Tests (One-Sample, Independent, Paired), Welch's T-test, ANOVA (One-Way, Two-Way), ANCOVA, MANOVA, Repeated Measures ANOVA, Non-parametric tests (Mann-Whitney, Wilcoxon, Kruskal-Wallis, Friedman, McNemar)
- **Relationship**: Correlation, Crosstab & Chi-Squared, Simple Linear Regression, Multiple Linear Regression, Polynomial Regression, Logistic Regression, Lasso Regression, Ridge Regression, Robust Regression, GLM
- **Predictive**: Linear Discriminant Analysis, Decision Tree, Gradient Boosting, Random Forest, Survival Analysis
- **Structural**: Factor Analysis (EFA, PCA), Reliability Analysis (Cronbach's Alpha), Mediation Analysis, Moderation Analysis, Social Network Analysis
- **Clustering**: K-Means, K-Medoids, Hierarchical Clustering (HCA), DBSCAN, HDBSCAN
- **Time Series**: Trend Analysis, Seasonal Decomposition, Time Series Forecasting (ARIMA, Exponential Smoothing)
- **Text Analysis**: Sentiment Analysis, Topic Modeling (LDA), Word Cloud
- **Marketing**: Importance-Performance Analysis (IPA), TURF Analysis, Conjoint Analysis, RFM Analysis, LTV Prediction
- **HR**: Turnover/Retention Analysis, Key Talent Risk Matrix
- **Finance**: Portfolio Optimization, Factor Analysis, Value at Risk (VaR)
- **Quality Control**: Control Charts, Process Capability Analysis (Cp, Cpk)
- **Supply Chain**: Linear Programming, Inventory Optimization (EOQ)


**Instructions:**
1.  **Analyze Context:** Use the user's data description and goals to understand the purpose of the data.
2.  **Examine Data Structure:** Review the data summary to understand variable types (numeric, categorical).
3.  **Recommend 3 to 5 Analyses:** Suggest 3 to 5 relevant statistical analyses **strictly from the "Available Statistical Analyses" list above**.
4.  **Provide Category:** For each recommendation, you MUST specify its correct category (e.g., 'Comparison', 'Relationship').
5.  **Provide Rationale:** For each recommendation, explain concisely why it is suitable, connecting it to both the data structure and the user's goals.
6.  **Specify Variables:** List the actual variable names from the data summary that would be required for each recommended analysis.
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
