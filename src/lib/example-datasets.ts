

import { Car, Coffee, Database,UserX, Package, SlidersHorizontal, CalendarDays, Shield, ShieldCheck, Timer,  CheckSquareIcon, LucideIcon, BookOpen, Users, BrainCircuit, FilterIcon, Network, TrendingUp, FlaskConical, Binary, Copy, Sigma, BarChart, Columns, Target, Component, HeartPulse, Feather, GitBranch, Smile, Scaling, AreaChart, LineChart, Layers, Map, Repeat, ScanSearch, Atom, MessagesSquare, Share2, GitCommit, DollarSign, ThumbsUp, ClipboardList, Handshake, Replace, Activity, Palette } from "lucide-react";
import { likertScaleData } from "./example-datasets/likert-scale-data";
import { studentPerformanceData } from "./example-datasets/student-performance";
import { workStressData } from "./example-datasets/work-stress-data";
import { stressSupportData } from "./example-datasets/stress-support-data";
import { nonparametricData } from "./example-datasets/nonparametric-data";
import { customerSegmentsData } from "./example-datasets/customer-segments";
import { manovaData } from "./example-datasets/manova-data";
import { tTestData } from "./example-datasets/t-test-data";
import { regressionData } from "./example-datasets/regression-data";
import { conjointSmartphoneData } from "./example-datasets/conjoint-smartphone-data";
import { ipaRestaurantData } from "./example-datasets/ipa-restaurant-data";
import { admissionData } from "./example-datasets/admission-data";
import { survivalData } from "./example-datasets/survival-data";
import { twoWayAnovaData } from "./example-datasets/two-way-anova-data";
import { oneWayAnovaData } from "./example-datasets/one-way-anova-data";
import { abTestData } from "./example-datasets/ab-test-data";
import { gbmClassificationData, gbmRegressionData } from "./example-datasets/gbm-data";
import { funnelAnalysisData } from "./example-datasets/funnel-analysis-data";
import { metaAnalysisData } from "./example-datasets/meta-analysis-data";
import { timeSeriesData } from "./example-datasets/time-series-data";
import { rmAnovaData } from "./example-datasets/rm-anova-data";
import { crosstabData } from "./example-datasets/crosstab-data";
import { nonlinearRegressionData } from "./example-datasets/nonlinear-regression-data";
import { snaData } from "./example-datasets/sna-data";
import { restaurantReviewsData } from "./example-datasets/restaurant-reviews-data";
import { deaBankData } from "./example-datasets/dea-data";
import { cbcData } from "./example-datasets/cbc-data";
import { ahpData } from "./example-datasets/ahp-data";
import { didData } from "./example-datasets/did-data";
import { mcnemarData } from './example-datasets/mcnemar-data';
import { turfData } from './example-datasets/turf-data';
import { csatData } from './example-datasets/csat-data';
import { brandFunnelData } from './example-datasets/brand-funnel-data';
import { panelData } from './example-datasets/panel-data';
import { rfmData } from './example-datasets/rfm-data';
import { sqcData } from "./example-datasets/sqc-data";
import { attributeControlChartData } from "./example-datasets/attribute-control-chart-data";
import { ltvData } from './example-datasets/ltv-data';
import { paretoData } from './example-datasets/pareto-data';
import { gageRrData } from './example-datasets/gage-rr-data';
import { marketBasket100Data } from './example-datasets/market-basket-100';
import { irisData } from './example-datasets/iris-data';
import { associationData } from './example-datasets/association-data';
import { marketingAnalysisData } from './example-datasets/marketing-analysis-data';
import { hrTurnoverData } from './example-datasets/hr-turnover-data';
import { satisfactionEngagementData } from './example-datasets/satisfaction-engagement-data';
import { attendanceData } from './example-datasets/attendance-data';
import { headcountStabilityData } from './example-datasets/headcount-stability-data';
import { psmMarketingData } from "./example-datasets/psmMarketing-data";
import { demandForecastData } from './example-datasets/demand-forecast-data';
import { portfolioOptimizationData } from './example-datasets/portfolio-optimization-data';
import { factorAnalysisData } from './example-datasets/factor-analysis-data';
import { pairsTradingData } from './example-datasets/pairs-trading-data';
import { backtestingData } from './example-datasets/backtesting-data';
import { leadTimeData } from './example-datasets/lead-time-data';
import { eoqData } from './example-datasets/eoq-data';
import { thresholdOptimizationData } from './example-datasets/threshold-optimization-data';
import { costSensitiveData } from './example-datasets/cost-sensitive-data';
import { decisionRulesData } from './example-datasets/decision-rules-data';
import { reliabilityValidityData } from './example-datasets/reliability-validity-data';









