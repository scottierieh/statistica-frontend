export interface AnalysisValidation {
    id: string;
    name: string;
    category: string;
    subCategory?: string;
    pythonPackages: string[];
    hasCrossCheck: boolean; // Cross-check 문서 존재 여부
  }
  
  export const allAnalysisData: AnalysisValidation[] = [
    // Descriptive
    { id: 'descriptive-stats', name: 'Descriptive Statistics', category: 'Descriptive', pythonPackages: ['pandas', 'numpy', 'scipy'], hasCrossCheck: true },
    { id: 'frequency-analysis', name: 'Frequency Analysis', category: 'Descriptive', pythonPackages: ['pandas', 'numpy'], hasCrossCheck: false },
    { id: 'variability-analysis', name: 'Variability Analysis', category: 'Descriptive', pythonPackages: ['pandas', 'numpy', 'scipy'], hasCrossCheck: false },
  
    // Assumptions
    { id: 'normality-test', name: 'Normality Test', category: 'Assumptions', pythonPackages: ['scipy', 'statsmodels'], hasCrossCheck: false },
    { id: 'homogeneity-test', name: 'Homogeneity of Variance', category: 'Assumptions', pythonPackages: ['scipy', 'pingouin'], hasCrossCheck: false },
    { id: 'outlier-detection', name: 'Outlier Detection', category: 'Assumptions', pythonPackages: ['scipy', 'numpy'], hasCrossCheck: false },
    { id: 'linearity-check', name: 'Linearity Check', category: 'Assumptions', pythonPackages: ['statsmodels', 'scipy'], hasCrossCheck: false },
    { id: 'autocorrelation-test', name: 'Autocorrelation Test', category: 'Assumptions', pythonPackages: ['statsmodels'], hasCrossCheck: false },
    { id: 'influence-diagnostics', name: 'Influence Diagnostics', category: 'Assumptions', pythonPackages: ['statsmodels'], hasCrossCheck: false },
  
    // Comparison - T-Tests
    { id: 'one-sample-ttest', name: 'One-Sample T-Test', category: 'Comparison', subCategory: 'T-Tests', pythonPackages: ['scipy', 'pingouin'], hasCrossCheck: false },
    { id: 'independent-samples-ttest', name: 'Independent Samples T-Test', category: 'Comparison', subCategory: 'T-Tests', pythonPackages: ['scipy', 'pingouin'], hasCrossCheck: false },
    { id: 'paired-samples-ttest', name: 'Paired Samples T-Test', category: 'Comparison', subCategory: 'T-Tests', pythonPackages: ['scipy', 'pingouin'], hasCrossCheck: false },
  
    // Comparison - ANOVA
    { id: 'one-way-anova', name: 'One-Way ANOVA', category: 'Comparison', subCategory: 'ANOVA', pythonPackages: ['scipy', 'statsmodels', 'pingouin'], hasCrossCheck: false },
    { id: 'two-way-anova', name: 'Two-Way ANOVA', category: 'Comparison', subCategory: 'ANOVA', pythonPackages: ['statsmodels', 'pingouin'], hasCrossCheck: false },
    { id: 'ancova', name: 'Analysis of Covariance (ANCOVA)', category: 'Comparison', subCategory: 'ANOVA', pythonPackages: ['statsmodels', 'pingouin'], hasCrossCheck: false },
    { id: 'manova', name: 'Multivariate ANOVA (MANOVA)', category: 'Comparison', subCategory: 'ANOVA', pythonPackages: ['statsmodels'], hasCrossCheck: false },
    { id: 'repeated-measures-anova', name: 'One-way RM ANOVA', category: 'Comparison', subCategory: 'ANOVA', pythonPackages: ['pingouin', 'statsmodels'], hasCrossCheck: false },
    { id: 'Two-repeated-measures-anova', name: 'Two-way RM ANOVA', category: 'Comparison', subCategory: 'ANOVA', pythonPackages: ['pingouin', 'statsmodels'], hasCrossCheck: false },
  
    // Comparison - Non-Parametric
    { id: 'mann-whitney', name: 'Mann-Whitney U Test', category: 'Comparison', subCategory: 'Non-Parametric', pythonPackages: ['scipy', 'pingouin'], hasCrossCheck: false },
    { id: 'wilcoxon', name: 'Wilcoxon Signed-Rank Test', category: 'Comparison', subCategory: 'Non-Parametric', pythonPackages: ['scipy', 'pingouin'], hasCrossCheck: false },
    { id: 'kruskal-wallis', name: 'Kruskal-Wallis H-Test', category: 'Comparison', subCategory: 'Non-Parametric', pythonPackages: ['scipy', 'pingouin'], hasCrossCheck: false },
    { id: 'friedman', name: 'Friedman Test', category: 'Comparison', subCategory: 'Non-Parametric', pythonPackages: ['scipy', 'pingouin'], hasCrossCheck: false },
  
    // Relationship - Relationship Analysis
    { id: 'correlation', name: 'Correlation Analysis', category: 'Relationship', subCategory: 'Relationship Analysis', pythonPackages: ['scipy', 'pingouin', 'pandas'], hasCrossCheck: false },
    { id: 'crosstab', name: 'Crosstab & Chi-Squared', category: 'Relationship', subCategory: 'Relationship Analysis', pythonPackages: ['scipy', 'pandas'], hasCrossCheck: false },
  
    // Relationship - Regression Analysis
    { id: 'regression-simple', name: 'Simple Linear Regression', category: 'Relationship', subCategory: 'Regression Analysis', pythonPackages: ['statsmodels', 'scipy'], hasCrossCheck: false },
    { id: 'regression-multiple', name: 'Multiple Linear Regression', category: 'Relationship', subCategory: 'Regression Analysis', pythonPackages: ['statsmodels', 'scipy'], hasCrossCheck: false },
    { id: 'regression-polynomial', name: 'Polynomial Regression', category: 'Relationship', subCategory: 'Regression Analysis', pythonPackages: ['statsmodels', 'numpy'], hasCrossCheck: false },
    { id: 'logistic-regression', name: 'Logistic Regression', category: 'Relationship', subCategory: 'Regression Analysis', pythonPackages: ['statsmodels', 'sklearn'], hasCrossCheck: false },
    { id: 'lasso-regression', name: 'Lasso Regression', category: 'Relationship', subCategory: 'Regression Analysis', pythonPackages: ['sklearn'], hasCrossCheck: false },
    { id: 'ridge-regression', name: 'Ridge Regression', category: 'Relationship', subCategory: 'Regression Analysis', pythonPackages: ['sklearn'], hasCrossCheck: false },
    { id: 'robust-regression', name: 'Robust Regression', category: 'Relationship', subCategory: 'Regression Analysis', pythonPackages: ['statsmodels'], hasCrossCheck: false },
    { id: 'glm', name: 'Generalized Linear Model (GLM)', category: 'Relationship', subCategory: 'Regression Analysis', pythonPackages: ['statsmodels'], hasCrossCheck: false },
  
    // Relationship - Model Interpretation
    { id: 'relative-importance', name: 'Relative Importance', category: 'Relationship', subCategory: 'Model Interpretation', pythonPackages: ['statsmodels', 'sklearn'], hasCrossCheck: false },
    { id: 'feature-importance', name: 'Feature Importance', category: 'Relationship', subCategory: 'Model Interpretation', pythonPackages: ['sklearn', 'shap'], hasCrossCheck: false },
  
    // Predictive - Classification
    { id: 'discriminant', name: 'Linear Discriminant Analysis (LDA)', category: 'Predictive', subCategory: 'Classification', pythonPackages: ['sklearn'], hasCrossCheck: false },
    { id: 'decision-tree', name: 'Decision Tree', category: 'Predictive', subCategory: 'Classification', pythonPackages: ['sklearn'], hasCrossCheck: false },
    { id: 'gbm', name: 'Gradient Boosting (GBM)', category: 'Predictive', subCategory: 'Classification', pythonPackages: ['sklearn', 'xgboost'], hasCrossCheck: false },
    { id: 'random-forest', name: 'Random Forest', category: 'Predictive', subCategory: 'Classification', pythonPackages: ['sklearn'], hasCrossCheck: false },
    { id: 'xgboost', name: 'XGBoost', category: 'Predictive', subCategory: 'Classification', pythonPackages: ['xgboost'], hasCrossCheck: false },
    { id: 'svm', name: 'Support Vector Machine (SVM)', category: 'Predictive', subCategory: 'Classification', pythonPackages: ['sklearn'], hasCrossCheck: false },
    { id: 'knn', name: 'K-Nearest Neighbors (KNN)', category: 'Predictive', subCategory: 'Classification', pythonPackages: ['sklearn'], hasCrossCheck: false },
    { id: 'naive-bayes', name: 'Naive Bayes', category: 'Predictive', subCategory: 'Classification', pythonPackages: ['sklearn'], hasCrossCheck: false },
  
    // Predictive - Survival Analysis
    { id: 'survival', name: 'Survival Analysis', category: 'Predictive', subCategory: 'Survival Analysis', pythonPackages: ['lifelines'], hasCrossCheck: false },
  
    // Predictive - Model Evaluation
    { id: 'cross-validation', name: 'Cross-Validation', category: 'Predictive', subCategory: 'Model Evaluation', pythonPackages: ['sklearn'], hasCrossCheck: false },
  
    // Econometrics - Causal Inference
    { id: 'did', name: 'Difference-in-Differences (DID)', category: 'Econometrics', subCategory: 'Causal Inference', pythonPackages: ['statsmodels', 'linearmodels'], hasCrossCheck: false },
    { id: 'psm', name: 'Propensity Score Matching (PSM)', category: 'Econometrics', subCategory: 'Causal Inference', pythonPackages: ['causalinference', 'sklearn'], hasCrossCheck: false },
    { id: 'rdd', name: 'Regression Discontinuity (RDD)', category: 'Econometrics', subCategory: 'Causal Inference', pythonPackages: ['rdrobust', 'statsmodels'], hasCrossCheck: false },
    { id: 'iv', name: 'Instrumental Variables (IV)', category: 'Econometrics', subCategory: 'Causal Inference', pythonPackages: ['linearmodels', 'statsmodels'], hasCrossCheck: false },
  
    // Econometrics - Advanced Econometrics
    { id: 'var', name: 'Vector Autoregression (VAR)', category: 'Econometrics', subCategory: 'Advanced Econometrics', pythonPackages: ['statsmodels'], hasCrossCheck: false },
    { id: 'gmm', name: 'Generalized Method of Moments (GMM)', category: 'Econometrics', subCategory: 'Advanced Econometrics', pythonPackages: ['linearmodels'], hasCrossCheck: false },
    { id: 'dsge', name: 'DSGE Simulation', category: 'Econometrics', subCategory: 'Advanced Econometrics', pythonPackages: ['dynare', 'numpy'], hasCrossCheck: false },
  
    // Structural - Factor Analysis
    { id: 'reliability', name: 'Reliability (Cronbach)', category: 'Structural', subCategory: 'Factor Analysis', pythonPackages: ['pingouin', 'factor_analyzer'], hasCrossCheck: false },
    { id: 'efa', name: 'Exploratory Factor Analysis (EFA)', category: 'Structural', subCategory: 'Factor Analysis', pythonPackages: ['factor_analyzer'], hasCrossCheck: false },
    { id: 'cfa', name: 'Confirmatory Factor Analysis (CFA)', category: 'Structural', subCategory: 'Factor Analysis', pythonPackages: ['semopy', 'factor_analyzer'], hasCrossCheck: false },
    { id: 'pca', name: 'Principal Component Analysis (PCA)', category: 'Structural', subCategory: 'Factor Analysis', pythonPackages: ['sklearn'], hasCrossCheck: false },
    { id: 'mds', name: 'Multidimensional Scaling (MDS)', category: 'Structural', subCategory: 'Factor Analysis', pythonPackages: ['sklearn'], hasCrossCheck: false },
  
    // Structural - Path Analysis
    { id: 'mediation', name: 'Mediation Analysis', category: 'Structural', subCategory: 'Path Analysis', pythonPackages: ['statsmodels', 'pingouin'], hasCrossCheck: false },
    { id: 'moderation', name: 'Moderation Analysis', category: 'Structural', subCategory: 'Path Analysis', pythonPackages: ['statsmodels'], hasCrossCheck: false },
    { id: 'sem', name: 'Structural Equation Modeling (SEM)', category: 'Structural', subCategory: 'Path Analysis', pythonPackages: ['semopy'], hasCrossCheck: false },
  
    // Structural - Network Analysis
    { id: 'sna', name: 'Social Network Analysis', category: 'Structural', subCategory: 'Network Analysis', pythonPackages: ['networkx'], hasCrossCheck: false },
  
    // Clustering - Distance-based
    { id: 'kmeans', name: 'K-Means Clustering', category: 'Clustering', subCategory: 'Distance-based', pythonPackages: ['sklearn'], hasCrossCheck: false },
    { id: 'kmedoids', name: 'K-Medoids Clustering', category: 'Clustering', subCategory: 'Distance-based', pythonPackages: ['sklearn_extra'], hasCrossCheck: false },
  
    // Clustering - Density-based
    { id: 'dbscan', name: 'DBSCAN', category: 'Clustering', subCategory: 'Density-based', pythonPackages: ['sklearn'], hasCrossCheck: false },
    { id: 'hdbscan', name: 'HDBSCAN', category: 'Clustering', subCategory: 'Density-based', pythonPackages: ['hdbscan'], hasCrossCheck: false },
  
    // Clustering - Hierarchical-based
    { id: 'hca', name: 'Hierarchical Clustering (HCA)', category: 'Clustering', subCategory: 'Hierarchical-based', pythonPackages: ['scipy', 'sklearn'], hasCrossCheck: false },
  
    // Time Series - Exploratory Stage
    { id: 'trend-analysis', name: 'Trend Analysis', category: 'Time Series', subCategory: 'Exploratory Stage', pythonPackages: ['statsmodels', 'scipy'], hasCrossCheck: false },
    { id: 'seasonal-decomposition', name: 'Seasonal Decomposition', category: 'Time Series', subCategory: 'Exploratory Stage', pythonPackages: ['statsmodels'], hasCrossCheck: false },
    { id: 'rolling-statistics', name: 'Rolling Statistics', category: 'Time Series', subCategory: 'Exploratory Stage', pythonPackages: ['pandas'], hasCrossCheck: false },
    { id: 'structural-break', name: 'Structural Break', category: 'Time Series', subCategory: 'Exploratory Stage', pythonPackages: ['statsmodels'], hasCrossCheck: false },
    { id: 'change-point', name: 'Change Point Detection', category: 'Time Series', subCategory: 'Exploratory Stage', pythonPackages: ['ruptures'], hasCrossCheck: false },
  
    // Time Series - Diagnostic Stage
    { id: 'acf-pacf', name: 'ACF/PACF', category: 'Time Series', subCategory: 'Diagnostic Stage', pythonPackages: ['statsmodels'], hasCrossCheck: false },
    { id: 'stationarity', name: 'ADF Test (Stationarity)', category: 'Time Series', subCategory: 'Diagnostic Stage', pythonPackages: ['statsmodels'], hasCrossCheck: false },
    { id: 'ljung-box', name: 'Ljung-Box Test', category: 'Time Series', subCategory: 'Diagnostic Stage', pythonPackages: ['statsmodels'], hasCrossCheck: false },
    { id: 'arch-lm-test', name: 'ARCH-LM Test', category: 'Time Series', subCategory: 'Diagnostic Stage', pythonPackages: ['statsmodels'], hasCrossCheck: false },
  
    // Time Series - Modeling Stage
    { id: 'exponential-smoothing', name: 'Exponential Smoothing', category: 'Time Series', subCategory: 'Modeling Stage', pythonPackages: ['statsmodels'], hasCrossCheck: false },
    { id: 'arima', name: 'ARIMA / SARIMAX', category: 'Time Series', subCategory: 'Modeling Stage', pythonPackages: ['statsmodels', 'pmdarima'], hasCrossCheck: false },
  
    // Time Series - Evaluation Stage
    { id: 'forecast-evaluation', name: 'Forecast Model Evaluation', category: 'Time Series', subCategory: 'Evaluation Stage', pythonPackages: ['sklearn', 'statsmodels'], hasCrossCheck: false },
    { id: 'demand-forecasting', name: 'Demand Forecasting', category: 'Time Series', subCategory: 'Evaluation Stage', pythonPackages: ['statsmodels', 'prophet'], hasCrossCheck: false },
    { id: 'forecast-horizon', name: 'Forecast Horizon', category: 'Time Series', subCategory: 'Evaluation Stage', pythonPackages: ['statsmodels'], hasCrossCheck: false },
  ];
  