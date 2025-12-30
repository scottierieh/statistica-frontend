export type GridItem = {
    category: string;
    title: string;
    image?: string;
  };
  
  export const gridItems: GridItem[] = [
    // Row 1
    { category: "Comparison", title: "T-Tests & ANOVA" },
    { category: "Relationship", title: "Correlation & Regression" },
    { category: "Survey", title: "Net Promoter Score (NPS)" },
    { category: "Marketing", title: "Customer Lifetime Value (LTV)" },
    { category: "Predictive", title: "Logistic Regression for Churn" },
    { category: "Structural", title: "Factor Analysis (EFA)" },
  
    // Row 2
    { category: "Clustering", title: "K-Means Customer Segmentation" },
    { category: "Pricing", title: "Price Sensitivity Meter (PSM)" },
    { category: "Time Series", title: "Sales Forecasting with ARIMA" },
    { category: "Strategy", title: "Importance-Performance Analysis (IPA)" },
    { category: "Text Analysis", title: "Sentiment Analysis of Reviews" },
    { category: "Operations", title: "Quality Control Charts" },
  
    // Row 3
    { category: "Product", title: "Conjoint Analysis for Feature Preference" },
    { category: "Marketing", title: "TURF Analysis for Line Optimization" },
    { category: "HR", title: "Employee Engagement Drivers" },
    { category: "Operations", title: "Data Envelopment Analysis (DEA)" },
    { category: "Finance", title: "Portfolio Optimization Models" },
    { category: "Healthcare", title: "Survival Analysis of Patient Outcomes" },
  
    // duplicates for smooth looping
    { category: "Comparison", title: "T-Tests & ANOVA" },
    { category: "Relationship", title: "Correlation & Regression" },
    { category: "Survey", title: "Net Promoter Score (NPS)" },
    { category: "Marketing", title: "Customer Lifetime Value (LTV)" },
    { category: "Predictive", title: "Logistic Regression for Churn" },
    { category: "Structural", title: "Factor Analysis (EFA)" },
  ];
  