type AnalysisType = 'stats' | 'correlation' |'associationData' | 'one-way-anova' | 'marketing-analysis'|'two-way-anova' | 'funnel-analysis'| 'ancova' |'ltv-prediction' | 'manova' | 'reliability' | 'visuals' | 'discriminant' | 'efa' | 'mediation' | 'moderation' | 'nonparametric' | 'hca' | 't-test' | 'regression' | 'logistic-regression' | 'glm' | 'kmeans' | 'kmedoids' | 'hdbscan' | 'frequency' | 'crosstab' | 'sem' | 'conjoint' | 'cbc' | 'ipa' | 'pca' | 'survival' | 'wordcloud' | 'gbm' | 'sentiment' | 'meta-analysis' | 'mds' | 'rm-anova' | 'dbscan' | 'nonlinear-regression' | 'sna' | 'topic-modeling' | 'dea' | 'ahp' | 'did' | 'delphi' | 'survey' | 'van-westendorp' | 'gabor-granger' | 'maxdiff' | 'binomial-test' | 'mixed-model' | 'classifier-comparison' | 'turf' | 'csat' | 'semantic-differential' | string;


export interface ExampleDataSet {
    id: string;
    name: string;
    description: string;
    icon: LucideIcon;
    analysisTypes: AnalysisType[];
    recommendedAnalysis?: AnalysisType;
    data: string;
}




export const exampleDatasets: ExampleDataSet[] = [
    {
        id: 'attribute-chart-data',
        name: 'Product Defects Data',
        description: 'Dataset for tracking product defects and sample sizes over time for attribute control charts.',
        icon: TrendingUp,
        analysisTypes: ['attribute-control-charts'],
        recommendedAnalysis: 'attribute-control-charts',
        data: attributeControlChartData,
    },
   
    {
        id: 'rfm-data',
        name: 'Transactional Data',
        description: 'Customer purchase history with IDs, dates, and amounts. Ideal for RFM analysis.',
        icon: Users,
        analysisTypes: ['rfm-analysis', 'stats'],
        data: rfmData,
    },
    {
        id: 'lead-time-data',
        name: 'Purchase Order Lead Time Data',
        description: 'PO data with stage dates (confirm, production, ship, arrival) for lead time decomposition.',
        icon: Timer,
        analysisTypes: ['lead-time-analysis'],
        recommendedAnalysis: 'lead-time-analysis',
        data: leadTimeData,
    },
    {
        id: 'marketing-analysis-data',
        name: 'Marketing Mix Data',
        description: 'Simulated weekly marketing spend and revenue data for MMM.',
        icon: BarChart,
        analysisTypes: ['roi-analysis'],
        data: marketingAnalysisData,
    },
    {
        id: 'sqc-data',
        name: 'Manufacturing Process Data',
        description: 'Subgroup-based measurements from a manufacturing line, suitable for SQC.',
        icon: CheckSquareIcon,
        analysisTypes: ['sqc'],
        data: sqcData,
    },
    {
        id: 'eoq-data',
        name: 'Inventory Data for EOQ',
        description: 'SKU data with demand, costs, and lead times for EOQ optimization.',
        icon: Package,
        analysisTypes: ['eoq-optimization'],
        recommendedAnalysis: 'eoq-optimization',
        data: eoqData,
    },
    {
        id: 'gage-rr-data',
        name: 'Product Defect Data',
        description: 'A list of defect types recorded in a manufacturing process.',
        icon: BarChart,
        analysisTypes: ['gage-rr'],
        data: gageRrData,
    },
    {
        id: 'funnel-analysis',
        name: 'User Funnel Events',
        description: 'Event log data for tracking user progression through a conversion funnel.',
        icon: FilterIcon,
        analysisTypes: ['funnel-analysis'],
        data: funnelAnalysisData,
    },

    {     id: 'rm-anova',
        name: 'Cognitive Training Study',
        description: 'A dataset tracking the cognitive scores of 15 subjects over four time points after a training program.',
        icon: Repeat,
        analysisTypes: ['rm-anova', 'stats'],
        data: rmAnovaData,
        recommendedAnalysis: 'repeated-measures-anova'
    },
    {
        id: 'portfolio-optimization',
        name: 'Stock Price History',
        description: 'Historical daily prices for several tech stocks. Ideal for portfolio optimization.',
        icon: TrendingUp,
        analysisTypes: ['portfolio-optimization' ],
        data: portfolioOptimizationData,
    },

    {
        id: 'pareto-data',
        name: 'Product Defect Data',
        description: 'A list of defect types recorded in a manufacturing process.',
        icon: BarChart,
        analysisTypes: ['pareto-analysis'],
        recommendedAnalysis: 'pareto-analysis',
        data: paretoData,
    },
    {
        id: 'pairs-trading-data',
        name: 'Pairs Trading Data (KO & PEP)',
        description: 'Daily prices for Coca-Cola and Pepsi - classic pairs trading candidates.',
        icon: TrendingUp,
        analysisTypes: ['pairs-trading'],
        recommendedAnalysis: 'pairs-trading',
        data: pairsTradingData,
    },
    {
        id: 'factor-analysis-data',
        name: 'Stock Returns Data',
        description: 'Daily returns for 5 tech stocks (AAPL, GOOGL, MSFT, AMZN, META) for factor analysis.',
        icon: GitBranch,
        analysisTypes: ['factor-analysis'],
        recommendedAnalysis: 'factor-analysis',
        data: factorAnalysisData,
    },
    {
        id: 'association',
        name: 'Market Basket (100 Items)',
        description: '100 transactions with various items for association rule mining.',
        icon: BarChart,
        analysisTypes: ['association'],
        data: associationData,
    },
    {
        id: 'marketing-analysis',
        name: 'Marketing Mix Data',
        description: 'Simulated weekly marketing spend and revenue data for MMM.',
        icon: BarChart,
        analysisTypes: ['roi-analysis'],
        data: marketingAnalysisData,
    },
    {
        id: 'demand-forecast',
        name: 'Demand Time Series Data',
        description: 'Time-series demand data suitable for demand forecasting and trend/seasonality analysis.',
        icon: CheckSquareIcon,
        analysisTypes: ['demand-forecast'],
        data: demandForecastData,
      },
    {
        id: 'ltv-data',
        name: 'LTV Data',
        description: 'Customer purchase history with IDs, dates, and amounts. Ideal for RFM analysis.',
        icon: Users,
        analysisTypes: ['rfm-analysis', 'stats', 'ltv-prediction'],
        data: ltvData,
    },
    {
        id: 'dea-bank-data',
        name: 'Bank Branch Efficiency',
        description: 'Inputs and outputs for multiple bank branches. Ideal for Data Envelopment Analysis.',
        icon: BarChart,
        analysisTypes: ['dea', 'stats'],
        data: deaBankData,
    },
    {
        id: 'psmMarketing-data',
        name: 'A/B Test Conversion',
        description: 'Time on site for two different website designs. Ideal for A/B testing.',
        icon: FlaskConical,
        analysisTypes: ['t-test', 'stats', 'mann-whitney', 'homogeneity','psm'],
        data: psmMarketingData,
    },
    {
        id: 'panel-data',
        name: 'Cross-Country Economic Data',
        description: 'Economic indicators for several countries over multiple years.',
        icon: Layers,
        analysisTypes: ['panel-data-regression'],
        data: panelData,
    },
     {
        id: 'sna-emails',
        name: 'Email Communication Network',
        description: 'A list of emails sent between individuals in a small organization.',
        icon: Network,
        analysisTypes: ['sna'],
        data: snaData,
    },
    {
        id: 'cbc-data',
        name: 'CBC data',
        description: 'A list of emails sent between individuals in a small organization.',
        icon: Network,
        analysisTypes: ['cbcData'],
        data: cbcData,
    },
    {
        id: 'backtesting-data',
        name: 'Stock Price Data (AAPL)',
        description: 'Daily closing prices for backtesting trading strategies (SMA, RSI, Momentum).',
        icon: LineChart,
        analysisTypes: ['backtesting'],
        recommendedAnalysis: 'backtesting',
        data: backtestingData,
    },
    {
        id: 'topic-modeling-reviews',
        name: 'Restaurant Reviews',
        description: 'A collection of 30 customer reviews for text analysis and topic modeling.',
        icon: MessagesSquare,
        analysisTypes: ['topic-modeling', 'sentiment', 'wordcloud'],
        data: restaurantReviewsData,
    },
    {
        id: 'threshold-optimization',
        name: 'Credit Approval Data',
        description: 'Loan application data with customer features and approval decisions for threshold optimization.',
        icon: SlidersHorizontal,
        analysisTypes: ['threshold-optimization'],
        recommendedAnalysis: 'threshold-optimization',
        data: thresholdOptimizationData,
    },
    {
        id: 'cost-sensitive',
        name: 'Fraud Detection Data',
        description: 'Credit card transaction data with fraud labels for cost-sensitive classification analysis.',
        icon: DollarSign,
        analysisTypes: ['cost-sensitive'],
        recommendedAnalysis: 'cost-sensitive',
        data: costSensitiveData,
    },
    {
        id: 'decision-rules',
        name: 'Customer Churn Data',
        description: 'Telecom customer data with churn labels for extracting interpretable decision rules.',
        icon: GitBranch,
        analysisTypes: ['decision-rules'],
        recommendedAnalysis: 'decision-rules',
        data: decisionRulesData,
    },
    {
        id: 'reliability-validity',
        name: 'Customer Survey Data',
        description: 'Likert-scale survey responses measuring satisfaction, trust, loyalty, and quality constructs.',
        icon: Shield,
        analysisTypes: ['reliability-validity'],
        recommendedAnalysis: 'reliability-validity',
        data: reliabilityValidityData,
    },
    
     {
        id: 'nonlinear-regression',
        name: 'Dose-Response Curve',
        description: 'Simulated data showing response to different doses of a substance.',
        icon: Atom,
        analysisTypes: ['nonlinear-regression', 'stats', 'visuals'],
        data: nonlinearRegressionData,
    },
    {
        id: 'time-series',
        name: 'Yearly Sales Data',
        description: 'Yearly sales data, suitable for long-term trend analysis.',
        icon: AreaChart,
        analysisTypes: ['stats', 'trend-analysis', 'seasonal-decomposition', 'moving-average', 'exponential-smoothing', 'arima', 'acf-pacf'],
        data: timeSeriesData,
    },
    {
        id: 'meta-analysis',
        name: 'Meta-Analysis',
        description: 'Sample data for meta-analysis, not loaded from a file.',
        icon: Users,
        analysisTypes: ['meta-analysis'],
        data: metaAnalysisData,
    },
     {
        id: 'ahp',
        name: 'AHP Example',
        description: 'Sample setup for Analytic Hierarchy Process, not loaded from a file.',
        icon: Share2,
        analysisTypes: ['ahp'],
        data: ahpData,
    },
    {
        id: 'crosstab',
        name: 'Market Research',
        description: 'Customer satisfaction data across different product categories and regions.',
        icon: Columns,
        analysisTypes: ['crosstab', 'stats', 'frequency'],
        data: crosstabData,
    },  
    {
        id: 'one-way-anova',
        name: 'Advertising Campaign Performance',
        description: 'Sales performance across different advertising campaign types (Online, TV, and Print).',
        icon: Columns,
        analysisTypes: ['one-way-anova'],
        data: oneWayAnovaData,
    },  
     {
        id: 'turf-analysis',
        name: 'Soda Flavor Preferences',
        description: 'Customer preferences for different soda flavors, ideal for TURF analysis.',
        icon: ThumbsUp,
        analysisTypes: ['turf'],
        data: turfData,
    },

    {
        id: 'gbm-regression',
        name: 'GBM Regression',
        description: 'House price prediction data, ideal for Gradient Boosting Regression.',
        icon: GitBranch,
        analysisTypes: ['gbm', 'regression', 'stats'],
        data: gbmRegressionData,
    },
    {
        id: 'gbm-classification',
        name: 'GBM Classification',
        description: 'Loan approval prediction data, ideal for Gradient Boosting Classification.',
        icon: GitBranch,
        analysisTypes: ['gbm', 'logistic-regression', 'stats', 'glm'],
        data: gbmClassificationData,
    },
    {
        id: 'reliability-validity',
        name: 'Customer Survey Data',
        description: 'Likert-scale survey for reliability & validity.',
        icon: Shield,
        analysisTypes: ['reliability-validity'],
        data: reliabilityValidityData,
    },
    {
        id: 'two-way-anova',
        name: 'Teaching Method Efficacy',
        description: 'Student scores based on teaching method and gender.',
        icon: Copy,
        analysisTypes: ['two-way-anova', 'stats'],
        data: twoWayAnovaData,
    },
    {
        id: 'survival-churn',
        name: 'Customer Churn',
        description: 'Customer tenure and churn status. Ideal for Survival Analysis.',
        icon: HeartPulse,
        analysisTypes: ['survival', 'stats', 'glm','crosstab'],
        data: survivalData,
    },
    {
        id: 'admission-data',
        name: 'University Admissions',
        description: 'GRE scores, GPA, and university rank for student admissions.',
        icon: BookOpen,
        analysisTypes: ['stats', 'logistic-regression', 'correlation', 'glm', 'discriminant', 'cost-sensitive'],
        data: admissionData,
    },
     {
        id: 'ipa-restaurant',
        name: 'Restaurant Satisfaction',
        description: 'Customer satisfaction ratings for various aspects of a restaurant experience.',
        icon: Target,
        analysisTypes: ['stats', 'ipa', 'regression'],
        data: ipaRestaurantData
    },
    {
        id: 'conjoint-smartphone',
        name: 'Smartphone Preferences',
        description: 'Simulated user ratings for smartphones with different attributes.',
        icon: Network,
        analysisTypes: ['conjoint', 'stats'],
        data: conjointSmartphoneData
    },
    {
        id: 't-test-suite',
        name: 'T-Test Suite',
        description: 'Data for one-sample, independent, and paired t-tests.',
        icon: Sigma,
        analysisTypes: ['stats', 't-test'],
        data: tTestData,
    },
    {
        id: 'regression-suite',
        name: 'Linear Regression',
        description: 'A simple dataset with a clear linear relationship for regression.',
        icon: TrendingUp,
        analysisTypes: ['stats', 'regression', 'correlation', 'glm', 'nonlinear-regression', 'scenario-sensitivity','whatif', 'linearity-check', 'influence-daignostics', 'autocorrelation-test'],
        data: regressionData,
    },
    {
        id: 'manova-groups',
        name: 'Treatment Groups',
        description: 'Comparing multiple measures across three experimental groups.',
        icon: Users,
        analysisTypes: ['stats', 'manova',  'ancova'],
        data: manovaData,
    },
    {
        id: 'customer-segments',
        name: 'Customer Segments',
        description: 'Age, income, and spending data for customer segmentation.',
        icon: Binary,
        analysisTypes: ['stats', 'hca', 'kmeans', 'correlation', 'pca', 'kmedoids','dbscan','hdbscan','mds'],
        data: customerSegmentsData,
    },

    {
        id: 'stress-support',
        name: 'Stress & Social Support',
        description: 'How social support moderates the effect of stress on performance.',
        icon: TrendingUp,
        analysisTypes: ['stats', 'moderation'],
        data: stressSupportData,
    },
    {
        id: 'work-stress',
        name: 'Work Stress & Performance',
        description: 'Job stress, exhaustion, and performance data. Ideal for Mediation Analysis.',
        icon: Network,
        analysisTypes: ['mediation'],
        data: workStressData,
    },
    {
        id: 'well-being-survey',
        name: 'Well-being Survey',
        description: 'Survey data for Anxiety, Depression, and Stress. Ideal for Reliability, EFA, and PCA.',
        icon: ShieldCheck,
        analysisTypes: ['stats', 'reliability', 'efa', 'pca'],
        data: likertScaleData,
    },
    {
        id: 'nonparametric-suite',
        name: 'Non-Parametric Suite',
        description: 'A unified dataset for Mann-Whitney, Wilcoxon, Kruskal-Wallis, and Friedman tests.',
        icon: FlaskConical,
        analysisTypes: ['stats', 'nonparametric', 'mann-whitney', 'wilcoxon', 'kruskal-wallis', 'friedman', 'mcnemar'],
        data: nonparametricData,
    },
     {
        id: 'mcnemar-test',
        name: 'Ad Campaign Efficacy',
        description: 'Purchase intent before and after an ad campaign. Ideal for McNemar\'s Test.',
        icon: Handshake,
        analysisTypes: ['mcnemar'],
        data: mcnemarData,
    },
     {
        id: 'csat-data',
        name: 'Customer Satisfaction (CSAT)',
        description: 'Customer satisfaction scores for a service.',
        icon: ClipboardList,
        analysisTypes: ['csat', 'stats'],
        data: csatData,
    },
    {
        id: 'brand-funnel',
        name: 'Brand Funnel Data',
        description: 'Awareness and consideration data for several brands.',
        icon: Activity,
        analysisTypes: ['survey'],
        data: brandFunnelData,
    },
    {
        id: 'iris',
        name: 'Iris Flowers',
        description: 'Sepal and petal measurements for three species of iris flowers.',
        icon: Users,
        analysisTypes: ['stats', 'correlation', 'one-way-anova', 'visuals', 'discriminant', 'kmeans', 'frequency',  'pca', 'normality', 'homogeneity', 'manova'],
        data: irisData
    },
    {
        id: 'headcount-stability',
        name: 'headcount-stability',
        description: '시간에 따른 부서별 인력(Headcount) 변화 데이터입니다. 조직 안정성 분석에 사용됩니다.',
        icon: Users,
        analysisTypes: ['headcount-stability-analysis'],
        data: headcountStabilityData,
    },
    {
        id: 'satisfaction-engagement',
        name: 'atisfaction-engagement',
        description: '직원들의 직무 만족도와 조직 몰입도 데이터. 조직 건강 진단에 사용됩니다.',
        icon: Users,
        analysisTypes: ['satisfaction-engagement-matrix', 'stats'],
        data: satisfactionEngagementData,
    },
    {
        id: 'hr-turnover',
        name: 'hr-turnover',
        description: '직원들의 성과, 만족도, 근속, 이직 여부 등 인사 데이터. 이직률 분석, 리스크 모델링에 사용됩니다.',
        icon: UserX,
        analysisTypes: ['turnover-rate-analysis', 'turnover-risk-modeling', 'talent-risk-matrix'],
        data: hrTurnoverData,
    },
    {
        id: 'attendance-data',
        name: 'attendance-data',
        description: '일별 직원 출근, 결근, 지각 상태 데이터. 근태 패턴 분석에 사용됩니다.',
        icon: CalendarDays,
        analysisTypes: ['attendance-pattern-analysis'],
        data: attendanceData,
    }
]
 